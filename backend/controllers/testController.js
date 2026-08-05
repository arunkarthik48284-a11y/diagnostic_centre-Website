const { query } = require('../database/db');

exports.getAllTests = async (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM tests WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (test_name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY category ASC, test_name ASC';
    const tests = await query.all(sql, params);
    res.json({ success: true, count: tests.length, tests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch diagnostic tests.' });
  }
};

exports.getTestCategories = async (req, res) => {
  try {
    const categories = await query.all('SELECT DISTINCT category FROM tests ORDER BY category ASC');
    res.json({ success: true, categories: categories.map(c => c.category) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch test categories.' });
  }
};

exports.createTest = async (req, res) => {
  try {
    const { test_name, category, description, price, prep_instructions, estimated_hours } = req.body;

    if (!test_name || !category || price == null) {
      return res.status(400).json({ success: false, message: 'Test name, category, and price are required.' });
    }

    const result = await query.run(`
      INSERT INTO tests (test_name, category, description, price, prep_instructions, estimated_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [test_name, category, description || '', price, prep_instructions || '', estimated_hours || 24]);

    const newTest = await query.get('SELECT * FROM tests WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, message: 'Diagnostic test created.', test: newTest });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create test.' });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const { id } = req.params;
    const { test_name, category, description, price, prep_instructions, estimated_hours, status } = req.body;

    await query.run(`
      UPDATE tests
      SET test_name = ?, category = ?, description = ?, price = ?, prep_instructions = ?, estimated_hours = ?, status = ?
      WHERE id = ?
    `, [test_name, category, description, price, prep_instructions, estimated_hours, status || 'Active', id]);

    const updated = await query.get('SELECT * FROM tests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Diagnostic test updated.', test: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update test.' });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const { id } = req.params;
    await query.run('DELETE FROM tests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Diagnostic test deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete test.' });
  }
};
