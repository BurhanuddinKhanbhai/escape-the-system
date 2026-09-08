"use strict";

/* ========================================================================== 
   GAME CONFIGURATION
   Change the puzzle text, choices, or answers here to update the game.
   ========================================================================== */
const GAME_CONFIG = {
  durationSeconds: 5 * 60,
  puzzleOne: {
    intro: "The system only understands binary.",
    question: "Convert this binary number to decimal:",
    binaryNumber: "1010",
    correctAnswer: "10",
  },
  puzzleTwo: {
    question: "What will this Python code print?",
    code: "x = 3\ny = 4\nprint(x * y + 2)",
    choices: ["12", "14", "18", "24"],
    correctAnswer: "14",
  },
  level3: {
    // Use each of these five lowercase color names exactly once. Order is secret.
    secretPattern: ["blue", "red", "purple", "green", "yellow"],
  },
};

// Palette order is independent of the secret; nothing in the UI reveals it.
const CODE_COLORS = ["red", "blue", "green", "yellow", "purple"];

const screens = {
  intro: document.querySelector("#intro-screen"),
  puzzleOne: document.querySelector("#puzzle-one-screen"),
  puzzleTwo: document.querySelector("#puzzle-two-screen"),
  puzzleThree: document.querySelector("#puzzle-three-screen"),
  victory: document.querySelector("#victory-screen"),
  expired: document.querySelector("#expired-screen"),
};

const timerDisplay = document.querySelector("#timer");
const statusText = document.querySelector("#status-text");
const startButton = document.querySelector("#start-button");
const binaryForm = document.querySelector("#binary-form");
const binaryAnswer = document.querySelector("#binary-answer");
const puzzleOneMessage = document.querySelector("#puzzle-one-message");
const puzzleTwoMessage = document.querySelector("#puzzle-two-message");
const choiceList = document.querySelector("#choice-list");
const escapeTime = document.querySelector("#escape-time");
const resetButtons = document.querySelectorAll(".reset-button");
const colorSlots = document.querySelector("#color-slots");
const colorPalette = document.querySelector("#color-palette");
const clearColorsButton = document.querySelector("#clear-colors");
const submitColorsButton = document.querySelector("#submit-colors");
const colorSelectionStatus = document.querySelector("#color-selection-status");
const puzzleThreeMessage = document.querySelector("#puzzle-three-message");
const colorHistory = document.querySelector("#color-history");
const colorHistoryEmpty = document.querySelector("#color-history-empty");

let currentScreen = "intro";
let timerIntervalId = null;
let transitionTimeoutId = null;
let endTime = null;
let timeRemaining = GAME_CONFIG.durationSeconds;
let gameIsActive = false;
let secretPattern = [];
let colorGuess = Array(5).fill(null);
let colorAttempts = [];
let colorCodeSolved = false;

/** Convert a number of seconds to a classroom-friendly M:SS display. */
function formatTime(totalSeconds) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Show exactly one game screen and update the terminal status text. */
function showScreen(screenName) {
  Object.entries(screens).forEach(([name, element]) => {
    const isCurrent = name === screenName;
    element.hidden = !isCurrent;
    element.classList.toggle("active", isCurrent);
  });

  currentScreen = screenName;
  document.querySelector(".game-shell").classList.toggle("color-level-active", screenName === "puzzleThree");
  const statuses = {
    intro: "SYSTEM STANDBY",
    puzzleOne: "SECURITY LEVEL 1 ACTIVE",
    puzzleTwo: "SECURITY LEVEL 2 ACTIVE",
    puzzleThree: "SECURITY LEVEL 3 ACTIVE",
    victory: "SYSTEM ACCESS RESTORED",
    expired: "SYSTEM LOCKED",
  };
  statusText.textContent = statuses[screenName];
}

/** Update the timer text and its warning colors. */
function renderTimer() {
  timerDisplay.textContent = formatTime(timeRemaining);
  timerDisplay.classList.toggle("warning", timeRemaining <= 60 && timeRemaining > 15);
  timerDisplay.classList.toggle("critical", timeRemaining <= 15);
}

