/**
 * @name LaTeX Generator
 * @author Avasay-Sayava
 * @authorId 812235988659077120
 * @description Adds a button to the chat bar to generate and copy LaTeX equations as images.
 * @version 2.1.6
 * @source https://github.com/Avasay-Sayava/BetterDiscordPlugins/blob/main/LaTeXGenerator/LaTeXGenerator.plugin.js
 */

const { React, Components, Webpack, Data, UI, DOM, Patcher } = BdApi;
const { useState, useEffect, useRef, createElement } = React;
const { Tooltip, SliderInput } = Components;

const fs = require("fs");
const path = require("path");

const DiscordClasses = {
  ButtonWrapper: Webpack.getByKeys("buttonWrapper", "buttonContent"),
  Button: Webpack.getByKeys("emojiButton", "stickerButton"),
  Icon: Webpack.getByKeys("iconContainer", "trinketsIcon"),
};

const Plugin = {
  NAME: "LaTeX Generator",
  KEY: "LaTeXGenerator",
  PATCH_ID: "latex-generator",
};

const API = {
  NAME: "CodeCogs LaTeX API",
  URL: "https://latex.codecogs.com/",
};

const TOAST_TYPES = {
  SUCCESS: "success",
  ERROR: "error",
  INFO: "info",
  WARNING: "warning",
  DEFAULT: "default",
};

const CHAT_BAR_TYPES = ["normal", "sidebar"];
const DEFAULT_SETTINGS = {
  latex: "",
  dpi: 150,
  color: "#FFFFFF",
};

const DEFAULT_UI_SETTINGS = {
  colorMode: "rgb",
  showSnippets: true,
  showSymbols: true,
  showRecent: true,
  autoFormatOnPause: false,
  syntaxCommandColor: "#7cc7ff",
  syntaxBraceColor: "#ffd166",
  syntaxNumberColor: "#9be370",
  syntaxOperatorColor: "#ff8fab",
  syntaxCommentColor: "#8e9297",
};

const SETTINGS_SAVE_DELAY = 500;
const PREVIEW_UPDATE_DELAY = 500;

const EDITOR_INDENT = "  ";

const RGB_RANGE = { min: 0, max: 255 };
const HEX_COLOR_REGEX = /^#[A-Fa-f0-9]{6}$/;

const MAX_RECENT_FORMULAS = 8;

const DPI_RANGE = { min: 50, max: 1200 };
const DPI_MARKERS = [50, 100, 150, 200, 300, 450, 600, 900, 1200];

const PLUGIN_STORAGE_DIR = path.join(BdApi.Plugins?.folder || __dirname, "LaTeXGenerator");
const LIBRARY_FILE_PATH = path.join(PLUGIN_STORAGE_DIR, "library.json");

const COLOR_MODE_OPTIONS = [
  { label: "Swatches", value: "swatches" },
  { label: "RGB", value: "rgb" },
  { label: "Hex", value: "hex" },
  { label: "Mixed", value: "mixed" },
];

const COLOR_SWATCHES = [
  { name: "Snow", hex: "#FFFFFF" },
  { name: "Sun", hex: "#F1C40F" },
  { name: "Coral", hex: "#FF6B6B" },
  { name: "Rose", hex: "#E91E63" },
  { name: "Sky", hex: "#4FC3F7" },
  { name: "Ocean", hex: "#3498DB" },
  { name: "Mint", hex: "#2ECC71" },
  { name: "Lavender", hex: "#9B59B6" },
  { name: "Slate", hex: "#708090" },
  { name: "Night", hex: "#2C2C2C" },
];

