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
2026-10-01 · issues · issue reporter r36 (U47 A3) · one fix walk and a reapply: the kit's `screen()` (Playwright's `ariaSnapshot`, and `getByRole`) keeps an `inert` subtree, so the first fix trial (`inert` on the hidden box) still "showed" the button and I had to add a Chrome DevTools Protocol `Accessibility.getFullAXTree` read to tell what a screen reader is given; that read then showed the Tab wrap broken by the focus trap, which cost a revert and a second apply and rebuild · a kit helper `axTree(page, {role, name})` over `Accessibility.getFullAXTree` (patterns.md "Probe kit"), with a note that the aria snapshot is not the browser's tree for `inert`, `aria-hidden` on focusables or opacity-0 content
2026-10-01 · issues · issue reporter u13a8 (U13 A8) · the unit joined an already filed report (U19 A15, the same `%` date patterns) whose "every instance" search had covered `.tpl` and `.php` only, so the citation plugin's `ris.blade` was missed there and the join had to widen its Cause, fix and Affects to two more apps and a second repository · REPORT.md "Proposed fix" question 3 naming `.blade` templates and the plugin submodules (`plugins/generic/*`, their own repos) among the places an instance search covers
2026-10-01 · issues · issue reporter w40 (U35 OJS1) · `try-fix.js revert` on a diff that adds a file refused ("does not match its state before the fix"): `patch -R` leaves the added file empty rather than deleting it, so the marker and the empty file were removed by hand; and the session's shared scratchpad already held another reporter's `fix/a`, `fix/b` trees, which a generic `diff -ruN a b` would have mixed into this diff · `try-fix.js` reverting with `patch -E` (or deleting a `before: null` file that is empty), and briefs naming a per-reporter scratch folder (`<scratchpad>/<agent>/`)
2026-10-01 · issues · issue reporter w34 (U21 A7, OPS5) · one walk taken twice on main: the first ran while another reporter's fix.diff was applied to the slot's checkouts, because `try-fix status` exits 0 with a fix applied and was chained with `&&` before the reset; and one partial 3.5 walk: OPS's Emails tab has a second "Do not send an email." radio (postedAcknowledgement), so a role-and-name locator hit strict mode · `try-fix status` exiting non-zero (or `probe.js` warning) when any marker is present, and a shared wizard-submit helper (now in shared/playwright/checks/issues/editorial-role-submitter-no-acknowledgement/submit.js) the next wizard walk can require
