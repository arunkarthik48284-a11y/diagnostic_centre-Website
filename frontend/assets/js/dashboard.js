// QuickDiag Dashboard JS

let dailyChart = null;
let categoryChart = null;

async function loadDashboard() {
  const user = Auth.getUser();
  if (user) {
    document.getElementById('user-greeting-name').innerText = user.name;
  }

  try {
    const res = await API.get('/analytics/dashboard');
    if (!res.success) return;

    const { stats, popularTests, recentActivities, charts } = res;

    // Update KPI stat counters
    document.getElementById('stat-patients').innerText = stats.totalPatients || 0;
    document.getElementById('stat-today-appts').innerText = stats.todayAppointments || 0;
    document.getElementById('stat-completed-tests').innerText = stats.completedTests || 0;
    document.getElementById('stat-pending-reports').innerText = stats.pendingReports || 0;
    document.getElementById('stat-rev-today').innerText = formatCurrency(stats.revenueToday);
    document.getElementById('stat-rev-month').innerText = formatCurrency(stats.monthlyRevenue);

    // Populate Popular Tests Table
    const tbody = document.getElementById('popular-tests-tbody');
    if (tbody) {
      if (popularTests && popularTests.length > 0) {
        tbody.innerHTML = popularTests.map(t => `
          <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
            <td class="py-3 text-slate-900 dark:text-white font-bold">${t.test_name}</td>
            <td class="py-3"><span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${t.category}</span></td>
            <td class="py-3 font-semibold text-emerald-600">${formatCurrency(t.price)}</td>
            <td class="py-3 text-right font-extrabold text-blue-600">${t.count} bookings</td>
          </tr>
        `).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-slate-400">No test booking data available yet.</td></tr>`;
      }
    }

    // Populate Recent Activities
    const actList = document.getElementById('recent-activities-list');
    if (actList) {
      if (recentActivities && recentActivities.length > 0) {
        actList.innerHTML = recentActivities.map(a => `
          <div class="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/40 text-xs">
            <div class="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
              ⚡
            </div>
            <div>
              <p class="font-bold text-slate-900 dark:text-white">${a.action}</p>
              <p class="text-slate-500 dark:text-slate-400">${a.description}</p>
              <span class="text-[10px] text-slate-400 font-medium">${new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        `).join('');
      } else {
        actList.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No recent activity logs.</p>`;
      }
    }

    // Render Charts
    renderDailyPatientsChart(charts.dailyPatients);
    renderCategoriesChart(charts.categories);

  } catch (err) {
    showToast('Failed to load dashboard statistics.', 'error');
  }
}

function renderDailyPatientsChart(data) {
  const ctx = document.getElementById('dailyPatientsChart');
  if (!ctx) return;

  const labels = data.map(d => d.date);
  const counts = data.map(d => d.count);

  if (dailyChart) dailyChart.destroy();

  dailyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Patients Registered / Appts',
        data: counts,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#2563eb',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderCategoriesChart(data) {
  const ctx = document.getElementById('categoriesChart');
  if (!ctx) return;

  const labels = data.map(d => d.category);
  const counts = data.map(d => d.count);
  const colors = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  if (categoryChart) categoryChart.destroy();

  categoryChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      },
      cutout: '70%'
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
