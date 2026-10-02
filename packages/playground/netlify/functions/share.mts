import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

// Share links for the playground: POST stores a { v, doc, config } snapshot in
// Netlify Blobs and returns its id; GET /api/share/:id returns it. Ids are a
// content hash, so sharing the same snapshot twice yields the same link and
// stored entries never change — which is what makes the immutable GET caching
// below safe. Entries never expire; `createdAt` metadata is kept so pruning can
// be added later without a migration.

// Mirrored in src/utils/playgroundState.ts; Netlify caps function request bodies at ~6MB.
const MAX_BODY_BYTES = 5 * 1024 * 1024
const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

function isSnapshot(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return v.v === 1 && typeof v.doc === 'string' && typeof v.config === 'string'
}

async function contentId(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').slice(0, 12)
}

export default async (req: Request, context: Context) => {
  // Strong reads so a link opened right after it was created can't 404 on
  // propagation lag.
  const store = getStore({ name: 'playground-shares', consistency: 'strong' })
  const id = context.params.id

  if (req.method === 'GET') {
    // Missing or malformed ids are just links that can't exist — 404 like any
    // other miss. (A function 404 also lets Netlify fall through to static-file
    // lookups like `<id>/index.html`, which land here without an id.)
    if (!id || !ID_PATTERN.test(id)) return json({ error: 'Share not found' }, 404)
    const body = await store.get(id)
    if (body === null) return json({ error: 'Share not found' }, 404)
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  }

  if (req.method === 'POST' && !id) {
    const declaredLength = Number(req.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_BODY_BYTES) return json({ error: 'Spec too large to share' }, 413)

    const body = await req.text()
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'Spec too large to share' }, 413)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return json({ error: 'Body must be JSON' }, 400)
    }
    if (!isSnapshot(parsed)) return json({ error: 'Invalid snapshot' }, 400)

    const shareId = await contentId(body)
    await store.set(shareId, body, { metadata: { createdAt: new Date().toISOString() } })
    return json({ id: shareId }, 201)
  }

  return json({ error: 'Method not allowed' }, 405, { Allow: id ? 'GET' : 'GET, POST' })
}

export const config: Config = {
  path: ['/api/share', '/api/share/:id'],
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] },
}
