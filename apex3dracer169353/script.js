/**
 * APEX 3D RACER — Modern Full-Stack WebGL/Canvas Racing Engine
 */

// Global Application Configuration & State
const CONFIG = {
  apiBaseUrl: "https://trumpledroid-api.cloudbeta28624.workers.dev",
  appId: "apex3dracer",
  fps: 60,
  segmentLength: 200,
  rumbleLength: 3,
  lanes: 3,
  fieldOfView: 100,
  cameraHeight: 1000,
  drawDistance: 300,
  fogDensity: 5
};

// Track Presets
const TRACKS = {
  neon: {
    id: "neon",
    name: "NEON CYBER METROPOLIS",
    length: 1200,
    skyColor: "#050814",
    horizonColor: "#0f172a",
    roadColor: "#1e293b",
    grassColor: "#020617",
    rumbleColor: "#06b6d4",
    laneColor: "#ffffff",
    fogColor: "#050814",
    weather: "clear"
  },
  alpine: {
    id: "alpine",
    name: "ALPINE SUNSET PASS",
    length: 1500,
    skyColor: "#451a03",
    horizonColor: "#7c2d12",
    roadColor: "#334155",
    grassColor: "#14532d",
    rumbleColor: "#f59e0b",
    laneColor: "#fef08a",
    fogColor: "#451a03",
    weather: "sunset"
  },
  ocean: {
    id: "ocean",
    name: "PACIFIC COAST HIGHWAY",
    length: 1800,
    skyColor: "#0284c7",
    horizonColor: "#38bdf8",
    roadColor: "#475569",
    grassColor: "#15803d",
    rumbleColor: "#ef4444",
    laneColor: "#ffffff",
    fogColor: "#38bdf8",
    weather: "day"
  },
  rain: {
    id: "rain",
    name: "TOKYO RAIN EXPRESS",
    length: 1400,
    skyColor: "#090d16",
    horizonColor: "#1e1b4b",
    roadColor: "#0f172a",
    grassColor: "#030712",
    rumbleColor: "#a855f7",
    laneColor: "#38bdf8",
    fogColor: "#090d16",
    weather: "rain"
  }
};

// Application State
let appState = {
  token: localStorage.getItem("apex_token") || null,
  userEmail: localStorage.getItem("apex_user") || null,
  activeTrackKey: "neon",
  garage: {
    car_id: "spectre",
    color: "#06b6d4",
    spoiler: "gt",
    engine_level: 2,
    handling_level: 2
  },
  highScores: [],
  raceState: "MENU", // MENU, COUNTDOWN, RACING, PAUSED, FINISHED
  soundEnabled: true
};

// Game Dynamic Runtime Variables
let raceRuntime = {
  segments: [],
  trackLength: 0,
  playerX: 0,
  position: 0,
  speed: 0,
  maxSpeed: 240, // Base top speed MPH
  accel: 80,
  braking: 120,
  decel: 30,
  offRoadDecel: 150,
  offRoadLimit: 80,
  nitro: 100,
  isBoosting: false,
  driftScore: 0,
  collisions: 0,
  currentLap: 1,
  totalLaps: 3,
  lapTimes: [],
  currentLapTime: 0,
  raceTimeMs: 0,
  topSpeedAchieved: 0,
  positionInRace: 1,
  aiCars: [],
  keys: { left: false, right: false, up: false, down: false, boost: false }
};

// Web Audio API Audio Engine Context
let audioCtx = null;
let engineOsc = null;
let engineGain = null;

// ==========================================
// 1. INITIALIZATION & DOM BINDINGS
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
  initBackgroundCanvas();
  setupEventListeners();
  loadMetaAndSchema();
  setupGaragePreview();
  renderLeaderboardTable();

  // Resize canvas event handler
  window.addEventListener("resize", resizeRaceCanvas);
  resizeRaceCanvas();

  // Restore User UI State
  updateUserUI();
});

// Load app-meta.json & api_schema.json dynamically
async function loadMetaAndSchema() {
  try {
    const metaRes = await fetch("app-meta.json");
    const meta = await metaRes.json();
    CONFIG.appId = meta.app_name || "apex3dracer";

    const schemaRes = await fetch("api_schema.json");
    const schema = await schemaRes.json();
    if (schema.api_base_url) CONFIG.apiBaseUrl = schema.api_base_url;
  } catch (err) {
    console.warn("Using fallback local config settings", err);
  }
}

// Canvas Screen Resizing
function resizeRaceCanvas() {
  const canvas = document.getElementById("raceCanvas");
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Dynamic Cyber Background Canvas
function initBackgroundCanvas() {
  const bg = document.getElementById("bgGridCanvas");
  if (!bg) return;
  const ctx = bg.getContext("2d");
  let w = (bg.width = window.innerWidth);
  let h = (bg.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = bg.width = window.innerWidth;
    h = bg.height = window.innerHeight;
  });

  let offset = 0;
  function animateBg() {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
    ctx.lineWidth = 1;

    offset = (offset + 0.5) % 40;

    // Grid Perspective Lines
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offset; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    requestAnimationFrame(animateBg);
  }
  animateBg();
}

