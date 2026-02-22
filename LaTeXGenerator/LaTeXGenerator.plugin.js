/**
 * @name LaTeX Generator
 * @author Avasay-Sayava
 * @authorId 812235988659077120
 * @description Adds a button to the chat bar to generate and copy LaTeX equations as images.
 * @version 2.1.0
 * @source https://github.com/Avasay-Sayava/BetterDiscordPlugins/blob/main/LaTeXGenerator/LaTeXGenerator.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Avasay-Sayava/BetterDiscordPlugins/main/LaTeXGenerator/LaTeXGenerator.plugin.js
 */

const { React, Components, Webpack, Data, UI, DOM, Patcher } = BdApi;
const { useState, useEffect, createElement } = React;
const { Tooltip, ColorInput, SliderInput } = Components;

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
};

const CHAT_BAR_TYPES = ["normal", "sidebar"];

const DEFAULT_SETTINGS = {
  latex: "",
  dpi: 150,
  color: "#FFFFFF",
};

const DEFAULT_COLORS = [
  0x52e91e, 0x2ecc71, 0x1abc9c, 0x3498db, 0x3454db, 0x861ee9, 0x9b59b6,
  0xe91e63, 0xe9411e, 0xe74c3c, 0xe67e22, 0xf1c40f, 0xc7cccd, 0x708088,
  0x636363, 0x3bad14, 0x1f8b4c, 0x11806a, 0x206694, 0x203994, 0x6d14ad,
  0x71368a, 0xad1457, 0xad2014, 0x992d22, 0xa84300, 0xc27c0e, 0x979c9f,
  0x5d686d, 0x2c2c2c,
];

const LATEX_ICON = `<!--html-->
<svg viewBox="0 -9 9 9" width="24" height="24" fill="none" stroke="currentColor" stroke-width="0.05" xmlns="http://www.w3.org/2000/svg">
  <path d="M2.15193-1.111831C2.797509-2.116065 3.000747-2.881196 3.156164-3.514819C3.574595-5.164633 4.028892-6.599253 4.770112-7.424159C4.913574-7.579577 5.009215-7.687173 5.391781-7.687173C6.216687-7.687173 6.240598-6.862267 6.240598-6.694894C6.240598-6.479701 6.180822-6.312329 6.180822-6.252553C6.180822-6.168867 6.252553-6.168867 6.264508-6.168867C6.455791-6.168867 6.77858-6.300374 7.07746-6.515567C7.292653-6.682939 7.400249-6.802491 7.400249-7.292653C7.400249-7.938232 7.065504-8.428394 6.396015-8.428394C6.01345-8.428394 4.961395-8.332752 3.789788-7.149191C2.833375-6.168867 2.271482-4.016936 2.044334-3.120299C1.829141-2.295392 1.733499-1.924782 1.374844-1.207472C1.291158-1.06401 .980324-.537983 .812951-.382565C.490162-.083686 .37061 .131507 .37061 .191283C.37061 .215193 .394521 .263014 .478207 .263014C.526027 .263014 .777086 .215193 1.08792 .011955C1.291158-.107597 1.315068-.131507 1.590037-.418431C2.187796-.406476 2.606227-.298879 3.359402-.083686C3.969116 .083686 4.578829 .263014 5.188543 .263014C6.156912 .263014 7.137235-.466252 7.519801-.992279C7.758904-1.315068 7.830635-1.613948 7.830635-1.649813C7.830635-1.733499 7.758904-1.733499 7.746949-1.733499C7.555666-1.733499 7.268742-1.601993 7.065504-1.458531C6.742715-1.255293 6.718804-1.183562 6.647073-.980324C6.587298-.789041 6.515567-.6934 6.467746-.621669C6.372105-.478207 6.360149-.478207 6.180822-.478207C5.606974-.478207 5.009215-.657534 4.220174-.872727C3.88543-.968369 3.227895-1.159651 2.630137-1.159651C2.47472-1.159651 2.307347-1.147696 2.15193-1.111831Z" fill="currentColor"/>
</svg>
<!--!html-->`;

