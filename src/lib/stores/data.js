// Supabase data helpers — all tables & common queries
import { supabase } from '$lib/supabase';

// ─── Converters ───────────────────────────────────────────────────────────────

// DB snake_case → JS camelCase
function cam(row) {
  if (!row) return null;
  if (Array.isArray(row)) return row.map(cam);
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v])
  );
}

// JS camelCase → DB snake_case (strips undefined values)
function snk(obj) {
  if (!obj) return obj;
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k.replace(/([A-Z])/g, '_$1').toLowerCase(), v])
  );
}

// ─── ROOMS ────────────────────────────────────────────────────────────────────

export async function getRooms(propertyId = null) {
  let q = supabase.from('rooms').select('*').order('name');
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addRoom(data) {
  const { data: row, error } = await supabase.from('rooms').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateRoom(id, data) {
  const { error } = await supabase.from('rooms').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteRoom(id) {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

// ─── BEDS ─────────────────────────────────────────────────────────────────────

export async function getBeds(roomId = null) {
  let q = supabase.from('beds').select('*').order('bed_number');
  if (roomId) q = q.eq('room_id', roomId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function getAvailableBeds() {
  const { data, error } = await supabase.from('beds').select('*').eq('status', 'available');
  if (error) throw error;
  return cam(data);
}

export async function addBed(data) {
  const { data: row, error } = await supabase
    .from('beds').insert({ status: 'available', ...snk(data) }).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateBed(id, data) {
  const { error } = await supabase.from('beds').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteBed(id) {
  const { error } = await supabase.from('beds').delete().eq('id', id);
  if (error) throw error;
}

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export async function getCustomers() {
  const { data, error } = await supabase.from('customers').select('*').order('name');
  if (error) throw error;
  return cam(data);
}

export async function getCustomer(id) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return cam(data);
}

export async function addCustomer(data) {
  const { data: row, error } = await supabase.from('customers').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateCustomer(id, data) {
  const { error } = await supabase.from('customers').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ─── BOOKINGS ─────────────────────────────────────────────────────────────────

export async function getBookings(status = null) {
  let q = supabase.from('bookings').select('*').order('check_in', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function getBookingsByCustomer(customerId) {
  const { data, error } = await supabase.from('bookings').select('*')
    .eq('customer_id', customerId).order('check_in', { ascending: false });
  if (error) throw error;
  return cam(data);
}

export async function addBooking(data) {
  const { data: row, error } = await supabase.from('bookings').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateBooking(id, data) {
  const { error } = await supabase.from('bookings').update(snk(data)).eq('id', id);
  if (error) throw error;
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export async function getTransactions(filters = {}) {
  let q = supabase.from('transactions').select('*').order('created_at', { ascending: false });
  if (filters.customerId) q = q.eq('customer_id', filters.customerId);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addTransaction(data) {
  const { data: row, error } = await supabase.from('transactions').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateTransaction(id, data) {
  const { error } = await supabase.from('transactions').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// ─── USERS (Staff) ────────────────────────────────────────────────────────────

export async function getStaff() {
  const { data, error } = await supabase.from('users').select('*').order('name');
  if (error) throw error;
  return cam(data);
}

export async function updateUserProfile(uid, data) {
  const { error } = await supabase.from('users').update(snk(data)).eq('id', uid);
  if (error) throw error;
}

// ─── PROPERTIES ───────────────────────────────────────────────────────────────

export async function getProperties() {
  const { data, error } = await supabase.from('properties').select('*').order('name');
  if (error) throw error;
  return cam(data);
}

export async function getProperty(id) {
  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error) throw error;
  return cam(data);
}

export async function addProperty(data) {
  const { data: row, error } = await supabase
    .from('properties').insert({ active: true, ...snk(data) }).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateProperty(id, data) {
  const { error } = await supabase.from('properties').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteProperty(id) {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

// ─── UNITS ────────────────────────────────────────────────────────────────────

export async function getUnits(propertyId = null) {
  let q = supabase.from('units').select('*').order('name');
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function getAvailableUnits(propertyId = null) {
  let q = supabase.from('units').select('*').eq('status', 'available');
  if (propertyId) q = q.eq('property_id', propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addUnit(data) {
  const { data: row, error } = await supabase
    .from('units').insert({ status: 'available', current_lease_id: null, ...snk(data) }).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateUnit(id, data) {
  const { error } = await supabase.from('units')
    .update({ ...snk(data), updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteUnit(id) {
  const { error } = await supabase.from('units').delete().eq('id', id);
  if (error) throw error;
}

// ─── LEASES ───────────────────────────────────────────────────────────────────

export async function getLeases(filters = {}) {
  let q = supabase.from('leases').select('*').order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.customerId) q = q.eq('customer_id', filters.customerId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function getLease(id) {
  const { data, error } = await supabase.from('leases').select('*').eq('id', id).single();
  if (error) throw error;
  return cam(data);
}

export async function addLease(data) {
  const { data: row, error } = await supabase.from('leases').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateLease(id, data) {
  const { error } = await supabase.from('leases').update(snk(data)).eq('id', id);
  if (error) throw error;
}

// ─── EXPENSES ─────────────────────────────────────────────────────────────────

export async function getExpenses(filters = {}) {
  let q = supabase.from('expenses').select('*').order('date', { ascending: false });
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addExpense(data) {
  const { data: row, error } = await supabase.from('expenses').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateExpense(id, data) {
  const { error } = await supabase.from('expenses').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

// ─── CATEGORIES ───────────────────────────────────────────────────────────────

export async function getCategories(type = null) {
  let q = supabase.from('categories').select('*').order('name');
  if (type) q = q.eq('type', type);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addCategory(data) {
  const { data: row, error } = await supabase.from('categories').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateCategory(id, data) {
  const { error } = await supabase.from('categories').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ─── INCOME (stored in transactions as type='income') ─────────────────────────

export async function getIncome(filters = {}) {
  let q = supabase.from('transactions').select('*').eq('type', 'income')
    .order('paid_on', { ascending: false });
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addIncome(data) {
  const { date, ...rest } = data;
  const { data: row, error } = await supabase.from('transactions')
    .insert(snk({ ...rest, type: 'income', status: 'paid', paidOn: date }))
    .select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateIncome(id, data) {
  const { date, ...rest } = data;
  const { error } = await supabase.from('transactions')
    .update(snk({ ...rest, paidOn: date })).eq('id', id);
  if (error) throw error;
}

export async function deleteIncome(id) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────

export async function getMaintenanceRequests(filters = {}) {
  let q = supabase.from('maintenance').select('*').order('created_at', { ascending: false });
  if (filters.propertyId) q = q.eq('property_id', filters.propertyId);
  if (filters.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return cam(data);
}

export async function addMaintenanceRequest(data) {
  const { data: row, error } = await supabase.from('maintenance').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateMaintenanceRequest(id, data) {
  const { error } = await supabase.from('maintenance')
    .update({ ...snk(data), updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────

export async function getAccounts() {
  const { data, error } = await supabase.from('accounts').select('*').order('name');
  if (error) throw error;
  return cam(data);
}

export async function addAccount(data) {
  const { data: row, error } = await supabase.from('accounts').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function updateAccount(id, data) {
  const { error } = await supabase.from('accounts').update(snk(data)).eq('id', id);
  if (error) throw error;
}

export async function deleteAccount(id) {
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) throw error;
}

// ─── TRANSFERS ────────────────────────────────────────────────────────────────

export async function getTransfers() {
  const { data, error } = await supabase.from('account_transfers').select('*').order('date', { ascending: false });
  if (error) throw error;
  return cam(data);
}

export async function addTransfer(data) {
  const { data: row, error } = await supabase.from('account_transfers').insert(snk(data)).select().single();
  if (error) throw error;
  return cam(row);
}

export async function deleteTransfer(id) {
  const { error } = await supabase.from('account_transfers').delete().eq('id', id);
  if (error) throw error;
}

export async function getAccountBalance(accountId) {
  const [accountRes, txnRes, transfersInRes, transfersOutRes, expensesRes] = await Promise.all([
    supabase.from('accounts').select('opening_balance').eq('id', accountId).single(),
    supabase.from('transactions').select('amount').eq('account_id', accountId).eq('status', 'paid'),
    supabase.from('account_transfers').select('amount').eq('to_account_id', accountId),
    supabase.from('account_transfers').select('amount').eq('from_account_id', accountId),
    supabase.from('expenses').select('amount').eq('account_id', accountId),
  ]);
  const opening = accountRes.data?.opening_balance || 0;
  const inflow = (txnRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
    + (transfersInRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  const outflow = (transfersOutRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
    + (expensesRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);
  return opening + inflow - outflow;
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export async function getDashboardStats(propertyId = null) {
  const q = (table, extra = {}) => {
    let query = supabase.from(table).select('*');
    if (propertyId) query = query.eq('property_id', propertyId);
    Object.entries(extra).forEach(([k, v]) => { query = query.eq(k, v); });
    return query;
  };

  const [beds, bookings, transactions, leases, units] = await Promise.all([
    q('beds'),
    q('bookings', { status: 'active' }),
    q('transactions', { status: 'pending' }),
    q('leases', { status: 'active' }),
    q('units'),
  ]);

  const allBeds = beds.data || [];
  const allUnits = units.data || [];
  const pendingTxns = transactions.data || [];

  return {
    totalBeds: allBeds.length,
    occupiedBeds: allBeds.filter(b => b.status === 'occupied').length,
    availableBeds: allBeds.filter(b => b.status === 'available').length,
    maintenanceBeds: allBeds.filter(b => b.status === 'maintenance').length,
    activeBookings: bookings.data?.length || 0,
    totalUnits: allUnits.length,
    occupiedUnits: allUnits.filter(u => u.status === 'occupied').length,
    availableUnits: allUnits.filter(u => u.status === 'available').length,
    activeLeases: leases.data?.length || 0,
    pendingTransactions: pendingTxns.length,
    totalPendingRent: pendingTxns.reduce((sum, t) => sum + (t.amount || 0), 0),
  };
}
