# "Request Author Response" refuses an empty subject or message with "An unexpected error has occurred"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (on a press only by the page's address; OPS has no review stage)
  - 3.5: none (code; no "Request Author Response" page)
  - 3.4: none (code; no author response feature)
  - 3.3: none (code; the same)
- **Introduced** `pkp/ui-library#767` for `pkp/pkp-lib#12048` · [8d29739f](https://github.com/pkp/ui-library/commit/8d29739f60c4f2fd21417a8c68f74e42efed8cbf) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U30 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor who clears "Subject" or "Message" on the "Request Author
Response" page and presses "Submit Request" gets a dialog headed
"Error": "An unexpected error has occurred. Please reload the page and
try again." Nothing under either field says that it is required.

The editor who sees which field is empty can fill it in and send. On a
journal the page opens from "Request Response" on a review round; a
press shows no "Author Response" table, so there the page is reached
only by its address.

## Impact

- **Lost** Nothing: the page keeps the subject and the message after
  "OK", and no email goes out.
- **Who** The roles the page admits (journal and press managers and
  editors, site administrators, and the section or series editors
  assigned to the submission) who empty a required field before
  sending the request;
  rare in ordinary use, since both fields open filled from the
  template.
- **Way round** Fill in the emptied field and press "Submit Request"
  again; the request goes out.

Low: the request goes out once the field is filled in, and the dialog
appears only when an editor empties a field. It would be medium if the
page lost the message on "OK".

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 10, "Condensing Water
  Availability Models to Focus on Specific Water Management Systems", is
  in Review, round 1, with both reviews in, so "Request Response" is
  enabled. `dbarnes` (Journal editor) is assigned to it.
- The install's mail goes to a local mail catcher (or the mail log), not
  out: the dataset's addresses are real `mailinator.com` ones.

Steps:

1. Sign in as `dbarnes` and open submission 10. The workflow opens on
   Review, round 1.
2. In the "Author Response" table, press "Request Response".
3. On the page "Request Author Response", once "Message" has loaded,
   clear "Subject".
4. Press "Submit Request".
5. Press "OK" on the dialog. Read the page.
6. Type the subject back ("Request For Author Response To Reviewer
   Feedback") and clear "Message".
7. Press "Submit Request".

[OMP shows no "Request Response" button. The same page opens by its
address: as `dbarnes`, open submission 16, "A Designer's Log: Case
Studies in Instructional Design", Review, round 1; the address bar ends
in `workflow_3_18`; open
`/index.php/publicknowledge/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=18&submissionId=16`,
then steps 3 to 7.]

**Expected** At step 4 the page marks "Subject" as required, with a
message under the field, and at step 7 the same under "Message". No
email is sent.

**Observed** At steps 4 and 7 a dialog opens:

```
Error
An unexpected error has occurred. Please reload the page and try again.
[OK]
```

Nothing appears under "Subject" or "Message". The request behind
"Submit Request" answers 422 with the reason for the field:

```
POST …/api/v1/reviews/10/8/authorResponse/requestResponse   422
{"subject":["This field is required."]}

(step 7)                                                     422
{"body":["This field is required."]}
```

After "OK" the page still holds the message (step 5) and the subject
(step 7); no email reaches `jnovak@mailinator.com`.

## Cause

`RequestReviewRoundAuthorResponse.vue` (lib/ui-library
`src/pages/requestReviewRoundAuthorResponse/`) posts the composer's
fields with `useFetch(apiUrl, {method: 'POST', body: …})`, without
`expectValidationError: true`, and never passes `errors` to its
`Composer`. So `useFetch()` hands every failed answer to
`modalStore.openDialogNetworkError()`. That method shows
`data.errorMessage` or `data.error` when the answer has one, and
otherwise `common.unknownError`, "An unexpected error has occurred.
Please reload the page and try again."

The server's answer is a refusal keyed by field. pkp-lib
`api/v1/reviews/formRequests/RequestAuthorResponse.php` requires
`subject` and `body`, and `PKPExceptionHandler::render()` answers its
`ValidationException` with the messages under each field's name:
`{"subject":["This field is required."]}`. `Composer` can show exactly
that: given it as its `errors` prop, it puts each message under the
field of the same name ("Subject", "Message", CC, BCC, the
attachments). The page never passes it on, so the dialog falls back to
the generic text.

Reach:

- Both required fields, on OJS from "Request Response" and on OMP by
  the page's address (walked). An attachment the server refuses
  (`email.attachmentNotFound`, added under `attachments` by
  `RequestAuthorResponse::after()`) takes the same path (code).
- The page's other refusals carry an `error` message and already show
  it: a round whose reviews are not in ("This review round has review
  assignments that needs to be completed before a response can be
  requested from the Author.", 422) and a round that holds a response
  (409).
- The two other screens that post a `Composer` show field errors under
  it: the decision page (`src/components/Container/DecisionPage.vue`
  `setStepErrors()`) and the
  user invitation (`UserInvitationPageStore.js` with
  `expectValidationError: true`, `UserInvitationEmailComposerStep.vue`
  `:errors`). The author's response window is a `PkpForm`, which shows
  its own field errors.

## Proposed fix

Ask `useFetch()` for validation errors and show those the composer has
a field for under that field, as the user invitation does
(`expectValidationError: true` and the composer's `:errors`); dropping
an error when its field changes follows
`src/components/Container/DecisionPage.vue` `updateStep()`. Everything
else keeps today's dialog: a refusal of the request as a whole (the
not-ready round's 422 carries an `error` message) and a refused value
the composer has no field for (`submissionId`, `reviewRoundId`,
`locale`, which the form request also validates). The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/request-author-response-empty-field-generic-error/fix.diff),
lib/ui-library only:

```diff
 					:attach-files-label="t('common.attachFiles')"
+					:errors="errors"
 					v-bind="emailComposer"
 ...
+/** Field errors from the server, shown under the composer's fields */
+const errors = ref({});
+
+/** The fields the composer shows an error under */
+const composerFields = ['subject', 'body', 'cc', 'bcc', 'attachments'];
 ...
 function updateEmail(update) {
 	emailComposer.value = {...emailComposer.value, ...update};
+
+	// A field the user changes drops its error, as on the decision page
+	const remainingErrors = {...errors.value};
+	Object.keys(update).forEach((key) => delete remainingErrors[key]);
+	errors.value = remainingErrors;
 }
 ...
 	isLoading,
+	validationError,
 } = useFetch(apiUrl, {
 	method: 'POST',
 	body: getEmailDataAsPayload,
+	expectValidationError: true,
 });
 ...
 async function submit() {
 	if (isLoading.value) {
 		return;
 	}
 
+	errors.value = {};
+	// useFetch() keeps the last validation error through a later failure of another kind
+	validationError.value = null;
 	await submitRequest();
 
+	if (validationError.value) {
+		const keys = Object.keys(validationError.value);
+		if (keys.length && keys.every((key) => composerFields.includes(key))) {
+			// Errors the composer shows under its fields
+			errors.value = validationError.value;
+		} else {
+			// A refusal of the request as a whole (a round whose reviews are not in),
+			// or of a value the composer has no field for: the dialog, as before
+			useModal().openDialogNetworkError({data: validationError.value});
+		}
+		return;
+	}
```

Tried on `main`, with the JavaScript rebuilt, on OJS and OMP and
again on OJS once the filter for the composer's fields was added: at
steps 4 and 7 no dialog opened, "This field is required." showed under
"Subject" and then under "Message", the message under "Subject" went
once a subject was typed again, and no email went out. With the fix in
and out, a round whose reviews are not in still got its own "Error"
dialog ("This review round has review assignments …"), and the ready
round's request, sent as the template fills it, was still accepted
with "Request for review response sent".

**Alternatives**

- Disable "Submit Request" while a field is empty: catches only empty
  fields, not the attachment refusal, and no other composer page does
  it.
- Answer the not-ready refusal with another status than 422 on the
  server: changes what an API client sees, for no gain on this page.

**What goes with it**

- A guard: an e2e scenario in spec U30 for an emptied "Subject" and
  "Message" (a **Planned** item), or a ui-library story of the page with
  a refused field.

Small: one component in ui-library, following the invitation's
pattern, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/request-author-response-empty-field-generic-error/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/request-author-response-empty-field-generic-error/lib.js)):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/request-author-response-empty-field-generic-error/walk.js`.
  Its default mode takes the Steps on OJS and OMP (a preprint server
  has no review stage) and records each answer's status and body, the
  dialog, every field message on the page, and the author's mailbox.
  `WALK_MODE=neighbour` sends the template untouched on a round whose
  reviews are not in (OJS submission 12, OMP submission 2, by the
  page's address) and on the ready round.
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/request-author-response-empty-field-generic-error/fix.diff
  ojs omp` (rebuilds the JavaScript), the dataset reloaded, the walk in
  both modes, then `revert` and the neighbour mode again without the
  fix; the final diff, with the filter for the composer's fields, was
  tried the same way on OJS. A refused `submissionId`, `reviewRoundId`
  or `locale` cannot be sent from the page, so the dialog for them was
  read in the code, not driven.
- Tips walked: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); the page and the form request are the same in both. Dataset:
  pkp/datasets 566bb1f (2026-10-03), PostgreSQL.
