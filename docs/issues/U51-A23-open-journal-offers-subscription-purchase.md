# An open-access journal's "Subscriptions" page offers "Purchase New Subscription", which leads to the home page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#2962` · [d53574120e](https://github.com/pkp/ojs/commit/d53574120e8a6883afb868a69fca627b66021fd9) · 2017-11-16 · Alec Smecher (asmecher); the page's and menu item's current conditions from `pkp/ojs#1832` for `pkp/pkp-lib#3206` · [e0b84f6317](https://github.com/pkp/ojs/commit/e0b84f6317a31df6f5eb514f36cd118d9c3b0439), [a791e00743](https://github.com/pkp/ojs/commit/a791e00743488bd91a35592e4c50552706eb7498) · 2018-02-12 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a23)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a journal that does not require subscriptions (open access, or not
published online) but still has subscription types and payments set
up, the "Subscriptions" page lists the types with their prices and
offers a signed-in reader "Purchase New Subscription". Pressing it
lands on the journal's home page with no message, because such a
journal does not sell subscriptions.

A journal gets here when it switches from subscriptions to open access
(or stops publishing online) and keeps its types and payments, for
example to take author fees. Readers reach
the page by its address or by a "Subscriptions" menu item the journal
placed; the default menus do not hold one. Signed-out readers see the
types but no purchase link.

## Impact

- **Lost.** Nothing. On an open-access journal the content is free,
  and a journal not published online restricts nothing online.
- **Who.** Signed-in readers of such a journal who open the
  "Subscriptions" page.
- **Way round.** None needed.

Low: the page offers a purchase the journal refuses, in a rare setup,
and nothing is lost. It would be medium if the team wanted a journal
not published online to sell subscriptions (for example to a print
edition) through this page; the purchase page refuses that today on
purpose.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` as the dataset has it: open access (no
  publishing mode chosen), payments off, no subscription type. Steps
  1–3 set payments up and add a type.
- The reader `amwandenga`.

Setting up the journal:

1. Sign in as `rvaca` (the journal manager).
2. Settings › Distribution, tab "Payments": tick "Payments will be
   enabled for this journal. …", "Currency" "US Dollar", "Payment
   Plugins" "Manual Fee Payment", "Manual Payment Instructions" "Pay by
   bank transfer."; "Save".
3. Reload, open "Payments" in the side menu, tab "Subscription Types",
   "Create New Subscription Type": "Name of Type" "Online Year u51w9",
   "Currency" "US Dollar (USD)", "Cost" "40", "Format" "Online",
   "Duration" "12", "Individual (users are validated via login)";
   "Save". Log out.

Open access:

4. Sign in as `amwandenga`.
5. Open `/index.php/publicknowledge/en/about/subscriptions`.
6. Press "Purchase New Subscription".

Not published online:

7. Sign in as `rvaca`. Settings › Distribution, tab "Access": choose
   "OJS will not be used to publish the journal's contents online." and
   press "Save".
8. Sign in as `amwandenga`; repeat steps 5 and 6.
9. Log out and open the address of step 5.

Subscriptions required (the control):

10. Sign in as `rvaca`; tab "Access": choose "The journal will require
    subscriptions to access some or all of its contents."; "Save".
11. Sign in as `amwandenga`; repeat steps 5 and 6.

**Expected.** A journal that does not sell subscriptions does not
offer one for sale.

**Observed.** Step 5 opens "Subscriptions" with "Online Year u51w9" in
the individual table and "Purchase New Subscription" under it. Step 6
lands on `/index.php/publicknowledge/en/index`, the home page, with no
message. Step 8 shows the same on the journal not published online.
Signed out (step 9) the page lists the type with no purchase link.

Control: with subscriptions required (step 11), "Purchase New
Subscription" opens "Purchase Individual Subscription".

## Cause

`templates/frontend/pages/subscriptions.tpl` shows "Purchase New
Subscription" to any signed-in reader, `{if $isUserLoggedIn}`
([L49–L55](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/pages/subscriptions.tpl#L49-L55),
and the institutional twin at L84). `UserHandler::purchaseSubscription()`,
which the link opens, redirects to the home page unless the journal
requires subscriptions and payments are set up
([L130–L138](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/user/UserHandler.php#L130-L138)).
The page itself opens on the payment condition alone
(`AboutHandler::subscriptions()`,
[L40–L45](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/about/AboutHandler.php#L40-L45)),
so on a journal that does not require subscriptions it offers a
purchase its own purchase page refuses.

The link was added when the page had no condition at all, and
`purchaseSubscription()` already checked the publishing mode then. The
page's payment condition and the "Subscriptions" menu item's (in
`NavigationMenuService::getDisplayStatusCallback()`) came later, in
`pkp/ojs#1832`. The issue's discussion asked for the page to need
"subscriptions/payments enabled" and agreed to a publishing-mode test,
but the PR added that test only to the "My Subscriptions" menu item
(9513c3eb8f); the page and the "Subscriptions" menu item test payments
only.