/** Read the real clock on every tick so background-tab delays do not create drift. */
function updateCountdown() {
  if (!gameIsActive || endTime === null) return;

  timeRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
  renderTimer();

  if (timeRemaining === 0) {
    expireGame();
  }
}

/** Start a fresh five-minute session and open Puzzle 1. */
function startGame() {
  if (gameIsActive) return;

  gameIsActive = true;
  timeRemaining = GAME_CONFIG.durationSeconds;
  endTime = Date.now() + GAME_CONFIG.durationSeconds * 1000;
  renderTimer();
  showScreen("puzzleOne");
  binaryAnswer.focus();

  clearInterval(timerIntervalId);
  timerIntervalId = window.setInterval(updateCountdown, 250);
}

/** Stop all game timing without changing the displayed time. */
function stopTimer() {
  gameIsActive = false;
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  endTime = null;
}

/** Lock the game immediately when the timer reaches zero. */
function expireGame() {
  if (!gameIsActive) return;

  stopTimer();
  clearTimeout(transitionTimeoutId);
  transitionTimeoutId = null;
  timeRemaining = 0;
  renderTimer();
  showScreen("expired");
  screens.expired.querySelector("button").focus();
}

/** Render Puzzle 2 choices from the configuration object. */
function buildPuzzleTwoChoices() {
  choiceList.replaceChildren();

  GAME_CONFIG.puzzleTwo.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice-button";
    button.textContent = choice;
    button.dataset.answer = choice;
    button.addEventListener("click", handlePuzzleTwoAnswer);
    choiceList.append(button);
  });
}

/** Check Puzzle 1. Submitting the form also handles the Enter key automatically. */
function handlePuzzleOneSubmit(event) {
  event.preventDefault();
  if (!gameIsActive || currentScreen !== "puzzleOne") return;

  const answer = binaryAnswer.value.trim();
  if (answer !== GAME_CONFIG.puzzleOne.correctAnswer) {
    puzzleOneMessage.textContent = "ACCESS DENIED — try again.";
    puzzleOneMessage.classList.remove("success");
    binaryAnswer.select();
    return;
  }

  puzzleOneMessage.textContent = "ACCESS GRANTED";
  puzzleOneMessage.classList.add("success");
  binaryAnswer.disabled = true;
  binaryForm.querySelector("button").disabled = true;

  transitionTimeoutId = window.setTimeout(() => {
    if (!gameIsActive) return;
    showScreen("puzzleTwo");
    choiceList.querySelector("button")?.focus();
  }, 650);
}

/** Check Puzzle 2 and unlock the final level without restarting the timer. */
function handlePuzzleTwoAnswer(event) {
  if (!gameIsActive || currentScreen !== "puzzleTwo") return;
  updateCountdown();
  if (!gameIsActive) return;

  const selectedButton = event.currentTarget;
  const selectedAnswer = selectedButton.dataset.answer;

  if (selectedAnswer !== GAME_CONFIG.puzzleTwo.correctAnswer) {
    puzzleTwoMessage.textContent = "ACCESS DENIED — check the code again.";
    puzzleTwoMessage.classList.remove("success");
    selectedButton.classList.remove("incorrect");
    // Restart the subtle shake when the same wrong answer is clicked again.
    void selectedButton.offsetWidth;
    selectedButton.classList.add("incorrect");
    return;
  }

  selectedButton.classList.add("correct");
  puzzleTwoMessage.textContent = "ACCESS GRANTED";
  puzzleTwoMessage.classList.add("success");
  choiceList.querySelectorAll("button").forEach((button) => {
    button.disabled = true;
  });

  transitionTimeoutId = window.setTimeout(() => {
    transitionTimeoutId = null;
    updateCountdown();
    if (!gameIsActive || currentScreen !== "puzzleTwo") return;
    showScreen("puzzleThree");
    renderColorSelection();
    document.querySelector("#puzzle-three-title").focus();
  }, 650);
}

