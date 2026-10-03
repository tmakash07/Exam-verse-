import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { call } from "./exams";
import { dhakaDate, isoWeek } from "../utils";
import type { LeaderEntry, PracticeQuestion } from "@/types";

export const getPractice = (p: { mode: string; subject?: string; topic?: string; difficulty?: string; count: number }) => call<{ questions: PracticeQuestion[] }>("getPracticeQuestions", p);
export const checkAnswer = (path: string, selected: string) => call<{ correct: boolean; correctAnswer: string; explanation: string }>("checkPracticeAnswer", { path, selected });
export const getBank = (f: Record<string, unknown>) => call<{ questions: PracticeQuestion[]; nextCursor: number | null }>("getQuestionBank", f);
export const getBookmarked = () => call<{ questions: PracticeQuestion[] }>("getBookmarkedQuestions");

export const boardId = (p: "global" | "weekly" | "monthly") => { const d = dhakaDate(); return p === "global" ? "global" : p === "weekly" ? `weekly_${isoWeek(d)}` : `monthly_${d.slice(0, 7)}`; };
export async function getLeaderboard(p: "global" | "weekly" | "monthly", uid: string) {
  const col = collection(db, "leaderboards", boardId(p), "entries");
  const top = (await getDocs(query(col, orderBy("points", "desc"), limit(50)))).docs.map((d) => d.data() as LeaderEntry);
  const mine = await getDoc(doc(col, uid));
  let rank: number | null = null;
  if (mine.exists()) rank = (await getCountFromServer(query(col, where("points", ">", mine.get("points"))))).data().count + 1;
  return { top, mine: mine.exists() ? (mine.data() as LeaderEntry) : null, rank };
}
