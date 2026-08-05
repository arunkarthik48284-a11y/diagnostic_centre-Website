// QuickDiag Authentication & Layout Injector

const Auth = {
  getUser() {
    const u = localStorage.getItem('qd_user');
    return u ? JSON.parse(u) : null;
  },

  getToken() {
    return localStorage.getItem('qd_token');
  },

  logout() {
    localStorage.removeItem('qd_token');
    localStorage.removeItem('qd_user');
    window.location.href = '/login.html';
  },

  checkAuth() {
    const token = this.getToken();
    const isLoginPage = window.location.pathname.includes('login.html');

    if (!token && !isLoginPage) {
      window.location.href = '/login.html';
      return false;
    }

    if (token && isLoginPage) {
      window.location.href = '/dashboard.html';
      return false;
    }

    return true;
  },

  renderLayout() {
    const user = this.getUser();
    if (!user) return;

    const currentPath = window.location.pathname;

    // 1. Sidebar HTML
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
      const navItems = [
        { name: 'Dashboard', icon: 'grid', href: '/dashboard.html', roles: ['Admin', 'Receptionist', 'Lab Technician', 'Patient'] },
        { name: 'Patients', icon: 'users', href: '/patients.html', roles: ['Admin', 'Receptionist', 'Lab Technician'] },
        { name: 'Appointments', icon: 'calendar', href: '/appointments.html', roles: ['Admin', 'Receptionist', 'Lab Technician', 'Patient'] },
        { name: 'Diagnostic Tests', icon: 'activity', href: '/tests.html', roles: ['Admin', 'Receptionist', 'Lab Technician', 'Patient'] },
        { name: 'Reports', icon: 'file-text', href: '/reports.html', roles: ['Admin', 'Receptionist', 'Lab Technician', 'Patient'] },
        { name: 'Billing', icon: 'credit-card', href: '/billing.html', roles: ['Admin', 'Receptionist', 'Patient'] },
        { name: 'Staff Users', icon: 'user-check', href: '/users.html', roles: ['Admin'] },
        { name: 'Settings', icon: 'settings', href: '/settings.html', roles: ['Admin'] },
      ];

      const visibleNav = navItems.filter(item => item.roles.includes(user.role));

      sidebarContainer.innerHTML = `
        <div class="h-screen sticky top-0 flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-64 px-4 py-6 z-30 transition-all">
          <div>
            <!-- Logo Header -->
            <div class="flex items-center gap-3 px-3 mb-8">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
                Q
              </div>
              <div>
                <h1 class="font-extrabold text-lg text-slate-900 dark:text-white tracking-tight leading-none">QuickDiag</h1>
                <span class="text-xs text-blue-600 dark:text-blue-400 font-semibold tracking-wide uppercase">Diagnostic Centre</span>
              </div>
            </div>

            <!-- Navigation Links -->
            <nav class="space-y-1.5">
              ${visibleNav.map(item => {
                const isActive = currentPath.includes(item.href);
                const activeClass = isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white';
                return `
                  <a href="${item.href}" class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all ${activeClass}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    <span>${item.name}</span>
                  </a>
                `;
              }).join('')}
            </nav>
          </div>

          <!-- Bottom User & Profile Card -->
          <div class="pt-4 border-t border-slate-200 dark:border-slate-800">
            <a href="/profile.html" class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">
              <img src="${user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}" alt="${user.name}" class="w-10 h-10 rounded-full object-cover border-2 border-blue-500">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-900 dark:text-white truncate">${user.name}</p>
                <p class="text-xs text-slate-500 dark:text-slate-400 truncate">${user.role}</p>
              </div>
            </a>
            <button onclick="Auth.logout()" class="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 rounded-xl transition">
              <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
            </button>
          </div>
        </div>
      `;
    }

    // 2. Header Navbar HTML
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
      headerContainer.innerHTML = `
        <header class="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <!-- Global Search Input -->
          <div class="relative w-72 lg:w-96">
            <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
            <input type="text" id="global-search-input" placeholder="Search patients, appointments, tests..." class="w-full pl-10 pr-4 py-2 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none">
            <div id="search-dropdown" class="absolute left-0 right-0 top-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl hidden max-h-96 overflow-y-auto z-50 p-2"></div>
          </div>

          <!-- Header Right Actions -->
          <div class="flex items-center gap-4">
            <!-- Theme Toggle -->
            <button onclick="toggleTheme()" class="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
              <i data-lucide="moon" class="w-5 h-5 hidden dark:block"></i>
              <i data-lucide="sun" class="w-5 h-5 block dark:hidden"></i>
            </button>

            <!-- Notifications Dropdown -->
            <div class="relative">
              <button onclick="document.getElementById('notif-dropdown').classList.toggle('hidden')" class="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition relative">
                <i data-lucide="bell" class="w-5 h-5"></i>
                <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
                <span class="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600"></span>
              </button>
              <div id="notif-dropdown" class="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl hidden z-50 p-4">
                <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h4 class="font-bold text-sm">Notifications</h4>
                  <span class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">2 New</span>
                </div>
                <div class="space-y-3 pt-3 text-xs">
                  <div class="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900">
                    <p class="font-semibold text-slate-900 dark:text-white">Report Ready</p>
                    <p class="text-slate-500 dark:text-slate-400">Report REP-20260804-002 for Sophia Martinez is ready.</p>
                  </div>
                  <div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                    <p class="font-semibold text-slate-900 dark:text-white">New Appointment</p>
                    <p class="text-slate-500 dark:text-slate-400">David Miller booked for Chest X-Ray at 02:00 PM.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Role Badge -->
            <span class="hidden sm:inline-flex px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              ${user.role}
            </span>
          </div>
        </header>
      `;

      this.initGlobalSearch();
    }

    // Refresh Lucide Icons if available
    if (window.lucide) {
      window.lucide.createIcons();
    }
  },

  initGlobalSearch() {
    const input = document.getElementById('global-search-input');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    let timeout = null;
    input.addEventListener('input', (e) => {
      clearTimeout(timeout);
      const query = e.target.value.trim();
      if (query.length < 2) {
        dropdown.classList.add('hidden');
        return;
      }

      timeout = setTimeout(async () => {
        try {
          const res = await API.get(`/search?q=${encodeURIComponent(query)}`);
          if (!res.success) return;

          const { patients, appointments, reports, tests, invoices } = res.results;
          let html = '';

          if (patients.length) {
            html += `<div class="px-3 py-1 text-xs font-bold text-slate-400 uppercase">Patients</div>`;
            patients.forEach(p => {
              html += `<a href="/patients.html?search=${p.title}" class="block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold">👤 ${p.subtitle} (${p.title})</a>`;
            });
          }

          if (appointments.length) {
            html += `<div class="px-3 py-1 text-xs font-bold text-slate-400 uppercase mt-2">Appointments</div>`;
            appointments.forEach(a => {
              html += `<a href="/appointments.html?search=${a.title}" class="block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold">📅 ${a.title} - ${a.subtitle}</a>`;
            });
          }

          if (reports.length) {
            html += `<div class="px-3 py-1 text-xs font-bold text-slate-400 uppercase mt-2">Reports</div>`;
            reports.forEach(r => {
              html += `<a href="/reports.html?search=${r.title}" class="block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold">📄 ${r.title} (${r.subtitle})</a>`;
            });
          }

          if (tests.length) {
            html += `<div class="px-3 py-1 text-xs font-bold text-slate-400 uppercase mt-2">Tests</div>`;
            tests.forEach(t => {
              html += `<a href="/tests.html?search=${t.title}" class="block p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold">🧪 ${t.title} - $${t.price}</a>`;
            });
          }

          if (!html) {
            html = `<div class="p-3 text-xs text-slate-500 text-center">No matching records found.</div>`;
          }

          dropdown.innerHTML = html;
          dropdown.classList.remove('hidden');
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (Auth.checkAuth()) {
    Auth.renderLayout();
  }
});

window.Auth = Auth;
