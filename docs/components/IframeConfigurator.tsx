import * as React from "react";
import { CommentsEmbed, createCommentsEmbedURL } from "@ecp.eth/sdk/react";
import { useDebounce } from "use-debounce";
import {
  type EmbedConfigSchemaType,
  EmbedConfigSupportedFont,
} from "@ecp.eth/sdk/schemas";
import { publicEnv } from "../publicEnv";
import { Info } from "lucide-react";

const DEFAULT_CONFIG: EmbedConfigSchemaType = {
  theme: {
    colors: {
      light: {
        background: "#ffffff",
        foreground: "#0a0a0a",
        "account-edit-link": "#3b82f6",
        primary: "#171717",
        "primary-foreground": "#fafafa",
        secondary: "#f5f5f5",
        "secondary-foreground": "#171717",
        destructive: "#ef4444",
        "destructive-foreground": "#fafafa",
        "muted-foreground": "#737373",
        ring: "#0a0a0a",
        border: "#e5e5e5",
        "border-focus": "#0a0a0a",
      },
      dark: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        "account-edit-link": "#3b82f6",
        primary: "#fafafa",
        "primary-foreground": "#171717",
        secondary: "#262626",
        "secondary-foreground": "#fafafa",
        destructive: "#ef4444",
        "destructive-foreground": "#fafafa",
        "muted-foreground": "#a3a3a3",
        ring: "#d4d4d4",
        border: "#262626",
        "border-focus": "#d4d4d4",
      },
    },
    font: {
      fontFamily: {
        system: "Geist, Arial, Helvetica, sans-serif",
      },
      sizes: {
        base: {
          size: "1rem",
          lineHeight: "1.5",
        },
        "error-screen-title": {
          size: "1.5rem",
          lineHeight: "1.2",
        },
        "empty-screen-title": {
          size: "1.5rem",
          lineHeight: "1.2",
        },
        headline: {
          size: "1.25rem",
          lineHeight: "1.2",
        },
        xs: {
          size: "0.75rem",
          lineHeight: "1",
        },
        sm: {
          size: "0.875rem",
          lineHeight: "1.25",
        },
      },
    },
    other: {
      radius: "0.5rem",
      "root-padding-vertical": "0",
      "root-padding-horizontal": "0",
    },
  },
};

const COLOR_FIELDS = [
  {
    key: "background",
    label: "Background",
    help: "The main background color of the comments section",
  },
  {
    key: "foreground",
    label: "Foreground",
    help: "The main text color used throughout the comments section",
  },
  {
    key: "account-edit-link",
    label: "Account Edit Link",
    help: "Color of the link to edit account settings",
  },
  {
    key: "primary",
    label: "Primary",
    help: "The primary color used for main actions and important elements",
  },
  {
    key: "primary-foreground",
    label: "Primary Foreground",
    help: "Text color used on primary colored elements",
  },
  {
    key: "secondary",
    label: "Secondary",
    help: "The secondary color used for less prominent elements",
  },
  {
    key: "secondary-foreground",
    label: "Secondary Foreground",
    help: "Text color used on secondary colored elements",
  },
  {
    key: "destructive",
    label: "Destructive",
    help: "Color used for destructive actions like delete",
  },
  {
    key: "destructive-foreground",
    label: "Destructive Foreground",
    help: "Text color used on destructive elements",
  },
  {
    key: "muted-foreground",
    label: "Muted Foreground",
    help: "Color used for less prominent text",
  },
  {
    key: "ring",
    label: "Ring",
    help: "Color of the focus ring around interactive elements",
  },
  { key: "border", label: "Border", help: "Color of borders between elements" },
  {
    key: "border-focus",
    label: "Border Focus",
    help: "Color of borders when elements are focused",
  },
] as const;

const FONT_SIZE_FIELDS = [
  {
    key: "base",
    label: "Base",
    help: "The default font size used throughout the comments section. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "error-screen-title",
    label: "Error Screen Title",
    help: "Font size for error screen headings. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "empty-screen-title",
    label: "Empty Screen Title",
    help: "Font size for empty state headings. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "headline",
    label: "Headline",
    help: "Font size for section headlines. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "xs",
    label: "Extra Small",
    help: "Smallest font size used for very small text. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "sm",
    label: "Small",
    help: "Small font size used for secondary text. Value can be a number, percentage, px, rem, etc.",
  },
] as const;

const OTHER_FIELDS = [
  {
    key: "radius",
    label: "Border Radius",
    help: "Border radius used for rounded corners. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "root-padding-vertical",
    label: "Root Padding Vertical",
    help: "Vertical padding around the entire comments section. Value can be a number, percentage, px, rem, etc.",
  },
  {
    key: "root-padding-horizontal",
    label: "Root Padding Horizontal",
    help: "Horizontal padding around the entire comments section. Value can be a number, percentage, px, rem, etc.",
  },
] as const;

