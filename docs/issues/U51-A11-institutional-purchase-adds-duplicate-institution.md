# Each institutional subscription a reader buys gets its own copy of the institution, which the manager's edits miss

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no Institutions list)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a11)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A reader who buys an institutional subscription types the institution's
name and IP ranges on "Purchase Institutional Subscription". Each time
they press "Continue", the journal's "Institutions" list gets a new
institution under that name. This happens even when the list already
has one with the same name and ranges. It also happens when the reader
presses "Purchase" beside a subscription they already hold.

The subscription uses its own copy, not the institution the manager
created. When the library's addresses change and the manager updates
the ranges on their institution, nothing tells them that the bought
subscription keeps the old ranges. Readers at the library's new
addresses are refused, and the old addresses keep access. It works again
only once the manager edits every row of that name.

## Impact

- **Lost.** Readers at the library lose access to subscription content
  after its addresses change, although the manager has entered the new
  ranges. The old addresses keep access. Nobody is told.
- **Who.** Every OJS journal that sells institutional subscriptions
  online, with payments on and readers buying on the site. The manager
  meets it when an institution's IP ranges change; the library's readers
  are the ones refused.
- **Way round.** The manager can change the ranges on every row with the
  library's name on the "Institutions" page, and access comes back. Removing
  the copies is a clean-up by hand, and the next purchase adds another
  copy.

Medium: paying readers lose access without anyone being told, but the
manager can restore it on screen by editing every copy, and it takes an
address change to show. It would be high if the copies were not listed:
they show under the library's name on the "Institutions" page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- The journal `publicknowledge` requires subscriptions and takes manual
  payments. Its issue "Vol. 1 No. 2 (2014)" needs a subscription. It has
  an institutional subscription type and the institution "Harbour
  Library u51w13" with two IP ranges that your browser is not on. The
  journal manager sets this up in steps 1–7.

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
   Type". Type "Campus Year u51w13" in "Name", choose "US Dollar", type
   "100" in "Cost", choose "Online" in "Format", type "12" in
   "Duration", choose "Institutional (users are validated via domain or
   IP address)" and press "Save".
6. Open "Institutions" in the side menu (it appears once step 3 has
   turned payments on) › "Add Institution". Type "Harbour Library
   u51w13" in "Name" and, in "IP ranges", "192.0.2.10" and on a second
   line "198.51.100.0/24". Press "Save". The list shows "Harbour Library
   u51w13".
7. Log out.

A purchase (the reader), and the manager records the payment:

8. Sign in as `ccorino` and open "My Subscriptions"
   (`/index.php/publicknowledge/en/user/subscriptions`).
9. Under "Institutional Subscriptions" press "Purchase New
   Subscription".
10. Leave "Campus Year u51w13" chosen in "Subscription Type". Type
    "Harbour Library u51w13" in "Institution name" and, in "IP ranges",
    "192.0.2.10" and on a second line "198.51.100.0/24". Press
    "Continue": the "Manual Fee Payment" page asks for 100.00 USD.
11. Sign in as `rvaca`. Open Payments › "Institutional Subscriptions",
    `ccorino`'s row "Harbour Library u51w13" › "Edit". Look at the
    "Institution" list. Choose "Active" in "Status", "Start" yesterday
    and "End" the same day next year, and press "Save".

Buying again (the reader):

12. Sign in as `ccorino`, open "My Subscriptions" and press "Purchase"
    beside "Campus Year u51w13".
