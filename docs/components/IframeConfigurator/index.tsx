import * as React from "react";
import {
  type EmbedConfigSchemaInputType,
  EmbedConfigSupportedFont,
} from "@ecp.eth/sdk/embed";
import { useDebounce } from "use-debounce";
import { type Hex } from "@ecp.eth/sdk/core";
import {
  DEFAULT_CONFIG,
  COLOR_FIELDS,
  FONT_SIZE_FIELDS,
  OTHER_FIELDS,
} from "./constants";
import LabelWithHelp from "./LabelWithHelp";
import { publicEnv } from "../../publicEnv";
import CommentsEmbedPreview from "./CommentsEmbedPreview";
import GeneratedURL from "./GeneratedURL";

export default function IframeConfigurator() {
  const [mode, setMode] = React.useState<"post" | "author">("post");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [autoHeightAdjustment, setAutoHeightAdjustment] = React.useState(true);
  const [uri, setUri] = React.useState(
    "https://docs.ethcomments.xyz/integration-options/embed-comments",
  );
  const [author, setAuthor] = React.useState<Hex>(
    "0x0000000000000000000000000000000000000000",
  );
  const [embedUri, setEmbedUri] = React.useState(
    mode === "post"
      ? publicEnv.VITE_ECP_ETH_EMBED_URL
      : publicEnv.VITE_ECP_ETH_EMBED_BY_AUTHOR_URL,
  );
  const [config, setConfig] =
    React.useState<EmbedConfigSchemaInputType>(DEFAULT_CONFIG);
  const [debouncedConfig] = useDebounce(config, 500);

  // Update embedUri when mode changes
  React.useEffect(() => {
    setEmbedUri(
      mode === "post"
        ? publicEnv.VITE_ECP_ETH_EMBED_URL
        : publicEnv.VITE_ECP_ETH_EMBED_BY_AUTHOR_URL,
    );
  }, [mode]);

  const updateThemeColor = (
    mode: "light" | "dark",
    key: (typeof COLOR_FIELDS)[number]["key"],
    value: string,
  ) => {
    setConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        colors: {
          ...prev.theme?.colors,
          [mode]: {
            ...prev.theme?.colors?.[mode],
            [key]: value,
          },
        },
      },
    }));
  };

  const updateFontFamily = (type: "system" | "google", value: string) => {
    setConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        font: {
          ...prev.theme?.font,
          fontFamily: {
            [type]: value,
          },
        },
      },
    }));
  };

  const updateFontSize = (
    key: (typeof FONT_SIZE_FIELDS)[number]["key"],
    property: "size" | "lineHeight",
    value: string,
  ) => {
    setConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        font: {
          ...prev.theme?.font,
          sizes: {
            ...prev.theme?.font?.sizes,
            [key]: {
              ...prev.theme?.font?.sizes?.[key],
              [property]: value,
            },
          },
        },
      },
    }));
  };

  const updateOther = (
    key: (typeof OTHER_FIELDS)[number]["key"],
    value: string,
  ) => {
    setConfig((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        other: {
          ...prev.theme?.other,
          [key]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-8 border border-input-border rounded-iframe-configurator-section p-4">
      <div className="space-y-6">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            htmlFor="mode-select"
          >
            Mode
          </label>
          <select
            id="mode-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as "post" | "author")}
            className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
          >
            <option value="post">Show comments by web page</option>
            <option value="author">Show all comments by an author</option>
          </select>
        </div>

        {mode === "post" ? (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="target-uri-input"
            >
              Web page for unique comments url
            </label>
            <input
              id="target-uri-input"
              type="text"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
              placeholder="https://example.com"
            />
          </div>
        ) : (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="author-input"
            >
              Author Address
            </label>
            <input
              id="author-input"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value as Hex)}
              className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
              placeholder="0x..."
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-2 text-left border rounded border-input-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-2"
        >
          <span className="font-medium">
            {showAdvanced ? "Hide" : "Show"} Advanced theming options
          </span>
          <span className="text-sm text-muted-foreground ml-auto"></span>
        </button>

        {showAdvanced && (
          <>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="theme-mode-select"
              >
                Theme Mode
              </label>
              <select
                id="theme-mode-select"
                value={config.theme?.mode}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      mode: e.target.value as "light" | "dark",
                    },
                  }))
                }
                className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
              >
                <option>Auto</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="auto-height-adjust-select"
              >
                Auto Height Adjustment
              </label>
              <select
                id="auto-height-adjust-select"
                value={autoHeightAdjustment ? "enabled" : "disabled"}
                onChange={(e) =>
                  setAutoHeightAdjustment(e.target.value === "enabled")
                }
                className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="disable-promotion-select"
              >
                Hide "Powered by ECP" link
              </label>
              <select
                id="disable-promotion-select"
                value={config.disablePromotion ? "1" : "0"}
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    disablePromotion: e.target.value === "1",
                  }));
                }}
                className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
              >
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="maximum-container-width-select"
              >
                Maximum container width
              </label>
              <select
                id="maximum-container-width-select"
                value={
                  config.restrictMaximumContainerWidth
                    ? "restricted"
                    : "unrestricted"
                }
                onChange={(e) => {
                  setConfig((prev) => ({
                    ...prev,
                    restrictMaximumContainerWidth:
                      e.target.value === "restricted",
                  }));
                }}
                className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
              >
                <option value="restricted">Restricted (672px)</option>
                <option value="unrestricted">
                  Unrestricted (taking up all available horizontal space)
                </option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-md font-medium">Light Theme Colors</h3>
                {COLOR_FIELDS.map(({ key, label, help }) => (
                  <div className="flex gap-2 items-center" key={`light-${key}`}>
                    <input
                      id={`light-${key}-input`}
                      type="color"
                      value={config.theme?.colors?.light?.[key] || "#ffffff"}
                      onChange={(e) =>
                        updateThemeColor("light", key, e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer"
                    />
                    <LabelWithHelp
                      label={label}
                      help={help}
                      htmlFor={`light-${key}-input`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-md font-medium">Dark Theme Colors</h3>
                {COLOR_FIELDS.map(({ key, label, help }) => (
                  <div className="flex gap-2 items-center" key={`dark-${key}`}>
                    <input
                      id={`dark-${key}-input`}
                      type="color"
                      value={config.theme?.colors?.dark?.[key] || "#000000"}
                      onChange={(e) =>
                        updateThemeColor("dark", key, e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer"
                    />
                    <LabelWithHelp
                      label={label}
                      help={help}
                      htmlFor={`dark-${key}-input`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-md font-medium">Font Settings</h3>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  htmlFor="font-family-type-select"
                >
                  Font Family Type
                </label>
                <select
                  id="font-family-type-select"
                  value={
                    !!config.theme?.font?.fontFamily &&
                    "google" in config.theme?.font?.fontFamily
                      ? "google"
                      : "system"
                  }
                  onChange={(e) => {
                    const type = e.target.value as "system" | "google";

                    updateFontFamily(
                      type,
                      type === "system"
                        ? "Geist, Arial, Helvetica, sans-serif"
                        : "",
                    );
                  }}
                  className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
                >
                  <option value="system">System Font</option>
                  <option value="google">Google Font</option>
                </select>
              </div>

              {!!config.theme?.font?.fontFamily &&
                "google" in config.theme?.font?.fontFamily && (
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      htmlFor="google-font-input"
                    >
                      Google Font
                    </label>
                    <select
                      id="google-font-input"
                      value={config.theme.font.fontFamily.google}
                      onChange={(e) =>
                        updateFontFamily("google", e.target.value)
                      }
                      className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
                    >
                      <option value="">Select a font</option>
                      {Object.values(EmbedConfigSupportedFont.enum).map(
                        (font) => (
                          <option key={font} value={font}>
                            {font}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}

              {!!config.theme?.font?.fontFamily &&
                "system" in config.theme?.font?.fontFamily && (
                  <div>
                    <label
                      className="block text-sm font-medium mb-2"
                      htmlFor="system-font-input"
                    >
                      System Font
                    </label>
                    <input
                      id="system-font-input"
                      type="text"
                      value={config.theme?.font?.fontFamily?.system || ""}
                      onChange={(e) =>
                        updateFontFamily("system", e.target.value)
                      }
                      className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
                      placeholder="Geist, Arial, Helvetica, sans-serif"
                    />
                  </div>
                )}

              <div className="flex flex-col gap-4">
                <h4 className="text-md font-medium">Font Sizes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {FONT_SIZE_FIELDS.map(({ key, label, help }) => (
                    <div key={key} className="space-y-2">
                      <LabelWithHelp
                        label={label}
                        help={help}
                        htmlFor={`${key}-size-input`}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            className="block text-xs text-gray-500"
                            htmlFor={`${key}-size-input`}
                          >
                            Size
                          </label>
                          <input
                            id={`${key}-size-input`}
                            type="text"
                            value={config.theme?.font?.sizes?.[key]?.size || ""}
                            onChange={(e) =>
                              updateFontSize(key, "size", e.target.value)
                            }
                            className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
                            placeholder="1rem"
                          />
                        </div>
                        <div>
                          <label
                            className="block text-xs text-gray-500"
                            htmlFor={`${key}-line-height-input`}
                          >
                            Line Height
                          </label>
                          <input
                            id={`${key}-line-height-input`}
                            type="text"
                            value={
                              config.theme?.font?.sizes?.[key]?.lineHeight || ""
                            }
                            onChange={(e) =>
                              updateFontSize(key, "lineHeight", e.target.value)
                            }
                            className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
                            placeholder="1.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="text-md font-medium">Other Settings</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {OTHER_FIELDS.map(({ key, label, help }) => (
                  <div key={key}>
                    <LabelWithHelp
                      label={label}
                      help={help}
                      htmlFor={`${key}-input`}
                    />
                    <input
                      id={`${key}-input`}
                      type="text"
                      value={config.theme?.other?.[key] || ""}
                      onChange={(e) => updateOther(key, e.target.value)}
                      className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
                      placeholder="0.5rem"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="target-embed-uri-input"
              >
                Override the iframe Embed URI
              </label>
              <input
                id="target-embed-uri-input"
                type="text"
                value={embedUri}
                onChange={(e) => setEmbedUri(e.target.value)}
                className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
                placeholder={
                  mode === "post"
                    ? "https://embed.ethcomments.xyz"
                    : "https://embed.ethcomments.xyz/by-author"
                }
              />
            </div>
          </>
        )}
      </div>

      <>
        <div className="flex flex-col gap-2">
          <h3 className="text-md font-medium">iframe embed code</h3>
          <p>
            Copy and paste this into your website or blog, or anywhere HTML is
            supported
          </p>
          <GeneratedURL
            config={debouncedConfig}
            embedUri={embedUri}
            source={mode === "post" ? { targetUri: uri } : { author }}
            autoHeightAdjustment={autoHeightAdjustment}
          />
        </div>

        <div className="border border-iframe-configurator-section-border rounded-iframe-configurator-section p-4">
          <h3 className="text-md font-medium !mb-4">Preview</h3>
          <CommentsEmbedPreview
            embedUri={embedUri}
            source={mode === "post" ? { targetUri: uri } : { author }}
            config={debouncedConfig}
          />
        </div>
      </>
    </div>
  );
}
