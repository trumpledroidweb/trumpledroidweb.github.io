/* ==========================================================
   STREET NITRO 3D RACING - MAIN GAME LOGIC
   ========================================================== */

let appMeta = { app_id: "streetnitro3dracing" };
let authToken = localStorage.getItem("trumple_token") || null;
let apiBaseUrl = "https://trumpledroid-api.cloudbeta28624.workers.dev";

// Game State
let gameState = "MENU"; // MENU, GARAGE, LEADERBOARD, AUTH, PAUSE, PLAYING, GAMEOVER
let score = 0;
let cash = 1000;
let distance = 0;
let speed = 0;
let maxSpeed = 180;
let nitro = 100;
let isNitroActive = false;
let soundEnabled = true;

// Upgrades
let upgrades = {
    speed: 1,
    nitro: 1,
    handling: 1
};
let carColor = "#ef4444";

// Controls
let keys = { left: false, right: false, up: false, down: false, nitro: false };

// Three.js Scene Variables
let scene, camera, renderer;
let playerCar;
let obstacles = [];
let roadSegments = [];
let environmentObjects = [];
let roadWidth = 24;
let roadLength = 1200;
let segmentLength = 60;

// Audio Context (Synthesized Audio FX)
let audioCtx = null;
let engineOsc = null;
let engineGain = null;

window.addEventListener("DOMContentLoaded", async () => {
    try {
        const metaRes = await fetch("app-meta.json");
        const metaJson = await metaRes.json();
        appMeta.app_id = metaJson.app_name || "streetnitro3dracing";
    } catch(e) {
        console.warn("Using default app_id");
    }

    initThreeScene();
    initEventListeners();
    updateHUD();
    loadUserData();
});

/* ==========================================================
   THREE.JS 3D SCENE SETUP & PROCEDURAL HIGHWAY
   ========================================================== */

function initThreeScene() {
    const container = document.getElementById("game-canvas-container");
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814);
    scene.fog = new THREE.FogExp2(0x050814, 0.008);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 4.5, -8);
    camera.lookAt(0, 1.5, 10);

    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 40, -20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e1b4b, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    buildHighway();
    createPlayerCar();
    createCityBuildings();

    window.addEventListener("resize", onWindowResize);
    requestAnimationFrame(gameLoop);
}

function buildHighway() {
    // Road Base
    const roadGeo = new THREE.PlaneGeometry(roadWidth, roadLength);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, roadLength / 2 - 200);
    road.receiveShadow = true;
    scene.add(road);
    roadSegments.push(road);

    // Road Dashed Center Lines
    for (let i = -100; i < roadLength; i += 15) {
        const lineGeo = new THREE.BoxGeometry(0.4, 0.05, 6);
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.set(0, 0.02, i);
        scene.add(line);
        roadSegments.push(line);
    }

    // Glowing Neon Side Barriers
    const barrierGeo = new THREE.BoxGeometry(1, 1.2, roadLength);
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.6 });
    
    const leftBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    leftBarrier.position.set(-roadWidth / 2 - 0.5, 0.6, roadLength / 2 - 200);
    scene.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeo, barrierMat);
    rightBarrier.position.set(roadWidth / 2 + 0.5, 0.6, roadLength / 2 - 200);
    scene.add(rightBarrier);
}

function createCityBuildings() {
    // Neon Cyberpunk Buildings along the highway
    const buildingColors = [0x1e1b4b, 0x312e81, 0x0f172a, 0x172554];
    for (let i = -100; i < roadLength; i += 40) {
        for (let side of [-1, 1]) {
            const width = 12 + Math.random() * 15;
            const height = 40 + Math.random() * 80;
            const depth = 12 + Math.random() * 15;
            
            const bGeo = new THREE.BoxGeometry(width, height, depth);
            const bMat = new THREE.MeshStandardMaterial({ 
                color: buildingColors[Math.floor(Math.random() * buildingColors.length)],
                roughness: 0.5
            });
            const building = new THREE.Mesh(bGeo, bMat);
            building.position.set(side * (roadWidth / 2 + 18 + width / 2), height / 2, i);
            scene.add(building);
            environmentObjects.push(building);
        }
    }
}

