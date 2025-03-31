import { useEffect, useState } from "react";
import { formatDateRelative } from "../helpers.js";

export function useCommentRelativeTime(
  timestamp: Date | number,
  initialNow: number
) {
  const [relativeTime, setRelativeTime] = useState<string>(
    formatDateRelative(timestamp, initialNow)
  );
  const timestampMs = new Date(timestamp).getTime();
  const now = initialNow;
  const diffInMs = timestampMs - now;
  const diffInSeconds = Math.abs(Math.round(diffInMs / 1000));
  const diffInMinutes = Math.abs(Math.round(diffInMs / (1000 * 60)));
  const diffInHours = Math.abs(Math.round(diffInMs / (1000 * 60 * 60)));

  useEffect(() => {
    // If the difference is more than 24 hours, just set the relative time once
    if (diffInHours >= 24) {
      setRelativeTime(formatDateRelative(timestampMs, now));
      return;
    }

    // Set up interval based on the time difference
    let interval: NodeJS.Timeout;

    if (diffInSeconds < 60) {
      // Update every second if less than a minute
      interval = setInterval(() => {
        setRelativeTime(formatDateRelative(timestampMs, Date.now()));
      }, 1000);
    } else if (diffInMinutes < 60) {
      // Update every minute if less than an hour
      interval = setInterval(() => {
        setRelativeTime(formatDateRelative(timestampMs, Date.now()));
      }, 60000);
    } else if (diffInHours < 24) {
      // Update every hour if less than 24 hours
      interval = setInterval(() => {
        setRelativeTime(formatDateRelative(timestampMs, Date.now()));
      }, 3600000);
    }

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [timestampMs, diffInSeconds, diffInMinutes, diffInHours, now]);

  return relativeTime;
}
