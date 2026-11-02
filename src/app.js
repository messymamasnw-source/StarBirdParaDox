import {
  STORAGE_KEY,
  addTask,
  createInitialState,
  deleteTask,
  normalizeState,
  setTaskPriority,
  toggleTaskDone,
  updatePreferences,
} from "./storage.js";

const app = document.querySelector("#app");
const statusRegion = document.querySelector("#status");
const resetChoices = [
  "A quieter space",
  "Water or a snack",
  "A moment to pause",
  "A little help from someone",
  "One very small task",
  "I’m not sure yet",
];
let view = "today";
let resetStep = 0;
let resetNeed = "";
let resetAction = "";
let focusTimer = { seconds: 0, running: false, kind: "focus", preset: 25, taskId: "", transitionMinutes: 5 };
let timerHandle = null;
let petReaction = "";
let petNameDraft = "";
let helpTaskId = "";
let helpSuggestion = "";
let dumpThoughts = [];
let pendingThought = null;
let matchCards = [];
let matchOpen = [];
let matchMatched = [];
let matchHideHandle = null;
let playBreakChoice = "";
let playBreakSeconds = 300;
let breakHandle = null;
let sorterDraft = "";
let sorterItems = [];
let celebrationPending = false;
let announcement = "";
let state = loadState();
focusTimer = {
  ...focusTimer,
  preset: state.focusSettings.preset,
  taskId: state.focusSettings.taskId,
  transitionMinutes: state.focusSettings.transitionMinutes,
};

function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? normalizeState(JSON.parse(stored)) : createInitialState();
  } catch {
    announcement = "Saved data could not be read. You can still use the app, but changes may not be saved in this browser.";
    return createInitialState();
  }
}

function persist(successMessage = "") {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    announcement = successMessage;
    return true;
  } catch {
    announcement = "This browser could not save your change. Check available storage or browser privacy settings.";
    return false;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function currentDate() {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date());
}

function openTasks() {
  return state.tasks.filter((task) => !task.done);
}

function taskMarkup(task, compact = false) {
  return `
    <li class="task-row${task.done ? " is-done" : ""}${compact ? " compact" : ""}">
      <label class="task-check">
        <input type="checkbox" data-action="toggle-task" data-id="${escapeHtml(task.id)}" ${task.done ? "checked" : ""}>
        <span class="sr-only">${task.done ? "Mark as not done" : "Mark as done"}: ${escapeHtml(task.title)}</span>
      </label>
      <span class="task-title">${escapeHtml(task.title)}</span>
      ${task.priority && !task.done ? '<span class="priority-tag">Next step</span>' : ""}
      <button class="icon-button" type="button" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="Remove task: ${escapeHtml(task.title)}">Remove</button>
    </li>`;
}

function navigation() {
  return `
    <nav class="primary-nav" aria-label="Main navigation">
      <button type="button" class="nav-link${view === "today" ? " active" : ""}" data-view="today" ${view === "today" ? 'aria-current="page"' : ""}>Today</button>
      <button type="button" class="nav-link${view === "inbox" ? " active" : ""}" data-view="inbox" ${view === "inbox" ? 'aria-current="page"' : ""}>Loose tasks <span class="nav-count">${openTasks().length}</span></button>
      <button type="button" class="nav-link${view === "focus" ? " active" : ""}" data-view="focus" ${view === "focus" ? 'aria-current="page"' : ""}>Focus</button>
      ${state.preferences.gamesEnabled ? `<button type="button" class="nav-link${view === "play" ? " active" : ""}" data-view="play" ${view === "play" ? 'aria-current="page"' : ""}>Play break</button>` : ""}
      <button type="button" class="nav-link${["more", "settings", "pet", "garden", "universe", "dump", "quest"].includes(view) ? " active" : ""}" data-view="more" ${["more", "settings", "pet", "garden", "universe", "dump", "quest"].includes(view) ? 'aria-current="page"' : ""}>More</button>
    </nav>`;
}

function taskForm(label = "Add a loose task", buttonLabel = "Add task") {
  return `
    <form class="task-form" data-form="add-task">
      <label for="quick-task-input">${label}</label>
      <div class="input-row">
        <input id="quick-task-input" name="title" type="text" maxlength="240" placeholder="Anything on your mind is okay" autocomplete="off">
        <button class="button button-primary" type="submit">${buttonLabel}</button>
      </div>
      <p class="helper-text">No need to sort it out right now. Just get it out of your head.</p>
    </form>`;
}

function renderToday() {
  const prioritized = openTasks().filter((task) => task.priority);
  const latest = openTasks().slice(0, 4);
  const tinyWins = state.tasks.filter((task) => task.done).length;
  return `
    <section class="welcome">
      <div class="welcome-topline"><p class="eyebrow">${currentDate()} · YOUR LITTLE TRAILHEAD</p>${state.preferences.gamificationEnabled ? `<span class="trail-marker"><span aria-hidden="true">✦</span> ${tinyWins} tiny ${tinyWins === 1 ? "win" : "wins"}</span>` : ""}</div>
      <h1>Hey. You made it here.</h1>
      <p class="welcome-copy">Life can get knotted up. We won’t untangle it all at once. Pick a starting point, or just wander around. No streaks. No falling behind.</p>
      <p class="welcome-aside">Tiny steps count. So does resting.</p>
      <svg class="landscape-art" viewBox="0 0 360 210" role="presentation" aria-hidden="true">
        <path class="art-cloud" d="M183 48c4-17 20-29 39-27 14 1 25 10 29 23 5-4 12-6 19-4 13 3 21 15 19 28h-107c-9-5-8-13 1-20Z"/>
        <path class="art-mountain-back" d="m140 153 68-86 55 67 34-41 63 60v57H140Z"/>
        <path class="art-mountain-front" d="m197 151 66-84 39 48 20-23 58 59v59H197Z"/>
        <path class="art-snow" d="m208 67 18 23-13-5-10 13-7-2 14-29 9-12 8 15-2 8Z"/>
        <path class="art-lake" d="M0 148c43-9 85 8 128-1 48-10 90-1 126 2 38 3 74-8 106-2v63H0Z"/>
        <path class="art-water" d="M9 171c32-5 53 5 84 1m33 9c35-6 61 5 95-1m27-9c34-5 58 3 91 0M42 194c28-4 46 2 71 0m118 3c27-4 52 3 81 0"/>
        <path class="art-tree" d="m53 153 17-37 17 37h-9l14 24H48l14-24Zm49 4 13-29 13 29h-7l11 18H98l11-18Z"/>
        <path class="art-flower" d="M28 148c0-5 7-5 7 0 4-4 9 1 5 5 5 1 3 8-2 7 1 5-6 7-8 2-4 4-9-1-5-5-5-2-3-9 3-7Z"/>
        <path class="art-rain" d="m286 85-5 12m21-5-5 12m-27 3-4 10"/>
      </svg>
    </section>
    ${renderCompanionCard()}
    <section class="starter-section" aria-labelledby="starter-title">
      <div class="starter-heading"><div><p class="eyebrow">Choose your own trail</p><h2 id="starter-title">What would help right now?</h2></div><span class="no-pressure">Any answer is okay</span></div>
      <div class="starter-paths">
        <button class="path-card path-settle" type="button" data-action="start-path" data-path="settle">
          <span class="path-icon" aria-hidden="true">≈</span><span class="path-copy"><strong>Weather the wave</strong><span>A gentle reset, with every step optional.</span><em>Help me settle <span aria-hidden="true">→</span></em></span>
        </button>
        <button class="path-card path-unload" type="button" data-action="start-path" data-path="unload">
          <span class="path-icon" aria-hidden="true">✿</span><span class="path-copy"><strong>Empty my brain</strong><span>Drop the swirl somewhere safe. Sort it later.</span><em>Let it all out <span aria-hidden="true">→</span></em></span>
        </button>
        <button class="path-card path-win" type="button" data-action="start-path" data-path="tiny-win">
          <span class="path-icon" aria-hidden="true">✧</span><span class="path-copy"><strong>Find a foothold</strong><span>Make one next thing tiny enough to start.</span><em>Find one small win <span aria-hidden="true">→</span></em></span>
        </button>
      </div>
    </section>
    <div class="today-grid">
      <section class="card capture-card">
        <div class="section-heading">
          <div><p class="eyebrow">The thought-pile meadow</p><h2>Anything on your mind?</h2></div>
          <span class="quiet-badge">Sort it later</span>
        </div>
        ${taskForm()}
      </section>
      <section class="card next-card">
        <div class="section-heading">
          <div><p class="eyebrow">Only if it helps</p><h2>Your next steps</h2></div>
          <span class="count-pill">${prioritized.length} of 3</span>
        </div>
        ${prioritized.length
          ? `<ul class="task-list">${prioritized.map((task) => taskMarkup(task, true)).join("")}</ul>`
          : `<div class="empty-state"><p>Nothing has to be a priority yet.</p><span>When you’re ready, choose up to three small next steps from your loose tasks.</span></div>`}
        <button class="text-button" type="button" data-view="inbox">See loose tasks <span aria-hidden="true">→</span></button>
      </section>
      <section class="card recent-card">
        <div class="section-heading">
          <div><p class="eyebrow">A gentle start</p><h2>On your mind</h2></div>
        </div>
        ${latest.length
          ? `<ul class="task-list">${latest.map((task) => taskMarkup(task, true)).join("")}</ul>`
          : `<div class="empty-state"><p>Your list can start small.</p><span>One thought, one task, or nothing at all. You can come back whenever you like.</span></div>`}
        ${openTasks().length > 4 ? `<button class="text-button" type="button" data-view="inbox">See all ${openTasks().length} tasks <span aria-hidden="true">→</span></button>` : ""}
      </section>
      <section class="card settings-card">
        <div><p class="eyebrow">Make this feel okay to use</p><h2>Your space</h2><p class="settings-copy">Change the look whenever you need to.</p></div>
        ${settingsControls()}
        <button type="button" class="text-button" data-view="settings">All sensory and feature settings →</button>
      </section>
      <section class="card focus-shortcut"><p class="eyebrow">A little structure, if it helps</p><h2>Focus Toolkit</h2><p>Choose a gentle timer or a tiny way to start.</p><button class="button button-secondary" type="button" data-view="focus">Open Focus Toolkit</button></section>
    </div>
    ${safetyNote()}`;
}

