import http from 'node:http'

const port = Number(process.env.PORT) || 8080
const proxyAuthToken = process.env.PROXY_AUTH_TOKEN
const fallbackApiKey = process.env.OPENAI_API_KEY

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, headers)
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
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

    if (url.pathname !== '/api/openai-proxy' && url.pathname !== '/v1/chat/completions') {
      return send(res, 404, 'Not Found', { 'Content-Type': 'text/plain' })
    }

    if (proxyAuthToken) {
      const provided = String(req.headers['x-proxy-token'] || '')
      if (provided !== proxyAuthToken) {
        return send(res, 403, 'Forbidden', { 'Content-Type': 'text/plain' })
      }
    }

    const incomingAuth = req.headers['authorization']
    const authHeader = incomingAuth ? String(incomingAuth) : fallbackApiKey ? `Bearer ${fallbackApiKey}` : ''
    if (!authHeader) {
      return send(res, 401, 'Missing Authorization', { 'Content-Type': 'text/plain' })
    }

    const body = await readBody(req)
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body,
    })

    const responseText = await upstream.text()
    const contentType = upstream.headers.get('content-type') || 'application/json'
    return send(res, upstream.status, responseText, { 'Content-Type': contentType })
  } catch (err) {
    return send(res, 500, String(err?.message || err), { 'Content-Type': 'text/plain' })
  }
})

server.listen(port, () => {
  console.log(`openai-proxy listening on :${port}`)
})
