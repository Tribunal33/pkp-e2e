# Searching the subscription lists by reference number, membership, notes or institution lists every subscription

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; its search compares the field loosely)
- **Introduced** `pkp/ojs#3870` for `pkp/pkp-lib#8700` · [5283e8ae00](https://github.com/pkp/ojs/commit/5283e8ae00e6f6f64e1a2a2afba02a4a8633729a), on `main` as the cherry-pick [60867c2d74](https://github.com/pkp/ojs/commit/60867c2d744fcad5c5cdc3a632c63a1c5d770c42) · 2024-05-29 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** `pkp/pkp-lib#11027` (open), covering one symptom: "Institution name" on the institutional list, on 3.4
- **Tracked in** spec U51 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a22)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On the subscription lists under "Payments", a search by some fields
lists every subscription whatever is typed, even text no subscription
holds:

- "Individual Subscriptions": 3 of its 7 fields ("Membership",
  "Reference Number", "Notes").
- "Institutional Subscriptions": 6 of its 10 fields (the same three,
  plus "Institution name", "Domain" and "IP ranges").

Only "Given Name", "Family Name", "Username" and "Email address" narrow
either list. A manager looking a subscriber up by reference number, or
an institution by name, domain or IP address, gets the whole list back
with no message. The open pkp issue covers one of these symptoms,
"Institution name" on 3.4.

## Impact

- **Lost**: time; no data is changed.
- **Who**: journal managers and subscription managers on any journal
  that sells subscriptions, each time they look a subscription up by
  one of those fields.
- **Way round**: search by the subscriber's name, username or email, or
  page through the list. The "Reference Number" column shows on both
  lists, and the institutional list is sorted by institution name.
  Notes, membership and domain show only in a subscription's "Edit"
  window (an institutional subscription has no membership), and IP
  ranges only on the institution under "Institutions".

Medium: the lookup fails for everyone, but the list and the user-based
search are a way round on screen.

## Steps to reproduce

Preconditions (PKP's default test dataset for OJS `main`; it holds no
subscriptions, so they are made on screen):

- Sign in as `rvaca` (Journal manager).
- Settings › Distribution › "Payments": tick "Enable payments", currency
  "US Dollar", method "Manual Fee Payment", "Save" (the "Payments" and
  "Institutions" menu entries appear).
- Payments › "Subscription Types" › "Create New Subscription Type":
  "u51sb10 Online Year" (Individual, 40 USD, Online, 12 months), "Save";
  again "u51sb10 Campus Year" (Institutional, 400 USD, Online, 12 months).
- Institutions › "Add Institution": "u51sb10 Harbour Library", IP ranges
  "10.1.0.0 - 10.1.255.255", "Save"; again "u51sb10 Hilltop College",
  "10.2.0.0 - 10.2.255.255".
- Payments › "Individual Subscriptions" › "Create New Subscription":
  user `dbarnes` (found under "Locate a User"), "u51sb10 Online Year",
  "Active", start 2026-01-01, end 2026-12-31, Membership "M-100",
  Reference Number "REF-100", Notes "paid by cheque", "Save"; again for
  `amwandenga` with "M-200", "REF-200", "paid by card".
- Payments › "Institutional Subscriptions" › "Create New Subscription":
  user `ccorino`, "u51sb10 Campus Year", "Active", the same dates,
  institution "u51sb10 Harbour Library", a mailing address, domain
  "harbour.edu", Reference Number "REF-300", Notes "invoice 300", "Save";
  again for `ckwantes` with "u51sb10 Hilltop College", "hilltop.edu",
  "REF-400", "invoice 400".

Each search below: under "Search", choose the field, then "contains" or
"is", type the text, press "Search".

Individual (Payments › "Individual Subscriptions"):

1. "Reference Number" "is" "REF-100".
2. "Membership" "contains" "M-100".
3. "Notes" "contains" "cheque".
4. Control: "Username" "is" "dbarnes".

Institutional (Payments › "Institutional Subscriptions"):

