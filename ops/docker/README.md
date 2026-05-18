# Docker Deployment

The Docker setup builds the Astro static site and serves it with nginx.

## Service

```text
sheridan-cookbook-nginx
└── serves the static files from apps/site/dist
```

Docker Compose resource names are explicit so they do not depend on the local checkout folder name.

| Resource | Name |
| --- | --- |
| Compose project | `sheridan-cookbook` |
| Site image | `sheridan-cookbook-site:local` |
| nginx container | `sheridan-cookbook-nginx` |
| Network | `sheridan-cookbook-network` |

## Files

```text
compose.yaml
ops/docker/
├── Dockerfile
└── nginx.conf
```

The Dockerfile does this:

1. Installs npm dependencies in a Node build stage.
2. Runs `npm run build`, which syncs content and builds Astro.
3. Copies `apps/site/dist/` into a minimal nginx image.

## Local Test Run

From the repo root:

```sh
docker compose up -d --build --remove-orphans
```

Open:

```text
http://127.0.0.1:8080
```

Verify:

```sh
curl -I http://127.0.0.1:8080/
curl -I http://127.0.0.1:8080/add-recipe/
curl -I http://127.0.0.1:8080/search.json
curl -I http://127.0.0.1:8080/resources/archived-scans/breads/banana-bread.jpg
```

Stop:

```sh
docker compose down --remove-orphans
```

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `COOKBOOK_HTTP_PORT` | `8080` | Host port published by nginx. |

Recipe submission email is static site content. Change it in `apps/site/src/lib/site-config.ts`, then rebuild.
