import { BalloonGame } from "./game.js";
import { HandTracker } from "./handTracker.js";
import {
  getRanking,
  saveResult,
  clearRanking
} from "./storage.js";

const $ = (id) => document.getElementById(id);

const intro = $("intro");
const gameSection = $("gameSection");
const results = $("results");

const video = $("cameraVideo");
const canvas = $("gameCanvas");

const cameraStatus = $("cameraStatus");
const handHint = $("handHint");

const startBtn = $("startCameraBtn");
const themeToggle = $("themeToggle");

let stream = null;
let tracker = null;
let game = null;

let playerName = "Jugador 1";
let duration = 20;

let lastHand = null;
let lastFrameTime = 0;
let animationFrame = 0;

let sessionPlayers = [];
let playerIndex = 0;
let currentRound = null;
let countdownTimer = null;


// ======================================
// CAMBIO DE TEMA
// ======================================

function applyTheme(theme) {

  const selectedTheme =
    theme === "light" ? "light" : "dark";

  document.body.dataset.theme = selectedTheme;

  const isLight = selectedTheme === "light";

  themeToggle.innerHTML = isLight
    ? "🌙 <span>Modo oscuro</span>"
    : "☀️ <span>Modo claro</span>";

  themeToggle.setAttribute(
    "aria-label",
    isLight ? "Activar modo oscuro" : "Activar modo claro"
  );

  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      isLight ? "#f2f5fc" : "#101426"
    );

  try {
    localStorage.setItem(
      "globorush.theme",
      selectedTheme
    );
  } catch (error) {
    console.warn("No se pudo guardar el tema.", error);
  }
}

function loadTheme() {

  let savedTheme = "dark";

  try {
    savedTheme =
      localStorage.getItem("globorush.theme") || "dark";
  } catch (error) {
    console.warn("No se pudo recuperar el tema.", error);
  }

  applyTheme(savedTheme);
}

themeToggle.addEventListener("click", () => {

  const currentTheme = document.body.dataset.theme;

  applyTheme(
    currentTheme === "dark" ? "light" : "dark"
  );

});

loadTheme();


// ======================================
// INTERFAZ
// ======================================

function setCameraStatus(text, active = false) {

  cameraStatus.textContent = text;

  cameraStatus.parentElement.classList.toggle(
    "active",
    active
  );

}

function show(view) {

  intro.classList.toggle("hidden", view !== "intro");

  gameSection.classList.toggle(
    "hidden",
    view !== "game"
  );

  results.classList.toggle(
    "hidden",
    view !== "results"
  );

}


// ======================================
// CANVAS
// ======================================

function resizeCanvas() {

  const rect = canvas.getBoundingClientRect();

  const dpr = Math.min(
    window.devicePixelRatio || 1,
    1.5
  );

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  game?.resize(canvas.width, canvas.height);

}

window.addEventListener("resize", resizeCanvas);


// ======================================
// CÁMARA
// ======================================

async function startCamera() {

  if (!navigator.mediaDevices?.getUserMedia) {

    alert(
      "Tu navegador no habilitó la cámara. " +
      "Abrí el juego en localhost o HTTPS."
    );

    return false;
  }

  try {

    setCameraStatus("Solicitando permiso…");

    stream = await navigator.mediaDevices.getUserMedia({

      audio: false,

      video: {
        facingMode: "user",
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30, max: 30 }
      }

    });

    video.srcObject = stream;

    await video.play();

    tracker = new HandTracker(video, onHand);

    await tracker.init();

    setCameraStatus("Cámara activa", true);

    return true;

  } catch (err) {

    console.error(
      "Error al iniciar GloboRush:",
      err
    );

    setCameraStatus("Error al iniciar");

    const message =
      err?.name === "NotAllowedError"
        ? "Necesitás permitir el uso de la cámara."
        : "No se pudo iniciar el detector. " +
          "Revisá public/vision_bundle.mjs, public/wasm " +
          "y public/models/hand_landmarker.task. " +
          "Detalle: " + (err?.message || err);

    alert(message);

    stopCamera();

    return false;
  }

}


// ======================================
// DETENER CÁMARA
// ======================================

function stopCamera() {

  cancelAnimationFrame(animationFrame);

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  tracker?.stop();

  tracker = null;

  if (stream) {
    stream.getTracks().forEach(
      track => track.stop()
    );
  }

  stream = null;

  video.srcObject = null;

  lastHand = null;

  setCameraStatus("Cámara sin iniciar");

}


// ======================================
// DETECCIÓN DE MANO
// ======================================

function onHand(point) {

  lastHand = point;

  handHint.textContent = point
    ? "¡Mano detectada! Pasá el índice sobre los globos"
    : "Mostrá una mano frente a la cámara";

}


// ======================================
// BUCLE DEL JUEGO
// ======================================

function runLoop(now = 0) {

  if (!game || game.state !== "playing") {
    return;
  }

  const dt = Math.min(
    (now - (lastFrameTime || now)) / 1000,
    0.04
  );

  lastFrameTime = now;

  game.update(dt, lastHand);

  game.draw();

  $("score").textContent =
    String(game.score).padStart(4, "0");

  $("timer").textContent =
    String(Math.ceil(game.timeLeft)).padStart(2, "0");

  if (game.timeLeft <= 0) {

    finishRound();

    return;
  }

  animationFrame = requestAnimationFrame(runLoop);

}


// ======================================
// INICIAR RONDA
// ======================================

