const { query } = require('../database/db');

exports.getAllReports = async (req, res) => {
  try {
    const { status, search } = req.query;
    let sql = `
      SELECT r.*, p.name as patient_name, p.patient_code, p.phone as patient_phone, a.appointment_number, u.name as technician_name
      FROM reports r
      JOIN patients p ON r.patient_id = p.id
      JOIN appointments a ON r.appointment_id = a.id
      LEFT JOIN users u ON r.technician_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Patient') {
      const patient = await query.get('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
      if (patient) {
        sql += ' AND r.patient_id = ?';
        params.push(patient.id);
      } else {
        return res.json({ success: true, count: 0, reports: [] });
      }
    }

    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (r.report_number LIKE ? OR p.name LIKE ? OR a.appointment_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY r.created_at DESC';
    const reports = await query.all(sql, params);

    res.json({ success: true, count: reports.length, reports });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch diagnostic reports.' });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await query.get(`
      SELECT r.*, p.name as patient_name, p.patient_code, p.age, p.gender, p.doctor_ref, a.appointment_number, a.appointment_date, u.name as technician_name
      FROM reports r
      JOIN patients p ON r.patient_id = p.id
      JOIN appointments a ON r.appointment_id = a.id
      LEFT JOIN users u ON r.technician_id = u.id
      WHERE r.id = ?
    `, [id]);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found.' });
    }

    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving report details.' });
  }
};

exports.createReport = async (req, res) => {
  try {
    const { appointment_id, patient_id, notes, digital_data_json, status } = req.body;
    let file_path = req.file ? `/uploads/reports/${req.file.filename}` : null;

    if (!appointment_id || !patient_id) {
      return res.status(400).json({ success: false, message: 'Appointment ID and Patient ID are required.' });
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const maxRow = await query.get('SELECT COALESCE(MAX(id), 0) as max_id FROM reports');
    const nextId = parseInt(maxRow?.max_id || maxRow?.MAX_ID || 0, 10) + 1;
    const seq = String(nextId).padStart(3, '0');
    const report_number = `REP-${today}-${seq}`;

    const reportStatus = status || 'Report Ready';

    let technicianUserId = null;
    if (req.user && req.user.id) {
      const validUser = await query.get('SELECT id FROM users WHERE id = ?', [req.user.id]);
      if (validUser) {
        technicianUserId = validUser.id;
      }
    }

    await query.run(`
      INSERT INTO reports (report_number, appointment_id, patient_id, technician_id, file_path, digital_data_json, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [report_number, appointment_id, patient_id, technicianUserId, file_path, digital_data_json || null, notes || '', reportStatus]);

    // Update appointment & sample statuses
    await query.run("UPDATE appointments SET status = 'Report Ready', sample_status = 'Report Ready' WHERE id = ?", [appointment_id]);

    if (req.user && req.user.id) {
      try {
        const validUser = await query.get('SELECT id FROM users WHERE id = ?', [req.user.id]);
        if (validUser) {
          await query.run('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [
            req.user.id,
            'Report Uploaded',
            `Uploaded report ${report_number} for Appointment ID ${appointment_id}`
          ]);
        }
      } catch (logErr) {
        console.warn('Activity log non-critical error:', logErr.message);
      }
    }

    const newReport = await query.get('SELECT * FROM reports WHERE report_number = ?', [report_number]);
    res.status(201).json({ success: true, message: 'Diagnostic report saved successfully.', report: newReport });
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ success: false, message: 'Failed to create report.' });
  }
};
