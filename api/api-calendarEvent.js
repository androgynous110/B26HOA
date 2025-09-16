import { supabase } from './supabaseConfiguration.js';

export const fetchEventsForMonth = async (year, month) => {
  const start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${String(month + 1).padStart(2, '0')}-${endDate}`;

  const { data, error } = await supabase
    .from('events')
    .select('id, title, description, event_date, user_id, users(username, role)')
    .gte('event_date', start)
    .lte('event_date', end)
    .order('event_date', { ascending: true });

  return { data, error };
};

export const insertEvent = async ({ title, description, event_date, user_id }) => {
  const { error } = await supabase.from('events').insert([
    { title, description, event_date, user_id }
  ]);
  return { error };
};

export const deleteEvent = async (eventId) => {
  const { error } = await supabase.from('events').delete().eq('id', eventId);
  return { error };
};
