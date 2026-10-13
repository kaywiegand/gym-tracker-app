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
| `20260918-1641-2a977cb-dirty` | `2a977cb` | 2026-09-18T16:41:30Z | `backups/20260918-1641-2a977cb-dirty/` | one exercise selector everywhere, browse by workout, grouped workout picker, rows without muscle, sourced volume targets |
| `20260918-2019-7c83c3f-dirty` | `7c83c3f` | 2026-09-18T20:19:41Z | `backups/20260918-2019-7c83c3f-dirty/` | pinned headers, workout groups, overview min/max, exercise tab (load, max weight, volume), no Bodyweight in titles |
| `20260918-2154-a2f9ec5-dirty` | `a2f9ec5` | 2026-09-18T21:54:06Z | `backups/20260918-2154-a2f9ec5-dirty/` | colour palette: blue UI only, blue-grey muscles, violet metrics |
| `20260919-0646-c84786f-dirty` | `c84786f` | 2026-09-19T06:46:13Z | `backups/20260919-0646-c84786f-dirty/` | colour palette live, docs |
| `20260925-1529-fca442d-dirty` | `fca442d` | 2026-09-25T15:29:42Z | `backups/20260925-1529-fca442d-dirty/` | Sticky headers fix, browse-by-workout button |
| `20260925-1649-ddc2dbe-dirty` | `ddc2dbe` | 2026-09-25T16:49:38Z | `backups/20260925-1649-ddc2dbe-dirty/` | Opaque sticky headers, compact exercise selector, flat A-Z list (#58-#60) |
| `20260925-1725-6380dea-dirty` | `6380dea` | 2026-09-25T17:25:46Z | `backups/20260925-1725-6380dea-dirty/` | Fixed header outside scroller, one-mode exercise selector (#61-#63) |
| `20261005-1121-5af4ce4-dirty` | `5af4ce4` | 2026-10-05T11:21:05Z | `backups/20261005-1121-5af4ce4-dirty/` | Tracking: subtitles, finish confirmation, stable suggestion after resume, finish sheet number format (#64-#66, #68) |
| `20261005-1126-19c224f` | `19c224f` | 2026-10-05T11:26:03Z | `backups/20261005-1126-19c224f/` | Clean build id: .claude ignored, no code change |
| `20261006-0741-0b87148` | `0b87148` | 2026-10-06T07:41:43Z | `backups/20261006-0741-0b87148/` | Profile + current BMI, back button on all sub-pages (#70, #72) |
| `20261008-2008-2f616c8` | `2f616c8` | 2026-10-08T20:08:26Z | `backups/20261008-2008-2f616c8/` | Legs Raise Lying Titel; Push/Pull/Legs-Übungslisten live |
| `20261009-1030-2c89417` | `2c89417` | 2026-10-09T10:30:40Z | `backups/20261009-1030-2c89417/` | Dashboard All ab erstem Training; Gainsfire-Import 09.10. |
| `20261009-1116-bf161af` | `bf161af` | 2026-10-09T11:16:20Z | `backups/20261009-1116-bf161af/` | Dashboard/Exercise: Workout-Ansicht bleibt offen (#78) |
| `20261012-0958-acb9400-dirty` | `acb9400` | 2026-10-12T09:58:09Z | `backups/20261012-0958-acb9400-dirty/` | global range 7D-All, vergleich, ACWR chart, workout development |
| `20261012-1012-69b2aae-dirty` | `69b2aae` | 2026-10-12T10:12:31Z | `backups/20261012-1012-69b2aae-dirty/` | kachel merge, kalender min 4 wochen, sessions mit arbeitssaetzen |
| `20261012-1351-e704cb2` | `e704cb2` | 2026-10-12T13:51:24Z | `backups/20261012-1351-e704cb2/` | cache buster (version check + banner), no-cache headers, sw api denylist (csv download) |
| `20261012-1825-43fc1ba` | `43fc1ba` | 2026-10-12T18:25:44Z | `backups/20261012-1825-43fc1ba/` | body weight one entry per day, dashboard pass (#96-#111) |
| `20261012-1942-7094336` | `7094336` | 2026-10-12T19:42:35Z | `backups/20261012-1942-7094336/` | tracking: session on first set, suggestion text, finish duration; consistency caption (#67, #69, #74, #86, #104) |
| `20261012-1956-f42aaa3` | `f42aaa3` | 2026-10-12T19:56:38Z | `backups/20261012-1956-f42aaa3/` | compact volume tile, ACWR/session title, full-week calendar (#113-#115) |
| `20261012-2047-aaa953f` | `aaa953f` | 2026-10-12T20:47:41Z | `backups/20261012-2047-aaa953f/` | scroll anchor, fixed-height calendar, leaner body view (#115-#121) |
| `20261012-2111-d2f7477` | `d2f7477` | 2026-10-12T21:11:45Z | `backups/20261012-2111-d2f7477/` | lean mass last in body chart legend (#122) |
| `20261013-0343-c00cdb2` | `c00cdb2` | 2026-10-13T03:43:13Z | `backups/20261013-0343-c00cdb2/` | exercise scope: record tiles (max set weight, e1RM, volume), history with weight x reps per set (#123) |
| `20261013-0353-b880849` | `b880849` | 2026-10-13T03:53:59Z | `backups/20261013-0353-b880849/` | exercise scope: next-time suggestion card, two-line record tile titles (#123, #124) |
| `20261013-0408-6aa652f` | `6aa652f` | 2026-10-13T04:08:09Z | `backups/20261013-0408-6aa652f/` | exercise scope: last time + target card, hints independent of range, history one line per weight (#123, #126, #127) |
| `20261013-0432-8ac7a92` | `8ac7a92` | 2026-10-13T04:32:34Z | `backups/20261013-0432-8ac7a92/` | recovery estimate tile, overview order and tile titles, exercise: last time + target as two tiles (#128-#132) |
| `20261013-1518-54753fb` | `54753fb` | 2026-10-13T15:18:50Z | `backups/20261013-1518-54753fb/` | recovery estimate: title + banded scale; tile titles in exercise, workout, body (#131, #133) |
