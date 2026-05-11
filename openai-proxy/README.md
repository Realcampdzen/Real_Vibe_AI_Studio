# OpenAI Proxy

Minimal HTTP proxy for OpenAI chat completions. Designed to run in a supported region.

## Endpoints

- `POST /api/openai-proxy`
- `POST /v1/chat/completions`
- `GET /health`

## Env

- `PORT` (default: `8080`)
- `PROXY_AUTH_TOKEN` (required in `NODE_ENV=production`; checks `X-Proxy-Token`)
- `OPENAI_API_KEY` (optional fallback if client does not send `Authorization`)
- `PROXY_BODY_LIMIT_BYTES` (default: `1048576`)
- `PROXY_UPSTREAM_TIMEOUT_MS` (default: `30000`)
- `PROXY_RATE_LIMIT_MAX` / `PROXY_RATE_LIMIT_WINDOW_MS` (defaults: `60` per `60000ms`)

## Run

```bash
npm install
npm start
```

## Docker

```bash
docker build -t openai-proxy .
docker run -p 8080:8080 -e NODE_ENV=production -e PROXY_AUTH_TOKEN=... openai-proxy
```

## Smoke

```bash
curl -i http://127.0.0.1:8080/health
curl -i -X POST http://127.0.0.1:8080/api/openai-proxy
curl -i -X POST http://127.0.0.1:8080/api/openai-proxy \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Token: $PROXY_AUTH_TOKEN" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"ping"}]}'
```
