!(function () {
  const { origin: origin, autoHeightAdjustment: autoHeightAdjustment } =
    (function () {
      const script = document.currentScript;
      if (!script)
        throw new Error("The script must be run from a <script /> tag");
      const url = new URL(script.src),
        origin = url.origin,
        autoHeightAdjustment =
          "true" === url.searchParams.get("autoHeightAdjustment");
      return { origin: origin, autoHeightAdjustment: autoHeightAdjustment };
    })();
  !(function (origin) {
    window.addEventListener("message", (event) => {
      if (
        "rainbowkit-wallet-button-mobile-clicked" !== event.data.type ||
        origin !== event.origin
      )
        return;
      const mobileUri = event.data.uri;
      if (
        mobileUri.toLowerCase().startsWith("javascript:") ||
        mobileUri.toLowerCase().startsWith("data:")
      )
        console.warn("Blocked potentially dangerous URI scheme:", mobileUri);
      else if (mobileUri.toLowerCase().startsWith("http")) {
        const link = document.createElement("a");
        (link.href = mobileUri),
          (link.target = "_blank"),
          (link.rel = "noreferrer noopener"),
          link.click();
      } else window.location.href = mobileUri;
    });
  })(origin),
    autoHeightAdjustment &&
      (function (origin) {
        window.addEventListener("message", (event) => {
          if (
            event.origin !== origin ||
            "@ecp.eth/sdk/embed/resize" !== event.data.type
          )
            return;
          const embedIframe = document.querySelector("iframe[title=Comments]");
          embedIframe && (embedIframe.style.height = event.data.height + "px");
        });
      })(origin);
})();
