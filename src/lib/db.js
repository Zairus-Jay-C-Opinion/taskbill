import { supabase } from "./supabaseClient";

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
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

export async function uploadAvatar(userId, file) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export async function saveAvatar(userId, avatarUrl) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
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

// ─── Workspace ───────────────────────────────────────────────────────────────

export async function getWorkspace() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: owned } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (owned) return { workspace: owned, role: "owner" };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("*, workspace:workspaces(*)")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();
  if (membership) return { workspace: membership.workspace, role: membership.role, memberId: membership.id };

  return null;
}

export async function getOrCreateWorkspace(userId, name) {
  if (!userId) throw new Error("Not authenticated");
  const existing = await getWorkspace();
  if (existing) return existing;

  // Create workspace and backfill existing data
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name, owner_id: userId })
    .select()
    .single();
  if (error) throw error;

  await Promise.all([
    supabase.from("clients").update({ workspace_id: workspace.id }).eq("user_id", userId),
    supabase.from("tasks").update({ workspace_id: workspace.id }).eq("user_id", userId),
    supabase.from("invoices").update({ workspace_id: workspace.id }).eq("user_id", userId),
  ]);

  return { workspace, role: "owner" };
}

export async function getWorkspaceMembers(workspaceId) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) throw error;

  // Enrich accepted members with their username from profiles
  const userIds = data.filter((m) => m.user_id).map((m) => m.user_id);
  if (userIds.length > 0) {
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", userIds);
    const profileMap = Object.fromEntries((memberProfiles ?? []).map((p) => [p.id, p]));
    return data.map((m) => ({
      ...m,
      username:   m.user_id ? (profileMap[m.user_id]?.username   ?? null) : null,
      avatar_url: m.user_id ? (profileMap[m.user_id]?.avatar_url ?? null) : null,
    }));
  }

  return data;
}

export async function inviteMember(workspaceId, email) {
  const { data, error } = await supabase
    .from("workspace_members")
    .insert({ workspace_id: workspaceId, invited_email: email.toLowerCase().trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeMember(memberId) {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

export async function getPendingInvites() {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("*, workspace:workspaces(id, name, owner_id)")
    .eq("status", "pending");
  if (error || !data?.length) return [];

  // Fetch owner usernames
  const ownerIds = [...new Set(data.map((m) => m.workspace?.owner_id).filter(Boolean))];
  const { data: ownerProfiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", ownerIds);
  const profileMap = Object.fromEntries((ownerProfiles ?? []).map((p) => [p.id, p]));

  return data.map((m) => ({
    ...m,
    ownerUsername: profileMap[m.workspace?.owner_id]?.username ?? null,
  }));
}

export async function acceptInvite(memberId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ status: "accepted", user_id: user.id })
    .eq("id", memberId)
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

export async function createClient({ name, email, workspaceId }) {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name, email, workspace_id: workspaceId ?? null })
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

export async function createTask({ clientId, title, description, amount, dueDate, workspaceId }) {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ client_id: clientId, title, description, amount, due_date: dueDate || null, workspace_id: workspaceId ?? null })
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

export async function createInvoice({ clientId, dueDate, workspaceId }) {
  const { data, error } = await supabase
    .from("invoices")
    .insert({ client_id: clientId, due_date: dueDate || null, workspace_id: workspaceId ?? null })
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

export async function leaveWorkspace(memberId) {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("id", memberId);
  if (error) throw error;
}

export async function setMemberRole(memberId, role) {
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("id", memberId);
  if (error) throw error;
}

export async function getChatMessages(workspaceId) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;

  const senderIds = [...new Set(data.map((m) => m.sender_id))];
  if (senderIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", senderIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  return data.map((m) => ({
    ...m,
    username:   profileMap[m.sender_id]?.username   ?? null,
    avatar_url: profileMap[m.sender_id]?.avatar_url ?? null,
  }));
}

export async function sendChatMessage(workspaceId, senderId, content) {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ workspace_id: workspaceId, sender_id: senderId, content: trimmed })
    .select()
    .single();
  if (error) throw error;
  return data;
}