function createPlayerCar() {
    playerCar = new THREE.Group();

    // Chassis
    const chassisGeo = new THREE.BoxGeometry(2.2, 0.8, 4.6);
    const chassisMat = new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.3, metalness: 0.8 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.6;
    chassis.castShadow = true;
    playerCar.add(chassis);

    // Cabin / Roof
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.6, 2.4);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.2, -0.2);
    cabin.castShadow = true;
    playerCar.add(cabin);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });

    const wheelPositions = [
        [-1.2, 0.4, 1.5], [1.2, 0.4, 1.5],
        [-1.2, 0.4, -1.5], [1.2, 0.4, -1.5]
    ];

    playerCar.wheels = [];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(...pos);
        wheel.castShadow = true;
        playerCar.add(wheel);
        playerCar.wheels.push(wheel);
    });

    playerCar.position.set(0, 0, 0);
    scene.add(playerCar);
}

function setCarColor(colorHex) {
    carColor = colorHex;
    if (playerCar) {
        playerCar.children[0].material.color.set(colorHex);
    }
}

function spawnTrafficCar(zPos) {
    const trafficGroup = new THREE.Group();
    const colors = [0x3b82f6, 0xeab308, 0x10b981, 0xa855f7, 0xf97316];
    const carColor = colors[Math.floor(Math.random() * colors.length)];

    const chassisGeo = new THREE.BoxGeometry(2.2, 0.8, 4.6);
    const chassisMat = new THREE.MeshStandardMaterial({ color: carColor, roughness: 0.4, metalness: 0.6 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.6;
    chassis.castShadow = true;
    trafficGroup.add(chassis);

    const laneX = [-7, -2.5, 2.5, 7][Math.floor(Math.random() * 4)];
    trafficGroup.position.set(laneX, 0, zPos);
    scene.add(trafficGroup);
    obstacles.push(trafficGroup);
}

/* ==========================================================
   GAME LOOP & PHYSICS ENGINE
   ========================================================== */

let lastTime = 0;
function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    const delta = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (gameState === "PLAYING") {
        updateGamePhysics(delta);
    }

    renderer.render(scene, camera);
}

function updateGamePhysics(delta) {
    // Acceleration & Speed
    let topSpd = maxSpeed + (upgrades.speed * 15);
    if (keys.up) {
        speed = Math.min(topSpd, speed + 80 * delta);
    } else if (keys.down) {
        speed = Math.max(0, speed - 120 * delta);
    } else {
        speed = Math.max(0, speed - 30 * delta);
    }

    // Nitro Boost
    if (keys.nitro && nitro > 0 && speed > 30) {
        isNitroActive = true;
        speed = Math.min(topSpd * 1.4, speed + 120 * delta);
        nitro = Math.max(0, nitro - 25 * delta);
    } else {
        isNitroActive = false;
        nitro = Math.min(100 + (upgrades.nitro * 20), nitro + 8 * delta);
    }

    // Steering
    let steerSpeed = 12 + (upgrades.handling * 2);
    if (keys.left) {
        playerCar.position.x -= steerSpeed * delta * (speed / 100);
        playerCar.rotation.z = THREE.MathUtils.lerp(playerCar.rotation.z, 0.2, 0.1);
        playerCar.rotation.y = THREE.MathUtils.lerp(playerCar.rotation.y, 0.15, 0.1);
    } else if (keys.right) {
        playerCar.position.x += steerSpeed * delta * (speed / 100);
        playerCar.rotation.z = THREE.MathUtils.lerp(playerCar.rotation.z, -0.2, 0.1);
        playerCar.rotation.y = THREE.MathUtils.lerp(playerCar.rotation.y, -0.15, 0.1);
    } else {
        playerCar.rotation.z = THREE.MathUtils.lerp(playerCar.rotation.z, 0, 0.15);
        playerCar.rotation.y = THREE.MathUtils.lerp(playerCar.rotation.y, 0, 0.15);
    }

    // Clamp player within road barriers
    const limit = roadWidth / 2 - 1.5;
    playerCar.position.x = Math.max(-limit, Math.min(limit, playerCar.position.x));

    // Move forward distance
    let distanceCovered = (speed / 3.6) * delta;
    distance += distanceCovered;
    score += Math.floor(distanceCovered * (isNitroActive ? 3 : 1));
    cash += Math.floor(distanceCovered * 0.1);

    // Infinite road looping & obstacle generation
    playerCar.position.z += (speed / 3.6) * delta;
    camera.position.z = playerCar.position.z - 8;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, playerCar.position.x * 0.5, 0.1);

    // Spawn traffic cars ahead
    if (Math.random() < 0.03 && obstacles.length < 12) {
        spawnTrafficCar(playerCar.position.z + 150 + Math.random() * 100);
    }

    // Clean up passed obstacles & check collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        if (obs.position.z < playerCar.position.z - 20) {
            scene.remove(obs);
            obstacles.splice(i, 1);
        } else {
            // Collision Detection (Bounding Box check)
            const dx = Math.abs(playerCar.position.x - obs.position.x);
            const dz = Math.abs(playerCar.position.z - obs.position.z);
            if (dx < 2.0 && dz < 4.0) {
                triggerCrash();
            }
        }
    }

    updateHUD();
}

