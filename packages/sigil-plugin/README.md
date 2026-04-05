# ePubRemaster — Sigil Plugin

AI 기반 ePub 2.0 → 3.0 인터랙티브 리마스터링 Sigil 플러그인

## 기능

- **ePub 3.0 자동 변환**: HTML5 시맨틱 마크업, OPF 3.0, Nav 문서 생성
- **접근성 자동 적용**: KWCAG 2.1 / EPUB Accessibility 1.1 준수
- **AI 퀴즈 생성**: LLM 기반 챕터별 객관식/주관식 문항 (API 키 필요)
- **TTS 음성 변환**: SMIL 미디어 오버레이 싱크 (API 키 필요)
- **챕터 요약**: AI 기반 압축 요약문 생성 (API 키 필요)

## 설치

### Sigil에서 설치

1. 릴리즈 페이지에서 `ePubRemaster_v1.0.0.zip` 다운로드
2. Sigil 실행 → `Plugins` → `Manage Plugins` → `Add Plugin`
3. 다운로드한 ZIP 파일 선택

### 수동 설치

```bash
cd packages/sigil-plugin
zip -r ePubRemaster.zip plugin.xml plugin.py
```

생성된 `ePubRemaster.zip`을 Sigil에서 `Add Plugin`으로 설치.

## 사용법

1. Sigil에서 ePub 2.0 파일 열기
2. `Plugins` → `Output` → `ePubRemaster` 실행
3. 설정 다이얼로그에서 옵션 선택:
   - **Conversion Mode**: API (권장) 또는 Local (Node.js 필요)
   - **API Server URL**: 기본값 사용 또는 자체 서버 주소
   - **Options**: 퀴즈, TTS, 요약 등 선택
4. `Convert` 클릭
5. 변환된 ePub 3.0 파일이 생성됨

## 동작 모드

### API 모드 (권장)
- Node.js 설치 불필요
- 원격 서버에서 변환 처리
- 기본 서버: `https://epub-remaster.vercel.app`

### Local 모드
- Node.js 20+ 설치 필요
- `npx @gov-epub/core` CLI를 로컬에서 실행
- 네트워크 불필요, 완전 오프라인 동작

## 기존 플러그인 대비 차별점

| 기능 | ePub3-itizer | ePubRemaster |
|------|-------------|--------------|
| 기본 구조 변환 | O | O |
| AI 퀴즈 자동 생성 | X | **O** |
| TTS + SMIL 오버레이 | X | **O** |
| AI 이미지 추천 | X | **O** |
| 접근성 자동 태깅 (KWCAG) | X | **O** |
| 시맨틱 재구조화 | X | **O** |
| GUI 설정 | X | **O** |

## CLI 단독 사용

Sigil 없이도 CLI로 직접 사용할 수 있습니다:

```bash
# 설치
npm install -g @gov-epub/core

# 변환
epub-remaster convert input.epub -o output.epub --quiz --summary

# 검증
epub-remaster validate input.epub

# 정보 확인
epub-remaster info input.epub
```

## 라이선스

MIT License — Sigil(GPL-3.0)과 별도 코드이므로 라이선스 충돌 없음.

## 개발

```bash
# 플러그인 빌드 (ZIP)
cd packages/sigil-plugin
zip -r ePubRemaster_v1.0.0.zip plugin.xml plugin.py

# Core 엔진 빌드
pnpm --filter @gov-epub/core build

# CLI 테스트
node packages/core/dist/cli.js convert fixtures/samples/lucky-day.epub -o /tmp/output.epub
```
