# After "Deposit DOIs", the item's agency box says it "has been manually registered", though nobody marked it

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/ui-library#240` for `pkp/pkp-lib#7521` · [c475c5cf76](https://github.com/pkp/ui-library/commit/c475c5cf7627a48cb9279299767f9a6842d858f3) · 2022-12-13 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the DOIs page, an item whose DOI was sent for deposit reads
"Submitted", and the agency box in its expanded view says "This item has
been manually registered with a registration agency." Expected: "The
metadata for this item has been submitted to {agency}.", since nobody
marked it registered.

Nothing is lost: the badge, the deposit and the stored status are right,
and the box picks the wrong one of two sentences. The sentence is wrong
for as long as the item reads "Submitted". That is seconds where queued
jobs run on web requests (the default), and until the worker's or cron's
next run otherwise. When the deposit cannot connect to the agency, the
item stays "Submitted" (a separate fault, pkp-e2e#210) and the sentence
stays with it.

It needs Crossref or DataCite configured, which a press cannot have. It
shows on an item whose DOI no agency has registered before; an item
deposited again after an agency registered it reads the right sentence.

## Impact

- **Lost.** Nothing. The box says the DOI was registered by hand while it
  is waiting for its deposit.
- **Who.** A journal or preprint server manager who expands an item on
  the DOIs page while it reads "Submitted".
- **Way round.** The badge is right, and the box offers no button in this
  state, so the sentence leads to no wrong action on screen. It turns
  into the right one once the agency has answered.

Low: a wrong sentence, and the deposit goes through. A manager who
believed it and so never looked at a stuck deposit again would make it
medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS; OPS where the steps say so),
  with `[queues] job_runner = On` in `config.inc.php` as the dataset
  ships it, so queued jobs run on web requests.
- The agency must be unreachable, or steps 7 and 8 show "Error" instead:
  step 4 gives no credentials, so an agency that answers refuses the
  deposit within seconds. Point the proxy in `config.inc.php` at a port
  where nothing listens:

  ```ini
  [proxy]
  http_proxy = "http://127.0.0.1:9"
  https_proxy = "http://127.0.0.1:9"
  ```

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save" (the dataset has no prefix).
4. "Registration": "Registration Agency" "Crossref", "Depositor name"
   `Public Knowledge Project`, "Depositor email" `dbarnes@mailinator.com`,
   "Save".
5. Side menu "DOIs": tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran" [OPS: submission 2, "The
   Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence"]; "Bulk Actions" › "Assign DOIs" › "Assign DOIs". Expand
   the item ("Show more details about 17") and read the "Crossref" box
   under the DOI table.
6. Tick the item; "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs". Read
   the box.
7. Reload the DOIs page, expand the item, read the box.
8. Reload the DOIs page every few seconds, for about 20 s, until the
   deposit has been given up: as `admin`, Administration › "Failed Jobs"
   then lists `PKP\jobs\doi\DepositSubmission`. Expand the item, read
   the box.
9. As `dbarnes`, tick the item; "Bulk Actions" › "Mark DOIs Registered" ›
   "Mark DOIs Registered". Expand the item, read the box.

With DataCite (OJS): the same, with "DataCite Manager Plugin" in step 2
and "Registration Agency" "DataCite" in step 4 (the reproduction also
typed "Username (symbol)" `u45ir12`; the form does not require it).

**Expected.** Step 5: badge "Unregistered", "The metadata for this item
has not been submitted to Crossref." with "Deposit DOI(s)". Steps 6 to 8:
badge "Submitted", "The metadata for this item has been submitted to
Crossref." Step 9: badge "Registered", "This item has been manually
registered with a registration agency."

**Observed.** Step 5 as expected. Steps 6, 7 and 8: badge "Submitted",
and the box reads

```
Crossref
This item has been manually registered with a registration agency.
```

with no button. Step 9: badge "Registered" and the same sentence, which
is right there. With DataCite the box is headed "DataCite" and reads the
same in steps 6 to 9.

## Cause

