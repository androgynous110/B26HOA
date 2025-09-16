import { supabase } from './supabaseConfiguration.js';

export async function loginUser(email, password) {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    const { data: userRecord, error: lookupError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!userRecord) {
      throw new Error('User does not exist');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error('Your password is incorrect.');
    }

    const user = data.user;

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('Failed to fetch user profile');
    }

    console.log('Login successful, profile:', profile);
    return profile;
  } catch (err) {
    console.error('Login error:', err.message);
    throw err;
  }
}