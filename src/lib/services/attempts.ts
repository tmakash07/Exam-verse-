import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, deleteDoc, onSnapshot, updateDoc, serverTimestamp, where, waitForPendingWrites } from "firebase/firestore";
import { db } from "../firebase";
import { call } from "./exams";
import type { AnswerDoc, Attempt, Letter } from "@/types";

export async function getAttempt(uid: string, id: string) { const s = await getDoc(doc(db, "users", uid, "attempts", id)); return s.exists() ? ({ id: s.id, ...s.data() } as Attempt) : null; }
export async function getAnswers(uid: string, id: string) { return (await getDocs(collection(db, "users", uid, "attempts", id, "answers"))).docs.map((d) => ({ id: d.id, ...d.data() }) as AnswerDoc); }
export async function getResponses(uid: string, id: string) {
  const out: Record<string, { selectedAnswer: Letter | null; marked?: boolean; timeSpent?: number }> = {};
  (await getDocs(collection(db, "users", uid, "attempts", id, "responses"))).forEach((d) => (out[d.id] = d.data() as never));
  return out;
}
export async function recentAttempts(uid: string, n = 30) {
  const snap = await getDocs(query(collection(db, "users", uid, "attempts"), orderBy("submittedAt", "desc"), limit(n)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Attempt);
}
export async function attemptsForExam(uid: string, examId: string) { return (await getDocs(query(collection(db, "users", uid, "attempts"), where("examId", "==", examId)))).docs.map((d) => ({ id: d.id, ...d.data() }) as Attempt); }
// small write: one doc per question (never the whole exam state)
export const saveResponse = (uid: string, attemptId: string, qid: string, data: { selectedAnswer: Letter | null; marked?: boolean; timeSpent?: number }) =>
  setDoc(doc(db, "users", uid, "attempts", attemptId, "responses", qid), { ...data, answeredAt: serverTimestamp() }, { merge: true });
export const submitExam = (attemptId: string, answers: Record<string, { a: Letter | null; t: number }>) => call<{ score: number; percentage: number }>("submitExam", { attemptId, answers });
export const flushWrites = (ms = 6000) => Promise.race([waitForPendingWrites(db), new Promise((r) => setTimeout(r, ms))]);

export const toggleBookmark = async (uid: string, questionId: string, examId: string, on: boolean) => {
  const ref = doc(db, "users", uid, "bookmarks", questionId);
  return on ? setDoc(ref, { questionId, examId, createdAt: serverTimestamp() }) : deleteDoc(ref);
};
export function watchBookmarks(uid: string, cb: (ids: Set<string>) => void) { return onSnapshot(collection(db, "users", uid, "bookmarks"), (s) => cb(new Set(s.docs.map((d) => d.id)))); }
export const markNotificationRead = (uid: string, id: string) => updateDoc(doc(db, "users", uid, "notifications", id), { read: true });
