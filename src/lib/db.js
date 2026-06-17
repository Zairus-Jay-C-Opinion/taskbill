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

export async function createTask({ clientId, title, description, amount }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ client_id: clientId, title, description, amount })
    .select()
    .single();
  if (error) throw error;
  return data;
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
      tasks(id, title, amount)
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
