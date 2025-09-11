/**
 * This script is used to initialize the iframe for the ECP.eth embed.
 * The file will be compiled and minified by `gen:iframe-configurator:script` script to public folder.
 */
(() => {
  function main() {
    const { origin, autoHeightAdjustment } = retrieveParams();
    proxyClicks(origin);
    if (autoHeightAdjustment) {
      adjustHeight(origin);
    }
  }

  function retrieveParams(): { origin: string; autoHeightAdjustment: boolean } {
    const script = document.currentScript as HTMLScriptElement;
    if (!script) {
      throw new Error("The script must be run from a <script /> tag");
    }
    const origin = script.dataset.iframeOrigin;
    const autoHeightAdjustment = script.dataset.autoHeightAdjustment === "true";

    if (!origin || !autoHeightAdjustment) {
      throw new Error("iframe embed is not configured correctly");
    }

    // Please note that for backward compatibility,
    // please do not introduce any more mandatory parameters except 'iframeOrigin' and 'autoHeightAdjustment'.
    return { origin, autoHeightAdjustment };
  }

  function adjustHeight(origin: string) {
    window.addEventListener("message", (event) => {
      if (
        event.origin !== origin ||
        event.data.type !== "@ecp.eth/sdk/embed/resize"
      ) {
        return;
      }
      const embedIframe = document.querySelector(
        "iframe[title=Comments]",
      ) as HTMLElement;

      if (!embedIframe) {
        return;
      }

      embedIframe.style.height = event.data.height + "px";
    });
  }

  function proxyClicks(origin: string) {
    window.addEventListener("message", (event: MessageEvent) => {
      if (
        event.data.type !== "rainbowkit-wallet-button-mobile-clicked" ||
        origin !== event.origin
      ) {
        return;
      }

      const mobileUri = event.data.uri;

      if (
        mobileUri.toLowerCase().startsWith("javascript:") ||
        mobileUri.toLowerCase().startsWith("data:")
      ) {
        console.warn("Blocked potentially dangerous URI scheme:", mobileUri);
        return;
      }

      if (mobileUri.toLowerCase().startsWith("http")) {
        const link = document.createElement("a");
        link.href = mobileUri;
        link.target = "_blank";
        link.rel = "noreferrer noopener";
        link.click();
      } else {
        window.location.href = mobileUri;
      }
    });
  }

  main();
})();
