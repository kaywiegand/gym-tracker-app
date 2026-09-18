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
| `20260902-0745-4f61fbf` | `4f61fbf` | 2026-09-02T07:45:22Z | `backups/20260902-0745-4f61fbf/` | all 873 exercises titled; My-library filter removed |
| `20260902-1225-f86935b` | `f86935b` | 2026-09-02T12:25:24Z | `backups/20260902-1225-f86935b/` | range switch reaches everything; weekly calendar; segment fixes |
| `20260902-1503-9afb40e` | `9afb40e` | 2026-09-02T15:03:44Z | `backups/20260902-1503-9afb40e/` | finish-sheet comparison fallback; weekly-only calendar |
| `20260902-1804-fea7f1a` | `fea7f1a` | 2026-09-02T18:04:19Z | `backups/20260902-1804-fea7f1a/` | consistency calendar back to timeline |
| `20260902-1850-5f6e407` | `5f6e407` | 2026-09-02T18:50:26Z | `backups/20260902-1850-5f6e407/` | inferred variants; duplicate-title merge |
| `20260903-2010-63ff4b1` | `63ff4b1` | 2026-09-03T20:10:39Z | `backups/20260903-2010-63ff4b1/` | workout groups |
| `20260909-2109-5cffbc8-dirty` | `5cffbc8` | 2026-09-09T21:09:19Z | `backups/20260909-2109-5cffbc8-dirty/` | — |
| `20260913-0553-107db04-dirty` | `107db04` | 2026-09-13T05:53:43Z | `backups/20260913-0553-107db04-dirty/` | session survives a workout; failed saves and searches say so; exercise photos 4:3 contain; db/ denied over HTTP |
| `20260918-0859-c8b93ea-dirty` | `c8b93ea` | 2026-09-18T08:59:48Z | `backups/20260918-0859-c8b93ea-dirty/` | leg titles by movement, Squat/Deadlift without muscle, Smith-Machine; FitScore trend; e1RM radars (primary muscle only) |
