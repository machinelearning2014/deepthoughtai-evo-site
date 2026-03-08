async function loadPaperText() {
  const paperTextEl = document.getElementById("paper-text");
  const paperMetaEl = document.getElementById("paper-meta");
  if (!paperTextEl || !paperMetaEl) return;

  try {
    const response = await fetch("evo-paper-full.txt", { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    paperTextEl.textContent = text;
    const lines = text.split(/\r?\n/).length;
    paperMetaEl.textContent = `${lines.toLocaleString()} lines`;
  } catch (error) {
    paperTextEl.textContent = "Unable to load paper text.";
    paperMetaEl.textContent = "Load failed";
  }
}

loadPaperText();
