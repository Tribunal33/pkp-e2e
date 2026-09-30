# The "Subscription" block shows a reader's pending or unapproved subscription as expired or running

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#1816` · [73d57c244a](https://github.com/pkp/ojs/commit/73d57c244a3cb0af2e5d4f83709bff6a7cd2c225) · 2017-08-23 · Alec Smecher (asmecher): the "Awaiting … Payment" status text in the block has not shown since then; the other inactive statuses have never had status text of their own
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a13), [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a26)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a journal that requires subscriptions, the "Subscription" block in
the sidebar describes a reader's individual subscription by its end
date, even when the subscription is not active. It reads "Expires:
{date}" while the end date is ahead, "Expired: {date}" once it has
passed, and "Non-expiring" for a type that never expires.

So a reader who has just bought a subscription by manual payment reads
"Expired: {purchase date}" on the home page and the article pages, where
"My Subscriptions" reads "Awaiting Manual Payment". A subscription the
journal has set to "Needs Approval", "Needs Information" or "Other, See
Notes" with an end date ahead reads "Expires: {end date}" on every page.
On "My Subscriptions" the block says so beside a table that reads
"Inactive".

Nothing is stored wrong; the reader is told a false state of their own
subscription, a pending purchase as ended and an unapproved one as
running.

## Impact

- **Lost.** Nothing. What the reader can open follows the real status,
  and nobody is told of the wrong text.
