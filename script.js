/**
 * Escape-room logic:
 * - Timer starts ONLY on the first code attempt (first click on "בדיקה/אישור").
 * - Wrong format (not 6 digits): +5s penalty
 * - Wrong code: +10s penalty + sad sound
 * - Correct code: success sound + next page
 * - HUD (timer/penalty/wrongs) updates on every page.
 */

const GAME_KEY = "neilMission_v2";

function nowMs(){ return Date.now(); }

function loadState(){
  try { return JSON.parse(localStorage.getItem(GAME_KEY) || "{}"); }
  catch { return {}; }
}
function saveState(s){
  localStorage.setItem(GAME_KEY, JSON.stringify(s));
}

function ensureGameStarted(){
  const s = loadState();
  if (!s.startedAt) {
    s.startedAt = nowMs();
    s.penaltySec = s.penaltySec || 0;
    s.wrongAttempts = s.wrongAttempts || 0;
    saveState(s);
  }
  return s;
}

function getState(){
  const s = loadState();
  if (!("penaltySec" in s)) s.penaltySec = 0;
  if (!("wrongAttempts" in s)) s.wrongAttempts = 0;
  return s;
}

function formatTime(totalSec){
  totalSec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function updateHUD(){
  const s = getState();

  const tEl = document.getElementById("timer");
  const pEl = document.getElementById("penalty");
  const wEl = document.getElementById("wrongs");

  let elapsedSec = 0;
  if (s.startedAt) elapsedSec = (nowMs() - s.startedAt) / 1000;

  const totalSec = elapsedSec + (s.penaltySec || 0);

  if (tEl) tEl.textContent = formatTime(totalSec);
  if (pEl) pEl.textContent = `${s.penaltySec || 0}s`;
  if (wEl) wEl.textContent = String(s.wrongAttempts || 0);
}

function initHUD(){
  updateHUD();
  setInterval(updateHUD, 250);
}

function addPenalty(seconds){
  const s = getState();
  s.penaltySec = (s.penaltySec || 0) + seconds;
  s.wrongAttempts = (s.wrongAttempts || 0) + 1;
  saveState(s);
}

/** AUDIO (no external files) */
let audioCtx;

function getAudioCtx(){
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function tone(at, freq, dur, type='sine', gain=0.05){
  const ctx = getAudioCtx();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at+0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at+dur);
  o.connect(g).connect(ctx.destination);
  o.start(at);
  o.stop(at+dur+0.02);
}

function playSuccessSound(){
  try{
    const ctx = getAudioCtx();
    const t0 = ctx.currentTime;
    tone(t0+0.00, 110, 0.18, 'triangle', 0.06);
    tone(t0+0.22, 140, 0.16, 'triangle', 0.05);
    tone(t0+0.42, 180, 0.14, 'triangle', 0.05);
    tone(t0+0.70, 520, 0.08, 'sine', 0.04);
    tone(t0+0.82, 660, 0.08, 'sine', 0.04);
    tone(t0+0.94, 880, 0.10, 'sine', 0.045);
  } catch(e){}
}

function playSadSound(){
  try{
    const ctx = getAudioCtx();
    const t0 = ctx.currentTime;
    // a short descending "aww" / fail vibe
    tone(t0+0.00, 440, 0.14, 'sine', 0.035);
    tone(t0+0.16, 370, 0.16, 'sine', 0.032);
    tone(t0+0.34, 310, 0.22, 'sine', 0.030);
    tone(t0+0.58, 220, 0.20, 'triangle', 0.020);
  } catch(e){}
}

/** Matrix background (canvas) */
function startMatrixRain(){
  const c = document.getElementById("matrixCanvas");
  if (!c) return;

  const ctx = c.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ0123456789";
  let w, h, cols, drops;

  function resize(){
    w = c.width = window.innerWidth;
    h = c.height = window.innerHeight;
    cols = Math.floor(w / 18);
    drops = new Array(cols).fill(0).map(() => Math.random()*h/18);
  }
  window.addEventListener("resize", resize);
  resize();

  function draw(){
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0,0,w,h);

    ctx.font = "16px monospace";
    for (let i=0;i<cols;i++){
      const text = chars[Math.floor(Math.random()*chars.length)];
      const x = i * 18;
      const y = drops[i] * 18;

      ctx.fillStyle = "rgba(0,255,120,0.85)";
      ctx.fillText(text, x, y);

      if (y > h && Math.random() > 0.975) drops[i] = 0;
      drops[i] += 1;
    }
    requestAnimationFrame(draw);
  }
  draw();
}

/** Finish page summary */
function renderFinish(){
  const s = getState();
  if (!s.startedAt) return;

  const elapsedSec = (nowMs() - s.startedAt) / 1000;
  const totalSec = elapsedSec + (s.penaltySec || 0);

  const out = document.getElementById("finalScore");
  if (out){
    out.innerHTML = `
      <div><strong>זמן:</strong> ${formatTime(elapsedSec)}</div>
      <div><strong>קנסות:</strong> ${(s.penaltySec||0)} שניות</div>
      <div><strong>תוצאה סופית:</strong> ${formatTime(totalSec)}</div>
      <div class="small">טעויות: ${s.wrongAttempts||0}</div>
    `;
  }
}

/** Reset */
function resetGame(){
  localStorage.removeItem(GAME_KEY);
  alert("המשימה אופסה 🙂");
  window.location.href = "index.html";
}

/** Main checker */
function checkCode(correct, nextPage){
  // Start timer ONLY on first attempt
  ensureGameStarted();

  const el = document.getElementById("code");
  const val = (el ? el.value : "").trim();

  if (!/^\d{6}$/.test(val)) {
    addPenalty(5);
    playSadSound();
    alert("הקוד שגוי נסה שנית");
    return;
  }

  if (val === correct){
    playSuccessSound();
    window.location.href = nextPage;
  } else {
    addPenalty(10);
    playSadSound();
    alert("הקוד שגוי נסה שנית");
  }
}