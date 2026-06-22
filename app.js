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

const FRAGMENT_COUNT = 14;

function buildBallContent(ballEl, num, { fragmented = false } = {}) {
  ballEl.innerHTML = '';

  if (fragmented) {
    const fragments = document.createElement('div');
    fragments.className = 'ball-fragments';
    fragments.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / FRAGMENT_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const fx = Math.sin(phi) * Math.cos(theta);
      const fy = Math.sin(phi) * Math.sin(theta);
      const fz = Math.cos(phi);
      const frag = document.createElement('span');
      frag.className = 'ball-fragment';
      frag.style.setProperty('--fi', String(i));
      frag.style.setProperty('--fx', fx.toFixed(3));
      frag.style.setProperty('--fy', fy.toFixed(3));
      frag.style.setProperty('--fz', fz.toFixed(3));
      fragments.appendChild(frag);
    }
    ballEl.appendChild(fragments);
  } else {
    const surface = document.createElement('span');
    surface.className = 'ball-surface';
    surface.setAttribute('aria-hidden', 'true');
    const highlight = document.createElement('span');
    highlight.className = 'ball-highlight';
    highlight.setAttribute('aria-hidden', 'true');
    ballEl.appendChild(surface);
    ballEl.appendChild(highlight);
  }

  const number = document.createElement('span');
  number.className = 'ball-number';
  number.textContent = num;
  ballEl.appendChild(number);
}

function createBall(num, rolling = false, extraClass = '', { fragmented = false } = {}) {
  const color = typeof num === 'number' ? getBallColor(num) : 'gray';
  const ball = document.createElement('div');
  ball.className = `ball ball-3d ${color}${rolling ? ' rolling' : ''}${fragmented ? ' ball--fragmented' : ''}${extraClass ? ` ${extraClass}` : ''}`;
  ball.setAttribute('aria-label', typeof num === 'number' ? `번호 ${num}` : '대기');

  buildBallContent(ball, num, { fragmented });
  return ball;
}

function spawnFragmentBurst(parent, color) {
  const burst = document.createElement('div');
  burst.className = `fragment-burst ${color}`;
  for (let i = 0; i < 18; i++) {
    const piece = document.createElement('span');
    piece.className = 'fragment-burst-piece';
    const angle = Math.random() * Math.PI * 2;
    const dist = 28 + Math.random() * 72;
    piece.style.setProperty('--bx', `${Math.cos(angle) * dist}px`);
    piece.style.setProperty('--by', `${Math.sin(angle) * dist - 20}px`);
    piece.style.setProperty('--bz', `${(Math.random() - 0.5) * 40}px`);
    piece.style.setProperty('--br', `${Math.random() * 540 - 270}deg`);
    piece.style.animationDelay = `${Math.random() * 0.08}s`;
    burst.appendChild(piece);
  }
  parent.appendChild(burst);
  setTimeout(() => burst.remove(), 750);
}

function applySphereOrientation(wrap, pos) {
  const len = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2) || 1;
  const rotY = (Math.atan2(pos.x, pos.z) * 180) / Math.PI;
  const rotX = (-Math.asin(pos.y / len) * 180) / Math.PI;
  wrap.style.transform =
    `translate3d(${pos.x}px, ${pos.y}px, ${pos.z}px) rotateY(${rotY}deg) rotateX(${rotX}deg)`;
}

const SPHERE_BALL_COUNT = 22;
const SPHERE_INNER_RADIUS = 72;
const SPHERE_BALL_RADIUS = 17;

let spherePhysics = null;

class SpherePhysics {
  constructor(container) {
    this.container = container;
    this.balls = [];
    this.running = false;
    this.rafId = null;
    this.lastTime = 0;
    this.time = 0;
    this.intensity = 1;
    this.ghost = false;
    this.numberTick = 0;
    this.restitution = 0.82;
    this.damping = 0.998;
  }

  init(count, ghost = false) {
    this.destroy(false);
    this.ghost = ghost;
    this.container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPHERE_INNER_RADIUS * (0.25 + Math.random() * 0.65);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      const speed = ghost ? 0 : 40 + Math.random() * 80;

      const wrap = document.createElement('div');
      wrap.className = 'sphere-ball-wrap';
      const num = ghost ? '?' : Math.floor(Math.random() * MAX) + 1;
      const ballEl = createBall(num, false, `sphere-ball${ghost ? ' sphere-ball--ghost' : ''}`, { fragmented: true });

      wrap.appendChild(ballEl);
      this.container.appendChild(wrap);

      this.balls.push({
        x, y, z,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        vz: (Math.random() - 0.5) * speed,
        wrap,
        ballEl,
        num,
      });
    }

