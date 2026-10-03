"use client";
import { useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { Shell, useTheme } from "@/components/Shell";
import { Card, ErrorBox, PageLoader, Stat } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { resetPassword } from "@/lib/services/auth";
import { uploadAvatar } from "@/lib/services/admin";
import { friendlyError } from "@/lib/utils";

function Inner() {
  const { user, profile } = useAuth(); const { dark, toggle } = useTheme();
  const [name, setName] = useState(""); const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [badges, setBadges] = useState<{ id: string; name: string; icon: string }[]>([]);
  useEffect(() => { if (profile) setName(profile.fullName); }, [profile]);
  useEffect(() => { if (user) getDocs(collection(db, "users", user.uid, "achievements")).then((s) => setBadges(s.docs.map((d) => ({ id: d.id, name: d.get("name"), icon: d.get("icon") })))).catch(() => {}); }, [user]);
  if (!user || !profile) return <PageLoader />;
  const run = async (fn: () => Promise<unknown>, ok: string) => { setErr(""); setMsg(""); try { await fn(); setMsg(ok); } catch (e) { setErr(friendlyError(e)); } };
  const save = (patch: Record<string, unknown>) => updateDoc(doc(db, "users", user.uid), { ...patch, updatedAt: serverTimestamp() });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="flex items-center gap-4 p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-600">{profile.fullName[0]}</div>}
        <div className="min-w-0 flex-1"><p className="truncate text-lg font-bold">{profile.fullName}</p><p className="truncate text-sm text-slate-500">{profile.email}</p><p className="text-xs text-slate-500">Joined {profile.createdAt?.toDate().toLocaleDateString()}</p>
          <label className="mt-1 inline-block cursor-pointer text-sm text-brand-600">Change photo<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) run(() => uploadAvatar(user.uid, f), "Photo updated."); }} /></label></div>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3"><Stat label="Exams" value={profile.totalExams} /><Stat label="Questions" value={profile.totalQuestions} /><Stat label="Avg score" value={`${profile.averageScore}%`} /><Stat label="Accuracy" value={`${profile.accuracy}%`} /><Stat label="Best" value={`${profile.bestScore}%`} /><Stat label="Streak" value={`${profile.currentStreak} 🔥`} /></div>
      <Card className="p-4"><h2 className="mb-2 font-semibold">Achievements</h2>{badges.length ? <div className="flex flex-wrap gap-2">{badges.map((b) => <span key={b.id} className="chip !px-3 !py-1.5">{b.icon} {b.name}</span>)}</div> : <p className="text-sm text-slate-500">Complete exams to unlock achievements.</p>}</Card>
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Settings</h2>
        {err && <ErrorBox message={err} />}{msg && <p className="text-sm text-green-600">{msg}</p>}
        <div><label className="label">Full name</label><div className="flex gap-2"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary" disabled={!name.trim()} onClick={() => run(() => save({ fullName: name.trim() }), "Name saved.")}>Save</button></div></div>
        <label className="flex items-center justify-between text-sm">Dark mode<input type="checkbox" className="h-5 w-5" checked={dark} onChange={toggle} /></label>
        <label className="flex items-center justify-between text-sm">Notifications<input type="checkbox" className="h-5 w-5" checked={profile.settings?.notifications !== false} onChange={(e) => run(() => save({ settings: { ...profile.settings, notifications: e.target.checked } }), "Saved.")} /></label>
        <div className="flex items-center justify-between text-sm">Language (saved preference)<select className="input !w-auto" value={profile.settings?.language ?? "en"} onChange={(e) => run(() => save({ settings: { ...profile.settings, language: e.target.value } }), "Saved.")}><option value="en">English</option><option value="bn">বাংলা</option></select></div>
        <button className="btn-outline w-full" onClick={() => run(() => resetPassword(profile.email), "Password reset email sent.")}>Change password (email link)</button>
      </Card>
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