const CSS = `/*css*/
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

.latex-generator-preview {
  display: flex;
  position: relative;
  min-height: 120px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--input-border-default);
  border-radius: 8px;
  margin-bottom: 20px;
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
  margin: 20px auto;
  flex-shrink: 0;
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
  width: 455px;
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

.latex-generator-preview-wrapper {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.latex-generator-preview-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-position: center;
  mask-position: center;
}

.latex-generator-controls {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.latex-generator-textarea {
  background-color: var(--input-background-default);
  color: var(--text-normal);
  border: 1px solid var(--input-border-default);
  border-radius: 8px 8px 0 8px;
  padding: 10px;
  font-family: monospace;
  font-size: 14px;
  height: 100px;
  width: 100%;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms linear;
}

.latex-generator-textarea:focus { 
  border-color: var(--bd-brand-active);
}

.latex-generator-textarea:hover:not(:focus) {
  border-color: var(--bd-brand-hover);
}

.latex-generator-modal .bd-slider-wrap:hover > .bd-slider-track {
  background-image: linear-gradient(var(--bd-brand-hover),var(--bd-brand-hover));
}

.latex-generator-modal .bd-slider-input:active ~ .bd-slider-track {
  background-image: linear-gradient(var(--bd-brand-active),var(--bd-brand-active));
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
  background-color: var(--bd-brand);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.latex-generator-preview-btn:hover:not(:disabled) {
  background-color: var(--bd-brand-hover);
}

.latex-generator-preview-btn:active:not(:disabled) {
  background-color: var(--bd-brand-active);
}

.latex-generator-preview-btn:disabled {
  background-color: var(--input-border-default);
  color: var(--text-muted);
  cursor: not-allowed;
}
/*!css*/`;

class SettingsManager {
  static getSetting(key, fallback) {
    return Data.load(Plugin.KEY, key) ?? fallback;
  }

  static setSetting(key, value) {
    Data.save(Plugin.KEY, key, value);
  }

  static getSavedData() {
    return this.getSetting("settings", DEFAULT_SETTINGS);
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
  static generateApiRequest(latex, dpi) {
    const payload = `\\dpi{${dpi}} \\color{black} ${latex}`;
    return `${API.URL}png.latex?${encodeURIComponent(payload)}`;
  }

  static hexToRgba(hex) {
    if (/^#[A-Fa-f0-9]{6}$/.test(hex)) {
      let c = Number.parseInt(hex.substring(1), 16);
      return [(c >> 16) & 255, (c >> 8) & 255, c & 255, 1];
    }
    return [255, 255, 255, 1];
  }

  static copyToClipboard(state) {
    const { latex, color, fetched } = state;
    if (!latex || !fetched) return;

    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = fetched;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const [r, g, b, a] = this.hexToRgba(color);

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] > 0) {
            data[i] = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = data[i + 3] * a;
          }
        }

        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob((blob) => {
          navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          UIManager.toast("Image copied!", TOAST_TYPES.SUCCESS);
        }, "image/png");
      };
    } catch (err) {
      console.error(err);
      UIManager.toast("Failed to process image.", TOAST_TYPES.ERROR);
    }
  }
}

class UIManager {
  static toast(message, type = TOAST_TYPES.INFO) {
    UI.showToast(`${Plugin.NAME}: ${message}`, { type });
  }

