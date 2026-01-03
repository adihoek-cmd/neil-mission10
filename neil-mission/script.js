/**
 * Simple "escape room" logic:
 * - Timer starts on index.html when player clicks "התחל" or enters correct SMS code.
 * - Penalty adds +10s for each wrong code attempt.
 * - Stored in localStorage to persist across pages.
 */

const GAME_KEY = "neilMission_v1";

function nowMs(){ return Date.now(); }

function loadState(){
  try { return JSON.parse(localStorage.getItem(GAME_KEY) || "{}"); }
  catch { return {}; }
}
function saveState(s){
  localStorage.setItem(GAME_KEY, JSON.stringify(s));
}

function ensureState(){
  const s = loadState();
  if (!s.startedAt) {
    s.startedAt = nowMs();
    s.penaltySec = 0;
    s.wrongAttempts = 0;
    s.lastPage = "index.html";
    saveState(s);
  }
  return s;
}

function formatTime(totalSec){
  totalSec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function updateTimerUI(){
  const s = loadState();
  if (!s.startedAt) return;
  const elapsedSec = (nowMs() - s.startedAt) / 1000;
  const totalSec = elapsedSec + (s.penaltySec || 0);
  const t = document.getElementById("timer");
  const p = document.getElementById("penalty");
  const w = document.getElementById("wrongs");
  if (t) t.textContent = formatTime(totalSec);
  if (p) p.textContent = `${s.penaltySec || 0}s`;
  if (w) w.textContent = String(s.wrongAttempts || 0);
}

function startTimerIfNeeded(){
  ensureState();
  updateTimerUI();
  setInterval(updateTimerUI, 250);
}

function addPenalty(seconds){
  const s = ensureState();
  s.penaltySec = (s.penaltySec || 0) + seconds;
  s.wrongAttempts = (s.wrongAttempts || 0) + 1;
  saveState(s);
}

function setLastPage(name){
  const s = ensureState();
  s.lastPage = name;
  saveState(s);
}

/** Code checking */
function checkCode(correct, nextPage){
  const el = document.getElementById("code");
  const val = (el ? el.value : "").trim();

  // enforce 6 digits
  if (!/^\d{6}$/.test(val)) {
    addPenalty(5);
    alert("הקוד שגוי נסה שנית");
    return;
  }

  if (val === correct){
    setLastPage(nextPage);
    window.location.href = nextPage;
  } else {
    addPenalty(10);
    alert("הקוד שגוי נסה שנית");
  }
}

/** Intro sound (no external files): small sci‑fi sequence */
let audioCtx;
function playIntroSound(){
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;

    function beep(at, freq, dur, type='sine', gain=0.05){
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, at);
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(gain, at+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at+dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(at);
      o.stop(at+dur+0.02);
    }

    // little "XPENG lab" vibe: low thumps + rising chirps
    beep(t0+0.00, 110, 0.20, 'triangle', 0.06);
    beep(t0+0.25, 130, 0.18, 'triangle', 0.05);
    beep(t0+0.48, 165, 0.16, 'triangle', 0.05);

    beep(t0+0.80, 520, 0.08, 'sine', 0.04);
    beep(t0+0.92, 660, 0.08, 'sine', 0.04);
    beep(t0+1.04, 880, 0.10, 'sine', 0.045);

    beep(t0+1.25, 740, 0.12, 'square', 0.02);
    beep(t0+1.40, 988, 0.12, 'square', 0.02);
  } catch(e){
    // if audio blocked, do nothing
  }
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
  const s = loadState();
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

/** Utility: reset game (hidden) */
function resetGame(){
  localStorage.removeItem(GAME_KEY);
  alert("אופס… המערכת אופסה 🙂");
  window.location.href = "index.html";
}