    this.balls.forEach((b) => this.syncDOM(b));
  }

  setGhost(ghost) {
    this.ghost = ghost;
    this.balls.forEach((b) => {
      b.ballEl.classList.toggle('sphere-ball--ghost', ghost);
      if (ghost) this.setBallNumber(b, '?');
    });
  }

  setBallNumber(ball, num) {
    ball.num = num;
    const color = typeof num === 'number' ? getBallColor(num) : 'gray';
    ball.ballEl.className = `ball ball-3d ${color} sphere-ball ball--fragmented${this.ghost ? ' sphere-ball--ghost' : ''}`;
    ball.ballEl.setAttribute('aria-label', typeof num === 'number' ? `번호 ${num}` : '대기');
    buildBallContent(ball.ballEl, num, { fragmented: true });
  }

  randomizeNumbers() {
    if (this.ghost) return;
    this.balls.forEach((b) => this.setBallNumber(b, Math.floor(Math.random() * MAX) + 1));
  }

  setIntensity(value) {
    this.intensity = value;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.container) {
      this.container.style.transform = 'rotateX(-6deg)';
    }
  }

  slowDown(factor = 0.35) {
    this.balls.forEach((b) => {
      b.vx *= factor;
      b.vy *= factor;
      b.vz *= factor;
    });
    this.intensity *= factor;
  }

  loop() {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.032);
    this.lastTime = now;
    this.time += dt;

    this.step(dt);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  step(dt) {
    const g = 420 * this.intensity;
    const tumble = this.time * (2.8 + this.intensity * 1.5);
    const gx = Math.sin(tumble) * g;
    const gy = Math.cos(tumble * 0.73) * g * 0.85 - 60 * this.intensity;
    const gz = Math.sin(tumble * 1.37) * g * 0.9;

    this.numberTick += dt;
    if (!this.ghost && this.intensity > 0.4 && this.numberTick > 0.09) {
      this.numberTick = 0;
      this.randomizeNumbers();
    }

    for (const b of this.balls) {
      b.vx += gx * dt + (Math.random() - 0.5) * 18 * this.intensity;
      b.vy += gy * dt + (Math.random() - 0.5) * 18 * this.intensity;
      b.vz += gz * dt + (Math.random() - 0.5) * 18 * this.intensity;

      b.vx *= this.damping;
      b.vy *= this.damping;
      b.vz *= this.damping;

      const maxV = 280 * this.intensity;
      const vLen = Math.hypot(b.vx, b.vy, b.vz);
      if (vLen > maxV) {
        const s = maxV / vLen;
        b.vx *= s;
        b.vy *= s;
        b.vz *= s;
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;

      this.constrainSphere(b);
    }

    this.resolveBallCollisions();

    for (const b of this.balls) {
      this.syncDOM(b);
    }

    const wobbleX = Math.sin(this.time * 3.2) * 4 * this.intensity;
    const wobbleY = this.time * (35 + this.intensity * 25);
    const wobbleZ = Math.cos(this.time * 2.1) * 3 * this.intensity;
    this.container.style.transform =
      `rotateX(${-6 + wobbleX}deg) rotateY(${wobbleY}deg) rotateZ(${wobbleZ}deg)`;
  }

  constrainSphere(b) {
    const dist = Math.hypot(b.x, b.y, b.z) || 0.001;
    const maxDist = SPHERE_INNER_RADIUS;

    if (dist > maxDist) {
      const nx = b.x / dist;
      const ny = b.y / dist;
      const nz = b.z / dist;
      b.x = nx * maxDist;
      b.y = ny * maxDist;
      b.z = nz * maxDist;

      const dot = b.vx * nx + b.vy * ny + b.vz * nz;
      if (dot > 0) {
        b.vx -= (1 + this.restitution) * dot * nx;
        b.vy -= (1 + this.restitution) * dot * ny;
        b.vz -= (1 + this.restitution) * dot * nz;
      }
    }
  }

  resolveBallCollisions() {
    const minDist = SPHERE_BALL_RADIUS * 2;
    const minDistSq = minDist * minDist;

    for (let i = 0; i < this.balls.length; i++) {
      for (let j = i + 1; j < this.balls.length; j++) {
        const a = this.balls[i];
        const b = this.balls[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq >= minDistSq || distSq < 0.001) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;
        const overlap = (minDist - dist) * 0.5;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        a.z -= nz * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        b.z += nz * overlap;

        const relVx = b.vx - a.vx;
        const relVy = b.vy - a.vy;
        const relVz = b.vz - a.vz;
        const relDot = relVx * nx + relVy * ny + relVz * nz;

        if (relDot > 0) continue;

        const impulse = (-(1 + this.restitution) * relDot) / 2;
        a.vx -= impulse * nx;
        a.vy -= impulse * ny;
        a.vz -= impulse * nz;
        b.vx += impulse * nx;
        b.vy += impulse * ny;
        b.vz += impulse * nz;
      }
    }
  }

  syncDOM(b) {
    applySphereOrientation(b.wrap, { x: b.x, y: b.y, z: b.z });
    const spin = Math.hypot(b.vx, b.vy, b.vz);
    const scatter = Math.min(spin / 90, 1) * this.intensity * 0.9;
    b.ballEl.style.setProperty('--scatter', scatter.toFixed(3));
    b.ballEl.classList.toggle('ball--scattering', scatter > 0.2);

    const frags = b.ballEl.querySelector('.ball-fragments');
    if (frags) {
      frags.style.setProperty('--frag-rot', `${this.time * (120 + spin * 0.4)}deg`);
    }

    if (spin > 30) {
      b.ballEl.classList.add('rolling');
    } else {
      b.ballEl.classList.remove('rolling');
    }
  }

  pickEjectBall() {
    if (!this.balls.length) return null;
    return this.balls.reduce((best, b) => (b.y > best.y ? b : best), this.balls[0]);
  }

  hideBall(ball) {
    ball.wrap.style.visibility = 'hidden';
    ball.wrap.style.pointerEvents = 'none';
  }

  destroy(clearContainer = true) {
    this.stop();
    this.balls = [];
    if (clearContainer && this.container) {
      this.container.innerHTML = '';
    }
  }
}