// ==========================================
// 2. BACKEND & AUTHENTICATION API CLIENT
// ==========================================
async function authFetch(endpoint, method = "GET", body = null) {
  const headers = { "Content-Type": "application/json" };
  if (appState.token) {
    headers["Authorization"] = `Bearer ${appState.token}`;
  }

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  try {
    const res = await fetch(`${CONFIG.apiBaseUrl}${endpoint}`, opts);
    return await res.json();
  } catch (e) {
    console.error("API Fetch Error:", e);
    return { success: false, error: e.message };
  }
}

function updateUserUI() {
  const nameLabel = document.getElementById("userProfileName");
  if (appState.userEmail) {
    nameLabel.textContent = appState.userEmail.split("@")[0].toUpperCase();
  } else {
    nameLabel.textContent = "SIGN IN / REGISTER";
  }
}

// User Authentication Submit Handlers
async function handleAuthSubmit(e) {
  e.preventDefault();
  const isLogin = document.getElementById("tabLogin").classList.contains("bg-cyan-500");
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value.trim();
  const statusEl = document.getElementById("authStatus");

  statusEl.classList.remove("hidden");
  statusEl.textContent = "Authenticating driver profile...";

  if (isLogin) {
    const res = await authFetch("/login", "POST", { app_id: CONFIG.appId, email, password });
    if (res.token) {
      appState.token = res.token;
      appState.userEmail = email;
      localStorage.setItem("apex_token", res.token);
      localStorage.setItem("apex_user", email);
      statusEl.classList.add("hidden");
      document.getElementById("authModal").classList.add("hidden");
      updateUserUI();
      syncUserGarage();
    } else {
      statusEl.textContent = res.error || "Login failed. Check email & password.";
    }
  } else {
    // Signup sequence: 1. /register -> 2. /login
    const regRes = await authFetch("/register", "POST", { app_id: CONFIG.appId, email, password });
    if (regRes.success || regRes.message || !regRes.error) {
      const loginRes = await authFetch("/login", "POST", { app_id: CONFIG.appId, email, password });
      if (loginRes.token) {
        appState.token = loginRes.token;
        appState.userEmail = email;
        localStorage.setItem("apex_token", loginRes.token);
        localStorage.setItem("apex_user", email);
        statusEl.classList.add("hidden");
        document.getElementById("authModal").classList.add("hidden");
        updateUserUI();
        syncUserGarage();
      } else {
        statusEl.textContent = "Registered! Please sign in with your password.";
      }
    } else {
      statusEl.textContent = regRes.error || "Registration error occurred.";
    }
  }
}

// OTP Password Reset Handlers
async function requestOTP() {
  const email = document.getElementById("otpEmail").value.trim();
  if (!email) return alert("Please enter email address.");
  const res = await authFetch("/request-otp", "POST", { app_id: CONFIG.appId, email });
  alert(res.message || "OTP Sent! Please check your Gmail mailbox.");
}

async function confirmResetOTP() {
  const email = document.getElementById("otpEmail").value.trim();
  const otp = document.getElementById("otpCode").value.trim();
  const new_password = document.getElementById("otpNewPassword").value.trim();
  if (!email || !otp || !new_password) return alert("Fill all OTP fields.");

  const res = await authFetch("/reset-password", "POST", { app_id: CONFIG.appId, email, otp, new_password });
  if (res.success || !res.error) {
    alert("Password reset successfully! You can now login.");
    document.getElementById("otpResetPanel").classList.add("hidden");
  } else {
    alert(res.error || "Failed to reset password.");
  }
}

// Sync Garage settings to worker DB
async function syncUserGarage() {
  if (!appState.token) return;
  const dataPayload = {
    collection: "garage",
    data: appState.garage
  };
  await authFetch("/data", "POST", dataPayload);
}

// Save Race Record to Leaderboard Cloud Database
async function saveScoreToLeaderboard(lapTime, totalScore, topSpeed) {
  if (!appState.token) return;
  const record = {
    collection: "leaderboards",
    data: {
      player_name: appState.userEmail ? appState.userEmail.split("@")[0] : "Driver",
      track_id: appState.activeTrackKey,
      car_model: appState.garage.car_id,
      score: totalScore,
      lap_time: lapTime,
      top_speed: topSpeed
    }
  };
  await authFetch("/data", "POST", record);
  renderLeaderboardTable();
}

// Render Leaderboard Records
async function renderLeaderboardTable() {
  const tbody = document.getElementById("leaderboardTableBody");
  if (!tbody) return;

  let records = [];
  if (appState.token) {
    const res = await authFetch("/data?collection=leaderboards");
    if (res.records) {
      records = res.records.map(r => r.data);
    }
  }

  // Fallback / Pre-populated local high scores
  if (records.length === 0) {
    records = [
      { player_name: "ApexRacer99", track_id: "neon", score: 18450, lap_time: 42.12, top_speed: 235 },
      { player_name: "CyberDrifter", track_id: "alpine", score: 16200, lap_time: 48.90, top_speed: 210 },
      { player_name: "NeonViper", track_id: "ocean", score: 15100, lap_time: 51.05, top_speed: 220 }
    ];
  }

  // Sort by highest score
  records.sort((a, b) => b.score - a.score);

  tbody.innerHTML = records.slice(0, 10).map((item, index) => `
    <tr class="hover:bg-slate-900/40 transition-colors">
      <td class="p-3 sm:p-4 text-center font-mono font-bold text-cyan-400">#${index + 1}</td>
      <td class="p-3 sm:p-4 font-bold text-white">${item.player_name}</td>
      <td class="p-3 sm:p-4 uppercase text-[10px] text-slate-400 font-extrabold">${item.track_id}</td>
      <td class="p-3 sm:p-4 font-mono text-emerald-400 font-bold">${formatTime(item.lap_time * 1000)}</td>
      <td class="p-3 sm:p-4 text-right font-mono font-black text-amber-400">${item.score.toLocaleString()}</td>
    </tr>
  `).join("");
}

