// Run with: npm test
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path, encoding) => readFileSync(new URL(`../${path}`, import.meta.url), encoding)

function pngChunks(buffer) {
  const chunks = []
  for (let i = 8; i < buffer.length; i += 12 + buffer.readUInt32BE(i)) {
    chunks.push(buffer.toString('latin1', i + 4, i + 8))
  }
  return chunks
}

test('the iOS icon is linked, 180 px, opaque and without metadata', () => {
  const href = read('index.html', 'utf8').match(/rel="apple-touch-icon"[^>]*href="\/([^"?]+)"/)[1]
  assert.notEqual(href, 'apple-touch-icon.png')
  const png = read(`public/${href}`)
  assert.equal(png.readUInt32BE(16), 180)
  assert.equal(png.readUInt32BE(20), 180)
  assert.equal(png[25], 2)
  assert.deepEqual(pngChunks(png), ['IHDR', 'sRGB', 'IDAT', 'IEND'])
})

test('the service worker precaches the iOS icon', () => {
  const href = read('index.html', 'utf8').match(/rel="apple-touch-icon"[^>]*href="\/([^"?]+)"/)[1]
  assert.match(read('vite.config.ts', 'utf8'), new RegExp(`includeAssets: \\['${href.replace('.', '\\.')}'\\]`))
})
