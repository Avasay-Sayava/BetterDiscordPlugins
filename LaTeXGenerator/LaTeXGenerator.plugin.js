/**
 * @name LaTeX Generator
 * @author Avasay-Sayava
 * @authorId 812235988659077120
 * @description Adds a button to the chat bar to generate and copy LaTeX equations as images.
 * @version 2.3.1
 * @source https://github.com/Avasay-Sayava/BetterDiscordPlugins/blob/main/LaTeXGenerator/LaTeXGenerator.plugin.js
 */

const {
  React,
  Components,
  Webpack,
  Data,
  UI: BdUI,
  DOM,
  Patcher,
  Logger,
} = BdApi;
const { useState, useEffect, useRef, createElement } = React;
const { Tooltip, ColorInput, SliderInput } = Components;

const { min, max } = Math;

const DiscordClasses = {
  ButtonWrapper: Webpack.getByKeys("buttonWrapper", "buttonContent"),
  Button: Webpack.getByKeys("emojiButton", "stickerButton"),
  Icon: Webpack.getByKeys("iconContainer", "trinketsIcon"),
};

const ModalActions = Webpack.getByKeys(
  "openModal",
  "closeModal",
  "closeAllModals",
);

const Plugin = {
  NAME: "LaTeX Generator",
  KEY: "LaTeXGenerator",
  PATCH_ID: "latex-generator",
};

const API = {
  NAME: "CodeCogs LaTeX API",
  URL: "https://latex.codecogs.com/",
};

const LATEX_PAYLOAD_FORMAT = (dpi, r, g, b, latex) =>
  `\\dpi{${dpi}} \\color[RGB]{${r},${g},${b}} ${latex}`;

const IMAGE_MIME_TYPE = "image/png";

const ERROR_MESSAGES = {
  CANVAS_CONTEXT_FAILED: "Failed to get canvas context.",
  BLOB_CREATION_FAILED: "Failed to create PNG blob.",
  CLIPBOARD_NOT_SUPPORTED:
    "Clipboard image write is not supported in this environment.",
  IMAGE_LOAD_FAILED: "Failed to load image from API.",
  IMAGE_PROCESS_FAILED: "Failed to process image.",
};

const TOAST_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
  DEFAULT: "default",
};

class Color {
  constructor(r, g, b, a = 1) {
    this.r = clamp(0, r, 255);
    this.g = clamp(0, g, 255);
    this.b = clamp(0, b, 255);
    this.a = clamp(0, a, 1);
  }

  static from(value, fallback = new Color(255, 255, 255, 1)) {
    if (value instanceof Color) return value.clone();

    if (Array.isArray(value)) {
      return new Color(value[0], value[1], value[2], value[3] ?? 1);
    }

    if (typeof value === "number") {
      return new Color((value >> 16) & 255, (value >> 8) & 255, value & 255, 1);
    }

    if (typeof value === "string") {
      const normalized = value.trim();

      let match = /^#([A-Fa-f0-9]{6})$/.exec(normalized);
      if (match) {
        const integer = Number.parseInt(match[1], 16);
        return new Color(
          (integer >> 16) & 255,
          (integer >> 8) & 255,
          integer & 255,
          1,
        );
      }

      match = /^#([A-Fa-f0-9]{8})$/.exec(normalized);
      if (match) {
        const integer = Number.parseInt(match[1], 16);
        return new Color(
          (integer >> 24) & 255,
          (integer >> 16) & 255,
          (integer >> 8) & 255,
          ((integer & 255) / 255).toFixed(3),
        );
      }

      match =
        /^rgba?\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+)\s*)?\)$/.exec(
          normalized,
        );
      if (match) {
        return new Color(match[1], match[2], match[3], match[4] ?? 1);
      }
    }

    if (value && typeof value === "object") {
      if (typeof value.hex === "string") {
        return Color.from(value.hex, fallback);
      }

      if (value.rgb && typeof value.rgb === "object") {
        return Color.from(value.rgb, fallback);
      }

      if (value.color && typeof value.color === "string") {
        return Color.from(value.color, fallback);
      }

      return new Color(value.r, value.g, value.b, value.a);
    }

    return fallback.clone();
  }

  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }

  get hex() {
    return `#${this.r.toString(16).padStart(2, "0")}${this.g
      .toString(16)
      .padStart(2, "0")}${this.b.toString(16).padStart(2, "0")}`.toUpperCase();
  }

  get rgba() {
    return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
  }

  get json() {
    return {
      r: this.r,
      g: this.g,
      b: this.b,
      a: this.a,
    };
  }
}

const CHAT_BAR_TYPES = {
  NORMAL: "normal",
  SIDEBAR: "sidebar",
};

const DEFAULT_LATEX_SETTINGS = {
  latex: "",
  dpi: 350,
  color: Color.from(0xffffff),
};

const DEFAULT_COLORS = [
  0x52e91e, 0x2ecc71, 0x1abc9c, 0x3498db, 0x3454db, 0x861ee9, 0x9b59b6,
  0xe91e63, 0xe9411e, 0xe74c3c, 0xe67e22, 0xf1c40f, 0xc7cccd, 0x708088,
  0x636363, 0x3bad14, 0x1f8b4c, 0x11806a, 0x206694, 0x203994, 0x6d14ad,
  0x71368a, 0xad1457, 0xad2014, 0x992d22, 0xa84300, 0xc27c0e, 0x979c9f,
  0x5d686d, 0x2c2c2c,
].map((color) => Color.from(color));

const SETTINGS_KEYS = {
  TERMS: "agreed-to-terms",
  AUTO_PREVIEW: "auto-preview",
  AUTO_BRACKET_CLOSE: "auto-bracket-close",
  LATEX_SETTINGS: "settings",
  SYNTAX_COLORS: "syntax-colors",
  MATCHED_BRACE_COLOR: "matched-brace-color",
  DEFAULT_COLOR: "default-color",
  DEFAULT_DPI: "default-dpi",
  RECENTS: "recents",
  MAX_RECENTS: "max-recents",
};

const DEFAULT_MAX_RECENTS = 20;

const SETTINGS_CATEGORIES = {
  GENERAL: "general",
  SYNTAX: "syntax-highlighting",
};

const SETTINGS_SAVE_DELAY = 500; // (ms)
const PREVIEW_UPDATE_DELAY = 500; // (ms)
const FOCUS_DELAY = 100; // (ms)

const BRACKET_PAIRS = {
  "(": ")",
  "[": "]",
  "{": "}",
};

const BRACKET_OPENINGS = Object.entries(BRACKET_PAIRS);
const BRACKET_CLOSINGS = Object.values(BRACKET_PAIRS);

const BRACKET_CLOSE_TO_OPEN = Object.fromEntries(
  BRACKET_OPENINGS.map(([opening, closing]) => [closing, opening]),
);

const LATEX_OPERATORS = ["^", "_", "=", "+", "-", "*", "/", "&"];

const SYNTAX_TYPES = {
  COMMAND: "command",
  BRACE: "brace",
  ERROR: "error",
  NUMBER: "number",
  OPERATOR: "operator",
  TEXT: "text",
};

const DEFAULT_SYNTAX_COLORS = {
  [SYNTAX_TYPES.COMMAND]: Color.from(0x7cc7ff),
  [SYNTAX_TYPES.BRACE]: Color.from(0xffd166),
  [SYNTAX_TYPES.ERROR]: Color.from(0xff5a5f),
  [SYNTAX_TYPES.NUMBER]: Color.from(0x9be370),
  [SYNTAX_TYPES.OPERATOR]: Color.from(0xff8fab),
  [SYNTAX_TYPES.TEXT]: Color.from(0xc7cccd),
  [SETTINGS_KEYS.MATCHED_BRACE_COLOR]: Color.from(0xc678dd),
};

