# An author's "publication fee is due" task stays after the editor records the fee as paid or waived

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#3018` for `pkp/pkp-lib#6419` · [f891410d45](https://github.com/pkp/ojs/commit/f891410d45bffedc7b55c802b0b48828efa271d1) · 2021-01-26 · Alec Smecher (asmecher), re-making in the new "Payments" menu the fault the 3.1 form had
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

After an editor records an author's publication fee as "Paid" or
"Waived" in the workflow's "Payments" menu, the author's Tasks still
read "The publication fee is due for payment.". That task, and the link
in the author's "Payment Request Notification" email, still open the
payment page with the full fee. On that page, "Send notification of
payment" still emails the journal that the author has paid.

Saving the fee emails nobody, so an author whose fee was waived, or
already paid, is still asked to pay it. They may pay again, and on a
journal using PayPal the site would charge them a second time.

It happens on every journal that charges an article processing charge,
each time a requested fee is recorded in the "Payments" menu.

## Impact

- **Lost:** the author's money. Nothing tells the author that the fee
  is settled, and the task asks them to pay it.
  - With "Manual Fee Payment" they may transfer the fee again outside
    the site. The journal then gets a "Manual Payment Notification"
    that does not say the fee was already recorded or waived.
  - With "Paypal Fee Payment" the page sends them on to PayPal for the
    full fee. Paying there charges them a second time and records a
    second payment for the article (read in the code, not walked).
- **Who:** the authors of articles whose fee was requested on
  acceptance and then recorded in the "Payments" menu. With the manual
  method the menu is the only way a fee gets recorded, so this is every
  author asked to pay. With PayPal, it is every author whose fee was
  waived or settled outside PayPal.
- **Way round:** the author can tick the task and press "Delete", but
  the email's link still opens the payment page. The journal has no
  screen that withdraws a request, and requests never expire.

High: the author has no way to tell that the fee is settled, because
the site keeps asking for it and tells them nothing else. That holds on
every APC-charging journal (walked with the manual method), and silence
raises a misleading task one level. On a PayPal journal the site would
also take the money a second time (read in the code).

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (payments are off in it).
  The principal contact is Ramiro Vaca (`rvaca`).
- Payments on, with a publication fee: sign in as `rvaca`, open
  Settings › Distribution › "Payments". Tick "Enable", choose "Currency"
  "US Dollar" and "Payment Plugins" "Manual Fee Payment", type "Pay by
  bank transfer." in "Manual Payment Instructions", press "Save". In
  the side menu open "Payments" › "Payment Types", type 50 in "Article
  Processing Charge", press "Save".
- The fee requested: sign in as `dbarnes`, open submission 4, "Computer
  Skill Requirements for New and Existing Teachers: Implications for
  Policy and Practice" (author `cmontgomerie`). Press "Accept and Skip
  Review". On "Request Payment" keep "Request publication fee (50 USD)"
  chosen, press "Continue", "Continue", then "Record Decision".

Paid:

1. Sign in as `cmontgomerie` and press the tasks bell. The task "The
   publication fee is due for payment." is listed, with the article's
   title under it.
2. Sign in as `dbarnes` and open submission 4. In the workflow header
   press "Payments", choose "Paid" and press "Save". "Saved" shows.
3. Sign in as `cmontgomerie` and press the tasks bell.
4. Press "The publication fee is due for payment.".
5. Press "Send notification of payment".
6. In the "Payment Request Notification" email `cmontgomerie` received,
   press the link.

Waived:

7. Sign in as `dbarnes`, open submission 4, press "Payments", choose
   "Waived" and press "Save".
8. Sign in as `cmontgomerie`, press the tasks bell, then the task.

Step 7 waives a fee that was recorded "Paid". A fee waived straight
from "Unpaid" leaves the author's request open in the same way: that
path only skips deleting the paid record (read in the code).

