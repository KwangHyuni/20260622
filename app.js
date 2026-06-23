const MAX = 45;
const COUNT = 6;
const REEL_ITEM_HEIGHT = 64;
const REEL_SPIN_ITEMS = 28;

const ticketCountInput = document.getElementById('ticket-count');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const drawBtn = document.getElementById('draw-btn');
const slotMachineEl = document.getElementById('slot-machine');
const resultsSection = document.getElementById('results');
const ticketsList = document.getElementById('tickets-list');
const saveStatusEl = document.getElementById('save-status');
const savedDrawsLoading = document.getElementById('saved-draws-loading');
const savedDrawsError = document.getElementById('saved-draws-error');
const savedDrawsList = document.getElementById('saved-draws-list');

const LOTTO_DRAWS_API = '/api/lotto-draws';

function getBallColor(num) {
  if (num <= 10) return 'yellow';
  if (num <= 20) return 'blue';
  if (num <= 30) return 'red';
  if (num <= 40) return 'gray';
  return 'green';
}

function buildBallContent(ballEl, num) {
  ballEl.innerHTML = '';
  const surface = document.createElement('span');
  surface.className = 'ball-surface';
  surface.setAttribute('aria-hidden', 'true');
  const highlight = document.createElement('span');
  highlight.className = 'ball-highlight';
  highlight.setAttribute('aria-hidden', 'true');
  ballEl.appendChild(surface);
  ballEl.appendChild(highlight);

  const number = document.createElement('span');
  number.className = 'ball-number';
  number.textContent = num;
  ballEl.appendChild(number);
}

function createBall(num, rolling = false, extraClass = '') {
  const color = typeof num === 'number' ? getBallColor(num) : 'gray';
  const ball = document.createElement('div');
  ball.className = `ball ball-3d ${color}${rolling ? ' rolling' : ''}${extraClass ? ` ${extraClass}` : ''}`;
  ball.setAttribute('aria-label', typeof num === 'number' ? `번호 ${num}` : '대기');
  buildBallContent(ball, num);
  return ball;
}

const slotReels = [];

function buildSlotMachine() {
  slotMachineEl.innerHTML = '';
  slotMachineEl.className = 'slot-stage is-idle';
  slotReels.length = 0;

  const bulbs = Array.from({ length: 12 }, (_, i) => `<span class="slot-bulb" style="--bi:${i}"></span>`).join('');

  slotMachineEl.innerHTML = `
    <div class="slot-cabinet">
      <div class="slot-crown" aria-hidden="true">
        <div class="slot-crown-bulbs">${bulbs}</div>
        <div class="slot-jackpot">
          <span class="slot-star">★</span>
          <span class="slot-seven">7</span>
          <span class="slot-seven">7</span>
          <span class="slot-seven">7</span>
          <span class="slot-star">★</span>
        </div>
        <p class="slot-jackpot-sub">LUCKY LOTTO 6/45</p>
      </div>
      <div class="slot-chrome-frame">
        <div class="slot-chrome-bulbs slot-chrome-bulbs--top">${bulbs}</div>
        <div class="slot-body">
          <div class="slot-window">
            <div class="slot-window-shine" aria-hidden="true"></div>
            <div class="slot-reels" id="slot-reels"></div>
            <div class="slot-payline" aria-hidden="true"></div>
          </div>
          <div class="slot-side">
            <div class="slot-lever" id="slot-lever" aria-hidden="true">
              <span class="slot-lever-knob"></span>
              <span class="slot-lever-arm"></span>
              <span class="slot-lever-base"></span>
            </div>
          </div>
        </div>
        <div class="slot-chrome-bulbs slot-chrome-bulbs--bottom">${bulbs}</div>
      </div>
      <div class="slot-coin-tray" aria-hidden="true">
        <span class="slot-coin"></span>
        <span class="slot-coin"></span>
        <span class="slot-coin"></span>
        <span class="slot-coin"></span>
        <span class="slot-coin"></span>
      </div>
      <div class="slot-led-board" id="slot-cabinet-result" aria-live="polite">
        <span class="slot-led-label">추첨 번호</span>
        <div class="slot-led-digits" id="slot-cabinet-digits"></div>
      </div>
      <div class="slot-plinth"></div>
    </div>
    <p class="slot-status" id="slot-status">추첨을 시작하세요</p>
    <section id="slot-result" class="slot-result" hidden aria-label="추첨 번호 결과">
      <div class="slot-result-head">
        <span class="slot-result-badge">WINNER</span>
        <h3 class="slot-result-title">추첨 번호</h3>
      </div>
      <div id="slot-result-balls" class="slot-result-balls"></div>
    </section>
  `;

  const reelsContainer = document.getElementById('slot-reels');
  for (let i = 0; i < COUNT; i++) {
    const reel = document.createElement('div');
    reel.className = 'slot-reel';
    reel.dataset.index = String(i);

    const strip = document.createElement('div');
    strip.className = 'slot-reel-strip';
    strip.appendChild(createReelItem('?'));

    const face = document.createElement('div');
    face.className = 'slot-reel-face';
    face.dataset.index = String(i);
    face.innerHTML = '<span class="slot-reel-placeholder">?</span>';

    reel.appendChild(strip);
    reel.appendChild(face);
    reelsContainer.appendChild(reel);

    slotReels.push({ reel, strip, face });
  }

  initCabinetDigits();
}

