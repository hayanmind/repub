/**
 * Quiz Generator Module
 *
 * Generates multiple-choice quiz questions for a chapter using OpenAI GPT-4
 * or realistic Korean-language mock data when in mock mode.
 */

import type { AiConfig, GeneratedQuiz, QuizQuestion } from '../types.js';
import { v4 as uuidv4 } from 'uuid';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a quiz (3-5 questions) for the given chapter.
 *
 * In real mode the function calls OpenAI GPT-4 with a Korean-optimised
 * prompt.  In mock mode it returns convincing sample questions derived from
 * the chapter title.
 */
export async function generateQuiz(
  chapterTitle: string,
  chapterText: string,
  config: AiConfig,
): Promise<GeneratedQuiz> {
  const chapterId = `ch-${uuidv4().slice(0, 8)}`;

  if (config.useMock) {
    return generateMockQuiz(chapterTitle, chapterId);
  }

  return generateRealQuiz(chapterTitle, chapterText, chapterId, config);
}

// ---------------------------------------------------------------------------
// Real Implementation (OpenAI GPT-4)
// ---------------------------------------------------------------------------

async function generateRealQuiz(
  chapterTitle: string,
  chapterText: string,
  chapterId: string,
  config: AiConfig,
): Promise<GeneratedQuiz> {
  const { createLlmClient } = await import('../ai-config.js');
  const { client, model } = await createLlmClient(config);

  const systemPrompt = `당신은 한국 정부 발간물 ePub 교육 콘텐츠 전문가입니다.
주어진 텍스트를 분석하여 핵심 내용에 대한 객관식 퀴즈 문제를 생성하세요.

규칙:
- 3~5개의 문제를 생성합니다.
- 각 문제에는 정확히 4개의 선택지가 있어야 합니다.
- 정답 인덱스(0부터 시작)를 반드시 포함하세요.
- 각 문제에 대한 간결한 해설을 제공하세요.
- 문제는 본문의 핵심 개념을 평가해야 합니다.

JSON 형식으로 응답하세요:
{
  "questions": [
    {
      "question": "질문 텍스트",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correctIndex": 0,
      "explanation": "해설 텍스트"
    }
  ]
}`;

  const truncatedText = chapterText.slice(0, 6000);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `다음 챕터에 대한 퀴즈를 생성하세요.\n\n제목: ${chapterTitle}\n\n본문:\n${truncatedText}`,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '{"questions":[]}';
  const parsed = JSON.parse(raw) as {
    questions: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>;
  };

  const questions: QuizQuestion[] = parsed.questions.map((q) =>
    validateAndNormalise(q, chapterId),
  );

  return { questions, chapterId, chapterTitle };
}

// ---------------------------------------------------------------------------
// Mock Implementation
// ---------------------------------------------------------------------------

