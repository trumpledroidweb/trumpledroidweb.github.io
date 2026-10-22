/**
 * GraphStudio Engine
 * Advanced Standalone HTML5 Canvas Graphing Engine & Math Plotter
 */

(function () {
  "use strict";

  // State Management
  const state = {
    mode: "functions", // "functions" | "points"
    viewport: {
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    },
    drag: {
      isDragging: false,
      startX: 0,
      startY: 0,
      initialXMin: 0,
      initialXMax: 0,
      initialYMin: 0,
      initialYMax: 0,
    },
    mouse: {
      inCanvas: false,
      screenX: 0,
      screenY: 0,
      mathX: 0,
      mathY: 0,
    },
    settings: {
      showGrid: true,
      showAxis: true,
      showTrace: true,
      dataPlotStyle: "scatter", // line, scatter, bar, both
    },
    functions: [
      {
        id: "f1",
        label: "f₁(x)",
        expr: "sin(x) * 3",
        color: "#6366f1", // Indigo
        visible: true,
        compiled: null,
      },
      {
        id: "f2",
        label: "f₂(x)",
        expr: "0.2 * x^2 - 4",
        color: "#10b981", // Emerald
        visible: true,
        compiled: null,
      },
    ],
    dataPoints: [
      { x: -5, y: 2.5 },
      { x: -4, y: 1.2 },
      { x: -3, y: -1.8 },
      { x: -2, y: -0.5 },
      { x: -1, y: 3.2 },
      { x: 0, y: 5.0 },
      { x: 1, y: 4.1 },
      { x: 2, y: 2.0 },
      { x: 3, y: -0.8 },
      { x: 4, y: 1.5 },
      { x: 5, y: 3.8 },
    ],
  };

  // DOM Elements
  const canvas = document.getElementById("graph-canvas");
  const ctx = canvas.getContext("2d");

  const modeFunctionsBtn = document.getElementById("mode-functions-btn");
  const modePointsBtn = document.getElementById("mode-points-btn");
  const functionControls = document.getElementById("function-controls");
  const dataControls = document.getElementById("data-controls");
  const functionsList = document.getElementById("functions-list");
  const btnAddFunction = document.getElementById("btn-add-function");

  const boundXMin = document.getElementById("bound-xmin");
  const boundXMax = document.getElementById("bound-xmax");
  const boundYMin = document.getElementById("bound-ymin");
  const boundYMax = document.getElementById("bound-ymax");

  const toggleGrid = document.getElementById("toggle-grid");
  const toggleAxis = document.getElementById("toggle-axis");
  const toggleTrace = document.getElementById("toggle-trace");

  const statX = document.getElementById("stat-x");
  const statY = document.getElementById("stat-y");
  const statSlope = document.getElementById("stat-slope");
  const statArea = document.getElementById("stat-area");

  const cursorPill = document.getElementById("cursor-pill");
  const pillX = document.getElementById("pill-x");
  const pillY = document.getElementById("pill-y");

  const btnZoomIn = document.getElementById("btn-zoom-in");
  const btnZoomOut = document.getElementById("btn-zoom-out");
  const btnResetView = document.getElementById("btn-reset-view");
  const btnFitView = document.getElementById("btn-fit-view");
  const btnSquareAspect = document.getElementById("btn-square-aspect");
  const btnExportPng = document.getElementById("btn-export-png");

  const dataPointsInput = document.getElementById("data-points-input");
  const btnApplyPoints = document.getElementById("btn-apply-points");
  const btnSamplePoints = document.getElementById("btn-sample-points");
  const dataPlotStyle = document.getElementById("data-plot-style");

  // Palette generator for additional dynamic functions
  const PALETTE = [
    "#6366f1",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#38bdf8",
    "#a855f7",
    "#f97316",
  ];

  // -------------------------------------------------------------
  // Math Parser & Evaluator (Safe, offline deterministic evaluator)
  // -------------------------------------------------------------
  function sanitizeAndCompile(expressionStr) {
    if (!expressionStr || !expressionStr.trim()) return null;

    let clean = expressionStr.trim().toLowerCase();

    // Replace mathematical constants
    clean = clean.replace(/\bpi\b/g, "Math.PI");
    clean = clean.replace(/\be\b/g, "Math.E");

    // Replace power operator x^y => Math.pow(x, y)
    // Handle simple exponent: a^b
    clean = clean.replace(
      /([a-zA-Z0-9_.\(\)]+)\s*\^\s*([a-zA-Z0-9_.\(\)]+)/g,
      "Math.pow($1, $2)"
    );

    // Replace mathematical functions
    const funcs = ["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "abs", "sqrt", "cbrt", "exp", "floor", "ceil", "round"];
    funcs.forEach((fn) => {
      const reg = new RegExp(`\\b${fn}\\(`, "g");
      clean = clean.replace(reg, `Math.${fn}(`);
    });

    // Replace ln with Math.log, log with Math.log10
    clean = clean.replace(/\bln\(/g, "Math.log(");
    clean = clean.replace(/\blog\(/g, "Math.log10(");

    // Implicit multiplication e.g. 2x -> 2*x, 3sin(x) -> 3*Math.sin(x), (x+1)(x-1) -> (x+1)*(x-1)
    clean = clean.replace(/(\d)([a-zA-Z\(])/g, "$1*$2");
    clean = clean.replace(/(\))(\()/g, "$1*$2");
    clean = clean.replace(/(\))([a-zA-Z0-9])/g, "$1*$2");

    // Security check: strictly allow only whitelisted tokens
    const allowedRegex = /^[\d\s+\-*/%.(),a-zA-Z_]+$/;
    if (!allowedRegex.test(clean)) {
      return null;
    }

    try {
      // Create isolated evaluator function with 'x' argument
      const fn = new Function("x", `"use strict"; return (${clean});`);
      // Test run once
      const testVal = fn(1);
      if (typeof testVal !== "number") return null;
      return fn;
    } catch (e) {
      return null;
    }
  }

  // -------------------------------------------------------------
  // Canvas Coordinate Projections
  // -------------------------------------------------------------
  function mathToScreenX(x) {
    const { xMin, xMax } = state.viewport;
    return ((x - xMin) / (xMax - xMin)) * canvas.width;
  }

  function mathToScreenY(y) {
    const { yMin, yMax } = state.viewport;
    return canvas.height - ((y - yMin) / (yMax - yMin)) * canvas.height;
  }

  function screenToMathX(px) {
    const { xMin, xMax } = state.viewport;
    return xMin + (px / canvas.width) * (xMax - xMin);
  }

  function screenToMathY(py) {
    const { yMin, yMax } = state.viewport;
    return yMin + ((canvas.height - py) / canvas.height) * (yMax - yMin);
  }

  // -------------------------------------------------------------
  // Step calculation for responsive nice grid numbers (1, 2, 5, 10...)
  // -------------------------------------------------------------
  function calculateNiceStep(range, targetTicks = 10) {
    const roughStep = range / targetTicks;
    const exponent = Math.floor(Math.log10(roughStep));
    const fraction = roughStep / Math.pow(10, exponent);
    let niceFraction = 1;
    if (fraction >= 1.5 && fraction < 3.5) niceFraction = 2;
    else if (fraction >= 3.5 && fraction < 7.5) niceFraction = 5;
    else if (fraction >= 7.5) niceFraction = 10;
    return niceFraction * Math.pow(10, exponent);
  }

  // -------------------------------------------------------------
  // Render Routine
  // -------------------------------------------------------------
  function render() {
    // Clear Canvas
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { xMin, xMax, yMin, yMax } = state.viewport;

    // 1. Draw Grid
    if (state.settings.showGrid) {
      drawGrid();
    }

    // 2. Draw Major Cartesian Axes (X=0, Y=0)
    if (state.settings.showAxis) {
      drawAxes();
    }

    // 3. Draw Plot Data
    if (state.mode === "functions") {
      drawFunctionPlots();
    } else {
      drawDataPointsPlot();
    }

    // 4. Trace & Crosshair
    if (state.settings.showTrace && state.mouse.inCanvas) {
      drawTraceCursor();
    }

    // 5. Update Metrics & Input boxes
    updateBoundsInputs();
    updateLiveMetrics();
  }

  function drawGrid() {
    const { xMin, xMax, yMin, yMax } = state.viewport;
    const xStep = calculateNiceStep(xMax - xMin, Math.max(6, Math.floor(canvas.width / 90)));
    const yStep = calculateNiceStep(yMax - yMin, Math.max(6, Math.floor(canvas.height / 90)));

    ctx.save();
    ctx.lineWidth = 1;

    // Vertical grid lines
    const startX = Math.floor(xMin / xStep) * xStep;
    for (let x = startX; x <= xMax; x += xStep) {
      const px = Math.round(mathToScreenX(x)) + 0.5;
      const isZero = Math.abs(x) < 1e-9;

      ctx.strokeStyle = isZero ? "rgba(148, 163, 184, 0.45)" : "rgba(51, 65, 85, 0.28)";
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, canvas.height);
      ctx.stroke();

      // Number Label on X axis
      if (!isZero) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px monospace";
        const labelY = Math.min(Math.max(mathToScreenY(0) + 14, 15), canvas.height - 5);
        ctx.fillText(formatNumber(x), px + 4, labelY);
      }
    }

    // Horizontal grid lines
    const startY = Math.floor(yMin / yStep) * yStep;
    for (let y = startY; y <= yMax; y += yStep) {
      const py = Math.round(mathToScreenY(y)) + 0.5;
      const isZero = Math.abs(y) < 1e-9;

      ctx.strokeStyle = isZero ? "rgba(148, 163, 184, 0.45)" : "rgba(51, 65, 85, 0.28)";
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(canvas.width, py);
      ctx.stroke();

      // Number Label on Y axis
      if (!isZero) {
        ctx.fillStyle = "#64748b";
        ctx.font = "10px monospace";
        const labelX = Math.min(Math.max(mathToScreenX(0) + 6, 5), canvas.width - 45);
        ctx.fillText(formatNumber(y), labelX, py - 4);
      }
    }

    ctx.restore();
  }

  function drawAxes() {
    const originPx = mathToScreenX(0);
    const originPy = mathToScreenY(0);

    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(148, 163, 184, 0.75)";

    // X Axis
    if (originPy >= 0 && originPy <= canvas.height) {
      ctx.beginPath();
      ctx.moveTo(0, originPy);
      ctx.lineTo(canvas.width, originPy);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(canvas.width - 8, originPy - 4);
      ctx.lineTo(canvas.width, originPy);
      ctx.lineTo(canvas.width - 8, originPy + 4);
      ctx.stroke();
    }

    // Y Axis
    if (originPx >= 0 && originPx <= canvas.width) {
      ctx.beginPath();
      ctx.moveTo(originPx, 0);
      ctx.lineTo(originPx, canvas.height);
      ctx.stroke();

      // Arrow head
      ctx.beginPath();
      ctx.moveTo(originPx - 4, 8);
      ctx.lineTo(originPx, 0);
      ctx.lineTo(originPx + 4, 8);
      ctx.stroke();
    }

    // Origin (0,0) label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px monospace";
    ctx.fillText("0", originPx - 12, originPy + 14);

    ctx.restore();
  }

  function drawFunctionPlots() {
    const width = canvas.width;
    const { xMin, xMax, yMin, yMax } = state.viewport;
    const yRange = yMax - yMin;

    state.functions.forEach((fnObj) => {
      if (!fnObj.visible || !fnObj.compiled) return;

      ctx.save();
      ctx.strokeStyle = fnObj.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();

      let isDrawing = false;
      let prevY = null;

      // Sample every 1px on screen for pixel-perfect curves
      for (let px = 0; px <= width; px += 1) {
        const x = screenToMathX(px);
        let y;
        try {
          y = fnObj.compiled(x);
        } catch (e) {
          y = NaN;
        }

        // Check for NaN, Infinity, or steep asymptotes (e.g. tan(x), 1/x)
        if (typeof y !== "number" || isNaN(y) || !isFinite(y)) {
          isDrawing = false;
          prevY = null;
          continue;
        }

        // Discontinuity detection
        if (prevY !== null && Math.abs(y - prevY) > yRange * 0.95) {
          isDrawing = false;
        }

        const py = mathToScreenY(y);

        if (!isDrawing) {
          ctx.moveTo(px, py);
          isDrawing = true;
        } else {
          ctx.lineTo(px, py);
        }

        prevY = y;
      }

      ctx.stroke();
      ctx.restore();
    });
  }

  function drawDataPointsPlot() {
    const pts = state.dataPoints;
    if (!pts || pts.length === 0) return;

    const style = state.settings.dataPlotStyle;

    ctx.save();

    // 1. Draw Bars if style requires
    if (style === "bar") {
      ctx.fillStyle = "rgba(99, 102, 241, 0.45)";
      ctx.strokeStyle = "#818cf8";
      ctx.lineWidth = 1;
      const originY = mathToScreenY(0);

      pts.forEach((pt) => {
        const px = mathToScreenX(pt.x);
        const py = mathToScreenY(pt.y);
        const barW = Math.max(6, Math.min(24, canvas.width / (pts.length * 2)));
        const height = originY - py;
        ctx.fillRect(px - barW / 2, py, barW, height);
        ctx.strokeRect(px - barW / 2, py, barW, height);
      });
    }

    // 2. Draw Connected Line
    if (style === "line" || style === "both") {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      pts.forEach((pt, idx) => {
        const px = mathToScreenX(pt.x);
        const py = mathToScreenY(pt.y);
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // 3. Draw Points / Scatter Dots
    if (style === "scatter" || style === "both") {
      pts.forEach((pt) => {
        const px = mathToScreenX(pt.x);
        const py = mathToScreenY(pt.y);

        ctx.fillStyle = "#ec4899";
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Point value hover/label
        ctx.fillStyle = "#cbd5e1";
        ctx.font = "10px monospace";
        ctx.fillText(`(${formatNumber(pt.x)}, ${formatNumber(pt.y)})`, px + 7, py - 6);
      });
    }

    ctx.restore();
  }

  function drawTraceCursor() {
    const { screenX, screenY, mathX } = state.mouse;

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
    ctx.lineWidth = 1;

    // Vertical line through cursor
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, canvas.height);
    ctx.stroke();

    // Horizontal line through cursor
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(canvas.width, screenY);
    ctx.stroke();

    ctx.setLineDash([]);

    // Highlight evaluation point on active functions
    if (state.mode === "functions") {
      state.functions.forEach((fnObj) => {
        if (!fnObj.visible || !fnObj.compiled) return;
        try {
          const y = fnObj.compiled(mathX);
          if (typeof y === "number" && !isNaN(y) && isFinite(y)) {
            const py = mathToScreenY(y);
            ctx.fillStyle = fnObj.color;
            ctx.beginPath();
            ctx.arc(screenX, py, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        } catch (e) {}
      });
    }

    ctx.restore();
  }

  // -------------------------------------------------------------
  // Live Offline Mathematical Statistics & Metrics
  // -------------------------------------------------------------
  function updateLiveMetrics() {
    const mathX = state.mouse.mathX;
    statX.textContent = formatNumber(mathX, 3);

    // Compute active function metrics at mouse cursor
    const activeFn = state.functions.find((f) => f.visible && f.compiled);
    if (activeFn && activeFn.compiled) {
      try {
        const y = activeFn.compiled(mathX);
        statY.textContent = isFinite(y) && !isNaN(y) ? formatNumber(y, 3) : "Undefined";

        // Numerical derivative approximation: f'(x) ≈ (f(x+h) - f(x-h)) / (2h)
        const h = 1e-4;
        const yPlus = activeFn.compiled(mathX + h);
        const yMinus = activeFn.compiled(mathX - h);
        const slope = (yPlus - yMinus) / (2 * h);
        statSlope.textContent = isFinite(slope) && !isNaN(slope) ? formatNumber(slope, 3) : "Undefined";
      } catch (e) {
        statY.textContent = "--";
        statSlope.textContent = "--";
      }
    } else {
      statY.textContent = "--";
      statSlope.textContent = "--";
    }

    // Viewport area calculation
    const area = (state.viewport.xMax - state.viewport.xMin) * (state.viewport.yMax - state.viewport.yMin);
    statArea.textContent = formatNumber(area, 2);
  }

  function formatNumber(num, decimals = 2) {
    if (Math.abs(num) < 1e-9) return "0";
    if (Math.abs(num) >= 1e5 || (Math.abs(num) < 0.001 && Math.abs(num) > 0)) {
      return num.toExponential(2);
    }
    return Number(num.toFixed(decimals)).toString();
  }

  // -------------------------------------------------------------
  // Sidebar UI Building & Synchronization
  // -------------------------------------------------------------
  function renderFunctionsUI() {
    functionsList.innerHTML = "";

    state.functions.forEach((fnObj, index) => {
      const row = document.createElement("div");
      row.className = "p-3 bg-slate-800/50 rounded-lg border border-slate-700/70 space-y-2";
      row.dataset.id = fnObj.id;

      row.innerHTML = `
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <input type="color" class="color-picker bg-transparent" value="${fnObj.color}" title="Curve Color">
            <span class="font-mono text-xs font-semibold" style="color: ${fnObj.color}">${fnObj.label} =</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button class="toggle-vis-btn text-xs px-2 py-0.5 rounded ${fnObj.visible ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40" : "bg-slate-700 text-slate-400"}">
              ${fnObj.visible ? "Visible" : "Hidden"}
            </button>
            ${state.functions.length > 1 ? `
              <button class="delete-btn text-xs text-rose-400 hover:text-rose-300 p-1" title="Delete Curve">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            ` : ""}
          </div>
        </div>
        <div class="relative">
          <input type="text" class="expr-input w-full bg-slate-900 border ${fnObj.compiled ? "border-slate-700" : "border-rose-500"} rounded px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500" value="${escapeHTML(fnObj.expr)}" placeholder="e.g. sin(x) or x^2 - 4">
        </div>
      `;

      // Event Listeners for Row
      const exprInput = row.querySelector(".expr-input");
      exprInput.addEventListener("input", (e) => {
        fnObj.expr = e.target.value;
        fnObj.compiled = sanitizeAndCompile(fnObj.expr);
        if (fnObj.compiled) {
          exprInput.classList.remove("border-rose-500");
          exprInput.classList.add("border-slate-700");
        } else {
          exprInput.classList.add("border-rose-500");
          exprInput.classList.remove("border-slate-700");
        }
        render();
      });

      const colorPicker = row.querySelector(".color-picker");
      colorPicker.addEventListener("input", (e) => {
        fnObj.color = e.target.value;
        row.querySelector("span.font-mono").style.color = fnObj.color;
        render();
      });

      const toggleVisBtn = row.querySelector(".toggle-vis-btn");
      toggleVisBtn.addEventListener("click", () => {
        fnObj.visible = !fnObj.visible;
        renderFunctionsUI();
        render();
      });

      const deleteBtn = row.querySelector(".delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          state.functions = state.functions.filter((f) => f.id !== fnObj.id);
          renderFunctionsUI();
          render();
        });
      }

      functionsList.appendChild(row);
    });
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function (m) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m];
    });
  }

  function updateBoundsInputs() {
    boundXMin.value = formatNumber(state.viewport.xMin, 2);
    boundXMax.value = formatNumber(state.viewport.xMax, 2);
    boundYMin.value = formatNumber(state.viewport.yMin, 2);
    boundYMax.value = formatNumber(state.viewport.yMax, 2);
  }

  // -------------------------------------------------------------
  // Pan and Zoom Interaction Engine
  // -------------------------------------------------------------
  function zoomAtPoint(screenX, screenY, factor) {
    const mathX = screenToMathX(screenX);
    const mathY = screenToMathY(screenY);

    const { xMin, xMax, yMin, yMax } = state.viewport;

    const newXMin = mathX - (mathX - xMin) * factor;
    const newXMax = mathX + (xMax - mathX) * factor;
    const newYMin = mathY - (mathY - yMin) * factor;
    const newYMax = mathY + (yMax - mathY) * factor;

    // Safety checks against extreme singularities
    if (newXMax - newXMin > 1e-6 && newXMax - newXMin < 1e8) {
      state.viewport.xMin = newXMin;
      state.viewport.xMax = newXMax;
      state.viewport.yMin = newYMin;
      state.viewport.yMax = newYMax;
      render();
    }
  }

  function pan(dxPixels, dyPixels) {
    const { xMin, xMax, yMin, yMax } = state.viewport;
    const deltaX = (dxPixels / canvas.width) * (xMax - xMin);
    const deltaY = (dyPixels / canvas.height) * (yMax - yMin);

    state.viewport.xMin -= deltaX;
    state.viewport.xMax -= deltaX;
    state.viewport.yMin += deltaY;
    state.viewport.yMax += deltaY;

    render();
  }

  // -------------------------------------------------------------
  // Event Bindings
  // -------------------------------------------------------------
  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Readjust canvas internal resolution coordinate scaling
    canvas.width = rect.width;
    canvas.height = rect.height;

    render();
  }

  function setupEventListeners() {
    window.addEventListener("resize", resizeCanvas);

    // Canvas Mouse Interaction
    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return; // Only primary button
      state.drag.isDragging = true;
      state.drag.startX = e.clientX;
      state.drag.startY = e.clientY;
      canvas.classList.add("grabbing");
    });

    window.addEventListener("mousemove", (e) => {
      const rect = canvas.getBoundingClientRect();
      const inBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      state.mouse.inCanvas = inBounds;

      if (inBounds) {
        state.mouse.screenX = e.clientX - rect.left;
        state.mouse.screenY = e.clientY - rect.top;
        state.mouse.mathX = screenToMathX(state.mouse.screenX);
        state.mouse.mathY = screenToMathY(state.mouse.screenY);

        // Update floating pill
        cursorPill.classList.remove("hidden");
        pillX.textContent = formatNumber(state.mouse.mathX, 2);
        pillY.textContent = formatNumber(state.mouse.mathY, 2);
      } else {
        cursorPill.classList.add("hidden");
      }

      if (state.drag.isDragging) {
        const dx = e.clientX - state.drag.startX;
        const dy = e.clientY - state.drag.startY;
        state.drag.startX = e.clientX;
        state.drag.startY = e.clientY;
        pan(dx, dy);
      } else {
        render();
      }
    });

    window.addEventListener("mouseup", () => {
      if (state.drag.isDragging) {
        state.drag.isDragging = false;
        canvas.classList.remove("grabbing");
      }
    });

    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
      zoomAtPoint(mouseX, mouseY, zoomFactor);
    }, { passive: false });

    // Touch Support for Mobile
    let lastTouchDistance = null;
    let lastTouchX = 0;
    let lastTouchY = 0;

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.hypot(dx, dy);
      }
    });

    canvas.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        pan(dx, dy);
      } else if (e.touches.length === 2 && lastTouchDistance !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const rect = canvas.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

        const factor = lastTouchDistance / dist;
        zoomAtPoint(midX, midY, factor);
        lastTouchDistance = dist;
      }
    }, { passive: false });

    canvas.addEventListener("touchend", () => {
      lastTouchDistance = null;
    });

    // Sidebar Viewport Input changes
    function onBoundChange() {
      const x1 = parseFloat(boundXMin.value);
      const x2 = parseFloat(boundXMax.value);
      const y1 = parseFloat(boundYMin.value);
      const y2 = parseFloat(boundYMax.value);

      if (!isNaN(x1) && !isNaN(x2) && x2 > x1) {
        state.viewport.xMin = x1;
        state.viewport.xMax = x2;
      }
      if (!isNaN(y1) && !isNaN(y2) && y2 > y1) {
        state.viewport.yMin = y1;
        state.viewport.yMax = y2;
      }
      render();
    }

    [boundXMin, boundXMax, boundYMin, boundYMax].forEach((input) => {
      input.addEventListener("change", onBoundChange);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onBoundChange();
      });
    });

    // Visual switches
    toggleGrid.addEventListener("change", (e) => {
      state.settings.showGrid = e.target.checked;
      render();
    });

    toggleAxis.addEventListener("change", (e) => {
      state.settings.showAxis = e.target.checked;
      render();
    });

    toggleTrace.addEventListener("change", (e) => {
      state.settings.showTrace = e.target.checked;
      render();
    });

    // Mode Toggle
    modeFunctionsBtn.addEventListener("click", () => {
      state.mode = "functions";
      modeFunctionsBtn.className = "px-3 py-1 rounded bg-indigo-600 text-white shadow transition-all";
      modePointsBtn.className = "px-3 py-1 rounded text-slate-400 hover:text-white transition-all";
      functionControls.classList.remove("hidden");
      dataControls.classList.add("hidden");
      btnAddFunction.classList.remove("hidden");
      render();
    });

    modePointsBtn.addEventListener("click", () => {
      state.mode = "points";
      modePointsBtn.className = "px-3 py-1 rounded bg-indigo-600 text-white shadow transition-all";
      modeFunctionsBtn.className = "px-3 py-1 rounded text-slate-400 hover:text-white transition-all";
      functionControls.classList.add("hidden");
      dataControls.classList.remove("hidden");
      btnAddFunction.classList.add("hidden");
      render();
    });

    // Add Function Curve
    btnAddFunction.addEventListener("click", () => {
      const nextIdx = state.functions.length + 1;
      const nextColor = PALETTE[(nextIdx - 1) % PALETTE.length];
      const newFn = {
        id: "f" + Date.now(),
        label: `f${nextIdx}(x)`,
        expr: `${nextIdx} * cos(x)`,
        color: nextColor,
        visible: true,
        compiled: sanitizeAndCompile(`${nextIdx} * cos(x)`),
      };
      state.functions.push(newFn);
      renderFunctionsUI();
      render();
    });

    // Preset Buttons
    document.querySelectorAll(".preset-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const f1 = btn.getAttribute("data-f1");
        const f2 = btn.getAttribute("data-f2");

        state.functions = [
          {
            id: "f1",
            label: "f₁(x)",
            expr: f1,
            color: PALETTE[0],
            visible: true,
            compiled: sanitizeAndCompile(f1),
          },
        ];

        if (f2 && f2.trim()) {
          state.functions.push({
            id: "f2",
            label: "f₂(x)",
            expr: f2,
            color: PALETTE[1],
            visible: true,
            compiled: sanitizeAndCompile(f2),
          });
        }

        renderFunctionsUI();
        render();
      });
    });

    // Data Points Handlers
    btnApplyPoints.addEventListener("click", parseDataPointsInput);
    dataPlotStyle.addEventListener("change", (e) => {
      state.settings.dataPlotStyle = e.target.value;
      render();
    });

    btnSamplePoints.addEventListener("click", () => {
      const samples = [];
      for (let x = -6; x <= 6; x += 1) {
        const y = Math.sin(x) * 3 + (Math.random() * 1.5 - 0.75);
        samples.push(`${x}, ${y.toFixed(2)}`);
      }
      dataPointsInput.value = samples.join("\n");
      parseDataPointsInput();
    });

    // Zoom Buttons
    btnZoomIn.addEventListener("click", () => {
      zoomAtPoint(canvas.width / 2, canvas.height / 2, 0.75);
    });

    btnZoomOut.addEventListener("click", () => {
      zoomAtPoint(canvas.width / 2, canvas.height / 2, 1.33);
    });

    btnResetView.addEventListener("click", () => {
      state.viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };
      render();
    });

    btnFitView.addEventListener("click", () => {
      if (state.mode === "points" && state.dataPoints.length > 0) {
        const xs = state.dataPoints.map((p) => p.x);
        const ys = state.dataPoints.map((p) => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const padX = (maxX - minX) * 0.15 || 2;
        const padY = (maxY - minY) * 0.15 || 2;
        state.viewport.xMin = minX - padX;
        state.viewport.xMax = maxX + padX;
        state.viewport.yMin = minY - padY;
        state.viewport.yMax = maxY + padY;
      } else {
        state.viewport = { xMin: -6.28, xMax: 6.28, yMin: -4, yMax: 4 };
      }
      render();
    });

    btnSquareAspect.addEventListener("click", () => {
      const rect = canvas.getBoundingClientRect();
      const currentXSpan = state.viewport.xMax - state.viewport.xMin;
      const targetYSpan = currentXSpan * (rect.height / rect.width);
      const midY = (state.viewport.yMin + state.viewport.yMax) / 2;

      state.viewport.yMin = midY - targetYSpan / 2;
      state.viewport.yMax = midY + targetYSpan / 2;
      render();
    });

    // Export PNG
    btnExportPng.addEventListener("click", () => {
      // Temporarily re-render cleanly without the cursor trace
      const prevTrace = state.settings.showTrace;
      state.settings.showTrace = false;
      render();

      const imageURI = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = "graphstudio-plot.png";
      downloadLink.href = imageURI;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      state.settings.showTrace = prevTrace;
      render();
    });
  }

  function parseDataPointsInput() {
    const rawText = dataPointsInput.value.trim();
    const lines = rawText.split("\n");
    const parsed = [];

    lines.forEach((line) => {
      const parts = line.split(/[,\t\s]+/).filter(Boolean);
      if (parts.length >= 2) {
        const x = parseFloat(parts[0]);
        const y = parseFloat(parts[1]);
        if (!isNaN(x) && !isNaN(y)) {
          parsed.push({ x, y });
        }
      }
    });

    if (parsed.length > 0) {
      // Sort ascending by x for line rendering
      parsed.sort((a, b) => a.x - b.x);
      state.dataPoints = parsed;
      render();
    }
  }

  // -------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------
  function init() {
    // Compile initial functions
    state.functions.forEach((fn) => {
      fn.compiled = sanitizeAndCompile(fn.expr);
    });

    renderFunctionsUI();
    setupEventListeners();
    resizeCanvas();
  }

  // Run on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();