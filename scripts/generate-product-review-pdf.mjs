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

const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 12;
const tableWidth = pageWidth - margin * 2;
const columns = [
  { title: "N.", width: 10 },
  { title: "Produto", width: 70 },
  { title: "Unidade padrao", width: 32 },
  { title: "Ajuste / observacao", width: tableWidth - 10 - 70 - 32 },
];
const rowHeight = 9;
const headerHeight = 8;
const footerHeight = 9;
let pageNumber = 0;
let y = margin;

function addPageHeader() {
  pageNumber += 1;
  y = margin;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Revisao da base de produtos - HortiGiro", margin, y + 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    "Rabisque e escreva ao lado quando quiser alterar nome ou unidade. Marque REMOVER na observacao se nao quiser manter o produto.",
    margin,
    y + 10,
  );
  doc.text("Unidades: caixa, unidade, maco, bandeja, duzia, cartela, saco, pacote, kg.", margin, y + 15);
  doc.text(`Total: ${products.length}`, pageWidth - margin, y + 15, { align: "right" });
  y += 21;
  drawTableHeader();
}

function drawTableHeader() {
  let x = margin;
  doc.setDrawColor(60, 60, 60);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  columns.forEach((column) => {
    doc.rect(x, y, column.width, headerHeight);
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

  doc.setDrawColor(185, 185, 185);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  columns.forEach((column, columnIndex) => {
    doc.rect(x, y, column.width, rowHeight);

    if (columnIndex === 0) {
      doc.text(String(index + 1), x + 2, y + 5.8);
    }

    if (columnIndex === 1) {
      doc.text(product.nome, x + 2, y + 5.2);
    }

    if (columnIndex === 2) {
      doc.text(product.unidade, x + 2, y + 5.2);
    }

    x += column.width;
  });

  y += rowHeight;
});

addFooter();
writeFileSync(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log(`PDF gerado: ${outputPath}`);