function initCabinetDigits() {
  const digitsEl = document.getElementById('slot-cabinet-digits');
  if (!digitsEl) return;

  digitsEl.innerHTML = '';
  for (let i = 0; i < COUNT; i++) {
    const cell = document.createElement('span');
    cell.className = 'slot-led-digit slot-led-digit--empty';
    cell.dataset.index = String(i);
    cell.textContent = '?';
    digitsEl.appendChild(cell);
  }

  const board = document.getElementById('slot-cabinet-result');
  if (board) board.classList.remove('has-results');
}

function resetCabinetDigits() {
  initCabinetDigits();
}

function revealCabinetDigit(num, index) {
  const cell = document.getElementById('slot-cabinet-digits')?.querySelector(`[data-index="${index}"]`);
  const board = document.getElementById('slot-cabinet-result');
  if (!cell) return;

  cell.className = `slot-led-digit slot-led-digit--${getBallColor(num)} slot-led-digit--pop`;
  cell.textContent = String(num);
  if (board) board.classList.add('has-results');
}

function hideSlotResult() {
  const panel = document.getElementById('slot-result');
  if (panel) {
    panel.hidden = true;
    panel.classList.remove('visible');
  }
  resetCabinetDigits();
  resetReelFaces();
}

function createReelItem(num) {
  const item = document.createElement('div');
  item.className = 'slot-reel-item';

  if (typeof num === 'number') {
    const digit = document.createElement('span');
    digit.className = `slot-reel-digit slot-reel-digit--${getBallColor(num)}`;
    digit.textContent = String(num);
    item.appendChild(digit);
  } else {
    const digit = document.createElement('span');
    digit.className = 'slot-reel-digit slot-reel-digit--idle';
    digit.textContent = '?';
    item.appendChild(digit);
  }

  return item;
}

function resetReelFaces() {
  slotReels.forEach(({ face, reel, strip }) => {
    if (reel) reel.classList.remove('stopped', 'winner', 'spinning', 'has-result');
    if (strip) {
      strip.style.transform = '';
      strip.innerHTML = '';
      strip.appendChild(createReelItem('?'));
    }
    if (face) {
      face.className = 'slot-reel-face';
      face.innerHTML = '<span class="slot-reel-placeholder">?</span>';
    }
  });
}

function setReelFacesSpinning() {
  slotReels.forEach(({ face, reel }) => {
    if (reel) reel.classList.remove('has-result');
    if (face) {
      face.className = 'slot-reel-face slot-reel-face--spinning';
      face.innerHTML = '';
    }
  });
}

