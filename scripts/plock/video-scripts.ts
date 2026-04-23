/**
 * Narration scripts + timeline data for Plock's 4 deliverable videos.
 * Used by generate-narration.sh (macOS `say`) and build-video.sh (ffmpeg).
 */

export interface Scene {
  id: string;
  duration: number; // seconds
  narration: string; // Korean narration (macOS `say`)
  subtitle: string; // On-screen caption (SRT)
  image: string; // Path relative to scripts/plock/assets/ or absolute card PNG
  transition?: 'fade' | 'cut';
}

export interface VideoScript {
  id: 'demo-full' | 'demo-short' | 'promo-full' | 'promo-short';
  title: string;
  totalDuration: number;
  scenes: Scene[];
}

// Asset paths
const A = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets';
const BG = '/Users/jmoh/Workspace/gov-epub-2026/scripts/plock/assets/bg/video';
const PNG = '/Users/jmoh/Workspace/gov-epub-2026-docs/outsourcing/plock/결과물/산출물/01-카드뉴스/PNG';

export const demoFull: VideoScript = {
  id: 'demo-full',
  title: 'RePub 서비스 데모 (풀 4분)',
  totalDuration: 240,
  scenes: [
    {
      id: 's01-title',
      duration: 8,
      narration: '리펍. 낡은 이펍에 새로운 감각을 불어넣는, 에이아이(AI) 리마스터링 도구입니다.',
      subtitle: 'RePub — ePub 3.0 인터랙티브 리마스터링',
      image: `${BG}/title.jpg`,
    },
    {
      id: 's02-problem',
      duration: 18,
      narration: '국내 전자책의 칠십 퍼센트는 여전히 이펍 이 점 영 형식에 머물러 있습니다. 구조는 어긋나 있고, 접근성 표준을 만족하지 못하며, 인터랙티브 기능도 부족하죠. 소중한 콘텐츠의 가치가 낡은 포맷에 갇혀버리는 안타까운 현실입니다.',
      subtitle: '문제: 국내 전자책의 70%가 여전히 ePub 2.0 형식',
      image: `${PNG}/01-서비스소개/세트1-ePub30변환_클릭한번/02-blog.png`,
    },
    {
      id: 's03-landing',
      duration: 20,
      narration: '리펍은 이 문제를, 웹에서 단 한 번의 업로드로 해결합니다. 이펍 파일을 올리면, 에이아이가 구조를 분석하고, 이펍 삼 점 영 표준으로 재조립합니다. 접근성과 인터랙션까지 자동 삽입되어, 바로 다운로드할 수 있습니다.',
      subtitle: '단 한 번의 업로드로 ePub 3.0 변환',
      image: `${BG}/landing.jpg`,
    },
    {
      id: 's04-upload',
      duration: 22,
      narration: '리펍 대시보드에 접속한 뒤, 이펍 파일을 드래그하여 업로드 영역에 놓기만 하면 됩니다. 파일 검증과 구조 분석이 즉시 시작되죠. 여러 권을 한꺼번에 처리하는 배치 변환도 지원하며, 진행 상황은 실시간 프로그레스 바로 확인하실 수 있습니다.',
      subtitle: '1단계 — 파일 업로드, 개별·배치 지원',
      image: `${PNG}/04-도입가이드/세트1-3분시작/02-blog.png`,
    },
    {
      id: 's05-convert',
      duration: 30,
      narration: '업로드가 끝나면 다섯 단계의 변환 파이프라인이 자동으로 진행됩니다. 파서가 내부 파일을 해체하고, 에이아이가 문서 구조를 재해석하죠. 이어서 퀴즈와 티티에스 음성, 용어 팝업이 삽입되고, 이펍 삼 점 영 표준으로 패키징된 뒤, 이펍체크 유효성 검증이 완료됩니다. 평균 변환 시간은 한 권당 삼 초에 불과합니다.',
      subtitle: '2단계 — 5단계 파이프라인 자동 실행',
      image: `${PNG}/02-기술차별점/세트3-인터랙션자동화/02-blog.png`,
    },
    {
      id: 's06-preview',
      duration: 26,
      narration: '변환이 완료되면 비포 앤 애프터 미리보기로 즉시 확인하세요. 왼쪽은 원본 이펍 이 점 영, 오른쪽은 리펍으로 리마스터링된 이펍 삼 점 영 결과물입니다. 자동 삽입된 퀴즈, 티티에스 음성, 용어 팝업, 대체 텍스트까지 한 화면에서 비교하고, 수정할 부분은 바로 편집할 수 있습니다.',
      subtitle: '3단계 — Before / After 비교 미리보기',
      image: `${PNG}/02-기술차별점/세트2-AI구조분석/02-blog.png`,
    },
    {
      id: 's07-report',
      duration: 28,
      narration: '리포트 페이지에서는 이펍체크 통과율, 접근성 점수, 인터랙션 개수, 티티에스 싱크 정확도 등 정량 지표 열세 개 항목을 리펍이 자동으로 측정하여 시각화합니다. 실제 검증 결과, 이펍체크 통과율은 구십오 퍼센트 이상, 접근성은 구십칠 점 구 퍼센트를 달성했습니다.',
      subtitle: '4단계 — KPI 리포트 자동 생성, 13개 지표',
      image: `${PNG}/02-기술차별점/세트1-시간비용절감/03-blog.png`,
    },
    {
      id: 's08-accessibility',
      duration: 22,
      narration: '접근성은 리펍이 자동으로 적용합니다. 이미지에는 대체 텍스트가, 구조에는 시맨틱 태그가, 링크에는 에이리아 속성이 부여되죠. 케이더블유시에이지 이 점 일과, 이펍 액세서빌리티 일 점 일 표준을 함께 준수하여, 구십 퍼센트 이상의 적합성을 확보합니다.',
      subtitle: 'KWCAG 2.1 접근성 자동 적용',
      image: `${PNG}/02-기술차별점/세트4-접근성자동적용/01-blog.png`,
    },
    {
      id: 's09-opensource',
      duration: 20,
      narration: '리펍의 모든 핵심 엔진은 깃허브에 엠아이티 라이선스로 공개될 예정입니다. 파서, 변환기, 접근성 엔진, 검증기까지 누구나 가져다 쓰고 확장할 수 있죠. 중소 출판사에는 이 년간 무상으로 제공됩니다.',
      subtitle: 'GitHub MIT 오픈소스 · 중소출판사 2년 무상',
      image: `${PNG}/01-서비스소개/세트1-ePub30변환_클릭한번/01-blog.png`,
    },
    {
      id: 's10-cta',
      duration: 16,
      narration: '지금 리펍 서비스에 접속해서, 오래 닫혀 있던 당신의 책을 다시 꺼내 보세요. 낡은 책에, 새로운 감각을. (주)하얀마인드가 개발한 리펍이 함께합니다.',
      subtitle: 'epub-remastering.hayanmind.com',
      image: `${BG}/cta.jpg`,
    },
  ],
};

