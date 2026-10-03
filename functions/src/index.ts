import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp, DocumentData } from "firebase-admin/firestore";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import * as v1 from "firebase-functions/v1";
import { defineString } from "firebase-functions/params";
import { ACHIEVEMENTS, BASE_QUESTIONS, SEED_EXAMS } from "./seedData";

initializeApp();
const db = getFirestore();
const REGION = "asia-south1";
const GRACE_MS = 15_000;
const ADMIN_BOOTSTRAP_EMAIL = defineString("ADMIN_BOOTSTRAP_EMAIL", { default: "" });
const opts = { region: REGION, cors: true, enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };
const LETTERS = ["A", "B", "C", "D"] as const;
type Letter = (typeof LETTERS)[number];

// ---------- helpers ----------
const dhakaDate = (d: Date) => new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
const addDays = (ymd: string, n: number) => new Date(Date.parse(ymd + "T00:00:00Z") + n * 86400_000).toISOString().slice(0, 10);
function isoWeek(ymd: string): string {
  const d = new Date(Date.parse(ymd + "T00:00:00Z"));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, "0")}`;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function requireAuth(req: CallableRequest): string {
  if (!req.auth) throw new HttpsError("unauthenticated", "Please sign in again.");
  return req.auth.uid;
}
function requireAdmin(req: CallableRequest): string {
  const uid = requireAuth(req);
  if (req.auth?.token.admin !== true) throw new HttpsError("permission-denied", "Admins only.");
  return uid;
}
function grade(pct: number) {
  return pct >= 80 ? "A+" : pct >= 70 ? "A" : pct >= 60 ? "A-" : pct >= 50 ? "B" : pct >= 40 ? "C" : pct >= 33 ? "D" : "F";
}
const round = (n: number, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

function safePractice(id: string, path: string, d: DocumentData) {
  return { id, path, question: d.question, imageUrl: d.imageUrl ?? null, options: { A: d.optionA, B: d.optionB, C: d.optionC, D: d.optionD }, subject: d.subject, topic: d.topic, difficulty: d.difficulty };
}

// ---------- auth triggers ----------
export const onUserCreated = v1.region(REGION).auth.user().onCreate(async (user) => {
  const bootstrap = ADMIN_BOOTSTRAP_EMAIL.value().trim().toLowerCase();
  const makeAdmin = !!bootstrap && (user.email ?? "").toLowerCase() === bootstrap;
  if (makeAdmin) await getAuth().setCustomUserClaims(user.uid, { admin: true });
  const today = dhakaDate(new Date());
  await Promise.all([
    db.doc(`users/${user.uid}`).set({
      uid: user.uid, fullName: user.displayName || (user.email ?? "Student").split("@")[0], email: user.email ?? "",
      avatarUrl: user.photoURL ?? "", role: makeAdmin ? "admin" : "student",
      totalExams: 0, totalQuestions: 0, averageScore: 0, accuracy: 0, bestScore: 0, currentStreak: 0,
      correctTotal: 0, wrongTotal: 0, scoreSum: 0, lastExamDate: null, subjectStats: {}, topicStats: {},
      settings: { notifications: true, language: "en" }, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
    }, { merge: true }),
    db.doc(`statsDaily/${today}`).set({ newUsers: FieldValue.increment(1) }, { merge: true })
  ]);
});

export const createAdminUser = onCall(opts, async (req) => {
  requireAdmin(req);
  const email = String(req.data?.email ?? "").trim().toLowerCase();
  const makeAdmin = req.data?.admin !== false;
  if (!email) throw new HttpsError("invalid-argument", "Email required.");
  const target = await getAuth().getUserByEmail(email).catch(() => null);
  if (!target) throw new HttpsError("not-found", "No user with that email. They must sign up first.");
  await getAuth().setCustomUserClaims(target.uid, makeAdmin ? { admin: true } : {});
  await db.doc(`users/${target.uid}`).set({ role: makeAdmin ? "admin" : "student", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true, uid: target.uid };
});

export const syncTime = onCall(opts, async (req) => { requireAuth(req); return { now: Date.now() }; });

// ---------- exam start ----------
export const startExam = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const examId = String(req.data?.examId ?? "");
  if (!examId) throw new HttpsError("invalid-argument", "Missing exam.");
  const eSnap = await db.doc(`exams/${examId}`).get();
  if (!eSnap.exists) throw new HttpsError("not-found", "This exam is unavailable.");
  const exam = eSnap.data()!;
  if (!exam.isPublished && !exam.isDaily) throw new HttpsError("failed-precondition", "This exam is not published.");

  const mine = await db.collection(`users/${uid}/attempts`).where("examId", "==", examId).get();
  const open = mine.docs.find((d) => d.get("status") === "in_progress" && d.get("deadline").toMillis() > Date.now());
  if (open) return { attemptId: open.id, resumed: true };
  if (exam.isDaily && mine.docs.some((d) => d.get("status") !== "in_progress")) throw new HttpsError("already-exists", "You already completed today's challenge.");

  const qSnap = await db.collection(`exams/${examId}/questions`).get();
  if (qSnap.empty) throw new HttpsError("failed-precondition", "This exam has no questions yet.");
  let docs = exam.shuffleQuestions === false ? qSnap.docs : shuffle(qSnap.docs);
  const limit = Number(exam.questionsPerAttempt) > 0 ? Number(exam.questionsPerAttempt) : docs.length;
  docs = docs.slice(0, limit);

  const questions: DocumentData[] = [];
  const items: Record<string, DocumentData> = {};
  for (const d of docs) {
    const q = d.data();
    const orig: Letter[] = exam.shuffleOptions === false ? [...LETTERS] : shuffle([...LETTERS]);
    const text: Record<Letter, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
    const options: Record<string, string> = {};
    LETTERS.forEach((L, i) => (options[L] = text[orig[i]]));
    const correctDisplayed = LETTERS[orig.indexOf(q.correctAnswer as Letter)] ?? "A";
    questions.push({ id: d.id, question: q.question, imageUrl: q.imageUrl ?? null, options, subject: q.subject ?? "General", topic: q.topic ?? "", marks: Number(q.marks) || 1 });
    items[d.id] = { c: correctDisplayed, m: Number(q.marks) || 1, e: q.explanation ?? "", s: q.subject ?? "General", t: q.topic ?? "" };
  }
  const startedMs = Date.now();
  const deadline = Timestamp.fromMillis(startedMs + Number(exam.durationMinutes) * 60_000);
  const aRef = db.collection(`users/${uid}/attempts`).doc();
  const batch = db.batch();
  batch.set(aRef, {
    examId, examTitle: exam.title, isDaily: !!exam.isDaily, status: "in_progress", startedAt: FieldValue.serverTimestamp(), deadline,
    durationMinutes: Number(exam.durationMinutes), negativeMark: Number(exam.negativeMark) || 0,
    questionOrder: questions.map((q) => q.id), questions, totalQuestions: questions.length
  });
  batch.set(db.doc(`attemptKeys/${aRef.id}`), { uid, items, createdAt: FieldValue.serverTimestamp() });
  await batch.commit();
  return { attemptId: aRef.id, resumed: false };
});

// ---------- submission + result ----------
async function finalize(uid: string, attemptId: string, status: "submitted" | "expired", clientAnswers?: Record<string, { a: string | null; t?: number }>) {
  const aRef = db.doc(`users/${uid}/attempts/${attemptId}`);
  const kRef = db.doc(`attemptKeys/${attemptId}`);
  const uRef = db.doc(`users/${uid}`);
  const now = new Date();
  const today = dhakaDate(now);
  const boardIds = ["global", `weekly_${isoWeek(today)}`, `monthly_${today.slice(0, 7)}`];

  return db.runTransaction(async (tx) => {
    // ---- all reads first ----
    const [a, k, u] = await Promise.all([tx.get(aRef), tx.get(kRef), tx.get(uRef)]);
    if (!a.exists || !k.exists || k.get("uid") !== uid) throw new HttpsError("not-found", "Attempt not found.");
    const at = a.data()!;
    if (at.status !== "in_progress") throw new HttpsError("failed-precondition", "This attempt was already submitted.");
    const eRef = db.doc(`exams/${at.examId}`);
    const [eSnap, resSnap, achSnap, ...boards] = await Promise.all([
      tx.get(eRef), tx.get(aRef.collection("responses")), tx.get(uRef.collection("achievements")),
      ...boardIds.map((b) => tx.get(db.doc(`leaderboards/${b}/entries/${uid}`)))
    ]);

    // ---- compute (server is the only authority) ----
    const key = k.get("items") as Record<string, { c: string; m: number; e: string; s: string; t: string }>;
    const sel: Record<string, { a: string | null; t: number }> = {};
    resSnap.docs.forEach((d) => (sel[d.id] = { a: d.get("selectedAnswer") ?? null, t: Number(d.get("timeSpent")) || 0 }));
    const deadlineMs = at.deadline.toMillis();
    if (clientAnswers && status === "submitted" && now.getTime() <= deadlineMs + GRACE_MS) {
      for (const [qid, v] of Object.entries(clientAnswers)) {
        if (key[qid] && (v?.a === null || (typeof v?.a === "string" && "ABCD".includes(v.a) && v.a.length === 1))) sel[qid] = { a: v.a, t: Number(v.t) || sel[qid]?.t || 0 };
      }
    }
    const neg: number = at.negativeMark;
    let correct = 0, wrong = 0, skipped = 0, score = 0, totalMarks = 0;
    const subjectStats: Record<string, { correct: number; wrong: number; skipped: number; time: number }> = {};
    const topicDelta: Record<string, { c: number; w: number }> = {};
    const answerWrites: [string, DocumentData][] = [];
    const mistakeWrites: [string, DocumentData][] = [];
    for (const qid of at.questionOrder as string[]) {
      const it = key[qid]; if (!it) continue;
      const s = sel[qid]?.a ?? null; const time = sel[qid]?.t ?? 0;
      totalMarks += it.m;
      const st = (subjectStats[it.s] ??= { correct: 0, wrong: 0, skipped: 0, time: 0 });
      st.time += time;
      const tk = `${it.s}__${it.t || "General"}`.replace(/[.\/]/g, "-");
      let isCorrect = false, marks = 0;
      if (!s) { skipped++; st.skipped++; }
      else if (s === it.c) { correct++; st.correct++; isCorrect = true; marks = it.m; (topicDelta[tk] ??= { c: 0, w: 0 }).c++; }
      else { wrong++; st.wrong++; marks = -neg; (topicDelta[tk] ??= { c: 0, w: 0 }).w++; mistakeWrites.push([qid, { examId: at.examId, questionId: qid, subject: it.s, topic: it.t, createdAt: FieldValue.serverTimestamp() }]); }
      score += marks;
      answerWrites.push([qid, { selectedAnswer: s, correctAnswer: it.c, isCorrect, marksObtained: marks, timeSpent: time, explanation: it.e, subject: it.s, topic: it.t, answeredAt: now }]);
    }
    score = round(score);
    const answered = correct + wrong;
    const accuracy = answered ? round((correct / answered) * 100, 1) : 0;
    const percentage = totalMarks ? round((Math.max(score, 0) / totalMarks) * 100, 1) : 0;
    const startedMs = (at.startedAt as Timestamp).toMillis();
    const timeTaken = status === "expired" ? at.durationMinutes * 60 : Math.max(0, Math.round((Math.min(now.getTime(), deadlineMs) - startedMs) / 1000));
    const result = { score, correct, wrong, skipped, accuracy, percentage, grade: grade(percentage), totalMarks, timeTaken, passed: percentage >= (eSnap.get("passingScore") ?? 40) };

    // ---- user aggregates ----
    const up = u.data() ?? {};
    const totalExams = (up.totalExams ?? 0) + 1;
    const correctTotal = (up.correctTotal ?? 0) + correct;
    const wrongTotal = (up.wrongTotal ?? 0) + wrong;
    const scoreSum = (up.scoreSum ?? 0) + percentage;
    const yesterday = addDays(today, -1);
    const streak = up.lastExamDate === today ? up.currentStreak || 1 : up.lastExamDate === yesterday ? (up.currentStreak ?? 0) + 1 : 1;
    const totalQuestions = (up.totalQuestions ?? 0) + answered;
    const newSubject: Record<string, DocumentData> = { ...(up.subjectStats ?? {}) };
    for (const [s, v] of Object.entries(subjectStats)) { const o = newSubject[s] ?? { correct: 0, wrong: 0, skipped: 0 }; newSubject[s] = { correct: o.correct + v.correct, wrong: o.wrong + v.wrong, skipped: o.skipped + v.skipped }; }
    const newTopic: Record<string, DocumentData> = { ...(up.topicStats ?? {}) };
    for (const [t, v] of Object.entries(topicDelta)) { const o = newTopic[t] ?? { c: 0, w: 0 }; newTopic[t] = { c: o.c + v.c, w: o.w + v.w }; }

    // ---- achievements ----
    const have = new Set(achSnap.docs.map((d) => d.id));
    const earned: string[] = [];
    const check = (id: string, ok: boolean) => { if (ok && !have.has(id)) earned.push(id); };
    check("first_exam", totalExams >= 1); check("exams_10", totalExams >= 10);
    check("accuracy_90", answered >= 10 && accuracy >= 90); check("streak_7", streak >= 7); check("questions_500", totalQuestions >= 500);

    // ---- all writes ----
    tx.update(aRef, { ...result, status, submittedAt: FieldValue.serverTimestamp(), subjectStats });
    answerWrites.forEach(([id, data]) => tx.set(aRef.collection("answers").doc(id), data));
    mistakeWrites.forEach(([id, data]) => tx.set(uRef.collection("mistakes").doc(id), data, { merge: true }));
    tx.set(uRef, {
      totalExams, totalQuestions, correctTotal, wrongTotal, scoreSum, averageScore: round(scoreSum / totalExams, 1),
      accuracy: correctTotal + wrongTotal ? round((correctTotal / (correctTotal + wrongTotal)) * 100, 1) : 0,
      bestScore: Math.max(up.bestScore ?? 0, percentage), currentStreak: streak, lastExamDate: today,
      subjectStats: newSubject, topicStats: newTopic, updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    boardIds.forEach((b, i) => {
      const o = boards[i].data() ?? { exams: 0, points: 0, correct: 0, wrong: 0 };
      const exams = o.exams + 1, c = o.correct + correct, w = o.wrong + wrong, points = round(o.points + percentage, 1);
      tx.set(boards[i].ref, {
        uid, name: up.fullName ?? "Student", avatarUrl: up.avatarUrl ?? "", exams, points, avgScore: round(points / exams, 1),
        correct: c, wrong: w, accuracy: c + w ? round((c / (c + w)) * 100, 1) : 0, updatedAt: FieldValue.serverTimestamp()
      });
    });
    if (eSnap.exists) tx.update(eRef, { attemptCount: FieldValue.increment(1), scoreSum: FieldValue.increment(percentage) });
    tx.set(db.doc("stats/global"), { totalAttempts: FieldValue.increment(1), scoreSum: FieldValue.increment(percentage) }, { merge: true });
    tx.set(db.doc(`statsDaily/${today}`), { attempts: FieldValue.increment(1) }, { merge: true });
    const note = (title: string, body: string, type: string) => tx.set(uRef.collection("notifications").doc(), { title, body, type, read: false, createdAt: FieldValue.serverTimestamp() });
    note("Result available", `${at.examTitle}: ${score} marks (${percentage}%)`, "result");
    for (const id of earned) {
      const def = ACHIEVEMENTS.find((x) => x.id === id)!;
      tx.set(uRef.collection("achievements").doc(id), { name: def.name, icon: def.icon, description: def.description, awardedAt: FieldValue.serverTimestamp() });
      note("Achievement unlocked", `${def.icon} ${def.name}`, "achievement");
    }
    return { ...result, earned };
  });
}

export const submitExam = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const attemptId = String(req.data?.attemptId ?? "");
  if (!attemptId) throw new HttpsError("invalid-argument", "Missing attempt.");
  const snap = await db.doc(`users/${uid}/attempts/${attemptId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Attempt not found.");
  const expired = Date.now() > snap.get("deadline").toMillis() + GRACE_MS;
  return finalize(uid, attemptId, expired ? "expired" : "submitted", req.data?.answers);
});

