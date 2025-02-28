import React, { useEffect, useState } from "react";
import { CommentsEmbed } from "@ecp.eth/sdk/react";

/**
 * A custom footer component that renders a comments embed.
 * @returns
 */
export default function Footer() {
  const meta = import.meta
  const isMounted = useIsMounted()
  const vocsTheme = useVocsColorScheme()

  // there is no way to retrieve pathname in Vita SSR, so we don't render the comments embed
  if (typeof window === "undefined" || !isMounted) {
    return null;
  }

  return (
    <CommentsEmbed
      embedUri={hasEnvObject(meta, 'VITE_ECP_ETH_EMBED_URL') ? meta.env.VITE_ECP_ETH_EMBED_URL : undefined}
      uri={`${window.location.origin}/${window.location.pathname}`}
      containerProps={{
        style: {
          backgroundColor: "var(--vocs-color_backgroundDark)",
          borderRadius: "var(--vocs-borderRadius_8)",
          overflow: "hidden",
        },
      }}
      iframeProps={{
        style: {
          backgroundColor: 'transparent'
        }
      }}
      config={{
        theme: {
          mode: vocsTheme,
          colors: {
            dark: {
              background: 'transparent',
              foreground: '#e9e9ea',
              border: '#444'
            },
            light: {
              background: 'transparent',
              foreground: '#4c4c4c',
              border: '#ccc'
            }
          },
          font: {
            fontFamily: {
              system:
                'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
            },
          },
          other: {
            "root-padding-horizontal": "24px",
            "root-padding-vertical": "12px"
          }
        }
      }}
    />
  );
}

/**
 * A hook that returns true if the component is mounted.
 * useful in the context to avoid rendering components on SSR.
 * @returns true if the component is mounted
 */
function useIsMounted() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted
}

function useVocsColorScheme() {
  const isMounted = useIsMounted()
  const [theme, setTheme] = useState<'light' | 'dark'>()
  useSyncRootElColorScheme(theme)
  
  useEffect(() => {
    if (!isMounted) { 
      return
    }

    // set initial theme when it is rendered on client
    setTheme(getVocsColorScheme())

    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.attributeName !== 'class') {
          return  
        }

        setTheme(getVocsColorScheme())
      });
    });

    // Start observing the element for class changes
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect()
    }
  }, [isMounted])

  return theme
}

/**
 * Sync the color scheme with root element
 * @param colorScheme - The color scheme to sync
 */
function useSyncRootElColorScheme(colorScheme: 'light' | 'dark' | undefined) {
  useEffect(() => {
    if (!colorScheme) {
      return
    }
    
    document.documentElement.style.colorScheme = colorScheme
  }, [colorScheme])
}

/**
 * Returns the color scheme of vocs docs
 * @returns 'light' or 'dark'
 */
function getVocsColorScheme(): 'light' | 'dark' {
  return document.documentElement.className.includes('dark') ? 'dark' : 'light'
}

/**
 * Type safe way to checks if the parent object has an env property with the given key
 * @param parent - The parent object to check
 * @param key - The key to check for in the env property
 * @returns true if the parent object has an env property with the given key
 */
function hasEnvObject<ENV_NAME extends string>(parent: unknown, key: ENV_NAME): parent is { env: { [key in ENV_NAME]: string } } {
  return (
    typeof parent === 'object' && 
    parent != null && 
    'env' in parent &&
    typeof parent.env === 'object' &&
    parent.env != null &&
    key in parent.env &&
    typeof (parent.env as Record<string, unknown>)[key] === 'string'
  ) 
}
