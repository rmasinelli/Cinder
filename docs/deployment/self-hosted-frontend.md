# Self-hosted frontend pilot

This pilot moves only Cinder's static React frontend off GitHub Pages. It keeps
the existing hosted Supabase project for authentication, Postgres, RPCs, and
Realtime so the hosting variable can be measured independently.

## Data flow and boundaries

```text
browser -> Cloudflare dedicated Cinder tunnel -> Cinder container
browser ---------------------------------------> hosted Supabase
```

The container has no database credentials, writable application storage, or
server-side session state. The Supabase publishable key is intentionally usable
by browsers; authorization remains enforced by Supabase RLS and RPCs.

## Build and local acceptance

Copy `.env.self-hosted.example` to `/etc/cinder.env` on the Cinder guest. The
production guest uses its reserved `10.10.40.180` address; local validation can
override `CINDER_BIND_IP=127.0.0.1`. Do not commit a populated environment file.

```bash
docker compose --env-file .env.self-hosted build
docker compose --env-file .env.self-hosted up -d
curl --fail http://127.0.0.1:8080/healthz
curl --fail http://127.0.0.1:8080/
docker compose ps
```

The production listener is bound to the guest's reserved address. The
`cinder-firewall` service permits only Uptime Kuma (`10.10.40.31`) to reach the
published TCP 8080 port. Cloudflared belongs on the same private Docker network
and reaches `http://cinder-web:8080` without using the published host port.

The base images in `Dockerfile` are pinned by digest. Store the dedicated
Cloudflare tunnel token outside the repository with mode `0600`; never put it
in Compose, Git, logs, or an image layer. Production starts the `tunnel`
profile through `cinder.service`; local validation leaves that profile off.

## Parallel comparison

Keep the GitHub Pages site available during the pilot. Compare both endpoints
from the same classroom network and device, recording:

- first load and repeat load timings;
- JavaScript download and parse time;
- Supabase request latency and slow RPC/query names;
- realtime reconnects or duplicate subscriptions;
- browser main-thread stalls during instructor and student workflows;
- behavior with a representative number of simultaneous student sessions.

Moving the static frontend is successful only if measured responsiveness
improves without auth, RLS, realtime, or classroom-workflow regressions.

## Live acceptance

- container reports healthy on `10.10.40.180:8080` from Uptime Kuma;
- public hostname resolves and TLS is valid through the dedicated tunnel;
- direct non-monitoring access to TCP 8080 is unavailable;
- student sign-in and assigned-ticket workflows succeed;
- instructor sign-in and Lab Manager workflows succeed;
- Realtime assignment and review updates reach a second session;
- GitHub Pages remains available as rollback during the pilot;
- monitoring observes the private endpoint.

## Rollback

Disable only the dedicated Cinder tunnel hostname and direct users to the
unchanged GitHub Pages URL. Stop the pilot container after traffic is confirmed
absent:

```bash
docker compose --env-file .env.self-hosted down
```

Do not delete the image or deployment directory until the comparison and
rollback window are complete.
