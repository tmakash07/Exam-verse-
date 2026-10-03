"use client";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, ErrorBox, PageLoader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { getLeaderboard } from "@/lib/services/practice";
import { cn, friendlyError } from "@/lib/utils";
import type { LeaderEntry } from "@/types";

function Inner() {
  const { user } = useAuth(); const [p, setP] = useState<"global" | "weekly" | "monthly">("weekly");
  const [data, setData] = useState<{ top: LeaderEntry[]; mine: LeaderEntry | null; rank: number | null } | null>(null); const [err, setErr] = useState("");
  useEffect(() => { if (!user) return; setData(null); setErr(""); getLeaderboard(p, user.uid).then(setData).catch((e) => setErr(friendlyError(e))); }, [p, user]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <div className="flex gap-2">{(["weekly", "monthly", "global"] as const).map((x) => <button key={x} onClick={() => setP(x)} className={cn("chip !px-3 !py-1.5 capitalize", p === x && "!bg-brand-500 !text-white")}>{x}</button>)}</div>
      {err && <ErrorBox message={err} />}
      {!data && !err ? <PageLoader /> : data && (
        <>
          <Card className="p-4 text-sm">{data.mine ? <>Your rank: <b className="text-lg">#{data.rank}</b> · {data.mine.exams} exams · avg {data.mine.avgScore}%</> : "Take an exam to appear on this board."}</Card>
          {data.top.length === 0 ? <EmptyState title="No entries yet" /> : (
            <Card className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="p-3">Rank</th><th>User</th><th>Exams</th><th>Avg</th><th>Acc.</th></tr></thead>
              <tbody>{data.top.map((e, i) => <tr key={e.uid} className={cn("border-t dark:border-slate-800", e.uid === user?.uid && "bg-brand-50 dark:bg-slate-800")}><td className="p-3 font-semibold">{i + 1}</td><td>{e.name}</td><td>{e.exams}</td><td>{e.avgScore}%</td><td>{e.accuracy}%</td></tr>)}</tbody></table></Card>
          )}
        </>
      )}
    </div>
  );
}
export default function Page() { return <Shell><Inner /></Shell>; }
