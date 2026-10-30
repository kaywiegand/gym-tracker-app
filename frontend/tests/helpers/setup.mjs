// Loaded before every test file (see "test" in package.json). Gives plain
// Node what Vite and the browser provide: the "@/" alias, extensionless
// imports and IndexedDB.
import 'fake-indexeddb/auto'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { dirname, resolve as resolvePath } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const src = resolvePath(dirname(fileURLToPath(import.meta.url)), '../../src')

function toFile(base) {
  return [base, `${base}.ts`, `${base}.tsx`].find((path) => existsSync(path) && !path.endsWith('/'))
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return { url: pathToFileURL(toFile(resolvePath(src, specifier.slice(2)))).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

globalThis.window ??= new EventTarget()
Object.defineProperty(globalThis.navigator, 'onLine', { value: true, writable: true, configurable: true })
