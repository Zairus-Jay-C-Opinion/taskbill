import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { getProfile, getWorkspaces, getPendingInvites } from "../lib/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [workspaces, setWorkspaces] = useState(undefined);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    () => localStorage.getItem("taskbill_active_workspace_id") ?? null
  );
  const [pendingInvites, setPendingInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {
      setProfile({ username: null });
    }
  }, []);

  const fetchWorkspaces = useCallback(async () => {
    const personal = { workspace: { id: "personal", name: "Personal" }, role: "personal", memberId: null };
    try {
      const list = await getWorkspaces();
      setWorkspaces([personal, ...list]);
      const invites = await getPendingInvites();
      setPendingInvites(invites);
    } catch {
      setWorkspaces([personal]);
    }
  }, []);

  const switchWorkspace = useCallback((id) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("taskbill_active_workspace_id", id);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await Promise.all([fetchProfile(), fetchWorkspaces()]);
      } else {
        setProfile(null);
        setWorkspaces([]);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN" && newSession) {
        await Promise.all([fetchProfile(), fetchWorkspaces()]);
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setWorkspaces([]);
        setActiveWorkspaceId(null);
        setPendingInvites([]);
        localStorage.removeItem("taskbill_active_workspace_id");
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchWorkspaces]);

  const activeEntry =
    workspaces?.find((e) => e.workspace.id === activeWorkspaceId)
    ?? workspaces?.[0]
    ?? null;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    workspace:         activeEntry?.workspace  ?? null,
    workspaceRole:     activeEntry?.role       ?? null,
    workspaceId:       activeEntry?.workspace?.id ?? null,
    workspaceMemberId: activeEntry?.memberId   ?? null,
    workspaces:        workspaces ?? [],
    switchWorkspace,
    pendingInvites,
    loading,
    refreshProfile: fetchProfile,
    refreshWorkspace: fetchWorkspaces,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
