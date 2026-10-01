# After the server refuses one save, the submission wizard hangs on "Saving" and the author cannot submit

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OPS; OJS, OMP latent (code)
  - 3.4: OPS (code); OJS, OMP latent (code)
  - 3.3: none (code; no autosaving wizard)
- **Introduced** `pkp/ui-library#241` for `pkp/pkp-lib#7191` · [467034aa4](https://github.com/pkp/ui-library/commit/467034aa4171bca0c46fa9e0e4b8b8dcdaa7cee2) · 2022-10-31 · Alec Smecher (asmecher), PR author; commit by Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U21 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When the server refuses one of a step's saves, whatever the field, the
wizard shows its "Error" dialog, and about four seconds later the page's
own script fails in the browser. From then on the footer reads "Saving",
nothing more is sent, both "Save for Later" buttons and "Submit" stay
disabled, and "Review" never gets past "Checking your submission".

The author's only way on is to reload the page. The reload drops the
refused change. Anything typed after it is offered back in an "Unsaved
Changes" dialog, and "Yes" saves it. A lost connection or a server
failure is retried and recovers; only a refusal hangs.

Today the server refuses a wizard save in three cases:

- the plain language summary is required and still empty;
- the plain language summary is longer than the section's word limit;
- on a preprint server, "DOI of the published preprint" is typed without
  its web address.

## Impact

- **Lost**: the refused change. The browser keeps each step's form
  whole, so the refused field comes back after the reload only when the
  author changed something else on that same step after the refusal.
  Everything else typed after the refusal is offered back by "Unsaved
  Changes".
- **Who**: the plain language summary cases need a journal, press or
  server that asks for the summary, a setting that exists on `main`
  only and is off by default. The word-limit case needs a section with
  an abstract word limit, which also caps the summary (journals and
  preprint servers). On a preprint server, every author who says the
  preprint is published elsewhere is asked for that DOI, and the box
  does not say it wants a web address.
- **Way round**: reload, as the dialog says, answer "Yes" in "Unsaved
  Changes", and type the refused field again in a shape the server
  accepts: a summary, or the DOI as `https://doi.org/…`.

Medium: the author cannot save or submit until they reload, but the
error dialog tells them to reload, and the reload gets them going again.
It would be high if a refusal were part of every ordinary submission.

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
   (OJS), tick the requirements and privacy boxes, press "Begin
   Submission".
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

1. Sign in as `ccorino`, open "Make a Submission", type the title, tick
   both boxes, press "Begin Submission". The wizard opens on "Details".
2. Press "Continue" until "For Readers".
3. Choose "This preprint has been published elsewhere.", type
   "10.1234/u21ir23" in "DOI of the published preprint", press
   "Continue". The wizard moves on to "Review".
4. Press "OK" in the "Error" dialog and wait 20 seconds.
5. Press "Back", type "https://doi.org/10.1234/u21ir23" in the same box,
   press "Continue".
6. Reload the page.

**Expected**: after the refused "Continue" the wizard keeps working. The
footer goes back to its "Last saved …" line, the correction typed
afterwards is saved, both "Save for Later" buttons stay enabled, and
"Review" finishes its check and lists what is still missing (on `main`,
the title and the file).

**Observed**: step 5's save is refused, the wizard still moves on to
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
"An unexpected error has occurred…" dialog; a 403 differs only in that
the payload stays stored, and only the method's comment speaks of
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

Everything waits on those three flags:

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
leads here.

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
and no reconnect starts. The 0, 500 and 403 paths are unchanged.

The refused text stays in its box as the author typed it. It is not
resent on its own: `addAutosaves()` has already taken that form off its
list of changed forms. The author's next edit to the form sends it
whole, refused field included.

Tried on `main` on OJS, OMP and OPS. With the fix in, the walk above
shows the "Error" dialog and then "Last saved …". No page error is
logged and both "Save for Later" buttons stay enabled. Step 7's save is
answered 200, and "Review" finishes its check and lists the missing
file and title. The offline control behaves the same with the fix in and
out.

**Alternatives**:

- Only the guard in `_runReconnect()`: the crash goes, but the footer
  still reads "Reconnecting" for four seconds after every refusal, for
  no reason.
- Only the wizard change: it fixes the hang, but leaves the mixin able
  to call `_sendAutosave(undefined)`.
- Re-queue the refused form so it is retried: the server refuses it
  again every minute and the dialog reopens each time.

**What goes with it**:

- The dialog still names no field, and after the fix the footer reads
  "Last saved …" with the time of the last accepted save, so the refused
  change can look saved. Showing the 400's field errors on the form
  (the forms already take an `errors` prop) would close that gap. It is
  left out here because it changes what every refusal shows, not only
  the hang.
- No stored data to repair, no REST API or plugin hook change.
- Backport: the two methods are the same on `stable-3_5_0` and
  `stable-3_4_0` (3.4 differs only by a trailing comma), so the diff
  applies there with its context adjusted.
- Guard: a vitest in ui-library: an autosave answered 400 leaves
  `isDisconnected` and `isAutosaving` false and sends no second request.

Small: a few lines in two files of one repo, following the status
handling `autosaveErrored()` already has, plus one unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-save-hangs-saving/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-refused-save-hangs-saving/lib.js),
  run on an install loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/wizard-refused-save-hangs-saving/walk.js`.
  `MODE=neighbour` runs the offline control and `REFUSAL=vordoi` the
  DOI refusal. The 3.5 walk also typed an abstract on "Details" before
  its step 2; that save was accepted and plays no part.
- Tips walked: OJS `main` 4408b94def (pkp-lib f5bd392a69, ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (pkp-lib
  3dc90c81a6, ui-library 280f98c5); OPS `stable-3_5_0` 3f0919468c
  (pkp-lib 1fb843f491, ui-library 7a3c244b). pkp/datasets 27f1204
  (2026-10-01).
- 3.5 and 3.4, OJS and OMP, "latent": they ship the same code, but no
  save their wizard makes is refused. The plain language summary and
  its limit exist on `main` only, and the DOI box is OPS's.
- 3.5 OJS and OMP (code): `stable-3_5_0` OJS 18d097d94e and OMP
  b24879c3d, ui-library 7a3c244b, `autosaveErrored()` and
  `mixins/autosave.js` the same as `main`.
- 3.4 (code): ui-library `origin/stable-3_4_0` ee684b34 has the same
  `autosaveErrored()` and `_runReconnect()`, and
  `lib/pkp/templates/submission/wizard.tpl` (pkp-lib df13621c2d) binds
  the footer and "Save for Later" to the same flags. OPS
  `upstream/stable-3_4_0` acd8ae704b validates `vorDoi` as a URL
  (`schemas/publication.json`) and puts the required "Relation status"
  form in the wizard (`pages/submission/SubmissionHandler.php`). OJS
  9571d8fde7 and OMP 0aec65441 were read for the same handlers.
- 3.3 (code): ui-library `origin/stable-3_3_0` 96959f9e has no
  `src/mixins/autosave.js` and no `SubmissionWizardPage`. OJS
  9fdb9bcf9a, OMP 8e72fc883 and OPS c5532e2161 use the older
  form-by-form wizard, with no autosave.
- Introduced: `git blame` on the `autosaveErrored()` lines and on
  `_runReconnect()` stops at 467034aa4, which created both (later
  commits touched only formatting: 7f13651e9, c7cb4e12b). Its PR is
  `pkp/ui-library#241`, merged 2022-12-14, first in tag 3_4_0-0.
- Unverified: a browser with storage disabled. There
  `_getNextAutosave()` reads only the in-memory queue. Not driven.
