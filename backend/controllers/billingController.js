const { query } = require('../database/db');

exports.getAllInvoices = async (req, res) => {
  try {
    const { payment_status, search } = req.query;
    let sql = `
      SELECT i.*, p.name as patient_name, p.patient_code, p.phone as patient_phone, a.appointment_number
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      JOIN appointments a ON i.appointment_id = a.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Patient') {
      const patient = await query.get('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
      if (patient) {
        sql += ' AND i.patient_id = ?';
        params.push(patient.id);
      } else {
        return res.json({ success: true, count: 0, invoices: [] });
      }
    }

    if (payment_status) {
      sql += ' AND i.payment_status = ?';
      params.push(payment_status);
    }

    if (search) {
      sql += ' AND (i.invoice_number LIKE ? OR p.name LIKE ? OR a.appointment_number LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY i.created_at DESC';
    const invoices = await query.all(sql, params);

    res.json({ success: true, count: invoices.length, invoices });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch invoices.' });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await query.get(`
      SELECT i.*, p.name as patient_name, p.patient_code, p.phone as patient_phone, p.email as patient_email, p.address as patient_address,
             a.appointment_number, a.appointment_date, a.doctor_name, a.test_ids
      FROM invoices i
      JOIN patients p ON i.patient_id = p.id
      JOIN appointments a ON i.appointment_id = a.id
      WHERE i.id = ?
    `, [id]);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    let testIds = [];
    try { testIds = JSON.parse(invoice.test_ids); } catch(e){}

    let testList = [];
    if (testIds.length > 0) {
      const placeholders = testIds.map(() => '?').join(',');
      testList = await query.all(`SELECT id, test_name, category, price FROM tests WHERE id IN (${placeholders})`, testIds);
    }

    const centreSettings = await query.get('SELECT * FROM settings WHERE id = 1');

    res.json({
      success: true,
      invoice: {
        ...invoice,
        tests: testList
      },
      centre: centreSettings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching invoice details.' });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, payment_method } = req.body;

    const invoice = await query.get('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await query.run('UPDATE invoices SET payment_status = ?, payment_method = ? WHERE id = ?', [
      payment_status || invoice.payment_status,
      payment_method || invoice.payment_method,
      id
    ]);

    await query.run('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [
      req.user.id,
      'Payment Updated',
      `Updated invoice ${invoice.invoice_number} payment status to '${payment_status}' via ${payment_method}`
    ]);

    res.json({ success: true, message: 'Payment status updated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update payment status.' });
  }
};
