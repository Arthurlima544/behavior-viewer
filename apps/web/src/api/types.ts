export type Stack = 'flutter' | 'typescript' | 'java' | 'gherkin-generico';
export type RuleStatus = 'passando' | 'falhando' | 'pendente' | 'sem-execucao' | 'sem-cobertura';
export type ScenarioResult = 'passou' | 'falhou' | 'pendente' | 'sem-execucao';

export interface StatusCounts {
  total: number;
  passando: number;
  pendente: number;
  falhando: number;
  semExecucao: number;
  percentualPassando: number;
}

export interface ProjectSummary {
  id: string;
  nome: string;
  descricao: string;
  caminho: string;
  origem: 'auto' | 'config';
  selecionado: boolean;
  stacks: { id: Stack; rotulo: string; caminho: string; arquivos: number }[];
  ref: string | null;
  sincronizadoEm: string;
  contadores: { regras: number; funcionalidades: number; cenarios: number };
  status: StatusCounts;
  divergencias: number;
  avisos: number;
}

export interface PresencaStack {
  stack: Stack;
  rotulo: string;
  presente: boolean;
  status: RuleStatus | null;
}

export interface RuleSummary {
  id: string;
  origem: string;
  titulo: string;
  tags: string[];
  status: RuleStatus;
  funcionalidadeKey: string;
  funcionalidadeNome: string;
  cenarios: number;
  avisos: string[];
  divergente: boolean;
  presenca: PresencaStack[];
}

export interface Cenario {
  nome: string;
  linha: number;
  tipo: 'cenario' | 'esquema';
  passos: { palavra: string; texto: string }[];
  exemplos: string[][];
  resultado: ScenarioResult;
}

export interface Execucao {
  status: RuleStatus;
  executadoEm: string | null;
}

export interface RuleDetail {
  id: string;
  origem: string;
  titulo: string;
  descricao: string;
  situacao: string | null;
  resultado: string | null;
  tags: string[];
  avisos: string[];
  status: RuleStatus;
  projeto: { id: string; nome: string; ref: string | null };
  funcionalidade: {
    key: string;
    nome: string;
    descricao: string;
    arquivos: { stack: Stack; arquivo: string; idioma: string }[];
  } | null;
  implementacoes: {
    stack: Stack;
    rotulo: string;
    arquivo: string;
    linha: number;
    funcionalidade: string;
    status: RuleStatus;
    runner: string;
    cenarios: Cenario[];
    ultimaExecucao: string | null;
    ultimaAlteracao: { commit: string; data: string } | null;
  }[];
  ausentes: { stack: Stack; rotulo: string }[];
  historico: { stack: Stack; rotulo: string; execucoes: Execucao[] }[];
}

export interface Feature {
  key: string;
  nome: string;
  descricao: string;
  tags: string[];
  arquivos: { stack: Stack; arquivo: string; idioma: string }[];
  regras: number;
  cenarios: number;
}

export interface Matrix {
  stacks: { id: Stack; rotulo: string }[];
  linhas: {
    funcionalidadeKey: string;
    funcionalidadeNome: string;
    total: number;
    celulas: { stack: Stack; covered: number; total: number; complete: boolean }[];
  }[];
}

export interface Divergence {
  regraId: string;
  funcionalidadeKey: string;
  funcionalidadeNome: string;
  presentes: Stack[];
  ausentes: Stack[];
  rotuloPresentes: string[];
  rotuloAusentes: string[];
}

export interface VisaoGeral {
  projetos: number;
  regras: number;
  funcionalidades: number;
  cenarios: number;
  percentualPassando: number;
  ultimaVarredura: string;
}

export interface SearchItem {
  id: string;
  titulo: string;
  projetoId: string;
  projetoNome: string;
  funcionalidade: string;
  status: RuleStatus;
}

export interface Health {
  status: string;
  versao: string;
  emVarredura: boolean;
  ultimaVarredura: string | null;
  projetos: number;
}

export interface PastaItem {
  nome: string;
  caminho: string;
  ehProjeto: boolean;
}

export interface Pastas {
  /** Caminho real da pasta atual, ou null quando estamos nas raízes. */
  caminho: string | null;
  exibicao: string;
  pai: string | null;
  ehProjeto?: boolean;
  itens: PastaItem[];
}

export interface Candidato {
  id: string;
  caminho: string;
  caminhoExibicao: string;
  nome: string;
  origem: 'auto' | 'config';
  stacks: Stack[];
  arquivos: number;
  funcionalidades: number;
  cenarios: number;
  errosLeitura: number;
  jaRegistrado: boolean;
}

export interface Descoberta {
  pasta: string;
  candidatos: Candidato[];
  parcial: boolean;
  featuresEncontrados: number;
}

export interface ProjetoEstrutura {
  projeto: { id: string; nome: string; caminho: string; origem: 'auto' | 'config'; descricao: string };
  stacks: { id: Stack; rotulo: string; caminho: string; arquivos: number; relatorios: string[]; runner: string }[];
  testes: { arquivosFeature: number; funcionalidades: number; regras: number; cenarios: number };
  funcionalidades: {
    funcionalidade: string;
    stack: Stack;
    rotulo: string;
    arquivo: string;
    idioma: string;
    regras: number;
    cenarios: number;
  }[];
  erros: ErroItem[];
}

export interface ErroItem {
  projetoId: string | null;
  arquivo: string;
  linha: number | null;
  tipo: 'feature' | 'config' | 'relatorio';
  mensagem: string;
}
