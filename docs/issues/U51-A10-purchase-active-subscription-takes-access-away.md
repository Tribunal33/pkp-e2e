# A reader who presses "Purchase" beside an active subscription loses access at once, before paying

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** [f64ba225b7](https://github.com/pkp/ojs/commit/f64ba225b7a154b08209c33cd2d9a34d12e9b2d1) (before pkp used GitHub pull requests; PKP's old tracker `#4170` `#4172` `#4174`) · 2009-06-02 · michael (no GitHub handle in the commit)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a10)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On "My Subscriptions", an active subscription, individual or
institutional, offers "Purchase" beside "Renew". It opens the purchase
page filled with the subscription's type, where the reader can choose
another type or buy the same one again. Submitting it ("Save", or
"Continue" on the institutional page) turns the active subscription
into "Awaiting Manual Payment" with today as its start and end dates.
The reader loses access to restricted content at once, before anything
is paid, and "My Subscriptions" no longer offers "Renew".

Access comes back when the payment is recorded, and then only from
today. With manual payments, the journal manager records it by editing
the subscription: the edit window shows today as both dates, so the
manager must type a new end date. The reader's earlier end date is on
no screen, so the time they had left is lost. Nothing on the row or the
page warns that the current subscription ends.

## Impact

- **Lost.** Access to restricted content, from submitting the page
  until the payment is recorded. The time left on the subscription is
  also lost: once the payment is recorded it runs from today, and no
  screen, log or payment record keeps the old end date.
- **Who.** Subscribers who press the "Purchase" beside their active
  subscription to change its type or buy again. It happens with the
  "Manual Fee Payment" method (walked) and with PayPal (read in the
  code). On an institutional subscription, everyone the institution's
  IP ranges or domain covered loses access with it. Only the journal's
  principal contact is told, and only if the reader presses "Send
  notification of payment".
- **Way round.** For the reader: use "Renew", which extends a
  subscription without touching it until paid. Once it has happened,
  the manager can make the subscription "Active" and type an end date
  again, if they learn the old one from the reader.

Medium: subscribers who press the offered "Purchase" are cut off until
their payment is recorded and lose the time left on their
subscription, but the manager can restore access. It would be high if
the journal led subscribers to "Purchase" to keep their access, or if
the manager could not restore it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` requires subscriptions and takes manual
  payments. Its issue "Vol. 1 No. 2 (2014)" needs a subscription. The
  reader `ccorino` holds an active individual and an active institutional
  subscription for a year. The dataset has none of this: the journal is
  open access, payments are off, both issues are open to everyone, and
  there are no subscription types, institutions or subscriptions. So the
  journal manager sets it up in steps 1–10.
- `ccorino` is not an author of "Signalling Theory Dividends", so its PDF
  opens for him only through a subscription.

Setting up (the journal manager):

1. Sign in as `rvaca`.
2. Open Settings › Distribution, tab "Access". Choose "The journal will
   require subscriptions to access some or all of its contents." and
   press "Save".
3. Open the tab "Payments". Tick "Payments will be enabled for this
   journal. …", set "Currency" to "US Dollar" and "Payment Plugins" to
   "Manual Fee Payment", type "Pay by bank transfer." in "Manual Payment
   Instructions" and press "Save".
4. Open Issues › "Back Issues", the row "Vol. 1 No. 2 (2014)" › "Edit",
   tab "Access". Set "Access Status" to "Subscription", press "Save" and
   close the window.
5. Open Payments › "Subscription Types" › "Create New Subscription
   Type". Type "Online Year u51w3" in "Name", choose "US Dollar", type
   "10" in "Cost", choose "Online" in "Format", type "12" in "Duration",
   choose "Individual (users are validated via login)" and press "Save".
6. The same for "Campus Year u51w3": "US Dollar", "100", "Online", "12",
   "Institutional (users are validated via domain or IP address)".
7. Open "Institutions" in the side menu (it appears once step 3 has
   turned payments on) › "Add Institution". Type "Harbour Library u51w3"
   in "Name" and, in "IP ranges", "192.0.2.10" and on a second line
   "198.51.100.0/24". Press "Save". These are addresses your browser is
   not on, so the PDF opens for `ccorino` only through his individual
   subscription.
8. Open Payments › "Individual Subscriptions" › "Create New
   Subscription". Find and choose `ccorino`, choose "Online Year u51w3",
   "Status" "Active", "Start" today and "End" the same day next year, and
   press "Save".
9. Open "Institutional Subscriptions" › "Create New Subscription". Choose
   `ccorino`, "Campus Year u51w3", "Active", "Institution" "Harbour
   Library u51w3" and the same dates, and press "Save".
10. Log out.

The reader:

11. Sign in as `ccorino`. Open Archives › "Vol. 1 No. 2 (2014)" ›
    "Signalling Theory Dividends" and press "PDF": the PDF opens.
12. Open "My Subscriptions" (`/index.php/publicknowledge/en/user/subscriptions`):
    both rows read "Expires: {next year}" with "Renew" and "Purchase".
13. On the "Online Year u51w3" row press "Purchase": "Purchase
    Individual Subscription" opens with "Online Year u51w3 (10.00 USD)".
14. Press "Save": the "Manual Fee Payment" page asks for 10.00 USD.
15. Open "My Subscriptions" again.
16. Open "Signalling Theory Dividends" as in step 11 and press "PDF".
17. On "My Subscriptions", on the "Campus Year u51w3" row press
    "Purchase": "Purchase Institutional Subscription" opens.
18. Press "Continue". The page is refused with "Please enter a valid IP
    range.", because its "IP ranges" box reads "Array" (reported
    separately as "'Purchase' beside an institutional subscription opens
    with 'IP ranges' reading 'Array'").
19. In "IP ranges" type "192.0.2.10" and on a second line
    "198.51.100.0/24", and press "Continue": the "Manual Fee Payment"
    page asks for 100.00 USD.
20. Open "My Subscriptions" again.

The journal manager:

21. Sign in as `rvaca` and open Payments › "Individual Subscriptions",
    then "Institutional Subscriptions".

Recording the payment (the journal manager, then the reader):

22. On "Individual Subscriptions", open `ccorino`'s row › "Edit".
23. Choose "Active" in "Status", leave the dates as the window shows
    them, and press "Save". Open the tab "Payments".
24. Sign in as `ccorino`, open "My Subscriptions" and the PDF as in
    step 11.

**Expected.** An active subscription keeps its access and its dates
until the reader has paid: after step 14 "My Subscriptions" still reads
"Expires: {next year}" with "Renew", step 16 opens the PDF, and in step
21 both rows read "Active" with the dates of steps 8 and 9.

**Observed.** Step 15: the "Online Year u51w3" row reads "Awaiting
Manual Payment", with no "Renew" and no "Purchase". Step 16: the PDF
link carries the padlock and leads to the "Subscriptions" page. Step 20:
the "Campus Year u51w3" row reads "Awaiting Manual Payment" too, with no
buttons. Step 21:

```
Individual Subscriptions:    Carlo Corino | ccorino@mailinator.com | Online Year u51w3 | Awaiting Manual Payment | 2026-09-30 | 2026-09-30
Institutional Subscriptions: Harbour Library u51w3 | Campus Year u51w3 | Awaiting Manual Payment | 2026-09-30 | 2026-09-30
```

Step 22: the window shows "Awaiting Manual Payment", with "Start" and
"End" both 2026-09-30. Step 23: the row reads "Active", 2026-09-30,
2026-09-30, and the "Payments" tab lists "No Items". Step 24: the row
reads "Expired: 2026-09-30" with "Renew" and "Purchase", and the PDF
opens (until the end of the day). The next year of the subscription
appears on no screen.

No request failed. "Renew" beside the same active subscription shows
the same kind of payment page and leaves the subscription "Active" with
its dates.

## Cause

On "My Subscriptions", an active row links "Purchase" to
`purchaseSubscription/{individual|institutional}/{id}`
([`templates/frontend/pages/userSubscriptions.tpl` lines 115 and 212](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/pages/userSubscriptions.tpl#L109-L118)).
`APP\pages\user\UserHandler::purchaseSubscription()` and
`payPurchaseSubscription()` accept an existing subscription whose status
is `SUBSCRIPTION_STATUS_ACTIVE` as well as the two awaiting-payment ones
([lines 165–169 and 249–253](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/user/UserHandler.php#L162-L173)).

The form's `execute()` is written for a purchase not yet paid. It sets
the stored subscription's status to `SUBSCRIPTION_STATUS_AWAITING_MANUAL_PAYMENT`
(`…_AWAITING_ONLINE_PAYMENT` with an online payment plugin such as
PayPal), sets the chosen type, and sets both dates to today. It saves
all this before the payment page is even shown
([`UserIndividualSubscriptionForm::execute()` lines 183–198](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/UserIndividualSubscriptionForm.php#L183-L198),
[`UserInstitutionalSubscriptionForm::execute()` lines 205–231](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/UserInstitutionalSubscriptionForm.php#L205-L231)).
For a new subscription, or one still awaiting payment, that is harmless.
The rule it breaks: a reader's subscription changes when a payment is
recorded, not when one is asked for. "Renew" keeps it:
`payRenewSubscription()` only queues a payment, and the subscription
changes in `OJSPaymentManager::fulfillQueuedPayment()` once it is paid.

When the payment is recorded:

- Manual payments: nothing in OJS records a subscription payment. The
  manager edits the subscription, as steps 22–23 show. The queued
  payment in `queued_payments` holds the type, amount and subscription
  ID, not the old dates, and appears on no screen. The "Payments" tab
  lists completed payments, and a manual payment never becomes one.
- PayPal: the callback calls `fulfillQueuedPayment()`. An individual
  subscription becomes "Active", and `SubscriptionDAO::_renewSubscription()`
  counts its new end from today, since the stored end (today) has
  passed. An institutional one goes to "Needs Approval" and waits for
  the manager. Read in the code; not walked (no payment gateway on the
  test install).

The active row has offered "Purchase" since reader purchases were added
in f64ba225b7 (2009, "Enable users to purchase/renew subscriptions"),
whose `execute()` already set an existing subscription to awaiting
payment. Three days later, af39a8f78a ("Subscription non-expiry option")
took the lines that set both dates to today out of the branch for a new
subscription, so they run for an existing one too.

The reach:

- A non-expiring subscription offers "Purchase" alone (no "Renew").
  Submitting keeps its empty dates but sets it to awaiting payment, so
  the access goes the same way. Read in the code.
- The institutional page also adds a new institution of the same name
  on every "Continue", a separate fault.
- A reader cannot reach another reader's subscription this way: both
  handlers check `subscriptionExistsByUser()` first. Read in the code.

## Proposed fix

A proposal; the team decides. Stop offering "Purchase" on an active subscription, and let the two
purchase operations change an existing subscription only while it is
still awaiting payment
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/fix.diff)):

```diff
--- a/pages/user/UserHandler.php
+++ b/pages/user/UserHandler.php
@@ purchaseSubscription() and payPurchaseSubscription(), the same change in each
-            // Ensure subscription can be updated
+            // Ensure subscription can be updated: only a purchase still awaiting
+            // payment. Saving the form sets the subscription to awaiting payment
+            // with today's dates, so an active one would lose its access at once;
+            // an active subscription is extended with "Renew" (payRenewSubscription).
             $subscription = $subscriptionDao->getById($subscriptionId);
             $subscriptionStatus = $subscription->getStatus();
             $validStatus = [
-                Subscription::SUBSCRIPTION_STATUS_ACTIVE,
                 Subscription::SUBSCRIPTION_STATUS_AWAITING_ONLINE_PAYMENT,
                 Subscription::SUBSCRIPTION_STATUS_AWAITING_MANUAL_PAYMENT
             ];
--- a/templates/frontend/pages/userSubscriptions.tpl
+++ b/templates/frontend/pages/userSubscriptions.tpl
@@ the individual row, and the same in the institutional row
 									{/if}
-									<a class="cmp_button" href="{url op="purchaseSubscription" path="individual"|to_array:$userIndividualSubscription->getId()}">
-										{translate key="user.subscriptions.purchase"}
-									</a>
 								{/if}
```

The handler owns which subscriptions a purchase may change: it already
lists the allowed statuses in `$validStatus`, as
`completePurchaseSubscription()` and `payRenewSubscription()` do. The
list now matches what `execute()` does to a subscription. A bookmarked
address with an active subscription's ID now leads to the home page,
as any other refused status does.

What stays: buying a new subscription, and renewing an active one with
"Renew". What goes is changing an active subscription's type from "My
Subscriptions". That never worked without cutting off access, and the
manager can still change the type in the subscription's edit window
under Payments.

Tried on `main`: with the fix in, both active rows offer "Renew" only,
the purchase addresses with their IDs lead to the home page, and after
the steps both subscriptions are still "Active" with their dates and the
PDF opens. "Renew" and "Purchase New Subscription", which the fix must
not change, work the same with the fix in and out.

**Left as it is**

- After the fix, no row links to `purchaseSubscription/{kind}/{id}`.
  The "Awaiting Online Payment" row links `completePurchaseSubscription`,
  and the "Awaiting Manual Payment" row has no button. The branch that
  takes an ID stays on purpose, so that a bookmarked address for a
  purchase still awaiting payment keeps working and harms nothing.
  Removing it, with the forms' handling of an existing subscription,
  is a clean-up the team may prefer.
- `completePurchaseSubscription()` keeps `SUBSCRIPTION_STATUS_ACTIVE`
  in its list (line 341). It only queues a payment, so the subscription
  keeps its access until it is paid. Once paid, an individual
  subscription is extended from its current end, as "Renew" does, and
  an institutional one goes to "Needs Approval", as every paid
  institutional purchase does. No row links it for an active
  subscription. Dropping `ACTIVE` there too is a one-line hardening,
  not needed for this fault.
- A non-expiring active subscription is left with no button at all: it
  has nothing to renew, and a type change goes through the manager.

**Alternatives**

- Keep "Purchase" on an active subscription and leave it untouched until
  the payment is recorded: the chosen type would have to travel with the
  queued payment and be applied in `fulfillQueuedPayment()`, and a
  manual payment would need the manager to apply it. That is a product
  decision (what a type change costs, when it starts) and a larger change.
- A confirmation before submitting: the access would still go before
  payment.
- A guard in `execute()` that skips the status and dates for an active
  subscription: the reader could then switch to a dearer type without
  paying, since `execute()` also sets the type.

**What goes with it**

- No REST API, plugin hook or other screen uses these operations.
- Stored data: a subscription already reset this way cannot be told
  apart from a new purchase, and its old dates are not recorded, so
  there is nothing to repair automatically.
- Backport: the diff applies as written to 3.5 and 3.4. On 3.3 the
  template hunk applies as written; the handler hunk has to be rewritten
  for `pages/user/UserHandler.inc.php`, where the list is `array(...)`
  with constants without a class prefix (`SUBSCRIPTION_STATUS_ACTIVE`),
  tab-indented, after an `import('classes.subscription.Subscription');`
  line.
- Test: an e2e scenario in spec U51 in which an active subscription
  offers "Renew" only and its purchase address leads to the home page,
  with the subscription still active.

Small: two status lists in one handler and two links in one template.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/walk.js)
  (its Steps in
  [steps.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/steps.js)),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` takes
  steps 1–12, then "Renew" and "Purchase New Subscription".
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–24 on `main`, steps 1–21 on
  `stable-3_5_0`.
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
- Code reads: on 3.4 the template offers the same link (lines 115, 212),
  `UserHandler.php` accepts an active subscription (lines 166, 250), and
  both forms' `execute()` set the status and the dates as on `main`. On
  3.3 the same, in the `.inc.php` files (`UserHandler.inc.php` lines
  143, 219; the forms' lines 160–168).
- Introduced: found with `git log -S` on the template's active-row link
  and on the forms' status and date lines.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words and by `purchaseSubscription` and the two form
  classes. `pkp/pkp-lib#3933` (closed) lists other faults on the same
  pages; `pkp/pkp-lib#12234` (open) is about a PayPal purchase abandoned
  before paying.
- Unverified: the PayPal path, read in the code only.
- Not driven: MySQL.