const syntaxColorSetting = ({
  key,
  id = key ? `syntax-color-${key}` : undefined,
  name,
  note,
}) => ({
  key,
  id,
  name,
  note,
});

const SYNTAX_COLOR_SETTINGS = [
  syntaxColorSetting({
    key: SYNTAX_TYPES.COMMAND,
    name: "Syntax Command Color",
    note: "Hex color for LaTeX commands like \\frac and \\sqrt.",
  }),
  syntaxColorSetting({
    key: SYNTAX_TYPES.BRACE,
    name: "Syntax Brace Color",
    note: "Hex color for braces, brackets, and parentheses.",
  }),
  syntaxColorSetting({
    key: SYNTAX_TYPES.ERROR,
    name: "Syntax Error Color",
    note: "Hex color for unmatched opening or closing braces.",
  }),
  syntaxColorSetting({
    key: SYNTAX_TYPES.NUMBER,
    name: "Syntax Number Color",
    note: "Hex color for numeric values inside the editor.",
  }),
  syntaxColorSetting({
    key: SYNTAX_TYPES.OPERATOR,
    name: "Syntax Operator Color",
    note: "Hex color for operators like ^, _, +, -, and =.",
  }),
  syntaxColorSetting({
    key: SYNTAX_TYPES.TEXT,
    name: "Syntax Text Color",
    note: "Hex color for plain text that is not a command, brace, number, or operator.",
  }),
  syntaxColorSetting({
    key: SETTINGS_KEYS.MATCHED_BRACE_COLOR,
    name: "Matched Bracket Color",
    note: "Text color for the highlighted matching bracket pair.",
  }),
];

const DEFAULT_SETTINGS = {
  [SETTINGS_KEYS.TERMS]: false,
  [SETTINGS_KEYS.AUTO_PREVIEW]: false,
  [SETTINGS_KEYS.AUTO_BRACKET_CLOSE]: true,
  [SETTINGS_KEYS.LATEX_SETTINGS]: DEFAULT_LATEX_SETTINGS,
  [SETTINGS_KEYS.SYNTAX_COLORS]: DEFAULT_SYNTAX_COLORS,
  [SETTINGS_KEYS.DEFAULT_COLOR]: DEFAULT_LATEX_SETTINGS.color,
  [SETTINGS_KEYS.DEFAULT_DPI]: DEFAULT_LATEX_SETTINGS.dpi,
  [SETTINGS_KEYS.MAX_RECENTS]: DEFAULT_MAX_RECENTS,
};

const LATEX_ICON = `<!--html-->
<svg viewBox="0 -9 9 9" width="24" height="24" fill="none" stroke="currentColor" stroke-width="0.05" xmlns="http://www.w3.org/2000/svg">
  <path d="M2.15193-1.111831C2.797509-2.116065 3.000747-2.881196 3.156164-3.514819C3.574595-5.164633 4.028892-6.599253 4.770112-7.424159C4.913574-7.579577 5.009215-7.687173 5.391781-7.687173C6.216687-7.687173 6.240598-6.862267 6.240598-6.694894C6.240598-6.479701 6.180822-6.312329 6.180822-6.252553C6.180822-6.168867 6.252553-6.168867 6.264508-6.168867C6.455791-6.168867 6.77858-6.300374 7.07746-6.515567C7.292653-6.682939 7.400249-6.802491 7.400249-7.292653C7.400249-7.938232 7.065504-8.428394 6.396015-8.428394C6.01345-8.428394 4.961395-8.332752 3.789788-7.149191C2.833375-6.168867 2.271482-4.016936 2.044334-3.120299C1.829141-2.295392 1.733499-1.924782 1.374844-1.207472C1.291158-1.06401 .980324-.537983 .812951-.382565C.490162-.083686 .37061 .131507 .37061 .191283C.37061 .215193 .394521 .263014 .478207 .263014C.526027 .263014 .777086 .215193 1.08792 .011955C1.291158-.107597 1.315068-.131507 1.590037-.418431C2.187796-.406476 2.606227-.298879 3.359402-.083686C3.969116 .083686 4.578829 .263014 5.188543 .263014C6.156912 .263014 7.137235-.466252 7.519801-.992279C7.758904-1.315068 7.830635-1.613948 7.830635-1.649813C7.830635-1.733499 7.758904-1.733499 7.746949-1.733499C7.555666-1.733499 7.268742-1.601993 7.065504-1.458531C6.742715-1.255293 6.718804-1.183562 6.647073-.980324C6.587298-.789041 6.515567-.6934 6.467746-.621669C6.372105-.478207 6.360149-.478207 6.180822-.478207C5.606974-.478207 5.009215-.657534 4.220174-.872727C3.88543-.968369 3.227895-1.159651 2.630137-1.159651C2.47472-1.159651 2.307347-1.147696 2.15193-1.111831Z" fill="currentColor"/>
</svg>
<!--!html-->`;

const SETTINGS_ICON = `<!--html-->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-gear-fill" viewBox="0 0 16 16">
  <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/>
</svg>
<!--!html-->`;

const RECENTS_ICON = `<!--html-->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-fill" viewBox="0 0 16 16">
  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
</svg>
<!--!html-->`;

