# Real Vibe Studio VPS deployment

Target VPS: `89.223.126.190`, Ubuntu 24.04, existing Nginx/systemd services.

## Safety rules

- Do not change root password or SSH policy.
- Do not stop or edit existing `realcampguide`, `dominia`, `hermes-*`, `shadowsocks`, `zabbix`, or SSH services.
- Real Vibe binds only to `127.0.0.1:4300`; public traffic goes through Nginx.
- VK/TG webhook bots are deferred to a later unified `bot-service`.
- If direct OpenAI requests are blocked from the VPS region, set `OPENAI_PROXY_URL`
  in the VPS `.env`, for example `socks5h://127.0.0.1:1080`. The compose
  service uses host networking and binds Express to `127.0.0.1:4300`.

## Runtime

```bash
cd /srv/real-vibe-studio
docker compose up -d --build
curl http://127.0.0.1:4300/health
```

Nginx config source: `deploy/nginx/real-vibe-studio.conf`.

Enable staging before production DNS cutover:

```bash
ln -s /etc/nginx/sites-available/real-vibe-studio /etc/nginx/sites-enabled/real-vibe-studio
nginx -t
systemctl reload nginx
```

Issue TLS only after DNS points to the VPS:

```bash
certbot --nginx -d vps.real-vibe.studio
certbot --nginx -d real-vibe.studio -d www.real-vibe.studio
```

## Smoke tests

```bash
curl -H 'Host: vps.real-vibe.studio' http://127.0.0.1/health
curl -H 'Host: vps.real-vibe.studio' -H 'Content-Type: application/json' \
  -d '{"message":"привет"}' http://127.0.0.1/chat
docker compose logs --tail=100 real-vibe-web
```
