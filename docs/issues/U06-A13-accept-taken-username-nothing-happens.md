# A newcomer whose chosen username was taken meanwhile presses "Accept And Continue" and nothing happens

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no role invitations)
  - 3.3: none (code; no role invitations)
- **Introduced** `pkp/ui-library#358` · [6940ab2b96](https://github.com/pkp/ui-library/commit/6940ab2b96774c406178b25c94961091d86d506d) · 2024-06-27 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U06 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a13)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A person invited to a role who has no account yet chooses a free
username on "Create OJS account" and walks on to "Review & create
account". If someone else takes the same username before they accept,
pressing "Accept And Continue to OJS" changes nothing on the page: no
message, no error under any field, no dialog, and the button stays.

When the name is already taken as they press "Save and continue" on
"Create OJS account", that step tells them so under the Username box;
the last step does not. The review step offers no Edit for the
username, and "Back" twice reaches "Create OJS account" with the taken
name in the box and no error under it. Another username typed there
goes through, and the role is granted.

The name is checked only when "Save and continue" is pressed on "Create
OJS account" and again at the accept, so a clash needs another person
to register or accept with the same username while the newcomer is on
"Enter details" and the review, usually minutes, longer when the page
is left open.

## Impact

- **Lost**: no account is made and no role granted, and nobody is told;
  the inviter sees the invitation still pending. Nothing is lost for
  good.
- **Who**: a newcomer accepting a role invitation, only when someone
  else takes the same username in that time. The app suggests
  no usernames, so a clash needs two people to pick the same name by
  chance.
- **Way round**: "Back" twice and another username, which nothing on
  the page points to. Opening the email's link again also works: the
  page starts at "Create OJS account" with the taken name in the box, and
  once the password and the privacy consent are entered again, "Save and
  continue" shows the message under Username. The link works until the
  invitation expires, 3 days after it was sent by default (`[invitations]
  expiration_days` in `config.inc.php`).

Low: the clash is rare, nothing is lost, and reopening the link shows
the message; the silent last step would make it medium if clashes were
common.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same: the offered role
  there is "Copyeditor" on OMP and "Moderator" on OPS, and the pages name
  OMP or OPS).

Sending two invitations:

1. Sign in as `rvaca` and open Settings › "Users & Roles".
2. Press "Invite to a role", type `ben.h15j@mailinator.com` and press
   "Search User". On "Enter details" type Given Name `Ben` and Family
   Name `Lark`; in the role row choose "Copyeditor", today as Start Date
   and "Appear on the masthead"; press "Save And Continue", then "Invite
   user to the role".
3. The same for `ada.h15j@mailinator.com`, Given Name `Ada`, Family Name
   `Lark`.

Ben reaches the last step:

4. In a second browser, signed out, open Ben's invitation email ("You
   are invited to new roles") and its accept link.
5. On "Create OJS account" type Username `larkh15j` and Password
   `larkh15jlarkh15j`, tick the privacy consent and press "Save and
   continue".
6. On "Enter details" choose Country "Canada" and press "Save and
   continue". "STEP 3 - Review & create account" shows Username
   `larkh15j`. Leave this window open.

Ada takes the same username first:

7. In a third browser, signed out, open Ada's accept link and take steps
   5 and 6 with the same Username `larkh15j` (Password `adah15jadah15j`).
8. Press "Accept And Continue to OJS": "You've been assigned a new role
   in OJS".

Ben accepts:

9. In Ben's window press "Accept And Continue to OJS".
10. Press it again.
11. Press "Back" twice.

**Expected**: at step 9 Ben is taken back to the step where he can
choose another username, with the message the "Create OJS account" step
shows under Username for a taken name:

```
There is already an existing user with the username larkh15j. Try another one.
```

**Observed**: after steps 9 and 10 the page is unchanged, read again 5
seconds later: "STEP 3 - Review & create account", no notice, no field
error, no dialog, "Accept And Continue to OJS" still there. Each press
sends the accept request, which the server refuses:

```
PUT /index.php/publicknowledge/api/v1/invitations/{id}/key/{key}/finalize
422 {"errors":{"username":["There is already an existing user with the username larkh15j. Try another one."]}}
```

After step 11, "STEP 1 - Create OJS account" shows `larkh15j` in the
Username box with no error under it.

Another username typed there (`benlarkh15j`), then "Save and continue"
twice and "Accept And Continue to OJS", opens "You've been assigned a new
role in OJS".

## Cause

The server refuses the accept correctly. `UserRoleAssignmentReceiveController::finalize()`
validates the stored payload again in the finalize context, and
`UsernameExistsRule` fails for a username registered since the
"Create … account" step saved it; the answer is a 422 with the error
keyed `username`.

