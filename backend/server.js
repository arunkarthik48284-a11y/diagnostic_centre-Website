const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const { query } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Express Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend and uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../frontend')));

// Register REST API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/appointments', require('./routes/appointmentRoutes'));
app.use('/api/tests', require('./routes/testRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));

// Global Search Endpoint
app.get('/api/search', require('./middleware/auth').authenticateToken, async (req, res) => {
  try {
    const q = req.query.q;
    if (!q || q.length < 2) {
      return res.json({ success: true, results: { patients: [], appointments: [], reports: [], tests: [], invoices: [] } });
    }

    const term = `%${q}%`;

    const patients = await query.all('SELECT id, patient_code as title, name as subtitle, phone, "patient" as type FROM patients WHERE name LIKE ? OR patient_code LIKE ? OR phone LIKE ? LIMIT 5', [term, term, term]);
    const appointments = await query.all('SELECT a.id, a.appointment_number as title, p.name as subtitle, a.status, "appointment" as type FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.appointment_number LIKE ? OR p.name LIKE ? LIMIT 5', [term, term]);
    const reports = await query.all('SELECT r.id, r.report_number as title, p.name as subtitle, r.status, "report" as type FROM reports r JOIN patients p ON r.patient_id = p.id WHERE r.report_number LIKE ? OR p.name LIKE ? LIMIT 5', [term, term]);
    const tests = await query.all('SELECT id, test_name as title, category as subtitle, price, "test" as type FROM tests WHERE test_name LIKE ? OR category LIKE ? LIMIT 5', [term, term]);
    const invoices = await query.all('SELECT i.id, i.invoice_number as title, p.name as subtitle, i.grand_total, "invoice" as type FROM invoices i JOIN patients p ON i.patient_id = p.id WHERE i.invoice_number LIKE ? OR p.name LIKE ? LIMIT 5', [term, term]);

    res.json({
      success: true,
      results: {
        patients,
        appointments,
        reports,
        tests,
        invoices
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

// Fallback to login or 404 for SPA page routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start Server (if executed directly)
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(`🚀 QuickDiag Server running at: http://localhost:${PORT}`);
    console.log(`=======================================================`);
    try {
      await query.initSchema();
      console.log('✅ SQLite Schema verified & ready.');
    } catch (e) {
      console.error('Schema initialization check failed:', e.message);
    }
  });
}

module.exports = app;