const CSS = `/*css*/
.latex-generator-modal {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.latex-generator-modal .bd-color-picker-swatch-item {
  width: 20px;
  height: 20px;
  outline: 1px solid var(--input-border-default);
}

.latex-generator-modal .bd-color-picker-swatch {
  width: 420px;
  max-width: 100%;
}

.latex-generator-modal .bd-color-picker {
  width: 50px;
  height: 50px;
  border: 1px solid var(--input-border-default);
}

.latex-generator-modal .bd-color-picker-default {
  width: 50px;
  height: 50px;
  outline: 1px solid var(--input-border-default);
}

.latex-generator-preview {
  display: flex;
  position: relative;
  min-height: 120px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--input-border-default);
  border-radius: 8px;
}

.latex-generator-preview-parent {
  position: relative;
  overflow-y: hidden;
  overflow-x: auto;
  display: flex;
  width: 100%;
}

.latex-generator-preview-container {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 0;
  min-width: 100%;
  width: max-content;
}

.latex-generator-preview-container::before,
.latex-generator-preview-container::after {
  content: "";
  display: block;
  flex-shrink: 0;
  width: 20px;
  height: 1px;
}

.latex-generator-preview-container > * {
  flex-shrink: 0;
  margin: 0 auto;
}

.latex-generator-preview-img {
  opacity: 1;
  display: block;
}

.latex-generator-preview-empty {
  color: var(--text-muted);
  display: block;
}

.latex-generator-size-section {
  margin-top: -15px;
}

.latex-generator-inline-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row;
  width: 100%;
  height: 60px;
}

.latex-generator-inline-section .bd-slider-wrap {
  width: 520px;
  padding: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.latex-generator-inline-section .bd-slider-marker-container {
  transform: translateY(10px);
}

.latex-generator-inline-section h1 {
  font-size: 16px;
  font-weight: 600;
  padding: 0 10px;
}

.latex-generator-inline-color-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.latex-generator-insert-color-btn {
  padding: 12px 4px;
  font-size: 13px;
  font-weight: 600;
}

.latex-generator-preview-wrapper {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.latex-generator-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.latex-generator-modal-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 2px;
}

.latex-generator-modal-action-btn {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.latex-generator-textarea {
  background-color: var(--input-background-default);
  color: var(--text-default);
  border: 1px solid var(--input-border-default);
  border-radius: 8px 8px 0 8px;
  padding: 10px;
  font-family: monospace;
  font-size: 14px;
  height: 200px;
  width: 100%;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms linear;
}

.latex-generator-settings .bd-slider-wrap {
  width: 400px;
  max-width: 100%;
  height: 43px;
  padding: 0;
  margin-top: 0;
  margin-bottom: 0;
  margin-left: auto;
  margin-right: 3px;
}

.latex-generator-settings .bd-slider-marker-container {
  transform: translateY(-8px);
}

.latex-generator-textarea::placeholder {
  color: var(--text-muted);
}

.latex-generator-preview-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--background-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
  z-index: 10;
  border-radius: 8px;
}

.latex-generator-preview:hover .latex-generator-preview-overlay {
  opacity: 1;
}

.latex-generator-preview-btn-wrapper {
  pointer-events: auto;
}

.latex-generator-preview-btn {
  padding: 10px 20px;
}

@layer override {
  .latex-generator-preview-btn:disabled {
    background-color: var(--input-border-default) !important;
    color: var(--text-muted);
    cursor: not-allowed;
  }
}

.latex-generator-terms-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  color: var(--text-default);
}

.latex-generator-terms-container p {
  margin: 0;
  padding: 0;
}

.latex-generator-terms-link {
  color: var(--text-link);
}

.latex-generator-recents-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
  text-align: center;
  font-size: 16px;
  min-height: 200px;
}

.latex-generator-recents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  max-height: 600px;
}

.latex-generator-recents-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: transparent;
  border: 1px solid var(--input-border-default);
  border-radius: 8px;
  transition: 0.2s;
}

.latex-generator-recents-item:hover {
  background-color: var(--background-secondary-alt);
}

.latex-generator-recents-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 0;
}

.latex-generator-recents-latex {
  font-family: monospace;
  font-size: 14px;
  color: var(--text-default);
  white-space: pre-wrap;
  word-break: break-word;
}

.latex-generator-recents-info {
  font-size: 12px;
  color: var(--text-muted);
}

.latex-generator-recents-actions {
  display: flex;
  gap: 8px;
}

.latex-generator-recents-open-btn,
.latex-generator-recents-delete-btn {
  padding: 6px 12px;
  height: 34px;
  transition: 0.2s;
}

.latex-generator-recents-delete-btn {
  background-color: transparent;
  color: var(--text-default);
  border: 1px solid var(--input-border-default);
}

.latex-generator-recents-delete-btn:hover {
  border-color: #cd5c5c;
  color: #cd5c5c;
}

.latex-generator-recents-footer {
  display: flex;
  justify-content: center;
  padding: 12px 0;
  border-top: 1px solid var(--input-border-default);
}

.latex-generator-box {
  border: 1px solid var(--input-border-default);
}

.latex-generator-box:focus-within {
  border-color: var(--input-border-active);
}

.latex-generator-editor-shell {
  position: relative;
  display: grid;
  border-radius: 8px 8px 0 8px;
  overflow: hidden;
  background-color: var(--input-background-default);
  transition: border-color 150ms linear;
}

.latex-generator-highlight,
.latex-generator-editor-shell .latex-generator-textarea {
  grid-area: 1 / 1;
  margin: 0;
  padding: 10px 48px 10px 10px;
  width: 100%;
  height: 100%;
  min-height: 200px;
  box-sizing: border-box;
  font-family: monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.latex-generator-highlight {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: auto;
  pointer-events: none;
  color: var(--text-default);
  background: transparent;
}

.latex-generator-editor-shell .latex-generator-textarea {
  position: relative;
  z-index: 1;
  border: none;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
  resize: vertical;
  outline: none;
}

.latex-generator-textarea--mirrored {
  color: transparent;
  caret-color: var(--text-default);
}
/*!css*/`;

const MIRROR_CSS = `/*css*/
.latex-generator-token--command {
  color: var(--latex-token-command, ${DEFAULT_SYNTAX_COLORS[SYNTAX_TYPES.COMMAND].hex});
}
.latex-generator-token--brace {
  color: var(--latex-token-brace, ${DEFAULT_SYNTAX_COLORS[SYNTAX_TYPES.BRACE].hex});
}
.latex-generator-token--error {
  color: var(--latex-token-error, ${DEFAULT_SYNTAX_COLORS[SYNTAX_TYPES.ERROR].hex});
}
.latex-generator-token--number {
  color: var(--latex-token-number, ${DEFAULT_SYNTAX_COLORS[SYNTAX_TYPES.NUMBER].hex});
}
.latex-generator-token--operator {
  color: var(--latex-token-operator, ${DEFAULT_SYNTAX_COLORS[SYNTAX_TYPES.OPERATOR].hex});
}
.latex-generator-token--text {
  color: var(--latex-token-text, ${DEFAULT_SYNTAX_COLORS[SYNTAX_TYPES.TEXT].hex});
}
.latex-generator-token--matched-brace {
  color: var(
    --latex-token-matched-brace,
    ${DEFAULT_SYNTAX_COLORS[SETTINGS_KEYS.MATCHED_BRACE_COLOR].hex},
  );
}
/*!css*/`;

class Settings {
  static get(key, fallback = DEFAULT_SETTINGS[key]) {
    return this.normalize(key, Data.load(Plugin.KEY, key) ?? fallback);
  }

  static set(key, value) {
    Data.save(Plugin.KEY, key, this.serialize(this.normalize(key, value)));
  }

  static normalize(key, value) {
    switch (key) {
      case SETTINGS_KEYS.TERMS:
      case SETTINGS_KEYS.AUTO_PREVIEW:
      case SETTINGS_KEYS.AUTO_BRACKET_CLOSE:
        return Boolean(value);

      case SETTINGS_KEYS.LATEX_SETTINGS: {
        return {
          latex: typeof value?.latex === "string" ? value.latex : "",
          dpi: Number.parseInt(value?.dpi) || DEFAULT_LATEX_SETTINGS.dpi,
          color: Color.from(value?.color, DEFAULT_LATEX_SETTINGS.color),
        };
      }

      case SETTINGS_KEYS.SYNTAX_COLORS: {
        return Object.fromEntries(
          Object.entries(DEFAULT_SYNTAX_COLORS).map(([syntaxKey, fallback]) => [
            syntaxKey,
            Color.from(value?.[syntaxKey], fallback),
          ]),
        );
      }

      case SETTINGS_KEYS.DEFAULT_COLOR:
        return Color.from(value, DEFAULT_LATEX_SETTINGS.color);

      case SETTINGS_KEYS.DEFAULT_DPI:
        return Number.parseInt(value) || DEFAULT_LATEX_SETTINGS.dpi;

      case SETTINGS_KEYS.MAX_RECENTS:
        return Number.parseInt(value) || DEFAULT_MAX_RECENTS;

      case SETTINGS_KEYS.RECENTS:
        return Array.isArray(value) ? value : [];

      default:
        return value;
    }
  }

  static serialize(value) {
    if (value instanceof Color) return value.json;
    if (Array.isArray(value))
      return value.map((entry) => this.serialize(entry));

    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          this.serialize(entry),
        ]),
      );
    }

    return value;
  }
}

function clamp(l, value, u) {
  return min(max(value, l), u);
}

