"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { EmptyState, ErrorBox, PageLoader } from "@/components/ui";
import { QuestionCard } from "@/components/QuestionCard";
import { useAuth } from "@/context/AuthContext";
import { getBank, getBookmarked } from "@/lib/services/practice";
import { cn, friendlyError } from "@/lib/utils";
import type { PracticeQuestion } from "@/types";

const SUBJECTS = ["Physics", "Chemistry", "Higher Mathematics", "Biology", "English", "General Knowledge"];
function Inner() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | "saved">("all");
  const [f, setF] = useState({ subject: "", topic: "", difficulty: "", year: "", q: "" });
  const [items, setItems] = useState<PracticeQuestion[]>([]); const [cursor, setCursor] = useState<number | null>(null); const [loading, setLoading] = useState(false); const [err, setErr] = useState(""); const [loaded, setLoaded] = useState(false);
  const load = async (more = false) => {
    setLoading(true); setErr("");
    try {
      if (tab === "saved") { const r = await getBookmarked(); setItems(r.questions); setCursor(null); }
      else { const r = await getBank({ ...f, cursor: more ? cursor : undefined }); setItems((p) => (more ? [...p, ...r.questions] : r.questions)); setCursor(r.nextCursor); }
      setLoaded(true);
    } catch (e) { setErr(friendlyError(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Question Bank</h1>
      <div className="flex gap-2">{(["all", "saved"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={cn("chip !px-3 !py-1.5", tab === t && "!bg-brand-500 !text-white")}>{t === "all" ? "All questions" : "Bookmarked"}</button>)}</div>
      {tab === "all" && (
        <form className="grid grid-cols-2 gap-2 md:grid-cols-5" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <select className="input" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })}><option value="">All subjects</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
          <input className="input" placeholder="Topic" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} />
          <select className="input" value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}><option value="">Any difficulty</option><option>Easy</option><option>Medium</option><option>Hard</option></select>
          <input className="input" placeholder="Year" inputMode="numeric" value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} />
          <input className="input col-span-2 md:col-span-1" placeholder="Search text…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          <button className="btn-primary col-span-2 md:col-span-5">Search</button>
        </form>
      )}
      {err && <ErrorBox message={err} onRetry={() => load()} />}
      {loading && !items.length ? <PageLoader /> : loaded && !items.length ? <EmptyState title="No questions found" /> : items.map((q) => <QuestionCard key={q.path} q={q} uid={user.uid} bookmarked={tab === "saved"} />)}
      {tab === "all" && cursor && <button className="btn-outline w-full" disabled={loading} onClick={() => load(true)}>{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
