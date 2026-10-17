/**
 * No celular as tabelas dos painéis viram cards (ver `.admin-table[data-cards]` no CSS). Para o card
 * mostrar "Coluna: valor", cada célula ganha o título da sua coluna em `data-label`, lido do próprio
 * cabeçalho da tabela. Assim nenhuma página precisa repetir os títulos célula por célula.
 *
 * Ficam de fora as tabelas dentro de modal (lá a tabela costuma ser um formulário, com inputs por
 * linha) e as sem cabeçalho (tabelas de rótulo e valor, que já cabem no celular).
 */
export function labelTables(root: HTMLElement) {
  for (const table of Array.from(root.querySelectorAll<HTMLTableElement>("table.admin-table"))) {
    const headers = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
    if (table.closest(".modal") || headers.length === 0) continue;
    if (!table.hasAttribute("data-cards")) table.setAttribute("data-cards", "");
    for (const body of Array.from(table.tBodies)) {
      for (const row of Array.from(body.rows)) {
        let column = 0;
        for (const cell of Array.from(row.cells)) {
          // Célula que ocupa várias colunas (estado vazio, linha de detalhe) não tem título.
          const label = cell.colSpan > 1 ? "" : (headers[column] ?? "");
          if (cell.getAttribute("data-label") !== label) cell.setAttribute("data-label", label);
          column += cell.colSpan;
        }
      }
    }
  }
}

/** Mantém as tabelas de `root` rotuladas enquanto o React troca linhas e páginas. Devolve o cleanup. */
export function watchTables(root: HTMLElement): () => void {
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => labelTables(root));
  };
  labelTables(root);
  // Só childList: os data-label que a própria função grava não disparam o observer de novo.
  const observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true });
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}
