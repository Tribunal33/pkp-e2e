# Each institutional subscription a reader buys adds another copy of their institution to the journal's list

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no Institutions list)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U51 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Every "Continue" on "Purchase Institutional Subscription" adds a new
institution to the journal's Institutions list under the name the
reader typed. A second purchase for the same institution, with the same
name and IP ranges, adds a second identical entry. When a reader
reopens their bought subscription with the "Purchase" button on "My
Subscriptions", the subscription moves to yet another new entry, and
the one it used stays on the list, used by nothing.

The Journal Manager sees look-alike entries with nothing to say which
subscription uses which, and tidies them by hand.

## Impact

- **Lost.** Readers lose nothing. The manager's Institutions list
  gains an entry per purchase, identical copies and unused ones
  included.
- **Who.** The Journal Manager of a journal that requires
  subscriptions, takes payments and sells institutional subscriptions
  to readers.
- **Way round.** The manager points each subscription at one entry
  ("Edit Subscription" › "Institution") and deletes the copies on the
  Institutions page.

Low: the purchases themselves go through correctly.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, journal `publicknowledge`.
  It is open access, its payments are off, and it has no institution.
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

Two purchases:

1. Sign in as `dsokoloff` (Reader). Open "My Subscriptions"
   (`/index.php/publicknowledge/en/user/subscriptions`) and, under
   "Institutional Subscriptions", press "Purchase New Subscription".
2. Type "Tide University" in "Institution name" and "192.0.2.0/24" in
   "IP ranges", press "Continue". The "Manual Fee Payment" page shows.
3. Open "My Subscriptions", press "Purchase New Subscription" again,
   type the same name and range, press "Continue".
4. Sign in as `rvaca` and open "Institutions" in the left menu.

Reopening a bought subscription (from a freshly loaded dataset and the
same preconditions):

5. Do steps 1 and 2.
6. As `rvaca`, "Payments" › "Institutional Subscriptions" › the "Tide
   University" row › arrow › "Edit": "Status" "Active", "End date" a
   year from today, "Save".
7. As `dsokoloff`, "My Subscriptions" › "Purchase" beside the
   subscription. "IP ranges" reads "Array"; type "192.0.2.0/24" in its
   place and press "Continue".
8. As `rvaca`, open "Institutions".

**Expected.** One "Tide University" after step 4 and after step 8:
both purchases, and the reopened one, are for the institution the
journal already has, with the same name and ranges.

**Observed.** After step 4, two "Tide University" entries, each
holding "192.0.2.0/24", one per subscription. After step 8, two "Tide
University" entries again: the subscription now uses the new one, and
the first is used by no subscription. A purchase for another
institution ("Harbour College", "198.51.100.0/24") adds its own entry,
as it should.

## Cause

`UserInstitutionalSubscriptionForm::execute()` builds a new
`Institution` from the typed name and ranges on every save and stores
it (`$institutionId = Repo::institution()->add($institution)`), then
points the subscription at it. It never looks at the institutions the
journal already has.

Up to 3.3 an institutional subscription kept the institution's name and
ranges on its own record, and the journal had no Institutions list.
11f902f20f, for `pkp/pkp-lib#6782`, the change that introduced
institutions, moved them onto `Institution` objects. The manager's
"Create New Subscription" window picks an institution from the list;
the reader's page, which must not show a reader the journal's other
institutions, was changed to add one per save.

Reach:

- **New purchases and a reopened purchase** (seen in a browser, main
  and 3.5), as in the Steps.
- **Deleting a copy** (read in the code): `institution\DAO::delete()`
  removes one no subscription uses, and only hides (soft-deletes) one a
  subscription still points at, which stays linked to it.

## Proposed fix

Reuse the journal's institution when one has exactly the typed name and
IP ranges, and add a new one only when none does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-adds-institution-each-time/fix.diff)).
In `UserInstitutionalSubscriptionForm`, a helper reads the journal's
institutions with `Repo::institution()->getCollector()->filterByContextIds([$journalId])`
and returns the id of one whose name and ranges equal the typed ones;
`execute()` uses that id, or adds the institution as today when there
is none.

What counts as equal, by choice:

- The name is compared exactly (letter case included) in the language
  the reader is using, the one the page stores a new institution's
  name in. A reader browsing in French does not match an institution
  the manager named only in English, and gets a new entry, as today.
- The ranges are trimmed, empty lines dropped and order ignored. A
  purchase with only a domain has no ranges, so it reuses an
  institution of that name that has no ranges either; the domain is
  kept on the subscription, not the institution.
- Hidden (soft-deleted) institutions are never reused: the collector
  leaves them out.

An existing institution is never changed: one that differs in anything
is not reused, and a new entry is added with the reader's values for
the Subscription Manager to review.

Tried on OJS `main`: after steps 1 to 3 the Institutions page listed
one "Tide University", and both subscriptions used it, keeping its one
range. After steps 5 to 7, one "Tide University" too, still used by
the reopened subscription. A purchase for "Harbour College",
"198.51.100.0/24" still added its own entry.

- **Alternatives.**
  - Match on the name alone, or update the matching institution with
    the typed ranges: a reader could then change the ranges of an
    institution other subscriptions use, which only the manager may
    do.
  - Update the subscription's own institution in place when the reader
    reopens its page: the same problem when a manager pointed that
    subscription at a shared institution.
  - Keep the reader's institution details on the pending subscription
    and let the Subscription Manager pick or create the institution
    when approving it: no copies at all, but a schema change and a
    product decision.
- **What goes with it.** Copies already on the list stay; the manager
  points subscriptions at one entry and deletes the rest, as today. No
  migration is proposed, since two entries with one name may be two
  real institutions. No API or plugin hook is involved. The diff
  applies as is to 3.5 and 3.4. The test that would have caught it:
  an e2e check that two purchases for the same institution leave one
  entry on the Institutions page.

Small: the change stays inside one form and reads institutions through
the collector the manager's window already uses.

## Evidence

- The kept scripts take the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-adds-institution-each-time/walk.js)
  (steps 1 to 4, then the "Harbour College" purchase) and
  [walk.js of the "Array" report](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/institutional-purchase-ip-ranges-read-array/walk.js)
  (steps 5 to 8; it presses "Continue" once before retyping the range,
  which the page refuses), with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/purchase-on-active-subscription-removes-access/lib.js).
  Which subscription uses which entry was read in the database.
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-adds-institution-each-time/walk.js`
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/institutional-purchase-adds-institution-each-time/fix.diff ojs`
- Walked on OJS `main` and `stable-3_5_0`, on PostgreSQL. The fix
  compares names in PHP, not in a query, so the database's collation
  plays no part; MySQL not checked. Datasets: pkp/datasets c657990
  (2026-10-01).
- Tips: OJS `main` b84f8e2e44 (pkp-lib ddd8ab243a), `stable-3_5_0`
  c346ee00a5 (pkp-lib 3bb4450bea), `stable-3_4_0` 75cc2d488b (pkp-lib
  32b0f4b4af), `stable-3_3_0` ac77c9fb35 (pkp-lib f6ab331645). 3.4's
  `execute()` is `main`'s; 3.3 has no `Institution`.
- Not driven: a purchase in French, a domain-only purchase (read in
  the code).