The box's sentence is chosen in ui-library
`src/components/ListPanel/doi/DoiListItem.vue`, lines 187 to 195. For an
item that `isDeposited()`, it shows the "manually registered" sentence
when `itemRegistrationAgency` is null, and the "submitted to {agency}"
sentence otherwise. `isDeposited()` (`useDoi.js`, line 75) is true for
two statuses, "Submitted" and "Registered".

A DOI's `registrationAgency` is written only when it becomes
"Registered". The agency plugins set it in `updateDepositStatus()` when
the agency accepted the deposit: `CrossrefExportPlugin.php` line 442 on
OJS and line 486 on OPS, and OJS `DataciteExportPlugin.php` line 358.
`Repo::doi()->markRegistered()` sets it to null for "Mark DOIs
Registered" (lib/pkp `classes/doi/Repository.php` line 265).

Queuing a deposit changes the status alone (`DAO::markSubmitted()`,
lib/pkp `classes/doi/DAO.php` line 159). A DOI deposited for the first
time is therefore "Submitted" with no agency, and the component takes
the missing agency for a registration by hand without testing that the
DOI is registered.

`pkp/pkp-lib#7521` asked for the manual sentence on an item that was
marked registered. Its ui-library change put the null test under
`isDeposited`, which also covers "Submitted". The change went in before
3.4.0, the first release with the DOIs page, so every release has shown
the manual sentence for a "Submitted" item.

Reach:

- Every "Submitted" item whose DOI no agency registered before, with
  Crossref (journal, preprint server) and DataCite (journal): seen on
  screen.
- An item registered through the agency, marked "Needs Sync" and
  deposited again keeps its stored agency while "Submitted". Today it
  reads "submitted to {agency}" with the agency that registered it
  before, which is the wrong name if the agency was changed since. Code
  read, not walked (it needs an agency's answer).
- A work with several versions: `itemRegistrationAgency` (line 415) reads
  `item.doiObjects[0]`, the first DOI of all versions, while the status
  comes from `currentVersionDoiObjects[0]` (`useDoi.js`, line 57). The
  two can be different DOIs, so the box can pair one version's status
  with another version's agency. Code read, not walked.
- The DOIs page's "Issues" tab on a journal renders its items with the
  same component: code read, not walked.
- The component is the field's only reader. In ui-library the one other
  mention is the mapper that passes it on (`DoiListPanel.vue` line 1042);
  in PHP only the writers above and the 3.4 upgrade migration
  `I7014_DoiMigration.php` touch it.

## Proposed fix

In `DoiListItem.vue`, show the manual sentence only for a DOI that is
"Registered" without an agency, and name the configured agency while the
DOI is "Submitted":

```diff
 						isDeposited(itemDepositStatus)
-							? itemRegistrationAgency === null
+							? isManuallyRegistered
 								? t('manager.dois.registration.manuallyMarkedRegistered')
 								: t('manager.dois.registration.submittedDescription', {
-										registrationAgency: itemRegistrationAgencyName,
+										registrationAgency: depositedAgencyName,
 									})
```

with two computed properties: `isManuallyRegistered` (the status is
`pkp.const.DOI_STATUS_REGISTERED` and `itemRegistrationAgency` is null)
and `depositedAgencyName` (`registrationAgencyInfo['displayName']` while
the status is `pkp.const.DOI_STATUS_SUBMITTED`, otherwise
`itemRegistrationAgencyName`). The full diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposited-item-reads-manually-registered/fix.diff).

The rule belongs in the component, which alone gives the null its
meaning. The "not submitted" sentence beside it already names the
configured agency through `registrationAgencyInfo['displayName']`, and a
queued deposit goes to that agency. On `main` the status comparisons
live in `useDoi.js` (`isDeposited()`, `isStale()`, `hasErrors()`), so
the team may prefer the "Registered" and "Submitted" tests as two
helpers there; the diff keeps them in the component, next to the agency
they are paired with, and behaves the same.

Tried on `main`, OJS and OPS with Crossref: with the fix in, steps 6 to 8
read "The metadata for this item has been submitted to Crossref.", and
steps 5 and 9 read as before.

