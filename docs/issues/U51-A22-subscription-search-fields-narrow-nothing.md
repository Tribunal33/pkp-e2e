# Subscription lists searched by membership, reference number, notes, institution, domain or IP range show every subscription

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#3870` for `pkp/pkp-lib#8700` · [60867c2d74](https://github.com/pkp/ojs/commit/60867c2d744fcad5c5cdc3a632c63a1c5d770c42) · 2024-05-29 · Jonas Raoni Soares da Silva (jonasraoni); on 3.4 the same change as [c9882c383d](https://github.com/pkp/ojs/commit/c9882c383dbd867d9c46e1267df556189d9dd93b) (`pkp/ojs#4286`), first released in 3.4.0-6
- **Upstream** `pkp/pkp-lib#11027` (open, no fix), which reports one of the six fields, the institutional list's "Institution name"
- **Tracked in** spec U51 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a22)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On both subscription lists, "Search" by "Membership", "Reference
Number" or "Notes" (and on the institutional tab by "Institution name",
"Domain" or "IP ranges") lists every subscription whatever is typed,
even text no subscription holds; only "Given Name", "Family Name",
"Username" and "Email" narrow the list.

Nothing says the search was ignored. A manager who has only a reference
number, a membership number, a payment note or an institution's name,
domain or address has to find the subscription by reading the list.

## Impact

- **Lost.** Time. Nothing is stored wrong.
- **Who.** Journal managers, editors, production editors and
  subscription managers on the "Payments" page of a journal that sells
  subscriptions, whenever they look a subscription up by one of these
  six fields. On the institutional list the working searches find the
  user chosen in "Locate a User" when the subscription was made, not
  the institution itself.
- **Way round.** When the subscriber's name, username or email is
  known, search by that. Otherwise read the list: each holds every
  subscription of its kind, active, lapsed and awaiting payment, shown
  25 rows a page by default (the journal's "Items per page" setting),
  so 300 subscriptions mean up to 12 pages read for one reference
  number.

Medium: a routine lookup gives a wrong result on every journal with
subscriptions, but the list can still be read by hand and four search
fields work. It would be high if the name searches failed too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- Two subscriptions of each kind, told apart by the fields searched.
  The dataset has no subscription types, institutions or subscriptions,
  so the journal manager creates them in steps 1–9. Payments need not
  be turned on for the lists.

Setting up (the journal manager):

1. Sign in as `rvaca`.
2. Open "Payments" (`/index.php/publicknowledge/en/payments`), tab
   "Subscription Types", "Create New Subscription Type". Type "Online
   Year u51w6" in "Name", choose "US Dollar", type "10" in "Cost",
   choose "Online" in "Format", type "12" in "Duration", choose
   "Individual (users are validated via login)" and press "Save".
3. The same for "Campus Year u51w6", "Cost" "100", choosing
   "Institutional (users are validated via domain or IP address)".
4. Open Settings › "Institutions"
   (`/index.php/publicknowledge/en/management/settings/institutions`),
   "Add Institution". Type "Harbour Library u51w6" in "Name" and
   "192.0.2.0/24" in "IP ranges", and press "Save".
5. The same for "Dock College u51w6" with "198.51.100.0/24".
6. Back on "Payments", tab "Individual Subscriptions", "Create New
   Subscription". Find and choose `amwandenga` (Alan Mwandenga), choose
   "Online Year u51w6" and "Status" "Active", set "Start" to today and
   "End" to the same day next year, type "HARB-1001" in "Membership",
   "INV-u51w6-A" in "Reference Number" and "Paid by cheque" in "Notes",
   and press "Save".
7. The same for `ccorino` (Carlo Corino) with "DOCK-2002",
   "INV-u51w6-B" and "Paid by card".
8. Tab "Institutional Subscriptions", "Create New Subscription". Choose
   `amwandenga`, "Campus Year u51w6", "Active", the same dates,
   "Institution" "Harbour Library u51w6", type "harbour.example.org" in
   "Domain", "INV-u51w6-C" in "Reference Number" and "Paid by cheque" in
   "Notes", and press "Save".
9. The same for `ccorino` with "Dock College u51w6",
   "dock.example.org", "INV-u51w6-D" and "Paid by card".

Searching "Individual Subscriptions" (rows: Alan Mwandenga, Carlo
Corino):

10. Press "Search" above the list, choose "Membership" and "contains",
    type "HARB" and press "Search".
11. The same with "Reference Number" and "u51w6-A".
12. The same with "Notes" and "cheque".
13. Each of the three with "is" and "nothing-like-this".
14. Control: "Family Name", "contains", "Mwandenga".

Searching "Institutional Subscriptions" (rows: Dock College u51w6,
Harbour Library u51w6):

15. With "contains": "Institution name" "Harbour", "Domain" "harbour",
    "IP ranges" "192.0.2", "Reference Number" "u51w6-C", "Notes"
    "cheque".
16. Each of those five, and "Membership", with "is" and
    "nothing-like-this".
17. Control: "Family Name", "contains", "Mwandenga".

**Expected.** Steps 10–12 list only Alan Mwandenga, and step 15 only
Harbour Library u51w6. Steps 13 and 16 list "No Items".

**Observed.** Every search in steps 10–13, 15 and 16 lists both rows,
as the list does before any search: "Alan Mwandenga" and "Carlo
Corino", or "Dock College u51w6" and "Harbour Library u51w6". No request
failed.

The controls (steps 14 and 17) narrow the list to Alan Mwandenga and
Harbour Library u51w6.

## Cause

The search form's field list (`renderFilter()` in
`IndividualSubscriptionsGridHandler` and
`InstitutionalSubscriptionsGridHandler`) is keyed by the DAOs'
constants. The four user fields are strings (`'givenName'`,
`'familyName'`, `'username'`, `'email'`). The six subscription fields
are integers: `SubscriptionDAO::SUBSCRIPTION_MEMBERSHIP` (2),
`SUBSCRIPTION_REFERENCE_NUMBER` (3), `SUBSCRIPTION_NOTES` (4) and
`InstitutionalSubscriptionDAO::SUBSCRIPTION_INSTITUTION_NAME` (0x20),
`SUBSCRIPTION_DOMAIN` (0x21), `SUBSCRIPTION_IP_RANGE` (0x22). The form
posts the chosen key as text ("2", "32").