5. "Institution name" "contains" "Harbour".
6. "Domain" "contains" "harbour".
7. "IP ranges" "contains" "10.1.".
8. "Reference Number" "is" "REF-300".
9. "Notes" "contains" "invoice 300".
10. "Membership" "contains" "M-".
11. Control: "Username" "is" "ccorino".

**Expected**: steps 1–3 list "Daniel Barnes" alone; steps 5–9 list
"u51sb10 Harbour Library" alone; step 10 lists nothing (an institutional
subscription has no membership).

**Observed**: steps 1–3 list both "Daniel Barnes" and "Alan Mwandenga";
steps 5–10 list both "u51sb10 Harbour Library" and "u51sb10 Hilltop
College". The list's request answers 200. The
controls narrow as expected: step 4 lists "Daniel Barnes" alone, step
11 "u51sb10 Harbour Library" alone.

## Cause

`SubscriptionDAO::applySearchFilters()` (OJS
`classes/subscription/SubscriptionDAO.php`, line 226) maps the search
field to a column with `match ($searchField)`. The user fields are
string constants (`Identity::IDENTITY_SETTING_GIVENNAME` is
`'givenName'`, `USER_FIELD_USERNAME` is `'username'`), but the
subscription fields are integers: `SUBSCRIPTION_MEMBERSHIP = 2`,
`SUBSCRIPTION_REFERENCE_NUMBER = 3`, `SUBSCRIPTION_NOTES = 4`.

`InstitutionalSubscriptionDAO::getByJournalId()` has its own
`match ($searchField)` (line 464) for `SUBSCRIPTION_INSTITUTION_NAME =
0x20`, `SUBSCRIPTION_DOMAIN = 0x21` and `SUBSCRIPTION_IP_RANGE = 0x22`,
and then calls `applySearchFilters()` (line 485) for the rest. So on
the institutional list, "Institution name", "Domain" and "IP ranges"
fail at line 464, and "Membership", "Reference Number" and "Notes" fail
in `applySearchFilters()`, as on the individual list.

The value comes from the grid's filter form:
`SubscriptionsGridHandler::getFilterSelectionData()` passes
`$request->getUserVar('searchField')`, which is the string `"3"`.
`match` compares strictly, so `"3" === 3` fails, the field falls to
`default => null`, no condition is added, and the whole list comes
back. The string constants still match, which is why the user fields
work.

The code was a `switch` until 5283e8ae00 (`pkp/ojs#3870`, for
`pkp/pkp-lib#8700`, a move of the DAOs to the Laravel query builder;
on `main` as the cherry-pick 60867c2d74). `switch` compares loosely, so
`"3" == 3` matched.

Reach:

- The date filter in `applySearchFilters()` uses the same `match` on
  `Subscription::SUBSCRIPTION_DATE_START`/`END`, but no caller passes a
  date field (both grids pass `null`), so it is latent (code).
- The `match ($searchMatch)` blocks in `applySearchFilters()` and in
  `InstitutionalSubscriptionDAO::getByJournalId()` end in a `default`
  arm commented "startsWith". It catches every `searchMatch` other than
  "is" and "contains", a missing one included, and compares with `=`
  against `"{$search}%"`: it finds only a value that is the typed text
  followed by a literal `%`. Before 5283e8ae00 it was a starts-with
  `LIKE`. The form sends only "is" or "contains", so the screens do not
  reach it (code).
- Other `match` statements the same commit added (`classes/issue/DAO.php`,
  `classes/submission/DAO.php`, `SubscriptionTypeDAO`) take no request
  value. A search of OJS and pkp-lib for `match (` on a request
  parameter found no other instance (code).

## Proposed fix

Cast a numeric search field back to an integer before it is matched,
in a helper on `SubscriptionDAO` called at the two places that match
it: `SubscriptionDAO::applySearchFilters()` (used by the individual and
the institutional lists) and `InstitutionalSubscriptionDAO::getByJournalId()`
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/fix.diff),
against the OJS root):

