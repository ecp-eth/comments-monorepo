import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/react-editor/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        default: "var(--theme-font-family-default)",
      },
      fontSize: {
        base: [
          "var(--theme-font-size-base, 1rem)",
          {
            lineHeight: "var(--theme-line-height-base, 1.5rem)",
          },
        ],
        headline: [
          "var(--theme-font-size-headline, 1.5rem)",
          {
            lineHeight: "var(--theme-line-height-headline, 2rem)",
          },
        ],
        "error-screen-title": [
          "var(--theme-font-size-error-screen-title, 1.25rem)",
          {
            lineHeight: "var(--theme-line-height-error-screen-title, 1.75rem)",
          },
        ],
        "empty-screen-title": [
          "var(--theme-font-size-empty-screen-title, 1.25rem)",
          {
            lineHeight: "var(--theme-line-height-empty-screen-title, 1.75rem)",
          },
        ],
        sm: [
          "var(--theme-font-size-sm, 0.875rem)",
          {
            lineHeight: "var(--theme-line-height-sm, 1.25rem)",
          },
        ],
        xs: [
          "var(--theme-font-size-xs, 0.75rem)",
          {
            lineHeight: "var(--theme-line-height-xs, 1rem)",
          },
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "account-edit-link": "var(--account-edit-link)",
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: {
          DEFAULT: "var(--border)",
          focus: "var(--border-focus)",
        },
        input: {
          DEFAULT: "var(--input)",
          foreground: "var(--input-foreground)",
        },
        ring: "var(--ring)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      spacing: {
        "root-padding-vertical": "var(--theme-root-padding-vertical)",
        "root-padding-horizontal": "var(--theme-root-padding-horizontal)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
