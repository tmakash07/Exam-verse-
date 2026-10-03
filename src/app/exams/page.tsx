"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Search } from "lucide-react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, ErrorBox, PageLoader } from "@/components/ui";
import { listPublishedExams } from "@/lib/services/exams";
import { friendlyError } from "@/lib/utils";
import type { Exam } from "@/types";

function Inner() {
  const [exams, setExams] = useState<Exam[]>([]); const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData>>();
  const [done, setDone] = useState(false); const [loading, setLoading] = useState(true); const [err, setErr] = useState("");
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [diff, setDiff] = useState(""); const [dur, setDur] = useState(""); const [price, setPrice] = useState("");

  const load = useCallback(async (more = false) => {
    setLoading(true); setErr("");
    try { const r = await listPublishedExams(more ? cursor : undefined); setExams((p) => (more ? [...p, ...r.exams] : r.exams)); setCursor(r.last); setDone(r.done); }
    catch (e) { setErr(friendlyError(e)); } finally { setLoading(false); }
  }, [cursor]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const cats = useMemo(() => Array.from(new Set(exams.map((e) => e.category).filter(Boolean))), [exams]);
  const list = exams.filter((e) =>
    (!q || (e.title + e.subject).toLowerCase().includes(q.toLowerCase())) && (!cat || e.category === cat) && (!diff || e.difficulty === diff) &&
    (!dur || (dur === "short" ? e.durationMinutes <= 15 : dur === "medium" ? e.durationMinutes <= 45 && e.durationMinutes > 15 : e.durationMinutes > 45)) &&
    (!price || (price === "premium") === !!e.isPremium));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exams</h1>
      <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className="input pl-9" placeholder="Search exams..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input" value={diff} onChange={(e) => setDiff(e.target.value)}><option value="">Any difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
        <select className="input" value={dur} onChange={(e) => setDur(e.target.value)}><option value="">Any duration</option><option value="short">≤ 15 min</option><option value="medium">16–45 min</option><option value="long">45+ min</option></select>
        <select className="input" value={price} onChange={(e) => setPrice(e.target.value)}><option value="">Free & Premium</option><option value="free">Free</option><option value="premium">Premium</option></select>
      </div>
      {err && <ErrorBox message={err} onRetry={() => load()} />}
      {loading && !exams.length ? <PageLoader /> : list.length === 0 ? <EmptyState title="No exams found" hint="Try different filters." /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <Card key={e.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2"><h3 className="font-semibold">{e.title}</h3>{e.isPremium && <span className="chip bg-amber-100 text-amber-800">Premium</span>}</div>
              <p className="mt-1 text-xs text-slate-500">{e.subject}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="chip">{e.totalQuestions} Questions</span><span className="chip"><Clock className="mr-1 h-3 w-3" />{e.durationMinutes} min</span><span className="chip">{e.difficulty}</span></div>
              <p className="mt-3 text-xs text-slate-500">{(e.attemptCount ?? 0).toLocaleString()} attempts</p>
              <Link href={`/exams/${e.id}`} className="btn-primary mt-auto w-full">Start Exam</Link>
            </Card>
          ))}
        </div>
      )}
      {!done && !loading && <button className="btn-outline w-full" onClick={() => load(true)}>Load more</button>}
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