export const autoSubmitExpiredExam = onSchedule({ region: REGION, schedule: "every 5 minutes", timeZone: "Asia/Dhaka" }, async () => {
  const snap = await db.collectionGroup("attempts").where("status", "==", "in_progress").where("deadline", "<", Timestamp.fromMillis(Date.now() - GRACE_MS)).limit(100).get();
  for (const d of snap.docs) {
    const uid = d.ref.parent.parent!.id;
    await finalize(uid, d.id, "expired").catch((e) => console.error("autosubmit failed", d.id, e));
  }
});

// ---------- practice + question bank (answer-free payloads) ----------
export const getPracticeQuestions = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const { mode = "quick", subject, topic, difficulty } = req.data ?? {};
  const count = Math.min(30, Math.max(1, Number(req.data?.count) || 10));
  let out: DocumentData[] = [];
  if (mode === "mistakes") {
    const ms = await db.collection(`users/${uid}/mistakes`).orderBy("createdAt", "desc").limit(60).get();
    const refs = shuffle(ms.docs).slice(0, count).map((m) => db.doc(`exams/${m.get("examId")}/questions/${m.id}`));
    const qs = refs.length ? await db.getAll(...refs) : [];
    out = qs.filter((q) => q.exists).map((q) => safePractice(q.id, q.ref.path, q.data()!));
  } else {
    let subj: string | undefined = subject || undefined;
    let weakTopics: Set<string> | null = null;
    if (mode === "weak") {
      const ts = ((await db.doc(`users/${uid}`).get()).get("topicStats") ?? {}) as Record<string, { c: number; w: number }>;
      const weak = Object.entries(ts).filter(([, v]) => v.c + v.w >= 3).map(([k, v]) => ({ k, acc: v.c / (v.c + v.w) })).sort((x, y) => x.acc - y.acc).slice(0, 5);
      weakTopics = new Set(weak.map((w) => w.k));
      subj = undefined;
    }
    let q = db.collectionGroup("questions").where("inBank", "==", true);
    if (subj) q = q.where("subject", "==", subj);
    const snap = await q.limit(300).get();
    let docs = snap.docs;
    if (weakTopics) docs = docs.filter((d) => weakTopics!.has(`${d.get("subject")}__${d.get("topic") || "General"}`.replace(/[.\/]/g, "-")));
    if (topic) docs = docs.filter((d) => d.get("topic") === topic);
    if (difficulty) docs = docs.filter((d) => d.get("difficulty") === difficulty);
    out = shuffle(docs).slice(0, count).map((d) => safePractice(d.id, d.ref.path, d.data()));
  }
  return { questions: out };
});

