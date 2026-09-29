# Friction — what made an agent's task harder than it needed to be

What cost a screen-driving agent calls, time or retries that a better
brief, doc, kit, seed or fixture would have saved; that agent appends a row
at the end of its task. The housekeeping session folds the rows and
deletes them under MAINTENANCE "The housekeeping session".

One line per entry, appended at the end, in this shape:

`YYYY-MM-DD · U<nn> or sync · <role and agent id> · <what cost you calls, time or retries> · <what would have helped>`

Facts only, the same quarantine as everywhere else (nothing
security-shaped, no credentials).

## Entries
2026-09-29 · U45 · harness agent hU45 · the brief's step 4 recipe runs a serial file with `--project=<app>-serial --no-deps` and then its `@solo` tests; for OMP `tests/serial/U64-usage-statistics.spec.js`, whose every test is `@solo`, the serial run exits 1 with "Error: No tests found." (the project's grepInvert drops them all), which reads as a red until the log is opened · the brief (or harness.md "Running") could say a serial file holding only `@solo` tests runs in the solo project alone, or list which serial files are all-solo
2026-09-29 · U45 · claim checker ccR2 (revision R2) · one smoke run went to two premises a line in seed-facts would have carried: an OMP chapter page is addressed by the first version's chapter number in every version (`…/version/{pub}/chapter/{sourceChapterId}`; the new version's own chapter number answers 404, the rule lives only in U69's reference table), and the DOIs page's "DOIs for all versions" window lists its blocks oldest first · seed-facts.md could carry the chapter-page address rule, and DoisPages.js a `newestVersionBlock()`
2026-09-29 · U45 · claim checker ccR1 (revision R1) · q27 scripted a chapter drag for the chapter-order axis before finding U72 Rule 8a (chapters cannot be reordered on screen), and its premise that saving a format from its Edit window moves it last did not hold (clearing its DOI is what moved it, three runs); seed-facts.md carries neither fact, so a line there would have saved a drag attempt and a premise re-read · seed-facts.md, the {OMP} format-order line and a chapter-order line
2026-09-29 · U45 · test author tojs (revision) · one red run and one diagnostic run went to S5's Activity Log count: a UI publish of a seeded Production item goes through the "Review Publishing Details" panel, whose "Confirm" saves the publication and logs its own "Submission metadata updated" before the publish logs the DOI's, so "the publish gained one line" reads two · seed-facts.md could say that a workflow publish through that panel logs a metadata line of its own
2026-09-29 · U45 · test author tomp (revision) · one red run sat six minutes on a single step: after an Activity Log read had left the DOIs page, `DoisPage.expand()` clicked a row that was no longer on screen, and with no action timeout in the config the click waited out the whole test timeout instead of failing at once · an `actionTimeout` (about 30 s, as the page objects' own `T`) in the shared Playwright config, so a click on a vanished element fails in seconds with its locator
2026-09-29 · U45 · security verify sec · the brief's step 1 named the private file at `e2e_ng/security.md`, which does not exist; the live file (with the entry to verify) is `e2e_ng/security_files_to_triage/security_local_<date>.md`, and the only `security.md` on disk is a stale `e2e_ng/reviewed/` copy, so a couple of calls went to locating the right file · the security-verify brief (and CLAUDE.md's pointer) could name the current dated triage file, or the export step could keep a stable `security.md` symlink at the documented path
