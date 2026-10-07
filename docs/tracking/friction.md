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
2026-10-07 · issues · issue reporter r9 (U10 A15) · a neighbour walk showing a form's second language guessed the language button's label ("Français") and had to be re-walked on all three apps: on the default dataset the form's button reads "French" and the French fields are hidden until it is pressed · a line in dataset.md "Writing steps against it" naming the form language buttons ("French", class pkpFormLocales__locale) and that a multilingual field's other languages stay hidden until pressed
2026-10-07 · issues · issue reporter r8 (U31 A12) · the app lock for the fix trial waited about 75 minutes behind one holder (two 30-minute acquire timeouts) before a single 25-minute trial · a lock holder's expected release time in locks.json, or a separate fix-trial slot, so a reporter can plan its code reads around the wait
2026-10-07 · housekeeping · claim checker ccU26 (U26 I07) · a drive on scratch contexts that changes no code waited about 70 minutes for the slot's app-checkout lock (two 30-minute acquire timeouts behind fix trials) before a 15-minute run · a read-only share of applock.py (granted while no fix diff is applied), or a marker in locks.json that a diff is actually in the checkouts, so checkers wait only while code is changed
2026-10-07 · housekeeping · claim checker ccU27 (U27 I07) · a 9-minute read-only drive on scratch contexts waited about 75 minutes for the slot's app-checkout lock (two 30-minute acquire timeouts, each re-acquired by hand behind fix trials and other checkers) · the same as ccU26's line: a shared read lock for checkers while no fix diff is applied, or an acquire that keeps its place past 30 minutes on its own
2026-10-07 · U29, issues · issue reporter ra (refresh of U29 A13) · the kept fix-trial.sh from 2026-10-05 hard-coded another slot's repo root, feature and a lock helper that no longer exists (.reports/issues/sx/applock.py), so it had to be rewritten before the trial · a rule in harness.md "Trying a fix" that a kept trial script takes the repo root from its own path and the feature, dataset, agent and lock command from the environment
