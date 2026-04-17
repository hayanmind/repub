/**
 * Content Restructurer
 *
 * Analyses and restructures ePub chapter HTML to improve semantic structure,
 * accessibility, and readability.
 *
 * Real mode: uses an LLM to intelligently restructure HTML content.
 * Mock mode: applies deterministic rule-based transformations.
 */

import type { AiConfig } from '../interaction/types.js';
import type { ContentElement } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface RestructureInput {
  title: string;
  content: string;
  elements: ContentElement[];
}

export interface RestructureResult {
  html: string;
  summary: string;
}

/**
 * Restructure a chapter's HTML content to improve semantic quality.
 *
 * Both modes perform:
 * - Removal of empty / meaningless tags
 * - Addition of proper heading hierarchy
 * - Wrapping content in semantic HTML5 elements
 *
 * Real mode additionally uses an LLM to make intelligent structural decisions.
 */
export async function restructureContent(
  chapter: RestructureInput,
  config: AiConfig,
): Promise<RestructureResult> {
  if (config.useMock) {
    return restructureMock(chapter);
  }

  return restructureReal(chapter, config);
}

// ---------------------------------------------------------------------------
// Real Implementation (LLM-assisted)
// ---------------------------------------------------------------------------

async function restructureReal(
  chapter: RestructureInput,
  config: AiConfig,
): Promise<RestructureResult> {
  const { createLlmClient } = await import('../interaction/ai-config.js');
  const { client, model } = await createLlmClient(config);

  // First pass: rule-based cleanup
  let html = applyRuleBasedCleanup(chapter.content);

  // Second pass: LLM-assisted restructuring
  const truncated = html.slice(0, 8000);

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `당신은 HTML 시맨틱 구조 전문가입니다.
주어진 HTML을 분석하고 다음 규칙에 따라 재구성하세요:

1. 적절한 heading 계층 구조 (h1 > h2 > h3) 적용
2. <section>, <article>, <aside>, <figure>, <figcaption> 등 시맨틱 태그 사용
3. 접근성을 위한 ARIA 속성 추가 (필요한 경우)
4. 표를 <table> 시맨틱 요소로 올바르게 구성 (<thead>, <tbody>, <caption>)
5. 목록 구조를 <ul>/<ol>/<dl>로 올바르게 변환
6. 빈 태그 및 불필요한 래퍼 제거
7. 원본 콘텐츠의 의미를 변경하지 않을 것

JSON 형식으로 응답하세요:
{
  "html": "재구성된 HTML",
  "summary": "변경 사항 요약 (한국어)"
}`,
      },
      {
        role: 'user',
        content: `다음 HTML을 재구성하세요.\n\n제목: ${chapter.title}\n\nHTML:\n${truncated}`,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as { html?: string; summary?: string };

  return {
    html: parsed.html || html,
    summary: parsed.summary || '구조 변경 사항 없음',
  };
}

// ---------------------------------------------------------------------------
// Mock Implementation (Rule-based)
// ---------------------------------------------------------------------------

function restructureMock(chapter: RestructureInput): RestructureResult {
  let html = chapter.content;

  // Step 1: Rule-based cleanup
  html = applyRuleBasedCleanup(html);

  // Step 2: Add semantic structure
  html = addSemanticStructure(html, chapter.title);

  // Step 3: Fix heading hierarchy
  html = fixHeadingHierarchy(html);

  // Step 4: Enhance tables
  html = enhanceTables(html);

  // Step 5: Wrap images in figure elements
  html = wrapImagesInFigures(html);

  const changes: string[] = [];
  if (html !== chapter.content) {
    changes.push('빈 태그 및 불필요한 요소 제거');
    changes.push('시맨틱 HTML5 구조 적용');
    changes.push('제목 계층 구조 정규화');
    changes.push('표 구조 개선 (<thead>, <tbody> 추가)');
    changes.push('이미지에 <figure> 및 <figcaption> 래퍼 적용');
  }

  const summary =
    changes.length > 0
      ? `구조 개선 사항: ${changes.join(', ')}`
      : '구조 변경 사항 없음';

  return { html, summary };
}

// ---------------------------------------------------------------------------
// Rule-based Transformation Functions
// ---------------------------------------------------------------------------

/**
 * Remove empty / meaningless tags and clean up whitespace.
 */
