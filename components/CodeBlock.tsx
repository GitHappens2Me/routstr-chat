"use client";

import { useState, useEffect, useRef, memo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useTheme } from "next-themes";

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

// Module-level state: persists "Copied!" feedback across component re-mounts
// that happen during streaming (ReactMarkdown recreates components on each update).
const recentlyCopied = new Map<string, number>();

const CodeBlock = memo(function CodeBlock({
  children,
  className,
  inline,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(
    () => recentlyCopied.has(children) && Date.now() - recentlyCopied.get(children)! < 2000
  );
  const { resolvedTheme } = useTheme();
  const mountedRef = useRef(true);

  // On (re-)mount, restore "Copied!" state if this code was recently copied.
  // This handles the case where the component unmounts/remounts during streaming.
  useEffect(() => {
    mountedRef.current = true;
    const copiedAt = recentlyCopied.get(children);
    if (copiedAt) {
      const elapsed = Date.now() - copiedAt;
      if (elapsed < 2000) {
        setCopied(true);
        const timer = setTimeout(() => {
          recentlyCopied.delete(children);
          if (mountedRef.current) setCopied(false);
        }, 2000 - elapsed);
        return () => {
          mountedRef.current = false;
          clearTimeout(timer);
        };
      } else {
        recentlyCopied.delete(children);
      }
    }
    return () => {
      mountedRef.current = false;
    };
  }, [children]);

  const isDark = resolvedTheme === "dark";
  const syntaxTheme = isDark ? oneDark : oneLight;
  const backgroundColor = isDark ? "#09090b" : "#fafafa";

  // Extract language from className (format: "language-javascript")
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(children);
      recentlyCopied.set(children, Date.now());
      if (mountedRef.current) setCopied(true);
      setTimeout(() => {
        recentlyCopied.delete(children);
        if (mountedRef.current) setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // For inline code, render simple styled span
  if (inline) {
    return (
      <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono border border-border not-prose">
        {children}
      </code>
    );
  }

  // For code blocks, render with syntax highlighting and copy button
  return (
    <div className="relative group my-4 not-prose">
      <div className="flex items-center justify-between bg-muted px-4 py-2 rounded-t-lg border border-border border-b-0">
        <span className="text-xs text-muted-foreground font-medium tracking-wide">
          {language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="rounded-b-lg overflow-hidden border border-border border-t-0">
        <SyntaxHighlighter
          style={syntaxTheme}
          language={language || "text"}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "16px",
            background: backgroundColor,
            fontSize: "13px",
            lineHeight: "1.6",
            borderRadius: 0,
          }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparator: only re-render if the meaningful props changed.
  // Avoids re-renders from new prop objects created by ReactMarkdown on each parse.
  return (
    prevProps.children === nextProps.children &&
    prevProps.className === nextProps.className &&
    prevProps.inline === nextProps.inline
  );
});

export default CodeBlock;
