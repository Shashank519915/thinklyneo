"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy } from "lucide-react";

// Helper to recursively extract plain text from React nodes
function getCodeString(children: React.ReactNode): string {
  if (!children) return "";
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return (children as any[]).map(getCodeString).join("");
  }
  if (children && typeof children === "object" && "props" in children) {
    return getCodeString((children as any).props.children);
  }
  return "";
}

// Premium copy to clipboard button with state animations
export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-2 top-2 rounded-md border border-white/10 bg-black/40 p-1.5 text-zinc-400 transition-all hover:bg-white/10 hover:text-white active:scale-95"
      title="Copy code to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400 animate-in fade-in zoom-in-50 duration-200" />
      ) : (
        <Copy className="h-3.5 w-3.5 transition-transform duration-200" />
      )}
    </button>
  );
}

// Inner Markdown renderer wrapped in React.memo to skip heavy parsing / re-renders
const MemoizedMarkdownInner = memo(
  ({ content }: { content: string }) => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-base font-bold text-white first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3.5 text-sm font-bold text-zinc-100 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-xs font-semibold text-zinc-200 first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-2.5 list-disc pl-5 space-y-1 last:mb-0">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2.5 list-decimal pl-5 space-y-1 last:mb-0">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-purple-500/50 pl-3 italic text-zinc-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-white/15" />,
          pre: ({ children }) => {
            const codeText = getCodeString(children);
            return (
              <div className="group relative my-3 rounded-lg border border-white/5 bg-black/40 shadow-inner">
                <pre className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed text-zinc-300">
                  {children}
                </pre>
                <div className="opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  <CopyButton text={codeText} />
                </div>
              </div>
            );
          },
          code: ({ className, children }) => {
            const isInline = !className || !className.includes("language-");
            if (isInline) {
              return (
                <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] text-purple-200">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.02]">
              <table className="w-full border-collapse text-left text-[11px] leading-normal">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/[0.03]">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-white/10 px-3 py-2 font-semibold text-white uppercase tracking-wider text-[10px]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-white/5 px-3 py-1.5">{children}</td>
          ),
          tr: ({ children }) => <tr className="even:bg-white/[0.01] hover:bg-white/[0.02] transition-colors">{children}</tr>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 underline underline-offset-2 transition-colors hover:text-purple-300"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

MemoizedMarkdownInner.displayName = "MemoizedMarkdownInner";

export function ChatMarkdown({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const lastUpdateRef = useRef(0);
  const pendingUpdateRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(content);
      return;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    
    // 150ms throttle interval strikes the perfect balance between real-time flow and CPU relief
    const throttleInterval = 150;

    if (timeSinceLastUpdate >= throttleInterval) {
      setDisplayedContent(content);
      lastUpdateRef.current = now;
      pendingUpdateRef.current = null;
    } else {
      pendingUpdateRef.current = content;
      
      const timer = setTimeout(() => {
        if (pendingUpdateRef.current !== null) {
          setDisplayedContent(pendingUpdateRef.current);
          lastUpdateRef.current = Date.now();
          pendingUpdateRef.current = null;
        }
      }, throttleInterval - timeSinceLastUpdate);

      return () => clearTimeout(timer);
    }
  }, [content, isStreaming]);

  if (!displayedContent || !displayedContent.trim()) return null;

  return <MemoizedMarkdownInner content={displayedContent} />;
}