export const demoShort: VideoScript = {
  id: 'demo-short',
  title: 'RePub 서비스 데모 (45초)',
  totalDuration: 45,
  scenes: [
    {
      id: 's01-hook',
      duration: 6,
      narration: '오랜 시간, 수많은 이야기가 낡은 책 속에 조용히 잠들어 있었습니다.',
      subtitle: '닫힌 책, 잊혀진 이야기',
      image: `${PNG}/01-서비스소개/세트1-ePub30변환_클릭한번/01-ig.png`,
    },
    {
      id: 's02-upload',
      duration: 10,
      narration: '리펍 대시보드에 이펍 파일을 끌어다 놓으세요. 한 권이든 수십 권이든, 일괄 변환으로 빠르게 처리됩니다.',
      subtitle: 'RePub: 파일 업로드 — 배치 지원',
      image: `${PNG}/04-도입가이드/세트1-3분시작/02-ig.png`,
    },
    {
      id: 's03-convert',
      duration: 12,
      narration: '평균 삼 초, 리펍이 변환을 완료합니다. 이펍 삼 점 영 패키징과 퀴즈, 티티에스, 접근성까지 자동으로 적용되죠.',
      subtitle: 'RePub: 3초 변환 · ePub 3.0 · 인터랙티브 & 접근성',
      image: `${PNG}/02-기술차별점/세트3-인터랙션자동화/02-ig.png`,
    },
    {
      id: 's04-preview',
      duration: 10,
      narration: '변환 전후 미리보기로, 원본과 리펍의 결과물을 즉시 비교하고 필요한 부분을 바로 편집하세요.',
      subtitle: 'RePub: Before / After 즉시 비교 & 편집',
      image: `${PNG}/02-기술차별점/세트2-AI구조분석/02-ig.png`,
    },
    {
      id: 's05-cta',
      duration: 7,
      narration: '지금 바로 리펍에서 무료로 시작해 보세요. 당신의 책이 두 번째 삶을 기다립니다.',
      subtitle: 'epub-remastering.hayanmind.com',
      image: `${BG}/cta.jpg`,
    },
  ],
};

