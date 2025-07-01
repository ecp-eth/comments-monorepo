import { useState, useEffect } from "react";

export const useCurrentUrl = () => {
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  return currentUrl;
};
