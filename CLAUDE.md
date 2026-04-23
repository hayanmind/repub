# CLAUDE.md — ePub 3.0 인터랙티브 리마스터링 시스템

## ⚠️ 리포 분리 안내 (필독)

이 프로젝트는 **2개의 리포로 분리** 관리됩니다:

| 리포 | 권한 | 용도 |
|------|------|------|
| **[`hayanmind/epub-remastering-tool`](https://github.com/hayanmind/epub-remastering-tool)** (이 리포) | Internal (MIT 오픈소스화 예정) | 소스코드, 기술 문서 (README, API, docs/) |
| **[`hayanmind/gov-epub-2026`](https://github.com/hayanmind/gov-epub-2026)** | Internal (기밀) | 사업계획서, 월간보고, 컨설팅 일지, 중간평가, 외주 용역 서류 |

**로컬 경로**:
- 소스코드: `/Users/jmoh/Workspace/gov-epub-2026/` (이 디렉토리)
- 내부 문서: `/Users/jmoh/Workspace/gov-epub-2026-docs/`

**`source/`와 `outsourcing/`는 이 리포의 `.gitignore`에 등록되어 있습니다.** 내부 문서를 수정할 때는 `gov-epub-2026-docs` 리포를 사용하세요.

---

## 1. 프로젝트 목적

ePub 2.0 이하 전자책을 ePub 3.0 인터랙티브 콘텐츠로 자동 변환하는 웹 기반 AI 시스템을 개발한다.

- **과제명**: AI 기반 ePub 2.0 이하 전자책의 ePub 3.0 인터랙티브 리마스터링 기술 개발
- **지원사업**: 2025년 출판콘텐츠 기술개발 지원 (한국출판문화산업진흥원)
- **주관기관**: (주)하얀마인드
- **사업기간**: 2025.9 ~ 2026.6
- **개발완료 기한**: 2026.3.27 (당초 공고 기준) / 2026.4.30 (재공고 기준)
- **총사업비**: 223백만원 (국고 200백만원 + 자부담 23백만원)

핵심 목표:
1. ePub 2.0 → ePub 3.0 구조 자동 변환 (ePubCheck 통과율 ≥ 95%)
2. LLM 기반 콘텐츠 보강 (요약, 퀴즈, 이미지 생성)
3. TTS 음성 변환 및 미디어 오버레이 싱크
4. 접근성 자동 적용 (KWCAG 2.1, EPUB Accessibility 1.1)
5. 웹 기반 대시보드 UI 및 SaaS/API 배포
6. GitHub 오픈소스 공개 및 2년간 중소출판사 무상 제공

---

## 2. 기능 요구사항

### 2.1 ePub 파싱 및 분석 엔진

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| ePub 2.0 파일 업로드 | .epub 파일 (ZIP 구조) | MIME 검증, 확장자 확인, 파일 크기 제한 검사 | 업로드 성공/실패 상태 |
| HTML/XML 구조 파싱 | ePub 내부 XHTML, OPF, NCX 파일 | Sigil 기반 파서로 DOM 트리 구축, 태그 구조 분석 | 구조화된 JSON AST |
| 메타데이터 추출 | OPF(content.opf) 파일 | 제목, 저자, 출판일, 언어, ISBN 등 파싱 | 정규화된 메타데이터 JSON |
| 목차(TOC) 추출 | NCX 파일 또는 Nav 문서 | 챕터/섹션 계층 구조 파싱 | 트리 구조 TOC JSON |
| 콘텐츠 구성요소 식별 | XHTML 본문 | 본문(p), 제목(h1-h6), 이미지(img), 주석, 캡션 태그 자동 분류 | 태깅된 콘텐츠 맵 |
| 오류 패턴 감지 | 전체 ePub 구조 | 인코딩 깨짐, 비표준 태그, 누락 파일, 잘못된 경로 등 10종 핵심 오류 패턴 검출 | 오류 리포트 JSON (유형, 위치, 심각도) |
| 이미지/미디어 인벤토리 | ePub 내 리소스 파일 | 이미지 포맷, 크기, 참조 관계 분석 | 미디어 인벤토리 목록 |

### 2.2 AI 기반 콘텐츠 재구성

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| 챕터 구조 재편성 | 파싱된 콘텐츠 맵 | LLM으로 논리적 구획 분석, h1-h6 계층 재구성 | 구조화된 HTML5 문서 |
| 문단 요약 생성 | 챕터별 본문 텍스트 | LLM 기반 압축 요약 (챕터 단위) | 요약 텍스트 (HTML 삽입 가능) |
| 자동 태그 구조화 | 비구조화된 텍스트 | h1/h2/p/img/figcaption 등 시맨틱 태그 자동 부여 | 시맨틱 HTML5 |
| 스타일 매핑 | 1페이지에서 사용자가 지정한 스타일 | 동일 구조를 가진 다른 페이지에 일괄 적용 | 전체 문서에 일관된 스타일 |
| 불필요 태그 정리 | HTML 소스 | 역할 없는 빈 태그, 중복 wrapper, 불필요 속성 자동 삭제 | 정리된 HTML |
| CSS 자동 생성 | 콘텐츠 구조 + 스타일 매핑 규칙 | CSS3 기반 반응형 스타일시트 생성 | .css 파일 |

### 2.3 인터랙티브 요소 자동 삽입

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| 퀴즈 자동 생성 | 챕터별 본문 텍스트 | LLM 프롬프트로 객관식/주관식 문항 생성, JSON 스키마 검증 | 퀴즈 HTML + JSON 데이터 |
| TTS 음성 변환 | 본문 텍스트 | ElevenLabs/외부 TTS API 호출, 음성 파일 생성 | .mp3/.m4a 오디오 파일 |
| 미디어 오버레이 싱크 | 텍스트 + TTS 오디오 | 텍스트-음성 타임스탬프 자동 정렬(align) | SMIL 미디어 오버레이 파일 |
| 용어 설명 팝업 | 본문 내 전문 용어 | LLM으로 용어 식별 및 설명 생성 | 팝업 링크가 삽입된 HTML |
| 이미지 자동 생성/추천 | 장면 텍스트 | Stability AI 등으로 맥락에 맞는 이미지 생성 또는 추천 | 이미지 파일 + alt 텍스트 |
| AI 튜터 대화 인터페이스 | 본문 컨텍스트 | 독서 중 질문에 본문 기반 LLM 답변 생성 | 채팅 UI 컴포넌트 (HTML/JS) |
| 실행 가능 코드 블록 | 코딩 예제 텍스트 | 코드 블록 식별, 실행 환경 임베드 | 인터랙티브 코드 에디터 (HTML/JS) |

### 2.4 ePub 3.0 변환 및 패키징

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| HTML5 변환 | 재구성된 콘텐츠 | XHTML → HTML5 변환, 시맨틱 마크업 적용 | HTML5 문서 |
| CSS3 레이아웃 적용 | 콘텐츠 + 레이아웃 템플릿 | 반응형 디자인, 타이포그래피 규칙 적용 | CSS3 스타일시트 |
| JavaScript 인터랙션 | 인터랙티브 요소 정의 | 버튼, 링크, 팝업, 퀴즈 동작 스크립트 생성 | .js 파일 |
| OPF 매니페스트 생성 | 전체 리소스 목록 | ePub 3.0 Spec 3.2 기준 package.opf 자동 생성 | package.opf |
| Nav 문서 생성 | TOC 구조 | NCX → Nav 문서 변환 (ePub 3.0 표준) | nav.xhtml |
| 패키징 | 전체 리소스 | ePub 3.0 구조(mimetype, META-INF, OEBPS)로 ZIP 패키징 | .epub 파일 |
| ePubCheck 검증 | 생성된 .epub | ePubCheck 4.x 자동 실행 | PASS/FAIL + 오류 상세 |
| 무결성 검증 | .epub 파일 | 이미지/미디어 참조 무결성, 링크 유효성 검사 | 검증 리포트 |

### 2.5 접근성 자동 적용

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| 이미지 대체 텍스트 생성 | 이미지 파일 + 문맥 | LLM/Vision API로 alt 텍스트 자동 생성 | alt 속성이 추가된 img 태그 |
| 문서 구조 태그 삽입 | HTML 콘텐츠 | aria-label, role, lang 속성 자동 삽입 | 접근성 마크업된 HTML |
| 스크린리더 호환 | 전체 콘텐츠 | 읽기 순서(reading order) 최적화, aria-live 설정 | 스크린리더 호환 HTML |
| 표/수식 접근성 | 복잡한 콘텐츠 | 표 요약, 수식 MathML 변환, 대체 설명 추가 | 접근성이 보장된 표/수식 |
| KWCAG 2.1 자동 검증 | 전체 ePub | KWCAG 2.1 체크리스트 기반 자동 검사 | 적합/부적합 리포트 |
| Ace by DAISY 검증 | 전체 ePub | EPUB Accessibility 1.1 기준 자동 검증 | 접근성 검증 리포트 |
| 접근성 메타데이터 | ePub 패키지 | schema.org 접근성 메타데이터(accessMode, accessibilityFeature 등) 삽입 | OPF에 메타데이터 추가 |

### 2.6 웹 기반 대시보드

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| 파일 업로드 UI | 사용자 ePub 파일 | 드래그 앤 드롭, 다중 업로드, 진행률 표시 | 업로드 완료 상태 |
| 변환 상태 모니터링 | 변환 작업 ID | 실시간 진행 단계 추적 (파싱→재구성→변환→패키징) | 진행률 대시보드 |
| 미리보기 | 변환된 ePub | 웹 기반 ePub 리더로 즉시 미리보기 | 브라우저 내 ePub 뷰어 |
| 원본/변환 비교 뷰 | 원본 + 변환 ePub | 좌우 분할 화면으로 Before/After 비교 | 사이드 바이 사이드 뷰어 |
| AI 변환 구간 하이라이팅 | 변환 결과물 | AI가 수정/추가한 부분 시각적 강조 표시 | 하이라이트된 HTML |
| 퀴즈 편집 UI | 자동 생성된 퀴즈 | 문항 수정, 추가, 삭제 인터페이스 | 수정된 퀴즈 JSON |
| TTS 음질 확인 | 생성된 오디오 | 오디오 플레이어, 싱크 확인, 재생성 요청 | 확인 완료 상태 |
| 에러 리포트 뷰 | 변환 로그 | 오류 유형별 분류, 위치 표시, 해결 가이드 제공 | 에러 대시보드 |
| 변환 이력 관리 | 사용자 변환 기록 | 프로젝트별 변환 이력 조회, 재변환, 다운로드 | 이력 목록 UI |
| 일괄 변환 | 다수 ePub 파일 | 대기열 기반 순차 처리, 진행 상태 표시 | 일괄 처리 결과 리포트 |
| 템플릿 관리 | 스타일/레이아웃 설정 | 사용한 태그, 스타일을 템플릿으로 저장, 재사용 | 템플릿 라이브러리 |
| 설정 페이지 | 사용자 설정 | API 키 관리 (OpenAI, Anthropic, Stability AI, ElevenLabs), 변환 옵션 | 설정 저장 |

### 2.7 사용자 온보딩 및 가이드

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| Interactive Tutorial | 신규 사용자 접속 | 단계별 가이드 투어 (업로드→변환→검토→내보내기) | 튜토리얼 UI 오버레이 |
| 오류 해결 가이드 | 발생한 오류 코드 | 오류 유형 매칭, 해결법 자동 추천 (LLM 기반) | 해결 가이드 팝업 |
| FAQ 및 도움말 | 사용자 질의 | 카테고리별 FAQ 데이터베이스 검색 | FAQ 페이지 |
| 변환 결과 품질 리포트 | 완료된 변환 작업 | KPI 기반 자동 품질 평가 (ePubCheck, 접근성, 인터랙션 수) | PDF/HTML 리포트 |

### 2.8 API 및 SaaS 배포

| 기능 | 입력 | 처리 | 출력 |
|------|------|------|------|
| REST API 엔드포인트 | ePub 파일 + 옵션 JSON | 서버 사이드 변환 파이프라인 실행 | 변환된 ePub + 리포트 JSON |
| API 인증 | API 키 | JWT 기반 인증, 요청 제한(rate limiting) | 인증 토큰 |
| 비동기 작업 관리 | 변환 요청 | 작업 큐 등록, 상태 조회 API, 웹훅 콜백 | 작업 상태 JSON |
| 사용량 추적 | API 호출 기록 | 월별 변환 건수, API 호출 수 집계 | 사용량 대시보드 |
| 구독 관리 | 사용자 플랜 정보 | 스타터/프로페셔널/엔터프라이즈 플랜 관리 | 구독 상태 |

---

## 3. 시스템 구조

### 3.1 기술 스택

```
Frontend:  Next.js (React) + TypeScript + Tailwind CSS
Backend:   Node.js (Express 또는 Fastify) + TypeScript
AI/LLM:    OpenAI GPT-4 API, Anthropic Claude API (선택)
TTS:       ElevenLabs API 또는 Google Cloud TTS
이미지:    Stability AI API 또는 OpenAI DALL-E
ePub:      epubjs (뷰어), JSZip (패키징), ePubCheck (검증)
DB:        PostgreSQL (메타데이터, 사용자) + Redis (캐시, 작업 큐)
Storage:   Google Cloud Storage (ePub 파일, 미디어)
Infra:     GCP (Cloud Run/GKE), GitHub Actions (CI/CD)
검증:      ePubCheck 4.x, Ace by DAISY
```

### 3.2 변환 파이프라인 (5단계)

```
[1단계: 입력/분석]
  ePub 2.0 업로드 → MIME 검증 → ZIP 해제 → HTML/OPF/NCX 파싱
  → 메타데이터 추출 → 콘텐츠 맵 생성 → 오류 패턴 감지

[2단계: AI 재구성]
  콘텐츠 맵 → LLM 기반 구조 분석 → 시맨틱 태그 자동 부여
  → 챕터 구조 재편성 → 불필요 태그 정리 → CSS 자동 생성

[3단계: 인터랙션 삽입]
  재구성된 콘텐츠 → 퀴즈 자동 생성 → TTS 음성 변환
  → 미디어 오버레이 싱크 → 용어 팝업 → 이미지 생성/추천

[4단계: ePub 3.0 변환]
  HTML5 변환 → CSS3 레이아웃 → JS 인터랙션 → 접근성 태그 삽입
  → OPF/Nav 생성 → 패키징 → ePubCheck 검증 → 무결성 검증

[5단계: 배포]
  미리보기 → 사용자 피드백 반영 → 최종 패키징 → 다운로드/API 응답
```

### 3.3 모듈 구조

```
gov-epub-2026/
├── CLAUDE.md                    # 이 문서
├── source/                      # 사업 근거 문서 (원본 보존)
├── packages/
│   ├── web/                     # Next.js 프론트엔드 (대시보드)
│   │   ├── app/                 # App Router 페이지
│   │   │   ├── dashboard/       # 메인 대시보드
│   │   │   ├── upload/          # 파일 업로드
│   │   │   ├── convert/         # 변환 상태/결과
│   │   │   ├── preview/         # 미리보기 (ePub 뷰어)
│   │   │   ├── settings/        # API 키, 구독 관리
│   │   │   └── onboarding/      # 튜토리얼
│   │   └── components/          # 공용 UI 컴포넌트
│   ├── api/                     # Backend API 서버
│   │   ├── routes/              # REST API 엔드포인트
│   │   ├── services/            # 비즈니스 로직
│   │   ├── queue/               # 작업 큐 (BullMQ/Redis)
│   │   └── middleware/          # 인증, 로깅, 에러 핸들링
│   └── core/                    # 핵심 변환 엔진 (공유 라이브러리)
│       ├── parser/              # ePub 2.0 파서 (Sigil 기반)
│       ├── analyzer/            # 콘텐츠 분석 및 오류 감지
│       ├── restructurer/        # AI 기반 콘텐츠 재구성
│       ├── interaction/         # 인터랙티브 요소 생성
│       │   ├── quiz/            # 퀴즈 생성기
│       │   ├── tts/             # TTS 변환 + 미디어 오버레이
│       │   ├── image/           # 이미지 생성/추천
│       │   └── tutor/           # AI 튜터 대화
│       ├── converter/           # ePub 3.0 변환 + 패키징
│       ├── accessibility/       # 접근성 자동 적용 + 검증
│       └── validator/           # ePubCheck, Ace 연동
├── docs/                        # 기술 문서
│   ├── README.md                # 프로젝트 소개
│   ├── API.md                   # API 명세서
│   └── FAQ.md                   # 자주 묻는 질문
├── tests/                       # 테스트 코드
│   ├── unit/                    # 단위 테스트
│   ├── integration/             # 통합 테스트
│   └── e2e/                     # E2E 테스트
├── fixtures/                    # 테스트용 ePub 샘플
├── .github/
│   └── workflows/               # GitHub Actions CI/CD
└── docker-compose.yml           # 로컬 개발 환경
```

---

## 4. 기능 → KPI 매핑

### 4.1 정량적 성능 지표 (8개)

| # | KPI | 측정 방법 | 목표치 | 매핑 기능 |
|---|-----|-----------|--------|-----------|
| 1 | ePubCheck 통과율 | 샘플 100권(문학 50 + 비문학 50 층화 표본) 자동 변환 후 ePubCheck 실행 | ≥ 95% | 2.1 파싱, 2.4 변환/패키징 |
| 2 | 퀴즈 HTML 구조/문법 오류율 | 생성된 퀴즈 HTML W3C Validator 자동 검사 | ≤ 1% | 2.3 퀴즈 자동 생성 |
| 3 | 퀴즈 JSON 스키마 검증 통과율 | JSON Schema Validator로 자동 검증 | ≥ 98% | 2.3 퀴즈 자동 생성 |
| 4 | TTS 텍스트 싱크 정확도 | 자동 align 기준 타임스탬프 오차 측정 | ≥ 98% | 2.3 TTS/미디어 오버레이 |
| 5 | TTS 무음 구간 비율 | 오디오 파일 분석 (무음 구간 자동 측정) | ≤ 5% | 2.3 TTS 음성 변환 |
| 6 | KWCAG 접근성 충족율 | KWCAG 2.1 자동화 검증 도구 + Ace by DAISY | ≥ 90% | 2.5 접근성 |
| 7 | 인터랙션 요소 자동 포함 수 | 변환 로그 분석 (퀴즈, TTS, 팝업 등 종류 수) | ≥ 3종/권 | 2.3 인터랙티브 요소 |
| 8 | API 평균 응답시간 | 서버 로그 기반 자동 측정 | ≤ 3초 | 2.8 API |
| 9 | 시스템 가용률 | 분단위 로그 기반 업타임 측정 | ≥ 99.5% | 2.8 API/인프라 |
| 10 | 자동 테스트 케이스 통과율 | GitHub Actions CI 10종 핵심 시나리오 실행 | ≥ 90% | 전체 파이프라인 |
| 11 | 변환 후 구조 오류 발생률 | ePubCheck + 커스텀 검증 | ≤ 2% | 2.4 변환/패키징 |
| 12 | GitHub Actions 테스트 자동 통과율 | CI/CD 파이프라인 자동 실행 | 100% | CI/CD |
| 13 | 문서화 커버리지 | README, API 문서, FAQ 등 건수 | ≥ 3건 | 오픈소스 |

### 4.2 정성적 기준

| 기준 | 평가 방법 |
|------|-----------|
| 편집자 신뢰도 | AI 변환 구간 하이라이팅을 통한 시각적 검토 용이성 (FGI 인터뷰) |
| 사용자 친화성 | Interactive Tutorial 제공, 오류 가이드 정확도 (사용성 인터뷰) |
| 스타일 매핑 일관성 | 1페이지 스타일 → 전체 문서 일괄 적용 정확도 (수동 샘플 검증) |
| 데이터 파싱 안정성 | 10종 오류 패턴 대응률 (컨설팅 의견 반영, 최우선 과제) |
| 시장 적합성 | 협력 출판사 FGI (3월 실증 시 병행) |

### 4.3 검증 파이프라인

```
[1차: 파서 오류 검출]
  → 1,000권 데이터셋 전수 파싱, 오류율 측정

[2차: AI 변환 수행]
  → 층화 표본 100권 (문학 50 + 비문학 50) 자동 변환

[3차: ePubCheck 통과율 전수 조사]
  → 변환된 100권 ePubCheck + 접근성 검증 + 인터랙션 검증
```

---

## 5. 표준 및 접근성 준수 전략

### 5.1 준수 표준

| 표준 | 버전 | 적용 범위 |
|------|------|-----------|
| ePub 3.0 | Spec 3.2 | 패키징 구조, OPF, Nav 문서 |
| HTML5 | Living Standard | 콘텐츠 마크업 |
| CSS3 | Level 3 | 레이아웃, 타이포그래피 |
| WCAG | 2.1 AA | 웹 대시보드 접근성 |
| KWCAG | 2.1 | 변환된 ePub 콘텐츠 접근성 |
| EPUB Accessibility | 1.1 (W3C) | ePub 콘텐츠 접근성 메타데이터 |
| SMIL | 3.0 | 미디어 오버레이 (TTS 싱크) |

### 5.2 접근성 자동화 체크리스트

1. **이미지 대체 텍스트**: 모든 img 태그에 의미 있는 alt 텍스트 자동 생성 (LLM/Vision)
2. **문서 구조화**: 제목 계층(h1-h6), 목차, 본문 구조 시맨틱 태깅
3. **링크 텍스트**: 모든 하이퍼링크에 설명적 텍스트 제공
4. **멀티미디어 접근성**: 오디오 대본(transcript), 비디오 자막 자동 생성
5. **읽기 순서**: 논리적 읽기 순서(reading order) 보장
6. **언어 선언**: html lang 속성, 다국어 구간 xml:lang 자동 삽입
7. **표 접근성**: 표 요약(summary), 헤더(th), scope 속성
8. **접근성 메타데이터**: schema.org accessMode, accessibilityFeature, accessibilityHazard

### 5.3 검증 도구

- **ePubCheck 4.x**: ePub 3.0 표준 적합성 검증 (자동 실행, CI 통합)
- **Ace by DAISY**: EPUB Accessibility 1.1 기준 접근성 검증
- **W3C Nu HTML Checker**: HTML5 문법 검증
- **KWCAG 자체 검증기**: 한국형 웹 접근성 기준 자동 검사

---

## 6. 테스트 및 검증 전략

### 6.1 테스트 레벨

| 레벨 | 범위 | 도구 | 자동화 |
|------|------|------|--------|
| 단위 테스트 | 파서, 변환기, 접근성 모듈 개별 함수 | Vitest | CI 자동 |
| 통합 테스트 | 파이프라인 모듈 간 데이터 흐름 | Vitest + Supertest | CI 자동 |
| E2E 테스트 | 업로드 → 변환 → 다운로드 전체 흐름 | Playwright | CI 자동 |
| 성능 테스트 | API 응답시간, 대량 변환 부하 | k6 또는 Artillery | 수동/주기적 |
| 접근성 테스트 | ePubCheck, Ace, KWCAG | CLI 도구 | CI 자동 |

### 6.2 핵심 테스트 시나리오 (10종)

1. 텍스트 중심 소설 ePub 2.0 → 3.0 변환 (ePubCheck PASS)
2. 이미지 포함 교재 ePub 변환 (이미지 무결성 + alt 텍스트)
3. 인코딩 깨짐 ePub 변환 (오류 감지 + 자동 복구)
4. 비표준 태그 사용 ePub 변환 (태그 정리 + 구조화)
5. TTS 음성 생성 + 미디어 오버레이 싱크 검증
6. 퀴즈 자동 생성 (JSON 스키마 + HTML 문법 검증)
7. 접근성 태그 자동 삽입 (KWCAG 2.1 기준 충족)
8. 대량 변환 (10권 동시) 시스템 부하 테스트
9. 스타일 매핑 일괄 적용 정확도
10. API 엔드포인트 인증/응답시간/에러 핸들링

### 6.3 데이터셋

- **규모**: 1,000권 이상 (용역사 구축)
- **구성**: 문학(소설, 에세이) 50% + 비문학(학습서, 수험서, 실용서) 50%
- **품질 등급화**: 정상/인코딩 오류/비표준 태그/파일 손상 분류
- **출판사별 convention 분석**: HTML, CSS, XML 구조 패턴 정리

**현재 확보된 공개 도메인 데이터셋** (2026-04-18 구축, 파서 스트레스 테스트용)
- 총 1,010권 / 265.5 MB / SQLite 인덱싱
- 문학(EN fiction) 500 + 비문학(EN, 9개 토픽 혼합) 500 + 한국어 10
- 소스: Project Gutenberg (1,001) + Wikisource 한국어 (9)
- 모두 ePub 2.0 (noimages) — error tolerance 테스트에 최적
- 저장소: `fixtures/dataset-1000/` (gitignored)
- 카탈로그 DB: `fixtures/dataset-1000/catalog.db`
- 재구축 스크립트: `scripts/dataset/` (README 참조)

---

## 7. GitHub 오픈소스 공개 전략

### 7.1 공개 범위

| 구분 | 공개 여부 | 사유 |
|------|-----------|------|
| core/parser | 공개 | 핵심 파싱 엔진, 커뮤니티 기여 유도 |
| core/converter | 공개 | ePub 3.0 변환/패키징 |
| core/accessibility | 공개 | 접근성 자동 적용, 공공 가치 |
| core/validator | 공개 | ePubCheck/Ace 연동 |
| core/interaction | 부분 공개 | 인터페이스 공개, LLM 프롬프트는 비공개 |
| web (대시보드) | 공개 | 웹 UI 전체 |
| api (서버) | 공개 | API 서버 전체 |
| docs/ | 공개 | README, API 문서, FAQ |

### 7.2 필수 문서

1. **README.md**: 프로젝트 소개, 설치 방법, 빠른 시작 가이드
2. **API.md**: REST API 전체 명세 (엔드포인트, 파라미터, 응답 형식)
3. **FAQ.md**: 자주 묻는 질문 및 트러블슈팅
4. **CONTRIBUTING.md**: 기여 가이드
5. **LICENSE**: 오픈소스 라이선스 (MIT 또는 Apache 2.0)

### 7.3 CI/CD

- **GitHub Actions**: Push/PR 시 자동 테스트 실행
- **자동 검증**: ePubCheck, 접근성 검증, 단위/통합 테스트
- **Docker 이미지**: 자동 빌드 및 배포

---

## 8. 실패 조건 및 예외 처리 원칙

### 8.1 파싱 실패

| 실패 유형 | 처리 방식 |
|-----------|-----------|
| 파일이 유효한 ZIP이 아님 | 즉시 거부, 사용자에게 포맷 오류 메시지 |
| mimetype 누락 | 자동 복구 시도, 실패 시 경고 후 계속 |
| OPF 파일 누락/손상 | 파일 구조에서 자동 탐색 시도, 실패 시 중단 + 오류 리포트 |
| 인코딩 깨짐 | 인코딩 자동 감지(chardet), 변환 시도, 실패 구간 표시 |
| 비표준 태그 | 표준 태그로 매핑 시도, 매핑 불가 시 제거 후 경고 |
| 이미지 파일 누락 | 참조 링크 유지 + 누락 경고, placeholder 이미지 삽입 |

### 8.2 AI 처리 실패

| 실패 유형 | 처리 방식 |
|-----------|-----------|
| LLM API 타임아웃 | 3회 재시도 (exponential backoff), 실패 시 해당 단계 스킵 |
| LLM 응답 품질 불량 | JSON 스키마 검증 실패 시 재생성 (최대 3회) |
| TTS 생성 실패 | 대체 TTS 엔진 시도, 실패 시 오디오 없이 진행 |
| 이미지 생성 실패 | 이미지 없이 진행, 사용자에게 수동 추가 안내 |
| API 할당량 초과 | 사용자에게 알림, 대기열에 추가, 재시도 스케줄링 |

### 8.3 변환/패키징 실패

| 실패 유형 | 처리 방식 |
|-----------|-----------|
| ePubCheck 실패 | 오류 항목 자동 수정 시도, 수정 불가 항목은 리포트에 포함 |
| 접근성 검증 실패 | 미달 항목 목록 제공, 자동 수정 가능 항목은 재처리 |
| 패키징 용량 초과 | 이미지 최적화, 미디어 압축 후 재패키징 |
| 무결성 검증 실패 | 누락 리소스 목록 제공, 참조 링크 자동 수정 |

### 8.4 보안 원칙

- **API Zero-Retention**: 상용 LLM API의 데이터 비저장(Opt-out) 정책 적용
- **전송 구간 암호화**: 모든 통신 HTTPS/SSL 필수
- **작업 완료 후 데이터 파기**: 변환 완료 후 서버 내 원본 파일 자동 삭제 (설정 가능)
- **사용자 인증**: JWT 기반, API 키 관리
- **저작권 보호**: 업로드된 콘텐츠는 AI 학습에 사용하지 않음 (약관 명시)

---

## 9. 누락 방지 체크리스트

### 9.1 source 기반 기능 체크리스트

| # | 기능 | 출처 | 반영 여부 |
|---|------|------|-----------|
| 1 | ePub 2.0 파일 자동 파싱 (HTML/XML/OPF/NCX) | 사업계획서 2.과제주요내용 | ✅ 2.1 |
| 2 | 메타데이터 자동 추출 (제목, 저자, 출판일 등) | 사업계획서 2.과제주요내용 | ✅ 2.1 |
| 3 | 콘텐츠 구성요소 자동 식별 및 태깅 | 사업계획서 2.과제주요내용 | ✅ 2.1 |
| 4 | 태그 입력, CSS 생성, HTML 구조화 자동화 | 공고문 지정과제1 정성적기준 | ✅ 2.2 |
| 5 | 스타일 매핑: 1쪽 스타일 → 전체 문서 일괄 적용 | 공고문 지정과제1 정성적기준 | ✅ 2.2 |
| 6 | 사용한 태그/스타일 저장 → 다음 문서 재활용 | 공고문 지정과제1 정성적기준 | ✅ 2.6 (템플릿 관리) |
| 7 | 역할 없는 태그 자동 삭제 | 공고문 지정과제1 정성적기준 | ✅ 2.2 |
| 8 | Interactive Tutorial 제공 | 공고문 지정과제1 정성적기준 | ✅ 2.7 |
| 9 | 오류 가이드 (해결법 포함) 제공 | 공고문 지정과제1 정성적기준 | ✅ 2.7 |
| 10 | 미리보기 기능 | 공고문 지정과제1 정성적기준 | ✅ 2.6 |
| 11 | GPT 기반 챕터 구조 재편성 | 사업계획서 2.과제주요내용 | ✅ 2.2 |
| 12 | LLM 기반 문단 요약 생성 | 사업계획서 2.과제주요내용 | ✅ 2.2 |
| 13 | 퀴즈/질문 자동 생성 | 사업계획서 2.과제주요내용 | ✅ 2.3 |
| 14 | TTS 기반 음성 파일 생성 + 텍스트 동기화 | 사업계획서 2.과제주요내용 | ✅ 2.3 |
| 15 | 미디어 오버레이 싱크 | 컨설팅 일지 (TTS보다 미디어 오버레이 우선) | ✅ 2.3 |
| 16 | HTML5 기반 상호작용 요소 (버튼, 링크, 팝업) | 사업계획서 2.과제주요내용 | ✅ 2.3 |
| 17 | CSS3/JS 기반 시각 레이아웃 | 사업계획서 2.과제주요내용 | ✅ 2.4 |
| 18 | ePub 3.0 Spec 3.2 기준 자동 패키징 | 사업계획서 2.과제주요내용 | ✅ 2.4 |
| 19 | 이미지/미디어 무결성 검증 | 사업계획서 2.과제주요내용 | ✅ 2.4 |
| 20 | 접근성 태그 자동 삽입 (KWCAG 2.1) | 사업계획서 2.과제주요내용 | ✅ 2.5 |
| 21 | 이미지 대체 텍스트(alt) 자동 생성 | 발표자료 접근성 체크리스트 | ✅ 2.5 |
| 22 | SaaS/API 형태 웹기반 배포 | 사업계획서 2.과제주요내용 | ✅ 2.8 |
| 23 | GUI 기반 업로드 및 변환 상태 모니터링 대시보드 | 사업계획서 2.과제주요내용 | ✅ 2.6 |
| 24 | 변환 결과 미리보기 | 사업계획서 2.과제주요내용 | ✅ 2.6 |
| 25 | 퀴즈 수정 인터페이스 | 사업계획서 2.과제주요내용 | ✅ 2.6 |
| 26 | 음성 품질 확인 인터페이스 | 사업계획서 2.과제주요내용 | ✅ 2.6 |
| 27 | 관리자용 변환 로그/에러 리포트 | 사업계획서 2.과제주요내용 | ✅ 2.6 |
| 28 | AI 변환 구간 하이라이팅 | 중간평가 조치계획서 | ✅ 2.6 |
| 29 | 원본/변환 Before/After 비교 | 발표자료 변환 실증 사례 | ✅ 2.6 |
| 30 | API 키 관리 (OpenAI, Anthropic, Stability, ElevenLabs) | 발표자료 설정 페이지 | ✅ 2.6 |
| 31 | 구독 플랜 관리 (스타터/프로/엔터프라이즈) | 발표자료 구독 관리 | ✅ 2.8 |
| 32 | AI 튜터 대화 인터페이스 | 발표자료 인터랙티브 독서 경험 | ✅ 2.3 |
| 33 | 실행 가능 코드 블록 | 발표자료 실습형 콘텐츠 | ✅ 2.3 |
| 34 | 이미지 자동 생성/추천 | 발표자료 장면 이미지 추가 | ✅ 2.3 |
| 35 | 일괄 변환 (대량 처리) | 발표자료 구독 플랜 | ✅ 2.6 |

### 9.2 KPI 체크리스트

| # | KPI | 목표치 | 출처 | 반영 여부 |
|---|-----|--------|------|-----------|
| 1 | ePubCheck 통과율 | ≥ 95% | 사업계획서 결과물평가지표 | ✅ 4.1 #1 |
| 2 | 퀴즈 HTML 오류율 | ≤ 1% | 사업계획서 결과물평가지표 | ✅ 4.1 #2 |
| 3 | 퀴즈 JSON 스키마 통과율 | ≥ 98% | 사업계획서 결과물평가지표 | ✅ 4.1 #3 |
| 4 | TTS 텍스트 싱크 정확도 | ≥ 98% | 사업계획서 결과물평가지표 | ✅ 4.1 #4 |
| 5 | TTS 무음 구간 비율 | ≤ 5% | 사업계획서 결과물평가지표 | ✅ 4.1 #5 |
| 6 | KWCAG 접근성 충족율 | ≥ 90% | 사업계획서 결과물평가지표 | ✅ 4.1 #6 |
| 7 | 인터랙션 요소 수 | ≥ 3종/권 | 사업계획서 결과물평가지표 | ✅ 4.1 #7 |
| 8 | API 응답시간 | ≤ 3초 | 사업계획서 결과물평가지표 | ✅ 4.1 #8 |
| 9 | 시스템 가용률 | ≥ 99.5% | 사업계획서 결과물평가지표 | ✅ 4.1 #9 |
| 10 | 자동 TC 통과율 | ≥ 90% | 사업계획서 결과물평가지표 | ✅ 4.1 #10 |
| 11 | 변환 후 구조 오류율 | ≤ 2% | 사업계획서 결과물평가지표 | ✅ 4.1 #11 |
| 12 | GitHub Actions 테스트 통과율 | 100% | 사업계획서 결과물평가지표 | ✅ 4.1 #12 |
| 13 | 문서화 커버리지 | ≥ 3건 | 사업계획서 결과물평가지표 | ✅ 4.1 #13 |
| 14 | 제작 시간 단축률 | 측정 필요 | 공고문 정량적기준 | ✅ (기존 수작업 대비 80% 이상 절감) |
| 15 | 구조 자동 인식 정확도 | 측정 필요 | 공고문 정량적기준 | ✅ (ePubCheck 통과율로 대체 측정) |
| 16 | 스타일 자동 일괄 적용률 | 측정 필요 | 공고문 정량적기준 | ✅ (TC #9로 검증) |
| 17 | 오류 가이드 정확도 및 제공률 | 측정 필요 | 공고문 정량적기준 | ✅ (사용성 인터뷰로 검증) |
| 18 | 초기 온보딩 구성 | 구현 여부 | 공고문 정량적기준 | ✅ 2.7 |

### 9.3 표준 준수 체크리스트

| # | 표준 | 적용 대상 | 반영 여부 |
|---|------|-----------|-----------|
| 1 | ePub 3.0 Spec 3.2 | 변환된 ePub 파일 구조 | ✅ 5.1 |
| 2 | KWCAG 2.1 | 변환된 ePub 콘텐츠 접근성 | ✅ 5.1 |
| 3 | EPUB Accessibility 1.1 (W3C) | ePub 접근성 메타데이터 | ✅ 5.1 |
| 4 | HTML5 | 콘텐츠 마크업 | ✅ 5.1 |
| 5 | CSS3 | 레이아웃, 스타일 | ✅ 5.1 |
| 6 | SMIL 3.0 | 미디어 오버레이 | ✅ 5.1 |
| 7 | WCAG 2.1 AA | 웹 대시보드 UI | ✅ 5.1 |
| 8 | ePubCheck 4.x 검증 통과 | 모든 변환 결과물 | ✅ 5.3 |
| 9 | Ace by DAISY 검증 통과 | 모든 변환 결과물 | ✅ 5.3 |

### 9.4 GitHub 공개 요구사항 체크리스트

| # | 요구사항 | 출처 | 반영 여부 |
|---|----------|------|-----------|
| 1 | 핵심 모듈 GitHub 공개 | 사업계획서 5.활용방안 | ✅ 7.1 |
| 2 | README.md (프로젝트 소개, 설치, 가이드) | 사업계획서 결과물평가지표 | ✅ 7.2 |
| 3 | API 명세서 (API.md) | 사업계획서 결과물평가지표 | ✅ 7.2 |
| 4 | FAQ 문서 | 사업계획서 결과물평가지표 | ✅ 7.2 |
| 5 | GitHub Actions CI/CD 자동 테스트 | 사업계획서 결과물평가지표 | ✅ 7.3 |
| 6 | 오픈소스 라이선스 명시 | 오픈소스 공개 전제 | ✅ 7.2 |
| 7 | CONTRIBUTING.md | 오픈소스 공개 전제 | ✅ 7.2 |
| 8 | 2년간 중소출판사 무상 제공 | 사업계획서 5.활용방안 | ✅ (구독 관리에 무상 이용권 기능 포함) |
| 9 | 샘플 콘텐츠 공개 | 사업계획서 추진계획 오픈소스화 | ✅ fixtures/ |

### 9.5 컨설팅/중간평가 피드백 반영 체크리스트

| # | 피드백 | 출처 | 반영 여부 |
|---|--------|------|-----------|
| 1 | 데이터 파싱 안정성을 최우선 과제로 | 컨설팅 일지 | ✅ 8.1 파싱 실패 처리 |
| 2 | 미디어 오버레이 싱크 기술 우선 | 컨설팅 일지 | ✅ 2.3 미디어 오버레이 싱크 |
| 3 | 화려한 인터랙션 비중 줄이기 | 중간평가 조치계획서 | ✅ 핵심 3종(TTS, 퀴즈, 팝업)에 집중 |
| 4 | 편집자 신뢰도 확보 (AI 변환 구간 하이라이팅) | 중간평가 조치계획서 | ✅ 2.6 하이라이팅 |
| 5 | 층화 표본 추출 (문학/비문학) | 중간평가 조치계획서 | ✅ 4.3 검증 파이프라인 |
| 6 | API Zero-Retention 정책 | 중간평가 조치계획서 | ✅ 8.4 보안 원칙 |
| 7 | 전송 구간 암호화 (HTTPS/SSL) | 중간평가 조치계획서 | ✅ 8.4 보안 원칙 |
| 8 | 데이터셋 범위 다양화 (비문학 포함) | 중간평가 조치계획서 | ✅ 6.3 데이터셋 |
| 9 | 용역 결과물 정기 점검 | 중간평가 조치계획서 | ✅ 6.3 데이터셋 품질 등급화 |
| 10 | 가이드라인 현직자 자문 검증 | 중간평가 조치계획서 | ✅ 4.2 정성적 기준 (FGI) |

---

## 10. 개발 우선순위 및 일정

중간평가 의견을 반영한 개발 우선순위:

```
[최우선] 데이터 파싱 안정성 + 구형 파일 뷰어 호환성
  → core/parser, core/analyzer, core/converter

[우선] 접근성 자동 적용 (TTS/대체텍스트)
  → core/accessibility, core/interaction/tts

[기본] 인터랙티브 요소 (퀴즈, 팝업, 이미지)
  → core/interaction/quiz, core/interaction/image

[병행] 웹 대시보드 UI
  → packages/web
```

일정:
- 2026.2: 전체 파이프라인 통합 + 내부 알파 테스트
- 2026.3: 유형별 실증 실험 (Beta) + 성능 최적화 + FGI
- 2026.4: 접근성 강화 + 베타 피드백 반영 + 공인성적서
- 2026.5: 웹 인터페이스 배포 + GitHub 오픈소스 공개
- 2026.6: 최종 보고서 + SaaS/API 설계

---

## 11. 코딩 컨벤션

- **언어**: TypeScript (strict mode)
- **패키지 매니저**: pnpm
- **모노레포**: pnpm workspace
- **린터**: ESLint (flat config) + Prettier
- **테스트**: Vitest
- **커밋**: Conventional Commits (feat/fix/docs/test/chore)
- **브랜치**: main (배포) / develop (개발) / feature/* (기능)
- **Node.js**: v20 LTS 이상

---

## 12. 구현 현황 및 개발 참고사항

> 이 섹션은 실제 개발 과정에서 축적된 실전 지식이다. 새 세션에서 빠르게 맥락을 잡는 데 활용한다.

### 12.1 현재 구현 상태 (2026-04-18 기준)

| 영역 | 상태 | 비고 |
|------|------|------|
| Core 엔진 (파서/변환/접근성/검증) | ✅ 완성 | 60 tests 전체 통과, `interactionCount` 실집계 반영 |
| AI 인터랙션 (퀴즈/TTS/이미지/튜터) | ✅ 완성 | Mock + Real 모드, 변환 파이프라인 직접 주입 |
| Web UI (7 페이지 + 15 API Routes) | ✅ 완성 | Next.js 16 App Router, Core 엔진 실제 연동 |
| API 서버 (Express, 16 엔드포인트) | ✅ 완성 | 로컬 개발용 |
| 문서 (9건) | ✅ 완성 | README, ARCHITECTURE, API, DEPLOY, FAQ, CONTRIBUTING, SIGIL, FINAL_REPORT, TEST_CERTIFICATE |
| GitHub Actions CI/CD | ✅ 완성 | 빌드 + 테스트 + 타입체크 |
| Docker / Docker Compose | ✅ 완성 | dev/production 멀티스테이지 |
| Vercel 배포 설정 | ✅ 완성 | maxDuration, 보안 헤더 설정 완료 |
| KPI 검증 스크립트 | ✅ 완성 | `scripts/validate-kpi.ts` (8 KPI) + `scripts/validate-kpi-extended.ts` (#2/#4/#5 정밀) |
| ePub 1,010권 데이터셋 | ✅ 완성 | `fixtures/dataset-1000/` (265.5 MB), SQLite 카탈로그, Gutenberg+Wikisource |
| 외주: 이비티솔루션 결과물 | ✅ 완료 | 결과보고서/납품서/검수조서 (MD+HTML+PDF) |
| 외주: 플락 결과물 | ✅ 완료 | 결과보고서/납품서/검수조서 + 카드뉴스 20세트 + 영상 2편 스크립트 |
| 프로덕션 DB (PostgreSQL) | ❌ 미구현 | 현재 인메모리 (Map) |
| 작업 큐 (Redis/BullMQ) | ❌ 미구현 | 시간 기반 progress 시뮬레이션 |
| 클라우드 스토리지 (GCS/S3) | ❌ 미구현 | 로컬 파일시스템 |
| 외부 ePubCheck CLI 연동 | ❌ 미구현 | 내장 validator만 사용 |

### 12.2 핵심 아키텍처 결정

**듀얼 API 모드:**
- **로컬**: Express 서버 (포트 3001) + Next.js (포트 3000), `NEXT_PUBLIC_API_URL=http://localhost:3001`
- **Vercel**: Next.js API Route Handlers (15개), `NEXT_PUBLIC_API_URL` 빈 문자열 = 상대 URL
- 모든 API 호출은 `packages/web/src/lib/api.ts`에서 중앙화

**Mock/Real 자동 전환:**
- `packages/core/src/interaction/ai-config.ts`에서 API 키 존재 여부 자동 감지
- 키 없음 → Mock 모드 (데모용 결과 생성), 키 있음 → 실제 API 호출
- 4개 API: `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `STABILITY_API_KEY`, `ANTHROPIC_API_KEY`

**데모 폴백 패턴:**
- 웹 페이지에서 `try { API 호출 } catch { DEMO_DATA 사용 }` 패턴 일관 적용
- API 서버 미연결 시에도 프론트엔드 단독 데모 가능

### 12.3 주요 명령어

```bash
pnpm install              # 전체 의존성 설치
pnpm dev                  # 웹 대시보드 (포트 3000)
pnpm dev:api              # API 서버 (포트 3001)
pnpm build                # 전체 빌드 (core → api → web)
pnpm test                 # 전체 테스트
pnpm clean                # 빌드 산출물 삭제
pnpm validate:kpi         # KPI 검증 스크립트 실행
docker compose up         # Docker 개발 환경 (3000 + 3001)

# 개별 패키지
pnpm --filter @gov-epub/core run build
pnpm --filter @gov-epub/core run test
pnpm --filter @gov-epub/web run build
```

### 12.4 핵심 파일 맵

```
packages/core/src/
├── index.ts                    # processEpub() — 전체 파이프라인 진입점
├── types.ts                    # 공유 타입 (EpubData, ConversionResult 등)
├── parser/index.ts             # ZIP 해제 → OPF/NCX/XHTML 파싱
├── converter/index.ts          # HTML5/CSS3/OPF3/Nav 변환 + 패키징
├── accessibility/index.ts      # KWCAG 2.1 접근성 태그 자동 삽입
├── validator/index.ts          # 구조/접근성/KPI 검증
├── interaction/ai-config.ts    # Mock/Real 모드 자동 감지
├── interaction/quiz/index.ts   # GPT-4 기반 퀴즈 생성
├── interaction/tts/index.ts    # ElevenLabs TTS + SMIL 미디어 오버레이
├── interaction/image/index.ts  # AI 이미지 추천/생성
└── interaction/tutor/index.ts  # AI 튜터 채팅 위젯

scripts/
└── validate-kpi.ts             # KPI 검증 — 7종 ePub 변환 + 지표 측정

packages/web/src/
├── app/page.tsx                # 메인 대시보드 (업로드 + 데모 플로우)
├── app/upload/page.tsx         # 업로드 페이지
├── app/convert/page.tsx        # 변환 진행 페이지 (가변 타이밍 데모)
├── app/preview/page.tsx        # Before/After 미리보기 (운수 좋은 날)
├── app/report/page.tsx         # KPI 리포트 (데모 자동 표시)
├── app/settings/page.tsx       # 설정 (API 키, Zero-Retention 안내)
├── app/guide/page.tsx          # 사용 가이드
├── app/api/                    # 15개 Next.js Route Handlers (Vercel용)
├── components/ui/waveform.tsx  # TTS 파형 시각화 컴포넌트
├── lib/api.ts                  # API 호출 중앙화 모듈
├── lib/auth.ts                 # 인증 유틸리티
├── lib/demo-data.ts            # 한국 문학 기반 데모 데이터 (운수 좋은 날)
├── lib/demo-flow.ts            # 원클릭 데모 오케스트레이터
└── lib/server/services.ts      # 서버리스 변환 서비스 (Vercel용)
```

### 12.5 기술적 주의사항

- **Buffer → Response**: Next.js Route Handler에서 `new Uint8Array(buffer)` 사용 필요
- **`__dirname`**: `next.config.ts`에서 사용 가능 (SWC가 CJS로 컴파일)
- **`dom-serializer`**: xmlMode에서 한국어가 `&#xHEX;` 엔티티로 인코딩됨
- **Vercel 빌드 순서**: pnpm monorepo에서 core를 먼저 빌드해야 함 (`vercel.json`에 설정됨)
- **Vercel Root Directory**: `packages/web` (`vercel.json`의 `installCommand`에서 `cd ../..` 후 `pnpm install`)
- **`next.config.ts`**: `outputFileTracingRoot` → monorepo root, `serverExternalPackages: ['@gov-epub/core']`
- **테스트 fixture**: `fixtures/` (3종 테스트 ePub) + `fixtures/samples/` (4종 공개 도메인)

### 12.6 UI/UX 디자인 원칙 (v2)

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 색상 | Rainbow gradient stat 카드 | 무채색 + 단일 accent (#4F46E5) |
| 버튼 | `bg-gradient-to-r from-X to-Y` | `bg-indigo-600` solid |
| 라운딩 | `rounded-2xl` 전부 | `rounded-lg` 기본, 카드 `rounded-xl` |
| 아이콘 | `Sparkles` 남발 | 맥락별 개별 아이콘 |
| 강조 | shadow 강조 | border 강조 (1px solid) |
| 빈 화면 | 데이터 없으면 빈 화면 | 데모 데이터 자동 표시 |
| 데모 콘텐츠 | 천문학 더미 텍스트 | 한국 문학 (운수 좋은 날, 현진건) |
| 사이드바 | 다크 gradient | 라이트 (bg-white, border-r) |
| TTS | 단순 프로그레스 바 | CSS 파형 시각화 (waveform.tsx) |
| 데모 플로우 | 수동 (파일 업로드 필요) | 원클릭 자동 (대시보드 → 변환 → 미리보기) |

### 12.7 Git 이력

| 커밋 | 내용 |
|------|------|
| `b17e7ef` | feat: 초기 구현 (96 files, 27K lines) |
| `6212560` | feat: Vercel 배포 지원 — Next.js API Route Handlers |
| `eaff20b` | chore: CI/CD, Docker, LICENSE 추가 및 문서 업데이트 |
| `004514b` | feat: 프리미엄 UI/UX 오버홀 및 원클릭 데모 플로우 |
| `dd8415e` | fix: API 패키지 TypeScript 타입 에러 수정 |

### 12.8 남은 작업 (향후)

- 실제 AI API 연동 (API 키 설정 후 Mock → Real 전환)
- 프로덕션 DB/스토리지 연동 (PostgreSQL, GCS/S3)
- 비동기 작업 큐 (BullMQ + Redis)
- 외부 ePubCheck CLI / Ace by DAISY 연동
- 실제 ePub 1,000권 대량 변환 실증 테스트
- FGI (출판사 인터뷰) 피드백 반영

---

## 13. 대화 스타일 및 작업 규칙

### 13.1 언어 규칙

- **대화 언어**: 한국어
- **코드/커밋 메시지/변수명**: 영어
- **커밋 메시지 본문**: 한글 설명 가능 (제목은 Conventional Commits 영어)

### 13.2 작업 방식

- 지시하면 바로 실행. 확인 질문 최소화.
- 간결하고 직접적인 대화 톤. 불필요한 존댓말 지양.
- 에러 발생 시 직접 고치고, CI 통과까지 확인.
- 코드에 과도한 주석 지양. 기존 패턴 따르기.
- 새 파일 생성보다 기존 파일 수정 우선.

### 13.3 코드 스타일

- TypeScript strict, ESM
- Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- 기존 코드베이스 패턴/구조를 최대한 따른다
- 불필요한 타입 어노테이션, docstring 추가 지양
