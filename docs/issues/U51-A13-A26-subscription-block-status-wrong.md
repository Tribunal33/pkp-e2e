# The sidebar "Subscription" block tells a reader a subscription awaiting payment has expired, and an inactive one is running

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no PR, for `pkp/pkp-lib#1816` · [73d57c244a](https://github.com/pkp/ojs/commit/73d57c244a3cb0af2e5d4f83709bff6a7cd2c225) · 2017-08-23 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a13), [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a26)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A reader who has just bought a subscription with the manual payment
method sees, in the sidebar's "Subscription" block on every page that
shows it, the type's name and "Expired: {today}", while "My
Subscriptions" reads "Awaiting Manual Payment". The block keeps saying
so until a manager sets the subscription to "Active".

A manager can also set a subscription to "Needs Approval", "Needs
Information" or "Other, See Notes". The block then shows the type's
name and "Expires: {date}", styled as a running subscription, on every
page that shows it. On "My Subscriptions", the table under the block
reads "Inactive" for the same subscription.

The subscription's stored status is right; "My Subscriptions" shows it
and the block contradicts it. Only individual subscriptions
are affected, on a subscription journal with the "Subscription Block"
in its sidebar.

## Impact

- **Lost:** a correct account of the reader's own subscription, nothing
  more.
- **Who:** every reader who buys with the manual method, for as long as
  the journal takes to receive and record the payment (often days); and
  every reader whose subscription a manager has set to one of the three
  inactive statuses, for as long as it stays there.
- **Way round:** the reader opens "My Subscriptions"; the journal can
  take the block out of the sidebar.

Low: the stored subscription, its dates and the payment are right, and
the reader can find the true status one click away. It would be medium if readers were seen to
act on the block's line, buying a second time or writing to the journal
about an expiry that did not happen.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`. The dataset has
payments off, open access, no subscription type and nothing in the
sidebar, so, signed in as `rvaca`:

1. Settings › Distribution › "Payments": tick "Enable",
   Currency "US Dollar", Payment Plugins "Manual Fee Payment", type any
   "Manual Payment Instructions", "Save".
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents.", "Save".
3. Settings › Website › "Appearance" › "Setup": under "Sidebar" tick
   "Subscription Block", "Save".
4. "Payments" › "Subscription Types" › "Create New Subscription Type":
   name "Online Year u51sb3", cost `10`, currency US Dollar, format
   "Online", duration `12`, "Individual", "Save".

Steps, awaiting payment:

1. Sign in as `ckwantes` (a Reader). Open "My Subscriptions"
   (`/index.php/publicknowledge/en/user/subscriptions`), press "Purchase
   New Subscription", choose "Online Year u51sb3" and press "Save":
   the "Manual Fee Payment" page.
2. Open the journal's home page, then "Signalling Theory Dividends":
   read the "Subscription" block.
3. Open "My Subscriptions": read the subscription's status and the
   block.

Steps, inactive:

4. Sign in as `rvaca`. "Payments" › "Individual Subscriptions" › the
   row of Catherine Kwantes › "Edit": Status "Needs Approval", "End date"
   a year from today, "Save".
5. Sign in as `ckwantes` and open the home page: read the block.
6. Open "My Subscriptions": read the table and the block.

**Expected.** In step 2 the block reads "Awaiting Manual Payment", as
"My Subscriptions" does in step 3. In steps 5 and 6 the block reads
"Inactive", as the table on "My Subscriptions" does.

**Observed.** Step 2, on the home page and the article page alike, in
the block's disabled style:

```
Subscription
Online Year u51sb3
Expired: 2026-10-01
My Subscriptions
```

Step 3: the table reads "Awaiting Manual Payment" and so does the block.

Steps 5 and 6, on every page, "My Subscriptions" included, in the
block's active style:

```
Subscription
Online Year u51sb3
Expires: 2027-10-01
My Subscriptions
```

while the table on "My Subscriptions" reads "Inactive". "Needs
Information" and "Other, See Notes" in step 4 give the same. No request
fails.

Control: with Status "Active" in step 4, the block and the table both
read "Expires: 2027-10-01"; with "Active" and an end date of yesterday,
both read "Expired: {yesterday}".

## Cause

The block's template,
[`plugins/blocks/subscription/templates/block.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/plugins/blocks/subscription/templates/block.tpl#L32-L42),
picks the line for an individual subscription in this order: awaiting
online payment, awaiting manual payment, non-expiring, expired by date,
otherwise "Expires: {date}". Two things are wrong with it, and both
make it read the dates where it should read the status.

The two awaiting lines are gated on `$paymentsEnabled &&
$acceptSubscriptionPayments`. `SubscriptionBlockPlugin::getContents()`
assigns only `acceptSubscriptionPayments` (`$paymentManager->isConfigured()`,
[L104](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/plugins/blocks/subscription/SubscriptionBlockPlugin.php#L104)).
Nothing assigns `paymentsEnabled` for the block; only
`UserHandler::subscriptions()` does, for its own page
([L94](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/user/UserHandler.php#L94)),
so the awaiting lines show on "My Subscriptions" and nowhere else.
Elsewhere an awaiting subscription falls through to the dates, and a
manual purchase stores today as its end date
(`UserIndividualSubscriptionForm::execute()`), which `isExpired()` reads
as passed: "Expired: {today}".

The template has never had a line for the other inactive statuses
(Needs Information, Needs Approval, Other). They fall through to the dates
too, and an end date in the future reads "Expires: {date}" in the
active style. The rule both break is the one "My Subscriptions" follows
in
[`userSubscriptions.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/templates/frontend/pages/userSubscriptions.tpl#L74-L101):
a subscription that is not active shows its status ("Awaiting … Payment"
or "Inactive"), and only an active one shows its dates.

The gate dates from OJS 2, where `TemplateManager` assigned
`journalPaymentsEnabled` to every page.
[f637c95ff2](https://github.com/pkp/ojs/commit/f637c95ff2f38f26f3dfb3f596910aeb7770f743)
(`pkp/pkp-lib#1816`, 2017-06-21) removed that global, and
[73d57c244a](https://github.com/pkp/ojs/commit/73d57c244a3cb0af2e5d4f83709bff6a7cd2c225)
re-added the block (removed for 3.0) two months later with its OJS 2
template, still gated on the variable; `journalPaymentsEnabled` became
`paymentsEnabled` later that year.

Reach:

- Awaiting manual payment: checked on screen (home page, article page,
  "My Subscriptions").
- Awaiting online payment (PayPal): the same gate; code only, the
  outside service was not driven.
- A manual purchase of a non-expiring type stores no dates, so the
  block reads "Non-expiring", styled as running, instead of "Awaiting
  Manual Payment" (code; not walked).
- Needs Information, Needs Approval, Other: checked on screen. The
  reader's galleys are refused meanwhile, since access requires an
  active subscription (`IndividualSubscriptionDAO::isValidIndividualSubscription()`
  filters on the status; code, no galley opened in the walk).
- Active within and past its dates: unaffected, checked on screen.
- Institutional subscriptions: not affected (code). The block reads only
  the signed-in reader's individual subscription for its status lines;
  its institutional lines ("Access provided by …") show only when
  `InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()`
  finds an active subscription for the visitor's address, so an
  inactive or unpaid institutional subscription never reaches it.
- Other templates gated on `$paymentsEnabled`: `userSubscriptions.tpl`
  and `subscriptionPolicyForm.tpl`, whose handlers assign it (code).

## Proposed fix

Proposal: give the block the status lines "My Subscriptions" already
has, in `block.tpl` alone
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-block-status-wrong/fix.diff)):

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

The block assigns the template variable `$acceptSubscriptionPayments`
from `OJSPaymentManager::isConfigured()`, which already requires the
journal setting `paymentsEnabled` ("Enable" under Settings › Distribution
› "Payments"). `UserHandler` assigns its
`$paymentsEnabled` from the same call, so the two variables always hold
the same value and dropping `$paymentsEnabled` loses nothing. The new
branch is the one `userSubscriptions.tpl` uses, with its locale key.

One behaviour changes beyond the two symptoms: a subscription still
awaiting payment after the journal has switched payments off reads
"Inactive" instead of "Expired: {purchase date}". "My Subscriptions"
already reads "Inactive" there, and it is right: the reader can no
longer pay, and the subscription gives no access.

Tried on `main`: with the fix, the block reads "Awaiting Manual Payment"
after the purchase and "Inactive" for each of the three statuses, on
the home page, the article page and "My Subscriptions"; an active
subscription still reads "Expires: 2027-10-01" and an ended one
"Expired: {yesterday}", as without it.

**Alternatives:**

- Assign `paymentsEnabled` in `SubscriptionBlockPlugin::getContents()`.
  It fixes the awaiting lines but leaves the three inactive statuses
  reading "Expires: {date}".
- Show `getStatusString()` for every inactive status. More precise
  ("Needs Approval"), but "My Subscriptions" says "Inactive" for these
  and the two should agree; the wording is the team's choice.

**What goes with it:**

- Applies as written to 3.5 and 3.4 (the same template). 3.3 writes the
  constants as `$smarty.const.SUBSCRIPTION_STATUS_…`, so its backport
  uses that form.
- A theme that overrides `plugins/blocks/subscription/templates/block.tpl`
  keeps the old lines until it follows.
- The guard: a U51 scenario that buys a subscription with the manual
  method and reads the block on the home page, then sets the
  subscription to "Needs Approval" and reads it again.

Small: four lines in one template (two edited, two added), following
"My Subscriptions", no data repair.

## Evidence

- Kept walk:
  [`shared/playwright/checks/issues/subscription-block-status-wrong/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-block-status-wrong/walk.js)
  (helpers in `lib.js` beside it), the steps for all three inactive
  statuses, the control and the neighbour check (Active, ended
  yesterday); 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front:
  `PROBE_FEATURE=issues-sb3 PROBE_AGENT=sb3 node bin/probe.js ojs shared/playwright/checks/issues/subscription-block-status-wrong/walk.js`
- The fix (result under Proposed fix):
  `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-block-status-wrong/fix.diff ojs`
- Tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0`
  [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
  (lib/pkp 3bb4450bea); `stable-3_4_0`
  [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315);
  `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b).
  Dataset pkp/datasets c657990 (2026-10-01), PostgreSQL; nothing here
  depends on the database.
- Code reads: `block.tpl` and `SubscriptionBlockPlugin` on each line
  (3.4's template is main's; 3.3's differs only in the constants' form
  and the institution's name); `userSubscriptions.tpl` and
  `UserHandler::subscriptions()` (assigns `paymentsEnabled`; 3.3 and 3.4
  the same); `OJSPaymentManager::isConfigured()`;
  `Subscription::isExpired()`; `UserIndividualSubscriptionForm::execute()`
  (today as start and end for a new purchase, none for a non-expiring
  type); `IssueAction::subscribedUser()` and
  `IndividualSubscriptionDAO::isValidIndividualSubscription()` (access
  needs an active status); `InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()`.
- Introduced: `git blame` puts the gated lines in 7831150f4b (2021, the
  constants' namespacing), before it d106e9eed2 (2017-10-26, the
  variable renamed from `journalPaymentsEnabled`), and the lines
  themselves in 73d57c244a, "pkp/pkp-lib#1816 Re-add block plugin";
  `git log -S"journalPaymentsEnabled', \$paymentManager"` on
  `TemplateManager` finds f637c95ff2 removing the global. `pkp/ojs`
  lists no pull request for either commit. The inactive statuses already
  fell through to the dates in the OJS 2 template (663a816c52^).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for
  "subscription block expired", "subscription block awaiting payment",
  "subscription block inactive", "awaiting manual payment", "needs
  approval", "paymentsEnabled" and "SubscriptionBlockPlugin".
  `pkp/pkp-lib#11874` (institutional IP access for signed-out readers)
  and `pkp/pkp-lib#12234` (resuming a PayPal subscription purchase)
  are other faults.
- OMP and OPS have no subscriptions, so no such surface.
- Unverified: the non-expiring purchase and the refused galleys under
  an inactive status are read in the code only (Reach).