// ==========================================
// 3. WEB AUDIO API SYNTHESIZER
// ==========================================
function initAudioEngine() {
  if (audioCtx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();

  // Engine Rev Oscillator
  engineOsc = audioCtx.createOscillator();
  engineGain = audioCtx.createGain();

  engineOsc.type = "sawtooth";
  engineOsc.frequency.setValueAtTime(60, audioCtx.currentTime);

  // Lowpass Filter for depth
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;

  engineGain.gain.setValueAtTime(0.05, audioCtx.currentTime);

  engineOsc.connect(filter);
  filter.connect(engineGain);
  engineGain.connect(audioCtx.destination);

  engineOsc.start();
}

function updateEngineAudio(speedRatio) {
  if (!audioCtx || !engineOsc || !appState.soundEnabled) return;
  const baseFreq = 60 + speedRatio * 320;
  engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.05);
}

function playCrashSound() {
  if (!audioCtx || !appState.soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);

  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// ==========================================
// 4. 3D ROAD & WORLD PROJECTION ENGINE
// ==========================================
function buildTrackSegments(trackKey) {
  const track = TRACKS[trackKey] || TRACKS.neon;
  raceRuntime.segments = [];

  function addRoad(enter, hold, leave, curve, height) {
    const total = enter + hold + leave;
    for (let n = 0; n < total; n++) {
      const curveVal = easeIn(0, curve, n / total);
      const heightVal = easeIn(0, height, n / total);
      raceRuntime.segments.push({
        index: raceRuntime.segments.length,
        p1: { world: { y: lastHeight(), z: raceRuntime.segments.length * CONFIG.segmentLength }, camera: {}, screen: {} },
        p2: { world: { y: lastHeight() + heightVal, z: (raceRuntime.segments.length + 1) * CONFIG.segmentLength }, camera: {}, screen: {} },
        curve: curveVal,
        color: Math.floor(raceRuntime.segments.length / CONFIG.rumbleLength) % 2 ? 
               { road: track.roadColor, grass: track.grassColor, rumble: track.rumbleColor, lane: track.laneColor } : 
               { road: "#0f172a", grass: track.grassColor, rumble: "#ffffff", lane: "transparent" },
        sprites: [],
        cars: []
      });
    }
  }

  function lastHeight() {
    return raceRuntime.segments.length === 0 ? 0 : raceRuntime.segments[raceRuntime.segments.length - 1].p2.world.y;
  }

  function easeIn(a, b, percent) {
    return a + (b - a) * Math.pow(percent, 2);
  }

  // Construct Circuit Sections
  addRoad(50, 50, 50, 0, 0); // Straight start
  addRoad(100, 100, 100, 3, 2000); // Hill & Right Turn
  addRoad(80, 80, 80, -4, -1500); // Sharp Left Drop
  addRoad(120, 120, 120, 0, 0); // Tunnel Straight
  addRoad(100, 100, 100, 5, 1000); // S-Curves
  addRoad(80, 80, 80, -5, 0);
  addRoad(100, 100, 100, 0, 0); // Final Straightaway

  raceRuntime.trackLength = raceRuntime.segments.length * CONFIG.segmentLength;

  // Populate Roadside Sprites (Trees, Neon Pillars, Archways)
  for (let i = 20; i < raceRuntime.segments.length; i += 8) {
    const side = Math.random() > 0.5 ? 1.8 : -1.8;
    raceRuntime.segments[i].sprites.push({ x: side, type: Math.random() > 0.5 ? "pillar" : "tree" });
  }

  // Populate AI Competitor Cars
  raceRuntime.aiCars = [
    { offset: -0.5, z: 800, speed: 180, color: "#e11d48" },
    { offset: 0.5, z: 1600, speed: 195, color: "#f59e0b" },
    { offset: 0, z: 2400, speed: 210, color: "#10b981" },
    { offset: -0.6, z: 3200, speed: 185, color: "#9333ea" },
    { offset: 0.6, z: 4000, speed: 205, color: "#f8fafc" }
  ];
}

// 3D Perspective Projection Matrix Helper
function projectPoint(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = (p.world.y || 0) - cameraY;
  p.camera.z = (p.world.z || 0) - cameraZ;

  p.screen.scale = cameraDepth / p.camera.z;
  p.screen.x = Math.round((width / 2) + (p.screen.scale * p.camera.x * width / 2));
  p.screen.y = Math.round((height / 2) - (p.screen.scale * p.camera.y * height / 2));
  p.screen.w = Math.round(p.screen.scale * roadWidth * width / 2);
}

// Render Polygon Trajectory
function drawPolygon(ctx, x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x2 - w2, y2);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x1 + w1, y1);
  ctx.closePath();
  ctx.fill();
}

