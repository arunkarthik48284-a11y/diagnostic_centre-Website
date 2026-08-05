const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../database/db');
const { JWT_SECRET } = require('../middleware/auth');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await query.get('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, message: 'Your account is currently inactive. Contact Admin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    // Log login activity
    try {
      await query.run('INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)', [
        user.id,
        'User Login',
        `${user.role} ${user.name} logged in successfully.`,
        req.ip || '127.0.0.1'
      ]);
    } catch (logErr) {
      console.warn('Login activity log warning:', logErr.message);
    }

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await query.get('SELECT id, name, email, role, phone, avatar, status, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    let avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : undefined;

    if (avatarPath) {
      await query.run('UPDATE users SET name = ?, phone = ?, avatar = ? WHERE id = ?', [name, phone, avatarPath, req.user.id]);
    } else {
      await query.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone, req.user.id]);
    }

    const updatedUser = await query.get('SELECT id, name, email, role, phone, avatar FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: 'Profile updated successfully.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new passwords.' });
    }

    const user = await query.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query.run('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error changing password.' });
  }
};
