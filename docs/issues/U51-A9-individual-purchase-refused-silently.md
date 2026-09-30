# Buying an individual subscription with "Membership" empty returns the same page with no reason given

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1582` for `pkp/pkp-lib#1816` · [3aa66e2d1b](https://github.com/pkp/ojs/commit/3aa66e2d1bc6958f98911d7fe4331ab9cfbf3604) · 2017-10-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a9)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On "Purchase Individual Subscription", choosing a type that asks for
membership and pressing "Save" with "Membership" empty shows the same
page again, with no message and nothing marked, and no subscription is
created. The institutional purchase page shows its refusals at the top;
this page has no place for them.

In practice the missing membership is the refusal readers meet. The
page's only other refusal, "Please select a valid subscription type.",
comes only from a page left open while the journal withdrew the type,
or from a crafted request; it is silent too.

Nothing on the page says that the type needs membership information, so
a reader who does not think of filling "Membership" cannot buy the
subscription, and the journal is not told of the lost sale.

## Impact

- **Lost.** The purchase, and with it the journal's sale when the
  reader gives up. No subscription, payment or message is recorded, so
  the journal never learns that a reader tried.
- **Who.** Readers buying an individual subscription on a journal that
  requires subscriptions, takes payments, and offers an individual type
  with "Subscriptions require membership information" ticked, whenever
  they leave "Membership" empty.
- **Way round.** Type something in "Membership" and press "Save" again:
  the purchase then goes through.

Medium: it needs a narrow setup, an individual type with the membership
option ticked (off by default), and the "Membership" box sits on the
page under its label, so a reader can guess what is missing or ask the
journal. It would be high if a refusal readers commonly meet, such as a
required field every type has, were silent the same way.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` requires subscriptions, takes manual
  payments and has an individual subscription type that asks for
  membership. The dataset has none of this (the journal is open access,
  payments are off and there are no subscription types), so the journal
  manager sets it up in steps 1–5. The reader is `ccorino`.

Setting up (the journal manager):

1. Sign in as `rvaca`.
2. Open Settings › Distribution, tab "Access". Choose "The journal will
   require subscriptions to access some or all of its contents." and
   press "Save".
3. Open the tab "Payments". Tick "Payments will be enabled for this
   journal. …", set "Currency" to "US Dollar" and "Payment Plugins" to
   "Manual Fee Payment", type "Pay by bank transfer." in "Manual Payment
   Instructions" and press "Save".
4. Open "Payments" in the side menu, its tab "Subscription Types", and
   press "Create New Subscription Type". Type "Member Year u51w11" in "Name", choose "US Dollar", type
   "7" in "Cost", choose "Online" in "Format", type "12" in "Duration",
   choose "Individual (users are validated via login)", tick
   "Subscriptions require membership information (e.g. of an
   association, organization, consortium, etc.)" and press "Save".
5. Log out.

The reader:

6. Sign in as `ccorino` and open "My Subscriptions"
   (`/index.php/publicknowledge/en/user/subscriptions`).
7. Under "Individual Subscription" press "Purchase New Subscription".
   The page opens; the browser tab reads "Purchase Individual
   Subscription".
8. Leave "Subscription Type" at "Member Year u51w11 (7.00 USD)" and
   "Membership" empty, and press "Save".
9. Open "My Subscriptions" again.
10. Press "Purchase New Subscription", type "ACME" in "Membership" and
    press "Save".

**Expected.** Step 8 shows the page again with the reason at the top,
as "Purchase Institutional Subscription" does with its refusals:

```
Errors occurred processing this form:
The selected subscription type requires membership information.
```

**Observed.** Step 8 answers 200 and shows the page exactly as in step
7: the box "Purchase Subscription" with "Subscription Type" "Member Year
u51w11 (7.00 USD)", "Membership" empty, and "Save". No message, no
marked box. Step
9: "My Subscriptions" lists no subscription and still offers "Purchase
New Subscription".

Step 10, the control, shows "Manual Fee Payment" with "Subscription Fee
(Member Year u51w11)", "7.00 (USD)", and "My Subscriptions" then lists
"Member Year u51w11", "Awaiting Manual Payment". No request failed.

## Cause

`UserIndividualSubscriptionForm::readInputData()` adds a required check
on `membership` with the message `user.subscriptions.form.membershipRequired`
("The selected subscription type requires membership information.")
when the chosen type asks for membership
([lines 138–149](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/UserIndividualSubscriptionForm.php#L138-L149)).
`UserHandler::payPurchaseSubscription()` validates the form and, when it
fails, calls `$subscriptionForm->display()`
([lines 296–300](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/pages/user/UserHandler.php#L296-L300)).
`Form::display()` hands the template `isError` and `errors`.

The template drops them.
[`templates/frontend/pages/purchaseIndividualSubscription.tpl`](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/frontend/pages/purchaseIndividualSubscription.tpl#L14-L17)
has no `{include file="common/formErrors.tpl"}`, the partial that lists
a form's errors. The two other frontend pages of OJS and pkp-lib that
show a `Form`'s refusals use it: "Purchase Institutional Subscription"
(line 25), written in the same change, and "Register" (pkp-lib's
`frontend/pages/userRegister.tpl`, line 40).

The page lost its error display when 3aa66e2d1b moved both purchase
forms to the frontend theme. The template it replaced,
`templates/user/userIndividualSubscriptionForm.tpl`, drew each box with
`fbvElement`, which shows a field's error message in place of its
label. The new template writes plain HTML and did not add the error
list.

The reach:

- "Please select a valid subscription type." is silent as well. It is
  reached only when the chosen type is no longer a public individual
  one: a page left open while the journal hid or deleted the type, or a
  crafted request. Read in the code.
- "This user account already has an individual subscription." never
  fires. For a new purchase `payPurchaseSubscription()` redirects to the
  home page before building the form when the reader already has one,
  and the form's own check reads a `userId` field that `readInputData()`
  never sets, so it queries user 0 and always passes. Read in the code;
  a dead check, not part of this fault.
- "Login" and "Lost password" also post back to themselves; they show
  their own `$error` rather than `formErrors.tpl`. Read in the code.

## Proposed fix

A proposal; the team decides. Add the error list to the individual purchase page, where the
institutional page has it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/individual-purchase-refused-silently/fix.diff)):

```diff
--- a/templates/frontend/pages/purchaseIndividualSubscription.tpl
+++ b/templates/frontend/pages/purchaseIndividualSubscription.tpl
@@ -14,6 +14,8 @@
 	<form class="cmp_form purchase_subscription" method="post" id="subscriptionForm" action="{url op="payPurchaseSubscription" path="individual"|to_array:$subscriptionId}">
 		{csrf}
 
