marked.setOptions({
  gfm: true,
  breaks: false,
  mangle: false,
  headerIds: true,
});

async function loadPaper() {
  const target = document.getElementById("paper-content");
  if (!target) return;

  try {
    const res = await fetch("paper.md", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const md = await res.text();
    target.innerHTML = marked.parse(md);

    target.querySelectorAll("pre code").forEach((el) => {
      hljs.highlightElement(el);
    });

    renderMathInElement(target, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
    });
  } catch (err) {
    target.innerHTML = `<p class="loading">Failed to load paper: ${String(err)}</p>`;
  }
}

loadPaper();
