/**
 * Image Suggestion & Generation Module
 *
 * Analyses chapter text to suggest image placements with descriptive prompts.
 * Real mode uses OpenAI for analysis and optionally Stability AI for generation.
 * Mock mode returns convincing placeholder suggestions.
 */

import type { AiConfig, ImageSuggestion } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse chapter text and suggest images with placement information.
 *
 * Returns 2-4 suggestions per chapter.  Each suggestion includes a
 * generation prompt, a position hint, and descriptive alt text for
 * accessibility.
 */
export async function suggestImages(
  chapterText: string,
  config: AiConfig,
): Promise<ImageSuggestion[]> {
  if (config.useMock) {
    return suggestMockImages(chapterText);
  }

  return suggestRealImages(chapterText, config);
}

// ---------------------------------------------------------------------------
// Real Implementation
// ---------------------------------------------------------------------------

async function suggestRealImages(
  chapterText: string,
  config: AiConfig,
): Promise<ImageSuggestion[]> {
  const { createLlmClient } = await import('../ai-config.js');
  const { client, model } = await createLlmClient(config);

  const systemPrompt = `당신은 한국 정부 발간물의 시각 자료 전문가입니다.
주어진 텍스트를 분석하여 적절한 이미지 삽입 위치와 이미지 설명을 제안하세요.

규칙:
- 2~4개의 이미지를 제안합니다.
- 각 이미지에 대해 생성 프롬프트(영어), 삽입 위치, 한국어 대체 텍스트를 제공하세요.
- 정부 발간물에 어울리는 전문적이고 깔끔한 이미지를 제안하세요.
- 도표, 인포그래픽, 개념도 등을 우선적으로 고려하세요.

JSON 형식으로 응답하세요:
{
  "images": [
    {
      "prompt": "A clean infographic showing...",
      "position": "after-paragraph-3",
      "altText": "한국어 대체 텍스트"
    }
  ]
}`;

  const truncated = chapterText.slice(0, 5000);

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `다음 텍스트에 대한 이미지를 제안하세요:\n\n${truncated}`,
      },
    ],
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '{"images":[]}';
  const parsed = JSON.parse(raw) as {
    images: Array<{ prompt: string; position: string; altText: string }>;
  };

  const suggestions: ImageSuggestion[] = parsed.images.map((img) => ({
    prompt: img.prompt,
    position: img.position,
    altText: img.altText,
  }));

  // Optionally generate images with Stability AI
  if (config.stabilityApiKey) {
    for (const suggestion of suggestions) {
      try {
        suggestion.imageBase64 = await generateWithStability(
          suggestion.prompt,
          config.stabilityApiKey,
        );
      } catch {
        // Image generation failure is non-critical; keep the suggestion
      }
    }
  }

  return suggestions;
}

async function generateWithStability(
  prompt: string,
  apiKey: string,
): Promise<string> {
  const response = await fetch(
    'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text_prompts: [
          {
            text: `Professional government publication illustration, clean modern style: ${prompt}`,
            weight: 1,
          },
          {
            text: 'blurry, low quality, cartoon, anime, inappropriate',
            weight: -1,
          },
        ],
        cfg_scale: 7,
        width: 1024,
        height: 1024,
        steps: 30,
        samples: 1,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Stability AI error: ${response.status}`);
  }

  const data = (await response.json()) as {
    artifacts: Array<{ base64: string }>;
  };

  return data.artifacts[0]?.base64 ?? '';
}

// ---------------------------------------------------------------------------
// Mock Implementation
// ---------------------------------------------------------------------------

function suggestMockImages(chapterText: string): ImageSuggestion[] {
  const textLower = chapterText.toLowerCase();
  const suggestions: ImageSuggestion[] = [];

  // Analyse text for common government publication themes
  if (
    textLower.includes('정책') ||
    textLower.includes('계획') ||
    textLower.includes('전략')
  ) {
    suggestions.push({
      prompt:
        'Clean flat-design infographic showing a policy implementation roadmap with 4 stages, Korean government style, blue and white color scheme, professional',
      position: 'after-paragraph-2',
      altText:
        '정책 실행 로드맵: 기획, 실행, 평가, 환류의 4단계를 보여주는 인포그래픽',
    });
  }

  if (
    textLower.includes('데이터') ||
    textLower.includes('통계') ||
    textLower.includes('현황')
  ) {
    suggestions.push({
      prompt:
        'Professional bar chart and pie chart showing statistical data, Korean labels, clean white background, government report style, minimal design',
      position: 'after-paragraph-4',
      altText: '주요 현황 통계를 나타내는 막대 그래프 및 원형 차트',
    });
  }

  if (
    textLower.includes('조직') ||
    textLower.includes('기관') ||
    textLower.includes('체계')
  ) {
    suggestions.push({
      prompt:
        'Organizational hierarchy chart, clean boxes connected with lines, Korean text labels, professional blue theme, government structure',
      position: 'after-paragraph-3',
      altText: '기관 조직 체계도: 부서별 역할과 관계를 보여주는 조직도',
    });
  }

  if (
    textLower.includes('절차') ||
    textLower.includes('과정') ||
    textLower.includes('단계')
  ) {
    suggestions.push({
      prompt:
        'Step-by-step flowchart with numbered stages, arrows connecting each step, clean professional style, Korean government publication',
      position: 'after-paragraph-5',
      altText: '처리 절차 흐름도: 각 단계별 진행 과정을 보여주는 순서도',
    });
  }

  // Always provide at least 2 suggestions
  if (suggestions.length < 2) {
    suggestions.push(
      {
        prompt:
          'Professional concept diagram showing key themes and their relationships, clean modern style, blue accent colors, Korean government design',
        position: 'after-paragraph-2',
        altText:
          '핵심 주제 간의 관계를 보여주는 개념도',
      },
      {
        prompt:
          'Summary infographic with key points highlighted in boxes, icons representing each point, professional government publication style',
        position: 'end-of-chapter',
        altText:
          '장의 핵심 내용을 요약한 인포그래픽: 주요 포인트를 아이콘과 함께 정리',
      },
    );
  }

  return suggestions.slice(0, 4);
}
