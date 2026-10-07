import type { Session } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { isSupabaseConfigured, requireSupabase, supabase } from '../lib/supabase';
import { clearUserSessionData, syncUserData } from '../storage/userData';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const initialize = async () => {
      let restoredSession: Session | null = null;
      try {
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        restoredSession = data.session;
        if (data.session) {
          await syncUserData(data.session.user.id);
          if (mounted) setSession(data.session);
        }
      } catch (syncError) {
        if (mounted) {
          setSession(restoredSession);
          setError(syncError instanceof Error ? syncError.message : 'Could not load your cloud data.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void initialize();
    const { data: authListener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) setSession(nextSession);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      await syncUserData(data.user.id);
      setSession(data.session);
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Could not sign in.');
      throw signInError;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data, error: signUpError } = await client.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      if (data.session) {
        await syncUserData(data.session.user.id);
        setSession(data.session);
        return true;
      }
      return false;
    } catch (signUpError) {
      setError(signUpError instanceof Error ? signUpError.message : 'Could not create your account.');
      throw signUpError;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: signOutError } = await requireSupabase().auth.signOut();
      if (signOutError) throw signOutError;
      setSession(null);
      await clearUserSessionData();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : 'Could not sign out.');
      throw signOutError;
    } finally {
      setLoading(false);
    }
  };

  const retrySync = async () => {
    const currentSession = session;
    if (!currentSession) return;
    setLoading(true);
    setError(null);
    try {
      await syncUserData(currentSession.user.id);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Could not load your cloud data.');
      throw syncError;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ session, loading, error, configured: isSupabaseConfigured, signIn, signUp, signOut, retrySync }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
