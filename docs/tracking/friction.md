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
2026-09-30 · U24 · claim checker ccI30frb (hk30 FRb) · a session pause closed all six probe browsers mid-run, and on resume no server of slot s1 answered (ports 8300-8590 refused), so the ar/prod phases never ran; before that each dashboard view read cost ~20 s (a generic stable() loop under load) and the bulk menu item needed dispatchEvent after a 6 s click timeout · a fleet health check (or restart) on session resume, and a kit settle for the Vue dashboard keyed on the view heading and the table rows
2026-09-30 · U27 · flake diagnostician fd-u27 (hk30) · about ten lever runs (~60 tests) spent before a lever reproduced the class: CPU ×6 beside another load only timed out the "OK" saves on a 7-11 s php -S, and a held press alone rarely lands in a jQuery slide; what worked was stretching the one timer task between a legacy grid landing and its `urlInDivLoaded` handler plus a button-up that waits for the window to settle (built ad hoc in `.reports/flake-0930/u27s6/diag-press.js`); a session pause also killed two background runs mid-way · a harness lever for legacy jQuery windows (delay a named handler event, and a "press held until jQuery is idle" mode) beside the four in `throttle.js`
2026-09-30 · U05 · flake diagnostician fd-u05 (hk30) · the harness levers (`PLAYWRIGHT_CPU_THROTTLE`, `PLAYWRIGHT_HOLD_URL`) reach only fixture contexts, so a test that opens its own with `browser.newContext()` (U05 S6's fresh-login context) is out of their reach: it cost a throwaway probe spec plus a temporary edit to S6 to throttle one tab; separately, `pkill -f` on a pattern that names this clone's path killed the agent's own shell · `throttleCpu()` applied in a `newContext` wrapper the suites use for their own contexts (or a lever keyed on a page-level hook), and a `bin/` helper that kills a slot's orphan servers by port instead of by pattern
2026-09-30 · U03 · flake diagnostician fd-u03 (hk30) · second instance the same day of the levers reaching only fixture contexts (U05's row above): every U03 test signs in through its own `browser.newContext()` (`freshLogin`), so no `PLAYWRIGHT_*` lever reaches it and the S5 flow had to be rebuilt as a probe (`.reports/flake-0930/u03s5/probe/s5loop.js`) to hold or kill one request · a `browser.newContext` wrap in base-test.js (or a fixture for fresh-login contexts) that applies `disableMotion` and `throttleCpu` to every context a test opens
