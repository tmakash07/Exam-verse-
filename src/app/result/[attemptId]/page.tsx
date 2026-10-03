"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, ErrorBox, PageLoader, Stat } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { getAnswers, getAttempt } from "@/lib/services/attempts";
import { reportQuestion } from "@/lib/services/admin";
import { cn, fmtDuration, friendlyError } from "@/lib/utils";
import type { AnswerDoc, Attempt } from "@/types";

const ResultCharts = dynamic(() => import("@/components/ResultCharts"), { ssr: false, loading: () => <div className="h-48" /> });

function Inner() {
  const { attemptId } = useParams<{ attemptId: string }>(); const { user } = useAuth(); const router = useRouter();
  const [a, setA] = useState<Attempt | null>(null); const [answers, setAnswers] = useState<Record<string, AnswerDoc>>({}); const [err, setErr] = useState("");
  const [filter, setFilter] = useState<"all" | "correct" | "wrong" | "skipped">("all"); const [i, setI] = useState(0); const [reported, setReported] = useState(false);
  useEffect(() => { if (!user) return; (async () => { try {
    const at = await getAttempt(user.uid, attemptId); if (!at) { setErr("Result not found."); return; }
    if (at.status === "in_progress") { router.replace(`/attempt/${attemptId}`); return; }
    const ans = await getAnswers(user.uid, attemptId); setAnswers(Object.fromEntries(ans.map((x) => [x.id, x]))); setA(at);
  } catch (e) { setErr(friendlyError(e)); } })(); }, [user, attemptId, router]);

  const list = useMemo(() => !a ? [] : a.questions.filter((q) => { const x = answers[q.id]; if (!x) return filter === "all"; return filter === "all" || (filter === "correct" ? x.isCorrect : filter === "wrong" ? !x.isCorrect && !!x.selectedAnswer : !x.selectedAnswer); }), [a, answers, filter]);
  useEffect(() => setI(0), [filter]);
  if (err) return <ErrorBox message={err} />;
  if (!a) return <PageLoader />;
  const q = list[i]; const x = q ? answers[q.id] : undefined;
  return (
    <div className="space-y-4">
      <Card className="p-5 text-center">
        <p className="text-sm text-slate-500">{a.examTitle}</p>
        <p className="mt-1 text-4xl font-extrabold">{a.score} <span className="text-xl text-slate-400">/ {a.totalMarks}</span></p>
        <p className="text-lg font-semibold text-brand-600">{a.percentage}% · Grade {a.grade}</p>
        <p className={cn("text-sm font-medium", a.passed ? "text-green-600" : "text-red-600")}>{a.passed ? "Passed" : "Below passing score"}{a.status === "expired" ? " · auto-submitted" : ""}</p>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Correct" value={a.correct} /><Stat label="Wrong" value={a.wrong} /><Stat label="Skipped" value={a.skipped} /><Stat label="Accuracy" value={`${a.accuracy}%`} /><Stat label="Time" value={fmtDuration(a.timeTaken ?? 0)} />
      </div>
      <ResultCharts attempt={a} />
      <div className="flex flex-wrap gap-2"><a href="#review" className="btn-primary">Review Answers</a><Link href={`/exams/${a.examId}`} className="btn-outline">Retake Exam</Link><Link href="/dashboard" className="btn-outline">Back to Dashboard</Link></div>
      <Card className="p-4"><div id="review" />
        <div className="mb-3 flex flex-wrap gap-2">{(["all", "correct", "wrong", "skipped"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={cn("chip capitalize", filter === f && "!bg-brand-500 !text-white")}>{f}</button>)}</div>
        {!q ? <p className="py-6 text-center text-sm text-slate-500">No questions in this filter.</p> : (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Question {i + 1} of {list.length} · {q.subject}</p>
            <p className="font-medium">{q.question}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.imageUrl && <img src={q.imageUrl} alt="" loading="lazy" className="max-h-56 rounded-lg" />}
            <div className="space-y-2">{(["A", "B", "C", "D"] as const).map((l) => (
              <div key={l} className={cn("rounded-xl border p-3 text-sm", x?.correctAnswer === l && "border-green-500 bg-green-50 dark:bg-green-950", x?.selectedAnswer === l && !x.isCorrect && "border-red-500 bg-red-50 dark:bg-red-950")}>
                <b>{l}.</b> {q.options[l]}{x?.selectedAnswer === l && <span className="ml-2 text-xs">(your answer)</span>}{x?.correctAnswer === l && <span className="ml-2 text-xs text-green-700">(correct)</span>}</div>))}</div>
            <p className="text-sm font-semibold">{!x?.selectedAnswer ? "⏭ Skipped" : x.isCorrect ? "✅ Correct" : "❌ Incorrect"}</p>
            {x?.explanation && <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800"><b>Explanation:</b> {x.explanation}</div>}
            <button className="text-xs text-slate-500 underline disabled:no-underline" disabled={reported} onClick={() => user && reportQuestion(user.uid, a.examId, q.id, "Reported from review").then(() => setReported(true)).catch(() => {})}>{reported ? "Reported — thanks" : "Report this question"}</button>
            <div className="flex gap-2"><button className="btn-outline flex-1" disabled={i === 0} onClick={() => { setI(i - 1); setReported(false); }}>Previous</button><button className="btn-primary flex-1" disabled={i >= list.length - 1} onClick={() => { setI(i + 1); setReported(false); }}>Next</button></div>
          </div>
        )}
      </Card>
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
