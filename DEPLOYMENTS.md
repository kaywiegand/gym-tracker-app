# DEPLOYMENTS.md — Deployment-Log

Eine Zeile pro Deploy, neuste unten. Wird von `deploy/deploy.sh` geschrieben —
nicht von Hand pflegen.

Zu jeder Build-ID gehört genau ein Backup unter `backups/<build-id>/`
(Live-DB + `uploads/`, gezogen unmittelbar **vor** diesem Deploy).
`backups/` ist gitignored, liegt also nur lokal.

Ablauf, Flags und der Schutz des Datenbestands: siehe README, Abschnitt „Deploy".

| Build ID | Commit | Deployed (UTC) | Backup | Note |
| :--- | :--- | :--- | :--- | :--- |
| `manual-initial` | — | 2026-08-24 | — | Erst-Deploy von Hand, vor Einführung von `deploy.sh` — kein Backup, keine Build-ID |
| `20260830-1853-a2cf993` | `a2cf993` | 2026-08-30T18:53:18Z | `backups/20260830-1853-a2cf993/` | structured exercise naming + deploy pipeline |
| `20260831-2007-82d7e17` | `82d7e17` | 2026-08-31T20:07:44Z | `backups/20260831-2007-82d7e17/` | gym feedback: naming, number entry, wake lock, session recovery |
| `20260831-2224-e818118` | `e818118` | 2026-08-31T22:24:35Z | `backups/20260831-2224-e818118/` | search fix + gym shorthand for muscle names |
| `20260901-1122-d56e8cf` | `d56e8cf` | 2026-09-01T11:22:07Z | `backups/20260901-1122-d56e8cf/` | anatomical body heat map |
| `20260901-1259-249eee0` | `249eee0` | 2026-09-01T12:59:24Z | `backups/20260901-1259-249eee0/` | app icon + deploy rule |
| `20260902-0628-061d01a` | `061d01a` | 2026-09-02T06:28:21Z | `backups/20260902-0628-061d01a/` | Body dashboard rebuild: gauge, segments, bands, working range switch |
