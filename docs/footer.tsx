import React, { useEffect, useState } from "react";
import { CommentsEmbed } from "@ecp.eth/sdk/react";

/**
 * A custom footer component that renders a comments embed.
 * @returns
 */
export default function Footer() {
  const isMounted = useIsMounted()

  // there is no way to retrieve pathname in Vita SSR, so we don't render the comments embed
  if (typeof window === "undefined" || !isMounted) {
    return null;
  }

  return (
    <CommentsEmbed
      uri={`${window.location.origin}/${window.location.pathname}`}
      iframeProps={{
        style: {
          height: "300px",
          width: "100%",
        },
      }}
      containerProps={{
        style: {
          padding: "12px 8px",
          backgroundColor: "black",
          borderRadius: "var(--vocs-borderRadius_8)",
          overflow: "hidden",
        },
      }}
    />
  );
}

function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}