import * as React from "react";
import { useEffect } from "react";
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
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { ChevronsDown } from "lucide-react";

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
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const form = useForm<z.input<typeof formSchema>>({
    mode: "all",
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: "post",
      source: {
        targetUri: "",
      },
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

  // Update embedUri when mode changes
  useEffect(() => {
    form.setValue(
      "embedUri",
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
    const prev = form.getValues("config");
    form.setValue("config", {
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
    });
  };

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
      <div className="space-y-8 border border-input-border rounded-iframe-configurator-section p-4">
        <div className="space-y-6">
          <FormField
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
                          form.trigger();
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
                        form.trigger();
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
                        form.trigger();
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

              <FormField
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
                        placeholder={
                          mode === "post"
                            ? "https://embed.ethcomments.xyz"
                            : "https://embed.ethcomments.xyz/by-author"
                        }
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
            <GeneratedURL
              config={debouncedConfig}
              embedUri={embedUri}
              source={source}
              autoHeightAdjustment={autoHeightAdjustment}
              onBeforeCopy={() => {
                form.trigger();
                return form.formState.isValid;
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
