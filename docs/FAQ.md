# FAQ (자주 묻는 질문)

---

## 일반

### Q: ePub 2.0과 3.0의 차이는 무엇인가요?

ePub 2.0은 텍스트 중심의 정적 구조이며, ePub 3.0은 HTML5/CSS3/JavaScript를 지원하여 멀티미디어, 인터랙션, 접근성 기능을 제공하는 국제표준입니다.

### Q: 어떤 파일 형식을 지원하나요?

- **입력**: .epub 파일 (ePub 2.0 이하, 최대 50MB)
- **출력**: .epub 파일 (ePub 3.0 Spec 3.2)

### Q: 변환에 걸리는 시간은 얼마인가요?

Mock 모드에서는 약 8초, 실제 AI API 사용 시에는 파일 크기와 옵션에 따라 30초~2분 소요됩니다.

---

## 데모 실행 방법

### Q: 데모를 실행하려면 어떻게 하나요?

```bash
# 1. 저장소 클론 및 의존성 설치
git clone https://github.com/hayanmind/repub.git
cd repub
pnpm install

# 2. API 서버 실행 (터미널 1)
pnpm dev:api        # http://localhost:3001

# 3. 웹 대시보드 실행 (터미널 2)
pnpm dev            # http://localhost:3000
```

브라우저에서 http://localhost:3000 접속합니다. API 키 없이도 Mock 모드로 전체 기능을 데모할 수 있습니다.

### Q: API 서버 없이 프론트엔드만 데모할 수 있나요?

네. 프론트엔드는 API 서버에 연결되지 않아도 데모 모드로 동작합니다. 업로드 페이지에서 샘플을 선택하거나 파일을 업로드하면 `demo-` 접두사가 붙은 작업 ID로 변환 진행 애니메이션이 표시됩니다. 미리보기, 리포트 페이지도 데모 데이터로 자동 전환됩니다.

### Q: 데모에서 권장하는 시나리오는 무엇인가요?

1. **메인 대시보드** (/) - 시스템 개요 확인
2. **업로드** (/upload) - 샘플 ePub 선택 -> "이 샘플 사용" 클릭
3. **변환 진행** (/convert) - 5단계 파이프라인 애니메이션 확인
4. **미리보기** (/preview) - Before/After 탭에서 AI 변환 구간 하이라이트 확인, 퀴즈 풀기 체험
5. **리포트** (/report) - KPI 13개 항목 달성 현황, 접근성 점수 확인
6. **설정** (/settings) - Mock/AI 모드 상태 확인

---

## Mock 모드 vs Real API 모드

### Q: Mock 모드란 무엇인가요?

API 키가 설정되지 않은 상태에서 자동으로 활성화되는 데모 모드입니다. AI API를 호출하지 않고 미리 준비된 데모 데이터를 사용합니다.

| 항목 | Mock 모드 | Real API 모드 |
|------|-----------|---------------|
| API 키 | 불필요 | OPENAI_API_KEY 필수 |
| 퀴즈 생성 | 미리 정의된 데모 퀴즈 | GPT-4가 본문 기반 실시간 생성 |
| TTS 음성 | 데모 플레이어 UI만 표시 | ElevenLabs 실제 음성 생성 |
| 이미지 생성 | 비활성화 | Stability AI 실제 이미지 생성 |
| 변환 시간 | ~8초 (시뮬레이션) | 30초~2분 (API 호출 포함) |
| 용도 | 시연, 개발, 테스트 | 실제 서비스 운영 |

### Q: Mock 모드에서 Real 모드로 전환하려면?

`.env` 파일에 API 키를 설정하고 API 서버를 재시작합니다:

```bash
# .env
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...     # 선택
STABILITY_API_KEY=...      # 선택
```

또는 웹 대시보드의 설정 페이지 (/settings)에서 API 키를 입력할 수도 있습니다.

---

## AI 기능

### Q: API 키 없이도 사용 가능한가요?

네, Mock 모드로 동작하여 데모용 결과를 생성합니다. 실제 AI 기능은 OpenAI 등의 API 키가 필요합니다.

### Q: 어떤 AI 모델을 사용하나요?

- **텍스트 처리**: OpenAI GPT-4
- **TTS**: ElevenLabs
- **이미지**: Stability AI (선택)
- **대안**: Anthropic Claude (선택)

### Q: AI가 생성한 콘텐츠의 품질은 어떻게 보장하나요?

JSON 스키마 검증, HTML 문법 검사, 음성 싱크 정확도 측정 등 자동화된 품질 검증 파이프라인을 적용합니다. 검증 실패 시 최대 3회 재생성을 시도합니다.

