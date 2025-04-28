import type { Config } from "tailwindcss";

export default {
  darkMode: ["selector"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/shared/src/**/*.{js,ts,jsx,tsx,mdx}",
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
        input: "var(--input)",
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
      rootThemeVarsLight: {
        "--background": "var(--light-theme-background, white)",
        "--foreground": "var(--light-theme-foreground, hsl(0 0% 3.9%))",
        "--account-edit-link":
          "var(--light-theme-account-edit-link, rgb(59 130 246))",
        "--popover": "var(--light-theme-background, white)",
        "--popover-foreground": "var(--light-theme-foreground, hsl(0 0% 3.9%))",
        "--primary": "var(--light-theme-primary, hsl(0 0% 9%))",
        "--primary-foreground":
          "var(--light-theme-primary-foreground, hsl(0 0% 98%))",
        "--secondary": "var(--light-theme-secondary, hsl(0 0% 96.1%))",
        "--secondary-foreground":
          "var(--light-theme-secondary-foreground, hsl(0 0% 9%))",
        "--muted": "var(--light-theme-secondary, hsl(0 0% 96.1%))",
        "--muted-foreground":
          "var(--light-theme-muted-foreground, hsl(0 0% 45.1%))",
        "--accent": "var(--light-theme-secondary, hsl(0 0% 96.1%))",
        "--accent-foreground": "var(--light-theme-foreground, hsl(0 0% 9%))",
        "--destructive": "var(--light-theme-destructive, hsl(0 84.2% 60.2%))",
        "--destructive-foreground":
          "var(--light-theme-destructive-foreground, hsl(0 0% 98%))",
        "--border": "var(--light-theme-border, hsl(0 0% 89.8%))",
        "--border-focus": "var(--light-theme-border-focus, hsl(0 0% 3.9%))",
        "--input": "var(--light-theme-border, hsl(0 0% 89.8%))",
        "--ring": "var(--light-theme-ring, hsl(0 0% 3.9%))",
        "--radius": "var(--theme-radius, 0.5rem)",
        "--root-padding-vertical": "var(--theme-root-padding-vertical, 0)",
        "--root-padding-horizontal": "var(--theme-root-padding-horizontal, 0)",
      },
      rootThemeVarsDark: {
        "--background": "var(--dark-theme-background, hsl(0 0% 3.9%))",
        "--foreground": "var(--dark-theme-foreground, hsl(0 0% 98%))",
        "--account-edit-link":
          "var(--dark-theme-account-edit-link, rgb(59 130 246))",
        "--popover": "var(--dark-theme-background, hsl(0 0% 3.9%))",
        "--popover-foreground": "var(--dark-theme-foreground, hsl(0 0% 98%))",
        "--primary": "var(--dark-theme-primary, hsl(0 0% 98%))",
        "--primary-foreground":
          "var(--dark-theme-primary-foreground, hsl(0 0% 9%))",
        "--secondary": "var(--dark-theme-secondary, hsl(0 0% 14.9%))",
        "--secondary-foreground":
          "var(--dark-theme-secondary-foreground, hsl(0 0% 98%))",
        "--muted": "var(--dark-theme-secondary, hsl(0 0% 14.9%))",
        "--muted-foreground":
          "var(--dark-theme-muted-foreground, hsl(0 0% 63.9%))",
        "--accent": "var(--dark-theme-secondary, hsl(0 0% 14.9%))",
        "--accent-foreground": "var(--dark-theme-foreground, hsl(0 0% 98%))",
        "--destructive": "var(--dark-theme-destructive, hsl(0 84.2% 60.2%))",
        "--destructive-foreground":
          "var(--dark-theme-destructive-foreground, hsl(0 0% 98%))",
        "--border": "var(--dark-theme-border, hsl(0 0% 14.9%))",
        "--border-focus": "var(--dark-theme-border-focus, hsl(0 0% 83.1%))",
        "--input": "var(--dark-theme-border, hsl(0 0% 14.9%))",
        "--ring": "var(--dark-theme-ring, hsl(0 0% 83.1%))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