- Server log: each refused field also writes a `production.ERROR` line
  for the `ValidationException` ("This field is required."); no answer
  of 500 or more and no script error in the browser.
- 3.5 (code), OJS c1cee76b95 (lib/pkp 771474347e, lib/ui-library
  d4e01883), OMP 9c5e24246c (lib/pkp cf3f984335): lib/pkp has no
  `pages/reviewResponse` and no `api/v1/reviews/formRequests`, and
  lib/ui-library no `requestReviewRoundAuthorResponse` page; not
  walked, since the page does not exist there.
- 3.4 and 3.3 (code): lib/ui-library `stable-3_4_0` ee684b34 and
  `stable-3_3_0` 96959f9e have no such page; lib/pkp 767353f4fe and
  ac3fa73402 no `RequestAuthorResponse` and no review response page
  handler (OJS d68934d0d1 and ac77c9fb35).
- Introduced: `git blame` on the page's `useFetch()` call and `submit()`
  leads to 8d29739f, the commit that added the page; its server half,
  the form request, is lib/pkp 3dff6a7b6e (`pkp/pkp-lib#12207`, same
  author and date).
- Upstream: pkp/pkp-lib, pkp/ui-library and pkp/ojs searched by the
  symptom's words and by `RequestReviewRoundAuthorResponse`;
  `pkp/pkp-lib#13206` (closed, the page opening without an email form)
  is another fault.
- Not driven: an attachment the server refuses; a refused field on a
  round under "Minimum Confirmed Reviews Required"; a reload after the
  dialog, which by the code opens the page afresh from the template
  (unverified).
