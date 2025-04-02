"use client";
import { useCSSSelectorTags } from "@/hooks/useCSSSelectorTags";
import { useEffect } from "react";

export function ApplyCSSSelectorTags() {
  const tags = useCSSSelectorTags();

  useEffect(() => {
    const html = document.documentElement;

    for (const [key, value] of Object.entries(tags)) {
      const hasClass = `has-${key}`;
      const hasNotClass = `has-not-${key}`;
      if (value === true) {
        html.classList.add(hasClass);
        html.classList.remove(hasNotClass);
      } else {
        html.classList.add(hasNotClass);
        html.classList.remove(hasClass);
      }
    }
  }, [tags]);

  return null;
}
