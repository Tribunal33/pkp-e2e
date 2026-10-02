# A reader buying a subscription type that requires membership gets the same page back, unexplained, when "Membership" is empty

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#1582` for `pkp/pkp-lib#1816` · [3aa66e2d1b](https://github.com/pkp/ojs/commit/3aa66e2d1bc6958f98911d7fe4331ab9cfbf3604) · 2017-10-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On "Purchase Individual Subscription", a signed-in reader chooses a
subscription type that requires membership information and presses
"Save" with "Membership" empty. The same page comes back with the type
still chosen, no message and nothing marked, and no subscription is
created. The form's own message, "The selected subscription type
requires membership information.", is never shown.

Nothing on the page says the box is needed: "Membership" carries no
required mark and no hint, and the type's name need not mention
membership. The reader gets through only by guessing that the one empty
box is the reason.

It needs a journal that requires subscriptions and has payments set up
(Settings › Distribution › "Payments": "Enable" and a payment method),
with an individual type that requires membership.

## Impact

- **Lost:** nothing; the purchase waits until the reader fills the box.
- **Who:** signed-in readers buying such a type, whenever they leave
  "Membership" empty.
- **Way round:** type something into "Membership" and press "Save"
  again.

Low: the purchase goes through on a second try once the only empty box
is filled. It would be medium if readers gave up on it, since nothing on
the page names the box.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`. Signed in as
`rvaca` (Journal manager):

1. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents.", "Save".
2. Settings › Distribution › "Payments": tick "Enable", Currency "US
   Dollar", Payment Plugins "Manual Fee Payment", type any "Manual
   Payment Instructions", "Save".
3. "Payments" in the side menu › "Subscription Types" › "Create New
   Subscription Type": Name "Member Year", Cost `7`, Currency "US
   Dollar", Format "Online", Duration `12`, "Individual (users are
   validated via login)", tick "Subscriptions require membership
   information (e.g. of an association, organization, consortium, etc.)",
   "Save".
4. The same for "Campus Year", Cost `100`, "Institutional (users are
   validated via domain or IP address)", the membership box unticked
   (for the control).

Steps:

1. Sign in as `ccorino` (a Reader with no subscription).
2. Open `/index.php/publicknowledge/en/user/subscriptions` ("My
   Subscriptions"; a default install's menus have no item for it).
3. Under "Individual Subscription" press "Purchase New Subscription".
4. "Subscription Type": "Member Year (7.00 USD)"; leave "Membership"
   empty; press "Save".
5. Type `ACME` into "Membership" and press "Save".
6. Control: open "My Subscriptions" again, press "Purchase New
   Subscription" under "Institutional Subscriptions", and press
   "Continue" with every box empty.

**Expected.** Step 4 stays on the page and says why, as step 6 does:

```
Errors occurred processing this form:
The selected subscription type requires membership information.
```

**Observed.** Step 4 shows the same page again, with the type still
chosen and no message:

```
Purchase Subscription
Subscription Type  Member Year (7.00 USD)
Membership
Save
```

No request fails. Step 5 shows "Manual Fee Payment" with "Subscription
Fee (Member Year)" and "Fee 7.00 (USD)", and the subscription is stored
as "Awaiting Manual Payment" with membership "ACME". Step 6 shows its
refusals at the top: "Errors occurred processing this form: An
institution name is required. The selected subscription type requires a
domain and/or an IP range for subscription authentication."

## Cause

`UserIndividualSubscriptionForm::readInputData()`
([L146–L148](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/subscription/form/UserIndividualSubscriptionForm.php#L146-L148))
adds a required check on `membership` when the type asks for it, and
`UserHandler::payPurchaseSubscription()`
([L296–L300](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/pages/user/UserHandler.php#L296-L300))
shows the form again when `validate()` fails. So the server refuses
correctly and hands the template its errors.

The template has no place to show them.
[`purchaseIndividualSubscription.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/templates/frontend/pages/purchaseIndividualSubscription.tpl#L14-L17)
goes from `{csrf}` straight to the fieldset. Its twin,
[`purchaseInstitutionalSubscription.tpl`](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/templates/frontend/pages/purchaseInstitutionalSubscription.tpl#L23-L25),
includes `common/formErrors.tpl` right after `{csrf}`, as
`userRegister.tpl` does. Both purchase templates were written in
3aa66e2d1b, which moved the purchase forms to the reader's side; the
institutional one got the include, the individual one did not. The old
form it replaced (`templates/user/userIndividualSubscriptionForm.tpl`)
had an in-place notification area.

Reach:

- The membership refusal: checked on screen.
- The form's other refusals that can be met are silent the same way
  (code): "Please select a valid subscription type." (a manager hides or
  deletes the type while the reader has the page open) and the CSRF
  refusal, `form.csrfInvalid`, which a reader meets with a stale form
  (after their session ended and they signed in again in another tab).
- The "already has an individual subscription" check (constructor L83)
  reads a `userId` field that `readInputData()` never reads, so it never
  fires; the handler's redirect is the real guard. Not changed here.
- "Purchase" beside an active individual subscription on "My
  Subscriptions" opens the same template, so it has the same fault
  (code).
- Stored data: none. A refused save stores nothing (checked in the
  database).

## Proposed fix

Proposal: include the shared error list in the individual purchase page,
where the institutional page has it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/individual-purchase-refusal-says-nothing/fix.diff)):

