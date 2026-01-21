import { createContext } from "react";
import { EditorTheme } from "../editor.type";

export const themeContext = createContext<EditorTheme>({});

export const ThemeContextProvider = themeContext.Provider;
