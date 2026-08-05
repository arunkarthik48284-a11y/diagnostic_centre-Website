// QuickDiag Reports JS

let reportsList = [];
let currentViewingReport = null;

async function loadReports() {
  const search = document.getElementById('report-search-input')?.value.trim() || '';
  const status = document.getElementById('report-status-filter')?.value || '';

  try {
    const res = await API.get(`/reports?search=${encodeURIComponent(search)}&status=${status}`);
    if (!res.success) return;

    reportsList = res.reports;
    renderReportsTable(reportsList);
  } catch (err) {
    showToast('Failed to load diagnostic reports.', 'error');
  }
}

function renderReportsTable(list) {
  const tbody = document.getElementById('reports-tbody');
  if (!tbody) return;

  const currentUser = Auth.getUser();
  if (currentUser && currentUser.role === 'Patient') {
    const upBtn = document.getElementById('btn-upload-report');
    if (upBtn) upBtn.style.display = 'none';
  }

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-center text-slate-400 font-medium">No diagnostic reports found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(r => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
      <td class="px-6 py-4 font-mono text-blue-600 dark:text-blue-400 font-bold">${r.report_number}</td>
      <td class="px-6 py-4">
        <p class="font-extrabold text-slate-900 dark:text-white">${r.patient_name}</p>
        <span class="text-[10px] text-slate-400">${r.patient_code}</span>
      </td>
      <td class="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">${r.appointment_number}</td>
      <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${r.technician_name || 'Lab System'}</td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
          ${r.status}
        </span>
      </td>
      <td class="px-6 py-4 text-center">
        <div class="flex items-center justify-center gap-2">
          <button onclick="viewReport(${r.id})" title="View Digital Certificate" class="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 hover:bg-blue-100 font-bold text-xs flex items-center gap-1">
            <i data-lucide="eye" class="w-3.5 h-3.5"></i> View Report
          </button>
          ${r.file_path ? `
            <a href="${r.file_path}" target="_blank" download title="Download PDF" class="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
              <i data-lucide="download" class="w-4 h-4"></i>
            </a>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function openReportModal() {
  try {
    const res = await API.get('/appointments');
    const appointments = res.appointments || [];

    // Filter appointments ready for report
    const eligible = appointments.filter(a => a.status !== 'Cancelled' && a.status !== 'Completed');

    const select = document.getElementById('r-appointment-id');
    if (select) {
      select.innerHTML = eligible.map(a => `
        <option value="${a.id}" data-patient="${a.patient_id}">${a.appointment_number} - ${a.patient_name} (${a.appointment_date})</option>
      `).join('');
    }

    const container = document.getElementById('params-container');
    container.innerHTML = '';
    addParamRow('Hemoglobin', '13.5', 'g/dL', '13.0 - 17.0', 'Normal');
    addParamRow('Total WBC Count', '6800', '/cumm', '4000 - 11000', 'Normal');

    openModal('upload-report-modal');
  } catch (err) {
    showToast('Failed to load appointments for report generation.', 'error');
  }
}

function addParamRow(name = '', value = '', unit = '', range = '', status = 'Normal') {
  const container = document.getElementById('params-container');
  const div = document.createElement('div');
  div.className = 'grid grid-cols-5 gap-2 items-center text-xs p-1.5 bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600';
  div.innerHTML = `
    <input type="text" placeholder="Parameter Name" value="${name}" class="param-name px-2 py-1 bg-transparent border rounded outline-none">
    <input type="text" placeholder="Value" value="${value}" class="param-val px-2 py-1 bg-transparent border rounded outline-none">
    <input type="text" placeholder="Unit" value="${unit}" class="param-unit px-2 py-1 bg-transparent border rounded outline-none">
    <input type="text" placeholder="Ref Range" value="${range}" class="param-range px-2 py-1 bg-transparent border rounded outline-none">
    <div class="flex items-center gap-1">
      <select class="param-status px-1 py-1 bg-transparent border rounded outline-none font-bold text-[10px]">
        <option value="Normal" ${status === 'Normal' ? 'selected' : ''}>Normal</option>
        <option value="Elevated" ${status === 'Elevated' ? 'selected' : ''}>Elevated</option>
        <option value="Low" ${status === 'Low' ? 'selected' : ''}>Low</option>
      </select>
      <button type="button" onclick="this.parentElement.parentElement.remove()" class="text-red-500 font-bold text-base">&times;</button>
    </div>
  `;
  container.appendChild(div);
}

async function viewReport(id) {
  try {
    const res = await API.get(`/reports/${id}`);
    if (!res.success) return;

    const r = res.report;
    currentViewingReport = r;

    document.getElementById('vr-report-num').innerText = r.report_number;
    document.getElementById('vr-patient-name').innerText = r.patient_name;
    document.getElementById('vr-patient-age').innerText = `${r.age} Yrs / ${r.gender}`;
    document.getElementById('vr-doctor').innerText = r.doctor_ref || 'Dr. Arthur Conan';
    document.getElementById('vr-date').innerText = formatDate(r.appointment_date);
    document.getElementById('vr-notes').innerText = r.notes || 'No critical abnormalities identified.';

    // Generate Barcode
    if (window.JsBarcode) {
      JsBarcode("#report-barcode", r.report_number, {
        format: "CODE128",
        height: 35,
        displayValue: false
      });
    }

    // Parameters
    let params = [];
    try {
      const data = JSON.parse(r.digital_data_json);
      params = data.parameters || [];
    } catch(e){}

    const tbody = document.getElementById('vr-params-tbody');
    if (tbody) {
      if (params.length > 0) {
        tbody.innerHTML = params.map(p => {
          let badgeColor = 'bg-emerald-100 text-emerald-700';
          if (p.status === 'Elevated' || p.status === 'High') badgeColor = 'bg-red-100 text-red-700';
          else if (p.status === 'Low') badgeColor = 'bg-amber-100 text-amber-700';

          return `
            <tr>
              <td class="p-2.5 text-slate-900 dark:text-white font-bold">${p.name}</td>
              <td class="p-2.5 font-extrabold text-blue-600 dark:text-blue-400">${p.value}</td>
              <td class="p-2.5 text-slate-500">${p.unit}</td>
              <td class="p-2.5 text-slate-500">${p.range}</td>
              <td class="p-2.5 text-right"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeColor}">${p.status}</span></td>
            </tr>
          `;
        }).join('');
      } else {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400">Attached PDF report file only.</td></tr>`;
      }
    }

    openModal('view-report-modal');
  } catch (err) {
    showToast('Failed to display report details.', 'error');
  }
}

