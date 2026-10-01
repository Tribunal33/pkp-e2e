# A reader who opens the membership payment address while the journal takes no payments gets an empty page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** commit for `pkp/pkp-lib#1816` (no PR) · [4ac6daeac9](https://github.com/pkp/ojs/commit/4ac6daeac98ff7920a3a7a87c80ea6b6bea57cfc) · 2017-10-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a9) (signed in, payments off; the same entry's signed-out failure has its own cause, filed as [pkp-e2e#6](https://github.com/jardakotesovec/pkp-e2e/issues/6))
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A signed-in user who types the journal's address followed by
"user/payMembership" on a journal that takes no payments gets an empty
page: the server fails. The journal's other payment addresses lead to
the home page while payments are off, and this one should too.

It happens whether payments were never set up (the default) or the
manager later unticked "Enable" under the payment settings. Nothing can
be paid on such a journal, so nothing is lost, but the user gets no
explanation.

No page, button, link or email in OJS 3 leads to this address. OJS 2's
"User Home" page linked to it as "Buy Individual Membership" and "Renew
Membership", so the users who meet it are those who saved that link
before their journal moved to OJS 3.

## Impact

- **Lost:** nothing. The user sees an empty page, and the journal learns
  of it only from the error in the server's PHP log.
- **Who:** signed-in users who open a saved membership address from OJS
  2, on a journal whose payments are not set up or are turned off. OJS 2
  showed the link only while payments and a membership fee were on, and
  OJS 3.0 came out in 2016, so few such addresses remain.
- **Way round:** none needed; the user goes back to the home page by
  hand.

Low: a server error on an address no OJS 3 screen leads to, where nothing
could have been paid anyway. It would be medium if a page or email linked
to the address.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
  Payments are off in it and no payment method is chosen.
- PHP with assertions off (`zend.assertions = -1` in `php.ini`), the
  production setting. With assertions on, as in PHP's development
  `php.ini`, every signed-in step below (the control, step 5, included)
  fails earlier with `Uncaught AssertionError: assert(false) in
  …/classes/payment/ojs/OJSPaymentManager.php:115` (see Cause).
- Users: `amwandenga` (Alan Mwandenga, a reader) and `rvaca` (Ramiro
  Vaca, the journal manager).

Payments never set up:

1. Sign in as `amwandenga`.
2. Open `/index.php/publicknowledge/en/user/payMembership`.

Payments set up, then turned off:

3. Sign in as `rvaca`. Open Settings › Distribution, tab "Payments".
   Tick "Enable", choose "Currency" "US Dollar" and "Payment Plugins"
   "Manual Fee Payment", type "Pay by bank transfer." in "Manual Payment
   Instructions", and press "Save".
4. Reload the page, open "Payments" in the side menu, then the tab
   "Payment Types". Type 20 in "Association Membership" and press "Save".
5. Sign in as `amwandenga` and open the address of step 2.
6. Sign in as `rvaca`. On Settings › Distribution › "Payments" untick
   "Enable" and press "Save".
7. Sign in as `amwandenga` and open the address of step 2 again.

**Expected.** At steps 2 and 7, the journal's home page, as the
subscription purchase and renewal addresses show while payments are not
set up. No payment is requested.

**Observed.** Step 2 answers HTTP 500, an empty page. The server log:

```
Invalid payment type "1"
PHP Fatal error:  Uncaught Error: Call to a member function display() on false in …/pages/user/UserHandler.php:438
[500]: GET /index.php/publicknowledge/en/user/payMembership
```

Step 7 answers HTTP 500 too, an empty page:

```
Invalid payment type "1"
PHP Fatal error:  Uncaught Error: Typed property PKP\payment\Payment::$paymentId must not be accessed before initialization in …/lib/pkp/classes/payment/Payment.php:63
[500]: GET /index.php/publicknowledge/en/user/payMembership
```

The control, step 5, with payments set up, opens "Manual Fee Payment"
with "Title" "Individual Membership Fee", "Fee" "20.00 (USD)", "Pay by
bank transfer." and "Send notification of payment".

## Cause

