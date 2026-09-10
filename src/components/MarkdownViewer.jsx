import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

/**
 * Markdown com GFM e matemática (KaTeX). O estilo mora em
 * src/styles/markdown.css — antes era um <style> inline reinjetado a cada
 * instância montada.
 */
export default function MarkdownViewer({ content }) {
  if (!content) return null;

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