- **Who.** Readers with an individual subscription that is not "Active",
  on a journal that requires subscriptions and has placed the
  "Subscription" block in its sidebar. No block is placed on a new
  journal (the default dataset's journal has none), so only journals
  whose manager added it show the block. There, every purchase awaiting
  a manual payment reads "Expired" until a manager activates it. A
  purchase awaiting an online (PayPal) payment reads the same (read in
  the code). Institutional subscriptions are not affected: the block
  shows one only while it is valid (read in the code).
- **Way round.** The table on "My Subscriptions", which the block links
  to, shows the real status. A reader who believes "Expired" cannot
  buy the same subscription twice: the block offers only the "My
  Subscriptions" link, the table offers no button for a pending or
  inactive subscription (seen on screen), and the "Purchase New
  Subscription" link on the journal's "Subscriptions" page leads to the
  home page while the reader has an individual subscription in any
  status (read in the code).

Low: the block's text is wrong, but nothing is lost and no second
purchase can follow from it. It would be medium if the block offered a
purchase, or if it were the reader's only view of the status.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` requires subscriptions, takes payments
  by the manual method, shows the "Subscription" block and offers one
  individual subscription type. The dataset leaves it open access, with
  payments off, no sidebar blocks and no subscription type, so the
  manager sets these up in steps 1–9.

Setting up the journal:

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Distribution, tab "Access". Under "Publishing Mode"
   choose "The journal will require subscriptions to access some or all
   of its contents." and press "Save".
3. Open the tab "Payments". Tick "Payments will be enabled for this
   journal. …", set "Currency" to "US Dollar" and "Payment Plugins" to
   "Manual Fee Payment".
4. In "Manual Payment Instructions" type "Pay by bank transfer." and
   press "Save".
5. Open Settings › Website, tab "Appearance", then "Setup". Under
   "Sidebar" tick "Subscription Block" and press "Save".
6. Open "Payments" in the side menu, then the tab "Subscription Types",
   and press "Create New Subscription Type".
7. Fill in "Name of Type" "Online Year u51w4", "Currency" "US Dollar
   (USD)", "Cost" "40", "Format" "Online" and "Duration" "12".
8. Choose "Individual (users are validated via login)" and press "Save".
9. Log out.

A purchase awaiting payment:

10. Sign in as `amwandenga` (a reader). The block reads "A subscription
    is required to access some resources. Learn More".
11. Open "My Subscriptions"
    (`/index.php/publicknowledge/en/user/subscriptions`) and, under
    "Individual Subscription", press "Purchase New Subscription".
12. Choose "Online Year u51w4 (40.00 USD)" under "Subscription Type"
    and press "Save". The "Manual Fee Payment" page opens. The purchase
    is stored with the day of purchase as both its start and end date.
13. Open the journal's home page and read the "Subscription" block.
14. Open "My Subscriptions" again.

**Expected.** The block on the home page reads "Online Year u51w4" and
"Awaiting Manual Payment", as it does on "My Subscriptions".

**Observed.** On the purchase day (2026-09-30) the block on the home
page reads:

```
Online Year u51w4
Expired: 2026-09-30
My Subscriptions
```

On any later day it reads the same, with the purchase date. On "My
Subscriptions" the table's "Status" and the block both read "Awaiting
Manual Payment".

A subscription that is not approved:

15. Log out and sign in as `rvaca`. Open "Payments", tab "Individual
    Subscriptions". On Alan Mwandenga's row press the arrow, then
    "Edit".
16. Set "Status" to "Needs Approval". Set "End date" to the same day
    next year, as a manager does when the subscription is to run a
    year; left at the purchase day, it would read "Expired" as in step
    13. Press "Save". The row reads "Needs Approval".
17. Log out, sign in as `amwandenga` and open the home page.
18. Open "My Subscriptions".
19. Repeat steps 15–18 with "Needs Information", then with "Other, See
    Notes".

**Expected.** The block says the subscription is not active: "Online
Year u51w4" and "Inactive", as the table on "My Subscriptions" says.

**Observed.** For each of the three statuses, the block reads, on the
home page and on "My Subscriptions" alike:

```
Online Year u51w4
Expires: 2027-09-30
My Subscriptions
```

With "Status" set to "Active" in step 16 (the control), the block and
the table both read "Expires: 2027-09-30".

## Cause

The block's template,
[`plugins/blocks/subscription/templates/block.tpl`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/blocks/subscription/templates/block.tpl#L32-L42)
(OJS), chooses the text under the subscription's name in one `{if}`
chain. Only the two awaiting-payment statuses have a branch that prints
the status, and both branches also require `$paymentsEnabled &&
$acceptSubscriptionPayments`. Every other case falls through to the
date branches: `isNonExpiring()` prints "Non-expiring", `isExpired()`
prints "Expired: {date}", and anything else "Expires: {date}".

A status other than "Active" should be printed instead of the dates.
"My Subscriptions"
([`templates/frontend/pages/userSubscriptions.tpl`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/pages/userSubscriptions.tpl#L74-L86))
does that: it checks the two awaiting statuses, then prints "Inactive"
for any other status that is not Active, and reaches the dates only for
an Active subscription.

The awaiting branches never print in the block because nothing gives
the block `$paymentsEnabled`. `SubscriptionBlockPlugin::getContents()`
assigns only `acceptSubscriptionPayments`, set from
`$paymentManager->isConfigured()`. That value already includes the
journal's `paymentsEnabled` setting (`OJSPaymentManager::isConfigured()`).
The block is rendered with the page's template variables, so it sees
`$paymentsEnabled` only on a page whose handler assigns it. Among the
reader's pages only `UserHandler::subscriptions()` ("My Subscriptions")
does, which is why the block reads correctly there.

A manual purchase stores the purchase day as both start and end date
(`UserIndividualSubscriptionForm::execute()`), and
`Subscription::isExpired()` compares that date, at midnight, with the
current time. So a pending purchase reads "Expired" from the moment it
is made.

How it came about: in OJS 2.x the block's template read
`$journalPaymentsEnabled`, and `TemplateManager` assigned that variable
on every page.
[f637c95ff2](https://github.com/pkp/ojs/commit/f637c95ff2f38f26f3dfb3f596910aeb7770f743)
(2017-06-21, `pkp/pkp-lib#1816`) removed the assignment from
`TemplateManager`. The block had been removed in 2013; two months after
that commit,
[73d57c244a](https://github.com/pkp/ojs/commit/73d57c244a3cb0af2e5d4f83709bff6a7cd2c225)
brought it back for 3.1.0 with the 2.x template, which still read
`$journalPaymentsEnabled`.
[d106e9eed2](https://github.com/pkp/ojs/commit/d106e9eed2f723d323fcfbb6a61061bc5e1d6798)
later renamed the template's variable to `$paymentsEnabled`, still
unassigned. The statuses "Needs Information", "Needs Approval" and
"Other, See Notes" have had no branch since the block was first written
([70b98a351c](https://github.com/pkp/ojs/commit/70b98a351cea2fd90b69bacd816844a8fd4f7e46),
2008).

The same chain reaches:

- "Awaiting Online Payment" (a PayPal purchase left unpaid): the same
  condition, so the block reads "Expired: {purchase date}" there too.
  Checked in the code, not walked (it needs PayPal).
- A non-expiring type: a pending purchase stores no end date, so the
  block reads "Non-expiring". Checked in the code.
- Access: `IndividualSubscriptionDAO::isValidIndividualSubscription()`
  requires the Active status. Checked in the code.
- The institutional text ("Access provided by: …") shows only for a
  valid institutional subscription
  (`InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()`).
  Checked in the code.
- No other OJS template prints a subscription's dates
  (`user.subscriptions.expires`, `user.subscriptions.expired`) without
  checking its status first; only the block and `userSubscriptions.tpl`
  use them. OJS's default theme does not override the block's template.

## Proposed fix

A proposal; the team decides. In `block.tpl`, drop `$paymentsEnabled` from the two awaiting branches
and add the branch "My Subscriptions" has for any status that is not
Active
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-block-inactive-reads-dates/fix.diff)):

```diff
-			{if $paymentsEnabled && $acceptSubscriptionPayments && $subscriptionStatus == \APP\subscription\Subscription::SUBSCRIPTION_STATUS_AWAITING_ONLINE_PAYMENT}
+			{if $acceptSubscriptionPayments && $subscriptionStatus == \APP\subscription\Subscription::SUBSCRIPTION_STATUS_AWAITING_ONLINE_PAYMENT}
 				<p class="subscription_disabled">{translate key="subscriptions.status.awaitingOnlinePayment"}</p>
-			{elseif $paymentsEnabled && $acceptSubscriptionPayments && $subscriptionStatus == \APP\subscription\Subscription::SUBSCRIPTION_STATUS_AWAITING_MANUAL_PAYMENT}
+			{elseif $acceptSubscriptionPayments && $subscriptionStatus == \APP\subscription\Subscription::SUBSCRIPTION_STATUS_AWAITING_MANUAL_PAYMENT}
 				<p class="subscription_disabled">{translate key="subscriptions.status.awaitingManualPayment"}</p>
+			{elseif $subscriptionStatus != \APP\subscription\Subscription::SUBSCRIPTION_STATUS_ACTIVE}
+				<p class="subscription_disabled">{translate key="subscriptions.inactive"}</p>
 			{elseif $individualSubscription->isNonExpiring()}
```

`$acceptSubscriptionPayments` holds the same value that "My
Subscriptions" assigns as `$paymentsEnabled` (`isConfigured()`), so
the block's `$paymentsEnabled` check can go rather than be assigned. If
payments are later turned off, the block then reads "Inactive" for a
pending purchase, as the table on "My Subscriptions" already does.

Tried on `main`. With the fix in, step 13 reads "Online Year u51w4" and
"Awaiting Manual Payment", and steps 17–18 read "Online Year u51w4" and
"Inactive" for all three statuses, on the home page and on "My
Subscriptions". The control, an Active subscription, still reads
"Expires: 2027-09-30" in the block and the table, with the fix in and
out.

**Alternatives**

- Assign `paymentsEnabled` in `SubscriptionBlockPlugin::getContents()`:
  fixes the awaiting-payment text only; the other statuses still print
  their dates.
- Print the status's own name (`Subscription::getStatusString()`,
  "Needs Approval") instead of "Inactive": more telling, but it differs
  from the individual table on "My Subscriptions", so it is a product
  choice for both pages together.
- Store no end date until a purchase is paid: the other statuses would
  still print their dates, and the manager's list shows those dates.

**What goes with it**

- Only the block's text changes. No stored data, API or plugin hook is
  involved. A custom theme that overrides `block.tpl` keeps the old
  text until it is updated.
- Backport: the diff applies as written to 3.5 and 3.4 (the same
  template). 3.3 spells the constants `$smarty.const.SUBSCRIPTION_STATUS_…`
  and needs that spelling; `subscriptions.inactive` exists there too.
- Test: an e2e scenario in U51 that reads the block after a manual
  purchase and after "Needs Approval".

Small: three lines in one template, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-block-inactive-reads-dates/walk.js)
  takes the Steps and the control ("Active") on a fresh load of the
  default dataset, and records the block's text, the "My Subscriptions"
  table and the stored row after each step:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-block-inactive-reads-dates/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs`, the
  same script, then `node bin/try-fix.js revert ojs`. `git apply
  --check` also accepts the diff on the `stable-3_5_0` checkout.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`; both
  showed the Observed text word for word. The fault involves no query,
  so it does not depend on the database. The walk ran on the purchase
  day only; the purchase date on later days is read from
  `UserIndividualSubscriptionForm::execute()` and `isExpired()`.
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
- Code reads on 3.4 and 3.3: `block.tpl` has the same chain,
  `SubscriptionBlockPlugin` assigns only `acceptSubscriptionPayments`,
  and among the reader's pages only `UserHandler` assigns
  `paymentsEnabled`.
- Introduced: `git blame` on the awaiting branches gives 7831150f4b
  (`pkp/pkp-lib#6091`, which only namespaced the constants) and, before
  it, d106e9eed2 and 18ab9dc433 (markup), leading back to 73d57c244a.
  The `ojs-2_4_8-5` tag still has both the template's
  `$journalPaymentsEnabled` and `TemplateManager`'s assignment of it;
  `ojs-3_1_0-0` contains f637c95ff2 and 73d57c244a. The GitHub API
  lists no pull request for either commit.
- Placement: `PKPTemplateManager` shows only the blocks in the journal's
  `sidebar` setting, which a new journal leaves empty
  ([spec U10, Rule 23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md)).
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by "subscription block expired", "subscription block
  awaiting payment", "subscription block status", "subscription sidebar
  expires", "subscription "needs approval"", "subscription manual
  payment expired", "subscription block inactive", and by
  `SubscriptionBlockPlugin`): nothing about this fault.
  `pkp/pkp-lib#11874` (institutional IP access for signed-out readers)
  and `pkp/pkp-lib#12234` (an unpaid PayPal purchase that cannot be
  resumed) are other faults.
- Not driven: MySQL; "Awaiting Online Payment" (needs PayPal); a
  non-expiring type.
