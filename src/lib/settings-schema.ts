/**
 * Mapa das Configurações (réplica da tela do eugestor). Os valores padrão são os que a conta Teclive tem hoje no eugestor;
 * o que for alterado aqui fica salvo no banco (tabela app_settings) por seção.
 */
export type Field = {
  key: string; label: string; type: "text" | "number" | "toggle" | "select" | "textarea" | "password" | "radio";
  suffix?: string; options?: string[]; help?: string; default?: string | number | boolean; placeholder?: string; wide?: boolean;
};
export type Block = { title?: string; help?: string; fields: Field[] };
export type Column = { key: string; label: string; type?: "text" | "number" | "select"; options?: string[]; suffix?: string };
export type Row = Record<string, string | number | boolean>;
export type Section = {
  slug: string; group: string; title: string; icon: string; href?: string;
  kind: "form" | "table" | "info" | "files" | "app" | "monitoring" | "wallet" | "company";
  blocks?: Block[]; columns?: Column[]; rows?: Row[]; newLabel?: string; intro?: string; benefits?: string[]; status?: string;
};

const OPERATIONS = ["Faturamento de Contratos", "Faturamento de Serviços", "Faturamento de Produtos", "Faturamento de Compra", "Devolução de Compra", "Comodato/Locação de Equipamentos", "Garantia de Equipamentos", "Brinde de Equipamentos"];
const LISTING = ["Todos os Valores", "Apenas Total", "Sem Valores"];
const NF_ENV = ["Produção", "Homologação"];
const BC_MODES = ["- Não Utiliza -", "Margem Valor Agregado (%)", "Pauta (valor)", "Preço Tabelado Máx. (valor)", "Valor da operação"];
const ST_MODES = ["- Não Utiliza -", "Preço tabelado ou máximo sugerido", "Lista Negativa (valor)", "Lista Positiva (valor)", "Lista Neutra (valor)", "Margem Valor Agregado (%)", "Pauta (valor)", "Valor da Operação"];
const PIS_ENTRADA = ["- Selecione -", "50 - Operação com Direito a Crédito - Vinculada Exclusivamente a Receita Tributada no Mercado Interno", "70 - Operação de Aquisição sem Direito a Crédito", "71 - Operação de Aquisição com Isenção", "72 - Operação de Aquisição com Suspensão", "73 - Operação de Aquisição a Alíquota Zero", "74 - Operação de Aquisição sem Incidência da Contribuição", "98 - Outras Operações de Entrada", "99 - Outras Operações"];
const PIS_SAIDA = ["- Selecione -", "01 - Operação Tributável com Alíquota Básica", "04 - Operação Tributável Monofásica - Revenda a Alíquota Zero", "06 - Operação Tributável a Alíquota Zero", "07 - Operação Isenta da Contribuição", "08 - Operação sem Incidência da Contribuição", "09 - Operação com Suspensão da Contribuição", "49 - Outras Operações de Saída"];
const UFS = ["Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"];

const toggle = (key: string, label: string, def: boolean, help?: string): Field => ({ key, label, type: "toggle", default: def, help });

export const SETTINGS_GROUPS = ["Usuários", "Empresa", "Financeiro", "Setores", "Fiscal", "Integrações"] as const;

