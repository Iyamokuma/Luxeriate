import { Fragment } from "react";

/**
 * Minimal, safe Markdown for terms and notes: ## / ### headings, paragraphs,
 * "- " lists, **bold** and [links](https://…). No raw HTML is ever rendered.
 */
export function Markdown({ content, className }: { content: string; className?: string }) {
  const blocks = content.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className={className}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        if (!lines.length) return null;
        if (lines[0].startsWith("### ")) return <h3 key={i}>{inline(lines[0].slice(4))}</h3>;
        if (lines[0].startsWith("## ")) {
          const rest = lines.slice(1);
          return (
            <Fragment key={i}>
              <h2>{inline(lines[0].slice(3))}</h2>
              {rest.length > 0 && renderLines(rest, i)}
            </Fragment>
          );
        }
        return <Fragment key={i}>{renderLines(lines, i)}</Fragment>;
      })}
    </div>
  );
}

function renderLines(lines: string[], key: number) {
  if (lines.every((l) => /^\s*[-*] /.test(l)))
    return (
      <ul key={key}>
        {lines.map((l, j) => (
          <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>
        ))}
      </ul>
    );
  return (
    <p key={key}>
      {lines.map((l, j) => (
        <Fragment key={j}>
          {j > 0 && <br />}
          {inline(l)}
        </Fragment>
      ))}
    </p>
  );
}

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const link = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (link)
      return (
        <a key={i} href={link[2]} target="_blank" rel="noreferrer">
          {link[1]}
        </a>
      );
    return <Fragment key={i}>{p}</Fragment>;
  });
}