function triggerCrash() {
    gameState = "GAMEOVER";
    playCrashSound();
    document.getElementById("final-distance.html")?.remove(); // safe
    document.getElementById("final-distance").innerText = Math.floor(distance) + " M";
    document.getElementById("final-cash").innerText = "+" + Math.floor(cash * 0.2);
    cash += Math.floor(cash * 0.2);

    document.getElementById("screen-gameover").classList.remove("hidden");
    saveUserData();
}

function updateHUD() {
    document.getElementById("hud-speed").innerText = Math.floor(speed);
    document.getElementById("hud-cash").innerText = cash;
    document.getElementById("hud-distance").innerText = Math.floor(distance) + " M";
    document.getElementById("nitro-bar").style.width = Math.min(100, (nitro / (100 + upgrades.nitro * 20)) * 100) + "%";
}

/* ==========================================================
   INPUT EVENT LISTENERS
   ========================================================== */

function initEventListeners() {
    window.addEventListener("keydown", (e) => {
        if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
        if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
        if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = true;
        if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = true;
        if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") {
            keys.nitro = true;
            e.preventDefault();
        }
        if (e.code === "Escape") {
            if (gameState === "PLAYING") pauseGame();
            else if (gameState === "PAUSE") resumeGame();
        }
    });

    window.addEventListener("keyup", (e) => {
        if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
        if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
        if (e.code === "ArrowUp" || e.code === "KeyW") keys.up = false;
        if (e.code === "ArrowDown" || e.code === "KeyS") keys.down = false;
        if (e.code === "Space" || e.code === "ShiftLeft" || e.code === "ShiftRight") keys.nitro = false;
    });

    // UI Buttons
    document.getElementById("btn-start-game").addEventListener("click", startGame);
    document.getElementById("btn-open-garage").addEventListener("click", openGarage);
    document.getElementById("btn-close-garage").addEventListener("click", closeGarage);
    document.getElementById("btn-open-leaderboard").addEventListener("click", openLeaderboard);
    document.getElementById("btn-close-leaderboard").addEventListener("click", closeLeaderboard);
    document.getElementById("btn-auth-modal").addEventListener("click", openAuthModal);
    document.getElementById("btn-close-auth").addEventListener("click", closeAuthModal);
    document.getElementById("btn-pause").addEventListener("click", pauseGame);
    document.getElementById("btn-sound").addEventListener("click", toggleSound);
    document.getElementById("btn-profile").addEventListener("click", openAuthModal);
}

