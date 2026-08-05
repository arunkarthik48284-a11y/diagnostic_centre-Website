// QuickDiag Billing & Invoices JS

let invoicesList = [];
let activeViewingInvoice = null;

async function loadInvoices() {
  const search = document.getElementById('bill-search-input')?.value.trim() || '';
  const payment_status = document.getElementById('bill-status-filter')?.value || '';

  try {
    const res = await API.get(`/billing?search=${encodeURIComponent(search)}&payment_status=${payment_status}`);
    if (!res.success) return;

    invoicesList = res.invoices;
    renderInvoicesTable(invoicesList);
    updateFinancialKPIs(invoicesList);
  } catch (err) {
    showToast('Failed to load invoices.', 'error');
  }
}

function updateFinancialKPIs(list) {
  let gross = 0;
  let paid = 0;
  let pending = 0;

  list.forEach(i => {
    gross += i.grand_total;
    if (i.payment_status === 'Paid') paid += i.grand_total;
    else pending += i.grand_total;
  });

  document.getElementById('bill-stat-gross').innerText = formatCurrency(gross);
  document.getElementById('bill-stat-paid').innerText = formatCurrency(paid);
  document.getElementById('bill-stat-pending').innerText = formatCurrency(pending);
}

function renderInvoicesTable(list) {
  const tbody = document.getElementById('invoices-tbody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="py-6 text-center text-slate-400 font-medium">No invoice records found.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(i => {
    let payClass = 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (i.payment_status === 'Pending') payClass = 'bg-amber-50 text-amber-600 border-amber-200';
    else if (i.payment_status === 'Partial') payClass = 'bg-blue-50 text-blue-600 border-blue-200';

    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
        <td class="px-6 py-4 font-mono text-blue-600 dark:text-blue-400 font-bold">${i.invoice_number}</td>
        <td class="px-6 py-4">
          <p class="font-extrabold text-slate-900 dark:text-white">${i.patient_name}</p>
          <span class="text-[10px] text-slate-400">${i.patient_code} | ${i.patient_phone}</span>
        </td>
        <td class="px-6 py-4 text-slate-600 dark:text-slate-300">
          ${formatCurrency(i.total_amount)} / tax ${formatCurrency(i.tax_amount)}
        </td>
        <td class="px-6 py-4 font-extrabold text-slate-900 dark:text-white text-sm">
          ${formatCurrency(i.grand_total)}
        </td>
        <td class="px-6 py-4 text-slate-600 dark:text-slate-300">
          <span class="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 font-bold text-[10px]">${i.payment_method || 'Cash'}</span>
        </td>
        <td class="px-6 py-4">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border ${payClass}">${i.payment_status}</span>
        </td>
        <td class="px-6 py-4 text-center">
          <button onclick="viewInvoice(${i.id})" class="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 mx-auto">
            <i data-lucide="receipt" class="w-3.5 h-3.5"></i> View Bill
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function viewInvoice(id) {
  try {
    const res = await API.get(`/billing/${id}`);
    if (!res.success) return;

    const inv = res.invoice;
    const centre = res.centre;
    activeViewingInvoice = inv;

    if (centre) {
      document.getElementById('inv-centre-name').innerText = centre.centre_name;
      document.getElementById('inv-centre-addr').innerText = centre.address;
      document.getElementById('inv-centre-contact').innerText = `Phone: ${centre.phone} | Email: ${centre.email}`;
    }

    document.getElementById('inv-num').innerText = inv.invoice_number;
    document.getElementById('inv-date').innerText = formatDate(inv.created_at);
    document.getElementById('inv-patient-name').innerText = inv.patient_name;
    document.getElementById('inv-patient-phone').innerText = `Phone: ${inv.patient_phone}`;
    document.getElementById('inv-patient-addr').innerText = inv.patient_address || 'Address on file';

    document.getElementById('inv-pay-status').innerText = `Status: ${inv.payment_status}`;
    document.getElementById('inv-pay-method').innerText = `Method: ${inv.payment_method}`;
    document.getElementById('inv-appt-num').innerText = `Appt: ${inv.appointment_number}`;

    document.getElementById('update-pay-status').value = inv.payment_status;
    document.getElementById('update-pay-method').value = inv.payment_method || 'Cash';

    // Math
    document.getElementById('inv-math-subtotal').innerText = formatCurrency(inv.total_amount);
    document.getElementById('inv-math-discount').innerText = `-${formatCurrency(inv.discount_amount)}`;
    document.getElementById('inv-math-tax').innerText = formatCurrency(inv.tax_amount);
    document.getElementById('inv-math-total').innerText = formatCurrency(inv.grand_total);

    // Tests Table
    const tbody = document.getElementById('inv-items-tbody');
    const tests = inv.tests || [];
    if (tests.length > 0) {
      tbody.innerHTML = tests.map((t, idx) => `
        <tr>
          <td class="p-2.5 text-slate-400">${idx + 1}</td>
          <td class="p-2.5 text-slate-900 dark:text-white font-bold">${t.test_name}</td>
          <td class="p-2.5 text-slate-500">${t.category}</td>
          <td class="p-2.5 text-right font-extrabold text-blue-600">${formatCurrency(t.price)}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400">Diagnostic procedure services.</td></tr>`;
    }

    openModal('invoice-modal');
  } catch (err) {
    showToast('Failed to load invoice details.', 'error');
  }
}

async function handleUpdatePaymentSubmit() {
  if (!activeViewingInvoice) return;

  const payment_status = document.getElementById('update-pay-status').value;
  const payment_method = document.getElementById('update-pay-method').value;

  try {
    const res = await API.put(`/billing/${activeViewingInvoice.id}/pay`, { payment_status, payment_method });
    if (res.success) {
      showToast(res.message, 'success');
      closeModal('invoice-modal');
      loadInvoices();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update payment.', 'error');
  }
}

function handleExportInvoices() {
  if (!invoicesList || invoicesList.length === 0) {
    showToast('No invoices to export.', 'warning');
    return;
  }
  const headers = ['Invoice Number', 'Patient', 'Phone', 'Subtotal', 'Tax', 'Grand Total', 'Payment Status', 'Payment Method', 'Date'];
  const rows = invoicesList.map(i => [
    i.invoice_number,
    i.patient_name,
    i.patient_phone,
    i.total_amount,
    i.tax_amount,
    i.grand_total,
    i.payment_status,
    i.payment_method,
    i.created_at
  ]);
  exportToCSV('quickdiag_invoices', headers, rows);
}

document.addEventListener('DOMContentLoaded', () => {
  loadInvoices();

  document.getElementById('bill-search-input')?.addEventListener('input', loadInvoices);
  document.getElementById('bill-status-filter')?.addEventListener('change', loadInvoices);
});
