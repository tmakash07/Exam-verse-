"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./ui";

type D = { date: string; attempts: number; newUsers: number }; type P = { name: string; attempts: number; avg: number };
export default function AdminCharts({ daily, popular }: { daily: D[]; popular: P[] }) {
  const c = (title: string, chart: React.ReactElement) => <Card className="p-4"><h3 className="mb-2 text-sm font-semibold">{title}</h3><div className="h-44"><ResponsiveContainer>{chart}</ResponsiveContainer></div></Card>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {c("User growth (new / day)", <LineChart data={daily}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="date" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} width={24} /><Tooltip /><Line dataKey="newUsers" stroke="#4f46e5" strokeWidth={2} isAnimationActive={false} /></LineChart>)}
      {c("Daily attempts", <BarChart data={daily}><CartesianGrid strokeDasharray="3 3" opacity={0.3} /><XAxis dataKey="date" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} width={24} /><Tooltip /><Bar dataKey="attempts" fill="#f59e0b" isAnimationActive={false} /></BarChart>)}
      {c("Popular exams", <BarChart data={popular}><XAxis dataKey="name" fontSize={9} /><YAxis allowDecimals={false} fontSize={11} width={24} /><Tooltip /><Bar dataKey="attempts" fill="#4f46e5" isAnimationActive={false} /></BarChart>)}
      {c("Average score by exam (%)", <BarChart data={popular}><XAxis dataKey="name" fontSize={9} /><YAxis domain={[0, 100]} fontSize={11} width={28} /><Tooltip /><Bar dataKey="avg" fill="#16a34a" isAnimationActive={false} /></BarChart>)}
    </div>
  );
}
