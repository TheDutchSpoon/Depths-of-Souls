// Phase 4.1-C2a: minimal ambient shims for the three Node built-ins `corpus-digest.test.ts`
// needs to write its own generated fixture. `tsconfig.app.json`'s `types` array is deliberately
// `["vite/client"]` only (S4: engine tests run in Node, but `src/` as a whole must not gain
// Node-only globals that would leak into UI/browser code) -- `@types/node` is a devDependency
// (used by `tsconfig.node.json` for `vite.config.ts`) but not globally included here on purpose.
//
// These declarations are `declare module`, never a bare global, so they don't add `process`/`fs`
// etc. as ambient IDENTIFIERS anywhere -- but TypeScript ambient module declarations are still
// PROGRAM-WIDE by construction: once this file is part of the compile (it is, `tsconfig.app.json`
// includes all of `src/`), `import ... from 'node:fs'` type-checks from ANY file under `src/`,
// not just this directory. Nothing at the type level confines that. The actual confinement is
// `eslint.config.js`'s `no-restricted-imports` rule, which bans `node:*` imports across `src/**`
// with a single override for `src/engine/corpus-digest.test.ts` -- `npm run lint` is what makes
// "only this one file may import Node built-ins" true, not this shim.

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}

declare module 'node:process' {
  export const env: Record<string, string | undefined>
}
