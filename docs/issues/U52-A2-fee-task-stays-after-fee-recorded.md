# Authors are still told to pay the publication fee after the editor records it as "Paid" or "Waived"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#3018` for `pkp/pkp-lib#6419` · [f891410d45](https://github.com/pkp/ojs/commit/f891410d45bffedc7b55c802b0b48828efa271d1) · 2021-01-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After an editor records the APC as "Paid" or "Waived", each Author's
Tasks panel still reads "The publication fee is due for payment.", and
pressing it still opens a payment page for the fee. The Author is told
to pay a fee that is settled, and can send the journal another "Manual
Payment Notification" for it.

The editor's record is right: the "Payments" menu and the journal's
list of payments show the fee as paid or waived.

It happens whenever an editor records a requested fee in the
workflow's "Payments" menu, whatever the journal's payment method. A
journal on "Manual Fee Payment" records every fee there. On "Paypal Fee
Payment", a fee the Author pays through the task settles that request,
and its task goes; only a fee the editor waives, or records as paid
outside PayPal, leaves the task.

## Impact

- **Lost.** A correct instruction to the Author. The task and the
  payment page still ask for the full amount, and "Send notification of
  payment" sends the journal another notification. Nothing stops an
  Author on the manual method from making a second transfer; a second
  payment through PayPal was not checked.
- **Who.** Every Author of every article whose fee was requested and
  then recorded as "Paid" or "Waived" in the menu.
- **Way round.** The Author can tick the task and press "Delete", but
  nothing on screen tells them the fee is settled, so the editor has to
  tell them. Each request leaves one such task per Author, for good.

Medium: an Author is told to pay a settled fee, and only the editor can
tell them otherwise. It would be high if Authors in fact pay twice
through PayPal.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS, journal
  `publicknowledge`. Payments are off in it.
- Signed in as `dbarnes`, Settings › Distribution › "Payments": tick
  "Enable", choose "US Dollar" under "Currency" and "Manual Fee Payment"
  under "Payment Plugins", type "Pay by bank transfer." in "Manual
  Payment Instructions", press "Save".
- The side menu's "Payments" › "Payment Types": type 50 in "Article
  Processing Charge", press "Save".

Requesting the fee:

1. As `dbarnes`, open submission 4, "Computer Skill Requirements for New
   and Existing Teachers: Implications for Policy and Practice", and
   press "Accept and Skip Review".
2. On "Accept and Skip Review: Request Payment", keep "Request
   publication fee (50 USD)" chosen. Press "Continue", "Continue",
   "Record Decision".
3. Do the same for submission 8, "Traditions and Trends in the Study of
   the Commons", and submission 11, "Learning Sustainable Design through
   Service".

Recording it:

4. Open submission 4, press "Payments" in the header, choose "Paid",
   press "Save". It shows "Saved".
5. Open submission 8, press "Payments", choose "Waived", press "Save".
   Leave submission 11 "Unpaid".

What the Authors see:

