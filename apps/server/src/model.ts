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

export interface CenarioModel {
  nome: string;
  linha: number;
  tipo: 'cenario' | 'esquema';
  passos: Passo[];
  exemplos: string[][];
  resultado: ScenarioResult;
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
  tipo: 'feature' | 'config' | 'relatorio';
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
