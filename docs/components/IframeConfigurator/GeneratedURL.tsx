import * as React from "react";
import { renderToString } from "react-dom/server";
import { Hex } from "@ecp.eth/sdk/core";
import {
  createCommentsEmbedURL,
  type EmbedConfigSchemaInputType,
} from "@ecp.eth/sdk/embed";
import { Info } from "lucide-react";
import { DEFAULT_CONFIG } from "./constants";
import { useMemo } from "react";

function CodeSnippet({
  url,
  autoHeightAdjustment,
}: {
  url: string;
  autoHeightAdjustment: boolean;
}) {
  const origin = useMemo(() => new URL(url).origin, [url]);
  function scriptContent(origin: string) {
    window.addEventListener("message", (event) => {
      if (
        event.origin !== origin ||
        event.data.type !== "@ecp.eth/sdk/embed/resize"
      ) {
        return;
      }
      const embedIframe = document.querySelector(
        "iframe[title=Comments]"
      ) as HTMLElement;

      if (!embedIframe) {
        return;
      }

      embedIframe.style.height = event.data.height + "px";
    });
  }

  return (
    <>
      <iframe
        src={url}
        style={{
          width: "100%",
          border: "none",
          ...(autoHeightAdjustment
            ? undefined
            : {
                height: 600,
              }),
        }}
        title="Comments"
      ></iframe>
      {autoHeightAdjustment && (
        <script>{`(${scriptContent.toString()})("${origin}")`}</script>
      )}
    </>
  );
}

export default function GeneratedURL({
  embedUri,
  config,
  source,
  autoHeightAdjustment,
}: {
  embedUri: string | undefined;
  config: EmbedConfigSchemaInputType;
  source: { targetUri: string } | { author: Hex } | undefined;
  autoHeightAdjustment: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<any>(null);

  if (typeof window === "undefined" || !embedUri || !source) {
    return null;
  }

  try {
    const url = createCommentsEmbedURL({
      embedUri,
      source,
      config:
        JSON.stringify(config) !== JSON.stringify(DEFAULT_CONFIG)
          ? config
          : undefined,
    });
    const frameSrc = new URL(url).origin;
    const snippet = renderToString(
      <CodeSnippet url={url} autoHeightAdjustment={autoHeightAdjustment} />
    );

    const copyToClipboard = () => {
      navigator.clipboard.writeText(snippet);
      setCopied(true);

      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 text-sm text-[var(--vocs-color_noteText)] p-2 border border-[var(--vocs-color_noteBorder)] bg-[var(--vocs-color_noteBackground)] rounded-[var(--vocs-borderRadius_4)]">
          <Info className="mt-0.5 h-[1em] w-[1em]" />
          <span>
            Make sure to set the{" "}
            <code className="vocs_Code">Content-Security-Policy</code> header
            with <code className="vocs_Code">frame-src</code> allowing{" "}
            <code className="vocs_Code">{frameSrc}</code>. See{" "}
            <a
              className="vocs_Anchor vocs_Link vocs_Link_accent"
              href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-src"
              target="_blank"
              rel="noopener noreferrer"
            >
              CSP frame-src
            </a>
            .
          </span>
        </div>
        <textarea
          readOnly
          value={snippet}
          className="flex-1 p-2 border rounded cursor-pointer text-input-text bg-input border-input-border font-mono text-sm"
          onClick={copyToClipboard}
          rows={6}
        />
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 border rounded block m-auto"
          type="button"
        >
          <span className="block w-[7ch] truncate">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>
      </div>
    );
  } catch (e) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-red-500">Could not create an embed URL.</span>
        <pre className="font-mono w-full">{String(e)}</pre>
      </div>
    );
  }
}