export const promoFull: VideoScript = {
  id: 'promo-full',
  title: 'RePub: 책의 새로운 시작 (3분 30초)',
  totalDuration: 210,
  scenes: [
    {
      id: 's01-open',
      duration: 12,
      narration: '오랫동안, 책은 닫혀 있었습니다. 접근하기 어려운 독자에게도, 낡은 형식의 파일에게도, 새로운 독서 경험을 바라는 이들에게도 말입니다.',
      subtitle: '닫혀 있던 책, 다시 열릴 시간입니다.',
      image: `${PNG}/01-서비스소개/세트3-낡은ePub리마스터링/01-blog.png`,
    },
    {
      id: 's02-vision',
      duration: 18,
      narration: '이제, 리펍이 닫혀 있던 책을 다시 엽니다. 에이아이가 문장 구조를 재해석하고, 글자에 목소리를 불어넣으며, 이미지에 자세한 설명을 더합니다. 모두가 함께 읽을 수 있는 형태로, 책의 새로운 장을 펼칩니다.',
      subtitle: 'RePub, 닫혀 있던 책을 다시 엽니다.',
      image: `${PNG}/01-서비스소개/세트4-접근성자동/01-blog.png`,
    },
    {
      id: 's03-market',
      duration: 24,
      narration: '국내 전자책 시장은 꾸준히 성장하고 있지만, 이펍 삼 점 영 전환율은 여전히 삼십 퍼센트에 머물러 있습니다. 수십만 권의 소중한 콘텐츠가 낡은 포맷 속에 잠들어 있고, 출판사는 이를 다시 만드는 부담에 주저하고 있습니다.',
      subtitle: 'ePub 3.0 전환율 30% · 낡은 포맷 속 수십만 권의 책',
      image: `${PNG}/05-시장트렌드/세트1-국내전자책/01-blog.png`,
    },
    {
      id: 's04-tech',
      duration: 28,
      narration: '리펍은 파서, 변환기, 접근성 엔진, 그리고 검증기를 하나의 강력한 파이프라인으로 통합했습니다. 천십 권 규모의 방대한 데이터셋으로 학습하고 검증을 마쳤습니다. 편집자가 이 주간 매달리던 복잡한 작업이, 이제 리펍의 에이아이 기술로는 단 삼십 분 만에 완성됩니다.',
      subtitle: 'RePub AI, 편집자 2주의 작업을 30분으로 단축',
      image: `${PNG}/02-기술차별점/세트1-시간비용절감/01-blog.png`,
    },
    {
      id: 's05-cases',
      duration: 30,
      narration: '리펍은 중소 출판사의 낡은 도서를 새로운 디지털 콘텐츠로 되살립니다. 교육기관의 교재는 퀴즈와 음성이 더해진 인터랙티브 학습 자료로 전환됩니다. 도서관과 공공기관의 방대한 아카이브 역시 접근성 표준에 맞춰 새롭게 태어납니다. 이미 수많은 출판 현장이 리펍과 함께, 책의 두 번째 삶을 시작하고 있습니다.',
      subtitle: '출판사 · 교육기관 · 도서관 · 공공기관, RePub과 함께',
      image: `${PNG}/03-활용사례/세트1-출판사/01-blog.png`,
    },
    {
      id: 's06-accessibility',
      duration: 24,
      narration: '접근성은 선택이 아닌, 책이 마땅히 지켜야 할 기본 가치입니다. 시각장애 독자, 청각장애 학생, 그리고 노년층 독자까지, 모두가 같은 문장을 함께 읽을 수 있어야 합니다. 리펍은 케이더블유시에이지 이 점 일과 이펍 액세서빌리티 일 점 일 표준을 자동으로 준수하며, 모두에게 열린 독서를 제공합니다.',
      subtitle: 'RePub, 모두에게 열린 책을 만듭니다.',
      image: `${PNG}/02-기술차별점/세트4-접근성자동적용/01-blog.png`,
    },
    {
      id: 's07-opensource',
      duration: 22,
      narration: '(주)하얀마인드는 이 기술을 깃허브에 엠아이티 라이선스 오픈소스로 공개합니다. 특히 중소 출판사에는 이 년간 무상으로 리펍 기술을 제공합니다. 기술이 독점되지 않아야만, 책은 비로소 모두에게 열릴 수 있습니다. 책은 본래 모두의 것이기 때문입니다.',
      subtitle: 'RePub, GitHub MIT 오픈소스 · 2년 무상 제공',
      image: `${PNG}/05-시장트렌드/세트4-AI퍼블리싱전망/01-blog.png`,
    },
    {
      id: 's08-outro',
      duration: 16,
      narration: '낡은 책에 새로운 감각을, 닫혀 있던 이야기에 다시 숨결을. 이제 리펍이 당신의 책과 함께, 새로운 독서의 장을 활짝 열어갑니다. 이펍-리마스터링-하얀마인드-닷컴',
      subtitle: 'RePub: 낡은 책에 새로운 감각을. epub-remastering.hayanmind.com',
      image: `${BG}/cta.jpg`,
    },
  ],
};

