// QuickDiag Frontend Global Configuration Runtime Wrapper

const getApiUrl = () => {
  if (window.CUSTOM_API_URL) return window.CUSTOM_API_URL;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  return window.location.origin + '/api';
};

const CONFIG = {
  API_BASE_URL: getApiUrl(),
  SUPABASE_URL: 'https://ptlefuhvtigmdhtmxiug.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bGVmdWh2dGlnbWRodG14aXVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MTk0NDMsImV4cCI6MjEwMTQ5NTQ0M30.P66DObb9lMJpgUE11SNSfh9Cr8iNXxmvSh6MgS6ekTI'
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
