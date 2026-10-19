# Incidentals

What a session saw in passing on another feature's screens; the spec
author reads their feature's rows at RUNBOOK step 3 and the row is deleted
when the spec absorbs it.

| Feature | Screen | Seen | Date | Evidence |
|---|---|---|---|---|
| U01 Login & sessions (the sign-in log's entry for a logout the app forces) | Administration's user sign-in log, after a session ends because the account's stored password changed under it (another browser's password change, or the first sign-in's re-save U01 A15 describes), OJS, OMP and OPS `main` (read in the code by the U01 A15 reporter h19j, not driven) | `PKPAuthenticateSession::logout()` records `AUTH_LOGOUT_IP_CHANGE` for every logout the parent class triggers, including this password-hash mismatch, where no address changed, so the log would say the address changed. Drive a password change in one browser with a second browser signed in, read what the log records for the second, and say whether the spec states the sign-in log's entries; a 🐞 or ❓ candidate | 2026-10-19 | housekeeping, U01 A15 reporter h19j (`docs/issues/U01-A15-author-sign-in-ends-login-as.md` Cause; `shared/playwright/checks/issues/author-sign-in-ends-login-as/walk.js`) |
