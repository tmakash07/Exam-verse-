"use client";
import { useState } from "react";
import { Bookmark, Flag } from "lucide-react";
import { Card } from "./ui";
import { checkAnswer } from "@/lib/services/practice";
import { toggleBookmark } from "@/lib/services/attempts";
import { reportQuestion } from "@/lib/services/admin";
import { cn, friendlyError } from "@/lib/utils";
import type { PracticeQuestion } from "@/types";

// Practice card: the answer is only fetched AFTER the learner picks an option.
export function QuestionCard({ q, uid, bookmarked, onAnswered, showFeedback = true }: { q: PracticeQuestion; uid: string; bookmarked: boolean; onAnswered?: (ok: boolean) => void; showFeedback?: boolean }) {
  const [sel, setSel] = useState<string | null>(null); const [res, setRes] = useState<{ correct: boolean; correctAnswer: string; explanation: string } | null>(null);
  const [bm, setBm] = useState(bookmarked); const [msg, setMsg] = useState("");
  const examId = q.examId ?? q.path.split("/")[1];
  const pick = async (l: string) => {
    if (sel || !showFeedback) return; setSel(l); setMsg("");
    try { const r = await checkAnswer(q.path, l); setRes(r); onAnswered?.(r.correct); } catch (e) { setSel(null); setMsg(friendlyError(e)); }
  };
  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs"><span className="chip">{q.subject}</span>{q.topic && <span className="chip">{q.topic}</span>}<span className="chip">{q.difficulty}</span>
        <span className="ml-auto flex gap-1">
          <button aria-label="Bookmark" className="btn-ghost !h-8 !w-8" onClick={() => { const n = !bm; setBm(n); toggleBookmark(uid, q.id, examId, n).catch(() => setBm(!n)); }}><Bookmark className={cn("h-4 w-4", bm && "fill-brand-500 text-brand-500")} /></button>
          <button aria-label="Report" className="btn-ghost !h-8 !w-8" onClick={() => { const r = prompt("What's wrong with this question?"); if (r) reportQuestion(uid, examId, q.id, r.slice(0, 300)).then(() => setMsg("Reported. Thanks!")).catch((e) => setMsg(friendlyError(e))); }}><Flag className="h-4 w-4" /></button></span></div>
      <p className="font-medium">{q.question}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {q.imageUrl && <img src={q.imageUrl} alt="" loading="lazy" className="mt-2 max-h-56 rounded-lg" />}
      <div className="mt-3 space-y-2">{(["A", "B", "C", "D"] as const).map((l) => (
        <button key={l} onClick={() => pick(l)} disabled={!!sel} className={cn("flex min-h-[48px] w-full items-center gap-2 rounded-xl border p-3 text-left text-sm", "border-slate-300 dark:border-slate-700",
          res?.correctAnswer === l && "!border-green-500 bg-green-50 dark:bg-green-950", sel === l && res && !res.correct && "!border-red-500 bg-red-50 dark:bg-red-950")}><b>{l}.</b> {q.options[l]}</button>))}</div>
      {res && <p className="mt-3 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{res.correct ? "✅ Correct. " : `❌ Incorrect — correct answer is ${res.correctAnswer}. `}{res.explanation}</p>}
      {msg && <p className="mt-2 text-xs text-amber-600">{msg}</p>}
    </Card>
  );
}
