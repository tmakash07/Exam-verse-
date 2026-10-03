"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, ErrorBox, PageLoader } from "@/components/ui";
import { getExam, startExam } from "@/lib/services/exams";
import { friendlyError } from "@/lib/utils";
import type { Exam } from "@/types";

function Inner() {
  const { examId } = useParams<{ examId: string }>(); const router = useRouter();
  const [exam, setExam] = useState<Exam | null | undefined>(undefined); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { getExam(examId).then(setExam).catch((e) => { setErr(friendlyError(e)); setExam(null); }); }, [examId]);
  const start = async () => { setBusy(true); setErr(""); try { const r = await startExam(examId); router.push(`/attempt/${r.attemptId}`); } catch (e) { setErr(friendlyError(e)); setBusy(false); } };
  if (exam === undefined) return <PageLoader />;
  if (!exam) return <div className="space-y-3"><ErrorBox message={err || "This exam is unavailable."} /></div>;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="p-5">
        <h1 className="text-xl font-bold">{exam.title}</h1><p className="mt-1 text-sm text-slate-500">{exam.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><p className="label">Questions</p>{exam.questionsPerAttempt || exam.totalQuestions}</div><div><p className="label">Duration</p>{exam.durationMinutes} min</div>
          <div><p className="label">Negative</p>{exam.negativeMark}</div><div><p className="label">Difficulty</p>{exam.difficulty}</div>
        </div>
      </Card>
      <Card className="p-5"><h2 className="mb-2 font-semibold">Instructions</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
          <li>{exam.instructions || "Read each question carefully."}</li><li>The timer runs on the server. Closing the page does not pause it.</li>
          <li>Each wrong answer deducts {exam.negativeMark} mark(s). Skipped questions carry no penalty.</li><li>Answers are saved automatically, even when offline.</li>
          <li>The exam is auto-submitted when time runs out.</li>
        </ul>
      </Card>
      {err && <ErrorBox message={err} />}
      <button className="btn-primary w-full" disabled={busy} onClick={start}>{busy ? "Preparing your exam…" : "Start Exam"}</button>
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
