import { XMLParser } from 'fast-xml-parser';
import { worstScenarioResult, normalizeTitle, type ScenarioResult } from '@behavior-viewer/domain';

export interface ReportEntry {
  featureName: string | null;
  scenarioName: string;
  result: ScenarioResult;
}

/** Cucumber JSON (cucumber-js, Cucumber-JVM): lista de features com elementos cenário. */
export function parseCucumberJson(text: string): ReportEntry[] {
  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) throw new Error('Cucumber JSON deve ser uma lista de features');

  const entries: ReportEntry[] = [];
  for (const feature of data as any[]) {
    const featureName = typeof feature?.name === 'string' ? feature.name : null;
    for (const element of feature?.elements ?? []) {
      if (element?.type && element.type !== 'scenario') continue;
      const steps: string[] = (element.steps ?? []).map((s: any) =>
        String(s?.result?.status ?? 'unknown')
      );
      entries.push({
        featureName,
        scenarioName: String(element.name ?? ''),
        result: cucumberStepsToResult(steps),
      });
    }
  }
  return entries;
}

function cucumberStepsToResult(statuses: string[]): ScenarioResult {
  if (statuses.length === 0) return 'sem-execucao';
  if (statuses.some((s) => s === 'failed' || s === 'ambiguous')) return 'falhou';
  if (statuses.some((s) => s === 'undefined' || s === 'pending')) return 'pendente';
  if (statuses.some((s) => s === 'skipped' || s === 'unknown')) return 'sem-execucao';
  return 'passou';
}

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  isArray: (name) => name === 'testsuite' || name === 'testcase',
});

/** JUnit XML (Maven Surefire, Gradle, flutter test com reporter JUnit). */
export function parseJUnitXml(text: string): ReportEntry[] {
  const doc = xml.parse(text) as Record<string, any>;
  const suites: any[] = [];
  if (doc.testsuites) {
    for (const s of doc.testsuites.testsuite ?? []) suites.push(s);
  }
  if (doc.testsuite) {
    for (const s of doc.testsuite) suites.push(s);
  }

  const entries: ReportEntry[] = [];
  for (const suite of suites) {
    for (const tc of suite.testcase ?? []) {
      let result: ScenarioResult = 'passou';
      if (tc.failure !== undefined || tc.error !== undefined) result = 'falhou';
      else if (tc.skipped !== undefined) result = 'sem-execucao';
      const classname = typeof tc['@_classname'] === 'string' ? tc['@_classname'] : null;
      entries.push({
        featureName: classname,
        scenarioName: String(tc['@_name'] ?? ''),
        result,
      });
    }
  }
  return entries;
}

/** Índice de resultados por cenário, com busca por (funcionalidade, cenário) e por cenário. */
export class ResultIndex {
  private readonly byFeature = new Map<string, ScenarioResult[]>();
  private readonly byScenario = new Map<string, ScenarioResult[]>();

  constructor(entries: ReportEntry[]) {
    for (const e of entries) {
      const scenarioKey = normalizeTitle(e.scenarioName);
      push(this.byScenario, scenarioKey, e.result);
      if (e.featureName) {
        push(this.byFeature, `${normalizeTitle(e.featureName)}|${scenarioKey}`, e.result);
      }
    }
  }

  /** Resultado de um cenário. Sem entrada, retorna sem-execucao (RF-18). */
  lookup(featureName: string, scenarioName: string): ScenarioResult {
    const scenarioKey = normalizeTitle(scenarioName);
    const exact = this.byFeature.get(`${normalizeTitle(featureName)}|${scenarioKey}`);
    if (exact) return worstScenarioResult(exact);
    const loose = this.byScenario.get(scenarioKey);
    return loose ? worstScenarioResult(loose) : 'sem-execucao';
  }

  get size(): number {
    return this.byScenario.size;
  }
}

function push(map: Map<string, ScenarioResult[]>, key: string, value: ScenarioResult): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
