# A reader reopening their institutional subscription's purchase page finds "IP ranges" reading "Array"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code; only with two or more ranges)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U51 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a25)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On "My Subscriptions", "Purchase" beside an active institutional
subscription opens "Purchase Institutional Subscription" with the
institution's name filled in, but with "IP ranges" reading "Array"
instead of the subscription's ranges. Pressing "Continue" without
editing anything is refused with "Please enter a valid IP range.".

To get past it the reader must type the ranges again, or clear the box
if the subscription has only a domain. The journal shows a reader their
ranges nowhere; the manager can read them on the Institutions page.

## Impact

- **Lost.** No stored data: the page changes nothing until it is
  accepted. The reader meets a nonsense value and a refusal that does
  not say the box came filled wrong.
- **Who.** A reader who presses "Purchase" beside their active
  institutional subscription, on a journal that requires subscriptions
  and takes payments.
- **Way round.** Retyping the ranges (or clearing the box) and pressing
  "Continue". Today that leads straight on to the loss of access that
  [A subscriber who presses "Purchase" beside an active subscription loses access before paying](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md)
  reports: the subscription becomes "Awaiting Manual Payment" at once.

Low: no data is lost by this fault itself; the harm on this path is
the other report's.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, journal `publicknowledge`.
  It is open access and its payments are off.
- Sign in as `rvaca` (Journal manager):
  - Settings › Distribution › "Payments": tick "Enable", choose "US
    Dollar" under "Currency" and "Manual Fee Payment" under "Payment
    Plugins", type "Pay by cheque" in "Manual Payment Instructions",
    "Save".
  - "Access" tab: "The journal will require subscriptions to access
    some or all of its contents.", "Save".
  - "Payments" › "Subscription Types" › "Create New Subscription
    Type": "Campus Year", "US Dollar", cost 100, format "Online",
    duration 12, "Institutional", "Save".
- Sign in as `dsokoloff` (Reader). Open "My Subscriptions"
  (`/index.php/publicknowledge/en/user/subscriptions`) and, under
  "Institutional Subscriptions", "Purchase New Subscription": type
  "Tide University" in "Institution name" and "192.0.2.0/24" in "IP
  ranges", "Continue". The "Manual Fee Payment" page shows.
- Sign in as `rvaca`. "Payments" › "Institutional Subscriptions" › the
  "Tide University" row › arrow › "Edit": "Status" "Active", "End
  date" a year from today, "Save".

Steps:

1. Sign in as `dsokoloff` and open "My Subscriptions". The
   institutional row reads "Campus Year", "Tide University", "Expires:
   {a year from today}", with "Renew" and "Purchase".
2. Press "Purchase". "Purchase Institutional Subscription" opens.
3. Read "Institution name" and "IP ranges".
4. Press "Continue" without changing anything.

**Expected.** At step 3 "Institution name" reads "Tide University" and
"IP ranges" reads "192.0.2.0/24". Step 4 goes on to the payment page.

**Observed.** At step 3 "Institution name" reads "Tide University" and
"IP ranges" reads "Array". Step 4 shows the page again with:

```
Errors occurred processing this form:
Please enter a valid IP range.
```

"Purchase New Subscription" (a new purchase) arrives with every box
empty.

## Cause

`UserInstitutionalSubscriptionForm::initData()` fills the page from
the existing subscription's institution:

```php
'ipRanges' => $institution->getIPRanges()
```

`Institution::getIPRanges()` returns an array, one entry per range. The
template prints `ipRanges` into a text box (`<textarea
name="ipRanges">{$ipRanges|escape}</textarea>`), and Smarty 4 compiles
`|escape` to `htmlspecialchars((string)…)`, which turns any array, an
empty one included, into "Array". `readInputData()` then reads the box
as text, one range per line (`explode("\r\n", trim($ipRanges))`), so
"Array" fails the IP range check.

