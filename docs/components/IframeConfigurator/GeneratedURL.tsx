import * as React from "react";
import { useEffect } from "react";
import { renderToString } from "react-dom/server";
import { Hex } from "@ecp.eth/sdk/core";
import {
  createCommentsEmbedURL,
  type EmbedConfigSchemaInputType,
} from "@ecp.eth/sdk/embed";
import { CircleX, Info } from "lucide-react";
import { DEFAULT_CONFIG } from "./constants";
import { Button } from "../ui/button";
import { ZodError } from "zod";

function CodeSnippet({
  url,
  autoHeightAdjustment,
  scriptContent,
}: {
  url: string;
  scriptContent: string;
  autoHeightAdjustment: boolean;
}) {
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
      <script>{scriptContent}</script>
    </>
  );
}

export default function GeneratedURL({
  embedUri,
  config,
  source,
  autoHeightAdjustment,
  onBeforeCopy,
}: {
  embedUri: string | undefined;
  config: EmbedConfigSchemaInputType;
  source:
    | { targetUri: string }
    | { author: Hex }
    | { commentId: Hex }
    | undefined;
  autoHeightAdjustment: boolean;
  onBeforeCopy?: () => boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const timeoutRef = React.useRef<any>(null);
  const [snippet, setSnippet] = React.useState<string>();
  const [frameSrc, setFrameSrc] = React.useState<string>();
  const [error, setError] = React.useState<string>();

  useEffect(() => {
    try {
      if (!embedUri || !source) {
        throw new Error("Missing embed URI or source");
      }

      const url = createCommentsEmbedURL({
        embedUri,
        source,
        config:
          JSON.stringify(config) !== JSON.stringify(DEFAULT_CONFIG)
            ? config
            : undefined,
      });
      const frameSrc = new URL(url).origin;
      const scriptContent = generateScriptContent(url, autoHeightAdjustment);

      const snippet = renderToString(
        <CodeSnippet
          url={url}
          autoHeightAdjustment={autoHeightAdjustment}
          scriptContent={scriptContent ?? ""}
        />,
      );

      setFrameSrc(frameSrc);
      setSnippet(snippet);
      setError(undefined);
    } catch (e) {
      if (!(e instanceof Error)) {
        setError("Unknown error");
        return;
      }

      if (e instanceof ZodError) {
        console.warn("configuration issues", e.issues);
        setError("Configuration error");
        return;
      }

      setError(e.message);
    }
  }, [embedUri, source, config, autoHeightAdjustment]);

  const copyToClipboard = () => {
    if (error || !snippet) {
      return;
    }

    const reuslt = onBeforeCopy?.() ?? true;
    if (!reuslt) {
      return;
    }

    navigator.clipboard.writeText(snippet);
    setCopied(true);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col relative">
        <textarea
          readOnly
          disabled={!snippet}
          value={snippet}
          className="flex-1 p-2 border rounded cursor-pointer text-input-text bg-input border-input-border font-mono text-sm"
          onClick={copyToClipboard}
          rows={6}
        />
        {error && (
          <div className="absolute top-0 bottom-0 left-0 right-0 flex flex-col overflow-y-auto items-center justify-center bg-[var(--vocs-color_noteBackground)]/90 p-5">
            {error === "Invalid source" ? (
              <>
                <Info className="w-10 h-10" />
                <span className=" py-1">Missing configuration</span>
              </>
            ) : (
              <>
                <CircleX stroke="red" className="w-10 h-10" />
                <span className="text-red-500 py-1">
                  {error.split("\n").map((line) => (
                    <div key={line}>
                      <span>{line}</span>
                    </div>
                  ))}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <Button
        onClick={copyToClipboard}
        type="button"
        variant="default"
        disabled={!!error}
      >
        <span className="block w-[7ch] truncate">
          {copied ? "Copied!" : "Copy"}
        </span>
      </Button>
      <div className="flex gap-2 text-sm text-[var(--vocs-color_noteText)] p-2 border border-[var(--vocs-color_noteBorder)] bg-[var(--vocs-color_noteBackground)] rounded-[var(--vocs-borderRadius_4)]">
        <Info className="mt-0.5 h-[1em] w-[1em]" />
        <span>
          Make sure to set the{" "}
          <code className="vocs_Code">Content-Security-Policy</code> header with{" "}
          <code className="vocs_Code">frame-src</code> allowing{" "}
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
    </div>
  );
}

function heightAdjustmentScript(origin: string) {
  window.addEventListener("message", (event) => {
    if (
      event.origin !== origin ||
      event.data.type !== "@ecp.eth/sdk/embed/resize"
    ) {
      return;
    }
    const embedIframe = document.querySelector(
      "iframe[title=Comments]",
    ) as HTMLElement;

    if (!embedIframe) {
      return;
    }

    embedIframe.style.height = event.data.height + "px";
  });
}

function mandatoryScript(origin: string) {
  window.addEventListener("message", (event: MessageEvent) => {
    if (
      event.data.type !== "rainbowkit-wallet-button-mobile-clicked" ||
      origin !== event.origin
    ) {
      return;
    }

    const mobileUri = event.data.uri;

    if (
      mobileUri.toLowerCase().startsWith("javascript:") ||
      mobileUri.toLowerCase().startsWith("data:")
    ) {
      console.warn("Blocked potentially dangerous URI scheme:", mobileUri);
      return;
    }

    if (mobileUri.toLowerCase().startsWith("http")) {
      const link = document.createElement("a");
      link.href = mobileUri;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      link.click();
    } else {
      window.location.href = mobileUri;
    }
  });
}

function generateScriptContent(url: string, autoHeightAdjustment: boolean) {
  const origin = new URL(url).origin;

  return (
    `(${mandatoryScript.toString()})("${origin}");` +
    (autoHeightAdjustment
      ? `(${heightAdjustmentScript.toString()})("${origin}");`
      : "")
  );
}
