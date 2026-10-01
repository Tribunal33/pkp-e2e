# On a preprint server, "Notification sent to users." shows in a box in the Production stage instead of at the top right

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#467` for `pkp/pkp-lib#10701` · [d61faa2b2e](https://github.com/pkp/ui-library/commit/d61faa2b2eb6c1fd712da91e5728778d718c9223) · 2024-12-16 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#ops4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, an editor who sends a participant a message with
"Notify" gets the confirmation "Notification sent to users." in a box
headed "Notification" at the top of the workflow's main column, above
"Production Tasks & Discussions". The editor expects it as a notice at
the top right of the page. A journal and a press show it there, and so
does the preprint server for "Assign" and "Edit".

The message is sent. The box sits in a place that is otherwise empty on
a preprint server, so it covers nothing, and it goes away with the
editor's next action on the page or when the page is loaded again.

Every "Notify" on a preprint server does this. The fix is one condition
in the component that draws the box.

## Impact

- **Lost** Nothing. An editor who looks for the notice at the top right
  can miss the confirmation.
- **Who** Every manager and moderator of a preprint server who presses
  "Notify" on a participant's row.
- **Way round** None needed.

Low: the confirmation is shown, in the wrong place.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS (the preprint server
  `publicknowledge`).

Steps 5 and 6 alone show the fault, on any participant's row. Steps 3
and 4 are the contrast: two confirmations of the same panel that show
where they should. Steps 7 and 8 show when the box goes away.

1. Sign in as `dbarnes`.
2. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
   It opens on "Production".
3. Under "Participants" press "Assign". Choose the role "Moderator",
   press "Search", choose "Minoti Inoue" and press "OK".
4. On Minoti Inoue's row open "More Actions" and choose "Edit". Tick
   "This participant will only be allowed to recommend an editorial
   decision and will require an authorized editor to record editorial
   decisions." and press "OK".
5. On Minoti Inoue's row open "More Actions" and choose "Notify". Choose
   "Discussion (Production)" under "Choose a predefined message to use,
   or fill out the form below." (without a predefined message "Notify"
   sends nothing). Replace the text it puts in "Message" with a few
   words of your own and press "Notify".
6. Repeat step 5 twice, to see that it happens on every press and that
   the boxes do not pile up.
7. Repeat step 4, unticking the box.
8. Repeat step 5 once, then reload the page.

**Expected** After each of steps 3 to 8 the confirmation shows as a
notice at the top right of the page, and the main column gains no box.

**Observed** Steps 3, 4 and 7 show "User added as a stage participant."
and "The stage assignment has been changed." at the top right. After
each press of "Notify" (steps 5, 6 and 8) nothing shows at the top
right, and the main column shows one box, above "Production Tasks &
Discussions":

```
Notification
Notification sent to users.
```

The box of step 6 is gone after step 7's "OK", and the box of step 8 is
gone after the reload. Before step 5 that place is empty.

Each press of "Notify" is followed by two requests for the user's
pending notices. The first is sent by the box's component, the second
by the page's own script, which shows notices at the top right:

```
the box:   POST /index.php/publicknowledge/en/notification/fetchNotification   (no requestOptions)  → "Notification sent to users."
the page:  GET  /index.php/publicknowledge/en/notification/fetchNotification                        → no notices
```

