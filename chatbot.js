const SAJU_API = '/api/saju-chat';

const chatbotPanel = document.getElementById('chatbot-panel');
const sajuForm = document.getElementById('saju-form');
const chatBirth = document.getElementById('chat-birth');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatRecommendBtn = document.getElementById('chat-recommend-btn');
const chatError = document.getElementById('chat-error');
const chatLoading = document.getElementById('chat-loading');

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

function renderNumberBalls(numbers) {
  const wrap = document.createElement('div');
  wrap.className = 'chat-balls';
  numbers.forEach((n) => wrap.appendChild(createChatBall(n)));
  return wrap;
}

function renderNumberReasons(numbers, reasons) {
  if (!reasons?.length) return null;
  const list = document.createElement('ul');
  list.className = 'chat-reason-list';
  numbers.forEach((num, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${num}</strong> — ${reasons[i] || ''}`;
    list.appendChild(li);
  });
  return list;
}

function appendMessage(role, content, { numbers, sajuSummary, numberReasons, explanation } = {}) {
  const msg = document.createElement('div');
  msg.className = `chat-msg chat-msg--${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';

  if (role === 'assistant' && sajuSummary) {
    const summary = document.createElement('p');
    summary.className = 'chat-saju-summary';
    summary.textContent = sajuSummary;
    bubble.appendChild(summary);
  }

  if (role === 'assistant' && numbers?.length) {
    bubble.appendChild(renderNumberBalls(numbers));
    const reasons = renderNumberReasons(numbers, numberReasons);
    if (reasons) bubble.appendChild(reasons);
  }

  if (content) {
    const text = document.createElement('p');
    text.className = 'chat-text';
    text.textContent = content;
    bubble.appendChild(text);
  }

  if (role === 'assistant' && explanation && explanation !== content) {
    const detail = document.createElement('p');
    detail.className = 'chat-explanation';
    detail.textContent = explanation;
    bubble.appendChild(detail);
  }

  msg.appendChild(bubble);
  chatMessages.appendChild(msg);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatBusy(busy) {
  chatRecommendBtn.disabled = busy;
  chatSendBtn.disabled = busy;
  chatInput.disabled = busy;
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
  setProfileLocked(true);

  appendMessage('user', `${profile.birthDate} · ${profile.gender === 'male' ? '남성' : '여성'} — 사주에 맞는 로또 번호를 추천해 주세요.`);

  const data = await requestSajuChat(
    '제 사주에 맞는 로또 6/45 번호 6개를 추천하고, 각 번호와 조합을 사주 관점에서 설명해 주세요.',
    { isInitial: true },
  );

  if (data) {
    appendMessage('assistant', data.reply, data);
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
    appendMessage('assistant', data.reply, data);
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
