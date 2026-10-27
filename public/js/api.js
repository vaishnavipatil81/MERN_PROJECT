const API = (() => {
  const TOKEN_KEY = 'speakflow_token';
  const USER_KEY = 'speakflow_user';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function getUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function setSession({ token, user }) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new CustomEvent('speakflow:session-cleared'));
  }

  async function request(path, options = {}) {
    const headers = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(path, { ...options, headers: { ...headers, ...options.headers } });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401 && !path.includes('/api/auth/login')) {
        clearSession();
        window.location.hash = 'login';
      }
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  return { request, getToken, getUser, setSession, clearSession };
})();
