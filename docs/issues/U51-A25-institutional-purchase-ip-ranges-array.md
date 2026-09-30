# "Purchase" beside an institutional subscription opens with "IP ranges" reading "Array", refused on "Continue"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code; with two or more ranges only)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#3933` (closed; its item 4, "Array" in this box, was fixed for 3.3 by `pkp/ojs#2976` and came back in 3.4)
- **Tracked in** spec U51 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a25)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On "My Subscriptions", "Purchase" beside an active institutional
subscription opens "Purchase Institutional Subscription" with "IP
ranges" reading "Array". This happens whether the institution has IP
ranges or only a domain. Pressing "Continue" without changing anything
is refused with "Please enter a valid IP range.".

To go on, the reader must type the institution's IP ranges into the box,
one per line, or empty it when the institution is known by its domain
alone. No page a reader can open lists the ranges.

## Impact

- **Lost.** Nothing stored. The reader must supply the ranges
  themselves; a reader who does not know them has to ask the journal,
  whose manager sees them on the "Institutions" page.
- **Who.** Readers with an active institutional subscription who press
  the "Purchase" beside it, to change its type or buy again. No other
  path fills this page: "Purchase New Subscription" opens it empty,
  "Renew" goes straight to the payment page, and the manager uses a
  form of their own.
- **Way round.** Type the ranges again, or empty the box for an
  institution known by its domain, and press "Continue". A reader who
  does not know the ranges can also empty the box and give the
  institution's domain; the purchase then goes on, but the institution
  it creates has no IP ranges (read in the code).

