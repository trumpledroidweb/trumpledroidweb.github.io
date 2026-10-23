/**
 * videomakerai - Complete Interactive AI Video Studio Engine
 * Features:
 * - AI Storyboard generation & Script synthesizer
 * - HTML5 Canvas rendering engine with Ken Burns motion, visual shaders & text overlays
 * - Web Speech API Voiceover synthesis & Web Audio procedural synth soundtrack
 * - MediaRecorder live WebM/MP4 video encoding & export
 * - TrumpleDroid Backend Authentication (Register/Login/OTP Forgot Password)
 * - Cloud Video Projects CRUD with offline deterministic calculation logic
 */

(function () {
  'use strict';

  // --- 1. CONFIGURATION & STATE ---
  let APP_CONFIG = {
    appName: "videomakerai",
    appId: "videomakerai_v1",
    apiBaseUrl: "https://trumpledroid-api.cloudbeta28624.workers.dev"
  };

  // State object
  const state = {
    currentProjectId: null,
    title: "Cyberpunk Future Odyssey",
    aspectRatio: "16:9", // "16:9", "9:16", "1:1"
    style: "cyberpunk",
    transition: "fade",
    bgmTheme: "synthwave",
    bgmVolume: 0.4,
    enableTts: true,
    ttsVoice: null,
    ttsRate: 1.0,
    ttsPitch: 1.0,
    activeSceneIndex: 0,
    isPlaying: false,
    currentTime: 0, // In seconds
    scenes: [
      {
        id: "scene_1",
        prompt: "Neon drenched streets of Neo Tokyo with flying cybercars in rain",
        caption: "Welcome to 2099: The dawn of artificial intelligence.",
        motion: "zoom-in",
        duration: 5.0,
        filter: "cyber",
        visualKey: "cyber1"
      },
      {
        id: "scene_2",
        prompt: "Futuristic holographic AI lab with neural network visualizations",
        caption: "Where synthetic dreams materialize into reality.",
        motion: "pan-left",
        duration: 5.0,
        filter: "none",
        visualKey: "cyber2"
      },
      {
        id: "scene_3",
        prompt: "Ascending through gleaming crystalline towers into the stratosphere",
        caption: "Infinite horizons await the next generation.",
        motion: "drone-rise",
        duration: 5.0,
        filter: "cyber",
        visualKey: "cyber3"
      }
    ],
    authToken: localStorage.getItem("videomakerai_token") || null,
    userEmail: localStorage.getItem("videomakerai_email") || null,
    authMode: "login", // "login" | "register"
    playbackSpeed: 1.0,
    isExporting: false,
    timelineZoom: 1.0
  };

  // Pre-cached procedural generative visual canvases to feed the Ken Burns render engine
  const visualCache = new Map();

  // Web Audio Context & Synthesizer references
  let audioCtx = null;
  let bgmGainNode = null;
  let synthOscillator = null;
  let isAudioPlaying = false;

  // Animation frame reference
  let animFrameId = null;
  let lastTimestamp = 0;

  // DOM Elements
  const el = {};

  // --- 2. INITIALIZATION ---
  async function init() {
    cacheDomElements();
    await loadAppMeta();
    initAudioStudio();
    initTtsVoices();
    initGenerativeVisualAssets();
    bindEvents();
    renderTimelineScenes();
    updateCalculations();
    updateAuthUi();
    resizeCanvasViewport();
    drawFrame(0);
  }

  // Load app metadata dynamically
  async function loadAppMeta() {
    try {
      const res = await fetch("app-meta.json");
      if (res.ok) {
        const data = await res.json();
        if (data.app_name) APP_CONFIG.appName = data.app_name;
        if (data.app_id) APP_CONFIG.appId = data.app_id;
      }
    } catch (err) {
      console.warn("Using default app metadata configuration");
    }

    try {
      const res = await fetch("api_schema.json");
      if (res.ok) {
        const schema = await res.json();
        if (schema.api_base_url) APP_CONFIG.apiBaseUrl = schema.api_base_url;
      }
    } catch (err) {
      console.warn("Using default api base url");
    }
  }

  function cacheDomElements() {
    el.canvas = document.getElementById("videoCanvas");
    el.ctx = el.canvas.getContext("2d");
    el.videoContainer = document.getElementById("videoContainer");
    el.projectTitleInput = document.getElementById("projectTitleInput");
    el.headerDurationText = document.getElementById("headerDurationText");
    el.headerSceneCount = document.getElementById("headerSceneCount");
    el.headerEstSize = document.getElementById("headerEstSize");
    el.saveCloudBtn = document.getElementById("saveCloudBtn");
    el.exportVideoBtn = document.getElementById("exportVideoBtn");
    el.projectsBtn = document.getElementById("projectsBtn");
    el.userAuthBtn = document.getElementById("userAuthBtn");

    // Tabs
    el.tabGenerate = document.getElementById("tabGenerate");
    el.tabScenes = document.getElementById("tabScenes");
    el.tabAudio = document.getElementById("tabAudio");
    el.panelGenerate = document.getElementById("panelGenerate");
    el.panelScenes = document.getElementById("panelScenes");
    el.panelAudio = document.getElementById("panelAudio");

    // Generator inputs
    el.aiPromptInput = document.getElementById("aiPromptInput");
    el.magicSuggestBtn = document.getElementById("magicSuggestBtn");
    el.generateAiVideoBtn = document.getElementById("generateAiVideoBtn");
    el.aspectRatioSelect = document.getElementById("aspectRatioSelect");
    el.sceneCountSelect = document.getElementById("sceneCountSelect");
    el.transitionStyleSelect = document.getElementById("transitionStyleSelect");
    el.stylePresetContainer = document.getElementById("stylePresetContainer");

    // Scene Editor inputs
    el.currentEditingSceneLabel = document.getElementById("currentEditingSceneLabel");
    el.scenePromptInput = document.getElementById("scenePromptInput");
    el.sceneCaptionInput = document.getElementById("sceneCaptionInput");
    el.sceneMotionSelect = document.getElementById("sceneMotionSelect");
    el.sceneDurationInput = document.getElementById("sceneDurationInput");
    el.addNewSceneBtn = document.getElementById("addNewSceneBtn");
    el.deleteSceneBtn = document.getElementById("deleteSceneBtn");
    el.regenerateSceneVisualBtn = document.getElementById("regenerateSceneVisualBtn");
    el.visualTextureSelect = document.getElementById("visualTextureSelect");

    // Audio inputs
    el.enableTtsCheckbox = document.getElementById("enableTtsCheckbox");
    el.ttsVoiceSelect = document.getElementById("ttsVoiceSelect");
    el.ttsRateRange = document.getElementById("ttsRateRange");
    el.ttsPitchRange = document.getElementById("ttsPitchRange");
    el.bgmThemeSelect = document.getElementById("bgmThemeSelect");
    el.bgmVolumeRange = document.getElementById("bgmVolumeRange");
    el.bgmVolumeLabel = document.getElementById("bgmVolumeLabel");
    el.previewAudioBtn = document.getElementById("previewAudioBtn");

    // Transport controls
    el.playPauseBtn = document.getElementById("playPauseBtn");
    el.playIcon = document.getElementById("playIcon");
    el.restartBtn = document.getElementById("restartBtn");
    el.currentTimeDisplay = document.getElementById("currentTimeDisplay");
    el.totalTimeDisplay = document.getElementById("totalTimeDisplay");
    el.masterVolumeRange = document.getElementById("masterVolumeRange");
    el.toggleMuteBtn = document.getElementById("toggleMuteBtn");
    el.fullscreenBtn = document.getElementById("fullscreenBtn");
    el.resolutionBadge = document.getElementById("resolutionBadge");

    // Timeline elements
    el.sceneBlocksContainer = document.getElementById("sceneBlocksContainer");
    el.audioTrackBlocks = document.getElementById("audioTrackBlocks");
    el.timelinePlayhead = document.getElementById("timelinePlayhead");
    el.timelineScrollArea = document.getElementById("timelineScrollArea");
    el.timelineRuler = document.getElementById("timelineRuler");
    el.timelineZoomIn = document.getElementById("timelineZoomIn");
    el.timelineZoomOut = document.getElementById("timelineZoomOut");
    el.timelineZoomLevel = document.getElementById("timelineZoomLevel");
    el.addTimelineSceneBtn = document.getElementById("addTimelineSceneBtn");

    // Export Modal
    el.exportModal = document.getElementById("exportModal");
    el.cancelExportBtn = document.getElementById("cancelExportBtn");
    el.exportProgressBar = document.getElementById("exportProgressBar");
    el.exportPercentText = document.getElementById("exportPercentText");
    el.exportStatusText = document.getElementById("exportStatusText");
    el.exportDownloadContainer = document.getElementById("exportDownloadContainer");
    el.downloadVideoLink = document.getElementById("downloadVideoLink");
    el.modalEstSize = document.getElementById("modalEstSize");

    // Projects Modal
    el.projectsModal = document.getElementById("projectsModal");
    el.closeProjectsModal = document.getElementById("closeProjectsModal");
    el.projectsListContainer = document.getElementById("projectsListContainer");
    el.projectsCountLabel = document.getElementById("projectsCountLabel");
    el.newBlankProjectBtn = document.getElementById("newBlankProjectBtn");

    // Auth Modal
    el.authModal = document.getElementById("authModal");
    el.closeAuthModal = document.getElementById("closeAuthModal");
    el.authMainView = document.getElementById("authMainView");
    el.authForgotView = document.getElementById("authForgotView");
    el.authTitle = document.getElementById("authTitle");
    el.authSubtitle = document.getElementById("authSubtitle");
    el.authForm = document.getElementById("authForm");
    el.authEmailInput = document.getElementById("authEmailInput");
    el.authPasswordInput = document.getElementById("authPasswordInput");
    el.authSubmitBtn = document.getElementById("authSubmitBtn");
    el.authErrorMessage = document.getElementById("authErrorMessage");
    el.authToggleText = document.getElementById("authToggleText");
    el.toggleAuthModeBtn = document.getElementById("toggleAuthModeBtn");
    el.forgotPasswordLink = document.getElementById("forgotPasswordLink");
    el.backToLoginBtn = document.getElementById("backToLoginBtn");
    el.otpStep1 = document.getElementById("otpStep1");
    el.otpStep2 = document.getElementById("otpStep2");
    el.otpEmailInput = document.getElementById("otpEmailInput");
    el.otpCodeInput = document.getElementById("otpCodeInput");
    el.otpNewPasswordInput = document.getElementById("otpNewPasswordInput");
    el.sendOtpBtn = document.getElementById("sendOtpBtn");
    el.submitResetPasswordBtn = document.getElementById("submitResetPasswordBtn");
    el.otpMessage = document.getElementById("otpMessage");

    // Overlays
    el.canvasLoadingOverlay = document.getElementById("canvasLoadingOverlay");
    el.canvasLoadingText = document.getElementById("canvasLoadingText");
    el.toastNotification = document.getElementById("toastNotification");
    el.toastMessage = document.getElementById("toastMessage");
  }

  // --- 3. DETERMINISTIC OFFLINE CALCULATIONS & LOGIC ---
  function calculateTotalDuration() {
    return state.scenes.reduce((sum, s) => sum + parseFloat(s.duration || 5), 0);
  }

  function calculateWordCount(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function calculateEstimatedReadingTime(wordCount) {
    const WORDS_PER_SECOND = 2.6; // average conversational reading pace
    return wordCount / WORDS_PER_SECOND;
  }

  function calculateEstimatedFilesizeKb(durationSec, bitrateKbps = 3200) {
    return Math.round((bitrateKbps * durationSec) / 8);
  }

  function updateCalculations() {
    const totalDuration = calculateTotalDuration();
    const formattedDuration = totalDuration.toFixed(1) + "s";
    const estKb = calculateEstimatedFilesizeKb(totalDuration);
    const estMb = (estKb / 1024).toFixed(1) + " MB";

    el.headerDurationText.textContent = formattedDuration;
    el.totalTimeDisplay.textContent = formatTimeDisplay(totalDuration);
    el.headerSceneCount.textContent = state.scenes.length;
    el.headerEstSize.textContent = estMb;
    el.modalEstSize.textContent = estMb;

    renderTimelineRuler(totalDuration);
  }

  function formatTimeDisplay(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${ms}`;
  }

  // --- 4. PROCEDURAL VISUAL ENGINE & SHADERS ---
  // Generates high-res backdrop canvases to simulate realistic AI generation without external dependencies
  function createProceduralVisual(key, prompt, style = "cyberpunk") {
    const offCanvas = document.createElement("canvas");
    offCanvas.width = 1280;
    offCanvas.height = 720;
    const ctx = offCanvas.getContext("2d");

    // Background base
    const grad = ctx.createLinearGradient(0, 0, 1280, 720);
    if (style === "cyberpunk") {
      grad.addColorStop(0, "#090514");
      grad.addColorStop(0.5, "#1f0d3d");
      grad.addColorStop(1, "#03001e");
    } else if (style === "cinematic") {
      grad.addColorStop(0, "#0b0f19");
      grad.addColorStop(0.5, "#1e293b");
      grad.addColorStop(1, "#020617");
    } else if (style === "anime") {
      grad.addColorStop(0, "#31103f");
      grad.addColorStop(0.5, "#6b21a8");
      grad.addColorStop(1, "#3b0764");
    } else {
      grad.addColorStop(0, "#064e3b");
      grad.addColorStop(0.5, "#0f172a");
      grad.addColorStop(1, "#022c22");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    // Draw stylized architectural grid / sun / geometric horizons
    ctx.save();
    if (style === "cyberpunk" || style === "anime") {
      // Draw neon grid perspective
      ctx.strokeStyle = "rgba(168, 85, 247, 0.25)";
      ctx.lineWidth = 1.5;
      const horizonY = 460;
      for (let x = -200; x < 1500; x += 60) {
        ctx.beginPath();
        ctx.moveTo(640, horizonY - 40);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = horizonY; y < 720; y += 28) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // Neon celestial glowing orb
      const sunGrad = ctx.createRadialGradient(640, 320, 10, 640, 320, 180);
      sunGrad.addColorStop(0, "rgba(236, 72, 153, 0.95)");
      sunGrad.addColorStop(0.5, "rgba(168, 85, 247, 0.6)");
      sunGrad.addColorStop(1, "rgba(147, 51, 234, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(640, 320, 180, 0, Math.PI * 2);
      ctx.fill();

      // Skyline silhouettes
      ctx.fillStyle = "#090514";
      const bldCount = 22;
      for (let i = 0; i < bldCount; i++) {
        const bx = i * 60 - 20;
        const bw = 50 + (i % 3) * 15;
        const bh = 140 + ((i * 37) % 240);
        ctx.fillRect(bx, horizonY - bh, bw, bh + 100);

        // Windows
        ctx.fillStyle = (i % 2 === 0) ? "rgba(236, 72, 153, 0.6)" : "rgba(56, 189, 248, 0.6)";
        for (let wy = horizonY - bh + 15; wy < horizonY; wy += 22) {
          if ((wy + i) % 3 === 0) {
            ctx.fillRect(bx + 8, wy, 6, 8);
            ctx.fillRect(bx + bw - 14, wy, 6, 8);
          }
        }
        ctx.fillStyle = "#090514";
      }
    } else {
      // Cinematic atmospheric nebula / mountains
      ctx.fillStyle = "rgba(14, 165, 233, 0.12)";
      ctx.beginPath();
      ctx.arc(400, 280, 300, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric mountains
      ctx.fillStyle = "#0f172a";
      ctx.beginPath();
      ctx.moveTo(0, 520);
      ctx.lineTo(340, 320);
      ctx.lineTo(680, 480);
      ctx.lineTo(1000, 290);
      ctx.lineTo(1280, 490);
      ctx.lineTo(1280, 720);
      ctx.lineTo(0, 720);
      ctx.closePath();
      ctx.fill();
    }

    // Atmospheric particle stars
    ctx.fillStyle = "#ffffff";
    for (let p = 0; p < 70; p++) {
      const px = (p * 79) % 1280;
      const py = (p * 53) % 440;
      const pr = 0.5 + (p % 3) * 0.8;
      ctx.globalAlpha = 0.3 + (p % 5) * 0.15;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    visualCache.set(key, offCanvas);
    return offCanvas;
  }

  function initGenerativeVisualAssets() {
    state.scenes.forEach(s => {
      createProceduralVisual(s.visualKey, s.prompt, state.style);
    });
  }

  // --- 5. REAL-TIME CANVAS RENDERING & KEN BURNS MOTION PIPELINE ---
  function resizeCanvasViewport() {
    let targetWidth = 1280;
    let targetHeight = 720;

    if (state.aspectRatio === "9:16") {
      targetWidth = 720;
      targetHeight = 1280;
      el.videoContainer.style.width = "300px";
      el.videoContainer.style.height = "533px";
      el.resolutionBadge.textContent = "720 x 1280 (9:16 Vertical)";
    } else if (state.aspectRatio === "1:1") {
      targetWidth = 1080;
      targetHeight = 1080;
      el.videoContainer.style.width = "400px";
      el.videoContainer.style.height = "400px";
      el.resolutionBadge.textContent = "1080 x 1080 (1:1 Square)";
    } else {
      targetWidth = 1280;
      targetHeight = 720;
      el.videoContainer.style.width = "640px";
      el.videoContainer.style.height = "360px";
      el.resolutionBadge.textContent = "1280 x 720 (16:9 Landscape)";
    }

    el.canvas.width = targetWidth;
    el.canvas.height = targetHeight;
  }

  function getSceneAtTime(timeSec) {
    let accum = 0;
    for (let i = 0; i < state.scenes.length; i++) {
      const dur = parseFloat(state.scenes[i].duration || 5);
      if (timeSec >= accum && timeSec < accum + dur) {
        return {
          scene: state.scenes[i],
          index: i,
          localTime: timeSec - accum,
          progress: (timeSec - accum) / dur,
          duration: dur,
          nextScene: state.scenes[i + 1] || null
        };
      }
      accum += dur;
    }
    // Return last scene if reached end
    const lastIdx = state.scenes.length - 1;
    const last = state.scenes[lastIdx];
    return {
      scene: last,
      index: lastIdx,
      localTime: parseFloat(last.duration),
      progress: 1.0,
      duration: parseFloat(last.duration),
      nextScene: null
    };
  }

  function drawFrame(currentTime) {
    const { ctx, canvas } = el;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const sceneData = getSceneAtTime(currentTime);
    if (!sceneData || !sceneData.scene) return;

    const { scene, progress, localTime, duration, nextScene } = sceneData;

    // Check if visual is in cache
    let imgCanvas = visualCache.get(scene.visualKey);
    if (!imgCanvas) {
      imgCanvas = createProceduralVisual(scene.visualKey, scene.prompt, state.style);
    }

    // KEN BURNS CAMERA MOTION COMPUTATION
    ctx.save();

    let scale = 1.0;
    let transX = 0;
    let transY = 0;

    switch (scene.motion) {
      case "zoom-in":
        scale = 1.0 + progress * 0.18;
        break;
      case "zoom-out":
        scale = 1.18 - progress * 0.18;
        break;
      case "pan-left":
        scale = 1.12;
        transX = (0.5 - progress) * (width * 0.1);
        break;
      case "pan-right":
        scale = 1.12;
        transX = (progress - 0.5) * (width * 0.1);
        break;
      case "drone-rise":
        scale = 1.05 + progress * 0.08;
        transY = (0.5 - progress) * (height * 0.08);
        break;
      default:
        scale = 1.05;
    }

    // Apply camera transform around center
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.translate(-width / 2 + transX, -height / 2 + transY);

    // Render underlying visual asset fitted to viewport
    ctx.drawImage(imgCanvas, 0, 0, width, height);

    // Apply color filter texture
    if (scene.filter === "cyber") {
      ctx.fillStyle = "rgba(168, 85, 247, 0.12)";
      ctx.fillRect(0, 0, width, height);
    } else if (scene.filter === "noir") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();

    // SCENE TRANSITION EFFECT (Crossfade in final 0.6 seconds)
    const transitionWindow = 0.6;
    const timeLeft = duration - localTime;
    if (nextScene && timeLeft < transitionWindow) {
      const transProgress = (transitionWindow - timeLeft) / transitionWindow;
      let nextImgCanvas = visualCache.get(nextScene.visualKey);
      if (!nextImgCanvas) {
        nextImgCanvas = createProceduralVisual(nextScene.visualKey, nextScene.prompt, state.style);
      }

      ctx.save();
      if (state.transition === "zoom") {
        const nextScale = 1.4 - transProgress * 0.35;
        ctx.globalAlpha = transProgress;
        ctx.translate(width / 2, height / 2);
        ctx.scale(nextScale, nextScale);
        ctx.translate(-width / 2, -height / 2);
        ctx.drawImage(nextImgCanvas, 0, 0, width, height);
      } else if (state.transition === "slide") {
        const slideOffset = (1 - transProgress) * width;
        ctx.drawImage(nextImgCanvas, slideOffset, 0, width, height);
      } else {
        // Crossfade
        ctx.globalAlpha = transProgress;
        ctx.drawImage(nextImgCanvas, 0, 0, width, height);
      }
      ctx.restore();
    }

    // DYNAMIC CINEMATIC SUBTITLE OVERLAY
    if (scene.caption) {
      ctx.save();
      const captionFontSize = Math.round(width * 0.038);
      ctx.font = `700 ${captionFontSize}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const posY = height - Math.round(height * 0.14);
      const posX = width / 2;

      // Subtitle Box Background with blur illusion
      const textMetrics = ctx.measureText(scene.caption);
      const paddingX = 24;
      const paddingY = 12;
      const boxWidth = textMetrics.width + paddingX * 2;
      const boxHeight = captionFontSize + paddingY * 2;

      ctx.fillStyle = "rgba(10, 10, 20, 0.72)";
      ctx.roundRect ? ctx.roundRect(posX - boxWidth / 2, posY - boxHeight / 2, boxWidth, boxHeight, 10) : ctx.fillRect(posX - boxWidth / 2, posY - boxHeight / 2, boxWidth, boxHeight);
      ctx.fill();

      // Border glow
      ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text with drop shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(scene.caption, posX, posY);

      ctx.restore();
    }

    // Update playhead on UI timeline
    updateTimelinePlayhead(currentTime);
  }

  // --- 6. TIMELINE & PLAYHEAD SYNCHRONIZATION ---
  function updateTimelinePlayhead(currentTime) {
    const totalDuration = calculateTotalDuration();
    if (totalDuration <= 0) return;

    el.currentTimeDisplay.textContent = formatTimeDisplay(currentTime);

    const scrollWidth = el.timelineScrollArea.scrollWidth;
    const playheadPx = (currentTime / totalDuration) * (scrollWidth - 40);
    el.timelinePlayhead.style.left = `${Math.max(16, playheadPx + 16)}px`;
  }

  function renderTimelineRuler(totalDuration) {
    el.timelineRuler.innerHTML = "";
    const step = 2.5; // Every 2.5s
    for (let t = 0; t <= totalDuration + 1; t += step) {
      const tick = document.createElement("div");
      tick.className = "flex-1 border-l border-slate-800 pl-1 h-3 flex items-center";
      tick.textContent = t.toFixed(1) + "s";
      el.timelineRuler.appendChild(tick);
    }
  }

  function renderTimelineScenes() {
    el.sceneBlocksContainer.innerHTML = "";
    el.audioTrackBlocks.innerHTML = "";

    const totalDur = calculateTotalDuration();

    state.scenes.forEach((scene, index) => {
      // Scene block width relative to duration
      const percentWidth = (parseFloat(scene.duration) / totalDur) * 100;

      const card = document.createElement("div");
      card.className = `timeline-scene-card relative h-full rounded-xl bg-slate-900 border ${
        index === state.activeSceneIndex ? "border-purple-500 shadow-md shadow-purple-500/20 active" : "border-slate-800"
      } p-2 flex flex-col justify-between cursor-pointer select-none overflow-hidden shrink-0`;
      card.style.width = `max(140px, ${percentWidth * 3.8 * state.timelineZoom}px)`;
      card.dataset.index = index;

      card.innerHTML = `
        <div class="flex items-center justify-between text-[11px]">
          <span class="font-bold text-white flex items-center gap-1">
            <span class="w-2 h-2 rounded-full ${index === state.activeSceneIndex ? "bg-purple-400" : "bg-slate-600"}"></span>
            Scene #${index + 1}
          </span>
          <span class="text-[10px] font-mono text-purple-300 bg-purple-950/70 px-1.5 py-0.5 rounded">${scene.duration}s</span>
        </div>
        <p class="text-[10px] text-slate-400 line-clamp-1 italic">${scene.prompt}</p>
        <div class="text-[9px] text-slate-500 flex items-center justify-between">
          <span class="capitalize">${scene.motion}</span>
          <span class="text-indigo-400">${scene.filter}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        selectScene(index);
      });

      el.sceneBlocksContainer.appendChild(card);

      // Audio waveform block
      const audioBlock = document.createElement("div");
      audioBlock.className = "h-5 bg-purple-950/40 border border-purple-800/40 rounded flex items-center px-2 gap-1 overflow-hidden";
      audioBlock.style.width = `max(140px, ${percentWidth * 3.8 * state.timelineZoom}px)`;
      audioBlock.innerHTML = `
        <i data-lucide="mic" class="w-3 h-3 text-pink-400 shrink-0"></i>
        <div class="flex-1 flex items-center gap-0.5 opacity-60">
          ${Array.from({ length: 18 }).map(() => `<span class="w-1 bg-pink-400/80 rounded-full" style="height: ${Math.floor(Math.random() * 12 + 4)}px"></span>`).join('')}
        </div>
        <span class="text-[9px] font-mono text-pink-300">${scene.duration}s</span>
      `;
      el.audioTrackBlocks.appendChild(audioBlock);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function selectScene(index) {
    if (index < 0 || index >= state.scenes.length) return;
    state.activeSceneIndex = index;

    // Calculate start time of this scene
    let sceneStartTime = 0;
    for (let i = 0; i < index; i++) {
      sceneStartTime += parseFloat(state.scenes[i].duration);
    }

    state.currentTime = sceneStartTime;
    drawFrame(state.currentTime);

    // Update scene editor form inputs
    const current = state.scenes[index];
    el.currentEditingSceneLabel.textContent = `Editing Scene #${index + 1}`;
    el.scenePromptInput.value = current.prompt || "";
    el.sceneCaptionInput.value = current.caption || "";
    el.sceneMotionSelect.value = current.motion || "zoom-in";
    el.sceneDurationInput.value = current.duration || 5.0;

    // Visual texture buttons
    document.querySelectorAll("#visualTextureSelect button").forEach(btn => {
      if (btn.dataset.filter === current.filter) {
        btn.classList.add("border-purple-500", "text-white");
        btn.classList.remove("text-slate-400", "border-slate-800");
      } else {
        btn.classList.remove("border-purple-500", "text-white");
        btn.classList.add("text-slate-400", "border-slate-800");
      }
    });

    renderTimelineScenes();
  }

  // --- 7. PLAYBACK LOOP & SYNTHESIZED AUDIO ORCHESTRATION ---
  function togglePlayback() {
    if (state.isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }

  function startPlayback() {
    const totalDuration = calculateTotalDuration();
    if (state.currentTime >= totalDuration) {
      state.currentTime = 0;
    }

    state.isPlaying = true;
    el.playIcon.setAttribute("data-lucide", "pause");
    if (window.lucide) window.lucide.createIcons();

    startBackgroundMusic();
    triggerSpeechForCurrentTime(state.currentTime);

    lastTimestamp = performance.now();
    animFrameId = requestAnimationFrame(playbackTick);
  }

  function pausePlayback() {
    state.isPlaying = false;
    el.playIcon.setAttribute("data-lucide", "play");
    if (window.lucide) window.lucide.createIcons();

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    stopBackgroundMusic();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function restartPlayback() {
    pausePlayback();
    state.currentTime = 0;
    drawFrame(0);
    startPlayback();
  }

  function playbackTick(timestamp) {
    if (!state.isPlaying) return;

    const delta = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    const previousTime = state.currentTime;
    state.currentTime += delta * state.playbackSpeed;

    const totalDuration = calculateTotalDuration();
    if (state.currentTime >= totalDuration) {
      state.currentTime = totalDuration;
      drawFrame(state.currentTime);
      pausePlayback();
      return;
    }

    // Check if we crossed a scene boundary to trigger voiceover
    const prevScene = getSceneAtTime(previousTime);
    const currScene = getSceneAtTime(state.currentTime);
    if (prevScene && currScene && prevScene.index !== currScene.index) {
      triggerSpeechForCurrentTime(state.currentTime);
    }

    drawFrame(state.currentTime);
    animFrameId = requestAnimationFrame(playbackTick);
  }

  // --- 8. WEB AUDIO & PROCEDURAL MUSIC SYNTHESIS ---
  function initAudioStudio() {
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
        bgmGainNode = audioCtx.createGain();
        bgmGainNode.gain.value = state.bgmVolume;
        bgmGainNode.connect(audioCtx.destination);
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  function startBackgroundMusic() {
    if (!audioCtx || state.bgmTheme === "none") return;
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    stopBackgroundMusic();

    try {
      // Procedural Ambient Synth Chord Generator
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();

      osc1.type = "sawtooth";
      osc2.type = "sine";

      // Select chord root based on theme
      let baseFreq = 110; // A2
      if (state.bgmTheme === "cinematic") baseFreq = 98; // G2
      if (state.bgmTheme === "lofi") baseFreq = 130.81; // C3
      if (state.bgmTheme === "action") baseFreq = 87.31; // F2

      osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(baseFreq * 1.5, audioCtx.currentTime); // Perfect fifth

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, audioCtx.currentTime);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(bgmGainNode);

      osc1.start();
      osc2.start();

      synthOscillator = { osc1, osc2, filter };
      isAudioPlaying = true;
    } catch (err) {
      console.warn("Unable to trigger synth audio", err);
    }
  }

  function stopBackgroundMusic() {
    if (synthOscillator) {
      try {
        synthOscillator.osc1.stop();
        synthOscillator.osc2.stop();
        synthOscillator.osc1.disconnect();
        synthOscillator.osc2.disconnect();
      } catch (e) {}
      synthOscillator = null;
    }
    isAudioPlaying = false;
  }

  // --- 9. WEB SPEECH API SYNTHESIZER ---
  function initTtsVoices() {
    if (!('speechSynthesis' in window)) return;

    function populateVoices() {
      const voices = window.speechSynthesis.getVoices();
      el.ttsVoiceSelect.innerHTML = "";
      voices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})${voice.default ? ' — Default' : ''}`;
        el.ttsVoiceSelect.appendChild(option);
      });
      if (voices.length > 0) {
        state.ttsVoice = voices[0];
      }
    }

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  function triggerSpeechForCurrentTime(timeSec) {
    if (!state.enableTts || !('speechSynthesis' in window)) return;

    const currentSceneData = getSceneAtTime(timeSec);
    if (!currentSceneData || !currentSceneData.scene || !currentSceneData.scene.caption) return;

    window.speechSynthesis.cancel(); // Cancel lingering narration

    const utterance = new SpeechSynthesisUtterance(currentSceneData.scene.caption);
    if (state.ttsVoice) utterance.voice = state.ttsVoice;
    utterance.rate = state.ttsRate;
    utterance.pitch = state.ttsPitch;
    utterance.volume = 0.95;

    window.speechSynthesis.speak(utterance);
  }

  // --- 10. AI GENERATOR PIPELINE ---
  async function generateAiStoryboard() {
    const prompt = el.aiPromptInput.value.trim() || "Futuristic neon metropolises with autonomous hovercrafts";
    const sceneCount = parseInt(el.sceneCountSelect.value, 10) || 3;
    const style = state.style;
    const transition = el.transitionStyleSelect.value;
    state.transition = transition;

    // Show visual loading spinner
    el.canvasLoadingOverlay.classList.remove("hidden");
    el.canvasLoadingText.textContent = `AI Brainstorming ${sceneCount} Scenes for "${prompt.slice(0, 32)}..."`;

    // Simulated neural generation delay
    await new Promise(r => setTimeout(r, 1400));

    // Curated dynamic storyboard storylines
    const storylines = [
      {
        prompt: `Opening wide shot: ${prompt} illuminated in intense vivid tones`,
        caption: `In an era defined by bold breakthroughs, our journey begins.`
      },
      {
        prompt: `Dynamic medium orbit: intricate details of ${prompt} reacting in real-time`,
        caption: `Every detail engineered for cinematic scale and breathtaking wonder.`
      },
      {
        prompt: `Atmospheric perspective: ethereal lighting sweeping across the environment`,
        caption: `Discover the untold mysteries where technology and artistry unite.`
      },
      {
        prompt: `Climactic high-speed sequence: soaring through the heart of the concept`,
        caption: `Pushing beyond boundaries toward an extraordinary future.`
      },
      {
        prompt: `Grand finale vista: radiant panoramic view under a glowing twilight sky`,
        caption: `The next chapter starts today. Create without limits.`
      },
      {
        prompt: `Epic closing card: stunning visual crescendo with subtle particle trails`,
        caption: `Experience the vision. Powered by artificial intelligence.`
      }
    ];

    const motions = ["zoom-in", "pan-left", "pan-right", "drone-rise", "zoom-out"];
    const generatedScenes = [];

    for (let i = 0; i < sceneCount; i++) {
      const storyItem = storylines[i] || {
        prompt: `${prompt} scene progression #${i + 1}`,
        caption: `Visual sequence #${i + 1} rendering in high definition.`
      };

      const visualKey = `gen_${Date.now()}_${i}`;
      createProceduralVisual(visualKey, storyItem.prompt, style);

      generatedScenes.push({
        id: `scene_${Date.now()}_${i}`,
        prompt: storyItem.prompt,
        caption: storyItem.caption,
        motion: motions[i % motions.length],
        duration: 5.0,
        filter: style === "cyberpunk" ? "cyber" : "none",
        visualKey
      });
    }

    state.scenes = generatedScenes;
    state.activeSceneIndex = 0;
    state.currentTime = 0;

    el.canvasLoadingOverlay.classList.add("hidden");
    renderTimelineScenes();
    selectScene(0);
    updateCalculations();
    showToast(`Successfully generated ${sceneCount} AI scenes!`);

    // Switch to Scene Editor tab
    switchTab("scenes");
  }

  // --- 11. MEDIARECORDER REAL-TIME VIDEO EXPORT ENGINE ---
  async function exportRenderedVideo() {
    if (state.isExporting) return;
    state.isExporting = true;
    pausePlayback();

    // Prepare modal
    el.exportModal.classList.remove("hidden");
    el.exportProgressBar.style.width = "0%";
    el.exportPercentText.textContent = "0%";
    el.exportStatusText.textContent = "Preparing canvas stream and audio synthesizer...";
    el.exportDownloadContainer.classList.add("hidden");

    const totalDuration = calculateTotalDuration();
    const fps = 30;
    const totalFrames = Math.ceil(totalDuration * fps);

    try {
      // Capture Canvas Stream
      const stream = el.canvas.captureStream(fps);

      // Create synthetic audio destination node to bundle procedural music directly into video
      if (audioCtx) {
        const dest = audioCtx.createMediaStreamDestination();
        bgmGainNode.connect(dest);
        const audioTracks = dest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          stream.addTrack(audioTracks[0]);
        }
      }

      // Check supported codecs
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 3500000
      });

      const recordedChunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      const recorderStoppedPromise = new Promise((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          resolve(blob);
        };
      });

      recorder.start();
      startBackgroundMusic();

      // Render each frame accurately in time
      for (let frame = 0; frame <= totalFrames; frame++) {
        const time = (frame / totalFrames) * totalDuration;
        drawFrame(time);

        const progressPercent = Math.round((frame / totalFrames) * 98);
        el.exportProgressBar.style.width = `${progressPercent}%`;
        el.exportPercentText.textContent = `${progressPercent}%`;
        el.exportStatusText.textContent = `Rendering frame ${frame} of ${totalFrames} (${time.toFixed(1)}s)...`;

        // Small wait between frames for canvas engine capture
        await new Promise(r => setTimeout(r, 1000 / fps));
      }

      stopBackgroundMusic();
      recorder.stop();

      el.exportStatusText.textContent = "Muxing video tracks and generating download...";
      const finalBlob = await recorderStoppedPromise;

      const videoUrl = URL.createObjectURL(finalBlob);
      el.downloadVideoLink.href = videoUrl;
      const cleanTitle = (state.title || "ai-video").toLowerCase().replace(/[^a-z0-9]/g, '-');
      el.downloadVideoLink.download = `${cleanTitle}.webm`;

      el.exportProgressBar.style.width = "100%";
      el.exportPercentText.textContent = "100%";
      el.exportStatusText.textContent = "Video successfully rendered!";
      el.exportDownloadContainer.classList.remove("hidden");

      showToast("Video rendered! Ready for download.");
    } catch (err) {
      console.error("Export error:", err);
      el.exportStatusText.textContent = "Render error: " + err.message;
      showToast("Export failed: " + err.message);
    } finally {
      state.isExporting = false;
    }
  }

  // --- 12. BACKEND API CLIENT & CLOUD SYNC ---
  // Mandatory Endpoints: POST /register, POST /login, POST /logout, GET/POST/PUT/DELETE /data
  const ApiClient = {
    async register(email, password) {
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: APP_CONFIG.appId,
          email,
          password
        })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Registration failed");
      }
      return data;
    },

    async login(email, password) {
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: APP_CONFIG.appId,
          email,
          password
        })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Login failed");
      }
      // Critical Auth Rule: token is returned ONLY from /login
      return data;
    },

    async logout() {
      if (!state.authToken) return;
      try {
        await fetch(`${APP_CONFIG.apiBaseUrl}/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${state.authToken}`
          }
        });
      } catch (e) {
        console.warn("Logout request failed:", e);
      }
      state.authToken = null;
      state.userEmail = null;
      localStorage.removeItem("videomakerai_token");
      localStorage.removeItem("videomakerai_email");
      updateAuthUi();
    },

    async requestOtp(email) {
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: APP_CONFIG.appId,
          email
        })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Failed to request OTP");
      }
      return data;
    },

    async resetPassword(email, otp, newPassword) {
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_id: APP_CONFIG.appId,
          email,
          otp,
          new_password: newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.message || data.error || "Password reset failed");
      }
      return data;
    },

    // Generic /data API CRUD operations
    async createProject(projectPayload) {
      if (!state.authToken) throw new Error("Please log in to save to Cloud.");
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.authToken}`
        },
        body: JSON.stringify({
          collection: "video_projects",
          data: projectPayload
        })
      });
      const result = await res.json();
      if (!res.ok || result.success !== true) {
        throw new Error(result.error || result.message || "Failed to create cloud project");
      }
      // Critical parse rule: record is nested
      return result.record;
    },

    async readProjects() {
      if (!state.authToken) throw new Error("Please log in to view cloud projects.");
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/data?collection=video_projects`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${state.authToken}`
        }
      });
      const result = await res.json();
      if (!res.ok || result.success !== true) {
        throw new Error(result.error || result.message || "Failed to read projects");
      }
      // Critical parse rule: records array
      return result.records || [];
    },

    async updateProject(recordId, projectPayload) {
      if (!state.authToken) throw new Error("Please log in to update cloud project.");
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/data`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${state.authToken}`
        },
        body: JSON.stringify({
          id: recordId,
          data: projectPayload
        })
      });
      const result = await res.json();
      if (!res.ok || result.success !== true) {
        throw new Error(result.error || result.message || "Failed to update project");
      }
      return result;
    },

    async deleteProject(recordId) {
      if (!state.authToken) throw new Error("Please log in to delete project.");
      const res = await fetch(`${APP_CONFIG.apiBaseUrl}/data?id=${recordId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${state.authToken}`
        }
      });
      const result = await res.json();
      if (!res.ok || result.success !== true) {
        throw new Error(result.error || result.message || "Failed to delete project");
      }
      return result;
    }
  };

  // Save current project state to cloud
  async function saveProjectToCloud() {
    if (!state.authToken) {
      openAuthModal("login");
      return;
    }

    const payload = {
      title: state.title,
      aspect_ratio: state.aspectRatio,
      style: state.style,
      scenes_json: JSON.stringify(state.scenes),
      audio_track: state.bgmTheme,
      duration: calculateTotalDuration(),
      thumbnail: state.style
    };

    try {
      el.saveCloudBtn.disabled = true;
      el.saveCloudBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i><span>Saving...</span>`;
      if (window.lucide) window.lucide.createIcons();

      if (state.currentProjectId) {
        await ApiClient.updateProject(state.currentProjectId, payload);
        showToast("Project successfully updated in cloud!");
      } else {
        const record = await ApiClient.createProject(payload);
        state.currentProjectId = record.id;
        showToast("Project successfully saved to cloud!");
      }
    } catch (err) {
      showToast("Cloud save error: " + err.message);
    } finally {
      el.saveCloudBtn.disabled = false;
      el.saveCloudBtn.innerHTML = `<i data-lucide="cloud-upload" class="w-3.5 h-3.5"></i><span>Save Cloud</span>`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // Load cloud projects list into modal
  async function loadCloudProjectsList() {
    if (!state.authToken) {
      openAuthModal("login");
      return;
    }

    el.projectsModal.classList.remove("hidden");
    el.projectsListContainer.innerHTML = `
      <div class="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
        <i data-lucide="loader" class="w-4 h-4 animate-spin text-purple-400"></i>
        <span>Loading cloud projects...</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
      const records = await ApiClient.readProjects();
      el.projectsCountLabel.textContent = `${records.length} project(s) saved`;

      if (records.length === 0) {
        el.projectsListContainer.innerHTML = `
          <div class="text-center py-12 text-slate-500 text-xs">
            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-50"></i>
            <span>No saved cloud projects found. Click "Save Cloud" to store this project!</span>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      el.projectsListContainer.innerHTML = "";
      records.forEach(rec => {
        const data = rec.data || {};
        const card = document.createElement("div");
        card.className = "p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/70 flex items-center justify-between gap-3 transition-colors";
        card.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-lg bg-gradient-to-tr from-purple-900 to-indigo-900 flex items-center justify-center text-white shrink-0">
              <i data-lucide="film" class="w-6 h-6 text-purple-300"></i>
            </div>
            <div>
              <h4 class="text-xs font-bold text-white hover:text-purple-300 transition-colors">${data.title || "Untitled Project"}</h4>
              <p class="text-[11px] text-slate-400">${data.duration ? data.duration.toFixed(1) + 's' : '15.0s'} • ${data.aspect_ratio || '16:9'} • Style: ${data.style || 'cyberpunk'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="load-btn px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors" data-id="${rec.id}">
              Open
            </button>
            <button class="del-btn p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-rose-400 transition-colors" data-id="${rec.id}">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        `;

        // Load project click
        card.querySelector(".load-btn").addEventListener("click", () => {
          loadProjectRecord(rec);
          el.projectsModal.classList.add("hidden");
        });

        // Delete project click
        card.querySelector(".del-btn").addEventListener("click", async () => {
          if (confirm("Delete this cloud project permanently?")) {
            try {
              await ApiClient.deleteProject(rec.id);
              if (state.currentProjectId === rec.id) state.currentProjectId = null;
              loadCloudProjectsList();
              showToast("Project deleted.");
            } catch (err) {
              showToast("Delete failed: " + err.message);
            }
          }
        });

        el.projectsListContainer.appendChild(card);
      });

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      el.projectsListContainer.innerHTML = `
        <div class="text-center py-8 text-rose-400 text-xs">
          <p>Failed to load projects: ${err.message}</p>
        </div>
      `;
    }
  }

  function loadProjectRecord(rec) {
    const data = rec.data || {};
    state.currentProjectId = rec.id;
    state.title = data.title || "Untitled Project";
    el.projectTitleInput.value = state.title;
    state.aspectRatio = data.aspect_ratio || "16:9";
    el.aspectRatioSelect.value = state.aspectRatio;
    state.style = data.style || "cyberpunk";

    if (data.scenes_json) {
      try {
        state.scenes = JSON.parse(data.scenes_json);
      } catch (e) {
        console.warn("Could not parse scenes json", e);
      }
    }

    state.bgmTheme = data.audio_track || "synthwave";
    el.bgmThemeSelect.value = state.bgmTheme;

    state.activeSceneIndex = 0;
    state.currentTime = 0;

    initGenerativeVisualAssets();
    resizeCanvasViewport();
    renderTimelineScenes();
    selectScene(0);
    updateCalculations();
    showToast(`Loaded project "${state.title}"`);
  }

  function startBlankProject() {
    state.currentProjectId = null;
    state.title = "New AI Video Project";
    el.projectTitleInput.value = state.title;
    state.scenes = [
      {
        id: "scene_init_1",
        prompt: "Cinematic establishing shot with deep atmospheric lighting",
        caption: "A new story begins right here.",
        motion: "zoom-in",
        duration: 5.0,
        filter: "none",
        visualKey: "visual_init_1"
      }
    ];
    state.activeSceneIndex = 0;
    state.currentTime = 0;
    initGenerativeVisualAssets();
    renderTimelineScenes();
    selectScene(0);
    updateCalculations();
    el.projectsModal.classList.add("hidden");
    showToast("Created fresh blank project");
  }

  // --- 13. AUTHENTICATION UI & GMAIL OTP WORKFLOW ---
  function updateAuthUi() {
    if (state.authToken && state.userEmail) {
      el.userAuthBtn.innerHTML = `<span class="text-xs font-bold text-purple-300 font-mono">${state.userEmail.slice(0, 2).toUpperCase()}</span>`;
      el.userAuthBtn.title = `Logged in as: ${state.userEmail} (Click to sign out)`;
    } else {
      el.userAuthBtn.innerHTML = `<i data-lucide="user" class="w-4 h-4"></i>`;
      el.userAuthBtn.title = "Account Settings (Sign In)";
    }
    if (window.lucide) window.lucide.createIcons();
  }

  function openAuthModal(mode = "login") {
    if (state.authToken) {
      if (confirm(`Currently signed in as ${state.userEmail}. Sign out?`)) {
        ApiClient.logout();
        showToast("Signed out successfully.");
      }
      return;
    }

    state.authMode = mode;
    el.authModal.classList.remove("hidden");
    el.authMainView.classList.remove("hidden");
    el.authForgotView.classList.add("hidden");
    el.authErrorMessage.classList.add("hidden");
    el.authEmailInput.value = "";
    el.authPasswordInput.value = "";

    if (mode === "login") {
      el.authTitle.textContent = "Sign In to videomakerai";
      el.authSubtitle.textContent = "Access your saved cloud videos";
      el.authSubmitBtn.textContent = "Sign In";
      el.authToggleText.textContent = "Don't have an account?";
      el.toggleAuthModeBtn.textContent = "Sign Up";
    } else {
      el.authTitle.textContent = "Create an Account";
      el.authSubtitle.textContent = "Sync projects across devices";
      el.authSubmitBtn.textContent = "Create Account";
      el.authToggleText.textContent = "Already have an account?";
      el.toggleAuthModeBtn.textContent = "Sign In";
    }
  }

  async function handleAuthSubmit() {
    const email = el.authEmailInput.value.trim();
    const password = el.authPasswordInput.value;

    if (!email || !password) {
      showAuthError("Please fill out both email and password.");
      return;
    }

    el.authErrorMessage.classList.add("hidden");
    el.authSubmitBtn.disabled = true;
    el.authSubmitBtn.textContent = "Processing...";

    try {
      if (state.authMode === "register") {
        // Step 1: Call POST /register (Rule: /register NEVER returns token)
        await ApiClient.register(email, password);
        // Step 2: Automatically chain POST /login to obtain token
        const loginData = await ApiClient.login(email, password);
        state.authToken = loginData.token;
        state.userEmail = email;
        localStorage.setItem("videomakerai_token", loginData.token);
        localStorage.setItem("videomakerai_email", email);
        showToast("Account created and signed in!");
      } else {
        // Step 1: Call POST /login (reads token directly)
        const loginData = await ApiClient.login(email, password);
        state.authToken = loginData.token;
        state.userEmail = email;
        localStorage.setItem("videomakerai_token", loginData.token);
        localStorage.setItem("videomakerai_email", email);
        showToast("Signed in successfully!");
      }

      el.authModal.classList.add("hidden");
      updateAuthUi();
    } catch (err) {
      showAuthError(err.message);
    } finally {
      el.authSubmitBtn.disabled = false;
      el.authSubmitBtn.textContent = state.authMode === "register" ? "Create Account" : "Sign In";
    }
  }

  function showAuthError(msg) {
    el.authErrorMessage.textContent = msg;
    el.authErrorMessage.classList.remove("hidden");
  }

  // OTP Forgot Password steps
  async function handleSendOtp() {
    const email = el.otpEmailInput.value.trim();
    if (!email) {
      showOtpMessage("Please enter your registered email.", true);
      return;
    }

    el.sendOtpBtn.disabled = true;
    el.sendOtpBtn.textContent = "Sending OTP...";

    try {
      await ApiClient.requestOtp(email);
      el.otpStep1.classList.add("hidden");
      el.otpStep2.classList.remove("hidden");
      showOtpMessage("OTP code sent to your Gmail inbox. Check spam if not found.", false);
    } catch (err) {
      showOtpMessage(err.message, true);
    } finally {
      el.sendOtpBtn.disabled = false;
      el.sendOtpBtn.textContent = "Send OTP Code";
    }
  }

  async function handleResetPassword() {
    const email = el.otpEmailInput.value.trim();
    const otp = el.otpCodeInput.value.trim();
    const newPassword = el.otpNewPasswordInput.value;

    if (!otp || !newPassword) {
      showOtpMessage("Please provide the 6-digit OTP and your new password.", true);
      return;
    }

    el.submitResetPasswordBtn.disabled = true;
    el.submitResetPasswordBtn.textContent = "Resetting...";

    try {
      await ApiClient.resetPassword(email, otp, newPassword);
      showToast("Password reset successfully! Please sign in.");
      el.authForgotView.classList.add("hidden");
      el.authMainView.classList.remove("hidden");
      state.authMode = "login";
      openAuthModal("login");
    } catch (err) {
      showOtpMessage(err.message, true);
    } finally {
      el.submitResetPasswordBtn.disabled = false;
      el.submitResetPasswordBtn.textContent = "Confirm New Password";
    }
  }

  function showOtpMessage(msg, isError) {
    el.otpMessage.textContent = msg;
    el.otpMessage.className = `text-xs mt-3 p-2 rounded-lg border ${
      isError ? "bg-rose-950/40 text-rose-300 border-rose-900/50" : "bg-emerald-950/40 text-emerald-300 border-emerald-900/50"
    }`;
    el.otpMessage.classList.remove("hidden");
  }

  // --- 14. UI EVENT BINDINGS ---
  function bindEvents() {
    // Project title change
    el.projectTitleInput.addEventListener("input", (e) => {
      state.title = e.target.value.trim() || "Untitled AI Video";
    });

    // Studio tabs switching
    el.tabGenerate.addEventListener("click", () => switchTab("generate"));
    el.tabScenes.addEventListener("click", () => switchTab("scenes"));
    el.tabAudio.addEventListener("click", () => switchTab("audio"));

    // Aspect ratio change
    el.aspectRatioSelect.addEventListener("change", (e) => {
      state.aspectRatio = e.target.value;
      resizeCanvasViewport();
      drawFrame(state.currentTime);
    });

    // Style card presets
    document.querySelectorAll("#stylePresetContainer .style-card").forEach(card => {
      card.addEventListener("click", () => {
        document.querySelectorAll("#stylePresetContainer .style-card").forEach(c => {
          c.classList.remove("active", "border-purple-500", "bg-slate-800/70", "text-purple-300");
          c.classList.add("bg-slate-950", "border-slate-800", "text-slate-400");
        });
        card.classList.add("active", "border-purple-500", "bg-slate-800/70", "text-purple-300");
        card.classList.remove("bg-slate-950", "border-slate-800", "text-slate-400");
        state.style = card.dataset.style;
        initGenerativeVisualAssets();
        drawFrame(state.currentTime);
      });
    });

    // AI Generate trigger
    el.generateAiVideoBtn.addEventListener("click", generateAiStoryboard);

    // Magic prompt suggestion button
    el.magicSuggestBtn.addEventListener("click", () => {
      const suggestions = [
        "Hyperlapse through glowing bioluminescent alien jungle at midnight",
        "Cyberpunk pilot descending into neo-shanghai megacity rain with reflections",
        "Solar storm passing over futuristic Mars colony geodesic glass domes",
        "Deep ocean submersible encountering ancient crystalline sunken monolith"
      ];
      el.aiPromptInput.value = suggestions[Math.floor(Math.random() * suggestions.length)];
    });

    // Scene Editor Form Live Sync
    el.scenePromptInput.addEventListener("input", (e) => {
      const curr = state.scenes[state.activeSceneIndex];
      if (curr) {
        curr.prompt = e.target.value;
        renderTimelineScenes();
      }
    });

    el.sceneCaptionInput.addEventListener("input", (e) => {
      const curr = state.scenes[state.activeSceneIndex];
      if (curr) {
        curr.caption = e.target.value;
        drawFrame(state.currentTime);
      }
    });

    el.sceneMotionSelect.addEventListener("change", (e) => {
      const curr = state.scenes[state.activeSceneIndex];
      if (curr) {
        curr.motion = e.target.value;
        renderTimelineScenes();
        drawFrame(state.currentTime);
      }
    });

    el.sceneDurationInput.addEventListener("change", (e) => {
      const curr = state.scenes[state.activeSceneIndex];
      if (curr) {
        const val = Math.max(2, Math.min(15, parseFloat(e.target.value) || 5));
        curr.duration = val;
        updateCalculations();
        renderTimelineScenes();
        drawFrame(state.currentTime);
      }
    });

    // Texture filters
    document.querySelectorAll("#visualTextureSelect button").forEach(btn => {
      btn.addEventListener("click", () => {
        const curr = state.scenes[state.activeSceneIndex];
        if (curr) {
          curr.filter = btn.dataset.filter;
          document.querySelectorAll("#visualTextureSelect button").forEach(b => {
            b.classList.remove("border-purple-500", "text-white");
            b.classList.add("text-slate-400", "border-slate-800");
          });
          btn.classList.add("border-purple-500", "text-white");
          btn.classList.remove("text-slate-400", "border-slate-800");
          drawFrame(state.currentTime);
        }
      });
    });

    // Regenerate current scene visual
    el.regenerateSceneVisualBtn.addEventListener("click", () => {
      const curr = state.scenes[state.activeSceneIndex];
      if (curr) {
        curr.visualKey = `scene_${Date.now()}`;
        createProceduralVisual(curr.visualKey, curr.prompt, state.style);
        drawFrame(state.currentTime);
        showToast("Scene visual regenerated!");
      }
    });

    // Add scene button
    function addNewSceneHandler() {
      const newIdx = state.scenes.length + 1;
      const newKey = `scene_custom_${Date.now()}`;
      const newPrompt = `Scene #${newIdx} visual progression in ${state.style} environment`;
      createProceduralVisual(newKey, newPrompt, state.style);

      state.scenes.push({
        id: `scene_${Date.now()}`,
        prompt: newPrompt,
        caption: `Scene #${newIdx} subtitle narration.`,
        motion: "zoom-in",
        duration: 5.0,
        filter: "none",
        visualKey: newKey
      });

      renderTimelineScenes();
      updateCalculations();
      selectScene(state.scenes.length - 1);
      showToast(`Added Scene #${newIdx}`);
    }

    el.addNewSceneBtn.addEventListener("click", addNewSceneHandler);
    el.addTimelineSceneBtn.addEventListener("click", addNewSceneHandler);

    // Delete scene button
    el.deleteSceneBtn.addEventListener("click", () => {
      if (state.scenes.length <= 1) {
        showToast("A video requires at least one scene!");
        return;
      }
      state.scenes.splice(state.activeSceneIndex, 1);
      state.activeSceneIndex = Math.max(0, state.activeSceneIndex - 1);
      renderTimelineScenes();
      updateCalculations();
      selectScene(state.activeSceneIndex);
      showToast("Scene removed.");
    });

    // Audio controls
    el.enableTtsCheckbox.addEventListener("change", (e) => {
      state.enableTts = e.target.checked;
    });

    el.ttsVoiceSelect.addEventListener("change", (e) => {
      if ('speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        state.ttsVoice = voices[parseInt(e.target.value, 10)] || null;
      }
    });

    el.ttsRateRange.addEventListener("input", (e) => {
      state.ttsRate = parseFloat(e.target.value);
    });

    el.ttsPitchRange.addEventListener("input", (e) => {
      state.ttsPitch = parseFloat(e.target.value);
    });

    el.bgmThemeSelect.addEventListener("change", (e) => {
      state.bgmTheme = e.target.value;
      if (state.isPlaying) {
        startBackgroundMusic();
      }
    });

    el.bgmVolumeRange.addEventListener("input", (e) => {
      const vol = parseInt(e.target.value, 10) / 100;
      state.bgmVolume = vol;
      el.bgmVolumeLabel.textContent = `${Math.round(vol * 100)}%`;
      if (bgmGainNode) {
        bgmGainNode.gain.setValueAtTime(vol, audioCtx ? audioCtx.currentTime : 0);
      }
    });

    el.previewAudioBtn.addEventListener("click", () => {
      if (isAudioPlaying) {
        stopBackgroundMusic();
        if (window.speechSynthesis) window.speechSynthesis.cancel();
      } else {
        startBackgroundMusic();
        triggerSpeechForCurrentTime(state.currentTime);
        setTimeout(() => stopBackgroundMusic(), 4000);
      }
    });

    // Transport controls
    el.playPauseBtn.addEventListener("click", togglePlayback);
    el.restartBtn.addEventListener("click", restartPlayback);

    el.masterVolumeRange.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10) / 100;
      if (bgmGainNode) {
        bgmGainNode.gain.setValueAtTime(val * state.bgmVolume, audioCtx ? audioCtx.currentTime : 0);
      }
    });

    el.fullscreenBtn.addEventListener("click", () => {
      if (!document.fullscreenElement) {
        el.videoContainer.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen();
      }
    });

    // Timeline Scrubbing Click
    el.timelineScrollArea.addEventListener("click", (e) => {
      // If clicking directly on time ruler or empty timeline background
      const rect = el.timelineScrollArea.getBoundingClientRect();
      const clickX = e.clientX - rect.left + el.timelineScrollArea.scrollLeft;
      const totalWidth = el.timelineScrollArea.scrollWidth - 30;
      const ratio = Math.max(0, Math.min(1, clickX / totalWidth));
      const targetTime = ratio * calculateTotalDuration();
      state.currentTime = targetTime;
      drawFrame(state.currentTime);
    });

    // Zoom timeline
    el.timelineZoomIn.addEventListener("click", () => {
      state.timelineZoom = Math.min(2.5, state.timelineZoom + 0.25);
      el.timelineZoomLevel.textContent = state.timelineZoom.toFixed(1) + "x";
      renderTimelineScenes();
    });

    el.timelineZoomOut.addEventListener("click", () => {
      state.timelineZoom = Math.max(0.5, state.timelineZoom - 0.25);
      el.timelineZoomLevel.textContent = state.timelineZoom.toFixed(1) + "x";
      renderTimelineScenes();
    });

    // Export Modal Triggers
    el.exportVideoBtn.addEventListener("click", exportRenderedVideo);
    el.cancelExportBtn.addEventListener("click", () => {
      el.exportModal.classList.add("hidden");
    });

    // Cloud Projects modal
    el.saveCloudBtn.addEventListener("click", saveProjectToCloud);
    el.projectsBtn.addEventListener("click", loadCloudProjectsList);
    el.closeProjectsModal.addEventListener("click", () => {
      el.projectsModal.classList.add("hidden");
    });
    el.newBlankProjectBtn.addEventListener("click", startBlankProject);

    // Auth Modal
    el.userAuthBtn.addEventListener("click", () => openAuthModal("login"));
    el.closeAuthModal.addEventListener("click", () => el.authModal.classList.add("hidden"));
    el.authForm.addEventListener("submit", handleAuthSubmit);
    el.toggleAuthModeBtn.addEventListener("click", () => {
      openAuthModal(state.authMode === "login" ? "register" : "login");
    });

    // Forgot password link
    el.forgotPasswordLink.addEventListener("click", () => {
      el.authMainView.classList.add("hidden");
      el.authForgotView.classList.remove("hidden");
      el.otpEmailInput.value = el.authEmailInput.value;
      el.otpStep1.classList.remove("hidden");
      el.otpStep2.classList.add("hidden");
      el.otpMessage.classList.add("hidden");
    });

    el.backToLoginBtn.addEventListener("click", () => {
      el.authForgotView.classList.add("hidden");
      el.authMainView.classList.remove("hidden");
    });

    el.sendOtpBtn.addEventListener("click", handleSendOtp);
    el.submitResetPasswordBtn.addEventListener("click", handleResetPassword);
  }

  function switchTab(tabKey) {
    [el.tabGenerate, el.tabScenes, el.tabAudio].forEach(t => {
      t.classList.remove("text-purple-400", "border-purple-500", "font-semibold", "bg-slate-900/40");
      t.classList.add("text-slate-400", "border-transparent");
    });
    [el.panelGenerate, el.panelScenes, el.panelAudio].forEach(p => p.classList.add("hidden"));

    if (tabKey === "generate") {
      el.tabGenerate.classList.add("text-purple-400", "border-purple-500", "font-semibold", "bg-slate-900/40");
      el.panelGenerate.classList.remove("hidden");
    } else if (tabKey === "scenes") {
      el.tabScenes.classList.add("text-purple-400", "border-purple-500", "font-semibold", "bg-slate-900/40");
      el.panelScenes.classList.remove("hidden");
    } else if (tabKey === "audio") {
      el.tabAudio.classList.add("text-purple-400", "border-purple-500", "font-semibold", "bg-slate-900/40");
      el.panelAudio.classList.remove("hidden");
    }
  }

  function showToast(msg) {
    el.toastMessage.textContent = msg;
    el.toastNotification.classList.remove("translate-y-20", "opacity-0");
    el.toastNotification.classList.add("translate-y-0", "opacity-100");

    setTimeout(() => {
      el.toastNotification.classList.remove("translate-y-0", "opacity-100");
      el.toastNotification.classList.add("translate-y-20", "opacity-0");
    }, 3200);
  }

  // Self-start application upon DOM readiness
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();