function applyRuleBasedCleanup(html: string): string {
  let result = html;

  // Remove empty tags (repeated to catch nested empties)
  for (let i = 0; i < 3; i++) {
    result = result.replace(
      /<(p|div|span|b|i|em|strong|u|font|center)\b[^>]*>\s*<\/\1>/gi,
      '',
    );
  }

  // Remove <font> tags but keep content
  result = result.replace(/<\/?font\b[^>]*>/gi, '');

  // Remove <center> tags but keep content
  result = result.replace(/<\/?center\b[^>]*>/gi, '');

  // Remove empty class/style attributes
  result = result.replace(/\s+class=["']\s*["']/gi, '');
  result = result.replace(/\s+style=["']\s*["']/gi, '');

  // Remove multiple consecutive <br> tags (replace with paragraph break)
  result = result.replace(/(<br\s*\/?>[\s\n]*){3,}/gi, '</p>\n<p>');

  // Remove non-breaking spaces used as layout hacks
  result = result.replace(/(&nbsp;[\s]*){3,}/gi, ' ');

  // Normalise whitespace between tags
  result = result.replace(/>\s{2,}</g, '>\n<');

  return result.trim();
}

/**
 * Wrap content in semantic HTML5 elements.
 */
function addSemanticStructure(html: string, title: string): string {
  // If no <section> or <article> is present, wrap the content
  const hasSemanticWrapper =
    /<(section|article|main)\b/i.test(html);

  if (!hasSemanticWrapper) {
    html = `<section aria-label="${escapeAttr(title)}" role="doc-chapter">\n${html}\n</section>`;
  }

  // Add role="doc-noteref" to footnote-like links
  html = html.replace(
    /<a\b([^>]*href=["'][^"']*(?:note|fn|footnote)[^"']*["'][^>]*)>/gi,
    '<a$1 role="doc-noteref" epub:type="noteref">',
  );

  return html;
}

/**
 * Ensure heading hierarchy is correct (h1 -> h2 -> h3, no skipping levels).
 */
function fixHeadingHierarchy(html: string): string {
  // Find all headings and their levels
  const headingRegex = /<h(\d)\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  const headings: Array<{ level: number; full: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({ level: parseInt(match[1]!, 10), full: match[0] });
  }

  if (headings.length === 0) return html;

  // Find the minimum heading level used
  const minLevel = Math.min(...headings.map((h) => h.level));

  // If the minimum is not 1, we re-map: minLevel -> 1, minLevel+1 -> 2, etc.
  // But in ePub chapters, h1 is typically reserved for book title, so
  // chapters should start at h2.
  const targetBase = 2;
  const offset = minLevel - targetBase;

  if (offset === 0) return html;

  let result = html;
  // Replace from highest level to lowest to avoid double-replacement
  for (let lvl = 6; lvl >= 1; lvl--) {
    const newLvl = Math.max(1, Math.min(6, lvl - offset));
    if (newLvl === lvl) continue;
    const openRe = new RegExp(`<h${lvl}\\b`, 'gi');
    const closeRe = new RegExp(`</h${lvl}>`, 'gi');
    result = result.replace(openRe, `<h${newLvl}`);
    result = result.replace(closeRe, `</h${newLvl}>`);
  }

  return result;
}

/**
 * Enhance table markup with <thead>, <tbody>, <caption> where missing.
 */
function enhanceTables(html: string): string {
  return html.replace(
    /<table\b([^>]*)>([\s\S]*?)<\/table>/gi,
    (_match, attrs: string, inner: string) => {
      let enhanced = inner;

      // If there is no <thead>, promote the first <tr> to thead
      if (!/<thead/i.test(enhanced)) {
        enhanced = enhanced.replace(
          /(<tr\b[^>]*>[\s\S]*?<\/tr>)/i,
          (firstRow) => {
            // Replace <td> with <th> in the header row
            const headerRow = firstRow
              .replace(/<td\b/gi, '<th')
              .replace(/<\/td>/gi, '</th>');
            return `<thead>\n${headerRow}\n</thead>\n<tbody>`;
          },
        );

        // Close tbody before </table>
        if (enhanced.includes('<tbody>') && !/<\/tbody>/i.test(enhanced)) {
          enhanced += '\n</tbody>';
        }
      }

      // Add role for accessibility
      const roleAttr = /role=/i.test(attrs) ? '' : ' role="table"';

      return `<table${attrs}${roleAttr}>${enhanced}</table>`;
    },
  );
}

/**
 * Wrap standalone <img> tags in <figure> with <figcaption>.
 */
function wrapImagesInFigures(html: string): string {
  // Only wrap images that are NOT already inside a <figure>
  return html.replace(
    /(?<!<figure[^>]*>[\s\S]{0,200})<img\b([^>]*)\/?>/gi,
    (imgTag, attrs: string) => {
      // Extract alt text for figcaption
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const altText = altMatch?.[1] || '';

      const figcaption = altText
        ? `\n  <figcaption>${altText}</figcaption>`
        : '';

      return `<figure role="img">\n  <img${attrs} />${figcaption}\n</figure>`;
    },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