const LATEX_SNIPPETS = [
  { label: "Fraction", value: "\\frac{a}{b}" },
  { label: "Power", value: "x^{2}" },
  { label: "Root", value: "\\sqrt{x}" },
  { label: "Sum", value: "\\sum_{i=1}^{n}" },
  { label: "Matrix", value: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", },
];

const SYMBOL_SNIPPETS = [
  { label: "alpha", value: "\\alpha" },
  { label: "beta", value: "\\beta" },
  { label: "pi", value: "\\pi" },
  { label: "theta", value: "\\theta" },
  { label: "int", value: "\\int" },
  { label: "lim", value: "\\lim" },
  { label: "infty", value: "\\infty" },
  { label: "pm", value: "\\pm" },
  { label: "times", value: "\\times" },
  { label: "cdot", value: "\\cdot" },
  { label: "leq", value: "\\leq" },
  { label: "geq", value: "\\geq" },
];

const LATEX_GUIDE_SECTIONS = [
  {
    title: "Basics",
    description: "Start here for plain equations, grouping, and the commands you'll use constantly.",
    items: [
      { label: "Inline equation", code: "E = mc^2" },
      { label: "Grouping", code: "{x + y}^2" },
      { label: "Text inside math", code: "\\text{hello world}" },
      { label: "Multiple terms", code: "ax^2 + bx + c = 0" },
      { label: "Parentheses", code: "(a+b)(a-b)" },
    ],
  },
  {
    title: "Powers",
    description: "Use `^` for superscripts and `_` for subscripts. Wrap longer parts in braces.",
    items: [
      { label: "Power", code: "x^2" },
      { label: "Subscript", code: "a_1" },
      { label: "Long exponent", code: "x^{n+1}" },
      { label: "Long subscript", code: "a_{index}" },
      { label: "Combined", code: "x_{i}^{2}" },
      { label: "Nested", code: "e^{-x^2}" },
    ],
  },
  {
    title: "Fractions",
    description: "Fractions and roots are some of the most common LaTeX structures for math formatting.",
    items: [
      { label: "Fraction", code: "\\frac{a}{b}" },
      { label: "Square root", code: "\\sqrt{x}" },
      { label: "Nth root", code: "\\sqrt[n]{x}" },
      { label: "Nested fraction", code: "\\frac{1}{\\sqrt{x}}" },
      { label: "Binomial style", code: "\\frac{n!}{k!(n-k)!}" },
    ],
  },
  {
    title: "Calculus",
    description: "These patterns cover limits, sums, products, and integrals with lower and upper bounds.",
    items: [
      { label: "Summation", code: "\\sum_{i=1}^{n} i" },
      { label: "Product", code: "\\prod_{k=1}^{n} k" },
      { label: "Integral", code: "\\int_{a}^{b} x^2 \\, dx" },
      { label: "Derivative", code: "\\frac{d}{dx}x^2 = 2x" },
      { label: "Partial derivative", code: "\\frac{\\partial f}{\\partial x}" },
      { label: "Limit", code: "\\lim_{x \\to 0} \\frac{\\sin x}{x}" },
    ],
  },
  {
    title: "Brackets",
    description: "Use `\\left` and `\\right` when you want brackets to grow with the content.",
    items: [
      { label: "Auto-size brackets", code: "\\left( \\frac{a}{b} \\right)" },
      { label: "Absolute value", code: "\\left| x^2 - 4 \\right|" },
      { label: "Set braces", code: "\\left\\{ x \\in \\mathbb{R} \\right\\}" },
      { label: "Piecewise cases", code: "\\begin{cases} x & x>0 \\\\ 0 & x=0 \\end{cases}", },
    ],
  },
  {
    title: "Matrices",
    description: "Matrices use `&` to separate columns and `\\\\` to start a new row.",
    items: [
      { label: "Bracket matrix", code: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", },
      { label: "Parenthesis matrix", code: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", },
      { label: "Determinant", code: "\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}", },
      { label: "Column vector", code: "\\begin{bmatrix} x \\\\ y \\\\ z \\end{bmatrix}", },
    ],
  },
  {
    title: "Symbols",
    description: "LaTeX gives you commands for Greek letters, operators, relations, arrows, and more.",
    items: [
      { label: "Greek letters", code: "\\alpha \\beta \\gamma \\theta \\pi \\lambda" },
      { label: "Operators", code: "\\times \\cdot \\pm \\div" },
      { label: "Relations", code: "\\leq \\geq \\neq \\approx" },
      { label: "Arrows", code: "\\to \\rightarrow \\Rightarrow \\leftrightarrow" },
      { label: "Sets", code: "\\in \\notin \\subseteq \\cup \\cap" },
      { label: "Logic", code: "\\forall x \\in A,\\ \\exists y" },
    ],
  },
  {
    title: "Text",
    description: "Use text and spacing commands when you need words, labels, or cleaner visual rhythm.",
    items: [
      { label: "Text block", code: "\\text{speed of light}" },
      { label: "Roman text", code: "\\mathrm{d}x" },
      { label: "Bold vector", code: "\\mathbf{F} = m\\mathbf{a}" },
      { label: "Subscript text", code: "V_{\\text{out}}" },
      { label: "Spacing", code: "a\\,b \\quad a\\qquad b" },
      { label: "Centered dots", code: "a_1,\\ a_2,\\ \\ldots,\\ a_n" },
    ],
  },
  {
    title: "Color",
    description: "This plugin supports a base equation color plus RGB color blocks for specific parts.",
    items: [
      { label: "Base color", code: "Use the color controls for the whole equation." },
      { label: "Color part", code: "{\\color[RGB]{255,0,0}x} + {\\color[RGB]{0,180,255}y}", },
      { label: "Mixed expression", code: "{\\color[RGB]{255,180,0}\\int} {\\color[RGB]{255,255,255}x^2} \\, dx", },
      { label: "Wrap selection tool", code: "Select part of the equation, then click Wrap Selection.", },
    ],
  },
];

const LATEX_ICON = `
<svg
  viewBox="0 -9 9 9"
  width="24"
  height="24"
  fill="none"
  stroke="currentColor"
  stroke-width="0.05"
  xmlns="http://www.w3.org/2000/svg"
>
  <path
    d="M2.15193-1.111831C2.797509-2.116065 3.000747-2.881196 3.156164-3.514819C3.574595-5.164633 4.028892-6.599253 4.770112-7.424159C4.913574-7.579577 5.009215-7.687173 5.391781-7.687173C6.216687-7.687173 6.240598-6.862267 6.240598-6.694894C6.240598-6.479701 6.180822-6.312329 6.180822-6.252553C6.180822-6.168867 6.252553-6.168867 6.264508-6.168867C6.455791-6.168867 6.77858-6.300374 7.07746-6.515567C7.292653-6.682939 7.400249-6.802491 7.400249-7.292653C7.400249-7.938232 7.065504-8.428394 6.396015-8.428394C6.01345-8.428394 4.961395-8.332752 3.789788-7.149191C2.833375-6.168867 2.271482-4.016936 2.044334-3.120299C1.829141-2.295392 1.733499-1.924782 1.374844-1.207472C1.291158-1.06401 .980324-.537983 .812951-.382565C.490162-.083686 .37061 .131507 .37061 .191283C.37061 .215193 .394521 .263014 .478207 .263014C.526027 .263014 .777086 .215193 1.08792 .011955C1.291158-.107597 1.315068-.131507 1.590037-.418431C2.187796-.406476 2.606227-.298879 3.359402-.083686C3.969116 .083686 4.578829 .263014 5.188543 .263014C6.156912 .263014 7.137235-.466252 7.519801-.992279C7.758904-1.315068 7.830635-1.613948 7.830635-1.649813C7.830635-1.733499 7.758904-1.733499 7.746949-1.733499C7.555666-1.733499 7.268742-1.601993 7.065504-1.458531C6.742715-1.255293 6.718804-1.183562 6.647073-.980324C6.587298-.789041 6.515567-.6934 6.467746-.621669C6.372105-.478207 6.360149-.478207 6.180822-.478207C5.606974-.478207 5.009215-.657534 4.220174-.872727C3.88543-.968369 3.227895-1.159651 2.630137-1.159651C2.47472-1.159651 2.307347-1.147696 2.15193-1.111831Z"
    fill="currentColor"
  />
</svg>
`;

const CSS = `/*css*/@keyframes latex-generator-fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes latex-generator-soft-glow {
  0%,
  100% {
    box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--background-modifier-accent) 70%, transparent),
      0 14px 28px rgba(0, 0, 0, 0.12);
  }
  50% {
    box-shadow: inset 0 0 0 1px
        color-mix(in srgb, var(--bd-brand) 28%, transparent),
      0 18px 34px rgba(0, 0, 0, 0.16);
  }
}
.latex-generator-modal {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 12px;
  padding-top: 2px;
  width: 100%;
  height: 100%;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  align-self: stretch;
  animation: latex-generator-fade-up 180ms ease-out;
}
.latex-generator-shell-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(100%, 1320px);
  margin: 0 auto;
  flex: 1 1 auto;
  min-height: 0;
}
.latex-generator-panel-divider {
  height: 1px;
  background: color-mix(
    in srgb,
    var(--background-modifier-accent) 70%,
    transparent
  );
  border-radius: 999px;
}
.latex-generator-top-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.98fr);
  gap: 18px;
  align-items: stretch;
}
.latex-generator-shell {
  width: min(1360px, 98vw) !important;
  max-width: 98vw !important;
  min-height: min(1020px, 98vh) !important;
  height: min(1020px, 98vh) !important;
}
.latex-generator-shell-content {
  max-height: 98vh !important;
}
.latex-generator-surface {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--background-secondary) 92%, white 8%),
    var(--background-secondary)
  );
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 75%, transparent);
  border-radius: 16px;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.14);
  width: 100%;
  min-width: 0;
  transition: transform 160ms ease, box-shadow 160ms ease,
    border-color 160ms ease;
}
.latex-generator-surface:hover {
  transform: none;
  border-color: color-mix(
    in srgb,
    var(--bd-brand) 24%,
    var(--background-modifier-accent)
  );
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
}
.latex-generator-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 16px 0;
}
.latex-generator-label-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.latex-generator-section-title {
  color: var(--header-primary);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.latex-generator-section-note {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.45;
}
.latex-generator-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--background-tertiary) 88%, transparent);
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 75%, transparent);
  color: var(--text-normal);
  font-size: 12px;
  white-space: nowrap;
  transition: transform 140ms ease, border-color 140ms ease,
    background 140ms ease;
}
.latex-generator-chip:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--bd-brand) 30%, transparent);
  background: color-mix(in srgb, var(--background-tertiary) 78%, white 22%);
}
.latex-generator-preview {
  display: flex;
  position: relative;
  min-height: clamp(280px, 38vh, 460px);
  max-height: none;
  margin: 6px 8px 8px;
  overflow: hidden;
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 80%, transparent);
  border-radius: 14px;
  background: radial-gradient(
      circle at top,
      color-mix(in srgb, var(--brand-500) 14%, transparent),
      transparent 55%
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--background-primary) 72%, transparent),
      var(--background-tertiary)
    );
  transition: border-color 180ms ease, box-shadow 180ms ease,
    transform 180ms ease;
}
.latex-generator-preview:hover {
  transform: translateY(-1px);
  border-color: color-mix(
    in srgb,
    var(--bd-brand) 26%,
    var(--background-modifier-accent)
  );
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.16);
}
.latex-generator-preview-parent {
  position: relative;
  overflow-y: hidden;
  overflow-x: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  scrollbar-width: thin;
}
.latex-generator-preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
  min-width: 100%;
  width: 100%;
}
.latex-generator-preview-container::before,
.latex-generator-preview-container::after {
  content: "";
  display: block;
  flex-shrink: 0;
  width: 16px;
  height: 1px;
}
.latex-generator-preview-container > * {
  flex-shrink: 0;
  margin: 0 auto;
}
.latex-generator-preview-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  padding: 10px 12px;
  border-radius: 12px;
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
  background: color-mix(in srgb, var(--background-floating) 72%, transparent);
  box-shadow: inset 0 0 0 1px
      color-mix(in srgb, var(--background-modifier-accent) 70%, transparent),
    0 14px 28px rgba(0, 0, 0, 0.12);
  animation: latex-generator-soft-glow 3.8s ease-in-out infinite;
  transition: transform 180ms ease;
}
.latex-generator-preview-wrapper:hover {
  transform: scale(1.01);
}
.latex-generator-preview-img {
  display: block;
  max-width: min(100%, 760px);
  max-height: min(100%, 420px);
  width: auto;
  height: auto;
  object-fit: contain;
}
.latex-generator-preview-empty {
  display: block;
  padding: 18px 20px;
  color: var(--text-muted);
  text-align: center;
  font-size: 13px;
  line-height: 1.5;
}
.latex-generator-preview-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.04), rgba(0, 0, 0, 0.32));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  pointer-events: none;
  z-index: 10;
  border-radius: 14px;
}
.latex-generator-preview:hover .latex-generator-preview-overlay {
  opacity: 1;
}
.latex-generator-preview-btn-wrapper {
  pointer-events: auto;
}
.latex-generator-preview-btn {
  background: linear-gradient(
    135deg,
    var(--bd-brand),
    color-mix(in srgb, var(--bd-brand) 82%, white 18%)
  );
  color: #fff;
  border: 1px solid color-mix(in srgb, var(--bd-brand-active) 70%, transparent);
  border-radius: 999px;
  padding: 10px 22px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--bd-brand) 32%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s;
}
.latex-generator-preview-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px color-mix(in srgb, var(--bd-brand) 40%, transparent);
}
.latex-generator-preview-btn:active:not(:disabled) {
  transform: translateY(0);
}
.latex-generator-preview-btn:disabled {
  background: var(--input-border-default);
  color: var(--text-muted);
  border-color: transparent;
  box-shadow: none;
  cursor: not-allowed;
}
.latex-generator-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
}
.latex-generator-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.latex-generator-mobile-note {
  color: var(--text-muted);
  font-size: 12px;
}
.latex-generator-textarea {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--input-background-default) 90%, white 10%),
    var(--input-background-default)
  );
  color: var(--text-default);
  border: 1px solid var(--input-border-default);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  min-height: 245px;
  width: 100%;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  tab-size: 2;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 150ms linear, box-shadow 150ms linear,
    transform 150ms ease;
}
.latex-generator-textarea:focus {
  border-color: var(--bd-brand-active);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bd-brand) 20%, transparent);
  transform: translateY(-1px);
}
.latex-generator-textarea:hover:not(:focus) {
  border-color: var(--bd-brand-hover);
}
.latex-generator-textarea::placeholder {
  color: var(--text-muted);
}
.latex-generator-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.latex-generator-snippets,
.latex-generator-symbols {
  display: grid;
  gap: 6px;
}
.latex-generator-snippets {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.latex-generator-symbols {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}
.latex-generator-snippet-btn,
.latex-generator-action-btn,
.latex-generator-symbol-btn,
.latex-generator-recent-btn,
.latex-generator-swatch-btn {
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 92%, white 8%);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--background-secondary) 82%, white 18%),
    color-mix(in srgb, var(--background-secondary) 96%, black 4%)
  );
  color: var(--header-primary);
  border-radius: 10px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 2px 8px rgba(0, 0, 0, 0.14);
  transition: transform 0.15s ease, border-color 0.15s ease,
    background 0.15s ease, box-shadow 0.15s ease;
}
.latex-generator-snippet-btn:hover,
.latex-generator-action-btn:hover,
.latex-generator-symbol-btn:hover,
.latex-generator-recent-btn:hover,
.latex-generator-swatch-btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--bd-brand) 58%, transparent);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--background-tertiary) 78%, white 22%),
    color-mix(in srgb, var(--background-secondary) 90%, black 10%)
  );
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 8px 18px rgba(0, 0, 0, 0.16);
}
.latex-generator-snippet-btn:active,
.latex-generator-action-btn:active,
.latex-generator-symbol-btn:active,
.latex-generator-recent-btn:active,
.latex-generator-swatch-btn:active {
  transform: translateY(0);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.1);
}
.latex-generator-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}
.latex-generator-builder-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(190px, 0.72fr);
  gap: 8px;
  align-items: start;
}
.latex-generator-builder-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}
.latex-generator-builder-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
.latex-generator-guide-btn {
  width: auto;
  min-width: 108px;
  flex: 0 0 auto;
}
.latex-generator-builder-mode-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  min-width: 0;
}
.latex-generator-mode-select-wrap {
  flex: 1 1 180px;
  min-width: 0;
  max-width: 220px;
}
.latex-generator-inline-select-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}
.latex-generator-side-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.latex-generator-panel {
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 70%, transparent);
  background: color-mix(in srgb, var(--background-tertiary) 88%, transparent);
  border-radius: 12px;
  padding: 9px;
  transition: border-color 160ms ease, transform 160ms ease,
    box-shadow 160ms ease;
}
.latex-generator-panel:hover {
  transform: translateY(-1px);
  border-color: color-mix(
    in srgb,
    var(--bd-brand) 24%,
    var(--background-modifier-accent)
  );
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}
.latex-generator-panel-title {
  margin: 0 0 6px;
  color: var(--header-secondary);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.latex-generator-toolbar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.latex-generator-action-btn {
  width: 100%;
  text-align: center;
  justify-content: center;
}
.latex-generator-snippet-btn,
.latex-generator-symbol-btn {
  width: 100%;
  text-align: center;
  justify-content: center;
}
.latex-generator-action-btn {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bd-brand) 14%, var(--background-secondary)),
    color-mix(in srgb, var(--background-secondary) 92%, black 8%)
  );
}
.latex-generator-action-btn:hover {
  border-color: color-mix(in srgb, var(--bd-brand) 68%, transparent);
}
.latex-generator-recent-btn {
  border-style: dashed;
}
.latex-generator-inline-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 60px;
  min-width: 0;
}
.latex-generator-inline-section .bd-slider-wrap {
  flex: 1 1 auto;
  width: auto;
  max-width: none;
  min-width: 0;
  padding: 0;
  margin-top: 0;
  margin-bottom: 0;
}
.latex-generator-inline-section .bd-slider-marker-container {
  transform: translateY(10px);
  min-width: 0;
}
.latex-generator-inline-section h1 {
  min-width: 42px;
  flex: 0 0 auto;
  margin: 0;
  color: var(--header-secondary);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.latex-generator-size-section {
  margin-top: -4px;
}
.latex-generator-rgb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.latex-generator-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.latex-generator-field label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.latex-generator-number,
.latex-generator-color-input,
.latex-generator-select {
  width: 100%;
  min-height: 34px;
  border-radius: 10px;
  border: 1px solid var(--input-border-default);
  background: var(--input-background-default);
  color: var(--text-normal);
  box-sizing: border-box;
}
.latex-generator-number {
  padding: 0 10px;
}
.latex-generator-color-input {
  padding: 4px;
}
.latex-generator-select {
  padding: 0 10px;
  font-size: 12px;
  font-weight: 700;
  min-width: 0;
}
.latex-generator-select option {
  color: #000;
  background: #fff;
}
.latex-generator-help {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
  margin-top: 0;
}
.latex-generator-top-tip {
  margin-top: -2px;
  padding: 4px 7px;
  border: 1px solid color-mix(in srgb, var(--bd-brand) 22%, transparent);
  border-radius: 12px;
  background: color-mix(
    in srgb,
    var(--bd-brand) 10%,
    var(--background-tertiary)
  );
  color: var(--text-normal);
  font-size: 11px;
  line-height: 1.3;
}
.latex-generator-top-tip br {
  display: none;
}
.latex-generator-top-tip strong {
  color: var(--header-primary);
}
.latex-generator-hex-input {
  width: 100%;
  min-height: 34px;
  border-radius: 10px;
  border: 1px solid var(--input-border-default);
  background: var(--input-background-default);
  color: var(--text-normal);
  box-sizing: border-box;
  padding: 0 10px;
  font-family: Consolas, "Liberation Mono", Menlo, monospace;
}
.latex-generator-swatch-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 4px;
}
.latex-generator-swatch-btn {
  min-height: 24px;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
}
.latex-generator-swatch-chip {
  display: block;
  width: 100%;
  height: 100%;
}
.latex-generator-recent-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.latex-generator-recent-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px;
  align-items: stretch;
}
.latex-generator-recent-btn {
  text-align: left;
  justify-content: flex-start;
  font-family: Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 11px;
  line-height: 1.4;
}
.latex-generator-delete-btn {
  min-width: 64px;
  padding: 8px 10px;
}
.latex-generator-guide {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 62vh;
  overflow: auto;
  padding-right: 6px;
}
.latex-generator-guide-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.latex-generator-guide-tab {
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 82%, white 8%);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--background-secondary) 82%, white 18%),
    color-mix(in srgb, var(--background-secondary) 96%, black 4%)
  );
  color: var(--header-primary);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.latex-generator-guide-tab.is-active {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bd-brand) 34%, white 8%),
    color-mix(in srgb, var(--bd-brand) 24%, var(--background-secondary))
  );
  border-color: color-mix(in srgb, var(--bd-brand) 78%, transparent);
  color: #fff;
}
.latex-generator-guide-intro {
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}
.latex-generator-guide-section {
  border: 1px solid
    color-mix(in srgb, var(--background-modifier-accent) 72%, transparent);
  background: color-mix(in srgb, var(--background-tertiary) 88%, transparent);
  border-radius: 12px;
  padding: 12px;
}
.latex-generator-guide-title {
  margin: 0 0 10px;
  color: var(--header-primary);
  font-size: 14px;
  font-weight: 700;
}
.latex-generator-guide-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.latex-generator-guide-row {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.latex-generator-guide-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}
.latex-generator-guide-code {
  display: block;
  border-radius: 10px;
  border: 1px solid var(--input-border-default);
  background: var(--input-background-default);
  color: var(--header-primary);
  padding: 8px 10px;
  font-family: Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
@media (prefers-reduced-motion: reduce) {
  .latex-generator-modal,
  .latex-generator-surface,
  .latex-generator-chip,
  .latex-generator-preview,
  .latex-generator-preview-wrapper,
  .latex-generator-textarea,
  .latex-generator-snippet-btn,
  .latex-generator-action-btn,
  .latex-generator-symbol-btn,
  .latex-generator-recent-btn,
  .latex-generator-swatch-btn,
  .latex-generator-panel {
    animation: none !important;
    transition: none !important;
    transform: none !important;
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
@media (max-width: 720px) {
  .latex-generator-top-grid,
  .latex-generator-builder-header,
  .latex-generator-builder-grid,
  .latex-generator-grid {
    grid-template-columns: 1fr;
  }
  .latex-generator-modal,
  .latex-generator-main-column,
  .latex-generator-utility-column {
    justify-content: flex-start;
  }
  .latex-generator-snippets {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .latex-generator-symbols {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .latex-generator-guide-row {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 780px) {
  .latex-generator-top-grid,
  .latex-generator-builder-grid,
  .latex-generator-grid {
    grid-template-columns: 1fr;
  }
  .latex-generator-meta-row,
  .latex-generator-section-head,
  .latex-generator-inline-section {
    flex-direction: column;
    align-items: stretch;
  }
  .latex-generator-inline-section .bd-slider-wrap {
    max-width: none;
  }
  .latex-generator-builder-header,
  .latex-generator-builder-mode-row {
    flex-wrap: wrap;
  }
}/*!css*/`;

const MIRROR_CSS = `
.latex-generator-editor-shell {
  position: relative;
  min-height: 245px;
  border: 1px solid var(--input-border-default);
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--input-background-default) 90%, white 10%),
    var(--input-background-default)
  );
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
  transition: border-color 150ms linear, box-shadow 150ms linear;
}

.latex-generator-editor-shell:hover { border-color: var(--bd-brand-hover); }

.latex-generator-editor-shell:focus-within {
  border-color: var(--bd-brand-active);
  box-shadow: 0 0 0 3px color-mix(in srgb,var(--bd-brand) 20%,transparent);
}

.latex-generator-highlight,
.latex-generator-editor-shell .latex-generator-textarea {
  margin: 0;
  padding: 12px 14px;
  width: 100%;
  min-height: 245px;
  box-sizing: border-box;
  font-family: Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  line-height: 1.6;
  tab-size: 2;
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
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  resize: vertical;
  transition: none;
}

.latex-generator-textarea--mirrored { color: transparent; caret-color: var(--text-default); }

.latex-generator-token--command { color: var(--latex-token-command,#7cc7ff); }
.latex-generator-token--brace { color: var(--latex-token-brace,#ffd166); }
.latex-generator-token--number { color: var(--latex-token-number,#9be370); }
.latex-generator-token--operator { color: var(--latex-token-operator,#ff8fab); }
.latex-generator-token--comment { color: var(--latex-token-comment,var(--text-muted)); font-style: italic; }

.latex-generator-editor-shell::after {
  content: "Tab indents • Enter keeps indentation • Braces auto-pair";
  position: absolute;
  right: 10px;
  bottom: 8px;
  z-index: 2;
  pointer-events: none;
  color: color-mix(in srgb,var(--text-muted) 85%,transparent);
  font-size: 10px;
  letter-spacing: 0.02em;
  opacity: 0;
  transition: opacity 150ms ease;
}

.latex-generator-editor-shell:focus-within::after { opacity: 1; }
`;
class SettingsManager {
  static cache = new Map();
  static getSetting(key, fallback) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const value = Data.load(Plugin.KEY, key) ?? fallback;
    this.cache.set(key, value);
    return value;
  }
  static setSetting(key, value) {
    this.cache.set(key, value);
    Data.save(Plugin.KEY, key, value);
  }
  static getSavedData() {
    return this.getSetting("settings", DEFAULT_SETTINGS);
  }
  static getUiSettings() {
    return {
      ...DEFAULT_UI_SETTINGS,
      ...this.getSetting("uiSettings", DEFAULT_UI_SETTINGS),
    };
  }
  static setUiSettings(value) {
    this.setSetting("uiSettings", {
      ...DEFAULT_UI_SETTINGS,
      ...value,
    });
  }
  static sanitizeHexColor(value, fallback) {
    if (typeof value !== "string") {
      return fallback;
    }
    const normalized = value.trim();
    return HEX_COLOR_REGEX.test(normalized) ? normalized : fallback;
  }
  static getRecentFormulas() {
    return this.getSetting("recentFormulas", []);
  }
  static setRecentFormulas(value) {
    this.setSetting("recentFormulas", value);
  }
  static pushRecentFormula(latex) {
    const trimmed = latex.trim();
    if (!trimmed) {
      return;
    }
    const nextRecent = [
      trimmed,
      ...this.getRecentFormulas().filter((entry) => entry !== trimmed),
    ].slice(0, MAX_RECENT_FORMULAS);
    this.setSetting("recentFormulas", nextRecent);
  }
  static removeRecentFormula(entryToRemove) {
    const nextRecent = this.getRecentFormulas().filter(
      (entry) => entry !== entryToRemove,
    );
    this.setRecentFormulas(nextRecent);
  }
  static ensureLibraryStorage() {
    fs.mkdirSync(PLUGIN_STORAGE_DIR, {
      recursive: true
    });
    if (!fs.existsSync(LIBRARY_FILE_PATH)) {
      const legacyEntries = this.getSetting("libraryEntries", []);
      fs.writeFileSync(
        LIBRARY_FILE_PATH,
        JSON.stringify(Array.isArray(legacyEntries) ? legacyEntries : [], null, 2),
        "utf8",
      );
    }
  }
  static readLibraryEntries() {
    try {
      this.ensureLibraryStorage();
      const raw = fs.readFileSync(LIBRARY_FILE_PATH, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error(`${Plugin.NAME}: Failed to read library file.`, error);
      return [];
    }
  }
  static writeLibraryEntries(entries) {
    try {
      this.ensureLibraryStorage();
      fs.writeFileSync(
        LIBRARY_FILE_PATH,
        JSON.stringify(entries, null, 2),
        "utf8",
      );
      return true;
    } catch (error) {
      console.error(`${Plugin.NAME}: Failed to write library file.`, error);
      return false;
    }
  }
  static getLibraryEntries() {
    return this.readLibraryEntries();
  }
  static setLibraryEntries(value) {
    this.writeLibraryEntries(value);
  }
  static saveLibraryEntry(name, latex) {
    const trimmedName = (name || "").trim();
    const trimmedLatex = (latex || "").trim();
    if (!trimmedName || !trimmedLatex) {
      return false;
    }
    const nextEntries = [{
      name: trimmedName,
      latex: trimmedLatex
    },
    ...this.getLibraryEntries().filter((entry) => entry.name !== trimmedName),
    ];
    return this.writeLibraryEntries(nextEntries);
  }
  static removeLibraryEntry(name) {
    return this.writeLibraryEntries(
      this.getLibraryEntries().filter((entry) => entry.name !== name),
    );
  }
  static getAutoPreview() {
    return this.getSetting("autoPreview", false);
  }
  static hasAgreedToTerms() {
    return this.getSetting("agreedToTerms", false);
  }
  static setAgreedToTerms(value) {
    this.setSetting("agreedToTerms", value);
  }
}

class ImageProcessor {
  static clampRgb(value) {
    return Math.max(
      RGB_RANGE.min,
      Math.min(RGB_RANGE.max, Number.parseInt(value, 10) || 0),
    );
  }
  static hexToRgb(hex) {
    if (HEX_COLOR_REGEX.test(hex)) {
      const colorValue = Number.parseInt(hex.slice(1), 16);
      return {
        r: (colorValue >> 16) & 255,
        g: (colorValue >> 8) & 255,
        b: colorValue & 255,
      };
    }
    return {
      r: 255,
      g: 255,
      b: 255
    };
  }
  static rgbToHex({
    r,
    g,
    b
  }) {
    const toHex = (value) => this.clampRgb(value).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  static createColorWrappedLatex(latex, color) {
    const trimmed = latex.trim();
    if (!trimmed) {
      return "";
    }
    const {
      r,
      g,
      b
    } = this.hexToRgb(color);
    return `{\\color[RGB]{${r},${g},${b}} ${trimmed}}`;
  }
  static generateApiRequest(latex, dpi, color) {
    const payload = `\\dpi{${dpi}} ${this.createColorWrappedLatex(latex, color)}`;
    return `${API.URL}png.latex?${encodeURIComponent(payload)}`;
  }
  static async copyToClipboard(state) {
    const {
      latex,
      color,
      dpi
    } = state;
    if (!latex) return;
    const fetched = this.generateApiRequest(latex, dpi, color);
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
        throw new Error(
          "Clipboard image copy is not supported in this client.",
        );
      }
      const response = await fetch(fetched);
      if (!response.ok) {
        throw new Error(`Image request failed with status ${response.status}.`);
      }
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": blob
        }),
      ]);
      UIManager.toast("Image copied!", TOAST_TYPES.SUCCESS);
    } catch (err) {
      console.error(err);
      UIManager.toast("Failed to process image.", TOAST_TYPES.ERROR);
    }
  }
}

