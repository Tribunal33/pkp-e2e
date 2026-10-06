# OMP and OPS: saving a discussion or task fails on a missing class

Model: claude-fable-5-1.

Defect. OMP and OPS on pkp `main`; present since pkp-lib `139bde1e65`
(pkp/pkp-lib#12322, 2026-02-10); still present at omp `14be789b5` and ops
`9db7bd3d7e` on 2026-09-10. OJS is unaffected. stable-3_5_0: not driven.
Tracked in `docs/tracking/app-changes.md` row 12. Temporary: delete once
the fix ships.

Found 2026-09-04 by the U05 probes on the 2026-09-02 pkp tips.

## Summary

On a press (OMP) or a preprint server (OPS), saving a new discussion or a
reply on a submission's workflow page answers with an error dialog. The
discussion is stored, but nobody is notified.

## Impact

Every editor, author or reviewer who adds or answers a discussion on OMP
or OPS. The row appears in the discussions list, but the participants get
no task and no email, so a discussion opened this way goes unread until
someone happens to look. There is no workaround short of telling the
participants by other means. Major: the main way people talk to each
other inside a submission fails silently for its recipients.

## Steps to reproduce

Preconditions: a fresh OMP or OPS install with any submission; a Manager
account.

1. Open the submission's workflow page and press "Add discussion".
2. Fill in the subject and the message, choose a participant, and press
   "Save".

Expected: the dialog closes, the discussion appears in the list, and the
participant receives the task and its email.

Observed: a dialog answers

```
Class "APP\notification\Notification" not found
```

The discussion row is stored, no task and no email follow. Replying to an
existing discussion fails the same way. The request is `POST
/api/v1/submissions/{id}/tasks`.

## Cause

`lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php` imports
`APP\notification\Notification` (added by pkp-lib `139bde1e65`, "Re-add
task related notifications") and uses it around lines 1038–1067 to raise
the task notification. Only OJS ships
`classes/notification/Notification.php`; OMP and OPS have
`NotificationManager.php` but no `Notification.php`, so PHP fails on the
first use. Every constant the controller reads there
(`NOTIFICATION_TYPE_ASSIGN_COPYEDITOR`, `…_AWAITING_COPYEDITS`,
`…_ASSIGN_PRODUCTIONUSER`, `…_AWAITING_REPRESENTATIONS`, `…_NEW_QUERY`,
`NOTIFICATION_LEVEL_TASK`) is defined on `PKP\notification\Notification`,
so the app-level class adds nothing the controller needs.

## Proposed fix

A proposal; the team decides.

1. pkp-lib: change the import to `use PKP\notification\Notification;` in
   `EditorialTaskController.php`. One line; OJS keeps working because its
   subclass only adds OJS-specific constants. Worth a grep for other
   `APP\notification\Notification` imports in lib/pkp that OMP and OPS
   code paths can reach.
2. Or add an empty `APP\notification\Notification extends
   PKP\notification\Notification` to OMP and OPS, as OJS has.

The e2e fleets and CI carry option 2 as a mounted overlay
(`apps/omp/php/classes/notification/Notification.php`,
`apps/ops/php/classes/notification/Notification.php`) until upstream
picks one; the overlay is removed then.

## Evidence

- Found by the U05 probes on 2026-09-04; re-checked on fetched tips on
  2026-09-10 (omp `14be789b5`, ops `9db7bd3d7e` still ship no
  `classes/notification/Notification.php`).
- Unverified: stable-3_5_0.