+		{include file="common/formErrors.tpl"}
+
 		<fieldset>
 			<legend>
 				{translate key="payment.subscription.purchase"}
```

Each entry in the list links to its box (`#membership`), and the list
is drawn only when the form was refused, so the page as first opened is
unchanged.

Tried on `main`: with the fix in, step 8 shows "Errors occurred
processing this form:" and "The selected subscription type requires
membership information." above the box, and still creates nothing. The
page as first opened (step 7) and the accepted purchase (step 10) are
the same with the fix in and out.

**Alternatives**

- Mark "Membership" as required on the page: whether it is required
  depends on the chosen type, so a static mark would be wrong for the
  other types, and the refusal would still say nothing.
- Check "Membership" in the browser before the page is sent: the type
  list would need to carry each type's membership setting to a script,
  more code for the same message, and the server's refusal would still
  be silent.

**What goes with it**

- `formErrors.tpl` also sets the address's hash to `#formErrors`, so on
  a refusal the page jumps to the list, as the institutional page does.
- No REST API, plugin hook or stored data is involved. A theme that
  overrides this template needs the same line.
- Backport: the template is the same on 3.5, 3.4 and 3.3, and
  `common/formErrors.tpl` exists in each, so the diff applies as written.
- Test: an e2e scenario in spec U51 in which "Save" with a membership
  type and "Membership" empty shows the message and creates nothing.

Small: one line in one template, and an e2e scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/individual-purchase-refused-silently/walk.js),
  steps 1–10, run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/individual-purchase-refused-silently/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The same script
  records, for the fix, that step 7 shows no error list and step 10
  reaches the payment page.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/individual-purchase-refused-silently/fix.diff ojs`,
  the script, then `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–10 on `main` and on `stable-3_5_0`,
  with the same result. MySQL not driven; nothing here depends on the
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
- Code reads: on 3.5, 3.4 and 3.3 `purchaseIndividualSubscription.tpl`
  is byte for byte the one on `main` (no `formErrors.tpl`), the
  institutional template includes it, the form adds the membership check
  (`UserIndividualSubscriptionForm.php` line 147 on 3.5 and 3.4,
  `.inc.php` line 124 on 3.3), and `UserHandler` re-displays the form on
  a failed `validate()` (3.4 `UserHandler.php` lines 296–299, 3.3
  `UserHandler.inc.php` lines 265–268).
- Introduced: `git log --follow` on the template. 3aa66e2d1b created it
  without the error list, in `pkp/ojs#1582` (merged as
  [517000ca28](https://github.com/pkp/ojs/commit/517000ca285ae1b4178aeb3e4f4853cf8d5332c4)).
  The template it replaced, `templates/user/userIndividualSubscriptionForm.tpl`
  from [8fd1952230](https://github.com/pkp/ojs/commit/8fd195223058e8c47f5be65023462084c5f92460)
  (2017-05-31, `pkp/pkp-lib#1816`), drew its fields with the form
  builder (`fbvElement`), which shows a field's error in its label;
  before that, the 2009–2017 template included `common/formErrors.tpl`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words (membership, purchase individual subscription, error)
  and by `purchaseIndividualSubscription`, `UserIndividualSubscriptionForm`
  and `formErrors`. `pkp/pkp-lib#2962` (closed, 2017) asked to
  "double-check the 'membership' field on the individual subscription
  purchase form"; its commits changed the subscription type form only
  and do not name this fault. `pkp/pkp-lib#7100` (closed) is about the
  manager's institutional subscription form, `pkp/pkp-lib#3933` (closed)
  about other faults on the purchase pages.
- Not walked: the stale-type refusal (read in the code).
