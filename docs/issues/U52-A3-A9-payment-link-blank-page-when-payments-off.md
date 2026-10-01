# An author's payment link gives a blank error page, or still asks for the fee, after the journal stops payments

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1624` for `pkp/pkp-lib#1816` · [a0be5199b0](https://github.com/pkp/ojs/commit/a0be5199b0b53ec26faafc7722b97f4eaf6906ae) · 2017-10-23 · Alec Smecher (asmecher); the membership page's crash: no PR, same issue · [4ac6daeac9](https://github.com/pkp/ojs/commit/4ac6daeac98ff7920a3a7a87c80ea6b6bea57cfc) · 2017-10-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a3), [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal requests its publication fee from an author, then stops
taking payments. If it empties "Manual Payment Instructions" (or
PayPal's "Account Name"), the author's "Tasks" link and the link in the
"Payment Request Notification" email fail on the server with a blank
page. If it unticks "Enable" instead, the same links still open the
payment page with the fee and the instructions, and "Send notification
of payment" still emails the journal.

The author expects to be told that the fee is no longer collected.
Once payments stop, the fee no longer holds back publication, so
nothing is lost, but the author is shown an error or asked to pay.

The membership payment page (the journal's address followed by
"user/payMembership", reached only by typing it) gives the same blank
page to a signed-in user on a journal whose payments are not set up,
which is every journal until a manager sets them up.

## Impact

- **Lost.** Nothing held back: the article can be published without
  the fee. The author gets no word that the fee is no longer due, and
  with "Enable" unticked is still asked to pay it, while the journal
  still receives payment notices.
- **Who.** An Author with an unpaid publication fee, on a journal that
  stops payments, or switches to a method it has not set up, after
  requesting the fee. The membership page reaches any signed-in user
  who types its address.
- **Way round.** None needed for publication. The author's task stays
  on their list.

Low: once a journal stops payments the fee holds back nothing, so the
author loses nothing but is shown an error or a request the journal no
longer makes. It would be medium if the fee still held back
publication.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS. Payments are off in it.
- Submission 7, "Developing efficacy beliefs in the classroom", by
  `dsokoloff`, is in Review.

A journal whose payments are not set up:

1. Sign in as `dsokoloff`. Type the journal's address followed by
   `user/payMembership`
   (`/index.php/publicknowledge/en/user/payMembership`).

Requesting a fee:

2. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency" and "Manual Fee
   Payment" under "Payment Plugins", type "Pay by cheque u52r3" in "Manual
   Payment Instructions" and press "Save".
3. Press "Payments" in the side menu, then the "Payment Types" tab.
   Type 50 in "Article Processing Charge" and press "Save".
4. Open submission 7's workflow and press "Accept Submission". On
   "Request Payment" choose "Request publication fee (50 USD)", press
   "Continue" to the last page and press "Record Decision".
5. Sign in as `dsokoloff`. On the dashboard press "Tasks", then the
   task "The publication fee is due for payment." The "Manual Fee
   Payment" page opens with "Fee" "50.00 (USD)". The "Payment Request
   Notification" email's link opens the same address
   (`/index.php/publicknowledge/en/payment/pay/1`).

The instructions emptied:

6. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   empty "Manual Payment Instructions" and press "Save".
7. Sign in as `dsokoloff`. Press "Tasks" and the task again.

"Enable" unticked:

8. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   type "Pay by cheque u52r3" in "Manual Payment Instructions" again and
   press "Save". Untick "Enable" and press "Save".
9. Sign in as `dsokoloff`. Press "Tasks" and the task again, then
   "Send notification of payment".

**Expected.** At step 1 the journal's home page, as the subscription
purchase addresses give on a journal whose payments are not set up. At
steps 7 and 9 the page "Payment" with "A payment has been requested,
but the request has expired. Contact the Journal Manager for details.",
which is what a payment link that no longer leads to a request shows
today; no payment page and no email to the journal.

**Observed.** At steps 1 and 7 the page is blank: the server answers
500 with an empty body and logs

```
PHP Fatal error: Uncaught Error: Call to a member function display() on false in pages/user/UserHandler.php:438
PHP Fatal error: Uncaught Error: Call to a member function display() on false in pages/payment/PaymentHandler.php:77
```

At step 9 the task is still listed, and the payment page opens as at
step 5:

```
Manual Fee Payment
Title  Publication Fee
Fee    50.00 (USD)
Pay by cheque u52r3
Send notification of payment
```

"Send notification of payment" shows "Payment Notification", "Payment
notification sent", "Continue", and the journal's principal contact
(`rvaca`) receives a "Manual Payment Notification".

## Cause

Whether a journal takes payments is the payment manager's question.
`OJSPaymentManager::isConfigured()` is true only when the chosen
method is set up and "Enable" is ticked (`paymentsEnabled`). A method
is set up when its plugin's `isConfigured()` says so: the manual
method needs "Manual Payment Instructions", PayPal needs "Account
Name".

`PaymentHandler::pay()` (`pages/payment/PaymentHandler.php`, lines 57
to 78) never asks it. It looks up the queued payment and calls
`$paymentManager->getPaymentForm($queuedPayment)->display($request)`.
`PaymentManager::getPaymentForm()`
(`lib/pkp/classes/payment/PaymentManager.php`, line 95) checks only
the plugin, so:

- with the method not set up, `getPaymentForm()` returns `false`, and
  `display()` on `false` is the fatal error;
- with "Enable" unticked, the plugin is still set up, so the form is
  returned and shown, and its "Send notification of payment" goes to
  `PaymentHandler::plugin()`, which also asks only the plugin.

`UserHandler::payMembership()` (`pages/user/UserHandler.php`, lines
425 to 439) has the same gap. It queues a membership payment and calls
`display()` on what `getPaymentForm()` returns, with no
`isConfigured()` check. With the method not set up, `queuePayment()`
refuses and `getPaymentForm()` returns `false`: the fatal error. With
the method set up and "Enable" unticked, `queuePayment()` refuses
(it asks `isConfigured()`) but `getPaymentForm()` still returns a form,
for a payment that was never stored.

The publication fee itself is not the problem: the publish check,
`Repository::validatePublish()` (`classes/publication/Repository.php`,
line 144), asks `publicationEnabled()`, which needs `isConfigured()`,
so once payments stop an unpaid fee no longer blocks publishing. Every
other page that shows a payment form asks the manager first as well:
`purchaseSubscription()`, `payPurchaseSubscription()`,
`completePurchaseSubscription()` and `payRenewSubscription()` send the
user to the home page when `isConfigured()` is false, and
`ArticleHandler` and `IssueHandler` call `purchaseArticleEnabled()` or
`purchaseIssueEnabled()`, which call it. Before 4ac6daeac9,
`payMembership()` called `displayPaymentForm()`, which returned
`false` and showed an empty page without a fatal error.

Reach:

- **The author's task and the email's link** (seen in a browser): the
  only `payment/pay/{id}` links. Both are made when the fee is
  requested (`RequestPayment::requestPayment()`): the task's by
  `PKPNotificationManager::getNotificationUrl()`, the email's by
  `PaymentRequest::setupPaymentUrlVariable()`
  (`classes/mail/mailables/PaymentRequest.php`, lines 52 to 64).
- **The membership page** (seen in a browser): reached only by typing
  it; no page links to it.
- **PayPal** (read in the code): an emptied "Account Name" makes
  `PaypalPaymentPlugin::isConfigured()` false, the same path as step 7.
- **OMP** (read in the code): its `PaymentHandler` has no `pay()`, and
  it has no membership; a press's file sales check `isConfigured()`
  first. OPS has no payments.

## Proposed fix

Ask the manager before showing the form, as every other caller does.
The recommendation reuses the two answers the code already gives when
there is nothing to pay: the "Payment" message page for a payment link
and the home page for a membership or subscription address; a message
of its own is an alternative below.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-link-blank-page-when-payments-off/fix.diff):

