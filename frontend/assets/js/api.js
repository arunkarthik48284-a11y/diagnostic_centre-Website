// QuickDiag API Client

const API_BASE = '/api';

const API = {
  getToken() {
    return localStorage.getItem('qd_token');
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

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);

      if (response.status === 401 || response.status === 403) {
        if (!window.location.pathname.includes('login.html')) {
          localStorage.removeItem('qd_token');
          localStorage.removeItem('qd_user');
          window.location.href = '/login.html';
          return;
        }
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'An error occurred during request.');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
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
