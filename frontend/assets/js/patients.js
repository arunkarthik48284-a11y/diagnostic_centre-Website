// QuickDiag Patients JS

let patientsList = [];

async function loadPatients() {
  const search = document.getElementById('patient-search-input')?.value.trim() || '';
  const gender = document.getElementById('gender-filter')?.value || '';
  const blood = document.getElementById('blood-filter')?.value || '';

  try {
    const res = await API.get(`/patients?search=${encodeURIComponent(search)}&gender=${gender}&blood_group=${encodeURIComponent(blood)}`);
    if (!res.success) return;

    patientsList = res.patients;
    renderPatientsTable(patientsList);
  } catch (err) {
    showToast('Failed to load patient records.', 'error');
  }
}

function renderPatientsTable(list) {
  const tbody = document.getElementById('patients-tbody');
  if (!tbody) return;

  const currentUser = Auth.getUser();
  const isAdmin = currentUser && currentUser.role === 'Admin';

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 font-medium">No patient records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(p => `
    <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
      <td class="px-6 py-4 font-mono text-blue-600 dark:text-blue-400 font-bold">${p.patient_code}</td>
      <td class="px-6 py-4">
        <p class="font-extrabold text-slate-900 dark:text-white">${p.name}</p>
        <span class="text-[10px] text-slate-400">Reg: ${formatDate(p.registration_date)}</span>
      </td>
      <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${p.age} Yrs / ${p.gender}</td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800">${p.blood_group || 'N/A'}</span>
      </td>
      <td class="px-6 py-4">
        <p class="text-slate-900 dark:text-white">${p.phone}</p>
        <p class="text-[10px] text-slate-400 truncate max-w-[140px]">${p.email || 'N/A'}</p>
      </td>
      <td class="px-6 py-4 text-slate-600 dark:text-slate-300">${p.doctor_ref || 'Self'}</td>
      <td class="px-6 py-4 text-center">
        <div class="flex items-center justify-center gap-1.5">
          <button onclick="showQRCode('${p.patient_code}', '${p.name}')" title="View Patient ID QR" class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100">
            <i data-lucide="qr-code" class="w-4 h-4"></i>
          </button>
          <button onclick="editPatient(${p.id})" title="Edit Patient" class="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 hover:bg-blue-100">
            <i data-lucide="edit-3" class="w-4 h-4"></i>
          </button>
          ${isAdmin ? `
            <button onclick="deletePatient(${p.id}, '${p.name}')" title="Delete Patient" class="p-1.5 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 hover:bg-red-100">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function openPatientModal() {
  document.getElementById('patient-form').reset();
  document.getElementById('edit-patient-id').value = '';
  document.getElementById('patient-modal-title').innerText = 'Register New Patient';
  openModal('patient-modal');
}

function editPatient(id) {
  const p = patientsList.find(item => item.id === id);
  if (!p) return;

  document.getElementById('edit-patient-id').value = p.id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-phone').value = p.phone;
  document.getElementById('p-age').value = p.age;
  document.getElementById('p-gender').value = p.gender;
  document.getElementById('p-dob').value = p.dob || '';
  document.getElementById('p-blood').value = p.blood_group || '';
  document.getElementById('p-email').value = p.email || '';
  document.getElementById('p-doctor').value = p.doctor_ref || '';
  document.getElementById('p-emergency').value = p.emergency_contact || '';
  document.getElementById('p-address').value = p.address || '';

  document.getElementById('patient-modal-title').innerText = 'Edit Patient Details';
  openModal('patient-modal');
}

async function deletePatient(id, name) {
  if (!confirm(`Are you sure you want to delete patient "${name}"? This action cannot be undone.`)) return;

  try {
    const res = await API.delete(`/patients/${id}`);
    if (res.success) {
      showToast(res.message, 'success');
      loadPatients();
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete patient.', 'error');
  }
}

function showQRCode(code, name) {
  document.getElementById('qr-patient-name').innerText = name;
  document.getElementById('qr-patient-code').innerText = code;
  const box = document.getElementById('qrcode-box');
  box.innerHTML = '';
  if (window.QRCode) {
    new QRCode(box, {
      text: `QUICKDIAG:${code}:${name}`,
      width: 160,
      height: 160
    });
  } else {
    box.innerHTML = `<p class="text-xs text-slate-500 font-mono p-4">${code}</p>`;
  }
  openModal('qr-modal');
}

function handleExportPatients() {
  if (!patientsList || patientsList.length === 0) {
    showToast('No patients data to export.', 'warning');
    return;
  }
  const headers = ['Patient Code', 'Name', 'Age', 'Gender', 'Blood Group', 'Phone', 'Email', 'Doctor Ref', 'Reg Date'];
  const rows = patientsList.map(p => [
    p.patient_code,
    p.name,
    p.age,
    p.gender,
    p.blood_group || '',
    p.phone,
    p.email || '',
    p.doctor_ref || '',
    p.registration_date
  ]);
  exportToCSV('quickdiag_patients', headers, rows);
}

document.addEventListener('DOMContentLoaded', () => {
  loadPatients();

  document.getElementById('patient-search-input')?.addEventListener('input', loadPatients);
  document.getElementById('gender-filter')?.addEventListener('change', loadPatients);
  document.getElementById('blood-filter')?.addEventListener('change', loadPatients);

  document.getElementById('patient-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-patient-id').value;

    const payload = {
      name: document.getElementById('p-name').value.trim(),
      phone: document.getElementById('p-phone').value.trim(),
      age: parseInt(document.getElementById('p-age').value),
      gender: document.getElementById('p-gender').value,
      dob: document.getElementById('p-dob').value,
      blood_group: document.getElementById('p-blood').value,
      email: document.getElementById('p-email').value.trim(),
      doctor_ref: document.getElementById('p-doctor').value.trim(),
      emergency_contact: document.getElementById('p-emergency').value.trim(),
      address: document.getElementById('p-address').value.trim()
    };

    try {
      let res;
      if (id) {
        res = await API.put(`/patients/${id}`, payload);
      } else {
        res = await API.post('/patients', payload);
      }

      if (res.success) {
        showToast(res.message, 'success');
        closeModal('patient-modal');
        loadPatients();
      }
    } catch (err) {
      showToast(err.message || 'Error saving patient record.', 'error');
    }
  });
});