export const checkPracticeAnswer = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const path = String(req.data?.path ?? ""); const selected = String(req.data?.selected ?? "");
  if (!/^exams\/[^/]+\/questions\/[^/]+$/.test(path) || !LETTERS.includes(selected as Letter)) throw new HttpsError("invalid-argument", "Invalid request.");
  const snap = await db.doc(path).get();
  if (!snap.exists) throw new HttpsError("not-found", "Question not found.");
  const d = snap.data()!;
  if (!d.inBank) {
    const m = await db.doc(`users/${uid}/mistakes/${snap.id}`).get();
    if (!m.exists) throw new HttpsError("permission-denied", "Not available for practice.");
  }
  return { correct: d.correctAnswer === selected, correctAnswer: d.correctAnswer, explanation: d.explanation ?? "" };
});

export const getQuestionBank = onCall(opts, async (req) => {
  requireAuth(req);
  const { subject, topic, difficulty, examId, year, q: text, cursor } = req.data ?? {};
  let query = db.collectionGroup("questions").where("inBank", "==", true);
  if (subject) query = query.where("subject", "==", subject);
  query = query.orderBy("createdAt", "desc");
  if (cursor) query = query.startAfter(Timestamp.fromMillis(Number(cursor)));
  const snap = await query.limit(100).get();
  const needle = String(text ?? "").toLowerCase();
  const out = snap.docs.filter((d) =>
    (!topic || d.get("topic") === topic) && (!difficulty || d.get("difficulty") === difficulty) &&
    (!examId || d.ref.parent.parent?.id === examId) && (!year || String(d.get("year")) === String(year)) &&
    (!needle || String(d.get("question")).toLowerCase().includes(needle))
  ).slice(0, 20).map((d) => ({ ...safePractice(d.id, d.ref.path, d.data()), examId: d.ref.parent.parent?.id, year: d.get("year") ?? null }));
  const last = snap.docs[snap.docs.length - 1];
  return { questions: out, nextCursor: snap.size === 100 && last ? (last.get("createdAt") as Timestamp).toMillis() : null };
});