Low: the page goes through once the box is corrected, and it is reached
only from a button that readers do not need in order to buy or renew. It
would be medium if a purchase readers cannot avoid, such as a new one,
filled the box this way.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` requires subscriptions and takes manual
  payments. It has an institutional subscription type and an institution
  with two IP ranges, and the reader `ccorino` holds an active
  institutional subscription. The dataset has none of this: the journal
  is open access, payments are off, and there are no subscription types,
  institutions or subscriptions. So the journal manager sets it up in
  steps 1–7.

Setting up (the journal manager):

1. Sign in as `rvaca`.
2. Open Settings › Distribution, tab "Access". Choose "The journal will
   require subscriptions to access some or all of its contents." and
   press "Save".
3. Open the tab "Payments". Tick "Payments will be enabled for this
   journal. …", set "Currency" to "US Dollar" and "Payment Plugins" to
   "Manual Fee Payment", type "Pay by bank transfer." in "Manual Payment
   Instructions" and press "Save".
4. Open Payments › "Subscription Types" › "Create New Subscription
   Type". Type "Campus Year u51w3" in "Name", choose "US Dollar", type
   "100" in "Cost", choose "Online" in "Format", type "12" in
   "Duration", choose "Institutional (users are validated via domain or
   IP address)" and press "Save".
5. Open "Institutions" in the side menu (it appears once step 3 has
   turned payments on) › "Add Institution". Type "Harbour Library u51w3"
   in "Name" and, in "IP ranges", "192.0.2.10" and on a second line
   "198.51.100.0/24". Press "Save".
6. Open Payments › "Institutional Subscriptions" › "Create New
   Subscription". Find and choose `ccorino`, choose "Campus Year u51w3",
   "Status" "Active", "Institution" "Harbour Library u51w3", "Start"
   today and "End" the same day next year, and press "Save".
7. Log out.

The reader:

8. Sign in as `ccorino` and open "My Subscriptions"
   (`/index.php/publicknowledge/en/user/subscriptions`): the "Campus Year
   u51w3" row reads "Expires: {next year}" with "Renew" and "Purchase".
9. Press "Purchase": "Purchase Institutional Subscription" opens.
10. Press "Continue" without changing anything.
11. In "IP ranges" type "192.0.2.10" and on a second line
    "198.51.100.0/24", and press "Continue".

[An institution known by its domain alone: in step 5 leave "IP ranges"
empty, in step 6 type "example.edu" in "Domain", and in step 11 empty
the "IP ranges" box instead.]

**Expected.** In step 9 "IP ranges" shows "192.0.2.10" and
"198.51.100.0/24" on two lines, as the "Institutions" page does (empty
for the domain-only institution), and step 10 goes on to the "Manual
Fee Payment" page.

**Observed.** In step 9 "Institution name" reads "Harbour Library
u51w3", "Domain" is empty and "IP ranges" reads `Array`. Step 10 shows
the same page again, "IP ranges" still `Array`, with:

```
Errors occurred processing this form:
Please enter a valid IP range.
```

Step 11 goes on to the "Manual Fee Payment" page for 100.00 USD. With
the domain-only institution, step 9 shows "Domain" "example.edu" and
"IP ranges" `Array`, step 10 is refused the same way, and step 11 (the
box emptied) goes on to the payment page.

No request failed. "Purchase New Subscription", below the same table,
opens the page with an empty "IP ranges".

Step 11 also sets the subscription to "Awaiting Manual Payment" and adds
a second institution of the same name. Both are separate faults, the
first reported as "A reader who presses 'Purchase' beside an active
subscription loses access at once, before paying".

## Cause

`APP\subscription\form\UserInstitutionalSubscriptionForm::initData()`
fills the form from the subscription's institution, and passes the
institution's IP ranges as they come:
`'ipRanges' => $institution->getIPRanges()`
([line 110](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/UserInstitutionalSubscriptionForm.php#L101-L113)).
`PKP\institution\Institution::getIPRanges()` returns an array, empty
for an institution with no ranges. The page prints the value into a
text box
(`<textarea name="ipRanges">{$ipRanges|escape}</textarea>` in
`templates/frontend/pages/purchaseInstitutionalSubscription.tpl`), and
PHP turns any array printed as text, even an empty one, into the word
"Array".

The rest of the form treats the box as text with one range per line:
`readInputData()` checks each line of `explode("\r\n", trim($ipRanges))`
against the IP pattern, and `execute()` splits it the same way before
saving. "Array" is not an IP range, so the page is refused. The
"Institutions" page shows the same ranges joined with `'\r\n'`
(`InstitutionsListPanel.vue`).

The same "Array" was reported in 2018 as item 4 of `pkp/pkp-lib#3933`,
when the ranges were kept on the subscription. f758f554df
(`pkp/ojs#2976`, 2021) fixed it by passing
`$subscription->getIPRangesString()`. 11f902f20f (`pkp/ojs#3465`, for
`pkp/pkp-lib#6782`, 2022) moved IP ranges from subscriptions to the new
institutions and changed this line to `$institution->getIPRanges()`,
which returns the array again.

The reach:

- Only a page for an existing subscription is filled in: "Purchase"
  beside an active institutional subscription (walked), or a bookmarked
  purchase address of an institutional subscription awaiting payment
  (read in the code).
- What the reader types does not change the institution's stored
  ranges. `execute()` adds a new institution with the typed values and
  moves the subscription to it; the old institution keeps its ranges
  (read in the code, and seen in the stored institutions after the
  walk). An emptied box gives the new institution one empty range,
  which matches no address.
- `UserHandler::payPurchaseSubscription()` still has branches for
  `addIpRange` and `delIpRange` that treat the value as an array. No
  screen sends those fields (the page has one box and no add or delete
  buttons). Read in the code; left out of the fix.
- The other readers of an institution's ranges turn them into text
  themselves: the institutional subscription emails
  (`implode(' ', …)`) and the subscriptions report (one per line). Read
  in the code.
- On 3.3 the ranges belong to the subscription, and
  `InstitutionalSubscription::getIPRangesString()` joins them with
  `'\n'` in single quotes: a backslash and an "n", not a line break. One
  range shows correctly. Two or more show as one line, which the 3.3
  form splits on white space and refuses with the same message. Read in
  the code.

## Proposed fix

A proposal; the team decides. Give the box the ranges one per line, the shape the form reads back
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-ip-ranges-array/fix.diff)):