function startGame() {
    hideAllScreens();
    gameState = "PLAYING";
    distance = 0;
    score = 0;
    speed = 0;
    nitro = 100;
    playerCar.position.set(0, 0, 0);

    // Clear old obstacles
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];

    initAudio();
}

function pauseGame() {
    if (gameState === "PLAYING") {
        gameState = "PAUSE";
        document.getElementById("screen-pause").classList.remove("hidden");
    }
}

function resumeGame() {
    if (gameState === "PAUSE") {
        gameState = "PLAYING";
        document.getElementById("screen-pause").classList.add("hidden");
    }
}

function restartGame() {
    hideAllScreens();
    startGame();
}

function quitToMenu() {
    hideAllScreens();
    gameState = "MENU";
    document.getElementById("screen-menu").classList.remove("hidden");
    obstacles.forEach(obs => scene.remove(obs));
    obstacles = [];
}

function hideAllScreens() {
    document.getElementById("screen-menu").classList.add("hidden");
    document.getElementById("screen-garage").classList.add("hidden");
    document.getElementById("screen-leaderboard").classList.add("hidden");
    document.getElementById("screen-auth").classList.add("hidden");
    document.getElementById("screen-pause").classList.add("hidden");
    document.getElementById("screen-gameover").classList.add("hidden");
}

function openGarage() {
    hideAllScreens();
    gameState = "GARAGE";
    document.getElementById("screen-garage").classList.remove("hidden");
    updateGarageUI();
}

function closeGarage() {
    document.getElementById("screen-garage").classList.add("hidden");
    document.getElementById("screen-menu").classList.remove("hidden");
    gameState = "MENU";
    saveUserData();
}

function openLeaderboard() {
    hideAllScreens();
    gameState = "LEADERBOARD";
    document.getElementById("screen-leaderboard").classList.remove("hidden");
    fetchLeaderboard();
}

function closeLeaderboard() {
    document.getElementById("screen-leaderboard").classList.add("hidden");
    document.getElementById("screen-menu").classList.remove("hidden");
    gameState = "MENU";
}

function openAuthModal() {
    hideAllScreens();
    gameState = "AUTH";
    document.getElementById("screen-auth").classList.remove("hidden");
}

