"use client";

import {
  EmbedGetDimensionsEventSchema,
  EmbedResizedEventSchema,
} from "@ecp.eth/sdk/schemas";
import { useEffect } from "react";

export function WatchDocumentResize() {
  useEffect(() => {
    const notifyParent = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage(
        EmbedResizedEventSchema.parse({
          type: "@ecp.eth/sdk/embed/resize",
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
