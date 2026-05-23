// Shim for bun:sqlite so TypeScript compilation passes.
// At runtime Bun provides the real implementation natively.
declare module 'bun:sqlite' {
  class Database {
    constructor(path: string, options?: { create?: boolean; readonly?: boolean });
    run(sql: string, ...params: any[]): void;
    prepare(sql: string): Statement;
    transaction<T>(fn: () => T): () => T;
    close(): void;
  }

  interface Statement {
    run(params?: Record<string, any> | any[]): void;
    get(params?: Record<string, any> | any[]): unknown;
    all(params?: Record<string, any> | any[]): unknown[];
  }

  export { Database };
}
