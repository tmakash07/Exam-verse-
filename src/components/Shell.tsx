"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { BarChart3, BookOpen, Dumbbell, Home, LogOut, Moon, Sun, Trophy, User as UserIcon, Library, Shield, Bell, WifiOff } from "lucide-react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { logOut } from "@/lib/services/auth";
import { markNotificationRead } from "@/lib/services/attempts";
import { PageLoader } from "./ui";
import { cn } from "@/lib/utils";

export function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => { const n = !dark; setDark(n); document.documentElement.classList.toggle("dark", n); localStorage.setItem("theme", n ? "dark" : "light"); };
  return { dark, toggle };
}

export function ConnectionBanner() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (online) return null;
  return <div className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-xs font-medium text-white"><WifiOff className="h-3.5 w-3.5" />You're offline. Saved data is shown; changes sync when you reconnect.</div>;
}

const nav = [
  { href: "/dashboard", label: "Home", icon: Home }, { href: "/exams", label: "Exams", icon: BookOpen }, { href: "/practice", label: "Practice", icon: Dumbbell },
  { href: "/bank", label: "Bank", icon: Library }, { href: "/leaderboard", label: "Ranks", icon: Trophy }, { href: "/profile", label: "Profile", icon: UserIcon }
];

function Notifications() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<{ id: string; title: string; body: string; read?: boolean; personal: boolean }[]>([]);
  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const [mine, ann] = await Promise.all([
        getDocs(query(collection(db, "users", user.uid, "notifications"), orderBy("createdAt", "desc"), limit(8))),
        getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(3)))
      ]);
      setItems([...mine.docs.map((d) => ({ id: d.id, title: d.get("title"), body: d.get("body"), read: d.get("read"), personal: true })), ...ann.docs.map((d) => ({ id: d.id, title: d.get("title"), body: d.get("body"), personal: false }))]);
    })().catch(() => setItems([]));
  }, [open, user]);
  return (
    <div className="relative">
      <button aria-label="Notifications" className="btn-ghost" onClick={() => setOpen(!open)}><Bell className="h-5 w-5" /></button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {items.length === 0 && <p className="p-3 text-sm text-slate-500">No notifications yet.</p>}
          {items.map((n) => (
            <button key={n.id} onClick={() => user && n.personal && !n.read && markNotificationRead(user.uid, n.id).catch(() => {})} className={cn("block w-full rounded-lg p-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700", n.personal && !n.read && "font-semibold")}>
              <div>{n.title}</div><div className="text-xs font-normal text-slate-500">{n.body}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Protected({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  if (loading || !user) return <PageLoader />;
  if (admin && !isAdmin) return <div className="p-10 text-center text-slate-500">Admins only.</div>;
  return <>{children}</>;
}

export function Shell({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const path = usePathname();
  const { isAdmin, profile } = useAuth();
  const { dark, toggle } = useTheme();
  const router = useRouter();
  return (
    <Protected admin={admin}>
      <ConnectionBanner />
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold"><BarChart3 className="h-6 w-6 text-brand-500" />ExamVerse</Link>
          <nav className="ml-6 hidden gap-1 md:flex">
            {nav.map((n) => <Link key={n.href} href={n.href} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", path.startsWith(n.href) ? "bg-brand-50 text-brand-600 dark:bg-slate-800" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>{n.label}</Link>)}
            {isAdmin && <Link href="/admin" className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-600">Admin</Link>}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {isAdmin && <Link href="/admin" aria-label="Admin" className="btn-ghost md:hidden"><Shield className="h-5 w-5" /></Link>}
            <Notifications />
            <button aria-label="Toggle theme" className="btn-ghost" onClick={toggle}>{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>
            <button aria-label="Log out" className="btn-ghost" onClick={async () => { await logOut(); router.replace("/login"); }}><LogOut className="h-5 w-5" /></button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-3 pb-24 pt-4 md:pb-8">
        {admin === false && profile === null ? null : null}
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 md:hidden">
        {nav.map((n) => { const I = n.icon; const on = path.startsWith(n.href); return (
          <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px]", on ? "text-brand-600" : "text-slate-500")}><I className="h-5 w-5" />{n.label}</Link>
        ); })}
      </nav>
    </Protected>
  );
}