async function beginRound(name, roundDuration) {

  playerName = name || `Jugador ${playerIndex + 1}`;

  duration = roundDuration;

  $("activePlayer").textContent = playerName;

  $("score").textContent = "0000";

  $("timer").textContent = String(duration);

  $("roundMessage").classList.add("hidden");

  $("countdown").classList.remove("hidden");

  show("game");

  resizeCanvas();

  game = new BalloonGame(canvas, duration);

  lastHand = null;

  lastFrameTime = 0;

  let n = 3;

  $("countdown").textContent = n;

  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  countdownTimer = setInterval(() => {

    n--;

    if (n > 0) {

      $("countdown").textContent = n;

    } else {

      clearInterval(countdownTimer);

      countdownTimer = null;

      $("countdown").classList.add("hidden");

      game.start();

      animationFrame = requestAnimationFrame(runLoop);

    }

  }, 750);

}


// ======================================
// BOTÓN INICIAR
// ======================================

startBtn.addEventListener("click", async () => {

  startBtn.disabled = true;

  const ok = await startCamera();

  startBtn.disabled = false;

  if (!ok) return;

  sessionPlayers = [
    $("playerName").value.trim() || "Jugador 1"
  ];

  playerIndex = 0;

  duration = Number($("duration").value);

  await beginRound(
    sessionPlayers[0],
    duration
  );

});


// ======================================
// FINALIZAR RONDA
// ======================================

$("stopBtn").addEventListener(
  "click",
  finishRound
);

function finishRound() {

  if (!game || game.state !== "playing") {
    return;
  }

  game.stop();

  cancelAnimationFrame(animationFrame);

  currentRound = {

    name: playerName,
    score: game.score,
    popped: game.popped,
    badHits: game.badHits,
    duration

  };

  saveResult(currentRound);

  $("resultTitle").textContent =
    game.score >= 1000
      ? "¡Una gran ronda!"
      : "¡Buen intento!";

  $("finalScore").textContent =
    String(game.score);

  $("resultSummary").textContent =
    `${playerName} reventó ${game.popped} globos ` +
    `y tocó ${game.badHits} globos trampa.`;

  $("nextPlayerBtn").textContent =
    playerIndex === 0
      ? "Jugar con el jugador 2 ↗"
      : "Jugar otra ronda ↗";

  $("nextPlayerBtn").classList.toggle(
    "hidden",
    playerIndex > 0
  );

  renderRanking();

  show("results");

}


// ======================================
// SEGUNDO JUGADOR
// ======================================

$("nextPlayerBtn").addEventListener(
  "click",
  async () => {

    playerIndex = 1;

    const name = prompt(
      "Nombre del segundo jugador:",
      "Jugador 2"
    );

    if (name === null) return;

    sessionPlayers[1] =
      name.trim() || "Jugador 2";

    await beginRound(
      sessionPlayers[1],
      duration
    );

  }
);


// ======================================
// REVANCHA
// ======================================

$("replayBtn").addEventListener(
  "click",
  async () => {

    const cameraReady = stream && tracker;

    if (!cameraReady && !(await startCamera())) {
      return;
    }

    await beginRound(
      playerName,
      duration
    );

  }
);


// ======================================
// VOLVER AL INICIO
// ======================================

$("homeBtn").addEventListener(
  "click",
  () => {

    stopCamera();

    game = null;

    show("intro");

  }
);


// ======================================
// BORRAR RANKING
// ======================================

// =========================================
// MODAL PERSONALIZADO PARA BORRAR RANKING
// =========================================

const deleteModal = $("deleteModal");
const cancelDelete = $("cancelDelete");
const confirmDelete = $("confirmDelete");
const clearRankingBtn = $("clearRankingBtn");

// Abrir ventana
clearRankingBtn.addEventListener("click", () => {

    deleteModal.classList.remove("hidden");

    cancelDelete.focus();

});

// Cancelar
cancelDelete.addEventListener("click", () => {

    deleteModal.classList.add("hidden");

    clearRankingBtn.focus();

});

// Confirmar eliminación
confirmDelete.addEventListener("click", () => {

    clearRanking();

    renderRanking();

    deleteModal.classList.add("hidden");

    clearRankingBtn.focus();

});

// Cerrar al presionar fuera de la ventana
deleteModal.addEventListener("click", (event) => {

    if (event.target === deleteModal) {

        deleteModal.classList.add("hidden");

        clearRankingBtn.focus();

    }

});

// Cerrar con Escape
document.addEventListener("keydown", (event) => {

    if (
        event.key === "Escape" &&
        !deleteModal.classList.contains("hidden")
    ) {

        deleteModal.classList.add("hidden");

        clearRankingBtn.focus();

    }

});


// ======================================
// MOSTRAR RANKING
// ======================================

function renderRanking() {

  const list = $("rankingList");

  const ranking = getRanking();

  list.innerHTML = "";

  if (!ranking.length) {

    const li = document.createElement("li");

    li.textContent =
      "Todavía no hay puntajes guardados";

    list.appendChild(li);

    return;
  }

  ranking.slice(0, 8).forEach(item => {

    const li = document.createElement("li");

    li.textContent =
      `${item.name} · ${item.popped} globos`;

    const score = document.createElement("span");

    score.className = "rank-score";

    score.textContent = item.score;

    li.appendChild(score);

    list.appendChild(li);

  });

}

renderRanking();


// ======================================
// CERRAR PÁGINA
// ======================================

window.addEventListener(
  "beforeunload",
  stopCamera
);