export default function IframeConfigurator() {
  const [uri, setUri] = React.useState(
    "https://docs.ethcomments.xyz/integration-options/embed-comments"
  );
  const [embedUri, setEmbedUri] = React.useState(
    publicEnv.VITE_ECP_ETH_EMBED_URL
  );
  const [config, setConfig] =
    React.useState<EmbedConfigSchemaType>(DEFAULT_CONFIG);
  const [debouncedConfig] = useDebounce(config, 500);

  const updateThemeColor = (
    mode: "light" | "dark",
    key: (typeof COLOR_FIELDS)[number]["key"],
    value: string
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
    value: string
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
    value: string
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
    <div className="space-y-8">
      <div className="space-y-6">
        <div>
          <label
            className="block text-sm font-medium mb-2"
            htmlFor="target-uri-input"
          >
            Target URI
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

        <div>
          <label
            className="block text-sm font-medium mb-2"
            htmlFor="target-embed-uri-input"
          >
            Embed URI
          </label>
          <input
            id="target-embed-uri-input"
            type="text"
            value={embedUri}
            onChange={(e) => setEmbedUri(e.target.value)}
            className="w-full p-2 border rounded bg-input border-input-border text-input-text text-iframe-configurator-input"
            placeholder="https://embed.ethcomments.xyz"
          />
        </div>

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
                Object.keys(config.theme?.font?.fontFamily || {})[0] || "system"
              }
              onChange={(e) => {
                const type = e.target.value as "system" | "google";
                updateFontFamily(
                  type,
                  type === "system" ? "Geist, Arial, Helvetica, sans-serif" : ""
                );
              }}
              className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
            >
              <option value="system">System Font</option>
              <option value="google">Google Font</option>
            </select>
          </div>

          {Object.keys(config.theme?.font?.fontFamily || {}).includes(
            "google"
          ) && (
            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="google-font-input"
              >
                Google Font
              </label>
              <select
                id="google-font-input"
                value={config.theme?.font?.fontFamily?.google || ""}
                onChange={(e) => updateFontFamily("google", e.target.value)}
                className="w-full p-2 border rounded !bg-input border-input-border text-input-text text-iframe-configurator-input"
              >
                <option value="">Select a font</option>
                {Object.values(EmbedConfigSupportedFont.enum).map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          )}

          {Object.keys(config.theme?.font?.fontFamily || {}).includes(
            "system"
          ) && (
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
                onChange={(e) => updateFontFamily("system", e.target.value)}
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
      </div>

      <div className="border border-iframe-configurator-section-border rounded-iframe-configurator-section p-4">
        <h3 className="text-md font-medium !mb-4">Generated URL</h3>
        <GeneratedURL config={debouncedConfig} embedUri={embedUri} uri={uri} />
      </div>

      <div className="border border-iframe-configurator-section-border rounded-iframe-configurator-section p-4">
        <h3 className="text-md font-medium !mb-4">Preview</h3>
        <CommentsEmbedPreview
          embedUri={embedUri}
          uri={uri}
          config={debouncedConfig}
        />
      </div>
    </div>
  );
}

function GeneratedURL({
  embedUri,
  uri,
  config,
}: {
  embedUri: string;
  uri: string;
  config: EmbedConfigSchemaType;
}) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<any>(null);

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const url = createCommentsEmbedURL(embedUri, { targetUri: uri }, config);

    const copyToClipboard = () => {
      navigator.clipboard.writeText(url);
      setCopied(true);

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="flex gap-2">
        <input
          type="text"
          readOnly
          value={url}
          className="flex-1 p-2 border rounded cursor-pointer text-input-text bg-input border-input-border"
          onClick={copyToClipboard}
        />
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 rounded transition-colors"
          type="button"
        >
          <span className="block w-[7ch] truncate">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
      </div>
    );
  } catch (e) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-red-500">Could not create an embed URL.</span>
        <pre className="font-mono w-full">{String(e)}</pre>
      </div>
    );
  }
}

function CommentsEmbedPreview({
  embedUri,
  uri,
  config,
}: {
  embedUri: string;
  uri: string;
  config: EmbedConfigSchemaType;
}) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // this just validates the config
    createCommentsEmbedURL(embedUri, { targetUri: uri }, config);

    return <CommentsEmbed uri={uri} embedUri={embedUri} config={config} />;
  } catch (e) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-red-500">Could not create show a preview</span>
        <pre className="font-mono w-full">{String(e)}</pre>
      </div>
    );
  }
}

function LabelWithHelp({
  label,
  help,
  htmlFor,
}: {
  htmlFor: string;
  label: string;
  help: string;
}) {
  return (
    <div className="flex items-center gap-1" title={help}>
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      <Info className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}
