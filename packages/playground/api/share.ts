import { get, put } from '@vercel/blob'
import { isKnownSnapshot } from '../src/utils/snapshot'

// Share links for the playground: POST stores a workspace snapshot (see
// src/utils/snapshot.ts — v2 { files, entry, config }, or a legacy v1 { doc, config }) in
// Vercel Blob and returns its id; GET /api/share/:id returns it. Ids are a
// content hash, so sharing the same snapshot twice yields the same link and
// stored entries never change — which is what makes the immutable GET caching
// below safe. Entries never expire; Blob records `uploadedAt` on every entry so
// pruning can be added later without a migration.
//
// /api/share/:id reaches this function as /api/share?id=:id via the rewrite in
// vercel.json. Rate limiting is a Vercel Firewall rule on /api/share, not code.

// Mirrored in src/utils/playgroundState.ts; the cap covers the whole workspace. Vercel caps function request bodies at 4.5MB.
const MAX_BODY_BYTES = 4 * 1024 * 1024
const ID_PATTERN = /^[A-Za-z0-9_-]{12}$/

function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

async function contentId(body: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').slice(0, 12)
}

function blobPath(id: string): string {
  return `playground-shares/${id}.json`
}

async function handler(req: Request): Promise<Response> {
  const id = new URL(req.url).searchParams.get('id')

  if (req.method === 'GET') {
    // Missing or malformed ids are just links that can't exist — 404 like any
    // other miss.
    if (!id || !ID_PATTERN.test(id)) return json({ error: 'Share not found' }, 404)
    // Bypass the Blob CDN cache so a link opened right after it was created
    // can't 404 on a stale cached miss.
    const blob = await get(blobPath(id), { access: 'private', useCache: false })
    if (blob === null) return json({ error: 'Share not found' }, 404)
    return new Response(blob.stream, {
      status: 200,
      // s-maxage is what lets Vercel's CDN cache a function response; it is
      // stripped before the response reaches the browser.
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    })
  }

  if (req.method === 'POST' && !id) {
    const declaredLength = Number(req.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_BODY_BYTES) return json({ error: 'Too large to share — all files together must be under 4 MB' }, 413)

    const body = await req.text()
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return json({ error: 'Too large to share — all files together must be under 4 MB' }, 413)
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return json({ error: 'Body must be JSON' }, 400)
    }
    if (!isKnownSnapshot(parsed)) return json({ error: 'Invalid snapshot' }, 400)

    const shareId = await contentId(body)
    // Same id means same bytes, so re-sharing a snapshot rewrites it rather
    // than failing on the existing entry.
    await put(blobPath(shareId), body, {
      access: 'private',
      contentType: 'application/json',
      allowOverwrite: true,
    })
    return json({ id: shareId }, 201)
  }

  return json({ error: 'Method not allowed' }, 405, { Allow: id ? 'GET' : 'GET, POST' })
}

export default { fetch: handler }