/** CSS supplies the color; a visible initial and accessible name identify it too. */
function createColorChip(color) {
  const chip = document.createElement("span");
  chip.className = "color-chip";
  chip.dataset.color = color;
  chip.textContent = color.charAt(0).toUpperCase();
  chip.setAttribute("role", "img");
  chip.setAttribute("aria-label", color.toUpperCase());
  return chip;
}

/** Build native buttons once, preserving keyboard focus during selection updates. */
function buildColorControls() {
  for (let index = 0; index < 5; index += 1) {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "color-slot";
    slot.addEventListener("click", () => {
      if (!canEditColorCode() || colorGuess[index] === null) return;
      colorGuess[index] = null;
      renderColorSelection();
    });
    colorSlots.append(slot);
  }

  CODE_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-button";
    button.dataset.color = color;
    button.textContent = color.toUpperCase();
    button.addEventListener("click", () => {
      if (!canEditColorCode() || colorGuess.includes(color)) return;
      const emptyIndex = colorGuess.indexOf(null);
      if (emptyIndex === -1) return;
      colorGuess[emptyIndex] = color;
      renderColorSelection();
    });
    colorPalette.append(button);
  });
}

/** Check the deadline at input time as well as on interval ticks. */
function canEditColorCode() {
  if (!gameIsActive || currentScreen !== "puzzleThree" || colorCodeSolved) return false;
  updateCountdown();
  return gameIsActive;
}

function renderColorSelection() {
  const selectedCount = colorGuess.filter(Boolean).length;
  colorSlots.querySelectorAll("button").forEach((slot, index) => {
    const color = colorGuess[index];
    const number = document.createElement("span");
    number.className = "slot-number";
    number.textContent = String(index + 1);
    slot.replaceChildren(number);
    if (color) slot.append(createColorChip(color));
    slot.classList.toggle("filled", color !== null);
    slot.disabled = colorCodeSolved;
    slot.setAttribute("aria-label", color
      ? `Position ${index + 1}: ${color.toUpperCase()}. Click to remove.`
      : `Position ${index + 1}: empty. Choose a color below.`);
  });

  colorPalette.querySelectorAll("button").forEach((button) => {
    button.disabled = colorCodeSolved || colorGuess.includes(button.dataset.color);
  });
  clearColorsButton.disabled = colorCodeSolved;
  submitColorsButton.disabled = colorCodeSolved || selectedCount !== 5;
  colorSelectionStatus.textContent = colorCodeSolved
    ? "COLOR CODE ACCEPTED"
    : `${selectedCount} / 5 COLORS SELECTED${selectedCount === 5
      ? " — ready to submit." : " — fill all slots to submit."}`;
}

/** Clear only the editable guess. Submitted attempts remain until game reset. */
function clearColorSelection() {
  if (!canEditColorCode()) return;
  colorGuess = Array(5).fill(null);
  renderColorSelection();
}

/** Append an immutable guess snapshot, showing the latest attempt first. */
function recordColorAttempt(correctPositions) {
  const attempt = { colors: colorGuess.slice(), correctPositions };
  colorAttempts.push(attempt);
  const row = document.createElement("li");
  row.className = "color-attempt";
  const label = document.createElement("h3");
  label.textContent = `ATTEMPT ${colorAttempts.length}`;
  const chips = document.createElement("div");
  chips.className = "history-colors";
  attempt.colors.forEach((color) => chips.append(createColorChip(color)));
  const score = document.createElement("p");
  score.className = "attempt-score";
  score.textContent = `${correctPositions} / 5 POSITIONS CORRECT`;
  row.append(label, chips, score);
  colorHistory.prepend(row);
  colorHistoryEmpty.hidden = true;
  colorHistory.scrollTop = 0;
}

