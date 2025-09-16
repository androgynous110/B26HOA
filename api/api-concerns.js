import { supabase } from "./supabaseConfiguration.js";

export const fetchConcerns = async (status = "") => {
  let query = supabase
    .from("concerns")
    .select(`
      id,
      title,
      category,
      message,
      is_resolved,
      created_at,
      homeowner_id,
      homeowners (first_name, middle_name, last_name)
    `)
    .order("created_at", { ascending: false });

  if (status === 'Resolved') {
    query = query.eq('is_resolved', true);
  } else if (status === 'Unresolved') {
    query = query.eq('is_resolved', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching concerns:", error);
    return [];
  }

  return data.map(c => ({
    ...c,
    full_name: `${c.homeowners.first_name} ${c.homeowners.middle_name || ''} ${c.homeowners.last_name}`.trim()
  }));
};

export const createConcern = async (title, message, category, homeowner_id) => {
  const { data, error } = await supabase
    .from("concerns")
    .insert([{
      title,
      message,
      homeowner_id,
      category,
      is_resolved: false
    }]);

  if (error) throw new Error("Error creating concern: " + error.message);
  return data;
};

export const resolveConcern = async (id) => {
  const { data, error } = await supabase
    .from("concerns")
    .update({ is_resolved: true })
    .eq("id", id);

  if (error) throw new Error("Error resolving concern: " + error.message);
  return data;
};

export const deleteConcern = async (id) => {
  const { data, error } = await supabase
    .from("concerns")
    .delete()
    .eq("id", id);

  if (error) throw new Error("Error deleting concern: " + error.message);
  return data;
};

export const userfetchConcerns = async (homeowner_id) => {
  let query = supabase
    .from("concerns")
    .select(`
      id,
      title,
      category,
      message,
      is_resolved,
      created_at,
      homeowner_id,
      homeowners (first_name, middle_name, last_name)
    `)
    .order("created_at", { ascending: false });

  if (homeowner_id) {
    query = query.eq('homeowner_id', homeowner_id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching concerns:", error);
    return [];
  }

  return data.map(c => ({
    ...c,
    full_name: c.homeowners ? `${c.homeowners.first_name} ${c.homeowners.middle_name || ''} ${c.homeowners.last_name}`.trim() : 'Unknown'
  }));
};

export const currentConcern = async (homeowner_id, currentMonth) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = currentMonth ?? now.getMonth();

  let query = supabase
    .from('concerns')
    .select(`
      id,
      title,
      category,
      message,
      is_resolved,
      created_at,
      homeowner_id,
      homeowners (first_name, middle_name, last_name)
    `)
    .gte('created_at', new Date(year, month, 1).toISOString())
    .lt('created_at', new Date(year, month + 1, 1).toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (homeowner_id) {
    query = query.eq('homeowner_id', homeowner_id);
  }

  const { data, error } = await query;

  return { data, error };
};
