marked.setOptions({
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: true,
});

function convertLatexTabularToMarkdown(markdown) {
  const tabularRegex = /\\begin\{tabular\}\{[^}]*\}([\s\S]*?)\\end\{tabular\}/g;
  return markdown.replace(tabularRegex, (_, body) => {
    const lines = body
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s && s !== "\\hline");

    const rows = [];
    for (const line of lines) {
      const cleaned = line.replace(/\\\\\s*$/, "").trim();
      if (!cleaned) continue;
      const cells = cleaned.split("&").map((c) => c.trim());
      if (cells.length > 0) rows.push(cells);
    }

    if (rows.length === 0) return "";

    const header = rows[0];
    const divider = header.map(() => "---");
    const bodyRows = rows.slice(1);

    const toRow = (cells) => `| ${cells.join(" | ")} |`;
    const out = [toRow(header), toRow(divider)];
    bodyRows.forEach((r) => out.push(toRow(r)));
    return out.join("\n");
  });
}

async function loadPaper() {
  const target = document.getElementById("paper-content");
  if (!target) return;

  try {
    const res = await fetch("paper.md", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const md = await res.text();
    const normalized = convertLatexTabularToMarkdown(md);
    target.innerHTML = marked.parse(normalized);

    // Highlight code only when highlight.js is available.
    if (window.hljs) {
      target.querySelectorAll("pre code").forEach((el) => {
        window.hljs.highlightElement(el);
      });
    }

    // Render LaTeX only when KaTeX auto-render is available.
    if (window.renderMathInElement) {
      window.renderMathInElement(target, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true },
        ],
        throwOnError: false,
      });
    }
  } catch (err) {
    target.innerHTML = `<p class="loading">Failed to load paper: ${String(err)}</p>`;
  }
}

loadPaper();
