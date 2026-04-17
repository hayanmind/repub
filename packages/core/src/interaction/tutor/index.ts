/**
 * AI Tutor Module
 *
 * Generates embeddable JavaScript code for interactive Q&A in ePub readers.
 * Real mode uses OpenAI to generate context-aware Q&A pairs.
 * Mock mode creates a convincing chat UI with predefined Korean Q&A pairs.
 */

import type { AiConfig } from '../types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a self-contained JavaScript snippet that can be embedded in an
 * ePub XHTML document to provide an interactive AI tutor chat interface.
 *
 * The generated script creates a floating chat widget that allows readers
 * to ask questions about the chapter content.
 */
export function createTutorScript(
  chapterText: string,
  config: AiConfig,
): string {
  if (config.useMock) {
    return createMockTutorScript(chapterText);
  }

  return createRealTutorScript(chapterText, config);
}

// ---------------------------------------------------------------------------
// Real Implementation
// ---------------------------------------------------------------------------

function createRealTutorScript(
  chapterText: string,
  config: AiConfig,
): string {
  // In real mode we embed a script that calls an API endpoint.
  // The API key is NOT embedded; instead the script expects a proxy endpoint.
  const truncated = chapterText.slice(0, 3000).replace(/'/g, "\\'").replace(/\n/g, '\\n');

  return `
(function() {
  'use strict';

  var CONTEXT = '${truncated}';
  var API_KEY = ''; // Set via epub reader configuration, never hardcoded

  ${getChatWidgetCSS()}
  ${getChatWidgetHTML()}

  var chatHistory = [];

  function sendMessage(userMsg) {
    if (!userMsg.trim()) return;
    appendMessage('user', userMsg);
    chatHistory.push({ role: 'user', content: userMsg });
    setLoading(true);

    fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (window.__EPUB_AI_KEY || API_KEY)
      },
      body: JSON.stringify({
        model: 'gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content: '당신은 한국 정부 발간물 학습 도우미입니다. 다음 본문 내용을 바탕으로 질문에 답변하세요. 정확하고 친절하게 한국어로 답변하세요.\\n\\n본문:\\n' + CONTEXT
          }
        ].concat(chatHistory),
        temperature: 0.5,
        max_tokens: 500
      })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var reply = data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '죄송합니다. 응답을 생성하지 못했습니다.';
      chatHistory.push({ role: 'assistant', content: reply });
      appendMessage('assistant', reply);
    })
    .catch(function() {
      appendMessage('assistant', '네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    })
    .finally(function() {
      setLoading(false);
    });
  }

  ${getChatWidgetLogic()}
})();
`.trim();
}

// ---------------------------------------------------------------------------
// Mock Implementation
// ---------------------------------------------------------------------------

function createMockTutorScript(chapterText: string): string {
  // Extract key terms from the chapter text for building Q&A pairs
  const qaPairs = buildMockQAPairs(chapterText);
  const qaJson = JSON.stringify(qaPairs, null, 2).replace(/<\/script>/gi, '<\\/script>');

  return `
(function() {
  'use strict';

  var QA_PAIRS = ${qaJson};

  var FALLBACK_ANSWERS = [
    '좋은 질문입니다. 이 장에서 다루는 핵심 내용은 정책의 효과적인 실행과 국민 참여를 강조하고 있습니다.',
    '해당 내용은 본문의 주요 개념과 관련이 있습니다. 특히 정부의 역할과 책임에 대해 살펴볼 수 있습니다.',
    '이 부분에 대해서는 본문의 관련 절을 참고하시면 더 자세한 정보를 얻으실 수 있습니다.',
    '정부 정책의 맥락에서 이 질문을 살펴보면, 국민 중심의 행정 서비스 제공이 핵심 목표입니다.',
    '이 주제는 여러 관점에서 접근할 수 있습니다. 본문에서는 특히 제도적 개선 방안을 중심으로 설명하고 있습니다.'
  ];

  ${getChatWidgetCSS()}
  ${getChatWidgetHTML()}

  function findAnswer(userMsg) {
    var msg = userMsg.toLowerCase();
    for (var i = 0; i < QA_PAIRS.length; i++) {
      var keywords = QA_PAIRS[i].keywords;
      for (var k = 0; k < keywords.length; k++) {
        if (msg.indexOf(keywords[k]) !== -1) {
          return QA_PAIRS[i].answer;
        }
      }
    }
    return FALLBACK_ANSWERS[Math.floor(Math.random() * FALLBACK_ANSWERS.length)];
  }

  function sendMessage(userMsg) {
    if (!userMsg.trim()) return;
    appendMessage('user', userMsg);
    setLoading(true);

    // Simulate network delay for realistic feel
    setTimeout(function() {
      var answer = findAnswer(userMsg);
      appendMessage('assistant', answer);
      setLoading(false);
    }, 800 + Math.random() * 1200);
  }

  ${getChatWidgetLogic()}
})();
`.trim();
}

// ---------------------------------------------------------------------------
// Mock Q&A Builder
// ---------------------------------------------------------------------------

interface MockQAPair {
  keywords: string[];
  answer: string;
}

function buildMockQAPairs(chapterText: string): MockQAPair[] {
  const text = chapterText.toLowerCase();
  const pairs: MockQAPair[] = [];

  // Always include generic government publication Q&A
  pairs.push(
    {
      keywords: ['목적', '목표', '왜'],
      answer:
        '이 장의 주요 목적은 정책의 기본 방향과 실행 전략을 제시하는 것입니다. 국민의 삶의 질 향상과 지속 가능한 발전을 위한 구체적인 방안을 담고 있습니다.',
    },
    {
      keywords: ['요약', '정리', '핵심'],
      answer:
        '핵심 내용을 정리하면 다음과 같습니다: 1) 현황 분석을 통한 문제점 도출, 2) 정책 목표 및 추진 전략 수립, 3) 세부 실행 계획 제시, 4) 기대 효과 및 향후 과제 정리입니다.',
    },
    {
      keywords: ['어떻게', '방법', '절차', '과정'],
      answer:
        '실행 절차는 크게 4단계로 구성됩니다. 먼저 현황을 분석하고, 이를 바탕으로 계획을 수립합니다. 그 다음 계획에 따라 실행하며, 마지막으로 성과를 평가하고 피드백을 반영합니다.',
    },
    {
      keywords: ['누구', '대상', '담당'],
      answer:
        '이 정책의 주요 대상은 국민 전체이며, 특히 관련 분야의 이해관계자들이 직접적인 영향을 받습니다. 담당 부처와 지방자치단체가 협력하여 추진합니다.',
    },
  );

  // Add context-specific Q&A based on detected themes
  if (text.includes('디지털') || text.includes('정보') || text.includes('데이터')) {
    pairs.push(
      {
        keywords: ['디지털', '전환', '혁신'],
        answer:
          '디지털 전환은 기존의 아날로그 방식의 행정 서비스를 디지털 기술을 활용하여 혁신하는 것을 의미합니다. 클라우드, AI, 빅데이터 등의 기술을 통해 국민 맞춤형 서비스를 제공하는 것이 목표입니다.',
      },
      {
        keywords: ['보안', '개인정보', '보호'],
        answer:
          '개인정보 보호는 디지털 정부의 핵심 과제입니다. 개인정보보호법에 따라 최소 수집 원칙을 준수하고, 암호화 및 접근 제어 등 기술적 보호 조치를 적용합니다.',
      },
    );
  }

  if (text.includes('환경') || text.includes('탄소') || text.includes('기후')) {
    pairs.push(
      {
        keywords: ['탄소', '중립', '넷제로'],
        answer:
          '탄소중립(넷제로)이란 인간 활동에 의한 온실가스 배출을 최대한 줄이고, 남은 배출량은 흡수하여 실질적인 배출량이 0이 되도록 하는 것입니다. 대한민국은 2050년까지 이를 달성하는 것을 목표로 하고 있습니다.',
      },
      {
        keywords: ['재생', '에너지', '신재생'],
        answer:
          '재생에너지는 태양광, 풍력, 수력, 지열 등 자연에서 지속적으로 얻을 수 있는 에너지원을 말합니다. 화석 연료 의존도를 줄이고 탄소 배출을 감축하기 위해 재생에너지 확대가 핵심 정책으로 추진되고 있습니다.',
      },
    );
  }

  if (text.includes('교육') || text.includes('학습') || text.includes('인재')) {
    pairs.push(
      {
        keywords: ['교육', '학습', '훈련'],
        answer:
          '교육 정책은 미래 인재 양성을 핵심 목표로 합니다. 디지털 역량 강화, 평생교육 체계 구축, 맞춤형 학습 지원 등을 통해 국민의 역량을 높이는 것을 지향합니다.',
      },
      {
        keywords: ['인재', '역량', '인력'],
        answer:
          '인재 양성은 전문 분야별 맞춤형 교육과 실무 연계 훈련을 통해 이루어집니다. 특히 디지털 전환 시대에 필요한 AI, 데이터 분석 등 신기술 역량 교육이 강조되고 있습니다.',
      },
    );
  }

  if (text.includes('복지') || text.includes('사회') || text.includes('지원')) {
    pairs.push({
      keywords: ['복지', '지원', '혜택'],
      answer:
        '사회 복지 정책은 취약계층을 포함한 모든 국민의 기본적인 삶의 질을 보장하는 것을 목표로 합니다. 소득 지원, 의료 서비스, 주거 안정 등 다양한 분야에서 맞춤형 지원을 제공합니다.',
    });
  }

  return pairs;
}

// ---------------------------------------------------------------------------
// Shared Chat Widget Components (used by both real and mock)
// ---------------------------------------------------------------------------

function getChatWidgetCSS(): string {
  return `
  var style = document.createElement('style');
  style.textContent = \`
    .epub-tutor-btn {
      position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px;
      border-radius: 50%; background: #1a56db; color: white; border: none;
      font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000; display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    .epub-tutor-btn:hover { transform: scale(1.1); }
    .epub-tutor-panel {
      position: fixed; bottom: 88px; right: 20px; width: 360px; max-height: 500px;
      background: #ffffff; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 10000; display: none; flex-direction: column; overflow: hidden;
      font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
    }
    .epub-tutor-panel.open { display: flex; }
    .epub-tutor-header {
      background: #1a56db; color: white; padding: 16px 20px;
      font-size: 15px; font-weight: 600; display: flex; align-items: center; gap: 8px;
    }
    .epub-tutor-header svg { width: 20px; height: 20px; }
    .epub-tutor-messages {
      flex: 1; overflow-y: auto; padding: 16px; max-height: 340px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .epub-tutor-msg {
      max-width: 85%; padding: 10px 14px; border-radius: 12px;
      font-size: 14px; line-height: 1.5; word-break: keep-all;
    }
    .epub-tutor-msg.user {
      align-self: flex-end; background: #e8f0fe; color: #1a1a2e;
      border-bottom-right-radius: 4px;
    }
    .epub-tutor-msg.assistant {
      align-self: flex-start; background: #f3f4f6; color: #1a1a2e;
      border-bottom-left-radius: 4px;
    }
    .epub-tutor-msg.loading { color: #888; font-style: italic; }
    .epub-tutor-input-row {
      display: flex; border-top: 1px solid #e5e7eb; padding: 8px;
    }
    .epub-tutor-input {
      flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px;
      font-size: 14px; outline: none; font-family: inherit;
    }
    .epub-tutor-input:focus { border-color: #1a56db; }
    .epub-tutor-send {
      margin-left: 8px; background: #1a56db; color: white; border: none;
      border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 14px;
      font-weight: 600;
    }
    .epub-tutor-send:disabled { opacity: 0.5; cursor: not-allowed; }
  \`;
  document.head.appendChild(style);`;
}

function getChatWidgetHTML(): string {
  return `
  // Create toggle button
  var btn = document.createElement('button');
  btn.className = 'epub-tutor-btn';
  btn.setAttribute('aria-label', 'AI 학습 도우미 열기');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>';
  document.body.appendChild(btn);

  // Create chat panel
  var panel = document.createElement('div');
  panel.className = 'epub-tutor-panel';
  panel.innerHTML = '<div class="epub-tutor-header">' +
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' +
    'AI 학습 도우미</div>' +
    '<div class="epub-tutor-messages" id="epub-tutor-msgs">' +
    '<div class="epub-tutor-msg assistant">안녕하세요! 이 장의 내용에 대해 궁금한 점이 있으시면 질문해 주세요.</div>' +
    '</div>' +
    '<div class="epub-tutor-input-row">' +
    '<input class="epub-tutor-input" id="epub-tutor-input" type="text" placeholder="질문을 입력하세요..." />' +
    '<button class="epub-tutor-send" id="epub-tutor-send">전송</button>' +
    '</div>';
  document.body.appendChild(panel);

  btn.addEventListener('click', function() {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) {
      document.getElementById('epub-tutor-input').focus();
    }
  });`;
}

function getChatWidgetLogic(): string {
  return `
  var inputEl = document.getElementById('epub-tutor-input');
  var sendBtn = document.getElementById('epub-tutor-send');
  var msgsEl = document.getElementById('epub-tutor-msgs');

  function appendMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'epub-tutor-msg ' + role;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function setLoading(on) {
    sendBtn.disabled = on;
    var existing = document.querySelector('.epub-tutor-msg.loading');
    if (on && !existing) {
      var div = document.createElement('div');
      div.className = 'epub-tutor-msg assistant loading';
      div.textContent = '답변을 생성하고 있습니다...';
      msgsEl.appendChild(div);
      msgsEl.scrollTop = msgsEl.scrollHeight;
    } else if (!on && existing) {
      existing.remove();
    }
  }

  sendBtn.addEventListener('click', function() {
    sendMessage(inputEl.value);
    inputEl.value = '';
  });

  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value);
      inputEl.value = '';
    }
  });`;
}
