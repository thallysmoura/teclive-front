export type HelpTopic = {
  id: string;
  title: string;
  icon: string;
  /** Caminho no menu, ex.: "Comercial › Orçamentos". */
  path: string;
  href?: string;
  purpose: string;
  steps: string[];
  tips?: string[];
};

export type HelpSection = { id: string; title: string; intro: string; icon: string; topics: HelpTopic[] };

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "primeiros-passos",
    title: "Primeiros passos",
    icon: "rocket_launch",
    intro: "Conheça os recursos que funcionam da mesma forma em todo o sistema. Aprender uma vez vale para todas as telas.",
    topics: [
      {
        id: "menu-lateral", title: "Menu lateral", icon: "menu", path: "Menu lateral",
        purpose: "É o mapa do sistema: reúne todos os módulos em grupos (Administrativo, Comercial, Estoque e Governança).",
        steps: [
          "Clique no nome de um grupo, como Comercial, para abrir ou recolher os itens dele.",
          "Clique no item desejado: a página abre ao lado e o item fica destacado, para você saber onde está.",
          "Clique no logo, no topo, para voltar à página inicial a qualquer momento.",
          "No celular, toque no ícone de menu (três linhas) para abrir e fechar a barra lateral.",
        ],
        tips: ["O menu se ajusta ao tamanho da tela: em telas baixas o texto diminui um pouco e, se necessário, só o grupo da página atual fica aberto.", "Você só vê os itens que o administrador liberou para o seu usuário."],
      },
      {
        id: "listas", title: "Listas: buscar, filtrar e ordenar", icon: "table_rows", path: "Todas as listas",
        purpose: "Todas as listagens têm a mesma lógica, o que facilita encontrar qualquer registro rapidamente.",
        steps: [
          "Digite no campo de busca e pressione Enter (ou clique na lupa) para pesquisar.",
          "Use o botão de funil para abrir os filtros avançados e clique em Aplicar Filtros.",
          "Clique no título de uma coluna para ordenar: a seta indica se a ordem é crescente (↑) ou decrescente (↓). Clique de novo para inverter.",
          "Marque Exibir inativos para ver também os registros desativados.",
          "Use as páginas no rodapé para navegar quando houver muitos registros.",
        ],
        tips: ["Os indicadores e gráficos no topo de várias listas resumem os dados; eles ajudam a decidir o que filtrar."],
      },
      {
        id: "novo-editar", title: "Criar, editar, inativar e excluir", icon: "edit_square", path: "Todas as listas",
        purpose: "Os botões de ação seguem um padrão: o que você aprender em um cadastro serve para todos os outros.",
        steps: [
          "Clique no botão verde \"Novo ...\", no topo da página, para criar um registro.",
          "Em cada linha, clique em Editar: a janela de edição abre sobre a lista, sem trocar de tela.",
          "No menu Opções da linha, escolha Inativar para tirar o registro de circulação sem perder o histórico, ou Ativar para trazê-lo de volta.",
          "Escolha Excluir apenas quando o registro nunca foi usado; o sistema confirma antes e bloqueia a exclusão se houver vínculos.",
        ],
        tips: ["Prefira Inativar a Excluir: o histórico de orçamentos, movimentos e relatórios continua correto.", "Campos com * são obrigatórios; as mensagens de erro aparecem abaixo do campo."],
      },
      {
        id: "notificacoes", title: "Notificações", icon: "notifications", path: "Sino no topo",
        purpose: "Concentra avisos do sistema destinados a você.",
        steps: [
          "Clique no sino: no computador abre uma caixa com a lista; no celular abre uma tela cheia.",
          "Use as abas Todas e Não lidas para filtrar.",
          "Clique em uma notificação para marcá-la como lida, ou em Marcar todas como lidas.",
        ],
        tips: ["O número vermelho no sino mostra quantas notificações ainda não foram lidas."],
      },
    ],
  },
  {
    id: "visao-geral",
    title: "Visão Geral e Indicadores",
    icon: "monitoring",
    intro: "O ponto de partida e o painel para acompanhar o desempenho comercial.",
    topics: [
      {
        id: "visao-geral", title: "Visão Geral", icon: "home", path: "Visão Geral", href: "/home",
        purpose: "Página inicial do sistema. A partir dela você acessa qualquer módulo pelo menu lateral.",
        steps: ["Clique em Visão Geral no menu, ou no logo, para voltar ao início.", "Se aparecer a mensagem de aguardando permissão, peça a um administrador para liberar os itens do menu para você."],
      },
      {
        id: "indicadores", title: "Indicadores", icon: "area_chart", path: "Indicadores", href: "/indicadores",
        purpose: "Mostra como estão os orçamentos do mês: quantos são, quanto valem e em que situação estão.",
        steps: [
          "Escolha o mês nas setas ou no seletor de período; \"Mês atual\" volta ao período corrente.",
          "Leia os cartões de resumo: orçamentos no mês, valor orçado (com a variação em relação ao mês anterior), valor em aberto e vendas ganhas.",
          "Nos gráficos, passe o mouse (ou toque) em uma fatia ou na legenda para ver valor e porcentagem.",
          "Use o botão Rosca/Barras para trocar a forma de visualizar.",
        ],
        tips: ["Os orçamentos entram no mês em que foram abertos.", "A taxa de conversão compara orçamentos ganhos com os perdidos (vencidos, recusados e cancelados)."],
      },
    ],
  },
  {
    id: "administrativo",
    title: "Administrativo",
    icon: "apartment",
    intro: "Os cadastros-base do sistema. Cadastre aqui uma vez e use em orçamentos, movimentos de estoque e relatórios.",
    topics: [
      {
        id: "pessoas", title: "Pessoas", icon: "groups", path: "Administrativo › Pessoas", href: "/cadastros/pessoas",
        purpose: "Cadastro único de clientes, fornecedores, funcionários, técnicos, transportadores e vendedores, sejam pessoas físicas ou jurídicas.",
        steps: [
          "Clique em Nova Pessoa e escolha o tipo: Física ou Jurídica.",
          "Informe o nome (ou razão social), o CPF/CNPJ e os demais dados; a máscara é aplicada enquanto você digita.",
          "Marque o Tipo de Cadastro: uma mesma pessoa pode ser cliente e fornecedor ao mesmo tempo.",
          "Preencha e-mail e telefone: eles são usados no envio de orçamentos.",
          "Para localizar alguém, use a busca ou o filtro por tipo de pessoa e tipo de cadastro.",
        ],
        tips: ["O CPF/CNPJ não pode se repetir: o sistema avisa se já existir cadastro.", "A porcentagem de cadastros completos aparece nos indicadores do topo; completar os dados ajuda no relacionamento."],
      },
      {
        id: "servicos", title: "Serviços", icon: "home_repair_service", path: "Administrativo › Serviços", href: "/cadastros/servicos",
        purpose: "Catálogo dos serviços que a empresa vende, com preço de custo, margem e preço de venda.",
        steps: [
          "Clique em Novo Serviço e indique se ele é para Contratos ou para Ordens de Serviço.",
          "Informe a descrição e a categoria da receita.",
          "Na precificação, digite o custo e a margem: o preço de venda é calculado. Se preferir, digite o preço e a margem é recalculada.",
          "Use as opções de configuração para serviços de locação ou que permitem bloqueio por inadimplência.",
        ],
        tips: ["Os serviços cadastrados aparecem para escolha na aba Serviços dos orçamentos."],
      },
      {
        id: "produtos", title: "Produtos", icon: "inventory_2", path: "Administrativo › Produtos", href: "/cadastros/produtos",
        purpose: "Catálogo de produtos usados em orçamentos e no controle de estoque.",
        steps: [
          "Clique em Novo Produto e informe a descrição, a unidade de medida, o grupo e a marca.",
          "Faça a precificação (custo, margem e venda) como nos serviços.",
          "Em Informações Adicionais, preencha identificador, código do fornecedor e código de barras, se existirem.",
          "Marque Permite Estoque Negativo ou Pode ser Locado conforme a necessidade.",
          "Use o filtro por marca e grupo para encontrar produtos.",
        ],
        tips: ["Produtos com saldo em estoque ou movimentações não podem ser excluídos; inative-os.", "O cartão Sem estoque mostra os produtos que precisam de reposição."],
      },
      {
        id: "marcas", title: "Marcas", icon: "sell", path: "Administrativo › Marcas", href: "/cadastros/marcas",
        purpose: "Lista das marcas dos produtos, usada para classificar e filtrar o catálogo.",
        steps: ["Clique em Nova Marca, digite o nome e salve.", "Para corrigir um nome, use Editar: todos os produtos daquela marca são atualizados juntos."],
        tips: ["Uma marca em uso por produtos não pode ser excluída; inative-a se não for mais necessária."],
      },
      {
        id: "grupos", title: "Grupo de Produtos", icon: "category", path: "Administrativo › Grupo de Produtos", href: "/cadastros/grupos-produtos",
        purpose: "Organiza os produtos em grupos (por exemplo CFTV, Automação ou Energia).",
        steps: ["Clique em Novo Grupo, informe a descrição e salve.", "Ao cadastrar um produto, escolha o grupo na lista.", "O gráfico de valor em estoque por grupo ajuda a ver onde está o capital parado."],
      },
      {
        id: "ramos", title: "Ramos de Atividade", icon: "storefront", path: "Administrativo › Ramos de Atividade", href: "/cadastros/ramos-atividade",
        purpose: "Classifica os clientes pelo segmento em que atuam, como padaria, clínica ou condomínio.",
        steps: ["Clique em Novo Ramo, informe a descrição e salve.", "Use a busca para localizar um ramo existente antes de criar outro."],
      },
    ],
  },
  {
    id: "comercial",
    title: "Comercial",
    icon: "work",
    intro: "Do primeiro contato até a venda fechada: leads, ações de venda, orçamentos e agenda.",
    topics: [
      {
        id: "orcamentos", title: "Orçamentos", icon: "request_quote", path: "Comercial › Orçamentos", href: "/comercial/orcamentos",
        purpose: "Central das propostas comerciais: cria, acompanha e fecha orçamentos de venda ou de locação.",
        steps: [
          "Clique em Novo Orçamento, escolha o cliente (ou lead), a validade e, se quiser, título e vendedor.",
          "No detalhe do orçamento, abra a aba Produtos ou Serviços e use Adicionar para incluir itens, com quantidade, valor e desconto.",
          "Em Formas de Pagamento, cadastre as propostas (à vista, PIX, boleto, cartão, parcelado).",
          "Use Ficha Técnica e Observação, na aba Informações, para descrever o escopo e as condições.",
          "Quando o cliente aceitar, clique em Ganhar / Recusar: escolha a forma de pagamento para ganhar ou o motivo para recusar.",
          "Orçamentos ganhos ficam Liberados e podem seguir para a ordem de serviço.",
          "No menu Ações da lista: Imprimir, Enviar via E-mail ou WhatsApp, Trocar entre Locação e Venda, Duplicar e Cancelar Orçamento.",
        ],
        tips: [
          "Situações: Aberto (dentro da validade), Vencido (passou da validade), Liberado (ganho), OS Aberta, Concluído, Recusado e Cancelado.",
          "Orçamentos que não estão mais abertos não aceitam alterações; use Duplicar para criar uma nova versão.",
          "Anexos de até 500 KB e o histórico completo ficam nas abas Anexos e Histórico.",
        ],
      },
      {
        id: "prospects", title: "Prospects", icon: "person_search", path: "Comercial › Prospects", href: "/comercial/prospects",
        purpose: "Lista de leads: pessoas com potencial de compra que ainda não são clientes.",
        steps: [
          "Clique em Novo Lead e informe nome, documento, vendedor responsável, telefone e e-mail.",
          "Registre ações de venda e orçamentos para o lead conforme a negociação avança.",
          "Quando o lead fechar negócio, use Opções › Converter em cliente. Ganhar um orçamento também converte automaticamente.",
        ],
        tips: ["Os indicadores mostram quantos leads já têm orçamento e quais estão sem vendedor."],
      },
      {
        id: "motivos", title: "Motivos de Recusa de Orçamento", icon: "thumb_down", path: "Comercial › Motivos de Recusa", href: "/comercial/motivos-recusa",
        purpose: "Padroniza as razões pelas quais um orçamento é recusado, para você entender o que faz perder vendas.",
        steps: ["Clique em Novo Motivo, descreva a razão (por exemplo \"Preço acima do orçamento do cliente\").", "Defina quando ele é usado: Recusado pelo cliente ou Recusado pela gestão.", "Esses motivos aparecem ao recusar um orçamento e no filtro da lista de orçamentos."],
        tips: ["A categoria não pode ser alterada depois de criada; crie outro motivo se precisar mudar."],
      },
      {
        id: "acoes", title: "Ações de Venda", icon: "handshake", path: "Comercial › Ações de Venda", href: "/comercial/acoes-venda",
        purpose: "Diário das interações comerciais: ligações, visitas, reuniões e mensagens com clientes e leads.",
        steps: [
          "Clique em Nova Ação de Venda e escolha o cliente ou lead.",
          "Informe título, data e hora, duração, canal de comunicação e equipe de apoio.",
          "Descreva o que foi conversado e combinado.",
          "Use \"Salvar e agendar próxima ação\" para registrar a próxima etapa logo em seguida.",
          "Filtre por período para revisar o que foi feito em uma semana ou mês.",
        ],
      },
      {
        id: "agenda", title: "Agenda Comercial", icon: "calendar_month", path: "Comercial › Agenda Comercial", href: "/comercial/agenda",
        purpose: "Calendário da equipe comercial para reuniões, visitas e compromissos.",
        steps: [
          "Escolha a visão Mês, Semana ou Dia e navegue com as setas; Hoje volta para a data atual.",
          "Clique em Novo Evento, ou em um dia do calendário, para criar um compromisso.",
          "Clique em um evento para editar ou excluir.",
          "Em Usuários, marque quais colegas você quer ver no calendário; cada pessoa tem uma cor.",
        ],
      },
      {
        id: "modelos", title: "Modelos de Orçamentos", icon: "content_copy", path: "Comercial › Modelos de Orçamentos", href: "/comercial/modelos",
        purpose: "Modelos nomeados para reaproveitar o formato de propostas recorrentes.",
        steps: ["Clique em Novo Modelo, dê um nome claro (por exemplo \"Apartamento 2 quartos\") e salve.", "Use Editar para renomear e Opções › Excluir para remover um modelo que não é mais usado."],
      },
      {
        id: "templates", title: "Templates de Orçamentos", icon: "description", path: "Comercial › Templates de Orçamentos", href: "/comercial/templates",
        purpose: "Arquivos do Word (.docx) com a identidade visual da empresa, que servem de base para a proposta impressa.",
        steps: [
          "Crie o documento no Word e salve no formato .docx (até 500 KB).",
          "Clique em Variáveis para ver os campos disponíveis, como {{cliente_nome}} e {{valor_total}}, e copie os que precisar para dentro do documento.",
          "Clique em Novo Template, selecione o arquivo e salve.",
          "Use Opções › Baixar arquivo para recuperar o original e Inativar para deixar de usar um template.",
        ],
        tips: ["A geração automática da proposta a partir do template ainda não está disponível; por enquanto o sistema guarda o arquivo e a lista de variáveis."],
      },
    ],
  },
  {
    id: "operacional",
    title: "Operacional",
    icon: "build",
    intro: "Da venda fechada ao serviço entregue: abertura de ordens de serviço, agenda da equipe técnica, acompanhamento e cadastros de apoio.",
    topics: [
      {
        id: "andamento", title: "Andamento do Operacional", icon: "view_kanban", path: "Operacional › Andamento do Operacional", href: "/operacional/andamento",
        purpose: "Quadro com o caminho de cada trabalho: do orçamento ganho até o fechamento da ordem de serviço.",
        steps: [
          "Leia as colunas da esquerda para a direita: Orçamentos Pendentes de OS, OS Aguardando Entrega de Equipamentos, OS Aguardando Fechamento e as demais.",
          "Em um orçamento ganho, clique em Abrir OS: a OS é criada com os serviços e produtos do orçamento.",
          "Em uma OS, clique em Ver Detalhes para registrar entregas, comentários e fechar o serviço.",
          "Use a busca para achar um cliente ou número e a seta de cada coluna para recolhê-la.",
        ],
        tips: ["Uma OS só aparece em Aguardando Fechamento quando não tem nenhuma pendência."],
      },
      {
        id: "ordens-servico", title: "Ordens de Serviço", icon: "assignment", path: "Operacional › Ordens de Serviço", href: "/operacional/ordens-servico",
        purpose: "Cadastro e acompanhamento de todas as ordens de serviço: instalações, manutenções corretivas e preventivas.",
        steps: [
          "Clique em Nova OS, escolha o cliente, o tipo, o motivo, a equipe técnica e o agendamento.",
          "Use os botões de situação (Aberta, Em atraso, Fechada...) e a busca para filtrar a lista; ela atualiza enquanto você digita.",
          "Abra a OS para ver as abas Resumo, Serviços, Produtos, Atendimentos, Anexos e Histórico.",
          "Em Produtos, registre a entrega de cada item. Quando não houver pendências, clique em Fechar OS e informe causa e solução.",
          "No menu Ações você pode editar, interromper, reabrir ou cancelar a OS.",
        ],
        tips: ["Uma OS aberta com a previsão de fechamento vencida passa sozinha para Em atraso."],
      },
      {
        id: "gestao-os", title: "Gestão de OS", icon: "monitoring", path: "Operacional › Gestão de OS", href: "/operacional/gestao",
        purpose: "Painel com os números do operacional: OS abertas, atrasos, valores, tempo médio e carga por técnico.",
        steps: ["Veja os indicadores no topo e os gráficos por situação, tipo e técnico.", "Confira a lista de OS em atraso e clique em Ver todas as OS para tratar cada uma."],
      },
      {
        id: "causas", title: "Causas", icon: "help_center", path: "Operacional › Causas", href: "/operacional/causas",
        purpose: "Lista de causas possíveis de um problema, escolhidas ao fechar uma OS.",
        steps: ["Clique em Nova Causa e escreva a descrição.", "Para parar de usar uma causa, inative-a; causas em uso por OS não podem ser excluídas."],
      },
      {
        id: "defeitos", title: "Defeitos", icon: "report_problem", path: "Operacional › Defeitos", href: "/operacional/defeitos",
        purpose: "Motivos de abertura de OS, cada um com o prazo de atendimento e a previsão de fechamento.",
        steps: ["Clique em Novo Defeito, escreva a descrição e informe os prazos em horas e minutos.", "Ao abrir uma OS com esse motivo, a previsão de fechamento é sugerida a partir do prazo."],
      },
      {
        id: "solucoes", title: "Soluções", icon: "task_alt", path: "Operacional › Soluções", href: "/operacional/solucoes",
        purpose: "Lista de soluções aplicadas, escolhidas ao fechar uma OS.",
        steps: ["Clique em Nova Solução e escreva a descrição.", "Inative as que não são mais usadas para manter a lista enxuta."],
      },
      {
        id: "agenda-tecnica", title: "Agenda Técnica", icon: "calendar_month", path: "Operacional › Agenda Técnica", href: "/operacional/agenda",
        purpose: "Calendário com as OS agendadas, por dia e por técnico.",
        steps: ["Alterne entre Mês e Semana e use as setas ou Hoje para navegar.", "Filtre por técnico para ver a agenda de uma pessoa.", "Clique em uma OS no calendário para abrir os detalhes."],
      },
      {
        id: "central-operacoes", title: "Central de Operações", icon: "map", path: "Operacional › Central de Operações", href: "/operacional/central",
        purpose: "Visão em tempo real das OS em andamento, com mapa e alertas de atraso, falta de técnico e falta de agendamento.",
        steps: ["Veja os totais no topo e use os filtros Em atraso, Sem técnico e Sem agendamento.", "Clique em uma OS da lista para centralizar o mapa no endereço dela.", "Use o ícone de abrir para ver os detalhes completos."],
      },
      {
        id: "questionarios", title: "Questionários", icon: "checklist", path: "Operacional › Questionários", href: "/operacional/questionarios",
        purpose: "Modelos de questionário aplicados nas OS, como a pesquisa de satisfação no encerramento.",
        steps: ["Clique em Novo Questionário, informe título, descrição e a quantidade de perguntas.", "Inative os modelos que não são mais usados."],
      },
    ],
  },
  {
    id: "estoque",
    title: "Estoque",
    icon: "inventory_2",
    intro: "Controle de onde estão os produtos, quanto há de cada um e todas as entradas, saídas e transferências.",
    topics: [
      {
        id: "locais", title: "Locais de Estoque", icon: "warehouse", path: "Estoque › Locais de Estoque", href: "/estoque/locais",
        purpose: "Cadastro dos lugares onde os produtos ficam guardados (almoxarifado, prateleiras, veículos, armário de clientes).",
        steps: ["Clique em Novo Local e informe a descrição.", "Defina um local como principal em Opções › Definir como principal; ele é o padrão nas movimentações.", "Inative locais que não são mais usados; locais com saldo ou balanços não podem ser excluídos."],
        tips: ["O estoque principal não pode ser inativado nem excluído."],
      },
      {
        id: "movimentos", title: "Movimentos de Estoque", icon: "swap_horiz", path: "Estoque › Movimentos de Estoque", href: "/estoque/movimentos",
        purpose: "Registra toda entrada, retirada e transferência de produtos e atualiza o saldo automaticamente.",
        steps: [
          "Clique em Novo Movimento e descreva o motivo (por exemplo \"Compra NF 1234\") e a data.",
          "Clique em Adicionar Produto e escolha a operação: Adicionar (entrada), Retirar (saída) ou Transferir entre locais.",
          "Escolha o produto, a quantidade, o custo e o estoque de origem ou destino; confirme.",
          "Repita para outros produtos e clique em Salvar Movimentação.",
          "Abra um movimento na lista para ver os itens e use Ações › Imprimir quando precisar de um comprovante.",
        ],
        tips: ["O sistema impede retirar mais do que existe no local (saldo insuficiente).", "Movimentos antigos importados mostram só o cabeçalho; os itens aparecem nos movimentos criados aqui."],
      },
      {
        id: "balancos", title: "Balanços de Estoque", icon: "fact_check", path: "Estoque › Balanços de Estoque", href: "/estoque/balancos",
        purpose: "Registra as contagens de estoque (inventário) por local, para conferir o que está no sistema com o que existe na prateleira.",
        steps: ["Clique em Novo Balanço de Estoque, escolha o local e, se desejar, filtre por produtos ou grupos.", "Use o filtro de período para consultar balanços anteriores.", "Acompanhe a situação de cada balanço na lista."],
        tips: ["A tela de contagem item a item ainda será disponibilizada."],
      },
      {
        id: "saldo", title: "Consulta de Saldo por Estoque", icon: "assessment", path: "Estoque › Consulta de Saldo", href: "/estoque/saldo",
        purpose: "Mostra quanto há de cada produto, somando todos os locais.",
        steps: ["Pesquise pela descrição ou código e clique em Consultar.", "Use Filtros avançados para filtrar por marca e grupo.", "Clique em « Detalhes para ver o saldo em cada local.", "Clique em Exportar para baixar a lista em CSV e abrir no Excel."],
      },
    ],
  },
  {
    id: "governanca",
    title: "Governança",
    icon: "shield_person",
    intro: "Área de administração do sistema: ajuda, usuários, auditoria e dados da empresa.",
    topics: [
      {
        id: "ajuda", title: "Ajuda", icon: "help", path: "Governança › Ajuda", href: "/ajuda",
        purpose: "Este guia. Explica para que serve cada item do menu e como usá-lo.",
        steps: ["Use a busca para encontrar um assunto pelo nome ou por uma palavra (por exemplo \"orçamento\" ou \"exportar\").", "Clique em um título para abrir ou fechar a explicação.", "Use o índice à esquerda para pular direto para um módulo; nos itens com link, clique em Abrir para ir à tela."],
        tips: ["Esta página está disponível para todos os usuários."],
      },
      {
        id: "usuarios", title: "Equipe e Permissões", icon: "admin_panel_settings", path: "Governança › Equipe e Permissões", href: "/access-control",
        purpose: "Gerencia quem acessa o sistema e o que cada pessoa pode ver. Visível para administradores.",
        steps: [
          "Clique em Novo usuário e informe nome e e-mail: o sistema gera uma senha aleatória, que deve ser repassada ao usuário.",
          "Em Aguardando permissão ficam os usuários que ainda não têm acesso a nenhum item; abra as permissões e marque os itens do menu que ele pode usar.",
          "Defina quem é administrador: administradores veem todos os itens e gerenciam usuários.",
          "Use as ações da linha para editar os dados, resetar a senha e ajustar permissões.",
          "As bolinhas no avatar mostram se o usuário está online, ausente ou offline.",
        ],
        tips: ["Conceda o menor acesso necessário: cada pessoa só deve ver o que usa no dia a dia.", "Ordene as colunas para ver quem acessou por último."],
      },
      {
        id: "log", title: "Log de acesso", icon: "history", path: "Governança › Log de acesso", href: "/access-logs",
        purpose: "Auditoria de entradas no sistema: quem acessou, quando, de qual aparelho e, se autorizado, de onde.",
        steps: ["Filtre por nome, e-mail ou período para investigar um acesso específico.", "Veja se a tentativa foi válida ou inválida e o dispositivo usado.", "Quando houver localização compartilhada, abra o mapa para ver o ponto aproximado do acesso."],
        tips: ["Várias tentativas inválidas seguidas podem indicar alguém tentando adivinhar a senha: redefina a senha do usuário."],
      },
      {
        id: "empresa", title: "Dados da empresa", icon: "business", path: "Configurações › Empresa › Dados da Empresa", href: "/configuracoes/dados-da-empresa",
        purpose: "Cadastro da própria empresa (razão social, CNPJ, endereço, contatos e inscrições), usado em documentos e propostas.",
        steps: ["Preencha os campos; CNPJ, telefone e CEP são formatados enquanto você digita.", "Clique em Salvar para gravar as alterações.", "Mantenha esses dados atualizados: eles aparecem nas propostas e impressões."],
      },
    ],
  },
  {
    id: "fluxos",
    title: "Fluxos recomendados",
    icon: "route",
    intro: "Sequências práticas que combinam vários módulos. Siga como um roteiro quando estiver começando.",
    topics: [
      {
        id: "fluxo-venda", title: "Do lead à venda", icon: "trending_up", path: "Comercial",
        purpose: "O caminho completo de uma oportunidade, do primeiro contato ao pedido fechado.",
        steps: [
          "Cadastre o lead em Prospects, com o vendedor responsável.",
          "Registre o primeiro contato em Ações de Venda e agende a próxima etapa na Agenda.",
          "Crie o Orçamento, inclua serviços e produtos e cadastre as formas de pagamento.",
          "Acompanhe a validade: orçamentos Vencidos podem ser duplicados com nova data.",
          "Ganhe o orçamento escolhendo a forma de pagamento (o lead vira cliente) ou recuse informando o motivo.",
          "Acompanhe tudo em Indicadores.",
        ],
      },
      {
        id: "fluxo-estoque", title: "Do cadastro ao saldo de estoque", icon: "inventory", path: "Administrativo › Estoque",
        purpose: "Como preparar o estoque para uso, na ordem certa.",
        steps: [
          "Cadastre Marcas e Grupos de Produtos.",
          "Cadastre os Produtos, com unidade, marca, grupo e preços.",
          "Crie os Locais de Estoque e defina o principal.",
          "Lance as entradas em Movimentos de Estoque.",
          "Confira o resultado em Consulta de Saldo e, periodicamente, faça um Balanço.",
        ],
      },
      {
        id: "fluxo-acesso", title: "Liberar acesso a um novo colaborador", icon: "person_add", path: "Governança › Equipe e Permissões",
        purpose: "Como dar acesso ao sistema de forma segura.",
        steps: [
          "Em Equipe e Permissões, adicione o colaborador com nome e e-mail corporativo.",
          "Envie a senha gerada por um canal seguro.",
          "Marque somente os itens do menu de que ele precisa.",
          "Peça que ele acesse e confira se os itens aparecem no menu.",
          "Revise o Log de acesso de tempos em tempos.",
        ],
      },
    ],
  },
];