// Render Main 3D Race Scene Loop
function render3DRaceFrame() {
  const canvas = document.getElementById("raceCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const track = TRACKS[appState.activeTrackKey] || TRACKS.neon;

  ctx.clearRect(0, 0, width, height);

  // 1. Render Dynamic Skybox & Gradient Horizon
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height / 2);
  skyGrad.addColorStop(0, track.skyColor);
  skyGrad.addColorStop(1, track.horizonColor);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height / 2);

  // 2. Render Horizon Sun / Moon Shader
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.arc(width * 0.7, height * 0.25, 80, 0, Math.PI * 2);
  ctx.fill();

  // Camera Coordinate Calculation
  const baseSegment = findSegment(raceRuntime.position);
  const cameraPercent = (raceRuntime.position % CONFIG.segmentLength) / CONFIG.segmentLength;
  const cameraY = CONFIG.cameraHeight + baseSegment.p1.world.y;
  const cameraZ = raceRuntime.position;
  const cameraX = raceRuntime.playerX * 1000;
  const cameraDepth = 1 / Math.tan((CONFIG.fieldOfView / 2) * Math.PI / 180);

  let dx = -(baseSegment.curve * cameraPercent);
  let x = 0;
  let maxY = height;

  // 3. Render 3D Segment Depth Buffer Loop
  for (let n = 0; n < CONFIG.drawDistance; n++) {
    const segment = raceRuntime.segments[(baseSegment.index + n) % raceRuntime.segments.length];
    const looped = segment.index < baseSegment.index;

    projectPoint(segment.p1, cameraX - x, cameraY, cameraZ - (looped ? raceRuntime.trackLength : 0), cameraDepth, width, height, 2000);
    projectPoint(segment.p2, cameraX - x - dx, cameraY, cameraZ - (looped ? raceRuntime.trackLength : 0), cameraDepth, width, height, 2000);

    x += dx;
    dx += segment.curve;

    if (segment.p1.camera.z <= cameraDepth || segment.p2.screen.y >= maxY) continue;

    // Draw Grass, Road, and Rumbles
    const p1 = segment.p1.screen;
    const p2 = segment.p2.screen;

    // Grass Background
    ctx.fillStyle = segment.color.grass;
    ctx.fillRect(0, p2.y, width, p1.y - p2.y);

    // Rumble Strips
    drawPolygon(ctx, p1.x, p1.y, p1.w * 1.2, p2.x, p2.y, p2.w * 1.2, segment.color.rumble);
    // Main Road Asphalt
    drawPolygon(ctx, p1.x, p1.y, p1.w, p2.x, p2.y, p2.w, segment.color.road);

    // Lane Markings
    if (segment.color.lane !== "transparent") {
      drawPolygon(ctx, p1.x, p1.y, p1.w * 0.02, p2.x, p2.y, p2.w * 0.02, segment.color.lane);
    }

    maxY = p2.y;
  }

  // 4. Render Roadside 3D Objects & AI Opponent Cars
  for (let n = CONFIG.drawDistance - 1; n > 0; n--) {
    const segment = raceRuntime.segments[(baseSegment.index + n) % raceRuntime.segments.length];

    // Render AI Cars
    raceRuntime.aiCars.forEach(car => {
      const carSeg = findSegment(car.z);
      if (carSeg.index === segment.index) {
        const scale = segment.p1.screen.scale;
        const spriteX = segment.p1.screen.x + (scale * car.offset * 1000 * width / 2);
        const spriteY = segment.p1.screen.y;
        const carWidth = 140 * scale * width / 2;
        const carHeight = 70 * scale * width / 2;

        if (carWidth > 5) {
          ctx.fillStyle = car.color;
          ctx.beginPath();
          ctx.roundRect(spriteX - carWidth / 2, spriteY - carHeight, carWidth, carHeight, 8);
          ctx.fill();
          // Car Rear Windshield
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(spriteX - carWidth * 0.35, spriteY - carHeight * 0.85, carWidth * 0.7, carHeight * 0.35);
          // Tail Lights
          ctx.fillStyle = "#f43f5e";
          ctx.fillRect(spriteX - carWidth * 0.45, spriteY - carHeight * 0.3, carWidth * 0.2, carHeight * 0.15);
          ctx.fillRect(spriteX + carWidth * 0.25, spriteY - carHeight * 0.3, carWidth * 0.2, carHeight * 0.15);
        }
      }
    });

    // Render Roadside Pillars/Poles
    segment.sprites.forEach(sprite => {
      const scale = segment.p1.screen.scale;
      const spriteX = segment.p1.screen.x + (scale * sprite.x * 1000 * width / 2);
      const spriteY = segment.p1.screen.y;
      const spriteW = 60 * scale * width / 2;
      const spriteH = 220 * scale * width / 2;

      if (spriteW > 2) {
        ctx.fillStyle = "#06b6d4";
        ctx.fillRect(spriteX - spriteW / 2, spriteY - spriteH, spriteW, spriteH);
      }
    });
  }

  // 5. Render Player Hypercar 3D Sprite with Dynamic Steering Tilt & Exhaust Nitros
  renderPlayerCarSprite(ctx, width, height);

  // 6. Rain Weather Particle Effects Overlay
  if (track.weather === "rain") {
    renderRainParticles(ctx, width, height);
  }
}

