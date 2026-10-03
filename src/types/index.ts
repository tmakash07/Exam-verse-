import type { Timestamp } from "firebase/firestore";
export type Letter = "A" | "B" | "C" | "D";
export interface UserProfile {
  uid: string; fullName: string; email: string; avatarUrl: string; role: "student" | "admin";
  totalExams: number; totalQuestions: number; averageScore: number; accuracy: number; bestScore: number; currentStreak: number;
  subjectStats?: Record<string, { correct: number; wrong: number; skipped: number }>;
  topicStats?: Record<string, { c: number; w: number }>;
  settings?: { notifications?: boolean; language?: string }; createdAt?: Timestamp;
}
export interface Exam {
  id: string; title: string; description: string; category: string; subject: string; durationMinutes: number; totalQuestions: number;
  negativeMark: number; passingScore: number; difficulty: string; instructions: string; isPublished: boolean; isDaily?: boolean; isPremium?: boolean;
  shuffleQuestions?: boolean; shuffleOptions?: boolean; questionsPerAttempt?: number | null; attemptCount?: number; scoreSum?: number; createdAt?: Timestamp;
}
export interface SafeQuestion { id: string; question: string; imageUrl: string | null; options: Record<Letter, string>; subject: string; topic: string; marks: number }
export interface Attempt {
  id: string; examId: string; examTitle: string; status: "in_progress" | "submitted" | "expired"; startedAt?: Timestamp; submittedAt?: Timestamp; deadline: Timestamp;
  durationMinutes: number; negativeMark: number; questionOrder: string[]; questions: SafeQuestion[];
  score?: number; correct?: number; wrong?: number; skipped?: number; accuracy?: number; percentage?: number; grade?: string; totalMarks?: number; timeTaken?: number; passed?: boolean;
  subjectStats?: Record<string, { correct: number; wrong: number; skipped: number; time: number }>;
}
export interface AnswerDoc { id: string; selectedAnswer: Letter | null; correctAnswer: Letter; isCorrect: boolean; marksObtained: number; timeSpent: number; explanation: string; subject: string; topic: string }
export interface AdminQuestion {
  id: string; question: string; imageUrl: string | null; optionA: string; optionB: string; optionC: string; optionD: string; correctAnswer: Letter;
  explanation: string; subject: string; topic: string; difficulty: string; marks: number; inBank: boolean; year?: number | null;
}
export interface PracticeQuestion { id: string; path: string; question: string; imageUrl: string | null; options: Record<Letter, string>; subject: string; topic: string; difficulty: string; examId?: string; year?: number | null }
export interface LeaderEntry { uid: string; name: string; avatarUrl: string; exams: number; points: number; avgScore: number; accuracy: number }
