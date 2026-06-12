export type OrderStatus = "aberto" | "entregue" | "cancelado";

export type Unit =
  | "caixa"
  | "unidade"
  | "maço"
  | "bandeja"
  | "dúzia"
  | "cartela"
  | "saco"
  | "pacote"
  | "kg";

export interface Route {
  id: string;
  nome: string;
  ativo: boolean;
}

export interface AppSettings {
  appName: string;
  companyName: string;
  primaryColor: string;
  pdfFooter: string;
  logoDataUrl: string;
  telefone: string;
  cidade: string;
  cnpj: string;
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  observacaoPadrao: string;
  routeId?: string;
  ativo: boolean;
}

export interface Product {
  id: string;
  nome: string;
  unidadePadrao: Unit;
  ativo: boolean;
}

export interface OrderItem {
  id: string;
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  unidade: Unit;
  observacao: string;
}

export interface Order {
  id: string;
  clienteId: string;
  routeId?: string;
  dataLancamento: string;
  dataEntrega: string;
  status: OrderStatus;
  observacaoGeral: string;
  itens: OrderItem[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface ConsolidatedItem {
  produtoId: string;
  produtoNome: string;
  quantidade: number;
  unidade: Unit;
}
