import { supabase } from '../api/supabaseConfiguration.js';
import { loginUser } from '../api/api-authentication.js';
import { logoutUser } from '../api/auth-guard.js';

const showWarning = (message) => {
  const box = document.querySelector('.warning-message');
  const h3 = box.querySelector('.warning-content h3');
  const p = box.querySelector('.warning-content p');

  h3.textContent = 'Login Error';
  p.textContent = message;
  box.style.display = 'flex';
};

const loginUI = (() => {
  const showPassword = () => {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('passwordInput');

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
      }, { passive: true });
    }
  };

  const getRedirectForRole = (role) => {
    switch (role.toLowerCase()) {
      case 'president':
        return '/president.html';
      case 'vice_president':
        return '/vice_president.html';
      case 'secretary':
        return '/secretary.html';
      case 'treasurer':
        return '/treasurer.html';
      case 'auditor':
        return '/auditor.html';
      case 'member':
        return '/member.html';
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.email.value;
    const password = form.password.value;

    try {
      const profile = await loginUser(email, password);
      console.log('Login profile:', profile);

      if (!profile || !profile.role) {
        throw new Error('Invalid profile data');
      }

      localStorage.setItem('user', JSON.stringify(profile));

      const redirectTo = getRedirectForRole(profile.role);
      console.log('Redirecting to:', redirectTo);
      window.location.assign(redirectTo);

    } catch (err) {
      showWarning(err.message);
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session check error:', error.message);
        window.location.assign('/index.html');
        return;
      }

      if (session && !window.location.pathname.includes('dashboard')) {
        let profile = JSON.parse(localStorage.getItem('user'));

        if (!profile) {
          const { data, error: profileError } = await supabase
            .from('users')
            .select('id, email, role')
            .eq('id', session.user.id)
            .single();

          if (profileError || !data) {
            console.error('Failed to fetch profile:', profileError?.message);
            window.location.assign('/index.html');
            return;
          }

          profile = data;
          localStorage.setItem('user', JSON.stringify(profile));
        }

        const redirectTo = getRedirectForRole(profile.role);
        console.log('Redirecting to:', redirectTo);
        window.location.assign(redirectTo);
      }
    } catch (err) {
      logoutUser();
    }
  };

  const init = () => {
    console.log('Login UI initialized');
    checkSession();
    showPassword();

    const form = document.getElementById('login-form');
    const warningBox = document.querySelector('.warning-message');

    if (warningBox) {
      warningBox.style.display = 'none';
      const closeButton = warningBox.querySelector('.close-warning');
      closeButton?.addEventListener('click', () => {
        warningBox.style.display = 'none';
      });
    }

    form?.addEventListener('submit', handleLoginSubmit);
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing login UI');
  loginUI.init();
});