import { createContext } from "react";
import { EditorTheme } from "../editor.type";
import { MentionsExtensionTheme } from "../extensions/types";

export const themeContext = createContext<EditorTheme>({});

export const ThemeContextProvider = themeContext.Provider;

export const mentionsThemeContext = createContext<MentionsExtensionTheme>({});

export const MentionsThemeContextProvider = mentionsThemeContext.Provider;