Up to 3.3 the subscription kept its own ranges and `initData()` read
`$subscription->getIPRangesString()`. That method joins the ranges with
a single-quoted `'\n'`, a literal backslash and "n", so 3.3 shows one
range correctly but two or more as one invalid value. 11f902f20f moved
the name and ranges onto the new `Institution` object for
`pkp/pkp-lib#6782`, the change that introduced institutions, and switched this line to `getIPRanges()` without
joining the array.

The same `initData()` leaves out the subscription's type and
membership, which `UserIndividualSubscriptionForm::initData()` fills;
3.3's did not fill them either, so that part is older than the
regression. The type list then arrives on its first entry rather than
the subscription's own type (read in the code; the walk had one
institutional type, so it could not show).

Reach:

- **"Purchase" beside an active institutional subscription with IP
  ranges** (seen in a browser, main and 3.5).
- **The same with only a domain** (read in the code): the institution
  has no ranges, the box still reads "Array", and the page is refused
  the same way until the box is cleared.
- **The purchase address of an institutional subscription awaiting
  payment** (read in the code): typed by hand
  (`user/purchaseSubscription/institutional/{id}`), it loads the same
  form; no button leads there.
- **The manager's "Edit Subscription" window** (read in the code):
  `InstitutionalSubscriptionForm` takes the ranges from the chosen
  institution and is not affected.

## Proposed fix

Join the institution's ranges into the box's one-per-line form, and
fill the type and membership as the individual form does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/fix.diff)),
in `UserInstitutionalSubscriptionForm::initData()`:

```php
$this->_data = [
    'typeId' => $subscription->getTypeId(),
    'membership' => $subscription->getMembership(),
    'institutionName' => $institution->getLocalizedName(),
    'institutionMailingAddress' => $subscription->getInstitutionMailingAddress(),
    'domain' => $subscription->getDomain(),
    'ipRanges' => implode("\r\n", $institution->getIPRanges())
];
```

`"\r\n"` is the separator the same form splits on when it reads the
box back, and the one browsers send for a text box's line breaks. An
institution with no ranges gives an empty box.

Tried on OJS `main`: the page arrived with "IP ranges" reading
"192.0.2.0/24", and "Continue" went on to the "Manual Fee Payment"
page at once. "Purchase New Subscription" still arrived with every box
empty.

- **Alternatives.** Converting in the template (`{$ipRanges|@implode}`)
  would leave the form's data in two shapes; the form owns the
  conversion, as it does when it reads the box.
- **What goes with it.** No API or plugin hook is involved. The
  [fix for "Purchase" beside an active subscription](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A10-purchase-on-active-subscription-removes-access.md)
  keeps this page for an expired subscription and for one awaiting
  payment, so this fix is still needed with it. The diff applies as is
  to 3.5 and 3.4. On 3.3 the box is a one-line input whose ranges the
  form splits on white space, so there `initData()` would join them
  with a space. The test that would have caught
  it: an e2e check that the page opened for an existing institutional
  subscription shows its stored ranges.

Small: the change stays inside one method, in the pattern the form
already uses to read the box.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/lib.js).
  After step 4 it retypes the range, presses "Continue" and reads
  "My Subscriptions", the manager's list and the Institutions page,
  for the two sibling reports.
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/walk.js`
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/fix.diff ojs`
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets c657990 (2026-10-01).
- Tips: OJS `main` b84f8e2e44 (pkp-lib ddd8ab243a), `stable-3_5_0`
  c346ee00a5 (pkp-lib 3bb4450bea), `stable-3_4_0` 75cc2d488b (pkp-lib
  32b0f4b4af), `stable-3_3_0` ac77c9fb35 (pkp-lib f6ab331645). 3.4's
  `initData()` and template are `main`'s; 3.3's are as the Cause says.
- Not driven: a domain-only subscription, several ranges on 3.3, and
  several institutional types (all read in the code).
- `pkp/pkp-lib#4788` (2019, ranges split on one line) and
  `pkp/pkp-lib#9182` (3.3's manager form on PHP 8) are other faults.
