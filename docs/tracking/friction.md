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
2026-10-13 · issues · issue reporter u30r1 (U30 A11) · the OJS dataset users `jdoe`, `lvon` and `rsharif` carry `must_change_password`, so `signIn()` as `jdoe` stalls on the change-password page (LoginPage waits 15 s for a URL without `/login`) and two OJS walks aborted before the cause showed; `dataset.md` lists them as plain reviewers · a "must change password" note on those rows of `dataset.md` (`dataset-facts` could read `users.must_change_password`), or a `signIn()` error that names the change-password page