class LatexProcessor {
  static generateApiRequest(latex, dpi, color) {
    if (!latex.trim()) return "";

    const activeColor = Color.from(color, DEFAULT_LATEX_SETTINGS.color);
    const { r, g, b } = activeColor.json;
    const payload = LATEX_PAYLOAD_FORMAT(dpi, r, g, b, latex);
    return `${API.URL}png.latex?${encodeURIComponent(payload)}`;
  }

  static saveRecent(state) {
    const { latex, dpi } = state;
    const recents = Settings.get(SETTINGS_KEYS.RECENTS) ?? [];
    const recent = {
      latex: latex.trim(),
      dpi,
      timestamp: Date.now(),
    };

    const filtered = recents.filter(
      (r) => r.latex !== recent.latex || r.dpi !== recent.dpi,
    );

    const updated = [recent, ...filtered].slice(
      0,
      Settings.get(SETTINGS_KEYS.MAX_RECENTS),
    );
    Settings.set(SETTINGS_KEYS.RECENTS, updated);
  }

  static copyToClipboard(state) {
    const { latex, color, dpi } = state;
    if (!latex?.trim()) return;
    LatexProcessor.saveRecent(state);

    const fetched = this.generateApiRequest(latex, dpi, color);

    try {
      let img = new Image();
      img.crossOrigin = "Anonymous";

      const cleanup = () => {
        img = null;
      };

      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error(ERROR_MESSAGES.CANVAS_CONTEXT_FAILED);

          ctx.drawImage(img, 0, 0);

          const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((value) => {
              if (value) {
                resolve(value);
                return;
              }

              reject(new Error(ERROR_MESSAGES.BLOB_CREATION_FAILED));
            }, IMAGE_MIME_TYPE);
          });

          if (
            !navigator.clipboard?.write ||
            typeof ClipboardItem === "undefined"
          ) {
            throw new Error(ERROR_MESSAGES.CLIPBOARD_NOT_SUPPORTED);
          }

          await navigator.clipboard.write([
            new ClipboardItem({ [IMAGE_MIME_TYPE]: blob }),
          ]);
          UI.toast("Image copied!", TOAST_TYPES.SUCCESS);
        } catch (err) {
          Logger.error(Plugin.NAME, err);
          UI.toast(ERROR_MESSAGES.IMAGE_PROCESS_FAILED, TOAST_TYPES.ERROR);
        } finally {
          cleanup();
        }
      };

      img.onerror = () => {
        UI.toast(ERROR_MESSAGES.IMAGE_LOAD_FAILED, TOAST_TYPES.ERROR);
        cleanup();
      };

      img.src = fetched;
    } catch (err) {
      Logger.error(Plugin.NAME, err);
      UI.toast(ERROR_MESSAGES.IMAGE_PROCESS_FAILED, TOAST_TYPES.ERROR);
    }
  }
}

class UI {
  static toast(message, type = TOAST_TYPES.INFO) {
    BdUI.showToast(`${Plugin.NAME}: ${message}`, { type });
  }

  static rememberCursor(index) {
    if (!Number.isFinite(index)) return;
    UI.lastCursorIndex = max(0, Math.trunc(index));
  }

  static focusGeneratorTextarea({
    preferStoredCursor = true,
    delay = 100,
  } = {}) {
    UI.clearPendingTimeouts();
    UI.focusTimer = setTimeout(() => {
      const textarea = document.querySelector(".latex-generator-textarea");
      if (!textarea) {
        UI.focusTimer = null;
        return;
      }

      const lastCharIndex = textarea.value?.length ?? 0;
      const cursorPosition =
        preferStoredCursor && Number.isFinite(UI.lastCursorIndex)
          ? clamp(0, UI.lastCursorIndex, lastCharIndex)
          : lastCharIndex;

      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(cursorPosition, cursorPosition);

      UI.lastCursorIndex = cursorPosition;
      UI.focusTimer = null;
    }, delay);
  }

  static clearPendingTimeouts() {
    if (UI.focusTimer !== null) {
      clearTimeout(UI.focusTimer);
      UI.focusTimer = null;
    }
  }

  static escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  static buildBracketMatchMap(source) {
    const cached = UI.bracketMatching;
    if (cached && cached.source === source) {
      return cached.map;
    }

    const stack = [];
    const map = new Map();

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];

      if (Object.prototype.hasOwnProperty.call(BRACKET_PAIRS, char)) {
        stack.push({ char, index });
        continue;
      }

      if (!Object.prototype.hasOwnProperty.call(BRACKET_CLOSE_TO_OPEN, char)) {
        continue;
      }

      if (!stack.length) {
        continue;
      }

      const last = stack[stack.length - 1];
      if (BRACKET_CLOSE_TO_OPEN[char] !== last.char) {
        continue;
      }

