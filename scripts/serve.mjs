import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const root = resolve(process.cwd())
const port = Number(process.env.PORT ?? 4173)
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const requested = pathname === '/' ? 'index.html' : pathname.slice(1)
    if (requested.split(/[\\/]/).some((segment) => segment === '.git' || segment === 'node_modules')) {
      throw new Error('private path')
    }
    const filePath = resolve(root, requested)
    if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) throw new Error('invalid path')
    const info = await stat(filePath)
    if (!info.isFile()) throw new Error('not a file')
    response.writeHead(200, { 'Content-Type': types[extname(filePath)] ?? 'application/octet-stream' })
    createReadStream(filePath).pipe(response)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}).listen(port, () => {
  console.log(`Growth Time OS: http://localhost:${port}`)
})
