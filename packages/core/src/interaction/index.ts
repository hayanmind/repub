/**
 * AI Interaction Orchestrator
 *
 * Coordinates all AI modules (quiz, TTS, image, tutor) and collects their
 * outputs into a single AiGeneratedContent object.  Errors in individual
 * modules are caught so that the remaining modules can still complete.
 */

import type { Chapter } from '../types.js';
import type {
  AiConfig,
  AiGeneratedContent,
  GeneratedQuiz,
  Summary,
  TtsResult,
  ImageSuggestion,
  HighlightedSection,
} from './types.js';

import { generateQuiz } from './quiz/index.js';
import { generateTts } from './tts/index.js';
import { suggestImages } from './image/index.js';
import { createTutorScript } from './tutor/index.js';

// Re-export public API of sub-modules
export { createAiConfig, isMockMode, createLlmClient } from './ai-config.js';
export { generateQuiz } from './quiz/index.js';
export { generateTts, generateMediaOverlay } from './tts/index.js';
export { suggestImages } from './image/index.js';
export { createTutorScript } from './tutor/index.js';
export type {
  AiConfig,
  AiGeneratedContent,
  GeneratedQuiz,
  QuizQuestion,
  Summary,
  SyncPoint,
  TtsResult,
  ImageSuggestion,
  HighlightedSection,
} from './types.js';

// ---------------------------------------------------------------------------
// Types expected from the parser (minimal interface to avoid tight coupling)
// ---------------------------------------------------------------------------

interface ParsedEpubLike {
  chapters: Array<{
    id: string;
    title: string;
    content: string;
  }>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate all AI-enhanced content for a parsed ePub.
 *
 * Iterates over every chapter and runs the quiz, TTS, image, and summary
 * modules.  Each module is wrapped in a try/catch so that a failure in one
 * module does not prevent the others from completing.
 *
 * @param parsed - A parsed ePub (or any object with a `chapters` array)
 * @param config - AI configuration (determines real vs mock mode)
 * @returns Aggregated AI-generated content
 */
export async function generateAiContent(
  parsed: ParsedEpubLike,
  config: AiConfig,
): Promise<AiGeneratedContent> {
  const quizzes: GeneratedQuiz[] = [];
  const summaries: Summary[] = [];
  const ttsResults = new Map<string, TtsResult>();
  const images: ImageSuggestion[] = [];
  const highlights: HighlightedSection[] = [];

  const errors: Array<{ chapterId: string; module: string; error: unknown }> =
    [];

  for (const chapter of parsed.chapters) {
    // --- Quiz ---
    try {
      const quiz = await generateQuiz(
        chapter.title,
        chapter.content,
        config,
      );
      // Override chapterId with the actual chapter id from the parsed epub
      quiz.chapterId = chapter.id;
      for (const q of quiz.questions) {
        q.chapterId = chapter.id;
      }
      quizzes.push(quiz);
    } catch (err) {
      errors.push({ chapterId: chapter.id, module: 'quiz', error: err });
    }

    // --- Summary ---
    try {
      const summary = await generateSummary(chapter, config);
      summaries.push(summary);
    } catch (err) {
      errors.push({ chapterId: chapter.id, module: 'summary', error: err });
    }

    // --- TTS ---
    try {
      // Strip HTML tags for TTS input
      const plainText = stripHtml(chapter.content);
      if (plainText.length > 0) {
        const tts = await generateTts(plainText, config);
        ttsResults.set(chapter.id, tts);
      }
    } catch (err) {
      errors.push({ chapterId: chapter.id, module: 'tts', error: err });
    }

    // --- Images ---
    try {
      const chapterImages = await suggestImages(chapter.content, config);
      images.push(...chapterImages);
    } catch (err) {
      errors.push({ chapterId: chapter.id, module: 'image', error: err });
    }

    // --- Tutor script (generated synchronously, but we still guard) ---
    try {
      // We generate the tutor script but don't store it in AiGeneratedContent
      // directly - it will be embedded during the conversion phase.
      createTutorScript(chapter.content, config);
    } catch (err) {
      errors.push({ chapterId: chapter.id, module: 'tutor', error: err });
    }
  }

  // Log errors for debugging (non-fatal)
  if (errors.length > 0) {
    console.warn(
      `[AI Interaction] ${errors.length} module error(s) occurred:`,
      errors.map(
        (e) =>
          `  ${e.module} (${e.chapterId}): ${e.error instanceof Error ? e.error.message : String(e.error)}`,
      ),
    );
  }

  return { quizzes, summaries, ttsResults, images, highlights };
}

// ---------------------------------------------------------------------------
// Summary Generation (internal helper)
// ---------------------------------------------------------------------------

async function generateSummary(
  chapter: { id: string; title: string; content: string },
  config: AiConfig,
): Promise<Summary> {
  if (config.useMock) {
    return generateMockSummary(chapter);
  }

  return generateRealSummary(chapter, config);
}

async function generateRealSummary(
  chapter: { id: string; title: string; content: string },
  config: AiConfig,
): Promise<Summary> {
  const { createLlmClient } = await import('./ai-config.js');
  const { client, model } = await createLlmClient(config);

  const plainText = stripHtml(chapter.content).slice(0, 6000);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `당신은 한국 정부 발간물 요약 전문가입니다.
주어진 텍스트를 분석하여 핵심 요약과 주요 포인트를 추출하세요.

JSON 형식으로 응답하세요:
{
  "text": "2-3문장의 종합 요약",
  "keyPoints": ["핵심 포인트 1", "핵심 포인트 2", ...]
}`,
      },
      {
        role: 'user',
        content: `다음 장을 요약하세요.\n\n제목: ${chapter.title}\n\n${plainText}`,
      },
    ],
    temperature: 0.4,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { text?: string; keyPoints?: string[] };

  return {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    text: parsed.text || '요약을 생성할 수 없습니다.',
    keyPoints: parsed.keyPoints || [],
  };
}

function generateMockSummary(chapter: {
  id: string;
  title: string;
  content: string;
}): Summary {
  const title = chapter.title;

  return {
    chapterId: chapter.id,
    chapterTitle: title,
    text: `"${title}" 장에서는 관련 정책의 배경과 목적을 설명하고, 핵심 추진 전략과 세부 실행 계획을 제시합니다. 특히 국민 참여와 투명성 확보를 통한 정책 실효성 강화 방안을 중점적으로 다루고 있습니다.`,
    keyPoints: [
      `${title}의 정책적 배경 및 추진 필요성`,
      '핵심 목표: 국민 중심의 행정 서비스 혁신',
      '4단계 추진 전략: 기획 - 실행 - 평가 - 환류',
      '이해관계자 참여 및 소통 체계 구축',
      '성과 관리 지표 및 환류 체계 마련',
    ],
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a string and normalise whitespace.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
