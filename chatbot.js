const SAJU_API = '/api/saju-chat';

const sajuForm = document.getElementById('saju-form');
const chatBirth = document.getElementById('chat-birth');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatRecommendBtn = document.getElementById('chat-recommend-btn');
const chatError = document.getElementById('chat-error');
const chatLoading = document.getElementById('chat-loading');
const chatConsultation = document.getElementById('chat-consultation');

let chatHistory = [];
let profileLocked = false;

function getBallColor(num) {
  if (num <= 10) return 'yellow';
  if (num <= 20) return 'blue';
  if (num <= 30) return 'red';
  if (num <= 40) return 'gray';
  return 'green';
}

function createChatBall(num) {
  const color = getBallColor(num);
  const ball = document.createElement('div');
  ball.className = `ball ball-3d ${color} chat-ball`;
  ball.innerHTML = `
    <span class="ball-surface" aria-hidden="true"></span>
    <span class="ball-highlight" aria-hidden="true"></span>
    <span class="ball-number">${num}</span>
  `;
  ball.setAttribute('aria-label', `번호 ${num}`);
  return ball;
}

function renderNumberBalls(numbers, container) {
  container.innerHTML = '';
  numbers.forEach((n) => container.appendChild(createChatBall(n)));
}

function hideConsultationPanel() {
  if (chatConsultation) {
    chatConsultation.hidden = true;
    chatConsultation.classList.remove('visible');
  }
}

function renderConsultationPanel(data) {
  if (!chatConsultation || !data) return;

  const summaryEl = document.getElementById('chat-consult-summary');
  const ballsEl = document.getElementById('chat-consult-balls');
  const reasonsEl = document.getElementById('chat-consult-reasons');
  const explanationEl = document.getElementById('chat-consult-explanation');
  const replyBlock = document.getElementById('chat-consult-reply-block');
  const replyEl = document.getElementById('chat-consult-reply');

  if (summaryEl) {
    summaryEl.textContent = data.sajuSummary || '사주 분석 내용을 불러오지 못했습니다.';
  }

  if (ballsEl && data.numbers?.length) {
    renderNumberBalls(data.numbers, ballsEl);
  }

  if (reasonsEl) {
    reasonsEl.innerHTML = '';
    if (data.numbers?.length && data.numberReasons?.length) {
      data.numbers.forEach((num, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="chat-consult-num">${num}</span><span class="chat-consult-reason">${data.numberReasons[i] || ''}</span>`;
        reasonsEl.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = '번호별 근거를 생성하지 못했습니다.';
      reasonsEl.appendChild(li);
    }
  }

  if (explanationEl) {
    explanationEl.textContent = data.explanation || data.reply || '';
  }

  const showReply = data.reply && data.reply !== data.explanation;
  if (replyBlock && replyEl) {
    replyBlock.hidden = !showReply;
    if (showReply) replyEl.textContent = data.reply;
  }

  chatConsultation.hidden = false;
  requestAnimationFrame(() => chatConsultation.classList.add('visible'));
}

function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `chat-msg chat-msg--${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  if (content) {
    const text = document.createElement('p');
    text.className = 'chat-text';
    text.textContent = content;
    bubble.appendChild(text);
  }

  msg.appendChild(bubble);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatBusy(busy) {
  chatRecommendBtn.disabled = busy;
  chatSendBtn.disabled = busy;
  if (profileLocked) chatInput.disabled = busy;
  chatLoading.hidden = !busy;
}

function showChatError(text) {
  chatError.textContent = text;
  chatError.hidden = !text;
}

function getGender() {
  const checked = document.querySelector('input[name="chat-gender"]:checked');
  return checked?.value || '';
}

function setProfileLocked(locked) {
  profileLocked = locked;
  document.querySelectorAll('input[name="chat-gender"]').forEach((el) => {
    el.disabled = locked;
  });
  if (chatBirth) chatBirth.disabled = locked;
  if (chatInput) chatInput.disabled = !locked;
  if (chatSendBtn) chatSendBtn.disabled = !locked;
}

function validateProfile() {
  const gender = getGender();
  const birthDate = chatBirth.value;

  if (!gender) {
    showChatError('성별을 선택해 주세요.');
    return null;
  }

  if (!birthDate) {
    showChatError('생년월일을 입력해 주세요.');
    return null;
  }

  showChatError('');
  return { gender, birthDate };
}

async function requestSajuChat(message, { isInitial = false } = {}) {
  const profile = validateProfile();
  if (!profile) return null;

  setChatBusy(true);
  showChatError('');

  try {
    const res = await fetch(SAJU_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gender: profile.gender,
        birthDate: profile.birthDate,
        message,
        history: chatHistory,
        isInitial,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '요청에 실패했습니다.');

    chatHistory.push({ role: 'user', text: message });
    chatHistory.push({
      role: 'assistant',
      text: [data.sajuSummary, data.explanation, data.reply].filter(Boolean).join('\n'),
    });

    return data;
  } catch (err) {
    showChatError(err.message || '사주 상담 요청 중 오류가 발생했습니다.');
    return null;
  } finally {
    setChatBusy(false);
  }
}

async function handleRecommend() {
  const profile = validateProfile();
  if (!profile) return;

  chatHistory = [];
  chatMessages.innerHTML = '';
  hideConsultationPanel();
  setProfileLocked(true);

  appendMessage('user', `${profile.birthDate} · ${profile.gender === 'male' ? '남성' : '여성'} — 사주에 맞는 로또 번호를 추천해 주세요.`);

  const data = await requestSajuChat(
    '제 사주에 맞는 로또 6/45 번호 6개를 추천하고, 각 번호와 조합을 사주 관점에서 설명해 주세요.',
    { isInitial: true },
  );

  if (data) {
    renderConsultationPanel(data);
    appendMessage('assistant', '사주 분석과 추천 번호, 설명을 위 결과 패널에 표시했습니다. 추가 질문은 아래 입력창을 이용해 주세요.');
  }
}

async function handleChatSend() {
  const text = chatInput.value.trim();
  if (!text) return;

  if (!profileLocked) {
    showChatError('먼저 「사주 번호 추천」을 눌러 프로필을 확인해 주세요.');
    return;
  }

  appendMessage('user', text);
  chatInput.value = '';

  const data = await requestSajuChat(text);
  if (data) {
    renderConsultationPanel(data);
    appendMessage('assistant', data.reply || '상담 내용을 결과 패널에 업데이트했습니다.');
  }
}

function initChatbot() {
  if (!sajuForm) return;

  sajuForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleRecommend();
  });

  chatSendBtn?.addEventListener('click', handleChatSend);
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });

  const today = new Date().toISOString().slice(0, 10);
  if (chatBirth) chatBirth.max = today;
}

initChatbot();
