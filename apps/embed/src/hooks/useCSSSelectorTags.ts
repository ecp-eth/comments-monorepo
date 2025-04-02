"use client";
import { useEffect, useState } from "react";

type AllCSSSelectorTags = {
  "parent-window": boolean;
};

export function useCSSSelectorTags() {
  const [tags, setTags] = useState<AllCSSSelectorTags>({
    "parent-window": true,
  });

  // detect if we are in an iframe
  useEffect(() => {
    if (window.self !== window.top) {
      return;
    }

    setTags((tags) => {
      return {
        ...tags,
        "parent-window": false,
      };
    });
  }, []);

  return tags;
}