      stack.pop();
      map.set(last.index, index);
      map.set(index, last.index);
    }

    UI.bracketMatching = {
      source,
      map,
    };

    return map;
  }

  static findMatchingBracket(source, cursor) {
    if (!source || !source.length) return null;

    let bracketIndex = -1;
    if (
      cursor > 0 &&
      (Object.prototype.hasOwnProperty.call(
        BRACKET_PAIRS,
        source[cursor - 1],
      ) ||
        Object.prototype.hasOwnProperty.call(
          BRACKET_CLOSE_TO_OPEN,
          source[cursor - 1],
        ))
    ) {
      bracketIndex = cursor - 1;
    } else if (
      Object.prototype.hasOwnProperty.call(BRACKET_PAIRS, source[cursor]) ||
      Object.prototype.hasOwnProperty.call(
        BRACKET_CLOSE_TO_OPEN,
        source[cursor],
      )
    ) {
      bracketIndex = cursor;
    }

    if (bracketIndex < 0) return null;

    const matchMap = this.buildBracketMatchMap(source);
    const pairIndex = matchMap.get(bracketIndex);
    if (typeof pairIndex !== "number") return null;

    return pairIndex < bracketIndex
      ? [pairIndex, bracketIndex]
      : [bracketIndex, pairIndex];
  }

  static highlightLatex(latex, cursor = 0) {
    const source = latex || "";
    if (!source) return "";

    const matchingPair = this.findMatchingBracket(source, cursor);
    const matched = new Set(matchingPair || []);

    const spans = [];
    const braceStack = [];
    const pushToken = (type, value) => {
      const escaped = this.escapeHtml(value);
      spans.push(
        type
          ? `<span class="latex-generator-token latex-generator-token--${type}">${escaped}</span>`
          : escaped,
      );
    };

    for (let index = 0; index < source.length; ) {
      const char = source[index];

      if (char === "\\") {
        let end = index + 1;
        if (source[end] === "\\") {
          end += 1;
        } else {
          while (end < source.length && /[A-Za-z*@]/.test(source[end])) {
            end += 1;
          }
          if (end === index + 1 && end < source.length) {
            end += 1;
          }
        }
        pushToken(SYNTAX_TYPES.COMMAND, source.slice(index, end));
        index = end;
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(BRACKET_PAIRS, char)) {
        const token = {
          value: char,
          type: SYNTAX_TYPES.BRACE,
          matched: matched.has(index),
        };
        braceStack.push(token);
        spans.push(token);
        index += 1;
        continue;
      }

      if (Object.prototype.hasOwnProperty.call(BRACKET_CLOSE_TO_OPEN, char)) {
        const matchingOpen = braceStack.length
          ? braceStack[braceStack.length - 1]
          : null;
        if (
          matchingOpen &&
          matchingOpen.value === BRACKET_CLOSE_TO_OPEN[char]
        ) {
          spans.push({
            value: char,
            type: SYNTAX_TYPES.BRACE,
            matched: matched.has(index),
          });
          braceStack.pop();
        } else {
          spans.push({
            value: char,
            type: SYNTAX_TYPES.ERROR,
            matched: matched.has(index),
          });
        }
        index += 1;
        continue;
      }

      if (LATEX_OPERATORS.includes(char)) {
        pushToken(SYNTAX_TYPES.OPERATOR, char);
        index += 1;
        continue;
      }

      if (/\d/.test(char)) {
        let end = index + 1;
        while (end < source.length && /[\d.]/.test(source[end])) {
          end += 1;
        }
        pushToken(SYNTAX_TYPES.NUMBER, source.slice(index, end));
        index = end;
        continue;
      }

      let end = index + 1;
      while (
        end < source.length &&
        source[end] !== "\\" &&
        !Object.prototype.hasOwnProperty.call(BRACKET_PAIRS, source[end]) &&
        !Object.prototype.hasOwnProperty.call(
          BRACKET_CLOSE_TO_OPEN,
          source[end],
        ) &&
        !LATEX_OPERATORS.includes(source[end]) &&
        !/\d/.test(source[end])
      ) {
        end += 1;
      }
      pushToken(SYNTAX_TYPES.TEXT, source.slice(index, end));
      index = end;
    }

    for (
      let stackIndex = braceStack.length - 1;
      stackIndex >= 0;
      stackIndex -= 1
    ) {
      braceStack[stackIndex].type = SYNTAX_TYPES.ERROR;
    }

    return spans
      .map((token) =>
        typeof token === "string"
          ? token
          : `<span class="latex-generator-token latex-generator-token--${token.type}${token.matched ? " latex-generator-token--matched-brace" : ""}">${this.escapeHtml(token.value)}</span>`,
      )
      .join("");
  }

  static createSyntaxHighlightStyle(syntaxColors) {
    return Object.fromEntries(
      Object.entries(syntaxColors).map(([key, value]) => [
        `--latex-token-${key === SETTINGS_KEYS.MATCHED_BRACE_COLOR ? "matched-brace" : key}`,
        value?.hex ?? value,
      ]),
    );
  }

  static getSyntaxColorSettingById(id) {
    return SYNTAX_COLOR_SETTINGS.find((entry) => entry.id === id);
  }

  static buildSettingsSections(syntaxColors) {
    const defaultColor = Settings.get(SETTINGS_KEYS.DEFAULT_COLOR);
    const defaultDpi = Settings.get(SETTINGS_KEYS.DEFAULT_DPI);
    const maxRecents = Settings.get(SETTINGS_KEYS.MAX_RECENTS);

    return [
      {
        type: "category",
        id: SETTINGS_CATEGORIES.GENERAL,
        name: "General",
        shown: true,
        collapsible: true,
        settings: [
          {
            type: "switch",
            id: SETTINGS_KEYS.TERMS,
            name: "Agreed to Terms",
            note: "Whether you have agreed to the terms of service.",
            value: Settings.get(SETTINGS_KEYS.TERMS),
          },
          {
            type: "switch",
            id: SETTINGS_KEYS.AUTO_PREVIEW,
            name: "Auto-Preview",
            note: "Automatically update the LaTeX preview as you type.",
            value: Settings.get(SETTINGS_KEYS.AUTO_PREVIEW),
          },
          {
            type: "switch",
            id: SETTINGS_KEYS.AUTO_BRACKET_CLOSE,
            name: "Auto Bracket Closing",
            note: "Automatically insert matching closing brackets while typing.",
            value: Settings.get(SETTINGS_KEYS.AUTO_BRACKET_CLOSE),
          },
          {
            type: "color",
            id: SETTINGS_KEYS.DEFAULT_COLOR,
            name: "Default Color",
            note: "Default equation color.",
            value: defaultColor.hex,
            defaultValue: DEFAULT_LATEX_SETTINGS.color.hex,
            colors: [],
          },
          {
            type: "slider",
            id: SETTINGS_KEYS.DEFAULT_DPI,
            name: "Default DPI",
            note: "Default equation DPI.",
            value: defaultDpi,
            min: 50,
            max: 1200,
            markers: [100, 250, 500, 800, 1200],
          },
          {
            type: "slider",
            id: SETTINGS_KEYS.MAX_RECENTS,
            name: "Max Recents",
            note: "Maximum number of recent equations to keep.",
            value: maxRecents,
            min: 1,
            max: 100,
            markers: [1, 10, 20, 50, 100],
          },
        ],
      },
      {
        type: "category",
        id: SETTINGS_CATEGORIES.SYNTAX,
        name: "Syntax Highlighting",
        shown: true,
        collapsible: true,
        settings: SYNTAX_COLOR_SETTINGS.map((entry) => {
          const value =
            syntaxColors[entry.key] ?? DEFAULT_SYNTAX_COLORS[entry.key];
          const defaultColor = DEFAULT_SYNTAX_COLORS[entry.key];

          return {
            type: "color",
            id: entry.id,
            name: entry.name,
            note: entry.note,
            value: value.hex,
            defaultValue: defaultColor.hex,
            colors: [],
          };
        }),
      },
    ];
  }

  static LatexModalContent({ stateRef }) {
    const savedData = Settings.get(SETTINGS_KEYS.LATEX_SETTINGS);

    const baseColor = Settings.get(SETTINGS_KEYS.DEFAULT_COLOR);
    const defaultDpi = Settings.get(SETTINGS_KEYS.DEFAULT_DPI);
    const autoPreview = Settings.get(SETTINGS_KEYS.AUTO_PREVIEW);
    const autoBracketClose = Settings.get(SETTINGS_KEYS.AUTO_BRACKET_CLOSE);
    const syntaxColors = Settings.get(SETTINGS_KEYS.SYNTAX_COLORS);

    const [latex, setLatex] = useState(savedData.latex);
    const [dpi, setDpi] = useState(defaultDpi);
    const [insertColor, setInsertColor] = useState(baseColor);
    const [cursorIndex, setCursorIndex] = useState(savedData.latex.length);

    const [previewLatex, setPreviewLatex] = useState(
      autoPreview ? savedData.latex : "",
    );

    const [previewDpi, setPreviewDpi] = useState(
      autoPreview ? defaultDpi : dpi,
    );

    const [fetched, setFetched] = useState(
      autoPreview && savedData.latex.trim()
        ? LatexProcessor.generateApiRequest(
            savedData.latex,
            defaultDpi,
            baseColor,
          )
        : "",
    );

    const highlightRef = useRef(null);
    const textareaRef = useRef(null);

    const getCurrentCursorIndex = () => {
      const textarea = textareaRef.current;
      if (textarea) return textarea.selectionStart ?? cursorIndex;
      return cursorIndex;
    };

    const canPreview = previewLatex !== latex || previewDpi !== dpi;

    useEffect(() => {
      const timer = setTimeout(() => {
        const activeTextarea = textareaRef.current;
        if (!activeTextarea) return;

        activeTextarea.focus({ preventScroll: true });
        const cursorPosition = activeTextarea.value?.length ?? 0;
        activeTextarea.setSelectionRange(cursorPosition, cursorPosition);
        setCursorIndex(cursorPosition);
      }, FOCUS_DELAY);

      return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
      stateRef.current = {
        latex,
        dpi,
        color: baseColor,
        fetched,
      };

      const timer = setTimeout(() => {
        Settings.set(SETTINGS_KEYS.LATEX_SETTINGS, {
          latex,
          dpi,
          color: baseColor,
        });
      }, SETTINGS_SAVE_DELAY);
      return () => clearTimeout(timer);
    }, [latex, dpi, baseColor, fetched, stateRef]);

    const updateFetchedPreview = () => {
      if (latex.trim() === "") {
        setFetched("");
      } else {
        setFetched(LatexProcessor.generateApiRequest(latex, dpi, baseColor));
      }
    };

    useEffect(() => {
      if (!autoPreview) return;
      const timer = setTimeout(updateFetchedPreview, PREVIEW_UPDATE_DELAY);
      return () => clearTimeout(timer);
    }, [latex, dpi, autoPreview]);

    const handlePreview = () => {
      if (!canPreview || autoPreview) return;
      setPreviewLatex(latex);
      setPreviewDpi(dpi);
      updateFetchedPreview();
    };

    const handleEditorScroll = (event) => {
      if (!highlightRef.current) return;
      highlightRef.current.scrollTop = event.target.scrollTop;
      highlightRef.current.scrollLeft = event.target.scrollLeft;
    };

    const handleEditorKeyDown = (event) => {
      if (!autoBracketClose || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      const textarea = event.target;
      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? start;
      const key = event.key;
      const closing = BRACKET_PAIRS[key];

      if (key === "Backspace" && start === end && start > 0) {
        const opening = latex[start - 1];
        const closeChar = BRACKET_PAIRS[opening];

        if (closeChar && latex[start] === closeChar) {
          event.preventDefault();
          const nextLatex = latex.slice(0, start - 1) + latex.slice(start + 1);
          const nextPos = start - 1;

          setLatex(nextLatex);

          requestAnimationFrame(() => {
            const inputEl = textareaRef.current;
            if (!inputEl) return;
            inputEl.setSelectionRange(nextPos, nextPos);
            setCursorIndex(nextPos);
          });
        }

        return;
      }

      if (
        BRACKET_CLOSINGS.includes(key) &&
        start === end &&
        latex[start] === key
      ) {
        event.preventDefault();
        requestAnimationFrame(() => {
          const inputEl = textareaRef.current;
          if (!inputEl) return;
          inputEl.setSelectionRange(start + 1, start + 1);
          setCursorIndex(start + 1);
        });
        return;
      }

      if (key in BRACKET_PAIRS && start !== end) {
        event.preventDefault();
        const selected = latex.slice(start, end);
        const nextLatex =
          latex.slice(0, start) + key + selected + closing + latex.slice(end);

        setLatex(nextLatex);

        requestAnimationFrame(() => {
          const inputEl = textareaRef.current;
          if (!inputEl) return;
          inputEl.focus();
          inputEl.setSelectionRange(start + 1, start + 1 + selected.length);
          setCursorIndex(start + 1);
        });
        return;
      }

      const getBracketBalance = (opening, closing, from, to) => {
        let balance = 0;
        for (let index = from; index < to; index += 1) {
          const char = latex[index];
          if (char === opening) balance += 1;
          else if (char === closing) balance -= 1;
        }
        return balance;
      };

      const getEnclosingScope = (cursor) => {
        const stack = [];
        let scope = null;

        for (let index = 0; index < latex.length; index += 1) {
          const char = latex[index];

          if (char in BRACKET_PAIRS) {
            stack.push({ char, index });
            continue;
          }

          if (!BRACKET_CLOSINGS.includes(char)) continue;
          if (!stack.length) continue;

          const last = stack[stack.length - 1];
          if (BRACKET_PAIRS[last.char] !== char) continue;

          stack.pop();
          if (last.index < cursor && cursor <= index) {
            scope = {
              start: last.index + 1,
              end: index,
            };
          }
        }

        return (
          scope || {
            start: 0,
            end: latex.length,
          }
        );
      };

      if (key in BRACKET_PAIRS) {
        const nextText = latex.slice(end);
        const nextChar = nextText[0] ?? "";
        const wsOrEnd = nextText === "" || /\W/.test(nextChar);
        const nextIsClosing = BRACKET_CLOSINGS.includes(nextChar);
        const scope = getEnclosingScope(start);

        const balanceLeft = getBracketBalance(
          key,
          BRACKET_PAIRS[key],
          scope.start,
          start,
        );

        const balanceRight = getBracketBalance(
          key,
          BRACKET_PAIRS[key],
          start,
          scope.end,
        );

        const shouldPair =
          start === end &&
          (wsOrEnd ||
            (nextIsClosing && max(balanceLeft, 0) >= -min(balanceRight, 0)));

        if (!shouldPair) {
          return;
        }

        event.preventDefault();
        const replacement = `${key}${closing}`;
        const nextLatex =
          latex.slice(0, start) + replacement + latex.slice(end);

        setLatex(nextLatex);

        requestAnimationFrame(() => {
          const inputEl = textareaRef.current;
          if (!inputEl) return;

          inputEl.focus();
          inputEl.setSelectionRange(start + 1, start + 1);
          setCursorIndex(start + 1);
        });
      }
    };

    const handleInsertColorBlock = () => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? start;
      const selectedText = latex.slice(start, end);
      const { r, g, b } = insertColor.json;

      const prefix = `{\\color[RGB]{${r},${g},${b}} `;
      const suffix = "}";
      const replacement = `${prefix}${selectedText}${suffix}`;
      const nextLatex = latex.slice(0, start) + replacement + latex.slice(end);

      setLatex(nextLatex);

      requestAnimationFrame(() => {
        const activeTextarea = textareaRef.current;
        if (!activeTextarea) return;

        activeTextarea.focus();
        if (selectedText.length > 0) {
          const selectionStart = start + prefix.length;
          const selectionEnd = selectionStart + selectedText.length;
          activeTextarea.setSelectionRange(selectionStart, selectionEnd);
          setCursorIndex(selectionStart);
        } else {
          const cursorPosition = start + prefix.length;
          activeTextarea.setSelectionRange(cursorPosition, cursorPosition);
          setCursorIndex(cursorPosition);
        }
      });
    };

    const syntaxHighlightStyle = UI.createSyntaxHighlightStyle(syntaxColors);

    return createElement(
      "div",
      { className: "latex-generator-modal" },

      createElement(
        "div",
        { className: "latex-generator-preview latex-generator-box" },
        createElement(
          "div",
          { className: "latex-generator-preview-parent" },
          createElement(
            "div",
            { className: "latex-generator-preview-container" },
            fetched
              ? createElement(
                  "div",
                  { className: "latex-generator-preview-wrapper" },
                  createElement("img", {
                    src: fetched,
                    className: "latex-generator-preview-img",
                  }),
                )
              : createElement(
                  "span",
                  { className: "latex-generator-preview-empty" },
                  autoPreview
                    ? "Preview will appear here..."
                    : "Press to generate preview...",
                ),
          ),
        ),

        !autoPreview &&
          createElement(
            "div",
            { className: "latex-generator-preview-overlay" },
            createElement(
              Tooltip,
              { text: "Tip: You can enable auto-preview in settings" },
              ({ onMouseEnter, onMouseLeave }) =>
                createElement(
                  "div",
                  {
                    className: "latex-generator-preview-btn-wrapper",
                    "aria-label":
                      "Tip: You can enable auto-preview in settings",
                    onMouseEnter: onMouseEnter,
                    onMouseLeave: onMouseLeave,
                  },
                  createElement(
                    "button",
                    {
                      className:
                        "bd-button bd-button-filled bd-button-color-brand latex-generator-preview-btn",
                      disabled: !canPreview,
                      onClick: handlePreview,
                    },
                    "Preview",
                  ),
                ),
            ),
          ),
      ),

      createElement(
        "div",
        { className: "latex-generator-controls" },

        createElement(
          "div",
          {},
          createElement(
            "div",
            {
              className: "latex-generator-editor-shell latex-generator-box",
              style: syntaxHighlightStyle,
            },
            createElement(
              "div",
              { className: "latex-generator-modal-actions" },
              createElement(
                Tooltip,
                { text: "Recents" },
                ({ onMouseEnter, onMouseLeave }) =>
                  createElement(
                    "button",
                    {
                      type: "button",
                      "aria-label": "Recent equations",
                      className:
                        "latex-generator-recents-btn latex-generator-modal-action-btn",
                      onMouseEnter,
                      onMouseLeave,
                      onClick: () => {
                        UI.rememberCursor(getCurrentCursorIndex());
                        UI.openRecentsFromModal((recent) => {
                          setLatex(recent.latex);
                          setDpi(recent.dpi);
                        });
                      },
                    },
                    createElement(
                      "div",
                      {
                        className: `${DiscordClasses.Button.button} ${DiscordClasses.ButtonWrapper.button}`,
                      },
                      createElement("div", {
                        className: DiscordClasses.Icon.iconContainer,
                        dangerouslySetInnerHTML: {
                          __html: RECENTS_ICON,
                        },
                      }),
                    ),
                  ),
              ),
              createElement(
                Tooltip,
                { text: "Settings" },
                ({ onMouseEnter, onMouseLeave }) =>
                  createElement(
                    "button",
                    {
                      type: "button",
                      "aria-label": "Settings",
                      className: "latex-generator-modal-action-btn",
                      onMouseEnter,
                      onMouseLeave,
                      onClick: () => {
                        UI.rememberCursor(getCurrentCursorIndex());
                        UI.openSettingsFromModal();
                      },
                    },
                    createElement(
                      "div",
                      {
                        className: `${DiscordClasses.Button.button} ${DiscordClasses.ButtonWrapper.button}`,
                      },
                      createElement("div", {
                        className: DiscordClasses.Icon.iconContainer,
                        dangerouslySetInnerHTML: {
                          __html: SETTINGS_ICON,
                        },
                      }),
                    ),
                  ),
              ),
            ),
            createElement("pre", {
              ref: highlightRef,
              "aria-hidden": true,
              className: "latex-generator-highlight",
              dangerouslySetInnerHTML: {
                __html: UI.highlightLatex(latex, cursorIndex) || " ",
              },
            }),
            createElement("textarea", {
              ref: textareaRef,
              className: `latex-generator-textarea${latex ? " latex-generator-textarea--mirrored" : ""}`,
              value: latex,
              placeholder: "e.g. E = mc^2",
              autoFocus: true,
              spellCheck: false,
              onChange: (e) => {
                setLatex(e.target.value);
                setCursorIndex(e.target.selectionStart ?? 0);
              },
              onSelect: (e) => setCursorIndex(e.target.selectionStart ?? 0),
              onKeyDown: handleEditorKeyDown,
              onScroll: handleEditorScroll,
            }),
          ),
        ),

        createElement(
          "div",
          {
            className:
              "latex-generator-inline-section latex-generator-size-section",
          },
          createElement("h1", {}, "DPI"),
          createElement(SliderInput, {
            min: 50,
            max: 1200,
            value: dpi,
            onChange: (val) => setDpi(val),
            markers: [50, 100, 250, 500, 800, 1200],
          }),
        ),

        createElement(
          "div",
          { className: "latex-generator-inline-section" },
          createElement(
            "h1",
            {},
            createElement(
              "button",
              {
                type: "button",
                className:
                  "latex-generator-insert-color-btn bd-button bd-button-filled bd-button-color-brand",
                onClick: handleInsertColorBlock,
              },
              createElement("h1", {}, "Insert Color"),
            ),
          ),
          createElement(
            "div",
            { className: "latex-generator-inline-color-controls" },
            createElement(ColorInput, {
              value: insertColor.hex,
              defaultValue: baseColor.hex,
              colors: DEFAULT_COLORS.map((swatch) => swatch.hex),
              onChange: (val) => setInsertColor(Color.from(val, baseColor)),
            }),
          ),
        ),
      ),
    );
  }

  static ChatBarButton() {
    return createElement(
      Tooltip,
      { text: "Insert LaTeX" },
      ({ onMouseEnter, onMouseLeave }) =>
        createElement(
          "div",
          {
            "aria-label": "Insert LaTeX",
            onMouseEnter: onMouseEnter,
            onMouseLeave: onMouseLeave,
            onClick: UI.handleChatBarClick,
          },
          createElement(
            "div",
            {
              className: `${DiscordClasses.Button.button} ${DiscordClasses.ButtonWrapper.button}`,
            },
            createElement("div", {
              className: DiscordClasses.Icon.iconContainer,
              dangerouslySetInnerHTML: { __html: LATEX_ICON },
            }),
          ),
        ),
    );
  }

  static handleChatBarClick() {
    if (Settings.get(SETTINGS_KEYS.TERMS)) {
      UI.openGenerationModal();
    } else {
      UI.openTermsModal({ onConfirm: UI.openGenerationModal });
    }
  }

  static openTermsModal({ onConfirm, onCancel } = {}) {
    BdUI.showConfirmationModal(
      "API Usage Agreement",
      createElement(
        "div",
        { className: "latex-generator-terms-container" },
        createElement(
          "p",
          {},
          `By proceeding, you acknowledge that this plugin utilizes a third-party external API (`,
          createElement(
            "a",
            {
              href: API.URL,
              target: "_blank",
              rel: "noopener noreferrer",
              className: "latex-generator-terms-link",
            },
            API.NAME,
          ),
          `) to render LaTeX equations.`,
        ),
        createElement(
          "p",
          {},
          "Please be advised that the utilization of this service is entirely at your own risk. The developer of this plugin, as well as the BetterDiscord staff, assume no liability or responsibility for any potential issues, data handling practices, or service interruptions that may arise from its use.",
        ),
        createElement(
          "p",
          {},
          "Do you accept these terms and wish to continue?",
        ),
      ),
      {
        confirmText: "I Agree",
        cancelText: "Cancel",
        onConfirm: () => {
          Settings.set(SETTINGS_KEYS.TERMS, true);
          if (onConfirm) onConfirm();
        },
        onCancel: () => {
          Settings.set(SETTINGS_KEYS.TERMS, false);
          if (onCancel) onCancel();
        },
      },
    );
  }

  static openGenerationModal() {
    const defaultColor = Settings.get(SETTINGS_KEYS.DEFAULT_COLOR);
    const defaultDpi = Settings.get(SETTINGS_KEYS.DEFAULT_DPI);

    const stateRef = {
      current: { latex: "", dpi: defaultDpi, color: defaultColor, fetched: "" },
    };

    BdUI.showConfirmationModal(
      "Generate LaTeX Image",
      createElement(UI.LatexModalContent, { stateRef: stateRef }),
      {
        confirmText: "Copy",
        cancelText: "Cancel",
        size: "bd-modal-large",
        onConfirm: () => {
          if (!stateRef.current.latex.trim()) {
            UI.toast("No image to copy!", TOAST_TYPES.ERROR);
            return;
          }
          LatexProcessor.copyToClipboard(stateRef.current);
        },
      },
    );

    UI.focusGeneratorTextarea({ preferStoredCursor: false });
  }

  static openSettingsFromModal() {
    BdUI.showConfirmationModal(
      `${Plugin.NAME} Settings`,
      createElement(UI.SettingsModal),
      {
        confirmText: "Done",
        cancelText: null,
        size: "bd-modal-large",
        onConfirm: () => UI.focusGeneratorTextarea(),
        onClose: () => UI.focusGeneratorTextarea(),
      },
    );
  }

  static openRecentsFromModal(onOpen) {
    const modalKey = BdUI.showConfirmationModal(
      "Recent LaTeX Equations",
      createElement(UI.RecentsModal, {
        onOpen: (recent) => {
          onOpen(recent);
          ModalActions?.closeModal?.(modalKey);
          UI.focusGeneratorTextarea();
        },
      }),
      {
        confirmText: "Done",
        cancelText: null,
        size: "bd-modal-large",
        onConfirm: () => UI.focusGeneratorTextarea(),
        onClose: () => UI.focusGeneratorTextarea(),
      },
    );

    return modalKey;
  }

  static SettingsModal() {
    const [renderKey, setRenderKey] = useState(0);
    const syntaxColors = Settings.get(SETTINGS_KEYS.SYNTAX_COLORS);

    return createElement(
      "div",
      { key: renderKey, className: "latex-generator-settings" },
      BdUI.buildSettingsPanel({
        settings: UI.buildSettingsSections(syntaxColors),
        onChange: (_category, id, value) => {
          if (id === SETTINGS_KEYS.TERMS && value) {
            UI.openTermsModal({
              onCancel: () => setRenderKey((k) => k + 1),
            });
            return;
          }

          Settings.set(id, value);
        },
      }),
    );
  }

  static RecentsModal({ onOpen }) {
    const [recents, setRecents] = useState(
      Settings.get(SETTINGS_KEYS.RECENTS) ?? [],
    );

    const deleteRecent = (index) => {
      const updated = recents.filter((_, i) => i !== index);
      setRecents(updated);
      Settings.set(SETTINGS_KEYS.RECENTS, updated);
    };

    const clearRecents = () => {
      BdUI.showConfirmationModal(
        "Clear Recent Equations",
        "Are you sure you want to delete all recent equations?",
        {
          danger: true,
          confirmText: "Clear All",
          cancelText: "Cancel",
          onConfirm: () => {
            setRecents([]);
            Settings.set(SETTINGS_KEYS.RECENTS, []);
          },
        },
      );
    };

    if (recents.length === 0) {
      return createElement(
        "div",
        { className: "latex-generator-recents-empty" },
        "No recent equations yet.",
      );
    }

    return createElement(
      "div",
      { className: "latex-generator-recents-list" },
      recents.map((recent, index) =>
        createElement(
          "div",
          {
            key: `recent-${index}`,
            className: "latex-generator-recents-item latex-generator-box",
          },
          createElement(
            "div",
            { className: "latex-generator-recents-content" },
            createElement("div", {
              className: "latex-generator-recents-latex",
              dangerouslySetInnerHTML: {
                __html: UI.highlightLatex(recent.latex || "", 0) || " ",
              },
            }),
            createElement(
              "div",
              { className: "latex-generator-recents-info" },
              `DPI: ${recent.dpi}`,
            ),
          ),
          createElement(
            "div",
            { className: "latex-generator-recents-actions" },
            createElement(
              "button",
              {
                type: "button",
                className:
                  "latex-generator-recents-open-btn bd-button bd-button-filled bd-button-color-brand",
                onClick: () => onOpen(recent),
              },
              "Open",
            ),
            createElement(
              "button",
              {
                type: "button",
                className: "latex-generator-recents-delete-btn bd-button",
                onClick: () => deleteRecent(index),
              },
              "Delete",
            ),
          ),
        ),
      ),
      recents.length > 0 &&
        createElement(
          "div",
          { className: "latex-generator-recents-footer" },
          createElement(
            "button",
            {
              type: "button",
              className: "latex-generator-recents-delete-btn bd-button",
              onClick: clearRecents,
            },
            "Clear All",
          ),
        ),
    );
  }
}

