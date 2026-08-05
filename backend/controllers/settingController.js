const { query } = require('../database/db');

exports.getSettings = async (req, res) => {
  try {
    const settings = await query.get('SELECT * FROM settings WHERE id = 1');
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { centre_name, address, email, phone, working_hours, tax_rate, theme_default } = req.body;

    await query.run(`
      UPDATE settings
      SET centre_name = ?, address = ?, email = ?, phone = ?, working_hours = ?, tax_rate = ?, theme_default = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [centre_name, address, email, phone, working_hours, tax_rate, theme_default]);

    const updated = await query.get('SELECT * FROM settings WHERE id = 1');

    await query.run('INSERT INTO activity_logs (user_id, action, description) VALUES (?, ?, ?)', [
      req.user.id,
      'Settings Updated',
      'Updated diagnostic centre configuration & settings'
    ]);

    res.json({ success: true, message: 'Settings updated successfully.', settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
};
