import { useEffect, useMemo, useState } from "react";
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
import { initialClients, initialOrders, initialProducts, initialRoutes, initialSettings, units } from "./data";
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
}

type PdfScope = { type: "all" } | { type: "route"; routeId: string };

const DEFAULT_ROUTE_ID = initialRoutes[0]?.id ?? "route-default";
const DEFAULT_LOGO_SRC = "/hortigiro-mark.png";
const FIXED_APP_NAME = initialSettings.appName;
const FIXED_PRIMARY_COLOR = initialSettings.primaryColor;
const FIXED_PDF_FOOTER = initialSettings.pdfFooter;

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
};

const pluralUnits: Record<Unit, string> = {
  caixa: "caixas",
  unidade: "unidades",
  maço: "maços",
  bandeja: "bandejas",
  dúzia: "dúzias",
  cartela: "cartelas",
  saco: "sacos",
  pacote: "pacotes",
};

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

function buildConsolidatedItems(orders: Order[]): ConsolidatedItem[] {
  const grouped = new Map<string, ConsolidatedItem>();

  orders
    .filter((order) => order.status !== "cancelado")
    .forEach((order) => {
      order.itens.forEach((item) => {
        const key = `${item.produtoId}:${item.unidade}`;
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
          produtoNome: item.produtoNome,
          quantidade: item.quantidade,
          unidade: item.unidade,
        });
      });
    });

  return Array.from(grouped.values()).sort((first, second) =>
    first.produtoNome.localeCompare(second.produtoNome, "pt-BR"),
  );
}