13. The "IP ranges" box arrives reading "Array" (reported separately as
    "'Purchase' beside an institutional subscription opens with 'IP
    ranges' reading 'Array'"). Replace "Array" with "192.0.2.10" and, on
    a second line, "198.51.100.0/24", and press "Continue": the "Manual
    Fee Payment" page.
14. Sign in as `rvaca` and open "Institutions".

The library's addresses change (after step 11, in place of steps 12–14):

15. Log out. Open Archives › "Vol. 1 No. 2 (2014)" › "Signalling Theory
    Dividends" and press "PDF".
16. Sign in as `rvaca`, open "Institutions", and on the first "Harbour
    Library u51w13" row press "Edit". Replace the "IP ranges" with the
    address your browser reaches the site from (`127.0.0.1` on a local
    install) and press "Save".
17. Log out and open the PDF as in step 15.
18. Sign in as `rvaca` and do step 16 on the second "Harbour Library
    u51w13" row.
19. Log out and open the PDF as in step 15.

**Expected.** Steps 10 and 13 use the institution the journal already
has. Step 11's "Institution" list names "Harbour Library u51w13" once,
and step 14 lists it once. Step 15 is refused (the browser is not on the
library's ranges), and step 17 opens the PDF, since the library's one
institution now has the browser's address.

**Observed.** Step 11's "Institution" list holds two entries, both
reading "Harbour Library u51w13". Step 14 lists:

```
Harbour Library u51w13
Harbour Library u51w13
Harbour Library u51w13
```

Each row has the same two ranges, and the subscription points at the
third. The second, which step 10 added, is used by nothing, and neither
is the first, the manager's.

Steps 15 and 17 both lead to the Login page with the PDF link locked,
because the subscription still uses the copy added in step 10, which
keeps "192.0.2.10" and "198.51.100.0/24". Step 19 opens the PDF.

No request failed and no message was shown.

## Cause

`APP\subscription\form\UserInstitutionalSubscriptionForm::execute()`
builds a new `Institution` from the typed name and IP ranges, adds it
with `Repo::institution()->add()` and points the subscription at it
([lines 218–225](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/form/UserInstitutionalSubscriptionForm.php#L218-L225)).
It does this on every save. It looks neither at the journal's
institutions nor at the one the subscription already uses. The
manager keeps one record per institution, and this form adds one per
purchase.

Before 3.4 the name and IP ranges were fields of the subscription
itself, so a purchase had nothing to copy. 11f902f20f (`pkp/ojs#3465`,
for `pkp/pkp-lib#6782`, 2022) moved them to the new institutions. The
upgrade (`I6895_Institutions`) gave each existing subscription an
institution of its own. This form was changed the same way:
`setInstitutionName()` and `setIPRanges()` on the subscription became a
new institution on every save.

The reach:

- Access follows the subscription's own institution:
  `InstitutionalSubscriptionDAO::isValidInstitutionalSubscription()`
  joins `institution_ip` on the subscription's `institution_id`. So an
  edit to another row of the same name does not reach the subscription
  (seen in the browser, steps 15–19).
- The manager's subscription edit window lists institutions by name
  only
  (`controllers/grid/subscriptions/InstitutionalSubscriptionForm.php`,
  lines 76–83), so the copies cannot be told apart there (seen in the
  browser, step 11).
- Deleting a copy that a subscription uses is a soft delete. The
  subscription keeps its access, and the same edit window adds the
  deleted copy back to its list (the same file, lines 84–87). Read in
  the code.
- Usage statistics: `PKPStatisticsHelper::getInstitutionIds()` returns
  every institution whose ranges match a visitor's address, so each copy
  is credited with the same usage and appears as its own institution in
  the institution statistics. Read in the code.
- No other code adds institutions on a reader's behalf. The only other
  caller of `Repo::institution()->add()` is the manager's "Add
  Institution" (`PKPInstitutionController::add()`).

## Proposed fix

A proposal; the team decides. Before adding an institution, look for
one the journal already has with the same name (in any language) and
exactly the same IP ranges, preferring the subscription's current
institution. Use it if found, and add a new one only when none matches
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-adds-duplicate-institution/fix.diff),
in full):

```diff
--- a/classes/subscription/form/UserInstitutionalSubscriptionForm.php
+++ b/classes/subscription/form/UserInstitutionalSubscriptionForm.php
@@ -215,13 +215,17 @@
         $subscription->setInstitutionMailingAddress($this->getData('institutionMailingAddress'));
         $subscription->setDomain($this->getData('domain'));
 
-        $institution = Repo::institution()->newDataObject();
-        $institution->setContextId($journalId);
-        $institution->setName($this->getData('institutionName'), Locale::getLocale());
         $ipRanges = $this->getData('ipRanges');
         $ipRanges = explode("\r\n", trim($ipRanges));
-        $institution->setIPRanges($ipRanges);
-        $institutionId = Repo::institution()->add($institution);
+        // Use the journal's institution when one has this name and these IP ranges
+        $institutionId = $this->getMatchingInstitutionId($journalId, $this->getData('institutionName'), $ipRanges);
+        if (!$institutionId) {
+            $institution = Repo::institution()->newDataObject();
+            $institution->setContextId($journalId);
+            $institution->setName($this->getData('institutionName'), Locale::getLocale());
+            $institution->setIPRanges($ipRanges);
+            $institutionId = Repo::institution()->add($institution);
+        }
         $subscription->setInstitutionId($institutionId);
 
         if ($subscription->getId()) {
@@ -236,5 +240,33 @@
         $paymentForm = $paymentManager->getPaymentForm($queuedPayment);
         $paymentForm->display($this->request);
         parent::execute(...$functionArgs);
+    }
+
+    /**
+     * Get the ID of the journal's institution that has the given name, in any
+     * locale, and exactly the given IP ranges, so that a purchase does not add
+     * a copy of an institution the journal already has. The subscription's own
+     * institution is preferred. The name must match exactly, case included:
+     * searchPhrase() only narrows the query.
+     */
+    protected function getMatchingInstitutionId(int $journalId, string $name, array $ipRanges): ?int
+    {
+        $normalize = function (array $ranges): array {
+            $ranges = array_values(array_filter(array_map('trim', $ranges), 'strlen'));
+            sort($ranges);
+            return $ranges;
+        };
+        $name = trim($name);
+        $ipRanges = $normalize($ipRanges);
+        $matchingIds = Repo::institution()->getCollector()
+            ->filterByContextIds([$journalId])
+            ->searchPhrase($name)
+            ->getMany()
+            ->filter(fn (Institution $institution) => in_array($name, array_map('trim', (array) $institution->getName(null)), true)
+                && $normalize($institution->getIPRanges()) === $ipRanges)
+            ->keys()
+            ->collect();
+        $currentId = $this->subscription?->getInstitutionId();
+        return $matchingIds->contains($currentId) ? $currentId : $matchingIds->first();
     }
 }
```

The fix never changes an existing institution. A purchase can point
only at an institution whose name and ranges the reader typed exactly;
any other purchase adds a new one, as it does now. `collect()` runs the
query once: `getMany()` is lazy, so `contains()` and `first()` would
each query again. Soft-deleted institutions are not matched, since the
collector leaves them out.

The name is compared exactly, case included. `searchPhrase()` ignores
case, but it only narrows the query. Two spellings of a name may be two
records the manager keeps apart on purpose, and a false match would
attach a subscription to the wrong institution. Ignoring case is a
one-word change if the team prefers it.

Tried on `main`: with the fix in, steps 10 and 13 point the subscription
at the manager's "Harbour Library u51w13", step 11's list names it once,
and step 14 lists one row. In steps 15–19, step 17 opens the PDF once
the manager's row alone is edited; there is no second row. Two new purchases still each add an
institution, the same with the fix in and out: one under another name
("Dock Library u51w13", "203.0.113.0/24"), and one under the same name
with other ranges ("203.0.113.5").

**Alternatives**

- Match by name alone: the reader's typed ranges would be dropped, or
  would have to overwrite the manager's.
- Edit the subscription's current institution in place when the reader
  buys again: a reader could then change the ranges of an institution
  that the manager created and other subscriptions use.
- Let the reader choose from the journal's institutions: this would show
  every reader the journal's list of subscribing institutions. It is a
  product decision.

**What goes with it**

- Behaviour change: once a purchase points at the manager's
  institution, the manager's later edits to its ranges change what that
  subscription grants. That is the intent: the manager keeps the
  institution, and the subscription follows it.
- Left as it is: buying again with a changed name or changed ranges
  still adds a new institution, and leaves the old one unused.
- Stored data: copies already added stay. Merging them automatically
  would mean choosing which copy keeps its usage statistics, so the fix
  leaves that to the manager.
- No REST API or plugin hook changes. `Institution::add` fires only when
  an institution is actually added.
- Backport: the diff applies as written to 3.5 and 3.4 (checked with
  `patch --dry-run` on both branches' file).
- Test: an e2e scenario in spec U51 in which a purchase under an existing
  institution's name and ranges leaves the "Institutions" list with one
  row.

Small: one form, one new method, no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-adds-duplicate-institution/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-adds-duplicate-institution/walk.js [moved|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–14; `moved` takes steps 1–11 and 15–19; `neighbour`
  takes steps 1–9, then the two purchases the fix must leave adding an
  institution.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/institutional-purchase-adds-duplicate-institution/fix.diff ojs`,
  the script in its three modes, then `node bin/try-fix.js revert ojs`.
- Reproduced on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–19 on `main` and `stable-3_5_0`, with
  the same result; the neighbour check on `main` only. The first
  reproduction of steps 1–14 on both branches left out step 4, which
  only steps 15–19 need. The visitor's
  address was `127.0.0.1`. "Start" is yesterday so that the subscription
  is current whatever the server's time zone.
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
- Code reads: on 3.5 and 3.4, `UserInstitutionalSubscriptionForm::execute()`
  adds a new institution on every save, as on `main` (3.4 lines
  219–226). 3.4's institution collector has `filterByContextIds()` and
  `searchPhrase()`. On 3.3, `UserInstitutionalSubscriptionForm.inc.php`
  stores the name and ranges on the subscription
  (`setInstitutionName()`, `setIPRanges()`, lines 192–195), and there is
  no institution class or Institutions page.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words ("institution duplicate", "institutional subscription
  purchase institution") and by `UserInstitutionalSubscriptionForm`
  and `purchaseInstitutionalSubscription`. `pkp/pkp-lib#3933`,
  `pkp/pkp-lib#4788` and `pkp/pkp-lib#7100` (all closed) are other
  faults on the same page.
- Not reproduced: MySQL.
