/**
 * APEX 3D RACING - Arcade Web Engine
 * Fully dynamic pseudo-3D perspective projection, Web Audio synth, physics engine, garage, leaderboards.
 */

(function () {
  'use strict';

  // --- CONFIG & APP STATE ---
  let APP_META = { app_name: 'apex3dracing', project_type: 'web', app_id: 'apex3dracing' };
  let API_BASE_URL = 'https://trumpledroid-api.cloudbeta28624.workers.dev';
  let authState = { token: localStorage.getItem('apex_token') || null, email: localStorage.getItem('apex_email') || null };

  // DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const miniMapCanvas = document.getElementById('gameCanvas') ? document.getElementById('miniMapCanvas') : null;
  const miniMapCtx = miniMapCanvas ? miniMapCanvas.getContext('2d') : null;
  const garageCanvas = document.getElementById('garageCarCanvas');
  const garageCtx = garageCanvas ? garageCanvas.getContext('2d') : null;

  // UI Overlays
  const mainMenu = document.getElementById('main-menu');
  const hudOverlay = document.getElementById('hud-overlay');
  const touchControls = document.getElementById('touch-controls');
  const summaryModal = document.getElementById('race-summary-modal');
  const leaderboardModal = document.getElementById('leaderboard-modal');
  const authModal = document.getElementById('auth-modal');

  // HUD elements
  const hudSpeed = document.getElementById('hud-speed');
  const hudPos = document.getElementById('hud-pos');
  const hudLap = document.getElementById('hud-lap');
  const hudTime = document.getElementById('hud-time');
  const hudBestTime = document.getElementById('hud-best-time');
  const hudGear = document.getElementById('hud-gear');
  const hudNitroBar = document.getElementById('hud-nitro-bar');
  const hudNitroVal = document.getElementById('hud-nitro-val');
  const driftNotif = document.getElementById('drift-notification');
  const driftPointsText = document.getElementById('drift-points');
  const userCoinsText = document.getElementById('user-coins');

  // User State & Storage
  let userData = {
    coins: 1200,
    unlockedCars: ['apex_gt', 'spectre_rx'],
    selectedCarIndex: 0,
    selectedTrackIndex: 0,
    upgrades: { apex_gt: 1, spectre_rx: 1, thunder_v8: 1, phantom_drift: 1 },
    carColors: { apex_gt: '#06b6d4', spectre_rx: '#ec4899', thunder_v8: '#eab308', phantom_drift: '#8b5cf6' },
    bestTimes: { 0: 999, 1: 999, 2: 999 }
  };

  // Load local state
  const savedUserData = localStorage.getItem('apex_user_data');
  if (savedUserData) {
    try { Object.assign(userData, JSON.parse(savedUserData)); } catch (e) {}
  }

  function saveUserDataLocally() {
    localStorage.setItem('apex_user_data', JSON.stringify(userData));
    if (userCoinsText) userCoinsText.textContent = userData.coins.toLocaleString();
  }

  // CAR MODELS SPECIFICATION
  const CAR_MODELS = [
    {
      id: 'apex_gt',
      name: 'APEX GT SPECTRE',
      desc: 'High-revving balanced street racer engineered for tight drift lines.',
      topSpeed: 240,
      accel: 3.8,
      handling: 80,
      price: 0
    },
    {
      id: 'spectre_rx',
      name: 'NEON PHANTOM RX',
      desc: 'Hyper-tuned twin-turbo powerhouse with explosive acceleration.',
      topSpeed: 275,
      accel: 3.1,
      handling: 70,
      price: 800
    },
    {
      id: 'thunder_v8',
      name: 'THUNDER V8 MONSTER',
      desc: 'Raw muscle beast with high top-end highway velocity.',
      topSpeed: 290,
      accel: 4.2,
      handling: 65,
      price: 1500
    },
    {
      id: 'phantom_drift',
      name: 'DRIFT KING TS',
      desc: 'Ultra lightweight tuning built for sideways maximum drift scores.',
      topSpeed: 250,
      accel: 3.5,
      handling: 95,
      price: 2200
    }
  ];

  // TRACK DEFINITIONS
  const TRACK_PRESETS = [
    {
      id: 'neon_city',
      name: 'Neon City Cyberway',
      length: 600,
      skyGradient: ['#0f172a', '#3b0764', '#0284c7'],
      asphaltColor: '#1e293b',
      rumbleColor1: '#06b6d4',
      rumbleColor2: '#f43f5e',
      grassColor: '#090d16',
      totalLaps: 3
    },
    {
      id: 'alpine_pass',
      name: 'Alpine Glacier Pass',
      length: 750,
      skyGradient: ['#0284c7', '#38bdf8', '#bae6fd'],
      asphaltColor: '#334155',
      rumbleColor1: '#ffffff',
      rumbleColor2: '#ef4444',
      grassColor: '#cbd5e1',
      totalLaps: 3
    },
    {
      id: 'sunset_coast',
      name: 'Sunset Coast Freeway',
      length: 680,
      skyGradient: ['#451a03', '#9a3412', '#f97316'],
      asphaltColor: '#27272a',
      rumbleColor1: '#eab308',
      rumbleColor2: '#ffffff',
      grassColor: '#14532d',
      totalLaps: 3
    }
  ];

  // --- AUDIO SYNTHESIZER (WEB AUDIO API) ---
  let audioCtx = null;
  let soundEnabled = true;
  let engineOsc = null;
  let engineGain = null;
  let screechOsc = null;
  let screechGain = null;

  function initAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Engine sound generator
      engineOsc = audioCtx.createOscillator();
      engineGain = audioCtx.createGain();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.setValueAtTime(40, audioCtx.currentTime);
      engineGain.gain.setValueAtTime(0, audioCtx.currentTime);
      engineOsc.connect(engineGain);
      engineGain.connect(audioCtx.destination);
      engineOsc.start();

      // Tire Screech generator
      const bufferSize = audioCtx.sampleRate * 1;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;

      screechGain = audioCtx.createGain();
      screechGain.gain.setValueAtTime(0, audioCtx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(screechGain);
      screechGain.connect(audioCtx.destination);
      whiteNoise.start();

    } catch (e) {
      console.warn('Audio Context error:', e);
    }
  }

  function updateAudioSounds(speedKmh, isDrifting, isNitro) {
    if (!audioCtx || !soundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Modulate engine pitch
    const baseFreq = 40 + (speedKmh * 1.2);
    engineOsc.frequency.setTargetAtTime(baseFreq, audioCtx.currentTime, 0.05);
    engineGain.gain.setTargetAtTime(gameState.running ? 0.08 : 0, audioCtx.currentTime, 0.05);

    // Modulate screech gain
    if (isDrifting && speedKmh > 40) {
      screechGain.gain.setTargetAtTime(0.12, audioCtx.currentTime, 0.02);
    } else {
      screechGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    }
  }

  function playSoundEffect(type) {
    if (!audioCtx || !soundEnabled) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'nitro') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'crash') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(120, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  }


  // --- PSEUDO 3D RACING GAME ENGINE CORE ---
  const ROAD_WIDTH = 2000;
  const SEGMENT_LENGTH = 200;
  const CAMERA_HEIGHT = 1000;
  const CAMERA_DEPTH = 0.8; // Field of view depth scale

  let segments = [];
  let trackLength = 0;

  // Game Engine State
  let gameState = {
    running: false,
    track: TRACK_PRESETS[0],
    carModel: CAR_MODELS[0],
    playerX: 0,          // -1 to 1 (center is 0)
    playerZ: 0,          // Position along track length
    speed: 0,            // current velocity
    maxSpeed: 240,       // km/h scaled
    accel: 0.2,
    decel: 0.15,
    nitro: 100,          // 0 to 100
    isNitroActive: false,
    isDrifting: false,
    driftScore: 0,
    currentLap: 1,
    lapStartTime: 0,
    lapTimes: [],
    startTime: 0,
    totalRaceTime: 0,
    opponents: [],
    particles: []
  };

  // Keyboard Control State
  const keys = {
    up: false,
    down: false,
    left: false,
    right: false,
    nitro: false
  };

  // BUILD PROCEDURAL ROAD SEGMENTS WITH CURVES & HILLS
  function buildTrackSegments(preset) {
    segments = [];
    const numSegments = preset.length;

    for (let i = 0; i < numSegments; i++) {
      let curve = 0;
      let hill = 0;

      // Curves layout
      if (i > 50 && i < 150) curve = 2;
      if (i > 180 && i < 260) curve = -3;
      if (i > 300 && i < 420) curve = 4;
      if (i > 450 && i < 520) curve = -2.5;

      // Vertical Hills height layout
      if (i > 100 && i < 200) hill = Math.sin((i - 100) / 20) * 1200;
      if (i > 350 && i < 480) hill = Math.cos((i - 350) / 20) * 1800;

      const p1 = { world: { y: hill, z: i * SEGMENT_LENGTH }, camera: {}, screen: {} };
      const p2 = { world: { y: hill, z: (i + 1) * SEGMENT_LENGTH }, camera: {}, screen: {} };

      // Scenery Sprites (trees, streetlights, neon signs)
      let sprite = null;
      if (i % 6 === 0) {
        sprite = { type: i % 12 === 0 ? 'tree' : 'light', side: (i % 4 === 0 ? -1 : 1) * (1.4 + Math.random() * 0.4) };
      }

      segments.push({
        index: i,
        p1: p1,
        p2: p2,
        curve: curve,
        color: {
          grass: Math.floor(i / 3) % 2 ? preset.grassColor : '#020617',
          rumble: Math.floor(i / 3) % 2 ? preset.rumbleColor1 : preset.rumbleColor2,
          asphalt: preset.asphaltColor,
          lane: Math.floor(i / 3) % 2 ? '#ffffff' : preset.asphaltColor
        },
        sprite: sprite
      });
    }

    trackLength = segments.length * SEGMENT_LENGTH;
  }

  // AI OPPONENT CREATION
  function initAIOpponents() {
    gameState.opponents = [
      { id: 1, name: 'Viper', color: '#ef4444', x: -0.5, z: 400, speed: 210, maxSpeed: 230 },
      { id: 2, name: 'Cyber', color: '#10b981', x: 0.5, z: 800, speed: 215, maxSpeed: 235 },
      { id: 3, name: 'Shadow', color: '#8b5cf6', x: -0.2, z: 1200, speed: 205, maxSpeed: 225 },
      { id: 4, name: 'Blaze', color: '#f59e0b', x: 0.3, z: 1600, speed: 220, maxSpeed: 238 },
      { id: 5, name: 'Ghost', color: '#ec4899', x: 0.0, z: 2000, speed: 218, maxSpeed: 236 }
    ];
  }

  // PROJECT 3D POINT TO 2D SCREEN
  function projectPoint(p, cameraX, cameraY, cameraZ, cameraDepth, width, height, roadWidth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;

    const scale = cameraDepth / (p.camera.z === 0 ? 0.0001 : p.camera.z);
    p.screen.scale = scale;
    p.screen.x = Math.round((width / 2) + (scale * p.camera.x * width / 2));
    p.screen.y = Math.round((height / 2) - (scale * p.camera.y * height / 2));
    p.screen.w = Math.round(scale * roadWidth * width / 2);
  }

  // POLYGON POLY DRAWING HELPER
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

  // DRAW 3D SCENERY SPRITES
  function drawSprite(ctx, width, height, resolution, roadWidth, sprite, scale, destX, destY) {
    const spriteWidth = 160 * scale * width / 2;
    const spriteHeight = 240 * scale * width / 2;

    const x = destX - spriteWidth / 2;
    const y = destY - spriteHeight;

    if (sprite.type === 'tree') {
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.moveTo(x + spriteWidth / 2, y);
      ctx.lineTo(x, y + spriteHeight);
      ctx.lineTo(x + spriteWidth, y + spriteHeight);
      ctx.closePath();
      ctx.fill();
    } else if (sprite.type === 'light') {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(x + spriteWidth * 0.45, y, spriteWidth * 0.1, spriteHeight);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(x + spriteWidth * 0.5, y + 10, spriteWidth * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // DRAW 3D CAR VEHICLE MODEL ON CANVAS
  function drawCar(ctx, width, height, scale, destX, destY, color, isPlayer = false, steeringAngle = 0) {
    const carW = 200 * scale * width / 2;
    const carH = 100 * scale * width / 2;
    const x = destX - carW / 2;
    const y = destY - carH;

    ctx.save();
    ctx.translate(destX, destY);

    // Dynamic chassis roll on sharp steering
    if (isPlayer && gameState.isDrifting) {
      ctx.rotate((steeringAngle * 0.15));
    }

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, -carH * 0.1, carW * 0.55, carH * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main Body Chassis
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-carW / 2, -carH * 0.75, carW, carH * 0.65, [10, 10, 4, 4]);
    ctx.fill();

    // Roof Cabin
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(-carW * 0.35, -carH * 1.1, carW * 0.7, carH * 0.45, [8, 8, 2, 2]);
    ctx.fill();

    // Windshield rear glow
    ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
    ctx.fillRect(-carW * 0.3, -carH * 1.05, carW * 0.6, carH * 0.25);

    // Tail Lights (Glowing Red)
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = isPlayer && keys.down ? 20 : 8;
    ctx.fillRect(-carW * 0.45, -carH * 0.65, carW * 0.22, carH * 0.15);
    ctx.fillRect(carW * 0.23, -carH * 0.65, carW * 0.22, carH * 0.15);
    ctx.shadowBlur = 0;

    // License Plate / Diffuser
    ctx.fillStyle = '#020617';
    ctx.fillRect(-carW * 0.18, -carH * 0.55, carW * 0.36, carH * 0.18);

    // Wheels
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-carW * 0.52, -carH * 0.4, carW * 0.12, carH * 0.35);
    ctx.fillRect(carW * 0.4, -carH * 0.4, carW * 0.12, carH * 0.35);

    // Nitro Flame particle exhaust burst
    if (isPlayer && gameState.isNitroActive) {
      ctx.fillStyle = '#06b6d4';
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 25;
      ctx.beginPath();
      ctx.arc(-carW * 0.2, -carH * 0.25, Math.random() * 12 + 6, 0, Math.PI * 2);
      ctx.arc(carW * 0.2, -carH * 0.25, Math.random() * 12 + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // GET SEGMENT FOR WORLD Z
  function findSegment(z) {
    return segments[Math.floor(z / SEGMENT_LENGTH) % segments.length];
  }

  // --- GAME UPDATE & LOOP ---
  let lastTime = performance.now();

  function updateGameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    if (gameState.running) {
      updatePhysics(dt);
      renderScene();
      updateHUD();
    }

    requestAnimationFrame(updateGameLoop);
  }

  // VEHICLE PHYSICS & DRIFT MECHANICS
  function updatePhysics(dt) {
    const car = gameState.carModel;
    const upgradeLevel = userData.upgrades[car.id] || 1;
    const effectiveTopSpeed = car.topSpeed * (1 + (upgradeLevel - 1) * 0.08);

    // Nitro trigger
    gameState.isNitroActive = keys.nitro && gameState.nitro > 0 && keys.up;
    if (gameState.isNitroActive) {
      gameState.nitro = Math.max(0, gameState.nitro - dt * 35);
      playSoundEffect('nitro');
    } else {
      gameState.nitro = Math.min(100, gameState.nitro + dt * 8); // Recharge slowly
    }

    const currentMaxSpeed = gameState.isNitroActive ? effectiveTopSpeed * 1.3 : effectiveTopSpeed;

    // Acceleration & Braking
    if (keys.up) {
      gameState.speed += (car.accel * 400 * dt);
    } else if (keys.down) {
      gameState.speed -= (gameState.decel * 800 * dt);
    } else {
      gameState.speed -= (gameState.decel * 200 * dt); // Friction
    }

    gameState.speed = Math.max(0, Math.min(gameState.speed, currentMaxSpeed));

    // Steering & Turn Physics
    const speedRatio = gameState.speed / effectiveTopSpeed;
    const currentSegment = findSegment(gameState.playerZ);
    const curveOffset = currentSegment ? currentSegment.curve : 0;

    // Steering input
    let steerDir = 0;
    if (keys.left) steerDir = -1;
    if (keys.right) steerDir = 1;

    // Drift Detection (Tap brake while turning at fast speed)
    if (keys.down && Math.abs(steerDir) > 0 && gameState.speed > 80) {
      gameState.isDrifting = true;
      gameState.driftScore += Math.round(gameState.speed * 0.5 * dt);
      if (driftNotif) {
        driftNotif.classList.remove('opacity-0', 'translate-y-2');
        driftPointsText.textContent = `+${gameState.driftScore} PTS`;
      }
    } else {
      gameState.isDrifting = false;
      if (driftNotif && gameState.driftScore === 0) {
        driftNotif.classList.add('opacity-0', 'translate-y-2');
      }
    }

    // Apply lateral movement & centrifugal force from track curve
    gameState.playerX += (steerDir * 1.6 * speedRatio * dt) - (curveOffset * 0.00025 * gameState.speed);

    // Track boundary off-road penalty
    if (Math.abs(gameState.playerX) > 1.0) {
      gameState.speed -= 300 * dt; // slowdown on grass
      if (Math.abs(gameState.playerX) > 1.6) {
        gameState.playerX = Math.sign(gameState.playerX) * 1.6; // clamp wall bounce
        playSoundEffect('crash');
      }
    }

    // Update Player Track Z position
    const oldZ = gameState.playerZ;
    gameState.playerZ = (gameState.playerZ + gameState.speed * dt * 45);

    // Check Lap Crossing
    if (gameState.playerZ >= trackLength) {
      gameState.playerZ %= trackLength;
      gameState.currentLap++;

      const nowLapTime = (performance.now() - gameState.lapStartTime) / 1000;
      gameState.lapTimes.push(nowLapTime);
      gameState.lapStartTime = performance.now();

      if (gameState.currentLap > gameState.track.totalLaps) {
        finishRace();
        return;
      }
    }

    // Update AI Opponents Positions
    gameState.opponents.forEach(ai => {
      ai.z = (ai.z + ai.speed * dt * 42) % trackLength;
      // Slight lane wander
      ai.x += Math.sin(performance.now() * 0.002 + ai.id) * 0.005;

      // Collision check with player
      const dz = Math.abs(ai.z - gameState.playerZ);
      const dx = Math.abs(ai.x - gameState.playerX);
      if (dz < 150 && dx < 0.25) {
        gameState.speed *= 0.85; // bump penalty
        playSoundEffect('crash');
      }
    });

    // Sound Updates
    updateAudioSounds(Math.round(gameState.speed), gameState.isDrifting, gameState.isNitroActive);
  }

  // RENDER CANVASES
  function renderScene() {
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Horizon Sky Gradient & Stars
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
    skyGrad.addColorStop(0, gameState.track.skyGradient[0]);
    skyGrad.addColorStop(0.5, gameState.track.skyGradient[1]);
    skyGrad.addColorStop(1, gameState.track.skyGradient[2]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height * 0.5);

    // 2. Render Road Segments (Back to Front)
    const baseSegment = findSegment(gameState.playerZ);
    const basePercent = (gameState.playerZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;
    const playerSegment = findSegment(gameState.playerZ + CAMERA_HEIGHT);
    const cameraY = (baseSegment.p1.world.y || 0) + CAMERA_HEIGHT;

    let maxy = height;
    let x = 0;
    let dx = -(baseSegment.curve * basePercent);

    const N = 180; // Render depth view distance segments

    for (let n = 0; n < N; n++) {
      const segment = segments[(baseSegment.index + n) % segments.length];
      const looped = segment.index < baseSegment.index;

      projectPoint(
        segment.p1,
        gameState.playerX * ROAD_WIDTH - x,
        cameraY,
        gameState.playerZ - (looped ? trackLength : 0),
        CAMERA_DEPTH,
        width,
        height,
        ROAD_WIDTH
      );

      projectPoint(
        segment.p2,
        gameState.playerX * ROAD_WIDTH - x - dx,
        cameraY,
        gameState.playerZ - (looped ? trackLength : 0),
        CAMERA_DEPTH,
        width,
        height,
        ROAD_WIDTH
      );

      x += dx;
      dx += segment.curve;

      if (segment.p1.camera.z <= CAMERA_DEPTH || segment.p2.screen.y >= maxy) continue;

      // Draw Road quad
      drawPolygon(
        ctx,
        segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w,
        segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w,
        segment.color.asphalt
      );

      // Draw Rumble Strips
      const rumble1 = segment.p1.screen.w * 0.15;
      const rumble2 = segment.p2.screen.w * 0.15;
      drawPolygon(ctx, segment.p1.screen.x - segment.p1.screen.w - rumble1, segment.p1.screen.y, rumble1, segment.p2.screen.x - segment.p2.screen.w - rumble2, segment.p2.screen.y, rumble2, segment.color.rumble);
      drawPolygon(ctx, segment.p1.screen.x + segment.p1.screen.w + rumble1, segment.p1.screen.y, rumble1, segment.p2.screen.x + segment.p2.screen.w + rumble2, segment.p2.screen.y, rumble2, segment.color.rumble);

      // Draw Grass / Offroad
      ctx.fillStyle = segment.color.grass;
      ctx.fillRect(0, segment.p2.screen.y, width, segment.p1.screen.y - segment.p2.screen.y);

      maxy = segment.p2.screen.y;
    }

    // 3. Draw AI Cars & Scenery (Far to Near)
    for (let n = N - 1; n > 0; n--) {
      const segment = segments[(baseSegment.index + n) % segments.length];

      // Draw Scenery Sprites
      if (segment.sprite) {
        const spriteX = segment.p1.screen.x + (segment.p1.screen.scale * segment.sprite.side * ROAD_WIDTH * width / 2);
        drawSprite(ctx, width, height, 1, ROAD_WIDTH, segment.sprite, segment.p1.screen.scale, spriteX, segment.p1.screen.y);
      }

      // Draw AI Opponents
      gameState.opponents.forEach(ai => {
        if (findSegment(ai.z).index === segment.index) {
          const aiScale = segment.p1.screen.scale;
          const aiDestX = segment.p1.screen.x + (aiScale * ai.x * ROAD_WIDTH * width / 2);
          drawCar(ctx, width, height, aiScale, aiDestX, segment.p1.screen.y, ai.color, false);
        }
      });
    }

    // 4. Draw Player Car at Bottom Center of Viewport
    const playerSteerAngle = (keys.left ? -1 : keys.right ? 1 : 0);
    drawCar(ctx, width, height, 0.0018, width / 2, height - 30, userData.carColors[gameState.carModel.id] || '#06b6d4', true, playerSteerAngle);

    // 5. Draw Mini-Map
    renderMiniMap();
  }

  // RENDER MINI MAP HUD
  function renderMiniMap() {
    if (!miniMapCtx) return;
    const w = miniMapCanvas.width;
    const h = miniMapCanvas.height;
    miniMapCtx.clearRect(0, 0, w, h);

    miniMapCtx.strokeStyle = '#06b6d4';
    miniMapCtx.lineWidth = 4;
    miniMapCtx.beginPath();
    miniMapCtx.arc(w / 2, h / 2, w * 0.35, 0, Math.PI * 2);
    miniMapCtx.stroke();

    // Player Dot
    const playerAngle = (gameState.playerZ / trackLength) * Math.PI * 2 - Math.PI / 2;
    const px = w / 2 + Math.cos(playerAngle) * (w * 0.35);
    const py = h / 2 + Math.sin(playerAngle) * (w * 0.35);

    miniMapCtx.fillStyle = '#ffffff';
    miniMapCtx.beginPath();
    miniMapCtx.arc(px, py, 4, 0, Math.PI * 2);
    miniMapCtx.fill();

    // AI Opponent Dots
    gameState.opponents.forEach(ai => {
      const aiAngle = (ai.z / trackLength) * Math.PI * 2 - Math.PI / 2;
      const ax = w / 2 + Math.cos(aiAngle) * (w * 0.35);
      const ay = h / 2 + Math.sin(aiAngle) * (w * 0.35);

      miniMapCtx.fillStyle = ai.color;
      miniMapCtx.beginPath();
      miniMapCtx.arc(ax, ay, 2.5, 0, Math.PI * 2);
      miniMapCtx.fill();
    });
  }

  // UPDATE HUD STATS & TIMERS
  function updateHUD() {
    const spd = Math.round(gameState.speed);
    if (hudSpeed) hudSpeed.textContent = spd;
    if (hudGear) hudGear.textContent = Math.min(6, Math.floor(spd / 45) + 1);

    // Position Calculator (Player vs AI Z distances)
    let rank = 1;
    gameState.opponents.forEach(ai => {
      if (ai.z > gameState.playerZ) rank++;
    });
    if (hudPos) hudPos.textContent = rank;
    if (hudLap) hudLap.textContent = Math.min(gameState.track.totalLaps, gameState.currentLap);

    // Nitro Bar
    if (hudNitroBar) hudNitroBar.style.width = `${gameState.nitro}%`;
    if (hudNitroVal) hudNitroVal.textContent = `${Math.round(gameState.nitro)}%`;

    // Lap Timer
    const elapsed = (performance.now() - gameState.startTime) / 1000;
    if (hudTime) hudTime.textContent = formatTime(elapsed);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  // START RACE
  function startRace() {
    initAudio();
    gameState.track = TRACK_PRESETS[userData.selectedTrackIndex];
    gameState.carModel = CAR_MODELS[userData.selectedCarIndex];

    buildTrackSegments(gameState.track);
    initAIOpponents();

    gameState.playerX = 0;
    gameState.playerZ = 0;
    gameState.speed = 0;
    gameState.nitro = 100;
    gameState.driftScore = 0;
    gameState.currentLap = 1;
    gameState.lapTimes = [];
    gameState.startTime = performance.now();
    gameState.lapStartTime = performance.now();
    gameState.running = true;

    // Toggle Screens
    mainMenu.classList.add('hidden');
    summaryModal.classList.add('hidden');
    hudOverlay.classList.remove('hidden');

    // Show Mobile controls if touch device
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      touchControls.classList.remove('hidden');
    }

    const best = userData.bestTimes[userData.selectedTrackIndex];
    if (hudBestTime) hudBestTime.textContent = `BEST: ${best < 900 ? formatTime(best) : '--:--.--'}`;
  }

  // FINISH RACE & DISPLAY SUMMARY
  function finishRace() {
    gameState.running = false;
    hudOverlay.classList.add('hidden');
    touchControls.classList.add('hidden');

    const totalSecs = (performance.now() - gameState.startTime) / 1000;
    const bestLapSecs = Math.min(...gameState.lapTimes);

    // Save best lap time if record
    if (bestLapSecs < (userData.bestTimes[userData.selectedTrackIndex] || 999)) {
      userData.bestTimes[userData.selectedTrackIndex] = bestLapSecs;
    }

    // MANDATORY LOCAL CALCULATION: Total Score = (Speed Bonus + Drift Points) * Placement Multiplier
    let rank = 1;
    gameState.opponents.forEach(ai => { if (ai.z > gameState.playerZ) rank++; });
    const placementMultiplier = rank === 1 ? 2.0 : rank === 2 ? 1.5 : rank === 3 ? 1.2 : 1.0;
    const speedBonus = Math.round(gameState.speed * 10);
    const driftPoints = gameState.driftScore;

    const totalScore = Math.round((speedBonus + driftPoints) * placementMultiplier);
    const earnedCoins = Math.round(totalScore * 0.15);

    userData.coins += earnedCoins;
    saveUserDataLocally();

    // Populate Summary Modal
    document.getElementById('summary-total-time').textContent = formatTime(totalSecs);
    document.getElementById('summary-best-lap').textContent = formatTime(bestLapSecs);
    document.getElementById('summary-drift-points').textContent = `${driftPoints} PTS`;
    document.getElementById('summary-speed-bonus').textContent = `${speedBonus} PTS`;
    document.getElementById('summary-total-score').textContent = totalScore.toLocaleString();
    document.getElementById('summary-coins-earned').textContent = `+🪙 ${earnedCoins}`;

    const titleEl = document.getElementById('summary-title');
    if (rank === 1) titleEl.textContent = 'VICTORY! 1st PLACE';
    else if (rank === 2) titleEl.textContent = 'RUNNER UP! 2nd PLACE';
    else if (rank === 3) titleEl.textContent = 'PODIUM! 3rd PLACE';
    else titleEl.textContent = `FINISHED ${rank}th PLACE`;

    summaryModal.classList.remove('hidden');

    // Post High Score to Backend API
    submitRaceRecordToAPI(totalSecs, totalScore);
  }

  // --- GARAGE RENDERER & INTERACTION ---
  function renderGarageCar() {
    if (!garageCtx) return;
    const car = CAR_MODELS[userData.selectedCarIndex];
    const color = userData.carColors[car.id] || '#06b6d4';

    const w = garageCanvas.width;
    const h = garageCanvas.height;
    garageCtx.clearRect(0, 0, w, h);

    drawCar(garageCtx, w, h, 0.0028, w / 2, h - 20, color, true);

    // Update Specs Display
    document.getElementById('car-name').textContent = car.name;
    document.getElementById('car-desc').textContent = car.desc;
    document.getElementById('car-stat-speed').textContent = `${car.topSpeed} KM/H`;
    document.getElementById('car-stat-accel').textContent = `${car.accel}s`;

    const upgradeLevel = userData.upgrades[car.id] || 1;
    document.getElementById('car-bar-speed').style.width = `${Math.min(100, (car.topSpeed / 300) * 100 * (1 + upgradeLevel * 0.05))}%`;
    document.getElementById('car-bar-accel').style.width = `${Math.min(100, (5 / car.accel) * 60)}%`;
    document.getElementById('car-bar-handling').style.width = `${car.handling}%`;
  }

  // --- BACKEND API INTEGRATION CLIENT ---
  async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authState.token) {
      headers['Authorization'] = `Bearer ${authState.token}`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });
      return await res.json();
    } catch (e) {
      console.warn('API error:', e);
      return { success: false, error: 'Network error' };
    }
  }

  async function submitRaceRecordToAPI(lapTime, score) {
    if (!authState.token) return; // Guest play mode

    const track = TRACK_PRESETS[userData.selectedTrackIndex];
    const car = CAR_MODELS[userData.selectedCarIndex];

    await apiCall('/data', 'POST', {
      collection: 'leaderboard',
      data: {
        player_name: authState.email ? authState.email.split('@')[0] : 'Racer',
        track_id: track.id,
        car_model: car.name,
        lap_time: lapTime,
        score: score
      }
    });
  }

  async function fetchLeaderboardData(trackIndex = 0) {
    const rowsContainer = document.getElementById('leaderboard-rows');
    if (!rowsContainer) return;

    rowsContainer.innerHTML = `<div class="text-center py-8 text-slate-500 italic">Fetching global circuit scores...</div>`;

    const track = TRACK_PRESETS[trackIndex];
    const res = await apiCall(`/data?collection=leaderboard`);

    if (res && res.success && Array.isArray(res.records)) {
      // Filter & Sort by lap time ascending
      const records = res.records
        .map(r => r.data)
        .filter(d => d.track_id === track.id)
        .sort((a, b) => a.lap_time - b.lap_time)
        .slice(0, 10);

      if (records.length === 0) {
        rowsContainer.innerHTML = `<div class="text-center py-8 text-slate-500">No race records registered for this track yet.</div>`;
        return;
      }

      rowsContainer.innerHTML = records.map((rec, i) => `
        <div class="grid grid-cols-12 py-2.5 px-3 items-center hover:bg-slate-800/40 transition">
          <span class="col-span-2 font-bold ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-500'}">#${i + 1}</span>
          <span class="col-span-4 font-semibold text-white truncate">${rec.player_name || 'Anonymous'}</span>
          <span class="col-span-3 text-right font-mono text-emerald-400 font-bold">${formatTime(rec.lap_time || 0)}</span>
          <span class="col-span-3 text-right font-mono text-cyan-400 font-bold">${(rec.score || 0).toLocaleString()}</span>
        </div>
      `).join('');
    } else {
      rowsContainer.innerHTML = `<div class="text-center py-8 text-slate-500">Unable to load scores. Play in Guest or Login mode.</div>`;
    }
  }

  // --- INPUT BINDINGS & LISTENERS ---
  function initInputListeners() {
    window.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
      if (e.key === 'Shift' || e.key === ' ') keys.nitro = true;
    });

    window.addEventListener('keyup', e => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
      if (e.key === 'Shift' || e.key === ' ') keys.nitro = false;
    });

    // Touch Buttons for Mobile
    const bindTouch = (id, keyName) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => { e.preventDefault(); keys[keyName] = true; });
      btn.addEventListener('touchend', (e) => { e.preventDefault(); keys[keyName] = false; });
      btn.addEventListener('mousedown', () => { keys[keyName] = true; });
      btn.addEventListener('mouseup', () => { keys[keyName] = false; });
    };

    bindTouch('btn-left', 'left');
    bindTouch('btn-right', 'right');
    bindTouch('btn-gas', 'up');
    bindTouch('btn-brake', 'down');
    bindTouch('btn-nitro', 'nitro');

    // UI Buttons
    document.getElementById('start-race-btn')?.addEventListener('click', startRace);
    document.getElementById('summary-retry-btn')?.addEventListener('click', startRace);
    document.getElementById('summary-menu-btn')?.addEventListener('click', () => {
      summaryModal.classList.add('hidden');
      mainMenu.classList.remove('hidden');
    });

    // Car Switcher
    document.getElementById('car-prev-btn')?.addEventListener('click', () => {
      userData.selectedCarIndex = (userData.selectedCarIndex - 1 + CAR_MODELS.length) % CAR_MODELS.length;
      saveUserDataLocally();
      renderGarageCar();
    });

    document.getElementById('car-next-btn')?.addEventListener('click', () => {
      userData.selectedCarIndex = (userData.selectedCarIndex + 1) % CAR_MODELS.length;
      saveUserDataLocally();
      renderGarageCar();
    });

    // Car Color Picker
    document.querySelectorAll('#color-picker-container button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const hex = e.currentTarget.getAttribute('data-color');
        const carId = CAR_MODELS[userData.selectedCarIndex].id;
        userData.carColors[carId] = hex;
        saveUserDataLocally();
        renderGarageCar();
      });
    });

    // Upgrade Button
    document.getElementById('upgrade-car-btn')?.addEventListener('click', () => {
      const car = CAR_MODELS[userData.selectedCarIndex];
      if (userData.coins >= 300) {
        userData.coins -= 300;
        userData.upgrades[car.id] = (userData.upgrades[car.id] || 1) + 1;
        saveUserDataLocally();
        renderGarageCar();
      } else {
        alert('Not enough coins! Win more races to earn coins.');
      }
    });

    // Track Selection
    document.querySelectorAll('#track-selector-list .track-card').forEach(card => {
      card.addEventListener('click', (e) => {
        document.querySelectorAll('#track-selector-list .track-card').forEach(c => c.classList.remove('active', 'border-2', 'border-cyan-500'));
        const el = e.currentTarget;
        el.classList.add('active', 'border-2', 'border-cyan-500');
        userData.selectedTrackIndex = parseInt(el.getAttribute('data-track'), 10);
        saveUserDataLocally();
      });
    });

    // Sound Toggle Button
    document.getElementById('sound-toggle-btn')?.addEventListener('click', (e) => {
      soundEnabled = !soundEnabled;
      e.currentTarget.textContent = soundEnabled ? '🔊' : '🔇';
    });

    // Leaderboard Modal
    document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => {
      leaderboardModal.classList.remove('hidden');
      fetchLeaderboardData(userData.selectedTrackIndex);
    });

    document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => {
      leaderboardModal.classList.add('hidden');
    });

    document.querySelectorAll('#lb-track-tabs button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const trackIdx = parseInt(e.currentTarget.getAttribute('data-track'), 10);
        document.querySelectorAll('#lb-track-tabs button').forEach(b => b.className = 'flex-1 bg-slate-800 text-slate-400 text-xs py-2 rounded-xl font-bold hover:bg-slate-700');
        e.currentTarget.className = 'flex-1 bg-purple-600 text-white text-xs py-2 rounded-xl font-bold';
        fetchLeaderboardData(trackIdx);
      });
    });

    // Auth Modal
    let isSignUp = false;
    const authBtn = document.getElementById('auth-btn');
    authBtn?.addEventListener('click', () => authModal.classList.remove('hidden'));
    document.getElementById('close-auth-btn')?.addEventListener('click', () => authModal.classList.add('hidden'));

    document.getElementById('toggle-auth-mode-btn')?.addEventListener('click', () => {
      isSignUp = !isSignUp;
      document.getElementById('auth-title').textContent = isSignUp ? 'PILOT ACCOUNT SIGN UP' : 'PILOT ACCOUNT LOGIN';
      document.getElementById('auth-submit-btn').textContent = isSignUp ? 'CREATE PILOT PROFILE' : 'LOGIN TO PILOT PROFILE';
      document.getElementById('toggle-auth-mode-btn').textContent = isSignUp ? 'Already have account? Login' : 'Need an account? Sign Up';
    });

    document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const msgEl = document.getElementById('auth-msg');

      msgEl.className = 'text-[11px] font-semibold text-center text-cyan-400';
      msgEl.textContent = 'Connecting...';

      if (isSignUp) {
        const regRes = await apiCall('/register', 'POST', { app_id: APP_META.app_id, email, password });
        if (regRes && (regRes.success || regRes.message)) {
          // Automatic login step
          const loginRes = await apiCall('/login', 'POST', { app_id: APP_META.app_id, email, password });
          if (loginRes && loginRes.token) {
            authState.token = loginRes.token;
            authState.email = email;
            localStorage.setItem('apex_token', loginRes.token);
            localStorage.setItem('apex_email', email);
            updateAuthStatusUI();
            authModal.classList.add('hidden');
          }
        } else {
          msgEl.className = 'text-[11px] font-semibold text-center text-red-400';
          msgEl.textContent = regRes.error || 'Registration failed';
        }
      } else {
        const loginRes = await apiCall('/login', 'POST', { app_id: APP_META.app_id, email, password });
        if (loginRes && loginRes.token) {
          authState.token = loginRes.token;
          authState.email = email;
          localStorage.setItem('apex_token', loginRes.token);
          localStorage.setItem('apex_email', email);
          updateAuthStatusUI();
          authModal.classList.add('hidden');
        } else {
          msgEl.className = 'text-[11px] font-semibold text-center text-red-400';
          msgEl.textContent = loginRes.error || 'Invalid credentials';
        }
      }
    });

    // Window Resize Handling
    window.addEventListener('resize', resizeCanvas);
  }

  function updateAuthStatusUI() {
    const dot = document.getElementById('auth-status-dot');
    const txt = document.getElementById('auth-btn-text');
    if (authState.token) {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
      if (txt) txt.textContent = authState.email ? authState.email.split('@')[0] : 'Logged In';
    } else {
      if (dot) dot.className = 'w-2 h-2 rounded-full bg-slate-500';
      if (txt) txt.textContent = 'Account Login';
    }
  }

  function resizeCanvas() {
    const container = document.getElementById('game-container');
    if (container && canvas) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
  }

  // INITIALIZE APP
  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    saveUserDataLocally();
    renderGarageCar();
    initInputListeners();
    updateAuthStatusUI();

    // Start engine loop tick
    requestAnimationFrame(updateGameLoop);
  });

})();