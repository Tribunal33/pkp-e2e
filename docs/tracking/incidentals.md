# Incidentals

What a session saw in passing on another feature's screens; the spec
author reads their feature's rows at RUNBOOK step 3 and the row is deleted
when the spec absorbs it.

| Feature | Screen | Seen | Date | Evidence |
|---|---|---|---|---|
| U03 User profile (Rules 10b and 3, a second browser after a password or email change) | A tab press or "Save" in the other browser of an account whose password or email was changed, OJS `main` (walked by the U03 A25 reporter; the email case seen by the U03 drift sweep, footnote of the email change) | After the first request ends the session, each later tab press raises a browser alert reading "##user.authorization.userRequired##", an English raw key no locale file holds (the alert is A25's neighbour, not its fault). A raw English key is a finding, not a missing translation: drive it on OJS, OMP and OPS and say which presses raise it; a 🐞 candidate for U03 | 2026-10-15 | housekeeping, the U03 A25 reporter h15e (`docs/issues/U03-A25-stale-session-tab-press-script-error.md` Observed and Cause; `shared/playwright/checks/issues/stale-session-tab-press-script-error/walk.js`) |
