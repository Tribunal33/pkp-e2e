# A contributor's ORCID iD field shows a refused verification request as sent, and a refused delete as done

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no ORCID iD field, the ORCID Profile plugin's boxes)
  - 3.3: none (code; the same plugin boxes)
- **Introduced** `pkp/ui-library#339` for `pkp/pkp-lib#9771` · [50e3204043](https://github.com/pkp/ui-library/commit/50e32040431e8954f73e6a64a8849734ce0346d6) · 2023-10-10 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U04 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U04-orcid-integration.md#a5), the field's state after a refusal
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When the server refuses a contributor's "Request verification" or
"Delete" under "ORCID iD", a window titled "Error" says the action was
not allowed, but the field behind it changes as if the action had
worked: it reads "ORCID Verification has been requested!" with "Resend
Verification Email", or the iD disappears.

The error window is right and nothing is sent or removed; only the
field is wrong, until the form is closed and opened again. Today the
server refuses both actions to every Assistant who may edit the
contributor (a separate fault), so that is where this is met.

## Impact

- **Lost**: nothing is sent or removed, and the error window says so.
  A user who trusts the field instead may believe the contributor was
  emailed, or that the iD is gone from the record.
- **Who**: whoever uses the field when the server refuses. Today that is
  every Assistant (Copyeditor, Layout Editor, Proofreader and the other
  assistant-level roles) whom an editor has let edit the publication,
  by ticking "Allow this person to make changes to the publication, …"
  (the "Permissions" box of the Assistant's participant assignment),
  on a journal, press or preprint server with ORCID on. Rarely, anyone
  whose form was left open while ORCID was turned off or the
  contributor was removed.
- **Way round**: close the contributor's form and press "Edit" again;
  the field then shows the stored state.

Low: the error window tells the truth at the same moment the field
contradicts it, and nothing is sent or removed by the refused action.
It would be medium if a user went on from the field's word, for
example letting an article be published with an iD they believed they
had deleted.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. OMP and OPS are the same
  with the names in brackets.
- ORCID is on: as `dbarnes`, Settings › Users & Roles › "ORCID", tick
  "Enable ORCID functionality", "ORCID API" "Member Sandbox", any Client
  ID and Client Secret, "Save".
- An Assistant who may edit the publication, whom the server refuses
  the two actions (a separate fault). As `dbarnes`, open submission 3,
  "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence" [OMP: 7, "Accessible Elements: Teaching Science
  Online and at a Distance"], "Participants", Maria Fritz's (`mfritz`,
  Copyeditor) "More Actions" › "Edit", tick "Allow this person to make
  changes to the publication, such as the title, abstract, metadata and
  other publication details. …", "OK". The contributor used below is
  Catherine Kwantes [OMP: Dietmar Kennepohl].
- [OPS: the dataset has no Assistant who takes part in a preprint's
  stages. As `dbarnes`: Settings › Users & Roles › "Roles", "Editorial
  Board Member" › "Settings" › "Edit", tick the stage "Production",
  "OK"; "Users" › "Invite to a role" for a new address (here Ada
  Assist-u04r4, ada.u04r4@mailinator.com), role "Editorial Board
  Member". The invited person accepts from the invitation email (the
  install must deliver mail, to a mail catcher on a test install) and
  creates the account (here `adau04r4`). Then open preprint 1, "The
  influence of lactation on the quantity and quality of cashmere
  production" (Production), "Participants" › "Assign", "Editorial Board
  Member", Ada, tick the same "Allow this person to make changes …"
  box, "OK". The Assistant in the steps is `adau04r4`, the contributor
  Carlo Corino.]

Requesting verification:

1. Sign in as `mfritz` [OPS: `adau04r4`], open the submission from
   "Assigned to me", Publication › "Contributors", the contributor's
   "Edit".
2. Under "ORCID iD", press "Request verification", then "Yes".
3. Press "OK" on the "Error" window.
4. Close the form (its "Close" arrow) and press the contributor's "Edit"
   again.

Deleting the iD:

5. Give the contributor a stored iD. Any stored `orcid` value makes the
   field show the iD with "Delete", verified or not; only ORCID's
   sign-in creates one, so on a test install write it by SQL. The walk
   wrote what the app stores when that sign-in completes
   (PostgreSQL; plain SQL, MySQL not checked). On OMP put 7 and
   `dkennepohl@mailinator.com`, on OPS 1 and `ccorino@mailinator.com`:

   ```sql
   INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
   SELECT a.author_id, '', v.setting_name, v.setting_value
   FROM authors a
   JOIN submissions s ON s.current_publication_id = a.publication_id
   CROSS JOIN (
     SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
     UNION ALL SELECT 'orcidIsVerified', '1'
     UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
     UNION ALL SELECT 'orcidAccessScope', '/activities/update'
     UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
     UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
   ) v
   WHERE s.submission_id = 3
     AND a.email = 'ckwantes@mailinator.com';
   ```

6. Reload the page and open the contributor's "Edit": the iD with
   "Delete".
7. Press "Delete", then "Yes", then "OK" on the "Error" window.
8. Close the form and press "Edit" again.

**Expected**: after the refusal the field stays as it was: "Request
verification" after step 3, the iD with "Delete" after step 7.

**Observed**: `POST …/api/v1/orcid/requestAuthorVerification/9` and
`POST …/api/v1/orcid/deleteForAuthor/9` answer 401 `{"error":"You are
not authorized to access the requested resource."}`, and the window
"Error" shows that sentence each time. Behind it, and after its "OK",
the field reads "ORCID Verification has been requested!" with "Resend
Verification Email" (step 3), and "Request verification" with no iD
(step 7). Reopened, the form shows the stored state: "Request
verification" (step 4), the iD with "Delete" (step 8); a reload shows
the same.

Control: for `dbarnes`, whose requests succeed, the field changes the
same way, and a reload agrees with it.

## Cause

ui-library `src/components/Form/fields/FieldOrcid.vue`, methods
`sendEmailRequest()` (lines 181–195) and `deleteOrcid()` (lines
243–259), take the result of `useFetch()` and test it:

```js
const {isSuccess, fetch} = useFetch(apiUrl, {method: 'POST', expectValidationError: true});
await fetch();

if (isSuccess) {
	this.verificationRequested = true;   // deleteOrcid(): this.orcidValue = '';
}
```

`useFetch()` (`src/composables/useFetch.js`) returns `isSuccess` as a
Vue ref, set to `false` when the request fails. Destructured into a
plain variable inside an options-API method, it is the ref object
itself, which is always truthy, so the field takes the success branch
whatever the answer. The "Error" window comes from `useFetch()`'s own
`modalStore.openDialogNetworkError()`, which is why the error and the
field disagree. Reopening the form shows the truth because
`ContributorsListPanel.vue` `openEditModal()` fetches the contributor
afresh on every "Edit".

Reach:

- Both buttons of the field, "Resend Verification Email" included (it
  calls `sendEmailRequest()` too), on the workflow's contributor form,
  the submission wizard and the preprint author's dashboard (all use
  `ContributorForm`'s `FieldOrcid`).
- Every refusal that changes nothing on the server: 401 and 403 for a
  user the ORCID routes do not admit, 403 when ORCID was turned off
  after the form opened, 404 for a contributor removed meanwhile.
  Walked: the 401.
- Not covered by this fix: when queuing the email fails,
  `OrcidController::requestAuthorVerification()` has already stored
  `orcidVerificationRequested` before the dispatch throws, and answers
  404. With the fix the field then shows "Request verification" while
  the stored state is "requested"; that needs the server to store the
  flag only after a successful dispatch (or roll it back).
- No other component of ui-library `src` tests a destructured
  `isSuccess` without `.value`; the others read `isSuccess.value`, watch
  the ref, or return it unwrapped (searched every destructured
  `isSuccess`).

## Proposed fix

Read the ref's value
([field-fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-orcid-controls-refused/field-fix.diff),
ui-library only):

```diff
@@ -190,5 +190,5 @@
 			await fetch();
 
-			if (isSuccess) {
+			if (isSuccess.value) {
 				this.verificationRequested = true;
 			}
@@ -252,5 +252,5 @@
 			await fetch();
 
-			if (isSuccess) {
+			if (isSuccess.value) {
 				this.orcidValue = '';
 			}
```

Tried on `main` on OJS, OMP and OPS, with the JavaScript rebuilt: after
the refused request the field still read "Request verification" beside
the "Error" window, and after the refused delete it still showed the
iD with "Delete". For `dbarnes` the field still showed "ORCID
Verification has been requested!" and the iD removed, with the fix in
and out.

- **How the code base does it.** `isSuccess.value`, as in
  `useDiscussionManagerForm.js` and `useMediaFileManagerActions.js`.
- **`expectValidationError: true`.** Both calls pass it, so a 400 or
  422 answer would open no window and, with the fix, leave the field
  silently unchanged. No ORCID route answers either today, so it
  changes nothing now; dropping the option from both calls in the same
  change would make any future validation refusal show the error
  window. Not part of the tried diff.
- **What it touches.** The field only; no API, event or stored data.
  It applies as written to 3.5.
- **The guard.** A Vitest beside the component with an `msw`
  `setupServer()` handler answering 401 to
  `orcid/requestAuthorVerification/*` and `orcid/deleteForAuthor/*`, as
  `src/composables/useFetch.test.js` mocks its failing calls, calling
  `sendEmailRequest()` and `deleteOrcid()` and expecting
  `verificationRequested` false and `orcidValue` unchanged.

**Alternatives**: reading `data` instead of `isSuccess` works the same
but is less direct.

**What goes with it**: nothing; it is independent of why the server
refuses.

Small: six characters in two lines of one component, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-orcid-controls-refused/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-orcid-controls-refused/lib.js),
  run on a dataset install with
  `node bin/probe.js all shared/playwright/checks/issues/assistant-orcid-controls-refused/walk.js`
  (`WALK_MODE=neighbour` for the `dbarnes` control). It takes the steps
  above, with a reload after steps 4 and 8 as well, records every
  window shown after "Yes", and reads the field before and after the
  error window's "OK" and in the reopened form.
- Walked on PKP's default test dataset (pkp/datasets c312c01,
  2026-10-03), PostgreSQL. No server error and no script error.
- `main` tips: OJS ff004d0973 (ui-library 64d67363); OMP 3b0ecf794 and
  OPS c8af945bb7 (ui-library 280f98c5). `stable-3_5_0` tips: OJS
  c1cee76b95, OMP 9c5e24246, OPS 38b61882d3 (ui-library d4e01883),
  walked with the same result; `FieldOrcid.vue` and `useFetch.js`'s
  `isSuccess` are the same as on `main`.
- 3.4 and 3.3: ui-library has no `FieldOrcid`; ORCID is the ORCID Profile
  plugin, whose request and delete are boxes saved with the contributor
  form.
- Trace: `git blame` on both `if (isSuccess)` lines gives 50e3204043, the
  component's first version; `useFetch()` already returned refs then.
- Tracker search (2026-10-03): pkp/ui-library and pkp/pkp-lib by
  `FieldOrcid`, "orcid isSuccess", "orcid request verification error",
  "orcid not authorized": nothing on this fault.
