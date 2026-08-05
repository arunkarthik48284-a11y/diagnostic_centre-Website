// QuickDiag Appointments JS

let appointmentsList = [];
let availableTests = [];
let availablePatients = [];

async function loadAppointments() {
  const search = document.getElementById('apt-search-input')?.value.trim() || '';
  const date = document.getElementById('apt-date-filter')?.value || '';
  const status = document.getElementById('apt-status-filter')?.value || '';

  try {
    const res = await API.get(`/appointments?search=${encodeURIComponent(search)}&date=${date}&status=${status}`);
    if (!res.success) return;

    appointmentsList = res.appointments;
    renderAppointmentsTable(appointmentsList);
  } catch (err) {
    showToast('Failed to load appointments.', 'error');
  }
}

function renderAppointmentsTable(list) {
  const tbody = document.getElementById('appointments-tbody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 font-medium">No appointment records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    let statusClass = 'bg-blue-50 text-blue-600 border-blue-200';
    if (a.status === 'Completed') statusClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    else if (a.status === 'Cancelled') statusClass = 'bg-red-50 text-red-600 border-red-200';
    else if (a.status === 'Testing' || a.status === 'In Lab') statusClass = 'bg-amber-50 text-amber-600 border-amber-200';

    let sampleBadgeClass = 'bg-slate-100 text-slate-600';
    if (a.sample_status === 'Collected') sampleBadgeClass = 'bg-cyan-100 text-cyan-700';
    else if (a.sample_status === 'Testing') sampleBadgeClass = 'bg-purple-100 text-purple-700';
    else if (a.sample_status === 'Report Ready' || a.sample_status === 'Delivered') sampleBadgeClass = 'bg-emerald-100 text-emerald-700';

    const testNames = (a.tests || []).map(t => t.test_name).join(', ') || 'N/A';

    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <td class="px-6 py-4 font-mono text-blue-600 dark:text-blue-400 font-bold">${a.appointment_number}</td>
        <td class="px-6 py-4">
          <p class="font-extrabold text-slate-900 dark:text-white">${a.patient_name}</p>
          <span class="text-[10px] text-slate-400">${a.patient_code} | ${a.patient_phone}</span>
        </td>
        <td class="px-6 py-4">
          <p class="text-slate-900 dark:text-white font-bold">${formatDate(a.appointment_date)}</p>
          <span class="text-[10px] text-slate-400">${a.appointment_time}</span>
        </td>
        <td class="px-6 py-4 max-w-xs">
          <p class="truncate text-slate-700 dark:text-slate-300" title="${testNames}">${testNames}</p>
          <span class="text-[10px] text-emerald-600 font-bold">${formatCurrency(a.total_price)}</span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusClass}">${a.status}</span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold ${sampleBadgeClass}">📍 ${a.sample_status || 'Pending'}</span>
        </td>
        <td class="px-6 py-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="openStatusModal(${a.id}, '${a.status}', '${a.sample_status}')" title="Update Sample Status" class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
            ${a.status !== 'Cancelled' && a.status !== 'Completed' ? `
              <button onclick="cancelAppt(${a.id})" title="Cancel Appointment" class="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 hover:bg-red-100">
                <i data-lucide="x-circle" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function openBookingModal() {
  try {
    const [pRes, tRes] = await Promise.all([
      API.get('/patients'),
      API.get('/tests')
    ]);

    availablePatients = pRes.patients || [];
    availableTests = tRes.tests || [];

    const patientSelect = document.getElementById('b-patient-id');
    if (patientSelect) {
      patientSelect.innerHTML = availablePatients.map(p => `
        <option value="${p.id}">${p.name} (${p.patient_code} - ${p.phone})</option>
      `).join('');
    }

    const testsContainer = document.getElementById('b-tests-container');
    if (testsContainer) {
      testsContainer.innerHTML = availableTests.map(t => `
        <label class="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-blue-50/50">
          <div class="flex items-center gap-2">
            <input type="checkbox" name="selected_tests" value="${t.id}" data-price="${t.price}" onchange="recalculateTotals()" class="rounded border-slate-300 text-blue-600">
            <span class="font-bold text-slate-800 dark:text-slate-200">${t.test_name}</span>
          </div>
          <span class="font-extrabold text-blue-600">${formatCurrency(t.price)}</span>
        </label>
      `).join('');
    }

    document.getElementById('b-date').value = new Date().toISOString().split('T')[0];
    recalculateTotals();
    openModal('booking-modal');
  } catch (err) {
    showToast('Error initializing booking options.', 'error');
  }
}

function recalculateTotals() {
  const checkboxes = document.querySelectorAll('input[name="selected_tests"]:checked');
  let subtotal = 0;
  checkboxes.forEach(cb => {
    subtotal += parseFloat(cb.getAttribute('data-price') || 0);
  });

  const disc = parseFloat(document.getElementById('b-discount')?.value || 0);
  const total = Math.max(0, subtotal - disc);

  document.getElementById('b-subtotal').innerText = formatCurrency(subtotal);
  document.getElementById('b-grandtotal').innerText = formatCurrency(total * 1.18); // Including estimated 18% tax
}

function openStatusModal(id, currentStatus, currentSample) {
  document.getElementById('status-apt-id').value = id;
  document.getElementById('st-apt-status').value = currentStatus;
  document.getElementById('st-sample-status').value = currentSample || 'Pending';
  openModal('status-modal');
}

async function submitStatusUpdate() {
  const id = document.getElementById('status-apt-id').value;
  const status = document.getElementById('st-apt-status').value;
  const sample_status = document.getElementById('st-sample-status').value;

  try {
    const res = await API.put(`/appointments/${id}/status`, { status, sample_status });
    if (res.success) {
      showToast(res.message, 'success');
      closeModal('status-modal');
      loadAppointments();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update status.', 'error');
  }
}

async function cancelAppt(id) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  try {
    const res = await API.put(`/appointments/${id}/cancel`, {});
    if (res.success) {
      showToast(res.message, 'success');
      loadAppointments();
    }
  } catch (err) {
    showToast(err.message || 'Failed to cancel appointment.', 'error');
  }
}

function handleExportAppointments() {
  if (!appointmentsList || appointmentsList.length === 0) {
    showToast('No appointment records to export.', 'warning');
    return;
  }
  const headers = ['Appt Number', 'Patient', 'Phone', 'Date', 'Time', 'Doctor', 'Status', 'Sample Status'];
  const rows = appointmentsList.map(a => [
    a.appointment_number,
    a.patient_name,
    a.patient_phone,
    a.appointment_date,
    a.appointment_time,
    a.doctor_name || '',
    a.status,
    a.sample_status
  ]);
  exportToCSV('quickdiag_appointments', headers, rows);
}

document.addEventListener('DOMContentLoaded', () => {
  loadAppointments();

  document.getElementById('apt-search-input')?.addEventListener('input', loadAppointments);
  document.getElementById('apt-date-filter')?.addEventListener('change', loadAppointments);
  document.getElementById('apt-status-filter')?.addEventListener('change', loadAppointments);
  document.getElementById('b-discount')?.addEventListener('input', recalculateTotals);

  document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const patient_id = parseInt(document.getElementById('b-patient-id').value);
    const doctor_name = document.getElementById('b-doctor').value.trim();
    const appointment_date = document.getElementById('b-date').value;
    const appointment_time = document.getElementById('b-time').value;
    const remarks = document.getElementById('b-remarks').value.trim();
    const discount_amount = parseFloat(document.getElementById('b-discount').value || 0);

    const testCbs = document.querySelectorAll('input[name="selected_tests"]:checked');
    const test_ids = Array.from(testCbs).map(cb => parseInt(cb.value));

    if (test_ids.length === 0) {
      showToast('Please select at least one diagnostic test.', 'warning');
      return;
    }

    try {
      const res = await API.post('/appointments', {
        patient_id,
        test_ids,
        doctor_name,
        appointment_date,
        appointment_time,
        remarks,
        discount_amount
      });

      if (res.success) {
        showToast(res.message, 'success');
        closeModal('booking-modal');
        loadAppointments();
      }
    } catch (err) {
      showToast(err.message || 'Failed to book appointment.', 'error');
    }
  });
});
