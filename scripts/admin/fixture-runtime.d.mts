import type { PGlite, PGliteInterface } from '../../apps/web/node_modules/@electric-sql/pglite/dist/index.js';
export const ADMIN_ID: string;
export const OWNER_ID: string;
export const CUSTOMER_ID: string;
export const FIXTURE_COUNTS: Record<string,number>;
export const FIXTURE_VERSION: string;
export const repositoryPath: string;
export function createFixtureDatabase(constructor: typeof PGlite,rootPath?: string,options?: {adversarial?:boolean}): Promise<PGlite>;
export function asUser<T>(db: PGliteInterface,userId: string|null,query: string,params?: unknown[]): Promise<{rows:T[]}>;
