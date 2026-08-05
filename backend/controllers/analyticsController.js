const { query } = require('../database/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStartStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    // 1. Total Patients
    const totalPatientsRow = await query.get('SELECT COUNT(*) as count FROM patients');

    // 2. Today's Appointments
    const todayApptsRow = await query.get('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?', [todayStr]);

    // 3. Completed Tests / Appointments
    const completedTestsRow = await query.get("SELECT COUNT(*) as count FROM appointments WHERE status = 'Completed'");

    // 4. Pending Reports
    const pendingReportsRow = await query.get("SELECT COUNT(*) as count FROM appointments WHERE status IN ('Booked', 'Sample Collected', 'In Lab', 'Testing')");

    // 5. Revenue Today
    const revTodayRow = await query.get(`
      SELECT COALESCE(SUM(grand_total), 0) as total
      FROM invoices i
      JOIN appointments a ON i.appointment_id = a.id
      WHERE a.appointment_date = ? AND i.payment_status = 'Paid'
    `, [todayStr]);

    // 6. Monthly Revenue
    const revMonthRow = await query.get(`
      SELECT COALESCE(SUM(grand_total), 0) as total
      FROM invoices i
      JOIN appointments a ON i.appointment_id = a.id
      WHERE a.appointment_date >= ? AND i.payment_status = 'Paid'
    `, [monthStartStr]);

    // 7. Most Popular Tests
    const allAppointments = await query.all('SELECT test_ids FROM appointments');
    const testCounts = {};
    allAppointments.forEach(apt => {
      try {
        const ids = JSON.parse(apt.test_ids);
        ids.forEach(id => { testCounts[id] = (testCounts[id] || 0) + 1; });
      } catch (e) {}
    });

    const popularTestIds = Object.keys(testCounts).sort((a, b) => testCounts[b] - testCounts[a]).slice(0, 5);
    let popularTests = [];
    if (popularTestIds.length > 0) {
      const placeholders = popularTestIds.map(() => '?').join(',');
      const testRows = await query.all(`SELECT id, test_name, category, price FROM tests WHERE id IN (${placeholders})`, popularTestIds);
      popularTests = testRows.map(t => ({
        ...t,
        count: testCounts[t.id]
      })).sort((a, b) => b.count - a.count);
    }

    // 8. Recent Activities
    const recentActivities = await query.all(`
      SELECT l.*, u.name as user_name, u.role as user_role
      FROM activity_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 6
    `);

    // 9. Chart: Daily Patients (Last 7 Days)
    const dailyPatients = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const countRow = await query.get('SELECT COUNT(*) as count FROM appointments WHERE appointment_date = ?', [dateStr]);
      dailyPatients.push({ date: dayLabel, count: countRow ? countRow.count : 0 });
    }

    // 10. Chart: Test Categories Distribution
    const categoryRows = await query.all(`
      SELECT category, COUNT(*) as count
      FROM tests
      GROUP BY category
    `);

    res.json({
      success: true,
      stats: {
        totalPatients: totalPatientsRow.count,
        todayAppointments: todayApptsRow.count,
        completedTests: completedTestsRow.count,
        pendingReports: pendingReportsRow.count,
        revenueToday: revTodayRow.total,
        monthlyRevenue: revMonthRow.total
      },
      popularTests,
      recentActivities,
      charts: {
        dailyPatients,
        categories: categoryRows
      }
    });
  } catch (err) {
    console.error('Error loading analytics:', err);
    res.status(500).json({ success: false, message: 'Failed to load analytics metrics.' });
  }
};
