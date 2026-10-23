/**
 * Perfect Circle Challenge
 * Native HTML5 Mobile & Desktop Game
 */

// --- Audio Synthesizer (Zero-dependency Web Audio API) ---
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.humOsc = null;
    this.humGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startDrawHum() {
    if (!this.enabled || !this.ctx) return;
    try {
      this.stopDrawHum();
      this.humOsc = this.ctx.createOscillator();
      this.humGain = this.ctx.createGain();
      this.humOsc.type = 'sine';
      this.humOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.humGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.humGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.1);

      this.humOsc.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);
      this.humOsc.start();
    } catch (e) {
      // Audio fallback silent
    }
  }

  updateDrawPitch(progress) {
    if (!this.enabled || !this.humOsc || !this.ctx) return;
    try {
      const freq = 140 + Math.min(progress, 1) * 260;
      this.humOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
    } catch (e) {
      // Ignore audio glitch
    }
  }

  stopDrawHum() {
    if (this.humOsc) {
      try {
        if (this.humGain && this.ctx) {
          this.humGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
        }
        setTimeout(() => {
          if (this.humOsc) {
            this.humOsc.stop();
            this.humOsc.disconnect();
            this.humOsc = null;
          }
        }, 60);
      } catch (e) {
        this.humOsc = null;
      }
    }
  }

  playScore(accuracy) {
    if (!this.enabled || !this.ctx) return;
    try {
      const baseFreq = accuracy >= 90 ? 587.33 : accuracy >= 80 ? 440 : 329.63;
      const chords = accuracy >= 85 ? [baseFreq, baseFreq * 1.25, baseFreq * 1.5] : [baseFreq, baseFreq * 1.2];
      
      chords.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = accuracy >= 80 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, this.ctx.currentTime + i * 0.08);

        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + i * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + i * 0.08 + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(this.ctx.currentTime + i * 0.08);
        osc.stop(this.ctx.currentTime + i * 0.08 + 0.55);
      });
    } catch (e) {
      // Ignore audio
    }
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {}
  }
}

// --- Main Game Logic & Canvas Manager ---
class PerfectCircleGame {
  constructor() {
    this.canvas = document.getElementById('circle-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.sound = new SoundEngine();

    // DOM references
    this.guideOverlay = document.getElementById('guide-overlay');
    this.statusPill = document.getElementById('status-pill');
    this.resultDrawer = document.getElementById('result-drawer');
    this.scoreValEl = document.getElementById('score-value');
    this.scoreCommentEl = document.getElementById('score-comment');
    this.feedbackBadgeEl = document.getElementById('feedback-badge');
    this.bestScoreDisplay = document.getElementById('best-score-display');
    this.attemptCountEl = document.getElementById('attempt-count');
    this.metricRoundness = document.getElementById('metric-roundness');
    this.metricClosure = document.getElementById('metric-closure');
    this.metricVariance = document.getElementById('metric-variance');
    this.resetBtn = document.getElementById('reset-btn');
    this.retryBtnModal = document.getElementById('retry-btn-modal');
    this.toggleOverlayBtn = document.getElementById('toggle-overlay-btn');
    this.overlayStateDot = document.getElementById('overlay-state-dot');
    this.soundBtn = document.getElementById('sound-btn');
    this.soundIconOn = document.getElementById('sound-icon-on');
    this.soundIconOff = document.getElementById('sound-icon-off');

    // State
    this.isDrawing = false;
    this.points = [];
    this.attempts = 0;
    this.bestScore = parseFloat(localStorage.getItem('pcc_best_score') || '0.0');
    this.showIdealCircle = true;
    this.lastEvaluation = null;
    this.particles = [];
    this.animId = null;

    // Viewport scaling
    this.dpr = window.devicePixelRatio || 1;
    this.canvasWidth = 0;
    this.canvasHeight = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.referenceRadius = 0;

    this.init();
  }

  init() {
    this.updateBestScoreDisplay();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.bindEvents();
    this.render();
  }

  updateBestScoreDisplay() {
    this.bestScoreDisplay.textContent = `${this.bestScore.toFixed(1)}%`;
  }

  resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;

    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);