export const getBookmarkedQuestions = onCall(opts, async (req) => {
  const uid = requireAuth(req);
  const bms = await db.collection(`users/${uid}/bookmarks`).orderBy("createdAt", "desc").limit(30).get();
  const refs = bms.docs.map((b) => db.doc(`exams/${b.get("examId")}/questions/${b.id}`));
  const qs = refs.length ? await db.getAll(...refs) : [];
  return { questions: qs.filter((q) => q.exists).map((q) => ({ ...safePractice(q.id, q.ref.path, q.data()!), examId: q.ref.parent.parent?.id })) };
});

// ---------- admin utilities ----------
export const recountQuestions = onCall(opts, async (req) => {
  requireAdmin(req);
  const examId = String(req.data?.examId ?? "");
  const c = await db.collection(`exams/${examId}/questions`).count().get();
  await db.doc(`exams/${examId}`).update({ totalQuestions: c.data().count, updatedAt: FieldValue.serverTimestamp() });
  return { total: c.data().count };
});

// ---------- daily challenge (Bangladesh date) ----------
async function buildDailyChallenge() {
  const date = dhakaDate(new Date());
  const id = `daily-${date}`;
  if ((await db.doc(`exams/${id}`).get()).exists) { await db.doc("meta/dailyChallenge").set({ examId: id, date }); return id; }
  const snap = await db.collectionGroup("questions").where("inBank", "==", true).limit(300).get();
  const pick = shuffle(snap.docs).slice(0, 10);
  if (!pick.length) return null;
  const batch = db.batch();
  batch.set(db.doc(`exams/${id}`), {
    title: `Daily Challenge — ${date}`, description: "10 questions · 10 minutes", category: "Daily", subject: "Mixed", durationMinutes: 10,
    totalQuestions: pick.length, negativeMark: 0, passingScore: 40, difficulty: "Mixed", instructions: "One attempt per day.",
    isPublished: false, isDaily: true, isPremium: false, shuffleQuestions: true, shuffleOptions: true, attemptCount: 0, scoreSum: 0,
    createdBy: "system", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
  });
  pick.forEach((d) => batch.set(db.doc(`exams/${id}/questions/${d.id}`), { ...d.data(), inBank: false }));
  batch.set(db.doc("meta/dailyChallenge"), { examId: id, date });
  await batch.commit();
  return id;
}
export const generateDailyChallenge = onSchedule({ region: REGION, schedule: "0 0 * * *", timeZone: "Asia/Dhaka" }, async () => { await buildDailyChallenge(); });
export const ensureDailyChallenge = onCall(opts, async (req) => { requireAuth(req); return { examId: await buildDailyChallenge() }; });