`UserHandler::payMembership()` in OJS
([pages/user/UserHandler.php, lines 425–439](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/user/UserHandler.php#L425-L439))
queues a membership payment and shows the payment method's form. It
never asks whether the journal takes payments. The four other payment
operations in the same class (`purchaseSubscription()`,
`payPurchaseSubscription()`, `completePurchaseSubscription()` and
`payRenewSubscription()`) each ask `$paymentManager->isConfigured()`
first, and send the user to the home page when it is false. The article
and issue pages ask `purchaseArticleEnabled()`, `purchaseIssueEnabled()`
and `membershipEnabled()`.

`OJSPaymentManager::isConfigured()` is false in two cases, and each fails
in its own way:

- **No method set up** (the dataset's state, or "Manual Payment
  Instructions" empty). `queuePayment()` writes nothing, and
  `PaymentManager::getPaymentForm()` returns `false`. Line 438 then
  calls `display()` on `false`. That call came with 4ac6daeac9
  ("Fix renewal payment form call"), which replaced
  `$paymentManager->displayPaymentForm()`. The old method also returned
  `false` when no method was set up, but without an error, so the
  address showed an empty page that answered 200. `payMembership()` has
  never checked the payment settings, since it was added in 2007
  (1d62659ec4).
- **"Enable" unticked, method still set up.** `queuePayment()` again
  writes nothing, so the payment never gets an ID. `getPaymentForm()`
  checks only the method's own `isConfigured()`, so it goes on to
  `ManualPaymentPlugin::getPaymentForm()`, which reads
  `$queuedPayment->getId()` while building the form
  ([line 154](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/paymethod/manual/ManualPaymentPlugin.php#L154)).
  Since pkp-lib
  [9ad8c699ea](https://github.com/pkp/pkp-lib/commit/9ad8c699ea2e9fec240a1321655914440474e0c1)
  (`pkp/pkp-lib#10877`, 2025) `Payment::getId(): int` fails on an ID that
  was never set. So this case fails in the `getPaymentForm()` call on
  line 437, before `display()`.

Where the same fault reaches, and how each was checked:

- A signed-out visitor fails earlier, at `$user->getId()` on line 434.
  That cause is separate: OJS's `UserHandler` has no sign-in policy
  ([pkp-e2e#6](https://github.com/jardakotesovec/pkp-e2e/issues/6)).
  Reproduced on screen.
- Payments on, but no "Association Membership" fee: nothing fails, but
  the "Manual Fee Payment" page opens without a "Fee" row and stores a
  payment request with no amount. Reproduced on screen.
- `OJSPaymentManager::createQueuedPayment()` has treated the membership
  type as deprecated since 1f0a80197d (2017, "deprecated payments
  cleanup"): it logs `Invalid payment type "1"`, runs `assert(false)`,
  and sets no return address. With assertions off, only the log line is
  written, on every visit. With assertions on, every signed-in visit
  fails there, whatever the payment settings. Reproduced on screen both
  ways on `main`.
- The only references to `payMembership` in OJS 3 are
  `pages/user/index.php` and the handler (checked in the code). OJS 2's
  `templates/user/index.tpl` linked to it until 452a72ee9c ("Remove user
  home", 2013), which first shipped in OJS 3.0.0; the `ojs-stable-2_4_8`
  branch still has the link.
- The failing visits store nothing: the queued payments table had the
  same rows before and after steps 2 and 7.
- OMP and OPS have no such operation (`pages/user/index.php`, checked in
  the code).

## Proposed fix

A proposal; the team decides. Give `payMembership()` the check its
sibling operations make, and send the user to the home page while the
journal takes no membership payment
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/membership-address-payments-off-empty-page/fix.diff)):

```diff
         $paymentManager = Application::get()->getPaymentManager($journal);
+        // As the other payment operations here: no payment while the journal
+        // takes none (payments off, no method set up) or sets no membership fee.
+        if (!$paymentManager->membershipEnabled()) {
+            $request->redirect(null, 'index');
+        }
 
         $queuedPayment = $paymentManager->createQueuedPayment($request, OJSPaymentManager::PAYMENT_TYPE_MEMBERSHIP, $user->getId(), null, $journal->getData('membershipFee'));
```

The check belongs in the handler, as for its four siblings, since the
handler decides whether a payment is offered at all.
`membershipEnabled()` is the helper the issue and article pages already
use for memberships. It is `isConfigured()` plus a membership fee above
0, so it also stops the payment page that has no amount.

Tried on `main`. With the fix in, steps 2 and 7 land on the journal's
home page with no server error, and so does the address with no
membership fee set. The control, step 5, still opens the "Manual Fee
Payment" page for 20.00 (USD).

**A question for the team.** Should OJS 3 keep the membership payment at
all? No screen has offered it since OJS 2, and the payment manager has
treated its type as invalid since 2017. Yet the "Association Membership"
fee is still on "Payment Types", and a recorded membership would still
open restricted galleys. If memberships are not coming back, the better
change is to remove `payMembership()`, its case in `pages/user/index.php`
and the fee setting, and this check is not needed. If they are coming
back, this check stays, and the type needs its deprecation lifted in
`createQueuedPayment()`.

**Alternatives**

- Make `getPaymentForm()` throw instead of returning `false`, as the
  clean-up in the open `pkp/pkp-lib#9033` does. The address would still
  fail on the server, and the "Enable" case would not change.
- Check `isConfigured()`, exactly as the siblings do. This leaves the
  payment page with no amount when no membership fee is set.

**What goes with it**

- Signed-out visitors: with this fix alone, a signed-out visitor on a
  journal without payments lands on the home page. With payments set
  up, they still get the server error until the fix for pkp-e2e#6 sends
  them to Login. The two fixes do not conflict, since that one adds a
  policy that runs before the handler.
- No stored data to repair, and no API or plugin hook changes.
- Backport: `fix.diff` applies as written to 3.5. On 3.4 the line above
  the new check reads `Application::getPaymentManager($journal)`, so
  3.4 needs its own diff with the same added lines
  ([fix-3_4.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/membership-address-payments-off-empty-page/fix-3_4.diff)).
  3.3 needs the same lines, tab-indented, in
  `pages/user/UserHandler.inc.php`. `membershipEnabled()` exists on all
  three.
- Test: an e2e check that the membership address, with payments off,
  leads to the home page.

Small: one check in one method, following its sibling operations.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/membership-address-payments-off-empty-page/walk.js)
  takes the Steps on a freshly loaded default dataset. It records each
  page's status, the server log's new lines and the number of stored
  payment requests. It also opens the address signed out (before step 1,
  and after step 5), and opens it with payments on again and
  "Association Membership" emptied. Run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/membership-address-payments-off-empty-page/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried on `main` with the same script; without the fix the
  script gave the Observed above.
- `fix.diff` was checked with `patch --dry-run` against `stable-3_5_0`'s
  `pages/user/UserHandler.php` (applies) and `stable-3_4_0`'s (fails);
  `fix-3_4.diff` was checked the same way against `stable-3_4_0`'s
  (applies). Neither was walked on those lines.
- PHP: the Observed walks ran with `zend.assertions = -1`. A first walk
  on `main` with `zend.assertions = 1` failed at `assert(false)` on
  every signed-in visit, step 5 included.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), OJS `main` and `stable-3_5_0`. Both
  gave the same results. MySQL not checked; nothing here depends on the
  database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads on 3.4 and 3.3: `payMembership()` is the same
  (`pages/user/UserHandler.inc.php` on 3.3), apart from the
  `Application::getPaymentManager()` line. `PaymentManager::getPaymentForm()`
  returns `false`, and `queuePayment()` writes nothing, while no method
  is set up. `OJSPaymentManager::isConfigured()` includes
  `paymentsEnabled`. So step 2 fails at `display()` on `false` there
  too. `Payment::getId()` has no return type on 3.4 and 3.3, so step 7
  would open the "Manual Fee Payment" page for a request that was never
  stored, instead of failing (read in the code, not walked).
- Introduced: `git blame` on lines 437–438 gives 665ed1f925 (the 2021
  PSR-12 reformat). Before it, `git log -L` gives 4ac6daeac9
  (2017-10-06, `pkp/pkp-lib#1816`, a direct commit with no PR), which
  replaced `displayPaymentForm()` with `getPaymentForm()->display()` in
  `payRenewSubscription()` and `payMembership()`. The step 7 failure
  line, `Payment::getId(): int`, came with pkp-lib 9ad8c699ea
  (`pkp/pkp-lib#10877` for `pkp/pkp-lib#10834`, 2025-02-12, Touhidur
  Rahman, touhidurabir). The OJS 2 link: `git log -S payMembership --
  templates` gives 1d62659ec4 (added, 2007) and 452a72ee9c (removed,
  2013); `git merge-base --is-ancestor` puts 452a72ee9c in `ojs-3_0_0-0`
  and not in `ojs-stable-2_4_8`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-01 for "payMembership", "membership payment", "membership
  fee", "Individual Membership Fee", "membership blank page", "payments
  disabled blank page", "display() on false", `getPaymentForm`,
  "Invalid payment type" and the typed-property error.
  `pkp/pkp-lib#4701` (closed, not planned) asked for a way to buy a
  membership in OJS 3, or for the membership fee to be removed; it does
  not mention the address or its failure.
- Not driven: PayPal as the method, MySQL, 3.4 and 3.3 (code only).
