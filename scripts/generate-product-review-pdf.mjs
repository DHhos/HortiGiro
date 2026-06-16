import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { jsPDF } from "jspdf";

const rootDir = resolve(import.meta.dirname, "..");
const dataPath = resolve(rootDir, "src", "data.ts");
const outputPath = resolve(rootDir, "docs", "lista-produtos-base-revisao.pdf");
const source = readFileSync(dataPath, "utf8");
const productPattern = /\{\s*id:\s*"[^"]+",\s*nome:\s*"([^"]+)",\s*unidadePadrao:\s*"([^"]+)",\s*ativo:\s*true\s*\}/g;
const products = Array.from(source.matchAll(productPattern))
  .map((match) => ({ nome: match[1], unidade: match[2] }))
  .sort((first, second) =>
    first.nome.localeCompare(second.nome, "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }),
  );

const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 10;
const tableWidth = pageWidth - margin * 2;
const columns = [
  { title: "Produto atual", width: 78 },
  { title: "Unidade", width: 24 },
  { title: "OK", width: 12 },
  { title: "Novo nome / observacao", width: 100 },
  { title: "Nova unid.", width: 26 },
  { title: "Remover", width: tableWidth - 78 - 24 - 12 - 100 - 26 },
];
const rowHeight = 8;
const headerHeight = 8;
const footerHeight = 9;
let pageNumber = 0;
let y = margin;

function addPageHeader() {
  pageNumber += 1;
  y = margin;
  doc.setTextColor(30, 41, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("HortiGiro - Revisao da base de produtos", margin, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Marque OK, escreva o novo nome/unidade ou marque REMOVER. Unidades: caixa, unidade, maco, bandeja, duzia, cartela, saco, pacote, kg.",
    margin,
    y + 10,
  );
  doc.text(`Total de produtos: ${products.length}`, pageWidth - margin, y + 10, { align: "right" });
  y += 16;
  drawTableHeader();
}

function drawTableHeader() {
  let x = margin;
  doc.setFillColor(40, 126, 29);
  doc.setDrawColor(80, 100, 86);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  columns.forEach((column) => {
    doc.rect(x, y, column.width, headerHeight, "FD");
    doc.text(column.title, x + 2, y + 5.2);
    x += column.width;
  });

  y += headerHeight;
}

function addFooter() {
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Pagina ${pageNumber}`, pageWidth - margin, pageHeight - 5, { align: "right" });
  doc.text("Gerado pelo HortiGiro", margin, pageHeight - 5);
}

function ensureRowSpace() {
  if (y + rowHeight + footerHeight <= pageHeight) {
    return;
  }

  addFooter();
  doc.addPage();
  addPageHeader();
}

addPageHeader();

products.forEach((product, index) => {
  ensureRowSpace();
  let x = margin;
  const fill = index % 2 === 0 ? 248 : 255;

  doc.setFillColor(fill, fill, fill);
  doc.setDrawColor(170, 178, 170);
  doc.setTextColor(24, 28, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  columns.forEach((column, columnIndex) => {
    doc.rect(x, y, column.width, rowHeight, "FD");

    if (columnIndex === 0) {
      doc.text(product.nome, x + 2, y + 5.2);
    }

    if (columnIndex === 1) {
      doc.text(product.unidade, x + 2, y + 5.2);
    }

    x += column.width;
  });

  y += rowHeight;
});

addFooter();
writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log(`PDF gerado: ${outputPath}`);