function renderInbox() {
  const active = openTasks();
  const completed = state.tasks.filter((task) => task.done);
  return `
    <section class="page-heading">
      <p class="eyebrow">No perfect order required</p>
      <h1>Loose tasks</h1>
      <p>Catch what is on your mind. You can decide what matters later—or not at all.</p>
    </section>
    <section class="card inbox-card">
      ${taskForm("Add something to your list")}
      <div class="list-heading"><h2>When you’re ready, pick up to three next steps</h2><span class="count-pill">${active.filter((task) => task.priority).length} of 3</span></div>
      ${active.length
        ? `<ul class="inbox-list">${active.map((task) => `
            <li class="inbox-row">
              <label class="task-check">
                <input type="checkbox" data-action="toggle-task" data-id="${escapeHtml(task.id)}">
                <span class="sr-only">Mark as done: ${escapeHtml(task.title)}</span>
              </label>
              <span class="task-title">${escapeHtml(task.title)}</span>
              <button type="button" class="priority-button${task.priority ? " selected" : ""}" data-action="priority-task" data-id="${escapeHtml(task.id)}" aria-pressed="${task.priority}">
                ${task.priority ? "On next steps" : "Make a next step"}
              </button>
              <button class="icon-button" type="button" data-action="delete-task" data-id="${escapeHtml(task.id)}" aria-label="Remove task: ${escapeHtml(task.title)}">Remove</button>
            </li>`).join("")}</ul>`
        : `<div class="empty-state roomy"><p>Nothing waiting here.</p><span>Take a breath. You can add a thought whenever you want.</span></div>`}
    </section>
    ${completed.length ? `
      <section class="card completed-card">
        <h2>Done for now</h2>
        <ul class="task-list">${completed.map((task) => taskMarkup(task, true)).join("")}</ul>
      </section>` : ""}
    ${safetyNote()}`;
}

function settingsControls() {
  return `
    <div class="settings-controls">
      <fieldset>
        <legend>Color</legend>
        <div class="choice-row">
          <label class="choice-chip"><input type="radio" name="theme" value="executive-ivory" data-setting="theme" ${state.preferences.theme === "executive-ivory" ? "checked" : ""}><span>Ivory</span></label>
          <label class="choice-chip"><input type="radio" name="theme" value="cozy-espresso" data-setting="theme" ${state.preferences.theme === "cozy-espresso" ? "checked" : ""}><span>Espresso</span></label>
        </div>
      </fieldset>
      <fieldset>
        <legend>Visual feel</legend>
        <div class="choice-row">
          <label class="choice-chip"><input type="radio" name="intensity" value="soft" data-setting="intensity" ${state.preferences.intensity === "soft" ? "checked" : ""}><span>Soft</span></label>
          <label class="choice-chip"><input type="radio" name="intensity" value="standard" data-setting="intensity" ${state.preferences.intensity === "standard" ? "checked" : ""}><span>More contrast</span></label>
        </div>
      </fieldset>
    </div>`;
}

function pageHeading(eyebrow, title, copy) {
  return `<section class="page-heading"><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${copy}</p></section>`;
}

function renderSettings() {
  const themes = [
    ["executive-ivory", "Executive Ivory", "Muted ink and warm paper"],
    ["soft-sage", "Soft Sage", "Quiet moss and stone"],
    ["champagne-glow", "Champagne Glow", "Warm light, gently"],
    ["cozy-espresso", "Cozy Espresso", "A darker, low-glare room"],
    ["playful-pastel", "Playful Pastel", "Soft color, easy edges"],
  ];
  const toggles = [
    ["petEnabled", "Companion pet", "A small friend on your dashboard"],
    ["gamesEnabled", "Play Break games", "Optional games and gentle breaks"],
    ["soundsEnabled", "Soft sounds", "A quiet tone only after you tap"],
    ["animationsEnabled", "Animations", "Small visual movement"],
    ["gamificationEnabled", "Wins and collectibles", "Private, no-streak milestones"],
  ];
  return `
    ${pageHeading("Make it yours", "Vibe settings", "Nothing here is permanent. Pick what feels easiest on your senses today.")}
    <section class="card settings-page-card">
      <h2>Choose a color world</h2>
      <div class="theme-options">${themes.map(([id, title, description]) => `
        <label class="theme-choice theme-${id}${state.preferences.theme === id ? " selected" : ""}">
          <input type="radio" name="theme" value="${id}" data-setting="theme" ${state.preferences.theme === id ? "checked" : ""}>
          <span class="theme-swatch" aria-hidden="true"></span><span class="theme-choice-copy"><strong>${title}</strong><small>${description}</small></span>
        </label>`).join("")}</div>
      <fieldset class="settings-fieldset">
        <legend>Visual feel</legend>
        <div class="choice-row">
          <label class="choice-chip"><input type="radio" name="intensity" value="soft" data-setting="intensity" ${state.preferences.intensity === "soft" ? "checked" : ""}><span>Soft</span></label>
          <label class="choice-chip"><input type="radio" name="intensity" value="standard" data-setting="intensity" ${state.preferences.intensity === "standard" ? "checked" : ""}><span>More contrast</span></label>
        </div>
      </fieldset>
      <label class="setting-toggle"><span><strong>Low-stimulation mode</strong><small>Fewer shadows, colors, and movements.</small></span><input type="checkbox" data-setting="lowStimulation" ${state.preferences.lowStimulation ? "checked" : ""}></label>
      <h2 class="settings-subheading">Optional extras</h2>
      <div class="toggle-list">${toggles.map(([key, title, description]) => `
        <label class="setting-toggle"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-setting="${key}" ${state.preferences[key] ? "checked" : ""}></label>`).join("")}</div>
      <label class="setting-toggle"><span><strong>Celebration size</strong><small>Nothing is lost if you choose none.</small></span>
        <select data-setting="celebrations" aria-label="Celebration size">
          ${["none", "subtle", "medium", "maximum"].map((size) => `<option value="${size}" ${state.preferences.celebrations === size ? "selected" : ""}>${size[0].toUpperCase()}${size.slice(1)}</option>`).join("")}
        </select>
      </label>
      <p class="helper-text settings-reduced-note">${window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "Your device asks for reduced motion; the app is honoring that preference." : "Reduced-motion preferences from your device are respected automatically."}</p>
    </section>
    <p class="privacy-note">These settings are stored only in this browser on this device. This app does not have sign-in or cloud sync.</p>`;
}