Reach:

- The "Subscriptions" menu item: shown on such a journal when a manager
  places it, leading to the same page (code; the default menus do not
  hold it).
- The pages that decide on the publishing mode already: "My
  Subscriptions" (`UserHandler::subscriptions()`), the purchase and
  payment pages, the "Subscription" block (`getContents()` returns
  nothing outside subscription mode) and the "My Subscriptions" menu
  item (code; "My Subscriptions" leads home on screen in the walk).
  OMP and OPS have no subscription pages.

## Proposed fix

A proposal; the team decides. Open the "Subscriptions" page, and show its menu item, only where a
reader can buy: the journal requires subscriptions and payments are
set up, the condition `purchaseSubscription()` applies
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-journal-offers-subscription-purchase/fix.diff),
excerpt):

```diff
 // pages/about/AboutHandler.php
 use APP\core\Application;
+use APP\journal\Journal;
 use APP\subscription\SubscriptionTypeDAO;
 …
         if ($journal) {
             $paymentManager = Application::get()->getPaymentManager($journal);
-            if (!($journal->getData('paymentsEnabled') && $paymentManager->isConfigured())) {
+            if ($journal->getData('publishingMode') != Journal::PUBLISHING_MODE_SUBSCRIPTION || !$paymentManager->isConfigured()) {
                 $request->redirect(null, 'index');

 // classes/services/NavigationMenuService.php, NMI_TYPE_SUBSCRIPTIONS
-                    $navigationMenuItem->setIsDisplayed($context->getData('paymentsEnabled') && $paymentManager->isConfigured());
+                    $navigationMenuItem->setIsDisplayed($context->getData('paymentsEnabled') && $paymentManager->isConfigured() && $context->getData('publishingMode') == \APP\journal\Journal::PUBLISHING_MODE_SUBSCRIPTION);
```

No offer at all, rather than a working link: a journal that does not
require subscriptions has nothing a subscription would open, and the
purchase page refuses such a journal on purpose. The test is the one
`purchaseSubscription()` and the "My Subscriptions" menu item already
make, and it is what `pkp/pkp-lib#3206` agreed.

Tried on `main`. With the fix in, the address of step 5 leads to the
home page on the open-access and the not-online journal, signed in or
out. The control, step 11, reads the same with the fix in and out.

**Alternatives**

- Hide only "Purchase New Subscription" outside subscription mode: the
  page would still list, with prices, types nobody can buy.
- Let a journal not published online sell subscriptions: a product
  decision (see Impact), with changes to the purchase page as well.

**What goes with it**

- Behavior: on a journal that does not require subscriptions, the
  page's address leads to the home page and its menu item is hidden,
  even with payments set up. Nothing changes on a journal that requires
  subscriptions. No API or plugin hook is involved.
- Backport: the diff applies as written to 3.5 (checked with `patch
  --dry-run`); 3.4 has the same code in the same files; 3.3 needs the
  `.inc.php` files and the global `PUBLISHING_MODE_SUBSCRIPTION`
  constant.
- Test: an e2e scenario in spec U51 in which the "Subscriptions" address
  of an open-access journal with payments set up leads home.

Small: one condition in the handler and the same in the menu item,
following the test the neighbouring menu item and the purchase page
already make; tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-journal-offers-subscription-purchase/walk.js)
  takes the Steps on a fresh load of the default dataset and records
  where each press lands, the page's notices and the server log; after
  each "Subscriptions" page it records the types and the number of
  purchase links:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/open-journal-offers-subscription-purchase/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs`, the
  same script, then `node bin/try-fix.js revert ojs`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`. The
  dataset's journal has no publishing mode stored, which the app treats
  as open access; choosing "The journal will provide open access to its
  contents." gives the same page (walked in an earlier round of this
  report). No query is involved.
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
- Code reads: on 3.4 and 3.3, `subscriptions.tpl` shows both purchase
  links under `{if $isUserLoggedIn}`, `AboutHandler::subscriptions()`
  and `NMI_TYPE_SUBSCRIPTIONS` test payments only, and
  `UserHandler::purchaseSubscription()` tests the publishing mode.
- Introduced: `git blame` on the link in `subscriptions.tpl` gives
  d53574120e ("Provide purchase links from About page"); at its parent,
  `purchaseSubscription()` already redirected outside subscription
  mode, so the link never worked on such a journal. `pkp/ojs#1832`
  holds e0b84f6317 (the page's payment condition), a791e00743 (the
  "Subscriptions" and "My Subscriptions" menu items' payment conditions)
  and 9513c3eb8f (the review change that left the publishing-mode test
  on "My Subscriptions" only).
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library by "Purchase New Subscription", "subscription open
  access purchase redirect", "subscriptions page publishing mode" and
  `AboutHandler`): nothing about this fault.
- Not driven: 3.4 and 3.3 (code only); the "Subscriptions" menu item
  (code only; the dataset's menus do not hold it); MySQL.
