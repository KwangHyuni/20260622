const MAX = 45;
const COUNT = 6;
const REEL_ITEM_HEIGHT = 58;
const REEL_SPIN_ITEMS = 28;

const ticketCountInput = document.getElementById('ticket-count');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const drawBtn = document.getElementById('draw-btn');
const slotMachineEl = document.getElementById('slot-machine');
const resultsSection = document.getElementById('results');
const ticketsList = document.getElementById('tickets-list');

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

  slotMachineEl.innerHTML = `
    <div class="slot-cabinet">
      <div class="slot-top">
        <span class="slot-marquee-dot"></span>
        <span class="slot-marquee-text">LOTTO 6 / 45</span>
        <span class="slot-marquee-dot"></span>
      </div>
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
          </div>
        </div>
      </div>
      <div class="slot-base">
        <span class="slot-base-light"></span>
        <span class="slot-base-light"></span>
        <span class="slot-base-light"></span>
      </div>
    </div>
    <p class="slot-status" id="slot-status">추첨을 시작하세요</p>
  `;

  const reelsContainer = document.getElementById('slot-reels');
  for (let i = 0; i < COUNT; i++) {
    const reel = document.createElement('div');
    reel.className = 'slot-reel';
    reel.dataset.index = String(i);

    const strip = document.createElement('div');
    strip.className = 'slot-reel-strip';
    strip.appendChild(createReelItem('?'));
    reel.appendChild(strip);
    reelsContainer.appendChild(reel);

    slotReels.push({ reel, strip });
  }
}

function createReelItem(num) {
  const item = document.createElement('div');
  item.className = 'slot-reel-item';
  const ball = typeof num === 'number'
    ? createBall(num, false, 'slot-ball')
    : createBall('?', false, 'slot-ball slot-ball--idle');
  item.appendChild(ball);
  return item;
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

function spinReel(strip, finalNum, durationMs) {
  strip.innerHTML = '';
  const numbers = buildReelStrip(finalNum);
  numbers.forEach((n) => strip.appendChild(createReelItem(n)));

  const totalOffset = (numbers.length - 1) * REEL_ITEM_HEIGHT;
  const overshoot = REEL_ITEM_HEIGHT * 0.35;
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


async function animateDraw(numbers) {
  buildSlotMachine();
  setSlotState('drawing');

  await sleep(300);

  for (let i = 0; i < COUNT; i++) {
    const { strip, reel } = slotReels[i];
    reel.classList.add('spinning');
    const duration = 1600 + i * 420;
    await spinReel(strip, numbers[i], duration);
    reel.classList.remove('spinning');
    reel.classList.add('stopped', 'winner');
    await sleep(180);
  }

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

buildSlotMachine();
setSlotState('idle');

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