async function tumblePhysics(durationMs, intensity = 1) {
  if (!spherePhysics) return;
  spherePhysics.setIntensity(intensity);
  spherePhysics.start();
  await sleep(durationMs);
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
  if (!spherePhysics) return;
  spherePhysics.init(SPHERE_BALL_COUNT, true);
}

function startPhysicsDraw() {
  if (!spherePhysics) return;
  spherePhysics.setGhost(false);
  spherePhysics.balls.forEach((b) => {
    const speed = 120 + Math.random() * 160;
    b.vx = (Math.random() - 0.5) * speed;
    b.vy = (Math.random() - 0.5) * speed;
    b.vz = (Math.random() - 0.5) * speed;
    spherePhysics.setBallNumber(b, Math.floor(Math.random() * MAX) + 1);
  });
}

function setSphereState(state) {
  ballsDisplay.classList.toggle('is-drawing', state === 'drawing');
  ballsDisplay.classList.toggle('is-complete', state === 'complete');
  ballsDisplay.classList.toggle('is-idle', state === 'idle');

  const tumbler = document.getElementById('sphere-tumbler');
  const globe = document.getElementById('sphere-globe');
  const status = document.getElementById('sphere-status');

  if (tumbler) {
    tumbler.classList.toggle('physics-active', state === 'drawing' || state === 'ejecting');
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
  if (spherePhysics) spherePhysics.destroy();
  buildSphereMachine();
  spherePhysics = new SpherePhysics(document.getElementById('sphere-tumbler'));
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

  const color = getBallColor(num);
  const scene = document.querySelector('.sphere-scene');

  if (spherePhysics) {
    const target = spherePhysics.pickEjectBall();
    if (target) {
      spawnFragmentBurst(scene, color);
      spherePhysics.hideBall(target);
    }
    spherePhysics.slowDown(0.25);
    await sleep(120);
    spherePhysics.stop();
  }

  const flyer = document.getElementById('sphere-flyer');
  const exit = document.getElementById('sphere-exit');

  if (flyer) {
    flyer.innerHTML = '';
    const flyBall = createBall(num, false, 'sphere-ball sphere-ball--fly ball--reassemble', { fragmented: true });
    flyBall.style.setProperty('--scatter', '1');
    flyer.appendChild(flyBall);
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
  startPhysicsDraw();
  spherePhysics.start();

  await sleep(500);

  for (let i = 0; i < COUNT; i++) {
    const intensity = 1 + i * 0.18;
    const tumbleMs = 2000 + i * 450;
    await tumblePhysics(tumbleMs, intensity);

    await ejectBall(numbers[i]);
    setDrawBallSlot(i, numbers[i], true);

    if (i < COUNT - 1) {
      setSphereState('drawing');
      startPhysicsDraw();
      spherePhysics.start();
      await sleep(200);
    }
  }

  if (spherePhysics) spherePhysics.stop();
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