/** Score exact positions only. Unlimited retries share the original deadline. */
function submitColorCode() {
  if (!canEditColorCode()) return;
  if (colorGuess.includes(null) || new Set(colorGuess).size !== 5) return;

  const correctPositions = colorGuess.reduce((count, color, index) =>
    count + (color === secretPattern[index] ? 1 : 0), 0);
  recordColorAttempt(correctPositions);
  puzzleThreeMessage.textContent = `${correctPositions} / 5 POSITIONS CORRECT`;

  // Keep an incorrect selection in place so students can edit it or press CLEAR.
  if (correctPositions !== 5) return;

  colorCodeSolved = true;
  puzzleThreeMessage.textContent += "\nFINAL FIREWALL BREACHED\nCOLOR CODE ACCEPTED";
  puzzleThreeMessage.classList.add("success");
  screens.puzzleThree.classList.add("firewall-breached");
  renderColorSelection();

  // Completion time includes all three puzzles, but excludes the success effect.
  const elapsedSeconds = GAME_CONFIG.durationSeconds - timeRemaining;
  stopTimer();
  escapeTime.textContent = `Escape time: ${formatTime(elapsedSeconds)}`;
  transitionTimeoutId = window.setTimeout(() => {
    transitionTimeoutId = null;
    if (!colorCodeSolved || currentScreen !== "puzzleThree") return;
    showScreen("victory");
    screens.victory.querySelector("button").focus();
  }, 1000);
}

/** A session gets one fixed copy of the configured secret, never a new random one. */
function resetColorCode() {
  secretPattern = GAME_CONFIG.level3.secretPattern.slice();
  colorGuess = Array(5).fill(null);
  colorAttempts = [];
  colorCodeSolved = false;
  colorHistory.replaceChildren();
  colorHistoryEmpty.hidden = false;
  puzzleThreeMessage.textContent = "";
  puzzleThreeMessage.classList.remove("success");
  screens.puzzleThree.classList.remove("firewall-breached");
  renderColorSelection();
}

/** Return every visual and state value to a clean next-team session. */
function resetGame() {
  stopTimer();
  clearTimeout(transitionTimeoutId);
  transitionTimeoutId = null;
  timeRemaining = GAME_CONFIG.durationSeconds;
  renderTimer();

  binaryForm.reset();
  binaryAnswer.disabled = false;
  binaryForm.querySelector("button").disabled = false;
  puzzleOneMessage.textContent = "";
  puzzleOneMessage.classList.remove("success");
  puzzleTwoMessage.textContent = "";
  puzzleTwoMessage.classList.remove("success");
  escapeTime.textContent = "Escape time: 0:00";
  buildPuzzleTwoChoices();

  resetColorCode();

  showScreen("intro");
  startButton.focus();
}

/** Put all configurable puzzle content into the page. */
function loadConfiguredContent() {
  document.querySelector("#binary-intro").textContent = GAME_CONFIG.puzzleOne.intro;
  document.querySelector("#binary-prompt").textContent = GAME_CONFIG.puzzleOne.question;
  document.querySelector("#binary-value").textContent = GAME_CONFIG.puzzleOne.binaryNumber;
  document.querySelector("#code-prompt").textContent = GAME_CONFIG.puzzleTwo.question;
  document.querySelector("#code-snippet").textContent = GAME_CONFIG.puzzleTwo.code;
  buildPuzzleTwoChoices();
}

startButton.addEventListener("click", startGame);
binaryForm.addEventListener("submit", handlePuzzleOneSubmit);
binaryAnswer.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    binaryForm.requestSubmit();
  }
});
resetButtons.forEach((button) => button.addEventListener("click", resetGame));
clearColorsButton.addEventListener("click", clearColorSelection);
submitColorsButton.addEventListener("click", submitColorCode);

// Let students press Enter on the intro screen as well as in the Puzzle 1 form.
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && currentScreen === "intro" && !gameIsActive) {
    startGame();
  }
});

// A refresh always creates a clean, predictable session with no stored data.
loadConfiguredContent();
buildColorControls();
resetGame();
