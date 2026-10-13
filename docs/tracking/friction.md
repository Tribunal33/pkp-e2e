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
2026-10-13 · plugin-review · plugin-review drive (pg-549) · the 3.5 contributor form's Affiliations field asks api.ror.org from the browser as one types; `sandbox/drive-guard.js` aborts it, so the autosuggest never offers the typed name and a contributor cannot be saved with an affiliation (two failed runs, then a local empty-result route in the drive); separately, opening the submission wizard straight at `#files` rendered the step but ignored the genre and Continue clicks (four retries) until the drive entered at Details and clicked Continue · a `stubRor` option in drive-guard.js answering api.ror.org locally with an empty result (logged like a drop), and a line in harness.md "The plugin sandbox" that wizard steps are reached from Details by Continue, not by the hash
2026-10-13 · plugin-review · plugin-review drive (pg-550) · on 3.5 "Schedule For Publication" silently does nothing when clicked before the publication panel's `_components/titleAbstract` request has answered, and an unassigned publication needs Publication › Issue › "Assign to Issue" first (five runs to find both); the `php` verb's CLI has no request router, so building anything that reads a localized field (or registering a plugin) dies on `getContext() on null` until a `PageRouter` is set, and SQL passed inline through `php -r` breaks on PHP's `$` interpolation · a line in harness.md "The plugin sandbox" on publishing in the pod (Issue tab first, wait for the panel's component), a `sql` verb in bin/plugin-sandbox.js (query passed safely, rows as JSON), and a `php` bootstrap snippet that sets the router and context
