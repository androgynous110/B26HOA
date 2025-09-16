import {supabase} from './supabaseConfiguration.js'

export const fetchNotifications = async (type = "") => {
    let query = supabase
        .from('notifications')
        .select(`
            id, user_id, notification_title, message, is_read, created_at,
            notification_types ( name ),
            users ( username )
        `)
        .order('created_at', { ascending: false });

    if (type) {
        query = query.eq('type_id', type);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching notifications:", error);
    return data || [];
};

export const fetchTypes = async () => {
    const { data, error } = await supabase.from('notification_types').select('*');
    if (error) console.error("Error fetching notification types:", error);
    return data || [];
};

export const createNotification = async (title, message, type_id, user_id) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert([
                {
                    notification_title: title,
                    message,
                    type_id,
                    user_id
                }
            ]);

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error creating announcement: ", err);
    }
};

export const markAsRead = async (id) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error("Error marking as read:", error);
};

export const deleteNotification = async (id) => {
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) console.error("Error deleting announcement:", error);
};

export const createType = async (name) => {
    const { error } = await supabase.from('notification_types').insert([{ name }]);
    if (error) console.error("Error creating category:", error);
};


export const userfetchNotifications = async (type = "", userId = "") => {
    let query = supabase
        .from('notifications')
        .select(`
            id, notification_title, message, is_read, created_at,
            notification_types ( name ),
            users ( username )
        `)
        .order('created_at', { ascending: false });

    if (type) {
        query = query.eq('type_id', type);
    }

    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching notifications:", error);
    return data || [];
};

export const generateNotification = async (title, message, type, user_id) => {
  const { data: typeData, error: typeError } = await supabase
    .from('notification_types')
    .select('id')
    .eq('name', type)
    .single();

  if (typeError || !typeData) {
    throw new Error(`Failed to fetch type_id for type "${type}": ${typeError?.message || 'Type not found'}`);
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      notification_title: title,
      message: message,
      type_id: typeData.id,
      user_id: user_id
    });

  if (error) {
    throw new Error(`Failed to insert notification: ${error.message}`);
  }

  return data;
};

export const identifyUser = async (user_id) => {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user_id)
    .single();

  if (error) {
    console.error('Error identifying user:', error);
    return 'unknown';
  }

  return data?.role || 'unknown';
};