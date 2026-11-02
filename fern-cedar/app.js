const menuToggle = document.querySelector(".menu-toggle");
const siteNav = document.querySelector(".site-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  siteNav.classList.toggle("is-open", !isOpen);
});

siteNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    menuToggle.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  }
});

const structureTabs = [...document.querySelectorAll(".structure-tab")];
const structurePanels = [...document.querySelectorAll(".structure-panel")];

function selectStructure(tab) {
  structureTabs.forEach((item) => {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
  });
  structurePanels.forEach((panel) => {
    const selected = panel.id === tab.getAttribute("aria-controls");
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
}

structureTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectStructure(tab));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? structureTabs.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + structureTabs.length) % structureTabs.length;
    structureTabs[nextIndex].focus();
    selectStructure(structureTabs[nextIndex]);
  });
});

const checklistItems = [...document.querySelectorAll("[data-task]")];
const progressTrack = document.querySelector(".progress-track");
const progressCopy = document.querySelector("#progress-copy");
const announcer = document.querySelector("#checklist-announcer");
const storageNote = document.querySelector("#storage-note");
const storageKey = "fern-cedar-launch-checklist";
let storageAvailable = true;

function updateProgress(announce = false) {
  const completed = checklistItems.filter((item) => item.checked).length;
  const total = checklistItems.length;
  const percentage = total ? (completed / total) * 100 : 0;
  progressTrack.setAttribute("aria-valuenow", String(completed));
  progressTrack.firstElementChild.style.width = `${percentage}%`;
  progressCopy.textContent = `${completed} of ${total} steps checked`;
  if (storageAvailable) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(checklistItems.filter((item) => item.checked).map((item) => item.dataset.task)));
    } catch (error) {
      storageAvailable = false;
      storageNote.textContent = "Browser storage is unavailable; progress will not persist after you close this page.";
      console.warn("Could not save the launch checklist.", error);
    }
  }
  if (announce) announcer.textContent = `${completed} of ${total} launch steps checked.`;
}

try {
  const savedTasks = JSON.parse(localStorage.getItem(storageKey) || "[]");
  checklistItems.forEach((item) => { item.checked = savedTasks.includes(item.dataset.task); });
} catch (error) {
  storageAvailable = false;
  storageNote.textContent = "Browser storage is unavailable; progress will not persist after you close this page.";
  console.warn("Could not restore the saved launch checklist.", error);
}
updateProgress();

checklistItems.forEach((item) => item.addEventListener("change", () => updateProgress(true)));
document.querySelector(".reset-button").addEventListener("click", () => {
  checklistItems.forEach((item) => { item.checked = false; });
  updateProgress(true);
});
