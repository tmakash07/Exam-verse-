import Link from "next/link";
import { BarChart3, ShieldCheck, Timer, Trophy, WifiOff, Target } from "lucide-react";

const features = [
  { icon: Timer, t: "Real exam engine", d: "Server-timed exams, negative marking, autosave and auto-submit." },
  { icon: ShieldCheck, t: "Answer keys stay secret", d: "Correct answers never reach your browser until you submit." },
  { icon: WifiOff, t: "Built for slow internet", d: "Offline-friendly. Your answers are kept locally and synced later." },
  { icon: BarChart3, t: "Deep analytics", d: "Subject and topic performance, weak areas and score trends." },
  { icon: Target, t: "Practice mode", d: "Subject, topic, weak-area and mistake practice with instant feedback." },
  { icon: Trophy, t: "Leaderboard & streaks", d: "Daily challenge, achievements, weekly and monthly ranks." }
];
export default function Landing() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="flex items-center justify-between"><span className="flex items-center gap-2 text-lg font-bold"><BarChart3 className="h-6 w-6 text-brand-500" />ExamVerse</span>
        <Link href="/login" className="btn-outline">Log in</Link></header>
      <section className="py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Prepare for admission exams <span className="text-brand-500">the real way</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">Timed mock tests, negative marking, instant analytics and a daily challenge — fast even on a budget phone.</p>
        <div className="mt-8 flex justify-center gap-3"><Link href="/login?mode=signup" className="btn-primary">Get started free</Link><Link href="/login" className="btn-outline">I have an account</Link></div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {features.map((f) => { const I = f.icon; return <div key={f.t} className="card p-5"><I className="h-6 w-6 text-brand-500" /><h3 className="mt-3 font-semibold">{f.t}</h3><p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{f.d}</p></div>; })}
      </section>
    </div>
  );
}
