import "./dist/index.js";

const pet = document.querySelector("digital-pet");
const desktop = window.digitalPetDesktop;
let pointerCaptured = false;
let interactive = false;

function persistState() {
  const state = {
    name: pet.getAttribute("name") || "Shiro",
    renderer: pet.getAttribute("renderer") || "3d",
    size: pet.getAttribute("size") || "normal",
    sound: pet.getAttribute("sound") === "true",
    hidden: !pet.isVisible,
  };
  localStorage.setItem("digital-pet:desktop-state:v1", JSON.stringify(state));
  desktop.updateState(state);
}

function restoreState() {
  try {
    const state = JSON.parse(localStorage.getItem("digital-pet:desktop-state:v1") || "{}");
    if (state.name) pet.setAttribute("name", state.name);
    if (state.renderer === "2d" || state.renderer === "3d") pet.setAttribute("renderer", state.renderer);
    if (state.size) pet.setAttribute("size", state.size);
    if (typeof state.sound === "boolean") pet.setAttribute("sound", String(state.sound));
    if (state.hidden) pet.hide();
  } catch {
    // Ignore malformed local preferences.
  }
  persistState();
}

function setInteractive(nextInteractive) {
  if (interactive === nextInteractive) return;
  interactive = nextInteractive;
  desktop.setInteractive(interactive);
}

function isInteractivePath(event) {
  return event.composedPath().some((node) => {
    if (!(node instanceof Element)) return false;
    if (node.matches(".pet-canvas, .launcher, .panel, .panel *")) return true;
    return false;
  });
}

document.addEventListener(
  "pointermove",
  (event) => {
    setInteractive(pointerCaptured || isInteractivePath(event));
  },
  true,
);
document.addEventListener(
  "pointerdown",
  (event) => {
    pointerCaptured = isInteractivePath(event);
    setInteractive(pointerCaptured);
  },
  true,
);
document.addEventListener(
  "pointerup",
  (event) => {
    pointerCaptured = false;
    setInteractive(isInteractivePath(event));
  },
  true,
);
window.addEventListener("blur", () => {
  pointerCaptured = false;
  setInteractive(false);
});

pet.addEventListener("digital-pet-size-change", persistState);
pet.addEventListener("digital-pet-renderer-change", persistState);
pet.addEventListener("digital-pet-command", persistState);
pet.addEventListener("digital-pet-visibility-change", persistState);
pet.addEventListener("digital-pet-name-change", persistState);

const observer = new MutationObserver(persistState);
observer.observe(pet, {
  attributes: true,
  attributeFilter: ["name", "renderer", "size", "sound", "hidden", "style"],
});

desktop.onAction((action) => {
  switch (action.type) {
    case "command":
      pet.command(action.command);
      break;
    case "random-trick":
      pet.randomTrick();
      break;
    case "size":
      pet.setSize(action.size);
      break;
    case "renderer":
      pet.setRenderer(action.renderer);
      break;
    case "sound":
      pet.setAttribute("sound", String(action.enabled));
      break;
    case "bring":
      pet.show();
      pet.bringTo(action.x, action.y);
      break;
    case "show":
      pet.show();
      break;
    case "hide":
      pet.hide();
      break;
  }
  persistState();
});

restoreState();
