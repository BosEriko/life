"use client";

import { useMemo, type CSSProperties } from "react";
import DOMPurify from "dompurify";

const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "s", "u", "a", "ul", "ol", "li", "label", "input", "div", "span"];
const ALLOWED_ATTR = ["href", "target", "rel", "type", "checked", "disabled", "data-type", "data-checked", "start"];

let hooked = false;

function sanitize(html: string): string {
  if (!hooked) {
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "A") {
        node.setAttribute("target", "_blank");
        node.setAttribute("rel", "noopener noreferrer");
      }
      if (node.tagName === "INPUT") {
        if (node.getAttribute("type") !== "checkbox") node.remove();
        else node.setAttribute("disabled", "");
      }
    });
    hooked = true;
  }
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}

export function RichTextView({ html, text, style }: { html?: string | null; text: string; style?: CSSProperties }) {
  const clean = useMemo(() => (html && typeof window !== "undefined" ? sanitize(html) : null), [html]);
  if (!clean) return <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", ...style }}>{text}</div>;
  return <div className="rich-content" style={{ overflowWrap: "anywhere", ...style }} dangerouslySetInnerHTML={{ __html: clean }} />;
}