```diff
--- a/pages/payment/PaymentHandler.php
+++ b/pages/payment/PaymentHandler.php
@@ -64,7 +64,7 @@
         $templateMgr = TemplateManager::getManager($request);
         $queuedPaymentDao = DAORegistry::getDAO('QueuedPaymentDAO'); /** @var QueuedPaymentDAO $queuedPaymentDao */
         $queuedPayment = $queuedPaymentDao->getById($queuedPaymentId = array_shift($args));
-        if (!$queuedPayment) {
+        if (!$queuedPayment || !$paymentManager->isConfigured()) {
             $templateMgr->assign([
                 'pageTitle' => 'common.payment',
                 'message' => 'payment.notFound',
--- a/pages/user/UserHandler.php
+++ b/pages/user/UserHandler.php
@@ -430,6 +430,9 @@
         $user = $request->getUser();
 
         $paymentManager = Application::get()->getPaymentManager($journal);
+        if (!$paymentManager->isConfigured()) {
+            $request->redirect(null, 'index');
+        }
 
         $queuedPayment = $paymentManager->createQueuedPayment($request, OJSPaymentManager::PAYMENT_TYPE_MEMBERSHIP, $user->getId(), null, $journal->getData('membershipFee'));
         $paymentManager->queuePayment($queuedPayment);
```

