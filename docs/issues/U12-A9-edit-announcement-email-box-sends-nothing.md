# Ticking "Send an email about this to all registered users." when editing an announcement sends nothing

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5866` for `pkp/pkp-lib#5865` · [4ababcd4c2](https://github.com/pkp/pkp-lib/commit/4ababcd4c2b2abedbbee5752c66e0316c04bda49) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03); a comment on `pkp/pkp-lib#7213` (closed, its fix covers adding only) raised the edit case, and no issue followed
- **Tracked in** spec U12 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

"Edit Announcement" offers "Send an email about this to all registered
users." exactly as "Add Announcement" does; ticking it and saving sends
no email and records no notification and no queued job.

A manager who forgot to tick the box when adding an announcement, or who
corrected the announcement and wants its readers told, sees "Save"
succeed and believes the users were emailed. Nobody is, and only
deleting the announcement and adding it again sends it.

## Impact

- **Lost**: the announcement email the manager asked for, to every user
  with a role in the journal who has not turned the announcement email
  off in their profile's Notifications tab; nobody is told it was not
  sent.
- **Who**: a journal, press or server manager who edits an announcement
  and ticks the box; it is offered, unticked, on every edit.
- **Way round**: delete the announcement and add it again with the box
  ticked. The new announcement has a new web address (URL), so links to
  the old one stop leading to it, and its posted date becomes the day it
  is added again.

Medium: a silent loss would sit one level higher, but here only edits
are touched, adding (the ordinary way an announcement is sent) works,
and there is a way round on screen; it would be high if adding failed
too, or if no way round existed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, `publicknowledge`. Its config
  runs queued jobs at the end of web requests (`job_runner = On`), so announcement mail goes out as the next pages load.

Steps:

1. Sign in as `rvaca` (the manager).
2. Settings › Website › Setup › "Announcements": tick "Enable
   announcements", "Save".
3. Side menu "Announcements" › "Add Announcement": Title "u12r5 Call for
   papers", leave "Send an email about this to all registered users."
   unticked, "Save".
4. On the "u12r5 Call for papers" row press "Edit". Change Title to
   "u12r5 Call for papers (deadline 1 June)", tick "Send an email about
   this to all registered users.", "Save".
5. Open the dashboard a few times, then read the mail of the journal's
   users (`dbarnes@mailinator.com`, `rvaca@mailinator.com`, …).
6. Control: "Add Announcement", Title "u12r5 Second call", tick the box,
   "Save"; open the dashboard a few times; read the same mailboxes.

**Expected**: after step 4, every user who gets the announcement email
on an add receives "u12r5 Call for papers (deadline 1 June)", as the box
says.

**Observed**: step 4's "Save" closes the panel and the row shows the
new title. The save's request carries the box:

```
POST /index.php/publicknowledge/api/v1/announcements/1   (X-Http-Method-Override: PUT)
… sendEmail=true …                                         → 200
```

No mail arrives with the subject "u12r5 Call for papers (deadline 1
June)", before or after step 6, and nothing is queued: the edit adds no
job batch and records no notification. Step 6's add, with the same box
ticked, mails 19 users of the journal on OJS (21 on OMP, 6 on OPS),
`dbarnes` and
`rvaca` among them, subject "u12r5 Second call", from "Ramiro Vaca".

## Cause

The form and the API disagree about what an edit does. lib/pkp's
`PKPAnnouncementForm` adds the `sendEmail` field ("Send Email" ›
"Send an email about this to all registered users.") for every use of
the form, and ui-library's `AnnouncementsListPanel::openEditModal()`
opens "Edit Announcement" from a copy of that same form, and the save's
PUT carries `sendEmail=true` when the box is ticked. But lib/pkp
`PKPAnnouncementController::edit()` (api/v1/announcements/PKPAnnouncementController.php,
lines 232–281) reads the parameters, updates the announcement and
returns; it never looks at `sendEmail` and never calls `notifyUsers()`.
`add()` calls `notifyUsers()` on every add in a context, ticked or not
(lines 222–224): the jobs it queues record an in-app "new announcement"
notification for every user with a role in the context who has not
turned it off, and `sendEmail` (read at line 220) decides only whether
the jobs also mail those who have not turned the email off.