// Player Hypercar Canvas Sprite Renderer
function renderPlayerCarSprite(ctx, width, height) {
  const carWidth = Math.min(width * 0.32, 280);
  const carHeight = carWidth * 0.48;
  const centerX = width / 2;
  const bottomY = height - 40;

  // Steering Tilt Transformation Angle
  let tiltAngle = 0;
  if (raceRuntime.keys.left) tiltAngle = -0.08;
  if (raceRuntime.keys.right) tiltAngle = 0.08;

  ctx.save();
  ctx.translate(centerX, bottomY);
  ctx.rotate(tiltAngle);

  // Nitro Flames Particle Thrusters
  if (raceRuntime.isBoosting) {
    ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.moveTo(-carWidth * 0.25, 0);
    ctx.lineTo(-carWidth * 0.15, carHeight * 0.4 + Math.random() * 20);
    ctx.lineTo(-carWidth * 0.05, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(carWidth * 0.05, 0);
    ctx.lineTo(carWidth * 0.15, carHeight * 0.4 + Math.random() * 20);
    ctx.lineTo(carWidth * 0.25, 0);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Main Vehicle Chassis Base Shadow
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 5, carWidth * 0.52, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Car Body Paint
  ctx.fillStyle = appState.garage.color || "#06b6d4";
  ctx.beginPath();
  ctx.roundRect(-carWidth / 2, -carHeight, carWidth, carHeight * 0.75, 16);
  ctx.fill();

  // Cabin Glass Windshield
  ctx.fillStyle = "#020617";
  ctx.beginPath();
  ctx.roundRect(-carWidth * 0.35, -carHeight * 0.95, carWidth * 0.7, carHeight * 0.45, 10);
  ctx.fill();

  // Spoiler Wing
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-carWidth * 0.45, -carHeight * 1.05, carWidth * 0.9, 10);

  // LED Tail Lights & Rear Exhaust
  ctx.fillStyle = "#f43f5e";
  ctx.shadowColor = "#f43f5e";
  ctx.shadowBlur = 12;
  ctx.fillRect(-carWidth * 0.42, -carHeight * 0.35, carWidth * 0.25, 8);
  ctx.fillRect(carWidth * 0.17, -carHeight * 0.35, carWidth * 0.25, 8);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// Rain Weather Visual Particle Simulation
let rainDrops = [];
function renderRainParticles(ctx, width, height) {
  if (rainDrops.length === 0) {
    for (let i = 0; i < 80; i++) {
      rainDrops.push({ x: Math.random() * width, y: Math.random() * height, speed: 15 + Math.random() * 15, len: 10 + Math.random() * 15 });
    }
  }

  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  rainDrops.forEach(d => {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - 2, d.y + d.len);
    d.y += d.speed;
    d.x -= 2;
    if (d.y > height) {
      d.y = -20;
      d.x = Math.random() * width;
    }
  });
  ctx.stroke();
}

function findSegment(z) {
  return raceRuntime.segments[Math.floor(z / CONFIG.segmentLength) % raceRuntime.segments.length];
}

// ==========================================
// 5. VEHICLE PHYSICS & GAME TICK UPDATE
// ==========================================
let lastTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(1, (now - lastTime) / 1000);
  lastTime = now;

  if (appState.raceState === "RACING") {
    updatePhysics(dt);
    updateHUD();
  }

  render3DRaceFrame();
  requestAnimationFrame(gameLoop);
}

