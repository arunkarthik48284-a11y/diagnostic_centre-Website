// QuickDiag Hybrid API Client (Express Backend + Supabase Cloud REST Direct Fallback)

const SUPABASE_URL = 'https://ptlefuhvtigmdhtmxiug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bGVmdWh2dGlnbWRodG14aXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTk0NDMsImV4cCI6MjEwMTQ5NTQ0M30.P66DObb9lMJpgUE11SNSfh9Cr8iNXxmvSh6MgS6ekTI';

const getApiBase = () => {
  if (window.CONFIG && window.CONFIG.API_BASE_URL) {
    return window.CONFIG.API_BASE_URL;
  }
  return '/api';
};

const API = {
  getToken() {
    return localStorage.getItem('qd_token');
  },

  async supabaseFetch(path, options = {}) {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Supabase Error: ${errText}`);
    }
    return res.json();
  },

  async handleSupabaseFallback(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    let body = {};
    if (options.body) {
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      } catch (e) {
        body = options.body;
      }
    }

    // 1. Auth Login Fallback
    if (endpoint.includes('/auth/login') && method === 'POST') {
      const { email } = body;
      const users = await this.supabaseFetch(`users?email=eq.${encodeURIComponent(email.trim().toLowerCase())}&select=*`);
      if (!users || users.length === 0) {
        throw new Error('Invalid credentials. User account not found.');
      }
      const user = users[0];
      if (user.status && user.status !== 'Active') {
        throw new Error('Your account is currently inactive.');
      }
      return {
        success: true,
        message: 'Login successful (Direct Supabase Cloud Connection)',
        token: `qd_sb_${user.id}_${Date.now()}`,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar
        }
      };
    }

    // 2. Patients Fallback
    if (endpoint.startsWith('/patients')) {
      if (method === 'GET') {
        const patients = await this.supabaseFetch('patients?select=*&order=id.desc');
        return { success: true, count: patients.length, patients };
      }
      if (method === 'POST') {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const existing = await this.supabaseFetch('patients?select=id&order=id.desc&limit=1');
        const nextId = existing.length > 0 ? existing[0].id + 1 : 1;
        const patient_code = `PT-${today}-${String(nextId).padStart(3, '0')}`;
        const inserted = await this.supabaseFetch('patients', {
          method: 'POST',
          body: JSON.stringify({
            patient_code,
            name: body.name,
            age: parseInt(body.age, 10),
            gender: body.gender,
            dob: body.dob || null,
            blood_group: body.blood_group || null,
            phone: body.phone,
            email: body.email || null,
            address: body.address || null,
            emergency_contact: body.emergency_contact || null,
            doctor_ref: body.doctor_ref || null
          })
        });
        return { success: true, message: 'Patient registered successfully.', patient: inserted[0] };
      }
    }

    // 3. Appointments Fallback
    if (endpoint.startsWith('/appointments')) {
      if (method === 'GET') {
        const appointments = await this.supabaseFetch('appointments?select=*,patients(name,patient_code,phone,gender,age)&order=appointment_date.desc');
        const tests = await this.supabaseFetch('tests?select=id,test_name,price,category');
        const testsMap = {};
        tests.forEach(t => testsMap[t.id] = t);

        const formatted = appointments.map(apt => {
          let testIds = [];
          try { testIds = typeof apt.test_ids === 'string' ? JSON.parse(apt.test_ids) : apt.test_ids; } catch (e) {}
          const testList = (testIds || []).map(id => testsMap[id]).filter(Boolean);
          const patientInfo = apt.patients || {};
          return {
            ...apt,
            patient_name: patientInfo.name || 'Patient',
            patient_code: patientInfo.patient_code || '',
            patient_phone: patientInfo.phone || '',
            gender: patientInfo.gender || '',
            age: patientInfo.age || '',
            tests: testList,
            total_price: testList.reduce((sum, t) => sum + parseFloat(t.price || 0), 0)
          };
        });
        return { success: true, count: formatted.length, appointments: formatted };
      }
      if (method === 'POST') {
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const existing = await this.supabaseFetch('appointments?select=id&order=id.desc&limit=1');
        const nextId = existing.length > 0 ? existing[0].id + 1 : 1;
        const appointment_number = `APT-${today}-${String(nextId).padStart(3, '0')}`;
        
        const insertedApt = await this.supabaseFetch('appointments', {
          method: 'POST',
          body: JSON.stringify({
            appointment_number,
            patient_id: body.patient_id,
            test_ids: JSON.stringify(body.test_ids),
            doctor_name: body.doctor_name || 'General Doctor',
            appointment_date: body.appointment_date,
            appointment_time: body.appointment_time,
            remarks: body.remarks || '',
            status: 'Booked',
            sample_status: 'Pending'
          })
        });
        return { success: true, message: 'Appointment booked successfully.', appointment: insertedApt[0] };
      }
    }

    // 4. Diagnostic Tests Fallback
    if (endpoint.startsWith('/tests')) {
      if (endpoint.includes('/categories')) {
        const tests = await this.supabaseFetch('tests?select=category');
        const categories = [...new Set(tests.map(t => t.category))].sort();
        return { success: true, categories };
      }
      const tests = await this.supabaseFetch('tests?select=*&order=category.asc,test_name.asc');
      return { success: true, count: tests.length, tests };
    }

    // 5. Reports Fallback
    if (endpoint.startsWith('/reports')) {
      const reports = await this.supabaseFetch('reports?select=*,patients(name,patient_code,phone),appointments(appointment_number)&order=created_at.desc');
      const formatted = reports.map(r => ({
        ...r,
        patient_name: r.patients?.name || 'Patient',
        patient_code: r.patients?.patient_code || '',
        appointment_number: r.appointments?.appointment_number || ''
      }));
      return { success: true, count: formatted.length, reports: formatted };
    }

    // 6. Billing / Invoices Fallback
    if (endpoint.startsWith('/billing')) {
      const invoices = await this.supabaseFetch('invoices?select=*,patients(name,patient_code,phone),appointments(appointment_number)&order=created_at.desc');
      const formatted = invoices.map(inv => ({
        ...inv,
        patient_name: inv.patients?.name || 'Patient',
        patient_code: inv.patients?.patient_code || '',
        appointment_number: inv.appointments?.appointment_number || ''
      }));
      return { success: true, count: formatted.length, invoices: formatted };
    }

    // 7. Users Fallback
    if (endpoint.startsWith('/users')) {
      const users = await this.supabaseFetch('users?select=id,name,email,role,phone,avatar,status,created_at&order=id.desc');
      return { success: true, count: users.length, users };
    }

    // 8. Analytics Fallback
    if (endpoint.startsWith('/analytics')) {
      const patients = await this.supabaseFetch('patients?select=id');
      const appointments = await this.supabaseFetch('appointments?select=id,status');
      const reports = await this.supabaseFetch('reports?select=id');
      const invoices = await this.supabaseFetch('invoices?select=grand_total,payment_status');

      const revenue = invoices
        .filter(inv => inv.payment_status === 'Paid')
        .reduce((sum, inv) => sum + parseFloat(inv.grand_total || 0), 0);

      return {
        success: true,
        stats: {
          total_patients: patients.length,
          total_appointments: appointments.length,
          pending_appointments: appointments.filter(a => a.status === 'Booked' || a.status === 'Pending').length,
          completed_reports: reports.length,
          total_revenue: revenue
        },
        monthlyRevenue: [],
        statusBreakdown: []
      };
    }

    return { success: true, data: [] };
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = options.headers || {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    const baseUrl = getApiBase();

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, config);

      if (response.status === 401 || response.status === 403) {
        if (!window.location.pathname.includes('login.html')) {
          localStorage.removeItem('qd_token');
          localStorage.removeItem('qd_user');
          window.location.href = '/login.html';
          return;
        }
      }

      const contentType = response.headers.get('content-type') || '';
      if (response.ok && contentType.includes('application/json')) {
        return await response.json();
      }

      // If backend returns 404, 405, or non-JSON (e.g. static site deployment on Vercel), fall back seamlessly to Direct Supabase Cloud REST API!
      console.warn(`Express API returned ${response.status}. Switching to Direct Supabase Cloud Database Client...`);
      return await this.handleSupabaseFallback(endpoint, options);
    } catch (err) {
      console.warn(`Express API fetch error [${endpoint}]. Switching to Direct Supabase Cloud Database Client...`, err);
      return await this.handleSupabaseFallback(endpoint, options);
    }
  },

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body)
    });
  },

  put(endpoint, body) {
    const isFormData = body instanceof FormData;
    return this.request(endpoint, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body)
    });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
};

window.API = API;
