import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  Download,
  Edit3,
  FileDown,
  FileUp,
  FileText,
  Home,
  ListChecks,
  Moon,
  Package,
  Plus,
  Save,
  Search,
  Share2,
  ShoppingBasket,
  Settings as SettingsIcon,
  Sun,
  Trash2,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import {
  initialClients,
  initialOrders,
  initialProducts,
  initialRoutes,
  initialSettings,
  suggestedProducts,
  units,
} from "./data";
import type {
  AppSettings,
  Client,
  ConsolidatedItem,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Route,
  Unit,
} from "./types";
import {
  formatDate,
  formatDateLong,
  formatQuantity,
  getNextDeliveryDate,
  getTomorrowDate,
  getUpcomingDeliveryDates,
  normalizeText,
  parseQuantity,
  toDateInputValue,
} from "./utils";

type View =
  | "home"
  | "new-order"
  | "orders"
  | "ceasa"
  | "clients"
  | "products"
  | "settings"
  | "order-detail";
type ThemeMode = "light" | "dark";

interface DraftItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  unidade: Unit;
  observacao: string;
}

interface ClientForm {
  nome: string;
  telefone: string;
  endereco: string;
  observacaoPadrao: string;
  routeId: string;
}

interface ProductForm {
  nome: string;
  unidadePadrao: Unit;
  unidadesPedido: Unit[];
  unidadeCompra: Unit;
}

interface PurchasePlanEntry {
  quantidade: string;
  unidade: Unit;
}

interface ProductDemand {
  produtoId: string;
  produtoNome: string;
  quantities: Array<{
    quantidade: number;
    unidade: Unit;
  }>;
}

interface QuickOrderLine {
  id: string;
  raw: string;
  quantidade: number | null;
  unidade: Unit;
  informedUnit: Unit | null;
  produtoTexto: string;
  selectedProductId: string;
  status: "ready" | "needs-product" | "unit-conflict" | "invalid";
}

interface OrderDraftSnapshot {
  version: 1;
  active: boolean;
  editingOrderId: string | null;
  routeId: string;
  orderClientId: string;
  orderDeliveryDate: string;
  orderObservation: string;
  draftItems: DraftItem[];
  productSearch: string;
  selectedProductId: string;
  selectedOrderUnit: Unit;
  quantity: string;
  quickOrderOpen: boolean;
  quickOrderText: string;
  quickOrderProductOverrides: Record<string, string>;
  quickOrderUnitOverrides: Record<string, Unit>;
}

interface BackupPayload {
  version: 1;
  exportedAt: string;
  settings: AppSettings;
  routes: Route[];
  clients: Client[];
  products: Product[];
  orders: Order[];
  checkedItems: Record<string, boolean>;
  purchasePlans?: Record<string, PurchasePlanEntry>;
}

type PdfScope = { type: "all" } | { type: "route"; routeId: string };

const DEFAULT_ROUTE_ID = initialRoutes[0]?.id ?? "route-default";
const DEFAULT_LOGO_SRC = "/hortigiro-mark.png";
const FIXED_APP_NAME = initialSettings.appName;
const FIXED_PRIMARY_COLOR = initialSettings.primaryColor;
const FIXED_PDF_FOOTER = initialSettings.pdfFooter;
const TEMP_DOWNLOAD_URL_TTL = 10 * 60 * 1000;
const ORDER_DRAFT_STORAGE_KEY = "hortigiro.orderDraft";
const PRODUCT_CATALOG_REVISION = "2026-06-25-produtos-unificados-por-unidade";
const PRODUCT_CATALOG_REVISION_STORAGE_KEY = "hortigiro.productCatalogRevision";
const productCatalogRemovedNames = [
  "Abacaxi",
  "Abacaxi T8",
  "Abacaxi T12",
  "Abobrinha",
  "Alface",
  "Banana",
  "Batata",
  "Batata 20kg",
  "Batata Monalisa",
  "Batata salsa amarela",
  "Cebola",
  "Cebola 20kg",
  "Cebola 25kg",
  "Cogumelos",
  "Feijão",
  "Feijão carioca",
  "Feijão preto",
  "Laranja",
  "Laranja 25kg",
  "Limão",
  "Mandioca",
  "Ovos",
  "Pepino salada",
  "Pimentão",
  "Tomate",
  "Uva",
];
const productCatalogRenamedNames: Record<string, string> = {
  "Acelga caixa": "Acelga",
  "Acelga (caixa)": "Acelga",
  "Acelga unidade": "Acelga",
  "Acelga (unidade)": "Acelga",
  "Abóbora": "Abóbora pescoço",
  "Champignon": "Cogumelo Champignon",
  "Maçã sacolão caixa": "Maçã sacolão",
  "Maçã sacolão kg": "Maçã sacolão",
  "Mamão caixa": "Mamão",
  "Mamão (caixa)": "Mamão",
  "Mamão unidade": "Mamão",
  "Mamão (unidade)": "Mamão",
  Manga: "Manga comum",
  "Manga caixa": "Manga comum",
  "Manga (caixa)": "Manga comum",
  "Manga kg": "Manga comum",
  "Manga (kg)": "Manga comum",
  "Maracujá caixa": "Maracujá",
  "Maracujá kg": "Maracujá",
  "Melão caixa": "Melão",
  "Melão unidade": "Melão",
  "Pimentão amarelo (caixa)": "Pimentão amarelo",
  "Pimentão amarelo caixa": "Pimentão amarelo",
  "Pimentão amarelo (kg)": "Pimentão amarelo",
  "Pimentão amarelo kg": "Pimentão amarelo",
  "Pimentão misto (caixa)": "Pimentão misto",
  "Pimentão misto caixa": "Pimentão misto",
  "Pimentão misto (kg)": "Pimentão misto",
  "Pimentão misto kg": "Pimentão misto",
  "Pimentão verde (caixa)": "Pimentão verde",
  "Pimentão verde caixa": "Pimentão verde",
  "Pimentão verde (kg)": "Pimentão verde",
  "Pimentão verde kg": "Pimentão verde",
  "Pimentão vermelho (caixa)": "Pimentão vermelho",
  "Pimentão vermelho caixa": "Pimentão vermelho",
  "Pimentão vermelho (kg)": "Pimentão vermelho",
  "Pimentão vermelho kg": "Pimentão vermelho",
  Repolho: "Repolho branco",
  "Repolho caixa": "Repolho branco",
  "Repolho unidade": "Repolho branco",
  "Repolho roxo caixa": "Repolho roxo",
  "Repolho roxo unidade": "Repolho roxo",
  "Shimeji": "Cogumelo Shimeji",
  "Tomate cereja bandeja": "Tomate cereja",
  "Tomate cereja caixa": "Tomate cereja",
  "Uva crimson bandeja": "Uva crimson",
  "Uva crimson caixa": "Uva crimson",
  "Uva thompson bandeja": "Uva thompson",
  "Uva thompson caixa": "Uva thompson",
};

const emptyClientForm: ClientForm = {
  nome: "",
  telefone: "",
  endereco: "",
  observacaoPadrao: "",
  routeId: DEFAULT_ROUTE_ID,
};

const emptyProductForm: ProductForm = {
  nome: "",
  unidadePadrao: "caixa",
  unidadesPedido: ["caixa"],
  unidadeCompra: "caixa",
};

function loadOrderDraftSnapshot(): OrderDraftSnapshot | null {
  try {
    const storedValue = localStorage.getItem(ORDER_DRAFT_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const snapshot = JSON.parse(storedValue) as Partial<OrderDraftSnapshot>;

    if (snapshot.version !== 1 || !snapshot.active || !Array.isArray(snapshot.draftItems)) {
      return null;
    }

    return snapshot as OrderDraftSnapshot;
  } catch {
    return null;
  }
}

const pluralUnits: Record<Unit, string> = {
  caixa: "caixas",
  "caixa com 12 un": "caixas com 12 un",
  unidade: "unidades",
  maço: "maços",
  bandeja: "bandejas",
  dúzia: "dúzias",
  cartela: "cartelas",
  saco: "sacos",
  pacote: "pacotes",
  kg: "kg",
};

const unitAliases: Record<string, Unit> = {
  bd: "bandeja",
  bds: "bandeja",
  bandeja: "bandeja",
  bandejas: "bandeja",
  caixa: "caixa",
  caixa12: "caixa com 12 un",
  caixa12un: "caixa com 12 un",
  caixacom12un: "caixa com 12 un",
  caixas: "caixa",
  caixas12: "caixa com 12 un",
  caixas12un: "caixa com 12 un",
  cartela: "cartela",
  cartelas: "cartela",
  ct: "cartela",
  cts: "cartela",
  cx: "caixa",
  cx12: "caixa com 12 un",
  cx12un: "caixa com 12 un",
  cxs: "caixa",
  cxs12: "caixa com 12 un",
  cxs12un: "caixa com 12 un",
  duzia: "dúzia",
  duzias: "dúzia",
  dz: "dúzia",
  dzs: "dúzia",
  kg: "kg",
  kgs: "kg",
  maco: "maço",
  macos: "maço",
  maço: "maço",
  maços: "maço",
  mc: "maço",
  mcs: "maço",
  pacote: "pacote",
  pacotes: "pacote",
  pc: "pacote",
  pct: "pacote",
  pcts: "pacote",
  saco: "saco",
  sacos: "saco",
  sc: "saco",
  scs: "saco",
  un: "unidade",
  und: "unidade",
  unds: "unidade",
  unidade: "unidade",
  unidades: "unidade",
};

const commonUnitTypos: Record<string, Unit> = {
  banddeja: "bandeja",
  bandeija: "bandeja",
  bandeijas: "bandeja",
  bandej: "bandeja",
  banjeira: "bandeja",
  banjeiras: "bandeja",
  bdj: "bandeja",
  caisa: "caixa",
  caiza: "caixa",
  caxa: "caixa",
  caxas: "caixa",
  caxia: "caixa",
  cxsx: "caixa",
  dusia: "dúzia",
  kilo: "kg",
  kilos: "kg",
  kl: "kg",
  quilo: "kg",
  quilos: "kg",
  maccho: "maço",
  masso: "maço",
  massos: "maço",
  mco: "maço",
  pakote: "pacote",
  pakeote: "pacote",
  sakos: "saco",
  unid: "unidade",
  unidada: "unidade",
};

const halfQuantityTokens = new Set(["1/2", "meia", "meio", "metade"]);
const productConnectorTokens = new Set(["a", "as", "da", "das", "de", "do", "dos", "o", "os"]);

function getDisplayUnit(quantity: number, unit: Unit): string {
  return Math.abs(quantity) > 1 ? pluralUnits[unit] : unit;
}

function formatQuantityWithUnit(quantity: number, unit: Unit): string {
  return `${formatQuantity(quantity)} ${getDisplayUnit(quantity, unit)}`;
}

function mergeDraftItems(items: DraftItem[]): DraftItem[] {
  return items.reduce<DraftItem[]>((mergedItems, item) => {
    const existingItem = mergedItems.find(
      (currentItem) => currentItem.produtoId === item.produtoId && currentItem.unidade === item.unidade,
    );

    if (existingItem) {
      existingItem.quantidade += item.quantidade;
      return mergedItems;
    }

    return [...mergedItems, { ...item }];
  }, []);
}

function mergeOrderItems(items: OrderItem[]): OrderItem[] {
  return items.reduce<OrderItem[]>((mergedItems, item) => {
    const existingItem = mergedItems.find(
      (currentItem) => currentItem.produtoId === item.produtoId && currentItem.unidade === item.unidade,
    );

    if (existingItem) {
      existingItem.quantidade += item.quantidade;
      return mergedItems;
    }

    return [...mergedItems, { ...item }];
  }, []);
}

function getRouteFallback(routeId: string | undefined): string {
  return routeId || DEFAULT_ROUTE_ID;
}

function getProductNameKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function getUnitKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function getTokenKey(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9,./]/g, "");
}

const productCatalogRemovedNameKeys = new Set(productCatalogRemovedNames.map((name) => getProductNameKey(name)));
const suggestedProductByNameKey = new Map(suggestedProducts.map((product) => [getProductNameKey(product.nome), product]));
const productCatalogRenamedNameKeys = new Map(
  Object.entries(productCatalogRenamedNames).map(([currentName, nextName]) => [
    getProductNameKey(currentName),
    getProductNameKey(nextName),
  ]),
);

function sanitizeProduct(product: Product): Product {
  const { unidadesCompra: legacyUnits, ...sanitizedProduct } = product as Product & {
    unidadesCompra?: Unit[];
  };
  const unidadesPedido =
    Array.isArray(product.unidadesPedido) && product.unidadesPedido.length > 0
      ? product.unidadesPedido
      : Array.isArray(legacyUnits) && legacyUnits.length > 0
        ? legacyUnits
        : [product.unidadePadrao];

  return {
    ...sanitizedProduct,
    unidadesPedido: Array.from(new Set([product.unidadePadrao, ...unidadesPedido])),
    unidadeCompra: product.unidadeCompra ?? product.unidadePadrao,
  };
}

function getProductOrderUnits(product: Product): Unit[] {
  return Array.isArray(product.unidadesPedido) && product.unidadesPedido.length > 0
    ? Array.from(new Set([product.unidadePadrao, ...product.unidadesPedido]))
    : [product.unidadePadrao];
}

function getProductPurchaseUnit(product: Product): Unit {
  return product.unidadeCompra ?? product.unidadePadrao;
}

function getCatalogProductPatch(product: Product, catalogProduct: Product): Product {
  return {
    ...sanitizeProduct(product),
    nome: catalogProduct.nome,
    unidadePadrao: catalogProduct.unidadePadrao,
    unidadesPedido: catalogProduct.unidadesPedido,
    unidadeCompra: catalogProduct.unidadeCompra,
  };
}

function shouldAddMissingCatalogProducts(productList: Product[]): boolean {
  if (productList.length === 0) {
    return false;
  }

  const catalogLikeProducts = productList.filter((product) => {
    const productKey = getProductNameKey(product.nome);
    return (
      product.id.startsWith("produto-sugerido-") ||
      suggestedProductByNameKey.has(productKey) ||
      productCatalogRenamedNameKeys.has(productKey) ||
      productCatalogRemovedNameKeys.has(productKey)
    );
  });

  return productList.some((product) => product.id.startsWith("produto-sugerido-")) || catalogLikeProducts.length >= 20;
}

