import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { getProfile, getWorkspace, getPendingInvite } from "../lib/db";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(undefined);
  const [workspace, setWorkspace] = useState(undefined); // { workspace, role } | null | undefined
  const [pendingInvite, setPendingInvite] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
    } catch {
      setProfile({ username: null });
    }
  }, []);

  const fetchWorkspace = useCallback(async () => {
    try {
      const w = await getWorkspace();
      setWorkspace(w ?? null);
      if (!w) {
        const invite = await getPendingInvite();
        setPendingInvite(invite);
      } else {
        setPendingInvite(null);
      }
    } catch {
      setWorkspace(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        await Promise.all([fetchProfile(), fetchWorkspace()]);
      } else {
        setProfile(null);
        setWorkspace(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN" && newSession) {
        await Promise.all([fetchProfile(), fetchWorkspace()]);
      }
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setWorkspace(null);
        setPendingInvite(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchWorkspace]);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    workspace: workspace?.workspace ?? null,
    workspaceRole: workspace?.role ?? null,
    workspaceId: workspace?.workspace?.id ?? null,
    pendingInvite,
    loading,
    refreshProfile: fetchProfile,
    refreshWorkspace: fetchWorkspace,
    signOut: () => supabase.auth.signOut(),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used within an <AuthProvider>");
  return ctx;
}
