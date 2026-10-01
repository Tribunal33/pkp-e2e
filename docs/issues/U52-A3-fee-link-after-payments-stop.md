# After a journal stops payments, an author's publication fee link still sends "paid" notifications, or shows an empty page

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1624` for `pkp/pkp-lib#1816` · [a0be5199b0](https://github.com/pkp/ojs/commit/a0be5199b0b53ec26faafc7722b97f4eaf6906ae) · 2017-10-23 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in## Summary

A journal requests an author's publication fee and later stops taking
payments. The author's task "The publication fee is due for payment."
and the link in their "Payment Request Notification" email then behave
in one of two ways, depending on how payments were stopped:

- If the journal empties "Manual Payment Instructions", the link fails
  on the server and the author gets an empty page.
- If the journal unticks "Enable" instead, the link still opens the
  payment page with the fee and the old instructions. Its "Send
  notification of payment" still emails the journal that the author
  has paid.

The author expects a page saying that the fee no longer has to be
paid. Instead, they get no answer at all, or a page asking them to pay
a fee the article no longer needs before it can be published. Nothing
the journal can do on screen closes the open request.

## Impact

- **Lost:** with the manual method no money moves through the site.
  The author may still transfer the fee by the old instructions and
  press the button. The journal then gets a "Manual Payment
  Notification" email, and nothing is recorded as paid. With the
  instructions emptied, the author gets an empty page and no message.
- **Who:** authors with a fee request still open when the journal
  switches payments off or empties the instructions. That is a rarely
  met state: a journal changing its payment settings while a fee is
  outstanding.
- **Way round:** none for the link. The journal has no screen that
  closes a fee request, and with payments off its "Payments" menu is
  gone from the workflow. Turning payments back on makes the link work
  again. The author can delete the task, but the email's link stays.

Medium: the author is misled or meets a server error, with no way for
the journal to close the request. What would raise it: if the journal
uses "Paypal Fee Payment" and unticks "Enable", the link sends the
author on to PayPal, where money would be taken (read in the code, not
walked).

t walked).

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

Control:

1. Sign in as `cmontgomerie`. On the Dashboard press the tasks bell,
   then "The publication fee is due for payment." (the article's title
   is under it). The "Manual Fee Payment" page opens with "Fee" "50.00
   (USD)", the instructions and "Send notification of payment".

Payments switched off:

2. Sign in as `rvaca`. On Settings › Distribution › "Payments" untick
   "Enable" and press "Save".
3. Sign in as `cmontgomerie` and press the task again.
4. Press "Send notification of payment".

Instructions emptied:

5. Sign in as `rvaca`. On Settings › Distribution › "Payments" tick
   "Enable" (the fields come back with their saved values), empty
   "Manual Payment Instructions" and press "Save".
6. Sign in as `cmontgomerie` and press the task again.

**Expected:** at steps 3 and 6, a "Payment" page saying the request is
no longer open (as the page does for a request that no longer exists:
"A payment has been requested, but the request has expired. Contact the
Journal Manager for details."), with nothing to pay and no "Send
notification of payment".

**Observed:** at step 3 the same "Manual Fee Payment" page as in step 1:
"Title" "Publication Fee", "Fee" "50.00 (USD)", "Pay by bank
transfer.", "Send notification of payment". Step 4 shows "Payment
Notification", "Payment notification sent" and "Continue", and
rvaca@mailinator.com receives a "Manual Payment Notification" from the
author. At step 6 the page is empty: `GET
/index.php/publicknowledge/en/payment/pay/1` answers 500, and the
server logs:

```
PHP Fatal error:  Uncaught Error: Call to a member function display() on false in …/pages/payment/PaymentHandler.php:77
#0 [internal function]: APP\pages\payment\PaymentHandler->pay(Array, Object(APP\core\Request))
```

## Cause

The task and the email both link to `payment/pay/<id>`, which
`PaymentHandler::pay()` serves (OJS `pages/payment/PaymentHandler.php`).
It checks that the user is signed in and that the request exists. It
then calls `$paymentManager->getPaymentForm($queuedPayment)->display($request)`
without asking whether the journal still takes payments.

Two checks are involved, and they mean different things:

- **The method is configured:** its own settings are filled in. For the
  manual method that is a non-empty `manualInstructions`
  (`ManualPaymentPlugin::isConfigured()`).
- **The journal takes payments:** the method is configured *and*
  "Enable" is ticked. `OJSPaymentManager::isConfigured()` is this check.

`PaymentManager::getPaymentForm()` (lib/pkp) uses only the first. It
returns the method's form while the method is configured, and `false`
otherwise. So:

- **Instructions emptied:** the method is no longer configured.
  `getPaymentForm()` returns `false`, and `pay()` calls `display()` on
  it, which is the fatal error above.
- **"Enable" unticked:** the method is still configured, so
  `getPaymentForm()` returns the normal form. Nothing on the way reads
  `paymentsEnabled`.

The rule that breaks is "a journal that does not take payments shows no
payment page". `pay()` was added without the second check by the change
that brought the fee's task (`pkp/ojs#1624`). Every other OJS entry
point that shows a payment form, except `payMembership()` (below),
makes it first, directly or through `publicationEnabled()`, `purchaseArticleEnabled()`,
`purchaseIssueEnabled()` and `membershipEnabled()`. Requests carry no
expiry, and only a completed online payment deletes one
(`OJSPaymentManager::fulfillQueuedPayment()`). So the link stays live
for as long as the request exists.

Reach:

- `UserHandler::payMembership()` (the membership address, spec U52
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a9))
  is the other entry point that never asks. With the method not
  configured, it fails with the same `display()` on `false`. With
  "Enable" unticked, `queuePayment()` refuses to store the payment
  (it checks `isConfigured()`), but `getPaymentForm()` still returns a
  real form, so the page shows a payment that was never stored (checked
  in the code).
