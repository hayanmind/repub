/**
 * AI Interaction Types
 *
 * Type definitions for all AI-powered interaction modules:
 * quiz generation, TTS, image suggestion, tutoring, and content restructuring.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface AiConfig {
  geminiApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  elevenlabsApiKey?: string;
  stabilityApiKey?: string;
  /** When true, all modules return realistic mock data without calling APIs */
  useMock: boolean;
}

// ---------------------------------------------------------------------------
// Quiz
// ---------------------------------------------------------------------------

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  chapterId: string;
}

export interface GeneratedQuiz {
  questions: QuizQuestion[];
  chapterId: string;
  chapterTitle: string;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface Summary {
  chapterId: string;
  chapterTitle: string;
  text: string;
  keyPoints: string[];
}

// ---------------------------------------------------------------------------
// TTS (Text-to-Speech)
// ---------------------------------------------------------------------------

export interface SyncPoint {
  text: string;
  startTime: number;
  endTime: number;
}

export interface TtsResult {
  audioBase64: string;
  duration: number;
  syncPoints: SyncPoint[];
}

// ---------------------------------------------------------------------------
// Image Suggestion / Generation
// ---------------------------------------------------------------------------

export interface ImageSuggestion {
  prompt: string;
  position: string;
  altText: string;
  imageBase64?: string;
}

// ---------------------------------------------------------------------------
// Highlighted Sections (restructuring markers)
// ---------------------------------------------------------------------------

export interface HighlightedSection {
  chapterId: string;
  startOffset: number;
  endOffset: number;
  type: 'restructured' | 'added' | 'style-changed';
}

// ---------------------------------------------------------------------------
// Aggregated AI Content
// ---------------------------------------------------------------------------

export interface AiGeneratedContent {
  quizzes: GeneratedQuiz[];
  summaries: Summary[];
  ttsResults: Map<string, TtsResult>;
  images: ImageSuggestion[];
  highlights: HighlightedSection[];
}
