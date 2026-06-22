const MAX = 45;
const COUNT = 6;

const ticketCountInput = document.getElementById('ticket-count');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const drawBtn = document.getElementById('draw-btn');
const ballsDisplay = document.getElementById('balls-display');
const drawBallsBoard = document.getElementById('draw-balls-board');
const drawBallsRow = document.getElementById('draw-balls-row');
const resultsSection = document.getElementById('results');
const ticketsList = document.getElementById('tickets-list');

function getBallColor(num) {
  if (num <= 10) return 'yellow';
  if (num <= 20) return 'blue';
  if (num <= 30) return 'red';
  if (num <= 40) return 'gray';
  return 'green';
}

function createBall(num, rolling = false, extraClass = '') {
  const color = typeof num === 'number' ? getBallColor(num) : 'gray';
  const ball = document.createElement('div');
  ball.className = `ball ball-3d ${color}${rolling ? ' rolling' : ''}${extraClass ? ` ${extraClass}` : ''}`;
  ball.setAttribute('aria-label', typeof num === 'number' ? `번호 ${num}` : '대기');

  const surface = document.createElement('span');
  surface.className = 'ball-surface';
  surface.setAttribute('aria-hidden', 'true');

  const highlight = document.createElement('span');
  highlight.className = 'ball-highlight';
  highlight.setAttribute('aria-hidden', 'true');

  const number = document.createElement('span');
  number.className = 'ball-number';
  number.textContent = num;

  ball.appendChild(surface);
  ball.appendChild(highlight);
  ball.appendChild(number);
  return ball;
}