The accept page drops that answer. In ui-library's
`src/pages/acceptInvitation/AcceptInvitationPageStore.js`, `submit()`
sends the finalize request with `expectValidationError: true`, which
makes `useFetch` put a 400 or 422 answer into `validationError` instead
of raising its error dialog. `submit()` reads only `data`:

```js
const {data, fetch} = useFetch(finalizeInvitationUrl, {
	expectValidationError: true,
	method: 'PUT',
	body: {},
});
await fetch();
if (data.value) {
	openDialog({ /* "You've been assigned a new role in …" */ });
}
```

So a refused accept leaves `errors` empty and nothing on the page
changes. The review step has no fields of its own (its section's
`validateFields` is empty in `AcceptInvitationStep::acceptInvitationReviewStep()`),
so `submit()` sends no `refine` request first that could catch the taken
name. The username's field error belongs to the "Create … account" step
(`AcceptInvitationUserAccountDetails.vue`, which reads `store.errors`),
and `openStep()` clears `errors` whenever a step opens, so "Back" shows
no error either.

Reach:

- Every refusal at finalize is silent the same way, not only a taken
  username (code, not walked). An existing user's accept can be refused
  when they were given the role meanwhile (`AddUserGroupRule`) or the
  role was deleted (`UserGroupExistsRule`). Their page has only the
  review step, so it does nothing either.
- Today every 400 or 422 answer to finalize comes from that validation
  branch and carries an `errors` object. The failures before it (an
  unknown invitation, a wrong key, an invitation no longer pending) are
  thrown, and `APIHandler` answers them 500 with an `error` text. Its
  one 422 of its own, `{"error": …}` for a route that returns nothing
  sendable, is not reached by `finalize()`.
- The send wizard's store (`UserInvitationPageStore.js`) reads
  `validationError` on its `add` and `populate` requests and shows the
  errors (checked in the code); the accept page's own `refine` request in
  `updateInvitationPayload()` does too.

## Proposed fix

Read `validationError` in `submit()` and show the errors on the step that
holds the refused field, since the review step has none
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accept-taken-username-nothing-happens/fix.diff),
against the app root):

```diff
-				const {data, fetch} = useFetch(finalizeInvitationUrl, {
+				const {data, validationError, fetch} = useFetch(finalizeInvitationUrl, {
 					expectValidationError: true,
 					method: 'PUT',
 					body: {},
 				});
 
 				await fetch();
-				if (data.value) {
+				if (validationError.value) {
+					// A 400 or 422 without field errors (the API's own `error`) shows under the step title
+					showFinalizeErrors(
+						validationError.value.errors ?? {error: validationError.value.error},
+					);
+				} else if (data.value) {
```

```js
function showFinalizeErrors(fieldErrors) {
	const fieldNames = Object.keys(fieldErrors);
	const step = steps.value.find((step) =>
		step.sections.some((section) =>
			(section.props?.validateFields || []).some((field) =>
				fieldNames.includes(field),
			),
		),
	);
	if (step) {
		openStep(step.id);
	}
	errors.value = fieldErrors;
}
```

A taken username then opens "Create … account" with the server's message
under the Username box, where the newcomer types another and goes on as
usual. The errors are set after `openStep()`, which clears them. This
follows the store's own `updateInvitationPayload()`, which puts a
`refine` 422 into `errors` for the step's fields, and finds the field's
step from the `validateFields` lists the steps already carry.

Tried on `main` for OJS, OMP and OPS, with the result Evidence gives:
the Steps' Expected, and the accepts the fix must leave alone unchanged.

