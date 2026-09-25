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

Copy `.env.self-hosted.example` to `/etc/cinder.env` on the Cinder guest. For
local validation, make a separate copy at `.env.self-hosted` and set
`CINDER_BIND_IP=127.0.0.1`. The production guest uses its reserved
`10.10.40.180` address. Do not commit a populated environment file.

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

## Production tunnel setup

The base images in `Dockerfile` and the cloudflared image in `compose.yaml` are
pinned by digest. Store the dedicated Cloudflare tunnel token outside the
repository; never put it in Compose, Git, logs, or an image layer. Install it
from a securely provisioned file (replace `/secure/path/tunnel-token` below):

```bash
sudo install -d -o root -g root -m 0700 /etc/cinder
sudo install -o 65532 -g 65532 -m 0400 /secure/path/tunnel-token /etc/cinder/cloudflared-token
sudo stat -c '%u:%g %a' /etc/cinder/cloudflared-token
```

The expected output is `65532:65532 400`. Cloudflared runs as `nonroot` (UID/GID
65532). Compose file secrets preserve the host file's ownership and permissions;
setting secret `uid`, `gid`, or `mode` in Compose does not fix a root-owned
`0600` file. Repeat the ownership and permission settings when rotating the
token. If `CLOUDFLARED_TOKEN_FILE` is overridden, install at that path instead.

Before starting production, run these checks from `/opt/cinder` against the
exact pinned image:

```bash
sudo docker compose --env-file /etc/cinder.env --profile tunnel run --rm --no-deps cloudflared version
sudo docker compose --env-file /etc/cinder.env --profile tunnel run --rm --no-deps cloudflared tunnel run --help | grep -- --token-file
```

The help output must list `--token-file`. Do not start the service if it is
absent: older cloudflared releases do not support this option. Production
starts the `tunnel` profile through `cinder.service`; local validation leaves
that profile off.

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
- after `sudo systemctl start cinder`, run
  `sudo docker compose --env-file /etc/cinder.env --profile tunnel logs --since 5m cloudflared`
  from `/opt/cinder` and confirm successful `Registered tunnel connection`
  messages, with no token-file permission errors or repeated restarts;
- public hostname resolves and TLS is valid through the dedicated tunnel;
- direct non-monitoring access to TCP 8080 is unavailable;
- student sign-in and assigned-ticket workflows succeed;
- instructor sign-in and Lab Manager workflows succeed;
- Realtime assignment and review updates reach a second session;
- GitHub Pages remains available as rollback during the pilot;
- monitoring observes the private endpoint.

An active `cinder.service` only confirms that Compose started the containers;
it does not prove the tunnel connected. Require both the connection log check
and a successful request to the public hostname before accepting deployment.

## Rollback

Disable only the dedicated Cinder tunnel hostname and direct users to the
unchanged GitHub Pages URL. Stop the pilot container after traffic is confirmed
absent:

```bash
sudo systemctl stop cinder
```

This stops both production containers using the tunnel profile and production
environment. Use `sudo systemctl disable cinder` as well if the pilot should
remain stopped after reboot. For a local validation deployment, use
`docker compose --env-file .env.self-hosted down` instead.

Do not delete the image or deployment directory until the comparison and
rollback window are complete.
