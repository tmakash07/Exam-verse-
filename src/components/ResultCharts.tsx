"use client";
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./ui";
import type { Attempt } from "@/types";

export default function ResultCharts({ attempt: a }: { attempt: Attempt }) {
  const pie = [{ name: "Correct", v: a.correct ?? 0, c: "#16a34a" }, { name: "Wrong", v: a.wrong ?? 0, c: "#dc2626" }, { name: "Skipped", v: a.skipped ?? 0, c: "#94a3b8" }];
  const subj = Object.entries(a.subjectStats ?? {}).map(([s, v]) => ({ s: s.replace("Higher Mathematics", "Math").replace("General Knowledge", "GK"), Correct: v.correct, Wrong: v.wrong, Skipped: v.skipped, time: Math.round(v.time / Math.max(1, v.correct + v.wrong + v.skipped)) }));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Correct vs Wrong vs Skipped</h3><div className="h-48"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="v" nameKey="name" innerRadius={40} outerRadius={70} isAnimationActive={false}>{pie.map((p) => <Cell key={p.name} fill={p.c} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></Card>
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Subject performance</h3><div className="h-48"><ResponsiveContainer><BarChart data={subj}><XAxis dataKey="s" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} width={24} /><Tooltip /><Bar dataKey="Correct" stackId="a" fill="#16a34a" isAnimationActive={false} /><Bar dataKey="Wrong" stackId="a" fill="#dc2626" isAnimationActive={false} /><Bar dataKey="Skipped" stackId="a" fill="#94a3b8" isAnimationActive={false} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">Avg. seconds per question</h3><div className="h-48"><ResponsiveContainer><BarChart data={subj}><XAxis dataKey="s" fontSize={10} /><YAxis fontSize={11} width={28} /><Tooltip /><Bar dataKey="time" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></Card>
    </div>
  );
}