```diff
 	<form class="cmp_form purchase_subscription" method="post" id="subscriptionForm" action="{url op="payPurchaseSubscription" path="individual"|to_array:$subscriptionId}">
 		{csrf}
 
+		{include file="common/formErrors.tpl"}
+
 		<fieldset>
```

It follows the twin template line for line and shows every refusal the
form can make, the CSRF one included. Tried on `main`: with the fix,
step 4 shows "Errors occurred processing this form: The selected
subscription type requires membership information." at the top of the
page, and steps 5 and 6 behave as before.

**Alternatives:**

- Mark "Membership" as required in the template. Only some types require
  it, and the type can change on the page, so a fixed mark would be wrong
  for the others. It also leaves the other refusals silent.
- Check the box in the browser. It adds script to a page that has none,
  and the server's refusal would still be silent.

**What goes with it:**

- No data repair.
- Applies as written to 3.5, 3.4 and 3.3: the template is the same on
  each line.
- A hint under "Membership", as the institutional page has
  ("Membership information if required for the selected subscription
  type."), would help too; it is wording, left to the team.
- The guard: a U51 scenario that saves the purchase page with a type
  that requires membership and no membership, and expects the message.

Small: one include in one template, copied from its twin.

## Evidence

- Kept walk:
  [`shared/playwright/checks/issues/individual-purchase-refusal-says-nothing/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/individual-purchase-refusal-says-nothing/walk.js)
  (helpers in `lib.js` beside it), on an install reset to the default
  dataset; run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/individual-purchase-refusal-says-nothing/walk.js`.
  The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/individual-purchase-refusal-says-nothing/fix.diff ojs`,
  the walk again, then `revert`.
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
- Code reads on 3.4 and 3.3: the same check (`UserIndividualSubscriptionForm.php`
  L147 / `.inc.php` L124), the same redisplay (`UserHandler.php`
  L296–L300 / `.inc.php` L265–L269) and the same template without the
  include.
- Introduced: `git log --follow` on the template; created in 3aa66e2d1b
  (merged as `pkp/ojs#1582`), whose institutional twin got the include in
  the same commit. Whether the older in-place notification showed this
  refusal on 3.0 was not checked.
- Upstream: `pkp/pkp-lib#2962` (closed, "Fix membership options") asked
  to double-check this form's membership box and does not cover the
  missing message; `pkp/pkp-lib#3933` (closed) lists other problems on
  these pages.
