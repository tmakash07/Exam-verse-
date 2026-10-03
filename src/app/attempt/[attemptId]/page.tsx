"use client";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, CheckCircle2, ChevronLeft, ChevronRight, Flag, Grid3X3, Loader2, WifiOff, X } from "lucide-react";
import { Protected } from "@/components/Shell";
import { ErrorBox, PageLoader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { flushWrites, getAttempt, getResponses, saveResponse, submitExam, toggleBookmark, watchBookmarks } from "@/lib/services/attempts";
import { call } from "@/lib/services/exams";
import { cn, fmtTime, friendlyError } from "@/lib/utils";
import type { Attempt, Letter } from "@/types";

type Local = Record<string, { a: Letter | null; marked: boolean; t: number }>;
const L: Letter[] = ["A", "B", "C", "D"];

function Runner() {
  const { attemptId } = useParams<{ attemptId: string }>(); const router = useRouter(); const { user } = useAuth();
  const [attempt, setAttempt] = useState<Attempt | null>(null); const [err, setErr] = useState("");
  const [local, setLocal] = useState<Local>({}); const [idx, setIdx] = useState(0);
  const [offset, setOffset] = useState(0); const [now, setNow] = useState(Date.now());
  const [online, setOnline] = useState(true); const [pending, setPending] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false); const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false); const [marks, setMarks] = useState<Set<string>>(new Set());
  const shownAt = useRef(Date.now()); const submitted = useRef(false); const storeKey = `ev:${attemptId}`;

  // ---- load attempt, server time offset, merge local + remote drafts ----
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [a, t0] = await Promise.all([getAttempt(user.uid, attemptId), call<{ now: number }>("syncTime").catch(() => null)]);
        if (!a) { setErr("Attempt not found."); return; }
        if (a.status !== "in_progress") { router.replace(`/result/${attemptId}`); return; }
        if (t0) setOffset(t0.now - Date.now());
        const remote = await getResponses(user.uid, attemptId).catch(() => ({} as Awaited<ReturnType<typeof getResponses>>));
        let saved: Local = {}; try { saved = JSON.parse(localStorage.getItem(storeKey) || "{}"); } catch { /* ignore */ }
        const merged: Local = {};
        a.questionOrder.forEach((id) => { const r = remote[id];
          merged[id] = saved[id] ?? { a: r?.selectedAnswer ?? null, marked: !!r?.marked, t: r?.timeSpent ?? 0 }; });
        setLocal(merged); setAttempt(a);
      } catch (e) { setErr(friendlyError(e)); }
    })();
  }, [user, attemptId, router, storeKey]);

  useEffect(() => { if (user) return watchBookmarks(user.uid, setMarks); }, [user]);
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false); setOnline(navigator.onLine); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (Object.keys(local).length) localStorage.setItem(storeKey, JSON.stringify(local)); }, [local, storeKey]);

  const remaining = attempt ? Math.floor((attempt.deadline.toMillis() - (now + offset)) / 1000) : 0;
  const q = attempt?.questions[idx];

  // ---- autosave: one small doc write per change, debounced per question ----
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const persist = useCallback((qid: string, v: { a: Letter | null; marked: boolean; t: number }) => {
    if (!user) return;
    clearTimeout(timers.current[qid]);
    timers.current[qid] = setTimeout(() => {
      setPending((p) => p + 1);
      saveResponse(user.uid, attemptId, qid, { selectedAnswer: v.a, marked: v.marked, timeSpent: v.t }).catch(() => {}).finally(() => setPending((p) => p - 1));
    }, 350);
  }, [user, attemptId]);

  const commitTime = (qid: string, cur: Local) => { const spent = Math.round((Date.now() - shownAt.current) / 1000); shownAt.current = Date.now(); return { ...cur, [qid]: { ...cur[qid], t: (cur[qid]?.t ?? 0) + spent } }; };
  const go = (n: number) => { if (!attempt || n < 0 || n >= attempt.questions.length) return; setLocal((c) => commitTime(attempt.questions[idx].id, c)); setIdx(n); setPaletteOpen(false); };
  const choose = (letter: Letter) => { if (!q) return; setLocal((c) => { const cur = commitTime(q.id, c); const nv = { ...cur[q.id], a: cur[q.id].a === letter ? null : letter }; persist(q.id, nv); return { ...cur, [q.id]: nv }; }); };
  const toggleMark = () => { if (!q) return; setLocal((c) => { const nv = { ...c[q.id], marked: !c[q.id].marked }; persist(q.id, nv); return { ...c, [q.id]: nv }; }); };

  const doSubmit = useCallback(async () => {
    if (!attempt || submitted.current) return; submitted.current = true; setSubmitting(true); setErr("");
    try {
      const cur = commitTime(attempt.questions[idx].id, local);
      const payload: Record<string, { a: Letter | null; t: number }> = {};
      attempt.questionOrder.forEach((id) => (payload[id] = { a: cur[id]?.a ?? null, t: cur[id]?.t ?? 0 }));
      await Promise.race([flushWrites(), new Promise((r) => setTimeout(r, 3000))]);
      await submitExam(attemptId, payload); // server recalculates everything; client payload is just the last known answers
      localStorage.removeItem(storeKey); router.replace(`/result/${attemptId}`);
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      if (code.includes("failed-precondition")) { router.replace(`/result/${attemptId}`); return; } // duplicate submission: already scored
      submitted.current = false; setSubmitting(false); setErr("Submission failed: " + friendlyError(e) + " Your answers are safe. Tap Submit to retry.");
    }
    // eslint-disable-next-line
  }, [attempt, attemptId, idx, local, router, storeKey]);

  useEffect(() => { if (attempt && remaining <= 0 && !submitted.current) doSubmit(); }, [remaining, attempt, doSubmit]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(idx + 1); else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key.toLowerCase() === "m") toggleMark();
      else { const i = "abcd1234".indexOf(e.key.toLowerCase()); if (i >= 0) choose(L[i % 4]); }
    };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  });

  const counts = useMemo(() => { const v = Object.values(local); return { answered: v.filter((x) => x.a).length, marked: v.filter((x) => x.marked).length, total: attempt?.questions.length ?? 0 }; }, [local, attempt]);
  if (err && !attempt) return <div className="p-6"><ErrorBox message={err} /></div>;
  if (!attempt || !q) return <PageLoader />;

  const status = !online ? "offline" : pending > 0 ? "saving" : "saved";
  const stateOf = (i: number) => { const id = attempt.questions[i].id; const s = local[id]; return i === idx ? "current" : s?.marked ? "review" : s?.a ? "answered" : "unanswered"; };
  const Palette = (
    <div className="grid grid-cols-5 gap-2">
      {attempt.questions.map((_, i) => { const s = stateOf(i); return (
        <button key={i} onClick={() => go(i)} className={cn("h-11 rounded-lg border text-sm font-semibold",
          s === "current" && "border-brand-500 bg-brand-500 text-white", s === "answered" && "border-green-500 bg-green-50 text-green-700 dark:bg-green-950",
          s === "review" && "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950", s === "unanswered" && "border-slate-300 dark:border-slate-700")}>{i + 1}</button>
      ); })}
    </div>
  );
  const low = remaining < 300;
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
      <header className="sticky top-0 z-30 border-b bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{attempt.examTitle}</p><p className="text-xs text-slate-500">Question {idx + 1} / {counts.total} · {Math.round((counts.answered / counts.total) * 100)}% done</p></div>
          <div className={cn("rounded-lg px-3 py-1 font-mono text-lg font-bold", low ? "animate-pulse bg-red-100 text-red-700 dark:bg-red-950" : "bg-slate-100 dark:bg-slate-800")} aria-live="off">⏱ {fmtTime(remaining)}</div>
          <button className="btn-primary !min-h-[40px] px-3" onClick={() => setConfirm(true)}>Submit</button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-200 dark:bg-slate-800"><div className="h-full bg-brand-500 transition-all" style={{ width: `${(counts.answered / counts.total) * 100}%` }} /></div>
        <div className="mt-1 flex items-center gap-1 text-xs">
          {status === "saved" && <><CheckCircle2 className="h-3.5 w-3.5 text-green-600" />Saved</>}
          {status === "saving" && <><Loader2 className="h-3.5 w-3.5 animate-spin" />Syncing...</>}
          {status === "offline" && <span className="flex items-center gap-1 text-amber-600"><WifiOff className="h-3.5 w-3.5" />Offline — answers saved locally</span>}
          {low && <span className="ml-auto font-semibold text-red-600">Less than 5 minutes left</span>}
        </div>
      </header>
      <div className="flex flex-1 gap-4 p-3 pb-28">
        <main className="min-w-0 flex-1">
          {err && <div className="mb-3"><ErrorBox message={err} /></div>}
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between"><span className="chip">{q.subject}</span>
              <button aria-label="Bookmark" className="btn-ghost" onClick={() => user && toggleBookmark(user.uid, q.id, attempt.examId, !marks.has(q.id)).catch(() => {})}><Bookmark className={cn("h-5 w-5", marks.has(q.id) && "fill-brand-500 text-brand-500")} /></button></div>
            <p className="text-base font-medium leading-relaxed">{idx + 1}. {q.question}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {q.imageUrl && <img src={q.imageUrl} alt="Question" loading="lazy" className="mt-3 max-h-64 rounded-lg" />}
            <div className="mt-4 space-y-2">
              {L.map((l) => { const on = local[q.id]?.a === l; return (
                <button key={l} onClick={() => choose(l)} className={cn("flex min-h-[52px] w-full items-center gap-3 rounded-xl border p-3 text-left", on ? "border-brand-500 bg-brand-50 dark:bg-slate-800" : "border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800")}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold", on && "border-brand-500 bg-brand-500 text-white")}>{l}</span><span>{q.options[l]}</span></button>
              ); })}
            </div>
          </div>
        </main>
        <aside className="card sticky top-28 hidden h-fit w-64 shrink-0 p-4 md:block"><h3 className="mb-3 text-sm font-semibold">Question palette</h3>{Palette}
          <p className="mt-3 text-xs text-slate-500">Keys: ←/→ navigate · A–D select · M mark</p></aside>
      </div>
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center gap-2">
          <button className="btn-outline flex-1" disabled={idx === 0} onClick={() => go(idx - 1)}><ChevronLeft className="h-4 w-4" />Prev</button>
          <button className={cn("btn-outline", local[q.id]?.marked && "!border-amber-500 !text-amber-600")} onClick={toggleMark} aria-label="Mark for review"><Flag className="h-4 w-4" /><span className="hidden sm:inline">Review</span></button>
          <button className="btn-outline md:hidden" onClick={() => setPaletteOpen(true)} aria-label="Palette"><Grid3X3 className="h-4 w-4" /></button>
          <button className="btn-primary flex-1" disabled={idx === counts.total - 1} onClick={() => go(idx + 1)}>Next<ChevronRight className="h-4 w-4" /></button>
        </div>
      </footer>
      {paletteOpen && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40 md:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="max-h-[70vh] w-full overflow-auto rounded-t-2xl bg-white p-4 dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><h3 className="font-semibold">Question palette</h3><button onClick={() => setPaletteOpen(false)}><X className="h-5 w-5" /></button></div>{Palette}</div>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm p-5">
            <h3 className="text-lg font-bold">Submit exam?</h3>
            <p className="mt-2 text-sm">You have:</p>
            <ul className="mt-1 text-sm"><li><b>{counts.answered}</b> answered</li><li><b>{counts.marked}</b> marked for review</li><li><b>{counts.total - counts.answered}</b> unanswered</li></ul>
            <p className="mt-2 text-sm text-slate-500">Are you sure you want to submit?</p>
            <div className="mt-4 flex gap-2"><button className="btn-outline flex-1" onClick={() => setConfirm(false)}>Continue Exam</button>
              <button className="btn-primary flex-1" disabled={submitting} onClick={() => { setConfirm(false); doSubmit(); }}>{submitting ? "Submitting…" : "Submit Exam"}</button></div>
          </div>
        </div>
      )}
      {submitting && !confirm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 text-white"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Calculating your result…</div>}
    </div>
  );
}
export default function Page() { return <Protected><Runner /></Protected>; }