**Expected:** from step 3 on, the Tasks window no longer lists "The
publication fee is due for payment.". The email's link shows the
"Payment" page that a request no longer open shows ("A payment has been
requested, but the request has expired. Contact the Journal Manager for
details."), with nothing to pay.

**Observed:** at step 3 the bell reads "Tasks 1" and the window still
lists "The publication fee is due for payment." with the title. Step 4
opens `/index.php/publicknowledge/en/payment/pay/1`, the "Manual Fee
Payment" page: "Title" "Publication Fee", "Fee" "50.00 (USD)", "Pay by
bank transfer.", "Send notification of payment". Step 5 shows "Payment
Notification", "Payment notification sent" and "Continue", and
rvaca@mailinator.com receives a "Manual Payment Notification". Step 6
opens the same "Manual Fee Payment" page. After "Waived", step 8 shows
the same task and the same page again.

## Cause

On the accept decision, `RequestPayment::requestPayment()` (OJS
`classes/decision/types/traits/RequestPayment.php`) stores a request for
the fee (`PaymentManager::queuePayment()`). It gives each assigned
author a `NOTIFICATION_TYPE_PAYMENT_REQUIRED` task that points at that
request, and emails them a link to `payment/pay/<id>`. The request and
its tasks go away only through `QueuedPaymentDAO::deleteById()`. That is
called only when that same request is paid online:
`OJSPaymentManager::fulfillQueuedPayment()` (line 363) deletes the
request it fulfils.

The "Payments" menu saves through `BackendSubmissionsController::payment()`
(OJS `api/v1/_submissions/BackendSubmissionsController.php`). For "Paid"
(line 146) and "Waived" (line 118), it creates a request of its own and
fulfils it at once. The author's request is never touched.
`fulfillQueuedPayment()` does nothing of its own for a publication fee
(line 351, `$returner = true`, the same branch as an article or issue
purchase), so it never looks for the submission's other requests.

The menu came in 2021 (`pkp/pkp-lib#6419`), after 3.2 had dropped any
way to record the fee by hand. It copied the pattern of the 3.1 form
`IssueEntryPublicationMetadataForm`, which had left the author's request
open since the task was added in 2017 (`pkp/pkp-lib#1816`).

Reach:

- A submission can hold a second open request. "Move to Submission" or
  "Move to Review" (`BackFromCopyediting`) takes an accepted submission
  back, and a second accept decision then requests the fee again. Paying
  either request online leaves the other open (read in the code, not
  walked).
- The open PR `pkp/ojs#5740` makes the accept decision's "Waive" record
  a waiver through `fulfillQueuedPayment()`. Taken after such a move
  back, it leaves the first decision's request open the same way (read
  in the code).
- OMP and OPS have no publication fee (checked in the code).

## Proposed fix

When `OJSPaymentManager::fulfillQueuedPayment()` records a submission's
publication fee, delete that submission's open fee requests with
`QueuedPaymentDAO::deleteById()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/fix.diff)):

```diff
+                case self::PAYMENT_TYPE_PUBLICATION:
+                    // The fee is settled: close the requests still open for it.
+                    $this->deletePublicationFeeRequests($queuedPayment->getAssocId());
+                    $returner = true;
+                    break;
 ...
+    protected function deletePublicationFeeRequests(int $submissionId): void
+    {
+        $queuedPaymentDao = DAORegistry::getDAO('QueuedPaymentDAO'); /** @var QueuedPaymentDAO $queuedPaymentDao */
+        $requestIds = Notification::withContextId($this->_context->getId())
+            ->withType(Notification::NOTIFICATION_TYPE_PAYMENT_REQUIRED)
+            ->where('assoc_type', Application::ASSOC_TYPE_QUEUED_PAYMENT)
+            ->pluck('assoc_id')
+            ->unique();
+        foreach ($requestIds as $requestId) {
+            $request = $queuedPaymentDao->getById($requestId);
+            if ($request && $request->getType() == self::PAYMENT_TYPE_PUBLICATION && $request->getAssocId() == $submissionId) {
+                $queuedPaymentDao->deleteById($requestId);
+            }
+        }
+    }
```

Every recorded fee is written through `fulfillQueuedPayment()`: the
menu's "Paid" and "Waived", a PayPal payment, and the decision's "Waive"
in `pkp/ojs#5740`. A request is stored serialized, with no submission
column, so a submission's requests can only be found through the tasks
that point at them.

The helper reads every open fee task in the journal and loads each
task's request, each time a fee is recorded. With the fix, settled
requests are deleted, so that set stays at the journal's unpaid
requests, and the cost is acceptable. It could be narrowed to the
submission's assigned authors (`user_id`). An author unassigned after
the request would then keep the task.

Tried on OJS `main`. After "Paid" and after "Waived" the task is gone,
and the email's link shows the page Expected describes. A second walk
requested the fee on submissions 4 and 8, recorded 4 as "Paid", then
saved 8 as "Unpaid". The task for submission 8 stayed through both
saves and still opened the "Manual Fee Payment" page.

Alternatives:

