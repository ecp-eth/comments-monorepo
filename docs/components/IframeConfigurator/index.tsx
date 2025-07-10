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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function IframeConfigurator() {
  const [mode, setMode] = React.useState<"post" | "author" | "replies">("post");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [autoHeightAdjustment, setAutoHeightAdjustment] = React.useState(true);
  const [uri, setUri] = React.useState(
    "https://docs.ethcomments.xyz/integration-options/embed-comments",
  );
  const [author, setAuthor] = React.useState<Hex>(
    "0x0000000000000000000000000000000000000000",
  );
  const [commentId, setCommentId] = React.useState<Hex>(
    "0x0000000000000000000000000000000000000000",
  );
  const [embedUri, setEmbedUri] = React.useState(
    mode === "post"
      ? publicEnv.VITE_ECP_ETH_EMBED_URL
      : mode === "author"
        ? publicEnv.VITE_ECP_ETH_EMBED_BY_AUTHOR_URL
        : publicEnv.VITE_ECP_ETH_EMBED_BY_REPLIES_URL,
  );
  const [config, setConfig] =
    React.useState<EmbedConfigSchemaInputType>(DEFAULT_CONFIG);
  const [debouncedConfig] = useDebounce(config, 500);

  // Update embedUri when mode changes
  React.useEffect(() => {
    setEmbedUri(
      mode === "post"
        ? publicEnv.VITE_ECP_ETH_EMBED_URL
        : mode === "author"
          ? publicEnv.VITE_ECP_ETH_EMBED_BY_AUTHOR_URL
          : publicEnv.VITE_ECP_ETH_EMBED_BY_REPLIES_URL,
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
          <Select
            value={mode}
            onValueChange={(value) => setMode(value as "post" | "author")}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent id="mode-select">
              <SelectItem value="post">Show comments by target URL</SelectItem>
              <SelectItem value="author">
                Show all comments by an author
              </SelectItem>
              <SelectItem value="replies">Show replies to a comment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "post" ? (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="target-uri-input"
            >
              Web page for unique comments url
            </label>
            <Input
              id="target-uri-input"
              type="text"
              value={uri}
              onChange={(e) => setUri(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        ) : mode === "author" ? (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="author-input"
            >
              Author Address
            </label>
            <Input
              id="author-input"
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value as Hex)}
              placeholder="0x..."
            />
          </div>
        ) : (
          <div>
            <label
              className="block text-sm font-medium mb-2"
              htmlFor="comment-id-input"
            >
              Comment ID
            </label>
            <Input
              id="comment-id-input"
              type="text"
              value={commentId}
              onChange={(e) => setCommentId(e.target.value as Hex)}
              placeholder="0x..."
            />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-start"
        >
          {showAdvanced ? "Hide" : "Show"} Advanced theming options
        </Button>

        {showAdvanced && (
          <>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="theme-mode-select"
              >
                Theme Mode
              </label>
              <Select
                value={config.theme?.mode || "light"}
                onValueChange={(value) =>
                  setConfig((prev) => ({
                    ...prev,
                    theme: {
                      ...prev.theme,
                      mode: value as "light" | "dark",
                    },
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Theme Mode" />
                </SelectTrigger>
                <SelectContent id="theme-mode-select" className="bg-white">
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="auto-height-adjust-select"
              >
                Auto Height Adjustment
              </label>
              <Select
                value={autoHeightAdjustment ? "enabled" : "disabled"}
                onValueChange={(value) =>
                  setAutoHeightAdjustment(value === "enabled")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Auto Height Adjustment" />
                </SelectTrigger>
                <SelectContent
                  id="auto-height-adjust-select"
                  className="bg-white"
                >
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="disable-promotion-select"
              >
                Hide "Powered by ECP" link
              </label>
              <Select
                value={config.disablePromotion ? "1" : "0"}
                onValueChange={(value) => {
                  setConfig((prev) => ({
                    ...prev,
                    disablePromotion: value === "1",
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Hide Powered by ECP" />
                </SelectTrigger>
                <SelectContent
                  id="disable-promotion-select"
                  className="bg-white"
                >
                  <SelectItem value="0">No</SelectItem>
                  <SelectItem value="1">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                htmlFor="maximum-container-width-select"
              >
                Maximum container width
              </label>
              <Select
                value={
                  config.restrictMaximumContainerWidth
                    ? "restricted"
                    : "unrestricted"
                }
                onValueChange={(value) => {
                  setConfig((prev) => ({
                    ...prev,
                    restrictMaximumContainerWidth: value === "restricted",
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Maximum container width" />
                </SelectTrigger>
                <SelectContent
                  id="maximum-container-width-select"
                  className="bg-white"
                >
                  <SelectItem value="restricted">Restricted (672px)</SelectItem>
                  <SelectItem value="unrestricted">
                    Unrestricted (taking up all available horizontal space)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col gap-4">
                <h3 className="text-md font-medium">Light Theme Colors</h3>
                {COLOR_FIELDS.map(({ key, label, help }) => (
                  <div className="flex gap-2 items-center" key={`light-${key}`}>
                    <Input
                      id={`light-${key}-input`}
                      type="color"
                      value={config.theme?.colors?.light?.[key] || "#ffffff"}
                      onChange={(e) =>
                        updateThemeColor("light", key, e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer p-0"
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
                    <Input
                      id={`dark-${key}-input`}
                      type="color"
                      value={config.theme?.colors?.dark?.[key] || "#000000"}
                      onChange={(e) =>
                        updateThemeColor("dark", key, e.target.value)
                      }
                      className="w-8 h-8 cursor-pointer p-0"
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
                <Select
                  value={
                    !!config.theme?.font?.fontFamily &&
                    "google" in config.theme?.font?.fontFamily
                      ? "google"
                      : "system"
                  }
                  onValueChange={(value) => {
                    const type = value as "system" | "google";
                    updateFontFamily(
                      type,
                      type === "system"
                        ? "Geist, Arial, Helvetica, sans-serif"
                        : "",
                    );
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Font Family Type" />
                  </SelectTrigger>
                  <SelectContent
                    id="font-family-type-select"
                    className="bg-white"
                  >
                    <SelectItem value="system">System Font</SelectItem>
                    <SelectItem value="google">Google Font</SelectItem>
                  </SelectContent>
                </Select>
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
                    <Select
                      value={config.theme.font.fontFamily.google}
                      onValueChange={(value) =>
                        updateFontFamily("google", value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a font" />
                      </SelectTrigger>
                      <SelectContent
                        id="google-font-input"
                        className="bg-white"
                      >
                        <SelectItem value="">Select a font</SelectItem>
                        {Object.values(EmbedConfigSupportedFont.enum).map(
                          (font) => (
                            <SelectItem key={font} value={font}>
                              {font}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
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
                    <Input
                      id="system-font-input"
                      type="text"
                      value={config.theme?.font?.fontFamily?.system || ""}
                      onChange={(e) =>
                        updateFontFamily("system", e.target.value)
                      }
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
                          <Input
                            id={`${key}-size-input`}
                            type="text"
                            value={config.theme?.font?.sizes?.[key]?.size || ""}
                            onChange={(e) =>
                              updateFontSize(key, "size", e.target.value)
                            }
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
                          <Input
                            id={`${key}-line-height-input`}
                            type="text"
                            value={
                              config.theme?.font?.sizes?.[key]?.lineHeight || ""
                            }
                            onChange={(e) =>
                              updateFontSize(key, "lineHeight", e.target.value)
                            }
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
                    <Input
                      id={`${key}-input`}
                      type="text"
                      value={config.theme?.other?.[key] || ""}
                      onChange={(e) => updateOther(key, e.target.value)}
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
              <Input
                id="target-embed-uri-input"
                type="text"
                value={embedUri}
                onChange={(e) => setEmbedUri(e.target.value)}
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
            source={
              mode === "post"
                ? { targetUri: uri }
                : mode === "author"
                  ? { author }
                  : { commentId }
            }
            autoHeightAdjustment={autoHeightAdjustment}
          />
        </div>

        <div className="border border-iframe-configurator-section-border rounded-iframe-configurator-section p-4">
          <h3 className="text-md font-medium !mb-4">Preview</h3>
          <CommentsEmbedPreview
            embedUri={embedUri}
            source={
              mode === "post"
                ? { targetUri: uri }
                : mode === "author"
                  ? { author }
                  : { commentId }
            }
            config={debouncedConfig}
          />
        </div>
      </>
    </div>
  );
}
