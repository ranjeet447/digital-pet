import { ThreePetRenderer, DogBreed, BreedProfile, DOG_BREEDS } from "./three-renderer.js";

export { DogBreed, BreedProfile, DOG_BREEDS } from "./three-renderer.js";

export type PetActivityLevel = "calm" | "normal" | "playful" | "manual";
export type PetBarkingMode = "rare" | "normal" | "off";

export const DIGITAL_PET_COMMANDS = [
  "sit",
  "walk",
  "run",
  "jump",
  "down",
  "sleep",
  "roll-over",
  "handshake",
  "hi-five",
  "salute",
  "namaste",
  "speak",
  "quiet",
  "fetch",
  "feed",
  "treat",
  "surprise",
] as const;

export const DIGITAL_PET_SIZES = ["extra-small", "small", "normal", "large", "extra-large"] as const;
export const DIGITAL_PET_RENDERERS = ["2d", "3d"] as const;

export type DigitalPetCommand = (typeof DIGITAL_PET_COMMANDS)[number];
export type DigitalPetSize = (typeof DIGITAL_PET_SIZES)[number];
export type DigitalPetRenderer = (typeof DIGITAL_PET_RENDERERS)[number];

export interface DigitalPetOptions {
  name?: string;
  controls?: boolean;
  cursorInteraction?: boolean;
  sound?: boolean;
  volume?: number;
  renderer?: "auto" | DigitalPetRenderer;
  size?: DigitalPetSize;
  zIndex?: number;
  startCorner?: "bottom-left" | "bottom-right";
  modelSrc?: string;
  breed?: DogBreed;
}

type Behavior =
  | "idle"
  | "sit"
  | "walking"
  | "running"
  | "chasing"
  | "down"
  | "sleeping"
  | "jump"
  | "roll-over"
  | "handshake"
  | "hi-five"
  | "salute"
  | "namaste"
  | "speak"
  | "fetch"
  | "feed"
  | "treat"
  | "surprise"
  | "ask-food"
  | "wag";

type Point = { x: number; y: number };

const STORAGE_KEY = "digital-pet:size:v1";
const BASE_WIDTH = 220;
const BASE_HEIGHT = 180;
const FLOOR_MARGIN = 10;
const SIZE_SCALE: Record<DigitalPetSize, number> = {
  "extra-small": 0.5,
  small: 0.75,
  normal: 1,
  large: 1.25,
  "extra-large": 1.5,
};
const COMMAND_LABELS: Record<DigitalPetCommand, string> = {
  sit: "Sit",
  walk: "Walk",
  run: "Run",
  jump: "Jump",
  down: "Down",
  sleep: "Sleep in Corner",
  "roll-over": "Roll Over",
  handshake: "Handshake",
  "hi-five": "Hi-Five",
  salute: "Salute",
  namaste: "Namaste",
  speak: "Speak",
  quiet: "Quiet",
  fetch: "Fetch a Ball",
  feed: "Feed",
  treat: "Give a Treat",
  surprise: "Surprise Trick",
};
const TRICK_DURATION: Partial<Record<Behavior, number>> = {
  sit: 2800,
  jump: 1800,
  down: 2800,
  "roll-over": 2200,
  handshake: 2400,
  "hi-five": 2400,
  salute: 2500,
  namaste: 2500,
  speak: 1800,
  fetch: 3400,
  feed: 3000,
  treat: 2400,
  surprise: 2800,
  "ask-food": 3200,
};
const BALL_COLORS = ["#ef4136", "#258be7", "#f4b71b", "#55b957", "#9559d6"];
const GOLDEN = "#d07a2c";
const LIGHT_GOLDEN = "#f2b24f";
const CREAM = "#f7d078";
const DARK_GOLDEN = "#874713";
const DEEP_GOLDEN = "#6d3513";
const HIGHLIGHT_GOLDEN = "#ffd98a";
const TONGUE = "#ed6378";

const template = document.createElement("template");
template.innerHTML = `
  <style>
    :host {
      position: fixed;
      inset: 0;
      display: block;
      pointer-events: none;
      contain: layout style;
      z-index: var(--digital-pet-z-index, 2147483000);
    }

    .pet-canvas {
      position: fixed;
      left: 0;
      top: 0;
      pointer-events: auto;
      touch-action: none;
      cursor: grab;
      filter: drop-shadow(0 7px 5px rgb(0 0 0 / 16%));
      outline: none;
    }

    .pet-canvas:active {
      cursor: grabbing;
    }

    .pet-canvas:focus-visible,
    .launcher:focus-visible,
    button:focus-visible {
      outline: 3px solid #fff;
      box-shadow: 0 0 0 5px #a95e24;
    }

    .launcher {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: 44px;
      height: 44px;
      border: 1px solid rgb(255 255 255 / 65%);
      border-radius: 999px;
      background: #a95e24;
      color: #fff;
      box-shadow: 0 8px 24px rgb(0 0 0 / 18%);
      pointer-events: auto;
      cursor: pointer;
      font-size: 21px;
      line-height: 1;
    }

    .launcher:hover {
      background: #8e4d1d;
      transform: translateY(-1px);
    }

    .panel {
      position: fixed;
      right: 16px;
      bottom: 68px;
      width: min(248px, calc(100vw - 32px));
      max-height: min(580px, calc(100vh - 96px));
      overflow: auto;
      border: 1px solid rgb(125 80 40 / 18%);
      border-radius: 18px;
      background: rgb(255 252 246 / 96%);
      box-shadow: 0 18px 50px rgb(46 27 14 / 22%);
      color: #2f2118;
      font: 14px/1.35 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      pointer-events: auto;
      padding: 13px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(8px) scale(0.98);
      transform-origin: bottom right;
      transition: opacity 150ms ease, transform 150ms ease, visibility 150ms;
    }

    .panel[data-open="true"] {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      padding: 2px 3px 8px;
      border-bottom: 1px solid rgb(125 80 40 / 12%);
    }

    .panel-title {
      font-weight: 800;
      font-size: 15px;
    }

    .close {
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 999px;
      background: #f1e5d6;
      color: #5a3a22;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }

    .section-title {
      margin: 9px 3px 6px;
      color: #76553d;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .pet-name-input {
      width: 100%;
      min-height: 36px;
      border: 1px solid #ead8c4;
      border-radius: 10px;
      background: #fff;
      color: #3b291d;
      font: inherit;
      font-weight: 650;
      padding: 8px 10px;
    }

    .commands,
    .sizes,
    .renderers {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    button.command,
    button.size,
    button.renderer {
      min-height: 34px;
      border: 1px solid #ead8c4;
      border-radius: 10px;
      background: #fff;
      color: #3b291d;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 650;
      padding: 7px 8px;
      text-align: left;
    }

    button.command:hover,
    button.size:hover,
    button.size[aria-pressed="true"],
    button.renderer:hover,
    button.renderer[aria-pressed="true"] {
      border-color: #c98245;
      background: #fff4e7;
      color: #7c431b;
    }

    .footer-actions {
      display: flex;
      gap: 6px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgb(125 80 40 / 12%);
    }

    .footer-actions button {
      flex: 1;
      border: 0;
      border-radius: 10px;
      background: #ead8c4;
      color: #4d321f;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 8px;
    }

    .footer-actions button:hover {
      background: #dcc1a4;
    }

    .npm-badge-row {
      margin-top: 9px;
      padding-top: 8px;
      border-top: 1px solid rgb(125 80 40 / 12%);
      text-align: center;
    }

    .npm-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      width: 100%;
      box-sizing: border-box;
      padding: 7px 10px;
      border-radius: 10px;
      background: #fbf5ed;
      border: 1px solid #ead8c4;
      color: #76451e;
      font-size: 11.5px;
      font-weight: 700;
      text-decoration: none;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    }

    .npm-link:hover {
      background: #fff4e7;
      border-color: #cb3837;
      color: #cb3837;
    }

    .npm-icon {
      flex-shrink: 0;
    }

    .npm-arrow {
      font-size: 11px;
      opacity: 0.7;
    }

    .sound-row {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .sound-toggle {
      min-height: 34px;
      border: 1px solid #ead8c4;
      border-radius: 10px;
      background: #fff;
      color: #3b291d;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      padding: 7px 9px;
      text-align: left;
    }

    .sound-volume {
      width: 88px;
      accent-color: #a95e24;
    }

    .breeds,
    .activities,
    .barkings {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }

    .breed-btn,
    .activity-btn,
    .barking-btn {
      min-height: 32px;
      border: 1px solid #ead8c4;
      border-radius: 9px;
      background: #fff;
      color: #3b291d;
      cursor: pointer;
      font: inherit;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 4px;
      text-align: center;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
    }

    .breed-btn:hover,
    .activity-btn:hover,
    .barking-btn:hover {
      background: #fbf5ed;
      border-color: #cb7a38;
      color: #76451e;
    }

    .breed-btn.is-active,
    .breed-btn[aria-pressed="true"],
    .activity-btn.is-active,
    .activity-btn[aria-pressed="true"],
    .barking-btn.is-active,
    .barking-btn[aria-pressed="true"] {
      background: #76451e;
      border-color: #76451e;
      color: #fff;
    }

    :host([controls="false"]) .launcher,
    :host([controls="false"]) .panel,
    :host([hidden]) {
      display: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .panel,
      .launcher {
        transition: none;
      }
    }

    .particle {
      position: fixed;
      pointer-events: none;
      font-size: 22px;
      user-select: none;
      will-change: transform, opacity;
      animation: petParticleFloat 1.25s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      z-index: 2147483002;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.22));
    }

    @keyframes petParticleFloat {
      0% {
        opacity: 0;
        transform: translate3d(var(--x), var(--y), 0) scale(0.4) rotate(var(--rot-start));
      }
      18% {
        opacity: 1;
        transform: translate3d(var(--x), calc(var(--y) - 18px), 0) scale(1.25) rotate(var(--rot-mid));
      }
      100% {
        opacity: 0;
        transform: translate3d(calc(var(--x) + var(--drift)), calc(var(--y) - 68px), 0) scale(0.85) rotate(var(--rot-end));
      }
    }

    .fetch-ball-element {
      position: fixed;
      left: 0;
      top: 0;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 32%, #ecff5e 0%, #b8e314 55%, #769b00 100%);
      box-shadow: inset -2px -2px 5px rgba(0,0,0,0.32), 0 6px 14px rgba(0,0,0,0.28);
      pointer-events: none;
      z-index: 2147483001;
      will-change: transform, opacity;
      transition: opacity 0.35s ease;
    }

    .fetch-ball-element::after {
      content: "";
      position: absolute;
      inset: 2px;
      border-radius: 50%;
      border: 1.5px dashed rgba(255, 255, 255, 0.75);
      box-sizing: border-box;
    }

    .fetch-prompt-toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: rgba(36, 22, 12, 0.92);
      backdrop-filter: blur(10px);
      color: #fff;
      padding: 9px 20px;
      border-radius: 999px;
      font: 600 13px/1.3 ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 10px 28px rgba(0,0,0,0.25);
      pointer-events: none;
      z-index: 2147483003;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: promptFadeIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    @keyframes promptFadeIn {
      from {
        opacity: 0;
        transform: translate(-50%, 12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0) scale(1);
      }
    }
  </style>
  <canvas class="pet-canvas pet-3d" tabindex="0" role="button" aria-label="Shiro the digital golden retriever. Click for a trick, drag to move." hidden></canvas>
  <canvas class="pet-canvas pet-2d" tabindex="0" role="button" aria-label="Shiro the digital golden retriever. Click for a trick, drag to move."></canvas>
  <button class="launcher" type="button" aria-label="Open Shiro controls" aria-expanded="false">🐾</button>
  <section class="panel" aria-label="Shiro controls" data-open="false">
    <div class="panel-header">
      <div class="panel-title">Play with <span data-pet-name>Shiro</span></div>
      <button class="close" type="button" aria-label="Close Shiro controls">×</button>
    </div>
    <div class="section-title">Pet name</div>
    <input class="pet-name-input" type="text" value="Shiro" maxlength="32" aria-label="Pet name" />
    <div class="section-title">All tricks & commands</div>
    <div class="commands"></div>
    <div class="section-title">Size</div>
    <div class="sizes"></div>
    <div class="section-title">View</div>
    <div class="renderers">
      <button class="renderer" type="button" data-renderer="2d" aria-pressed="false">2D illustrated</button>
      <button class="renderer" type="button" data-renderer="3d" aria-pressed="false">3D model</button>
    </div>
    <div class="section-title">Breed</div>
    <div class="breeds">
      <button class="breed-btn" type="button" data-breed="golden-retriever" aria-pressed="true">Golden Retriever</button>
      <button class="breed-btn" type="button" data-breed="black-labrador" aria-pressed="false">Black Lab</button>
      <button class="breed-btn" type="button" data-breed="chocolate-labrador" aria-pressed="false">Chocolate Lab</button>
      <button class="breed-btn" type="button" data-breed="husky" aria-pressed="false">Siberian Husky</button>
      <button class="breed-btn" type="button" data-breed="german-shepherd" aria-pressed="false">German Shepherd</button>
      <button class="breed-btn" type="button" data-breed="shiba-inu" aria-pressed="false">Shiba Inu</button>
    </div>
    <div class="section-title">Activity level</div>
    <div class="activities">
      <button class="activity-btn" type="button" data-activity="calm" aria-pressed="true">Calm</button>
      <button class="activity-btn" type="button" data-activity="normal" aria-pressed="false">Normal</button>
      <button class="activity-btn" type="button" data-activity="playful" aria-pressed="false">Playful</button>
      <button class="activity-btn" type="button" data-activity="manual" aria-pressed="false">Manual</button>
    </div>
    <div class="section-title">Barking</div>
    <div class="barkings">
      <button class="barking-btn" type="button" data-barking="rare" aria-pressed="true">Rare (Command)</button>
      <button class="barking-btn" type="button" data-barking="normal" aria-pressed="false">Normal</button>
      <button class="barking-btn" type="button" data-barking="off" aria-pressed="false">Silent</button>
    </div>
    <div class="section-title">Sound</div>
    <div class="sound-row">
      <button class="sound-toggle" type="button" aria-pressed="false">Enable sounds</button>
      <input class="sound-volume" type="range" min="0" max="1" step="0.05" value="0.65" aria-label="Sound volume" />
    </div>
    <div class="footer-actions">
      <button class="bring" type="button">Bring here</button>
      <button class="hide-pet" type="button">Hide <span data-pet-name>Shiro</span></button>
    </div>
    <div class="npm-badge-row">
      <a
        class="npm-link"
        href="https://www.npmjs.com/package/@ranjeet447/digital-pet"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Try @ranjeet447/digital-pet on npm"
      >
        <svg class="npm-icon" viewBox="0 0 780 250" width="30" height="11" aria-hidden="true">
          <path fill="#CB3837" d="M240,250h100v-50h100V0H240V250z M340,50h50v100h-50V50z M480,0v200h100V50h50v150h50V50h50v150h50V0H480z M0,200h100V50h50v150h50V0H0V200z"/>
        </svg>
        <span class="npm-text">Try now</span>
        <span class="npm-arrow">↗</span>
      </a>
    </div>
  </section>
`;

