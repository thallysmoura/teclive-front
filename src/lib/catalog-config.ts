import { CADASTROS_KEYS, type CatalogKind } from "./cadastros";

export type CatalogConfig = {
  kind: CatalogKind;
  permissionKey: string;
  title: string;
  singular: string;
  newLabel: string;
  createLabel: string;
  fieldLabel: string;
  help: string;
  searchPlaceholder: string;
  gender: "a" | "o";
};

/** Cadastros simples (descrição + ativo), indexados pelo slug da URL. */
export const CATALOGS: Record<string, CatalogConfig> = {
  marcas: {
    kind: "brands", permissionKey: CADASTROS_KEYS.marcas, title: "Marcas", singular: "marca", newLabel: "Nova Marca", createLabel: "Criar marca",
    fieldLabel: "Descrição da marca", help: "Usado para identificar a marca do produto no cadastro de produtos.", searchPlaceholder: "Pesquisar...", gender: "a",
  },
  "grupos-produtos": {
    kind: "product-groups", permissionKey: CADASTROS_KEYS["grupos-produtos"], title: "Grupo de Produtos", singular: "grupo de produtos", newLabel: "Novo Grupo", createLabel: "Criar grupo de produtos",
    fieldLabel: "Descrição do grupo de produtos", help: "Usado para organizar os produtos em grupos no cadastro de produtos.", searchPlaceholder: "Pesquisar...", gender: "o",
  },
  "ramos-atividade": {
    kind: "activity-branches", permissionKey: CADASTROS_KEYS["ramos-atividade"], title: "Ramos de Atividade", singular: "ramo de atividade", newLabel: "Novo Ramo", createLabel: "Criar ramo de atividade",
    fieldLabel: "Descrição do ramo de atividade", help: "Usado para classificar o ramo de atividade das pessoas cadastradas.", searchPlaceholder: "Pesquisar...", gender: "o",
  },
};
