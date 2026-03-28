'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Profile, Organization } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface AuthContextValue {
  user: User;
  profile: Profile;
  organization: Organization;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({
  user,
  profile,
  organization,
  children,
}: {
  user: User;
  profile: Profile;
  organization: Organization;
  children: ReactNode;
}) {
  return (
    <AuthContext.Provider value={{ user, profile, organization }}>
      {children}
    </AuthContext.Provider>
  );
}
