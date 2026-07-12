import { useMemo } from "react";
import { marked } from "marked";

marked.setOptions({
  breaks: true,
  gfm: true
});

export default function MarkdownViewer({ content }) {
  const html = useMemo(() => {
    if (!content) return "";
    return marked.parse(content);
  }, [content]);

  return (
    <div className="markdown-body" style={{
      color: "var(--text)", fontSize: 14, lineHeight: 1.75,
      maxWidth: "100%", overflowWrap: "break-word"
    }}>
      <style>{`
        .markdown-body h1 { font-family: var(--font-heading); font-size: 26px; font-weight: 550; margin: 0 0 16px; letter-spacing: -.02em; color: #fff; line-height: 1.25; }
        .markdown-body h2 { font-family: var(--font-heading); font-size: 20px; font-weight: 550; margin: 28px 0 10px; letter-spacing: -.01em; color: var(--text); line-height: 1.3; }
        .markdown-body h2:first-of-type { margin-top: 0; }
        .markdown-body h3 { font-family: var(--font-heading); font-size: 16px; font-weight: 550; margin: 22px 0 8px; color: var(--text); }
        .markdown-body p { margin: 0 0 14px; color: #d4d1c8; }
        .markdown-body ul, .markdown-body ol { margin: 0 0 14px; padding-left: 22px; color: #d4d1c8; }
        .markdown-body li { margin-bottom: 5px; }
        .markdown-body li > ul, .markdown-body li > ol { margin-bottom: 0; }
        .markdown-body strong { color: var(--text); font-weight: 600; }
        .markdown-body code { background: var(--surface-2); padding: 2px 7px; border-radius: 5px; font-size: 12px; color: var(--accent); }
        .markdown-body pre { background: var(--surface-2); padding: 16px; border-radius: var(--radius-sm); overflow-x: auto; margin: 0 0 14px; border: 1px solid var(--line-soft); }
        .markdown-body pre code { background: none; padding: 0; color: var(--text); font-size: 12px; }
        .markdown-body blockquote { margin: 0 0 14px; padding: 12px 16px; border-left: 3px solid var(--accent); background: var(--accent-soft); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; color: var(--muted); font-style: italic; }
        .markdown-body hr { border: none; border-top: 1px solid var(--line-soft); margin: 24px 0; }
        .markdown-body a { color: var(--accent); text-decoration: underline; }
        .markdown-body table { width: 100%; border-collapse: collapse; margin: 0 0 14px; font-size: 12px; }
        .markdown-body th, .markdown-body td { padding: 8px 12px; border: 1px solid var(--line-soft); text-align: left; }
        .markdown-body th { background: var(--surface-2); color: var(--text); font-weight: 600; }
        .markdown-body td { color: #d4d1c8; }
        .markdown-body img { max-width: 100%; border-radius: var(--radius-sm); }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
