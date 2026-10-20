# Friction — what made an agent's task harder than it needed to be

What cost a screen-driving agent calls, time or retries that a better
brief, doc, kit, seed or fixture would have saved; that agent appends a row
at the end of its task. The housekeeping session folds the rows and
deletes them under MAINTENANCE "The housekeeping session".

One line per entry, appended at the end, in this shape:

`YYYY-MM-DD · U<nn>, sync or issues · <role and agent id> · <what cost you calls, time or retries> · <what would have helped>`

Facts only, the same quarantine as everywhere else (nothing
security-shaped, no credentials).

## Entries
2026-10-20 · U01 · test author tops (OPS) · the probe kit's `note()` reads like a console log in the patterns.md example but appends each call to `.reports/U01/screen-notes.md`, so a throwaway probe's debug values landed there as twelve raw lines (removed by hand; another author's probe did the same) and printed nothing to the console · a sentence in patterns.md "Probe kit" saying `note()` writes the screen notes and that a debug read goes to `record()` or `console.log`
2026-10-20 · U64 · claim checker ccUA1 (UNASSIGNED AFFM-170) · a fleet reset by the concurrent U05 sweep removed my OJS scratch context mid-run, and the run died 30 s later as `signIn` waiting for `input#username` on the vanished context's login page, which reads like a login-page drift until the DB is checked by hand (the slot's DB is `<app>_test_s1`, not `<app>_test`) · `signIn(page, user, {contextPath})` failing fast with "context <path> not found (fleet reset?)" when the context's login page has no form (a 404 or the site index)
2026-10-20 · U05 · claim checker ccSW1 (drift sweep) · two reruns' worth of time went to kept-check drift nobody had fixed: K1 k1.js phase 4 had timed out on the Create Journal form on every app although `screen-notes.md` already carried the working locator, and A13's "settling observation" (an English-only site) cannot be run on a shared fleet at all, since unticking a site language strips it from every journal for good · a sweep runner that greps each kept check's summary for `errors` and prints them beside the exit code, and a settling observation in a register entry that names the fleet it needs (`fleet-prep` of its own) when it changes a site-wide setting
2026-10-20 · U05 · claim checker ccSW2 (drift sweep) · K2's ann, issue and site phases had died in both sweep runs on every app (`support/jobs.js` `runJobs()` polls worker 0, down outside a suite run) while the sweep logs showed exit 0, so the chunk's announcement, issue and A4 lines came with no records, and the same phase had left the site's "Enable announcements" on for every U05 fleet · `runJobs()` failing at once with "no worker: use the kit's drainJobs(app)" when called from a probe, and the sweep runner printing each summary's `problems` beside the exit code
2026-10-20 · U05 · claim checker ccSW3 (drift sweep) · the kept K4 script failed three phases on every sweep run for reasons the kit docs already name (it drained jobs with `support/jobs.js` `runJobs()`, which polls worker 0, and opened Mailpit at a fixed `127.0.0.1:8025`, slot 0's), so its fixes and a second pair of full runs per app cost about an hour; one OJS run then hung 20 min on a second tab's `signIn()` with nothing in the run record · `npm run lint:probe-imports` also refusing `support/jobs` and a literal Mailpit port under `shared/playwright/checks/`, and a per-call timeout in the kit's `signIn()`
