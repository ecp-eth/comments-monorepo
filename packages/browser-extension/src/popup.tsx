import "@rainbow-me/rainbowkit/styles.css";

import "./globals.css";

import "./env";

import { Popup } from "@/components/popup";
import { RootProvider } from "./providers/root";

export default function BrowserExtensionPopup() {
  return (
    <RootProvider>
      <Popup />
    </RootProvider>
  );
}