    this.ctx.scale(this.dpr, this.dpr);

    this.centerX = this.canvasWidth / 2;
    this.centerY = this.canvasHeight / 2;
    this.referenceRadius = Math.min(this.centerX, this.centerY) * 0.68;

    this.redrawAll();
  }

  bindEvents() {
    // Pointer / Touch / Mouse bindings with touch-action cancellation
    const handleStart = (e) => {
      e.preventDefault();
      this.sound.init();
      const coords = this.getCanvasCoordinates(e);
      this.startDrawing(coords.x, coords.y);
    };

    const handleMove = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const coords = this.getCanvasCoordinates(e);
      this.continueDrawing(coords.x, coords.y);
    };

    const handleEnd = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      this.finishDrawing();
    };

    // Touch events
    this.canvas.addEventListener('touchstart', handleStart, { passive: false });
    this.canvas.addEventListener('touchmove', handleMove, { passive: false });
    this.canvas.addEventListener('touchend', handleEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', handleEnd, { passive: false });

    // Mouse events
    this.canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    // Buttons
    this.resetBtn.addEventListener('click', () => {
      this.sound.playClick();
      this.resetGame();
    });

    this.retryBtnModal.addEventListener('click', () => {
      this.sound.playClick();
      this.resetGame();
    });

    this.toggleOverlayBtn.addEventListener('click', () => {
      this.sound.playClick();
      this.showIdealCircle = !this.showIdealCircle;
      this.overlayStateDot.className = `w-2 h-2 rounded-full ${this.showIdealCircle ? 'bg-emerald-400' : 'bg-slate-600'}`;
      this.redrawAll();
    });

    this.soundBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      this.soundIconOn.classList.toggle('hidden', !this.sound.enabled);
      this.soundIconOff.classList.toggle('hidden', this.sound.enabled);
    });
  }

  getCanvasCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  startDrawing(x, y) {
    // If finished previously, reset immediately on new tap
    if (this.lastEvaluation) {
      this.resetGame(false);
    }

    this.isDrawing = true;
    this.points = [{ x, y, t: performance.now() }];
    this.particles = [];
    this.guideOverlay.style.opacity = '0';
    this.showStatus('Drawing...');

    this.sound.startDrawHum();
  }

  continueDrawing(x, y) {
    if (!this.isDrawing) return;

    const prev = this.points[this.points.length - 1];
    const dist = Math.hypot(x - prev.x, y - prev.y);

    // Minimum movement threshold for clean sampling
    if (dist >= 3) {
      this.points.push({ x, y, t: performance.now() });

      // Add spark particle at tip
      this.addParticle(x, y);

      // Estimate angular sweep so far for sound pitch
      const startAngle = Math.atan2(this.points[0].y - this.centerY, this.points[0].x - this.centerX);
      const currAngle = Math.atan2(y - this.centerY, x - this.centerX);
      let diff = Math.abs(currAngle - startAngle);
      this.sound.updateDrawPitch(diff / (Math.PI * 2));
    }
  }

  finishDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    this.sound.stopDrawHum();

    // Check if drawing has sufficient data
    if (this.points.length < 20) {
      this.showStatus('Too short! Draw a full circle');
      setTimeout(() => {
        this.resetGame(true);
      }, 1200);
      return;
    }

    this.attempts++;
    this.attemptCountEl.textContent = this.attempts;

    // Evaluate circle
    this.evaluateCircle();
  }

  addParticle(x, y) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        alpha: 1,
        life: 0.8 + Math.random() * 0.4
      });
    }
    if (this.particles.length > 50) {
      this.particles.splice(0, 10);
    }
  }

  // Pure Deterministic Offline Calculation for Circle Accuracy
  evaluateCircle() {
    const pts = this.points;
    const n = pts.length;

    // 1. Calculate centroid of user's points
    let sumX = 0, sumY = 0;
    pts.forEach(p => { sumX += p.x; sumY += p.y; });
    const userCenterX = sumX / n;
    const userCenterY = sumY / n;

    // 2. Calculate average radius from centroid
    let sumRadius = 0;
    const radii = [];
    pts.forEach(p => {
      const r = Math.hypot(p.x - userCenterX, p.y - userCenterY);
      radii.push(r);
      sumRadius += r;
    });
    const avgRadius = sumRadius / n;

    // Reject extremely tiny drawings
    if (avgRadius < 25) {
      this.showStatus('Too small! Try a bigger circle');
      setTimeout(() => this.resetGame(true), 1200);
      return;
    }

    // 3. Compute Radius Variance (Standard Deviation / Mean Ratio)
    let varianceSum = 0;
    radii.forEach(r => {
      varianceSum += Math.pow(r - avgRadius, 2);
    });
    const stdDev = Math.sqrt(varianceSum / n);
    const radiusVarianceRatio = stdDev / avgRadius; // 0 is ideal

    // 4. Compute Closure Quality (Distance between start and end point relative to avgRadius)
    const startPt = pts[0];
    const endPt = pts[n - 1];
    const closureDistance = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
    const closureRatio = closureDistance / avgRadius; // 0 is perfect closure

    // 5. Angular Sweep Analysis (Ensure user made roughly one 360 degree loop)
    let totalAngleSweep = 0;
    for (let i = 1; i < n; i++) {
      const a1 = Math.atan2(pts[i - 1].y - userCenterY, pts[i - 1].x - userCenterX);
      const a2 = Math.atan2(pts[i].y - userCenterY, pts[i].x - userCenterX);
      let diff = a2 - a1;
      // Normalize angle difference between -PI and +PI
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      totalAngleSweep += diff;
    }
    const fullTurns = Math.abs(totalAngleSweep) / (Math.PI * 2);
    const turnError = Math.abs(fullTurns - 1.0); // 0 is ideal 1-loop

    // 6. Centroid offset penalty (reward keeping circle around target center dot)
    const centerOffset = Math.hypot(userCenterX - this.centerX, userCenterY - this.centerY);
    const centerOffsetRatio = centerOffset / this.referenceRadius;

    // Accuracy Score Formula (0 to 100)
    // - Radius variance accounts for 60%
    // - Closure accounts for 25%
    // - Angular sweep/completeness accounts for 15%
    let varianceScore = Math.max(0, 100 - (radiusVarianceRatio * 280));
    let closureScore = Math.max(0, 100 - (closureRatio * 150));
    let sweepScore = Math.max(0, 100 - (turnError * 200));

    // Centering bonus/penalty: subtle 5% weight
    let centerFactor = Math.max(0, 100 - (centerOffsetRatio * 50));

    let finalAccuracy = (varianceScore * 0.55) + (closureScore * 0.25) + (sweepScore * 0.15) + (centerFactor * 0.05);
    finalAccuracy = Math.min(99.8, Math.max(3.0, finalAccuracy));

    // Package metrics for display
    this.lastEvaluation = {
      score: finalAccuracy,
      userCenterX,
      userCenterY,
      avgRadius,
      closurePercent: Math.max(0, Math.min(100, 100 - closureRatio * 100)).toFixed(0),
      roundnessPercent: Math.max(0, Math.min(100, 100 - radiusVarianceRatio * 150)).toFixed(0),
      consistencyPercent: Math.max(0, Math.min(100, 100 - (stdDev / avgRadius) * 120)).toFixed(0)
    };

    // Update Best Score
    if (finalAccuracy > this.bestScore) {
      this.bestScore = finalAccuracy;
      localStorage.setItem('pcc_best_score', this.bestScore.toString());
      this.updateBestScoreDisplay();
    }

    this.sound.playScore(finalAccuracy);
    this.displayResults(this.lastEvaluation);
    this.redrawAll();
  }

  displayResults(result) {
    this.statusPill.style.opacity = '0';
    this.resultDrawer.classList.remove('hidden');

    // Metrics
    this.metricRoundness.textContent = `${result.roundnessPercent}%`;
    this.metricClosure.textContent = `${result.closurePercent}%`;
    this.metricVariance.textContent = `${result.consistencyPercent}%`;

    // Dynamic Comments & Badges
    let badgeText = "Precision";
    let comment = "Masterpiece!";
    let badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";

    if (result.score >= 94) {
      badgeText = "Godlike 🌟";
      comment = "Flawless Geometry!";
      badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/30";
    } else if (result.score >= 88) {
      badgeText = "Precision ✨";
      comment = "Masterpiece!";
      badgeColor = "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
    } else if (result.score >= 78) {
      badgeText = "Great 🎯";
      comment = "Sharp & Smooth!";
      badgeColor = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
    } else if (result.score >= 65) {
      badgeText = "Good 👍";
      comment = "Decent Arc!";
      badgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";
    } else {
      badgeText = "Wobbly 🥔";
      comment = "Try Again!";
      badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/30";
    }

    this.feedbackBadgeEl.textContent = badgeText;
    this.feedbackBadgeEl.className = `px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border ${badgeColor}`;
    this.scoreCommentEl.textContent = comment;

    // Animated Score Count-up
    this.animateScore(result.score);
  }

  animateScore(targetScore) {
    let start = 0;
    const duration = 800; // ms
    const startTime = performance.now();

    const step = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = start + (targetScore - start) * easeProgress;
      this.scoreValEl.textContent = current.toFixed(1);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        this.scoreValEl.textContent = targetScore.toFixed(1);
      }
    };

    requestAnimationFrame(step);
  }

  showStatus(msg) {
    this.statusPill.textContent = msg;
    this.statusPill.style.opacity = '1';
  }

  resetGame(showGuide = true) {
    this.isDrawing = false;
    this.points = [];
    this.particles = [];
    this.lastEvaluation = null;
    this.resultDrawer.classList.add('hidden');
    this.statusPill.style.opacity = '0';
    if (showGuide) {
      this.guideOverlay.style.opacity = '1';
    }
    this.redrawAll();
  }

  redrawAll() {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 1. Draw subtle grid and background circle reference
    this.drawBackgroundGuides();

    // 2. Draw user's line
    if (this.points.length > 0) {
      this.drawUserStroke();
    }

    // 3. Draw comparison ideal overlay if evaluated
    if (this.lastEvaluation && this.showIdealCircle) {
      this.drawIdealOverlay();
    }
  }

  drawBackgroundGuides() {
    const ctx = this.ctx;

    // Faint concentric target rings
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.referenceRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();

    // Glowing center dot
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.fill();

    ctx.restore();
  }

  drawUserStroke() {
    const ctx = this.ctx;
    const pts = this.points;
    if (pts.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Neon Glow Stroke underlayer
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4.5;

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // Sharp core bright line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#f0fdf4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();

    // Draw active drawing tip with pulse
    if (this.isDrawing) {
      const tip = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 10;
      ctx.fill();
    }

    ctx.restore();
  }

  drawIdealOverlay() {
    const ctx = this.ctx;
    const evalData = this.lastEvaluation;

    ctx.save();
    // Draw perfect circle comparison in glowing emerald
    ctx.beginPath();
    ctx.arc(evalData.userCenterX, evalData.userCenterY, evalData.avgRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.shadowColor = 'rgba(52, 211, 153, 0.8)';
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Fitted center indicator
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(evalData.userCenterX, evalData.userCenterY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.fill();

    ctx.restore();
  }

  render() {
    // Continuous loop for spark particles and smooth stroke updates
    if (this.particles.length > 0) {
      this.redrawAll();

      // Update particles
      this.ctx.save();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.035;

        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        this.ctx.shadowColor = '#38bdf8';
        this.ctx.shadowBlur = 4;
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    this.animId = requestAnimationFrame(() => this.render());
  }
}

// Instantiate game on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.game = new PerfectCircleGame();
});