"use client";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { Shell } from "@/components/Shell";
import { Card, EmptyState, ErrorBox, PageLoader } from "@/components/ui";
import { deleteQuestion, getAdminExam, importQuestions, listQuestions, QInput, saveQuestion, uploadQuestionImage } from "@/lib/services/admin";
import { friendlyError, parseCSV } from "@/lib/utils";
import type { AdminQuestion, Exam, Letter } from "@/types";

const empty: QInput = { question: "", imageUrl: null, optionA: "", optionB: "", optionC: "", optionD: "", correctAnswer: "A", explanation: "", subject: "", topic: "", difficulty: "Medium", marks: 1, inBank: true, year: null };
const HEAD = ["question", "option_a", "option_b", "option_c", "option_d", "correct_answer", "explanation", "subject", "topic", "difficulty", "marks"];

function validate(rows: string[][]): { ok: QInput[]; errors: string[] } {
  const ok: QInput[] = []; const errors: string[] = [];
  const head = rows[0]?.map((h) => h.trim().toLowerCase());
  if (!head || HEAD.some((h, i) => head[i] !== h)) return { ok, errors: [`Header must be exactly: ${HEAD.join(",")}`] };
  rows.slice(1).forEach((r, i) => {
    const n = i + 2; const [question, a, b, c, d, ans, expl, subject, topic, diff, marks] = r.map((x) => (x ?? "").trim());
    const problems: string[] = [];
    if (!question) problems.push("question empty"); if (!a || !b || !c || !d) problems.push("all 4 options required");
    if (!["A", "B", "C", "D"].includes(ans.toUpperCase())) problems.push("correct_answer must be A/B/C/D");
    if (!subject) problems.push("subject empty"); if (!["Easy", "Medium", "Hard"].includes(diff)) problems.push("difficulty must be Easy/Medium/Hard");
    if (!(Number(marks) > 0)) problems.push("marks must be > 0");
    if (problems.length) errors.push(`Row ${n}: ${problems.join(", ")}`);
    else ok.push({ question, imageUrl: null, optionA: a, optionB: b, optionC: c, optionD: d, correctAnswer: ans.toUpperCase() as Letter, explanation: expl, subject, topic, difficulty: diff, marks: Number(marks), inBank: true, year: null });
  });
  return { ok, errors };
}

