# A subscriber who presses "Purchase" beside an active subscription loses access before paying

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced to a PR; present since [f64ba225b7](https://github.com/pkp/ojs/commit/f64ba225b7a154b08209c33cd2d9a34d12e9b2d1) (2009-06-02, michael), which added the reader's purchase pages
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U51 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On "My Subscriptions", a running subscription, individual or
institutional, offers "Purchase" beside "Renew". The page it opens
lists the journal's subscription types, so a reader may press it to
change type or to buy again. Once they submit that page ("Save" on the
individual page, "Continue" on the institutional one), the subscription
becomes "Awaiting Manual Payment", its start and end dates become today,
and the reader's restricted articles lock again. Nothing has been paid,
and nothing warns them.

The reader cannot undo it. With an online payment method, paying then
gives a new period from the day of payment, so whatever time was left
on the old subscription is lost.

## Impact

- **Lost.** Access to restricted content from the moment the page is
  submitted, and the subscription's end date, which OJS keeps nowhere
  else. With online payment, the paid time that was left.
- **Who.** A reader with a running subscription who presses "Purchase",
  on a journal that requires subscriptions and takes payments. OJS
  sends no one a message about the change.
- **Way round.** None for the reader. A Journal Manager or Subscription
  Manager can set the subscription back to "Active" on the "Payments"
  page, but only if they know the old end date from their own records.

Medium: a manager can restore the subscription on screen once the
reader complains.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, journal `publicknowledge`.
  It is open access and its payments are off. Submission 1, "Signalling
  Theory Dividends", is published in "Vol. 1 No. 2 (2014)".
- Sign in as `rvaca` (Journal manager) and set up a subscription
  journal:
  - Settings › Distribution › "Payments": tick "Enable", choose "US
    Dollar" under "Currency" and "Manual Fee Payment" under "Payment
    Plugins", type "Pay by cheque" in "Manual Payment Instructions",
    "Save".
  - "Access" tab: "The journal will require subscriptions to access
    some or all of its contents.", "Save".
  - "Payments" › "Subscription Types" › "Create New Subscription
    Type": "Online Year", "US Dollar", cost 10, format "Online",
    duration 12, "Individual", "Save".
  - Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" ›
    "Access": "Subscription", "Save" (so there is restricted content
    to lose).
- Sign in as `dsokoloff` (Reader). Open "My Subscriptions"
  (`/index.php/publicknowledge/en/user/subscriptions`) and, under
  "Individual Subscriptions", "Purchase New Subscription": "Online
  Year", "Save". The "Manual Fee Payment" page shows.
- Sign in as `rvaca`. "Payments" › "Individual Subscriptions" ›
  Domatilia Sokoloff's row › arrow › "Edit": "Status" "Active", "End
  date" a year from today, "Save".

Individual:

1. Sign in as `dsokoloff`. Open "Signalling Theory Dividends" and press
   "PDF". The PDF opens.
2. Open "My Subscriptions". The row reads "Online Year", "Expires:
   {a year from today}", with "Renew" and "Purchase".
3. Press "Purchase". "Purchase Individual Subscription" opens with
   "Online Year (10.00 USD)" chosen.
4. Press "Save". The "Manual Fee Payment" page shows "Subscription
   Fee (Online Year)", "10.00 (USD)".
5. Open "My Subscriptions" again.
6. Open "Signalling Theory Dividends" and press "PDF".
7. Sign in as `rvaca` and open "Payments" › "Individual
   Subscriptions".

Institutional (from a freshly loaded dataset, the first three
preconditions above, and in place of "Online Year" an institutional
type: "Campus Year", "US Dollar", cost 100, "Online", duration 12,
"Institutional"):

8. As `dsokoloff`, "My Subscriptions" › under "Institutional
   Subscriptions" "Purchase New Subscription": "Institution name"
   "Tide University", "IP ranges" "192.0.2.0/24", "Continue".
9. As `rvaca`, "Payments" › "Institutional Subscriptions" › the "Tide
   University" row › arrow › "Edit": "Status" "Active", "End date" a
   year from today, "Save".
10. As `dsokoloff`, "My Subscriptions": the institutional row reads
    "Expires: {a year from today}", with "Renew" and "Purchase". Press
    "Purchase".
11. "IP ranges" reads "Array"; type "192.0.2.0/24" in its place and
    press "Continue". The "Manual Fee Payment" page shows.
12. Open "My Subscriptions" again, then as `rvaca` "Payments" ›
    "Institutional Subscriptions".

**Expected.** Nothing the reader submits before paying takes a running
subscription away. After step 4 the subscription is still "Active"
until a year from today, step 6 opens the PDF, and the manager's list
keeps its dates; the same for the institutional subscription after
step 11. ("Renew" is how a running subscription is extended.)

**Observed.**

- Step 5: the row reads "Awaiting Manual Payment" and has no button.
- Step 6: the link reads "Requires Subscription PDF" with a padlock,
  and leads to the "Subscriptions" page.
- Step 7: the row reads "Awaiting Manual Payment", with today under
  both "Start" and "End". The end date a year on is gone.
- Step 12: the institutional row reads "Awaiting Manual Payment", with
  today under both "Start" and "End".

"Renew" on the same row shows the same payment page and leaves the
subscription "Active" with its dates. Step 11's "Array" is the subject
of [A reader reopening their institutional subscription's purchase page finds "IP ranges" reading "Array"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A25-institutional-purchase-ip-ranges-read-array.md).

## Cause

`templates/frontend/pages/userSubscriptions.tpl` offers two buttons on
an `ACTIVE` subscription: "Renew" (`payRenewSubscription`) and
"Purchase" (`purchaseSubscription/{individual|institutional}/{id}`).
`UserHandler::purchaseSubscription()` and `payPurchaseSubscription()`
accept that id while its status is `ACTIVE`, `AWAITING_ONLINE_PAYMENT`
or `AWAITING_MANUAL_PAYMENT`, and load the existing subscription into
`UserIndividualSubscriptionForm` or `UserInstitutionalSubscriptionForm`.

Both forms' `execute()` treat every save as a new purchase. On the
subscription they were given they set the status to
`SUBSCRIPTION_STATUS_AWAITING_MANUAL_PAYMENT` (or `_ONLINE_` with
another payment method), and both dates to today (`null` for a
non-expiring type), and store it with `updateObject()`. Only then do
they queue the payment. A subscription the reader has already paid for
should stay as it is until the new payment arrives; here it is reset
before the reader pays anything.

The button and the status change came in with the purchase pages in
f64ba225b7 (2009). The dates were reset on every save from
[af39a8f78a](https://github.com/pkp/ojs/commit/af39a8f78ad983ab0bd27f8085dd56062ec07add) (2009-06-05),
which added non-expiring types.

Reach:

- **Individual, manual payment** (seen in a browser, main and 3.5):
  status, dates and access lost at once.
- **Institutional, manual payment** (seen in a browser, main and 3.5):
  the same. The page also arrives with "IP ranges" reading "Array"
  (the report linked above), and adds a second institution, which
  [Each institutional subscription a reader buys adds another copy of their institution to the journal's list](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A11-institutional-purchase-adds-institution-each-time.md)
  covers.
- **Online payment method** (read in the code, not driven): the status
  becomes "Awaiting Online Payment". A completed payment runs
  `OJSPaymentManager::fulfillQueuedPayment()`, whose renewal
  (`SubscriptionDAO::_renewSubscription()`) counts the new period from
  the payment day because the end date is now in the past. An
  institutional one becomes "Needs Approval" rather than active.
- **An `ACTIVE` subscription whose end date has passed** (row reads
  "Expired: …"): "Purchase" resets nothing worth keeping, and for an
  individual reader it is the only way to buy another type, since
  "Purchase New Subscription" leads home while any individual
  subscription exists. Seen in a browser: it opens the page and shows
  the payment page.
- **Non-expiring subscriptions** (read in the code): "Purchase" is
  their only button; the same reset applies.

## Proposed fix

Offer and accept "Purchase" on an `ACTIVE` subscription only once its
end date has passed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/fix.diff)):

- `UserHandler::purchaseSubscription()` and `payPurchaseSubscription()`,
  after their `$validStatus` check, send the reader to the home page
  when the subscription is `ACTIVE` and non-expiring or not yet
  expired, as they already do for a status they do not accept:

  ```php
  if ($subscriptionStatus == Subscription::SUBSCRIPTION_STATUS_ACTIVE && ($subscription->isNonExpiring() || !$subscription->isExpired())) {
      $request->redirect(null, 'index');
  }
  ```

- `userSubscriptions.tpl` shows the "Purchase" link in the `ACTIVE`
  branch of both tables only under
  `{if !$isNonExpiring && $…Subscription->isExpired()}`.

The handler decides which subscriptions a purchase may touch, so the
guard there covers both forms and an address typed by hand. The
non-expiring test comes first because `isExpired()` reads a missing end
date as passed. After the fix a running subscription offers only
"Renew", an expired one "Renew" and "Purchase" as today, and an active
non-expiring one no button at all, as it needs none.

Tried on OJS `main`: on a running subscription the row offered only
"Renew", the subscription stayed "Active" until a year on, the PDF
still opened, and the manager's list kept both dates. The purchase
address typed with the subscription's id led to the home page. On a
subscription that ended yesterday the row still offered "Renew" and
"Purchase", and "Purchase" › "Save" still showed the payment page.
"Renew", and "Purchase New Subscription" for a reader with no
subscription, worked as before.

- **Alternatives.**
  - Remove "Purchase" from every `ACTIVE` row: simpler, but an
    individual reader whose subscription has expired could then only
    renew the same type.
  - Keep "Purchase" on running subscriptions and leave the subscription
    untouched until the payment completes. The chosen type, membership
    and institutional details would have to wait somewhere other than
    the live subscription and be applied in `fulfillQueuedPayment()`.
    That is a new pattern and needs a product decision. Writing them
    straight onto the running subscription is not an option: an
    institutional subscription's domain and ranges are what the
    Subscription Manager approves.
  - Keep the dates but still set the status to awaiting payment: the
    reader would still lose access until paying, or until a manager
    acts with the manual method.
- **What goes with it.** A reader who wants another type while the
  subscription runs asks the journal's subscription contact, whose
  details "My Subscriptions" already shows. No stored data to repair:
  a subscription already reset this way needs a manager's edit, as
  today. No API or plugin hook is involved. The diff applies as is to
  3.5 and 3.4; 3.3 has the same code in `.inc.php` files, with tabs and
  unqualified constants, so it needs re-making there. The test that
  would have caught it: an e2e check that a running subscription
  offers only "Renew" and that its purchase address changes nothing.

Small: the guard follows the status check the handler already makes.

## Evidence

- The kept scripts take the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/walk.js)
  (steps 1 to 7; it also presses "Renew" between steps 2 and 3, and
  types the purchase address after step 6),
  [walk.js of the "Array" report](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/walk.js)
  (steps 8 to 12) and
  [neighbour-expired.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/neighbour-expired.js)
  (a subscription that ended yesterday), with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/lib.js).
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/walk.js`
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/fix.diff ojs`
- Walked on OJS `main` and `stable-3_5_0` (steps 1 to 12), on
  PostgreSQL; nothing here depends on the database. The expired case
  and the fix on `main` only. Datasets: pkp/datasets c657990
  (2026-10-01). Step 12's two screens were read on `main` in a walk
  with the A11 report's fix applied, which changes only which
  institution the subscription uses.
- Tips: OJS `main` b84f8e2e44 (pkp-lib ddd8ab243a), `stable-3_5_0`
  c346ee00a5 (pkp-lib 3bb4450bea), `stable-3_4_0` 75cc2d488b (pkp-lib
  32b0f4b4af), `stable-3_3_0` ac77c9fb35 (pkp-lib f6ab331645). 3.4 and
  3.3 hold the same template, handler checks and `execute()` code
  (3.3 in `.inc.php` files).
- f64ba225b7 has no pull request; it names entries #4170, #4172 and
  #4174 of PKP's former bug tracker.
- Not driven: an online payment method (no outside payment service
  here), and a non-expiring subscription.
