const { query } = require('../database/db');

exports.getAllAppointments = async (req, res) => {
  try {
    const { status, sample_status, date, doctor, patient_id, search } = req.query;
    let sql = `
      SELECT a.*, p.name as patient_name, p.patient_code, p.phone as patient_phone, p.gender, p.age
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE 1=1
    `;
    const params = [];

    // Patient role filter: Patients only see their own appointments
    if (req.user.role === 'Patient') {
      const patient = await query.get('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
      if (patient) {
        sql += ' AND a.patient_id = ?';
        params.push(patient.id);
      } else {
        return res.json({ success: true, count: 0, appointments: [] });
      }
    } else if (patient_id) {
      sql += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (sample_status) {
      sql += ' AND a.sample_status = ?';
      params.push(sample_status);
    }

    if (date) {
      sql += ' AND a.appointment_date = ?';
      params.push(date);
    }

    if (doctor) {
      sql += ' AND a.doctor_name LIKE ?';
      params.push(`%${doctor}%`);
    }

    if (search) {
      sql += ' AND (a.appointment_number LIKE ? OR p.name LIKE ? OR p.phone LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';
    const appointments = await query.all(sql, params);

    // Fetch tests details for each appointment
    const allTests = await query.all('SELECT id, test_name, price, category FROM tests');
    const testsMap = {};
    allTests.forEach(t => { testsMap[t.id] = t; });

    const formattedAppointments = appointments.map(apt => {
      let testIds = [];
      try {
        testIds = JSON.parse(apt.test_ids);
      } catch (e) {
        testIds = [];
      }
      const testList = testIds.map(id => testsMap[id]).filter(Boolean);
      return {
        ...apt,
        tests: testList,
        total_price: testList.reduce((sum, t) => sum + t.price, 0)
      };
    });

    res.json({ success: true, count: formattedAppointments.length, appointments: formattedAppointments });
  } catch (err) {
    console.error('Error fetching appointments:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments.' });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const apt = await query.get(`
      SELECT a.*, p.name as patient_name, p.patient_code, p.phone as patient_phone, p.email as patient_email, p.gender, p.age, p.address
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.id = ?
    `, [id]);

    if (!apt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    let testIds = [];
    try { testIds = JSON.parse(apt.test_ids); } catch(e){}

    let testList = [];
    if (testIds.length > 0) {
      const placeholders = testIds.map(() => '?').join(',');
      testList = await query.all(`SELECT * FROM tests WHERE id IN (${placeholders})`, testIds);
    }

    const report = await query.get('SELECT * FROM reports WHERE appointment_id = ?', [apt.id]);
    const invoice = await query.get('SELECT * FROM invoices WHERE appointment_id = ?', [apt.id]);

    res.json({
      success: true,
      appointment: {
        ...apt,
        tests: testList,
        total_price: testList.reduce((s, t) => s + t.price, 0),
        report,
        invoice
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving appointment details.' });
  }
};

exports.createAppointment = async (req, res) => {
  try {
    const { patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, discount_amount, payment_method } = req.body;

    if (!patient_id || !test_ids || !Array.isArray(test_ids) || test_ids.length === 0 || !appointment_date || !appointment_time) {
      return res.status(400).json({ success: false, message: 'Patient, test selection, date, and time are required.' });
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxRow = await query.get('SELECT COALESCE(MAX(id), 0) as max_id FROM appointments');
    const nextId = parseInt(maxRow?.max_id || maxRow?.MAX_ID || 0, 10) + 1;
    const seq = String(nextId).padStart(3, '0');
    const appointment_number = `APT-${today}-${seq}`;

    let createdByUserId = null;
    if (req.user && req.user.id) {
      const validUser = await query.get('SELECT id FROM users WHERE id = ?', [req.user.id]);
      if (validUser) {
        createdByUserId = validUser.id;
      }
    }

    await query.run(`
      INSERT INTO appointments (appointment_number, patient_id, test_ids, doctor_name, appointment_date, appointment_time, remarks, status, sample_status, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Booked', 'Pending', ?)
    `, [appointment_number, patient_id, JSON.stringify(test_ids), doctor_name || 'General Doctor', appointment_date, appointment_time, remarks || '', createdByUserId]);

    const createdApt = await query.get('SELECT * FROM appointments WHERE appointment_number = ?', [appointment_number]);
    const appointmentId = createdApt.id;

    // Calculate billing
    const placeholders = test_ids.map(() => '?').join(',');
    const selectedTests = await query.all(`SELECT price FROM tests WHERE id IN (${placeholders})`, test_ids);
    const subtotal = selectedTests.reduce((sum, t) => sum + parseFloat(t.price || 0), 0);
    const disc = parseFloat(discount_amount) || 0;
    const setting = await query.get('SELECT tax_rate FROM settings WHERE id = 1');
    const taxRate = setting ? parseFloat(setting.tax_rate) : 18.0;
    const taxable = Math.max(0, subtotal - disc);
    const taxAmount = parseFloat(((taxable * taxRate) / 100).toFixed(2));
    const grandTotal = parseFloat((taxable + taxAmount).toFixed(2));

    const maxInvRow = await query.get('SELECT COALESCE(MAX(id), 0) as max_id FROM invoices');
    const nextInvId = parseInt(maxInvRow?.max_id || maxInvRow?.MAX_ID || 0, 10) + 1;
    const invSeq = String(nextInvId).padStart(3, '0');
    const invoice_number = `INV-${today}-${invSeq}`;

    await query.run(`
      INSERT INTO invoices (invoice_number, appointment_id, patient_id, total_amount, discount_amount, tax_amount, grand_total, payment_status, payment_method)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
    `, [invoice_number, appointmentId, patient_id, subtotal, disc, taxAmount, grandTotal, payment_method || 'Cash']);

    if (req.user && req.user.id) {
      try {
        const validUser = await query.get('SELECT id FROM users WHERE id = ?', [req.user.id]);
        if (validUser) {
          await query.run('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [
            req.user.id,
            'Appointment Booked',
            `Booked appointment ${appointment_number} for Patient ID ${patient_id}`
          ]);
        }
      } catch (logErr) {
        console.warn('Activity log non-critical error:', logErr.message);
      }
    }

    res.status(201).json({ success: true, message: 'Appointment booked successfully.', appointment: createdApt });
  } catch (err) {
    console.error('Create Appointment Error:', err);
    res.status(500).json({ success: false, message: 'Failed to book appointment.' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sample_status } = req.body;

    const apt = await query.get('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!apt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    const newStatus = status || apt.status;
    const newSampleStatus = sample_status || apt.sample_status;

    await query.run('UPDATE appointments SET status = ?, sample_status = ? WHERE id = ?', [newStatus, newSampleStatus, id]);

    await query.run('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [
      req.user.id,
      'Status Updated',
      `Updated ${apt.appointment_number} status to '${newStatus}' / sample '${newSampleStatus}'`
    ]);

    res.json({ success: true, message: 'Status updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update appointment status.' });
  }
};

exports.cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    await query.run("UPDATE appointments SET status = 'Cancelled', sample_status = 'Pending' WHERE id = ?", [id]);
    res.json({ success: true, message: 'Appointment cancelled.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel appointment.' });
  }
};