function closeAuthModal() {
    document.getElementById("screen-auth").classList.add("hidden");
    document.getElementById("screen-menu").classList.remove("hidden");
    gameState = "MENU";
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ==========================================================
   UPGRADE SYSTEM & CALCULATIONS
   ========================================================== */

function updateGarageUI() {
    document.getElementById("garage-cash-display").innerText = cash + " Coins";
    document.getElementById("speed-level-text").innerText = `Level ${upgrades.speed}`;
    document.getElementById("speed-cost-text").innerText = Math.floor(500 * Math.pow(1.5, upgrades.speed - 1));

    document.getElementById("nitro-level-text").innerText = `Level ${upgrades.nitro}`;
    document.getElementById("nitro-cost-text").innerText = Math.floor(500 * Math.pow(1.5, upgrades.nitro - 1));

    document.getElementById("handling-level-text").innerText = `Level ${upgrades.handling}`;
    document.getElementById("handling-cost-text").innerText = Math.floor(500 * Math.pow(1.5, upgrades.handling - 1));
}

function upgradeStat(statName) {
    let cost = Math.floor(500 * Math.pow(1.5, upgrades[statName] - 1));
    if (cash >= cost) {
        cash -= cost;
        upgrades[statName]++;
        updateGarageUI();
        updateHUD();
        saveUserData();
    } else {
        alert("Not enough cash! Race more to earn coins.");
    }
}

/* ==========================================================
   WEB AUDIO API SYNTHESIS
   ========================================================== */

function initAudio() {
    if (!audioCtx && soundEnabled) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const icon = document.getElementById("sound-icon");
    if (soundEnabled) {
        icon.className = "fa-solid fa-volume-high";
    } else {
        icon.className = "fa-solid fa-volume-xmark";
    }
}

function playCrashSound() {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
}

/* ==========================================================
   BACKEND AUTHENTICATION & CLOUD DATA SYNC
   ========================================================== */

let authMode = "login"; // login, register, forgot, reset

function switchAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById("auth-title");
    const submitBtn = document.getElementById("auth-submit-btn");
    const fieldOtp = document.getElementById("field-otp");
    const fieldNewPass = document.getElementById("field-new-password");
    const fieldPass = document.getElementById("field-password");
    
    document.getElementById("auth-error").classList.add("hidden");
    document.getElementById("auth-success").classList.add("hidden");

    if (mode === "login") {
        title.innerHTML = `<i class="fa-solid fa-user-shield"></i><span>RACER LOGIN</span>`;
        submitBtn.innerText = "LOGIN";
        fieldOtp.classList.add("hidden");
        fieldNewPass.classList.add("hidden");
        fieldPass.classList.remove("hidden");
    } else if (mode === "register") {
        title.innerHTML = `<i class="fa-solid fa-user-plus"></i><span>NEW RACER REGISTRATION</span>`;
        submitBtn.innerText = "REGISTER";
        fieldOtp.classList.add("hidden");
        fieldNewPass.classList.add("hidden");
        fieldPass.classList.remove("hidden");
    } else if (mode === "forgot") {
        title.innerHTML = `<i class="fa-solid fa-key"></i><span>REQUEST PASSWORD OTP</span>`;
        submitBtn.innerText = "SEND OTP";
        fieldOtp.classList.add("hidden");
        fieldNewPass.classList.add("hidden");
        fieldPass.classList.add("hidden");
    } else if (mode === "reset") {
        title.innerHTML = `<i class="fa-solid lock"></i><span>RESET PASSWORD</span>`;
        submitBtn.innerText = "UPDATE PASSWORD";
        fieldOtp.classList.remove("hidden");
        fieldNewPass.classList.remove("hidden");
        fieldPass.classList.add("hidden");
    }
}

