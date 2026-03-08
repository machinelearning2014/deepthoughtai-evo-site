marked.setOptions({
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: true,
});

const ARTICLES = [
  {
    id: "evo-paper",
    title: "EVO: A Prolog-First Autonomous Reasoning System with Explicit Assumptions and Consistency Verification",
    file: "paper.md?v=20260308e",
    summary: "Conceptual architecture, workflow, and evaluation of EVO.",
  },
  {
    id: "evo-skill-paper",
    title: "EVO Skill: Explicit-Assumption Verification Orchestrator as a CLI-Installable Toolchain",
    file: "evo-skill-paper.md?v=20260308e",
    summary: "Implementation-focused paper covering the installable CLI skill and toolchain.",
  },
  {
    id: "uncertainty-paper",
    title: "Relocating Uncertainty in Hybrid LLM-Symbolic Systems: Error-Mode Transformation Through Stratified Epistemic Architecture",
    file: "uncertainty-hybrid-systems.md?v=20260308e",
    summary: "Hybrid LLM-Prolog architecture focused on bounded uncertainty and governance-oriented reasoning.",
  },
];

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

function stripLeadingTitle(markdown) {
  return markdown.replace(/^\s*# .+\r?\n+/, "");
}

function renderEnhancements(target) {
  if (window.hljs) {
    target.querySelectorAll("pre code").forEach((el) => {
      window.hljs.highlightElement(el);
    });
  }

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
}

function renderNav(target) {
  target.innerHTML = ARTICLES.map(
    (article) => `
      <a class="article-link" href="#${article.id}">
        <span class="article-link-title">${article.title}</span>
        <span class="article-link-copy">${article.summary}</span>
      </a>
    `
  ).join("");
}

function renderArticles(target, articles) {
  target.innerHTML = articles
    .map(
      (article) => `
        <article id="${article.id}" class="paper-card article-section">
          <p class="article-kicker">Paper</p>
          <h2 class="article-title">${article.title}</h2>
          <div class="article-body">${article.html}</div>
        </article>
      `
    )
    .join("");

  target.querySelectorAll(".article-body").forEach((body) => {
    renderEnhancements(body);
  });
}

async function loadPapers() {
  const navTarget = document.getElementById("article-nav");
  const contentTarget = document.getElementById("paper-content");
  if (!navTarget || !contentTarget) return;

  renderNav(navTarget);

  try {
    const loaded = await Promise.all(
      ARTICLES.map(async (article) => {
        const res = await fetch(article.file, { cache: "no-store" });
        if (!res.ok) throw new Error(`${article.file}: HTTP ${res.status}`);

        const md = await res.text();
        const normalized = stripLeadingTitle(convertLatexTabularToMarkdown(md));
        return {
          ...article,
          html: marked.parse(normalized),
        };
      })
    );

    renderArticles(contentTarget, loaded);
  } catch (err) {
    contentTarget.innerHTML = `<article class="paper-card"><p class="loading">Failed to load papers: ${String(err)}</p></article>`;
  }
}

loadPapers();
