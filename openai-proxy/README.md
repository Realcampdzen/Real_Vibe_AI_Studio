# OpenAI Proxy

Minimal HTTP proxy for OpenAI chat completions. Designed to run in a supported region.

## Endpoints

- `POST /api/openai-proxy`
- `POST /v1/chat/completions`
- `GET /health`

## Env

- `PORT` (default: `8080`)
- `PROXY_AUTH_TOKEN` (optional; checks `X-Proxy-Token`)
- `OPENAI_API_KEY` (optional fallback if client does not send `Authorization`)

## Run

```bash
npm install
npm start
```

## Docker

```bash
docker build -t openai-proxy .
docker run -p 8080:8080 -e PROXY_AUTH_TOKEN=... openai-proxy
```
