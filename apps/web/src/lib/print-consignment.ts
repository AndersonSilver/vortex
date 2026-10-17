import type { ConsignmentStockDTO, ConsignmentStoreDTO } from "@vortex/shared";
import { brl } from "./format";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Monta a folha de inventário da loja: só o que está na loja (quantidade > 0), em ordem alfabética. */
export function consignmentStockSheetHtml(store: ConsignmentStoreDTO, stock: ConsignmentStockDTO[], now = new Date()): string {
  const items = stock
    .filter((s) => s.quantity > 0)
    .sort((a, b) => a.productName.localeCompare(b.productName, "pt-BR"));
  const pieces = items.reduce((sum, s) => sum + s.quantity, 0);
  const value = items.reduce((sum, s) => sum + s.stockValue, 0);
  const issuedAt = now.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  const fileDate = now.toLocaleDateString("pt-BR").replace(/\//g, "-");

  const contact = [store.contactName, store.phone].filter(Boolean).map((v) => escapeHtml(v!)).join(" · ");
  const rows = items
    .map(
      (s, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>${escapeHtml(s.productName)}${s.productSku ? `<span class="sku">SKU ${escapeHtml(s.productSku)}</span>` : ""}</td>
          <td class="num">${s.quantity}</td>
          <td class="num">${brl(s.transferPrice)}</td>
          <td class="num">${brl(s.stockValue)}</td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Estoque ${escapeHtml(store.name)} ${fileDate}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11pt; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
    border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 14px; }
  .brand { font-size: 16pt; font-weight: 700; letter-spacing: 2px; }
  .doc-title { font-size: 12pt; margin-top: 2px; }
  .issued { text-align: right; font-size: 9.5pt; color: #444; }
  .store { margin-bottom: 14px; line-height: 1.5; }
  .store strong { font-size: 13pt; }
  .muted { color: #555; font-size: 9.5pt; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-bottom: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { font-size: 8.5pt; text-transform: uppercase; letter-spacing: .5px; color: #444; border-bottom: 1.5px solid #111; }
  tr { break-inside: avoid; }
  .num { text-align: right; white-space: nowrap; }
  th.num { text-align: right; }
  .sku { display: block; font-size: 8.5pt; color: #666; }
  tfoot td { font-weight: 700; border-top: 1.5px solid #111; border-bottom: none; }
  .empty { padding: 24px 8px; text-align: center; color: #555; }
  .signatures { display: flex; gap: 40px; margin-top: 56px; break-inside: avoid; }
  .signatures div { flex: 1; border-top: 1px solid #111; padding-top: 6px; font-size: 9.5pt; text-align: center; }
  footer { margin-top: 18px; font-size: 8.5pt; color: #666; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand">VÓRTEX 3D</div>
      <div class="doc-title">Inventário de peças em consignação</div>
    </div>
    <div class="issued">Emitido em<br /><strong>${issuedAt}</strong></div>
  </header>

  <section class="store">
    <strong>${escapeHtml(store.name)}</strong><br />
    ${contact ? `<span>${contact}</span><br />` : ""}
    ${store.document ? `<span class="muted">CNPJ/CPF: ${escapeHtml(store.document)}</span><br />` : ""}
    ${store.address ? `<span class="muted">${escapeHtml(store.address)}</span>` : ""}
  </section>

  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Produto</th>
        <th class="num">Qtd. na loja</th>
        <th class="num">Repasse (un.)</th>
        <th class="num">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5" class="empty">Nenhuma peça na loja.</td></tr>`}
    </tbody>
    ${
      items.length
        ? `<tfoot>
      <tr>
        <td></td>
        <td>${items.length} ${items.length === 1 ? "produto" : "produtos"}</td>
        <td class="num">${pieces} ${pieces === 1 ? "peça" : "peças"}</td>
        <td></td>
        <td class="num">${brl(value)}</td>
      </tr>
    </tfoot>`
        : ""
    }
  </table>

  <div class="signatures">
    <div>Vórtex 3D</div>
    <div>${escapeHtml(store.contactName ?? store.name)} (loja)</div>
  </div>

  <footer>Valores a preço de repasse. Documento para conferência do estoque em consignação na data de emissão.</footer>
</body>
</html>`;
}

/** Abre a caixa de impressão do navegador com a folha de inventário, sem sair da página. */
export function printConsignmentStock(store: ConsignmentStoreDTO, stock: ConsignmentStockDTO[]) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(consignmentStockSheetHtml(store, stock));
  doc.close();

  // O título da folha vira o nome sugerido do PDF; o iframe sai depois que a impressão fecha.
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  win.addEventListener("afterprint", cleanup, { once: true });
  setTimeout(() => {
    win.focus();
    win.print();
  }, 100);
}