The `payMembership()` check covers both of its cases: the method not
set up, and "Enable" unticked with a form for a payment never stored.

Tried on OJS `main`: the walk showed the Expected at steps 1, 7 and 9,
with no request failing and no email to the journal. At step 5, with
payments set up, the task still opened "Manual Fee Payment" with "Fee"
"50.00 (USD)", and an unknown request still showed the "Payment" page.

- **Alternatives.**
  - Have `PaymentManager::getPaymentForm()` ask `$this->isConfigured()`
    instead of the plugin. That covers "Enable" for every caller, but
    `pay()` and `payMembership()` would still call `display()` on
    `false`; the handler check is needed either way.
  - A message of its own ("This journal is not taking payments") reads
    better than "the request has expired", at the cost of a new locale
    key in every language.
  - Checking in `PaymentHandler::plugin()` too would stop a notice
    sent from a payment page left open, but `plugin()` also receives
    PayPal's return for a payment already made, which must still be
    recorded; it is left as it is.
  - `membershipEnabled()` (payments set up and a membership fee above
    0) instead of `isConfigured()` in `payMembership()` would also
    stop a membership page with no fee. Whether the membership should
    be offered at all is an open product question (spec U52
    [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a7)),
    so it is left to the team.
- **What goes with it.** Nothing stored changes, and no API or plugin
  hook is touched. The same lines are on 3.5, 3.4 and 3.3 (3.3 in
  `.inc.php` files with tabs, so the diff needs re-making there). The
  test that would have caught it: an e2e check that a fee link opens
  no payment page once "Enable" is unticked or the method is not set
  up (spec U52, a **Planned** item).

Small: one condition in `PaymentHandler::pay()` and three lines in
`UserHandler::payMembership()`.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/payment-link-blank-page-when-payments-off/walk.js),
  with its helpers in the same folder. Run it on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/payment-link-blank-page-when-payments-off/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Step 5 and the
  unknown request are its controls for the fix.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/payment-link-blank-page-when-payments-off/fix.diff ojs`
  and the same walk, then reverted.
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets c657990 (2026-10-01).
- Tips: OJS `main` 68615b5a32 (pkp-lib 25562b0e1a), `stable-3_5_0`
  3517e640f2 (pkp-lib b1981810da), `stable-3_4_0` 75cc2d488b (pkp-lib
  32b0f4b4af), `stable-3_3_0` ac77c9fb35 (pkp-lib f6ab331645).
- Code reads:
  - `PaymentHandler::pay()` and `plugin()`, `UserHandler::payMembership()`
    and the four subscription operations, `OJSPaymentManager::isConfigured()`,
    `PaymentManager::getPaymentForm()` and the two payment plugins on
    each branch.
  - Every `getPaymentForm(` and `isConfigured()` caller in OJS and its
    pkp-lib on `main`; `Repository::validatePublish()`;
    `PaymentRequest` and `RequestPayment`; OMP's
    `pages/payment/PaymentHandler.php`.
  - Blame of `pay()` through the PSR-12 reformat (665ed1f925).
- Not driven: "Paypal Fee Payment"; publishing submission 7 once
  payments stopped (the publish check read in the code).
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library
  for a blank or failing payment page, payments disabled, manual
  payment instructions, `payMembership`, `getPaymentForm`,
  `PaymentHandler`, "display() on false".