function shareReportWhatsApp() {
  if (!currentViewingReport) return;
  showToast(`Simulating WhatsApp link dispatch to patient phone...`, 'success');
}

function shareReportEmail() {
  if (!currentViewingReport) return;
  showToast(`Emailed PDF Report ${currentViewingReport.report_number} to patient email!`, 'success');
}

document.addEventListener('DOMContentLoaded', () => {
  loadReports();

  document.getElementById('report-search-input')?.addEventListener('input', loadReports);
  document.getElementById('report-status-filter')?.addEventListener('change', loadReports);

  document.getElementById('upload-report-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const aptSelect = document.getElementById('r-appointment-id');
    const appointment_id = parseInt(aptSelect.value);
    const selectedOption = aptSelect.options[aptSelect.selectedIndex];
    const patient_id = parseInt(selectedOption.getAttribute('data-patient') || '1');

    const fileInput = document.getElementById('r-file');
    const notes = document.getElementById('r-notes').value.trim();

    // Extract params
    const rows = document.querySelectorAll('#params-container > div');
    const parameters = [];
    rows.forEach(r => {
      const name = r.querySelector('.param-name')?.value.trim();
      const value = r.querySelector('.param-val')?.value.trim();
      const unit = r.querySelector('.param-unit')?.value.trim();
      const range = r.querySelector('.param-range')?.value.trim();
      const status = r.querySelector('.param-status')?.value;
      if (name && value) {
        parameters.push({ name, value, unit, range, status });
      }
    });

    const formData = new FormData();
    formData.append('appointment_id', appointment_id);
    formData.append('patient_id', patient_id);
    formData.append('notes', notes);
    formData.append('digital_data_json', JSON.stringify({ parameters }));
    if (fileInput.files[0]) {
      formData.append('report_file', fileInput.files[0]);
    }

    try {
      const res = await API.post('/reports', formData);
      if (res.success) {
        showToast(res.message, 'success');
        closeModal('upload-report-modal');
        loadReports();
      }
    } catch (err) {
      showToast(err.message || 'Failed to upload report.', 'error');
    }
  });
});