class UIManager {
  static toast(message, type = TOAST_TYPES.INFO) {
    UI.showToast(`${Plugin.NAME}: ${message}`, {
      type
    });
  }
  static createButton(
    key,
    className,
    label,
    onClick,
    extraProps = {},
  ) {
    return createElement(
      "button", {
      key,
      type: "button",
      className,
      onClick,
      ...extraProps,
    },
      label,
    );
  }
  static createPanel(title, ...children) {
    return createElement(
      "div", {
      className: "latex-generator-panel"
    },
      createElement(
        "div", {
        className: "latex-generator-panel-title"
      },
        title,
      ),
      ...children,
    );
  }
  static createField(label, control) {
    return createElement(
      "div", {
      className: "latex-generator-field"
    },
      createElement("label", {}, label),
      control,
    );
  }
  static createActionButton(key, label, onClick) {
    return this.createButton(
      key,
      "latex-generator-action-btn",
      label,
      onClick,
    );
  }
  static createSnippetButtons(items, className, textareaRef, setLatex) {
    const buttonClass =
      className === "latex-generator-symbols" ?
        "latex-generator-symbol-btn" :
        "latex-generator-snippet-btn";
    return createElement(
      "div", {
      className
    },
      ...items.map((item) =>
        this.createButton(
          `${buttonClass}${item.label}`,
          buttonClass,
          item.label,
          () => this.insertSnippet(textareaRef, setLatex, item.value),
        ),
      ),
    );
  }
  static createRgbInput(channel, label, value, updateRgbChannel) {
    return this.createField(
      label,
      createElement("input", {
        className: "latex-generator-number",
        type: "number",
        min: RGB_RANGE.min,
        max: RGB_RANGE.max,
        value,
        onChange: (e) => updateRgbChannel(channel, e.target.value),
      }),
    );
  }
  static createSectionMeta(title, note, trailing = null) {
    return createElement(
      "div", {
      className: "latex-generator-meta-row"
    },
      createElement(
        "div", {
        className: "latex-generator-label-stack"
      },
        createElement(
          "div", {
          className: "latex-generator-section-title"
        },
          title,
        ),
        createElement(
          "div", {
          className: "latex-generator-section-note"
        },
          note,
        ),
      ),
      trailing,
    );
  }
  static createRgbState(color) {
    return ImageProcessor.hexToRgb(color);
  }
  static setTextareaValue(textareaRef, value, setLatex) {
    setLatex(value);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }
  static setTextareaSelectionValue(
    textareaRef,
    setLatex,
    value,
    selectionStart,
    selectionEnd = selectionStart,
  ) {
    setLatex(value);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }
  static replaceTextareaSelection(textareaRef, setLatex, transformer) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const selection = textarea.value.slice(start, end);
    const replacement = transformer(selection);
    const nextValue =
      textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
    setLatex(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const nextCursor = start + replacement.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    });
  }
  static insertSnippet(textareaRef, setLatex, snippet) {
    this.replaceTextareaSelection(
      textareaRef,
      setLatex,
      (selection) => selection || snippet,
    );
  }
  static buildColorBlock(rgb, target = "x") {
    const trimmedTarget = (target || "x").trim() || "x";
    return `{\\color[RGB]{${rgb.r},${rgb.g},${rgb.b}} ${trimmedTarget}}`;
  }
  static wrapSelectionWithColor(textareaRef, setLatex, colorMode, rgb, color) {
    this.replaceTextareaSelection(textareaRef, setLatex, (selection) => {
      const target = selection || "x";
      return this.buildColorBlock(rgb, target);
    });
  }
  static normalizeLatexInput(latex) {
    return (latex || "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, EDITOR_INDENT)
      .replace(/\\color\[HTML\]\{([A-Fa-f0-9]{6})\}/g, (_, hex) =>
        `\\color[HTML]{${hex.toUpperCase()}}`,
      );
  }
  static handleEditorInputChange(event, setLatex) {
    setLatex(this.normalizeLatexInput(event.target.value));
  }
  static handleEditorKeyDown(event, textareaRef, setLatex) {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const value = textarea.value;
    const selectedText = value.slice(start, end);
    const pairMap = {
      "{": "}",
      "[": "]",
      "(": ")",
    };
    if (event.key === "Tab") {
      event.preventDefault();
      const nextValue =
        value.slice(0, start) + EDITOR_INDENT + value.slice(end);
      this.setTextareaSelectionValue(
        textareaRef,
        setLatex,
        nextValue,
        start + EDITOR_INDENT.length,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const currentLine = value.slice(lineStart, start);
      const currentIndent = currentLine.match(/^\s*/)?.[0] ?? "";
      const previousChar = value[start - 1] ?? "";
      const nextChar = value[start] ?? "";
      const extraIndent = previousChar === "{" ? EDITOR_INDENT : "";
      const closingIndent = previousChar === "{" && nextChar === "}" ? `\n${currentIndent}` : "";
      const insertion = `\n${currentIndent}${extraIndent}${closingIndent}`;
      const caretOffset =
        1 + currentIndent.length + extraIndent.length;
      const nextValue = value.slice(0, start) + insertion + value.slice(end);
      this.setTextareaSelectionValue(
        textareaRef,
        setLatex,
        nextValue,
        start + caretOffset,
      );
      return;
    }
    if (pairMap[event.key]) {
      event.preventDefault();
      const closing = pairMap[event.key];
      const nextValue =
        value.slice(0, start) +
        event.key +
        selectedText +
        closing +
        value.slice(end);
      const selectionStart = start + 1;
      const selectionEnd =
        selectedText ? selectionStart + selectedText.length : selectionStart;
      this.setTextareaSelectionValue(
        textareaRef,
        setLatex,
        nextValue,
        selectionStart,
        selectionEnd,
      );
      return;
    }
    if (
      Object.values(pairMap).includes(event.key) &&
      start === end &&
      value[start] === event.key
    ) {
      event.preventDefault();
      this.setTextareaSelectionValue(
        textareaRef,
        setLatex,
        value,
        start + 1,
      );
    }
  }
  static async copyLatexSource(latex) {
    if (!latex.trim()) {
      this.toast("No LaTeX source to copy.", TOAST_TYPES.ERROR);
      return;
    }
    try {
      await navigator.clipboard.writeText(latex);
      this.toast("LaTeX source copied!", TOAST_TYPES.SUCCESS);
    } catch (error) {
      console.error(error);
      this.toast("Failed to copy LaTeX source.", TOAST_TYPES.ERROR);
    }
  }
  static formatLatexSource(latex) {
    const trimmed = latex.trim();
    if (!trimmed) {
      return "";
    }
    const normalizeScriptBraces = (source, operator) =>
      source.replace(
        new RegExp(`\\${operator}(?!\\{)(\\\\?[A-Za-z0-9]+)`, "g"),
        `${operator}{$1}`,
      );
    let formatted = trimmed
      .replace(/\r\n/g, "\n")
      .replace(/\s*(\\\\)\s*/g, "\n$1\n")
      .replace(/\s*(\\begin\{[^}]+\})\s*/g, "\n$1\n")
      .replace(/\s*(\\end\{[^}]+\})\s*/g, "\n$1\n")
      .replace(/\s*([=+\-])\s*/g, " $1 ")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s{2,}/g, " ")
      .replace(/\n{3,}/g, "\n\n");
    formatted = normalizeScriptBraces(formatted, "^");
    formatted = normalizeScriptBraces(formatted, "_");
    formatted = formatted
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "\\frac{$1}{$2}")
      .replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, "\\sqrt[$1]{$2}")
      .replace(/\\sqrt\{([^{}]+)\}/g, "\\sqrt{$1}");
    const tokens = [];
    let depth = 0;
    let buffer = "";
    const flushBuffer = () => {
      const value = buffer.trim();
      if (value) {
        tokens.push({
          type: "text",
          value,
          depth
        });
      }
      buffer = "";
    };
    for (let index = 0; index < formatted.length; index += 1) {
      const char = formatted[index];
      const next = formatted[index + 1] ?? "";
      if (char === "\\") {
        if (next === "\\") {
          flushBuffer();
          tokens.push({
            type: "break",
            value: "\\\\",
            depth
          });
          index += 1;
          continue;
        }
        buffer += char;
        continue;
      }
      if (char === "{") {
        flushBuffer();
        tokens.push({
          type: "open",
          value: "{",
          depth
        });
        depth += 1;
        continue;
      }
      if (char === "}") {
        flushBuffer();
        depth = Math.max(0, depth - 1);
        tokens.push({
          type: "close",
          value: "}",
          depth
        });
        continue;
      }
      if ((char === "+" || char === "-" || char === "=") && depth <= 1) {
        flushBuffer();
        tokens.push({
          type: "operator",
          value: char,
          depth
        });
        continue;
      }
      if (char === "\n") {
        flushBuffer();
        tokens.push({
          type: "newline",
          value: "\n",
          depth
        });
        continue;
      }
      buffer += char;
    }
    flushBuffer();
    const lines = [];
    let currentLine = "";
    const pushLine = () => {
      const value = currentLine.trimEnd();
      if (value) {
        lines.push(value);
      }
      currentLine = "";
    };
    const append = (value) => {
      currentLine += value;
    };
    for (const token of tokens) {
      const indent = "  ".repeat(token.depth);
      if (token.type === "newline" || token.type === "break") {
        pushLine();
        if (token.type === "break") {
          lines.push(`${indent}\\\\`);
        }
        continue;
      }
      if (token.type === "operator") {
        pushLine();
        lines.push(`${indent}${token.value}`);
        continue;
      }
      if (token.type === "open") {
        pushLine();
        lines.push(`${indent}{`);
        continue;
      }
      if (token.type === "close") {
        pushLine();
        lines.push(`${indent}}`);
        continue;
      }
      if (!currentLine) {
        append(indent);
      } else if (!currentLine.endsWith(" ")) {
        append(" ");
      }
      append(token.value);
    }
    pushLine();
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  static escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  static highlightLatex(latex) {
    const source = latex || "";
    if (!source) {
      return "";
    }
    const operators = new Set(["^", "_", "=", "+", "-", "*", "/", "&"]);
    const braces = new Set(["{", "}", "[", "]", "(", ")"]);
    const spans = [];
    const pushToken = (type, value) => {
      const escaped = this.escapeHtml(value);
      spans.push(
        type ?
          `<span class="latex-generator-token latex-generator-token--${type}">${escaped}</span>` :
          escaped,
      );
    };
    for (let index = 0; index < source.length;) {
      const char = source[index];
      if (char === "%") {
        let end = index + 1;
        while (end < source.length && source[end] !== "\n") {
          end += 1;
        }
        pushToken("comment", source.slice(index, end));
        index = end;
        continue;
      }
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
        pushToken("command", source.slice(index, end));
        index = end;
        continue;
      }
      if (braces.has(char)) {
        pushToken("brace", char);
        index += 1;
        continue;
      }
      if (operators.has(char)) {
        pushToken("operator", char);
        index += 1;
        continue;
      }
      if (/\d/.test(char)) {
        let end = index + 1;
        while (end < source.length && /[\d.,]/.test(source[end])) {
          end += 1;
        }
        pushToken("number", source.slice(index, end));
        index = end;
        continue;
      }
      let end = index + 1;
      while (
        end < source.length &&
        source[end] !== "%" &&
        source[end] !== "\\" &&
        !braces.has(source[end]) &&
        !operators.has(source[end]) &&
        !/\d/.test(source[end])
      ) {
        end += 1;
      }
      pushToken("", source.slice(index, end));
      index = end;
    }
    return spans.join("");
  }
  static getPreviewUrl(latex, dpi, color) {
    if (!latex.trim()) {
      return "";
    }
    return ImageProcessor.generateApiRequest(latex, dpi, color);
  }
  static getPreviewKey(latex, dpi, color) {
    return `${latex}\u0000${dpi}\u0000${color}`;
  }
  static attachModalShellClass(contentElement) {
    if (!contentElement) {
      return () => { };
    }
    const dialog = contentElement.closest('[role="dialog"]');
    const shell =
      dialog?.querySelector('[class*="modal"]') ??
      dialog?.firstElementChild ??
      dialog;
    if (!dialog || !shell) {
      return () => { };
    }
    shell.classList.add("latex-generator-shell");
    dialog.classList.add("latex-generator-shell-content");
    return () => {
      shell.classList.remove("latex-generator-shell");
      dialog.classList.remove("latex-generator-shell-content");
    };
  }
  static LatexGuideContent() {
    const [activeTab, setActiveTab] = useState(0);
    const activeSection =
      LATEX_GUIDE_SECTIONS[activeTab] ?? LATEX_GUIDE_SECTIONS[0];
    return createElement(
      "div", {
      className: "latex-generator-guide"
    },
      createElement(
        "div", {
        className: "latex-generator-guide-intro"
      },
        "Browse the tabs for common LaTeX patterns, then copy or adapt the examples into your equation box.",
      ),
      createElement(
        "div", {
        className: "latex-generator-guide-tabs"
      },
        ...LATEX_GUIDE_SECTIONS.map((section, index) =>
          createElement(
            "button", {
            key: section.title,
            type: "button",
            className: `latex-generator-guide-tab${index === activeTab ? " is-active" : ""}`,
            onClick: () => setActiveTab(index),
          },
            section.title,
          ),
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-guide-section",
        key: activeSection.title,
      },
        createElement(
          "div", {
          className: "latex-generator-guide-title"
        },
          activeSection.title,
        ),
        activeSection.description ?
          createElement(
            "div", {
            className: "latex-generator-guide-intro"
          },
            activeSection.description,
          ) :
          null,
        createElement(
          "div", {
          className: "latex-generator-guide-list"
        },
          ...activeSection.items.map((item) =>
            createElement(
              "div", {
              key: `${activeSection.title}-${item.label}`,
              className: "latex-generator-guide-row",
            },
              createElement(
                "div", {
                className: "latex-generator-guide-label"
              },
                item.label,
              ),
              createElement(
                "code", {
                className: "latex-generator-guide-code"
              },
                item.code,
              ),
            ),
          ),
        ),
      ),
    );
  }
  static openGuideModal() {
    UI.showConfirmationModal(
      "LaTeX Guide",
      createElement(UIManager.LatexGuideContent), {
      confirmText: "Close",
      cancelText: null,
      size: "bd-modal-large",
    },
    );
  }
  static RecentFormulasContent({
    recent,
    onSelect,
    onDelete,
  }) {
    const [entries, setEntries] = useState(recent);
    const handleDelete = (entry) => {
      onDelete(entry);
      setEntries((current) => current.filter((value) => value !== entry));
    };
    return createElement(
      "div", {
      className: "latex-generator-recent-browser"
    },
      entries.length ?
        createElement(
          "div", {
          className: "latex-generator-recent-list"
        },
          ...entries.map((entry, index) =>
            createElement(
              "div", {
              key: `${index}-${entry}`,
              className: "latex-generator-recent-item",
            },
              createElement(
                "button", {
                key: `recent-open-${index}-${entry}`,
                type: "button",
                className: "latex-generator-recent-btn",
                title: entry,
                onClick: () => onSelect(entry),
              },
                createElement(
                  "div", {
                  className: "latex-generator-library-entry-name"
                },
                  `Recent Equation ${index + 1}`,
                ),
                createElement(
                  "div", {
                  className: "latex-generator-library-entry-preview"
                },
                  entry.length > 240 ? `${entry.slice(0, 240)}...` : entry,
                ),
              ),
              UIManager.createButton(
                `recent-delete-${index}-${entry}`,
                "latex-generator-action-btn latex-generator-delete-btn",
                "Delete",
                () => handleDelete(entry),
              ),
            ),
          ),
        ) :
        createElement(
          "div", {
          className: "latex-generator-help"
        },
          "Recent formulas will appear here after you preview or copy them.",
        ),
    );
  }
  static openRecentFormulasModal({
    recent,
    onSelect,
    onDelete
  }) {
    UI.showConfirmationModal(
      "Recent Formulas",
      createElement(UIManager.RecentFormulasContent, {
        recent,
        onSelect,
        onDelete,
      }), {
      confirmText: "Close",
      cancelText: null,
      size: "bd-modal-large",
    },
    );
  }
  static createLibraryName(latex) {
    const compact = (latex || "")
      .replace(/\s+/g, " ")
      .replace(/[{}\\]/g, "")
      .trim();
    return (compact || "Equation").slice(0, 40);
  }
  static SaveLibraryContent({
    stateRef,
    latex
  }) {
    const [name, setName] = useState(UIManager.createLibraryName(latex));
    useEffect(() => {
      stateRef.current = name;
    }, [name, stateRef]);
    return createElement(
      "div", {
      className: "latex-generator-library-save"
    },
      createElement(
        "div", {
        className: "latex-generator-library-save-header"
      },
        createElement(
          "div", {
          className: "latex-generator-library-entry-name"
        },
          "Save Current Equation",
        ),
        createElement(
          "div", {
          className: "latex-generator-library-entry-preview"
        },
          "Give this equation a clear name so it is easy to find later in your library browser.",
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-guide-intro"
      },
        "This saves the current LaTeX source into a file-backed library in this plugin's folder.",
      ),
      UIManager.createField(
        "Equation Name",
        createElement("input", {
          className: "latex-generator-hex-input",
          type: "text",
          value: name,
          maxLength: 60,
          autoFocus: true,
          onChange: (e) => setName(e.target.value),
        }),
      ),
      createElement(
        "div", {
        className: "latex-generator-guide-title"
      },
        "Equation Preview",
      ),
      createElement(
        "code", {
        className: "latex-generator-guide-code"
      },
        latex.trim() || "No LaTeX source to save.",
      ),
    );
  }
  static openSaveLibraryModal({
    latex,
    onSave
  }) {
    if (!latex.trim()) {
      this.toast("No LaTeX source to save.", TOAST_TYPES.ERROR);
      return;
    }
    const stateRef = {
      current: this.createLibraryName(latex)
    };
    let didSaveOnce = false;
    UI.showConfirmationModal(
      "Save To Library",
      createElement(UIManager.SaveLibraryContent, {
        stateRef,
        latex
      }), {
      confirmText: "Save",
      cancelText: "Cancel",
      size: "bd-modal-large",
      onConfirm: () => {
        if (didSaveOnce) {
          return;
        }
        const didSave = SettingsManager.saveLibraryEntry(stateRef.current, latex);
        if (!didSave) {
          UIManager.toast("Enter a name before saving.", TOAST_TYPES.ERROR);
          return;
        }
        didSaveOnce = true;
        onSave?.(SettingsManager.getLibraryEntries());
        UIManager.toast("Saved to library.", TOAST_TYPES.SUCCESS);
      },
    },
    );
  }
  static LibraryContent({
    entries,
    onSelect,
    onDelete,
  }) {
    const [libraryEntries, setLibraryEntries] = useState(entries);
    const handleDelete = (name) => {
      onDelete(name);
      setLibraryEntries((current) =>
        current.filter((entry) => entry.name !== name),
      );
    };
    return createElement(
      "div", {
      className: "latex-generator-recent-browser"
    },
      libraryEntries.length ?
        createElement(
          "div", {
          className: "latex-generator-recent-list"
        },
          ...libraryEntries.map((entry, index) =>
            createElement(
              "div", {
              key: `${index}-${entry.name}`,
              className: "latex-generator-recent-item",
            },
              createElement(
                "button", {
                type: "button",
                className: "latex-generator-recent-btn",
                title: `${entry.name}\n\n${entry.latex}`,
                onClick: () => onSelect(entry.latex),
              },
                createElement(
                  "div", {
                  className: "latex-generator-library-entry-name"
                },
                  entry.name,
                ),
                createElement(
                  "div", {
                  className: "latex-generator-library-entry-preview"
                },
                  entry.latex.length > 120 ?
                    `${entry.latex.slice(0, 120)}...` :
                    entry.latex,
                ),
              ),
              UIManager.createButton(
                `library-delete-${index}-${entry.name}`,
                "latex-generator-action-btn latex-generator-delete-btn",
                "Delete",
                () => handleDelete(entry.name),
              ),
            ),
          ),
        ) :
        createElement(
          "div", {
          className: "latex-generator-help"
        },
          "Your library is empty. Save a formula first, then load it from here anytime.",
        ),
    );
  }
  static openLibraryModal({
    entries,
    onSelect,
    onDelete
  }) {
    UI.showConfirmationModal(
      "Equation Library",
      createElement(UIManager.LibraryContent, {
        entries,
        onSelect,
        onDelete,
      }), {
      confirmText: "Close",
      cancelText: null,
      size: "bd-modal-large",
    },
    );
  }
  static LatexModalContent({
    stateRef
  }) {
    const savedData = SettingsManager.getSavedData();
    const autoPreview = SettingsManager.getAutoPreview();
    const savedUiSettings = SettingsManager.getUiSettings();
    const recentFormulas = SettingsManager.getRecentFormulas();
    const savedLibraryEntries = SettingsManager.getLibraryEntries();
    const initialPreviewUrl = UIManager.getPreviewUrl(
      savedData.latex,
      savedData.dpi,
      savedData.color,
    );
    const rootRef = useRef(null);
    const textareaRef = useRef(null);
    const highlightRef = useRef(null);
    const autoFormatReadyRef = useRef(false);
    const [latex, setLatex] = useState(savedData.latex);
    const [dpi, setDpi] = useState(savedData.dpi);
    const [color, setColor] = useState(savedData.color);
    const [hexInput, setHexInput] = useState(savedData.color);
    const [rgb, setRgb] = useState(() =>
      UIManager.createRgbState(savedData.color),
    );
    const [uiSettings, setUiSettings] = useState(savedUiSettings);
    const [recent, setRecent] = useState(recentFormulas);
    const [libraryEntries, setLibraryEntries] = useState(savedLibraryEntries);
    const [fetched, setFetched] = useState(
      autoPreview ? initialPreviewUrl : "",
    );
    const [previewKey, setPreviewKey] = useState(
      autoPreview && initialPreviewUrl ?
        UIManager.getPreviewKey(
          savedData.latex,
          savedData.dpi,
          savedData.color,
        ) :
        "",
    );
    const currentPreviewKey = UIManager.getPreviewKey(latex, dpi, color);
    const canPreview =
      latex.trim() !== "" && previewKey !== currentPreviewKey;
    const {
      colorMode,
      showSnippets,
      showSymbols,
      showRecent,
      autoFormatOnPause,
      syntaxCommandColor,
      syntaxBraceColor,
      syntaxNumberColor,
      syntaxOperatorColor,
      syntaxCommentColor,
    } = uiSettings;
    const syntaxHighlightStyle = {
      "--latex-token-command": SettingsManager.sanitizeHexColor(
        syntaxCommandColor,
        DEFAULT_UI_SETTINGS.syntaxCommandColor,
      ),
      "--latex-token-brace": SettingsManager.sanitizeHexColor(
        syntaxBraceColor,
        DEFAULT_UI_SETTINGS.syntaxBraceColor,
      ),
      "--latex-token-number": SettingsManager.sanitizeHexColor(
        syntaxNumberColor,
        DEFAULT_UI_SETTINGS.syntaxNumberColor,
      ),
      "--latex-token-operator": SettingsManager.sanitizeHexColor(
        syntaxOperatorColor,
        DEFAULT_UI_SETTINGS.syntaxOperatorColor,
      ),
      "--latex-token-comment": SettingsManager.sanitizeHexColor(
        syntaxCommentColor,
        DEFAULT_UI_SETTINGS.syntaxCommentColor,
      ),
    };
    useEffect(() => {
      stateRef.current = {
        latex,
        dpi,
        color,
        fetched,
        uiSettings,
      };
      const timer = setTimeout(() => {
        SettingsManager.setSetting("settings", {
          latex,
          dpi,
          color
        });
        SettingsManager.setUiSettings(uiSettings);
      }, SETTINGS_SAVE_DELAY);
      return () => clearTimeout(timer);
    }, [latex, dpi, color, fetched, uiSettings, stateRef]);
    useEffect(() => {
      return UIManager.attachModalShellClass(rootRef.current);
    }, []);
    useEffect(() => {
      if (!autoPreview) return;
      const timer = setTimeout(() => {
        const nextFetched = UIManager.getPreviewUrl(latex, dpi, color);
        setFetched(nextFetched);
        setPreviewKey(nextFetched ? currentPreviewKey : "");
      }, PREVIEW_UPDATE_DELAY);
      return () => clearTimeout(timer);
    }, [latex, dpi, color, autoPreview, currentPreviewKey]);
    useEffect(() => {
      const nextColor = ImageProcessor.rgbToHex(rgb);
      if (nextColor !== color) {
        setColor(nextColor);
      }
    }, [rgb, color]);
    useEffect(() => {
      setHexInput(color);
    }, [color]);
    useEffect(() => {
      if (!autoFormatOnPause) {
        autoFormatReadyRef.current = true;
        return;
      }
      if (!autoFormatReadyRef.current) {
        autoFormatReadyRef.current = true;
        return;
      }
      const trimmed = latex.trim();
      if (!trimmed) {
        return;
      }
      const timer = setTimeout(() => {
        const formatted = UIManager.formatLatexSource(latex);
        if (formatted && formatted !== latex) {
          setLatex(formatted);
        }
      }, 600);
      return () => clearTimeout(timer);
    }, [latex, autoFormatOnPause]);
    const handleEditorScroll = (event) => {
      if (!highlightRef.current) {
        return;
      }
      highlightRef.current.scrollTop = event.target.scrollTop;
      highlightRef.current.scrollLeft = event.target.scrollLeft;
    };
    const updateRgbChannel = (channel, value) => {
      const nextValue = ImageProcessor.clampRgb(value);
      setRgb((current) => ({
        ...current,
        [channel]: nextValue
      }));
    };
    const handleColorPicker = (value) => {
      setRgb(ImageProcessor.hexToRgb(value));
    };
    const handleHexChange = (value) => {
      setHexInput(value);
      if (HEX_COLOR_REGEX.test(value)) {
        setRgb(ImageProcessor.hexToRgb(value));
      }
    };
    const updateUiSetting = (key, value) => {
      setUiSettings((current) => ({
        ...current,
        [key]: value,
      }));
    };
    const pushRecentFormula = (value) => {
      SettingsManager.pushRecentFormula(value);
      setRecent(SettingsManager.getRecentFormulas());
    };
    const removeRecentFormula = (value) => {
      SettingsManager.removeRecentFormula(value);
      setRecent(SettingsManager.getRecentFormulas());
    };
    const removeLibraryEntry = (name) => {
      SettingsManager.removeLibraryEntry(name);
      setLibraryEntries(SettingsManager.getLibraryEntries());
    };
    const handlePreview = () => {
      if (!canPreview || autoPreview) return;
      const nextFetched = UIManager.getPreviewUrl(latex, dpi, color);
      if (!nextFetched) {
        setFetched("");
        setPreviewKey("");
      } else {
        setFetched(nextFetched);
        setPreviewKey(currentPreviewKey);
        pushRecentFormula(latex);
      }
    };
    const previewContent = fetched ?
      createElement(
        "div", {
        className: "latex-generator-preview-wrapper"
      },
        createElement("img", {
          src: fetched,
          className: "latex-generator-preview-img",
        }),
      ) :
      createElement(
        "span", {
        className: "latex-generator-preview-empty"
      },
        autoPreview ?
          "Preview will appear here as you type your LaTeX." :
          "Press Preview to render your current LaTeX expression.",
      );
    const previewSection = createElement(
      "div",
      null,
      createElement(
        "div", {
        className: "latex-generator-section-head"
      },
        createElement(
          "div", {
          className: "latex-generator-label-stack"
        },
          createElement(
            "div", {
            className: "latex-generator-section-title"
          },
            "Live Preview",
          ),
          createElement(
            "div", {
            className: "latex-generator-section-note"
          },
            autoPreview ?
              "Your formula updates automatically while you type." :
              "Generate a preview when you are ready.",
          ),
        ),
        createElement(
          "div", {
          className: "latex-generator-chip"
        },
          `${dpi} DPI`,
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-preview"
      },
        createElement(
          "div", {
          className: "latex-generator-preview-parent"
        },
          createElement(
            "div", {
            className: "latex-generator-preview-container"
          },
            previewContent,
          ),
        ),
        !autoPreview &&
        createElement(
          "div", {
          className: "latex-generator-preview-overlay"
        },
          createElement(
            Tooltip, {
            text: "Tip: You can enable auto-preview in settings"
          },
            ({
              onMouseEnter,
              onMouseLeave
            }) =>
              createElement(
                "div", {
                className: "latex-generator-preview-btn-wrapper",
                "aria-label": "Tip: You can enable auto-preview in settings",
                onMouseEnter,
                onMouseLeave,
                onClick: handlePreview,
              },
                createElement(
                  "button", {
                  type: "button",
                  className: "latex-generator-preview-btn",
                  disabled: !canPreview,
                  onClick: handlePreview,
                },
                  "Preview",
                ),
              ),
          ),
        ),
      ),
    );
    const editorColumn = createElement(
      "div", {
      className: "latex-generator-builder-main"
    },
      createElement(
        "div", {
        className: "latex-generator-editor-shell"
      },
        createElement("pre", {
          ref: highlightRef,
          "aria-hidden": true,
          className: "latex-generator-highlight",
          dangerouslySetInnerHTML: {
            __html: UIManager.highlightLatex(latex) ||
              " ",
          },
        }),
        createElement("textarea", {
          ref: textareaRef,
          className: `latex-generator-textarea${latex ? " latex-generator-textarea--mirrored" : ""}`,
          value: latex,
          placeholder: "e.g. E = mc^2 or {\\color[RGB]{255,0,0}x}+{\\color[RGB]{0,180,255}y}",
          autoFocus: true,
          spellCheck: false,
          onChange: (e) => UIManager.handleEditorInputChange(e, setLatex),
          onKeyDown: (e) =>
            UIManager.handleEditorKeyDown(e, textareaRef, setLatex),
          onScroll: handleEditorScroll,
        }),
      ),
      showSnippets &&
      UIManager.createSnippetButtons(
        LATEX_SNIPPETS,
        "latex-generator-snippets",
        textareaRef,
        setLatex,
      ),
      showSymbols &&
      UIManager.createSnippetButtons(
        SYMBOL_SNIPPETS,
        "latex-generator-symbols",
        textareaRef,
        setLatex,
      ),
    );
    const baseColorPanel = UIManager.createPanel(
      "Base Color",
      (colorMode === "rgb" || colorMode === "mixed") &&
      createElement(
        "div", {
        className: "latex-generator-rgb-grid"
      },
        UIManager.createRgbInput("r", "Red", rgb.r, updateRgbChannel),
        UIManager.createRgbInput("g", "Green", rgb.g, updateRgbChannel),
        UIManager.createRgbInput("b", "Blue", rgb.b, updateRgbChannel),
      ),
      (colorMode === "hex" || colorMode === "mixed") &&
      UIManager.createField(
        "Hex",
        createElement("input", {
          className: "latex-generator-hex-input",
          type: "text",
          value: hexInput,
          maxLength: 7,
          onChange: (e) => handleHexChange(e.target.value),
        }),
      ),
      (colorMode === "swatches" || colorMode === "mixed") &&
      createElement(
        "div", {
        className: "latex-generator-swatch-grid"
      },
        ...COLOR_SWATCHES.map((swatch) =>
          UIManager.createButton(
            swatch.hex,
            "latex-generator-swatch-btn",
            createElement("span", {
              className: "latex-generator-swatch-chip",
              style: {
                backgroundColor: swatch.hex
              },
            }),
            () => handleColorPicker(swatch.hex), {
            title: `${swatch.name} ${swatch.hex}`
          },
          ),
        ),
      ),
      UIManager.createField(
        "Picker",
        createElement("input", {
          className: "latex-generator-color-input",
          type: "color",
          value: color,
          onChange: (e) => handleColorPicker(e.target.value),
        }),
      ),
    );
    const colorToolsPanel = UIManager.createPanel(
      "Color Tools",
      createElement(
        "div", {
        className: "latex-generator-toolbar"
      },
        UIManager.createActionButton("wrap", "Wrap Selection", () =>
          UIManager.wrapSelectionWithColor(
            textareaRef,
            setLatex,
            colorMode,
            rgb,
            color,
          ),
        ),
        UIManager.createActionButton("insert", "Insert Color Block", () =>
          UIManager.insertSnippet(
            textareaRef,
            setLatex,
            UIManager.buildColorBlock(rgb),
          ),
        ),
        UIManager.createActionButton("format-source", "Format Source", () =>
          UIManager.setTextareaValue(
            textareaRef,
            UIManager.formatLatexSource(latex),
            setLatex,
          ),
        ),
        UIManager.createActionButton("clear", "Clear", () =>
          UIManager.setTextareaValue(textareaRef, "", setLatex),
        ),
        UIManager.createActionButton("copy-source", "Copy Source", () => {
          pushRecentFormula(latex);
          void UIManager.copyLatexSource(latex);
        }),
        UIManager.createActionButton("save-library", "Save To Library", () =>
          UIManager.openSaveLibraryModal({
            latex,
            onSave: setLibraryEntries,
          }),
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-help"
      },
        "Tip: choose a mode above, set the base color here, then select text",
        " in the editor and use Wrap Selection if you want only that part to",
        " get its own color. Format Source can also clean up long bracket-heavy",
        " equations.",
      ),
    );
    const dpiPanel = createElement(
      "div", {
      className: "latex-generator-inline-section latex-generator-size-section latex-generator-panel",
    },
      createElement("h1", {}, "DPI"),
      createElement(SliderInput, {
        min: DPI_RANGE.min,
        max: DPI_RANGE.max,
        value: dpi,
        onChange: (val) => setDpi(val),
        markers: DPI_MARKERS,
      }),
    );
    const recentPanel =
      showRecent &&
      UIManager.createPanel(
        "Recent Formulas",
        UIManager.createActionButton(
          "open-recent-formulas",
          recent.length ?
            `Open Recent Browser (${recent.length})` :
            "Open Recent Browser",
          () =>
            UIManager.openRecentFormulasModal({
              recent,
              onSelect: (entry) =>
                UIManager.setTextareaValue(textareaRef, entry, setLatex),
              onDelete: removeRecentFormula,
            }),
        ),
        createElement(
          "div", {
          className: "latex-generator-help"
        },
          recent.length ?
            "Open the browser to scroll, select, or delete saved formulas." :
            "Recent formulas will appear here after you preview or copy them.",
        ),
        recent.length ?
          createElement(
            "div", {
            className: "latex-generator-library-entry-preview"
          },
            recent[0].length > 160 ? `${recent[0].slice(0, 160)}...` : recent[0],
          ) :
          null,
      );
    const libraryPanel = UIManager.createPanel(
      "Equation Library",
      UIManager.createActionButton(
        "open-equation-library",
        libraryEntries.length ?
          `Open Library (${libraryEntries.length})` :
          "Open Library",
        () =>
          UIManager.openLibraryModal({
            entries: libraryEntries,
            onSelect: (entry) =>
              UIManager.setTextareaValue(textareaRef, entry, setLatex),
            onDelete: removeLibraryEntry,
          }),
      ),
      createElement(
        "div", {
        className: "latex-generator-help"
      },
        libraryEntries.length ?
          "Load named equations from your library or delete entries you no longer need." :
          "Save equations into your library from Color Tools, then open them here.",
      ),
    );
    const colorControlsColumn = createElement(
      "div", {
      className: "latex-generator-side-panel"
    },
      baseColorPanel,
      colorToolsPanel,
    );
    const toolsColumn = createElement(
      "div", {
      className: "latex-generator-tools-grid"
    },
      createElement(
        "div", {
        className: "latex-generator-tools-span"
      },
        dpiPanel,
      ),
      libraryPanel,
      recentPanel,
    );
    const editorSurface = createElement(
      "div", {
      className: "latex-generator-controls"
    },
      UIManager.createSectionMeta(
        "Equation Builder",
        "Type your LaTeX here, then preview it above or copy it when you're ready.",
        createElement(
          "div", {
          className: "latex-generator-mobile-note"
        },
          color,
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-builder-header"
      },
        UIManager.createButton(
          "guide-top",
          "latex-generator-action-btn latex-generator-guide-btn",
          "LaTeX Guide",
          () => UIManager.openGuideModal(),
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-builder-mode-row"
      },
        createElement(
          "span", {
          className: "latex-generator-inline-select-label"
        },
          "Mode",
        ),
        createElement(
          "div", {
          className: "latex-generator-mode-select-wrap"
        },
          createElement(
            "select", {
            className: "latex-generator-select",
            value: colorMode,
            onChange: (e) => updateUiSetting("colorMode", e.target.value),
          },
            ...COLOR_MODE_OPTIONS.map((option) =>
              createElement(
                "option", {
                key: option.value,
                value: option.value
              },
                option.label,
              ),
            ),
          ),
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-top-tip"
      },
        createElement("strong", {}, "Color: "),
        "pick a mode, set the base color on the right, then use ",
        createElement("strong", {}, "Wrap Selection"),
        " for part-specific color.",
      ),
      createElement(
        "div", {
        className: "latex-generator-builder-grid"
      },
        editorColumn,
        colorControlsColumn,
      ),
    );
    const toolsSection = createElement(
      "div", {
      className: "latex-generator-controls"
    },
      UIManager.createSectionMeta(
        "More Tools",
        "Adjust DPI and reuse recent formulas without crowding the main builder.",
        createElement(
          "div", {
          className: "latex-generator-mobile-note"
        },
          `${dpi} DPI`,
        ),
      ),
      createElement(
        "div", {
        className: "latex-generator-grid"
      },
        toolsColumn,
      ),
    );
    return createElement(
      "div", {
      ref: rootRef,
      className: "latex-generator-modal",
      style: syntaxHighlightStyle,
    },
      createElement(
        "div", {
        className: "latex-generator-surface latex-generator-shell-panel"
      },
        createElement(
          "div", {
          className: "latex-generator-top-grid"
        },
          editorSurface,
          previewSection,
        ),
        createElement("div", {
          className: "latex-generator-panel-divider"
        }),
        toolsSection,
      ),
    );
  }
  static ChatBarButton() {
    return createElement(
      Tooltip, {
      text: "Insert LaTeX"
    },
      ({
        onMouseEnter,
        onMouseLeave
      }) =>
        createElement(
          "div", {
          "aria-label": "Insert LaTeX",
          onMouseEnter: onMouseEnter,
          onMouseLeave: onMouseLeave,
          onClick: UIManager.handleChatBarClick,
        },
          createElement(
            "div", {
            className: `${DiscordClasses.Button.button} ${DiscordClasses.ButtonWrapper.button}`,
          },
            createElement("div", {
              className: DiscordClasses.Icon.iconContainer,
              dangerouslySetInnerHTML: {
                __html: LATEX_ICON
              },
            }),
          ),
        ),
    );
  }
  static handleChatBarClick() {
    if (SettingsManager.hasAgreedToTerms()) {
      UIManager.openGenerationModal();
    } else {
      UIManager.openTermsModal({
        onConfirm: UIManager.openGenerationModal
      });
    }
  }
  static openTermsModal({
    onConfirm,
    onCancel
  } = {}) {
    UI.showConfirmationModal(
      "API Usage Agreement",
      createElement(
        "div", {
        className: "latex-generator-terms-container"
      },
        createElement(
          "p", {},
          `By proceeding, you acknowledge that this plugin utilizes a third-party external API (`,
          createElement(
            "a", {
            href: API.URL,
            target: "_blank",
            className: "latex-generator-terms-link",
          },
            API.NAME,
          ),
          `) to render LaTeX equations.`,
        ),
        createElement(
          "p", {},
          "Please be advised that the utilization of this service is entirely at your own risk. The developer of this plugin, as well as the BetterDiscord staff, assume no liability or responsibility for any potential issues, data handling practices, or service interruptions that may arise from its use.",
        ),
        createElement(
          "p", {},
          "Do you accept these terms and wish to continue?",
        ),
      ), {
      confirmText: "I Agree",
      cancelText: "Cancel",
      onConfirm: () => {
        SettingsManager.setAgreedToTerms(true);
        if (onConfirm) onConfirm();
      },
      onCancel: () => {
        SettingsManager.setAgreedToTerms(false);
        if (onCancel) onCancel();
      },
    },
    );
  }
  static openGenerationModal() {
    const stateRef = {
      current: {
        latex: "",
        dpi: 150,
        color: "#FFFFFF",
        fetched: ""
      },
    };
    UI.showConfirmationModal(
      "Generate LaTeX Image",
      createElement(UIManager.LatexModalContent, {
        stateRef: stateRef
      }), {
      confirmText: "Copy",
      cancelText: "Cancel",
      size: "bd-modal-large",
      onConfirm: () => {
        if (!stateRef.current.latex) {
          UIManager.toast("No image to copy!", TOAST_TYPES.ERROR);
          return;
        }
        SettingsManager.pushRecentFormula(stateRef.current.latex);
        void ImageProcessor.copyToClipboard(stateRef.current);
      },
    },
    );
  }
  static SettingsModal() {
    const [renderKey, setRenderKey] = useState(0);
    const uiSettings = SettingsManager.getUiSettings();
    return createElement(
      "div", {
      key: renderKey
    },
      UI.buildSettingsPanel({
        settings: [{
          type: "switch",
          id: "agreedToTerms",
          name: "Agreed to Terms",
          note: "Whether you have agreed to the terms of service.",
          value: SettingsManager.hasAgreedToTerms(),
        },
        {
          type: "switch",
          id: "autoPreview",
          name: "Auto-Preview",
          note: "Automatically update the LaTeX preview as you type.",
          value: SettingsManager.getAutoPreview(),
        },
        {
          type: "dropdown",
          id: "colorMode",
          name: "Default Color Mode",
          note: "Choose which color editor opens by default in the LaTeX modal.",
          value: uiSettings.colorMode,
          options: COLOR_MODE_OPTIONS.map((option) => ({
            label: option.label,
            value: option.value,
          })),
        },
        {
          type: "switch",
          id: "showSnippets",
          name: "Show Snippets",
          note: "Show the quick LaTeX snippet buttons above the editor.",
          value: uiSettings.showSnippets,
        },
        {
          type: "switch",
          id: "showSymbols",
          name: "Show Symbol Palette",
          note: "Show quick-insert buttons for common math symbols.",
          value: uiSettings.showSymbols,
        },
        {
          type: "switch",
          id: "showRecent",
          name: "Show Recent Formulas",
          note: "Show a reusable history panel in the editor sidebar.",
          value: uiSettings.showRecent,
        },
        {
          type: "switch",
          id: "autoFormatOnPause",
          name: "Auto-Format On Pause",
          note: "Pretty-print the LaTeX source after about 600ms of inactivity while typing.",
          value: uiSettings.autoFormatOnPause,
        },
        {
          type: "text",
          id: "syntaxCommandColor",
          name: "Syntax Command Color",
          note: "Hex color for LaTeX commands like \\frac and \\sqrt.",
          value: uiSettings.syntaxCommandColor,
        },
        {
          type: "text",
          id: "syntaxBraceColor",
          name: "Syntax Brace Color",
          note: "Hex color for braces, brackets, and parentheses.",
          value: uiSettings.syntaxBraceColor,
        },
        {
          type: "text",
          id: "syntaxNumberColor",
          name: "Syntax Number Color",
          note: "Hex color for numeric values inside the editor.",
          value: uiSettings.syntaxNumberColor,
        },
        {
          type: "text",
          id: "syntaxOperatorColor",
          name: "Syntax Operator Color",
          note: "Hex color for operators like ^, _, +, -, and =.",
          value: uiSettings.syntaxOperatorColor,
        },
        {
          type: "text",
          id: "syntaxCommentColor",
          name: "Syntax Comment Color",
          note: "Hex color for LaTeX comments starting with %.",
          value: uiSettings.syntaxCommentColor,
        },
        ],
        onChange: (_, id, value) => {
          switch (id) {
            case "agreedToTerms":
              if (value) {
                UIManager.openTermsModal({
                  onCancel: () => setRenderKey((k) => k + 1),
                });
                break;
              }
            case "colorMode":
            case "showSnippets":
            case "showSymbols":
            case "showRecent":
            case "autoFormatOnPause":
            case "syntaxCommandColor":
            case "syntaxBraceColor":
            case "syntaxNumberColor":
            case "syntaxOperatorColor":
            case "syntaxCommentColor":
              SettingsManager.setUiSettings({
                ...SettingsManager.getUiSettings(),
                [id]: id.startsWith("syntax") ?
                  SettingsManager.sanitizeHexColor(
                    value,
                    DEFAULT_UI_SETTINGS[id],
                  ) : value,
              });
              break;
            default:
              SettingsManager.setSetting(id, value);
          }
        },
      }),
    );
  }
}