function buildProductCatalogMigration(productList: Product[]) {
  const shouldAddMissingProducts = shouldAddMissingCatalogProducts(productList);
  const revisedProducts: Product[] = [];
  const productIdMap: Record<string, string> = {};
  const productIndexByName = new Map<string, number>();

  productList.forEach((product) => {
    const productKey = getProductNameKey(product.nome);
    const renamedProductKey = productCatalogRenamedNameKeys.get(productKey);
    const renamedCatalogProduct = renamedProductKey ? suggestedProductByNameKey.get(renamedProductKey) : undefined;
    const catalogProduct = suggestedProductByNameKey.get(productKey);
    let revisedProduct: Product;

    if (renamedCatalogProduct) {
      revisedProduct = getCatalogProductPatch(product, renamedCatalogProduct);
    } else if (productCatalogRemovedNameKeys.has(productKey)) {
      return;
    } else if (catalogProduct) {
      revisedProduct = getCatalogProductPatch(product, catalogProduct);
    } else {
      revisedProduct = sanitizeProduct(product);
    }

    const revisedKey = getProductNameKey(revisedProduct.nome);
    const existingIndex = productIndexByName.get(revisedKey);

    if (existingIndex !== undefined) {
      const existingProduct = revisedProducts[existingIndex];
      productIdMap[product.id] = existingProduct.id;
      revisedProducts[existingIndex] = {
        ...existingProduct,
        ativo: existingProduct.ativo || revisedProduct.ativo,
        unidadesPedido: Array.from(
          new Set([...getProductOrderUnits(existingProduct), ...getProductOrderUnits(revisedProduct)]),
        ),
      };
      return;
    }

    productIdMap[product.id] = revisedProduct.id;
    productIndexByName.set(revisedKey, revisedProducts.length);
    revisedProducts.push(revisedProduct);
  });

  if (shouldAddMissingProducts) {
    const currentProductKeys = new Set(revisedProducts.map((product) => getProductNameKey(product.nome)));
    const importedAt = Date.now();
    const productsToAdd = suggestedProducts
      .filter((product) => !currentProductKeys.has(getProductNameKey(product.nome)))
      .map((product, index) => ({
        ...product,
        id: `produto-sugerido-revisao-${importedAt}-${index}`,
        ativo: true,
      }));

    revisedProducts.push(...productsToAdd);
  }

  return {
    products: sortProductsByName(revisedProducts),
    productIdMap,
  };
}

function remapOrderProductIds(
  orderList: Order[],
  productIdMap: Record<string, string>,
  productList: Product[],
): Order[] {
  const revisedProductById = new Map(productList.map((product) => [product.id, product]));

  return orderList.map((order) => ({
    ...order,
    itens: mergeOrderItems(
      order.itens.map((item) => {
        const produtoId = productIdMap[item.produtoId] ?? item.produtoId;
        const product = revisedProductById.get(produtoId);

        return {
          ...item,
          produtoId,
          produtoNome: product?.nome ?? item.produtoNome,
          unidade:
            product && !getProductOrderUnits(product).includes(item.unidade)
              ? product.unidadePadrao
              : item.unidade,
        };
      }),
    ),
  }));
}

function remapProductRecordKeys<T>(
  record: Record<string, T>,
  productIdMap: Record<string, string>,
): Record<string, T> {
  return Object.entries(record).reduce<Record<string, T>>((revisedRecord, [key, value]) => {
    let revisedKey = key;

    Object.entries(productIdMap).forEach(([currentId, nextId]) => {
      if (currentId === nextId) {
        return;
      }

      revisedKey = revisedKey.replace(`:${currentId}:`, `:${nextId}:`);

      if (revisedKey.endsWith(`:${currentId}`)) {
        revisedKey = `${revisedKey.slice(0, -(currentId.length + 1))}:${nextId}`;
      }
    });

    revisedRecord[revisedKey] = value;
    return revisedRecord;
  }, {});
}

function sortProductsByName(productList: Product[]): Product[] {
  return [...productList].sort((first, second) =>
    first.nome.localeCompare(second.nome, "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function getEditDistance(firstValue: string, secondValue: string): number {
  const first = getProductNameKey(firstValue);
  const second = getProductNameKey(secondValue);
  const distances = Array.from({ length: first.length + 1 }, () => Array(second.length + 1).fill(0));

  for (let firstIndex = 0; firstIndex <= first.length; firstIndex += 1) {
    distances[firstIndex][0] = firstIndex;
  }

  for (let secondIndex = 0; secondIndex <= second.length; secondIndex += 1) {
    distances[0][secondIndex] = secondIndex;
  }

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      distances[firstIndex][secondIndex] = Math.min(
        distances[firstIndex - 1][secondIndex] + 1,
        distances[firstIndex][secondIndex - 1] + 1,
        distances[firstIndex - 1][secondIndex - 1] + substitutionCost,
      );
    }
  }

  return distances[first.length][second.length];
}

function isCloseTextMatch(inputValue: string, candidateValue: string): boolean {
  const input = getProductNameKey(inputValue);
  const candidate = getProductNameKey(candidateValue);

  if (!input || !candidate) {
    return false;
  }

  if (input === candidate) {
    return true;
  }

  const maxLength = Math.max(input.length, candidate.length);
  const maxDistance = maxLength <= 5 ? 1 : maxLength <= 10 ? 2 : 3;

  return getEditDistance(input, candidate) <= maxDistance;
}

function getUnitFromToken(value: string): Unit | undefined {
  const unitKey = getUnitKey(value);
  const directUnit = unitAliases[unitKey];
  const typoUnit = commonUnitTypos[unitKey];

  if (directUnit) {
    return directUnit;
  }

  if (typoUnit) {
    return typoUnit;
  }

  const closeUnit = Object.entries(unitAliases).find(([alias]) => {
    if (unitKey.length < 5 || alias.length < 5) {
      return false;
    }

    return isCloseTextMatch(unitKey, alias);
  });

  return closeUnit?.[1];
}

function getQuantityFromToken(value: string): number | undefined {
  const tokenKey = getTokenKey(value.replace("½", "1/2"));

  if (halfQuantityTokens.has(tokenKey)) {
    return 0.5;
  }

  const fractionMatch = tokenKey.match(/^(\d+)\/(\d+)$/);

  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    return denominator > 0 ? numerator / denominator : undefined;
  }

  if (/^\d+(?:[,.]\d+)?$/.test(tokenKey)) {
    return parseQuantity(tokenKey);
  }

  return undefined;
}

function isProductConnectorToken(value: string): boolean {
  return productConnectorTokens.has(getProductNameKey(value));
}

function findProductByText(productText: string, productList: Product[]): Product | undefined {
  const productKey = getProductNameKey(productText);

  if (!productKey) {
    return undefined;
  }

  const variants = productKey.endsWith("s") ? [productKey, productKey.slice(0, -1)] : [productKey, `${productKey}s`];

  for (const variant of variants) {
    const exactMatch = productList.find((product) => getProductNameKey(product.nome) === variant);

    if (exactMatch) {
      return exactMatch;
    }
  }

  if (productKey.length < 5) {
    return undefined;
  }

  const partialMatches = productList
    .map((product) => ({
      product,
      key: getProductNameKey(product.nome),
    }))
    .filter(({ key }) => key.includes(productKey) || productKey.includes(key));

  if (partialMatches.length === 1) {
    return partialMatches[0].product;
  }

  if (partialMatches.length > 1) {
    const sortedPartialMatches = [...partialMatches].sort(
      (first, second) => second.key.length - first.key.length,
    );
    const firstMatchKey = sortedPartialMatches[0].key;
    const secondMatchKey = sortedPartialMatches[1].key;

    if (productKey.includes(firstMatchKey) && firstMatchKey.length > secondMatchKey.length) {
      return sortedPartialMatches[0].product;
    }
  }

  const closeMatches = productList
    .map((product) => ({
      product,
      distance: getEditDistance(productKey, product.nome),
    }))
    .filter(({ product, distance }) => {
      const productNameLength = getProductNameKey(product.nome).length;
      const maxLength = Math.max(productKey.length, productNameLength);
      const maxDistance = maxLength <= 5 ? 1 : maxLength <= 10 ? 2 : 3;
      return distance <= maxDistance;
    })
    .sort((first, second) => first.distance - second.distance);

  return closeMatches.length === 1 || closeMatches[0]?.distance < closeMatches[1]?.distance
    ? closeMatches[0]?.product
    : undefined;
}

function findProductByTextAndUnit(
  productText: string,
  productList: Product[],
  unit: Unit | undefined,
): Product | undefined {
  if (!unit) {
    return findProductByText(productText, productList);
  }

  const unitProducts = productList.filter((product) => getProductOrderUnits(product).includes(unit));
  return findProductByText(productText, unitProducts) ?? findProductByText(productText, productList);
}

function isIgnoredQuickOrderLine(value: string): boolean {
  const key = getProductNameKey(value);

  return (
    !key ||
    key.includes("listadecompras") ||
    key === "ceasa" ||
    key === "qtd" ||
    key === "produto" ||
    key === "total" ||
    key === "rsunt" ||
    key === "rsunttotal" ||
    key === "qtdprodutorsunttotal"
  );
}

function getQuickOrderLineId(index: number, value: string): string {
  return `${index}-${getProductNameKey(value) || "linha"}`;
}

function extractQuickOrderLineParts(value: string) {
  const preparedValue = value
    .replace(/(\d+\/\d+)([a-zA-ZÀ-ÿ]+)/g, "$1 $2")
    .replace(/(\d+(?:[,.]\d+)?)([a-zA-ZÀ-ÿ]+)/g, "$1 $2");
  const tokens = preparedValue.split(/\s+/).filter(Boolean);
  const quantityValues = tokens.map((token) => getQuantityFromToken(token));
  const quantityIndex = quantityValues.findIndex((parsedQuantity) => parsedQuantity !== undefined);
  const quantidade = quantityIndex >= 0 ? quantityValues[quantityIndex] ?? Number.NaN : Number.NaN;
  const tokensWithoutQuantity = tokens.filter((_, index) => index !== quantityIndex);
  const unitIndex = tokensWithoutQuantity.findIndex((token) => Boolean(getUnitFromToken(token)));
  const unidade = unitIndex >= 0 ? getUnitFromToken(tokensWithoutQuantity[unitIndex]) : undefined;
  const productTokens = tokensWithoutQuantity
    .filter((_, index) => index !== unitIndex)
    .filter((token) => !isProductConnectorToken(token));
  const produtoTexto = productTokens.join(" ").replace(/^[-:]+/, "").trim();

  return {
    quantidade,
    unidade,
    produtoTexto,
  };
}

function parseQuickOrderText(
  value: string,
  productList: Product[],
  productOverrides: Record<string, string>,
  unitOverrides: Record<string, Unit>,
): QuickOrderLine[] {
  return value.split(/\r?\n/).reduce<QuickOrderLine[]>((lines, rawLine, index) => {
      const raw = rawLine.trim();
      const normalizedLine = raw.replace(/[|;]+/g, " ").replace(/\s+/g, " ").trim();

      if (isIgnoredQuickOrderLine(normalizedLine)) {
        return lines;
      }

      const id = getQuickOrderLineId(index, normalizedLine);
      const { quantidade, unidade: parsedUnit, produtoTexto } = extractQuickOrderLineParts(normalizedLine);

      if (!Number.isFinite(quantidade)) {
        const informedUnit = unitOverrides[id] ?? parsedUnit ?? null;

        lines.push({
          id,
          raw,
          quantidade: null,
          unidade: informedUnit ?? "caixa",
          informedUnit,
          produtoTexto: normalizedLine,
          selectedProductId: productOverrides[id] ?? "",
          status: "invalid",
        });
        return lines;
      }

      const overrideProduct = productOverrides[id]
        ? productList.find((product) => product.id === productOverrides[id])
        : undefined;
      const requestedUnit = unitOverrides[id] ?? parsedUnit;
      const matchedProduct = overrideProduct ?? findProductByTextAndUnit(produtoTexto, productList, requestedUnit);
      const requestedUnitIsAccepted = Boolean(
        matchedProduct && requestedUnit && getProductOrderUnits(matchedProduct).includes(requestedUnit),
      );
      const unidade =
        matchedProduct && requestedUnitIsAccepted
          ? requestedUnit!
          : matchedProduct?.unidadePadrao ?? requestedUnit ?? "caixa";
      const hasUnitConflict = Boolean(
        matchedProduct && requestedUnit && !getProductOrderUnits(matchedProduct).includes(requestedUnit),
      );

      if (!Number.isFinite(quantidade) || quantidade <= 0 || !produtoTexto) {
        lines.push({
          id,
          raw,
          quantidade: Number.isFinite(quantidade) ? quantidade : null,
          unidade,
          informedUnit: requestedUnit ?? null,
          produtoTexto,
          selectedProductId: matchedProduct?.id ?? "",
          status: "invalid",
        });
        return lines;
      }

      lines.push({
        id,
        raw,
        quantidade,
        unidade,
        informedUnit: requestedUnit ?? null,
        produtoTexto,
        selectedProductId: matchedProduct?.id ?? "",
        status: matchedProduct ? (hasUnitConflict ? "unit-conflict" : "ready") : "needs-product",
      });
      return lines;
    }, []);
}

