import type { AppSettings, Client, Order, Product, Route, Unit } from "./types";
import { addDays, getNextDeliveryDate, parseLocalDate, toDateInputValue } from "./utils";

const nextDelivery = getNextDeliveryDate();
const laterDelivery = getNextDeliveryDate(addDays(parseLocalDate(nextDelivery), 1));
const today = toDateInputValue(new Date());

export const units: Unit[] = [
  "caixa",
  "unidade",
  "maço",
  "bandeja",
  "dúzia",
  "cartela",
  "saco",
  "pacote",
];

export const initialRoutes: Route[] = [
  { id: "route-curitiba", nome: "Rota Curitiba", ativo: true },
  { id: "route-itajai", nome: "Rota Itajai", ativo: true },
];

export const initialSettings: AppSettings = {
  appName: "HortiGiro",
  companyName: "Rian Hortifruti",
  primaryColor: "#287e1d",
  pdfFooter: "Gerado pelo HortiGiro",
  logoDataUrl: "",
  telefone: "",
  cidade: "",
  cnpj: "",
};

export const initialClients: Client[] = [
  {
    id: "cliente-1",
    routeId: "route-curitiba",
    nome: "Restaurante Bom Sabor",
    telefone: "(41) 99911-2233",
    endereco: "Centro",
    observacaoPadrao: "Recebe mercadoria até 10h.",
    ativo: true,
  },
  {
    id: "cliente-2",
    routeId: "route-curitiba",
    nome: "Padaria Central",
    telefone: "(41) 98822-3344",
    endereco: "Batel",
    observacaoPadrao: "Separar frutas mais firmes.",
    ativo: true,
  },
  {
    id: "cliente-3",
    routeId: "route-curitiba",
    nome: "Panificadora Sol",
    telefone: "(41) 97733-4455",
    endereco: "Água Verde",
    observacaoPadrao: "",
    ativo: true,
  },
  {
    id: "cliente-4",
    routeId: "route-itajai",
    nome: "Mercado Silva",
    telefone: "(41) 96644-5566",
    endereco: "Portão",
    observacaoPadrao: "Conferir caixas na entrega.",
    ativo: true,
  },
];

export const initialProducts: Product[] = [
  { id: "produto-1", nome: "Tomate", unidadePadrao: "caixa", ativo: true },
  { id: "produto-2", nome: "Banana caturra", unidadePadrao: "caixa", ativo: true },
  { id: "produto-3", nome: "Alface crespa", unidadePadrao: "unidade", ativo: true },
  { id: "produto-4", nome: "Ovos", unidadePadrao: "cartela", ativo: true },
  { id: "produto-5", nome: "Cheiro-verde", unidadePadrao: "maço", ativo: true },
  { id: "produto-6", nome: "Cenoura", unidadePadrao: "caixa", ativo: true },
  { id: "produto-7", nome: "Batata lavada", unidadePadrao: "caixa", ativo: true },
  { id: "produto-8", nome: "Morango", unidadePadrao: "bandeja", ativo: true },
  { id: "produto-9", nome: "Maçã gala", unidadePadrao: "caixa", ativo: true },
  { id: "produto-10", nome: "Cebola", unidadePadrao: "saco", ativo: true },
];

export const initialOrders: Order[] = [
  {
    id: "pedido-1",
    clienteId: "cliente-1",
    routeId: "route-curitiba",
    dataLancamento: today,
    dataEntrega: nextDelivery,
    status: "aberto",
    observacaoGeral: "Entregar antes do almoço.",
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    itens: [
      {
        id: "item-1",
        produtoId: "produto-1",
        produtoNome: "Tomate",
        quantidade: 1.5,
        unidade: "caixa",
        observacao: "",
      },
      {
        id: "item-2",
        produtoId: "produto-3",
        produtoNome: "Alface crespa",
        quantidade: 20,
        unidade: "unidade",
        observacao: "",
      },
      {
        id: "item-3",
        produtoId: "produto-4",
        produtoNome: "Ovos",
        quantidade: 2,
        unidade: "cartela",
        observacao: "",
      },
    ],
  },
  {
    id: "pedido-2",
    clienteId: "cliente-2",
    routeId: "route-curitiba",
    dataLancamento: today,
    dataEntrega: nextDelivery,
    status: "aberto",
    observacaoGeral: "Banana não muito madura.",
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    itens: [
      {
        id: "item-4",
        produtoId: "produto-2",
        produtoNome: "Banana caturra",
        quantidade: 0.5,
        unidade: "caixa",
        observacao: "",
      },
      {
        id: "item-5",
        produtoId: "produto-1",
        produtoNome: "Tomate",
        quantidade: 1,
        unidade: "caixa",
        observacao: "",
      },
      {
        id: "item-6",
        produtoId: "produto-5",
        produtoNome: "Cheiro-verde",
        quantidade: 6,
        unidade: "maço",
        observacao: "",
      },
    ],
  },
  {
    id: "pedido-3",
    clienteId: "cliente-4",
    routeId: "route-itajai",
    dataLancamento: today,
    dataEntrega: laterDelivery,
    status: "entregue",
    observacaoGeral: "",
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    itens: [
      {
        id: "item-7",
        produtoId: "produto-7",
        produtoNome: "Batata lavada",
        quantidade: 2,
        unidade: "caixa",
        observacao: "",
      },
      {
        id: "item-8",
        produtoId: "produto-10",
        produtoNome: "Cebola",
        quantidade: 1,
        unidade: "saco",
        observacao: "",
      },
    ],
  },
];
