// Test-only resolver for preserved legacy extensionless TypeScript exports.
// It lets Node's transform-types runner inspect the full original shared index.
import { existsSync } from 'node:fs';
export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && context.parentURL && specifier.startsWith('.')) {
      for (const suffix of ['.ts', '/index.ts']) {
        const url = new URL(specifier + suffix, context.parentURL);
        if (url.protocol === 'file:' && existsSync(url)) return nextResolve(url.href, context);
      }
    }
    throw error;
  }
}