function applySphereOrientation(wrap, pos) {
  const len = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2) || 1;
  const rotY = (Math.atan2(pos.x, pos.z) * 180) / Math.PI;
  const rotX = (-Math.asin(pos.y / len) * 180) / Math.PI;
  wrap.style.transform =
    `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
}

const SPHERE_BALL_COUNT = 22;
const SPHERE_RADIUS = 88;

function fibonacciSphere(index, total, radius) {
  if (total <= 1) return { x: 0, y: 0, z: 0 };
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / (total - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * index;
  return {
    x: Math.cos(theta) * r * radius,
    y: y * radius,
    z: Math.sin(theta) * r * radius,
  };
}

function buildSphereMachine() {
  ballsDisplay.innerHTML = '';
  ballsDisplay.className = 'sphere-stage';

  const scene = document.createElement('div');
  scene.className = 'sphere-scene';

  scene.innerHTML = `
    <div class="sphere-glow" id="sphere-glow"></div>
    <div class="sphere-assembly">
      <div class="sphere-globe" id="sphere-globe">
        <div class="sphere-wire">
          <span class="sphere-ring sphere-ring--eq" style="transform: rotateX(0deg)"></span>
          <span class="sphere-ring sphere-ring--eq" style="transform: rotateX(45deg)"></span>
          <span class="sphere-ring sphere-ring--eq" style="transform: rotateX(90deg)"></span>
          <span class="sphere-ring sphere-ring--mer" style="transform: rotateY(0deg)"></span>
          <span class="sphere-ring sphere-ring--mer" style="transform: rotateY(60deg)"></span>
          <span class="sphere-ring sphere-ring--mer" style="transform: rotateY(120deg)"></span>
        </div>
        <div class="sphere-tumbler" id="sphere-tumbler"></div>
        <div class="sphere-glass"></div>
        <div class="sphere-shine"></div>
      </div>
      <div class="sphere-neck"></div>
      <div class="sphere-chute">
        <div class="sphere-chute-glass"></div>
        <div class="sphere-exit" id="sphere-exit">
          <span class="sphere-exit-placeholder">?</span>
        </div>
      </div>
    </div>
    <div class="sphere-flyer" id="sphere-flyer"></div>
    <p class="sphere-status" id="sphere-status">추첨을 시작하세요</p>
  `;

  ballsDisplay.appendChild(scene);
}

function fillTumblerGhost() {
  const tumbler = document.getElementById('sphere-tumbler');
  if (!tumbler) return;

  tumbler.innerHTML = '';
  for (let i = 0; i < SPHERE_BALL_COUNT; i++) {
    const pos = fibonacciSphere(i, SPHERE_BALL_COUNT, SPHERE_RADIUS);
    const wrap = document.createElement('div');
    wrap.className = 'sphere-ball-wrap';
    wrap.style.setProperty('--bx', `${pos.x}px`);
    wrap.style.setProperty('--by', `${pos.y}px`);
    wrap.style.setProperty('--bz', `${pos.z}px`);
    applySphereOrientation(wrap, pos);

    const ball = document.createElement('div');
    ball.className = 'ball ball-3d gray sphere-ball sphere-ball--ghost';
    const surface = document.createElement('span');
    surface.className = 'ball-surface';
    const highlight = document.createElement('span');
    highlight.className = 'ball-highlight';
    const number = document.createElement('span');
    number.className = 'ball-number';
    number.textContent = '?';
    ball.appendChild(surface);
    ball.appendChild(highlight);
    ball.appendChild(number);
    wrap.appendChild(ball);
    tumbler.appendChild(wrap);
  }
}

function updateTumblerBalls(getNumber) {
  const tumbler = document.getElementById('sphere-tumbler');
  if (!tumbler) return;

  tumbler.innerHTML = '';
  for (let i = 0; i < SPHERE_BALL_COUNT; i++) {
    const pos = fibonacciSphere(i, SPHERE_BALL_COUNT, SPHERE_RADIUS);
    const wrap = document.createElement('div');
    wrap.className = 'sphere-ball-wrap';
    wrap.style.setProperty('--bx', `${pos.x}px`);
    wrap.style.setProperty('--by', `${pos.y}px`);
    wrap.style.setProperty('--bz', `${pos.z}px`);
    applySphereOrientation(wrap, pos);
    wrap.appendChild(createBall(getNumber(), true, 'sphere-ball'));
    tumbler.appendChild(wrap);
  }
}

function setSphereState(state) {
  ballsDisplay.classList.toggle('is-drawing', state === 'drawing');
  ballsDisplay.classList.toggle('is-complete', state === 'complete');
  ballsDisplay.classList.toggle('is-idle', state === 'idle');

  const tumbler = document.getElementById('sphere-tumbler');
  const globe = document.getElementById('sphere-globe');
  const status = document.getElementById('sphere-status');

  if (tumbler) {
    tumbler.classList.toggle('spinning', state === 'drawing');
    tumbler.classList.toggle('slowing', state === 'ejecting');
  }
  if (globe) globe.classList.toggle('rumble', state === 'drawing');

  if (status) {
    const labels = {
      idle: '추첨을 시작하세요',
      drawing: '구 안에서 공이 굴러가는 중…',
      ejecting: '추첨공 추출 중!',
      complete: '추첨 완료!',
    };
    status.textContent = labels[state] ?? labels.idle;
  }
}

function createDrawBall(num, animate = false) {
  const ball = createBall(num, false, 'draw-ball');
  if (animate) ball.classList.add('draw-ball--enter');
  return ball;
}

function initDrawBallsRow() {
  if (!drawBallsRow) return;

  drawBallsRow.innerHTML = '';
  for (let i = 0; i < COUNT; i++) {
    const slot = document.createElement('div');
    slot.className = 'draw-ball-slot';
    slot.dataset.index = String(i);
    slot.innerHTML = `
      <span class="draw-ball-label">추첨공 ${i + 1}</span>
      <div class="draw-ball-pedestal">
        <div class="draw-ball-empty">
          <span class="draw-ball-empty-surface"></span>
          <span class="draw-ball-empty-text">?</span>
        </div>
      </div>
    `;
    drawBallsRow.appendChild(slot);
  }
}

function setDrawBallSlot(index, num, animate = true) {
  const slot = drawBallsRow?.querySelector(`.draw-ball-slot[data-index="${index}"]`);
  if (!slot) return;

  const pedestal = slot.querySelector('.draw-ball-pedestal');
  if (!pedestal) return;

  pedestal.innerHTML = '';
  pedestal.appendChild(createDrawBall(num, animate));
  slot.classList.add('filled');
  slot.classList.toggle('just-drawn', animate);
}

function showDrawBallsBoard(show) {
  if (!drawBallsBoard) return;
  drawBallsBoard.hidden = !show;
  drawBallsBoard.classList.toggle('visible', show);
}

function renderDrawBalls(numbers, { animateIndex = -1 } = {}) {
  showDrawBallsBoard(true);
  numbers.forEach((num, i) => {
    setDrawBallSlot(i, num, i === animateIndex);
  });
}

function renderPlaceholder() {
  buildSphereMachine();
  fillTumblerGhost();
  initDrawBallsRow();
  showDrawBallsBoard(true);
  setSphereState('idle');

  const exit = document.getElementById('sphere-exit');
  if (exit) {
    exit.innerHTML = '<span class="sphere-exit-placeholder">?</span>';
    exit.classList.remove('pop');
  }
}

async function ejectBall(num) {
  setSphereState('ejecting');

  const tumbler = document.getElementById('sphere-tumbler');
  if (tumbler) tumbler.classList.remove('spinning');

  const flyer = document.getElementById('sphere-flyer');
  const exit = document.getElementById('sphere-exit');

  if (flyer) {
    flyer.innerHTML = '';
    flyer.appendChild(createBall(num, false, 'sphere-ball sphere-ball--fly'));
    flyer.classList.remove('active');
    void flyer.offsetWidth;
    flyer.classList.add('active');
  }

  await sleep(680);

  if (flyer) flyer.classList.remove('active');
  if (exit) {
    exit.innerHTML = '';
    const ball = createBall(num, false, 'sphere-ball');
    exit.appendChild(ball);
    exit.classList.remove('pop');
    void exit.offsetWidth;
    exit.classList.add('pop');
  }

  await sleep(280);
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

function createPlaceholderBall() {
  const ball = document.createElement('span');
  ball.className = 'placeholder-ball';
  ball.textContent = '?';
  return ball;
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
    numbers.forEach((num) => balls.appendChild(createDrawBall(num)));

    ticket.appendChild(label);
    ticket.appendChild(balls);
    ticketsList.appendChild(ticket);
  });

  resultsSection.hidden = false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animateDraw(numbers) {
  renderPlaceholder();
  showDrawBallsBoard(true);
  setSphereState('drawing');
  updateTumblerBalls(() => Math.floor(Math.random() * MAX) + 1);

  await sleep(500);

  const revealed = [];

  for (let i = 0; i < COUNT; i++) {
    const tumbler = document.getElementById('sphere-tumbler');
    if (tumbler) tumbler.classList.add('spinning');

    const spinFrames = 22 + i * 6;
    for (let f = 0; f < spinFrames; f++) {
      updateTumblerBalls(() => Math.floor(Math.random() * MAX) + 1);
      await sleep(38 + f * 2);
    }

    await ejectBall(numbers[i]);
    revealed.push(numbers[i]);
    setDrawBallSlot(i, numbers[i], true);

    if (i < COUNT - 1) {
      setSphereState('drawing');
      updateTumblerBalls(() => Math.floor(Math.random() * MAX) + 1);
      await sleep(200);
    }
  }

  setSphereState('complete');
  renderDrawBalls(numbers);
  await sleep(300);
}

async function draw() {
  const count = parseInt(ticketCountInput.value, 10);
  drawBtn.disabled = true;
  drawBtn.classList.add('spinning');
  resultsSection.hidden = true;

  const tickets = generateTickets(count);
  await animateDraw(tickets[0]);

  if (count > 1) {
    renderResults(tickets);
  } else {
    ticketsList.innerHTML = '';
    resultsSection.hidden = true;
  }

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

renderPlaceholder();

const LOTTO_API = 'https://smok95.github.io/lotto/results/all.json';
const drawPanel = document.getElementById('draw-panel');
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

function formatMoney(amount) {
  if (!amount) return '-';
  return `${amount.toLocaleString()}원`;
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
