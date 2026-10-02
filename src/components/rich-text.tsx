import { Fragment, type ReactNode } from "react";

const PATTERN = /\*\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*\*|\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*|~~(?=\S)([\s\S]+?)(?<=\S)~~|\*(?=\S)([\s\S]+?)(?<=\S)\*/;

function parse(text: string, key: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;
  for (let match = PATTERN.exec(rest); match; match = PATTERN.exec(rest)) {
    if (match.index > 0) nodes.push(rest.slice(0, match.index));
    const id = `${key}.${index++}`;
    const [, boldItalic, bold, strike, italic] = match;
    if (boldItalic !== undefined) nodes.push(<strong key={id}><em>{parse(boldItalic, id)}</em></strong>);
    else if (bold !== undefined) nodes.push(<strong key={id}>{parse(bold, id)}</strong>);
    else if (strike !== undefined) nodes.push(<s key={id}>{parse(strike, id)}</s>);
    else nodes.push(<em key={id}>{parse(italic, id)}</em>);
    rest = rest.slice(match.index + match[0].length);
  }
  if (rest) nodes.push(rest);
  return nodes;
}

export function RichText({ text }: { text: string }) {
  return <Fragment>{parse(text, "r")}</Fragment>;
}

export function plainText(text: string): string {
  const match = PATTERN.exec(text);
  if (!match) return text;
  const inner = match.slice(1).find((group) => group !== undefined) ?? "";
  return text.slice(0, match.index) + plainText(inner) + plainText(text.slice(match.index + match[0].length));
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function markdownLiteToHtml(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      const html = escapeHtml(line)
        .replace(/\*\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*\*/g, "<strong><em>$1</em></strong>")
        .replace(/\*\*(?=\S)([\s\S]+?)(?<=\S)\*\*/g, "<strong>$1</strong>")
        .replace(/~~(?=\S)([\s\S]+?)(?<=\S)~~/g, "<s>$1</s>")
        .replace(/\*(?=\S)([\s\S]+?)(?<=\S)\*/g, "<em>$1</em>");
      return `<p>${html}</p>`;
    })
    .join("");
}
