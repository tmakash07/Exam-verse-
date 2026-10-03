import { collection, doc, getDoc, getDocs, limit, orderBy, query, where, startAfter, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../firebase";
import type { Exam } from "@/types";

export const call = async <T = any>(name: string, data?: unknown): Promise<T> => (await httpsCallable(functions, name)(data)).data as T;

export async function listPublishedExams(cursor?: QueryDocumentSnapshot<DocumentData>, size = 20) {
  const q = query(collection(db, "exams"), where("isPublished", "==", true), orderBy("createdAt", "desc"), ...(cursor ? [startAfter(cursor)] : []), limit(size));
  const snap = await getDocs(q);
  return { exams: snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Exam), last: snap.docs[snap.docs.length - 1], done: snap.size < size };
}
export async function getExam(id: string) { const s = await getDoc(doc(db, "exams", id)); return s.exists() ? ({ id: s.id, ...s.data() } as Exam) : null; }
export async function recommendedExams(subject?: string) {
  const base = collection(db, "exams");
  const q = subject ? query(base, where("isPublished", "==", true), where("subject", "==", subject), limit(3)) : query(base, where("isPublished", "==", true), orderBy("createdAt", "desc"), limit(3));
  return (await getDocs(q)).docs.map((d) => ({ id: d.id, ...d.data() }) as Exam);
}
export const startExam = (examId: string) => call<{ attemptId: string; resumed: boolean }>("startExam", { examId });
export const getDailyChallenge = async () => { const s = await getDoc(doc(db, "meta", "dailyChallenge")); return s.exists() ? (s.data() as { examId: string; date: string }) : null; };