- `PaymentHandler::plugin()`, which serves "Send notification of
  payment" and PayPal's return, checks only that the method is
  configured (checked in the code). Its notification is reached only
  from the page `pay()` shows.
- OMP has no publication fee and no `pay` page. A book's "Purchase"
  link makes a new request each time, and only once
  `OMPPaymentManager::isConfigured()` passes (checked in the code). OPS
  has no payments.

## Proposed fix

Make `PaymentHandler::pay()` refuse a request while the journal does
not take payments. It should show the page it already shows for a
request that no longer exists
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-link-after-payments-stop/fix.diff)):

```diff
         $queuedPayment = $queuedPaymentDao->getById($queuedPaymentId = array_shift($args));
-        if (!$queuedPayment) {
+        // A request made while the journal took payments is no longer served
+        // once it stops (payments disabled, or the payment method not configured).
+        if (!$queuedPayment || !$paymentManager->isConfigured()) {
             $templateMgr->assign([
                 'pageTitle' => 'common.payment',
                 'message' => 'payment.notFound',
```

One check covers both cases. The request is kept, so the link works
again if the journal starts taking payments again. `payment.notFound`
("…the request has expired. Contact the Journal Manager for details.")
is an existing string, so nothing new needs translating.

Tried on OJS `main`. With the fix in, steps 3 and 6 show the "Payment"
page with that sentence: no server error and no "Send notification of
payment". With "Enable" ticked again, the same request opens the
"Manual Fee Payment" page and its notification is sent, as before. The
address of a request that does not exist shows the same page as before
the fix.

Alternatives:

- Make `getPaymentForm()` throw instead of returning `false`, as the
  open clean-up `pkp/pkp-lib#9033` does. The request would still fail on
  the server, and the "Enable" case would not change.
- Check `paymentsEnabled` in `PaymentHandler::plugin()` too. PayPal's
  return also goes through it, and refusing it would leave a payment
  PayPal has already taken unrecorded.
- Delete open requests and their tasks when payments are switched off.
  A journal that switches back on would lose them, and it needs a
  product decision.

What goes with it:

- The same guard in `UserHandler::payMembership()`, before it queues the
  membership payment (spec U52 A9).
- No stored data to repair. The diff applies as it stands to 3.5 and
  3.4. 3.3 needs the same condition in `pages/payment/PaymentHandler.inc.php`.
- A test that opens a fee link after payments are switched off and
  expects the "Payment" page.

Small: one condition in one handler, no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-link-after-payments-stop/walk.js)
  takes the Steps on a freshly loaded default dataset, through the
  screens, and reads the principal contact's mailbox and the server log.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/fee-link-after-payments-stop/neighbour.js)
  checks what the fix must leave alone. Run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/fee-link-after-payments-stop/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Without the fix,
  neighbour.js's first step shows the "Manual Fee Payment" page, as in
  Observed.
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL. The datasets
  came from pkp/datasets 38ab955 (2026-09-30). The Steps and Observed
  were the same on both lines.
- Tips: OJS `main` bade233f73, its lib/pkp 2e377d27fc; OJS
  `stable-3_5_0` 92b9a16b48, lib/pkp a9c76aed62; OJS `stable-3_4_0`
  9571d8fde7, lib/pkp df13621c2d; OJS `stable-3_3_0` 9fdb9bcf9a, lib/pkp
  d446601ebe.
- Code reads: `PaymentHandler::pay()` and `plugin()`, `OJSPaymentManager::isConfigured()`
  and its `*Enabled()` helpers, `PaymentManager::getPaymentForm()`,
  `ManualPaymentPlugin::isConfigured()` and `handle()`,
  `UserHandler::payMembership()`, and OMP's `PaymentHandler`,
  `CatalogBookHandler` and `OMPPaymentManager`, on `main`. On 3.5, 3.4
  and 3.3, `pay()`, `getPaymentForm()` and `OJSPaymentManager::isConfigured()`
  are the same as on `main` (3.3 in its `.inc.php` files).
- Introduced: `git blame` on `pay()` gives 665ed1f925, the 2021 PSR-12
  reformat. Blaming the file as it was before that commit gives
  a0be5199b0, which added `pay()` for the APC task. `PaymentManager::getPaymentForm()` already returned
  `false` for a method not configured (lib/pkp 280d285489, 2017-10-05).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  symptom ("payment page blank", "manual payment instructions empty",
  "payment link payments disabled") and for `PaymentHandler`,
  `getPaymentForm` and the error line. Only `pkp/pkp-lib#9033` touches
  this code, and it is not a fix (see Alternatives).
- Not walked: PayPal as the method, since the test installs reach no
  PayPal account. That with "Enable" unticked the link sends the author
  on to PayPal and money is taken is read in the code
  (`PaypalPaymentForm::display()`) and stays unverified. 3.4 and 3.3
  were read in the code only. MySQL not checked; nothing
  here depends on the database.
