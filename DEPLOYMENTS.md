# DEPLOYMENTS.md — Deployment-Log

Eine Zeile pro Deploy, neuste unten. Wird von `deploy/deploy.sh` geschrieben —
nicht von Hand pflegen.

Zu jeder Build-ID gehört genau ein Backup unter `backups/<build-id>/`
(Live-DB + `uploads/`, gezogen unmittelbar **vor** diesem Deploy).
`backups/` ist gitignored, liegt also nur lokal.

Ablauf, Flags und der Schutz des Datenbestands: siehe README, Abschnitt „Deploy".

**Historie neu geschrieben am 2026-10-13.** Alle Commit-Kennungen haben sich
dabei geändert. Die Spalte „Commit" zeigt die neuen Kennungen. Build-IDs und
Backup-Ordner bis einschließlich `20261013-1518-54753fb` tragen weiterhin die
alte Kennung im Namen — sie sind Bezeichner (in der App und als Ordnername)
und bleiben unverändert.

| Build ID | Commit | Deployed (UTC) | Backup | Note |
| :--- | :--- | :--- | :--- | :--- |
| `manual-initial` | — | 2026-08-24 | — | Erst-Deploy von Hand, vor Einführung von `deploy.sh` — kein Backup, keine Build-ID |
| `20260830-1853-a2cf993` | `201d9cb` | 2026-08-30T18:53:18Z | `backups/20260830-1853-a2cf993/` | structured exercise naming + deploy pipeline |
| `20260831-2007-82d7e17` | `74e02ae` | 2026-08-31T20:07:44Z | `backups/20260831-2007-82d7e17/` | gym feedback: naming, number entry, wake lock, session recovery |
| `20260831-2224-e818118` | `058d878` | 2026-08-31T22:24:35Z | `backups/20260831-2224-e818118/` | search fix + gym shorthand for muscle names |
| `20260901-1122-d56e8cf` | `998a97e` | 2026-09-01T11:22:07Z | `backups/20260901-1122-d56e8cf/` | anatomical body heat map |
| `20260901-1259-249eee0` | `3aa7ba9` | 2026-09-01T12:59:24Z | `backups/20260901-1259-249eee0/` | app icon + deploy rule |
| `20260902-0628-061d01a` | `0c856d9` | 2026-09-02T06:28:21Z | `backups/20260902-0628-061d01a/` | Body dashboard rebuild: gauge, segments, bands, working range switch |
| `20260902-0745-4f61fbf` | `3c9109b` | 2026-09-02T07:45:22Z | `backups/20260902-0745-4f61fbf/` | all 873 exercises titled; My-library filter removed |
| `20260902-1225-f86935b` | `cd1abaf` | 2026-09-02T12:25:24Z | `backups/20260902-1225-f86935b/` | range switch reaches everything; weekly calendar; segment fixes |
| `20260902-1503-9afb40e` | `f60497a` | 2026-09-02T15:03:44Z | `backups/20260902-1503-9afb40e/` | finish-sheet comparison fallback; weekly-only calendar |
| `20260902-1804-fea7f1a` | `d6c532f` | 2026-09-02T18:04:19Z | `backups/20260902-1804-fea7f1a/` | consistency calendar back to timeline |
| `20260902-1850-5f6e407` | `c8cab0e` | 2026-09-02T18:50:26Z | `backups/20260902-1850-5f6e407/` | inferred variants; duplicate-title merge |
| `20260903-2010-63ff4b1` | `2fb0520` | 2026-09-03T20:10:39Z | `backups/20260903-2010-63ff4b1/` | workout groups |
| `20260909-2109-5cffbc8-dirty` | `cdb8660` | 2026-09-09T21:09:19Z | `backups/20260909-2109-5cffbc8-dirty/` | — |
| `20260913-0553-107db04-dirty` | `2623f0d` | 2026-09-13T05:53:43Z | `backups/20260913-0553-107db04-dirty/` | session survives a workout; failed saves and searches say so; exercise photos 4:3 contain; db/ denied over HTTP |
| `20260918-0859-c8b93ea-dirty` | `644372a` | 2026-09-18T08:59:48Z | `backups/20260918-0859-c8b93ea-dirty/` | leg titles by movement, Squat/Deadlift without muscle, Smith-Machine; FitScore trend; e1RM radars (primary muscle only) |
| `20260918-1641-2a977cb-dirty` | `5b5c173` | 2026-09-18T16:41:30Z | `backups/20260918-1641-2a977cb-dirty/` | one exercise selector everywhere, browse by workout, grouped workout picker, rows without muscle, sourced volume targets |
| `20260918-2019-7c83c3f-dirty` | `09373be` | 2026-09-18T20:19:41Z | `backups/20260918-2019-7c83c3f-dirty/` | pinned headers, workout groups, overview min/max, exercise tab (load, max weight, volume), no Bodyweight in titles |
| `20260918-2154-a2f9ec5-dirty` | `50a610e` | 2026-09-18T21:54:06Z | `backups/20260918-2154-a2f9ec5-dirty/` | colour palette: blue UI only, blue-grey muscles, violet metrics |
| `20260919-0646-c84786f-dirty` | `b1e69c0` | 2026-09-19T06:46:13Z | `backups/20260919-0646-c84786f-dirty/` | colour palette live, docs |
| `20260925-1529-fca442d-dirty` | `755905d` | 2026-09-25T15:29:42Z | `backups/20260925-1529-fca442d-dirty/` | Sticky headers fix, browse-by-workout button |
| `20260925-1649-ddc2dbe-dirty` | `3c3a2d2` | 2026-09-25T16:49:38Z | `backups/20260925-1649-ddc2dbe-dirty/` | Opaque sticky headers, compact exercise selector, flat A-Z list (#58-#60) |
| `20260925-1725-6380dea-dirty` | `8bffc9a` | 2026-09-25T17:25:46Z | `backups/20260925-1725-6380dea-dirty/` | Fixed header outside scroller, one-mode exercise selector (#61-#63) |
| `20261005-1121-5af4ce4-dirty` | `8c6d7da` | 2026-10-05T11:21:05Z | `backups/20261005-1121-5af4ce4-dirty/` | Tracking: subtitles, finish confirmation, stable suggestion after resume, finish sheet number format (#64-#66, #68) |
| `20261005-1126-19c224f` | `3b78e01` | 2026-10-05T11:26:03Z | `backups/20261005-1126-19c224f/` | Clean build id: .claude ignored, no code change |
| `20261006-0741-0b87148` | `782c59f` | 2026-10-06T07:41:43Z | `backups/20261006-0741-0b87148/` | Profile + current BMI, back button on all sub-pages (#70, #72) |
| `20261008-2008-2f616c8` | `a82cb91` | 2026-10-08T20:08:26Z | `backups/20261008-2008-2f616c8/` | Legs Raise Lying Titel; Push/Pull/Legs-Übungslisten live |
| `20261009-1030-2c89417` | `da3c963` | 2026-10-09T10:30:40Z | `backups/20261009-1030-2c89417/` | Dashboard All ab erstem Training; Gainsfire-Import 09.10. |
| `20261009-1116-bf161af` | `73f515a` | 2026-10-09T11:16:20Z | `backups/20261009-1116-bf161af/` | Dashboard/Exercise: Workout-Ansicht bleibt offen (#78) |
| `20261012-0958-acb9400-dirty` | `3e36f4b` | 2026-10-12T09:58:09Z | `backups/20261012-0958-acb9400-dirty/` | global range 7D-All, vergleich, ACWR chart, workout development |
| `20261012-1012-69b2aae-dirty` | `d620a95` | 2026-10-12T10:12:31Z | `backups/20261012-1012-69b2aae-dirty/` | kachel merge, kalender min 4 wochen, sessions mit arbeitssaetzen |
| `20261012-1351-e704cb2` | `5f5d37a` | 2026-10-12T13:51:24Z | `backups/20261012-1351-e704cb2/` | cache buster (version check + banner), no-cache headers, sw api denylist (csv download) |
| `20261012-1825-43fc1ba` | `310749e` | 2026-10-12T18:25:44Z | `backups/20261012-1825-43fc1ba/` | body weight one entry per day, dashboard pass (#96-#111) |
| `20261012-1942-7094336` | `66e1d4a` | 2026-10-12T19:42:35Z | `backups/20261012-1942-7094336/` | tracking: session on first set, suggestion text, finish duration; consistency caption (#67, #69, #74, #86, #104) |
| `20261012-1956-f42aaa3` | `1c423bd` | 2026-10-12T19:56:38Z | `backups/20261012-1956-f42aaa3/` | compact volume tile, ACWR/session title, full-week calendar (#113-#115) |
| `20261012-2047-aaa953f` | `1690fbe` | 2026-10-12T20:47:41Z | `backups/20261012-2047-aaa953f/` | scroll anchor, fixed-height calendar, leaner body view (#115-#121) |
| `20261012-2111-d2f7477` | `b110295` | 2026-10-12T21:11:45Z | `backups/20261012-2111-d2f7477/` | lean mass last in body chart legend (#122) |
| `20261013-0343-c00cdb2` | `7cb9943` | 2026-10-13T03:43:13Z | `backups/20261013-0343-c00cdb2/` | exercise scope: record tiles (max set weight, e1RM, volume), history with weight x reps per set (#123) |
| `20261013-0353-b880849` | `5fc7d57` | 2026-10-13T03:53:59Z | `backups/20261013-0353-b880849/` | exercise scope: next-time suggestion card, two-line record tile titles (#123, #124) |
| `20261013-0408-6aa652f` | `e9d4870` | 2026-10-13T04:08:09Z | `backups/20261013-0408-6aa652f/` | exercise scope: last time + target card, hints independent of range, history one line per weight (#123, #126, #127) |
| `20261013-0432-8ac7a92` | `ed5cda6` | 2026-10-13T04:32:34Z | `backups/20261013-0432-8ac7a92/` | recovery estimate tile, overview order and tile titles, exercise: last time + target as two tiles (#128-#132) |
| `20261013-1518-54753fb` | `904f72c` | 2026-10-13T15:18:50Z | `backups/20261013-1518-54753fb/` | recovery estimate: title + banded scale; tile titles in exercise, workout, body (#131, #133) |
| `20261013-1717-0f72c88` | `0f72c88` | 2026-10-13T17:17:57Z | `backups/20261013-1717-0f72c88/` | uncurated titles cleaned up, fly-with-a-twist title, subtitle names the muscle on Legs titles (#23, #25, #57) |
| `20261013-1855-f737ee0` | `f737ee0` | 2026-10-13T18:55:19Z | `backups/20261013-1855-f737ee0/` | training load chart: start and end date with year (#136) |
| `20261014-0802-e4ac65e-dirty` | `e4ac65e` | 2026-10-14T08:02:34Z | `backups/20261014-0802-e4ac65e-dirty/` | back squat titled Squat Barbell, bench squat own title, sumo squat mapping (#138, #139) |
| `20261014-1229-9f88a3a` | `9f88a3a` | 2026-10-14T12:29:20Z | `backups/20261014-1229-9f88a3a/` | dashboard tiles keep a fixed height across ranges (#141) |
| `20261014-1233-70a81bf` | `70a81bf` | 2026-10-14T12:33:01Z | `backups/20261014-1233-70a81bf/` | version 1.0 |
| `20261015-0329-1db93aa` | `1db93aa` | 2026-10-15T03:29:16Z | `backups/20261015-0329-1db93aa/` | plateau rule two-stage, e1RM trendlines, upright dates, taller progress charts (#144-#147) |
| `20261015-0332-aa913eb` | `aa913eb` | 2026-10-15T03:32:15Z | `backups/20261015-0332-aa913eb/` | decimal weights, iOS icon (#142, #143) |
| `20261015-0335-f68243c` | `f68243c` | 2026-10-15T03:35:32Z | `backups/20261015-0335-f68243c/` | e1RM chart month/year labels when tight (#148) |
| `20261015-0345-a32b925` | `a32b925` | 2026-10-15T03:45:32Z | `backups/20261015-0345-a32b925/` | short-term trendline (#149) |
| `20261015-0351-012a42a-dirty` | `012a42a` | 2026-10-15T03:51:17Z | `backups/20261015-0351-012a42a-dirty/` | trendline colors (#150) |
| `20261015-0351-012a42a` | `012a42a` | 2026-10-15T03:51:47Z | `backups/20261015-0351-012a42a/` | redeploy #150 without foreign tracking WIP |
| `20261015-0359-1e9079a` | `1e9079a` | 2026-10-15T03:59:05Z | `backups/20261015-0359-1e9079a/` | dashboard exercise picker: tracked exercises only (#154) |