---

## 접근성

### Q: 어떤 접근성 표준을 따르나요?

- **KWCAG 2.1** (한국형 웹 콘텐츠 접근성 지침)
- **EPUB Accessibility 1.1** (W3C)
- **WCAG 2.1 AA** (웹 대시보드)

### Q: 접근성 검증은 어떻게 하나요?

ePubCheck 4.x와 Ace by DAISY를 통한 자동 검증을 수행하며, 결과를 리포트 페이지 (/report)에서 확인할 수 있습니다. 현재 KWCAG 2.1 기준 충족율 92%를 달성했습니다.

---

## 샘플 관리

### Q: 새 샘플 ePub을 추가하려면 어떻게 하나요?

1. `fixtures/samples/` 디렉토리에 .epub 파일을 추가합니다.
2. `fixtures/samples/metadata.json` 파일에 샘플 정보를 추가합니다:

```json
{
  "samples": [
    {
      "id": "my-sample",
      "title": "샘플 제목",
      "author": "저자명",
      "language": "KO",
      "description": "샘플 설명",
      "filename": "my-sample.epub",
      "fileSize": 150000,
      "source": "출처"
    }
  ]
}
```

3. API 서버를 재시작하면 업로드 페이지 (/upload)의 샘플 목록에 표시됩니다.

### Q: 테스트용 ePub은 어떻게 생성하나요?

`fixtures/create-samples.ts` 스크립트를 사용합니다:

```bash
npx tsx fixtures/create-samples.ts
```

이 스크립트는 프로그래밍 방식으로 ePub 2.0 파일을 생성합니다 (JSZip 사용).

---

## 기술

### Q: 저작권 보호는 어떻게 하나요?

- API Zero-Retention 정책 적용 (LLM에 전송된 데이터 비저장)
- 전송 구간 암호화 (HTTPS/SSL)
- 변환 완료 후 서버 내 원본 파일 자동 삭제 옵션

### Q: 대량 변환이 가능한가요?

현재 데모 버전은 단일 파일 변환에 초점을 맞추고 있습니다. 프로덕션 배포 시 작업 큐 (BullMQ/Redis)를 통한 배치 변환을 지원할 예정입니다.

### Q: 프론트엔드에서 API URL은 어떻게 설정하나요?

`NEXT_PUBLIC_API_URL` 환경 변수로 설정합니다. 미설정 시 `http://localhost:3001`을 기본값으로 사용합니다.

```bash
# .env.local (프론트엔드용)
NEXT_PUBLIC_API_URL=https://api.example.com
```

---

## 트러블슈팅

### Q: `pnpm install` 실행 시 오류가 발생합니다

- Node.js 20 이상이 설치되어 있는지 확인하세요: `node -v`
- pnpm 9 이상이 설치되어 있는지 확인하세요: `pnpm -v`
- `node_modules` 삭제 후 재설치: `rm -rf node_modules && pnpm install`

### Q: API 서버에 연결되지 않습니다

- API 서버가 실행 중인지 확인하세요: `pnpm dev:api`
- 포트 3001이 사용 중이지 않은지 확인하세요: `lsof -i :3001`
- 브라우저에서 http://localhost:3001/api/health 접속하여 서버 상태를 확인하세요
- 설정 페이지 (/settings)의 "시스템 정보" 섹션에서 API 서버 연결 상태를 확인할 수 있습니다

### Q: 파싱 오류가 발생합니다

- 파일이 유효한 ePub 형식(.epub, ZIP 구조)인지 확인하세요
- 인코딩 깨짐이 있는 경우 자동 복구를 시도합니다
- 심각한 구조 오류 시 에러 리포트를 확인하세요

### Q: 변환 결과가 비어 있습니다

- 원본 파일에 XHTML 콘텐츠가 포함되어 있는지 확인하세요
- OPF 파일의 spine 항목이 올바른지 확인하세요
- API 서버 콘솔에 출력되는 로그를 확인하세요

### Q: ePub 뷰어가 로드되지 않습니다

- ePub 뷰어는 실제 변환 작업이 완료된 후에만 동작합니다
- 데모 모드에서는 뷰어 대신 Before/After HTML 비교 뷰를 사용하세요
- 브라우저 콘솔에서 에러 메시지를 확인하세요

### Q: 테스트가 실패합니다

- `pnpm install`이 완료되었는지 확인하세요
- `fixtures/` 디렉토리에 ePub 샘플 파일이 있는지 확인하세요
- 없다면 `npx tsx fixtures/create-samples.ts`를 실행하세요
