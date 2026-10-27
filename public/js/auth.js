const Auth = (() => {
  async function login(email, password, role = 'student') {
    const data = await API.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role })
    });
    API.setSession(data);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await API.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    API.setSession(data);
    return data.user;
  }

  async function forgotPassword(email) {
    return API.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async function resetPassword(token, password) {
    const data = await API.request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password })
    });
    API.setSession(data);
    return data.user;
  }

  async function updateProfile(payload) {
    const data = await API.request('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    const user = { ...data.user, id: data.user.id || data.user._id };
    localStorage.setItem('speakflow_user', JSON.stringify(user));
    return user;
  }

  return { login, register, forgotPassword, resetPassword, updateProfile };
})();