function sortClientsByName(clientList: Client[]): Client[] {
  return [...clientList].sort((first, second) =>
    first.nome.localeCompare(second.nome, "pt-BR", {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), TEMP_DOWNLOAD_URL_TTL);
}

function useAppNavigationGuard() {
  useEffect(() => {
    const guardState = { hortigiroGuard: true };
    let touchStartX = 0;
    let touchStartY = 0;

    function pushGuardState() {
      window.history.pushState(guardState, "", window.location.href);
    }

    window.history.replaceState(guardState, "", window.location.href);
    pushGuardState();

    function handlePopState() {
      pushGuardState();
    }

    function handlePageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        pushGuardState();
      }
    }

    function handleTouchStart(event: TouchEvent) {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }

    function handleTouchMove(event: TouchEvent) {
      const touch = event.touches[0];

      if (!touch) {
        return;
      }

      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const startedNearEdge = touchStartX < 32 || touchStartX > window.innerWidth - 32;
      const isHorizontalSwipe = Math.abs(deltaX) > 18 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

      if (startedNearEdge && isHorizontalSwipe) {
        event.preventDefault();
      }
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);
}

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      return storedValue ? (JSON.parse(storedValue) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    aberto: "Aberto",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

  return labels[status];
}

function buildConsolidatedItems(orders: Order[], productById: ReadonlyMap<string, Product>): ConsolidatedItem[] {
  const grouped = new Map<string, ConsolidatedItem>();

  orders
    .filter((order) => order.status !== "cancelado")
    .forEach((order) => {
      order.itens.forEach((item) => {
        const product = productById.get(item.produtoId);
        const productName = product?.nome ?? item.produtoNome;
        const unit = item.unidade;
        const key = `${item.produtoId}:${unit}`;
        const current = grouped.get(key);

        if (current) {
          grouped.set(key, {
            ...current,
            quantidade: current.quantidade + item.quantidade,
          });
          return;
        }

        grouped.set(key, {
          produtoId: item.produtoId,
          produtoNome: productName,
          quantidade: item.quantidade,
          unidade: unit,
        });
      });
    });

  return Array.from(grouped.values()).sort((first, second) =>
    first.produtoNome.localeCompare(second.produtoNome, "pt-BR"),
  );
}

function buildProductDemands(
  orders: Order[],
  productById: ReadonlyMap<string, Product>,
): ProductDemand[] {
  const grouped = new Map<string, ProductDemand>();

  buildConsolidatedItems(orders, productById).forEach((item) => {
    const current = grouped.get(item.produtoId);

    if (current) {
      current.quantities.push({
        quantidade: item.quantidade,
        unidade: item.unidade,
      });
      return;
    }

    grouped.set(item.produtoId, {
      produtoId: item.produtoId,
      produtoNome: item.produtoNome,
      quantities: [
        {
          quantidade: item.quantidade,
          unidade: item.unidade,
        },
      ],
    });
  });

  return Array.from(grouped.values()).sort((first, second) =>
    first.produtoNome.localeCompare(second.produtoNome, "pt-BR"),
  );
}

function formatProductDemand(demand: ProductDemand): string {
  return demand.quantities
    .map((quantity) => formatQuantityWithUnit(quantity.quantidade, quantity.unidade))
    .join(" + ");
}

function App() {
  useAppNavigationGuard();

  const [restoredOrderDraft] = useState(loadOrderDraftSnapshot);
  const [settings, setSettings] = usePersistentState<AppSettings>("hortigiro.settings", initialSettings);
  const [routes, setRoutes] = usePersistentState<Route[]>("hortigiro.routes", initialRoutes);
  const [clients, setClients] = usePersistentState<Client[]>("hortigiro.clients", initialClients);
  const [products, setProducts] = usePersistentState<Product[]>("hortigiro.products", initialProducts);
  const [orders, setOrders] = usePersistentState<Order[]>("hortigiro.orders", initialOrders);
  const [checkedItems, setCheckedItems] = usePersistentState<Record<string, boolean>>(
    "hortigiro.checkedItems",
    {},
  );
  const [purchasePlans, setPurchasePlans] = usePersistentState<Record<string, PurchasePlanEntry>>(
    "hortigiro.purchasePlans",
    {},
  );
  const [theme, setTheme] = usePersistentState<ThemeMode>("hortigiro.theme", "dark");

  const [view, setView] = useState<View>("home");
  const [selectedRouteId, setSelectedRouteId] = usePersistentState<string>(
    "hortigiro.selectedRouteId",
    restoredOrderDraft?.routeId ?? DEFAULT_ROUTE_ID,
  );
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(getNextDeliveryDate());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(
    restoredOrderDraft?.editingOrderId ?? null,
  );
  const [orderDraftActive, setOrderDraftActive] = useState(Boolean(restoredOrderDraft?.active));
  const [restoringOrderDraft, setRestoringOrderDraft] = useState(Boolean(restoredOrderDraft?.active));

  const [orderClientId, setOrderClientId] = useState(
    restoredOrderDraft?.orderClientId ?? initialClients[0]?.id ?? "",
  );
  const [orderDeliveryDate, setOrderDeliveryDate] = useState(
    restoredOrderDraft?.orderDeliveryDate ?? getTomorrowDate(),
  );
  const [orderObservation, setOrderObservation] = useState(restoredOrderDraft?.orderObservation ?? "");
  const [draftItems, setDraftItems] = useState<DraftItem[]>(restoredOrderDraft?.draftItems ?? []);
  const [productSearch, setProductSearch] = useState(restoredOrderDraft?.productSearch ?? "");
  const [selectedProductId, setSelectedProductId] = useState(
    restoredOrderDraft?.selectedProductId ?? initialProducts[0]?.id ?? "",
  );
  const [selectedOrderUnit, setSelectedOrderUnit] = useState<Unit>(
    restoredOrderDraft?.selectedOrderUnit ?? "caixa",
  );
  const [quantity, setQuantity] = useState(restoredOrderDraft?.quantity ?? "1");
  const [quickOrderOpen, setQuickOrderOpen] = useState(restoredOrderDraft?.quickOrderOpen ?? false);
  const [quickOrderText, setQuickOrderText] = useState(restoredOrderDraft?.quickOrderText ?? "");
  const [quickOrderProductOverrides, setQuickOrderProductOverrides] = useState<Record<string, string>>(
    restoredOrderDraft?.quickOrderProductOverrides ?? {},
  );
  const [quickOrderUnitOverrides, setQuickOrderUnitOverrides] = useState<Record<string, Unit>>(
    restoredOrderDraft?.quickOrderUnitOverrides ?? {},
  );
  const [quickOrderMessage, setQuickOrderMessage] = useState("");
  const [quickOrderPickerLineId, setQuickOrderPickerLineId] = useState<string | null>(null);
  const [quickOrderPickerSearch, setQuickOrderPickerSearch] = useState("");
  const [pendingQuickOrderProductLineId, setPendingQuickOrderProductLineId] = useState<string | null>(
    null,
  );

  const [clientSearch, setClientSearch] = useState("");
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [productCatalogSearch, setProductCatalogSearch] = useState("");
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [catalogMessage, setCatalogMessage] = useState("");
  const productFormSectionRef = useRef<HTMLElement | null>(null);
  const productNameInputRef = useRef<HTMLInputElement | null>(null);
  const [routeName, setRouteName] = useState("");
  const [backupMessage, setBackupMessage] = useState("");

  const appName = FIXED_APP_NAME;
  const companyName = settings.companyName.trim() || initialSettings.companyName;
  const logoSrc = DEFAULT_LOGO_SRC;

  const activeRoutes = useMemo(() => routes.filter((route) => route.ativo), [routes]);
  const activeClients = useMemo(
    () => sortClientsByName(clients.filter((client) => client.ativo)),
    [clients],
  );
  const activeClientsForSelectedRoute = useMemo(
    () => activeClients.filter((client) => getRouteFallback(client.routeId) === selectedRouteId),
    [activeClients, selectedRouteId],
  );
  const activeProducts = useMemo(
    () => sortProductsByName(products.filter((product) => product.ativo)),
    [products],
  );
  const selectedProduct = useMemo(
    () => activeProducts.find((product) => product.id === selectedProductId),
    [activeProducts, selectedProductId],
  );

  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) ?? routes[0],
    [routes, selectedRouteId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--primary", FIXED_PRIMARY_COLOR);
    document.documentElement.style.setProperty("--primary-hover", "#236f19");
  }, []);

  useEffect(() => {
    if (restoredOrderDraft?.active && restoredOrderDraft.routeId) {
      setSelectedRouteId(restoredOrderDraft.routeId);
    }
    setRestoringOrderDraft(false);
  }, [restoredOrderDraft, setSelectedRouteId]);

  useEffect(() => {
    if (!orderDraftActive) {
      localStorage.removeItem(ORDER_DRAFT_STORAGE_KEY);
      return;
    }

    const snapshot: OrderDraftSnapshot = {
      version: 1,
      active: true,
      editingOrderId,
      routeId: selectedRouteId,
      orderClientId,
      orderDeliveryDate,
      orderObservation,
      draftItems,
      productSearch,
      selectedProductId,
      selectedOrderUnit,
      quantity,
      quickOrderOpen,
      quickOrderText,
      quickOrderProductOverrides,
      quickOrderUnitOverrides,
    };

    localStorage.setItem(ORDER_DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
  }, [
    draftItems,
    editingOrderId,
    orderClientId,
    orderDeliveryDate,
    orderDraftActive,
    orderObservation,
    productSearch,
    quantity,
    quickOrderOpen,
    quickOrderProductOverrides,
    quickOrderText,
    quickOrderUnitOverrides,
    selectedProductId,
    selectedOrderUnit,
    selectedRouteId,
  ]);

  useEffect(() => {
    if (!activeRoutes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(activeRoutes[0]?.id ?? DEFAULT_ROUTE_ID);
    }
  }, [activeRoutes, selectedRouteId, setSelectedRouteId]);

  useEffect(() => {
    if (restoringOrderDraft) {
      return;
    }

    const selectedClientBelongsToRoute = activeClientsForSelectedRoute.some(
      (client) => client.id === orderClientId,
    );

    if (!selectedClientBelongsToRoute) {
      setOrderClientId(activeClientsForSelectedRoute[0]?.id ?? "");
    }
  }, [activeClientsForSelectedRoute, orderClientId, restoringOrderDraft]);

  useEffect(() => {
    if (!selectedProductId && activeProducts[0]) {
      setSelectedProductId(activeProducts[0].id);
    }
  }, [activeProducts, selectedProductId]);

  useEffect(() => {
    if (view !== "products" || (!pendingQuickOrderProductLineId && !editingProductId)) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      productFormSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      productNameInputRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [editingProductId, pendingQuickOrderProductLineId, view]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    if (!getProductOrderUnits(selectedProduct).includes(selectedOrderUnit)) {
      setSelectedOrderUnit(selectedProduct.unidadePadrao);
    }
  }, [selectedOrderUnit, selectedProduct]);

  useEffect(() => {
    if (localStorage.getItem(PRODUCT_CATALOG_REVISION_STORAGE_KEY) === PRODUCT_CATALOG_REVISION) {
      return;
    }

    const migration = buildProductCatalogMigration(products);

    setProducts(
      JSON.stringify(products) === JSON.stringify(migration.products) ? products : migration.products,
    );
    setOrders((current) => remapOrderProductIds(current, migration.productIdMap, migration.products));
    setCheckedItems((current) => remapProductRecordKeys(current, migration.productIdMap));
    setPurchasePlans((current) => remapProductRecordKeys(current, migration.productIdMap));
    setDraftItems((current) =>
      remapOrderProductIds(
        [
          {
            id: "draft-migration",
            clienteId: orderClientId,
            routeId: selectedRouteId,
            dataLancamento: toDateInputValue(new Date()),
            dataEntrega: orderDeliveryDate,
            status: "aberto",
            observacaoGeral: orderObservation,
            itens: current,
            criadoEm: "",
            atualizadoEm: "",
          },
        ],
        migration.productIdMap,
        migration.products,
      )[0].itens,
    );
    setSelectedProductId((current) => migration.productIdMap[current] ?? current);
    localStorage.setItem(PRODUCT_CATALOG_REVISION_STORAGE_KEY, PRODUCT_CATALOG_REVISION);
  }, [
    orderClientId,
    orderDeliveryDate,
    orderObservation,
    products,
    selectedRouteId,
    setCheckedItems,
    setOrders,
    setProducts,
    setPurchasePlans,
  ]);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );
  const productById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  function getOrderRouteId(order: Order) {
    return getRouteFallback(order.routeId ?? clientById.get(order.clienteId)?.routeId);
  }

  useEffect(() => {
    const mergedOrders: Order[] = [];
    const orderIndexByKey = new Map<string, number>();
    let changed = false;

    orders.forEach((order) => {
      const routeId = getOrderRouteId(order);
      const key = `${order.dataEntrega}:${order.clienteId}:${routeId}`;
      const normalizedItems = mergeOrderItems(order.itens);
      const currentIndex = orderIndexByKey.get(key);

      if (currentIndex === undefined) {
        orderIndexByKey.set(key, mergedOrders.length);
        mergedOrders.push({
          ...order,
          routeId,
          itens: normalizedItems,
        });

        if (order.routeId !== routeId || normalizedItems.length !== order.itens.length) {
          changed = true;
        }
        return;
      }

      const currentOrder = mergedOrders[currentIndex];
      const observations = [currentOrder.observacaoGeral, order.observacaoGeral]
        .map((observation) => observation.trim())
        .filter(Boolean);
      const uniqueObservations = Array.from(new Set(observations));

      mergedOrders[currentIndex] = {
        ...currentOrder,
        status:
          currentOrder.status === "aberto" || order.status === "aberto"
            ? "aberto"
            : currentOrder.status === "entregue" || order.status === "entregue"
              ? "entregue"
              : "cancelado",
        observacaoGeral: uniqueObservations.join(" | "),
        itens: mergeOrderItems([...currentOrder.itens, ...normalizedItems]),
        atualizadoEm:
          currentOrder.atualizadoEm > order.atualizadoEm ? currentOrder.atualizadoEm : order.atualizadoEm,
      };
      changed = true;
    });

    if (changed) {
      setOrders(mergedOrders);
    }
  }, [clientById, orders, setOrders]);

  const ordersForSelectedDate = useMemo(
    () => orders.filter((order) => order.dataEntrega === selectedDeliveryDate),
    [orders, selectedDeliveryDate],
  );

  const ordersForSelectedDelivery = useMemo(
    () =>
      ordersForSelectedDate.filter((order) => getOrderRouteId(order) === selectedRouteId),
    [clientById, ordersForSelectedDate, selectedRouteId],
  );

  const consolidatedItems = useMemo(
    () => buildConsolidatedItems(ordersForSelectedDelivery, productById),
    [ordersForSelectedDelivery, productById],
  );

  const consolidatedAllItems = useMemo(
    () => buildConsolidatedItems(ordersForSelectedDate, productById),
    [ordersForSelectedDate, productById],
  );
  const allProductDemands = useMemo(
    () => buildProductDemands(ordersForSelectedDate, productById),
    [ordersForSelectedDate, productById],
  );

  const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) : undefined;

  const filteredProducts = useMemo(() => {
    const search = normalizeText(productSearch);
    return activeProducts.filter((product) => normalizeText(product.nome).includes(search));
  }, [activeProducts, productSearch]);

  const quickOrderLines = useMemo(
    () =>
      parseQuickOrderText(
        quickOrderText,
        activeProducts,
        quickOrderProductOverrides,
        quickOrderUnitOverrides,
      ),
    [activeProducts, quickOrderProductOverrides, quickOrderText, quickOrderUnitOverrides],
  );

  const quickOrderReadyCount = quickOrderLines.filter((line) => line.status === "ready").length;
  const quickOrderReviewCount = quickOrderLines.filter((line) => line.status !== "ready").length;
  const quickOrderPickerLine = quickOrderPickerLineId
    ? quickOrderLines.find((line) => line.id === quickOrderPickerLineId)
    : undefined;
  const quickOrderPickerProducts = useMemo(() => {
    const search = normalizeText(quickOrderPickerSearch.trim());

    if (!search) {
      return activeProducts;
    }

    return activeProducts.filter((product) => {
      const productName = normalizeText(product.nome);
      const searchTokens = search.split(/\s+/).filter(Boolean);
      return productName.includes(search) || searchTokens.every((token) => productName.includes(token));
    });
  }, [activeProducts, quickOrderPickerSearch]);

  const filteredClients = useMemo(() => {
    const search = normalizeText(clientSearch);
    return sortClientsByName(
      clients.filter(
        (client) =>
          getRouteFallback(client.routeId) === selectedRouteId &&
          [client.nome, client.telefone, client.endereco].some((field) =>
            normalizeText(field).includes(search),
          ),
      ),
    );
  }, [clients, clientSearch, selectedRouteId]);

  const filteredCatalogProducts = useMemo(() => {
    const search = normalizeText(productCatalogSearch);
    return sortProductsByName(products.filter((product) => normalizeText(product.nome).includes(search)));
  }, [products, productCatalogSearch]);

  const duplicateProduct = useMemo(() => {
    const normalizedName = getProductNameKey(productForm.nome.trim());

    if (!normalizedName) {
      return undefined;
    }

    return products.find(
      (product) => product.id !== editingProductId && getProductNameKey(product.nome.trim()) === normalizedName,
    );
  }, [editingProductId, productForm.nome, products]);

  const suggestedProductsToImport = useMemo(() => {
    const currentProductKeys = new Set(products.map((product) => getProductNameKey(product.nome)));
    return suggestedProducts.filter((product) => !currentProductKeys.has(getProductNameKey(product.nome)));
  }, [products]);

  const summary = useMemo(() => {
    const activeOrders = ordersForSelectedDelivery.filter((order) => order.status !== "cancelado");
    return {
      pedidos: activeOrders.length,
      clientes: new Set(activeOrders.map((order) => order.clienteId)).size,
      itens: consolidatedItems.length,
      entregues: activeOrders.filter((order) => order.status === "entregue").length,
    };
  }, [consolidatedItems.length, ordersForSelectedDelivery]);

  const allSummary = useMemo(() => {
    const activeOrders = ordersForSelectedDate.filter((order) => order.status !== "cancelado");
    return {
      pedidos: activeOrders.length,
      clientes: new Set(activeOrders.map((order) => order.clienteId)).size,
      itens: allProductDemands.length,
    };
  }, [allProductDemands.length, ordersForSelectedDate]);

  const routePurchaseSummaries = useMemo(
    () =>
      activeRoutes.map((route) => {
        const routeOrders = ordersForSelectedDate.filter((order) => getOrderRouteId(order) === route.id);
        const demands = buildProductDemands(routeOrders, productById);
        const routeActiveOrders = routeOrders.filter((order) => order.status !== "cancelado");

        return {
          route,
          pedidos: routeActiveOrders.length,
          clientes: new Set(routeActiveOrders.map((order) => order.clienteId)).size,
          itens: demands.length,
          demands,
        };
      }),
    [activeRoutes, clientById, ordersForSelectedDate, productById],
  );

  function openView(nextView: View) {
    if (nextView !== "order-detail") {
      setSelectedOrderId(null);
    }

    setView(nextView);
  }

  function toggleTheme() {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }

  function handleRouteChange(routeId: string) {
    setSelectedRouteId(routeId);
    setClientForm((current) => ({ ...current, routeId }));
  }

  function normalizeDraftItemsToProductDefaults(items: DraftItem[]): DraftItem[] {
    return items.map((item) => {
      const product = productById.get(item.produtoId);

      if (!product) {
        return item;
      }

      return {
        ...item,
        produtoNome: product.nome,
        unidade: getProductOrderUnits(product).includes(item.unidade) ? item.unidade : product.unidadePadrao,
      };
    });
  }

  function resetQuickOrder() {
    setQuickOrderOpen(false);
    setQuickOrderText("");
    setQuickOrderProductOverrides({});
    setQuickOrderUnitOverrides({});
    setQuickOrderMessage("");
    setQuickOrderPickerLineId(null);
    setQuickOrderPickerSearch("");
    setPendingQuickOrderProductLineId(null);
  }

  function startNewOrder() {
    if (orderDraftActive) {
      openView("new-order");
      return;
    }

    setEditingOrderId(null);
    setOrderClientId(activeClientsForSelectedRoute[0]?.id ?? "");
    setOrderDeliveryDate(getTomorrowDate());
    setOrderObservation("");
    setDraftItems([]);
    setProductSearch("");
    setSelectedProductId(activeProducts[0]?.id ?? "");
    setSelectedOrderUnit(activeProducts[0]?.unidadePadrao ?? "caixa");
    setQuantity("1");
    resetQuickOrder();
    setOrderDraftActive(true);
    openView("new-order");
  }

  function editOrder(order: Order) {
    setEditingOrderId(order.id);
    setOrderClientId(order.clienteId);
    setOrderDeliveryDate(order.dataEntrega);
    setOrderObservation(order.observacaoGeral);
    setDraftItems(order.itens);
    setProductSearch("");
    setSelectedProductId(activeProducts[0]?.id ?? "");
    setSelectedOrderUnit(activeProducts[0]?.unidadePadrao ?? "caixa");
    setQuantity("1");
    resetQuickOrder();
    setOrderDraftActive(true);
    openView("new-order");
  }

  function discardOrderDraft() {
    if (!window.confirm("Descartar o pedido em andamento? Esta ação não pode ser desfeita.")) {
      return;
    }

    setEditingOrderId(null);
    setOrderObservation("");
    setDraftItems([]);
    setProductSearch("");
    setSelectedOrderUnit(activeProducts[0]?.unidadePadrao ?? "caixa");
    setQuantity("1");
    resetQuickOrder();
    setOrderDraftActive(false);
    openView("orders");
  }

  function addDraftItem() {
    const parsedQuantity = parseQuantity(quantity);

    if (!selectedProduct || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    setDraftItems((current) => {
      const existingItem = current.find(
        (item) => item.produtoId === selectedProduct.id && item.unidade === selectedOrderUnit,
      );

      if (existingItem) {
        return current.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantidade: item.quantidade + parsedQuantity,
              }
            : item,
        );
      }

      return [
        ...current,
        {
          id: `draft-${Date.now()}`,
          produtoId: selectedProduct.id,
          produtoNome: selectedProduct.nome,
          quantidade: parsedQuantity,
          unidade: selectedOrderUnit,
          observacao: "",
        },
      ];
    });
    setQuantity("1");
    setProductSearch("");
  }

  function updateQuickOrderProduct(lineId: string, productId: string) {
    setQuickOrderProductOverrides((current) => ({ ...current, [lineId]: productId }));
    setQuickOrderMessage("");
  }

  function openQuickOrderProductPicker(line: QuickOrderLine) {
    setQuickOrderPickerLineId(line.id);
    setQuickOrderPickerSearch(line.produtoTexto);
  }

  function selectQuickOrderProduct(productId: string) {
    if (!quickOrderPickerLineId) {
      return;
    }

    updateQuickOrderProduct(quickOrderPickerLineId, productId);
    setQuickOrderPickerLineId(null);
    setQuickOrderPickerSearch("");
  }

  function startProductRegistrationFromQuickOrder() {
    if (!quickOrderPickerLine) {
      return;
    }

    setPendingQuickOrderProductLineId(quickOrderPickerLine.id);
    setEditingProductId(null);
    setProductForm({
      nome: quickOrderPickerLine.produtoTexto,
      unidadePadrao: quickOrderPickerLine.informedUnit ?? quickOrderPickerLine.unidade,
      unidadesPedido: [quickOrderPickerLine.informedUnit ?? quickOrderPickerLine.unidade],
      unidadeCompra: quickOrderPickerLine.informedUnit ?? quickOrderPickerLine.unidade,
    });
    setProductCatalogSearch("");
    setCatalogMessage("Cadastre o produto para continuar o pedido em andamento.");
    setQuickOrderPickerLineId(null);
    setQuickOrderPickerSearch("");
    openView("products");
  }

  function updateQuickOrderUnit(lineId: string, unit: Unit) {
    setQuickOrderUnitOverrides((current) => ({ ...current, [lineId]: unit }));
    setQuickOrderMessage("");
  }

  function addQuickOrderItems() {
    const readyLines = quickOrderLines.filter(
      (line) => line.status === "ready" && line.quantidade && line.selectedProductId,
    );
    const remainingLines = quickOrderLines.filter((line) => line.status !== "ready");
    const itemsToAdd = readyLines
      .map((line, index) => {
        const product = activeProducts.find((currentProduct) => currentProduct.id === line.selectedProductId);

        if (!product || !line.quantidade) {
          return undefined;
        }

        return {
          id: `quick-${Date.now()}-${index}-${product.id}`,
          produtoId: product.id,
          produtoNome: product.nome,
          quantidade: line.quantidade,
          unidade: line.unidade,
          observacao: "",
        } satisfies DraftItem;
      })
      .filter((item): item is DraftItem => Boolean(item));

    if (itemsToAdd.length === 0) {
      setQuickOrderMessage("Nenhum item pronto para adicionar.");
      return;
    }

    setDraftItems((current) =>
      mergeDraftItems(normalizeDraftItemsToProductDefaults([...current.map((item) => ({ ...item })), ...itemsToAdd])),
    );

    if (remainingLines.length > 0) {
      const nextProductOverrides: Record<string, string> = {};
      const nextUnitOverrides: Record<string, Unit> = {};

      remainingLines.forEach((line, index) => {
        const nextId = getQuickOrderLineId(index, line.raw);
        const productOverride = quickOrderProductOverrides[line.id];
        const unitOverride = quickOrderUnitOverrides[line.id];

        if (productOverride) {
          nextProductOverrides[nextId] = productOverride;
        }

        if (unitOverride) {
          nextUnitOverrides[nextId] = unitOverride;
        }
      });

      setQuickOrderText(remainingLines.map((line) => line.raw).join("\n"));
      setQuickOrderProductOverrides(nextProductOverrides);
      setQuickOrderUnitOverrides(nextUnitOverrides);
      setQuickOrderMessage(
        `${itemsToAdd.length} ${itemsToAdd.length === 1 ? "item adicionado" : "itens adicionados"}. ` +
          `${remainingLines.length} ${remainingLines.length === 1 ? "linha continua" : "linhas continuam"} para revisão.`,
      );
      setQuickOrderOpen(true);
      return;
    }

    setQuickOrderText("");
    setQuickOrderProductOverrides({});
    setQuickOrderUnitOverrides({});
    setQuickOrderMessage(
      `${itemsToAdd.length} ${itemsToAdd.length === 1 ? "item adicionado" : "itens adicionados"}.`,
    );
    setQuickOrderOpen(false);
  }

  function removeDraftItem(itemId: string) {
    setDraftItems((current) => current.filter((item) => item.id !== itemId));
  }

  function handleQuantityStep(step: number) {
    const currentQuantity = parseQuantity(quantity);
    const nextQuantity = Number.isFinite(currentQuantity) ? Math.max(0.5, currentQuantity + step) : 1;
    setQuantity(String(nextQuantity).replace(".", ","));
  }

  function saveOrder() {
    if (!orderClientId || draftItems.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const normalizedItems: OrderItem[] = mergeDraftItems(normalizeDraftItemsToProductDefaults(draftItems)).map((item) => ({
      ...item,
      id: item.id.startsWith("draft-") ? `item-${Date.now()}-${item.produtoId}` : item.id,
    }));

    if (editingOrderId) {
      setOrders((current) =>
        current.map((order) =>
          order.id === editingOrderId
            ? {
                ...order,
                clienteId: orderClientId,
                routeId: selectedRouteId,
                dataEntrega: orderDeliveryDate,
                observacaoGeral: orderObservation,
                itens: normalizedItems,
                atualizadoEm: now,
              }
            : order,
        ),
      );
    } else {
      const newOrder: Order = {
        id: `pedido-${Date.now()}`,
        clienteId: orderClientId,
        routeId: selectedRouteId,
        dataLancamento: toDateInputValue(new Date()),
        dataEntrega: orderDeliveryDate,
        status: "aberto",
        observacaoGeral: orderObservation,
        itens: normalizedItems,
        criadoEm: now,
        atualizadoEm: now,
      };

      setOrders((current) => {
        const existingOrder = current.find(
          (order) =>
            order.clienteId === orderClientId &&
            order.dataEntrega === orderDeliveryDate &&
            getOrderRouteId(order) === selectedRouteId,
        );

        if (!existingOrder) {
          return [newOrder, ...current];
        }

        const observations = [existingOrder.observacaoGeral, orderObservation]
          .map((observation) => observation.trim())
          .filter(Boolean);
        const uniqueObservations = Array.from(new Set(observations));

        return current.map((order) =>
          order.id === existingOrder.id
            ? {
                ...order,
                routeId: selectedRouteId,
                status: "aberto",
                observacaoGeral: uniqueObservations.join(" | "),
                itens: mergeOrderItems([...order.itens, ...normalizedItems]),
                atualizadoEm: now,
              }
            : order,
        );
      });
    }

    setSelectedDeliveryDate(orderDeliveryDate);
    setEditingOrderId(null);
    setDraftItems([]);
    resetQuickOrder();
    setOrderDraftActive(false);
    openView("orders");
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status, atualizadoEm: new Date().toISOString() } : order,
      ),
    );
  }

  function resetClientForm(nextRouteId = selectedRouteId) {
    setEditingClientId(null);
    setClientForm({ ...emptyClientForm, routeId: nextRouteId });
  }

  function startClientEdit(client: Client) {
    setEditingClientId(client.id);
    setClientForm({
      nome: client.nome,
      telefone: client.telefone,
      endereco: client.endereco,
      observacaoPadrao: client.observacaoPadrao,
      routeId: getRouteFallback(client.routeId),
    });
    setSelectedRouteId(getRouteFallback(client.routeId));
  }

  function saveClient() {
    if (!clientForm.nome.trim()) {
      return;
    }

    const clientRouteId = clientForm.routeId || selectedRouteId;

    if (editingClientId) {
      setClients((current) =>
        sortClientsByName(
          current.map((client) =>
            client.id === editingClientId
              ? {
                  ...client,
                  nome: clientForm.nome.trim(),
                  telefone: clientForm.telefone.trim(),
                  endereco: clientForm.endereco.trim(),
                  observacaoPadrao: clientForm.observacaoPadrao.trim(),
                  routeId: clientRouteId,
                }
              : client,
          ),
        ),
      );
      setSelectedRouteId(clientRouteId);
      resetClientForm(clientRouteId);
      return;
    }

    const client: Client = {
      id: `cliente-${Date.now()}`,
      nome: clientForm.nome.trim(),
      telefone: clientForm.telefone.trim(),
      endereco: clientForm.endereco.trim(),
      observacaoPadrao: clientForm.observacaoPadrao.trim(),
      routeId: clientRouteId,
      ativo: true,
    };

    setClients((current) => sortClientsByName([...current, client]));
    setSelectedRouteId(clientRouteId);
    setOrderClientId(client.id);
    resetClientForm(clientRouteId);
  }

  function addRoute() {
    const routeNameValue = routeName.trim();

    if (!routeNameValue) {
      return;
    }

    const routeExists = routes.some((route) => normalizeText(route.nome) === normalizeText(routeNameValue));

    if (routeExists) {
      setRouteName("");
      return;
    }

    const route: Route = {
      id: `route-${Date.now()}`,
      nome: routeNameValue,
      ativo: true,
    };

    setRoutes((current) => [route, ...current]);
    setSelectedRouteId(route.id);
    setClientForm((current) => ({ ...current, routeId: route.id }));
    setRouteName("");
  }

  function updateRouteName(routeId: string, nome: string) {
    setRoutes((current) =>
      current.map((route) => (route.id === routeId ? { ...route, nome } : route)),
    );
  }

  function toggleRouteStatus(routeId: string) {
    setRoutes((current) =>
      current.map((route) => (route.id === routeId ? { ...route, ativo: !route.ativo } : route)),
    );
  }

  function moveRoute(routeId: string, direction: -1 | 1) {
    setRoutes((current) => {
      const routeIndex = current.findIndex((route) => route.id === routeId);
      const targetIndex = routeIndex + direction;

      if (routeIndex < 0 || targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const nextRoutes = [...current];
      const [route] = nextRoutes.splice(routeIndex, 1);
      nextRoutes.splice(targetIndex, 0, route);
      return nextRoutes;
    });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(emptyProductForm);
  }

  function startProductEdit(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      nome: product.nome,
      unidadePadrao: product.unidadePadrao,
      unidadesPedido: getProductOrderUnits(product),
      unidadeCompra: getProductPurchaseUnit(product),
    });
    setProductCatalogSearch("");
  }

  function saveProduct() {
    const productName = productForm.nome.trim();

    if (!productName || duplicateProduct) {
      return;
    }

    if (editingProductId) {
      setProducts((current) =>
        sortProductsByName(
          current.map((product) =>
            product.id === editingProductId
              ? {
                  ...product,
                  nome: productName,
                  unidadePadrao: productForm.unidadePadrao,
                  unidadesPedido: Array.from(
                    new Set([productForm.unidadePadrao, ...productForm.unidadesPedido]),
                  ),
                  unidadeCompra: productForm.unidadeCompra,
                }
              : product,
          ),
        ),
      );
      setOrders((current) =>
        current.map((order) => ({
          ...order,
          itens: order.itens.map((item) =>
            item.produtoId === editingProductId ? { ...item, produtoNome: productName } : item,
          ),
        })),
      );
      resetProductForm();
      return;
    }

    const product: Product = {
      id: `produto-${Date.now()}`,
      nome: productName,
      unidadePadrao: productForm.unidadePadrao,
      unidadesPedido: Array.from(new Set([productForm.unidadePadrao, ...productForm.unidadesPedido])),
      unidadeCompra: productForm.unidadeCompra,
      ativo: true,
    };

    setProducts((current) => sortProductsByName([...current, product]));
    setSelectedProductId(product.id);
    resetProductForm();

    if (pendingQuickOrderProductLineId) {
      updateQuickOrderProduct(pendingQuickOrderProductLineId, product.id);
      setPendingQuickOrderProductLineId(null);
      setCatalogMessage("");
      openView("new-order");
    }
  }

  function importSuggestedProductCatalog() {
    if (suggestedProductsToImport.length === 0) {
      setCatalogMessage("Base sugerida já está cadastrada.");
      return;
    }

    const importedAt = Date.now();
    const productsToAdd = suggestedProductsToImport.map((product, index) => ({
      ...product,
      id: `produto-sugerido-${importedAt}-${index}`,
      ativo: true,
    }));

    setProducts((current) => sortProductsByName([...current, ...productsToAdd]));
    setSelectedProductId(productsToAdd[0]?.id ?? selectedProductId);
    setCatalogMessage(`${productsToAdd.length} produtos adicionados.`);
  }

  function toggleProductStatus(productId: string) {
    setProducts((current) =>
      current.map((product) =>
        product.id === productId ? { ...product, ativo: !product.ativo } : product,
      ),
    );
  }

  function toggleClientStatus(clientId: string) {
    setClients((current) =>
      sortClientsByName(
        current.map((client) => (client.id === clientId ? { ...client, ativo: !client.ativo } : client)),
      ),
    );
  }

  function updateClientRoute(clientId: string, routeId: string) {
    setClients((current) =>
      sortClientsByName(
        current.map((client) => (client.id === clientId ? { ...client, routeId } : client)),
      ),
    );
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings((current) => ({ ...initialSettings, ...current, ...patch }));
  }

  function exportBackup() {
    const payload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        ...initialSettings,
        companyName,
      },
      routes,
      clients,
      products,
      orders,
      checkedItems,
      purchasePlans,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });

    downloadBlob(blob, `hortigiro-backup-${toDateInputValue(new Date())}.json`);
    setBackupMessage("Backup exportado.");
  }

  function importBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(String(reader.result)) as Partial<BackupPayload>;

        if (
          !Array.isArray(payload.routes) ||
          !Array.isArray(payload.clients) ||
          !Array.isArray(payload.products) ||
          !Array.isArray(payload.orders)
        ) {
          throw new Error("Arquivo invalido");
        }

        setSettings({
          ...initialSettings,
          companyName: payload.settings?.companyName ?? initialSettings.companyName,
        });
        const productMigration = buildProductCatalogMigration(payload.products);
        const importedOrders = remapOrderProductIds(
          payload.orders,
          productMigration.productIdMap,
          productMigration.products,
        );

        setRoutes(payload.routes);
        setClients(sortClientsByName(payload.clients));
        setProducts(productMigration.products);
        setOrders(importedOrders);
        setCheckedItems(remapProductRecordKeys(payload.checkedItems ?? {}, productMigration.productIdMap));
        setPurchasePlans(remapProductRecordKeys(payload.purchasePlans ?? {}, productMigration.productIdMap));
        localStorage.setItem(PRODUCT_CATALOG_REVISION_STORAGE_KEY, PRODUCT_CATALOG_REVISION);
        setSelectedRouteId(payload.routes.find((route) => route.ativo)?.id ?? DEFAULT_ROUTE_ID);
        setSelectedOrderId(null);
        setEditingOrderId(null);
        setEditingClientId(null);
        setView("home");
        setBackupMessage("Backup importado com sucesso.");
      } catch {
        setBackupMessage("Nao foi possivel importar este backup.");
      } finally {
        event.target.value = "";
      }
    };
    reader.onerror = () => {
      setBackupMessage("Nao foi possivel ler o arquivo.");
      event.target.value = "";
    };
    reader.readAsText(file);
  }

  function checkedKey(item: ConsolidatedItem) {
    return `${selectedDeliveryDate}:${item.produtoId}:${item.unidade}`;
  }

  function toggleChecked(item: ConsolidatedItem) {
    const key = checkedKey(item);
    setCheckedItems((current) => ({ ...current, [key]: !current[key] }));
  }

  function demandCheckedKey(demand: ProductDemand) {
    return `${selectedDeliveryDate}:demanda:${demand.produtoId}`;
  }

  function toggleDemandChecked(demand: ProductDemand) {
    const key = demandCheckedKey(demand);
    setCheckedItems((current) => ({ ...current, [key]: !current[key] }));
  }

  function purchasePlanKey(routeId: string, productId: string) {
    return `${selectedDeliveryDate}:${routeId}:${productId}`;
  }

  function getPurchasePlan(routeId: string, productId: string): PurchasePlanEntry {
    const product = productById.get(productId);

    return (
      purchasePlans[purchasePlanKey(routeId, productId)] ?? {
        quantidade: "",
        unidade: product ? getProductPurchaseUnit(product) : "caixa",
      }
    );
  }

  function updatePurchasePlan(
    routeId: string,
    productId: string,
    patch: Partial<PurchasePlanEntry>,
  ) {
    const key = purchasePlanKey(routeId, productId);
    const currentPlan = getPurchasePlan(routeId, productId);

    setPurchasePlans((current) => ({
      ...current,
      [key]: {
        ...currentPlan,
        ...patch,
      },
    }));
  }

  function demandRequiresPurchaseReview(demand: ProductDemand): boolean {
    const product = productById.get(demand.produtoId);
    const purchaseUnit = product ? getProductPurchaseUnit(product) : demand.quantities[0]?.unidade;
    const demandUnits = new Set(demand.quantities.map((quantity) => quantity.unidade));

    return demandUnits.size > 1 || Array.from(demandUnits).some((unit) => unit !== purchaseUnit);
  }

  function getEffectiveRoutePurchase(
    routeId: string,
    demand: ProductDemand,
  ): Array<{ quantidade: number; unidade: Unit }> {
    if (!demandRequiresPurchaseReview(demand)) {
      return demand.quantities;
    }

    const plan = getPurchasePlan(routeId, demand.produtoId);
    const quantity = parseQuantity(plan.quantidade);

    return Number.isFinite(quantity) && quantity > 0
      ? [{ quantidade: quantity, unidade: plan.unidade }]
      : [];
  }

  function formatRoutePurchasePlan(routeId: string, demand: ProductDemand): string {
    const purchase = getEffectiveRoutePurchase(routeId, demand);

    return purchase.length > 0
      ? purchase
          .map((item) => formatQuantityWithUnit(item.quantidade, item.unidade))
          .join(" + ")
      : "A definir";
  }

  function getGeneralPurchasePlans(productId: string): Array<{
    quantidade: number;
    unidade: Unit;
  }> {
    const grouped = new Map<Unit, number>();

    routePurchaseSummaries.forEach(({ route, demands }) => {
      const demand = demands.find((currentDemand) => currentDemand.produtoId === productId);

      if (!demand) {
        return;
      }

      getEffectiveRoutePurchase(route.id, demand).forEach((item) => {
        grouped.set(item.unidade, (grouped.get(item.unidade) ?? 0) + item.quantidade);
      });
    });

    return Array.from(grouped.entries()).map(([unidade, quantidade]) => ({
      unidade,
      quantidade,
    }));
  }

  function generalPurchaseNeedsDefinition(productId: string): boolean {
    return routePurchaseSummaries.some(({ route, demands }) => {
      const demand = demands.find((currentDemand) => currentDemand.produtoId === productId);

      return Boolean(
        demand &&
          demandRequiresPurchaseReview(demand) &&
          getEffectiveRoutePurchase(route.id, demand).length === 0,
      );
    });
  }

  function formatGeneralPurchasePlan(productId: string): string {
    if (generalPurchaseNeedsDefinition(productId)) {
      return "A definir";
    }

    const plans = getGeneralPurchasePlans(productId);

    return plans.length > 0
      ? plans.map((plan) => formatQuantityWithUnit(plan.quantidade, plan.unidade)).join(" + ")
      : "A definir";
  }

  function getOrdersForPdf(scope: PdfScope) {
    if (scope.type === "all") {
      return ordersForSelectedDate;
    }

    return ordersForSelectedDate.filter((order) => {
      const clientRouteId = clientById.get(order.clienteId)?.routeId;
      const orderRouteId = getRouteFallback(order.routeId ?? clientRouteId);
      return orderRouteId === scope.routeId;
    });
  }

  async function makePdfBlob(scope: PdfScope) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const tableWidth = pageWidth - margin * 2;
    const productWidth = 76;
    const demandWidth = 60;
    const purchaseWidth = tableWidth - productWidth - demandWidth;
    const headerHeight = 13;
    const pdfOrders = getOrdersForPdf(scope);
    const pdfDemands = buildProductDemands(pdfOrders, productById);
    const pdfActiveOrders = pdfOrders.filter((order) => order.status !== "cancelado");
    const pdfSummary = {
      pedidos: pdfActiveOrders.length,
      clientes: new Set(pdfActiveOrders.map((order) => order.clienteId)).size,
    };
    const routeNameValue =
      scope.type === "all"
        ? "Compra geral"
        : routes.find((route) => route.id === scope.routeId)?.nome ?? "Rota";
    const headerLabel = scope.type === "all" ? "Lista geral Ceasa" : "Lista Ceasa";
    let y = 14;

    try {
      const response = await fetch(DEFAULT_LOGO_SRC);
      const blob = await response.blob();
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoDataUrl, "PNG", margin, y, 18, 18);
    } catch {
      // Logo is optional in exported PDFs.
    }

    doc.setFillColor(40, 126, 29);
    doc.roundedRect(margin + 22, y, tableWidth - 22, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(companyName, margin + 28, y + 7);
    doc.setFontSize(11);
    doc.text(headerLabel, margin + 28, y + 14);
    y += 26;

    doc.setTextColor(24, 24, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Entrega: ${formatDateLong(selectedDeliveryDate)}`, margin, y);
    y += 8;

    const routeBoxHeight = 22;
    const routeText = scope.type === "all" ? "TODAS AS ROTAS" : routeNameValue.toUpperCase();
    const routeMaxWidth = tableWidth - 74;
    let routeFontSize = 18;

    doc.setFillColor(235, 246, 233);
    doc.setDrawColor(40, 126, 29);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, tableWidth, routeBoxHeight, 2, 2, "FD");

    doc.setTextColor(40, 126, 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("ROTA", margin + 5, y + 6);

    doc.setTextColor(16, 30, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(routeFontSize);

    while (doc.getTextWidth(routeText) > routeMaxWidth && routeFontSize > 12) {
      routeFontSize -= 1;
      doc.setFontSize(routeFontSize);
    }

    doc.text(routeText, margin + 5, y + 16);

    doc.setTextColor(62, 73, 62);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${pdfSummary.pedidos} pedidos`, margin + tableWidth - 5, y + 8, { align: "right" });
    doc.text(`${pdfSummary.clientes} clientes`, margin + tableWidth - 5, y + 16, { align: "right" });
    y += routeBoxHeight + 8;

    function drawTableHeader(currentY: number) {
      doc.setFillColor(18, 23, 33);
      doc.setDrawColor(18, 23, 33);
      doc.rect(margin, currentY, tableWidth, headerHeight, "FD");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Produto", margin + 4, currentY + 8.5);
      doc.text("Demanda", margin + productWidth + 4, currentY + 8.5);
      doc.text("Comprar", margin + productWidth + demandWidth + 4, currentY + 8.5);
      return currentY + headerHeight;
    }

    y = drawTableHeader(y);

    pdfDemands.forEach((demand, index) => {
      const demandText = formatProductDemand(demand);
      const purchaseText =
        scope.type === "all"
          ? formatGeneralPurchasePlan(demand.produtoId)
          : formatRoutePurchasePlan(scope.routeId, demand);
      const productLines = doc.splitTextToSize(demand.produtoNome, productWidth - 8);
      const demandLines = doc.splitTextToSize(demandText, demandWidth - 8);
      const purchaseLines = doc.splitTextToSize(purchaseText, purchaseWidth - 8);
      const lineCount = Math.max(productLines.length, demandLines.length, purchaseLines.length);
      const rowHeight = Math.max(13, 6 + lineCount * 5);

      if (y + rowHeight > pageHeight - 18) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
      }

      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 250 : 241, isEven ? 252 : 245, isEven ? 250 : 242);
      doc.setDrawColor(177, 187, 177);
      doc.rect(margin, y, productWidth, rowHeight, "FD");
      doc.rect(margin + productWidth, y, demandWidth, rowHeight, "FD");
      doc.rect(margin + productWidth + demandWidth, y, purchaseWidth, rowHeight, "FD");
      doc.setTextColor(20, 28, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(productLines, margin + 4, y + 7);
      doc.text(demandLines, margin + productWidth + 4, y + 7);
      doc.setTextColor(40, 126, 29);
      doc.text(purchaseLines, margin + productWidth + demandWidth + 4, y + 7);
      y += rowHeight;
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    doc.text(`${FIXED_PDF_FOOTER} para ${companyName}`, margin, pageHeight - 8);

    return doc.output("blob");
  }

  async function exportPdf(mode: "download" | "share", scope: PdfScope = { type: "route", routeId: selectedRouteId }) {
    const pdfItems = buildProductDemands(getOrdersForPdf(scope), productById);

    if (pdfItems.length === 0) {
      return;
    }

    const blob = await makePdfBlob(scope);
    const routeNameValue =
      scope.type === "all"
        ? "geral"
        : routes.find((route) => route.id === scope.routeId)?.nome ?? "rota";
    const routeSlug = normalizeText(routeNameValue).replace(/[^a-z0-9]+/g, "-");
    const filename = `lista-ceasa-${routeSlug}-${selectedDeliveryDate}.pdf`;

    if (mode === "share" && "share" in navigator) {
      const file = new File([blob], filename, { type: "application/pdf" });
      const canShareFiles = "canShare" in navigator ? navigator.canShare({ files: [file] }) : false;

      if (canShareFiles) {
        try {
          await navigator.share({
            title: scope.type === "all" ? "Lista geral Ceasa" : "Lista Ceasa",
            text: `${scope.type === "all" ? "Lista geral Ceasa" : "Lista Ceasa"} - ${formatDateLong(
              selectedDeliveryDate,
            )}`,
            files: [file],
          });
          return;
        } catch {
          return;
        }
      }
    }

    downloadBlob(blob, filename);
  }

  function getDeliveryOrdersByClient(routeId: string) {
    const ordersByClient = new Map<string, Order>();

    getOrdersForPdf({ type: "route", routeId })
      .filter((order) => order.status !== "cancelado")
      .forEach((order) => {
        const currentOrder = ordersByClient.get(order.clienteId);

        if (!currentOrder) {
          ordersByClient.set(order.clienteId, {
            ...order,
            itens: mergeOrderItems(order.itens),
          });
          return;
        }

        const observations = [currentOrder.observacaoGeral, order.observacaoGeral]
          .map((observation) => observation.trim())
          .filter(Boolean);

        ordersByClient.set(order.clienteId, {
          ...currentOrder,
          observacaoGeral: Array.from(new Set(observations)).join(" | "),
          itens: mergeOrderItems([...currentOrder.itens, ...order.itens]),
        });
      });

    return Array.from(ordersByClient.values()).sort((firstOrder, secondOrder) => {
      const firstClient = clientById.get(firstOrder.clienteId)?.nome ?? "";
      const secondClient = clientById.get(secondOrder.clienteId)?.nome ?? "";
      return firstClient.localeCompare(secondClient, "pt-BR");
    });
  }

  async function makeDeliveryPdfBlob(routeId: string) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const tableWidth = pageWidth - margin * 2;
    const productWidth = 118;
    const quantityWidth = tableWidth - productWidth;
    const rowHeight = 9;
    const route = routes.find((currentRoute) => currentRoute.id === routeId);
    const routeNameValue = route?.nome ?? "Rota";
    const deliveryOrders = getDeliveryOrdersByClient(routeId);
    let y = 14;

    function drawPageFooter() {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(90, 90, 90);
      doc.setFontSize(9);
      doc.text(`${FIXED_PDF_FOOTER} para ${companyName}`, margin, pageHeight - 8);
    }

    function ensureSpace(requiredHeight: number) {
      if (y + requiredHeight <= pageHeight - 18) {
        return;
      }

      drawPageFooter();
      doc.addPage();
      y = 14;
    }

    try {
      const response = await fetch(DEFAULT_LOGO_SRC);
      const blob = await response.blob();
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      doc.addImage(logoDataUrl, "PNG", margin, y, 18, 18);
    } catch {
      // Logo is optional in exported PDFs.
    }

    doc.setFillColor(40, 126, 29);
    doc.roundedRect(margin + 22, y, tableWidth - 22, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(companyName, margin + 28, y + 7);
    doc.setFontSize(11);
    doc.text("Relatorio de entrega", margin + 28, y + 14);
    y += 26;

    doc.setTextColor(24, 24, 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Entrega: ${formatDateLong(selectedDeliveryDate)}`, margin, y);
    y += 8;

    doc.setFillColor(235, 246, 233);
    doc.setDrawColor(40, 126, 29);
    doc.roundedRect(margin, y, tableWidth, 22, 2, 2, "FD");
    doc.setTextColor(40, 126, 29);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("ROTA", margin + 5, y + 6);
    doc.setTextColor(16, 30, 20);
    doc.setFontSize(18);
    doc.text(routeNameValue.toUpperCase(), margin + 5, y + 16);
    doc.setTextColor(62, 73, 62);
    doc.setFontSize(11);
    doc.text(`${deliveryOrders.length} clientes`, margin + tableWidth - 5, y + 12, { align: "right" });
    y += 30;

    deliveryOrders.forEach((order) => {
      const client = clientById.get(order.clienteId);
      const clientName = client?.nome ?? "Cliente removido";
      const clientMeta = [client?.telefone, client?.endereco].filter(Boolean).join(" - ");
      const items = mergeOrderItems(order.itens);
      const observationHeight = order.observacaoGeral ? 7 : 0;
      const blockHeight = 18 + 9 + items.length * rowHeight + observationHeight + 8;

      ensureSpace(blockHeight);

      doc.setFillColor(18, 23, 33);
      doc.setDrawColor(18, 23, 33);
      doc.roundedRect(margin, y, tableWidth, 15, 2, 2, "FD");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(clientName, margin + 4, y + 9.5);
      y += 15;

      if (clientMeta) {
        doc.setTextColor(78, 88, 82);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(clientMeta, margin + 4, y + 6);
        y += 8;
      }

      if (order.observacaoGeral) {
        doc.setTextColor(78, 88, 82);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`Obs: ${order.observacaoGeral}`, margin + 4, y + 6);
        y += 8;
      }

      doc.setFillColor(235, 246, 233);
      doc.setDrawColor(177, 187, 177);
      doc.rect(margin, y, productWidth, rowHeight, "FD");
      doc.rect(margin + productWidth, y, quantityWidth, rowHeight, "FD");
      doc.setTextColor(20, 28, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Produto", margin + 4, y + 6);
      doc.text("Quantidade", margin + productWidth + 4, y + 6);
      y += rowHeight;

      items.forEach((item, index) => {
        ensureSpace(rowHeight + 12);
        doc.setFillColor(index % 2 === 0 ? 250 : 241, index % 2 === 0 ? 252 : 245, index % 2 === 0 ? 250 : 242);
        doc.setDrawColor(177, 187, 177);
        doc.rect(margin, y, productWidth, rowHeight, "FD");
        doc.rect(margin + productWidth, y, quantityWidth, rowHeight, "FD");
        doc.setTextColor(20, 28, 24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(item.produtoNome, margin + 4, y + 6.4);
        doc.text(formatQuantityWithUnit(item.quantidade, item.unidade), margin + productWidth + 4, y + 6.4);
        y += rowHeight;
      });

      y += 8;
    });

    drawPageFooter();
    return doc.output("blob");
  }

  async function exportDeliveryPdf(routeId: string) {
    const deliveryOrders = getDeliveryOrdersByClient(routeId);

    if (deliveryOrders.length === 0) {
      return;
    }

    const routeNameValue = routes.find((route) => route.id === routeId)?.nome ?? "rota";
    const routeSlug = normalizeText(routeNameValue).replace(/[^a-z0-9]+/g, "-");
    const blob = await makeDeliveryPdfBlob(routeId);

    downloadBlob(blob, `entrega-${routeSlug}-${selectedDeliveryDate}.pdf`);
  }

  function renderDeliveryPicker(
    value = selectedDeliveryDate,
    onChange = setSelectedDeliveryDate,
    options: { compact?: boolean; label?: string } = {},
  ) {
    const upcomingDates = getUpcomingDeliveryDates(5);
    const pickerDates = upcomingDates.includes(value) ? upcomingDates : [value, ...upcomingDates];
    const title = options.label ?? "Entrega selecionada";

    return (
      <div
        className={options.compact ? "delivery-picker compact" : "delivery-picker"}
        aria-label="Datas de entrega"
      >
        <div className="delivery-summary">
          <div className="delivery-summary-main">
            <CalendarDays size={20} aria-hidden="true" />
            <div>
              <span>{title}</span>
              <strong>{formatDateLong(value)}</strong>
            </div>
          </div>
          <label className="calendar-action">
            <CalendarDays size={17} aria-hidden="true" />
            Calendário
            <input
              aria-label="Abrir calendário de entrega"
              type="date"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>
        <div className="delivery-chips">
          {pickerDates.map((date) => (
            <button
              className={date === value ? "date-chip active" : "date-chip"}
              key={date}
              onClick={() => onChange(date)}
              type="button"
            >
              <CalendarDays size={16} aria-hidden="true" />
              <span>{formatDate(date)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function renderRouteSelector(options: { allowCreate?: boolean } = {}) {
    return (
      <section className="route-panel" aria-label="Seleção de rota">
        <div className="route-active">
          <div className="route-mark">
            <Truck size={20} aria-hidden="true" />
          </div>
          <div>
            <span>Rota ativa</span>
            <strong>{selectedRoute?.nome ?? "Sem rota"}</strong>
          </div>
        </div>
        <label className="route-select-field">
          <span>Selecionar rota</span>
          <select value={selectedRouteId} onChange={(event) => handleRouteChange(event.target.value)}>
            {activeRoutes.map((route) => (
              <option value={route.id} key={route.id}>
                {route.nome}
              </option>
            ))}
          </select>
        </label>
        {options.allowCreate ? (
          <div className="route-create">
            <label>
              <span>Nova rota</span>
              <input
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                placeholder="Ex: Rota Itajai"
              />
            </label>
            <button className="secondary-button align-end" type="button" onClick={addRoute}>
              <Plus size={18} aria-hidden="true" />
              Rota
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  function renderHome() {
    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Entrega selecionada</p>
            <h1>{formatDateLong(selectedDeliveryDate)}</h1>
          </div>
          <button className="primary-button" type="button" onClick={startNewOrder}>
            <Plus size={18} aria-hidden="true" />
            Novo pedido
          </button>
        </div>

        {renderDeliveryPicker()}
        {renderRouteSelector()}

        <section className="stat-grid" aria-label="Resumo da entrega">
          <article className="stat-card">
            <ClipboardList size={22} aria-hidden="true" />
            <strong>{summary.pedidos}</strong>
            <span>Pedidos</span>
          </article>
          <article className="stat-card accent">
            <Users size={22} aria-hidden="true" />
            <strong>{summary.clientes}</strong>
            <span>Clientes</span>
          </article>
          <article className="stat-card warm">
            <ShoppingBasket size={22} aria-hidden="true" />
            <strong>{summary.itens}</strong>
            <span>Itens Ceasa</span>
          </article>
          <article className="stat-card cool">
            <Truck size={22} aria-hidden="true" />
            <strong>{summary.entregues}</strong>
            <span>Entregues</span>
          </article>
        </section>

        <section className="action-grid" aria-label="Atalhos">
          <button type="button" onClick={() => openView("orders")}>
            <ClipboardList size={20} aria-hidden="true" />
            Pedidos por entrega
          </button>
          <button type="button" onClick={() => openView("ceasa")}>
            <ListChecks size={20} aria-hidden="true" />
            Lista Ceasa
          </button>
          <button type="button" onClick={() => openView("clients")}>
            <Users size={20} aria-hidden="true" />
            Clientes
          </button>
          <button type="button" onClick={() => openView("products")}>
            <Package size={20} aria-hidden="true" />
            Produtos
          </button>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <h2>Pedidos da entrega</h2>
            <button className="text-button" type="button" onClick={() => openView("orders")}>
              Ver todos
            </button>
          </div>
          {ordersForSelectedDelivery.length === 0 ? (
            <EmptyState icon={<ClipboardList size={26} />} title="Nenhum pedido nesta entrega" />
          ) : (
            <div className="list-stack">
              {ordersForSelectedDelivery.slice(0, 3).map((order) => renderOrderCard(order))}
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderNewOrder() {
    const hasClientsForSelectedRoute = activeClientsForSelectedRoute.length > 0;
    const canSave = Boolean(orderClientId && draftItems.length > 0);
    const currentClient = clientById.get(orderClientId);

    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">{editingOrderId ? "Editando pedido" : "Novo pedido"}</p>
            <h1>{currentClient?.nome ?? "Selecionar cliente"}</h1>
          </div>
          <div className="button-row">
            <button className="secondary-button" type="button" onClick={() => openView("orders")}>
              <ChevronLeft size={18} aria-hidden="true" />
              Voltar
            </button>
            <button className="warning-button" type="button" onClick={discardOrderDraft}>
              <Trash2 size={17} aria-hidden="true" />
              Descartar
            </button>
          </div>
        </div>

        {renderRouteSelector()}

        <section className="form-surface">
          <div className="field-grid one">
            <label>
              <span>Cliente</span>
              <select
                name="client"
                value={orderClientId}
                disabled={!hasClientsForSelectedRoute}
                onChange={(event) => setOrderClientId(event.target.value)}
              >
                {activeClientsForSelectedRoute.map((client) => (
                  <option value={client.id} key={client.id}>
                    {client.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!hasClientsForSelectedRoute ? (
            <div className="form-alert route-empty-alert">
              Esta rota ainda nao tem clientes ativos. Cadastre um cliente ou mova um cliente existente
              para esta rota.
            </div>
          ) : null}

          {renderDeliveryPicker(orderDeliveryDate, setOrderDeliveryDate, {
            compact: true,
            label: "Data de entrega",
          })}

          <label>
            <span>Observação geral</span>
            <textarea
              rows={3}
              value={orderObservation}
              onChange={(event) => setOrderObservation(event.target.value)}
              placeholder="Ex: entregar até 10h"
            />
          </label>
        </section>

        <section className="form-surface">
          <div className="section-heading">
            <h2>Itens do pedido</h2>
            <span className="soft-badge">{draftItems.length} itens</span>
          </div>

          <div className="quick-order-panel">
            <div className="quick-order-top">
              <div>
                <strong>Pedido rápido</strong>
                <span>
                  {quickOrderLines.length > 0
                    ? `${quickOrderReadyCount} prontos - ${quickOrderReviewCount} revisar`
                    : "Colar lista"}
                </span>
              </div>
              <button
                className="secondary-button compact"
                type="button"
                onClick={() => {
                  setQuickOrderOpen((current) => !current);
                  setQuickOrderMessage("");
                }}
              >
                <ClipboardList size={16} aria-hidden="true" />
                {quickOrderOpen ? "Fechar" : "Colar lista"}
              </button>
            </div>

            {quickOrderOpen ? (
              <div className="quick-order-body">
                <label>
                  <span>Lista em texto</span>
                  <textarea
                    rows={5}
                    value={quickOrderText}
                    onChange={(event) => {
                      setQuickOrderText(event.target.value);
                      setQuickOrderMessage("");
                    }}
                    placeholder={"4 cx Abacaxi\n2 cx Abobrinha\n6 mc Agrião"}
                  />
                </label>

                {quickOrderLines.length > 0 ? (
                  <div className="quick-order-preview" aria-label="Prévia do pedido rápido">
                    {quickOrderLines.map((line) => {
                      const lineProduct = activeProducts.find((product) => product.id === line.selectedProductId);

                      return (
                        <article className={`quick-order-row ${line.status}`} key={line.id}>
                          <div className="quick-order-read">
                            <strong>
                              {line.quantidade ? formatQuantityWithUnit(line.quantidade, line.unidade) : "Revisar"}
                            </strong>
                            <span>{line.produtoTexto || line.raw}</span>
                            {line.status === "unit-conflict" && lineProduct && line.informedUnit ? (
                              <small className="quick-order-warning">
                                A lista informou {line.informedUnit}, mas {lineProduct.nome} aceita{" "}
                                {getProductOrderUnits(lineProduct).join(" ou ")}.
                              </small>
                            ) : null}
                          </div>
                          <div className="quick-order-controls">
                            <button
                              className="quick-order-product-button"
                              type="button"
                              onClick={() => openQuickOrderProductPicker(line)}
                              aria-label={`Produto para ${line.produtoTexto || line.raw}`}
                            >
                              <Search size={17} aria-hidden="true" />
                              <span>{lineProduct?.nome ?? "Buscar produto"}</span>
                            </button>
                            <select
                              value={line.unidade}
                              onChange={(event) => updateQuickOrderUnit(line.id, event.target.value as Unit)}
                              aria-label={`Unidade para ${line.produtoTexto || line.raw}`}
                            >
                              {(lineProduct ? getProductOrderUnits(lineProduct) : units).map((unit) => (
                                <option value={unit} key={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                            {line.status === "unit-conflict" && lineProduct ? (
                              <button
                                className="secondary-button compact quick-order-confirm-unit"
                                type="button"
                                onClick={() => updateQuickOrderUnit(line.id, lineProduct.unidadePadrao)}
                              >
                                <CheckCircle2 size={16} aria-hidden="true" />
                                Usar {lineProduct.unidadePadrao}
                              </button>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}

                {quickOrderMessage ? <p className="form-alert info-alert">{quickOrderMessage}</p> : null}

                <div className="quick-order-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={!quickOrderText.trim()}
                    onClick={() => {
                      setQuickOrderText("");
                      setQuickOrderProductOverrides({});
                      setQuickOrderUnitOverrides({});
                      setQuickOrderMessage("");
                    }}
                  >
                    <XCircle size={18} aria-hidden="true" />
                    Limpar
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={quickOrderReadyCount === 0}
                    onClick={addQuickOrderItems}
                  >
                    <Plus size={18} aria-hidden="true" />
                    Adicionar itens
                  </button>
                </div>
              </div>
            ) : quickOrderMessage ? (
              <p className="form-alert info-alert">{quickOrderMessage}</p>
            ) : null}
          </div>

          <div className="product-finder">
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Buscar produto"
              />
            </label>

            <div className="field-grid order-item-grid">
              <label>
                <span>Produto</span>
                <select
                  value={selectedProductId}
                  onChange={(event) => {
                    const productId = event.target.value;
                    const product = activeProducts.find((currentProduct) => currentProduct.id === productId);
                    setSelectedProductId(productId);
                    setSelectedOrderUnit(product?.unidadePadrao ?? "caixa");
                  }}
                >
                  {filteredProducts.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Unidade</span>
                <select
                  value={selectedOrderUnit}
                  onChange={(event) => setSelectedOrderUnit(event.target.value as Unit)}
                >
                  {(selectedProduct ? getProductOrderUnits(selectedProduct) : ["caixa"]).map((unit) => (
                    <option value={unit} key={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Quantidade</span>
                <input
                  inputMode="decimal"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>
              <button className="primary-button align-end" type="button" onClick={addDraftItem}>
                <Plus size={18} aria-hidden="true" />
                Adicionar
              </button>
            </div>

            <div className="quantity-row" aria-label="Ajustes rápidos de quantidade">
              <button type="button" onClick={() => handleQuantityStep(-0.5)}>
                -0,5
              </button>
              <button type="button" onClick={() => handleQuantityStep(0.5)}>
                +0,5
              </button>
              <button type="button" onClick={() => handleQuantityStep(1)}>
                +1
              </button>
              <button type="button" onClick={() => handleQuantityStep(2)}>
                +2
              </button>
            </div>
          </div>

          {draftItems.length === 0 ? (
            <EmptyState icon={<ShoppingBasket size={26} />} title="Pedido sem itens" />
          ) : (
            <div className="table-list">
              {draftItems.map((item) => (
                <div className="table-row" key={item.id}>
                  <div>
                    <strong>{item.produtoNome}</strong>
                    <span>{getDisplayUnit(item.quantidade, item.unidade)}</span>
                  </div>
                  <strong>{formatQuantityWithUnit(item.quantidade, item.unidade)}</strong>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeDraftItem(item.id)}
                    title="Remover item"
                    aria-label={`Remover ${item.produtoNome}`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-actions">
            <button className="primary-button" type="button" disabled={!canSave} onClick={saveOrder}>
              <Save size={18} aria-hidden="true" />
              {editingOrderId ? "Atualizar pedido" : "Salvar pedido"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  function renderOrders() {
    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Agenda</p>
            <h1>Pedidos por entrega</h1>
          </div>
          <button className="primary-button" type="button" onClick={startNewOrder}>
            <Plus size={18} aria-hidden="true" />
            Novo pedido
          </button>
        </div>

        {renderDeliveryPicker()}
        {renderRouteSelector()}

        {ordersForSelectedDelivery.length === 0 ? (
          <EmptyState icon={<ClipboardList size={30} />} title="Nenhum pedido para esta data" />
        ) : (
          <div className="list-stack">
            {ordersForSelectedDelivery.map((order) => renderOrderCard(order))}
          </div>
        )}
      </div>
    );
  }

  function renderOrderCard(order: Order) {
    const client = clientById.get(order.clienteId);
    const totalItems = order.itens.length;

    return (
      <button
        className="order-card"
        key={order.id}
        onClick={() => {
          setSelectedOrderId(order.id);
          openView("order-detail");
        }}
        type="button"
      >
        <div className="order-card-main">
          <span className={`status-dot ${order.status}`} aria-hidden="true" />
          <div>
            <strong>{client?.nome ?? "Cliente removido"}</strong>
            <span>
              {totalItems} {totalItems === 1 ? "item" : "itens"} · lançado em {formatDate(order.dataLancamento)}
            </span>
          </div>
        </div>
        <span className={`status-badge ${order.status}`}>{getStatusLabel(order.status)}</span>
      </button>
    );
  }

  function renderCeasaList() {
    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Compra</p>
            <h1>Lista geral Ceasa</h1>
          </div>
          <div className="button-row">
            <button
              className="secondary-button"
              type="button"
              disabled={consolidatedAllItems.length === 0}
              onClick={() => exportPdf("download", { type: "all" })}
            >
              <Download size={18} aria-hidden="true" />
              PDF geral
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={consolidatedAllItems.length === 0}
              onClick={() => exportPdf("share", { type: "all" })}
            >
              <Share2 size={18} aria-hidden="true" />
              WhatsApp
            </button>
          </div>
        </div>

        {renderDeliveryPicker()}

        <section className="summary-strip" aria-label="Resumo geral da compra">
          <div>
            <span>Pedidos</span>
            <strong>{allSummary.pedidos}</strong>
          </div>
          <div>
            <span>Clientes</span>
            <strong>{allSummary.clientes}</strong>
          </div>
          <div>
            <span>Itens Ceasa</span>
            <strong>{allSummary.itens}</strong>
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <h2>PDFs por rota</h2>
            <span className="soft-badge">Separação por rota</span>
          </div>
          <div className="route-pdf-grid">
            {routePurchaseSummaries.map(({ route, pedidos, clientes, itens, demands }) => {
              const reviewDemands = demands.filter(demandRequiresPurchaseReview);
              const pendingReviewDemands = reviewDemands.filter(
                (demand) => getEffectiveRoutePurchase(route.id, demand).length === 0,
              );

              return (
                <details className="route-purchase-panel" key={route.id}>
                  <summary>
                    <div>
                      <strong>{route.nome}</strong>
                      <span>
                        {pedidos} pedidos - {clientes} clientes - {itens} itens
                      </span>
                    </div>
                    <span
                      className={
                        pendingReviewDemands.length > 0 ? "soft-badge attention" : "soft-badge completed"
                      }
                    >
                      {reviewDemands.length === 0
                        ? "Sem revisão"
                        : pendingReviewDemands.length === 0
                          ? "Revisão concluída"
                          : `${pendingReviewDemands.length} ${
                              pendingReviewDemands.length === 1 ? "pendência" : "pendências"
                            }`}
                    </span>
                  </summary>

                  <div className="route-purchase-body">
                    {reviewDemands.length > 0 ? (
                      <>
                        <p className="route-purchase-note">
                          Revise somente os produtos cuja demanda precisa ser convertida para a unidade de compra.
                        </p>
                        <div className="route-purchase-list">
                          {reviewDemands.map((demand) => {
                            const plan = getPurchasePlan(route.id, demand.produtoId);
                            const product = productById.get(demand.produtoId);
                            const reviewCompleted = getEffectiveRoutePurchase(route.id, demand).length > 0;

                            return (
                              <article
                                className={`route-purchase-row ${reviewCompleted ? "reviewed" : "pending"}`}
                                key={demand.produtoId}
                              >
                                <div className="route-purchase-product">
                                  <strong>{demand.produtoNome}</strong>
                                  <span>Demanda: {formatProductDemand(demand)}</span>
                                  <span
                                    className={`purchase-review-status ${
                                      reviewCompleted ? "reviewed" : "pending"
                                    }`}
                                  >
                                    {reviewCompleted ? "Revisado" : "Pendente"}
                                  </span>
                                </div>
                                <label>
                                  <span>Comprar</span>
                                  <input
                                    inputMode="decimal"
                                    value={plan.quantidade}
                                    onChange={(event) =>
                                      updatePurchasePlan(route.id, demand.produtoId, {
                                        quantidade: event.target.value,
                                      })
                                    }
                                    placeholder="A definir"
                                  />
                                </label>
                                <label>
                                  <span>Unidade</span>
                                  <select
                                    value={plan.unidade}
                                    onChange={(event) =>
                                      updatePurchasePlan(route.id, demand.produtoId, {
                                        unidade: event.target.value as Unit,
                                      })
                                    }
                                  >
                                    {Array.from(
                                      new Set([
                                        product ? getProductPurchaseUnit(product) : "caixa",
                                        ...(product ? getProductOrderUnits(product) : []),
                                      ]),
                                    ).map((unit) => (
                                      <option value={unit} key={unit}>
                                        {unit}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </article>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <p className="form-alert info-alert">
                        Compra direta: todas as quantidades já estão na unidade correta.
                      </p>
                    )}

                    <div className="route-pdf-actions">
                      <button
                        className="secondary-button compact"
                        type="button"
                        disabled={itens === 0}
                        onClick={() => exportPdf("download", { type: "route", routeId: route.id })}
                      >
                        <Download size={16} aria-hidden="true" />
                        Compra
                      </button>
                      <button
                        className="secondary-button compact"
                        type="button"
                        disabled={itens === 0}
                        onClick={() => exportDeliveryPdf(route.id)}
                      >
                        <FileText size={16} aria-hidden="true" />
                        Entrega
                      </button>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="content-section">
          <div className="section-heading">
            <h2>Lista geral de produtos</h2>
            <span className="soft-badge">
              {allProductDemands.length} {allProductDemands.length === 1 ? "produto" : "produtos"}
            </span>
          </div>
          {allProductDemands.length === 0 ? (
            <EmptyState icon={<ShoppingBasket size={30} />} title="Lista vazia nesta entrega" />
          ) : (
            <div className="ceasa-planning-list">
              {allProductDemands.map((demand) => {
                const itemChecked = checkedItems[demandCheckedKey(demand)] ?? false;
                return (
                  <article
                    className={itemChecked ? "ceasa-plan-row checked" : "ceasa-plan-row"}
                    key={demand.produtoId}
                  >
                    <button
                      className="check-box"
                      onClick={() => toggleDemandChecked(demand)}
                      type="button"
                      aria-label={itemChecked ? `Desmarcar ${demand.produtoNome}` : `Marcar ${demand.produtoNome}`}
                    >
                      {itemChecked ? <CheckCircle2 size={20} /> : null}
                    </button>
                    <div>
                      <strong>{demand.produtoNome}</strong>
                      <span>Demanda: {formatProductDemand(demand)}</span>
                    </div>
                    <div className="ceasa-plan-total">
                      <span>Compra planejada</span>
                      <strong>{formatGeneralPurchasePlan(demand.produtoId)}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderOrderDetail() {
    if (!selectedOrder) {
      return (
        <div className="screen">
          <EmptyState icon={<FileText size={30} />} title="Pedido não encontrado" />
        </div>
      );
    }

    const client = clientById.get(selectedOrder.clienteId);

    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Pedido individual</p>
            <h1>{client?.nome ?? "Cliente removido"}</h1>
          </div>
          <button className="secondary-button" type="button" onClick={() => openView("orders")}>
            <ChevronLeft size={18} aria-hidden="true" />
            Voltar
          </button>
        </div>

        <section className="detail-band">
          <div>
            <span>Entrega</span>
            <strong>{formatDateLong(selectedOrder.dataEntrega)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{getStatusLabel(selectedOrder.status)}</strong>
          </div>
          <div>
            <span>Itens</span>
            <strong>{selectedOrder.itens.length}</strong>
          </div>
        </section>

        {selectedOrder.observacaoGeral ? (
          <section className="note-band">
            <strong>Observação</strong>
            <span>{selectedOrder.observacaoGeral}</span>
          </section>
        ) : null}

        <section className="content-section">
          <div className="section-heading">
            <h2>Itens</h2>
            <button className="text-button" type="button" onClick={() => editOrder(selectedOrder)}>
              <Edit3 size={16} aria-hidden="true" />
              Editar
            </button>
          </div>

          <div className="table-list">
            {selectedOrder.itens.map((item) => (
              <div className="table-row" key={item.id}>
                <div>
                  <strong>{item.produtoNome}</strong>
                  <span>{getDisplayUnit(item.quantidade, item.unidade)}</span>
                </div>
                <strong>{formatQuantityWithUnit(item.quantidade, item.unidade)}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="status-actions" aria-label="Alterar status do pedido">
          <button type="button" onClick={() => updateOrderStatus(selectedOrder.id, "aberto")}>
            <ClipboardList size={18} aria-hidden="true" />
            Aberto
          </button>
          <button type="button" onClick={() => updateOrderStatus(selectedOrder.id, "entregue")}>
            <Truck size={18} aria-hidden="true" />
            Entregue
          </button>
          <button type="button" onClick={() => updateOrderStatus(selectedOrder.id, "cancelado")}>
            <XCircle size={18} aria-hidden="true" />
            Cancelado
          </button>
        </section>
      </div>
    );
  }

  function renderClients() {
    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h1>Clientes</h1>
          </div>
        </div>

        {renderRouteSelector({ allowCreate: true })}

        <section className="form-surface">
          <div className="section-heading">
            <h2>{editingClientId ? "Editar cliente" : "Novo cliente"}</h2>
            {editingClientId ? (
              <button className="text-button" type="button" onClick={() => resetClientForm()}>
                <XCircle size={16} aria-hidden="true" />
                Cancelar
              </button>
            ) : null}
          </div>
          <div className="field-grid two">
            <label>
              <span>Nome</span>
              <input
                value={clientForm.nome}
                onChange={(event) => setClientForm((current) => ({ ...current, nome: event.target.value }))}
              />
            </label>
            <label>
              <span>Telefone</span>
              <input
                value={clientForm.telefone}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, telefone: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="field-grid two">
            <label>
              <span>Endereço ou região</span>
              <input
                value={clientForm.endereco}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, endereco: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Observação padrão</span>
              <input
                value={clientForm.observacaoPadrao}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, observacaoPadrao: event.target.value }))
                }
              />
            </label>
          </div>
          <div className="field-grid one">
            <label>
              <span>Rota do cliente</span>
              <select
                value={clientForm.routeId}
                onChange={(event) =>
                  setClientForm((current) => ({ ...current, routeId: event.target.value }))
                }
              >
                {activeRoutes.map((route) => (
                  <option value={route.id} key={route.id}>
                    {route.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="primary-button" type="button" onClick={saveClient}>
              {editingClientId ? <Save size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              {editingClientId ? "Atualizar cliente" : "Adicionar cliente"}
            </button>
          </div>
        </section>

        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            value={clientSearch}
            onChange={(event) => setClientSearch(event.target.value)}
            placeholder="Buscar cliente"
          />
        </label>

        <div className="list-stack">
          {filteredClients.map((client) => (
            <article className="registry-card" key={client.id}>
              <div>
                <strong>{client.nome}</strong>
                <span>
                  {routes.find((route) => route.id === getRouteFallback(client.routeId))?.nome ?? "Rota padrão"}
                </span>
                <span>{client.telefone || "Sem telefone"} · {client.endereco || "Sem endereço"}</span>
              </div>
              <div className="registry-actions">
                <label className="compact-select">
                  <span>Rota</span>
                  <select
                    value={getRouteFallback(client.routeId)}
                    onChange={(event) => updateClientRoute(client.id, event.target.value)}
                  >
                    {activeRoutes.map((route) => (
                      <option value={route.id} key={route.id}>
                        {route.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary-button compact"
                  type="button"
                  onClick={() => startClientEdit(client)}
                >
                  <Edit3 size={16} aria-hidden="true" />
                  Editar
                </button>
                <button
                  className={client.ativo ? "secondary-button compact" : "warning-button compact"}
                  type="button"
                  onClick={() => toggleClientStatus(client.id)}
                >
                  {client.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderSettings() {
    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Sistema</p>
            <h1>Configuracoes</h1>
          </div>
        </div>

        <section className="form-surface">
          <div className="section-heading">
            <h2>Identidade</h2>
            <span className="soft-badge">Empresa</span>
          </div>

          <div className="field-grid one">
            <label>
              <span>Nome da empresa</span>
              <input
                value={settings.companyName}
                onChange={(event) => updateSettings({ companyName: event.target.value })}
              />
            </label>
          </div>
        </section>

        <section className="form-surface">
          <div className="section-heading">
            <h2>Backup local</h2>
          </div>
          <div className="backup-actions">
            <button className="primary-button" type="button" onClick={exportBackup}>
              <FileDown size={18} aria-hidden="true" />
              Exportar backup
            </button>
            <label className="secondary-button file-button">
              <FileUp size={18} aria-hidden="true" />
              Importar backup
              <input accept="application/json,.json" type="file" onChange={importBackup} />
            </label>
          </div>
          {backupMessage ? <p className="form-alert">{backupMessage}</p> : null}
        </section>

        <section className="form-surface">
          <div className="section-heading">
            <h2>Rotas</h2>
            <span className="soft-badge">{activeRoutes.length} ativas</span>
          </div>

          <div className="route-create">
            <label>
              <span>Nova rota</span>
              <input
                value={routeName}
                onChange={(event) => setRouteName(event.target.value)}
                placeholder="Ex: Rota Itajai"
              />
            </label>
            <button className="secondary-button align-end" type="button" onClick={addRoute}>
              <Plus size={18} aria-hidden="true" />
              Criar rota
            </button>
          </div>

          <div className="route-management-list">
            {routes.map((route, index) => (
              <article className="route-management-row" key={route.id}>
                <label>
                  <span>Nome da rota</span>
                  <input value={route.nome} onChange={(event) => updateRouteName(route.id, event.target.value)} />
                </label>
                <div className="route-management-actions">
                  <button
                    className="secondary-button compact"
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveRoute(route.id, -1)}
                    aria-label={`Mover ${route.nome} para cima`}
                    title="Mover para cima"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    className="secondary-button compact"
                    type="button"
                    disabled={index === routes.length - 1}
                    onClick={() => moveRoute(route.id, 1)}
                    aria-label={`Mover ${route.nome} para baixo`}
                    title="Mover para baixo"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    className={route.ativo ? "secondary-button compact" : "warning-button compact"}
                    type="button"
                    disabled={route.ativo && activeRoutes.length === 1}
                    onClick={() => toggleRouteStatus(route.id)}
                  >
                    {route.ativo ? "Ativa" : "Inativa"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  function renderProducts() {
    return (
      <div className="screen">
        <div className="screen-title-row">
          <div>
            <p className="eyebrow">Cadastro</p>
            <h1>Produtos</h1>
          </div>
        </div>

        <section className="form-surface">
          <div className="section-heading">
            <h2>Base de produtos</h2>
            <span className="soft-badge">{products.length} cadastrados</span>
          </div>
          <div className="product-base-row">
            <div>
              <strong>Base limpa</strong>
              <span>Cadastro manual</span>
            </div>
            <div>
              <strong>Base sugerida</strong>
              <span>{suggestedProductsToImport.length} novos disponíveis</span>
            </div>
            <button
              className="secondary-button align-end"
              type="button"
              disabled={suggestedProductsToImport.length === 0}
              onClick={importSuggestedProductCatalog}
            >
              <Package size={18} aria-hidden="true" />
              Importar base
            </button>
          </div>
          {catalogMessage ? <p className="form-alert info-alert">{catalogMessage}</p> : null}
        </section>

        <section className="form-surface product-form-section" ref={productFormSectionRef}>
          <div className="section-heading">
            <h2>{editingProductId ? "Editar produto" : "Novo produto"}</h2>
            {editingProductId ? (
              <button className="text-button" type="button" onClick={resetProductForm}>
                <XCircle size={16} aria-hidden="true" />
                Cancelar
              </button>
            ) : null}
          </div>
          <div className="field-grid three">
            <label>
              <span>Produto</span>
              <input
                ref={productNameInputRef}
                value={productForm.nome}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, nome: event.target.value }))
                }
                placeholder="Ex: Tomate"
              />
            </label>
            <label>
              <span>Padrão do pedido</span>
              <select
                value={productForm.unidadePadrao}
                onChange={(event) =>
                  setProductForm((current) => {
                    const unidadePadrao = event.target.value as Unit;
                    return {
                      ...current,
                      unidadePadrao,
                      unidadesPedido: Array.from(new Set([...current.unidadesPedido, unidadePadrao])),
                    };
                  })
                }
              >
                {units.map((unit) => (
                  <option value={unit} key={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Unidade de compra</span>
              <select
                value={productForm.unidadeCompra}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    unidadeCompra: event.target.value as Unit,
                  }))
                }
              >
                {units.map((unit) => (
                  <option value={unit} key={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="unit-options">
            <legend>Unidades aceitas no pedido</legend>
            <div>
              {units.map((unit) => {
                const checked = productForm.unidadesPedido.includes(unit);
                const required = productForm.unidadePadrao === unit;

                return (
                  <label className="unit-option" key={unit}>
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={required}
                      onChange={(event) =>
                        setProductForm((current) => ({
                          ...current,
                          unidadesPedido: event.target.checked
                            ? Array.from(new Set([...current.unidadesPedido, unit]))
                            : current.unidadesPedido.filter((currentUnit) => currentUnit !== unit),
                        }))
                      }
                    />
                    <span>{unit}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="form-actions">
            <button
              className="primary-button"
              type="button"
              disabled={!productForm.nome.trim() || Boolean(duplicateProduct)}
              onClick={saveProduct}
            >
              {editingProductId ? <Save size={18} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}
              {editingProductId ? "Salvar" : "Adicionar"}
            </button>
          </div>
          {duplicateProduct ? (
            <p className="form-alert">
              Produto já cadastrado como <strong>{duplicateProduct.nome}</strong>.
            </p>
          ) : null}
        </section>

        <label className="search-field">
          <Search size={17} aria-hidden="true" />
          <input
            value={productCatalogSearch}
            onChange={(event) => setProductCatalogSearch(event.target.value)}
            placeholder="Buscar produto"
          />
        </label>

        <div className="list-stack">
          {filteredCatalogProducts.map((product) => (
            <article className="registry-card" data-product-id={product.id} key={product.id}>
              <div>
                <strong>{product.nome}</strong>
                <span>
                  Pedido: {getProductOrderUnits(product).join(", ")} · Compra:{" "}
                  {getProductPurchaseUnit(product)}
                </span>
              </div>
              <div className="registry-actions">
                <button
                  className="secondary-button compact"
                  data-testid={`edit-product-${product.id}`}
                  type="button"
                  onClick={() => startProductEdit(product)}
                >
                  <Edit3 size={15} aria-hidden="true" />
                  Editar
                </button>
                <button
                  className={product.ativo ? "secondary-button compact" : "warning-button compact"}
                  type="button"
                  onClick={() => toggleProductStatus(product.id)}
                >
                  {product.ativo ? "Ativo" : "Inativo"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  function renderQuickOrderProductPicker() {
    if (!quickOrderPickerLine) {
      return null;
    }

    return (
      <div
        className="product-picker-backdrop"
        role="presentation"
        onClick={() => {
          setQuickOrderPickerLineId(null);
          setQuickOrderPickerSearch("");
        }}
      >
        <section
          className="product-picker-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-picker-title"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="product-picker-header">
            <div>
              <p className="eyebrow">Produto da linha</p>
              <h2 id="product-picker-title">{quickOrderPickerLine.produtoTexto}</h2>
            </div>
            <button
              className="icon-button"
              type="button"
              onClick={() => {
                setQuickOrderPickerLineId(null);
                setQuickOrderPickerSearch("");
              }}
              aria-label="Fechar busca de produto"
              title="Fechar"
            >
              <XCircle size={20} aria-hidden="true" />
            </button>
          </div>

          <label className="search-field product-picker-search">
            <Search size={18} aria-hidden="true" />
            <input
              autoFocus
              value={quickOrderPickerSearch}
              onChange={(event) => setQuickOrderPickerSearch(event.target.value)}
              placeholder="Digite o nome do produto"
            />
          </label>

          <div className="product-picker-list" aria-label="Resultados da busca">
            {quickOrderPickerProducts.length > 0 ? (
              quickOrderPickerProducts.map((product) => (
                <button
                  className="product-picker-option"
                  type="button"
                  onClick={() => selectQuickOrderProduct(product.id)}
                  key={product.id}
                >
                  <span>
                    <strong>{product.nome}</strong>
                    <small>{product.unidadePadrao}</small>
                  </span>
                  <CheckCircle2 size={19} aria-hidden="true" />
                </button>
              ))
            ) : (
              <div className="product-picker-empty">
                <strong>Nenhum produto encontrado</strong>
                <span>Revise a busca ou cadastre este produto.</span>
              </div>
            )}
          </div>

          <button
            className="secondary-button product-picker-create"
            type="button"
            onClick={startProductRegistrationFromQuickOrder}
          >
            <Plus size={18} aria-hidden="true" />
            Cadastrar novo produto
          </button>
        </section>
      </div>
    );
  }

  function renderCurrentView() {
    if (view === "new-order") {
      return renderNewOrder();
    }

    if (view === "orders") {
      return renderOrders();
    }

    if (view === "ceasa") {
      return renderCeasaList();
    }

    if (view === "clients") {
      return renderClients();
    }

    if (view === "products") {
      return renderProducts();
    }

    if (view === "settings") {
      return renderSettings();
    }

    if (view === "order-detail") {
      return renderOrderDetail();
    }

    return renderHome();
  }

  function navButtonClass(target: View) {
    if (target === view) {
      return "nav-button active";
    }

    if (target === "orders" && view === "order-detail") {
      return "nav-button active";
    }

    return "nav-button";
  }

  const showOrderDraftBar = orderDraftActive && view !== "new-order";

  return (
    <div className={`app-shell${showOrderDraftBar ? " has-order-draft-bar" : ""}`}>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => openView("home")} aria-label={`${appName} inicio`}>
          <img src={logoSrc} alt="" />
          <span className="brand-copy">
            <strong>{appName}</strong>
            <small>{companyName}</small>
          </span>
        </button>
        <div className="topbar-actions">
          <button className="date-button" type="button" onClick={() => openView("home")}>
            <CalendarDays size={17} aria-hidden="true" />
            {formatDate(selectedDeliveryDate)}
          </button>
          <button
            className="theme-button"
            type="button"
            onClick={() => openView("settings")}
            title="Configuracoes"
            aria-label="Abrir configuracoes"
          >
            <SettingsIcon size={18} aria-hidden="true" />
          </button>
          <button
            className="theme-button"
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
            aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
          >
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main className="workspace">{renderCurrentView()}</main>

      {renderQuickOrderProductPicker()}

      {showOrderDraftBar ? (
        <div className="order-draft-bar">
          <div>
            <strong>Pedido em andamento</strong>
            <span>
              {clientById.get(orderClientId)?.nome ?? "Cliente não selecionado"} · {draftItems.length}{" "}
              {draftItems.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <button className="primary-button compact" type="button" onClick={() => openView("new-order")}>
            Voltar
          </button>
        </div>
      ) : null}

      <nav className="bottom-nav" aria-label="Navegação principal">
        <button className={navButtonClass("home")} type="button" onClick={() => openView("home")}>
          <Home size={20} aria-hidden="true" />
          <span>Início</span>
        </button>
        <button className={navButtonClass("orders")} type="button" onClick={() => openView("orders")}>
          <ClipboardList size={20} aria-hidden="true" />
          <span>Pedidos</span>
        </button>
        <button className={navButtonClass("ceasa")} type="button" onClick={() => openView("ceasa")}>
          <ListChecks size={20} aria-hidden="true" />
          <span>Ceasa</span>
        </button>
        <button className={navButtonClass("clients")} type="button" onClick={() => openView("clients")}>
          <Users size={20} aria-hidden="true" />
          <span>Clientes</span>
        </button>
        <button className={navButtonClass("products")} type="button" onClick={() => openView("products")}>
          <Package size={20} aria-hidden="true" />
          <span>Produtos</span>
        </button>
      </nav>
    </div>
  );
}

function EmptyState({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">{icon}</span>
      <strong>{title}</strong>
    </div>
  );
}

export default App;