function updatePhysics(dt) {
  // Update Timers
  raceRuntime.raceTimeMs += dt * 1000;
  raceRuntime.currentLapTime += dt * 1000;

  const currentSeg = findSegment(raceRuntime.position);
  const speedRatio = raceRuntime.speed / raceRuntime.maxSpeed;

  // Steering Physics & Centrifugal Drift Force
  const dx = dt * 2 * speedRatio;
  if (raceRuntime.keys.left) raceRuntime.playerX -= dx;
  if (raceRuntime.keys.right) raceRuntime.playerX += dx;

  // Centrifugal Drag on Curves
  raceRuntime.playerX -= dx * speedRatio * currentSeg.curve * 0.3;

  // Nitro Acceleration Boosting
  if (raceRuntime.keys.boost && raceRuntime.nitro > 0) {
    raceRuntime.isBoosting = true;
    raceRuntime.nitro = Math.max(0, raceRuntime.nitro - dt * 35);
    raceRuntime.speed = Math.min(raceRuntime.maxSpeed + 40, raceRuntime.speed + raceRuntime.accel * dt * 2.5);
  } else {
    raceRuntime.isBoosting = false;
    raceRuntime.nitro = Math.min(100, raceRuntime.nitro + dt * 10);
  }

  // Throttle Acceleration / Braking
  if (raceRuntime.keys.up && !raceRuntime.isBoosting) {
    raceRuntime.speed = Math.min(raceRuntime.maxSpeed, raceRuntime.speed + raceRuntime.accel * dt);
  } else if (raceRuntime.keys.down) {
    raceRuntime.speed = Math.max(0, raceRuntime.speed - raceRuntime.braking * dt);
  } else if (!raceRuntime.isBoosting) {
    raceRuntime.speed = Math.max(0, raceRuntime.speed - raceRuntime.decel * dt);
  }

  // Off-Road Terrain Friction Penalty
  if ((raceRuntime.playerX < -1 || raceRuntime.playerX > 1) && raceRuntime.speed > raceRuntime.offRoadLimit) {
    raceRuntime.speed = Math.max(raceRuntime.offRoadLimit, raceRuntime.speed - raceRuntime.offRoadDecel * dt);
  }

  // Clamp Player Position
  raceRuntime.playerX = Math.max(-2, Math.min(2, raceRuntime.playerX));

  // Advance Position
  const prevPosition = raceRuntime.position;
  raceRuntime.position = (raceRuntime.position + raceRuntime.speed * dt * 100) % raceRuntime.trackLength;

  // Track Lap Progression
  if (raceRuntime.position < prevPosition) {
    raceRuntime.lapTimes.push(raceRuntime.currentLapTime);
    raceRuntime.currentLapTime = 0;
    raceRuntime.currentLap++;

    if (raceRuntime.currentLap > raceRuntime.totalLaps) {
      finishRace();
      return;
    } else {
      announceBanner(`LAP ${raceRuntime.currentLap}/${raceRuntime.totalLaps}`);
    }
  }

  // Dynamic Drift Score Calculation
  if (Math.abs(currentSeg.curve) > 2 && raceRuntime.speed > 120 && (raceRuntime.keys.left || raceRuntime.keys.right)) {
    raceRuntime.driftScore += Math.floor(dt * 500);
    showDriftBonusTag();
  } else {
    hideDriftBonusTag();
  }

  // Track Top Speed
  const currentMph = Math.floor(raceRuntime.speed);
  if (currentMph > raceRuntime.topSpeedAchieved) raceRuntime.topSpeedAchieved = currentMph;

  // AI Opponents Dynamic Progress
  raceRuntime.aiCars.forEach(car => {
    car.z = (car.z + car.speed * dt * 100) % raceRuntime.trackLength;
  });

  // Audio Synth Pitch Engine Sync
  updateEngineAudio(speedRatio);
}

// HUD Display Updates
function updateHUD() {
  document.getElementById("hudSpeed").textContent = Math.floor(raceRuntime.speed);
  document.getElementById("hudTimer").textContent = formatTime(raceRuntime.currentLapTime);
  document.getElementById("hudLap").textContent = raceRuntime.currentLap;
  document.getElementById("hudPos").textContent = raceRuntime.positionInRace;

  // Gear Calculation
  const gear = raceRuntime.speed === 0 ? "N" : Math.min(6, Math.floor(raceRuntime.speed / 40) + 1);
  document.getElementById("hudGear").textContent = gear;

  // Nitro Percentage Bar
  const nitroPct = Math.floor(raceRuntime.nitro);
  document.getElementById("nitroPercent").textContent = `${nitroPct}%`;
  document.getElementById("nitroBar").style.width = `${nitroPct}%`;

  // Radial RPM Gauge Bar
  const rpmBar = document.getElementById("rpmGaugeBar");
  if (rpmBar) {
    const rpmDash = (raceRuntime.speed / (raceRuntime.maxSpeed + 40)) * 132;
    rpmBar.style.strokeDasharray = `${rpmDash} 264`;
  }

  // Render Minimap Markers
  renderMinimap();
}

