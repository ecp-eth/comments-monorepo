"use client";

import {
  EmbedGetDimensionsEventSchema,
  EmbedResizedEventSchema,
} from "@ecp.eth/sdk/schemas";
import { useEffect } from "react";

export function WatchDocumentResize() {
  useEffect(() => {
    const notifyParent = () => {
      // for width use client width, we don't want to resize to sides
      const width = document.documentElement.clientWidth;
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage(
        EmbedResizedEventSchema.parse({
          type: "@ecp.eth/sdk/embed/resize",
          width,
          height,
        }),
        "*"
      );
    };

    // Notify parent window initially
    notifyParent();

    function handleResize() {
      notifyParent();
    }

    const resizeObserver = new ResizeObserver(handleResize);

    resizeObserver.observe(document.documentElement);

    const handleGetDimensionsMessage = (event: MessageEvent) => {
      const eventData = EmbedGetDimensionsEventSchema.safeParse(event.data);

      if (eventData.success) {
        notifyParent();
      }
    };

    window.addEventListener("message", handleGetDimensionsMessage);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("message", handleGetDimensionsMessage);
    };
  }, []);

  return null;
}
