# An editor's "Waive" on an accept decision still asks the Author to pay the publication fee

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#3279` for `pkp/pkp-lib#7265` · [db30d9df0a](https://github.com/pkp/ojs/commit/db30d9df0a5534f9ce5277283242f29265be792d) · 2022-02-21 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#13171` (open; fix in PR `pkp/ojs#5740`, not yet in main)
- **Tracked in** spec U34 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U34-editorial-decision-recording.md#ojs1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An Editor accepts a submission with "Accept Submission" or "Accept and
Skip Review" and, on the "Request Payment" page, chooses "Waive". The
choice is ignored: the fee is requested just as if "Request publication
fee" had been chosen.

Every Author with an account on the submission gets a "Payment Request
Notification" email and the task "The publication fee is due for
payment.", which opens a page asking for the fee. The fee is not
recorded as waived either, so the article cannot be published until an
editor records the waiver in the submission's "Payments" menu. Nothing
tells the Editor, and the email cannot be taken back.

It happens on every journal that charges a publication fee.

## Impact

- **Lost.** The waiver. The Author is asked for money the journal meant
  to waive, and can pay it. With "Manual Fee Payment" the page shows the
  fee and the journal's own payment instructions, which the Author can
  follow. With "Paypal Fee Payment" the Author can pay online, and the
  fee is then recorded as paid. Either way the journal has a payment to
  refund.
- **Who.** Authors whose fee is waived at acceptance. The same Authors
  then cannot be published until the waiver is recorded.