export class DigitalPetElement extends HTMLElement {
  static readonly tagName = "digital-pet";

  static get observedAttributes(): string[] {
    return [
      "name",
      "size",
      "controls",
      "cursor-interaction",
      "z-index",
      "sound",
      "volume",
      "renderer",
      "model-src",
      "breed",
      "activity",
      "barking",
    ];
  }

  private canvas: HTMLCanvasElement;
  private readonly fallbackCanvas: HTMLCanvasElement;
  private readonly webglCanvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly launcher: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly commandsContainer: HTMLElement;
  private readonly sizesContainer: HTMLElement;
  private readonly reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private readonly barkAudio = new Audio(new URL("../assets/bark-cute.mp3", import.meta.url).href);
  private threeRenderer: ThreePetRenderer | null = null;
  private currentBreed: DogBreed = "golden-retriever";
  private activityValue: PetActivityLevel = "calm";
  private barkingValue: PetBarkingMode = "rare";
  private lastBarkAt = 0;
  private animationFrame = 0;
  private lastFrame = performance.now();
  private nextDecisionAt = performance.now() + 25000;
  private behaviorStartedAt = performance.now();
  private behaviorEndsAt: number | null = null;
  private behavior: Behavior = "idle";
  private sizeValue: DigitalPetSize = "normal";
  private position: Point = { x: 20, y: 20 };
  private targetPosition: Point | null = null;
  private direction = -1;
  private facingScale = -1;
  private horizontalVelocity = 0;
  private verticalVelocity = 0;
  private renderedBounce = 0;
  private pointer: Point = { x: -1000, y: -1000 };
  private pointerMovedAt = 0;
  private dragging = false;
  private dragOffset: Point = { x: 0, y: 0 };
  private dragStart: Point = { x: 0, y: 0 };
  private didDrag = false;
  private ballColor = BALL_COLORS[0];
  private visible = true;
  private connected = false;
  private resizeObserver: ResizeObserver | null = null;
  private soundEnabled = false;
  private volume = 0.65;
  private rendererValue: DigitalPetRenderer = "2d";
  private hunger = 18;
  private lastHungerUpdate = performance.now();
  private isInteractiveFetchActive = false;
  private fetchPhase: "idle" | "chasing" | "returning" = "idle";
  private fetchReturnPoint: Point = { x: 0, y: 0 };
  private fetchBallElement: HTMLElement | null = null;
  private fetchPromptElement: HTMLElement | null = null;
  private fetchTimeoutTimer: number | null = null;
  private carryingBall = false;
  private lastPetParticleTime = 0;
  private lastPetSoundTime = 0;
  private isCurrentlyPetting = false;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.append(template.content.cloneNode(true));

