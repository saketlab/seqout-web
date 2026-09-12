"use client";
import { Text } from "@radix-ui/themes";
import DOMPurify from "dompurify";
import type { ComponentProps } from "react";
import { useMemo, useState } from "react";

const ALLOWED_TAGS = [
  "a",
  "b",
  "i",
  "em",
  "strong",
  "p",
  "br",
  "sup",
  "sub",
  "u",
];

function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return stripTags(html);
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  DOMPurify.removeHook("afterSanitizeAttributes");
  return clean;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

type ProjectSummaryProps = {
  // DDBJ GEA sends overall_design as a protocol list; other sources send a string. Render lists comma-separated.
  text?: string | string[] | null;
  charLimit?: number;
  size?: ComponentProps<typeof Text>["size"];
  defaultExpanded?: boolean;
};

export default function ProjectSummary({
  text,
  charLimit = 350,
  size,
  defaultExpanded = false,
}: ProjectSummaryProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const { plainText, sanitized } = useMemo(() => {
    const raw = Array.isArray(text)
      ? text.filter(Boolean).join(", ")
      : typeof text === "string"
        ? text
        : "";
    if (!raw) return { plainText: "", sanitized: "" };
    return { plainText: stripTags(raw), sanitized: sanitizeHtml(raw) };
  }, [text]);

  if (!sanitized) return null;

  const shouldTruncate = plainText.length > charLimit;

  return (
    <Text size={size}>
      {expanded || !shouldTruncate ? (
        <span dangerouslySetInnerHTML={{ __html: sanitized }} />
      ) : (
        <>{plainText.slice(0, charLimit)}...</>
      )}
      {shouldTruncate && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          style={{
            marginLeft: "0.25rem",
            border: "none",
            background: "transparent",
            padding: 0,
            font: "inherit",
            color: "var(--accent-11)",
            cursor: "pointer",
          }}
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </Text>
  );
}