// ---------- new exam announcement ----------
export const onExamPublished = onDocumentWritten({ document: "exams/{examId}", region: REGION }, async (event) => {
  const before = event.data?.before.data(); const after = event.data?.after.data();
  if (after?.isPublished && !before?.isPublished && !after.isDaily) {
    await db.collection("announcements").add({ type: "new_exam", title: "New exam", body: after.title, examId: event.params.examId, createdAt: FieldValue.serverTimestamp() });
  }
});

// ---------- seed (admin only) ----------
export const seedSampleData = onCall({ ...opts, timeoutSeconds: 120 }, async (req) => {
  const uid = requireAdmin(req);
  for (const a of ACHIEVEMENTS) await db.doc(`achievements/${a.id}`).set(a);
  const mkQ = (q: (typeof BASE_QUESTIONS)[number], inBank: boolean) => ({
    question: q[3], imageUrl: null, optionA: q[4], optionB: q[5], optionC: q[6], optionD: q[7], correctAnswer: q[8], explanation: q[9],
    subject: q[0], topic: q[1], difficulty: q[2], marks: 1, inBank, createdAt: FieldValue.serverTimestamp()
  });
  for (const ex of SEED_EXAMS) {
    const qs = BASE_QUESTIONS.filter((q) => ex.subjects.includes(q[0]));
    const batch = db.batch();
    batch.set(db.doc(`exams/${ex.id}`), {
      title: ex.title, description: ex.description, category: ex.category, subject: ex.subject, durationMinutes: ex.durationMinutes,
      totalQuestions: qs.length, negativeMark: ex.negativeMark, passingScore: ex.passingScore, difficulty: ex.difficulty,
      instructions: "Read each question carefully. Wrong answers carry negative marking. You can mark questions for review and revisit them before submitting.",
      isPublished: true, isDaily: false, isPremium: ex.isPremium, shuffleQuestions: true, shuffleOptions: true, questionsPerAttempt: null,
      attemptCount: 0, scoreSum: 0, createdBy: uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    qs.forEach((q, i) => batch.set(db.doc(`exams/${ex.id}/questions/${ex.id}-q${i + 1}`), mkQ(q, ex.inBank)));
    await batch.commit();
  }
  const daily = await buildDailyChallenge();
  return { exams: SEED_EXAMS.length, questions: BASE_QUESTIONS.length, daily };
});
