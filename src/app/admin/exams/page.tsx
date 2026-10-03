"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, ErrorBox, PageLoader } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { createExam, deleteExam, duplicateExam, listAllExams, setPublished, updateExam, ExamInput } from "@/lib/services/admin";
import { friendlyError } from "@/lib/utils";
import type { Exam } from "@/types";

const blank: ExamInput = { title: "", description: "", category: "Mock Test", subject: "", durationMinutes: 60, negativeMark: 0.25, passingScore: 40, difficulty: "Medium", instructions: "", isPublished: false, isPremium: false, shuffleQuestions: true, shuffleOptions: true, questionsPerAttempt: null };

function Inner() {
  const { user } = useAuth(); const [exams, setExams] = useState<Exam[] | null>(null); const [err, setErr] = useState("");
  const [form, setForm] = useState<(ExamInput & { id?: string }) | null>(null); const [busy, setBusy] = useState(false);
  const load = () => listAllExams().then(setExams).catch((e) => { setErr(friendlyError(e)); setExams([]); });
  useEffect(() => { load(); }, []);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); setErr(""); try { await fn(); await load(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); } };
  const set = <K extends keyof ExamInput>(k: K, v: ExamInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  if (!exams || !user) return <PageLoader />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Exams</h1><button className="btn-primary" onClick={() => setForm({ ...blank })}>New exam</button></div>
      {err && <ErrorBox message={err} />}
      {form && (
        <Card className="space-y-3 p-4">
          <h2 className="font-semibold">{form.id ? "Edit exam" : "Create exam"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} /></div>
            <div><label className="label">Category</label><input className="input" value={form.category} onChange={(e) => set("category", e.target.value)} /></div>
            <div><label className="label">Subject(s)</label><input className="input" value={form.subject} onChange={(e) => set("subject", e.target.value)} /></div>
            <div><label className="label">Difficulty</label><select className="input" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            <div><label className="label">Duration (min)</label><input className="input" type="number" min={1} value={form.durationMinutes} onChange={(e) => set("durationMinutes", +e.target.value)} /></div>
            <div><label className="label">Questions per attempt (blank = all)</label><input className="input" type="number" min={1} value={form.questionsPerAttempt ?? ""} onChange={(e) => set("questionsPerAttempt", e.target.value ? +e.target.value : null)} /></div>
            <div><label className="label">Negative mark</label><input className="input" type="number" step="0.05" min={0} value={form.negativeMark} onChange={(e) => set("negativeMark", +e.target.value)} /></div>
            <div><label className="label">Passing score (%)</label><input className="input" type="number" min={0} max={100} value={form.passingScore} onChange={(e) => set("passingScore", +e.target.value)} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div><label className="label">Instructions</label><textarea className="input" rows={3} value={form.instructions} onChange={(e) => set("instructions", e.target.value)} /></div>
          <div className="flex flex-wrap gap-4 text-sm">
            {([["isPublished", "Published"], ["isPremium", "Premium"], ["shuffleQuestions", "Shuffle questions"], ["shuffleOptions", "Shuffle options"]] as const).map(([k, l]) => <label key={k} className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>)}
          </div>
          <div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={busy || !form.title.trim() || form.durationMinutes < 1} onClick={() => act(async () => { const { id, ...data } = form; if (id) await updateExam(id, data); else await createExam(user.uid, data); setForm(null); })}>Save</button></div>
        </Card>
      )}
      {exams.length === 0 ? <EmptyState title="No exams yet" hint="Create one, or use 'Seed sample data' on the admin dashboard." /> : (
        <div className="space-y-2">{exams.map((e) => (
          <Card key={e.id} className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{e.title}</p><p className="text-xs text-slate-500">{e.totalQuestions} questions · {e.durationMinutes} min · {e.attemptCount ?? 0} attempts · {e.isPublished ? "Published" : "Draft"}</p></div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Link className="btn-outline !min-h-[36px]" href={`/admin/exams/${e.id}`}>Questions</Link>
              <button className="btn-outline !min-h-[36px]" onClick={() => setForm({ ...blank, ...e })}>Edit</button>
              <button className="btn-outline !min-h-[36px]" disabled={busy} onClick={() => act(() => setPublished(e.id, !e.isPublished))}>{e.isPublished ? "Unpublish" : "Publish"}</button>
              <button className="btn-outline !min-h-[36px]" disabled={busy} onClick={() => act(() => duplicateExam(user.uid, e))}>Duplicate</button>
              <button className="btn-danger !min-h-[36px]" disabled={busy} onClick={() => confirm(`Delete "${e.title}" and all its questions?`) && act(() => deleteExam(e.id))}>Delete</button>
            </div>
          </Card>))}</div>
      )}
    </div>
  );
}
export default function Page() { return <Shell admin><Inner /></Shell>; }