```diff
+    protected static function normalizeSearchField(mixed $searchField): mixed
+    {
+        return is_string($searchField) && ctype_digit($searchField) ? (int) $searchField : $searchField;
+    }
@@ SubscriptionDAO::applySearchFilters()
         $userDao = Repo::user()->dao;
+        $searchField = static::normalizeSearchField($searchField);
@@ InstitutionalSubscriptionDAO::getByJournalId()
+        $searchField = static::normalizeSearchField($searchField);
         if (!empty($search)) {
```

The DAO is where the field constants are defined and mapped, so a fix
there covers every caller, the grids and any plugin that calls
`getByJournalId()`. `ctype_digit` on a request value is the check
`Issue\Repository` and `OjsIssueRequiredPolicy` already use.

The diff also turns the `default` arm of both `match ($searchMatch)`
blocks back into a starts-with `LIKE`, as before 5283e8ae00. A request
with an unknown or missing `searchMatch` then lists the values starting
with the typed text, where it now lists almost nothing; "is" and
"contains" are unchanged.

Tried on OJS `main`: steps 1–3 list "Daniel Barnes" alone, steps 5–9
"u51sb10 Harbour Library" alone, step 10 nothing. Searches the fault
does not touch behave as before with the fix in: "Given Name", "Email
address" and "Family Name" narrow, an empty box lists all, and "is"
stays exact ("REF-1" matches nothing).

**Alternatives**

- Cast in `SubscriptionsGridHandler::getFilterSelectionData()`: one
  line, but the DAO stays strict for any other caller.
- Turn the constants into strings: changes public constants that
  plugins may use.
- Go back to `switch`: brings back the loose comparison the refactor
  moved away from.

**What goes with it**

- No stored data to repair, and no API or plugin hook changes.
- Backport: the same code is on `stable-3_5_0`, and on `stable-3_4_0`
  through the backport c9882c383d (`pkp/ojs#4286`). The diff applies to
  both as it stands (line offsets only).
- Test: OJS has no test of the subscription DAOs, but pkp-lib's
  `DatabaseTestCase` (`lib/pkp/tests/DatabaseTestCase.php`, which OJS's
  `tests/jobs/notifications/OpenAccessMailUsersTest.php` extends) gives
  a database-backed base. A new test there would call
  `getByJournalId()` with `searchField` `"3"` (a string, as the grid
  sends it) and check that only the matching subscription comes back.
  An e2e test of the search on all ten fields would also catch it.

Small: a few lines in two OJS DAOs, following a check the code base
already uses.

## Evidence

- Kept walk:
  [`shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js)
  (helpers in `lib.js` beside it), the preconditions and steps 1–11, on
  an install freshly loaded from the default dataset (3.5: with
  `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=issues-sb10 PROBE_AGENT=sb10 node bin/probe.js ojs shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js`
- Searches the fix must leave as they were:
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/neighbour.js)
  beside it, run right after `walk.js` on the same install. Two of its
  searches ("Reference Number" "is" and "Institution name" "is") use
  affected fields, so they pass only with the fix in.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/fix.diff ojs`
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
- Code reads: `SubscriptionDAO::applySearchFilters()`,
  `InstitutionalSubscriptionDAO::getByJournalId()`,
  `IndividualSubscriptionDAO::getByJournalId()`,
  `SubscriptionsGridHandler::getFilterSelectionData()` and both grids'
  `renderFilter()`/`loadData()` on `main` and 3.5 (the same code) and
  on `stable-3_4_0`; `stable-3_3_0`'s `SubscriptionDAO::_generateSearchSQL()`
  and `InstitutionalSubscriptionDAO::getByJournalId()` use `switch` on
  the same integer constants (`define()`d), which matches the request's
  string.
- Introduced: `git blame` on the `match ($searchField)` lines gives
  60867c2d74, whose message reads "cherry picked from commit
  5283e8ae00", the commit of `pkp/ojs#3870`; its parent has the
  `switch` in `_generateSearchSQL()`.
- Upstream: `pkp/pkp-lib#11027` (opened 2025-03-03, OJS 3.4.0.8,
  "Institution name" + "contains" returns all results) has no linked fix
  or cause.