export const SECTIONS: Section[] = [
  /* Usuários — telas que já existem no sistema */
  { slug: "meus-dados", group: "Usuários", title: "Meus Dados", icon: "person", href: "/meus-dados", kind: "info" },
  { slug: "usuarios", group: "Usuários", title: "Usuários", icon: "group", href: "/access-control", kind: "info" },
  { slug: "perfis-de-acesso", group: "Usuários", title: "Perfis de Acesso", icon: "lock", href: "/access-control", kind: "info" },

  /* Empresa */
  { slug: "dados-da-empresa", group: "Empresa", title: "Dados da Empresa", icon: "business", kind: "company" },
  {
    slug: "empresa-config", group: "Empresa", title: "Configurações da Empresa", icon: "settings", kind: "form",
    blocks: [
      { title: "Preço de Venda", fields: [{ key: "margemLucro", label: "Margem de Lucro Padrão", type: "number", suffix: "%", default: "50,00", help: "Percentual padrão utilizado para formação do preço de venda de produtos ou serviços." }] },
      { title: "Recibo de locação", fields: [
        toggle("usaReciboLocacao", "Utiliza Recibo de Locação", false, "Define se no faturamento de Contratos será gerado o recibo de locação, documento fiscal auxiliar emitido para serviços de locação."),
        { key: "proximoReciboLocacao", label: "Número do Próximo Recibo de Locação", type: "number", default: 0, help: "Número do próximo recibo de locação." },
        toggle("ocultarProdutosLocados", "Ocultar impressão de produtos locados", false, "Define se os produtos locados devem ser ocultados na impressão de recibos de locação."),
        toggle("agruparServicos", "Agrupar serviços", false, "Define se os serviços devem ser agrupados na impressão de recibos de locação."),
      ] },
      { title: "Configurações Tributárias", fields: [
        { key: "tribFederalServicos", label: "Tributação Federal para Serviços", type: "number", suffix: "%", default: "0", help: "Percentual padrão de tributação federal sobre operações de faturamento de serviços (Lei 12.741/2012 — Transparência Fiscal)." },
        { key: "tribFederalProdutos", label: "Tributação Federal para Produtos", type: "number", suffix: "%", default: "0", help: "Percentual padrão de tributação federal sobre operações de faturamento de produtos (Lei 12.741/2012)." },
        { key: "arredondamentoIss", label: "Tipo de Arredondamento ISS", type: "select", options: ["Arredondamento Simples", "Norma ABNT NBR 5891"], default: "Arredondamento Simples" },
      ] },
      { title: "Faturamento", fields: [
        { key: "opContrato", label: "Operação de Faturamento de Contrato", type: "select", options: OPERATIONS, default: "Faturamento de Contratos" },
        { key: "opServico", label: "Operação de Faturamento de Serviço", type: "select", options: OPERATIONS, default: "Faturamento de Serviços" },
        { key: "opProduto", label: "Operação de Faturamento de Produto", type: "select", options: OPERATIONS, default: "Faturamento de Produtos" },
        { key: "opCompra", label: "Operação de Faturamento de Compra", type: "select", options: OPERATIONS, default: "Faturamento de Compra" },
      ] },
      { title: "Faturamento de Ordem de Serviço", fields: [
        { key: "opOsLocacao", label: "Operação de Locação/Comodato de Equipamentos da OS", type: "select", options: OPERATIONS, default: "Comodato/Locação de Equipamentos" },
        { key: "opOsGarantia", label: "Operação de Garantia de Equipamentos da OS", type: "select", options: OPERATIONS, default: "Garantia de Equipamentos" },
        { key: "opOsBrinde", label: "Operação de Brinde de Equipamentos da OS", type: "select", options: OPERATIONS, default: "Brinde de Equipamentos" },
      ] },
    ],
  },

  /* Financeiro */
  {
    slug: "financeiro", group: "Financeiro", title: "Financeiro", icon: "payments", kind: "form",
    blocks: [
      { title: "Configurações Gerais", fields: [
        { key: "multaAtraso", label: "Multa por atraso", type: "number", suffix: "%", default: "2" },
        { key: "jurosMoraDiaria", label: "Juros de Mora Diária", type: "number", suffix: "%", default: "0,33" },
        { key: "limiteDesconto", label: "Limite de Desconto", type: "number", suffix: "%", default: "10" },
      ] },
      { title: "Centro de Resultados", fields: [toggle("usaCentroResultados", "Utiliza Centro de Resultados", true), { key: "numeroRecibo", label: "Número atual do recibo", type: "number", default: 55 }] },
      { title: "Categorias de Contas a Pagar", fields: [
        { key: "pagarDescontos", label: "Categoria de Descontos", type: "text", default: "Descontos Obtidos de Títulos" },
        { key: "pagarJuros", label: "Categoria de Juros", type: "text", default: "Juros Sobre Títulos em Atraso" },
        { key: "pagarMulta", label: "Categoria de Multa", type: "text", default: "Multas Sobre Títulos em Atraso" },
      ] },
      { title: "Categorias de Contas a Receber", fields: [
        { key: "receberDescontos", label: "Categoria de Descontos", type: "text", default: "Descontos Concedidos" },
        { key: "receberJuros", label: "Categoria de Juros", type: "text", default: "" },
        { key: "receberMulta", label: "Categoria de Multa", type: "text", default: "" },
        { key: "receberAdiantamento", label: "Categoria de Adiantamento", type: "text", default: "" },
      ] },
      { title: "Categorias de Tributos", fields: ["ISS", "INSS", "IRRF", "CSLL", "PIS", "COFINS"].map((t) => ({ key: `tributo${t}`, label: `Categoria do ${t}`, type: "text" as const, default: "" })) },
    ],
  },
  { slug: "boletos", group: "Financeiro", title: "Boletos", icon: "receipt_long", kind: "info", status: "Em avaliação", intro: "Credenciamento ao Boleto Inside", benefits: ["Emita boletos rapidamente", "Revolucione as tarifas bancárias", "Acompanhe o controle das cobranças", "Automatize inteiramente os serviços bancários"] },
  { slug: "cartoes-de-credito", group: "Financeiro", title: "Cartões de Crédito", icon: "credit_card", kind: "info", status: "Em avaliação", intro: "Credenciamento ao Cartão Inside", benefits: ["Credenciamento rápido", "Taxas e tarifas competitivas", "Use a solução ideal para receitas recorrentes", "Concilie o seu cartão de crédito"] },
  { slug: "carteira-de-cobranca", group: "Financeiro", title: "Carteira de cobrança", icon: "account_balance", kind: "wallet", intro: "Integração para remessa bancária", rows: [{ conta: "20377872-3/0001", ativa: true }] },

  /* Setores */
  {
    slug: "comercial", group: "Setores", title: "Comercial", icon: "work", kind: "form",
    blocks: [
      { title: "Configurações do Orçamento", fields: [
        { key: "validadeDias", label: "Validade do orçamento", type: "number", suffix: "dias", default: 7 },
        { key: "descontoMaxServicos", label: "Desconto máximo para serviços", type: "number", suffix: "%", default: 99 },
        { key: "descontoMaxProdutos", label: "Desconto máximo para produtos", type: "number", suffix: "%", default: 99 },
        toggle("alterarValorProdutos", "Permite alterar o valor dos produtos?", true, "Sim, permitir alterar o valor."),
        toggle("alterarValorServicos", "Permite alterar o valor dos serviços?", true, "Sim, permite alterar o valor."),
        toggle("alterarValorRecorrentes", "Permite alterar o valor dos serviços recorrentes?", true, "Sim, permite alterar o valor."),
        toggle("ignorarLiberacao", "Ignorar a etapa de liberação de orçamentos?", true, "Sim, habilitar a liberação automática."),
        { key: "maxParcelas", label: "Número máximo de parcelas", type: "number", suffix: "parcelas", default: 12, help: "Número máximo permitido é de 200 parcelas." },
      ] },
      { title: "Retorno de Locação", fields: [
        toggle("usaRetornoLocacao", "Utiliza retorno de locação", true),
        { key: "servicoLocacao", label: "Serviço Locação", type: "text", default: "Locação/Comodato de Equipamentos" },
        { key: "prazoMedioRetorno", label: "Prazo médio de retorno da locação", type: "number", suffix: "meses", default: 2 },
        { key: "prazoMaximoRetorno", label: "Prazo máximo de retorno da locação", type: "number", suffix: "meses", default: 3 },
        toggle("usaPrecoCusto", "Utiliza preço de custo", false, "Esta opção não se aplica a orçamentos de venda."),
      ] },
      { title: "Observações", fields: [{ key: "observacoes", label: "Texto que será exibido na impressão do orçamento", type: "textarea", default: "", wide: true }] },
    ],
  },
  {
    slug: "operacional", group: "Setores", title: "Operacional", icon: "build", kind: "form",
    blocks: [
      { title: "Dados Gerais", fields: [
        toggle("exibirEtapaRetirada", "Exibir etapa 'OS aguardando retirada de materiais'?", true, "Sim, exibir etapa no andamento do operacional."),
        toggle("obrigarAtendimento", "Obrigar ao menos um atendimento na OS?", false, "Sim, obrigar pelo menos um atendimento."),
        toggle("retiradaOpcional", "Retirada opcional de produtos?", true, "Sim, torna opcional a retirada de produtos."),
        { key: "localEstoqueRetorno", label: "Local de estoque preferencial para retorno de equipamentos", type: "text", default: "Retorno de Locação/Comodato" },
      ] },
      { title: "Configurações do OS Mobile", fields: [toggle("osMobileFechamento", "Permitir o fechamento da OS pelo aplicativo", false, "Sim, permitir o fechamento.")] },
      { title: "Configuração da Impressão de Ordem de Serviço", fields: [
        toggle("imprimeProdutos", "Exibir produtos no resumo da Ordem de Serviço", true),
        { key: "listagemProdutos", label: "Tipo de listagem dos produtos", type: "radio", options: LISTING, default: "Sem Valores" },
        toggle("imprimeServicos", "Exibir serviços no resumo da Ordem de Serviço", true),
        { key: "listagemServicos", label: "Tipo de listagem dos serviços", type: "radio", options: LISTING, default: "Sem Valores" },
        toggle("imprimeARetirar", "Exibir produtos a retirar no resumo da Ordem de Serviço", true),
        { key: "listagemARetirar", label: "Tipo de listagem dos produtos a retirar", type: "radio", options: LISTING, default: "Sem Valores" },
        toggle("imprimeAdiantamentos", "Exibir adiantamentos no resumo da Ordem de Serviço", false),
      ] },
    ],
  },
  {
    slug: "contrato", group: "Setores", title: "Contrato", icon: "description", kind: "form",
    blocks: [
      { title: "Reajuste Contratual", fields: [
        { key: "indiceFinanceiro", label: "Índice Financeiro", type: "select", options: ["- Selecione -", "Por Valor", "IGP-M", "IPC", "IPCA", "INPC", "INCC", "IGP-DI", "TR Mensal", "Taxa SELIC", "Dissídio da categoria", "Salário mínimo"], default: "IGP-M" },
        toggle("proRata", "Utilizar o cálculo de pro rata no faturamento?", true, "Sim, utilizar-se do cálculo pro rata ao faturar."),
        toggle("proporcionalCancelamento", "Utilizar cálculo proporcional para cancelamento?", true, "Sim, utilizar cálculo proporcional para cancelamento."),
        toggle("proporcionalReajuste", "Utilizar cálculo proporcional de reajuste?", true, "Sim, utilizar cálculo proporcional de reajuste."),
      ] },
      { title: "Multa Contratual", fields: [
        { key: "categoriaMulta", label: "Categoria da Receita", type: "text", default: "Alarme - Comercial" },
        { key: "multaRescisao", label: "Percentual de Multa de Rescisão", type: "number", suffix: "%", default: 10 },
      ] },
      { title: "Configurações para Contratos Expirados", fields: [{ key: "diasAntesExpirar", label: "Dias Antes de Expirar", type: "number", suffix: "dias", default: 45 }] },
      { title: "Faturamento de Contratos", fields: [
        { key: "mesCobranca", label: "Mês da Cobrança", type: "select", options: ["Mês seguinte ao serviço prestado", "No mês em que o serviço foi prestado", "Dois meses após o serviço prestado", "Três meses após o serviço prestado"], default: "Mês seguinte ao serviço prestado" },
        toggle("vencimentoPersonalizado", "Utiliza vencimento personalizado", false),
        { key: "distrato", label: "Distrato", type: "select", options: ["Ignora Distrato", "Distrato Opcional", "Com Distrato Obrigatório"], default: "Com Distrato Obrigatório" },
      ] },
    ],
  },
  { slug: "estoque", group: "Setores", title: "Estoque", icon: "inventory_2", kind: "form", blocks: [{ title: "Movimento avulso de estoque", fields: [toggle("movimentoAvulso", "Permitir movimento avulso de estoque", true, "Habilitado")] }] },

  /* Fiscal */
  {
    slug: "operacoes-de-faturamento", group: "Fiscal", title: "Operações de Faturamento", icon: "swap_horiz", kind: "table", newLabel: "Nova Operação de Faturamento",
    columns: [{ key: "descricao", label: "Descrição" }, { key: "categoria", label: "Categoria" }, { key: "natureza", label: "Natureza Operação" }, { key: "observacao", label: "Observação" }, { key: "status", label: "Status", type: "select", options: ["Ativo", "Inativo"] }],
    rows: [
      { descricao: "Faturamento de Contratos", categoria: "Alarme - Comercial", natureza: "", observacao: "", status: "Ativo" },
      { descricao: "Faturamento de Serviços", categoria: "Receita de Contratos de Manutenção", natureza: "", observacao: "", status: "Ativo" },
      { descricao: "Devolução de Compra", categoria: "Devolução de Compra de Equipamentos", natureza: "", observacao: "", status: "Ativo" },
      { descricao: "Comodato/Locação de Equipamentos", categoria: "CFTV", natureza: "", observacao: "", status: "Ativo" },
    ],
  },
  {
    slug: "nota-fiscal-de-produtos", group: "Fiscal", title: "Nota Fiscal de Produtos", icon: "inventory", kind: "form",
    blocks: [
      { title: "Configuração de Ambientes", fields: [{ key: "modoEmissao", label: "Modo de Emissão", type: "radio", options: NF_ENV, default: "Produção" }, toggle("usaIbsCbs", "Usa IBS/CBS?", false)] },
      { title: "Dados da NF-e (Nota Fiscal Eletrônica)", fields: [{ key: "proximaNota", label: "Número da Próxima Nota", type: "number", default: 382 }, { key: "serie", label: "Série da Nota", type: "number", default: 1 }] },
      { title: "Configuração Fiscais", fields: [
        { key: "aliquotaCreditoIcms", label: "Alíquota de Crédito de ICMS", type: "number", suffix: "%", default: 0 },
        { key: "modalidadeBcIcms", label: "Modalidade da BC do ICMS", type: "select", options: BC_MODES, default: "- Não Utiliza -" },
        { key: "modalidadeBcIcmsSt", label: "Modalidade da BC do ICMS ST", type: "select", options: ST_MODES, default: "- Não Utiliza -" },
        toggle("calculaDifal", "Deve calcular DIFAL interestadual?", false),
      ] },
    ],
  },
  {
    slug: "nota-fiscal-de-servicos", group: "Fiscal", title: "Nota Fiscal de Serviços", icon: "request_quote", kind: "form",
    blocks: [
      { title: "Configuração de Ambientes", fields: [
        { key: "modoEmissao", label: "Modo de Emissão", type: "radio", options: NF_ENV, default: "Produção" },
        { key: "padraoEmissao", label: "Padrão de emissão", type: "radio", options: ["Nacional", "Municipal"], default: "Nacional" },
        { key: "urlConsulta", label: "URL para consulta de NFS-e", type: "text", default: "", wide: true },
        toggle("usaIbsCbs", "Usa IBS/CBS?", false),
      ] },
      { title: "Dados do RPS (Recibo Provisório de Serviços)", fields: [
        { key: "proximoRps", label: "Número do Próximo RPS", type: "number", default: 95 },
        { key: "serie", label: "Série da Nota", type: "number", default: 1 },
        { key: "proximoLote", label: "Número do Próximo Lote", type: "number", default: 34 },
      ] },
      { title: "Regime Especial de Tributação", fields: [
        { key: "regimeEspecial", label: "Regime Especial de Tributação", type: "select", options: ["0 - Nenhum", "1 - Ato Cooperado (Cooperativa)", "2 - Estimativa", "3 - Microempresa Municipal", "4 - Notário ou Registrador", "5 - Profissional Autônomo", "6 - Sociedade de Profissionais"], default: "0 - Nenhum" },
        toggle("removerInscricaoMunicipal", "Remover Inscrição Municipal?", false, "Sim, remover."),
      ] },
    ],
  },
  {
    slug: "icms", group: "Fiscal", title: "ICMS", icon: "percent", kind: "table", newLabel: "Nova Configuração de ICMS",
    columns: [{ key: "estado", label: "Estado", type: "select", options: UFS }, { key: "interestadual", label: "ICMS Interestadual", type: "number", suffix: "%" }, { key: "internoDestino", label: "ICMS Interno do Destino", type: "number", suffix: "%" }, { key: "fcp", label: "ICMS FCP", type: "number", suffix: "%" }],
    rows: [{ estado: "Amazonas", interestadual: 0, internoDestino: 0, fcp: 0 }, { estado: "Santa Catarina", interestadual: 7, internoDestino: 0, fcp: 0 }, { estado: "São Paulo", interestadual: 7, internoDestino: 18, fcp: 0 }],
  },
  {
    slug: "iss", group: "Fiscal", title: "ISS", icon: "receipt", kind: "table", newLabel: "Nova Configuração de ISS",
    columns: [{ key: "codigo", label: "Código do Serviço" }, { key: "tributacao", label: "Código de Tributação do Município" }, { key: "cnae", label: "CNAE de Serviço" }, { key: "aliquota", label: "Alíquota ISS", type: "number", suffix: "%" }],
    rows: [{ codigo: "010701", tributacao: "010701100", cnae: "", aliquota: 2.72 }, { codigo: "140101", tributacao: "140101100", cnae: "", aliquota: 2.72 }, { codigo: "140601", tributacao: "140601100", cnae: "", aliquota: 2.72 }],
  },
  {
    slug: "pis-cofins", group: "Fiscal", title: "PIS/COFINS", icon: "calculate", kind: "form",
    blocks: [{ title: "Dados Básicos", fields: [
      { key: "situacaoEntrada", label: "Situação Tributária PIS/COFINS Entrada", type: "select", options: PIS_ENTRADA, default: "74 - Operação de Aquisição sem Incidência da Contribuição", wide: true },
      { key: "situacaoSaida", label: "Situação Tributária PIS/COFINS Saída", type: "select", options: PIS_SAIDA, default: "08 - Operação sem Incidência da Contribuição", wide: true },
    ] }],
  },

  /* Integrações */
  { slug: "aplicativo-os", group: "Integrações", title: "Aplicativo de Gestão de OS", icon: "smartphone", kind: "app" },
  { slug: "portal-do-cliente", group: "Integrações", title: "Portal do Cliente", icon: "devices", kind: "form", blocks: [{ title: "Portal do Cliente", help: "Área onde seus clientes acompanham ordens de serviço, orçamentos e faturas.", fields: [toggle("ativo", "Habilitar o Portal do Cliente", false, "Quando ativo, os clientes recebem acesso por e-mail."), { key: "mensagem", label: "Mensagem de boas-vindas", type: "textarea", default: "", wide: true }] }] },
  { slug: "monitoramento", group: "Integrações", title: "Monitoramento", icon: "videocam", kind: "monitoring" },
  {
    slug: "emails", group: "Integrações", title: "E-mails", icon: "mail", kind: "form",
    blocks: [{ title: "Dados do E-mail", fields: [
      toggle("exibirLogo", "Exibir a logo no e-mail", true),
      { key: "subtitulo", label: "Subtítulo", type: "text", default: "", wide: true },
      { key: "assinatura", label: "Assinatura", type: "text", default: "", wide: true },
      { key: "rodape", label: "Rodapé", type: "text", default: "", wide: true },
      { key: "copiaOculta", label: "Enviar cópia oculta dos e-mails para", type: "text", default: "", wide: true },
      toggle("usarEmailEmpresa", "Usar e-mail da empresa", true),
    ] }],
  },
  { slug: "sms", group: "Integrações", title: "SMS", icon: "sms", kind: "form", blocks: [{ title: "Configurador do Envio de SMS", fields: [{ key: "usuario", label: "Usuário", type: "text", default: "" }, { key: "senha", label: "Senha", type: "password", default: "" }, { key: "remetente", label: "Remetente", type: "text", default: "" }] }] },
  { slug: "whatsapp", group: "Integrações", title: "WhatsApp (Naty)", icon: "chat", kind: "form", blocks: [{ title: "WhatsApp (Naty)", help: "Para contratar o serviço Naty e começar a usar a integração, acesse a página de planos e preços do fornecedor.", fields: [{ key: "token", label: "Token de Acesso", type: "password", default: "", help: "Entre o token de acesso obtido no seu dashboard na Naty.", wide: true }] }] },
  { slug: "gestao-de-arquivos", group: "Integrações", title: "Gestão dos arquivos", icon: "folder", kind: "files" },
];

export const sectionBySlug = (slug: string) => SECTIONS.find((s) => s.slug === slug);

export function defaultsOf(section: Section): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const b of section.blocks ?? []) for (const f of b.fields) out[f.key] = f.default ?? (f.type === "toggle" ? false : "");
  return out;
}