function petFace(appearance = state.companion.appearance) {
  const faces = { cat: "🐈", dragon: "🐉", hedgehog: "🦔", owl: "🦉" };
  return faces[appearance] ?? faces.cat;
}

function renderCompanionCard() {
  if (!state.preferences.petEnabled || !state.companion.visible) return "";
  return `
    <section class="companion-card">
      <button class="companion-face pet-tap" type="button" data-action="pet-interact" aria-label="Say hello to ${escapeHtml(state.companion.name)}">${petFace()}<span class="pet-accessory" aria-hidden="true">${accessoryMark()}</span></button>
      <div><p class="eyebrow">Trail buddy</p><p><strong>${escapeHtml(state.companion.name)}</strong> is here. ${escapeHtml(petReaction || "No rush. We can just sit a minute.")}</p></div>
      <button class="text-button companion-link" type="button" data-view="pet">Pet sanctuary</button>
    </section>`;
}

function accessoryMark() {
  return ({ none: "", leaf: "🍃", flower: "🌼", star: "⭐", scarf: "🧣" })[state.companion.accessory] ?? "";
}

function renderPet() {
  const milestones = [
    ["first-task", "First little win"],
    ["first-priority", "A priority completed"],
    ["first-focus", "First focus session"],
    ["first-break", "First intentional break"],
    ["first-help", "Asked for help"],
  ];
  return `
    ${pageHeading("A quiet corner", "Pet Sanctuary", "Your companion has no needs, timers, or sad moods. Visit when it feels nice; hide it whenever you want.")}
    <section class="card pet-sanctuary">
      <div class="sanctuary-portrait" aria-live="polite"><button class="sanctuary-face pet-tap" type="button" data-action="pet-interact" aria-label="Give ${escapeHtml(state.companion.name)} a gentle hello">${petFace()}<span class="pet-accessory" aria-hidden="true">${accessoryMark()}</span></button><strong>${escapeHtml(state.companion.name || "Moss")}</strong><span>${escapeHtml(petReaction || "Keeping you company, quietly.")}</span><small>Tap your friend for a tiny hello.</small></div>
      <div class="pet-controls">
        <label class="reset-label" for="pet-name">Give your friend a name</label>
        <div class="input-row"><input id="pet-name" maxlength="24" value="${escapeHtml(petNameDraft || state.companion.name)}" autocomplete="off"><button type="button" class="button button-primary" data-action="save-pet-name">Save name</button></div>
        <fieldset class="settings-fieldset"><legend>Choose a look</legend><div class="pet-choices">${[["cat", "Cat"], ["dragon", "Tiny dragon"], ["hedgehog", "Hedgehog"], ["owl", "Owl"]].map(([value, name]) => `
          <button type="button" class="pet-choice${state.companion.appearance === value ? " selected" : ""}" data-action="pet-appearance" data-value="${value}" aria-pressed="${state.companion.appearance === value}"><span aria-hidden="true">${petFace(value)}</span>${name}</button>`).join("")}</div></fieldset>
        <fieldset class="settings-fieldset"><legend>Choose a tiny accessory</legend><div class="pet-choices">${[["none", "None"], ["leaf", "Leaf"], ["flower", "Flower"], ["star", "Star"], ["scarf", "Scarf"]].map(([value, name]) => `
          <button type="button" class="pet-choice${state.companion.accessory === value ? " selected" : ""}" data-action="pet-accessory" data-value="${value}" aria-pressed="${state.companion.accessory === value}">${name}</button>`).join("")}</div></fieldset>
        <h2>Little things you’ve done</h2>
        <ul class="milestone-list">${milestones.map(([id, title]) => `<li class="${state.companion.milestones.includes(id) ? "earned" : "not-earned"}"><span aria-hidden="true">${state.companion.milestones.includes(id) ? "✦" : "○"}</span>${title}</li>`).join("")}</ul>
        <button type="button" class="button button-secondary" data-action="toggle-pet-visibility">${state.companion.visible ? "Hide pet from dashboard" : "Show pet on dashboard"}</button>
        <p class="helper-text">Turn the companion off completely in Vibe Settings. Milestones never expire.</p>
      </div>
    </section>`;
}

