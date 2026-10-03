"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Flame, Zap } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, ErrorBox, PageLoader, Stat } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { attemptsForExam, recentAttempts } from "@/lib/services/attempts";
import { getDailyChallenge, recommendedExams, call } from "@/lib/services/exams";
import { fmtDuration, friendlyError } from "@/lib/utils";
import type { Attempt, Exam } from "@/types";

const Charts = dynamic(() => import("@/components/DashboardCharts"), { ssr: false, loading: () => <div className="h-48" /> });

function Inner() {
  const { user, profile } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const [recs, setRecs] = useState<Exam[]>([]);
  const [daily, setDaily] = useState<{ examId: string; done: Attempt | null } | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setAttempts(await recentAttempts(user.uid, 30));
        let d = await getDailyChallenge();
        if (!d) { try { const r = await call<{ examId: string | null }>("ensureDailyChallenge"); if (r.examId) d = { examId: r.examId, date: "" }; } catch { /* no questions yet */ } }
        if (d) { const a = await attemptsForExam(user.uid, d.examId); setDaily({ examId: d.examId, done: a.find((x) => x.status !== "in_progress") ?? null }); }
      } catch (e) { setErr(friendlyError(e)); setAttempts([]); }
    })();
  }, [user]);

  const weak = Object.entries(profile?.topicStats ?? {}).filter(([, v]) => v.c + v.w >= 3).map(([k, v]) => ({ k: k.replace("__", " → "), subject: k.split("__")[0], acc: Math.round((v.c / (v.c + v.w)) * 100) })).sort((a, b) => a.acc - b.acc).slice(0, 3);
  useEffect(() => { recommendedExams(weak[0]?.subject).then(setRecs).catch(() => {}); /* eslint-disable-next-line */ }, [profile?.totalExams]);

  if (!profile || !attempts) return <PageLoader />;
  const submitted = attempts.filter((a) => a.status !== "in_progress");
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Welcome back, {profile.fullName.split(" ")[0]}</h1><p className="text-sm text-slate-500">Keep your streak going.</p></div>
      {err && <ErrorBox message={err} />}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
        <Stat label="Exams" value={profile.totalExams} /><Stat label="Avg score" value={`${profile.averageScore}%`} /><Stat label="Best" value={`${profile.bestScore}%`} />
        <Stat label="Accuracy" value={`${profile.accuracy}%`} /><Stat label="Questions" value={profile.totalQuestions} />
        <Stat label="Streak" value={<span className="inline-flex items-center gap-1"><Flame className="h-5 w-5 text-orange-500" />{profile.currentStreak}</span>} />
      </div>
      {daily && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3"><Zap className="h-8 w-8 text-amber-500" /><div><p className="font-semibold">Daily Challenge</p><p className="text-sm text-slate-500">10 questions · 10 minutes</p></div></div>
          {daily.done ? <Link href={`/result/${daily.done.id}`} className="btn-outline">{daily.done.percentage}% · View</Link> : <Link href={`/exams/${daily.examId}`} className="btn-primary">Start</Link>}
        </Card>
      )}
      {submitted.length ? <Charts attempts={submitted} subjectStats={profile.subjectStats ?? {}} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Weak areas</h2>
          {weak.length ? weak.map((w) => <div key={w.k} className="flex items-center justify-between border-b py-2 text-sm last:border-0 dark:border-slate-800"><span>{w.k}</span><span className="chip">{w.acc}%</span></div>) : <p className="text-sm text-slate-500">Take a few exams to see your weak topics.</p>}
          {weak.length > 0 && <Link href="/practice?mode=weak" className="btn-outline mt-3 w-full">Practice weak areas</Link>}
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Recommended for you</h2>
          {recs.length ? recs.map((e) => <Link key={e.id} href={`/exams/${e.id}`} className="block border-b py-2 text-sm last:border-0 dark:border-slate-800"><span className="font-medium">{e.title}</span><span className="block text-xs text-slate-500">{e.durationMinutes} min · {e.difficulty}</span></Link>) : <p className="text-sm text-slate-500">No exams published yet.</p>}
        </Card>
      </div>
      <Card className="overflow-x-auto p-4">
        <h2 className="mb-3 font-semibold">Recent exams</h2>
        {submitted.length === 0 ? <EmptyState title="No exams yet" hint="Start your first mock test." /> : (
          <table className="w-full min-w-[460px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Exam</th><th>Date</th><th>Score</th><th>Acc.</th><th>Time</th><th /></tr></thead>
            <tbody>{submitted.slice(0, 6).map((a) => (
              <tr key={a.id} className="border-t dark:border-slate-800"><td className="py-2 font-medium">{a.examTitle}</td><td>{a.submittedAt?.toDate().toLocaleDateString()}</td><td>{a.percentage}%</td><td>{a.accuracy}%</td><td>{fmtDuration(a.timeTaken ?? 0)}</td><td><Link className="text-brand-600" href={`/result/${a.id}`}>Review</Link></td></tr>
            ))}</tbody></table>
        )}
      </Card>
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