Control: the same steps on a journal (submission 5, "Genetic
transformation of forest trees") and a press (submission 4, "How
Canadians Communicate: Contexts of Canadian Popular Culture"), with the
role "Section editor" or "Series editor", show every confirmation at
the top right. The Production stage's box there keeps its own text
("Awaiting Galleys.", a press's "Awaiting approval.").

## Cause

`pages/workflow/components/primary/WorkflowNotificationDisplay.vue`
(ui-library) is the box at the top of a stage's main column. It shows
the stage's own notices, which it asks for from
`notification/fetchNotification` with the `requestOptions` that
`getRequestOptionsPerStage()` builds. For a preprint server that method
returns `null`, in every stage: OPS has no stage notices.

On mount the component honours that: its `watch` on `requestBody` only
fetches `if (requestBodyNew)`. Its data-change callback does not:

```js
/** Reload notifications when data on screen changes */
useDataChanged(() => fetch());
```

So on a preprint server every data change on the workflow page posts
to `notification/fetchNotification` with no body. With no
`requestOptions`, `NotificationHandler::fetchNotification()` (pkp-lib)
takes its "No options, get only TRIVIAL notifications" branch: it
returns every pending confirmation of the signed-in user and deletes
them. The component renders whatever `content.general` holds, so the
confirmation becomes a box.

The page shows confirmations at the top right through a request of its
own: `SiteHandler.fetchNotificationHandler_()`, a synchronous GET to
the same address on the `notifyUser` event. Whichever of the two
requests is sent first gets the confirmation, and the other finds
nothing. Which one is first is fixed per action:

- "Assign" and "Edit": the save answers with a `dataChanged` event, on
  which `AjaxModalWrapper.vue::passToHandlerElement()` triggers
  `notifyUser`. The page's request completes before the window closes.
  The confirmation is at the top right.
- "Notify": `StageParticipantGridHandler::sendNotification()` answers
  with the global event `stageStatusUpdated` and no `dataChanged`.
  `AjaxFormHandler.handleResponse()` triggers `formSubmitted` first and
  `notifyUser` after it. On `formSubmitted` the window closes, the close
  runs the data-change callbacks (below), and the component's request
  goes out before the page's. The confirmation is in the box.

What runs the callbacks when the "Notify" window closes, on both
branches: `passToHandlerElement()` calls `closeModal()` on
`formSubmitted`; `modalStore.js::closeSideModalById()` calls the
window's `onClose`; `useLegacyGridUrl.js::openLegacyModal()` set that to
the caller's `finishedCallback`, which `participantManagerStore.js`
passes as its `triggerDataChange`
(`useDataChangedProvider.js`), and that calls every registered
callback, the component's included. The branches differ in one check:

- `main`: `triggerDataChange(closeData)` runs the callbacks only when
  the window was marked as changed, which `passToHandlerElement()` does
  with `markDataChanged()` on `formSubmitted`.
- `stable-3_5_0`: there is no `markDataChanged`, and
  `triggerDataChange()` runs the callbacks on every close.

The box goes away because the component keeps only its last answer: the
next data change fetches again and gets nothing, and after a reload it
does not fetch.

A journal and a press do not show the fault, although their callback
runs too. Their Copyediting and Production stages post `requestOptions`,
and `_getNotificationsByOptions()` filters by the context's id, while
`createTrivialNotification()` stores confirmations with no context, so
the component never receives one. Their other stages do not render the
component.

3.4 showed the confirmation at the top right, by its code. Its
Production tab holds the earlier in-place notification widget, which
posts the options of OPS's
`WorkflowTabHandler::getProductionNotificationOptions()`, and
`NotificationDAO::getByUserId()` filters those by the context's id, as
above. The fault came with the 3.5 workflow page and was released in
3.5.

Reach:

- "Notify" on a preprint server: seen on screen, `main` and 3.5.
- Other actions on a preprint server's workflow page can put their
  confirmation in the box the same way, when they run the data-change
  callbacks before `notifyUser`. This follows from the code; no such
  action was looked for on screen.
- A press takes the component from the journal's editorial config
  (`useWorkflowConfigOMP.js` merges `workflowConfigEditorialOJS.js`
  into its own), and `workflowConfigAuthorOMP.js` renders it for an
  author in a press's Production stage. Both send options, so neither
  shows the fault: read in the code, and the editorial side also seen
  on screen.

## Proposed fix

Give the data-change callback the condition the mount-time `watch`
already has, so a stage without notices of its own never asks.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-notice-lands-in-stage-box/fix.diff)
(its paths start at an app's root, `lib/ui-library/src/…`; in a
ui-library checkout apply it with `patch -p3`):

```diff
-/** Reload notifications when data on screen changes */
-useDataChanged(() => fetch());
+/** Reload notifications when data on screen changes, for a stage that has notifications of its own */
+useDataChanged(() => {
+	if (requestBody.value) {
+		return fetch();
+	}
+});
```

It keeps what the introducing change was for: a journal's and a press's
box still reloads after each change.

Tried on `main` on the three apps. On OPS every confirmation of the
steps shows at the top right, no box appears and the component sends no
request. On OJS and OMP the box shows and refreshes its own text as
before ("Assign a user to create galleys using the Assign link in the
Participants list." turning into "Awaiting Galleys." after "Notify"),
and the confirmations stay at the top right.

Tried on `stable-3_5_0` on OPS as well, because the callbacks run by a
different check there: the same result, with the diff applied as
written.

**Alternatives**

- Drop the component from `workflowConfigEditorialOPS.js`, since OPS
  has no stage notices. On its own it turns the symptom off and leaves
  the unguarded callback for the next stage or app without options. It
  can go in beside the recommended fix, which leaves the component on
  OPS with nothing to do; keeping it costs nothing and serves a future
  OPS stage notice. The team's call.
- Make `fetchNotification()` return nothing when no options are sent.
  Not this: the page's own request relies on that branch.

**What goes with it**

- Backport to `stable-3_5_0`: the same diff.
- Test: an e2e scenario on a preprint server, "Notify" showing its
  confirmation at the top right and no box in the main column.

Small: one condition in one component, with an e2e scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js)
  takes the steps on OPS and the control on OJS and OMP. After each
  action it reads the top right, the stage's box and the page's own
  `fetchNotification` requests (who sent each, in which order, the
  notices each answer carried). It runs in pkp-e2e's harness:
  `PROBE_FEATURE=issues-r16 PROBE_AGENT=r16 node bin/probe.js all shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r16-3_5`
  in front for 3.5.
- The fix was tried with `node bin/try-fix.js apply … ojs omp ops`
  (which rebuilds the JavaScript), `walk.js`, then `revert`; on
  `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, on OPS
  only. On `main` the fix was tried with steps 1 to 6; steps 7 and 8
  were added afterwards and ran with the fix on 3.5 only. The check
  that the fix leaves a journal and a press alone is the walk's OJS and
  OMP part, compared with the fix in and out, on `main`.
- Seen on screen on `main` and on `stable-3_5_0`, each app on PKP's
  default dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL, as
  `dbarnes` only.
- Tips, `main`: OJS 4408b94def (lib/pkp f5bd392a69, lib/ui-library
  64d6736318), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c570). `stable-3_5_0`: OJS 4fca1027f4, OMP
  c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491, lib/ui-library
  d4e0188353). `stable-3_4_0`: OPS acd8ae704b (lib/pkp df13621c2d,
  lib/ui-library ee684b341b). `stable-3_3_0`: OPS c5532e2161 (lib/pkp
  d446601ebe, lib/ui-library 96959f9ed4).
- 3.4, code, not driven: ui-library has no `src/pages/workflow`. OPS's
  `templates/controllers/tab/workflow/production.tpl` includes
  `controllers/notification/inPlaceNotification.tpl` with
  `$productionNotificationRequestOptions`;
  `NotificationHandler::_getNotificationsByOptions()` passes the
  context's id to `NotificationDAO::getByUserId()`, and
  `createTrivialNotification()` stores `CONTEXT_ID_NONE`. That 3.4
  showed the confirmation at the top right rests on this read alone.
- 3.3, code, not driven: no `src/pages/workflow` in ui-library, and
  OPS has `templates/controllers/tab/workflow/production.tpl` there
  too; its content, the handler and the DAO were not read on 3.3.
- Introduced: `git blame` on the `useDataChanged(() => fetch())` line
  names d61faa2b2e ("pkp/pkp-lib#10701 Bug fix, incorrect upload process
  used for copyediting files + notification refresh on data reload"),
  which added the line; GitHub lists the commit under
  `pkp/ui-library#467`. The component and its `null` for OPS date from
  14c7d5343 (2024-11-28), when it fetched on mount and on a stage
  change only.
- Upstream search, 2026-10-01, pkp/pkp-lib, pkp/ui-library and pkp/ops,
  issues and PRs: "WorkflowNotificationDisplay", "fetchNotification",
  "trivial notification workflow", "notification sent to users notify
  OPS". `pkp/pkp-lib#13188` (closing a toast closes the open panel) is
  another fault.
- Unverified: on the test installs the request sent first got the
  confirmation every time. On a server that answers the two requests
  in parallel, either could read it first, or both; not driven.