It regressed from 3.1–3.2, whose form sent on any save with the box
ticked. `pkp/pkp-lib#2561` made the email optional; its discussion
settled the defaults, "send the announcement" for new announcements and
"don't send the announcement" for editing existing ones (asmecher,
2017-09-21), and its commit
[cf7e8cd955](https://github.com/pkp/pkp-lib/commit/cf7e8cd9552bdeeff251dd81f4549a851c3d8a56)
made the legacy `AnnouncementForm::execute()` notify and email the
users on any save with the box ticked, the box ticked by default on an
add and unticked on an edit. The 3.3 rewrite to the REST API
([4ababcd4c2](https://github.com/pkp/pkp-lib/commit/4ababcd4c2b2abedbbee5752c66e0316c04bda49),
`pkp/pkp-lib#5865`) replaced the grid that called that form with the
list panel and the new endpoints, which kept the box but sent on
neither save; the form class, left with no caller, was deleted in
e741f3bc34. `pkp/pkp-lib#7213`
([5726086916](https://github.com/pkp/pkp-lib/commit/572608691618ed10ae9fda0730b51c43e9cf0d2f))
restored the sending in `add()` alone; asked about ticking the box on an
edit, its reply described that behaviour ("it only works when creating
an announcement") and suggested a new issue about the checkbox, without
choosing between sending and hiding.

Reach:

- The REST API: a `PUT /announcements/{id}` with `sendEmail` is accepted
  and the value discarded (seen in the walk's own requests).
- The site's announcements (Administration › Site Settings ›
  Announcements, on a site with two or more journals) use the same form
  and offer the box on adding and editing, but a site announcement never
  mails anyone: `notifyUsers()` needs a context, by design ("There is no
  way to determine users who have subscribed to site-level
  announcements."). That is a different fault (code; not walked, the
  default dataset has one journal).

## Proposed fix

A proposal: send on an edit when the box is ticked, as the box says and
as the 3.1–3.2 form did. In lib/pkp
`PKPAnnouncementController::edit()`, after the update succeeds, call
the same `notifyUsers()` that `add()` calls, only when `sendEmail` is
ticked
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-announcement-email-box-sends-nothing/fix.diff)):

```diff
         $announcement = Announcement::find($announcement->id);
 
+        // Notify and email the users again only when "Send Email" was ticked on this edit
+        if ($context && filter_var($params['sendEmail'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
+            $this->notifyUsers($request, $context, $announcement->id, true);
+        }
+
         return response()->json(Repo::announcement()->getSchemaMap()->map($announcement), Response::HTTP_OK);
```

`notifyUsers()` is the one place that picks the recipients and honours
each user's Notifications settings, and the email's unsubscribe link
needs the notification it records, so reusing it keeps the edit's mail
identical to the add's. An edit with the box unticked, the default,
still sends nothing and records no notification. A ticked edit reaches
the users a ticked add would reach at that moment: every user with a
role in the journal who has not turned the notification off, and, by
email, those who have not turned the email off.

Decisions for the team before taking it:

- A ticked edit records a second in-app "new announcement" notification
  for every user, and mails again the users who had the add's email.
  `notifyUsers()` could be given a mail-only mode if the second
  notification is unwanted.
- An edit of an expired announcement, ticked, would mail a link that
  lands on the Announcements list: `AnnouncementHandler::view()`
  (lines 67–90) redirects there for an expired announcement. Refusing
  or warning on the box for an expired announcement is a choice.
- Hiding the box on an edit (first alternative) is a real choice, not a
  fallback: `pkp/pkp-lib#7213` restored adding only and left the edit
  undecided.

Tried on OJS, OMP and OPS: with the fix, step 4's edit mailed "u12r5
Call for papers (deadline 1 June)" to the same users step 6's add
reaches (19, 21 and 6) and recorded one notification per user, as an
add does; an edit with the box left unticked mailed nobody, with the fix
and without it.

**Alternatives**:

- Hide the box on "Edit Announcement" (drop the `sendEmail` field in
  ui-library `AnnouncementsListPanel::openEditModal()`), as a comment on
  `pkp/pkp-lib#7213` suggested. It ends the false promise but takes away
  the way the 3.1–3.2 form offered to send a corrected or forgotten
  announcement, leaves
  delete-and-add as the only one, and leaves the REST API silently
  ignoring `sendEmail` on a PUT. It is the right answer only if the team
  decides an edit must never mail.
- Move the sending into an announcement event and a listener, as
  discussed on `pkp/pkp-lib#7213`: a larger refactor for the same
  behaviour.

**What goes with it**:

- The REST API: a PUT carrying `sendEmail=true` now mails, as a POST
  does; no stored data needs repair.
- Backport: 3.5 takes the diff as written (the same
  `PKPAnnouncementController::edit()`). 3.4's
  `PKPAnnouncementHandler::edit()` works on a DataObject, so the call
  passes `$announcement->getId()` (or the handler's `$announcementId`)
  instead of `$announcement->id`, inside the Slim handler; its
  `notifyUsers()` is the same. 3.3's `edit()` has no `notifyUsers()`
  and would copy `add()`'s inline `AnnouncementNotificationManager`
  loop.
- The guard: an e2e check here that edits an announcement with the box
  ticked and reads the mail (a Planned item in U12), and one that an
  unticked edit mails nobody.

Small: four lines in one pkp-lib method, reusing the method the add
already calls, and its test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-announcement-email-box-sends-nothing/walk.js)
  (helpers in `lib.js` beside it), run on an install freshly loaded with
  the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/edit-announcement-email-box-sends-nothing/walk.js`.
  It counts the mail per subject on the mail catcher, and the job
  batches and "new announcement" notifications (type 8) in the
  database before and after each save. `NB=1` runs the neighbour check
  alone (an add with the box ticked, then an edit with it unticked).
- The job queue ran the way the dataset's config runs it, at the end of
  web requests (`job_runner = On`): the walk opens the dashboard until
  the mail count holds. After the edit no job batch was added and
  `jobs` and `failed_jobs` stayed empty, so nothing was queued and
  nothing failed; the add after it added one batch and mailed within two
  page loads.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) on
  PostgreSQL, with pkp/datasets 566bb1f (2026-10-03); the fault does not
  depend on the database. The fix was tried on `main` only.
- Branch heads: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `PKPAnnouncementController.php` and
  `PKPAnnouncementForm.php` are byte-identical in both lib/pkp commits.
  `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and
  OPS 38b61882d3 (lib/pkp cf3f984335); the 3.5 code agrees with the
  walk: `add()` calls `notifyUsers()` at line 223, `edit()` never reads
  `sendEmail`, and the form adds the field at line 98.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 767353f4fe, `stable-3_3_0`
  ac3fa73402; lib/ui-library `stable-3_4_0` ee684b34, `stable-3_3_0`
  96959f9e. Both `PKPAnnouncementHandler::add()` send when `sendEmail`
  is ticked (3.4 through `notifyUsers()`, 3.3 through the inline
  `AnnouncementNotificationManager` loop of `pkp/pkp-lib#7213`); both
  `edit()` ignore it; both `PKPAnnouncementForm` add the `sendEmail`
  field and both `AnnouncementsListPanel::openEditModal()` reuse the
  form. The announcements page is lib/pkp's
  `ManagementHandler::announcements()` in all three apps.
- Introduced: `edit()` has never read `sendEmail`; the endpoint's
  history, across its renames to `PKPAnnouncementController`, starts at
  4ababcd4c2 (PR `pkp/pkp-lib#5866`, merged 2020-06-10). That commit
  added the REST endpoints and the form with the box and deleted the
  grid handlers and `announcementForm.tpl` that drove the legacy
  `AnnouncementForm`; `git grep` at 4ababcd4c2 finds no caller of the
  class, so sending on an edit (and on an add) stopped there. The class
  itself went in e741f3bc34 (PR `pkp/pkp-lib#6034`, 2020-06-23). The
  legacy sending came from cf7e8cd955 (PR `pkp/pkp-lib#2804`, ajnyga,
  2017); the add's restore from PR `pkp/pkp-lib#7547` (rahmanramsi).
- Unverified: whether any REST client relies on a PUT's
  `sendEmail` being ignored.
