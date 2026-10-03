"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, ErrorBox, Spinner } from "@/components/ui";
import { QuestionCard } from "@/components/QuestionCard";
import { useAuth } from "@/context/AuthContext";
import { getPractice } from "@/lib/services/practice";
import { cn, friendlyError } from "@/lib/utils";
import type { PracticeQuestion } from "@/types";

const SUBJECTS = ["Physics", "Chemistry", "Higher Mathematics", "Biology", "English", "General Knowledge"];
const MODES = [{ id: "quick", l: "Quick" }, { id: "subject", l: "Subject" }, { id: "topic", l: "Topic" }, { id: "weak", l: "Weak areas" }, { id: "mistakes", l: "Mistakes" }];

function Inner() {
  const { user } = useAuth(); const sp = useSearchParams();
  const [mode, setMode] = useState(sp.get("mode") ?? "quick"); const [subject, setSubject] = useState(""); const [topic, setTopic] = useState(""); const [difficulty, setDifficulty] = useState(""); const [count, setCount] = useState(10);
  const [qs, setQs] = useState<PracticeQuestion[] | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [score, setScore] = useState({ done: 0, ok: 0 });
  const start = async () => {
    setBusy(true); setErr(""); setScore({ done: 0, ok: 0 });
    try { const r = await getPractice({ mode, subject: mode === "subject" || mode === "topic" ? subject : undefined, topic: mode === "topic" ? topic : undefined, difficulty: difficulty || undefined, count }); setQs(r.questions); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  };
  if (!user) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Practice</h1>
      {!qs ? (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap gap-2">{MODES.map((m) => <button key={m.id} onClick={() => setMode(m.id)} className={cn("chip !px-3 !py-1.5", mode === m.id && "!bg-brand-500 !text-white")}>{m.l}</button>)}</div>
          {(mode === "subject" || mode === "topic") && <div><label className="label">Subject</label><select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}><option value="">Select</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>}
          {mode === "topic" && <div><label className="label">Topic</label><input className="input" placeholder="e.g. Calculus" value={topic} onChange={(e) => setTopic(e.target.value)} /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Difficulty</label><select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">Any</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            <div><label className="label">Questions</label><select className="input" value={count} onChange={(e) => setCount(+e.target.value)}>{[5, 10, 20, 30].map((n) => <option key={n}>{n}</option>)}</select></div>
          </div>
          {err && <ErrorBox message={err} />}
          <button className="btn-primary w-full" disabled={busy || (mode === "subject" && !subject) || (mode === "topic" && (!subject || !topic))} onClick={start}>{busy ? <Spinner className="text-white" /> : "Start practice"}</button>
        </Card>
      ) : qs.length === 0 ? <><EmptyState title="No questions found" hint="Try other filters. Weak-area and mistake practice need exam history first." /><button className="btn-outline w-full" onClick={() => setQs(null)}>Back</button></> : (
        <>
          <div className="flex items-center justify-between text-sm"><span>{score.done} / {qs.length} answered · {score.ok} correct</span><button className="underline" onClick={() => setQs(null)}>New session</button></div>
          {qs.map((q) => <QuestionCard key={q.path} q={q} uid={user.uid} bookmarked={false} onAnswered={(ok) => setScore((s) => ({ done: s.done + 1, ok: s.ok + (ok ? 1 : 0) }))} />)}
        </>
      )}
    </div>
  );
}
export default function Page() { return <Shell><Suspense><Inner /></Suspense></Shell>; }
