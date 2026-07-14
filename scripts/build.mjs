// Production build: bundle our own source with esbuild, keep node_modules external.
// We use esbuild (not `tsc` emit) for the JS output — type-checking is a separate `tsc --noEmit` step.
import { build } from 'esbuild'

await build({
  entryPoints: ['src/index.ts', 'src/scripts/migrate.ts', 'src/scripts/deploy-commands.ts'],
  outdir: 'dist',
  outbase: 'src',
  platform: 'node',
  format: 'esm',
  target: 'node22',
  bundle: true,
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
})

console.log('build: dist/ written')