`SubscriptionsGridHandler::getFilterSelectionData()`
([line 113](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/controllers/grid/subscriptions/SubscriptionsGridHandler.php#L110-L122))
passes that text on unchanged. `SubscriptionDAO::applySearchFilters()`
([lines 226–235](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/SubscriptionDAO.php#L222-L244))
and `InstitutionalSubscriptionDAO::getByJournalId()`
([lines 464–474](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/subscription/InstitutionalSubscriptionDAO.php#L463-L483))
choose the column with `match ($searchField)`. `match` compares with
`===`, so `"2"` never equals `2`: every integer field falls to
`default => null`, and with no column the DAO adds no condition. The
user fields match because their keys are strings on both sides.

Until 2024 the same choice was a `switch`, which compares loosely, so
`"2"` matched `case self::SUBSCRIPTION_MEMBERSHIP`. The change for
`pkp/pkp-lib#8700` moved the subscription DAOs to the Laravel query
builder to speed up slow queries, and turned that `switch` into `match`.
It landed on `main` as 60867c2d74 and on 3.4 as c9882c383d.

The reach, read in the code:

- Both lists on "Payments" call these two methods, and nothing else
  sends them a search field: the subscriptions report plugin calls
  `getByJournalId()` without one.
- `applySearchFilters()` also chooses the date column with
  `match ($dateField)`. No screen or caller passes a date field, and a
  caller passing the constant would pass an integer.
- The other legacy grids that read a `searchField` (Users & Roles, the
  users export, "Locate a User" in the subscription window) offer only
  the four user fields, whose keys are strings, so the posted text is
  the key itself.

## Proposed fix

A proposal; the team decides. Turn a numeric field key back into the integer the DAOs' constants are,
where the handler reads it from the request
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/fix.diff)):

```diff
--- a/controllers/grid/subscriptions/SubscriptionsGridHandler.php
+++ b/controllers/grid/subscriptions/SubscriptionsGridHandler.php
@@ -109,8 +109,13 @@
     public function getFilterSelectionData($request)
     {
-        // Get the search terms.
+        // Get the search terms. The subscription fields are the DAOs' integer
+        // constants (SubscriptionDAO::SUBSCRIPTION_MEMBERSHIP and the others),
+        // which the DAOs match strictly; the user fields are strings.
         $searchField = $request->getUserVar('searchField');
+        if (is_numeric($searchField)) {
+            $searchField = (int) $searchField;
+        }
         $searchMatch = $request->getUserVar('searchMatch');
         $search = $request->getUserVar('search');
```

`SubscriptionsGridHandler` is the one place the value enters, shared by
both lists. Both `getByJournalId()` methods document `$searchField` as
`int` (`applySearchFilters()` documents it as `null|mixed`). Casting
request values where the handler reads them is how the neighbouring
`SubscriberSelectGridHandler::getFilterSelectionData()` treats its
`userGroup`.

Tried on `main`: with the fix in, every search in steps 10–12 and 15
lists the one expected row and steps 13 and 16 list "No Items". The
searches the fix must leave alone give the same result with the fix in
and out: an empty text lists both rows, and "Given Name", "Username"
and "Email" narrow as before. With the fix in, "is" matches a whole
value in any letter case ("inv-u51w6-a") and not a part of it.

"Notes" is a rich-text box, so a note is stored as HTML
(`<p>Paid by cheque</p>`). With the fix in, "Notes" "contains" "cheque"
finds it, but "Notes" "is" "Paid by cheque" lists "No Items", because
"is" compares the whole stored markup. That is left as it is: "contains"
is the useful search for a note, and matching "is" against the text
alone would mean stripping the markup in SQL.

**Alternatives**

- Cast in the two DAO methods instead: covers a plugin that passes the
  key as text, at the cost of two copies of the same line in the data
  layer.
- Compare loosely in the `match` arms, or go back to `switch`: undoes
  part of `pkp/pkp-lib#8700`'s rewrite, where the cast keeps its query
  builder and `match`.
- Turn the constants into strings: changes values plugins may use.

**What goes with it**

- Nothing stored changes, and no REST API or plugin hook is involved.
- Backport: the diff applies as written to 3.5 and 3.4, where the
  handler is the same.
- Test: an end-to-end test that searches each list by reference number
  and by institution name.

Small: one condition in one handler, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour`
  takes steps 1–9, then the searches the fix must leave alone and
  "Notes" "is" with a note's text.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/fix.diff ojs`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs`.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): the Steps on `main` and `stable-3_5_0`. The
  search form's options carry the values `givenName`, `familyName`,
  `username`, `email`, `2`, `3`, `4`, and on the institutional list
  also `32`, `33`, `34`, on both versions.
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
- Code reads: on 3.5 and 3.4, `SubscriptionDAO::applySearchFilters()`
  and `InstitutionalSubscriptionDAO::getByJournalId()` use the same
  `match`, and `SubscriptionsGridHandler::getFilterSelectionData()`
  passes the text unchanged, as on `main`. c9882c383d is in the tags
  from `3_4_0-6` on, not in `3_4_0-5`. On 3.3,
  `SubscriptionDAO::_generateSearchSQL()` and
  `InstitutionalSubscriptionDAO::getByJournalId()`
  (`classes/subscription/*.inc.php`) choose the column with `switch`.
  The grids post the same text ("2", "32"), and `switch` compares
  loosely, so it matches the integer `case`s.
- Introduced: `git blame` on `SubscriptionDAO.php` line 226 gives
  60867c2d74 on `main` and 3.5 (`pkp/ojs#3870`, merged 2024-05-30). Its
  message reads "cherry picked from commit 5283e8ae00", a commit of the
  pull request's branch. On `stable-3_4_0` the same change is c9882c383d
  (`pkp/ojs#4286`, merged 2024-05-30), with the same author and date.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library by the
  symptom's words and by `applySearchFilters` and
  `SubscriptionsGridHandler`. `pkp/pkp-lib#11027` was reported on
  3.4.0-8 and has no linked pull request.
- Not driven: MySQL (the fault is in PHP, before any query).
