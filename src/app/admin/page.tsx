"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, ErrorBox, PageLoader, Stat } from "@/components/ui";
import { adminStats, makeAdmin, seedSampleData } from "@/lib/services/admin";
import { friendlyError } from "@/lib/utils";

const AdminCharts = dynamic(() => import("@/components/AdminCharts"), { ssr: false, loading: () => <div className="h-48" /> });
type Stats = Awaited<ReturnType<typeof adminStats>>;

function Inner() {
  const [s, setS] = useState<Stats | null>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false);
  const load = () => adminStats().then(setS).catch((e) => setErr(friendlyError(e)));
  useEffect(() => { load(); }, []);
  const act = async (fn: () => Promise<unknown>, ok: string) => { setBusy(true); setErr(""); setMsg(""); try { await fn(); setMsg(ok); load(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); } };
  if (!s && !err) return <PageLoader />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Admin</h1><Link href="/admin/exams" className="btn-primary">Manage exams</Link></div>
      {err && <ErrorBox message={err} />}{msg && <p className="text-sm text-green-600">{msg}</p>}
      {s && <>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><Stat label="Users" value={s.users} /><Stat label="Exams" value={s.exams} /><Stat label="Questions" value={s.questions} /><Stat label="Attempts" value={s.attempts} /><Stat label="Avg score" value={`${s.avgScore}%`} /></div>
        <AdminCharts daily={s.daily} popular={s.popular} />
      </>}
      <Card className="space-y-3 p-4">
        <h2 className="font-semibold">Tools</h2>
        <button className="btn-outline w-full" disabled={busy} onClick={() => act(seedSampleData, "Sample exams, questions, achievements and today's daily challenge created.")}>Seed sample data</button>
        <div className="flex gap-2"><input className="input" type="email" placeholder="user@example.com (must have signed up)" value={email} onChange={(e) => setEmail(e.target.value)} /><button className="btn-primary" disabled={busy || !email} onClick={() => act(() => makeAdmin(email), "Admin granted. They must sign out and in again.")}>Make admin</button></div>
      </Card>
    </div>
  );
}
export default function Page() { return <Shell admin><Inner /></Shell>; }
