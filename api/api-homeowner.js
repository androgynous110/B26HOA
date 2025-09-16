import { supabase } from './supabaseConfiguration.js';

export const fetchHomeowners = async (search = "", status = "") => {
  let query = supabase
    .from('homeowners')
    .select('id, first_name, middle_name, last_name, email, contact_info, type_user, status, created_at, updated_at')
    .order('first_name', { ascending: true });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,middle_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }

  if (status && status !== "all") {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching homeowners:', error);
  }

  return data || [];
};


export const createHomeowner = async (newHomeowner) => {
  const { data, error } = await supabase
    .from('homeowners')
    .insert([newHomeowner])
    .select();

  if (error) {
    console.error('Error creating homeowner:', error);
    throw error;
  }
  return data[0];
};

export const updateHomeowner = async (id, updates) => {
  const { data, error } = await supabase
    .from('homeowners')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) {
    console.error('Error updating homeowner:', error);
    throw error;
  }
  return data[0];
};

export const deleteHomeowner = async (id) => {
  const { error } = await supabase
    .from('homeowners')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting homeowner:', error);
    throw error;
  }
};
