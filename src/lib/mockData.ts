export type BloomLevel = "Knowledge" | "Comprehension" | "Application" | "Analysis" | "Synthesis" | "Evaluation";
export type Difficulty = "Very Easy" | "Easy" | "Medium" | "Hard" | "Very Hard";

export interface ModerationDetails {
  question_id?: string;
  grammar_errors?: string;
  grammar_structure?: string;
  relevancy_to_scope?: string;
  suggestion?: string;
  validated_bloom_keywords?: string;
  raw_complexity?: string;
}

export interface Question {
  id: string;
  text: string;
  marks: number;
  bloomLevel: BloomLevel;
  difficulty: Difficulty;
  complexity: number;
  similarityScore: number;
  similarTo?: string;
  keywords: string[];
  moderationDetails?: ModerationDetails;
}

export interface ExamQuestion {
  id: number;
  question_id: string;
  question_text: string;
}

export interface Assessment {
  id: string;
  title: string;
  course: string;
  lecturer: string;
  moderator?: string;
  date: string;
  status: "Pending" | "Reviewed" | "Approved" | "Rejected";
  questions: Question[];
  overallScore: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface ActivityLog {
  id: string;
  type: "upload" | "moderation_complete" | "flagged" | "approved" | "rejected";
  description: string;
  user: string;
  timestamp: string;
}

export const bloomColors: Record<BloomLevel, string> = {
  Knowledge: "bg-bloom-remember",
  Comprehension: "bg-bloom-understand",
  Application: "bg-bloom-apply",
  Analysis: "bg-bloom-analyze",
  Synthesis: "bg-bloom-evaluate",
  Evaluation: "bg-bloom-create",
};

export const difficultyColors: Record<Difficulty, string> = {
  "Very Easy": "bg-emerald-400",
  Easy: "bg-difficulty-easy",
  Medium: "bg-difficulty-medium",
  Hard: "bg-difficulty-hard",
  "Very Hard": "bg-red-700",
};
