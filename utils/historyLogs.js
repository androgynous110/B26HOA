import { supabase } from "../api/supabaseConfiguration.js";

export const logDueHistory = async (dueId, homeownerId, userId, action, oldData, newData, remarks) => {
  try {
    const { data, error } = await supabase
      .from('due_history')
      .insert({
        due_id: dueId,
        homeowner_id: homeownerId,
        user_id: userId,
        action,
        old_data: oldData,
        new_data: newData,
        remarks,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error(`Error logging history for action "${action}" on due ${dueId}:`, error);
      throw error;
    }

    console.log('History logged:', data);
    return data;
  } catch (error) {
    console.error(`Error logging history for action "${action}" on due ${dueId}:`, error);
    throw error;
  }
};

export const userfetchHistoryLog = async (user_id) => {
  try {
    const { data, error } = await supabase
      .from('due_history')
      .select('due_id, homeowner_id, user_id, action, old_data, new_data, remarks, created_at')
      .eq('homeowner_id', user_id);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching history log:', error);
    return null;
  }
};