// Render Mini-Map Component
function renderMinimap() {
  const mini = document.getElementById("miniMapCanvas");
  if (!mini) return;
  const ctx = mini.getContext("2d");
  const w = (mini.width = mini.clientWidth);
  const h = (mini.height = mini.clientHeight);

  ctx.clearRect(0, 0, w, h);

  // Track Circuit Ring
  ctx.strokeStyle = "rgba(51, 65, 85, 0.8)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.35, 0, Math.PI * 2);
  ctx.stroke();

  // Player Marker Dot
  const playerAngle = (raceRuntime.position / raceRuntime.trackLength) * Math.PI * 2 - Math.PI / 2;
  const px = w / 2 + Math.cos(playerAngle) * (w * 0.35);
  const py = h / 2 + Math.sin(playerAngle) * (w * 0.35);

  ctx.fillStyle = "#06b6d4";
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();

  // AI Cars Markers
  raceRuntime.aiCars.forEach(car => {
    const aiAngle = (car.z / raceRuntime.trackLength) * Math.PI * 2 - Math.PI / 2;
    const ax = w / 2 + Math.cos(aiAngle) * (w * 0.35);
    const ay = h / 2 + Math.sin(aiAngle) * (w * 0.35);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.arc(ax, ay, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Format milliseconds into MM:SS.ms string
function formatTime(ms) {
  if (!ms || isNaN(ms)) return "00:00.00";
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor((ms % 1000) / 10);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${millis.toString().padStart(2, "0")}`;
}

// Banner Announcements (e.g. FINAL LAP, DRIFT BONUS)
function announceBanner(msg) {
  const el = document.getElementById("announceBanner");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("opacity-0", "scale-95");
  el.classList.add("opacity-100", "scale-100");
  setTimeout(() => {
    el.classList.add("opacity-0", "scale-95");
    el.classList.remove("opacity-100", "scale-100");
  }, 2000);
}

function showDriftBonusTag() {
  const tag = document.getElementById("driftTag");
  if (tag) {
    tag.classList.remove("hidden");
    document.getElementById("driftPoints").textContent = `+${raceRuntime.driftScore}`;
  }
}

function hideDriftBonusTag() {
  const tag = document.getElementById("driftTag");
  if (tag) tag.classList.add("hidden");
}

// ==========================================
// 6. RACE START, FINISH & SCORE CALCULATOR
// ==========================================
function startRaceSequence() {
  document.getElementById("menuOverlay").classList.add("hidden");
  appState.raceState = "COUNTDOWN";

  // Reset Runtime Engine
  buildTrackSegments(appState.activeTrackKey);
  raceRuntime.position = 0;
  raceRuntime.playerX = 0;
  raceRuntime.speed = 0;
  raceRuntime.currentLap = 1;
  raceRuntime.currentLapTime = 0;
  raceRuntime.raceTimeMs = 0;
  raceRuntime.driftScore = 0;
  raceRuntime.collisions = 0;
  raceRuntime.topSpeedAchieved = 0;
  raceRuntime.lapTimes = [];

  document.getElementById("hudTrackName").textContent = TRACKS[appState.activeTrackKey].name;

  // Countdown sequence 3... 2... 1... GO!
  const banner = document.getElementById("countdownBanner");
  banner.classList.remove("hidden");
  let count = 3;
  banner.textContent = count;

  initAudioEngine();

  const timer = setInterval(() => {
    count--;
    if (count > 0) {
      banner.textContent = count;
    } else if (count === 0) {
      banner.textContent = "GO!";
    } else {
      clearInterval(timer);
      banner.classList.add("hidden");
      appState.raceState = "RACING";
    }
  }, 800);
}

function finishRace() {
  appState.raceState = "FINISHED";

  // Local Offline Scoring Calculation logic (Deterministically computed in JS)
  const bestLapMs = Math.min(...raceRuntime.lapTimes);
  const totalScore = Math.max(0, Math.floor(
    (10000 - raceRuntime.raceTimeMs / 10) + 
    (raceRuntime.driftScore * 2) + 
    (raceRuntime.topSpeedAchieved * 15) - 
    (raceRuntime.collisions * 200)
  ));

  // Populate Victory Modal Results
  document.getElementById("resTotalTime").textContent = formatTime(raceRuntime.raceTimeMs);
  document.getElementById("resBestLap").textContent = formatTime(bestLapMs);
  document.getElementById("resTopSpeed").textContent = `${raceRuntime.topSpeedAchieved} MPH`;
  document.getElementById("resDriftPoints").textContent = `+${raceRuntime.driftScore.toLocaleString()} PTS`;
  document.getElementById("resFinalScore").textContent = totalScore.toLocaleString();

  // Save score to Generic Cloud Backend API
  saveScoreToLeaderboard(bestLapMs / 1000, totalScore, raceRuntime.topSpeedAchieved);

  // Show Overlay
  document.getElementById("menuOverlay").classList.remove("hidden");
  switchMenuView("results");
}

// ==========================================
// 7. GARAGE 3D INTERACTIVE CAR PREVIEW STUDIO
// ==========================================
let garageAngle = 0;
function setupGaragePreview() {
  const canvas = document.getElementById("garageCarCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let isDragging = false;
  let startX = 0;

  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
  });
  window.addEventListener("mouseup", () => (isDragging = false));
  window.addEventListener("mousemove", (e) => {
    if (isDragging) {
      garageAngle += (e.clientX - startX) * 0.01;
      startX = e.clientX;
    }
  });

  function renderGarageCar() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!isDragging) garageAngle += 0.01; // Slow auto rotation

    ctx.save();
    ctx.translate(w / 2, h / 2 + 20);
    ctx.rotate(garageAngle);

    // Car Render Preview
    const carW = 180;
    const carH = 90;

    // Pedestal Floor Shadow
    ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 120, 60, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Paint
    ctx.fillStyle = appState.garage.color || "#06b6d4";
    ctx.beginPath();
    ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 16);
    ctx.fill();

    // Roof Glass
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(-carW * 0.3, -carH * 0.35, carW * 0.6, carH * 0.7);

    ctx.restore();
    requestAnimationFrame(renderGarageCar);
  }
  renderGarageCar();
}

// Switch UI Overlay Menu Views
function switchMenuView(viewName) {
  const views = ["Main", "Garage", "Tracks", "Leaderboard", "Pause", "Results"];
  views.forEach(v => {
    const el = document.getElementById(`view${v}`);
    if (el) el.classList.add("hidden");
  });

  const target = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
  if (target) target.classList.remove("hidden");
}

// ==========================================
// 8. EVENT LISTENERS & INPUT MAPPING
// ==========================================
function setupEventListeners() {
  // Navigation Menu Buttons
  document.getElementById("btnQuickRace").addEventListener("click", startRaceSequence);
  document.getElementById("btnOpenGarage").addEventListener("click", () => switchMenuView("garage"));
  document.getElementById("btnOpenTracks").addEventListener("click", () => switchMenuView("tracks"));
  document.getElementById("btnOpenLeaderboard").addEventListener("click", () => {
    switchMenuView("leaderboard");
    renderLeaderboardTable();
  });

  document.getElementById("btnBackFromGarage").addEventListener("click", () => switchMenuView("main"));
  document.getElementById("btnBackFromTracks").addEventListener("click", () => switchMenuView("main"));
  document.getElementById("btnBackFromLeaderboard").addEventListener("click", () => switchMenuView("main"));

  // Pause Controls
  document.getElementById("btnPause").addEventListener("click", () => {
    appState.raceState = "PAUSED";
    document.getElementById("menuOverlay").classList.remove("hidden");
    switchMenuView("pause");
  });
  document.getElementById("btnResumeRace").addEventListener("click", () => {
    document.getElementById("menuOverlay").classList.add("hidden");
    appState.raceState = "RACING";
  });
  document.getElementById("btnRestartRace").addEventListener("click", startRaceSequence);
  document.getElementById("btnQuitToMenu").addEventListener("click", () => switchMenuView("main"));

  // Results Screen Buttons
  document.getElementById("btnResultRestart").addEventListener("click", startRaceSequence);
  document.getElementById("btnResultMenu").addEventListener("click", () => switchMenuView("main"));

  // Auth Modal Controls
  document.getElementById("btnAuthOpen").addEventListener("click", () => {
    document.getElementById("authModal").classList.remove("hidden");
  });
  document.getElementById("btnCloseAuth").addEventListener("click", () => {
    document.getElementById("authModal").classList.add("hidden");
  });
  document.getElementById("authForm").addEventListener("submit", handleAuthSubmit);

  // OTP Handlers
  document.getElementById("btnForgotPass").addEventListener("click", () => {
    document.getElementById("otpResetPanel").classList.toggle("hidden");
  });
  document.getElementById("btnRequestOtp").addEventListener("click", requestOTP);
  document.getElementById("btnResetPassword").addEventListener("click", confirmResetOTP);

  // Auth Tabs
  document.getElementById("tabLogin").addEventListener("click", () => {
    document.getElementById("tabLogin").className = "flex-1 py-2 rounded-lg bg-cyan-500 text-slate-950";
    document.getElementById("tabRegister").className = "flex-1 py-2 rounded-lg text-slate-400";
    document.getElementById("btnAuthSubmit").textContent = "LOGIN TO ACCOUNT";
  });
  document.getElementById("tabRegister").addEventListener("click", () => {
    document.getElementById("tabRegister").className = "flex-1 py-2 rounded-lg bg-cyan-500 text-slate-950";
    document.getElementById("tabLogin").className = "flex-1 py-2 rounded-lg text-slate-400";
    document.getElementById("btnAuthSubmit").textContent = "REGISTER NEW DRIVER";
  });

  // Track Selector Cards
  document.querySelectorAll(".track-card").forEach(card => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".track-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      appState.activeTrackKey = card.dataset.track;
    });
  });

  // Garage Color Paint Swatches
  document.querySelectorAll(".color-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      appState.garage.color = swatch.dataset.color;
    });
  });

  // Keyboard Driving Controls Mapping
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "KeyW"].includes(e.code)) raceRuntime.keys.up = true;
    if (["ArrowDown", "KeyS"].includes(e.code)) raceRuntime.keys.down = true;
    if (["ArrowLeft", "KeyA"].includes(e.code)) raceRuntime.keys.left = true;
    if (["ArrowRight", "KeyD"].includes(e.code)) raceRuntime.keys.right = true;
    if (["Space", "ShiftLeft"].includes(e.code)) raceRuntime.keys.boost = true;
  });

  window.addEventListener("keyup", (e) => {
    if (["ArrowUp", "KeyW"].includes(e.code)) raceRuntime.keys.up = false;
    if (["ArrowDown", "KeyS"].includes(e.code)) raceRuntime.keys.down = false;
    if (["ArrowLeft", "KeyA"].includes(e.code)) raceRuntime.keys.left = false;
    if (["ArrowRight", "KeyD"].includes(e.code)) raceRuntime.keys.right = false;
    if (["Space", "ShiftLeft"].includes(e.code)) raceRuntime.keys.boost = false;
  });

  // Mobile Touch Control Handlers
  const bindTouch = (id, key) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); raceRuntime.keys[key] = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); raceRuntime.keys[key] = false; });
  };

  bindTouch("btnTouchLeft", "left");
  bindTouch("btnTouchRight", "right");
  bindTouch("btnTouchGas", "up");
  bindTouch("btnTouchBrake", "down");
  bindTouch("btnMobileNitro", "boost");

  // Audio Mute Toggle
  document.getElementById("btnSound").addEventListener("click", () => {
    appState.soundEnabled = !appState.soundEnabled;
    document.getElementById("iconSoundOn").classList.toggle("hidden", !appState.soundEnabled);
    document.getElementById("iconSoundOff").classList.toggle("hidden", appState.soundEnabled);
  });

  // Kickoff Core Game Loop
  requestAnimationFrame(gameLoop);
}