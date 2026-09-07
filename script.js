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
};

const screens = {
  intro: document.querySelector("#intro-screen"),
  puzzleOne: document.querySelector("#puzzle-one-screen"),
  puzzleTwo: document.querySelector("#puzzle-two-screen"),
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

let currentScreen = "intro";
let timerIntervalId = null;
let transitionTimeoutId = null;
let endTime = null;
let timeRemaining = GAME_CONFIG.durationSeconds;
let gameIsActive = false;

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
  const statuses = {
    intro: "SYSTEM STANDBY",
    puzzleOne: "SECURITY LEVEL 1 ACTIVE",
    puzzleTwo: "SECURITY LEVEL 2 ACTIVE",
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

/** Check a Puzzle 2 button and finish only when the configured answer is chosen. */
function handlePuzzleTwoAnswer(event) {
  if (!gameIsActive || currentScreen !== "puzzleTwo") return;

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

  // Capture the elapsed time before stopping the countdown.
  updateCountdown();
  if (!gameIsActive) return;
  const elapsedSeconds = GAME_CONFIG.durationSeconds - timeRemaining;
  stopTimer();
  escapeTime.textContent = `Escape time: ${formatTime(elapsedSeconds)}`;

  transitionTimeoutId = window.setTimeout(() => {
    showScreen("victory");
    screens.victory.querySelector("button").focus();
  }, 650);
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

// Let students press Enter on the intro screen as well as in the Puzzle 1 form.
document.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && currentScreen === "intro" && !gameIsActive) {
    startGame();
  }
});

// A refresh always creates a clean, predictable session with no stored data.
loadConfiguredContent();
resetGame();