function App() {
  const [settings, setSettings] = usePersistentState<AppSettings>("hortigiro.settings", initialSettings);
  const [routes, setRoutes] = usePersistentState<Route[]>("hortigiro.routes", initialRoutes);
  const [clients, setClients] = usePersistentState<Client[]>("hortigiro.clients", initialClients);
  const [products, setProducts] = usePersistentState<Product[]>("hortigiro.products", initialProducts);
  const [orders, setOrders] = usePersistentState<Order[]>("hortigiro.orders", initialOrders);
  const [checkedItems, setCheckedItems] = usePersistentState<Record<string, boolean>>(
    "hortigiro.checkedItems",
    {},
  );
  const [theme, setTheme] = usePersistentState<ThemeMode>("hortigiro.theme", "dark");

  const [view, setView] = useState<View>("home");
  const [selectedRouteId, setSelectedRouteId] = usePersistentState<string>(
    "hortigiro.selectedRouteId",
    DEFAULT_ROUTE_ID,
  );
  const [selectedDeliveryDate, setSelectedDeliveryDate] = useState(getNextDeliveryDate());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [orderClientId, setOrderClientId] = useState(initialClients[0]?.id ?? "");
  const [orderDeliveryDate, setOrderDeliveryDate] = useState(getTomorrowDate());
  const [orderObservation, setOrderObservation] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(initialProducts[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");

  const [clientSearch, setClientSearch] = useState("");
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [productCatalogSearch, setProductCatalogSearch] = useState("");
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [backupMessage, setBackupMessage] = useState("");

  const appName = FIXED_APP_NAME;
  const companyName = settings.companyName.trim() || initialSettings.companyName;
  const logoSrc = DEFAULT_LOGO_SRC;

  const activeRoutes = useMemo(() => routes.filter((route) => route.ativo), [routes]);
  const activeClients = useMemo(() => clients.filter((client) => client.ativo), [clients]);
  const activeClientsForSelectedRoute = useMemo(
    () => activeClients.filter((client) => getRouteFallback(client.routeId) === selectedRouteId),
    [activeClients, selectedRouteId],
  );
  const activeProducts = useMemo(() => products.filter((product) => product.ativo), [products]);

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
    if (!activeRoutes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(activeRoutes[0]?.id ?? DEFAULT_ROUTE_ID);
    }
  }, [activeRoutes, selectedRouteId, setSelectedRouteId]);

  useEffect(() => {
    const selectedClientBelongsToRoute = activeClientsForSelectedRoute.some(
      (client) => client.id === orderClientId,
    );

    if (!selectedClientBelongsToRoute) {
      setOrderClientId(activeClientsForSelectedRoute[0]?.id ?? "");
    }
  }, [activeClientsForSelectedRoute, orderClientId]);

  useEffect(() => {
    if (!selectedProductId && activeProducts[0]) {
      setSelectedProductId(activeProducts[0].id);
    }
  }, [activeProducts, selectedProductId]);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
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
    () => buildConsolidatedItems(ordersForSelectedDelivery),
    [ordersForSelectedDelivery],
  );

  const consolidatedAllItems = useMemo(
    () => buildConsolidatedItems(ordersForSelectedDate),
    [ordersForSelectedDate],
  );

  const selectedOrder = selectedOrderId ? orders.find((order) => order.id === selectedOrderId) : undefined;

  const filteredProducts = useMemo(() => {
    const search = normalizeText(productSearch);
    return activeProducts.filter((product) => normalizeText(product.nome).includes(search));
  }, [activeProducts, productSearch]);

  const filteredClients = useMemo(() => {
    const search = normalizeText(clientSearch);
    return clients.filter(
      (client) =>
        getRouteFallback(client.routeId) === selectedRouteId &&
        [client.nome, client.telefone, client.endereco].some((field) =>
          normalizeText(field).includes(search),
        ),
    );
  }, [clients, clientSearch, selectedRouteId]);

  const filteredCatalogProducts = useMemo(() => {
    const search = normalizeText(productCatalogSearch);
    return products.filter((product) => normalizeText(product.nome).includes(search));
  }, [products, productCatalogSearch]);

  const duplicateProduct = useMemo(() => {
    const normalizedName = normalizeText(productForm.nome.trim());

    if (!normalizedName) {
      return undefined;
    }

    return products.find(
      (product) => product.id !== editingProductId && normalizeText(product.nome.trim()) === normalizedName,
    );
  }, [editingProductId, productForm.nome, products]);

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
      itens: consolidatedAllItems.length,
    };
  }, [consolidatedAllItems.length, ordersForSelectedDate]);

  const routePurchaseSummaries = useMemo(
    () =>
      activeRoutes.map((route) => {
        const routeOrders = ordersForSelectedDate.filter((order) => getOrderRouteId(order) === route.id);
        const routeItems = buildConsolidatedItems(routeOrders);
        const routeActiveOrders = routeOrders.filter((order) => order.status !== "cancelado");

        return {
          route,
          pedidos: routeActiveOrders.length,
          clientes: new Set(routeActiveOrders.map((order) => order.clienteId)).size,
          itens: routeItems.length,
        };
      }),
    [activeRoutes, clientById, ordersForSelectedDate],
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

  function startNewOrder() {
    setEditingOrderId(null);
    setOrderClientId(activeClientsForSelectedRoute[0]?.id ?? "");
    setOrderDeliveryDate(getTomorrowDate());
    setOrderObservation("");
    setDraftItems([]);
    setProductSearch("");
    setSelectedProductId(activeProducts[0]?.id ?? "");
    setQuantity("1");
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
    setQuantity("1");
    openView("new-order");
  }

  function addDraftItem() {
    const selectedProduct = activeProducts.find((product) => product.id === selectedProductId);
    const parsedQuantity = parseQuantity(quantity);

    if (!selectedProduct || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      return;
    }

    setDraftItems((current) => {
      const existingItem = current.find(
        (item) => item.produtoId === selectedProduct.id && item.unidade === selectedProduct.unidadePadrao,
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
          unidade: selectedProduct.unidadePadrao,
          observacao: "",
        },
      ];
    });
    setQuantity("1");
    setProductSearch("");
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
    const normalizedItems: OrderItem[] = mergeDraftItems(draftItems).map((item) => ({
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

    setClients((current) => [client, ...current]);
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
        current.map((product) =>
          product.id === editingProductId
            ? {
                ...product,
                nome: productName,
                unidadePadrao: productForm.unidadePadrao,
              }
            : product,
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
      ativo: true,
    };

    setProducts((current) => [product, ...current]);
    setSelectedProductId(product.id);
    resetProductForm();
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
      current.map((client) => (client.id === clientId ? { ...client, ativo: !client.ativo } : client)),
    );
  }

  function updateClientRoute(clientId: string, routeId: string) {
    setClients((current) =>
      current.map((client) => (client.id === clientId ? { ...client, routeId } : client)),
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
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `hortigiro-backup-${toDateInputValue(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
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
        setRoutes(payload.routes);
        setClients(payload.clients);
        setProducts(payload.products);
        setOrders(payload.orders);
        setCheckedItems(payload.checkedItems ?? {});
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
    const productWidth = 118;
    const quantityWidth = tableWidth - productWidth;
    const rowHeight = 13;
    const pdfOrders = getOrdersForPdf(scope);
    const pdfItems = buildConsolidatedItems(pdfOrders);
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
      doc.rect(margin, currentY, tableWidth, rowHeight, "FD");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Produto", margin + 4, currentY + 8.5);
      doc.text("Quantidade", margin + productWidth + 4, currentY + 8.5);
      return currentY + rowHeight;
    }

    y = drawTableHeader(y);

    pdfItems.forEach((item, index) => {
      if (y + rowHeight > pageHeight - 18) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
      }

      const isEven = index % 2 === 0;
      doc.setFillColor(isEven ? 250 : 241, isEven ? 252 : 245, isEven ? 250 : 242);
      doc.setDrawColor(177, 187, 177);
      doc.rect(margin, y, productWidth, rowHeight, "FD");
      doc.rect(margin + productWidth, y, quantityWidth, rowHeight, "FD");
      doc.setTextColor(20, 28, 24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(item.produtoNome, margin + 4, y + 8.8);
      doc.text(formatQuantityWithUnit(item.quantidade, item.unidade), margin + productWidth + 4, y + 8.8);
      y += rowHeight;
    });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(9);
    doc.text(`${FIXED_PDF_FOOTER} para ${companyName}`, margin, pageHeight - 8);

    return doc.output("blob");
  }

  async function exportPdf(mode: "download" | "share", scope: PdfScope = { type: "route", routeId: selectedRouteId }) {
    const pdfItems = buildConsolidatedItems(getOrdersForPdf(scope));

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

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `entrega-${routeSlug}-${selectedDeliveryDate}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
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
          <button className="secondary-button" type="button" onClick={() => openView("orders")}>
            <ChevronLeft size={18} aria-hidden="true" />
            Voltar
          </button>
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

          <div className="product-finder">
            <label className="search-field">
              <Search size={17} aria-hidden="true" />
              <input
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Buscar produto"
              />
            </label>

            <div className="field-grid three">
              <label>
                <span>Produto</span>
                <select
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                >
                  {filteredProducts.map((product) => (
                    <option value={product.id} key={product.id}>
                      {product.nome} ({product.unidadePadrao})
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

        {consolidatedAllItems.length === 0 ? (
          <EmptyState icon={<ShoppingBasket size={30} />} title="Lista vazia nesta entrega" />
        ) : (
          <div className="ceasa-list">
            {consolidatedAllItems.map((item) => {
              const itemChecked = checkedItems[checkedKey(item)] ?? false;
              return (
                <button
                  className={itemChecked ? "ceasa-item checked" : "ceasa-item"}
                  key={`${item.produtoId}-${item.unidade}`}
                  onClick={() => toggleChecked(item)}
                  type="button"
                >
                  <span className="check-box" aria-hidden="true">
                    {itemChecked ? <CheckCircle2 size={20} /> : null}
                  </span>
                  <span>{item.produtoNome}</span>
                  <strong>{formatQuantityWithUnit(item.quantidade, item.unidade)}</strong>
                </button>
              );
            })}
          </div>
        )}

        <section className="content-section">
          <div className="section-heading">
            <h2>PDFs por rota</h2>
            <span className="soft-badge">Separação por rota</span>
          </div>
          <div className="route-pdf-grid">
            {routePurchaseSummaries.map(({ route, pedidos, clientes, itens }) => (
              <article className="route-pdf-card" key={route.id}>
                <div>
                  <strong>{route.nome}</strong>
                  <span>
                    {pedidos} pedidos - {clientes} clientes - {itens} itens
                  </span>
                </div>
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
              </article>
            ))}
          </div>
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
                value={productForm.nome}
                onChange={(event) =>
                  setProductForm((current) => ({ ...current, nome: event.target.value }))
                }
                placeholder="Ex: Tomate"
              />
            </label>
            <label>
              <span>Unidade padrão</span>
              <select
                value={productForm.unidadePadrao}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    unidadePadrao: event.target.value as Unit,
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
            <button
              className="primary-button align-end"
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
                <span>{product.unidadePadrao}</span>
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

  return (
    <div className="app-shell">
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