  static LatexModalContent({ stateRef }) {
    const savedData = SettingsManager.getSavedData();
    const autoPreview = SettingsManager.getAutoPreview();

    const [latex, setLatex] = useState(savedData.latex);
    const [dpi, setDpi] = useState(savedData.dpi);
    const [color, setColor] = useState(savedData.color);

    const [previewLatex, setPreviewLatex] = useState(
      autoPreview ? savedData.latex : "",
    );
    const [previewDpi, setPreviewDpi] = useState(
      autoPreview ? savedData.dpi : dpi,
    );
    const [fetched, setFetched] = useState(
      autoPreview && savedData.latex.trim()
        ? ImageProcessor.generateApiRequest(savedData.latex, savedData.dpi)
        : "",
    );

    const canPreview = previewLatex !== latex || previewDpi !== dpi;

    useEffect(() => {
      stateRef.current = {
        latex: autoPreview ? latex : previewLatex,
        dpi: autoPreview ? dpi : previewDpi,
        color,
        fetched,
      };

      const timer = setTimeout(() => {
        SettingsManager.setSetting("settings", { latex, dpi, color });
      }, 500);
      return () => clearTimeout(timer);
    }, [
      latex,
      dpi,
      color,
      fetched,
      previewLatex,
      previewDpi,
      autoPreview,
      stateRef,
    ]);

    useEffect(() => {
      if (!autoPreview) return;
      const timer = setTimeout(() => {
        if (latex.trim() === "") {
          setFetched("");
        } else {
          setFetched(ImageProcessor.generateApiRequest(latex, dpi));
        }
      }, 500);
      return () => clearTimeout(timer);
    }, [latex, dpi, autoPreview]);

    const handlePreview = () => {
      if (!canPreview || autoPreview) return;
      setPreviewLatex(latex);
      setPreviewDpi(dpi);

      if (latex.trim() === "") {
        setFetched("");
      } else {
        setFetched(ImageProcessor.generateApiRequest(latex, dpi));
      }
    };

    return createElement(
      "div",
      { className: "latex-generator-modal" },

      createElement(
        "div",
        { className: "latex-generator-preview" },
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
                    style: { opacity: 0, display: "block" },
                  }),
                  createElement("div", {
                    className: "latex-generator-preview-mask",
                    style: {
                      backgroundColor: color,
                      WebkitMaskImage: `url("${fetched}")`,
                      maskImage: `url("${fetched}")`,
                    },
                  }),
                )
              : createElement(
                  "span",
                  { style: { color: "var(--text-muted)", display: "block" } },
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
                    onClick: handlePreview,
                  },
                  createElement(
                    "button",
                    {
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

      createElement(
        "div",
        { className: "latex-generator-controls" },

        createElement(
          "div",
          {},
          createElement("textarea", {
            className: "latex-generator-textarea",
            value: latex,
            placeholder: "e.g. E = mc^2",
            autoFocus: true,
            onChange: (e) => setLatex(e.target.value),
          }),
        ),

        createElement(
          "div",
          {
            className:
              "latex-generator-inline-section latex-generator-size-section",
          },
          createElement("h1", {}, "Size"),
          createElement(SliderInput, {
            min: 50,
            max: 300,
            value: dpi,
            onChange: (val) => setDpi(val),
            markers: [50, 100, 150, 200, 250, 300],
          }),
        ),

        createElement(
          "div",
          { className: "latex-generator-inline-section" },
          createElement("h1", {}, "Color"),
          createElement(ColorInput, {
            value: color,
            colors: DEFAULT_COLORS,
            onChange: (val) => setColor(val),
          }),
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
            onClick: UIManager.handleChatBarClick,
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
    console.log(
      `[${Plugin.NAME}] terms agreement: ${SettingsManager.hasAgreedToTerms()}`,
    );

    if (SettingsManager.hasAgreedToTerms()) {
      UIManager.openGenerationModal();
    } else {
      UIManager.openTermsModal();
    }
  }

  static openTermsModal(openGeneration = true) {
    UI.showConfirmationModal(
      "API Usage Agreement",
      createElement(
        "div",
        { style: { color: "var(--text-normal)" } },
        createElement("p", {
          style: { marginBottom: "10px" },
          dangerouslySetInnerHTML: {
            __html: `By proceeding, you acknowledge that this plugin utilizes a third-party external API (<a href="${API.URL}" target="_blank">${API.NAME}</a>) to render LaTeX equations.`,
          },
        }),
        createElement(
          "p",
          { style: { marginBottom: "10px" } },
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
          SettingsManager.setAgreedToTerms(true);
          if (openGeneration) UIManager.openGenerationModal();
        },
      },
    );
  }

  static openGenerationModal() {
    const stateRef = {
      current: { latex: "", dpi: 150, color: "#FFFFFF", fetched: "" },
    };

    UI.showConfirmationModal(
      "Generate LaTeX Image",
      createElement(UIManager.LatexModalContent, { stateRef: stateRef }),
      {
        confirmText: "Copy",
        cancelText: "Cancel",
        size: "bd-modal-medium",
        onConfirm: () => {
          if (!stateRef.current.latex) {
            UIManager.toast("No image to copy!", TOAST_TYPES.ERROR);
            return;
          }
          ImageProcessor.copyToClipboard(stateRef.current);
        },
      },
    );
  }

  static buildSettingsPanel() {
    return UI.buildSettingsPanel({
      settings: [
        {
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
      ],
      onChange: (_, id, value) => {
        switch (id) {
          case "agreedToTerms":
            if (value) {
              UIManager.openTermsModal(false);
              break;
            }
          default:
            SettingsManager.setSetting(id, value);
        }
      },
    });
  }
}

class ChatBarManager {
  static patch() {
    const ChatBarButtons = Webpack.getBySource(
      "type",
      "showAllButtons",
      "paymentsBlocked",
    )?.A;

    if (!ChatBarButtons) {
      UIManager.toast(
        "Failed to find chat bar to inject the button",
        TOAST_TYPES.ERROR,
      );
      return;
    }

    Patcher.after(Plugin.PATCH_ID, ChatBarButtons, "type", (_, args, res) => {
      if (
        args.length !== 2 ||
        args[0]?.disabled ||
        !CHAT_BAR_TYPES.includes(args[0]?.type?.analyticsName) ||
        !Array.isArray(res?.props?.children)
      ) {
        return;
      }

      res.props.children.unshift(
        createElement(UIManager.ChatBarButton, {
          key: "latex-generator-button",
        }),
      );
    });
  }

  static unpatch() {
    Patcher.unpatchAll(Plugin.PATCH_ID);
  }
}

module.exports = class LaTeXGeneratorPlugin {
  start() {
    DOM.addStyle(Plugin.PATCH_ID, CSS);
    ChatBarManager.patch();
  }

  stop() {
    DOM.removeStyle(Plugin.PATCH_ID);
    ChatBarManager.unpatch();
  }

  getSettingsPanel() {
    return UIManager.buildSettingsPanel();
  }
};