Also recommended, not tried and not in the diff: read the agency from the
same DOI as the status, `currentVersionDoiObjects[0]` in place of
`item.doiObjects[0]` in `itemRegistrationAgency`. Without it the fixed
test can still pick the wrong sentence on a work with several versions.
It was left out because seeing it needs an earlier version's DOI
registered through an agency, which no walk here could produce.

**Alternatives:**

- Storing the agency when the deposit is queued (`markSubmitted()`): the
  field would then mean "registered with" and "sent to", four callers
  would have to pass the agency, and a deposit that ends in "Error" would
  keep an agency that never registered the DOI.
- Dropping "Submitted" from `isDeposited()`: it also drives the greyed
  "Edit" button and the "Deposit DOI(s)" button, which must stay as they
  are for a "Submitted" item.

**What goes with it:**

- No stored data, API or plugin hook changes.
- Backport: on `stable-3_5_0` and `stable-3_4_0` the template line reads
  `isDeposited` (a computed property there), so the first hunk is applied
  by hand; the two computed properties apply as written, and status
  comparisons in the component are the pattern there. Not tried on
  either.
- Test: ui-library has no component tests for the DOI list; the pkp-e2e
  U45 spec takes a check of the box's sentence after "Deposit DOIs".

Small: a few lines in one component.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposited-item-reads-manually-registered/walk.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/deposited-item-reads-manually-registered/walk.js`
  (Crossref; `WALK=datacite` for DataCite on OJS;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Where the walk differs
  from the Steps: in step 8 it does not open "Failed Jobs" but reads the
  `jobs` and `failed_jobs` tables (the queue was empty and the failed
  job stored after 8 to 13 s), and it reads each DOI's stored status and
  `registrationAgency` from the database (read only).
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/deposited-item-reads-manually-registered/fix.diff ojs ops`
  (which rebuilds the JavaScript), walk.js on OJS and OPS, then
  `node bin/try-fix.js revert` with the same arguments. DataCite was not
  walked with the fix in; the component does not distinguish the
  agencies.
- Walked on PostgreSQL, each install freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30):
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp 2e377d27fc), OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    (lib/pkp 3dc90c81a6), ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a):
    as Observed, Crossref on both and DataCite on OJS. The stored DOI was
    status 2 ("Submitted") without a `registrationAgency` in steps 6 to
    8, and status 3 without one after step 9.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    lib/pkp a9c76aed62, ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca):
    as Observed, Crossref on both; DataCite not walked. The code has the
    same test (`DoiListItem.vue` line 151, `isDeposited` a computed over
    "Submitted" and "Registered", line 379) and the same
    `markSubmitted()`.
- Code reads, not walked:
  - 3.4: ui-library `stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f)
    (the commit OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    and OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
    pin) contains c475c5cf76: `DoiListItem.vue` line 139 has the null
    test under `isDeposited` (line 431, both statuses). lib/pkp
    `stable-3_4_0` df13621c2d `classes/doi/DAO.php` line 175
    `markSubmitted()` updates the status alone.
  - 3.3: ui-library `stable-3_3_0` 96959f9ed4 has no DOI list component,
    and OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    has no DOIs page.
- Introduced: `git blame` on `DoiListItem.vue` line 188 gives c475c5cf76,
  merged 2023-02-02. Its parent showed the "submitted to" sentence with
  the configured agency's name for both statuses, but was never
  released, hence Kind defect.
- Upstream search: pkp/pkp-lib, pkp/ojs, pkp/ops and pkp/ui-library, by
  the symptom's words and by `manuallyMarkedRegistered`,
  `itemRegistrationAgency` and `DoiListItem`; only `pkp/pkp-lib#7521`
  and its PRs came up.
- Unverified: the "Issues" tab, an item deposited again after an
  agency's registration, a work with several versions, and how the
  box reads after an agency refuses a deposit ("Error" is taken from the
  code and from pkp-e2e#210's report) were not walked.