function revealReelFace(num, index) {
  const { face, reel } = slotReels[index] ?? {};
  if (!face || !reel) return;

  reel.classList.add('has-result');
  face.className = 'slot-reel-face slot-reel-face--show';
  face.innerHTML = '';
  face.appendChild(createBall(num, false, 'slot-reel-ball'));
}

function buildReelStrip(finalNum) {
  const items = [];
  for (let i = 0; i < REEL_SPIN_ITEMS - 1; i++) {
    items.push(Math.floor(Math.random() * MAX) + 1);
  }
  items.push(finalNum);
  return items;
}

function setSlotState(state) {
  slotMachineEl.classList.toggle('is-drawing', state === 'drawing');
  slotMachineEl.classList.toggle('is-complete', state === 'complete');
  slotMachineEl.classList.toggle('is-idle', state === 'idle');

  const lever = document.getElementById('slot-lever');
  if (lever) lever.classList.toggle('pulled', state === 'drawing');

  const status = document.getElementById('slot-status');
  if (status) {
    const labels = {
      idle: '추첨을 시작하세요',
      drawing: '릴이 돌아가는 중…',
      complete: '추첨 완료!',
    };
    status.textContent = labels[state] ?? labels.idle;
  }
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function getReelItemHeight() {
  const reel = slotReels[0]?.reel;
  if (!reel) return REEL_ITEM_HEIGHT;
  return reel.getBoundingClientRect().height || REEL_ITEM_HEIGHT;
}

function prepareReelSpin(strip, finalNum) {
  strip.innerHTML = '';
  const numbers = buildReelStrip(finalNum);
  numbers.forEach((n) => strip.appendChild(createReelItem(n)));
  strip.style.transform = 'translate3d(0, 0, 0)';
  return (numbers.length - 1) * getReelItemHeight();
}

function spinReelToStop(strip, totalOffset, durationMs) {
  const itemH = getReelItemHeight();
  const overshoot = itemH * 0.35;
  const start = performance.now();

  return new Promise((resolve) => {
    function frame(now) {
      const t = Math.min((now - start) / durationMs, 1);
      const eased = easeOutCubic(t);
      let offset = eased * (totalOffset + overshoot);
      if (t >= 1) offset = totalOffset;
      strip.style.transform = `translate3d(0, ${-offset}px, 0)`;

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        strip.style.transform = `translate3d(0, ${-totalOffset}px, 0)`;
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function revealSlotResultBall(numbers, index) {
  const panel = document.getElementById('slot-result');
  const ballsEl = document.getElementById('slot-result-balls');
  if (!panel || !ballsEl) return;

  if (index === 0) {
    ballsEl.innerHTML = '';
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('visible'));
  }

  const ball = createBall(numbers[index], false, 'slot-result-ball');
  ballsEl.appendChild(ball);
  revealCabinetDigit(numbers[index], index);
}


const BASE_SPIN_MS = 1800;
const REEL_STOP_STAGGER_MS = 480;

async function animateDraw(numbers) {
  buildSlotMachine();
  hideSlotResult();
  setSlotState('drawing');

  await sleep(300);

  const offsets = numbers.map((num, i) => prepareReelSpin(slotReels[i].strip, num));
  setReelFacesSpinning();
  slotReels.forEach(({ reel }) => reel.classList.add('spinning'));

  const stopTasks = numbers.map((num, i) => {
    const duration = BASE_SPIN_MS + i * REEL_STOP_STAGGER_MS;
    const { strip, reel } = slotReels[i];

    return spinReelToStop(strip, offsets[i], duration).then(async () => {
      reel.classList.remove('spinning');
      reel.classList.add('stopped', 'winner');
      revealReelFace(numbers[i], i);
      revealSlotResultBall(numbers, i);
      await sleep(150);
    });
  });

  await Promise.all(stopTasks);

  setSlotState('complete');
  await sleep(400);
}

function generateNumbers() {
  const pool = Array.from({ length: MAX }, (_, i) => i + 1);
  const result = [];

  for (let i = 0; i < COUNT; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }

  return result.sort((a, b) => a - b);
}

function generateTickets(count) {
  return Array.from({ length: count }, () => generateNumbers());
}

function renderResults(tickets) {
  ticketsList.innerHTML = '';

  tickets.forEach((numbers, index) => {
    const ticket = document.createElement('div');
    ticket.className = 'ticket';
    ticket.style.animationDelay = `${index * 0.08}s`;

    const label = document.createElement('span');
    label.className = 'ticket-label';
    label.textContent = `${index + 1}장`;

    const balls = document.createElement('div');
    balls.className = 'ticket-balls';
    numbers.forEach((num) => balls.appendChild(createBall(num, false, 'slot-ball')));

    ticket.appendChild(label);
    ticket.appendChild(balls);
    ticketsList.appendChild(ticket);
  });

  resultsSection.hidden = false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function showSaveStatus(message, type = 'success') {
  if (!saveStatusEl) return;
  saveStatusEl.textContent = message;
  saveStatusEl.className = `save-status save-status--${type}`;
  saveStatusEl.hidden = false;
}

function hideSaveStatus() {
  if (saveStatusEl) saveStatusEl.hidden = true;
}

function formatSavedTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupSavedDraws(draws) {
  const batches = new Map();

  draws.forEach((draw) => {
    const key = draw.batch_id || String(draw.id);
    if (!batches.has(key)) {
      batches.set(key, {
        batchId: key,
        createdAt: draw.created_at,
        tickets: [],
      });
    }
    batches.get(key).tickets.push({
      index: draw.ticket_index ?? 1,
      numbers: draw.numbers,
    });
  });

  return Array.from(batches.values()).map((batch) => {
    batch.tickets.sort((a, b) => a.index - b.index);
    return batch;
  });
}

function renderSavedDraws(draws) {
  if (!savedDrawsList) return;

  if (!draws?.length) {
    savedDrawsList.innerHTML = '<p class="saved-draws-empty">아직 저장된 추첨 기록이 없습니다. 추첨하기를 눌러 번호를 생성해 보세요.</p>';
    return;
  }

  savedDrawsList.innerHTML = '';
  const batches = groupSavedDraws(draws);

  batches.forEach((batch, batchIndex) => {
    const item = document.createElement('article');
    item.className = 'saved-draw-item';
    item.style.animationDelay = `${batchIndex * 0.05}s`;

    const head = document.createElement('div');
    head.className = 'saved-draw-head';
    head.innerHTML = `
      <time class="saved-draw-time">${formatSavedTime(batch.createdAt)}</time>
      <span class="saved-draw-count">${batch.tickets.length}장</span>
    `;

    const ticketsWrap = document.createElement('div');
    ticketsWrap.className = 'saved-draw-tickets';

    batch.tickets.forEach((ticket) => {
      const row = document.createElement('div');
      row.className = 'saved-draw-ticket';

      const label = document.createElement('span');
      label.className = 'saved-draw-label';
      label.textContent = `${ticket.index}장`;

      const balls = document.createElement('div');
      balls.className = 'saved-draw-balls';
      ticket.numbers.forEach((num) => balls.appendChild(createBall(num, false, 'slot-ball')));

      row.appendChild(label);
      row.appendChild(balls);
      ticketsWrap.appendChild(row);
    });

    item.appendChild(head);
    item.appendChild(ticketsWrap);
    savedDrawsList.appendChild(item);
  });
}

async function loadSavedDraws() {
  if (!savedDrawsList) return;

  savedDrawsLoading.hidden = false;
  savedDrawsError.hidden = true;

  try {
    const res = await fetch(LOTTO_DRAWS_API);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || '저장된 기록을 불러오지 못했습니다.');
    }

    renderSavedDraws(data.draws ?? []);
  } catch (err) {
    savedDrawsError.textContent = err.message || '저장된 기록 로드에 실패했습니다.';
    savedDrawsError.hidden = false;
    savedDrawsList.innerHTML = '';
  } finally {
    savedDrawsLoading.hidden = true;
  }
}

async function saveDrawsToSupabase(tickets) {
  hideSaveStatus();

  try {
    const res = await fetch(LOTTO_DRAWS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickets }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || '추첨 번호 저장에 실패했습니다.');
    }

    showSaveStatus(`${tickets.length}장의 번호가 Supabase에 저장되었습니다.`, 'success');
    await loadSavedDraws();
  } catch (err) {
    showSaveStatus(err.message || '추첨 번호 저장에 실패했습니다.', 'error');
  }
}

async function draw() {
  const count = parseInt(ticketCountInput.value, 10);
  drawBtn.disabled = true;
  drawBtn.classList.add('spinning');
  resultsSection.hidden = true;
  hideSaveStatus();

  const tickets = generateTickets(count);
  await animateDraw(tickets[0]);

  if (count > 1) {
    renderResults(tickets);
  } else {
    ticketsList.innerHTML = '';
    resultsSection.hidden = true;
  }

  await saveDrawsToSupabase(tickets);

  drawBtn.disabled = false;
  drawBtn.classList.remove('spinning');
}

function updateTicketCount(delta) {
  const current = parseInt(ticketCountInput.value, 10);
  ticketCountInput.value = Math.min(10, Math.max(1, current + delta));
}

decreaseBtn.addEventListener('click', () => updateTicketCount(-1));
increaseBtn.addEventListener('click', () => updateTicketCount(1));
drawBtn.addEventListener('click', draw);

buildSlotMachine();
setSlotState('idle');
loadSavedDraws();

const LOTTO_API = 'https://smok95.github.io/lotto/results/all.json';
const drawPanel = document.getElementById('draw-panel');
const chatbotPanel = document.getElementById('chatbot-panel');
const historyPanel = document.getElementById('history-panel');
const tabs = document.querySelectorAll('.tab');
const roundInput = document.getElementById('round-input');
const searchBtn = document.getElementById('search-btn');
const historyLoading = document.getElementById('history-loading');
const historyError = document.getElementById('history-error');
const historyDetail = document.getElementById('history-detail');
const historyList = document.getElementById('history-list');

let lottoData = null;
let latestRound = null;

function formatDate(iso) {
  const date = new Date(iso);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPrize(amount) {
  if (!amount) return '-';
  if (amount >= 100000000) {
    const eok = amount / 100000000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  return `${Math.round(amount / 10000).toLocaleString()}만원`;
}

function getFirstPrize(draw) {
  return draw.divisions?.[0] ?? {};
}

function createBallElement(num, { bonus = false, small = false } = {}) {
  const ball = createBall(num);
  if (bonus) ball.classList.add('bonus-ball');
  if (small) {
    ball.style.width = '32px';
    ball.style.height = '32px';
    ball.style.fontSize = '0.85rem';
  }
  return ball;
}

function renderWinningNumbers(container, numbers, bonusNo) {
  container.innerHTML = '';
  numbers.forEach((num) => container.appendChild(createBall(num)));

  if (bonusNo) {
    const label = document.createElement('span');
    label.className = 'bonus-label';
    label.textContent = '+';
    container.appendChild(label);
    container.appendChild(createBallElement(bonusNo, { bonus: true }));
  }
}

function renderHistoryDetail(draw) {
  const first = getFirstPrize(draw);
  const combo = draw.winners_combination ?? {};

  historyDetail.innerHTML = `
    <div class="history-detail-header">
      <h3>${draw.draw_no}회 당첨번호</h3>
      <span class="history-date">${formatDate(draw.date)}</span>
    </div>
    <div class="winning-numbers" id="detail-balls"></div>
    <dl class="prize-info">
      <div class="prize-item">
        <dt>1등 당첨자</dt>
        <dd>${first.winners != null ? `${first.winners}명` : '-'}</dd>
      </div>
      <div class="prize-item">
        <dt>1등 1인당 당첨금</dt>
        <dd>${formatPrize(first.prize)}</dd>
      </div>
      <div class="prize-item">
        <dt>총 판매액</dt>
        <dd>${formatPrize(draw.total_sales_amount)}</dd>
      </div>
      <div class="prize-item">
        <dt>당첨 방식</dt>
        <dd>자동 ${combo.auto ?? 0} · 반자동 ${combo.semi_auto ?? 0} · 수동 ${combo.manual ?? 0}</dd>
      </div>
    </dl>
  `;

  renderWinningNumbers(
    historyDetail.querySelector('#detail-balls'),
    draw.numbers,
    draw.bonus_no
  );
  historyDetail.hidden = false;
}

function renderHistoryList(draws) {
  historyList.innerHTML = '';

  draws.slice().reverse().forEach((draw) => {
    const first = getFirstPrize(draw);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'history-item';
    item.dataset.round = draw.draw_no;

    const round = document.createElement('span');
    round.className = 'history-item-round';
    round.textContent = `${draw.draw_no}회`;

    const balls = document.createElement('div');
    balls.className = 'history-item-balls';
    draw.numbers.forEach((num) => balls.appendChild(createBallElement(num, { small: true })));

    const prize = document.createElement('span');
    prize.className = 'history-item-prize';
    prize.textContent = `1등 ${first.winners ?? '-'}명 · ${formatPrize(first.prize)}`;

    item.appendChild(round);
    item.appendChild(balls);
    item.appendChild(prize);
    item.addEventListener('click', () => showRound(draw.draw_no));
    historyList.appendChild(item);
  });
}

function showRound(roundNo) {
  if (!lottoData) return;

  const draw = lottoData.find((item) => item.draw_no === roundNo);
  if (!draw) {
    historyError.textContent = `${roundNo}회 데이터를 찾을 수 없습니다. (1~${latestRound}회)`;
    historyError.hidden = false;
    historyDetail.hidden = true;
    return;
  }

  historyError.hidden = true;
  roundInput.value = roundNo;
  renderHistoryDetail(draw);

  document.querySelectorAll('.history-item').forEach((el) => {
    el.classList.toggle('active', Number(el.dataset.round) === roundNo);
  });
}

async function loadHistoryData() {
  if (lottoData) return;

  historyLoading.hidden = false;
  historyError.hidden = true;

  try {
    const res = await fetch(LOTTO_API);
    if (!res.ok) throw new Error('데이터를 불러오지 못했습니다.');
    lottoData = await res.json();
    latestRound = lottoData[lottoData.length - 1].draw_no;
    roundInput.max = latestRound;
    roundInput.placeholder = `1~${latestRound}`;

    renderHistoryList(lottoData.slice(-20));
    showRound(latestRound);
  } catch (err) {
    historyError.textContent = err.message || '당첨 데이터 로드에 실패했습니다.';
    historyError.hidden = false;
  } finally {
    historyLoading.hidden = true;
  }
}

function switchTab(tabName) {
  tabs.forEach((tab) => {
    const active = tab.dataset.tab === tabName;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', active);
  });

  drawPanel.hidden = tabName !== 'draw';
  chatbotPanel.hidden = tabName !== 'chatbot';
  historyPanel.hidden = tabName !== 'history';

  if (tabName === 'history') {
    loadHistoryData();
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

searchBtn.addEventListener('click', () => {
  const roundNo = parseInt(roundInput.value, 10);
  if (!roundNo || roundNo < 1) {
    historyError.textContent = '올바른 회차 번호를 입력해 주세요.';
    historyError.hidden = false;
    return;
  }
  if (lottoData) showRound(roundNo);
});

roundInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchBtn.click();
});