function generateMockQuiz(
  chapterTitle: string,
  chapterId: string,
): GeneratedQuiz {
  const mockBanks: Record<string, QuizQuestion[]> = {
    default: [
      {
        id: uuidv4(),
        question: `"${chapterTitle}"에서 다루는 핵심 주제는 무엇입니까?`,
        options: [
          '정책 수립의 기본 원칙',
          '국민 참여 절차',
          '예산 편성 과정',
          '법령 해석 방법',
        ],
        correctIndex: 0,
        explanation: `이 장에서는 "${chapterTitle}"의 기본 원칙과 핵심 개념을 중심으로 설명하고 있습니다.`,
        chapterId,
      },
      {
        id: uuidv4(),
        question: '다음 중 본문에서 강조하는 핵심 가치로 가장 적절한 것은?',
        options: ['효율성', '투명성', '경쟁력', '독립성'],
        correctIndex: 1,
        explanation:
          '본문은 정부 정책의 투명성을 반복적으로 강조하며 이를 핵심 가치로 제시하고 있습니다.',
        chapterId,
      },
      {
        id: uuidv4(),
        question: '본 장에서 제시하는 실행 단계의 올바른 순서는?',
        options: [
          '기획 → 실행 → 평가 → 환류',
          '분석 → 설계 → 구현 → 운영',
          '조사 → 입안 → 시행 → 감사',
          '목표 설정 → 자원 배분 → 추진 → 보고',
        ],
        correctIndex: 0,
        explanation:
          '본문에서 제시하는 정책 실행 프로세스는 기획, 실행, 평가, 환류의 4단계로 구성됩니다.',
        chapterId,
      },
      {
        id: uuidv4(),
        question: `"${chapterTitle}"에서 국민 참여의 중요성을 설명하는 이유로 적절하지 않은 것은?`,
        options: [
          '정책 수용성 향상',
          '민주적 정당성 확보',
          '행정 비용 절감',
          '사회적 합의 도출',
        ],
        correctIndex: 2,
        explanation:
          '본문은 국민 참여의 목적으로 정책 수용성, 민주적 정당성, 사회적 합의를 제시하며, 행정 비용 절감은 언급하지 않습니다.',
        chapterId,
      },
    ],
  };

  // Topic-aware mock banks for more realistic demos
  const titleLower = chapterTitle.toLowerCase();

  if (titleLower.includes('디지털') || titleLower.includes('정보')) {
    mockBanks['digital'] = [
      {
        id: uuidv4(),
        question: '디지털 정부 전환의 핵심 목표는 무엇입니까?',
        options: [
          '국민 중심의 맞춤형 서비스 제공',
          '공무원 감축',
          '민간 기업 육성',
          '해외 수출 확대',
        ],
        correctIndex: 0,
        explanation:
          '디지털 정부 전환은 국민 중심의 맞춤형 행정 서비스를 제공하는 것을 핵심 목표로 합니다.',
        chapterId,
      },
      {
        id: uuidv4(),
        question: '다음 중 디지털 전환을 위한 기반 기술이 아닌 것은?',
        options: ['클라우드 컴퓨팅', '인공지능(AI)', '블록체인', '수력 발전'],
        correctIndex: 3,
        explanation:
          '클라우드, AI, 블록체인은 디지털 전환의 핵심 기술이며, 수력 발전은 에너지 분야입니다.',
        chapterId,
      },
      {
        id: uuidv4(),
        question: '개인정보 보호와 관련하여 본문에서 강조하는 원칙은?',
        options: [
          '최소 수집 원칙',
          '전면 공개 원칙',
          '무기한 보관 원칙',
          '자유 양도 원칙',
        ],
        correctIndex: 0,
        explanation:
          '개인정보 보호법에 따라 필요한 최소한의 정보만 수집하는 원칙을 강조합니다.',
        chapterId,
      },
    ];
  }

  if (titleLower.includes('환경') || titleLower.includes('탄소')) {
    mockBanks['environment'] = [
      {
        id: uuidv4(),
        question: '탄소중립 달성의 목표 연도는 언제입니까?',
        options: ['2030년', '2040년', '2050년', '2060년'],
        correctIndex: 2,
        explanation:
          '대한민국은 2050년까지 탄소중립을 달성하겠다는 목표를 선언하였습니다.',
        chapterId,
      },
      {
        id: uuidv4(),
        question: '다음 중 온실가스 감축 수단으로 적절하지 않은 것은?',
        options: [
          '재생에너지 확대',
          '에너지 효율 개선',
          '석탄 화력 증설',
          '전기차 보급',
        ],
        correctIndex: 2,
        explanation:
          '석탄 화력 증설은 온실가스를 증가시키는 요인으로, 감축 수단에 해당하지 않습니다.',
        chapterId,
      },
      {
        id: uuidv4(),
        question: '기후변화 적응 정책의 핵심 요소는?',
        options: [
          '취약계층 보호 및 회복력 강화',
          '수출 규제 강화',
          '관광산업 활성화',
          '군사력 증강',
        ],
        correctIndex: 0,
        explanation:
          '기후변화 적응 정책은 취약계층 보호와 사회적 회복력 강화를 핵심으로 합니다.',
        chapterId,
      },
    ];
  }

  // Pick the most specific bank available
  const bankKey = Object.keys(mockBanks).find((k) => k !== 'default') ?? 'default';
  const questions = mockBanks[bankKey]!;

  return { questions, chapterId, chapterTitle };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateAndNormalise(
  raw: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  },
  chapterId: string,
): QuizQuestion {
  if (!raw.question || typeof raw.question !== 'string') {
    throw new Error('Quiz question text is required');
  }
  if (!Array.isArray(raw.options) || raw.options.length !== 4) {
    throw new Error('Quiz question must have exactly 4 options');
  }
  if (
    typeof raw.correctIndex !== 'number' ||
    raw.correctIndex < 0 ||
    raw.correctIndex > 3
  ) {
    throw new Error('correctIndex must be 0-3');
  }

  return {
    id: uuidv4(),
    question: raw.question,
    options: raw.options,
    correctIndex: raw.correctIndex,
    explanation: raw.explanation || '',
    chapterId,
  };
}
