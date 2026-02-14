/**
 * @name LaTeXGenerator
 * @author Avasay-Sayava
 * @authorId 812235988659077120
 * @description Adds a button to the chat bar to generate and copy LaTeX equations as images.
 * @version 1.0.0
 * @source https://github.com/Avasay-Sayava/BetterDiscordPlugins/blob/main/LaTeXGenerator/LaTeXGenerator.plugin.js
 * @updateUrl https://raw.githubusercontent.com/Avasay-Sayava/BetterDiscordPlugins/main/LaTeXGenerator/LaTeXGenerator.plugin.js
 */

module.exports = ((_) => {
  const changeLog = {};

  return !window.BDFDB_Global ||
    (!window.BDFDB_Global.loaded && !window.BDFDB_Global.started)
    ? class {
        constructor(meta) {
          for (let key in meta) this[key] = meta[key];
        }
        getName() {
          return this.name;
        }
        getAuthor() {
          return this.author;
        }
        getVersion() {
          return this.version;
        }
        getDescription() {
          return `The Library Plugin needed for ${this.name} is missing. Open the Plugin Settings to download it.\n\n${this.description}`;
        }

        downloadLibrary() {
          require("request").get(
            "https://mwittrien.github.io/BetterDiscordAddons/Library/0BDFDB.plugin.js",
            (e, r, b) => {
              if (!e && b && r.statusCode == 200)
                require("fs").writeFile(
                  require("path").join(
                    BdApi.Plugins.folder,
                    "0BDFDB.plugin.js",
                  ),
                  b,
                  (_) =>
                    BdApi.UI.showToast("Finished downloading BDFDB Library", {
                      type: "success",
                    }),
                );
              else
                BdApi.UI.alert(
                  "Error",
                  "Could not download BDFDB Library Plugin. Try again later or download it manually from GitHub: https://mwittrien.github.io/downloader/?library",
                );
            },
          );
        }

        load() {
          if (
            !window.BDFDB_Global ||
            !Array.isArray(window.BDFDB_Global.pluginQueue)
          )
            window.BDFDB_Global = Object.assign({}, window.BDFDB_Global, {
              pluginQueue: [],
            });
          if (!window.BDFDB_Global.downloadModal) {
            window.BDFDB_Global.downloadModal = true;
            BdApi.UI.showConfirmationModal(
              "Library Missing",
              `The Library Plugin needed for ${this.name} is missing. Please click "Download Now" to install it.`,
              {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onCancel: (_) => {
                  delete window.BDFDB_Global.downloadModal;
                },
                onConfirm: (_) => {
                  delete window.BDFDB_Global.downloadModal;
                  this.downloadLibrary();
                },
              },
            );
          }
          if (!window.BDFDB_Global.pluginQueue.includes(this.name))
            window.BDFDB_Global.pluginQueue.push(this.name);
        }
        start() {
          this.load();
        }
        stop() {}
        getSettingsPanel() {
          let template = document.createElement("template");
          template.innerHTML = `<div style="color: var(--header-primary); font-size: 16px; font-weight: 300; white-space: pre; line-height: 22px;">The Library Plugin needed for ${this.name} is missing.\nPlease click <a style="font-weight: 500;">Download Now</a> to install it.</div>`;
          template.content.firstElementChild
            .querySelector("a")
            .addEventListener("click", this.downloadLibrary);
          return template.content.firstElementChild;
        }
      }
    : (([Plugin, BDFDB]) => {
        const LATEX_ICON = `<svg viewBox="0 -9 9 9" width="24" height="24" fill="none" stroke="currentColor" stroke-width="0.05" xmlns="http://www.w3.org/2000/svg"><path d="M2.15193-1.111831C2.797509-2.116065 3.000747-2.881196 3.156164-3.514819C3.574595-5.164633 4.028892-6.599253 4.770112-7.424159C4.913574-7.579577 5.009215-7.687173 5.391781-7.687173C6.216687-7.687173 6.240598-6.862267 6.240598-6.694894C6.240598-6.479701 6.180822-6.312329 6.180822-6.252553C6.180822-6.168867 6.252553-6.168867 6.264508-6.168867C6.455791-6.168867 6.77858-6.300374 7.07746-6.515567C7.292653-6.682939 7.400249-6.802491 7.400249-7.292653C7.400249-7.938232 7.065504-8.428394 6.396015-8.428394C6.01345-8.428394 4.961395-8.332752 3.789788-7.149191C2.833375-6.168867 2.271482-4.016936 2.044334-3.120299C1.829141-2.295392 1.733499-1.924782 1.374844-1.207472C1.291158-1.06401 .980324-.537983 .812951-.382565C.490162-.083686 .37061 .131507 .37061 .191283C.37061 .215193 .394521 .263014 .478207 .263014C.526027 .263014 .777086 .215193 1.08792 .011955C1.291158-.107597 1.315068-.131507 1.590037-.418431C2.187796-.406476 2.606227-.298879 3.359402-.083686C3.969116 .083686 4.578829 .263014 5.188543 .263014C6.156912 .263014 7.137235-.466252 7.519801-.992279C7.758904-1.315068 7.830635-1.613948 7.830635-1.649813C7.830635-1.733499 7.758904-1.733499 7.746949-1.733499C7.555666-1.733499 7.268742-1.601993 7.065504-1.458531C6.742715-1.255293 6.718804-1.183562 6.647073-.980324C6.587298-.789041 6.515567-.6934 6.467746-.621669C6.372105-.478207 6.360149-.478207 6.180822-.478207C5.606974-.478207 5.009215-.657534 4.220174-.872727C3.88543-.968369 3.227895-1.159651 2.630137-1.159651C2.47472-1.159651 2.307347-1.147696 2.15193-1.111831Z" fill="currentColor"/></svg>`;

        const css = `
          .latex-gen-container {
            padding-top: 20px;
            padding-bottom: 20px;
            display: flex;
            flex-direction: column;
            gap: 20px;
          }

          .latex-gen-textarea {
            background-color: var(--input-background-default);
            color: var(--text-normal);
            border: 1px solid var(--input-border-default);
            border-radius: 4px;
            padding: 10px;
            font-family: monospace;
            font-size: 14px;
            height: 100px;
            width: 100%;
            resize: none;
            outline: none;
            box-sizing: border-box;
            transition: border-color 0.2s ease-in-out;
          }

          .latex-gen-textarea:focus { 
            border-color: var(--brand-experiment); 
          }

          .latex-gen-preview-container {
            background-color: var(--background-secondary-alt);
            border-radius: 8px;
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: safe center;
            padding: 20px;
            overflow-x: auto;
          }

          .latex-gen-preview-wrapper {
            position: relative;
            display: inline-block;
            line-height: 0;
          }

          .latex-gen-preview-mask {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            -webkit-mask-size: contain;
            mask-size: contain;
            -webkit-mask-repeat: no-repeat;
            mask-repeat: no-repeat;
            -webkit-mask-position: center;
            mask-position: center;
            pointer-events: none;
          }

          .latex-gen-button {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
          }

          .latex-gen-slider {
            width: 100%;
            background: transparent;
            cursor: pointer;
            accent-color: var(--brand-experiment);
            outline: none;
            margin: 10px 0;
          }`;

        return class LaTeXGenerator extends Plugin {
          onLoad() {
            this.defaults = {
              general: {
                defaultDPI: {
                  value: 150,
                  min: 50,
                  max: 300,
                  description: "Default DPI (Size)",
                },
                defaultColor: {
                  value: "#FFFFFF",
                  description: "Default Text Color",
                },
              },
            };

            this.modulePatches = {
              after: ["ChannelTextAreaButtons"],
            };
          }

          onStart() {
            BdApi.DOM.addStyle("latex-gen", css);
            BDFDB.PatchUtils.forceAllUpdates(this);
          }

          onStop() {
            BdApi.DOM.removeStyle("latex-gen");
            BDFDB.PatchUtils.forceAllUpdates(this);
          }

          getSettingsPanel(collapseStates = {}) {
            return BDFDB.PluginUtils.createSettingsPanel(this, collapseStates);
          }

          processChannelTextAreaButtons(e) {
            if (e.instance.props.disabled) return;

            e.returnvalue.props.children.unshift(
              BDFDB.ReactUtils.createElement(
                BDFDB.LibraryComponents.ChannelTextAreaButton,
                {
                  className: "latex-gen-button",
                  onClick: (_) => this.openGenerationModal(),
                  iconSVG: LATEX_ICON,
                  tooltip: { text: "LaTeX Equation" },
                },
              ),
            );
          }

          openGenerationModal() {
            let modalInstance;

            const loadedData = BDFDB.DataUtils.load(this, "lastState") || {};

            const handleSettingsChange = (newData) => {
              BDFDB.DataUtils.save(newData, this, "lastState");
            };

            BDFDB.ModalUtils.open(this, {
              size: "MEDIUM",
              header: "Generate LaTeX Image",
              subHeader: "Type your equation below",
              children: BDFDB.ReactUtils.createElement(this.EquationModal, {
                initialData: {
                  latex: loadedData.latex || "",
                  dpi: loadedData.dpi || this.settings.general.defaultDPI,
                  color: loadedData.color || this.settings.general.defaultColor,
                },
                onSettingsChange: handleSettingsChange,
                ref: (instance) => {
                  if (instance) modalInstance = instance;
                },
              }),
              buttons: [
                {
                  contents: BDFDB.LanguageUtils.LanguageStrings.COPY,
                  color: "GREEN",
                  close: true,
                  onClick: (modal) => {
                    if (modalInstance) modalInstance.handleCopy();
                  },
                },
                {
                  contents: BDFDB.LanguageUtils.LanguageStrings.CANCEL,
                  color: "RED",
                  look: "OUTLINED",
                  close: true,
                },
              ],
            });
          }

          get EquationModal() {
            return class extends BDFDB.ReactUtils.Component {
              constructor(props) {
                super(props);
                const initial = props.initialData || {};
                this.state = {
                  latex: initial.latex || "",
                  dpi: initial.dpi || 150,
                  color: initial.color || "#FFFFFF",
                  blackUrl: "",
                  loading: false,
                };
                this.updateTimer = null;
                this.saveTimer = null;
              }

              componentDidMount() {
                if (this.state.latex) this.updateUrl();
              }

              componentWillUnmount() {
                if (this.updateTimer) BDFDB.TimeUtils.clear(this.updateTimer);
                if (this.saveTimer) BDFDB.TimeUtils.clear(this.saveTimer);
              }

              saveData() {
                if (this.saveTimer) BDFDB.TimeUtils.clear(this.saveTimer);
                this.saveTimer = BDFDB.TimeUtils.timeout(() => {
                  if (this.props.onSettingsChange) {
                    this.props.onSettingsChange({
                      latex: this.state.latex,
                      color: this.state.color,
                      dpi: this.state.dpi,
                    });
                  }
                }, 0);
              }

              updateUrl() {
                if (!this.state.latex.trim()) {
                  this.setState({ blackUrl: "" });
                  return;
                }
                const payload = `\\dpi{${this.state.dpi}} \\color{black} ${this.state.latex}`;
                const url = `https://latex.codecogs.com/png.latex?${encodeURIComponent(payload)}`;
                this.setState({ blackUrl: url });
              }

              handleInput(value) {
                if (this.updateTimer) BDFDB.TimeUtils.clear(this.updateTimer);
                this.setState({ latex: value }, () => {
                  this.saveData();
                  this.updateTimer = BDFDB.TimeUtils.timeout(() => {
                    this.updateUrl();
                  }, 500);
                });
              }

              async handleCopy() {
                if (this.props.onSettingsChange) {
                  this.props.onSettingsChange({
                    latex: this.state.latex,
                    color: this.state.color,
                    dpi: this.state.dpi,
                  });
                }

                if (!this.state.latex || !this.state.blackUrl) return;

                try {
                  const img = new Image();
                  img.crossOrigin = "Anonymous";
                  img.src = this.state.blackUrl;

                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");

                    ctx.drawImage(img, 0, 0);

                    const imageData = ctx.getImageData(
                      0,
                      0,
                      canvas.width,
                      canvas.height,
                    );
                    const data = imageData.data;
                    const [r, g, b, a] = this.state.color;

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
                      try {
                        navigator.clipboard.write([
                          new ClipboardItem({ "image/png": blob }),
                        ]);
                        BDFDB.NotificationUtils.toast("Image copied!", {
                          type: "success",
                        });

                        if (this.props.close) this.props.close();
                      } catch (e) {
                        console.error(e);
                        BDFDB.NotificationUtils.toast("Clipboard Error", {
                          type: "error",
                        });
                      }
                    }, "image/png");
                  };

                  img.onerror = () => {
                    BDFDB.NotificationUtils.toast("Failed to load image", {
                      type: "error",
                    });
                  };
                } catch (err) {
                  BDFDB.NotificationUtils.toast("Error processing image", {
                    type: "error",
                  });
                }
              }

              render() {
                return BDFDB.ReactUtils.createElement("div", {
                  className: "latex-gen-container",
                  children: [
                    BDFDB.ReactUtils.createElement(
                      BDFDB.LibraryComponents.FormItem,
                      {
                        title: "LaTeX Input",
                        children: BDFDB.ReactUtils.createElement("textarea", {
                          value: this.state.latex,
                          placeholder: "e.g. E = mc^2",
                          className: "latex-gen-textarea",
                          autoFocus: true,
                          onChange: (e) => this.handleInput(e.target.value),
                        }),
                      },
                    ),

                    BDFDB.ReactUtils.createElement(
                      BDFDB.LibraryComponents.FormItem,
                      {
                        title: "Preview",
                        children: BDFDB.ReactUtils.createElement("div", {
                          className: `${BDFDB.disCN.cardprimary} latex-gen-preview-container`,
                          children: this.state.blackUrl
                            ? BDFDB.ReactUtils.createElement("div", {
                                className: "latex-gen-preview-wrapper",
                                children: [
                                  BDFDB.ReactUtils.createElement("img", {
                                    src: this.state.blackUrl,
                                    style: { opacity: 0, display: "block" },
                                  }),
                                  BDFDB.ReactUtils.createElement("div", {
                                    className: "latex-gen-preview-mask",
                                    style: {
                                      backgroundColor: BDFDB.ColorUtils.convert(
                                        this.state.color,
                                        "RGBA",
                                      ),
                                      WebkitMaskImage: `url("${this.state.blackUrl}")`,
                                      maskImage: `url("${this.state.blackUrl}")`,
                                    },
                                  }),
                                ],
                              })
                            : BDFDB.ReactUtils.createElement(
                                BDFDB.LibraryComponents.TextElement,
                                {
                                  color:
                                    BDFDB.LibraryComponents.TextElement.Colors
                                      .MUTED,
                                  children: "Preview will appear here...",
                                },
                              ),
                        }),
                      },
                    ),

                    BDFDB.ReactUtils.createElement(
                      BDFDB.LibraryComponents.Flex.Child,
                      {
                        children: BDFDB.ReactUtils.createElement(
                          BDFDB.LibraryComponents.FormItem,
                          {
                            title: `Size (${Math.round(this.state.dpi)} DPI)`,
                            children: BDFDB.ReactUtils.createElement("input", {
                              type: "range",
                              min: "50",
                              max: "300",
                              step: "10",
                              value: this.state.dpi,
                              className: "latex-gen-slider",
                              onChange: (e) => {
                                this.setState(
                                  { dpi: parseInt(e.target.value) },
                                  () => {
                                    this.saveData();
                                    this.updateUrl();
                                  },
                                );
                              },
                            }),
                          },
                        ),
                      },
                    ),

                    BDFDB.ReactUtils.createElement(
                      BDFDB.LibraryComponents.Flex.Child,
                      {
                        children: BDFDB.ReactUtils.createElement(
                          BDFDB.LibraryComponents.FormItem,
                          {
                            title: "Color",
                            children: BDFDB.ReactUtils.createElement(
                              BDFDB.LibraryComponents.ColorSwatches,
                              {
                                color: this.state.color,
                                onColorChange: (c) => {
                                  this.setState({ color: c }, () =>
                                    this.saveData(),
                                  );
                                },
                              },
                            ),
                          },
                        ),
                      },
                    ),
                  ],
                });
              }
            };
          }
        };
      })(window.BDFDB_Global.PluginUtils.buildPlugin(changeLog));
})();