async function handleAuthSubmit(e) {
    e.preventDefault();
    const email = document.getElementById("auth-email").value;
    const password = document.getElementById("auth-password").value;
    const otp = document.getElementById("auth-otp").value;
    const newPassword = document.getElementById("auth-new-password").value;
    
    const errEl = document.getElementById("auth-error");
    const succEl = document.getElementById("auth-success");
    errEl.classList.add("hidden");
    succEl.classList.add("hidden");

    try {
        if (authMode === "register") {
            const res = await fetch(`${apiBaseUrl}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ app_id: appMeta.app_id, email, password })
            });
            const data = await res.json();
            if (res.ok && data.success !== false) {
                succEl.innerText = "Registration successful! Logging you in...";
                succEl.classList.remove("hidden");
                // Auto login after register
                setTimeout(() => performLogin(email, password), 1000);
            } else {
                throw new Error(data.error || data.message || "Registration failed");
            }
        } else if (authMode === "login") {
            await performLogin(email, password);
        } else if (authMode === "forgot") {
            const res = await fetch(`${apiBaseUrl}/request-otp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ app_id: appMeta.app_id, email })
            });
            const data = await res.json();
            if (res.ok) {
                succEl.innerText = "OTP sent to your email!";
                succEl.classList.remove("hidden");
                switchAuthMode("reset");
            } else {
                throw new Error(data.error || "Failed to send OTP");
            }
        } else if (authMode === "reset") {
            const res = await fetch(`${apiBaseUrl}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ app_id: appMeta.app_id, email, otp, new_password: newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                succEl.innerText = "Password successfully reset! Please login.";
                succEl.classList.remove("hidden");
                setTimeout(() => switchAuthMode("login"), 1500);
            } else {
                throw new Error(data.error || "Password reset failed");
            }
        }
    } catch(err) {
        errEl.innerText = err.message;
        errEl.classList.remove("hidden");
    }
}

async function performLogin(email, password) {
    const res = await fetch(`${apiBaseUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appMeta.app_id, email, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
        authToken = data.token;
        localStorage.setItem("trumple_token", authToken);
        document.getElementById("player-username").innerText = email.split("@")[0];
        document.getElementById("auth-btn-text").innerText = "Account Connected";
        closeAuthModal();
        loadUserData();
    } else {
        throw new Error(data.error || data.message || "Login failed");
    }
}

async function loadUserData() {
    if (!authToken) return;
    try {
        const res = await fetch(`${apiBaseUrl}/data?collection=profiles`, {
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        const data = await res.json();
        if (res.ok && data.records && data.records.length > 0) {
            const profile = data.records[0].data;
            cash = profile.cash || 1000;
            upgrades.speed = profile.speed_upgrade || 1;
            upgrades.nitro = profile.nitro_upgrade || 1;
            upgrades.handling = profile.handling_upgrade || 1;
            if (profile.car_color) setCarColor(profile.car_color);
            updateHUD();
        }
    } catch(e) {
        console.warn("Could not load cloud profile", e);
    }
}

async function saveUserData() {
    if (!authToken) return;
    try {
        // Check existing profile record
        const getRes = await fetch(`${apiBaseUrl}/data?collection=profiles`, {
            headers: { "Authorization": `Bearer ${authToken}` }
        });
        const getData = await getRes.json();
        
        const payload = {
            collection: "profiles",
            data: {
                cash,
                score,
                car_color: carColor,
                speed_upgrade: upgrades.speed,
                nitro_upgrade: upgrades.nitro,
                handling_upgrade: upgrades.handling
            }
        };

        if (getData.records && getData.records.length > 0) {
            // Update
            await fetch(`${apiBaseUrl}/data`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({ id: getData.records[0].id, data: payload.data })
            });
        } else {
            // Create
            await fetch(`${apiBaseUrl}/data`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify(payload)
            });
        }

        // Also submit to leaderboard
        await fetch(`${apiBaseUrl}/data`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${authToken}`
            },
            body: JSON.stringify({
                collection: "leaderboard",
                data: {
                    username: document.getElementById("player-username").innerText,
                    high_score: score,
                    distance: Math.floor(distance)
                }
            })
        });
    } catch(e) {
        console.warn("Failed syncing cloud data", e);
    }
}

async function fetchLeaderboard() {
    const listEl = document.getElementById("leaderboard-list");
    listEl.innerHTML = `<div class="text-center text-gray-500 py-6">Loading leaderboard...</div>`;
    try {
        const res = await fetch(`${apiBaseUrl}/data?collection=leaderboard`);
        const data = await res.json();
        if (res.ok && data.records && data.records.length > 0) {
            // Sort records by high_score descending
            data.records.sort((a, b) => (b.data.high_score || 0) - (a.data.high_score || 0));
            listEl.innerHTML = "";
            data.records.slice(0, 10).forEach((rec, idx) => {
                const item = document.createElement("div");
                item.className = "flex items-center justify-between bg-gray-950/60 p-3 rounded-xl border border-gray-800/80";
                item.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <span class="font-['Orbitron'] font-bold text-sm text-${idx === 0 ? 'amber-400' : idx === 1 ? 'gray-300' : idx === 2 ? 'amber-600' : 'gray-500'}">#${idx + 1}</span>
                        <span class="font-semibold text-sm text-gray-200">${rec.data.username || 'Racer'}</span>
                    </div>
                    <div class="font-['Orbitron'] font-bold text-cyan-400 text-sm">${rec.data.high_score || 0} PTS</div>
                `;
                listEl.appendChild(item);
            });
        } else {
            listEl.innerHTML = `<div class="text-center text-gray-500 py-6">No leaderboard records yet. Be the first!</div>`;
        }
    } catch(e) {
        listEl.innerHTML = `<div class="text-center text-red-400 py-6">Failed to load leaderboard</div>`;
    }
}