# A signed-out visitor at a subscription purchase or membership address gets a blank error page instead of Login

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1307` for `pkp/pkp-lib#2336` · [a96cb05987](https://github.com/pkp/ojs/commit/a96cb05987e473fe8c83caa0d2ef9904baf5b5f6) · 2017-03-08 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U52 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a9), spec U51 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A visitor who is not signed in opens one of a journal's payment pages
by its address: "Purchase Individual Subscription"
(`user/purchaseSubscription/individual`), "Purchase Institutional
Subscription" (`user/purchaseSubscription/institutional`) or the
membership payment page (`user/payMembership`). This happens with a
bookmark, a link shared by a colleague, or a page left open after the
session ended. The server fails and the page is blank, instead of the
Login page that would bring them back after signing in.

Nothing is lost: signing in first and opening the address again works.
The fault has shipped in every release since OJS 3.1.

The two purchase pages fail this way on a journal that requires
subscriptions and has payments set up. The membership page fails this
way on every journal.

## Impact

- **Lost.** Nothing stored. The page gives no word of what went wrong
  or that signing in would help.
- **Who.** A signed-out reader at one of these addresses. The journal
  links to them only for signed-in readers.

Low: the visitor gets a blank page with no hint, but the task gets
done once they sign in, and no page links a signed-out visitor to these
addresses. It would be medium if a page did.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS. It is open access and
  payments are off.

The membership page:

1. Without signing in, type the journal's address followed by
   `user/payMembership`
   (`/index.php/publicknowledge/en/user/payMembership`).

The purchase pages (the journal must require subscriptions and take
payments; no subscription type is needed):

2. Sign in as `dbarnes`. Open Settings › Distribution › "Payments",
   tick "Enable", choose "US Dollar" under "Currency" and "Manual Fee
   Payment" under "Payment Plugins", type "Pay by cheque" in "Manual
   Payment Instructions" and press "Save".
3. On the "Access" tab choose "The journal will require subscriptions
   to access some or all of its contents." and press "Save".
4. Sign out. Type the journal's address followed by
   `user/purchaseSubscription/individual`, then
   `user/purchaseSubscription/institutional`, then
   `user/payMembership`.

**Expected.** Each address leads to the Login page, as
`payment/pay/1` does for a visitor who is not signed in.

**Observed.** Each page is blank: the server answers 500 with an empty
body. The log reads, for the membership page,

```
PHP Fatal error: Uncaught Error: Call to a member function getId() on null in pages/user/UserHandler.php:434
```

and for the two purchase pages the same error at lines 185
(individual) and 182 (institutional).

Signed in as `dsokoloff`, the same three addresses open "Purchase
Individual Subscription", "Purchase Institutional Subscription" and
"Manual Fee Payment".

## Cause

`UserHandler`'s payment operations read the signed-in user without
checking that there is one; with nobody signed in
`$request->getUser()` is null.

- `payMembership()` passes `$user->getId()` to
  `createQueuedPayment()` (line 434).
- `purchaseSubscription()` passes `$user->getId()` to
  `subscriptionExistsByUserForJournal()` (line 185, individual), to
  `UserInstitutionalSubscriptionForm` (line 182, institutional), or,
  when a subscription id is in the address, to `subscriptionExistsByUser()`
  (line 158).
- `payPurchaseSubscription()`, `completePurchaseSubscription()` and
  `payRenewSubscription()` pass `$user->getId()` to the subscription
  DAO or form in the same way.

The four subscription operations do this after their own journal and
payment checks; `payMembership()` has no payment check at all (the
[report on the payment link](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U52-A3-A9-payment-link-blank-page-when-payments-off.md)
covers that).

Until a96cb05987 `UserHandler` had its own `validate($loginCheck =
true)`, which sent a signed-out visitor to Login. That commit, a
clean-up of `validate()` conventions, removed it and changed each call
to `$this->validate(null, $request)`, which is `PKPHandler::validate()`:
it runs the handler's `_checks`, and `UserHandler` registers none. The
page router lets the request through, since these operations name no
authorization policy.

