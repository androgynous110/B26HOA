import { supabase } from './supabaseConfiguration.js';

export const currentDue = async (userId, currentMonth) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = currentMonth ?? now.getMonth();

  const { data, error } = await supabase
    .from('dues')
    .select(`
      id, type, amount, status, due_date, payment_method, paid_amount, billing_period, receipt_no, notes, homeowner_id,
      homeowners (
        first_name,
        middle_name,
        last_name,
        type_user
      )
    `)
    .eq('homeowner_id', userId)
    .gte('due_date', new Date(year, month, 1).toISOString())
    .lt('due_date', new Date(year, month + 1, 1).toISOString())
    .order('due_date', { ascending: false })
    .limit(1);

  return { data, error };
};

export const fetchDues = async (search = '', status = '', type = '') => {
  let query = supabase
    .from('dues')
    .select(`
      id, type, amount, status, due_date, payment_method, paid_amount, billing_period, receipt_no, notes,
      homeowners (
        first_name,
        middle_name,
        last_name,
        type_user
      )
    `)
    .order('due_date', { ascending: true });

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,middle_name.ilike.%${search}%,last_name.ilike.%${search}%`
    );
  }

  if (status && status !== 'all') query = query.eq('status', status);
  if (type && type !== 'all') query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw error;

  return data.map(d => ({
    ...d,
    full_name: `${d.homeowners.first_name} ${d.homeowners.middle_name ?? ''} ${d.homeowners.last_name}`.trim()
  }));
};

export const fetchHomeownerID = async (id) => {
  const { data, error } = await supabase
    .from('dues')
    .select('homeowner_id')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch homeowner name:', error.message);
    return 'Unknown Homeowner';
  }

  return data;
};

export const fetchHomeownerName = async (id) => {
  const { data, error } = await supabase
    .from('homeowners')
    .select('first_name, middle_name, last_name')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch homeowner name:', error.message);
    return 'Unknown Homeowner';
  }

  return `${data.first_name} ${data.middle_name ?? ''} ${data.last_name}`.trim();
};



export const getLastReceiptNo = async () => {
  const { data, error } = await supabase
    .from('dues')
    .select('receipt_no')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data[0]?.receipt_no || null;
};

export const createDue = async (dueData) => {
  const { data, error } = await supabase
    .from('dues')
    .insert([dueData])
    .select();

  if (error) {
    console.error('Error creating Due:', error);
    throw error;
  }
  return data[0];
};


export const deleteDueData = async (id) => {
  const { error } = await supabase
    .from('dues')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const balance_data = async (dueId, balance_due) => {
  if (!dueId) {
    console.error('Cannot update balance - missing due ID');
    return;
  }

  const { error } = await supabase
    .from('dues')
    .update({ balance_due: balance_due }) 
    .eq('id', dueId);

  if (error) {
    console.error('Failed to save balance due', error.message);
    throw error;
  }
};

export const addNotes = async (dueId, note) => {
  const { error } = await supabase
    .from('dues')
    .update({ notes: note }) 
    .eq('id', dueId);

  if (error) {
    console.error('Failed to save note:', error.message);
    throw error;
  }
};

export const fetchDueData = async (dueId) => {
    const { data, error } = await supabase
        .from('dues')
        .select(`type, homeowner_id, balance_due, amount, paid_amount, description, late_fee, status, notes`)
        .eq('id', dueId)
        .single();

    if (error) throw error;
    return data;
};

export const partialPaymentData = async (dueId, paid_amount, status, balance_due) => {
    const { error } = await supabase
        .from('dues')
        .update({ 
            paid_amount: paid_amount, 
            status: status,
            payment_date: new Date().toISOString(),
            balance_due: balance_due || 0
        })
        .eq('id', dueId);

    if (error) throw error;
};


export const fetchArchivedDues = async () => {
    const { data, error } = await supabase
        .from('dues')
        .select(`*, homeowners(first_name, middle_name, last_name)`)
        .eq('archived', true)
        .order('archived', { ascending: false });

    if (error) throw error;
    return data.map(d => ({
        ...d,
        full_name: `${d.homeowners.first_name} ${d.homeowners.middle_name || ''} ${d.homeowners.last_name}`.trim()
    }));
};

export const restoreDueData = async (id) => {
    const { error } = await supabase
        .from('dues')
        .update({ archived: false})
        .eq('id', id);

    if (error) throw error;
};

export const deletePermanentData = async (id) => {
    const { error } = await supabase
        .from('dues')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const markAsArchive = async (id, archivedDate) => {
    const { error } = await supabase
        .from('dues')
        .update({ 
            archived: true,
            archived_date: archivedDate
        })
        .eq('id', id);
    
    if (error) throw error;
};

export const userfetchDuesByUserId = async (userId, status = '', type = '') => {
  if (!userId) throw new Error('User ID is required');

  try {
    let query = supabase
      .from('dues') 
      .select(`
        id, type, amount, status, due_date, payment_method, paid_amount, billing_period, receipt_no, notes,
        homeowners (
          first_name,
          middle_name,
          last_name,
          type_user
        )
      `)
      .eq('homeowner_id', userId)
      .order('due_date', { ascending: true });

    if (status && status !== 'all') query = query.eq('status', status);
    if (type && type !== 'all') query = query.eq('type', type);

    const { data, error } = await query;
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    return data.map(d => ({
      ...d,
      full_name: `${d.homeowners.first_name} ${d.homeowners.middle_name ?? ''} ${d.homeowners.last_name}`.trim()
    }));
  } catch (error) {
    console.error('userfetchDuesByUserId failed:', error);
    throw error;
  }
};

