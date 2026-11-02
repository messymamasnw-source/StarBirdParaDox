export const STORAGE_KEY = "starbird-command-center-v1";

export function createInitialState() {
  return {
    version: 1,
    tasks: [],
    preferences: {
      theme: "executive-ivory",
      intensity: "soft",
      lowStimulation: false,
      petEnabled: true,
      gamesEnabled: true,
      soundsEnabled: false,
      animationsEnabled: true,
      celebrations: "medium",
      gamificationEnabled: true,
    },
    companion: { name: "Moss", appearance: "cat", visible: true, accessory: "none", milestones: [], bond: 0 },
    wins: [],
    ideas: [],
    bubbles: [],
    playStats: { matchWins: 0, sorterItems: [] },
    gameWorld: { experience: 0, discoveredLocations: ["trailhead"] },
    focusSettings: { preset: 25, taskId: "", transitionMinutes: 5 },
    focusSessionsCompleted: 0,
    quest: { date: "", complete: false },
  };
}

export function normalizeState(value) {
  const initial = createInitialState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return initial;

  const allowedThemes = new Set(["executive-ivory", "soft-sage", "champagne-glow", "cozy-espresso", "playful-pastel"]);
  const tasks = Array.isArray(value.tasks)
    ? value.tasks
        .filter((task) => task && typeof task.id === "string" && typeof task.title === "string")
        .map((task) => ({
          id: task.id,
          title: task.title.slice(0, 240),
          createdAt: typeof task.createdAt === "string" ? task.createdAt : new Date(0).toISOString(),
          priority: Boolean(task.priority),
          done: Boolean(task.done),
        }))
    : [];
  const preferences = value.preferences && typeof value.preferences === "object"
    ? value.preferences
    : {};
  const companion = value.companion && typeof value.companion === "object" ? value.companion : {};
  const wins = Array.isArray(value.wins)
    ? value.wins.filter((win) => win && typeof win.id === "string" && typeof win.title === "string")
      .map((win) => ({ id: win.id, title: win.title.slice(0, 100), kind: String(win.kind ?? "win").slice(0, 40), createdAt: typeof win.createdAt === "string" ? win.createdAt : "" }))
    : [];
  const ideas = Array.isArray(value.ideas)
    ? value.ideas.filter((idea) => idea && typeof idea.id === "string" && typeof idea.title === "string")
      .map((idea) => ({ id: idea.id, title: idea.title.slice(0, 240), kind: String(idea.kind ?? "idea").slice(0, 40), createdAt: typeof idea.createdAt === "string" ? idea.createdAt : "" }))
    : [];
  const bubbles = Array.isArray(value.bubbles)
    ? value.bubbles.filter((item) => item && typeof item.id === "string" && typeof item.title === "string")
      .map((item) => ({ id: item.id, title: item.title.slice(0, 240) }))
    : [];
  const playStats = value.playStats && typeof value.playStats === "object" ? value.playStats : {};
  const gameWorld = value.gameWorld && typeof value.gameWorld === "object" ? value.gameWorld : {};
  const focusSettings = value.focusSettings && typeof value.focusSettings === "object" ? value.focusSettings : {};
  const legacyTheme = preferences.theme === "evening" ? "cozy-espresso" : "executive-ivory";
  const selectedTheme = allowedThemes.has(preferences.theme) ? preferences.theme : legacyTheme;
  const appearances = new Set(["cat", "dragon", "hedgehog", "owl"]);
  const celebrations = new Set(["none", "subtle", "medium", "maximum"]);

  return {
    version: 1,
    tasks,
    preferences: {
      ...initial.preferences,
      theme: selectedTheme,
      intensity: preferences.intensity === "standard" ? "standard" : "soft",
      lowStimulation: Boolean(preferences.lowStimulation),
      petEnabled: preferences.petEnabled !== false,
      gamesEnabled: preferences.gamesEnabled !== false,
      soundsEnabled: Boolean(preferences.soundsEnabled),
      animationsEnabled: preferences.animationsEnabled !== false,
      celebrations: celebrations.has(preferences.celebrations) ? preferences.celebrations : "medium",
      gamificationEnabled: preferences.gamificationEnabled !== false,
    },
    companion: {
      name: typeof companion.name === "string" && companion.name.trim() ? companion.name.trim().slice(0, 24) : "Moss",
      appearance: appearances.has(companion.appearance) ? companion.appearance : "cat",
      visible: companion.visible !== false,
      accessory: ["none", "leaf", "flower", "star", "scarf"].includes(companion.accessory) ? companion.accessory : "none",
      milestones: Array.isArray(companion.milestones) ? [...new Set(companion.milestones.filter((item) => typeof item === "string"))] : [],
      bond: Number.isInteger(companion.bond) && companion.bond > 0 ? companion.bond : 0,
    },
    wins,
    ideas,
    bubbles,
    playStats: {
      matchWins: Number.isInteger(playStats.matchWins) && playStats.matchWins > 0 ? playStats.matchWins : 0,
      sorterItems: Array.isArray(playStats.sorterItems)
        ? playStats.sorterItems.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && ["Family", "School", "Household", "Business", "Speaking", "Personal"].includes(item.category))
          .map((item) => ({ id: item.id, title: item.title.slice(0, 240), category: item.category }))
        : [],
    },
    gameWorld: {
      experience: Number.isInteger(gameWorld.experience) && gameWorld.experience > 0 ? gameWorld.experience : 0,
      discoveredLocations: Array.isArray(gameWorld.discoveredLocations)
        ? [...new Set(gameWorld.discoveredLocations.filter((location) => ["trailhead", "mossy-canopy", "tidepool-bay", "starglass-summit"].includes(location)))]
        : ["trailhead"],
    },
    focusSettings: {
      preset: [2, 5, 10, 15, 25, 45].includes(focusSettings.preset) ? focusSettings.preset : 25,
      taskId: typeof focusSettings.taskId === "string" ? focusSettings.taskId : "",
      transitionMinutes: Number.isInteger(focusSettings.transitionMinutes) && focusSettings.transitionMinutes >= 1 && focusSettings.transitionMinutes <= 60 ? focusSettings.transitionMinutes : 5,
    },
    focusSessionsCompleted: Number.isInteger(value.focusSessionsCompleted) && value.focusSessionsCompleted > 0 ? value.focusSessionsCompleted : 0,
    quest: {
      date: typeof value.quest?.date === "string" ? value.quest.date : "",
      complete: Boolean(value.quest?.complete),
      skipped: Boolean(value.quest?.skipped),
    },
  };
}

export function addTask(state, title, id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`) {
  const cleanTitle = title.trim().slice(0, 240);
  if (!cleanTitle) return state;
  return {
    ...state,
    tasks: [
      { id, title: cleanTitle, createdAt: new Date().toISOString(), priority: false, done: false },
      ...state.tasks,
    ],
  };
}

export function toggleTaskDone(state, id) {
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === id
        ? { ...task, done: !task.done, priority: task.done ? task.priority : false }
        : task
    ),
  };
}

export function setTaskPriority(state, id, priority) {
  if (priority && state.tasks.filter((task) => task.priority && !task.done).length >= 3) {
    return { state, limitReached: true };
  }
  return {
    state: {
      ...state,
      tasks: state.tasks.map((task) => task.id === id && !task.done
        ? { ...task, priority }
        : task),
    },
    limitReached: false,
  };
}

export function deleteTask(state, id) {
  return { ...state, tasks: state.tasks.filter((task) => task.id !== id) };
}

export function updatePreferences(state, preferences) {
  return {
    ...state,
    preferences: { ...state.preferences, ...preferences },
  };
}
