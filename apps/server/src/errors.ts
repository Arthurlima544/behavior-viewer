/** Erro esperado da API, com status HTTP e código estável (RNF-13). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly codigo: string,
    message: string,
  ) {
    super(message);
  }
}
