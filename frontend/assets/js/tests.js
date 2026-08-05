// QuickDiag Diagnostic Tests JS

let testsList = [];
let activeCategory = '';

async function loadTests() {
  const search = document.getElementById('test-search-input')?.value.trim() || '';

  try {
    const res = await API.get(`/tests?search=${encodeURIComponent(search)}&category=${encodeURIComponent(activeCategory)}`);
    if (!res.success) return;

    testsList = res.tests;
    renderTestsGrid(testsList);
    loadCategoryPills();
  } catch (err) {
    showToast('Failed to load diagnostic tests.', 'error');
  }
}

async function loadCategoryPills() {
  const container = document.getElementById('category-pills');
  if (!container || container.children.length > 0) return;

  try {
    const res = await API.get('/tests/categories');
    if (!res.success) return;

    const categories = ['All', ...(res.categories || [])];

    container.innerHTML = categories.map(cat => {
      const catVal = cat === 'All' ? '' : cat;
      const isSelected = activeCategory === catVal;
      const btnClass = isSelected
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 font-bold'
        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 font-semibold';
      return `<button onclick="filterCategory('${catVal}')" class="px-3.5 py-1.5 rounded-xl text-xs transition ${btnClass}">${cat}</button>`;
    }).join('');
  } catch(e){}
}

function filterCategory(cat) {
  activeCategory = cat;
  document.getElementById('category-pills').innerHTML = '';
  loadTests();
}

function renderTestsGrid(list) {
  const grid = document.getElementById('tests-grid');
  if (!grid) return;

  const currentUser = Auth.getUser();
  const isAdmin = currentUser && currentUser.role === 'Admin';

  if (!isAdmin) {
    const addBtn = document.getElementById('btn-add-test');
    if (addBtn) addBtn.style.display = 'none';
  }

  if (!list || list.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 font-medium">No matching diagnostic tests found.</div>`;
    return;
  }

  grid.innerHTML = list.map(t => {
    let catBadgeColor = 'bg-blue-50 text-blue-600 border-blue-200';
    if (t.category === 'Radiology') catBadgeColor = 'bg-purple-50 text-purple-600 border-purple-200';
    else if (t.category === 'Cardiology') catBadgeColor = 'bg-rose-50 text-rose-600 border-rose-200';
    else if (t.category === 'Molecular') catBadgeColor = 'bg-cyan-50 text-cyan-600 border-cyan-200';

    return `
      <div class="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:shadow-md transition">
        <div>
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-3 py-1 rounded-full text-xs font-bold border ${catBadgeColor}">${t.category}</span>
            <span class="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <i data-lucide="clock" class="w-3.5 h-3.5"></i> ${t.estimated_hours}h lead
            </span>
          </div>

          <h3 class="font-extrabold text-lg text-slate-900 dark:text-white leading-snug">${t.test_name}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">${t.description || 'Comprehensive clinical pathology evaluation.'}</p>

          ${t.prep_instructions ? `
            <div class="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-[11px] text-slate-600 dark:text-slate-300">
              <span class="font-bold block text-slate-700 dark:text-slate-200">Preparation:</span>
              ${t.prep_instructions}
            </div>
          ` : ''}
        </div>

        <div class="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-slate-400 font-bold uppercase block">Test Price</span>
            <span class="text-xl font-extrabold text-blue-600 dark:text-blue-400">${formatCurrency(t.price)}</span>
          </div>

          ${isAdmin ? `
            <div class="flex items-center gap-2">
              <button onclick="editTest(${t.id})" class="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteTest(${t.id}, '${t.test_name}')" class="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-300">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

function openTestModal() {
  document.getElementById('test-form').reset();
  document.getElementById('edit-test-id').value = '';
  document.getElementById('test-modal-title').innerText = 'Add New Diagnostic Test';
  openModal('test-modal');
}

function editTest(id) {
  const t = testsList.find(item => item.id === id);
  if (!t) return;

  document.getElementById('edit-test-id').value = t.id;
  document.getElementById('t-name').value = t.test_name;
  document.getElementById('t-category').value = t.category;
  document.getElementById('t-price').value = t.price;
  document.getElementById('t-hours').value = t.estimated_hours || 24;
  document.getElementById('t-desc').value = t.description || '';
  document.getElementById('t-prep').value = t.prep_instructions || '';

  document.getElementById('test-modal-title').innerText = 'Edit Diagnostic Test';
  openModal('test-modal');
}

async function deleteTest(id, name) {
  if (!confirm(`Are you sure you want to delete test "${name}"?`)) return;

  try {
    const res = await API.delete(`/tests/${id}`);
    if (res.success) {
      showToast(res.message, 'success');
      loadTests();
    }
  } catch (err) {
    showToast(err.message || 'Failed to delete test.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadTests();

  document.getElementById('test-search-input')?.addEventListener('input', loadTests);

  document.getElementById('test-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-test-id').value;

    const payload = {
      test_name: document.getElementById('t-name').value.trim(),
      category: document.getElementById('t-category').value,
      price: parseFloat(document.getElementById('t-price').value),
      estimated_hours: parseInt(document.getElementById('t-hours').value || 24),
      description: document.getElementById('t-desc').value.trim(),
      prep_instructions: document.getElementById('t-prep').value.trim()
    };

    try {
      let res;
      if (id) {
        res = await API.put(`/tests/${id}`, payload);
      } else {
        res = await API.post('/tests', payload);
      }

      if (res.success) {
        showToast(res.message, 'success');
        closeModal('test-modal');
        loadTests();
      }
    } catch (err) {
      showToast(err.message || 'Error saving test.', 'error');
    }
  });
});
