"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/types";

interface Ctx { user: User | null; profile: UserProfile | null; isAdmin: boolean; loading: boolean }
const AuthCtx = createContext<Ctx>({ user: null, profile: null, isAdmin: false, loading: true });
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsubProfile?.();
      setUser(u);
      if (!u) { setProfile(null); setIsAdmin(false); setLoading(false); return; }
      // UI hint only. Real admin enforcement is Firestore/Storage rules + custom claims.
      let tok = await u.getIdTokenResult();
      setIsAdmin(tok.claims.admin === true);
      setLoading(false);
      unsubProfile = onSnapshot(doc(db, "users", u.uid), async (s) => {
        const p = s.exists() ? ({ uid: s.id, ...s.data() } as UserProfile) : null;
        setProfile(p);
        if (p?.role === "admin" && tok.claims.admin !== true) { tok = await u.getIdTokenResult(true); setIsAdmin(tok.claims.admin === true); }
      });
    });
    return () => { unsub(); unsubProfile?.(); };
  }, []);

  return <AuthCtx.Provider value={{ user, profile, isAdmin, loading }}>{children}</AuthCtx.Provider>;
}
