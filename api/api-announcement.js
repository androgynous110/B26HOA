import { supabase } from './supabaseConfiguration.js';

export const currentAnnouncement = async (currentMonth) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = currentMonth || now.getMonth();

    const { data, error } = await supabase
    .from('announcements')
    .select(`
      id, announcement_title, message, is_read, created_at,
            announcement_categories ( name ),
            users ( username )
    `)
    .gte('created_at', new Date(year, month, 1).toISOString())
    .lt('created_at', new Date(year, month + 1, 1).toISOString())
    .order('created_at', { ascending: false })
    .limit(6);

  return { data, error };
}

export const fetchAnnouncements = async (category = "") => {
    let query = supabase
        .from('announcements')
        .select(`
            id, announcement_title, message, is_read, created_at,
            announcement_categories ( name ),
            users ( username )
        `)
        .order('created_at', { ascending: false });

    if (category) {
        query = query.eq('category_id', category);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching announcements:", error);
    return data || [];
};

export const fetchCategories = async () => {
    const { data, error } = await supabase.from('announcement_categories').select('*');
    if (error) console.error("Error fetching categories:", error);
    return data || [];
};

export const createAnnouncement = async (title, message, category_id, user_id) => {
    try {
        const { data, error } = await supabase
            .from('announcements')
            .insert([
                {
                    announcement_title: title,
                    message,
                    category_id,
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
    const { error } = await supabase.from('announcements').update({ is_read: true }).eq('id', id);
    if (error) console.error("Error marking as read:", error);
};

export const deleteAnnouncement = async (id) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) console.error("Error deleting announcement:", error);
};

export const createCategory = async (name) => {
    const { error } = await supabase.from('announcement_categories').insert([{ name }]);
    if (error) console.error("Error creating category:", error);
};


export const userfetchAnnouncements = async (categories = []) => {
    console.log('Fetching announcements for categories:', categories);

    let query = supabase
        .from('announcements')
        .select(`
            id, 
            announcement_title, 
            message, 
            is_read, 
            created_at,
            announcement_categories ( name )
        `)
        .order('created_at', { ascending: false });

    if (categories.length > 0) {
        query = query.in('category_id', categories); // Filter by multiple category IDs
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching announcements:', error);
        return [];
    }

    console.log('Fetched announcements:', data);
    return data || [];
};