class ChatBarManager {
  // Grab the current chat bar component
  static getChatBarButtons() {
    // Modern Discord only needs this source
    return Webpack.getBySource("type", "showAllButtons", "promotionsByType")?.A ?? null;
  }

  // Patch the chat bar to insert our LaTeX button
  static patch() {
    const ChatBarButtons = this.getChatBarButtons();
    if (!ChatBarButtons) {
      UIManager.toast("Failed to find chat bar to inject the button", TOAST_TYPES.ERROR);
      return;
    }

    Patcher.after(Plugin.PATCH_ID, ChatBarButtons, "type", (_, args, res) => {
      // Only inject in valid chat bars
      if (
        args.length !== 2 ||
        args[0]?.disabled ||
        !CHAT_BAR_TYPES.includes(args[0]?.type?.analyticsName) ||
        !res?.props
      ) return;

      // Ensure children is always an array
      if (!Array.isArray(res.props.children)) {
        res.props.children = res.props.children ? [res.props.children] : [];
      }

      // Inject button only once
      if (!res.props.children.some((c) => c?.key === "latex-generator-button")) {
        res.props.children.unshift(
          createElement(UIManager.ChatBarButton, { key: "latex-generator-button" })
        );
      }
    });
  }

  // Remove all patches
  static unpatch() {
    Patcher.unpatchAll(Plugin.PATCH_ID);
  }
}

class StyleManager {
  static inject() {
    DOM.addStyle(Plugin.PATCH_ID, `${CSS}${MIRROR_CSS}`);
  }
  static remove() {
    DOM.removeStyle(Plugin.PATCH_ID);
  }
}
module.exports = class LaTeXGeneratorPlugin {
  start() {
    SettingsManager.ensureLibraryStorage();
    StyleManager.inject();
    ChatBarManager.patch();
  }
  stop() {
    StyleManager.remove();
    ChatBarManager.unpatch();
  }
  getSettingsPanel() {
    return createElement(UIManager.SettingsModal);
  }
};