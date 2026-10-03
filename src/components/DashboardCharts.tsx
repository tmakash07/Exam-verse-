"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./ui";
import type { Attempt } from "@/types";

export default function DashboardCharts({ attempts, subjectStats }: { attempts: Attempt[]; subjectStats: Record<string, { correct: number; wrong: number; skipped: number }> }) {
  const series = [...attempts].reverse().map((a, i) => ({ n: i + 1, score: a.percentage ?? 0, accuracy: a.accuracy ?? 0 }));
  const subjects = Object.entries(subjectStats).map(([s, v]) => ({ subject: s.replace("Higher Mathematics", "Math").replace("General Knowledge", "GK"), acc: v.correct + v.wrong ? Math.round((v.correct / (v.correct + v.wrong)) * 100) : 0 }));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return { key: d.toDateString(), label: d.toLocaleDateString(undefined, { weekday: "short" }), exams: 0 }; });
  attempts.forEach((a) => { const k = a.submittedAt?.toDate().toDateString(); const d = days.find((x) => x.key === k); if (d) d.exams++; });
  const box = "h-44";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Score over time (%)</h3><div className={box}><ResponsiveContainer><LineChart data={series}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="n" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} width={28} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></Card>
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Accuracy trend (%)</h3><div className={box}><ResponsiveContainer><LineChart data={series}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="n" fontSize={11} /><YAxis domain={[0, 100]} fontSize={11} width={28} /><Tooltip /><Line type="monotone" dataKey="accuracy" stroke="#16a34a" strokeWidth={2} dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div></Card>
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Subject accuracy (%)</h3><div className={box}><ResponsiveContainer><BarChart data={subjects}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="subject" fontSize={10} /><YAxis domain={[0, 100]} fontSize={11} width={28} /><Tooltip /><Bar dataKey="acc" fill="#4f46e5" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Weekly activity</h3><div className={box}><ResponsiveContainer><BarChart data={days}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="label" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={28} /><Tooltip /><Bar dataKey="exams" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  );
}