The fix leaves an error that no step holds (an existing user's refused
role) on the review step. With `errors` set, that step draws its warning
notice, whose text `invitation.wizard.errors` has no English text on
`main`: the notice reads the raw `##invitation.wizard.errors##` (seen in
the trial's page). The open `pkp/pkp-lib#13497` gives it "There are one
or more problems that need to be fixed before you can continue. Please
review the information below and make the requested changes.". Neither
shows the server's message for the role. That case is better than
today's silence only in saying that something is wrong, and is left out
of this fix.

The fix can ship on its own: the username case it fixes does not use
that notice. An API answer without `errors` puts its `error` text under
the step title (`store.errors.error`); finalize sends none today, so this
guard was not tried.

**Alternatives**:

- Set `errors` and stay on the review step: only the notice above shows,
  without the field's message or which step to change.
- Check the username again with a `refine` request before finalize: it
  narrows the window but cannot close it, and finalize must still be
  read.
- Make the server keep the username for the newcomer once their first
  step is saved: a schema change and a product decision, for a rare
  race.

**What goes with it**:

- 3.5 has the same `submit()`; the diff applies there as written.
- The guard: a ui-library component test of the store with a finalize
  answering 422 for `username`, or the e2e scenario here (spec U06's
  Planned items).
- An existing user's refused role needs its message shown on the review
  step (`pkp/pkp-lib#13497`'s notice text, plus the server's messages);
  not part of this fix.

Small: a few lines in one ui-library store, and a test.

## Evidence

- Kept script: [`shared/playwright/checks/issues/accept-taken-username-nothing-happens/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/accept-taken-username-nothing-happens/walk.js)
  (helpers in its `lib.js` and the U06 A4 walk's `lib.js`). It takes the
  Steps on PKP's default test dataset (pkp/datasets 7912e09, 2026-10-14,
  PostgreSQL) and records, at each press, the step heading, notices,
  field errors, dialogs, the button and the `finalize` answer. Run, after
  a reset of the dataset install:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js <app> shared/playwright/checks/issues/accept-taken-username-nothing-happens/walk.js [neighbour|reopen]`.
  `neighbour` walks only the accepts the fix must leave alone (a
  newcomer with a free username; a dataset author signed in as
  themselves). `reopen` walks to step 9, then opens Ben's link again,
  enters the password and consent and presses "Save and continue".
- Walked 2026-10-15 on OJS, OMP and OPS, `main` and `stable-3_5_0`: the
  same on all six. Tips: `main` OJS 378eced941, OMP f4836d4fb, OPS
  2ece50497f, lib/pkp b17fadae59, lib/ui-library 47b565cb;
  `stable-3_5_0` OJS ca763c91cd, OMP a70bbb9c4, OPS 44aec6e131, lib/pkp
  4045d9241e, lib/ui-library 2576e00a. No server error and no page
  script error; the browser console logged only the two 422 answers.
  The invitations' `expiryDate` was 3 days after sending
  (`Invitation::DEFAULT_EXPIRY_DAYS`, `[invitations] expiration_days`).
- The reopened link (OJS `main` only, `reopen`): "STEP 1 - Create OJS
  account" with `larkh15j` in the Username box and the password and
  consent empty; with them entered, "Save and continue" (a `refine`
  422) showed the message under Username and stayed on the step. OMP
  and OPS share the page and the `refine` handling (code).
- Code read on `main` and 3.5, beyond the files the Cause names:
  `AcceptInvitationPage.vue` (the review step's notice),
  `UserRoleAssignmentInvitePayload` (the finalize rules), `useFetch.js`
  (400 and 422 into `validationError`), `APIHandler` (thrown errors
  answered 500). `submit()` is identical in the three apps' ui-library
  and on 3.5.
- Introduced: `git blame` of `submit()` on ui-library `main` gives
  6940ab2b96 ("accept invitations (#358)") for the finalize call and the
  `if (data.value)` test; the PR names no issue.
- 3.4 and 3.3 (code): ui-library `origin/stable-3_4_0` (ee684b34) and
  `origin/stable-3_3_0` (96959f9e) have no `src/pages/acceptInvitation`,
  and lib/pkp `origin/stable-3_4_0` (55c8e406b3) and `origin/stable-3_3_0`
  (5e84acd11b) no invitation classes.
- Upstream search 2026-10-15 (pkp/pkp-lib, pkp/ui-library, pkp/ojs,
  pkp/omp, pkp/ops): no match. `pkp/pkp-lib#12765` (an account disabled
  in another journal prevents accepting, with an error shown) is another
  fault. `pkp/pkp-lib#13497` (open, head 06947c8e5a) adds the
  `invitation.wizard.errors` text quoted in the Proposed fix.
- Fix trial, `main`, OJS, OMP and OPS: `node bin/try-fix.js apply shared/playwright/checks/issues/accept-taken-username-nothing-happens/fix.diff ojs omp ops`,
  a reset, the walk and `neighbour`, then `revert`; `neighbour` walked
  again without the fix. With the fix, Ben's first press showed "STEP 1
  - Create … account" with "There is already an existing user with the
  username larkh15j. Try another one." under the Username box (the box
  marked invalid, the password and consent still filled), the same 5
  seconds later. Another username then reached "You've been assigned a
  new role". `neighbour` reached the new-role dialog (finalize 200) with
  the fix in and out. The guard for an answer without `errors` was added
  after the trial and not tried again; the diff passes `git apply
  --check` on the six ui-library checkouts (`main` and 3.5).
- Unverified: the existing-user refusals in the Cause's reach (code
  only), so the fix's fallback for them is unwalked. MySQL not checked;
  nothing here depends on the database.
