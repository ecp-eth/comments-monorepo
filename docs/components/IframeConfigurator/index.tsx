import React, { useCallback, useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type EmbedConfigSchemaInputType,
  EmbedConfigSchema,
  EmbedConfigSupportedFont,
} from "@ecp.eth/sdk/embed";
import { useDebounce } from "use-debounce";
import { HexSchema } from "@ecp.eth/sdk/core";
import {
  DEFAULT_CONFIG,
  COLOR_FIELDS,
  FONT_SIZE_FIELDS,
  OTHER_FIELDS,
} from "./constants";
import LabelWithHelp from "./LabelWithHelp";
import { publicEnv } from "../../publicEnv";
import CommentsEmbedPreview from "./CommentsEmbedPreview";
import SnippetGenerator from "./SnippetGenerator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { ChevronsDown, Info, Link } from "lucide-react";

const formSchema = z.object({
  mode: z.enum(["post", "author", "replies"]),
  source: z.union([
    z.object({
      targetUri: z.string().url(),
    }),
    z.object({
      author: HexSchema,
    }),
    z.object({
      commentId: HexSchema,
    }),
  ]),
  config: EmbedConfigSchema,
  embedUri: z.string().url().optional(),
  autoHeightAdjustment: z.boolean(),
});

export default function IframeConfigurator() {
  const { ref } = usePreventKeyboardShortcut();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [appSigner, setAppSigner] = useState<"embed" | "custom" | "all">(
    "embed",
  );

  const form = useForm<z.input<typeof formSchema>>({
    mode: "all",
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "post",
      source: {
        targetUri: "",
      },
      embedUri: "",
      config: DEFAULT_CONFIG,
      autoHeightAdjustment: true,
    },
  });
  const mode = useWatch({ control: form.control, name: "mode" });
  const source = useWatch({ control: form.control, name: "source" });
  const embedUri = useWatch({ control: form.control, name: "embedUri" });
  const config = useWatch({ control: form.control, name: "config" });
  const autoHeightAdjustment = useWatch({
    control: form.control,
    name: "autoHeightAdjustment",
  });

  const [debouncedConfig] = useDebounce(config, 500);
  const getEmbedUri = useCallback(() => {
    return mode === "post"
      ? publicEnv.VITE_ECP_ETH_EMBED_URL
      : mode === "author"
        ? publicEnv.VITE_ECP_ETH_EMBED_BY_AUTHOR_URL
        : publicEnv.VITE_ECP_ETH_EMBED_BY_REPLIES_URL;
  }, [mode]);

  // Update embedUri when mode changes
  useEffect(() => {
    form.setValue("embedUri", getEmbedUri());
  }, [getEmbedUri]);

  const updateFontFamily = (type: "system" | "google", value: string) => {
    const prev = form.getValues("config");
    form.setValue("config", {
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
    });
  };

  const hasSystemFont = hasFontFamilySystem(config);
  const hasGoogleFont = hasFontFamilyGoogle(config);

  return (
    <Form {...form}>
      <div
        ref={ref}
        className="space-y-8 border border-input-border rounded-iframe-configurator-section p-4"
      >
        <div className="space-y-6">
          <FormField
            key="mode"
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => field.onChange(value)}
                    {...field}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent id="mode-select">
                      <SelectItem value="post">
                        Show comments by target URL
                      </SelectItem>
                      <SelectItem value="author">
                        Show all comments by an author
                      </SelectItem>
                      <SelectItem value="replies">
                        Show replies to a comment
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            key="source"
            control={form.control}
            name="source"
            render={({ field }) => (
              <>
                {mode === "post" ? (
                  <FormItem>
                    <FormLabel className="mb-2">
                      Web page for unique comments url
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        {...field}
                        value={
                          (field.value &&
                            "targetUri" in field.value &&
                            field.value?.targetUri) ||
                          ""
                        }
                        onChange={(e) => {
                          field.onChange({
                            targetUri: e.target.value,
                          });
                        }}
                        placeholder="https://example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                ) : mode === "author" ? (
                  <FormItem>
                    <FormLabel>Author Address</FormLabel>
                    <Input
                      type="text"
                      {...field}
                      value={
                        (field.value &&
                          "author" in field.value &&
                          field.value?.author) ||
                        ""
                      }
                      onChange={(e) => {
                        field.onChange({
                          author: e.target.value,
                        });
                      }}
                      placeholder="0x..."
                    />
                    <FormMessage />
                  </FormItem>
                ) : (
                  <FormItem>
                    <FormLabel>Comment ID</FormLabel>
                    <Input
                      id="comment-id-input"
                      type="text"
                      {...field}
                      value={
                        (field.value &&
                          "commentId" in field.value &&
                          field.value?.commentId) ||
                        ""
                      }
                      onChange={(e) => {
                        field.onChange({
                          commentId: e.target.value,
                        });
                      }}
                      placeholder="0x..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              </>
            )}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-start"
          >
            <div className="w-full flex flex-row items-center justify-between gap-2">
              <div>
                {showAdvanced ? "Hide" : "Show"} advanced theming options
              </div>
              <ChevronsDown />
            </div>
          </Button>

          {showAdvanced && (
            <>
              <FormField
                key="config.theme.mode"
                control={form.control}
                name="config.theme.mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Theme Mode</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          if (value === "auto") {
                            field.onChange(undefined);
                            return;
                          }

                          field.onChange(value);
                        }}
                        {...field}
                        value={field.value === undefined ? "auto" : field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Theme Mode" />
                        </SelectTrigger>
                        <SelectContent id="theme-mode-select">
                          <SelectItem value="auto" defaultChecked>
                            Auto
                          </SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>App Signer Address</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={(value) => {
                      setAppSigner(value as "embed" | "custom" | "all");

                      if (value === "embed" || value === "all") {
                        form.setValue("config.app", value);
                      }
                    }}
                    value={appSigner}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Theme Mode" />
                    </SelectTrigger>
                    <SelectContent id="theme-mode-select">
                      <SelectItem value="embed" defaultChecked>
                        Default (embed app signer)
                      </SelectItem>
                      <SelectItem value="custom">Custom app signer</SelectItem>
                      <SelectItem value="all">All apps</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>

              {appSigner === "custom" && (
                <FormField
                  key="config.app"
                  control={form.control}
                  name="config.app"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Custom App Signer Address (for retrieving comments)
                      </FormLabel>
                      <FormDescription className="text-yellow-400">
                        <span className="align-middle">
                          <Info className="w-3 h-3 stroke-yellow-400 inline-block" />
                          &nbsp; This option specifies the app signer address
                          used to retrieve comments. However the embed app will
                          always use the embed signer for posting comments. If
                          the signer addresses do not match, newly posted
                          comments may not appear.
                        </span>
                      </FormDescription>
                      <FormControl>
                        <Input
                          type="text"
                          {...field}
                          value={
                            field.value === "embed" || field.value === "all"
                              ? ""
                              : field.value
                          }
                          placeholder="0x..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                key="config.channelId"
                control={form.control}
                name="config.channelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Channel ID</FormLabel>
                    <FormDescription>
                      You can specify a custom channel ID for posting comments.
                      If you plan to charge users for posting, please ensure
                      your channel hook follows the{" "}
                      <a
                        href="/hooks"
                        target="_blank"
                        style={{ textDecoration: "underline" }}
                      >
                        instructions
                      </a>{" "}
                      <a
                        href="/hooks"
                        target="_blank"
                        style={{ textDecoration: "underline" }}
                      >
                        <Link className="inline-block w-3 h-3" />
                      </a>
                      . <br />
                      <span className="text-yellow-400">
                        <Info className="w-3 h-3 stroke-yellow-400 inline-block" />
                        &nbsp;Gasless transactions are not supported when the
                        channel requires a fee for posting comments.
                      </span>
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          field.onChange(
                            newValue === "" ? undefined : newValue,
                          );
                        }}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                key="config.gasSponsorship"
                control={form.control}
                name="config.gasSponsorship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gas Sponsorship</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          if (
                            value === "not-gasless" ||
                            value === "gasless-not-preapproved" ||
                            value === "gasless-preapproved"
                          ) {
                            field.onChange(value);
                            return;
                          }
                          // fallback to default
                          field.onChange("gasless-not-preapproved");
                        }}
                        {...field}
                        value={field.value}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={`Please select ${field.value}`}
                          />
                        </SelectTrigger>
                        <SelectContent id="gas-sponsorship-mode-select">
                          <SelectItem value="not-gasless">
                            Users pay their own gas fees
                          </SelectItem>
                          <SelectItem value="gasless-not-preapproved">
                            Gas sponsored, users sign each transaction
                          </SelectItem>
                          {publicEnv.VITE_ECP_ENABLE_PREAPPROVED_GASLESS && (
                            <SelectItem
                              value="gasless-preapproved"
                              defaultChecked
                            >
                              Gas sponsored, users pre-approve all transactions
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                key="autoHeightAdjustment"
                control={form.control}
                name="autoHeightAdjustment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auto Height Adjustment</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) =>
                          field.onChange(value === "enabled")
                        }
                        {...field}
                        value={autoHeightAdjustment ? "enabled" : "disabled"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Auto Height Adjustment" />
                        </SelectTrigger>
                        <SelectContent id="auto-height-adjust-select">
                          <SelectItem value="enabled">Enabled</SelectItem>
                          <SelectItem value="disabled">Disabled</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                key="config.disablePromotion"
                control={form.control}
                name="config.disablePromotion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hide "Powered by ECP" link</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value === "1");
                        }}
                        {...field}
                        value={field.value ? "1" : "0"}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Hide Powered by ECP" />
                        </SelectTrigger>
                        <SelectContent id="disable-promotion-select">
                          <SelectItem value="0">No</SelectItem>
                          <SelectItem value="1">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                key="config.restrictMaximumContainerWidth"
                control={form.control}
                name="config.restrictMaximumContainerWidth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum container width</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value === "restricted");
                      }}
                      {...field}
                      value={field.value ? "restricted" : "unrestricted"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Maximum container width" />
                      </SelectTrigger>
                      <SelectContent id="maximum-container-width-select">
                        <SelectItem value="restricted">
                          Restricted (672px)
                        </SelectItem>
                        <SelectItem value="unrestricted">
                          Unrestricted (taking up all available horizontal
                          space)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col gap-4">
                  <h3 className="text-md font-medium">Light Theme Colors</h3>
                  {COLOR_FIELDS.map(({ key, label, help }) => (
                    <FormField
                      key={`color-light-${key}`}
                      control={form.control}
                      name={`config.theme.colors.light.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <div
                            className="flex gap-2 items-center"
                            key={`color-light-${key}`}
                          >
                            <Input
                              id={`color-light-${key}-input`}
                              type="color"
                              {...field}
                              value={field.value || "#ffffff"}
                              className="w-8 h-8 cursor-pointer p-0"
                            />
                            <LabelWithHelp
                              label={label}
                              help={help}
                              htmlFor={`color-light-${key}-input`}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <h3 className="text-md font-medium">Dark Theme Colors</h3>
                  {COLOR_FIELDS.map(({ key, label, help }) => (
                    <FormField
                      key={`color-dark-${key}`}
                      control={form.control}
                      name={`config.theme.colors.dark.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <div
                            className="flex gap-2 items-center"
                            key={`color-dark-${key}`}
                          >
                            <Input
                              id={`color-dark-${key}-input`}
                              type="color"
                              {...field}
                              value={field.value || "#000000"}
                              className="w-8 h-8 cursor-pointer p-0"
                            />
                            <LabelWithHelp
                              label={label}
                              help={help}
                              htmlFor={`color-dark-${key}-input`}
                            />
                          </div>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="text-md font-medium">Font Settings</h3>

                <FormItem>
                  <FormLabel htmlFor="font-family-type-select">
                    Font Family Type
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={hasGoogleFont ? "google" : "system"}
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
                      <SelectContent id="font-family-type-select">
                        <SelectItem value="system">System Font</SelectItem>
                        <SelectItem value="google">Google Font</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>

                {hasGoogleFont && (
                  <FormField
                    key="config.theme.font.fontFamily.google"
                    control={form.control}
                    name="config.theme.font.fontFamily.google"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="google-font-input">
                          Google Font
                        </FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value);
                            }}
                            {...field}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a font" />
                            </SelectTrigger>
                            <SelectContent id="google-font-input">
                              {Object.values(EmbedConfigSupportedFont.enum).map(
                                (font) => (
                                  <SelectItem key={font} value={font}>
                                    {font}
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {hasSystemFont && (
                  <FormField
                    key="config.theme.font.fontFamily.system"
                    control={form.control}
                    name="config.theme.font.fontFamily.system"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="system-font-input">
                          System Font
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="system-font-input"
                            type="text"
                            {...field}
                            placeholder="Geist, Arial, Helvetica, sans-serif"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex flex-col gap-4">
                  <h4 className="text-md font-medium">Font Sizes</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {FONT_SIZE_FIELDS.map(({ key, label, help }) => (
                      <div key={key} className="space-y-2">
                        <LabelWithHelp label={label} help={help} />
                        <div className="grid grid-cols-2 gap-2">
                          <FormField
                            key={`config.theme.font.sizes.${key}.size`}
                            control={form.control}
                            name={`config.theme.font.sizes.${key}.size`}
                            render={({ field }) => (
                              <FormItem>
                                <label
                                  className="block text-xs text-gray-500"
                                  htmlFor={`font-size-${key}-input-size`}
                                >
                                  Size
                                </label>
                                <FormControl>
                                  <Input
                                    id={`font-size-${key}-input-size`}
                                    type="text"
                                    {...field}
                                    placeholder="1rem"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            key={`config.theme.font.sizes.${key}.lineHeight`}
                            control={form.control}
                            name={`config.theme.font.sizes.${key}.lineHeight`}
                            render={({ field }) => (
                              <FormItem>
                                <label
                                  className="block text-xs text-gray-500"
                                  htmlFor={`font-size-${key}-input-line-height`}
                                >
                                  Line Height
                                </label>
                                <FormControl>
                                  <Input
                                    id={`font-size-${key}-input-line-height`}
                                    type="text"
                                    {...field}
                                    placeholder="1.5"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
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
                    <FormField
                      key={key}
                      control={form.control}
                      name={`config.theme.other.${key}`}
                      render={({ field }) => (
                        <FormItem>
                          <LabelWithHelp label={label} help={help} />
                          <FormControl>
                            <Input
                              type="text"
                              {...field}
                              placeholder="0.5rem"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
              <FormField
                key="embedUri"
                control={form.control}
                name="embedUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="mb-2">
                      Override the iframe Embed URI
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder={getEmbedUri()}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            <SnippetGenerator
              config={debouncedConfig}
              embedUri={embedUri}
              source={source}
              autoHeightAdjustment={autoHeightAdjustment}
              onBeforeCopy={async () => {
                return await form.trigger();
              }}
            />
          </div>

          <div className="border border-iframe-configurator-section-border rounded-iframe-configurator-section p-4">
            <h3 className="text-md font-medium !mb-4">Preview</h3>
            <CommentsEmbedPreview
              embedUri={embedUri}
              source={source}
              config={debouncedConfig}
            />
          </div>
        </>
      </div>
    </Form>
  );
}

function hasFontFamilySystem(
  config: EmbedConfigSchemaInputType,
): config is EmbedConfigSchemaInputType & {
  theme: {
    font: {
      fontFamily: {
        system: string;
      };
    };
  };
} {
  return (
    !!config.theme?.font?.fontFamily && "system" in config.theme.font.fontFamily
  );
}

function hasFontFamilyGoogle(
  config: EmbedConfigSchemaInputType,
): config is EmbedConfigSchemaInputType & {
  theme: {
    font: {
      fontFamily: {
        google: string;
      };
    };
  };
} {
  return (
    !!config.theme?.font?.fontFamily && "google" in config.theme.font.fontFamily
  );
}

/**
 * Vocs trigger next page when holding shift key down and press directional key,
 * this interfere with input editing, let's block it
 */
function usePreventKeyboardShortcut() {
  const ref = useRef<HTMLDivElement>(null);
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!event.target || !(event.target instanceof HTMLElement)) {
      return;
    }

    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.tagName === "SELECT"
    ) {
      event.stopPropagation();
      return;
    }
  }, []);

  useEffect(() => {
    const wrappedElement = ref.current;
    if (!wrappedElement) {
      return;
    }

    wrappedElement.addEventListener("keydown", handleKeyDown);

    return () => {
      wrappedElement.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    ref,
  };
}