```diff
--- a/classes/subscription/form/UserInstitutionalSubscriptionForm.php
+++ b/classes/subscription/form/UserInstitutionalSubscriptionForm.php
@@ -107,7 +107,8 @@
                 'institutionName' => $institution->getLocalizedName(),
                 'institutionMailingAddress' => $subscription->getInstitutionMailingAddress(),
                 'domain' => $subscription->getDomain(),
-                'ipRanges' => $institution->getIPRanges()
+                // The form's box holds one IP range per line (readInputData() splits it again)
+                'ipRanges' => implode("\r\n", $institution->getIPRanges())
             ];
```

`initData()` is where the form turns the stored values into its fields'
values. `"\r\n"` is what a browser sends for a line break in a text box,
and what `readInputData()` and `execute()` split on. An institution
with no ranges gives an empty box.

Tried on `main`: with the fix in, step 9 shows the two ranges on two
lines and step 10 goes on to the "Manual Fee Payment" page. "Purchase
New Subscription", which the fix must not change, opens with an empty
"IP ranges" and accepts two typed ranges, with the fix in and out.

**Alternatives**

- Join the ranges in the template: the page would then shape one field
  itself, where `initData()` shapes all the others.
- Let `readInputData()` accept an array: the box always sends text, so
  the value it prints would still read "Array".
- Rely on removing the "Purchase" beside an active subscription, as the
  report on losing access proposes: the page would still open with
  "Array" from a bookmarked address of a purchase awaiting payment, so
  this line needs fixing either way.

**What goes with it**

- Nothing stored changes: the fix touches only what the page shows. No
  REST API or plugin hook is involved.
- Backport: the diff applies as written to 3.5 and 3.4. On 3.3, change
  only the form's line 90 to
  `'ipRanges' => implode("\n", $subscription->getIPRanges())`. Fixing
  `getIPRangesString()` instead would also change the institutional
  subscription email, which puts that method's result in its
  `ipRanges` value (`SubscriptionAction.inc.php` line 68). That email
  also shows the backslash and "n" today, so the team may want both.
- Test: an e2e scenario in spec U51 in which "Purchase" on an
  institutional subscription shows its ranges and "Continue" is
  accepted without changes.

Small: one line in one form.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-ip-ranges-array/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-ip-ranges-array/walk.js [domain|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `domain` takes
  the bracketed variant. `neighbour` takes the other report's setup,
  then "Renew" and "Purchase New Subscription". The Steps are coded in
  [steps.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/steps.js),
  shared with the report on losing access; the script's records use
  that report's step numbers (steps 9–11 here are its 17–19).
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/institutional-purchase-ip-ranges-array/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): the Steps on `main` and `stable-3_5_0`, the
  domain-only variant on `main`.
- Server log: the walk's requests logged no "Array to string
  conversion" warning, only Smarty's "PHP Deprecated" lines about
  class constants in templates. `PKPTemplateManager` sets Smarty's
  `error_reporting` to `E_ALL & ~E_NOTICE & ~E_WARNING` while it renders
  (`lib/pkp/classes/template/PKPTemplateManager.php` line 180), so the
  warning is never raised. The test install runs the dataset's own
  config (`display_errors = Off`), logging to the PHP server's error
  output.
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
- Code reads: on 3.4, line 111 passes `$institution->getIPRanges()` and
  the form splits on `"\r\n"`, as on `main`. On 3.3,
  `UserInstitutionalSubscriptionForm.inc.php` line 90 passes
  `getIPRangesString()`
  (`classes/subscription/InstitutionalSubscription.inc.php`), and the
  form splits on `/\s+/`.
- Introduced: `git blame` on line 110, then the parent commit; the
  GitHub API names the two pull requests.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words and by `UserInstitutionalSubscriptionForm` and
  `getIPRanges`. `pkp/pkp-lib#4788` (closed) is an older validation
  fault on the same page, `pkp/pkp-lib#9182` (closed) the manager's
  form on PHP 8.
- Not driven: MySQL.