- Delete the request only in `BackendSubmissionsController::payment()`.
  That misses a second request that stays open when the first is paid
  online, and the `pkp/ojs#5740` "Waive" after a move back.
- In the menu, fulfil the author's request instead of creating a new
  one. The request is stored under the editor's id (`pkp/pkp-lib#12885`),
  so the editor would be recorded as the payer. A submission may also
  have no request, or several.
- Check in `PaymentHandler::pay()` whether the fee is already recorded.
  That fixes the link but leaves the task listed, and it fixes a reader
  of the bad state instead of its writer.

What goes with it:

- An upgrade migration that runs the same lookup for every submission
  with a recorded publication fee (`completed_payments` of type
  `PAYMENT_TYPE_PUBLICATION`). It closes the requests that fees recorded
  before the fix left open. Not tried.
- Left out: a request whose tasks the authors have all deleted. The
  lookup cannot find it, so its email link stays open. Finding it would
  need the submission stored as a column of `queued_payments`.
- Behaviour change: once "Paid" or "Waived" is saved, the request is
  gone. Saving "Unpaid" afterwards does not bring the author's task
  back, so the editor asks the author again by email.
- Backport: the diff applies as it stands to 3.5. 3.4 has no Eloquent
  `Notification` model, so the lookup goes through the `notifications`
  table as `NotificationDAO` reads it. 3.3 needs the same in
  `OJSPaymentManager.inc.php`.
- Tests: a unit test on `fulfillQueuedPayment()` that queues two
  requests for one submission (as two accept decisions do) and records
  the fee, expecting both requests and their tasks gone. Also an end-to-end
  test that records "Paid" and expects no task, and the "Payment" page
  at the email's link.

Medium: about twenty lines in one class, plus an upgrade migration to
close the requests already left open.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js)
  takes the Steps.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/neighbour.js)
  is the two-submission walk.
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/lib.js)
  holds the steps they share. Run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL. The Steps and
  Observed were the same on both, and no request answered a server
  error.
- Tips: OJS `main` bade233f73, its lib/pkp 2e377d27fc; OJS
  `stable-3_5_0` 92b9a16b48, lib/pkp a9c76aed62; OJS `stable-3_4_0`
  9571d8fde7, lib/pkp df13621c2d; OJS `stable-3_3_0` 9fdb9bcf9a, lib/pkp
  d446601ebe.
- PayPal, read in the code on `main`: `PaymentHandler::pay()` shows the
  form of the method chosen now. `PaypalPaymentForm::display()` sends
  the payer to PayPal for the request's amount. On return,
  `PaypalPaymentPlugin::handle()` completes the purchase, checks only
  that the amount and currency match the request, and calls
  `fulfillQueuedPayment()`. That inserts a completed payment without
  checking for one already recorded. Not walked: the test installs reach
  no PayPal account.
- Other versions: on 3.5 the files are unchanged and the diff applies
  cleanly. On 3.4 and 3.3, the menu's handler (`BackendSubmissionsHandler`)
  creates and fulfils its own request in the same way. The request and
  task come from `RequestPayment` on 3.4 and from `PromoteForm` on 3.3,
  and `deleteById()` deletes a request's tasks there too.
- Introduced: `git blame` on the menu's branches gives 665ed1f925, the
  2021 PSR-12 reformat. Before it, they come from a31ea7b970, which
  moved them from `SubmissionPaymentsHandler` into the API, and that
  handler from f891410d45. Just before f891410d45 no OJS code recorded a
  fee by hand. The 3.1 form `IssueEntryPublicationMetadataForm` already
  created its own request when the task and its request were added
  (pkp-lib
  [30b09ab911](https://github.com/pkp/pkp-lib/commit/30b09ab911b3869be2ef28f298ded4c3a23f06af)
  and OJS
  [a0be5199b0](https://github.com/pkp/ojs/commit/a0be5199b0b53ec26faafc7722b97f4eaf6906ae),
  2017, PRs `pkp/pkp-lib#2929` and `pkp/ojs#1624`).
- Upstream: two related issues are not this fault. `pkp/pkp-lib#13171`
  is the decision's "Waive" still requesting the fee (PR `pkp/ojs#5740`),
  and `pkp/pkp-lib#12885` is the request stored under the editor's id.
- Unverified: a second request reached through "Move to Submission" and
  a second accept decision, and the waiver from "Unpaid", were both read
  in the code, not walked. MySQL not checked; nothing here depends on
  the database.
