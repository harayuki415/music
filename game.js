const stage = document.querySelector("#stage");
const wrap = document.querySelector(".stage-wrap");
const canvas = document.querySelector("#burstCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.querySelector("#startBtn");
const bpmInput = document.querySelector("#bpm");
const speedInput = document.querySelector("#speed");
const bpmValue = document.querySelector("#bpmValue");
const speedValue = document.querySelector("#speedValue");
const scoreEl = document.querySelector("#score");
const comboEl = document.querySelector("#combo");
const bestEl = document.querySelector("#best");
const judgeEl = document.querySelector("#judge");
const progressEl = document.querySelector("#progress");
const startScreen = document.querySelector("#startScreen");
const introStartBtn = document.querySelector("#introStartBtn");

const SPEEDS = {
  1: { label: "EASY", life: 1200, className: "" },
  2: { label: "NORMAL", life: 930, className: "fast" },
  3: { label: "HARD", life: 720, className: "hard" },
};

let audio;
let score = 0;
let combo = 0;
let best = Number(localStorage.getItem("mouse-beat-best") || 0);
let running = false;
let beatTimer = 0;
let endTimer = 0;
let halfBeatTimer = 0;
let startedAt = 0;
let roundLength = 45000;
let beatIndex = 0;
let particles = [];

bestEl.textContent = best.toLocaleString();

function resizeCanvas() {
  const rect = wrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor(rect.height * ratio);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function ensureAudio() {
  if (!audio) {
    audio = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audio.state === "suspended") {
    audio.resume();
  }
}

function tone(freq, duration, type = "sine", gainValue = 0.05) {
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const now = audio.currentTime;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(gainValue, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(now);
  osc.stop(now + duration);
}

function playBeat(accent) {
  tone(accent ? 190 : 120, 0.08, "triangle", accent ? 0.09 : 0.045);
  if (accent) tone(720, 0.035, "square", 0.025);
}

function playHit(kind) {
  if (kind === "PERFECT") {
    tone(880, 0.07, "sine", 0.07);
    tone(1320, 0.08, "sine", 0.035);
  } else {
    tone(520, 0.06, "triangle", 0.05);
  }
}

function setJudge(text, color) {
  judgeEl.textContent = text;
  judgeEl.style.color = color || "";
}

function updateControls() {
  bpmValue.textContent = bpmInput.value;
  speedValue.textContent = SPEEDS[speedInput.value].label;
}

function resetGame() {
  score = 0;
  combo = 0;
  beatIndex = 0;
  scoreEl.textContent = "0";
  comboEl.textContent = "0";
  progressEl.style.width = "0%";
  setJudge("READY");
  document.querySelectorAll(".target").forEach((target) => target.remove());
}

function randomPoint() {
  const rect = stage.getBoundingClientRect();
  const margin = window.innerWidth < 760 ? 70 : 90;
  const panelAvoid = window.innerWidth < 760 ? 180 : 250;
  const topAvoid = window.innerWidth < 760 ? 160 : 120;
  return {
    x: margin + Math.random() * Math.max(20, rect.width - margin * 2 - (window.innerWidth < 760 ? 0 : panelAvoid)),
    y: topAvoid + Math.random() * Math.max(20, rect.height - topAvoid - margin - (window.innerWidth < 760 ? panelAvoid : 0)),
  };
}

function spawnTarget() {
  const settings = SPEEDS[speedInput.value];
  const point = randomPoint();
  const target = document.createElement("button");
  target.type = "button";
  target.className = `target ${settings.className}`;
  target.style.left = `${point.x}px`;
  target.style.top = `${point.y}px`;
  target.style.setProperty("--life", `${settings.life}ms`);
  target.dataset.born = String(performance.now());
  target.dataset.life = String(settings.life);
  target.setAttribute("aria-label", "beat target");

  target.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    hitTarget(target, event.clientX, event.clientY);
  }, { once: true });

  stage.append(target);
  window.setTimeout(() => {
    if (target.isConnected) missTarget(target);
  }, settings.life);
}

function hitTarget(target, clientX, clientY) {
  const born = Number(target.dataset.born);
  const life = Number(target.dataset.life);
  const age = performance.now() - born;
  const center = life * 0.68;
  const delta = Math.abs(age - center);
  const perfect = delta < 95;
  const good = delta < 190;
  const kind = perfect ? "PERFECT" : good ? "GOOD" : "OK";
  const points = perfect ? 1100 : good ? 750 : 420;
  combo += 1;
  score += points + combo * 9;
  scoreEl.textContent = score.toLocaleString();
  comboEl.textContent = combo.toLocaleString();
  setJudge(kind, perfect ? "var(--green)" : good ? "var(--gold)" : "var(--cyan)");
  playHit(kind);
  target.classList.add("hit-perfect");
  makeBurst(clientX, clientY, perfect ? 18 : 11, perfect ? "#85e06d" : "#2de3d0");
  wrap.classList.remove("flash");
  void wrap.offsetWidth;
  wrap.classList.add("flash");
  target.remove();
}

function missTarget(target) {
  combo = 0;
  comboEl.textContent = "0";
  setJudge("MISS", "var(--red)");
  tone(82, 0.12, "sawtooth", 0.035);
  wrap.classList.remove("shake");
  void wrap.offsetWidth;
  wrap.classList.add("shake");
  target.remove();
}

function makeBurst(clientX, clientY, amount, color) {
  const rect = canvas.getBoundingClientRect();
  for (let i = 0; i < amount; i += 1) {
    const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.35;
    const speed = 2.2 + Math.random() * 4.5;
    particles.push({
      x: clientX - rect.left,
      y: clientY - rect.top,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color,
    });
  }
}

function drawParticles() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  particles = particles.filter((particle) => particle.life > 0.02);
  for (const particle of particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.05;
    particle.life *= 0.94;
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 3 + particle.life * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(drawParticles);
}

function tick() {
  if (!running) return;
  const beatMs = 60000 / Number(bpmInput.value);
  const accent = beatIndex % 4 === 0;
  playBeat(accent);
  spawnTarget();
  if (accent && speedInput.value !== "1") {
    halfBeatTimer = window.setTimeout(() => {
      if (running) spawnTarget();
    }, beatMs / 2);
  }
  beatIndex += 1;
  beatTimer = window.setTimeout(tick, beatMs);
}

function updateProgress() {
  if (!running) return;
  const elapsed = performance.now() - startedAt;
  progressEl.style.width = `${Math.min(100, elapsed / roundLength * 100)}%`;
  requestAnimationFrame(updateProgress);
}

function finishGame() {
  running = false;
  window.clearTimeout(beatTimer);
  window.clearTimeout(halfBeatTimer);
  document.querySelectorAll(".target").forEach((target) => target.remove());
  if (score > best) {
    best = score;
    localStorage.setItem("mouse-beat-best", String(best));
    bestEl.textContent = best.toLocaleString();
    setJudge("NEW BEST", "var(--gold)");
  } else {
    setJudge("FINISH");
  }
  startBtn.textContent = "RESTART";
}

function startGame() {
  ensureAudio();
  startScreen?.classList.add("is-hidden");
  running = false;
  window.clearTimeout(beatTimer);
  window.clearTimeout(halfBeatTimer);
  window.clearTimeout(endTimer);
  resetGame();
  running = true;
  startedAt = performance.now();
  startBtn.textContent = "PLAYING";
  tick();
  updateProgress();
  endTimer = window.setTimeout(finishGame, roundLength);
}

startBtn.addEventListener("click", startGame);
introStartBtn?.addEventListener("click", startGame);
bpmInput.addEventListener("input", updateControls);
speedInput.addEventListener("input", updateControls);
window.addEventListener("resize", resizeCanvas);

resizeCanvas();
updateControls();
drawParticles();
