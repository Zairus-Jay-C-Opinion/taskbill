import { supabase } from "./supabaseClient";

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getTaskCountThisMonth() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count, error } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfMonth);
  if (error) throw error;
  return count ?? 0;
}

export async function getInvoiceCountThisWeek() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  const { count, error } = await supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .gte("created_at", monday.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export async function uploadLogo(userId, file) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/logo.${ext}`;
  const { error } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  return data.publicUrl;
}

export async function saveBranding(userId, { logoUrl, brandColor }) {
  const updates = {};
  if (logoUrl !== undefined) updates.logo_url = logoUrl;
  if (brandColor !== undefined) updates.brand_color = brandColor;
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveCurrency(userId, currency) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ currency })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function savePlan(userId, plan) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function upsertProfile({ id, username }) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id, username, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function getClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (error) throw error;
  return data;
}

export async function createClient({ name, email }) {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, email })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function getTasks({ invoiceId = null } = {}) {
  let query = supabase
    .from("tasks")
    .select("*, client:clients(name)")
    .order("created_at", { ascending: false });

  // Pass invoiceId: null to get unbilled tasks; omit to get all tasks.
  if (invoiceId === null) {
    query = query.is("invoice_id", null);
  } else if (invoiceId !== undefined) {
    query = query.eq("invoice_id", invoiceId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAllTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, client:clients(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTask({ clientId, title, description, amount, dueDate }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ client_id: clientId, title, description, amount, due_date: dueDate || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId) {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function updateTaskInvoice(taskId, invoiceId) {
  const { data, error } = await supabase
    .from("tasks")
    .update({ invoice_id: invoiceId })
    .eq("id", taskId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export async function getInvoices() {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      client:clients(name, email),
      tasks(id, title, amount, due_date)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((inv) => ({
    ...inv,
    total: (inv.tasks ?? []).reduce((sum, t) => sum + Number(t.amount), 0),
  }));
}

export async function deleteInvoice(invoiceId) {
  // Unlink tasks first so they return to unbilled
  const { error: unlinkError } = await supabase
    .from("tasks")
    .update({ invoice_id: null })
    .eq("invoice_id", invoiceId);
  if (unlinkError) throw unlinkError;

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId);
  if (error) throw error;
}

export async function createInvoice({ clientId, dueDate }) {
  const { data, error } = await supabase
    .from("invoices")
    .insert({ client_id: clientId, due_date: dueDate || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function savePaymentLink(invoiceId, { paymentLink, paymentLinkId }) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ payment_link: paymentLink, payment_link_id: paymentLinkId })
    .eq("id", invoiceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInvoiceStatus(invoiceId, status) {
  const { data, error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
