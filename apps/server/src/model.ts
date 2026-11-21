import type {
  RuleOrigin,
  RuleStatus,
  ScenarioResult,
  Stack,
  StatusCounts,
} from '@behavior-viewer/domain';

export interface Passo {
  palavra: string;
  texto: string;
}

/** Captura de tela tirada durante a execução de um passo (docs/prompts, seção 3). */
export interface CapturaModel {
  passo: string;
  /** Caminho relativo à raiz do projeto. Servido pela API, nunca como caminho do disco. */
  arquivo: string;
  tela: string | null;
}

/** Componente de uma tela, com o arquivo de origem quando declarado. */
export interface ComponenteRef {
  nome: string;
  arquivo: string | null;
}

/** Tela ligada a uma regra. origem: "tag" (declarada no Gherkin) ou "rota" (citada num passo). */
export interface TelaRef {
  nome: string;
  rota: string | null;
  arquivo: string | null;
  origem: 'tag' | 'rota';
  /** false quando a tag existe mas a tela não está no .behavior.yml. */
  declarada: boolean;
  componentes: ComponenteRef[];
}

/** Tela declarada no .behavior.yml, com quantas regras a referenciam. */
export interface TelaDeclarada {
  nome: string;
  rota: string | null;
  arquivo: string | null;
  componentes: ComponenteRef[];
  regras: number;
}

export interface CenarioModel {
  nome: string;
  linha: number;
  tipo: 'cenario' | 'esquema';
  passos: Passo[];
  exemplos: string[][];
  resultado: ScenarioResult;
  /** @tela- e @componente- do cenário, já com herança da regra e da funcionalidade. */
  telas: string[];
  componentes: string[];
  capturas: CapturaModel[];
}

/** Presença de uma regra em uma stack (uma implementação). */
export interface ImplementacaoModel {
  stack: Stack;
  arquivo: string;
  linha: number;
  funcionalidade: string;
  status: RuleStatus;
  cenarios: CenarioModel[];
  ultimaExecucao: string | null;
}

export interface RegraModel {
  id: string;
  origem: RuleOrigin;
  titulo: string;
  descricao: string;
  situacao: string | null;
  resultado: string | null;
  tags: string[];
  avisos: string[];
  telas: TelaRef[];
  componentes: ComponenteRef[];
  funcionalidadeKey: string;
  funcionalidadeNome: string;
  status: RuleStatus;
  cenariosCount: number;
  implementacoes: ImplementacaoModel[];
}

export interface FuncionalidadeModel {
  key: string;
  nome: string;
  descricao: string;
  tags: string[];
  arquivos: { stack: Stack; arquivo: string; idioma: string }[];
  regras: string[];
}

export interface StackModel {
  id: Stack;
  /** Caminho relativo à raiz do projeto ("" para a própria raiz). */
  caminho: string;
  arquivos: number;
  relatorios: string[];
  ultimaExecucao: string | null;
  /** Assinatura dos relatórios usada para registrar histórico apenas quando há nova execução. */
  fingerprint: string;
}

export interface MatrizCelulaModel {
  stack: Stack;
  covered: number;
  total: number;
  complete: boolean;
}

export interface MatrizLinhaModel {
  funcionalidadeKey: string;
  funcionalidadeNome: string;
  total: number;
  celulas: MatrizCelulaModel[];
}

export interface DivergenciaModel {
  regraId: string;
  funcionalidadeKey: string;
  funcionalidadeNome: string;
  presentes: Stack[];
  ausentes: Stack[];
}

export interface ErroModel {
  projetoId: string | null;
  arquivo: string;
  linha: number | null;
  tipo: 'feature' | 'config' | 'relatorio' | 'captura';
  mensagem: string;
}

export interface ProjetoModel {
  id: string;
  nome: string;
  descricao: string;
  /** Caminho relativo à pasta raiz do workspace que contém o projeto. */
  caminho: string;
  origem: 'auto' | 'config';
  stacks: StackModel[];
  ref: string | null;
  sincronizadoEm: string;
  contadores: { regras: number; funcionalidades: number; cenarios: number };
  status: StatusCounts;
  funcionalidades: FuncionalidadeModel[];
  telas: TelaDeclarada[];
  regras: RegraModel[];
  matriz: MatrizLinhaModel[];
  divergencias: DivergenciaModel[];
  avisos: number;
}

export interface Snapshot {
  geradoEm: string;
  duracaoMs: number;
  projetos: ProjetoModel[];
  erros: ErroModel[];
}
