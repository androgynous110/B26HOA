import { supabase } from './supabaseConfiguration.js';

const routePermissions = {
  '/president.html': ['president'],
  '/vice_president.html': ['vice_president'],
  '/secretary.html': ['secretary'],
  '/auditor.html': ['auditor'],
  '/treasurer.html': ['treasurer'],
  '/member.html': ['member'],
  '/dashboard.html': ['president', 'vice_president', 'secretary', 'auditor', 'treasurer', 'member'],
};

export const protectRoute = async (redirectTo = '/index.html', requiredRoles = null) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      console.log('No session, forcing redirect to:', redirectTo);
      localStorage.removeItem('user');
      window.location.replace(redirectTo);
      return false;
    }

    let profile = JSON.parse(localStorage.getItem('user'));

    if (!profile) {
      const { data, error: profileError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', session.user.id)
        .single();

      if (profileError || !data) {
        console.log('No profile found, redirecting to:', redirectTo);
        localStorage.removeItem('user');
        window.location.replace(redirectTo);
        return false;
      }

      profile = data;
      localStorage.setItem('user', JSON.stringify(profile));
    }

    const currentPath = window.location.pathname;
    const allowedRoles = requiredRoles || routePermissions[currentPath];

    if (allowedRoles && !allowedRoles.includes(profile.role)) {
      console.log(`Unauthorized access attempt by ${profile.role} to ${currentPath}, redirecting to:`, redirectTo);
      window.location.replace(redirectTo);
      return false;
    }

    return true; 
  } catch (err) {
    console.error('Auth check failed:', err.message);
    localStorage.removeItem('user');
    window.location.replace(redirectTo);
    return false;
  }
};

export const logoutUser = async () => {
  try {
    console.log('Attempting to log out...');
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Supabase signOut error:', error.message);
  } finally {
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/index.html');
  }
};