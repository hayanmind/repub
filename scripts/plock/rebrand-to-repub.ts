/**
 * rebrand-to-repub.ts
 *
 * 플락 결과물(카드뉴스 JSON + 영상 스크립트)의 모든 카피를
 * RePub 브랜드 체계로 전면 재작성한다.
 *
 * 호출: node --env-file=.env --loader tsx scripts/plock/rebrand-to-repub.ts
 *       또는 tsx scripts/plock/rebrand-to-repub.ts (env 수동 로드 포함)
 *
 * 출력:
 *   - scripts/plock/cardnews.json (덮어쓰기, 백업 .bak.YYYYMMDDHHmm)
 *   - scripts/plock/video-scripts.ts (덮어쓰기, 백업)
 *   - scripts/plock/rebrand-report.json (Before/After + 통계)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ──────────────────────────────────────────────────────────────
// 환경변수 로드 (Node 20 --env-file 대체)
// ──────────────────────────────────────────────────────────────
function loadEnvFromFiles(files: string[]) {
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const rawLine of text.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  }
}
loadEnvFromFiles([
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '.env.local'),
]);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('ERROR: GEMINI_API_KEY 없음. .env 또는 .env.local 확인');
  process.exit(1);
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ──────────────────────────────────────────────────────────────
// 브랜드 지침 (프롬프트 공통)
// ──────────────────────────────────────────────────────────────
const BRAND_GUIDE = `
# 브랜드 재정의 (RePub)

- **제품명**: RePub (대문자 R, 소문자 e, 대문자 P, 소문자 ub — 절대 Repub/repub/REPUB 등으로 쓰지 말 것)
- **한국어 발음**: 리펍
- **태그라인 (자연스러운 것 선택)**: "낡은 책이 다시 살아납니다", "책의 두 번째 삶", "당신의 ePub, 다시 태어나다" 등
- **제작사**: (주)하얀마인드 (HAYANMIND) — 뒤로 물러난 제작사로만 언급 (예: "(주)하얀마인드가 만든 RePub", "하얀마인드의 오픈소스 프로젝트 RePub")
- **도메인**: epub-remastering.hayanmind.com
- **지원사업**: 한국출판문화산업진흥원 (언급 가능)

# 핵심 변화 — 주체 교체

기존 카피는 "하얀마인드가 ~을 한다"를 주체로 삼고 있다. 이를 전면 교체한다.

- Before: "하얀마인드가 당신의 전자책을 다시 만듭니다."
- After: "RePub이 당신의 전자책을 다시 만듭니다."

- Before: "하얀마인드의 AI가 구조를 읽고..."
- After: "RePub의 AI가 구조를 읽고..."

- Before: "하얀마인드는 닫혀 있던 책을 다시 엽니다."
- After: "RePub이 닫혀 있던 책을 다시 엽니다."

"하얀마인드"라는 고유명사는 제품 주어로 쓰지 않는다. 꼭 등장시켜야 한다면 "(주)하얀마인드가 개발한 RePub", "하얀마인드 팀이 만든 오픈소스 RePub" 같이 제작사 맥락에서만.

# 재작성 지침

1. **모든 문장을 바꿔 쓴다** — 단순 치환(하얀마인드 → RePub)이 아니라, 자연스러운 한국어로 리라이트.
2. **슬라이드/Scene 단위의 맥락과 톤을 유지**한다. 카드뉴스의 경쾌한 톤, 홍보 영상의 서사적 톤을 구분.
3. **기능·KPI·숫자는 보존**한다 (70%, 95%, 3분, 3초, KWCAG 2.1, ePub 3.0, ePubCheck, 2년 무상, MIT 오픈소스, 1000권 등).
4. **맞춤법·어색한 한국어 교정** (예: "접근성 90% 이상 보장" → 자연스럽게).
5. **영문 약어 규칙**:
   - subtitle / title / body / bullets / stat.label: 아라비아 숫자 + 영문 약어 유지 (ePub, TTS, KWCAG, AI, API 등).
   - narration: 한글 발음으로 풀어쓰기 (이펍, 티티에스, 케이더블유시에이지, 에이아이, 에이피아이 — 단 기존 컨벤션 유지).
     - 특히 "RePub"은 narration에서 "리펍"으로 읽는다.
6. **CTA 일관성**: 도메인은 항상 "epub-remastering.hayanmind.com" (변경 금지).
7. **문장 길이**: 슬라이드는 짧고 밀도 있게, 영상 narration은 한 호흡에 읽기 편하게.
8. **bullets / body / subtitle 간 중복 제거** — body에서 말한 내용이 bullets에 그대로 반복되지 않도록 시각적 리듬 주기.
9. **템플릿 종류별 톤**:
   - cover: 훅 문장 + 서브타이틀로 브랜드 명시.
   - hook: 독자에게 질문 던지기.
   - body: 기능·증거 제시.
   - number: 숫자 강조.
   - solution: 해결책 제시.
   - cta: 행동 유도 (도메인, 무료/무상 키워드).

# 절대 지킬 것

- 데이터 필드 구조를 바꾸지 말 것 (idx, template, 배열 길이 등 메타 유지).
- stat.number는 유지 (숫자 토큰 자체). stat.label만 리라이트.
- bullets 배열 길이는 원본과 동일하게 유지.
- JSON은 반드시 파싱 가능한 형태로 응답.
- RePub 표기는 반드시 R-e-P-u-b (총 5글자, 중간 P만 대문자).
`;

// ──────────────────────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────────────────────
interface Stat {
  number: string;
  label: string;
}
interface Slide {
  idx: number;
  template: string;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  stat?: Stat;
}
interface CardnewsSet {
  category: string;
  categoryIdx: number;
  setIdx: number;
  setName: string;
  fileName: string;
  title: string;
  slides: Slide[];
}
interface CardnewsRoot {
  sets: CardnewsSet[];
}

interface Scene {
  id: string;
  duration: number;
  narration: string;
  subtitle: string;
  image: string;
  transition?: 'fade' | 'cut';
}
interface VideoScript {
  id: string;
  title: string;
  totalDuration: number;
  scenes: Scene[];
}

// ──────────────────────────────────────────────────────────────
// Gemini 호출
// ──────────────────────────────────────────────────────────────
interface GeminiCall {
  promptTokens?: number;
  responseTokens?: number;
  totalTokens?: number;
}
const stats = {
  calls: 0,
  promptTokens: 0,
  responseTokens: 0,
  totalTokens: 0,
};

async function callGemini(prompt: string, retries = 2): Promise<string> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(GEMINI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 32768,
            responseMimeType: 'application/json',
          },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Gemini ${res.status}: ${t.slice(0, 300)}`);
      }
      const j = (await res.json()) as any;
      const text =
        j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
      const usage = j?.usageMetadata ?? {};
      stats.calls += 1;
      stats.promptTokens += usage.promptTokenCount || 0;
      stats.responseTokens += usage.candidatesTokenCount || 0;
      stats.totalTokens += usage.totalTokenCount || 0;
      if (!text) throw new Error('빈 응답');
      return text;
    } catch (e) {
      if (attempt === retries) throw e;
      const wait = 1500 * (attempt + 1);
      console.warn(`   [재시도 ${attempt + 1}/${retries}] ${(e as Error).message} — ${wait}ms 대기`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error('unreachable');
}

// ──────────────────────────────────────────────────────────────
// 카드뉴스: 세트 단위로 리라이트 (1 세트 = 6~9 슬라이드)
// ──────────────────────────────────────────────────────────────
async function rewriteCardnewsSet(set: CardnewsSet): Promise<CardnewsSet> {
  const slimSlides = set.slides.map((s) => ({
    idx: s.idx,
    template: s.template,
    title: s.title,
    subtitle: s.subtitle,
    body: s.body,
    bullets: s.bullets,
    stat: s.stat ? { number: s.stat.number, label: s.stat.label } : undefined,
  }));

  const prompt = `${BRAND_GUIDE}

# 작업: 카드뉴스 1개 세트 전면 재작성

## 세트 메타
- 카테고리: ${set.category}
- 세트명: ${set.setName}
- 세트 제목: ${set.title}
- 총 슬라이드 수: ${set.slides.length}

## 원본 슬라이드 (JSON)
\`\`\`json
${JSON.stringify(slimSlides, null, 2)}
\`\`\`

## 출력 형식 (엄격)
아래 JSON만 응답 (다른 설명/마크다운 금지).

\`\`\`json
{
  "title": "<세트 제목 재작성 (RePub 브랜드 반영)>",
  "slides": [
    {
      "idx": <원본 idx 그대로>,
      "title": "<있었으면 재작성, 없었으면 생략>",
      "subtitle": "<있었으면 재작성, 없었으면 생략>",
      "body": "<있었으면 재작성, 없었으면 생략>",
      "bullets": ["<원본과 같은 길이의 배열, 각 원소 재작성>"],
      "stat": { "number": "<원본 그대로>", "label": "<재작성>" }
    }
  ]
}
\`\`\`

## 체크리스트
- [ ] 모든 슬라이드의 idx를 원본과 동일하게 유지.
- [ ] 원본에 있던 필드만 출력 (title/subtitle/body/bullets/stat 중 존재한 것만).
- [ ] bullets 배열 길이는 원본과 동일.
- [ ] stat.number는 원본 그대로.
- [ ] "하얀마인드"가 기존 주어로 쓰인 문장은 모두 "RePub"으로 교체 + 문장 전체 자연스럽게 리라이트.
- [ ] 세트 제목도 RePub 브랜드 톤으로 재작성.
`;

  const text = await callGemini(prompt);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    // JSON 마크다운 펜스 벗기기
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) parsed = JSON.parse(m[1]);
    else throw new Error(`세트 "${set.setName}" JSON 파싱 실패: ${text.slice(0, 200)}`);
  }

  const newTitle = typeof parsed.title === 'string' ? parsed.title : set.title;
  const patchedSlides: Slide[] = set.slides.map((orig) => {
    const rewritten = parsed.slides?.find((s: any) => s.idx === orig.idx) ?? {};
    const next: Slide = { idx: orig.idx, template: orig.template };
    if (orig.title !== undefined) next.title = rewritten.title ?? orig.title;
    if (orig.subtitle !== undefined) next.subtitle = rewritten.subtitle ?? orig.subtitle;
    if (orig.body !== undefined) next.body = rewritten.body ?? orig.body;
    if (orig.bullets !== undefined) {
      const rb = Array.isArray(rewritten.bullets) ? rewritten.bullets : null;
      if (rb && rb.length === orig.bullets.length) next.bullets = rb.map((x: any) => String(x));
      else next.bullets = orig.bullets;
    }
    if (orig.stat !== undefined) {
      next.stat = {
        number: orig.stat.number, // 원본 유지
        label: rewritten.stat?.label ?? orig.stat.label,
      };
    }
    return next;
  });

  return { ...set, title: newTitle, slides: patchedSlides };
}

// ──────────────────────────────────────────────────────────────
// 영상: VideoScript 단위로 리라이트 (scenes 일괄)
// ──────────────────────────────────────────────────────────────
async function rewriteVideoScript(v: VideoScript): Promise<VideoScript> {
  const slim = v.scenes.map((s) => ({
    id: s.id,
    duration: s.duration,
    narration: s.narration,
    subtitle: s.subtitle,
  }));

  const prompt = `${BRAND_GUIDE}

# 작업: 영상 스크립트 1편 전면 재작성

## 영상 메타
- id: ${v.id}
- 기존 제목: ${v.title}
- 총 길이: ${v.totalDuration}초
- 씬 수: ${v.scenes.length}

## 원본 씬 (JSON)
\`\`\`json
${JSON.stringify(slim, null, 2)}
\`\`\`

## 특별 지침
- narration은 macOS \`say\` 또는 TTS로 읽히는 음성. "이펍", "리펍", "티티에스", "에이아이", "케이더블유시에이지" 같은 한글 발음으로 풀어쓰기.
- subtitle은 화면 자막. "ePub", "TTS", "AI", "KWCAG", "RePub" 등 영문 약어/제품명 그대로.
- narration에서 제품명은 "리펍"으로 (예: "리펍이 변환합니다").
- subtitle에서는 "RePub"으로 (예: "RePub — ePub 3.0 리마스터링").
- duration은 절대 변경하지 말 것 (길이에 맞는 분량으로 재작성).
- id도 변경 금지.
- 영상 title도 RePub 브랜드로 재작성 (예: "RePub 서비스 데모 (풀 4분)").

## 출력 형식
\`\`\`json
{
  "title": "<영상 제목 재작성>",
  "scenes": [
    { "id": "<원본 id>", "narration": "<재작성>", "subtitle": "<재작성>" }
  ]
}
\`\`\`
`;

  const text = await callGemini(prompt);
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (m) parsed = JSON.parse(m[1]);
    else throw new Error(`영상 "${v.id}" JSON 파싱 실패: ${text.slice(0, 200)}`);
  }

  const newTitle = typeof parsed.title === 'string' ? parsed.title : v.title;
  const newScenes: Scene[] = v.scenes.map((orig) => {
    const r = parsed.scenes?.find((x: any) => x.id === orig.id) ?? {};
    return {
      ...orig,
      narration: typeof r.narration === 'string' ? r.narration : orig.narration,
      subtitle: typeof r.subtitle === 'string' ? r.subtitle : orig.subtitle,
    };
  });
  return { ...v, title: newTitle, scenes: newScenes };
}

// ──────────────────────────────────────────────────────────────
// 파일 I/O 유틸
// ──────────────────────────────────────────────────────────────
function backup(file: string): string {
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const bak = `${file}.bak.${stamp}`;
  fs.copyFileSync(file, bak);
  return bak;
}

// video-scripts.ts를 통째로 파싱하는 대신, 필드를 교체하는 방식
function patchVideoScriptsFile(
  origPath: string,
  rewritten: Record<string, VideoScript>
): string {
  let src = fs.readFileSync(origPath, 'utf8');

  // 각 VideoScript 객체 내부의 title 필드와 scenes[].narration, scenes[].subtitle를 교체
  // 안전하게 하기 위해 scene id로 narration/subtitle 필드 블록을 찾아 교체
  for (const v of Object.values(rewritten)) {
    // export const <varName>: VideoScript = { id: '<id>', title: '...', ... }
    // title 교체
    const titleRe = new RegExp(
      `(id:\\s*['"]${v.id}['"][\\s\\S]*?title:\\s*)(['\"])((?:\\\\\\2|(?!\\2).)*)(\\2)`,
      'm'
    );
    src = src.replace(titleRe, (_m, p1, q, _old, q2) => `${p1}${q}${escapeForQuote(v.title, q)}${q2}`);

    // scene별 narration, subtitle 교체
    for (const sc of v.scenes) {
      // scene 블록 찾기: id: '<scene.id>'
      const blockRe = new RegExp(
        `(id:\\s*['\"]${escapeRegExp(sc.id)}['\"],[\\s\\S]*?})`,
        'm'
      );
      const m = src.match(blockRe);
      if (!m) {
        console.warn(`   [경고] scene ${sc.id} 블록 미발견 — 스킵`);
        continue;
      }
      const origBlock = m[1];
      let newBlock = origBlock;

      // narration
      newBlock = newBlock.replace(
        /(narration:\s*)(['\"])((?:\\\2|(?!\2).)*)(\2)/m,
        (_m, p1, q, _old, q2) => `${p1}${q}${escapeForQuote(sc.narration, q)}${q2}`
      );
      // subtitle
      newBlock = newBlock.replace(
        /(subtitle:\s*)(['\"])((?:\\\2|(?!\2).)*)(\2)/m,
        (_m, p1, q, _old, q2) => `${p1}${q}${escapeForQuote(sc.subtitle, q)}${q2}`
      );
      src = src.replace(origBlock, newBlock);
    }
  }
  return src;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function escapeForQuote(s: string, q: string): string {
  // 큰/작은따옴표 공통: 백슬래시 이스케이프 유지 + 해당 따옴표만 이스케이프
  let r = s.replace(/\\/g, '\\\\');
  if (q === "'") r = r.replace(/'/g, "\\'");
  else r = r.replace(/"/g, '\\"');
  // 개행은 유지 (template string 아닌 일반 string이므로 \n으로)
  r = r.replace(/\n/g, '\\n');
  return r;
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────
async function main() {
  const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
  const cardnewsPath = path.join(PROJECT_ROOT, 'scripts/plock/cardnews.json');
  const videoPath = path.join(PROJECT_ROOT, 'scripts/plock/video-scripts.ts');
  const reportPath = path.join(PROJECT_ROOT, 'scripts/plock/rebrand-report.json');

  const argv = new Set(process.argv.slice(2));
  const doCardnews = !argv.has('--no-cardnews');
  const doVideo = !argv.has('--no-video');
  const limit = argv.has('--limit') ? Number(process.argv[process.argv.indexOf('--limit') + 1]) : Infinity;

  const report: any = {
    generatedAt: new Date().toISOString(),
    model: GEMINI_MODEL,
    cardnews: { sets: [], samples: [] },
    video: { scripts: [], samples: [] },
    stats: null,
  };

  // ── 1. 카드뉴스 ──────────────────────────────────────────
  let cardnewsRoot: CardnewsRoot | null = null;
  if (doCardnews) {
    console.log(`\n[1/2] 카드뉴스 리라이트 (cardnews.json)`);
    cardnewsRoot = JSON.parse(fs.readFileSync(cardnewsPath, 'utf8')) as CardnewsRoot;
    const backup1 = backup(cardnewsPath);
    console.log(`      백업: ${backup1}`);
    console.log(`      세트 수: ${cardnewsRoot.sets.length}, 총 슬라이드: ${cardnewsRoot.sets.reduce((a, s) => a + s.slides.length, 0)}`);

    const newSets: CardnewsSet[] = [];
    let i = 0;
    for (const set of cardnewsRoot.sets) {
      if (i >= limit) {
        newSets.push(set);
        i += 1;
        continue;
      }
      const tag = `${set.categoryIdx}-${set.setIdx}`;
      process.stdout.write(`      [${i + 1}/${cardnewsRoot.sets.length}] ${tag} ${set.setName} ...`);
      try {
        const rewritten = await rewriteCardnewsSet(set);
        newSets.push(rewritten);
        console.log(` OK (${rewritten.slides.length} slides)`);

        // 샘플 수집 (첫 슬라이드)
        if (report.cardnews.samples.length < 10 && set.slides[0]) {
          report.cardnews.samples.push({
            setName: set.setName,
            idx: set.slides[0].idx,
            before: {
              title: set.slides[0].title,
              subtitle: set.slides[0].subtitle,
              body: set.slides[0].body,
            },
            after: {
              title: rewritten.slides[0].title,
              subtitle: rewritten.slides[0].subtitle,
              body: rewritten.slides[0].body,
            },
          });
        }
        report.cardnews.sets.push({ setName: set.setName, slides: rewritten.slides.length, ok: true });
      } catch (e) {
        console.log(` FAIL: ${(e as Error).message}`);
        newSets.push(set);
        report.cardnews.sets.push({ setName: set.setName, ok: false, error: (e as Error).message });
      }
      i += 1;
    }

    cardnewsRoot.sets = newSets;
    fs.writeFileSync(cardnewsPath, JSON.stringify(cardnewsRoot, null, 2) + '\n', 'utf8');
    console.log(`      → 저장: ${cardnewsPath}`);
  }

  // ── 2. 영상 ──────────────────────────────────────────────
  if (doVideo) {
    console.log(`\n[2/2] 영상 스크립트 리라이트 (video-scripts.ts)`);
    const backup2 = backup(videoPath);
    console.log(`      백업: ${backup2}`);

    // 동적 import로 기존 스크립트 로드
    const modUrl = `file://${videoPath}?t=${Date.now()}`;
    const mod = (await import(modUrl)) as { ALL_VIDEOS: VideoScript[] };
    const videos = mod.ALL_VIDEOS;
    console.log(`      영상 수: ${videos.length}, 총 씬: ${videos.reduce((a, v) => a + v.scenes.length, 0)}`);

    const rewrittenMap: Record<string, VideoScript> = {};
    for (let i = 0; i < videos.length; i++) {
      const v = videos[i];
      process.stdout.write(`      [${i + 1}/${videos.length}] ${v.id} (${v.scenes.length} scenes) ...`);
      try {
        const rw = await rewriteVideoScript(v);
        rewrittenMap[v.id] = rw;
        console.log(` OK`);

        // 샘플 수집
        if (report.video.samples.length < 10 && rw.scenes[0]) {
          report.video.samples.push({
            videoId: v.id,
            sceneId: rw.scenes[0].id,
            before: { narration: v.scenes[0].narration, subtitle: v.scenes[0].subtitle },
            after: { narration: rw.scenes[0].narration, subtitle: rw.scenes[0].subtitle },
          });
        }
        report.video.scripts.push({ id: v.id, scenes: rw.scenes.length, ok: true });
      } catch (e) {
        console.log(` FAIL: ${(e as Error).message}`);
        report.video.scripts.push({ id: v.id, ok: false, error: (e as Error).message });
      }
    }

    // 파일 패치
    const newSrc = patchVideoScriptsFile(videoPath, rewrittenMap);
    fs.writeFileSync(videoPath, newSrc, 'utf8');
    console.log(`      → 저장: ${videoPath}`);
  }

  // ── 리포트 ───────────────────────────────────────────────
  report.stats = stats;
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`\n완료. 리포트: ${reportPath}`);
  console.log(`Gemini 호출: ${stats.calls}회 / 프롬프트 토큰 ${stats.promptTokens} / 응답 토큰 ${stats.responseTokens} / 총 ${stats.totalTokens}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
