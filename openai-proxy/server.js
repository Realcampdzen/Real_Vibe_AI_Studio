import http from 'node:http'

const port = Number(process.env.PORT) || 8080
const proxyAuthToken = process.env.PROXY_AUTH_TOKEN
const fallbackApiKey = process.env.OPENAI_API_KEY
const isProduction = process.env.NODE_ENV === 'production'
const maxBodyBytes = Number(process.env.PROXY_BODY_LIMIT_BYTES) || 1024 * 1024
const upstreamTimeoutMs = Number(process.env.PROXY_UPSTREAM_TIMEOUT_MS) || 30000
const rateLimitWindowMs = Number(process.env.PROXY_RATE_LIMIT_WINDOW_MS) || 60_000
const rateLimitMax = Number(process.env.PROXY_RATE_LIMIT_MAX) || 60
const allowedPaths = new Set(['/api/openai-proxy', '/v1/chat/completions'])
const rateLimitStore = new Map()

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers)
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > maxBodyBytes) {
        reject(Object.assign(new Error('body_too_large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function isJsonRequest(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  return contentType.includes('application/json')
}

function clientKey(req) {
  return req.socket?.remoteAddress || 'unknown'
}

function isRateLimited(req) {
  const now = Date.now()
  const key = clientKey(req)
  const current = rateLimitStore.get(key)
  if (!current || now >= current.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + rateLimitWindowMs })
    return false
  }
  current.count += 1
  return current.count > rateLimitMax
}

async function fetchUpstream(authHeader, body) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)
  try {
    return await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body,
      signal: controller.signal,
      redirect: 'error',
    })
  } finally {
    clearTimeout(timeout)
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, 'ok', { 'Content-Type': 'text/plain' })
    }

    if (req.method !== 'POST') {
      return send(res, 405, 'Method Not Allowed', { 'Content-Type': 'text/plain' })
    }

    if (!allowedPaths.has(url.pathname)) {
      return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' })
    }

    if (isProduction && !proxyAuthToken) {
      return send(res, 503, 'Proxy authentication is not configured', { 'Content-Type': 'text/plain' })
    }

    if (proxyAuthToken) {
      const provided = String(req.headers['x-proxy-token'] || '')
      if (provided !== proxyAuthToken) {
        return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' })
      }
    }

    if (isRateLimited(req)) {
      return send(res, 429, 'Too Many Requests', { 'Content-Type': 'text/plain' })
    }

    if (!isJsonRequest(req)) {
      return send(res, 415, 'Unsupported Media Type', { 'Content-Type': 'text/plain' })
    }

    const incomingAuth = req.headers['authorization']
    const authHeader = incomingAuth ? String(incomingAuth) : fallbackApiKey ? `Bearer ${fallbackApiKey}` : ''
    if (!authHeader) {
      return send(res, 401, 'Missing Authorization', { 'Content-Type': 'text/plain' })
    }

    const body = await readBody(req)
    const upstream = await fetchUpstream(authHeader, body)

    const responseText = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'
    return send(res, upstream.status, responseText, { 'Content-Type': contentType })
  } catch (err) {
    if (err?.statusCode === 413) {
      return send(res, 413, 'Request Entity Too Large', { 'Content-Type': 'text/plain' })
    }
    const status = err?.name === 'AbortError' ? 504 : 502
    return send(res, status, 'Upstream request failed', { 'Content-Type': 'text/plain' })
  }
})

server.listen(port, () => {
  console.log(`openai-proxy listening on :${port}`)
})
