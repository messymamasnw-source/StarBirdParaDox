import test from "node:test";
import assert from "node:assert/strict";
import {
  addTask,
  createInitialState,
  deleteTask,
  normalizeState,
  setTaskPriority,
  toggleTaskDone,
  updatePreferences,
} from "./storage.js";

test("starts with an empty task list and calm preferences", () => {
  const initial = createInitialState();
  assert.equal(initial.version, 1);
  assert.deepEqual(initial.tasks, []);
  assert.equal(initial.preferences.theme, "executive-ivory");
  assert.equal(initial.preferences.intensity, "soft");
  assert.equal(initial.companion.name, "Moss");
  assert.equal(initial.gameWorld.experience, 0);
});

test("normalizes stored values and rejects malformed tasks", () => {
  const state = normalizeState({
    tasks: [{ id: "ok", title: "Keep me" }, { title: "No id" }, null],
    preferences: { theme: "unknown", intensity: "standard" },
  });

  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].title, "Keep me");
  assert.equal(state.preferences.theme, "executive-ivory");
  assert.equal(state.preferences.intensity, "standard");
});

test("adds trimmed tasks and ignores empty input", () => {
  const initial = createInitialState();
  const added = addTask(initial, "  Fold the towels  ", "task-1");

  assert.equal(added.tasks[0].title, "Fold the towels");
  assert.equal(added.tasks[0].id, "task-1");
  assert.equal(addTask(added, "   "), added);
});

test("limits the active next-step list to three and clears priority when done", () => {
  let state = createInitialState();
  for (let index = 1; index <= 4; index += 1) {
    state = addTask(state, `Task ${index}`, `task-${index}`);
  }
  for (let index = 1; index <= 3; index += 1) {
    state = setTaskPriority(state, `task-${index}`, true).state;
  }

  const capped = setTaskPriority(state, "task-4", true);
  assert.equal(capped.limitReached, true);
  assert.equal(capped.state.tasks.filter((task) => task.priority).length, 3);

  const completed = toggleTaskDone(state, "task-1");
  assert.equal(completed.tasks.find((task) => task.id === "task-1").done, true);
  assert.equal(completed.tasks.find((task) => task.id === "task-1").priority, false);
});

test("deletes tasks and updates preferences without replacing other settings", () => {
  let state = addTask(createInitialState(), "One task", "task-1");
  state = updatePreferences(state, { theme: "cozy-espresso" });

  assert.equal(state.preferences.intensity, "soft");
  assert.equal(state.preferences.theme, "cozy-espresso");
  assert.equal(deleteTask(state, "task-1").tasks.length, 0);
});

test("migrates existing local tasks and legacy appearance preferences without changing task data", () => {
  const state = normalizeState({
    tasks: [{ id: "original-task", title: "Keep exact task", createdAt: "2025-01-01", priority: true, done: false }],
    preferences: { theme: "evening", intensity: "standard" },
  });

  assert.deepEqual(state.tasks[0], {
    id: "original-task",
    title: "Keep exact task",
    createdAt: "2025-01-01",
    priority: true,
    done: false,
  });
  assert.equal(state.preferences.theme, "cozy-espresso");
  assert.equal(state.preferences.gamesEnabled, true);
  assert.equal(state.preferences.soundsEnabled, false);
});

test("normalizes companion, universe and optional progress safely", () => {
  const state = normalizeState({
    companion: { name: "  Fern ", appearance: "owl", visible: false, accessory: "flower", milestones: ["first-break"], bond: 3 },
    gameWorld: { experience: 125, discoveredLocations: ["trailhead", "tidepool-bay", "unknown"] },
    playStats: { matchWins: 2, sorterItems: [{ id: "item", title: "School form", category: "School" }, { id: "bad", title: "x", category: "Unknown" }] },
    quest: { date: "today", complete: false, skipped: true },
  });

  assert.equal(state.companion.name, "Fern");
  assert.equal(state.companion.appearance, "owl");
  assert.equal(state.companion.visible, false);
  assert.deepEqual(state.gameWorld.discoveredLocations, ["trailhead", "tidepool-bay"]);
  assert.equal(state.gameWorld.experience, 125);
  assert.equal(state.playStats.sorterItems.length, 1);
  assert.equal(state.quest.skipped, true);
});