6. Sign in as `cmontgomerie` (submission 4's Author) and press "Tasks".
7. Press the task "The publication fee is due for payment.".
8. Press "Send notification of payment".
9. Sign in as `eostrom` (submission 8's Author), press "Tasks" and press
   the task "The publication fee is due for payment.".

**Expected.** After steps 4 and 5, neither `cmontgomerie` nor `eostrom`
has the task "The publication fee is due for payment.": their fees are
paid and waived.

**Observed.** The "Payments" menu now opens on "Paid" and "Waived", and
the "Payments" page's "Payments" tab lists both records. The first row
is submission 8's waiver, recorded under the editor who saved it; the
second is submission 4's fee, recorded under its first Author:

```
Daniel Barnes      Publication Fee  0       2026-10-01 20:17:25
Craig Montgomerie  Publication Fee  50 USD  2026-10-01 20:17:18
```

Yet each Author's "Tasks" still shows one task. This is
`cmontgomerie`'s; `eostrom`'s names submission 8:

```
The publication fee is due for payment.
Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice
```

Pressing it opens "Manual Fee Payment" (`payment/pay/1`; for `eostrom`,
`payment/pay/2`) with:

- Title: "Publication Fee"
- Fee: "50.00 (USD)"
- the instructions, and the link "Send notification of payment".

Step 8 shows "Payment
Notification" with "Payment notification sent", and the journal's
contact (`rvaca`) receives a "Manual Payment Notification" from
`cmontgomerie`.

Submission 11's Author, `kalkhafaji`, has the same task, and should:
that fee is still unpaid.

## Cause

A fee request is a queued payment. `RequestPayment::requestPayment()`
(OJS `classes/decision/types/traits/RequestPayment.php`, lines 66–87)
queues a `PAYMENT_TYPE_PUBLICATION` payment for the submission and gives
each assigned Author a `NOTIFICATION_TYPE_PAYMENT_REQUIRED` task, whose
assoc is that queued payment (`ASSOC_TYPE_QUEUED_PAYMENT`). The task's
link is `payment/pay/{queuedPaymentId}`
(`PKPNotificationManager::getNotificationUrl()`). The task goes only
when the queued payment is deleted: `QueuedPaymentDAO::deleteById()`
deletes the notifications with that assoc. Its one caller is
`OJSPaymentManager::fulfillQueuedPayment()`, which deletes the payment it
fulfils (the call is at line 363).

The "Payments" menu does not fulfil the request. Its save,
`BackendSubmissionsController::payment()` (OJS
`api/v1/_submissions/BackendSubmissionsController.php`), creates a new
queued payment for "Waived" (lines 118–127) and for "Paid" (lines
146–155), and fulfils that one at once. The completed payment is
recorded and the new queued payment is deleted. The request the Authors
hold is never looked up, so it and their tasks stay. Nothing in
`fulfillQueuedPayment()`'s `PAYMENT_TYPE_PUBLICATION` case (line 350)
withdraws other requests for the same fee either.

Reach:

- The PayPal method (checked in the code). An Author who pays through
  the task fulfils the requested payment itself, so that task goes.
  Only a fee recorded in the "Payments" menu leaves the task behind.
- Every request of the submission (checked in the code). Each "Accept"
  or "Accept and Skip Review" with the fee queues a new request, and
  each one stays.
- Co-authors (code). Every assigned Author's task points at the same
  request, so each of them keeps theirs.
- Stored data. Every journal that has recorded a fee through the menu
  holds stale requests in `queued_payments` and stale tasks in
  `notifications`. They never expire: no caller of `queuePayment()`
  passes an expiry date, for a fee or any other payment, so
  `deleteExpired()` never takes them.

## Proposed fix

Settle the request where a publication fee is settled: in
`OJSPaymentManager::fulfillQueuedPayment()`'s `PAYMENT_TYPE_PUBLICATION`
case. When it fulfils a fee payment, it also deletes every other queued
publication fee payment for the same submission through
`QueuedPaymentDAO::deleteById()`, which takes the Authors' tasks with
them. [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/fix.diff)
adds `deleteQueuedPublicationPayments()` and calls it from that case:

```php
case self::PAYMENT_TYPE_PUBLICATION:
    // The fee is settled: withdraw the requests still waiting for it, and the authors' tasks with them.
    $this->deleteQueuedPublicationPayments($queuedPayment);
    $returner = true;
    break;
```

The method finds the requests through the Authors' tasks:
`Notification::withContextId()->withType(NOTIFICATION_TYPE_PAYMENT_REQUIRED)`.
It then keeps the queued payments of the same type and submission
(`getType()`, `getAssocId()`). Scanning `queued_payments` instead would
mean unserializing every row, since each is a serialized object with no
submission column, and the table keeps every purchase attempt of every
kind for good, as nothing sets an expiry. Like the subscription cases of
the same method, the fee case then settles what its payment pays for.
It covers both of the menu's saves and any later caller that records a
fee. It was tried on `main`. The Authors of submissions 4 and 8 had no
task left (the "Tasks" button showed no count), and `queued_payments`
went from 3 rows to 1. Submission 11's Author, whose fee is still
unpaid, kept the task, and it still opened the payment page.

**Alternatives**

- Delete the request in `BackendSubmissionsController::payment()`
  instead. This covers the menu only, and leaves the same gap for any
  other code that fulfils a fee.
- Fulfil the Authors' request itself from the menu, rather than a new
  one. This needs the same lookup, and a submission with no request
  would still need the new payment.
- Add a submission column to `queued_payments` so the lookup is a
  query. That is a schema change; it is only worth it if the team wants
  it for other reasons.

**What goes with it**

- A change of behaviour. Saving "Paid" now withdraws the request, so
  switching back to "Unpaid" leaves the Author with no task; a new
  request needs a new decision. Today the stale task stays there.
- A request whose task every Author has deleted has no notification
  left, so the lookup cannot find it. Its email link still opens the
  payment page. That is harmless, but it shows the lookup is a
  workaround for the missing column.
- Stored data. An upgrade migration should delete the queued
  publication fee payments, and their tasks, of every submission that
  already has a completed publication fee payment. It is not tried
  here.
- Backport. 3.5 takes the diff as it is. 3.4 and 3.3 have no Eloquent
  `Notification` model (their `QueuedPaymentDAO::deleteById()` calls
  `NotificationDAO::deleteByAssoc()`), so there the lookup is rewritten
  with `NotificationDAO`.
- Guard. A unit test on `fulfillQueuedPayment()`, plus a **Planned**
  item in spec U52: after "Paid" and after "Waived", the Author's Tasks
  panel has no fee task.

Medium: the fix is one method, but the stale tasks already stored need
an upgrade migration to repair them.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js`.
  It records each screen and also reads, without writing, the rows of
  `queued_payments`, the fee tasks in `notifications` and
  `completed_payments` after the requests, after the records and at the
  end. The control is submission 11 ("Unpaid"): with the fix in and
  out, its Author's task must stay. The contact's "Manual Payment
  Notification" is read in the mail catcher.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/fix.diff ojs`,
  a fresh load of the dataset, walk.js with the same command, then
  `revert`. The walk raised no server or script error, with or without
  the fix.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01):
  - main: OJS 68615b5a32 (lib/pkp 25562b0e1a, ui-library 64d67363).
  - stable-3_5_0: OJS 3517e640f2 (lib/pkp b1981810da). The results were
    the same, `payment/pay/1` to `/3` and the notification to the
    contact included.
- Code read on 3.5: `BackendSubmissionsController::payment()` lines
  126–127 and 154–155, `fulfillQueuedPayment()`'s
  `PAYMENT_TYPE_PUBLICATION` case and `QueuedPaymentDAO::deleteById()`
  are as on `main`.
- 3.4, by code: OJS `stable-3_4_0` at 75cc2d488b, pkp-lib at
  32b0f4b4af. `api/v1/_submissions/BackendSubmissionsHandler.php`
  `payment()` queues and fulfils its own payment (lines 127–128 and
  153–154). `RequestPayment::requestPayment()` creates the
  `ASSOC_TYPE_QUEUED_PAYMENT` task. `fulfillQueuedPayment()` deletes
  only the payment it fulfils (line 363). `QueuedPaymentDAO::deleteById()`
  deletes the tasks by assoc through `NotificationDAO::deleteByAssoc()`;
  there is no `classes/notification/Notification.php` model.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, pkp-lib at
  f6ab331645. `BackendSubmissionsHandler.inc.php` `payment()` does the
  same, and lib/pkp `PromoteForm::execute()` queues the request and the
  Authors' tasks. `fulfillQueuedPayment()` and `deleteById()` behave as
  on 3.4.
- Introduced: `git log -S"Record a waived payment"` in OJS finds
  f891410d45, "pkp/pkp-lib#6419 Implement submission payments modal".
  It added the save that fulfils a payment of its own. a31ea7b970 moved
  that code to the API, and later commits only reformatted it
  (`Repo`, `StageAssignment`). The Authors' task is older: `pkp/pkp-lib#1816`, 2017.
- Tracker search, 2026-10-01, in `pkp/pkp-lib`, `pkp/ojs` and
  `pkp/ui-library`. The search used the symptom's words (fee, task,
  paid, waived, notification), `NOTIFICATION_TYPE_PAYMENT_REQUIRED`,
  `fulfillQueuedPayment` and `QueuedPaymentDAO`. Related but not this
  fault:
  - `pkp/pkp-lib#13171` (open), with PR `pkp/ojs#5740` (open): "Waive"
    on the decision's "Request Payment" page still requests the fee.
    That PR waives through a new queued payment and does not touch an
    earlier request.
  - `pkp/pkp-lib#10777` (closed): "Waived" in the menu answered 500.
- MySQL not checked. The fault does not depend on the database.