class ChatBar {
  static resolveButtons(module) {
    if (!module) return null;

    if (typeof module?.type === "function") return module;
    if (typeof module?.A?.type === "function") return module.A;
    if (typeof module?.default?.type === "function") return module.default;
    if (typeof module?.default?.A?.type === "function") return module.default.A;

    return null;
  }

  static patch() {
    const applyPatch = (Buttons) => {
      if (!Buttons || typeof Buttons.type !== "function") {
        UI.toast(
          "Failed to find chat bar to inject the button",
          TOAST_TYPES.ERROR,
        );
        return;
      }

      Patcher.after(Plugin.PATCH_ID, Buttons, "type", (_, args, res) => {
        if (
          args.length !== 2 ||
          args[0]?.disabled ||
          !Object.values(CHAT_BAR_TYPES).includes(
            args[0]?.type?.analyticsName,
          ) ||
          !Array.isArray(res?.props?.children)
        ) {
          return;
        }

        const exists = res.props.children.some(
          (child) => child?.key === "latex-generator-button",
        );
        if (exists) return;

        res.props.children.unshift(
          createElement(UI.ChatBarButton, {
            key: "latex-generator-button",
          }),
        );
      });
    };

    const sourceMatch = Webpack.getBySource(
      "type",
      "showAllButtons",
      "promotionsByType",
    );

    const fromSource = ChatBar.resolveButtons(sourceMatch);
    if (fromSource) {
      applyPatch(fromSource);
      return;
    }

    if (
      typeof Webpack.waitForModule !== "function" ||
      !Webpack.Filters?.bySource
    ) {
      UI.toast(
        "Failed to find chat bar to inject the button",
        TOAST_TYPES.ERROR,
      );
      return;
    }

    ChatBar.unpatchController?.abort();
    const controller = new AbortController();
    ChatBar.unpatchController = controller;

    Webpack.waitForModule(
      Webpack.Filters.bySource("showAllButtons", "promotionsByType"),
      {
        defaultExport: false,
        searchExports: true,
        signal: controller.signal,
      },
    )
      .then((module) => {
        if (controller.signal.aborted) return;
        const resolved = ChatBar.resolveButtons(module);
        applyPatch(resolved);
      })
      .catch(() => {});
  }

  static unpatch() {
    ChatBar.unpatchController?.abort();
    ChatBar.unpatchController = null;
    Patcher.unpatchAll(Plugin.PATCH_ID);
  }
}

ChatBar.unpatchController = null;
UI.focusTimer = null;
UI.lastCursorIndex = null;
UI.bracketMatching = null;

class Style {
  static inject() {
    DOM.addStyle(Plugin.PATCH_ID, CSS);
    DOM.addStyle(`${Plugin.PATCH_ID}-mirror`, MIRROR_CSS);
  }

  static remove() {
    DOM.removeStyle(Plugin.PATCH_ID);
    DOM.removeStyle(`${Plugin.PATCH_ID}-mirror`);
  }
}

module.exports = class LaTeXGeneratorPlugin {
  start() {
    Style.inject();
    ChatBar.patch();
  }

  stop() {
    Style.remove();
    ChatBar.unpatch();
    UI.clearPendingTimeouts();
  }

  getSettingsPanel() {
    return createElement(UI.SettingsModal);
  }
};
