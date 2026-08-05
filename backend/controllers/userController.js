const bcrypt = require('bcryptjs');
const { query } = require('../database/db');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await query.all('SELECT id, name, email, role, phone, avatar, status, created_at FROM users ORDER BY id DESC');
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const existing = await query.get('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await query.run(`
      INSERT INTO users (name, email, password_hash, role, phone)
      VALUES (?, ?, ?, ?, ?)
    `, [name, email.trim().toLowerCase(), hash, role, phone || null]);

    res.status(201).json({ success: true, message: 'User account created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user account.' });
  }
};

exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await query.get('SELECT status FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    await query.run('UPDATE users SET status = ? WHERE id = ?', [newStatus, id]);

    res.json({ success: true, message: `User status changed to ${newStatus}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
};