    this.fallbackCanvas = this.requireElement(".pet-2d");
    this.webglCanvas = this.requireElement(".pet-3d");
    this.canvas = this.fallbackCanvas;
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Shiro requires Canvas 2D support.");
    }
    this.context = context;
    this.launcher = this.requireElement(".launcher");
    this.panel = this.requireElement(".panel");
    this.commandsContainer = this.requireElement(".commands");
    this.sizesContainer = this.requireElement(".sizes");
    this.barkAudio.preload = "auto";

    this.renderControlButtons();
    this.bindControls();
  }

  connectedCallback(): void {
    if (this.connected) return;
    this.connected = true;

    this.style.setProperty("--digital-pet-z-index", this.getAttribute("z-index") ?? "2147483000");
    this.soundEnabled = this.getAttribute("sound") === "true";
    this.volume = clamp(Number(this.getAttribute("volume") ?? "0.65"), 0, 1);
    this.barkAudio.volume = this.volume;
    this.initializeRenderer();
    this.updatePetName();
    this.sizeValue = this.readInitialSize();
    this.setAttribute("size", this.sizeValue);
    this.syncSizeButtons();
    const initialBreed = this.getAttribute("breed") as DogBreed;
    if (initialBreed && DOG_BREEDS[initialBreed]) {
      this.currentBreed = initialBreed;
    }
    this.updateBreedButtons();

    const initialActivity = this.getAttribute("activity") as PetActivityLevel;
    if (initialActivity && ["calm", "normal", "playful", "manual"].includes(initialActivity)) {
      this.activityValue = initialActivity;
    }
    this.updateActivityButtons();

    const initialBarking = this.getAttribute("barking") as PetBarkingMode;
    if (initialBarking && ["rare", "normal", "off"].includes(initialBarking)) {
      this.barkingValue = initialBarking;
    }
    this.updateBarkingButtons();
    this.placeInStartCorner();
    this.applyCanvasSize();

    window.addEventListener("pointermove", this.handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerdown", this.handleGlobalPointerDown, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotion.addEventListener("change", this.handleReducedMotionChange);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(document.documentElement);
    this.lastFrame = performance.now();
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  disconnectedCallback(): void {
    this.connected = false;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener("pointermove", this.handleGlobalPointerMove);
    window.removeEventListener("pointerdown", this.handleGlobalPointerDown);
    window.removeEventListener("resize", this.handleResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.reducedMotion.removeEventListener("change", this.handleReducedMotionChange);
    this.cancelInteractiveFetchPrompt();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.threeRenderer?.dispose();
    this.threeRenderer = null;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === "size" && newValue && isDigitalPetSize(newValue)) {
      this.setSize(newValue, false);
    }
    if (name === "z-index" && newValue) {
      this.style.setProperty("--digital-pet-z-index", newValue);
    }
    if (name === "name") {
      this.updatePetName();
      if (this.connected) {
        this.dispatchEvent(
          new CustomEvent("digital-pet-name-change", {
            bubbles: true,
            composed: true,
            detail: { name: this.petName },
          }),
        );
      }
    }
    if (name === "sound") {
      this.soundEnabled = newValue === "true";
      this.syncSoundControls();
    }
    if (name === "volume" && newValue !== null) {
      this.volume = clamp(Number(newValue), 0, 1);
      this.barkAudio.volume = this.volume;
      this.syncSoundControls();
    }
    if (name === "renderer" && this.connected) {
      this.initializeRenderer();
    }
    if (name === "model-src" && this.connected && this.threeRenderer) {
      const modelUrl = newValue || new URL("../assets/golden-retriever.glb", import.meta.url).href;
      if (modelUrl && modelUrl !== "procedural" && modelUrl !== "none") {
        void this.threeRenderer.loadGLTFModel(modelUrl);
      }
    }
    if (name === "breed" && newValue && newValue !== _oldValue) {
      this.setBreed(newValue as DogBreed);
    }
    if (name === "activity" && newValue && newValue !== _oldValue) {
      this.setActivity(newValue as PetActivityLevel);
    }
    if (name === "barking" && newValue && newValue !== _oldValue) {
      this.setBarking(newValue as PetBarkingMode);
    }
  }

  command(command: DigitalPetCommand): void {
    if (!DIGITAL_PET_COMMANDS.includes(command)) {
      throw new Error(`Unknown Digital Pet command: ${command}`);
    }

    this.show();
    switch (command) {
      case "walk":
        this.startMoving(false);
        this.say("Walk!");
        break;
      case "run":
        this.startMoving(true);
        this.say("Run!");
        break;
      case "sleep":
        this.moveToNearestCorner();
        this.setBehavior("sleeping");
        this.nextDecisionAt = Number.POSITIVE_INFINITY;
        this.say("Zzz...");
        break;
      case "quiet":
        this.setBehavior("idle");
        this.nextDecisionAt = performance.now() + 8000;
        this.say("...");
        break;
      case "sit":
        this.setTimedBehavior("sit", TRICK_DURATION.sit ?? 2800);
        this.say("Good sit!");
        break;
      case "feed":
        this.hunger = 0;
        this.setTimedBehavior("feed", TRICK_DURATION.feed ?? 3000);
        this.say("Dinner!");
        this.playBark("happy");
        this.dispatchCareEvent("feed");
        break;
      case "treat":
        this.hunger = Math.max(0, this.hunger - 28);
        this.setTimedBehavior("treat", TRICK_DURATION.treat ?? 2400);
        this.say("Treat!");
        this.playBark("happy");
        this.dispatchCareEvent("treat");
        break;
      case "surprise":
        this.setTimedBehavior("surprise", TRICK_DURATION.surprise ?? 2800);
        this.say("Surprise!");
        this.playBark("excited");
        break;
      case "fetch":
        this.ballColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
        this.startInteractiveFetch();
        break;
      default:
        this.setTimedBehavior(command, TRICK_DURATION[command] ?? 2400);
        this.say(COMMAND_LABELS[command] + "!");
        if (command === "speak") this.playBark("speak");
    }

    this.dispatchEvent(
      new CustomEvent("digital-pet-command", {
        bubbles: true,
        composed: true,
        detail: { command },
      }),
    );
  }

  get renderer3D(): ThreePetRenderer | null {
    return this.threeRenderer;
  }

  get isPetting(): boolean {
    return this.isCurrentlyPetting;
  }

  get currentFetchPhase(): string {
    return this.fetchPhase;
  }

  get isBallCarried(): boolean {
    return this.carryingBall;
  }

  get currentPosition(): Point {
    return { ...this.position };
  }

  randomTrick(): void {
    const tricks: DigitalPetCommand[] = [
      "sit",
      "jump",
      "down",
      "roll-over",
      "handshake",
      "hi-five",
      "salute",
      "namaste",
      "speak",
      "fetch",
    ];
    this.command(tricks[Math.floor(Math.random() * tricks.length)]);
  }

  setSize(size: DigitalPetSize, persist = true): void {
    if (!isDigitalPetSize(size)) {
      throw new Error(`Unknown Digital Pet size: ${size}`);
    }
    if (size === this.sizeValue && this.canvas.width > 0) return;

    const oldWidth = this.displayWidth;
    this.sizeValue = size;
    if (this.getAttribute("size") !== size) {
      this.setAttribute("size", size);
    }
    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, size);
      } catch {
        // Storage can be unavailable in privacy-restricted contexts.
      }
    }

    this.applyCanvasSize();
    this.position.x += (oldWidth - this.displayWidth) / 2;
    this.clampPosition();
    this.syncSizeButtons();
    this.say(`${Math.round(SIZE_SCALE[size] * 100)}%`);

    this.dispatchEvent(
      new CustomEvent("digital-pet-size-change", {
        bubbles: true,
        composed: true,
        detail: { size },
      }),
    );
  }

  setRenderer(renderer: DigitalPetRenderer): void {
    if (!isDigitalPetRenderer(renderer)) {
      throw new Error(`Unknown Digital Pet renderer: ${renderer}`);
    }
    if (this.getAttribute("renderer") === renderer) {
      if (this.rendererValue !== renderer) this.initializeRenderer();
      return;
    }
    this.setAttribute("renderer", renderer);
  }

  get breed(): DogBreed {
    return this.currentBreed;
  }

  set breed(value: DogBreed) {
    this.setBreed(value);
  }

  setBreed(breed: DogBreed): void {
    if (!DOG_BREEDS[breed]) return;
    this.currentBreed = breed;
    if (this.getAttribute("breed") !== breed) {
      this.setAttribute("breed", breed);
    }
    this.updateBreedButtons();
    if (this.threeRenderer) {
      this.threeRenderer.setBreed(breed);
    }
    this.dispatchEvent(
      new CustomEvent("digital-pet-breed-change", {
        detail: { breed, profile: DOG_BREEDS[breed] },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateBreedButtons(): void {
    const breedButtons = this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-breed]");
    if (!breedButtons) return;
    for (const btn of breedButtons) {
      const isCurrent = btn.dataset.breed === this.currentBreed;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  get activity(): PetActivityLevel {
    return this.activityValue;
  }

  set activity(value: PetActivityLevel) {
    this.setActivity(value);
  }

  setActivity(activity: PetActivityLevel): void {
    if (!["calm", "normal", "playful", "manual"].includes(activity)) return;
    this.activityValue = activity;
    if (this.getAttribute("activity") !== activity) {
      this.setAttribute("activity", activity);
    }
    this.updateActivityButtons();
    if (activity === "manual") {
      this.nextDecisionAt = Number.POSITIVE_INFINITY;
    } else if (activity === "calm") {
      this.nextDecisionAt = performance.now() + randomBetween(20000, 45000);
    } else if (activity === "normal") {
      this.nextDecisionAt = performance.now() + randomBetween(10000, 22000);
    } else if (activity === "playful") {
      this.nextDecisionAt = performance.now() + randomBetween(4000, 8000);
    }
    this.dispatchEvent(
      new CustomEvent("digital-pet-activity-change", {
        detail: { activity },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateActivityButtons(): void {
    const btns = this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-activity]");
    if (!btns) return;
    for (const btn of btns) {
      const isCurrent = btn.dataset.activity === this.activityValue;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  get barking(): PetBarkingMode {
    return this.barkingValue;
  }

  set barking(value: PetBarkingMode) {
    this.setBarking(value);
  }

  setBarking(barking: PetBarkingMode): void {
    if (!["rare", "normal", "off"].includes(barking)) return;
    this.barkingValue = barking;
    if (this.getAttribute("barking") !== barking) {
      this.setAttribute("barking", barking);
    }
    this.updateBarkingButtons();
    this.dispatchEvent(
      new CustomEvent("digital-pet-barking-change", {
        detail: { barking },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private updateBarkingButtons(): void {
    const btns = this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-barking]");
    if (!btns) return;
    for (const btn of btns) {
      const isCurrent = btn.dataset.barking === this.barkingValue;
      btn.classList.toggle("is-active", isCurrent);
      btn.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  bringToPointer(): void {
    const x = this.pointer.x >= 0 ? this.pointer.x : window.innerWidth / 2;
    const y = this.pointer.y >= 0 ? this.pointer.y : window.innerHeight / 2;
    this.bringTo(x, y);
  }

  bringTo(x: number, y: number): void {
    this.position.x = x - this.displayWidth / 2;
    this.position.y = Math.min(y - this.displayHeight * 0.55, window.innerHeight - this.displayHeight);
    this.clampPosition();
    this.setBehavior("idle");
    this.say("Hi!");
  }

  show(): void {
    const changed = !this.visible;
    this.visible = true;
    this.canvas.hidden = false;
    if (changed) this.dispatchVisibilityChange();
  }

  hide(): void {
    const changed = this.visible;
    this.visible = false;
    this.fallbackCanvas.hidden = true;
    this.webglCanvas.hidden = true;
    this.closePanel();
    if (changed) this.dispatchVisibilityChange();
  }

  get isVisible(): boolean {
    return this.visible;
  }

  get modelSrc(): string | null {
    return this.getAttribute("model-src");
  }

  set modelSrc(value: string | null) {
    if (value === null) {
      this.removeAttribute("model-src");
    } else {
      this.setAttribute("model-src", value);
    }
  }

  private get displayWidth(): number {
    return BASE_WIDTH * SIZE_SCALE[this.sizeValue];
  }

  private get displayHeight(): number {
    return BASE_HEIGHT * SIZE_SCALE[this.sizeValue];
  }

  private get cursorInteractionEnabled(): boolean {
    return this.getAttribute("cursor-interaction") !== "false";
  }

  private get petName(): string {
    return this.getAttribute("name")?.trim() || "Shiro";
  }

  private updatePetName(): void {
    const name = this.petName;
    this.shadowRoot?.querySelectorAll<HTMLElement>("[data-pet-name]").forEach((element) => {
      element.textContent = name;
    });
    const input = this.shadowRoot?.querySelector<HTMLInputElement>(".pet-name-input");
    if (input && input.value !== name) input.value = name;
    for (const canvas of [this.fallbackCanvas, this.webglCanvas]) {
      canvas.setAttribute(
        "aria-label",
        `${name}, the digital golden retriever. Click for a trick, drag to move.`,
      );
    }
    this.launcher.setAttribute("aria-label", `Open ${name} controls`);
    this.panel.setAttribute("aria-label", `${name} controls`);
    this.requireElement<HTMLButtonElement>(".close").setAttribute(
      "aria-label",
      `Close ${name} controls`,
    );
  }

  private dispatchCareEvent(action: "feed" | "treat"): void {
    this.dispatchEvent(
      new CustomEvent("digital-pet-care", {
        bubbles: true,
        composed: true,
        detail: { action, hunger: Math.round(this.hunger) },
      }),
    );
  }

  private dispatchVisibilityChange(): void {
    this.dispatchEvent(
      new CustomEvent("digital-pet-visibility-change", {
        bubbles: true,
        composed: true,
        detail: { visible: this.visible },
      }),
    );
  }

  private playBark(kind: "greeting" | "happy" | "excited" | "speak" | "hungry", force = false): void {
    if (!this.soundEnabled || this.volume <= 0) return;
    if (this.barkingValue === "off" && !force) return;
    const now = performance.now();
    // In "rare" barking mode, suppress spontaneous or rapid autonomous barking:
    // Only allow bark if explicitly commanded ("speak" or force) or if at least 45s have passed
    if (this.barkingValue === "rare" && kind !== "speak" && !force) {
      if (now - this.lastBarkAt < 45000) return;
    }
    this.lastBarkAt = now;
    const audio = this.barkAudio.cloneNode(true) as HTMLAudioElement;
    audio.volume = this.volume * (kind === "hungry" ? 0.58 : kind === "greeting" ? 0.72 : 0.88);
    audio.playbackRate =
      kind === "hungry"
        ? 0.78
        : kind === "happy"
          ? 1.16
          : kind === "excited"
            ? 1.3
            : kind === "greeting"
              ? 0.96
              : 1;
    void audio.play().catch(() => {
      // Browsers may still block audio until the next direct user gesture.
    });
  }


  private requireElement<T extends Element>(selector: string): T {
    const element = this.shadowRoot?.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Missing Shiro UI element: ${selector}`);
    }
    return element;
  }

  private renderControlButtons(): void {
    for (const command of DIGITAL_PET_COMMANDS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "command";
      button.dataset.command = command;
      button.textContent = COMMAND_LABELS[command];
      button.addEventListener("click", () => {
        this.command(command);
        this.closePanel();
      });
      this.commandsContainer.append(button);
    }

    const labels: Record<DigitalPetSize, string> = {
      "extra-small": "Extra Small 50%",
      small: "Small 75%",
      normal: "Normal 100%",
      large: "Large 125%",
      "extra-large": "Extra Large 150%",
    };
    for (const size of DIGITAL_PET_SIZES) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "size";
      button.dataset.size = size;
      button.textContent = labels[size];
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => this.setSize(size));
      this.sizesContainer.append(button);
    }

    this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-renderer]").forEach((button) => {
      button.addEventListener("click", () => {
        const renderer = button.dataset.renderer;
        if (renderer && isDigitalPetRenderer(renderer)) this.setRenderer(renderer);
      });
    });
  }

  private bindControls(): void {
    this.launcher.addEventListener("click", () => {
      const isOpen = this.panel.dataset.open === "true";
      if (isOpen) {
        this.closePanel();
      } else {
        this.openPanel();
      }
    });
    this.requireElement<HTMLButtonElement>(".close").addEventListener("click", () => this.closePanel());
    this.requireElement<HTMLButtonElement>(".bring").addEventListener("click", () => {
      this.show();
      this.bringToPointer();
      this.closePanel();
    });
    this.requireElement<HTMLButtonElement>(".hide-pet").addEventListener("click", () => this.hide());

    for (const canvas of [this.fallbackCanvas, this.webglCanvas]) {
      canvas.addEventListener("pointerdown", this.handlePointerDown);
      canvas.addEventListener("pointermove", this.handleCanvasPointerMove);
      canvas.addEventListener("pointerup", this.handlePointerUp);
      canvas.addEventListener("pointercancel", this.handlePointerUp);
      canvas.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.randomTrick();
        }
      });
    }

    const soundToggle = this.requireElement<HTMLButtonElement>(".sound-toggle");
    const soundVolume = this.requireElement<HTMLInputElement>(".sound-volume");
    const nameInput = this.requireElement<HTMLInputElement>(".pet-name-input");
    nameInput.addEventListener("input", () => {
      const name = nameInput.value.trim();
      if (name && name !== this.petName) this.setAttribute("name", name);
    });
    nameInput.addEventListener("blur", () => {
      if (!nameInput.value.trim()) nameInput.value = this.petName;
    });
    soundToggle.addEventListener("click", () => {
      this.setAttribute("sound", String(!this.soundEnabled));
      if (this.soundEnabled) this.playBark("greeting");
    });
    soundVolume.addEventListener("input", () => {
      this.setAttribute("volume", soundVolume.value);
    });

    this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-breed]").forEach((button) => {
      button.addEventListener("click", () => {
        const breed = button.dataset.breed as DogBreed;
        if (breed) this.setBreed(breed);
      });
    });

    this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-activity]").forEach((button) => {
      button.addEventListener("click", () => {
        const activity = button.dataset.activity as PetActivityLevel;
        if (activity) this.setActivity(activity);
      });
    });

    this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-barking]").forEach((button) => {
      button.addEventListener("click", () => {
        const barking = button.dataset.barking as PetBarkingMode;
        if (barking) this.setBarking(barking);
      });
    });
  }

  private openPanel(): void {
    this.panel.dataset.open = "true";
    this.launcher.setAttribute("aria-expanded", "true");
  }

  private closePanel(): void {
    this.panel.dataset.open = "false";
    this.launcher.setAttribute("aria-expanded", "false");
  }

  private readInitialSize(): DigitalPetSize {
    if (this.getAttribute("remember-size") !== "false") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && isDigitalPetSize(saved)) return saved;
      } catch {
        // Ignore unavailable storage.
      }
    }
    const attribute = this.getAttribute("size");
    if (attribute && isDigitalPetSize(attribute)) return attribute;
    return "normal";
  }

  private placeInStartCorner(): void {
    const startCorner = this.getAttribute("start-corner") ?? "bottom-right";
    this.position.x =
      startCorner === "bottom-left"
        ? 12
        : window.innerWidth - this.displayWidth - 12;
    this.position.y = window.innerHeight - this.displayHeight - FLOOR_MARGIN;
    this.clampPosition();
  }

  private applyCanvasSize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.fallbackCanvas.width = Math.round(BASE_WIDTH * ratio);
    this.fallbackCanvas.height = Math.round(BASE_HEIGHT * ratio);
    for (const canvas of [this.fallbackCanvas, this.webglCanvas]) {
      canvas.style.width = `${this.displayWidth}px`;
      canvas.style.height = `${this.displayHeight}px`;
    }
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.threeRenderer?.resize();
  }

  private initializeRenderer(): void {
    const preference = this.getAttribute("renderer") ?? "auto";
    const previousRenderer = this.rendererValue;
    this.threeRenderer?.dispose();
    this.threeRenderer = null;

    if (preference === "2d") {
      this.rendererValue = "2d";
      this.canvas = this.fallbackCanvas;
      this.webglCanvas.hidden = true;
      this.fallbackCanvas.hidden = !this.visible;
      this.syncRendererControls();
      this.dispatchRendererChange(previousRenderer);
      return;
    }

    try {
      this.threeRenderer = new ThreePetRenderer(this.webglCanvas);
      this.threeRenderer.setBreed(this.currentBreed);
      this.rendererValue = "3d";
      this.canvas = this.webglCanvas;
      this.webglCanvas.hidden = !this.visible;
      this.fallbackCanvas.hidden = true;
      const modelUrl = this.getAttribute("model-src") || new URL("../assets/golden-retriever.glb", import.meta.url).href;
      if (modelUrl && modelUrl !== "procedural" && modelUrl !== "none") {
        void this.threeRenderer.loadGLTFModel(modelUrl);
      }
    } catch {
      this.threeRenderer = null;
      this.rendererValue = "2d";
      this.canvas = this.fallbackCanvas;
      this.webglCanvas.hidden = true;
      this.fallbackCanvas.hidden = !this.visible;
      if (preference === "3d") {
        this.dispatchEvent(new CustomEvent("digital-pet-renderer-fallback"));
      }
    }
    this.applyCanvasSize();
    this.syncRendererControls();
    this.syncSoundControls();
    this.dispatchRendererChange(previousRenderer);
  }

  private dispatchRendererChange(previousRenderer: DigitalPetRenderer): void {
    if (previousRenderer === this.rendererValue) return;
    this.dispatchEvent(
      new CustomEvent("digital-pet-renderer-change", {
        bubbles: true,
        composed: true,
        detail: { renderer: this.rendererValue },
      }),
    );
  }

  private syncRendererControls(): void {
    this.shadowRoot?.querySelectorAll<HTMLButtonElement>("[data-renderer]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.renderer === this.rendererValue));
    });
  }

  private syncSoundControls(): void {
    const button = this.shadowRoot?.querySelector<HTMLButtonElement>(".sound-toggle");
    const volume = this.shadowRoot?.querySelector<HTMLInputElement>(".sound-volume");
    if (button) {
      button.textContent = this.soundEnabled ? "Disable sounds" : "Enable sounds";
      button.setAttribute("aria-pressed", String(this.soundEnabled));
    }
    if (volume) volume.value = String(this.volume);
  }

  private syncSizeButtons(): void {
    const buttons = this.sizesContainer.querySelectorAll<HTMLButtonElement>("[data-size]");
    for (const button of buttons) {
      button.setAttribute("aria-pressed", String(button.dataset.size === this.sizeValue));
    }
  }

  private readonly handleGlobalPointerMove = (event: PointerEvent): void => {
    this.pointer = { x: event.clientX, y: event.clientY };
    this.pointerMovedAt = performance.now();
  };

  private readonly handleGlobalPointerDown = (event: PointerEvent): void => {
    if (!this.isInteractiveFetchActive) return;
    const path = event.composedPath();
    if (path.includes(this.panel) || path.includes(this.launcher) || path.includes(this.canvas)) {
      return;
    }
    this.throwFetchBall(event.clientX, event.clientY);
  };

  private startInteractiveFetch(): void {
    if (this.isInteractiveFetchActive) return;
    this.isInteractiveFetchActive = true;
    this.fetchReturnPoint = { ...this.position };
    this.say("Throw the ball! 🎾");
    this.playBark("excited");
    this.setBehavior("wag");

    if (this.shadowRoot && !this.fetchPromptElement) {
      const toast = document.createElement("div");
      toast.className = "fetch-prompt-toast";
      toast.innerHTML = "<span>🎾</span><span>Click anywhere on the screen to throw the ball!</span>";
      this.shadowRoot.appendChild(toast);
      this.fetchPromptElement = toast;
    }

    if (this.fetchTimeoutTimer) window.clearTimeout(this.fetchTimeoutTimer);
    this.fetchTimeoutTimer = window.setTimeout(() => {
      if (this.isInteractiveFetchActive) {
        const throwX = clamp(this.position.x + (this.direction > 0 ? 300 : -300), 80, window.innerWidth - 80);
        const throwY = clamp(this.position.y + 20, 80, window.innerHeight - 120);
        this.throwFetchBall(throwX, throwY);
      }
    }, 10000);
  }

  private cancelInteractiveFetchPrompt(): void {
    this.isInteractiveFetchActive = false;
    if (this.fetchTimeoutTimer) {
      window.clearTimeout(this.fetchTimeoutTimer);
      this.fetchTimeoutTimer = null;
    }
    if (this.fetchPromptElement) {
      this.fetchPromptElement.remove();
      this.fetchPromptElement = null;
    }
  }

  private throwFetchBall(targetX: number, targetY: number): void {
    this.cancelInteractiveFetchPrompt();
    if (this.fetchBallElement) {
      this.fetchBallElement.remove();
      this.fetchBallElement = null;
    }

    const startX = this.position.x + (this.direction > 0 ? this.displayWidth * 0.7 : this.displayWidth * 0.3);
    const startY = this.position.y + this.displayHeight * 0.45;

    const ball = document.createElement("div");
    ball.className = "fetch-ball-element";
    this.shadowRoot?.appendChild(ball);
    this.fetchBallElement = ball;

    const landingX = clamp(targetX - 13, 20, window.innerWidth - 46);
    const landingY = clamp(targetY - 13, 20, window.innerHeight - 46);

    const midX = (startX + landingX) / 2;
    const midY = Math.min(startY, landingY) - 130;

    ball.animate(
      [
        { transform: `translate3d(${startX}px, ${startY}px, 0) scale(0.85)` },
        { transform: `translate3d(${midX}px, ${midY}px, 0) scale(1.2)`, offset: 0.5 },
        { transform: `translate3d(${landingX}px, ${landingY}px, 0) scale(1.0)`, offset: 0.8 },
        { transform: `translate3d(${landingX}px, ${landingY - 26}px, 0) scale(0.95)`, offset: 0.9 },
        { transform: `translate3d(${landingX}px, ${landingY}px, 0) scale(1.0)`, offset: 1.0 },
      ],
      {
        duration: 650,
        easing: "cubic-bezier(0.25, 0.8, 0.25, 1)",
        fill: "forwards",
      },
    );

    this.say("Got it!");
    this.playBark("happy");
    this.fetchPhase = "chasing";
    this.targetPosition = {
      x: clamp(landingX - this.displayWidth / 2 + 13, 0, Math.max(0, window.innerWidth - this.displayWidth)),
      y: clamp(landingY - this.displayHeight / 2 + 13, 0, Math.max(0, window.innerHeight - this.displayHeight - FLOOR_MARGIN)),
    };
    this.setBehavior("running");
  }

  private spawnDroppedBall(): void {
    const ball = document.createElement("div");
    ball.className = "fetch-ball-element";
    this.shadowRoot?.appendChild(ball);

    const dropX = this.position.x + (this.direction > 0 ? this.displayWidth * 0.72 : this.displayWidth * 0.28);
    const dropY = this.position.y + this.displayHeight * 0.65;

    ball.animate(
      [
        { transform: `translate3d(${dropX}px, ${dropY - 24}px, 0) scale(0.9)` },
        { transform: `translate3d(${dropX}px, ${dropY}px, 0) scale(1.15, 0.85)`, offset: 0.4 },
        { transform: `translate3d(${dropX}px, ${dropY - 12}px, 0) scale(1.0)`, offset: 0.7 },
        { transform: `translate3d(${dropX}px, ${dropY}px, 0) scale(1.0)`, offset: 1.0 },
      ],
      {
        duration: 500,
        easing: "ease-out",
        fill: "forwards",
      },
    );

    window.setTimeout(() => {
      ball.style.opacity = "0";
      window.setTimeout(() => ball.remove(), 400);
    }, 2800);
  }

  private handlePetting(now: number): void {
    if (this.lastPetParticleTime === 0 || Math.abs(now - this.lastPetParticleTime) > 180) {
      this.lastPetParticleTime = now;
      this.spawnPetParticle();
    }
    if (this.lastPetSoundTime === 0 || Math.abs(now - this.lastPetSoundTime) > 4000) {
      this.lastPetSoundTime = now;
      this.playBark("happy");
    }
  }

  private spawnPetParticle(): void {
    if (!this.shadowRoot) return;
    const symbols = ["💖", "✨", "🐾", "💕", "⭐", "🥰"];
    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const particle = document.createElement("div");
    particle.className = "particle";
    particle.textContent = symbol;

    const spawnX = this.position.x + this.displayWidth * 0.35 + (Math.random() - 0.5) * (this.displayWidth * 0.45);
    const spawnY = this.position.y + this.displayHeight * 0.35 + (Math.random() - 0.5) * (this.displayHeight * 0.3);
    const drift = (Math.random() - 0.5) * 44;
    const rotStart = (Math.random() - 0.5) * 20;
    const rotMid = (Math.random() - 0.5) * 35;
    const rotEnd = (Math.random() - 0.5) * 50;

    particle.style.setProperty("--x", `${spawnX}px`);
    particle.style.setProperty("--y", `${spawnY}px`);
    particle.style.setProperty("--drift", `${drift}px`);
    particle.style.setProperty("--rot-start", `${rotStart}deg`);
    particle.style.setProperty("--rot-mid", `${rotMid}deg`);
    particle.style.setProperty("--rot-end", `${rotEnd}deg`);

    this.shadowRoot.appendChild(particle);
    window.setTimeout(() => particle.remove(), 1300);
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    this.dragging = true;
    this.didDrag = false;
    this.dragStart = { x: event.clientX, y: event.clientY };
    this.dragOffset = {
      x: event.clientX - this.position.x,
      y: event.clientY - this.position.y,
    };
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly handleCanvasPointerMove = (event: PointerEvent): void => {
    if (!this.dragging) return;
    if (Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y) > 4) {
      this.didDrag = true;
    }
    this.position.x = event.clientX - this.dragOffset.x;
    this.position.y = event.clientY - this.dragOffset.y;
    this.clampPosition();
    this.setBehavior("idle");
  };

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    const wasDragging = this.dragging;
    this.dragging = false;
    if (wasDragging && !this.didDrag) {
      this.randomTrick();
    }
  };

  private readonly handleResize = (): void => {
    this.applyCanvasSize();
    this.clampPosition();
  };

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      cancelAnimationFrame(this.animationFrame);
    } else if (this.connected) {
      this.lastFrame = performance.now();
      this.animationFrame = requestAnimationFrame(this.tick);
    }
  };

  private readonly handleReducedMotionChange = (): void => {
    if (this.reducedMotion.matches) {
      this.setBehavior("idle");
    }
  };

  private readonly tick = (now: number): void => {
    const deltaSeconds = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;

    if (this.visible) {
      this.update(now, deltaSeconds);
      this.facingScale = damp(this.facingScale, this.direction, 8.5, deltaSeconds);
      this.renderedBounce = damp(this.renderedBounce, this.bodyBounce(now / 1000), 16, deltaSeconds);

      const centerX = this.position.x + this.displayWidth / 2;
      const centerY = this.position.y + this.displayHeight / 2;
      const diffX = this.pointer.x - centerX;
      const diffY = this.pointer.y - centerY;
      const pointerDistance = Math.hypot(diffX, diffY);
      const hasPointer = this.pointer.x >= 0 && this.pointer.y >= 0;
      const pointerAngleX = hasPointer ? clamp(diffX / Math.max(1, this.displayWidth * 0.85), -1.2, 1.2) : 0;
      const pointerAngleY = hasPointer ? clamp(diffY / Math.max(1, this.displayHeight * 0.85), -1.2, 1.2) : 0;

      const pointerMoving =
        Math.abs(performance.now() - this.pointerMovedAt) < 800 ||
        (this.pointerMovedAt > 0 && Math.abs(now - this.pointerMovedAt) < 800);
      const isPetting = (
        hasPointer &&
        pointerDistance < this.displayWidth * 0.55 &&
        pointerMoving &&
        !this.dragging &&
        this.fetchPhase === "idle" &&
        ["idle", "sit", "quiet", "ask-food", "handshake", "hi-five", "wag"].includes(this.behavior)
      );
      this.isCurrentlyPetting = isPetting;

      if (isPetting) {
        this.handlePetting(now);
      }

      if (this.threeRenderer) {
        this.threeRenderer.render({
          behavior: this.behavior,
          progress: this.behaviorProgress,
          time: now / 1000,
          facing: this.facingScale,
          ballColor: this.ballColor,
          reducedMotion: this.reducedMotion.matches,
          pointerDistance,
          pointerAngleX,
          pointerAngleY,
          isPetting,
          carryingBall: this.carryingBall,
          breed: this.currentBreed,
        });
      } else {
        this.draw(now / 1000);
      }
      this.canvas.style.transform = `translate3d(${this.position.x}px, ${this.position.y}px, 0)`;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };

  private update(now: number, deltaSeconds: number): void {
    const hungerElapsedMinutes = (now - this.lastHungerUpdate) / 60000;
    this.lastHungerUpdate = now;
    const hungerRate =
      this.activityValue === "calm"
        ? 0.35
        : this.activityValue === "manual"
          ? 0.20
          : this.activityValue === "normal"
            ? 0.85
            : 1.8;
    this.hunger = clamp(this.hunger + hungerElapsedMinutes * hungerRate, 0, 100);

    if (this.behaviorEndsAt !== null && now >= this.behaviorEndsAt) {
      this.behaviorEndsAt = null;
      if (this.fetchPhase === "idle") {
        this.setBehavior("idle");
        if (this.activityValue === "manual") {
          this.nextDecisionAt = Number.POSITIVE_INFINITY;
        } else if (this.activityValue === "calm") {
          this.nextDecisionAt = now + randomBetween(20000, 45000);
        } else if (this.activityValue === "normal") {
          this.nextDecisionAt = now + randomBetween(10000, 22000);
        } else {
          this.nextDecisionAt = now + randomBetween(4000, 8000);
        }
      }
    }

    if (!this.reducedMotion.matches) {
      if (this.behavior === "walking") this.updateMovement(deltaSeconds, 60);
      if (this.behavior === "running") this.updateMovement(deltaSeconds, this.fetchPhase !== "idle" ? 280 : 132);
      if (this.behavior === "chasing") this.updateChase(deltaSeconds);
      this.updateCursorReaction(now);
    }

    if (
      this.activityValue !== "manual" &&
      now >= this.nextDecisionAt &&
      this.behaviorEndsAt === null &&
      this.fetchPhase === "idle" &&
      !["chasing", "sleeping"].includes(this.behavior)
    ) {
      this.chooseAutonomousBehavior();
    }
  }

  private updateCursorReaction(now: number): void {
    if (!this.cursorInteractionEnabled || this.dragging || this.fetchPhase !== "idle" || this.isCurrentlyPetting) return;

    const centerX = this.position.x + this.displayWidth / 2;
    const centerY = this.position.y + this.displayHeight / 2;
    const distance = Math.hypot(this.pointer.x - centerX, this.pointer.y - centerY);
    const pointerIsMoving = now - this.pointerMovedAt < 700;

    if (distance < 240 && !["sleeping", "down"].includes(this.behavior) && this.behaviorEndsAt === null) {
      if (Math.abs(this.pointer.x - centerX) > 28) {
        this.direction = this.pointer.x < centerX ? -1 : 1;
      }
      if (pointerIsMoving && distance > this.displayWidth * 0.55) {
        this.setBehavior("chasing");
      } else if (this.behavior === "chasing") {
        this.setBehavior("idle");
      }
    } else if (this.behavior === "chasing") {
      this.setBehavior("idle");
    }
  }

  private updateMovement(deltaSeconds: number, speed: number): void {
    if (this.targetPosition === null) {
      this.setBehavior("idle");
      return;
    }
    const diffX = this.targetPosition.x - this.position.x;
    const diffY = this.targetPosition.y - this.position.y;
    const distance = Math.hypot(diffX, diffY);

    if (this.fetchPhase === "chasing" && distance < 48) {
      if (this.fetchBallElement) {
        this.fetchBallElement.remove();
        this.fetchBallElement = null;
      }
      this.carryingBall = true;
      this.fetchPhase = "returning";
      this.say("Got the ball! 🎾");
      this.playBark("happy");
      this.targetPosition = { ...this.fetchReturnPoint };
      this.setBehavior("running");
      return;
    }

    if (this.fetchPhase === "returning" && distance < 48) {
      this.carryingBall = false;
      this.fetchPhase = "idle";
      this.position.x = this.targetPosition.x;
      this.position.y = this.targetPosition.y;
      this.targetPosition = null;
      this.horizontalVelocity = 0;
      this.verticalVelocity = 0;
      this.spawnDroppedBall();
      this.setBehavior("wag");
      this.behaviorEndsAt = performance.now() + 3500;
      this.say("Good boy! 🎾");
      this.playBark("happy");
      this.nextDecisionAt = performance.now() + (this.activityValue === "calm" ? 25000 : 7000);
      return;
    }

    if (distance < 5) {
      this.position.x = this.targetPosition.x;
      this.position.y = this.targetPosition.y;
      this.targetPosition = null;
      this.horizontalVelocity = 0;
      this.verticalVelocity = 0;
      this.setBehavior("idle");
      if (this.activityValue === "manual") {
        this.nextDecisionAt = Number.POSITIVE_INFINITY;
      } else if (this.activityValue === "calm") {
        this.nextDecisionAt = performance.now() + randomBetween(20000, 45000);
      } else if (this.activityValue === "normal") {
        this.nextDecisionAt = performance.now() + randomBetween(10000, 22000);
      } else {
        this.nextDecisionAt = performance.now() + randomBetween(4000, 8000);
      }
      return;
    }
    if (Math.abs(diffX) > 8) {
      this.direction = diffX < 0 ? -1 : 1;
    }
    const approachScale = clamp(distance / 70, 0.25, 1);
    const desiredVx = (diffX / distance) * speed * approachScale;
    const desiredVy = (diffY / distance) * (speed * 0.75) * approachScale;
    this.horizontalVelocity = damp(this.horizontalVelocity, desiredVx, 9, deltaSeconds);
    this.verticalVelocity = damp(this.verticalVelocity, desiredVy, 9, deltaSeconds);
    this.position.x += this.horizontalVelocity * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    this.clampPosition();
  }

  private updateChase(deltaSeconds: number): void {
    const desiredX = clamp(this.pointer.x - this.displayWidth / 2, 0, Math.max(0, window.innerWidth - this.displayWidth));
    const desiredY = clamp(this.pointer.y - this.displayHeight / 2, 0, Math.max(0, window.innerHeight - this.displayHeight - FLOOR_MARGIN));
    const diffX = desiredX - this.position.x;
    const diffY = desiredY - this.position.y;
    const distance = Math.hypot(diffX, diffY);
    if (distance < 45) return;
    if (Math.abs(diffX) > 8) {
      this.direction = diffX < 0 ? -1 : 1;
    }
    const desiredVx = (diffX / distance) * 92;
    const desiredVy = (diffY / distance) * 75;
    this.horizontalVelocity = damp(this.horizontalVelocity, desiredVx, 10, deltaSeconds);
    this.verticalVelocity = damp(this.verticalVelocity, desiredVy, 10, deltaSeconds);
    this.position.x += this.horizontalVelocity * deltaSeconds;
    this.position.y += this.verticalVelocity * deltaSeconds;
    this.clampPosition();
  }

  private chooseAutonomousBehavior(): void {
    if (this.activityValue === "manual") {
      this.nextDecisionAt = Number.POSITIVE_INFINITY;
      return;
    }

    if (this.hunger >= 88 || (this.hunger >= 75 && Math.random() > 0.7)) {
      this.setTimedBehavior("ask-food", TRICK_DURATION["ask-food"] ?? 3200);
      this.say("Food, please?");
      this.playBark("hungry");
      this.dispatchEvent(
        new CustomEvent("digital-pet-food-request", {
          bubbles: true,
          composed: true,
          detail: { hunger: Math.round(this.hunger) },
        }),
      );
      return;
    }

    if (this.activityValue === "calm") {
      const roll = Math.random() * 100;
      if (roll < 45) {
        this.setTimedBehavior("idle", randomBetween(15000, 30000));
        this.say(Math.random() > 0.6 ? "Resting peacefully..." : "Observing room...");
      } else if (roll < 70) {
        this.setTimedBehavior("sit", randomBetween(12000, 24000));
        this.say("Sitting calmly...");
      } else if (roll < 88) {
        this.startMoving(false); // Gentle stroll
      } else {
        this.moveToNearestCorner();
        this.setTimedBehavior("sleeping", randomBetween(25000, 50000));
        this.say("Zzz...");
      }
      return;
    }

    if (this.activityValue === "normal") {
      const roll = Math.random() * 100;
      if (roll < 35) {
        this.setTimedBehavior("idle", randomBetween(8000, 16000));
        this.say(Math.random() > 0.5 ? "Watching..." : "Chilling...");
      } else if (roll < 60) {
        this.startMoving(false);
      } else if (roll < 75) {
        this.setTimedBehavior("sit", randomBetween(6000, 12000));
      } else if (roll < 88) {
        this.randomTrick();
      } else {
        this.moveToNearestCorner();
        this.setTimedBehavior("sleeping", randomBetween(15000, 30000));
        this.say("Zzz...");
      }
      return;
    }

    // Playful mode
    const roll = Math.random() * 100;
    if (roll < 24) {
      this.startMoving(false);
    } else if (roll < 44) {
      this.startMoving(true);
    } else if (roll < 60) {
      this.startAutonomousPlay("fetch");
    } else if (roll < 72) {
      this.randomTrick();
    } else if (roll < 84) {
      this.startAutonomousPlay("surprise");
    } else if (roll < 92) {
      this.setTimedBehavior("idle", randomBetween(4000, 7000));
      this.say("Play with me! 🎾");
    } else {
      this.moveToNearestCorner();
      this.setTimedBehavior("sleeping", randomBetween(10000, 20000));
      this.say("Quick nap... Zzz");
    }
  }

  private startAutonomousPlay(command: Extract<DigitalPetCommand, "fetch" | "speak" | "surprise">): void {
    if (command === "fetch") {
      this.ballColor = BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)];
      this.startInteractiveFetch();
      return;
    }

    if (command === "speak") {
      this.setTimedBehavior("speak", TRICK_DURATION.speak ?? 1600);
      this.say("Woof!");
      this.playBark("speak");
      return;
    }

    this.setTimedBehavior("surprise", TRICK_DURATION.surprise ?? 2800);
    this.say("Surprise!");
    this.playBark("excited");
  }

  private startMoving(running: boolean): void {
    const maxX = Math.max(0, window.innerWidth - this.displayWidth);
    const maxY = Math.max(0, window.innerHeight - this.displayHeight - FLOOR_MARGIN);
    const minY = Math.max(0, Math.min(maxY, window.innerHeight * 0.12));
    this.targetPosition = {
      x: randomBetween(0, maxX),
      y: randomBetween(minY, maxY),
    };
    this.setBehavior(running ? "running" : "walking");
    this.nextDecisionAt = Number.POSITIVE_INFINITY;
  }

  private setBehavior(behavior: Behavior): void {
    if (this.behavior !== behavior) {
      this.behavior = behavior;
      this.behaviorStartedAt = performance.now();
    }
    if (!["walking", "running"].includes(behavior)) {
      this.targetPosition = null;
    }
    if (!["walking", "running", "chasing"].includes(behavior)) {
      this.horizontalVelocity = 0;
      this.verticalVelocity = 0;
    }
  }

  private setTimedBehavior(behavior: Behavior, durationMs: number): void {
    this.setBehavior(behavior);
    this.behaviorEndsAt = performance.now() + durationMs;
    this.nextDecisionAt = Number.POSITIVE_INFINITY;
  }

  private moveToNearestCorner(): void {
    const left = 10;
    const right = window.innerWidth - this.displayWidth - 10;
    this.position.x = Math.abs(this.position.x - left) < Math.abs(this.position.x - right) ? left : right;
    this.position.y = window.innerHeight - this.displayHeight - FLOOR_MARGIN;
    this.clampPosition();
  }

  private clampPosition(): void {
    this.position.x = clamp(this.position.x, 0, Math.max(0, window.innerWidth - this.displayWidth));
    this.position.y = clamp(this.position.y, 0, Math.max(0, window.innerHeight - this.displayHeight));
  }

  private say(text: string): void {
    for (const canvas of [this.fallbackCanvas, this.webglCanvas]) {
      canvas.setAttribute("aria-label", `${this.petName} says ${text}`);
    }
    window.setTimeout(() => {
      for (const canvas of [this.fallbackCanvas, this.webglCanvas]) {
        canvas.setAttribute(
          "aria-label",
          `${this.petName}, the digital golden retriever. Click for a trick, drag to move.`,
        );
      }
    }, 2200);
  }

  private draw(time: number): void {
    const ctx = this.context;
    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.save();
    // The character artwork uses the same bottom-up coordinates as AppKit.
    ctx.translate(0, BASE_HEIGHT);
    ctx.scale(1, -1);

    this.drawRestingBalls(ctx);
    ctx.translate(BASE_WIDTH / 2, 11 + this.renderedBounce);
    ctx.scale(this.facingScale, 1);
    ctx.translate(-BASE_WIDTH / 2, 0);
    const lean = this.bodyLean(time);
    ctx.translate(108, 62);
    ctx.rotate(lean);
    ctx.translate(-108, -62);
    this.applyTrickTransform(ctx);

    this.drawShadow(ctx);
    if (this.behavior === "roll-over") {
      this.drawRollingShiro(ctx, time);
    } else if (this.behavior === "sleeping" || this.behavior === "down") {
      this.drawLyingShiro(ctx, this.behavior === "sleeping", time);
    } else if (["sit", "handshake", "hi-five", "salute", "namaste"].includes(this.behavior)) {
      this.drawSittingShiro(ctx, this.behavior, time);
    } else {
      this.drawStandingShiro(ctx, time);
    }
    if (this.behavior === "fetch") {
      this.drawFetchBall(ctx);
    }
    ctx.restore();
  }

  private bodyBounce(time: number): number {
    if (this.reducedMotion.matches) return 0;
    if (this.behavior === "walking") return Math.abs(Math.sin(time * 8)) * 4;
    if (["running", "chasing"].includes(this.behavior)) return Math.abs(Math.sin(time * 14)) * 7;
    if (this.behavior === "jump") return Math.abs(Math.sin(this.behaviorProgress * Math.PI)) * 30;
    if (this.behavior === "roll-over") return 10;
    if (this.behavior === "fetch") return Math.abs(Math.sin(this.behaviorProgress * Math.PI * 3)) * 4;
    if (this.behavior === "sleeping") return Math.sin(time * 1.5) * 0.8;
    return Math.sin(time * 2) * 1.2;
  }

  private bodyLean(time: number): number {
    if (this.reducedMotion.matches || ["sleeping", "down", "roll-over"].includes(this.behavior)) return 0;
    if (this.behavior === "walking") return Math.sin(time * 8) * 0.018;
    if (["running", "chasing"].includes(this.behavior)) return -0.045 + Math.sin(time * 14) * 0.024;
    if (this.behavior === "jump") return Math.sin(this.behaviorProgress * Math.PI * 2) * 0.04;
    return Math.sin(time * 1.4) * 0.006;
  }

  private wagAngle(time: number): number {
    if (this.reducedMotion.matches) return 0;
    const speed =
      this.behavior === "fetch"
        ? 24
        : ["running", "chasing"].includes(this.behavior)
          ? 19
          : this.behavior === "walking"
            ? 12
            : this.behavior === "sleeping"
              ? 1
              : 6;
    return Math.sin(time * speed) * 0.42;
  }

  private get behaviorProgress(): number {
    const duration = TRICK_DURATION[this.behavior] ?? 2400;
    return easeInOutCubic(clamp((performance.now() - this.behaviorStartedAt) / duration, 0, 1));
  }

  private applyTrickTransform(ctx: CanvasRenderingContext2D): void {
    if (this.behavior !== "roll-over") return;
    ctx.translate(0, Math.sin(this.behaviorProgress * Math.PI * 2) * 5);
  }

  private drawStandingShiro(ctx: CanvasRenderingContext2D, time: number): void {
    const legOffset = this.legOffset(time);
    const jumpTuck =
      this.behavior === "jump" ? Math.sin(this.behaviorProgress * Math.PI) * 13 : 0;

    this.drawPlumeTail(ctx, { x: 49, y: 75 }, false, time);
    this.drawFeatheredLeg(ctx, 54, 27 - legOffset * 0.72 + jumpTuck, true);
    this.drawFeatheredLeg(ctx, 108, 27 + legOffset * 0.72 + jumpTuck, true);
    gradientEllipse(ctx, 43, 47, 115, 68, DEEP_GOLDEN, GOLDEN, LIGHT_GOLDEN);
    ellipse(ctx, 57, 49, 89, 54, colorWithAlpha(LIGHT_GOLDEN, 0.34));
    ellipse(ctx, 52, 82, 95, 28, colorWithAlpha(DEEP_GOLDEN, 0.19));
    ellipse(ctx, 104, 55, 46, 50, colorWithAlpha(HIGHLIGHT_GOLDEN, 0.16));
    this.drawFurTufts(ctx, { x: 59, y: 59 }, { x: 132, y: 61 }, 9, colorWithAlpha(CREAM, 0.55));
    this.drawFurTufts(ctx, { x: 73, y: 95 }, { x: 132, y: 97 }, 8, colorWithAlpha(DARK_GOLDEN, 0.35));

    this.drawFeatheredLeg(ctx, 63, 24 + legOffset + jumpTuck, false);
    this.drawFeatheredLeg(ctx, 120, 24 - legOffset + jumpTuck, false);
    this.drawChestRuff(ctx, { x: 137, y: 77 });
    this.drawHead(ctx, { x: 123, y: 71 }, this.mouthOpen, false, false);

    if (this.behavior === "speak") {
      this.drawSoundLines(ctx, time);
    }
  }

  private drawLyingShiro(ctx: CanvasRenderingContext2D, asleep: boolean, time: number): void {
    gradientEllipse(ctx, 35, 31, 132, 69, DEEP_GOLDEN, GOLDEN, LIGHT_GOLDEN);
    ellipse(ctx, 53, 40, 94, 49, colorWithAlpha(LIGHT_GOLDEN, 0.42));
    this.drawPlumeTail(ctx, { x: 53, y: 65 }, true, time);
    this.drawFurTufts(ctx, { x: 61, y: 42 }, { x: 132, y: 45 }, 8, colorWithAlpha(CREAM, 0.75));
    roundRect(ctx, 73, 26, 71, 24, 12, LIGHT_GOLDEN);
    this.drawHead(ctx, { x: 124, y: 35 }, false, asleep, true);

    if (asleep) {
      ctx.save();
      ctx.translate(0, BASE_HEIGHT);
      ctx.scale(1, -1);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "700 18px system-ui";
      ctx.fillText("z", 170, 77 - ((time * 8) % 10));
      ctx.font = "800 23px system-ui";
      ctx.fillText("Z", 188, 60 - ((time * 8) % 10));
      ctx.restore();
    }
  }

  private drawRollingShiro(ctx: CanvasRenderingContext2D, time: number): void {
    const progress = this.behaviorProgress;
    const onBack = Math.sin(progress * Math.PI);
    const sideDirection = Math.sin(progress * Math.PI * 2);

    ctx.save();
    ctx.translate(108, 62);
    ctx.rotate(sideDirection * 0.17);
    ctx.scale(1, 1 - Math.abs(sideDirection) * 0.23);
    ctx.translate(-108, -62);

    gradientEllipse(ctx, 34, 31, 135, 70, DEEP_GOLDEN, GOLDEN, LIGHT_GOLDEN);
    ellipse(ctx, 53, 40, 95, 49, colorWithAlpha(LIGHT_GOLDEN, 0.42));
    this.drawPlumeTail(ctx, { x: 52, y: 65 }, true, time);
    this.drawFurTufts(ctx, { x: 60, y: 43 }, { x: 132, y: 45 }, 8, colorWithAlpha(CREAM, 0.72));

    if (onBack > 0.48) {
      const pawLift = (onBack - 0.48) * 24;
      this.drawRaisedPaw(ctx, { x: 78, y: 65 }, { x: 74, y: 86 + pawLift }, true);
      this.drawRaisedPaw(ctx, { x: 111, y: 67 }, { x: 118, y: 88 + pawLift }, true);
      ellipse(ctx, 77, 48, 51, 34, colorWithAlpha(CREAM, 0.5));
      this.drawHead(ctx, { x: 128, y: 37 }, true, false, true);
    } else {
      roundRect(ctx, 74, 27, 72, 24, 12, LIGHT_GOLDEN);
      this.drawHead(ctx, { x: 125, y: 35 }, false, false, true);
    }
    ctx.restore();
  }

  private drawSittingShiro(ctx: CanvasRenderingContext2D, pose: Behavior, time: number): void {
    this.drawPlumeTail(ctx, { x: 61, y: 63 }, true, time);
    gradientEllipse(ctx, 55, 27, 96, 84, DEEP_GOLDEN, GOLDEN, LIGHT_GOLDEN);
    ellipse(ctx, 69, 32, 60, 64, colorWithAlpha(LIGHT_GOLDEN, 0.42));
    ellipse(ctx, 46, 21, 48, 33, GOLDEN);
    this.drawChestRuff(ctx, { x: 136, y: 79 });

    if (pose === "handshake") {
      this.drawFeatheredLeg(ctx, 113, 20);
      this.drawRaisedPaw(ctx, { x: 91, y: 71 }, { x: 162, y: 59 }, false);
    } else if (pose === "hi-five") {
      this.drawFeatheredLeg(ctx, 104, 20);
      this.drawRaisedPaw(ctx, { x: 94, y: 71 }, { x: 160, y: 121 }, true);
    } else if (pose === "salute") {
      this.drawFeatheredLeg(ctx, 110, 20);
      this.drawRaisedPaw(ctx, { x: 95, y: 71 }, { x: 156, y: 120 }, false);
    } else if (pose === "namaste") {
      this.drawNamastePaws(ctx);
    } else {
      this.drawFeatheredLeg(ctx, 84, 20);
      this.drawFeatheredLeg(ctx, 121, 20);
    }
    this.drawHead(ctx, { x: 121, y: 74 }, true, false, false);
  }

  private drawHead(
    ctx: CanvasRenderingContext2D,
    origin: Point,
    mouthOpen: boolean,
    eyesClosed: boolean,
    compact: boolean,
  ): void {
    const width = compact ? 62 : 69;
    const height = compact ? 55 : 69;
    gradientEllipse(
      ctx,
      origin.x,
      origin.y,
      width,
      height,
      DEEP_GOLDEN,
      GOLDEN,
      HIGHLIGHT_GOLDEN,
    );
    this.drawEar(ctx, origin.x + 7, origin.y + 20, false, compact);
    this.drawEar(ctx, origin.x + width - 9, origin.y + 20, true, compact);
    gradientEllipse(
      ctx,
      origin.x + 24,
      origin.y + 2,
      compact ? 43 : 48,
      compact ? 32 : 36,
      "#c98236",
      CREAM,
      "#ffe2a1",
    );
    gradientEllipse(ctx, origin.x + width - 10, origin.y + 16, 18, 14, "#050505", "#171717", "#48413d");
    ellipse(ctx, origin.x + width - 7, origin.y + 23, 5, 3, "rgba(255,255,255,.35)");

    if (eyesClosed) {
      this.drawClosedEye(ctx, origin.x + 32, origin.y + height - 24);
      this.drawClosedEye(ctx, origin.x + 54, origin.y + height - 25);
    } else {
      this.drawEye(ctx, origin.x + 31, origin.y + height - 26);
      this.drawEye(ctx, origin.x + 54, origin.y + height - 27);
    }

    if (mouthOpen) {
      ellipse(ctx, origin.x + 42, origin.y - 3, 25, 19, "#1d1511");
      roundRect(ctx, origin.x + 49, origin.y - 14, 14, 25, 7, TONGUE);
      strokePolyline(
        ctx,
        [{ x: origin.x + 56, y: origin.y - 11 }, { x: origin.x + 56, y: origin.y + 7 }],
        colorWithAlpha("#9d3149", 0.65),
        1,
      );
    } else {
      strokePolyline(
        ctx,
        [
          { x: origin.x + 44, y: origin.y + 9 },
          { x: origin.x + 51, y: origin.y + 6 },
          { x: origin.x + 58, y: origin.y + 9 },
        ],
        "#241914",
        2,
      );
    }

    this.drawEarFeathering(ctx, origin, width);
    this.drawFaceDetails(ctx, origin, width, height, compact);
    roundRect(ctx, origin.x + 11, origin.y + 8, width - 12, 6, 3, "#c72928");
    ellipse(ctx, origin.x + width / 2 + 5, origin.y + 1, 9, 9, "#f4c934");
  }

  private get mouthOpen(): boolean {
    return ["chasing", "running", "jump", "speak", "fetch", "ask-food", "feed", "treat"].includes(
      this.behavior,
    );
  }

  private legOffset(time: number): number {
    if (this.behavior === "walking") return Math.sin(time * 10) * 5;
    if (["running", "chasing"].includes(this.behavior)) return Math.sin(time * 17) * 9;
    if (this.behavior === "fetch") return Math.sin(time * 16) * 6;
    return 0;
  }

  private drawPlumeTail(
    ctx: CanvasRenderingContext2D,
    anchor: Point,
    resting: boolean,
    time: number,
  ): void {
    ctx.save();
    ctx.translate(anchor.x, anchor.y);
    ctx.rotate((resting ? -0.55 : 0) + this.wagAngle(time));
    const points = resting
      ? [{ x: 0, y: 0 }, { x: -22, y: 10 }, { x: -37, y: 5 }]
      : [{ x: 0, y: 0 }, { x: -14, y: 20 }, { x: -18, y: 40 }, { x: -5, y: 51 }];
    strokePolyline(ctx, points, DARK_GOLDEN, 20);
    strokePolyline(ctx, points, GOLDEN, 15);
    for (let offset = -7; offset <= 7; offset += 3.5) {
      strokePolyline(
        ctx,
        points.map((point) => ({ x: point.x + offset, y: point.y })),
        colorWithAlpha(CREAM, 0.42),
        1.3,
      );
    }
    ctx.restore();
  }

  private drawChestRuff(ctx: CanvasRenderingContext2D, center: Point): void {
    const points = [
      { x: center.x - 10, y: center.y + 13 },
      { x: center.x - 5, y: center.y + 5 },
      { x: center.x, y: center.y },
      { x: center.x + 6, y: center.y + 5 },
      { x: center.x + 11, y: center.y + 14 },
    ];
    points.forEach((point, index) => {
      ellipse(ctx, point.x, point.y, 20, 34 - (index % 2) * 4, colorWithAlpha(LIGHT_GOLDEN, 0.9));
    });
    this.drawFurTufts(
      ctx,
      { x: center.x - 5, y: center.y + 5 },
      { x: center.x + 18, y: center.y + 19 },
      6,
      colorWithAlpha(CREAM, 0.88),
    );
  }

  private drawFeatheredLeg(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    behind = false,
  ): void {
    const alpha = behind ? 0.72 : 1;
    gradientRoundRect(
      ctx,
      x,
      y,
      25,
      50,
      11,
      colorWithAlpha(DEEP_GOLDEN, alpha),
      colorWithAlpha(GOLDEN, alpha),
      colorWithAlpha(LIGHT_GOLDEN, alpha),
    );
    gradientEllipse(
      ctx,
      x - 3,
      y - 2,
      32,
      15,
      colorWithAlpha(DARK_GOLDEN, alpha),
      colorWithAlpha(LIGHT_GOLDEN, alpha),
      colorWithAlpha(HIGHLIGHT_GOLDEN, alpha),
    );
    for (let toe = 0; toe < 3; toe += 1) {
      strokeArc(
        ctx,
        { x: x + 7 + toe * 6, y: y + 4 },
        3,
        0.15,
        1.35,
        colorWithAlpha(DARK_GOLDEN, 0.42 * alpha),
      );
    }
    for (let offset = 1; offset <= 21; offset += 4) {
      strokePolyline(
        ctx,
        [{ x: x + offset, y: y + 16 }, { x: x + offset - 3, y: y + 4 }],
        colorWithAlpha(CREAM, 0.68),
        1.5,
      );
    }
  }

  private drawRaisedPaw(ctx: CanvasRenderingContext2D, start: Point, end: Point, vertical: boolean): void {
    strokePolyline(ctx, [start, end], DARK_GOLDEN, 20);
    strokePolyline(ctx, [start, end], GOLDEN, 15);
    if (vertical) {
      ellipse(ctx, end.x - 9, end.y - 2, 22, 28, LIGHT_GOLDEN);
    } else {
      ellipse(ctx, end.x - 2, end.y - 9, 29, 21, LIGHT_GOLDEN);
    }
  }

  private drawNamastePaws(ctx: CanvasRenderingContext2D): void {
    strokePolyline(ctx, [{ x: 92, y: 67 }, { x: 128, y: 70 }, { x: 141, y: 93 }], GOLDEN, 15);
    strokePolyline(ctx, [{ x: 120, y: 65 }, { x: 141, y: 93 }], GOLDEN, 15);
    ellipse(ctx, 133, 89, 18, 25, LIGHT_GOLDEN);
  }

  private drawEar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    mirrored: boolean,
    compact: boolean,
  ): void {
    const length = compact ? 31 : 44;
    const direction = mirrored ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y + 27);
    ctx.bezierCurveTo(
      x + direction * 20,
      y + 19,
      x + direction * 23,
      y - length + 18,
      x + direction * 13,
      y - length + 10,
    );
    ctx.bezierCurveTo(
      x + direction * 5,
      y - length + 3,
      x - direction * 5,
      y + 8,
      x + direction * 2,
      y + 23,
    );
    ctx.closePath();
    const earGradient = ctx.createLinearGradient(x, y - length, x, y + 27);
    earGradient.addColorStop(0, DEEP_GOLDEN);
    earGradient.addColorStop(0.55, DARK_GOLDEN);
    earGradient.addColorStop(1, GOLDEN);
    ctx.fillStyle = earGradient;
    ctx.fill();
  }

  private drawFaceDetails(
    ctx: CanvasRenderingContext2D,
    origin: Point,
    width: number,
    height: number,
    compact: boolean,
  ): void {
    const browY = origin.y + height - (compact ? 15 : 17);
    strokeArc(ctx, { x: origin.x + 34, y: browY }, 8, 0.15, 1.25, colorWithAlpha(DARK_GOLDEN, 0.48));
    strokeArc(ctx, { x: origin.x + 55, y: browY - 1 }, 8, 0.15, 1.25, colorWithAlpha(DARK_GOLDEN, 0.48));

    for (let index = 0; index < 3; index += 1) {
      const y = origin.y + 10 + index * 4;
      ellipse(ctx, origin.x + width - 23 - index * 2, y, 1.4, 1.4, colorWithAlpha(DARK_GOLDEN, 0.55));
      strokePolyline(
        ctx,
        [
          { x: origin.x + width - 21, y },
          { x: origin.x + width + 7, y: y + (index - 1) * 4 },
        ],
        colorWithAlpha("#fff7dd", 0.42),
        0.8,
      );
    }
  }

  private drawEarFeathering(ctx: CanvasRenderingContext2D, origin: Point, width: number): void {
    for (let offset = 0; offset <= 18; offset += 4.5) {
      strokePolyline(
        ctx,
        [
          { x: origin.x + 4 - offset * 0.2, y: origin.y + 28 - offset },
          { x: origin.x - 5 - offset * 0.3, y: origin.y + 18 - offset },
        ],
        colorWithAlpha(LIGHT_GOLDEN, 0.72),
        1.6,
      );
      strokePolyline(
        ctx,
        [
          { x: origin.x + width - 3 + offset * 0.2, y: origin.y + 28 - offset },
          { x: origin.x + width + 6 + offset * 0.3, y: origin.y + 18 - offset },
        ],
        colorWithAlpha(LIGHT_GOLDEN, 0.72),
        1.6,
      );
    }
  }

  private drawFurTufts(
    ctx: CanvasRenderingContext2D,
    start: Point,
    end: Point,
    count: number,
    color: string,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const progress = count === 1 ? 0 : index / (count - 1);
      const x = start.x + (end.x - start.x) * progress;
      const y = start.y + (end.y - start.y) * progress;
      strokePolyline(
        ctx,
        [{ x, y: y + 5 }, { x: x - 3, y: y - 3 }, { x: x + 2, y }],
        color,
        1.4,
      );
    }
  }

  private drawEye(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ellipse(ctx, x - 1, y - 1, 10, 12, colorWithAlpha(DARK_GOLDEN, 0.5));
    gradientEllipse(ctx, x, y, 8, 10, "#070605", "#3b2415", "#8a5b2f");
    ellipse(ctx, x + 1.5, y + 6.2, 2.7, 2.7, "#fff");
    ellipse(ctx, x + 4.6, y + 2.2, 1.2, 1.2, "rgba(255,255,255,.72)");
  }

  private drawClosedEye(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    strokePolyline(ctx, [{ x, y: y + 2 }, { x: x + 4, y }, { x: x + 8, y: y + 2 }], "#211712", 2);
  }

  private drawSoundLines(ctx: CanvasRenderingContext2D, time: number): void {
    const pulse = 3 + Math.sin(time * 18) * 2;
    strokeArc(ctx, { x: 199, y: 89 }, 9 + pulse, -0.7, 0.7, "rgba(255,255,255,.9)");
    strokeArc(ctx, { x: 199, y: 89 }, 17 + pulse, -0.7, 0.7, "rgba(255,255,255,.9)");
  }

  private drawFetchBall(ctx: CanvasRenderingContext2D): void {
    const progress = this.behaviorProgress;
    const center =
      progress < 0.58
        ? {
            x: 12 + (progress / 0.58) * 181,
            y: 38 + Math.sin((progress / 0.58) * Math.PI) * 78,
          }
        : { x: 199, y: 80 };
    this.drawBall(ctx, center, 11, this.ballColor);
  }

  private drawRestingBalls(ctx: CanvasRenderingContext2D): void {
    if (!["idle", "sleeping"].includes(this.behavior)) return;
    this.drawBall(ctx, { x: 27, y: 26 }, 10, BALL_COLORS[1]);
    this.drawBall(ctx, { x: 47, y: 21 }, 9, BALL_COLORS[2]);
    this.drawBall(ctx, { x: 40, y: 37 }, 8, BALL_COLORS[0]);
    this.drawBall(ctx, { x: 60, y: 31 }, 7, BALL_COLORS[3]);
  }

  private drawBall(ctx: CanvasRenderingContext2D, center: Point, radius: number, color: string): void {
    ellipse(ctx, center.x - radius, center.y - radius, radius * 2, radius * 2, color);
    strokeArc(ctx, center, radius * 0.62, -1.2, 1.2, "rgba(255,255,255,.75)");
    ellipse(
      ctx,
      center.x - radius * 0.42,
      center.y + radius * 0.24,
      radius * 0.38,
      radius * 0.25,
      "rgba(255,255,255,.35)",
    );
  }

  private drawShadow(ctx: CanvasRenderingContext2D): void {
    if (["sleeping", "down"].includes(this.behavior)) {
      ellipse(ctx, 30, 22, 170, 20, "rgba(0,0,0,.2)");
    } else {
      ellipse(ctx, 35, 19, 162, 19, "rgba(0,0,0,.2)");
    }
  }
}

export function defineDigitalPet(tagName = DigitalPetElement.tagName): void {
  if (!customElements.get(tagName)) {
    const constructor =
      tagName === DigitalPetElement.tagName
        ? DigitalPetElement
        : class extends DigitalPetElement {};
    customElements.define(tagName, constructor);
  }
}

export function mountDigitalPet(options: DigitalPetOptions = {}): DigitalPetElement {
  defineDigitalPet();
  const pet = document.createElement(DigitalPetElement.tagName) as DigitalPetElement;
  if (options.name) pet.setAttribute("name", options.name);
  if (options.controls === false) pet.setAttribute("controls", "false");
  if (options.cursorInteraction === false) pet.setAttribute("cursor-interaction", "false");
  if (options.sound !== undefined) pet.setAttribute("sound", String(options.sound));
  if (options.volume !== undefined) pet.setAttribute("volume", String(options.volume));
  if (options.renderer) pet.setAttribute("renderer", options.renderer);
  if (options.size) pet.setAttribute("size", options.size);
  if (options.zIndex !== undefined) pet.setAttribute("z-index", String(options.zIndex));
  if (options.startCorner) pet.setAttribute("start-corner", options.startCorner);
  if (options.modelSrc) pet.setAttribute("model-src", options.modelSrc);
  if (options.breed) pet.setAttribute("breed", options.breed);
  document.body.append(pet);
  return pet;
}

function isDigitalPetSize(value: string): value is DigitalPetSize {
  return DIGITAL_PET_SIZES.includes(value as DigitalPetSize);
}

function isDigitalPetRenderer(value: string): value is DigitalPetRenderer {
  return DIGITAL_PET_RENDERERS.includes(value as DigitalPetRenderer);
}

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function damp(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  return target + (current - target) * Math.exp(-smoothing * deltaSeconds);
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

function ellipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
): void {
  context.beginPath();
  context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function gradientEllipse(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  shadow: string,
  middle: string,
  highlight: string,
): void {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, shadow);
  gradient.addColorStop(0.48, middle);
  gradient.addColorStop(1, highlight);
  context.beginPath();
  context.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function gradientRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  shadow: string,
  middle: string,
  highlight: string,
): void {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, shadow);
  gradient.addColorStop(0.5, middle);
  gradient.addColorStop(1, highlight);
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = gradient;
  context.fill();
}

function strokePolyline(
  context: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number,
): void {
  const first = points[0];
  if (!first) return;
  context.save();
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (const point of points.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.stroke();
  context.restore();
}

function strokeArc(
  context: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  start: number,
  end: number,
  color: string,
): void {
  context.save();
  context.beginPath();
  context.arc(center.x, center.y, radius, start, end);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.lineCap = "round";
  context.stroke();
  context.restore();
}

function colorWithAlpha(hex: string, alpha: number): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

declare global {
  interface HTMLElementTagNameMap {
    "digital-pet": DigitalPetElement;
  }
}

defineDigitalPet();