function formatTime(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remainder = Math.max(0, seconds) % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function renderFocus() {
  const presets = [[10, 5], [15, 5], [25, 5], [45, 15]];
  const selectedTask = state.tasks.find((task) => task.id === focusTimer.taskId);
  const helperOptions = ["Two-minute version", "Five-minute version", "Just open the document", "One tiny physical first step", "Do it badly", "Ask for help"];
  const timerDisplay = focusTimer.kind === "break" && focusTimer.seconds === 0 ? "Ready for a pause" : formatTime(focusTimer.seconds || focusTimer.preset * 60);
  return `
    ${pageHeading("Use a little focus, if it helps", "Focus Toolkit", "A timer is just a container for a little time. Stop early, pause, or switch tasks whenever you need.")}
    <div class="focus-grid">
      <section class="card timer-card">
        <p class="eyebrow">${focusTimer.kind === "transition" ? "Switching gears" : focusTimer.kind === "break" ? "A suggested pause" : "Your own small pocket of time"}</p>
        <div class="timer-display" role="timer" aria-live="off">${timerDisplay}</div>
        <p class="timer-caption">${focusTimer.running ? "You’re doing it. Nothing else is required." : focusTimer.seconds ? "Paused whenever you need." : "No rush to press start."}</p>
        <div class="preset-row">${presets.map(([focus, rest]) => `<button type="button" class="preset-button${focusTimer.preset === focus ? " selected" : ""}" data-action="focus-preset" data-value="${focus}" aria-pressed="${focusTimer.preset === focus}">${focus}/${rest}</button>`).join("")}</div>
        <label class="focus-label" for="focus-task">Attach to a real task (optional)</label>
        <select id="focus-task">
          <option value="">Just focus; no task attached</option>
          ${openTasks().map((task) => `<option value="${escapeHtml(task.id)}" ${focusTimer.taskId === task.id ? "selected" : ""}>${escapeHtml(task.title)}</option>`).join("")}
        </select>
        ${selectedTask ? `<div class="attached-task"><span>With</span><strong>${escapeHtml(selectedTask.title)}</strong></div>` : ""}
        <div class="button-row timer-actions">
          <button type="button" class="button button-primary" data-action="toggle-focus">${focusTimer.running ? "Pause timer" : "Start gentle timer"}</button>
          <button type="button" class="button button-secondary" data-action="reset-focus">Reset</button>
        </div>
      </section>
      <section class="card start-helper-card">
        <p class="eyebrow">When starting feels sticky</p><h2>Help me start</h2>
        ${openTasks().length ? `
          <label class="focus-label" for="help-task">Choose one of your tasks</label>
          <select id="help-task"><option value="">Pick a task</option>${openTasks().map((task) => `<option value="${escapeHtml(task.id)}" ${helpTaskId === task.id ? "selected" : ""}>${escapeHtml(task.title)}</option>`).join("")}</select>
          ${helpTaskId ? `<div class="start-prompts">${helperOptions.map((option) => `<button class="start-prompt" type="button" data-action="start-suggestion" data-value="${escapeHtml(option)}"><span aria-hidden="true">✦</span>${option}</button>`).join("")}</div>` : `<p class="empty-state">Pick an existing task. We won’t guess what it involves.</p>`}
          ${helpSuggestion ? `<p class="helper-text start-reaction">${escapeHtml(helpSuggestion)}</p>` : ""}`
          : `<div class="empty-state"><p>No task needed.</p><span>Add one first if you want to try a tiny-start prompt.</span></div>`}
      </section>
      <section class="card transition-card">
        <p class="eyebrow">Before moving to the next thing</p><h2>Transition timer</h2><p>Give yourself a little runway between activities. No calendar connection is set up.</p>
        <label class="focus-label" for="transition-minutes">Minutes to transition</label>
        <div class="input-row"><input id="transition-minutes" type="number" min="1" max="60" value="${focusTimer.transitionMinutes}"><button type="button" class="button button-secondary" data-action="start-transition">${focusTimer.kind === "transition" && focusTimer.running ? "Restart transition" : "Start transition"}</button></div>
        <div class="commitment-empty"><span aria-hidden="true">☁</span><p><strong>No next commitment is connected.</strong><br>There’s no calendar data here, so no time remaining or travel estimate is shown.</p></div>
      </section>
    </div>`;
}

function renderGarden() {
  return `
    ${pageHeading("A private shelf of real things", "Wins Garden", "Collectibles come from things you actually do here. No leaderboard, no lost streaks, no need to earn anything.")}
    <section class="card garden-card">
      <div class="garden-sky" aria-hidden="true"><span>✿</span><span>✧</span><span>❋</span><span>✦</span><span>❀</span></div>
      ${state.preferences.gamificationEnabled ? `
        <p class="garden-count">${state.wins.length} ${state.wins.length === 1 ? "little marker" : "little markers"} on your shelf</p>
        ${state.wins.length ? `<ul class="wins-shelf">${state.wins.map((win) => `<li class="win-card"><span aria-hidden="true">${win.kind === "focus" ? "⏳" : win.kind === "rest" ? "☕" : win.kind === "help" ? "🤝" : "✿"}</span><strong>${escapeHtml(win.title)}</strong><small>${win.createdAt ? new Date(win.createdAt).toLocaleDateString() : "Saved on this device"}</small></li>`).join("")}</ul>` : `<div class="empty-state roomy"><p>Your shelf is still yours, even when it’s empty.</p><span>A task completion, focus session, real break, or ask for help can add a small marker.</span></div>`}`
        : `<div class="empty-state roomy"><p>Collectibles are switched off.</p><span>Your tasks and progress stay right where they are. Turn on “Wins and collectibles” in Vibe Settings whenever you like.</span></div>`}
      ${state.ideas.length ? `<h2 class="saved-ideas-heading">Ideas you chose to keep</h2><ul class="idea-list">${state.ideas.map((idea) => `<li><span>${escapeHtml(idea.kind === "calendar-note" ? "Calendar note" : "Idea")}</span>${escapeHtml(idea.title)}<button type="button" class="icon-button" data-action="delete-idea" data-id="${escapeHtml(idea.id)}">Remove</button></li>`).join("")}</ul>` : ""}
    </section>`;
}

function renderBrainDump() {
  return `
    ${pageHeading("No organizing required", "Brain Dump Bubbles", "Type fast thoughts here. Bubbles stay private on this device until you decide what to do with them.")}
    <section class="card dump-card">
      <form class="task-form" data-form="dump">
        <label for="dump-input">Drop in a thought</label><div class="input-row"><input id="dump-input" name="thought" maxlength="240" placeholder="One thought at a time is enough"><button class="button button-primary" type="submit">Make a bubble</button></div>
      </form>
      <div class="bubble-field" aria-live="polite">${state.bubbles.length ? state.bubbles.map((bubble, index) => `<button type="button" class="thought-bubble bubble-${index % 4}" data-action="pick-bubble" data-id="${escapeHtml(bubble.id)}">${escapeHtml(bubble.title)}<span>choose what to do</span></button>`).join("") : `<p class="empty-state">No bubbles yet. This space is allowed to be empty.</p>`}</div>
      ${pendingThought ? `<div class="confirm-panel" role="dialog" aria-labelledby="confirm-thought-title"><h2 id="confirm-thought-title">Where should this thought go?</h2><p>“${escapeHtml(state.bubbles.find((bubble) => bubble.id === pendingThought)?.title ?? "")}”</p>
        <div class="thought-actions">${[["task", "Make a loose task"], ["idea", "Keep as an idea"], ["calendar-note", "Keep a calendar note"], ["let-go", "Let it go"], ["decision", "Needs a decision"]].map(([kind, label]) => `<button type="button" class="thought-action" data-action="confirm-thought-kind" data-value="${kind}">${label}</button>`).join("")}</div>
        <p class="helper-text">Calendar note means a note in this app only; no calendar is connected.</p><button class="text-button" type="button" data-action="cancel-thought">Cancel</button></div>` : ""}
      ${pendingThoughtKind ? `<div class="confirm-panel" role="alertdialog" aria-labelledby="confirm-save-title"><h2 id="confirm-save-title">Confirm this choice?</h2><p>${pendingThoughtKind === "task" ? "This will create a loose task in this browser." : pendingThoughtKind === "idea" ? "This will keep the thought on your private Wins Garden page." : pendingThoughtKind === "calendar-note" ? "This will save a private note here, not create a calendar event." : pendingThoughtKind === "decision" ? "This will keep the thought as an idea to decide later." : "This will remove the bubble. This cannot be undone."}</p><div class="button-row"><button type="button" class="button button-primary" data-action="commit-thought">Yes, do that</button><button type="button" class="button button-secondary" data-action="cancel-thought">Keep the bubble</button></div></div>` : ""}
    </section>`;
}

function renderPlay() {
  const categories = ["Family", "School", "Household", "Business", "Speaking", "Personal"];
  const towerBlocks = state.wins.filter((win) => ["focus", "priority", "task"].includes(win.kind)).length;
  const questTask = openTasks()[0];
  return `
    ${pageHeading("Optional, short, no score", "Play Break", "Pick one tiny game or break. No countdowns unless you start them, and no progress is lost if you leave.")}
    <section class="card quest-card">
      <div><p class="eyebrow">Daily Tiny Quest · optional</p><h2>${questTask ? `Choose one real task: “${escapeHtml(questTask.title)}”` : "There’s no task to work on right now."}</h2><p>${questTask ? "If you really finished it, marking it done is the whole quest. Or skip it." : "You can take a real break or leave this blank. No made-up chores."}</p></div>
      <div class="button-row">${questTask ? `<button type="button" class="button button-primary" data-action="quest-complete-task" data-id="${escapeHtml(questTask.id)}">I finished this task</button>` : `<button type="button" class="button button-secondary" data-action="start-break" data-value="Water">Take a water break</button>`}
      <button type="button" class="text-button" data-action="skip-quest">Skip today’s quest</button></div>
    </section>
    <div class="games-grid">
      <section class="card game-card"><p class="eyebrow">Match the Chaos</p><h2>Find matching household icons</h2><p>A tiny memory game. A match is enough.</p>
        <p class="helper-text">${state.playStats.matchWins} ${state.playStats.matchWins === 1 ? "round" : "rounds"} finished, saved here privately.</p>
        ${matchCards.length ? `<div class="memory-grid">${matchCards.map((card, index) => `<button type="button" class="memory-card${matchOpen.includes(index) || matchMatched.includes(index) ? " revealed" : ""}" data-action="flip-card" data-value="${index}" aria-label="Memory card ${index + 1}">${matchOpen.includes(index) || matchMatched.includes(index) ? card : "✦"}</button>`).join("")}</div><p class="game-result">${matchMatched.length === matchCards.length ? "A matchy little victory. You can play again or stop here." : `${matchMatched.length / 2} matches`}</p>` : ""}
        <button type="button" class="button button-secondary" data-action="new-match">${matchCards.length ? "Shuffle and play again" : "Deal six pairs"}</button></section>
      <section class="card game-card"><p class="eyebrow">Sort the Day</p><h2>Give a thought a shelf</h2><p>Only items you type here. They are saved locally as your own categories, not imported from anywhere.</p>
        <form class="task-form" data-form="sort-item"><label for="sort-input">Add one item</label><div class="input-row"><input id="sort-input" name="item" maxlength="180" placeholder="Something you want to sort"><button class="button button-secondary" type="submit">Add</button></div></form>
        ${sorterDraft ? `<div class="sort-prompt"><strong>${escapeHtml(sorterDraft)}</strong>${categories.map((category) => `<button type="button" class="category-chip" data-action="sort-item" data-value="${category}">${category}</button>`).join("")}</div>` : ""}
        ${state.playStats.sorterItems.length ? `<ul class="sorted-items">${state.playStats.sorterItems.slice(0, 8).map((item) => `<li><span>${escapeHtml(item.category)}</span>${escapeHtml(item.title)}<button type="button" class="icon-button" data-action="remove-sort-item" data-id="${escapeHtml(item.id)}" aria-label="Remove sorted item">Remove</button></li>`).join("")}</ul>` : ""}
        <p class="helper-text">${state.playStats.sorterItems.length} ${state.playStats.sorterItems.length === 1 ? "item" : "items"} sorted on this device.</p></section>
      <section class="card game-card tower-card"><p class="eyebrow">Priority Tower</p><h2>Build with real wins</h2><p>Completed priorities and focus sessions become quiet decorative blocks.</p>
        <div class="tower">${Array.from({ length: Math.min(towerBlocks, 12) }, (_, index) => `<span class="tower-block block-${index % 4}"></span>`).join("") || `<span class="tower-empty">A calm, empty tower.</span>`}</div><p class="helper-text">${towerBlocks} blocks from completed work. No points are lost.</p></section>
      <section class="card game-card reset-break-card"><p class="eyebrow">Five-Minute Reset</p><h2>Choose a gentle break</h2><p>Use your own sound or silence. This app never starts audio automatically.</p>
        ${playBreakChoice ? `<div class="break-active"><strong>${escapeHtml(playBreakChoice)}</strong><span>${formatTime(playBreakSeconds)}</span><button type="button" class="button button-primary" data-action="finish-break">I’m back</button><button type="button" class="text-button" data-action="cancel-break">Stop timer</button></div>` : `<div class="break-options">${["Stretch", "Water", "Breathe", "Step outside", "Tidy one small thing", "Calming sound", "Pet your companion"].map((item) => `<button type="button" class="break-option" data-action="start-break" data-value="${item}" ${item === "Pet your companion" && !state.preferences.petEnabled ? "disabled" : ""}>${item}</button>`).join("")}</div>`}
      </section>
    </div>`;
}

let pendingThoughtKind = "";

function renderMore() {
  const cards = [
    ...(state.preferences.gamificationEnabled ? [["universe", "Little Universe", "A map that grows only from your real activity.", "✧"]] : []),
    ["settings", "Vibe Settings", "Themes, sensory controls, and optional extras.", "⚙"],
    ["pet", "Pet Sanctuary", "Name a companion or turn it off completely.", petFace()],
    ["garden", "Wins Garden", "A private shelf of real little wins.", "✿"],
    ["dump", "Brain Dump Bubbles", "Capture thoughts first; decide later.", "☁"],
    ["quest", "Daily Tiny Quest", "One optional task, based on your real list.", "✧"],
  ];
  if (state.preferences.gamesEnabled) cards.splice(2, 0, ["play", "Play Break", "Short games and a five-minute reset.", "♧"]);
  return `${pageHeading("Everything is optional", "More little spaces", "Open only what feels useful. Nothing is hidden behind a streak or a score.")}
    <div class="more-grid">${cards.map(([destination, title, description, icon]) => `<button type="button" class="more-card" data-view="${destination}"><span aria-hidden="true">${icon}</span><strong>${title}</strong><small>${description}</small><em>Open <span aria-hidden="true">→</span></em></button>`).join("")}</div>
    ${safetyNote()}`;
}

function worldLevel() {
  return Math.floor(state.gameWorld.experience / 100) + 1;
}

function renderUniverse() {
  const places = [
    ["trailhead", "Rainy Trailhead", "You are here", 0, "☁"],
    ["mossy-canopy", "Mossy Canopy", "A ferny place to wander", 50, "🌿"],
    ["tidepool-bay", "Tidepool Bay", "Little worlds inside little worlds", 120, "🌊"],
    ["starglass-summit", "Starglass Summit", "A sky full of room", 240, "✦"],
  ];
  const xp = state.gameWorld.experience;
  const nextPlace = places.find((place) => place[3] > xp);
  const progress = nextPlace ? Math.min(100, Math.round((xp / nextPlace[3]) * 100)) : 100;
  return `${pageHeading("A world that only grows with you", "The Little Universe", "No race, no lives, no getting locked out. New places appear as little decorations for real things you’ve done.")}
    <section class="card universe-card">
      <div class="universe-header"><span class="universe-moon" aria-hidden="true">✦</span><div><p class="eyebrow">Your gentle adventurer level</p><h2>Level ${worldLevel()} · ${xp} star dust</h2><p>Every point stays private on this device. Nothing disappears.</p></div></div>
      ${nextPlace ? `<div class="world-progress"><div class="progress-label"><span>Next little place: ${nextPlace[1]}</span><span>${xp} / ${nextPlace[3]} dust</span></div><div class="progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="Progress toward next place"><span style="width:${progress}%"></span></div></div>` : `<p class="world-progress">You’ve found all the little places. The map is yours to revisit.</p>`}
      <div class="world-map">${places.map(([id, title, description, threshold, icon]) => {
        const unlocked = xp >= threshold;
        const discovered = state.gameWorld.discoveredLocations.includes(id) || unlocked;
        return `<article class="world-place ${unlocked ? "unlocked" : "locked"}${discovered ? " discovered" : ""}"><span class="place-icon" aria-hidden="true">${unlocked ? icon : "☁"}</span><h3>${unlocked ? title : "A place still in the mist"}</h3><p>${unlocked ? description : "It can wait. Nothing is lost."}</p>${unlocked ? `<span class="place-status">${discovered ? "On your map" : "Ready to discover"}</span>` : `<span class="place-status">${threshold - xp} more star dust, whenever</span>`}</article>`;
      }).join("")}</div>
      <button type="button" class="button button-secondary" data-action="pet-interact">Visit ${escapeHtml(state.companion.name)} · add a little stardust</button>
      <p class="helper-text">If you prefer no game layer, switch off gamification in Vibe Settings. Your tasks still work normally.</p>
    </section>`;
}

function renderQuest() {
  const task = openTasks()[0];
  const doneToday = state.quest.date === new Date().toDateString() && state.quest.complete;
  const skippedToday = state.quest.date === new Date().toDateString() && state.quest.skipped;
  return `${pageHeading("Optional and one-and-done", "Daily Tiny Quest", "A little nudge based on things you actually wrote down. No streaks. Skip today or rest without losing anything.")}
    <section class="card quest-card">
      ${doneToday ? `<p class="eyebrow">That’s plenty</p><h2>Quest done. Nothing else to keep up with.</h2><p>You can close this page, take a break, or leave things for later.</p>`
        : skippedToday ? `<p class="eyebrow">You chose to skip</p><h2>All good. Nothing is waiting for you here.</h2><p>Come back when it suits you. There’s no streak to protect.</p>`
        : task ? `<p class="eyebrow">One real task, no extra chores</p><h2>${escapeHtml(task.title)}</h2><p>If you’ve finished this, mark it complete. If not, there’s no pressure to claim it.</p><button type="button" class="button button-primary" data-action="quest-complete-task" data-id="${escapeHtml(task.id)}">Mark this task done</button>`
          : `<p class="eyebrow">Nothing new to add</p><h2>You have no open tasks right now.</h2><p>That’s not a problem. Take a five-minute pause or close this quest.</p><button type="button" class="button button-secondary" data-action="start-break" data-value="Water">Take a water break</button>`}
      ${!doneToday && !skippedToday ? `<button type="button" class="text-button" data-action="skip-quest">Skip the quest</button>` : ""}</section>`;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function playTone() {
  if (!state.preferences.soundsEnabled || !window.AudioContext) return;
  const context = new window.AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 587.33;
  gain.gain.setValueAtTime(0.035, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.22);
  oscillator.addEventListener("ended", () => context.close(), { once: true });
}

function addStarDust(points) {
  if (!state.preferences.gamificationEnabled) return;
  state.gameWorld.experience += points;
  state.gameWorld.discoveredLocations = ["trailhead"];
  if (state.gameWorld.experience >= 50) state.gameWorld.discoveredLocations.push("mossy-canopy");
  if (state.gameWorld.experience >= 120) state.gameWorld.discoveredLocations.push("tidepool-bay");
  if (state.gameWorld.experience >= 240) state.gameWorld.discoveredLocations.push("starglass-summit");
}

function markWin(title, kind = "task", milestone = "") {
  if (milestone && !state.companion.milestones.includes(milestone)) {
    state.companion.milestones.push(milestone);
  }
  if (state.preferences.gamificationEnabled) {
    state.wins.unshift({ id: newId(), title, kind, createdAt: new Date().toISOString() });
    const dustByKind = { task: 10, priority: 15, focus: 15, rest: 10, help: 12, game: 8 };
    addStarDust(dustByKind[kind] ?? 5);
  }
  if (state.preferences.petEnabled) state.companion.bond += 1;
  if (state.preferences.petEnabled) {
    petReaction = kind === "rest" ? "A little rest counts, too." : kind === "help" ? "Asking for help is brave." : "That was a real thing you did. Nice.";
  }
  if (state.preferences.celebrations !== "none") celebrationPending = true;
  playTone();
}

function completeQuest() {
  state.quest = { date: new Date().toDateString(), complete: true, skipped: false };
}

function stopFocusTimer() {
  if (timerHandle !== null) window.clearInterval(timerHandle);
  timerHandle = null;
}

function startFocusTimer() {
  if (focusTimer.running) {
    stopFocusTimer();
    focusTimer.running = false;
    announcement = "Timer paused. It will wait right here.";
    render();
    return;
  }
  if (focusTimer.kind !== "focus") focusTimer.kind = "focus";
  if (focusTimer.seconds <= 0) focusTimer.seconds = focusTimer.preset * 60;
  focusTimer.running = true;
  stopFocusTimer();
  timerHandle = window.setInterval(() => {
    focusTimer.seconds = Math.max(0, focusTimer.seconds - 1);
    if (focusTimer.seconds === 0) {
      stopFocusTimer();
      focusTimer.running = false;
      if (focusTimer.kind === "focus") {
        state.focusSessionsCompleted += 1;
        markWin("A focus session finished", "focus", "first-focus");
        focusTimer.kind = "break";
        announcement = "You finished a focus session. A break is here if you want it.";
      } else {
        announcement = "The transition timer is done. Take the time you need.";
        focusTimer.kind = "focus";
        focusTimer.seconds = 0;
      }
      persist();
      render();
    } else {
      render();
    }
  }, 1000);
  announcement = "Timer started. You can pause any time.";
  render();
}

function startBreak(choice) {
  if (breakHandle !== null) window.clearInterval(breakHandle);
  playBreakChoice = choice;
  playBreakSeconds = 300;
  breakHandle = window.setInterval(() => {
    playBreakSeconds = Math.max(0, playBreakSeconds - 1);
    if (playBreakSeconds === 0) finishBreak(false);
    else render();
  }, 1000);
  announcement = `Five-minute ${choice.toLowerCase()} break started. You can finish early or stop.`;
  render();
}

function finishBreak(early = true) {
  if (breakHandle !== null) window.clearInterval(breakHandle);
  breakHandle = null;
  const completesQuest = ["play", "quest"].includes(view) && openTasks().length === 0;
  playBreakChoice = "";
  markWin(early ? "Took a break" : "Finished a five-minute break", "rest", "first-break");
  if (completesQuest) completeQuest();
  persist(early ? "That break counts. No need to do more." : "Five-minute break complete. Take the time you need.");
  render();
}

function launchCelebration() {
  const layer = app.querySelector(".celebration-layer");
  if (!layer) return;
  const sizes = { subtle: 4, medium: 9, maximum: 14 };
  const marks = ["✦", "✧", "✿", "·"];
  for (let index = 0; index < (sizes[state.preferences.celebrations] ?? 0); index += 1) {
    const star = document.createElement("span");
    star.className = "celebration-spark";
    star.textContent = marks[index % marks.length];
    star.style.left = `${16 + Math.random() * 68}%`;
    star.style.setProperty("--spark-delay", `${Math.random() * 240}ms`);
    layer.append(star);
    window.setTimeout(() => star.remove(), 1500);
  }
}

function startMatchGame() {
  const icons = ["🏠", "🧺", "📚", "🌿", "☕", "🧸"];
  matchCards = [...icons, ...icons].sort(() => Math.random() - 0.5);
  matchOpen = [];
  matchMatched = [];
}

function renderReset() {
  if (resetStep === 0) {
    return `
      <section class="reset-panel card">
        <p class="eyebrow">A small pause, if you want one</p>
        <h1>Let’s make this moment a little smaller.</h1>
        <p class="reset-copy">This is optional. Skip anything that does not feel right, or leave whenever you want. There is no right way to do this.</p>
        <div class="reset-prompt"><span class="step-number">01</span><div><h2>Pause for a moment</h2><p>If it feels okay, let your shoulders drop or notice one thing around you. You can also just move on.</p></div></div>
        <div class="button-row">
          <button type="button" class="button button-primary" data-action="reset-next">Continue</button>
          <button type="button" class="button button-secondary" data-action="reset-skip">Skip to today</button>
        </div>
        ${safetyNote()}</section>`;
  }
  if (resetStep === 1) {
    return `
      <section class="reset-panel card">
        <p class="eyebrow">Step 1 of 2</p>
        <h1>What would help most right now?</h1>
        <p class="reset-copy">Pick one if you like. “I’m not sure” is a complete answer.</p>
        <div class="reset-options">${resetChoices.map((choice) => `
          <button type="button" class="reset-option${resetNeed === choice ? " selected" : ""}" data-action="choose-need" data-value="${escapeHtml(choice)}" aria-pressed="${resetNeed === choice}">${escapeHtml(choice)}</button>
        `).join("")}</div>
        <div class="button-row">
          <button type="button" class="button button-primary" data-action="reset-next">Continue</button>
          <button type="button" class="button button-secondary" data-action="reset-back">Back</button>
          <button type="button" class="text-button" data-action="reset-skip">Leave reset</button>
        </div>
        ${safetyNote()}</section>`;
  }
  return `
    <section class="reset-panel card">
      <p class="eyebrow">${resetNeed ? "A tiny win, if you want one" : "Step 2 of 2"}</p>
      <h1>${resetNeed ? "What could make today a little easier?" : "What is one small thing you could do?"}</h1>
      <p class="reset-copy">It can take a minute or less. It can also be rest, asking for help, or choosing nothing right now.</p>
      <div class="reset-summary"><span>You said might help</span><strong>${escapeHtml(resetNeed || "Taking this one moment at a time")}</strong></div>
      <label class="reset-label" for="reset-action">A tiny next step, in your own words <span>(optional)</span></label>
      <textarea id="reset-action" rows="3" maxlength="240" placeholder="For example: put a glass of water nearby">${escapeHtml(resetAction)}</textarea>
      <label class="save-step-toggle"><input type="checkbox" id="save-reset-task"> <span>Add this to my loose tasks</span></label>
      <div class="button-row">
        <button type="button" class="button button-primary" data-action="finish-reset">Finish reset</button>
        <button type="button" class="button button-secondary" data-action="reset-back">Back</button>
        <button type="button" class="text-button" data-action="reset-skip">Leave reset</button>
      </div>
      <p class="helper-text">Nothing here is a test. You can stop at any point.</p>
      ${safetyNote()}</section>`;
}

function safetyNote() {
  return `
    <aside class="safety-note" aria-label="Important support information">
      <span class="safety-mark" aria-hidden="true">i</span>
      <p><strong>This app is not emergency support.</strong> If you or someone else is in immediate danger, contact your local emergency or crisis services.</p>
    </aside>`;
}

function render() {
  document.documentElement.dataset.theme = state.preferences.theme;
  document.documentElement.dataset.intensity = state.preferences.intensity;
  document.documentElement.dataset.lowStimulation = state.preferences.lowStimulation;
  document.documentElement.dataset.animations = state.preferences.animationsEnabled;
  document.documentElement.dataset.celebrations = state.preferences.celebrations;
  document.querySelector('meta[name="theme-color"]').content = getComputedStyle(document.documentElement).getPropertyValue("--page").trim();
  const views = {
    today: renderToday,
    inbox: renderInbox,
    reset: renderReset,
    settings: renderSettings,
    pet: renderPet,
    focus: renderFocus,
    garden: renderGarden,
    universe: renderUniverse,
    dump: renderBrainDump,
    play: renderPlay,
    quest: renderQuest,
    more: renderMore,
  };
  const content = (views[view] ?? renderToday)();
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="/" aria-label="StarBird, Today">
          <span class="brand-mark" aria-hidden="true">s</span>
          <span><strong>starbird</strong><small>one step at a time</small></span>
        </a>
        ${navigation()}
        <div class="sidebar-note"><span class="tiny-spark" aria-hidden="true">+</span><p>A gentle space to gather your thoughts. This is yours to shape.</p></div>
      </aside>
      <main class="main-content">
        <div class="mobile-brand"><span class="brand-mark" aria-hidden="true">s</span><strong>starbird</strong></div>
        <div class="content-wrap">${content}</div>
        <footer class="app-footer">Your information stays in this browser on this device.</footer>
      </main>
      <div class="mobile-nav">${navigation()}</div>
      ${state.preferences.celebrations !== "none" && state.preferences.animationsEnabled && !state.preferences.lowStimulation && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? '<div class="celebration-layer" aria-hidden="true"></div>' : ""}
    </div>`;
  statusRegion.textContent = announcement;
  announcement = "";
  if (celebrationPending) {
    celebrationPending = false;
    launchCelebration();
  }
}

function switchView(nextView) {
  view = nextView;
  if (nextView === "reset") {
    resetStep = 0;
    resetNeed = "";
    resetAction = "";
  }
  render();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || state.preferences.lowStimulation || !state.preferences.animationsEnabled) {
    window.scrollTo(0, 0);
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-view], [data-action]");
  if (!target) return;

  if (target.dataset.view) {
    switchView(target.dataset.view);
    return;
  }

  const { action, id, value, path } = target.dataset;
  if (action === "start-path") {
    if (path === "unload") {
      view = "inbox";
      announcement = "Your thought pile is ready. Add anything, in any order.";
      render();
      document.querySelector("#quick-task-input")?.focus();
    } else {
      view = "reset";
      resetStep = path === "tiny-win" ? 2 : 0;
      resetNeed = path === "tiny-win" ? "One very small task" : "";
      resetAction = "";
      render();
      window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches || state.preferences.lowStimulation || !state.preferences.animationsEnabled ? "auto" : "smooth" });
    }
  } else if (action === "delete-task") {
    state = deleteTask(state, id);
    persist("Task removed.");
    render();
  } else if (action === "priority-task") {
    const makePriority = !state.tasks.find((task) => task.id === id)?.priority;
    const result = setTaskPriority(state, id, makePriority);
    state = result.state;
    if (result.limitReached) {
      announcement = "You already have three next steps. Remove one before adding another.";
      render();
      return;
    }
    if (makePriority) markWin("Chose a next step", "step");
    persist("Next steps updated.");
    render();
  } else if (action === "reset-next") {
    resetStep = Math.min(resetStep + 1, 2);
    render();
  } else if (action === "reset-back") {
    resetStep = Math.max(resetStep - 1, 0);
    render();
  } else if (action === "reset-skip") {
    switchView("today");
  } else if (action === "choose-need") {
    resetNeed = value;
    render();
  } else if (action === "save-pet-name") {
    const name = document.querySelector("#pet-name").value.trim().slice(0, 24);
    state.companion.name = name || "Moss";
    petNameDraft = "";
    persist("Your companion has a name.");
    render();
  } else if (action === "pet-appearance") {
    state.companion.appearance = value;
    persist("Your companion has a new look.");
    render();
  } else if (action === "pet-accessory") {
    state.companion.accessory = value;
    persist("Accessory changed.");
    render();
  } else if (action === "pet-interact") {
    if (state.preferences.petEnabled) {
      state.companion.bond += 1;
      const greetings = ["A tiny hello, returned.", "A gentle nose boop.", "Your friend is quietly pleased to see you.", "A soft little tail wag. No task required."];
      petReaction = greetings[state.companion.bond % greetings.length];
      addStarDust(2);
      persist("A tiny hello, just because.");
      render();
    } else {
      announcement = "Turn on the companion in Vibe Settings to visit your pet.";
      statusRegion.textContent = announcement;
    }
  } else if (action === "toggle-pet-visibility") {
    state.companion.visible = !state.companion.visible;
    persist(state.companion.visible ? "Your companion is back on the dashboard." : "Your companion is tucked away.");
    render();
  } else if (action === "focus-preset") {
    focusTimer.preset = Number(value);
    focusTimer.seconds = 0;
    focusTimer.kind = "focus";
    state.focusSettings.preset = Number(value);
    persist("Timer choice saved here.");
    render();
  } else if (action === "toggle-focus") {
    startFocusTimer();
  } else if (action === "reset-focus") {
    stopFocusTimer();
    focusTimer = { ...focusTimer, seconds: 0, running: false, kind: "focus" };
    announcement = "Timer reset. Start again whenever you want.";
    render();
  } else if (action === "start-transition") {
    const minutes = Number(document.querySelector("#transition-minutes").value);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) {
      announcement = "Choose a transition from one to sixty minutes.";
      statusRegion.textContent = announcement;
      return;
    }
    stopFocusTimer();
    focusTimer.transitionMinutes = minutes;
    state.focusSettings.transitionMinutes = minutes;
    persist("Transition length saved.");
    focusTimer.kind = "transition";
    focusTimer.seconds = minutes * 60;
    focusTimer.running = false;
    startFocusTimer();
  } else if (action === "start-suggestion") {
    const task = state.tasks.find((item) => item.id === helpTaskId && !item.done);
    if (!task) {
      helpSuggestion = "Choose one of your open tasks first.";
      render();
      return;
    }
    if (value === "Ask for help") {
      markWin("Asked for help", "help", "first-help");
      helpSuggestion = "Asking for help is brave. You don’t have to do the next part alone.";
      persist("Asking for help is a real step.");
      render();
      return;
    }
    const prompts = {
      "Two-minute version": `Try two minutes with your task: “${task.title}”.`,
      "Five-minute version": `Try five minutes with your task: “${task.title}”.`,
      "Just open the document": `If it fits this task, just open the document for “${task.title}”. You can stop there.`,
      "One tiny physical first step": `What is one tiny physical first step toward “${task.title}”?`,
      "Do it badly": `Let “${task.title}” be a rough first attempt. Done imperfectly is allowed.`,
    };
    helpSuggestion = prompts[value] ?? "";
    if (value === "Two-minute version" || value === "Five-minute version") {
      focusTimer.preset = value === "Two-minute version" ? 2 : 5;
      focusTimer.seconds = 0;
      focusTimer.kind = "focus";
      focusTimer.taskId = task.id;
      state.focusSettings.preset = focusTimer.preset;
      state.focusSettings.taskId = task.id;
      persist("Tiny start saved to the timer.");
    }
    render();
  } else if (action === "pick-bubble") {
    pendingThought = id;
    pendingThoughtKind = "";
    render();
  } else if (action === "confirm-thought-kind") {
    pendingThoughtKind = value;
    render();
  } else if (action === "cancel-thought") {
    pendingThought = null;
    pendingThoughtKind = "";
    render();
  } else if (action === "commit-thought") {
    const thought = state.bubbles.find((bubble) => bubble.id === pendingThought);
    if (!thought || !pendingThoughtKind) {
      pendingThought = null;
      pendingThoughtKind = "";
      render();
      return;
    }
    const kind = pendingThoughtKind;
    state.bubbles = state.bubbles.filter((bubble) => bubble.id !== thought.id);
    if (kind === "task") {
      state = addTask(state, thought.title);
      addStarDust(3);
      announcement = "Confirmed. The thought is now a loose task.";
    } else if (kind !== "let-go") {
      const ideaKind = kind === "calendar-note" || kind === "decision" ? kind : "idea";
      state.ideas.unshift({ id: newId(), title: thought.title, kind: ideaKind, createdAt: new Date().toISOString() });
      addStarDust(2);
      announcement = kind === "calendar-note"
        ? "Saved as a note here; no calendar event was created."
        : kind === "decision"
          ? "Saved as something to decide later."
          : "Saved as an idea on your private shelf.";
    } else {
      announcement = "Bubble let go. Nothing else is needed.";
    }
    pendingThought = null;
    pendingThoughtKind = "";
    persist(announcement);
    render();
  } else if (action === "delete-idea") {
    state.ideas = state.ideas.filter((idea) => idea.id !== id);
    persist("Idea removed.");
    render();
  } else if (action === "remove-sort-item") {
    state.playStats.sorterItems = state.playStats.sorterItems.filter((item) => item.id !== id);
    persist("Sorted thought removed.");
    render();
  } else if (action === "new-match") {
    if (matchHideHandle !== null) window.clearTimeout(matchHideHandle);
    matchHideHandle = null;
    startMatchGame();
    render();
  } else if (action === "flip-card") {
    const index = Number(value);
    if (matchOpen.length >= 2 || matchOpen.includes(index) || matchMatched.includes(index)) return;
    matchOpen.push(index);
    if (matchOpen.length === 2) {
      const [first, second] = matchOpen;
      if (matchCards[first] === matchCards[second]) {
        matchMatched.push(first, second);
        matchOpen = [];
        if (matchMatched.length === matchCards.length) {
          state.playStats.matchWins += 1;
          markWin("Played a Match the Chaos round", "game");
          persist("You found all the pairs. You can stop here or play again.");
        }
      } else {
        matchHideHandle = window.setTimeout(() => {
          matchOpen = [];
          render();
        }, 800);
      }
    }
    render();
  } else if (action === "sort-item") {
    const item = sorterDraft.trim();
    if (!item) return;
    state.playStats.sorterItems.unshift({ id: newId(), title: item, category: value });
    sorterDraft = "";
    markWin("Sorted a thought", "game");
    persist("Thought sorted. You can move on or leave it here.");
    render();
  } else if (action === "start-break") {
    startBreak(value);
  } else if (action === "finish-break") {
    finishBreak(true);
  } else if (action === "cancel-break") {
    if (breakHandle !== null) window.clearInterval(breakHandle);
    breakHandle = null;
    playBreakChoice = "";
    announcement = "Break timer stopped. You can still take a break.";
    render();
  } else if (action === "quest-complete-task") {
    const task = state.tasks.find((item) => item.id === id && !item.done);
    if (task) {
      const completedTask = toggleTaskDone(state, id);
      state = completedTask;
      completeQuest();
      markWin(task.priority ? "Completed a priority" : "Completed a task", task.priority ? "priority" : "task", task.priority ? "first-priority" : "first-task");
      persist("Quest complete. One thing is plenty.");
      render();
    }
  } else if (action === "skip-quest") {
    state.quest = { date: new Date().toDateString(), complete: false, skipped: true };
    persist("Quest skipped. Nothing was lost.");
    announcement = "Quest skipped. Nothing was lost.";
    render();
  } else if (action === "finish-reset") {
    const actionInput = document.querySelector("#reset-action");
    const saveTask = document.querySelector("#save-reset-task").checked;
    resetAction = actionInput.value.trim();
    if (saveTask && resetAction) {
      state = addTask(state, resetAction);
      addStarDust(2);
      persist("Your step was added to loose tasks.");
    } else {
      announcement = "Reset finished. Take what helps and leave the rest.";
    }
    view = "today";
    resetStep = 0;
    render();
  }
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  if (form.dataset.form === "add-task") {
    const input = form.elements.title;
    if (!input.value.trim()) {
      input.focus();
      return;
    }
    state = addTask(state, input.value);
    addStarDust(2);
    persist("Task added to your loose tasks.");
    render();
    document.querySelector("#quick-task-input")?.focus();
  } else if (form.dataset.form === "dump") {
    const input = form.elements.thought;
    const title = input.value.trim().slice(0, 240);
    if (!title) {
      input.focus();
      return;
    }
    state.bubbles.unshift({ id: newId(), title });
    addStarDust(1);
    persist("Thought caught. Decide what to do with it later.");
    render();
    document.querySelector("#dump-input")?.focus();
  } else if (form.dataset.form === "sort-item") {
    const input = form.querySelector('input[name="item"]');
    if (!input) return;
    sorterDraft = input.value.trim().slice(0, 180);
    render();
  }
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches('[data-action="toggle-task"]')) {
    const task = state.tasks.find((item) => item.id === target.dataset.id);
    const completing = task && !task.done;
    const wasPriority = Boolean(task?.priority);
    state = toggleTaskDone(state, target.dataset.id);
    if (completing) {
      markWin(wasPriority ? "Completed a priority" : "Completed a task", wasPriority ? "priority" : "task", wasPriority ? "first-priority" : "first-task");
      persist(wasPriority ? "You completed a priority. The pet approves." : "You completed a task. That counts.");
    } else {
      persist("Task reopened. It can wait here.");
    }
    render();
  } else if (target.matches("[data-setting]")) {
    const value = target.type === "checkbox" ? target.checked : target.value;
    state = updatePreferences(state, { [target.dataset.setting]: value });
    persist("Setting updated.");
    render();
  } else if (target.matches("#focus-task")) {
    focusTimer.taskId = target.value;
    state.focusSettings.taskId = target.value;
    persist("Task attachment saved.");
    render();
  } else if (target.matches("#help-task")) {
    helpTaskId = target.value;
    helpSuggestion = "";
    render();
  } else if (target.matches("#transition-minutes")) {
    const minutes = Number(target.value);
    if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 60) {
      focusTimer.transitionMinutes = minutes;
      state.focusSettings.transitionMinutes = minutes;
      persist("Transition length saved.");
    }
  }
});

app.addEventListener("input", (event) => {
  if (event.target.matches("#reset-action")) resetAction = event.target.value;
  if (event.target.matches("#pet-name")) petNameDraft = event.target.value;
  if (event.target.matches("#sort-input")) sorterDraft = event.target.value;
});

render();
