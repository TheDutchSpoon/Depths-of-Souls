// Phase 4.1-C2a: minimal, MODULE-SCOPED ambient shims for the three Node built-ins
// `corpus-digest.test.ts` needs to write its own generated fixture. `tsconfig.app.json`'s
// `types` array is deliberately `["vite/client"]` only (S4: engine tests run in Node, but `src/`
// as a whole must not gain Node-only globals that would leak into UI/browser code) --
// `@types/node` is a devDependency (used by `tsconfig.node.json` for `vite.config.ts`) but not
// globally included here on purpose. Each declaration below is a `declare module`, never a bare
// global -- it's visible only where explicitly imported (`import { env } from 'node:process'`),
// so it adds nothing to the ambient surface any other file in `src/` sees.

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}

declare module 'node:process' {
  export const env: Record<string, string | undefined>
}