- **Way round.** None at acceptance: no other choice on the page avoids
  the request. Afterwards, an editor of the submission (a Section Editor
  can) opens "Payments" in the submission's header, chooses "Waived" and
  presses "Save". That lets publishing go ahead. The editor still has to
  tell the Author to ignore the request, and the Author's task stays
  until the Author deletes it
  ([pkp-e2e#353](https://github.com/jardakotesovec/pkp-e2e/issues/353)).

High: the Author is asked to pay a fee the Editor waived, can pay it,
and nothing warns the Editor. A refusal shown to the Editor in place of
the silent request would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS, journal
  `publicknowledge`. Payments are off in it.
- Signed in as `dbarnes`, Settings › Distribution › "Payments": tick
  "Enable", choose "US Dollar" under "Currency" and "Manual Fee Payment"
  under "Payment Plugins" (it also offers "Paypal Fee Payment"), type
  "Pay by bank transfer." in "Manual Payment Instructions", press
  "Save".
- The side menu's "Payments" › "Payment Types": type 50 in "Article
  Processing Charge", press "Save".

Waiving on "Accept and Skip Review":

1. As `dbarnes`, open submission 4, "Computer Skill Requirements for New
   and Existing Teachers: Implications for Policy and Practice" (in the
   Submission stage), and press "Accept and Skip Review".
2. On "Accept and Skip Review: Request Payment", choose "Waive". Press
   "Continue", "Continue", "Record Decision".

Waiving on "Accept Submission":

3. Open submission 7, "Developing efficacy beliefs in the classroom" (in
   review, reviews ready), and press "Accept Submission".
4. On "Accept Submission: Request Payment", choose "Waive". Press
   "Continue" three times, then "Record Decision".

What follows:

5. Open submission 4 and press "Payments" in the header; do the same for
   submission 7.
6. Sign in as `cmontgomerie` (submission 4's Author) and press "Tasks".
   Then sign in as `dsokoloff` (submission 7's Author) and press
   "Tasks".
7. Look in the mailboxes of `cmontgomerie@mailinator.com` and
   `dsokoloff@mailinator.com`.

Requesting the fee (the control):

8. As `dbarnes`, open submission 8, "Traditions and Trends in the Study
   of the Commons", press "Accept and Skip Review", keep "Request
   publication fee (50 USD)", press "Continue", "Continue", "Record
   Decision".
9. Sign in as `eostrom` (submission 8's Author), press "Tasks", and look
   in `eostrom@mailinator.com`.

**Expected.** The fee is waived. Neither `cmontgomerie` nor `dsokoloff`
has the task "The publication fee is due for payment." or a "Payment
Request Notification" email, and both "Payments" menus read "Waived".
`eostrom` has both, and submission 8's menu reads "Unpaid".

**Observed.** Both decisions are recorded ("Skipped Review",
"Submission Accepted"). The page posts the choice as:

```
actions[0][id]=payment
actions[0][requestPayment]=false
```

Both "Payments" menus read "Unpaid". Each Author's "Tasks" reads "Tasks
1", with the task for their submission:

```
The publication fee is due for payment.
Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice
```

Pressing it opens "Manual Fee Payment" (`payment/pay/1`, and
`payment/pay/2` for `dsokoloff`) with "Publication Fee", "50.00 (USD)",
"Pay by bank transfer." and "Send notification of payment". Each Author
has a "Payment Request Notification" email from "Ramiro Vaca
<rvaca@mailinator.com>", the journal's principal contact. `eostrom`
(steps 8 and 9) gets the same task and email, as expected: "Waive" and
"Request publication fee" do the same thing.

## Cause

The payment page's choice is never read. OJS
`classes/decision/types/Accept.php::runAdditionalActions()` (lines
53–59), and its copy in
`classes/decision/types/SkipExternalReview.php::runAdditionalActions()`,
call `RequestPayment::requestPayment()` for every action whose `id` is
`payment`, whatever the action's `requestPayment` value:

```php
case self::ACTION_PAYMENT:
    $this->requestPayment($submission, $editor, $context);
    break;
```

`RequestPayment::validatePaymentAction()` only checks that
`requestPayment` is set. `requestPayment()` queues a
`PAYMENT_TYPE_PUBLICATION` payment for the fee, gives each assigned
Author a `NOTIFICATION_TYPE_PAYMENT_REQUIRED` task on it, and sends each
one the `PaymentRequest` mailable.

Reading the value with a plain `if` would not be enough. `DecisionPage.vue`
(ui-library) posts the decision form-encoded (`$.ajax({data})`), and the
decision schema leaves `actions` untyped. So the form's `false` arrives
as the string `"false"`, which PHP treats as true.

This came in with the decision refactor (`pkp/pkp-lib#7265`), which
replaced lib/pkp's `PromoteForm`. In 3.3, `PromoteForm::execute()` queued
the fee only `if ($this->getData('requestPayment'))`, and "Waive" posted
`0`. `pkp/ojs#3744` (`pkp/pkp-lib#8605`, 2023) later added the payment
page to "Accept and Skip Review", which carried the same ignored choice
there.

Reach:

- Both decisions that offer the page (both walked). No other decision
  type uses the `RequestPayment` trait (checked in the code).
- Publishing. `Repository::validatePublish()` (OJS
  `classes/publication/Repository.php`, lines 146–147) refuses to publish
  while payments are on and the submission has no fee record, with
  "Publication Fee not paid. To schedule item for publication notify
  author to pay fee or waive fee." (checked in the code).
- Stored data. Each waiver so far left a queued payment and the
  Authors' tasks. The decision row does not store the choice, so these
  cannot be told apart from real requests (checked in the code).

## Proposed fix

Merge `pkp/ojs#5740`, with two additions. The PR adds
`RequestPayment::runPaymentAction()`, called by both decision types in
place of `requestPayment()`. It requests the fee when
`filter_var($action['requestPayment'], FILTER_VALIDATE_BOOLEAN)` is true,
and otherwise records a waiver: a zero-amount `PAYMENT_TYPE_PUBLICATION`
payment, queued and fulfilled at once, as the "Payments" menu's "Waived"
does. `filter_var` is how the code base reads posted booleans
(`PKPAnnouncementController` `sendEmail`, `ReviewerSuggestionController`
`approved`).
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/waive-still-requests-publication-fee/fix.diff)
is the PR's change with the two additions:

1. **No second fee record.** `waivePayment()` does nothing when the
   submission already has a fee record:

   ```php
   if ($completedPaymentDao->getByAssoc(null, OJSPaymentManager::PAYMENT_TYPE_PUBLICATION, $submission->getId())) {
       return;
   }
   ```

   An editor can record the fee in the "Payments" menu at any stage,
   before the acceptance. With the PR as it stands, "Waive" then adds a
   zero record beside the existing one. Walked: after "Paid" on
   submission 11 and "Waived" on submission 14, "Waive" at acceptance
   left the journal's "Payments" list with four "Publication Fee" rows,
   including a waiver under Daniel Barnes beside Karim Al-Khafaji's
   "50 USD". With the check it kept the two rows recorded in the menu.

   This differs from the menu on purpose. The menu's "Waived" deletes a
   recorded payment and writes a waiver, because the editor sees the
   current status in that menu and changes it. The decision page does
   not show the status, and it preselects "Request publication fee". So
   "Waive" there should not erase a payment the journal has already
   recorded as received. An editor who does mean to replace it uses the
   menu.

2. **Refuse a value that is not a boolean.** `filter_var()` reads
   anything other than true, 1, "on" or "yes" as false. So an API
   client's typo would waive the fee silently. `validatePaymentAction()`
   refuses it with "This field must be true or false."
   (`validator.boolean`), as it already refuses a missing value with
   `validator.required`:

   ```php
   } elseif (filter_var($action['requestPayment'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) === null) {
       $validator->errors()->add($actionErrorKey . '.requestPayment', __('validator.boolean'));
   }
   ```

Tried on `main`. With "Waive" on both decisions, neither Author had the
task or the email, and both "Payments" menus read "Waived". With "Request
publication fee" on submission 8, `eostrom` still got the task and the
email, with the fix in as without it. The decision page only ever sends
`true` or `false`, so the refusal was not seen on screen.

**Alternatives**

- Merge `pkp/ojs#5740` as it stands. It fixes the reported fault, but
  can leave a second fee record beside one already recorded, and waives
  on any value that is not a recognised true.
- Only skip the request on "Waive", as 3.3 did. The editor would then
  have to waive the fee again in the "Payments" menu before publishing,
  although the page already said "Waive".
- Move the waiver into one `OJSPaymentManager` method that the
  "Payments" menu also calls. That is tidier than two copies of six
  lines, but it touches the menu's save as well.

**What goes with it**

- No data repair: past waivers cannot be told apart from real requests.
- Side effect elsewhere: a waived acceptance now adds a row to the
  journal's "Payments" list, under the Editor who recorded the decision,
  as the menu's "Waived" does.
- Backport. The diff applies to 3.5 and 3.4 as written; the trait and
  both decision types are the same there.
- Guard. A unit test on `runPaymentAction()` and `validatePaymentAction()`
  with `"false"`, `"true"`, `false`, `true` and a non-boolean, plus a
  **Planned** item in spec U34: after "Waive", the Author's Tasks panel
  has no fee task and the "Payments" menu reads "Waived".

Small: the PR's change plus a check and a validation line, in one trait,
with a unit test.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/waive-still-requests-publication-fee/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/waive-still-requests-publication-fee/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/waive-still-requests-publication-fee/walk.js`.
  It reads the decision's request body from the browser's traffic and
  the Authors' mail in the mail catcher. Steps 8–9 run with the argument
  `neighbour`. The fee recorded before acceptance runs with `existing`:
  `dbarnes` records "Paid" on submission 11, and `dbuskins` (a Section
  Editor) records "Waived" on submission 14. `dbarnes` then waives both
  at "Accept and Skip Review". The script reads the menus, the journal's
  "Payments" list and the `completed_payments` rows, without writing.
- The fix was tried on the `main` tip below with the Steps, steps 8–9
  and `existing`. `pkp/ojs#5740`'s own diff (`gh pr diff 5740 -R
  pkp/ojs`) was tried with `existing`. Each was reverted after. No
  server error or page script error with either.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets 566bb1f (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e, ui-library
    d4e01883), steps 1–7. The results were the same, the posted
    `requestPayment=false` included.
  - No server error or page script error on either line.
- Not walked: "Paypal Fee Payment" needs the journal's own PayPal
  account. The PayPal plugin's `handle()` calls `fulfillQueuedPayment()`
  on the requested payment once PayPal approves it, which records the fee
  as paid (`plugins/paymethod/paypal/PaypalPaymentPlugin.php`, line
  234). The dataset installs the PayPal plugin with no settings, and
  leaves payments off with a fee of 0.
- Who can record "Waived": the menu is in the workflow header whenever a
  publication fee is on (ui-library `workflowConfigEditorialOJS.js`).
  Its save (`BackendSubmissionsController::payment()`) admits Section
  Editors, managers, site administrators and assistants with access to
  the submission. Walked as a Journal editor and a Section Editor.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1 (lib/pkp 767353f4fe,
  ui-library ee684b34). The two `runAdditionalActions()`,
  `validatePaymentAction()`, the form's `true` and `false` and
  `DecisionPage.vue`'s form-encoded post are as on `main`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, lib/pkp ac3fa73402.
  lib/pkp `controllers/modals/editorDecision/form/PromoteForm.inc.php`
  `execute()` queues the fee only when `requestPayment` is set, and
  `promoteForm.tpl` posts `1` for the request and `0` for "Waive".
- Introduced: `git blame` on the `case self::ACTION_PAYMENT:` lines of
  both decision types gives db30d9df0a, the first commit holding them
  (`git log -S'ACTION_PAYMENT'`), merged in `pkp/ojs#3279`.
  `pkp/ojs#3744` added only `SkipExternalReview::getSteps()`.
- Tracker search, 2026-10-04, in `pkp/pkp-lib`, `pkp/ojs` and
  `pkp/ui-library`, by "waive publication fee", "waive payment",
  "Payment Request Notification", `requestPayment`,
  `RequestPaymentDecisionForm` and `RequestPayment runAdditionalActions`.
  `pkp/pkp-lib#13171` is this fault, reported on OJS 3.5.0.4. Related
  but not this fault: `pkp/pkp-lib#12885` (the queued fee is assigned to
  the editor), `pkp/pkp-lib#8910` (3.3, no payment on "Accept and skip
  review"), `pkp/pkp-lib#10777` (closed, "Waived" in the menu answered
  500).
