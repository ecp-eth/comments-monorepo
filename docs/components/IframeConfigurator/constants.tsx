import { type EmbedConfigSchemaInputType } from "@ecp.eth/sdk/embed";

export const DEFAULT_CONFIG: EmbedConfigSchemaInputType = {
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

export const COLOR_FIELDS = [
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

export const FONT_SIZE_FIELDS = [
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

export const OTHER_FIELDS = [
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
