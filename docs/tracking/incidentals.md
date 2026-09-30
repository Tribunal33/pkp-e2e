# Incidentals

What a session saw in passing on another feature's screens; the spec
author reads their feature's rows at RUNBOOK step 3 and the row is deleted
when the spec absorbs it.

| Feature | Screen | Seen | Date | Evidence |
|---|---|---|---|---|
| U27 Reviewer assignment & management | A submission's Review stage, OJS, an editor sending "Add Reviewer" windows one after another (a "Selected Reviewer" window closed after typing into its message, then another opened and sent), CPU throttled ×6 | Once in ~120 runs: an uncaught page error "Cannot read properties of undefined (reading 'serialize')" right after a "Selected Reviewer" press; the screen showed nothing and the add went through. Undetermined (one run); the error's stack would settle it. | 2026-09-30 | U31 flake diagnosis block T-ojs-1 (`.reports/flake-0930/u31s2s4/diagnosis.md`, runs `r1-cpu6.log`, slot s1) |
| U07 Journal identity & About pages | "Editorial Masthead", OJS and OMP, signed out, a member whose only role runs 2020-01-01 to 2030-12-31 (given by a Users XML import on a scratch context) | The member is listed with the period "2020 –", no end year, though the role ends 2030-12-31; U07 shows the open-ended "2026 –" shape only for a role with no end date. | 2026-09-30 | U53 claim check I30 (`shared/playwright/checks/U53/I30/i30.js`; `.reports/U53/ccI30u53/` in slot s1) |
| U63 Import & export | Tools › "Users XML Plugin" › "Export Users" grid, OJS and OMP, a Journal/Press Manager, scratch context with users holding dated roles | The grid leaves out every user whose only role starts in the future (an invitation's later START DATE or a Users XML import), while users with current or ended roles are listed. | 2026-09-30 | U53 claim check I30 (`shared/playwright/checks/U53/I30/i30.js`, snapshot `i30-03-export-grid`; `.reports/U53/ccI30u53/` in slot s1) |
| U06 User invitations | A user's roles page (Users & Roles › "Users" row › Edit), OJS and OMP, a Journal/Press Manager, a member whose current role ends on a future date (given by a Users XML import on a scratch context) | The current role's row shows "User Removed From Role" where "Remove Role" should be, as if already ended; Rule 13 ties that label to a role ended today. | 2026-09-30 | U53 claim check I30 block I30-4 (`shared/playwright/checks/U53/I30/i30.js`; `.reports/U53/ccI30u53/` in slot s1); U53 A20 |
