# Incidentals

What a session saw in passing on another feature's screens; the spec
author reads their feature's rows at RUNBOOK step 3 and the row is deleted
when the spec absorbs it.

| Feature | Screen | Seen | Date | Evidence |
|---|---|---|---|---|
| U01 Login & sessions (what a back-office page shows once its session has ended elsewhere) | Settings › Website › "Plugins", the list's "Search", in a browser whose account changed its password (or email) in another browser, OJS `main` (and 3.5; seen by the U03 claim check J15) | The first "Search" leaves a spinner and an unchanged list with no message; each later "Search" raises the alert "The current role does not have access to this operation.", which does not say the session has ended or lead to the Login page. By the checker's reading this is what any older-style list or form request on a manager page meets after the session ended elsewhere (signed out, deleted), not only after a profile change: drive it after a plain sign-out in the other browser on OJS, OMP and OPS, and say whether the spec states it (a 🐞 or ❓ candidate) | 2026-10-15 | housekeeping, U03 claim check J15 (`.reports/U03/cc-J15.md` J15-3 and "For other specs"; `shared/playwright/checks/U03/J15/j15.js`) |