Reach:

- **`payMembership()`** (seen in a browser): fails for a signed-out
  visitor on every journal.
- **`purchaseSubscription()`, individual and institutional** (seen in
  a browser): fail once the journal requires subscriptions and
  payments are set up; before that they lead to the home page.
- **`payPurchaseSubscription()`, `completePurchaseSubscription()`,
  `payRenewSubscription()`** (read in the code): the same failure
  after the same checks.
- **`subscriptions()`** ("My Subscriptions"): checks for a missing
  user and leads home; not affected.

## Proposed fix

Send a signed-out visitor to Login before the user is read, in each of
the five operations, with the check `PaymentHandler::pay()` and
`ArticleHandler` already make
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/membership-address-signed-out-blank-page/fix.diff)):

```php
if (!Validation::isLoggedIn()) {
    Validation::redirectLogin();
}
```

In the four subscription operations it goes just before
`$this->setupTemplate($request); $user = $request->getUser();`, after
their journal and payment checks, so a journal that sells nothing
still sends the visitor home. In `payMembership()` it goes right after
`validate()`. `use PKP\security\Validation;` is added. The Login page
gets no message, as from `PaymentHandler::pay()`; passing
`payment.loginRequired` ("You must be logged in to make a payment.")
is left to the team.

This fix alone is not enough for the membership page on a journal
whose payments are not set up, the default: a signed-out visitor goes
to Login and, once signed in, back to the blank page that the
[report on the payment link](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U52-A3-A9-payment-link-blank-page-when-payments-off.md)
covers. Both fixes are needed; they apply together.

Tried on OJS `main`: signed out, each of the three addresses led to
the Login page and the server logged no error. Signed in as
`dsokoloff`, they still opened the two purchase pages and "Manual Fee
Payment", as without the fix.

- **Alternatives.**
  - An authorization policy (`UserRequiredPolicy`) in an `authorize()`
    for these operations is the newer pattern, but it runs before the
    operations' own checks, so a signed-out visitor on a journal that
    sells nothing would go to Login instead of the home page.
  - Bringing back the old `validate($loginCheck)` override would
    change `subscriptions()` as well, which handles a missing user
    itself.
- **What goes with it.** Nothing stored, no API or plugin hook. The
  same code is on 3.5, 3.4 and 3.3 (3.3 in `.inc.php` files with tabs,
  so the diff needs re-making there). The test that would have caught
  it: an e2e check that the purchase and membership addresses send a
  signed-out visitor to Login (spec U51, a **Planned** item).

Small: the same three lines in five operations of one handler.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/membership-address-signed-out-blank-page/walk.js),
  with helpers in `shared/playwright/checks/issues/`. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/membership-address-signed-out-blank-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The walk typed "Pay
  by cheque u52r3" at step 2.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/membership-address-signed-out-blank-page/fix.diff ojs`
  and the same walk, then reverted.
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets c657990 (2026-10-01).
- Tips: OJS `main` 68615b5a32 (pkp-lib 25562b0e1a), `stable-3_5_0`
  3517e640f2 (pkp-lib b1981810da), `stable-3_4_0` 75cc2d488b (pkp-lib
  32b0f4b4af), `stable-3_3_0` ac77c9fb35 (pkp-lib f6ab331645).
- Code reads:
  - `UserHandler`'s five payment operations on each branch: none
    checks for a signed-in user. `subscriptions()`, which checks for a
    missing user. `PKPHandler::validate()` on `main`.
  - `templates/frontend/pages/subscriptions.tpl` and
    `userSubscriptions.tpl`: the purchase links are shown only to a
    signed-in visitor.
- Not driven: `payPurchaseSubscription()`,
  `completePurchaseSubscription()` and `payRenewSubscription()`
  signed out (read in the code).
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library
  for a signed-out or logged-out purchase or membership page, a blank
  payment page, `payMembership`, `purchaseSubscription`,
  `UserHandler`, "getId() on null".
