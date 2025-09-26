import { marked, type Tokens } from "marked";
import DomPurify from "dompurify";
import { memo, useEffect, useMemo, useRef } from "react";

function escapeHtml(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const renderer = new marked.Renderer();

renderer.heading = ({ text }: Tokens.Heading) => {
  return `<p><strong>${text}</strong></p>`;
};

renderer.code = ({ text, lang = "", escaped }: Tokens.Code) => {
  const languageClass = lang ? `language-${lang}` : "";
  const safeCode = escaped ? text : escapeHtml(text);
  const encodedCode = encodeURIComponent(text);

  const copyIconSvg = `<svg class="size-4" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>`;

  return `
    <div class="DocSearch-CodeSnippet">
      <div class="flex justify-between items-center bg-secondary px-4 py-2 rounded-t-[6px]">
        <span class="text-sm text-muted-foreground">${lang}</span>
        <button class="text-sm copy-code" data-code=${encodedCode}>${copyIconSvg}</button>
      </div>
      <pre><code class="${languageClass}">${safeCode}</code></pre>
    </div>
  `;
};

renderer.link = ({ href, title, text }: Tokens.Link): string => {
  const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
  const hrefAttr = href ? escapeHtml(href) : "";
  const textEscaped = escapeHtml(text);
  return `<a href="${hrefAttr}"${titleAttr} target="_blank" rel="noopener noreferrer">${textEscaped}</a>`;
};

export const Markdown = memo(({ text }: { text: string }) => {
  const html = useMemo(() => {
    return marked.parse(text, {
      gfm: true,
      breaks: true,
      renderer,
      async: false,
    });
  }, [text]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(event: MouseEvent): void {
      const targetEl = event.target as HTMLElement;
      const btn = targetEl.closest<HTMLButtonElement>(".copy-code");
      if (!btn) return;

      const encoded = btn.getAttribute("data-code") ?? "";
      navigator.clipboard.writeText(decodeURIComponent(encoded)).catch(() => {
        /* noop */
      });
    }

    container.addEventListener("click", handleClick);

    return (): void => {
      container.removeEventListener("click", handleClick);
    };
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="prose dark:prose-invert prose-pre:m-0 prose-pre:bg-secondary/60 prose-pre:py-2 prose-pre:px-4 prose-pre:rounded-t-none prose-hr:my-8 max-w-none [&_*]:[unicode-bidi:plaintext]"
      dangerouslySetInnerHTML={{ __html: DomPurify.sanitize(html) }}
    />
  );
});
