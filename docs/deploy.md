# Deploy to testing VPS

This repo auto-deploys on push to `main` via `.github/workflows/deploy.yml`. The workflow SSHes into the Yandex Cloud VPS at `survey.andreevxdr.ru` / `api.andreevxdr.ru` and rebuilds the stack.

Stack on the VPS:
- **Caddy** — reverse proxy, auto-HTTPS via Let's Encrypt
- **frontend** — Vite-built static files served by nginx
- **backend** — NestJS prod build (`node dist/main.js`)
- **db** — Postgres 16

Only Caddy publishes ports (`80`, `443`); everything else is on the internal Docker network.

---

## One-time setup

### 1. DNS

Point both subdomains at the VPS public IP (use a **static** IP — ephemeral IPs change on reboot):

| Record | Type | Value |
|---|---|---|
| `survey.andreevxdr.ru` | A | `<VPS public IP>` |
| `api.andreevxdr.ru` | A | `<VPS public IP>` |

### 2. Yandex Cloud security group

Inbound TCP only: `22` (SSH), `80`, `443`.

### 3. VPS bootstrap

SSH in:

```sh
ssh alexsf2017@<VPS IP>
```

Install Docker + Compose plugin (Ubuntu):

```sh
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
exit
```

Log back in (group membership refresh), then clone the repo to `/opt/survey-app`:

```sh
sudo mkdir -p /opt/survey-app
sudo chown $USER:$USER /opt/survey-app
git clone https://github.com/andreevqt/survey-app.git /opt/survey-app
cd /opt/survey-app
```

Create `.env` with real secrets:

```sh
cp .env.prod.example .env
# Generate strong secrets:
openssl rand -hex 32   # JWT_ACCESS_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -hex 16   # POSTGRES_PASSWORD
openssl rand -hex 12   # ADMIN_PASSWORD
nano .env              # paste them in
```

First deploy (manual, to validate before wiring up CI):

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
```

Wait until Caddy logs show successful Let's Encrypt cert issuance. Then visit:
- https://survey.andreevxdr.ru
- https://api.andreevxdr.ru/v1/<some-endpoint>

### 4. Generate a dedicated CI SSH key

Don't reuse your personal key. On your **laptop**:

```sh
ssh-keygen -t ed25519 -f ~/.ssh/survey-app-ci -C "github-actions@survey-app" -N ""
```

Add the public key to the VPS for `alexsf2017`:

```sh
ssh-copy-id -i ~/.ssh/survey-app-ci.pub alexsf2017@<VPS IP>
# or add ~/.ssh/survey-app-ci.pub to the VM's ssh-keys metadata in Yandex Cloud
```

Verify:

```sh
ssh -i ~/.ssh/survey-app-ci alexsf2017@<VPS IP> 'docker ps'
```

### 5. GitHub Secrets

In the repo settings → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `SSH_HOST` | VPS public IP (static) |
| `SSH_USER` | `alexsf2017` |
| `SSH_KEY` | contents of `~/.ssh/survey-app-ci` (the private key, full file) |
| `SSH_PORT` | `22` (optional; defaults to 22) |

---

## Triggering a deploy

Any push to `main` runs the workflow. Manual runs: GitHub → Actions → "Deploy to testing" → "Run workflow".

The workflow on the VPS does:

```sh
cd /opt/survey-app
git fetch origin main && git reset --hard origin/main
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f
```

This wipes any local edits on the VPS (intentional — VPS is a deploy target, not an edit surface).

---

## Troubleshooting

**Cert issuance fails:**
- DNS A records actually point at the VPS? `dig survey.andreevxdr.ru`
- Ports 80 and 443 open in the security group?
- Check Caddy logs: `docker compose -f docker-compose.prod.yml logs caddy`

**Backend crash-loops:**
- DB ready? `docker compose -f docker-compose.prod.yml logs db`
- Migrations failed? `docker compose -f docker-compose.prod.yml logs backend`

**Frontend shows old `VITE_API_BASE_URL`:**
- It's baked in at build time. Re-run the workflow (forces a rebuild) — a plain restart won't pick up the new value.

**Manual rollback:**

```sh
cd /opt/survey-app
git reset --hard <previous-commit-sha>
docker compose -f docker-compose.prod.yml up -d --build
```
