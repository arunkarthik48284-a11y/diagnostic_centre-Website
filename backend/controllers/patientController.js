const { query } = require('../database/db');

exports.getAllPatients = async (req, res) => {
  try {
    const { search, gender, blood_group } = req.query;
    let sql = 'SELECT * FROM patients WHERE 1=1';
    const params = [];

    if (search) {
      sql += ' AND (name LIKE ? OR patient_code LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (gender) {
      sql += ' AND gender = ?';
      params.push(gender);
    }

    if (blood_group) {
      sql += ' AND blood_group = ?';
      params.push(blood_group);
    }

    sql += ' ORDER BY id DESC';

    const patients = await query.all(sql, params);
    res.json({ success: true, count: patients.length, patients });
  } catch (err) {
    console.error('Error fetching patients:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch patients.' });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const patient = await query.get('SELECT * FROM patients WHERE id = ?', [req.params.id]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // Fetch history
    const appointments = await query.all('SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC', [patient.id]);
    const reports = await query.all('SELECT * FROM reports WHERE patient_id = ? ORDER BY created_at DESC', [patient.id]);
    const invoices = await query.all('SELECT * FROM invoices WHERE patient_id = ? ORDER BY created_at DESC', [patient.id]);

    res.json({
      success: true,
      patient,
      history: {
        appointments,
        reports,
        invoices
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching patient details.' });
  }
};

exports.createPatient = async (req, res) => {
  try {
    const { name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref } = req.body;

    if (!name || !phone || !age || !gender) {
      return res.status(400).json({ success: false, message: 'Name, age, gender, and phone number are required.' });
    }

    // Generate unique code: PT-YYYYMMDD-XXX
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxRow = await query.get('SELECT COALESCE(MAX(id), 0) as max_id FROM patients');
    const nextId = parseInt(maxRow?.max_id || maxRow?.MAX_ID || 0, 10) + 1;
    const seq = String(nextId).padStart(3, '0');
    const patient_code = `PT-${today}-${seq}`;

    await query.run(`
      INSERT INTO patients (patient_code, name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [patient_code, name, parseInt(age, 10), gender, dob || null, blood_group || null, phone, email || null, address || null, emergency_contact || null, doctor_ref || null]);

    const newPatient = await query.get('SELECT * FROM patients WHERE patient_code = ?', [patient_code]);

    if (req.user && req.user.id) {
      try {
        const validUser = await query.get('SELECT id FROM users WHERE id = ?', [req.user.id]);
        if (validUser) {
          await query.run('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [
            req.user.id,
            'Patient Created',
            `Registered patient ${name} (${patient_code})`
          ]);
        }
      } catch (logErr) {
        console.warn('Activity log non-critical error:', logErr.message);
      }
    }

    res.status(201).json({ success: true, message: 'Patient registered successfully.', patient: newPatient });
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ success: false, message: 'Failed to create patient record: ' + (err.message || err) });
  }
};

exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref } = req.body;

    const patient = await query.get('SELECT * FROM patients WHERE id = ?', [id]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    await query.run(`
      UPDATE patients
      SET name = ?, age = ?, gender = ?, dob = ?, blood_group = ?, phone = ?, email = ?, address = ?, emergency_contact = ?, doctor_ref = ?
      WHERE id = ?
    `, [name, age, gender, dob, blood_group, phone, email, address, emergency_contact, doctor_ref, id]);

    const updated = await query.get('SELECT * FROM patients WHERE id = ?', [id]);
    res.json({ success: true, message: 'Patient record updated.', patient: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update patient.' });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await query.get('SELECT * FROM patients WHERE id = ?', [id]);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    await query.run('DELETE FROM patients WHERE id = ?', [id]);
    res.json({ success: true, message: `Patient ${patient.name} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete patient.' });
  }
};
