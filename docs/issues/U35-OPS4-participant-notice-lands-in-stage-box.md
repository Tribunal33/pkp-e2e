# On a preprint server, "Notify" on a participant shows its confirmation in the Production stage, not at the top right

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS (in every 3.5.0 release)
  - 3.4: none (code; no Vue workflow page)
  - 3.3: none (code; no Vue workflow page)
- **Introduced** `pkp/ui-library#467` for `pkp/pkp-lib#10701` · [d61faa2b2e](https://github.com/pkp/ui-library/commit/d61faa2b2eb6c1fd712da91e5728778d718c9223) · 2024-12-16 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, an editor sends a message to a participant with
"Notify" in the Participants panel of a submission's Production stage.
The window closes and the message is sent, but "Notification sent to
users." does not show at the top right of the page, where a journal or
press shows it. It shows instead in a box headed "Notification" at the
top of the Production stage, above "Production Tasks & Discussions",
and stays there until the page is reloaded or another change on the
page (a participant added, for example) refreshes it.

Nothing is lost: the message reaches the participant and opens a
discussion. The confirmation is only in an unexpected place, where it
reads like a standing notice about the preprint. On a preprint server
that box shows nothing else, so no notice of the stage's own is hidden
or pushed out.

"Assign" and "Edit" in the same panel still show their notices at the
top right.

## Impact

- **Who:** every editor (Preprint Server manager, Moderator) who uses
  "Notify" on a preprint's Production stage; every time on the server
  the steps were walked on (see Preconditions).
- **Way round:** none needed; the box goes away on the next reload.

Low: a confirmation in the wrong place, while the message is sent.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OPS.
- Served by a server that answers one request at a time, such as PHP's
  built-in server (`php -S`), as the walk was. There it showed every
  time. On a server that answers requests in parallel (Apache or nginx
  with PHP-FPM) two requests race (Cause), and the notice may reach the
  top right some of the time; that was not checked.

1. Sign in as `dbarnes`.
2. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production", at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`.
   The workflow opens on "Production".
3. In "Participants", open Carlo Corino's "More Actions" menu and choose
   "Notify".
4. Under "Choose a predefined message…", choose the first message, and
   keep its text in "Message".
5. Click "Notify".
6. Look at the top right of the page and at the top of the Production
   stage's main column.

**Expected:** the window closes and a notice at the top right of the
page reads "Notification sent to users.".

**Observed:** the window closes, nothing shows at the top right, and a
box appears at the top of the Production stage, above "Production Tasks
& Discussions":

```
Notification
Notification sent to users.
```

It did so on each of ten tries in a row (steps 3 to 6 repeated). The
browser makes two requests for the user's pending notices after
"Notify", one for the notices at the top right and one for the
Production stage's box, and the box's request is the one that gets the
notice:

```
POST /index.php/publicknowledge/en/notification/fetchNotification   (no form data)
  → 200, "Notification sent to users."
GET  /index.php/publicknowledge/en/notification/fetchNotification
  → 200, empty
```

Control: on the same preprint, "Assign" (role "Moderator", Minoti
Inoue, "OK") and then "Edit" on her row (the "Permissions" box flipped,
"OK", five times) each show their notice at the top right ("User added
as a stage participant.", "The stage assignment has been changed.").
"Notify" in a journal's Copyediting and Production stages (OJS
submissions 3 and 5), which have such a box, and in a press's
Production stage (OMP submission 4), which has none, shows
"Notification sent to users." at the top right, ten times out of ten
each.

## Cause

ui-library's `src/pages/workflow/components/primary/WorkflowNotificationDisplay.vue`
is the "Notification" box at the top of a stage. It asks
`notification/fetchNotification` for the stage's own notices with
request options chosen per stage (`getRequestOptionsPerStage()`): a
journal's Copyediting and Production name their notice types, and so
does a press's Production, where only the author's view mounts the box
(`workflowConfigAuthorOMP.js`; an editor's press workflow has none). A
preprint server's Production gets `null`: the box has nothing of its
own to show there. The watcher that loads the box on mount respects
that: `if (requestBodyNew) fetch();`. The reload on a data change does
not:

```js
/** Reload notifications when data on screen changes */
useDataChanged(() => fetch());
```

So on a preprint's Production stage every data change posts to
`fetchNotification` without options. `NotificationHandler::fetchNotification()`
(pkp-lib) reads a request without options as the page's own call: it
returns all of the user's trivial notices (the top-right ones) and
deletes them. Whichever of the two requests the server answers first
takes the notice.

The notice itself is made by `PKPStageParticipantNotifyForm::execute()`
(`createTrivialNotification()` with `stageParticipants.history.messageSent`,
"Notification sent to users."), which
`StageParticipantGridHandler::sendNotification()` runs before it answers
with the global `stageStatusUpdated` event, not a data-changed one.

In the browser, the "Notify", "Assign" and "Edit" forms are all bound to
`StageParticipantNotifyHandler`, a subclass of `AjaxFormHandler`; its
`handleResponse()` reloads the discussions grid and calls the parent's.
The parent first handles the server's events, then raises
`formSubmitted`, and last raises `notifyUser`, on which `SiteHandler`
fetches the top-right notices with a synchronous request. On
`formSubmitted`, `AjaxModalWrapper.vue` closes the window, and closing
it runs the workflow page's data-change callbacks, the box's among them:

- on `main`, because `AjaxModalWrapper.vue` marks the window changed on
  `formSubmitted` and `modalStore.closeSideModalById()` reloads a
  changed window's page (ui-library 1afd40a9, 2026-09-24,
  `pkp/ui-library#853`, "a successful submit is a change even when the
  form sends no dataChanged event");
- on `stable-3_5_0`, because `closeSideModalById()` calls the window's
  `onClose` on every close.

So after "Notify" the box's request is dispatched during the close,
before `notifyUser`. That it also reaches the server first rests on the
recorded requests: in all twenty walks (`main` and 3.5) both were sent
within the same millisecond after the "Notify" answer, and the box's
carried the notice. After "Assign" and "Edit", `saveParticipant()`
answers with a data-changed event, on which `AjaxModalWrapper.vue`
raises `notifyUser` before the window closes, so the top-right request
is made first and gets the notice.

The line came with [d61faa2b2e](https://github.com/pkp/ui-library/commit/d61faa2b2eb6c1fd712da91e5728778d718c9223)
(`pkp/pkp-lib#10701`, "notification refresh on data reload"). Its aim
was that a journal's Copyediting box updates when, for example, a
copyeditor is assigned. Before it, the box on a preprint's Production
stage never fetched at all.

Reach:
- "Notify" on a preprint's Production stage: walked, every time on a
  server answering one request at a time; on one answering in parallel
  it may vary (not checked).
- "Assign" and "Edit" there: walked, not affected (order above).
  "Remove" raises no notice (`deleteParticipant()`).
- Any other action on a preprint's Production stage whose notice is
  still pending when the box reloads loses it to the box in the same way
  (code); "Notify" is the one found on screen.
- Journals: walked, not affected. Their boxes post options, including
  `NOTIFICATION_LEVEL_TRIVIAL: 0`, which asks for the user's trivial
  notices in this context. They take none only because
  `createTrivialNotification()` stores trivial notices without a context
  (`contextId` null), so `withContextId()` skips them (code). A press's
  author-view box posts the same options (code).
- An editor's press workflow has no such box (walked: top right).

## Proposed fix

Make the data-change reload follow the same rule as the mount: a stage
without request options does not fetch. The rule lives in the
component, so every stage configuration that mounts it is covered. This
is a proposal; the team decides.

```diff
-/** Reload notifications when data on screen changes */
-useDataChanged(() => fetch());
+/**
+ * Reload notifications when data on screen changes.
+ * A stage without request options shows nothing, so it never fetches:
+ * a fetch without options takes the user's pending notices away from the page.
+ */
+useDataChanged(() => {
+	if (requestBody.value) {
+		fetch();
+	}
+});
```

As a file:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-notice-lands-in-stage-box/fix.diff).
It keeps what d61faa2b2e was for: a stage with options still reloads its
box after every change. Tried on `main` (OJS, OMP and OPS built with it):
"Notify" on the preprint showed "Notification sent to users." at the top
right three times out of three, with no request from the box. As a
neighbour check, a journal's Copyediting box still posted its own
request after "Notify" and after "Assign" of a copyeditor, as it does
without the fix.

**Alternatives:**
- Remove `WorkflowNotificationDisplay` from OPS's Production in
  `workflowConfigEditorialOPS.js`, since it has nothing to show there.
  This fixes OPS, but leaves the same trap for any later stage mounted
  without options. It can go with the guard as a clean-up.
- Give OPS's Production its own options, `NOTIFICATION_LEVEL_TRIVIAL: 0`
  as the other apps have. It works only because trivial notices are
  stored without a context, and it makes a request that can never show
  anything.
- Make `fetchNotification()` without options stop deleting what it
  returns. That changes what the legacy `SiteHandler` relies on.

**What goes with it:**
- No stored data to repair; nothing an API client or plugin uses
  changes.
- The diff applies as it stands to `stable-3_5_0`, whose file is the
  same.
- The journal and press boxes ask for trivial notices they never get
  (`NOTIFICATION_LEVEL_TRIVIAL: 0`). If trivial notices were ever stored
  with a context, those boxes would take them from the top right in the
  same way. Dropping that level from their options closes that off; it
  is not needed for this fix.
- Guard: a ui-library unit test that a data change on a stage without
  options sends no request, or an e2e check that "Notify" on a preprint
  shows its notice at the top right.

Small: one guard in one component, the check its own watcher already
makes.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js),
  on an install freshly reset to the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes the Steps ten
  times on OPS submission 1 and adds "Assign" and five "Edit"s there,
  ten "Notify"s on OJS submissions 3 and 5 and on OMP submission 4, and
  the neighbour "Assign" of Sarah Vogt as Copyeditor (with "Permissions")
  on OJS submission 3. For each click of "Notify", "OK" or "Assign" it
  records where the notice showed and every request to
  `fetchNotification` with its form fields, timing and the notice it
  carried. No server error and no script error in any run. Each
  "Notify" click added one discussion to the submission (read in the
  database after the 3.5 walk: ten new discussions).
- `main` and 3.5 walked on OJS, OMP and OPS, each on PHP's built-in
  server: OPS "Notify" 10 of 10 in the box, "Assign" 1 of 1 and "Edit"
  5 of 5 at the top right; OJS (two submissions) and OMP "Notify" 10 of
  10 each at the top right.
- The fix walked on `main` with `TRIES=3 EDITS=2` (three "Notify"s and
  two "Edit"s per case), OJS, OMP and OPS: every notice at the top
  right; on OJS the box's own request (with its options) still sent after
  each change.
- Code read, `main`: the files and methods the Cause names, plus
  `useDataChangedProvider.js`, `useLegacyGridUrl.js` and
  `managers/ParticipantManager/participantManagerStore.js` (how
  `triggerDataChange` reaches the box) in ui-library.
- Code read, 3.5: the same component, byte for byte, and the same
  `fetchNotification()`; `modalStore.closeSideModalById()` calls
  `onClose` on every close. d61faa2b2e is in the ui-library of OPS
  3_5_0-0 and every later 3.5 tag.
- Code read, 3.4 and 3.3 (`upstream/stable-3_4_0`, `upstream/stable-3_3_0`
  in the OPS checkout, `origin/stable-3_4_0`, `origin/stable-3_3_0` in its
  `lib/pkp` and `lib/ui-library`): no `WorkflowNotificationDisplay.vue`.
  Production is the legacy tab
  (`templates/controllers/tab/workflow/production.tpl`), whose in-place
  notice area posts the options of OPS's
  `WorkflowTabHandler::getProductionNotificationOptions()`; not this
  code.
- Introduced: `git blame` on the `useDataChanged(() => fetch())` line
  gives d61faa2b2e, which added it; the GitHub API's `commits/<sha>/pulls`
  gives `pkp/ui-library#467` (merged 2024-12-16), which also carries the
  fix for `pkp/pkp-lib#10700`. The component (14c7d5343, for
  `pkp/pkp-lib#10618`) and OPS's Production config that mounts it
  (e88d2d20d) are older.
- Upstream: pkp/pkp-lib, pkp/ops and pkp/ui-library issues and PRs
  searched by the symptom's words and by `WorkflowNotificationDisplay`
  and `fetchNotification`. `pkp/pkp-lib#10701` (open) is the introducing
  change's own issue, about the Copyediting box not updating, not this
  fault.
- Branch tips: `main`: OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
  280f98c5), OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794 (pkp-lib
  3dc90c81a6), all on ui-library 280f98c5. `stable-3_5_0`: OPS cf4fce69bd,
  OJS 92b9a16b48, OMP 3081c9b00 (pkp-lib a9c76aed62, ui-library
  1a7a4750). `stable-3_4_0`: OPS acd8ae704b; `stable-3_3_0`: OPS
  c5532e2161. Default dataset of pkp/datasets 38ab955 (2026-09-30), on
  PostgreSQL.
- Not driven: 3.4 and 3.3 (code only, as asked); MySQL not checked (the
  fault is in the order of the browser's requests, not in the database).
- Unverified: whether a server that answers requests in parallel shows
  the box every time. That the box's request leaves the browser before
  the top-right one rests on the recorded requests, not on a read of
  `ofetch` (ui-library's dependencies are not in the checkout). Earlier
  test runs recorded for the spec saw the box once and the top right in
  the other scenarios.
