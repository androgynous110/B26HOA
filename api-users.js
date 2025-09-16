
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://bfcdycndnjbgaciblgbm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmY2R5Y25kbmpiZ2FjaWJsZ2JtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTM3Nzc5MywiZXhwIjoyMDY0OTUzNzkzfQ.WDAVjIbIodkFojOHKai0oh2Nm-ROjZaPMl6Nqp9-46g';

const supabase = createClient(supabaseUrl, supabaseKey);


export const createUserAccount = async (email, password, username, role, contact_info) => {  const validRoles = ['member'];
  if (!validRoles.includes(role)) {
    console.error('Invalid role');
    return;
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    console.error('User already exists');
    return;
  }

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authUser?.user?.id) {
    console.error('Auth creation failed:', authError?.message);
    return;
  }
  const authId = authUser.user.id;
  console.log('Successfully Created auth user with ID:', authId);
  
  const { data: customUser, error: userError } = await supabase
    .from('users')
    .insert([{ id: authId, username, email, role, contact_info }]);
  if (userError) {
    console.error('Error: Insert into public.users failed:', userError.message || userError);
    await supabase.auth.admin.deleteUser(authId);
    console.log('Successfully Rolled back auth user with ID:', authId);
    return;
  }
  console.log('Successfully User created successfully:', customUser);

  return {
  id: authId,
  email,
  username,
  role,
  contact_info
  };
}

export const deleteUserAccount = async (id) => {
  try{
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if(authError){
      console.error('Error: Failed to delete user from auth.users:', authError.message);
      return;
    }

    const { error: userError } = await supabase
    .from('users')
    .delete()
    .eq('id', id);

    if(userError){
      console.error('Error: Failed to delete user from public.users: ', userError.message);
    }

  }catch (error) {
    console.log('Error deleting account: ', error.message || error);
  }
}