export const promoShort: VideoScript = {
  id: 'promo-short',
  title: 'RePub - 책의 두 번째 삶 (30초)',
  totalDuration: 30,
  scenes: [
    {
      id: 's01-hook',
      duration: 6,
      narration: '책은 오랫동안, 너무 오래, 조용히 닫혀 있었습니다.',
      subtitle: '책은 닫혀 있었습니다.',
      image: `${PNG}/01-서비스소개/세트3-낡은ePub리마스터링/01-ig.png`,
    },
    {
      id: 's02-open',
      duration: 7,
      narration: '이제 리펍이, 닫혀 있던 그 책을, 다시 세상으로 꺼냅니다.',
      subtitle: 'RePub, 책을 다시 열다',
      image: `${PNG}/01-서비스소개/세트4-접근성자동/01-ig.png`,
    },
    {
      id: 's03-tech',
      duration: 8,
      narration: '리펍의 에이아이가, 이펍 삼 점 영으로 완벽하게 변환하고, 접근성과 상호작용까지 자동으로 적용합니다.',
      subtitle: 'RePub의 AI, ePub 3.0 · 접근성 · 인터랙션 자동 구현',
      image: `${PNG}/02-기술차별점/세트1-시간비용절감/01-ig.png`,
    },
    {
      id: 's04-cta',
      duration: 9,
      narration: '낡은 책에 새로운 생명을, 잊혀진 이야기에 새로운 감각을. 지금 이펍 리마스터링 서비스에서, 리펍을 경험해 보세요.',
      subtitle: 'epub-remastering.hayanmind.com',
      image: `${BG}/cta.jpg`,
    },
  ],
};

export const ALL_VIDEOS: VideoScript[] = [demoFull, demoShort, promoFull, promoShort];
