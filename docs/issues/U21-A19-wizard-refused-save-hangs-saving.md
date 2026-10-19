# After the server refuses one save, the submission wizard hangs on "Saving" and the author cannot submit

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OMP, OPS; OJS latent (code)
  - 3.4: OPS (code); OJS, OMP latent (code)
  - 3.3: none (code; no autosaving wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa4](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Alec Smecher (asmecher), PR author; commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U21 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a19), [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#omp4) (the hang after a Chapter Author's refused save); spec U75 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U75-preprint-relations.md#a7) (the hang after the refused DOI)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-19: on a press, every save of a submission made in the
"Chapter Author" role is refused, so that author meets this hang on the
first save, on `main` and 3.5. With a required plain language summary,
"Yes" after the reload can replay a refused form and hang the wizard
again. The cause and the fix are unchanged.

## Summary

When the server refuses one of a step's saves, whatever the field, the
wizard shows its "Error" dialog, and about four seconds later the page's
own script fails in the browser. From then on the footer reads "Saving",
nothing more is sent, both "Save for Later" buttons and "Submit" stay
disabled, and "Review" never gets past "Checking your submission".

The author's only way on is to reload the page. The reload drops the
refused change, and offers what was typed after it in an "Unsaved
Changes" dialog. "Yes" sends it again; when it holds a form the server
still refuses, the wizard hangs again. A lost connection or a server
failure is retried and recovers; only a refusal hangs.

Today the server refuses a wizard save in four cases:

- `main` only: the journal, press or server requires the plain language
  summary, and a form without the summary is saved: "References", a
  field on "For the Editors", on a preprint server "Relation status",
  and "Details" while its summary box is empty;
- `main` only, journals and preprint servers: the summary is longer than
  the section's abstract word limit;
- preprint servers, `main`, 3.5 and 3.4: "DOI of the published preprint"
  is typed without its web address;
- presses, `main` and 3.5: any save of a submission made as "Chapter
  Author".

## Impact

- **Lost**: the refused change. Each stored save holds its step's whole
  form, so the refused field comes back after the reload only when the
  author changed something else on that same step after the refusal.
- **Who**: the required-summary case needs a manager who chose
  "Require" for the summary, and the word-limit case one who turned the
  summary on and gave a section an abstract word limit; the summary is
  off by default. Every author on a preprint server who says the
  preprint is published elsewhere is asked for that DOI, and the box
  does not say it wants a web address. On a press, a
  submitter is made a "Chapter Author" when that is their only author
  role, or when they hold no submitting role after a manager edited the
  "Author" role; every save they make is refused, and they cannot
  finish the submission.
- **Way round**: reload, as the dialog says, then:
  - a summary over the limit, or a bare DOI: correct the field before
    the reload (a shorter summary; the DOI as `https://doi.org/…`) and
    answer "Yes", or answer "No, discard unsaved changes" and type it
    again;
  - a required summary: answer "No, discard unsaved changes" when the
    refused form is offered. "References", the "For the Editors" field
    and "Relation status" stay empty: the server refuses them whatever
    is typed;
  - a Chapter Author: none, since every save is refused.

Medium: the author cannot save or submit until they reload, but the
error dialog tells them to reload, and the reload, with "No" where the
form would be refused again, gets them going. It would be high if a
refusal were part of every ordinary submission. What a Chapter Author
and a required summary still lose after the reload is lost to the
refusal itself, which
[U21 A20's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md)
and
[U21 OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#omp4)
cover; this report's fix ends the hang.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP or OPS `main`.
- As `rvaca` (manager), Settings › Workflow › "Submission" › "Metadata",
  "Plain Language Summary": tick "Enable plain language summary
  metadata", choose "Require the author to provide a plain language
  summary before accepting their submission.", "Save". This is one way
  to get a refused save on all three apps; any refused save will do.
  With this setting the server also refuses the title saved from "Make
  a Submission", without a message. That refusal is
  [U21 A20's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A20-plain-summary-required-refuses-other-saves.md),
  and it is why "Review" lists no title below.

Steps:

1. Sign in as `ccorino` (OJS, OPS) or `aclark` (OMP), an author.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`).
3. Type the title "u21ir23 refused save", choose the section "Articles"
   (OJS), choose "English" (all three apps: the dataset's contexts take
   submissions in English and French), tick the requirements and
   privacy boxes, press "Begin Submission".
4. On "Upload Files" press "Continue".
5. On "Details" type "u21ir23 abstract typed by the author." in
   "Abstract", leave "Plain Language Summary" empty, press "Continue".
6. Press "OK" in the "Error" dialog and wait 20 seconds.
7. Press "Back", type "u21ir23 summary typed after the refusal." in
   "Plain Language Summary", press "Continue".
8. Press "Continue" until "Review".
9. Reload the page.

On 3.5 (walked on OPS), which has no plain language summary, skip the
precondition and refuse the DOI instead:

1. Sign in as `ccorino`, open "Make a Submission", type the title,
   choose "English", tick both boxes, press "Begin Submission". The wizard opens on "Details".
2. Press "Continue" until "For Readers".
3. Choose "This preprint has been published elsewhere.", type
   "10.1234/u21ir23" in "DOI of the published preprint", press
   "Continue". The wizard moves on to "Review".
4. Press "OK" in the "Error" dialog and wait 20 seconds.
5. Press "Back", type "https://doi.org/10.1234/u21ir23" in the same box,
   press "Continue".
6. Reload the page.

A Chapter Author on a press, OMP `main` or 3.5. Instead of the summary
precondition, as `admin`, Administration › "Hosted
Presses", the arrow by "publicknowledge", "Settings wizard", "Users",
search "skumar" (a Proofreader with no author role), the row's arrow,
"Edit User", tick "Chapter Author", "OK". Then:

1. Sign in as `skumar`, open "Make a Submission", type the title
   "u21ir23 refused save", choose "English", tick both boxes, press
   "Begin Submission". The wizard opens on "Upload Files" with no title
   (on 3.5 it opens on "Details"; skip step 2).
2. On "Upload Files" press "Continue".
3. On "Details" type "u21ir23 refused save" in "Title" and "u21ir23
   abstract typed by the author." in "Abstract", press "Continue".
4. Press "OK" in the "Error" dialog and wait 20 seconds.
5. Press "Back", type "u21ir23 abstract typed after the refusal." in
   "Abstract", press "Continue".
6. Press "Continue" until "Review".
7. Reload the page and answer "Yes" in "Unsaved Changes".

**Expected**: after the refused "Continue" the wizard keeps working. The
footer goes back to its "Last saved …" line, the correction typed
afterwards is saved, both "Save for Later" buttons stay enabled, and
"Review" finishes its check and lists what is still missing (on `main`,
the title and the file). For the Chapter Author the change typed after
the refusal is sent (and refused).

**Observed**: in the first group, step 5's save is refused, the wizard still moves on to
"Contributors" and the dialog opens:

```
PUT …/api/v1/submissions/21/publications/22  → 400
{"plainLanguageSummary":{"en":["This field is required."]}}

Error
An unexpected error has occurred. Please reload the page and try again.
```

The footer shows "Reconnecting". About four seconds later it shows
"Saving" for good, at the moment the page's script fails with an
uncaught error:

```
Cannot read properties of undefined (reading 'url')
```

Twenty-five seconds later it still reads "Saving". Both "Save for
Later" buttons are disabled and no request has been sent since the
refusal. Step 7 sends nothing. On "Review", "Checking your submission"
never clears. Title, Abstract and Plain Language Summary all read "None
provided", and "Submit" is disabled.

After the reload, "Unsaved Changes" opens. "Yes" sends the "Details"
form as it stood after step 7, with both the abstract and the summary,
and the server saves it (200). On 3.5 OPS the refusal reads
`{"vorDoi":["This is not a valid URL."]}`, and the rest is the same.

The Chapter Author's step 3 is refused the same way, and from there the
hang is the same, step 5 sending nothing:

```
PUT …/api/v1/submissions/19/publications/19  → 401
{"error":"user.authorization.accessibleWorkflowStage","errorMessage":"You don't currently have access to that stage of the workflow."}
```

In step 7, "Yes" sends the "Details" form as it stood after step 5. It is
refused with the same 401, the "Error" dialog opens again, and four
seconds later the same page error leaves the footer on "Saving" for
good. The same on 3.5.

Control: the same "Continue" made while the browser is offline shows
"Reconnecting". Once the browser is back online the save is retried
after 4 seconds and answered 200, "Last saved 4 seconds ago", and both
"Save for Later" buttons are enabled again.

## Cause

Every failed wizard save goes through the autosave mixin's `onError`
in ui-library `mixins/autosave.js` `_sendAutosave()`. For every status,
`onError` stores the payload in the browser and sets
`this.isDisconnected = true`. It then calls the wizard's
`SubmissionWizardPage.vue` `autosaveErrored()`. That method returns at
once for 0 and 500, which leaves the payload to be retried. For any
other status it calls `ajaxErrorCallback({})`, which shows the generic
"An unexpected error has occurred…" dialog. A 403 gets the same dialog
but keeps the payload stored for a retry; nothing on screen asks the
author to sign in, only the method's comment speaks of
signing in again. For a refusal it removes that form's stored saves,
since sending them again cannot succeed. But it never clears
`isDisconnected`. Its own `this.isDisconnected = true` changes nothing,
because the mixin has already set it. So a refusal leaves the wizard in
the lost-connection state.

`isDisconnected` turning true starts the reconnect loop
(`_runReconnect()`, through the mixin's `isDisconnected` watcher). Four
seconds later the loop calls
`this._sendAutosave(this._getNextAutosave(), …)`. The refused save is
gone and nothing else is waiting, so it passes `undefined`.
`_sendAutosave()` sets `isAutosaveRequestPending = true` and
`this.isAutosaving = true`, then throws on `payload.url`. No request
goes out, so no callback clears those flags or `isDisconnected`.

Everything waits on those three flags (two of them component data,
`isAutosaveRequestPending` a module-level variable):

- `_runAutosaveJobs()` returns early while `isDisconnected` or
  `isAutosaveRequestPending` is set. Later changes are only stored in
  the browser, which is why "Unsaved Changes" offers them after a
  reload.
- The footer shows "Saving" while `isAutosaving` is set, and both "Save
  for Later" buttons are disabled by `isDisconnected`
  (`lib/pkp/templates/submission/wizard.tpl`).
- `canSubmit` needs both flags false, so "Submit" stays disabled.
- `validate()`, the "Review" check, waits for them before it sends
  `_validateOnly`, so "Checking your submission" never clears.
- After a reload, "Yes" in "Unsaved Changes" replays the stored saves.
  If the server refuses one of them again, the same hang follows.

The mixin's only user is the submission wizard (searched
`lib/ui-library/src` and `lib/pkp/js`). Every save the wizard's forms
make goes through it, so any server-side refusal of a wizard field
leads here:

- a 400 from the publication's validation (the summary and DOI cases;
  walked);
- a 401 from the API's authorization (`PKP\middleware\PolicyAuthorizer`
  answers a refused policy with 401 on `main` and 3.5): a Chapter
  Author's saves, refused by `PublicationWritePolicy`'s
  `StageRolePolicy` because the group has no Submission stage (U21
  OMP4; walked on OMP);
- a 403 takes the other branch, which keeps the save and retries it.
  On 3.4 the API answers a refused policy with 403
  (`APIRouter::handleAuthorizationFailure()`), so a 3.4 Chapter Author
  would get the dialog again at each retry rather than this hang
  (code; not walked).

## Proposed fix

Treat a refusal as what it is: the server answered, so the wizard stays
connected. And stop the reconnect loop when it has nothing to send,
instead of sending nothing. Both changes are in ui-library
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-save-hangs-saving/fix.diff)):

```diff
--- a/lib/ui-library/src/mixins/autosave.js
+++ b/lib/ui-library/src/mixins/autosave.js
@@ _runReconnect()
 			setTimeout(() => {
-				this._sendAutosave(this._getNextAutosave(), {
+				const payload = this._getNextAutosave();
+				if (!payload) {
+					// Nothing is waiting to be sent
+					connectionTimerInterval = 4000;
+					this.isDisconnected = false;
+					return;
+				}
+				this._sendAutosave(payload, {
--- a/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
+++ b/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
@@ autosaveErrored()
-			if (xhr.status !== 403) {
-				let autosaves = this.getLocalStorage(this.autosavesKey);
-				if (autosaves.length) {
-					this.setLocalStorage(
-						this.autosavesKey,
-						autosaves.filter((payload) => payload.id !== autosave.id),
-					);
-				}
+			if (xhr.status === 403) {
+				this.isDisconnected = true;
+				this.ajaxErrorCallback({});
+				return;
 			}
-
-			this.isDisconnected = true;
+			// The server refused the save. Sending it again would be refused
+			// again, so drop it and stay connected: the next change is saved.
+			let autosaves = this.getLocalStorage(this.autosavesKey);
+			if (autosaves?.length) {
+				this.setLocalStorage(
+					this.autosavesKey,
+					autosaves.filter((payload) => payload.id !== autosave.id),
+				);
+			}
+			this.isDisconnected = false;
 			this.ajaxErrorCallback({});
```

The mixin's `onError` still sets `isDisconnected` first. The wizard
sets it back to false in the same tick, so the watcher sees no change
and no reconnect starts. The 0, 500 and 403 paths are unchanged, and an
ended session stays on the 403 path: on `main` the global
`ValidateCsrfToken` middleware runs before `PolicyAuthorizer`
(`PKPRoutingProvider::$globalMiddleware`) and answers a stale token
with 403, so its save is kept and retried as today.

The refused text stays in its box as the author typed it. It is not
resent on its own: `addAutosaves()` has already taken that form off its
list of changed forms. The author's next edit to the form sends it
whole, refused field included.

Tried on `main` on OJS, OMP and OPS (2026-10-01). With the fix in, the walk above
shows the "Error" dialog and then "Last saved …". No page error is
logged and both "Save for Later" buttons stay enabled. Step 7's save is
answered 200, and "Review" finishes its check and lists the missing
file and title. The offline control behaves the same with the fix in and
out.

Tried again on OMP `main` (2026-10-19) with the Chapter Author steps. With the fix in,
step 3's 401 shows the "Error" dialog and the footer goes back to "Last
saved …", with no page error. Step 5's change is sent (refused again,
with the dialog again), and "Review" finishes its check, lists what is
missing and keeps "Save for Later" enabled. The offline control again
recovered with the fix in.

**Alternatives**:

- Only the guard in `_runReconnect()`: the crash goes, but the footer
  still reads "Reconnecting" for four seconds after every refusal, for
  no reason.
- Only the wizard change: it fixes the hang, but leaves the mixin able
  to call `_sendAutosave(undefined)`.
- Re-queue the refused form so it is retried: the server refuses it
  again every minute and the dialog reopens each time.

**What goes with it**:

- `autosaveErrored()` drops the refused form's stored saves by form id
  (`payload.id !== autosave.id`), not only the refused one. After an
  outage, when a retried save is refused, a later save of the same form
  queued during the outage goes too, and it may hold the author's
  correction. The method's comment speaks of deleting "the invalid
  autosave payload", so the wider drop looks unintended. The fix keeps
  it as it is; filtering by `payload.timestamp` instead would drop only
  the refused save. Not tried.
- When a refusal ends a reconnect (the outage's retry is refused),
  `connectionTimerInterval` stays doubled: only `success` and the new
  guard reset it. Harmless, since the next outage starts its retries at
  the longer interval, and a reset in the refusal branch would close it.

- The dialog still names no field, and after the fix the footer reads
  "Last saved …" with the time of the last accepted save, so the refused
  change can look saved. Showing the 400's field errors on the form
  (the forms already take an `errors` prop) would close that gap. It is
  left out here because it changes what every refusal shows, not only
  the hang;
  [U75 A7's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U75-A7-wizard-refused-doi-no-field-message.md)
  proposes it, on top of this fix.
- No stored data to repair, no REST API or plugin hook change.
- Backport: the two methods are the same on `stable-3_5_0` and
  `stable-3_4_0` (3.4 differs only by a trailing comma), so the diff
  applies there with its context adjusted.
- Guard: a vitest in ui-library: an autosave answered 400 leaves
  `isDisconnected` and `isAutosaving` false and sends no second request.
  No existing test covers a mixin or `$.ajax`, so it needs stubs for the
  global `$` and `pkp.currentUser`, and it must reset the mixin's two
  module-level variables, `isAutosaveRequestPending` and
  `connectionTimerInterval`, between cases.

Small: a few lines in two files of one repo, following the status
handling `autosaveErrored()` already has, plus one unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-save-hangs-saving/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-save-hangs-saving/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/wizard-refused-save-hangs-saving/walk.js`.
  `MODE=neighbour` runs the offline control, `REFUSAL=vordoi` the DOI
  refusal and `REFUSAL=chapter` (OMP) the Chapter Author steps.
- Walked 2026-10-19 on PostgreSQL: the summary steps on OJS `main`
  6b4323ced7, OMP `main` 5777025bec and OPS `main` f048e747b4 (pkp-lib
  042726ebf6, ui-library 99abe252); the Chapter Author steps on OMP
  `main` and on OMP `stable-3_5_0` 2d575f2506; the DOI steps on OPS
  `stable-3_5_0` e737a9e465 (both 3.5: pkp-lib 092ec34b0f, ui-library
  2576e00a). pkp/datasets eaf024c5 (2026-10-18). The fix was tried
  2026-10-01 on all three apps (the summary steps and the offline
  control) and 2026-10-19 on OMP `main` (the Chapter Author steps and
  the offline control); `fix.diff` applies unchanged to today's tips.
- The required-summary way round (Summary, Impact) is not walked on
  today's tips. It rests on U21 A20's walk of 2026-10-01 (on a preprint
  server, a "Relation status" answer offered by "Unsaved Changes" and
  sent by "Yes" was refused with 400 and hung the wizard again; with
  the summary typed, "References" and a "For the Editors" field were
  still refused) and on the code: `PKP\publication\Repository::validate()`
  requires the summary in every save's body, and "Yes" replays each
  stored save as it was (`restoreStoredAutosave()`), so "References" and
  "For the Editors" are refused again the same way.
- 3.5 OJS "latent": it ships the same code (`stable-3_5_0` OJS
  007c2cd0d6, ui-library 2576e00a, `autosaveErrored()` and
  `_runReconnect()` the same as `main`), but no save its wizard makes is
  refused: the plain language summary exists on `main` only, the DOI
  box is OPS's and "Chapter Author" is OMP's.
- 3.4 (code): ui-library `origin/stable-3_4_0` ee684b34 has the same
  `autosaveErrored()` and `_runReconnect()`, and
  `lib/pkp/templates/submission/wizard.tpl` (pkp-lib a71d6bd2ca) binds
  the footer and "Save for Later" to the same flags. OPS
  `upstream/stable-3_4_0` validates `vorDoi` as a URL
  (`schemas/publication.json`) and puts the required "Relation status"
  form in the wizard (`pages/submission/SubmissionHandler.php`). OMP
  `upstream/stable-3_4_0` e30fa7e38c gives "Chapter Author"
  `stages="4,5"` (`registry/userGroups.xml`), `PKPSubmissionHandler::add()`
  picks a submitter's group by role alone, and `StageRolePolicy`
  refuses an author without the Submission stage, but the refusal
  answers 403 there (`APIRouter::handleAuthorizationFailure()`), which
  `autosaveErrored()` keeps and retries instead of hanging; so OMP stays
  latent on 3.4. Not walked.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e has no
  `src/mixins/autosave.js` and no `SubmissionWizardPage`. OJS
  9fdb9bcf9a, OMP 8e72fc883 and OPS c5532e2161 use the older
  form-by-form wizard, with no autosave.
- Introduced: `git blame` on the `autosaveErrored()` lines and on
  `_runReconnect()` stops at 467034aa4, which created both (later
  commits touched only formatting: 7f13651e9, c7cb4e12b). Its PR is
  `pkp/ui-library#241`, merged 2022-12-14, first in tag `3_4_0rc1`
  (2023-02-20).
- `pkp/pkp-lib#10929` (open) is behind the
  commented-out Submission-stage filter that lets a Chapter Author
  submit; that is U21 OMP4's cause, not this one.
- Unverified: a browser with storage disabled. There
  `_getNextAutosave()` reads only the in-memory queue. Not driven. The
  3.4 Chapter Author retry loop is read in the code only.
