import type { AppSettings, Client, Order, Product, Route, Unit } from "./types";

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

export const initialRoutes: Route[] = [{ id: "route-principal", nome: "Rota Principal", ativo: true }];

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

export const initialClients: Client[] = [];

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

export const initialOrders: Order[] = [];
