import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDocs, collectionGroup, limit, orderBy, query, serverTimestamp, updateDoc, writeBatch, startAfter, QueryDocumentSnapshot, DocumentData, getDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import { call } from "./exams";
import { resizeImage } from "../utils";
import type { AdminQuestion, Exam } from "@/types";

export const listAllExams = async () => (await getDocs(query(collection(db, "exams"), orderBy("createdAt", "desc"), limit(100)))).docs.filter((d) => !d.get("isDaily")).map((d) => ({ id: d.id, ...d.data() }) as Exam);
export const getAdminExam = async (id: string) => { const s = await getDoc(doc(db, "exams", id)); return s.exists() ? ({ id: s.id, ...s.data() } as Exam) : null; };
export type ExamInput = Omit<Exam, "id" | "createdAt" | "attemptCount" | "scoreSum" | "totalQuestions">;
export const createExam = (uid: string, e: ExamInput) => addDoc(collection(db, "exams"), { ...e, totalQuestions: 0, attemptCount: 0, scoreSum: 0, isDaily: false, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateExam = (id: string, e: Partial<ExamInput>) => updateDoc(doc(db, "exams", id), { ...e, updatedAt: serverTimestamp() });
export const setPublished = (id: string, v: boolean) => updateExam(id, { isPublished: v });

async function questionDocs(examId: string) { return (await getDocs(collection(db, "exams", examId, "questions"))).docs; }
export async function deleteExam(examId: string) {
  const qs = await questionDocs(examId);
  for (let i = 0; i < qs.length; i += 400) { const b = writeBatch(db); qs.slice(i, i + 400).forEach((d) => b.delete(d.ref)); await b.commit(); }
  await deleteDoc(doc(db, "exams", examId));
}
export async function duplicateExam(uid: string, e: Exam) {
  const { id, ...rest } = e; void id;
  const copy = await addDoc(collection(db, "exams"), { ...rest, title: `${e.title} (copy)`, isPublished: false, attemptCount: 0, scoreSum: 0, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const qs = await questionDocs(e.id);
  for (let i = 0; i < qs.length; i += 400) { const b = writeBatch(db); qs.slice(i, i + 400).forEach((d) => b.set(doc(db, "exams", copy.id, "questions", d.id), d.data())); await b.commit(); }
  return copy.id;
}
export async function listQuestions(examId: string, cursor?: QueryDocumentSnapshot<DocumentData>, size = 25) {
  const snap = await getDocs(query(collection(db, "exams", examId, "questions"), orderBy("createdAt", "desc"), ...(cursor ? [startAfter(cursor)] : []), limit(size)));
  return { items: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AdminQuestion), last: snap.docs[snap.docs.length - 1], done: snap.size < size };
}
export type QInput = Omit<AdminQuestion, "id">;
export const saveQuestion = async (examId: string, id: string | null, q: QInput) => {
  if (id) await updateDoc(doc(db, "exams", examId, "questions", id), q as never);
  else await addDoc(collection(db, "exams", examId, "questions"), { ...q, createdAt: serverTimestamp() });
  await call("recountQuestions", { examId });
};
export const deleteQuestion = async (examId: string, id: string) => { await deleteDoc(doc(db, "exams", examId, "questions", id)); await call("recountQuestions", { examId }); };
export async function importQuestions(examId: string, rows: QInput[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const b = writeBatch(db);
    rows.slice(i, i + 400).forEach((r) => b.set(doc(collection(db, "exams", examId, "questions")), { ...r, createdAt: serverTimestamp() }));
    await b.commit();
  }
  await call("recountQuestions", { examId });
}
export async function uploadQuestionImage(examId: string, file: File) {
  const blob = await resizeImage(file, 1024);
  const r = ref(storage, `question-images/${examId}/${Date.now()}.jpg`);
  await uploadBytes(r, blob, { contentType: "image/jpeg" });
  return getDownloadURL(r);
}
export async function uploadAvatar(uid: string, file: File) {
  const blob = await resizeImage(file, 256);
  const r = ref(storage, `avatars/${uid}/avatar.jpg`);
  await uploadBytes(r, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(r);
  await updateDoc(doc(db, "users", uid), { avatarUrl: url, updatedAt: serverTimestamp() });
  return url;
}
export async function adminStats() {
  const [users, exams, questions, g, daily, popular] = await Promise.all([
    getCountFromServer(collection(db, "users")), getCountFromServer(collection(db, "exams")), getCountFromServer(collectionGroup(db, "questions")),
    getDoc(doc(db, "stats", "global")), getDocs(query(collection(db, "statsDaily"), orderBy("__name__", "desc"), limit(14))),
    getDocs(query(collection(db, "exams"), orderBy("attemptCount", "desc"), limit(5)))
  ]);
  const gd = g.data() ?? {};
  return {
    users: users.data().count, exams: exams.data().count, questions: questions.data().count, attempts: (gd.totalAttempts ?? 0) as number,
    avgScore: gd.totalAttempts ? Math.round((gd.scoreSum / gd.totalAttempts) * 10) / 10 : 0,
    daily: daily.docs.map((d) => ({ date: d.id.slice(5), attempts: (d.get("attempts") ?? 0) as number, newUsers: (d.get("newUsers") ?? 0) as number })).reverse(),
    popular: popular.docs.map((d) => ({ name: String(d.get("title")).slice(0, 18), attempts: (d.get("attemptCount") ?? 0) as number, avg: d.get("attemptCount") ? Math.round((d.get("scoreSum") / d.get("attemptCount")) * 10) / 10 : 0 }))
  };
}
export const seedSampleData = () => call("seedSampleData");
export const makeAdmin = (email: string, admin = true) => call("createAdminUser", { email, admin });
export const reportQuestion = (uid: string, examId: string, questionId: string, reason: string) => addDoc(collection(db, "reports"), { uid, examId, questionId, reason, status: "open", createdAt: serverTimestamp() });