function Inner() {
  const { examId } = useParams<{ examId: string }>();
  const [exam, setExam] = useState<Exam | null>(null); const [items, setItems] = useState<AdminQuestion[]>([]); const [cursor, setCursor] = useState<QueryDocumentSnapshot<DocumentData>>(); const [done, setDone] = useState(false);
  const [form, setForm] = useState<(QInput & { id?: string }) | null>(null); const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ ok: QInput[]; errors: string[] } | null>(null);

  const load = useCallback(async (more = false) => {
    try { const r = await listQuestions(examId, more ? cursor : undefined); setItems((p) => (more ? [...p, ...r.items] : r.items)); setCursor(r.last); setDone(r.done); setExam(await getAdminExam(examId)); }
    catch (e) { setErr(friendlyError(e)); } finally { setLoading(false); }
  }, [examId, cursor]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const act = async (fn: () => Promise<unknown>, ok = "") => { setBusy(true); setErr(""); setMsg(""); try { await fn(); setMsg(ok); await load(); } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); } };
  const set = <K extends keyof QInput>(k: K, v: QInput[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  if (loading) return <PageLoader />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h1 className="text-xl font-bold">{exam?.title}</h1><p className="text-sm text-slate-500">{exam?.totalQuestions ?? 0} questions</p></div>
        <div className="flex gap-2"><button className="btn-primary" onClick={() => setForm({ ...empty, subject: exam?.subject.split(" • ")[0] ?? "" })}>Add question</button>
          <label className="btn-outline cursor-pointer">Import CSV<input type="file" accept=".csv,text/csv" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setPreview(validate(parseCSV(await f.text()))); }} /></label></div></div>
      {err && <ErrorBox message={err} />}{msg && <p className="text-sm text-green-600">{msg}</p>}
      {preview && (
        <Card className="space-y-2 p-4"><h2 className="font-semibold">Import preview</h2>
          <p className="text-sm">{preview.ok.length} valid row(s), {preview.errors.length} problem(s).</p>
          {preview.errors.length > 0 && <ul className="max-h-40 list-disc overflow-auto pl-5 text-xs text-red-600">{preview.errors.slice(0, 50).map((x) => <li key={x}>{x}</li>)}</ul>}
          {preview.ok.slice(0, 3).map((q, i) => <p key={i} className="truncate text-xs text-slate-500">• {q.question}</p>)}
          <p className="text-xs text-slate-500">Format: {HEAD.join(", ")}. Rows with errors are skipped; fix them and re-import.</p>
          <div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setPreview(null)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={busy || !preview.ok.length} onClick={() => act(async () => { await importQuestions(examId, preview.ok); setPreview(null); }, "Imported.")}>Import {preview.ok.length}</button></div></Card>
      )}
      {form && (
        <Card className="space-y-3 p-4">
          <div><label className="label">Question</label><textarea className="input" rows={3} value={form.question} onChange={(e) => set("question", e.target.value)} /></div>
          <div className="grid gap-2 md:grid-cols-2">{(["optionA", "optionB", "optionC", "optionD"] as const).map((k) => <div key={k}><label className="label">{k.replace("option", "Option ")}</label><input className="input" value={form[k]} onChange={(e) => set(k, e.target.value)} /></div>)}</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div><label className="label">Correct</label><select className="input" value={form.correctAnswer} onChange={(e) => set("correctAnswer", e.target.value as Letter)}>{["A", "B", "C", "D"].map((l) => <option key={l}>{l}</option>)}</select></div>
            <div><label className="label">Marks</label><input className="input" type="number" min={0.25} step="0.25" value={form.marks} onChange={(e) => set("marks", +e.target.value)} /></div>
            <div><label className="label">Subject</label><input className="input" value={form.subject} onChange={(e) => set("subject", e.target.value)} /></div>
            <div><label className="label">Topic</label><input className="input" value={form.topic} onChange={(e) => set("topic", e.target.value)} /></div>
            <div><label className="label">Difficulty</label><select className="input" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            <div><label className="label">Year</label><input className="input" type="number" value={form.year ?? ""} onChange={(e) => set("year", e.target.value ? +e.target.value : null)} /></div>
            <label className="col-span-2 flex items-center gap-2 pt-6 text-sm"><input type="checkbox" className="h-4 w-4" checked={form.inBank} onChange={(e) => set("inBank", e.target.checked)} />Show in question bank / practice</label>
          </div>
          <div><label className="label">Explanation</label><textarea className="input" rows={2} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} /></div>
          <div><label className="label">Image (optional, auto-resized)</label><input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) act(async () => set("imageUrl", await uploadQuestionImage(examId, f)), "Image uploaded."); }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {form.imageUrl && <img src={form.imageUrl} alt="" className="mt-2 max-h-32 rounded-lg" />}</div>
          <div className="flex gap-2"><button className="btn-outline flex-1" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={busy || !form.question.trim() || !form.optionA || !form.optionB || !form.optionC || !form.optionD || !form.subject} onClick={() => act(async () => { const { id, ...data } = form; await saveQuestion(examId, id ?? null, data); setForm(null); }, "Saved.")}>Save question</button></div>
        </Card>
      )}
      {items.length === 0 ? <EmptyState title="No questions yet" hint="Add one or import a CSV." /> : items.map((q) => (
        <Card key={q.id} className="p-3"><p className="text-sm font-medium">{q.question}</p>
          <p className="mt-1 text-xs text-slate-500">{q.subject} · {q.topic} · {q.difficulty} · {q.marks} mark(s) · Answer: {q.correctAnswer}</p>
          <div className="mt-2 flex gap-2"><button className="btn-outline !min-h-[34px]" onClick={() => setForm({ ...empty, ...q })}>Edit</button><button className="btn-danger !min-h-[34px]" disabled={busy} onClick={() => confirm("Delete this question?") && act(() => deleteQuestion(examId, q.id))}>Delete</button></div></Card>
      ))}
      {!done && <button className="btn-outline w-full" onClick={() => load(true)}>Load more</button>}
    </div>
  );
}
export default function Page() { return <Shell admin><Inner /></Shell>; }
