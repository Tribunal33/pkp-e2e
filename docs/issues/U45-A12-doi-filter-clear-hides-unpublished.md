# On the DOIs page, clearing a "Registration" filter chosen after "Unregistered" leaves only published works listed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/ui-library#256` for `pkp/pkp-lib#7524` · [4534505d41](https://github.com/pkp/ui-library/commit/4534505d413c4bfefbbf38a4baa3a80929c90600) · 2023-02-10 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager presses "Unregistered", then "Registered", then "Clear filter:
Registered". No filter reads chosen, yet every unpublished work stays
out of the list until the page is reloaded, so the manager takes a
partial list for the whole one.

Reloading the page brings the whole list back, and nothing is saved
wrong.

It is met in ordinary browsing: a manager looks at "Unregistered",
switches to any other filter of the "Registration" group ("Submitted",
"Registered", "Has Error", "Needs Sync") and then clears that filter.

## Impact

- **Lost.** The unpublished works in the list, and nothing on the page
  says a filter still applies. "Select All" then ticks the published
  works only, so "Assign DOIs" run on the ticked works gives the
  unpublished ones no DOI, and no message says they were left out.
- **Who.** A manager or editor on the works tab of the DOIs page who
  switches from "Unregistered" to another "Registration" filter and then
  clears it, which is a normal way to look through the group.
- **Way round.** Reload the page. The works left out still read
  "Unpublished" with no DOI once the list is whole, so the manager can
  run the action again.

Low: the page shows a short list without saying so, but no action
reaches a work the manager did not see ticked and the task gets done
after a reload. It would be medium if the short list led to a wrong
record, for instance a deposit or a mark made on works the list did not
show.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for the version (OJS, OMP or OPS). Nothing
  else is needed: the dataset has DOIs turned on and holds published and
  unpublished works.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and press "DOIs" in
   the side menu (`/index.php/publicknowledge/en/dois`). The list holds
   8 works on the journal (2 published, 6 "Unpublished"), 7 on the press
   (2 and 5), 19 on the preprint server (17 and 2).
2. Under "Filters", in the "Registration" group, press "Unregistered".
   The dataset has no work with a DOI, so the list reads "No items
   found.".
3. Press "Registered". The list again reads "No items found.".
4. Press "Clear filter: Registered" (the cross beside "Registered").
5. Reload the page.

**Expected.** After step 4 no filter reads chosen and the list holds
every work again, as in step 1.

**Observed.** After step 4 no filter reads chosen and no "Clear filter"
button is left, yet the list holds only the published works: 2 of 8 on
the journal, 2 of 7 on the press, 17 of 19 on the preprint server. The
list request still asks for published works only:

```
GET …/api/v1/submissions?onDoiPage=true&status[]=3&searchPhrase=&count=30&offset=0
```

After step 5 the list is as in step 1. The request of step 3 already
carries `doiStatus=3&status[]=3`, with only "Registered" reading chosen.

Control: "Registered" and then "Clear filter: Registered", without
"Unregistered" first, gives the whole list.

## Cause

"Unregistered" is the one filter that stands for two conditions. In
ui-library `src/components/ListPanel/doi/DoiListPanel.vue`,
`addFilter('unregistered')` (line 468) puts three keys into
`activeFilters`: `unregistered`, `doiStatus` (1) and the published-only
status under `publishedStatuses.name` (`status: [3]`). The fetch mixin
sends every key of `activeFilters` as the list request's query.

`removeFilter('unregistered')` (line 509) takes all three out again. The
other way of leaving "Unregistered" does not: pressing another
"Registration" filter runs `addFilter('doiStatus', n)`, which deletes
`unregistered` (line 481) and overwrites `doiStatus`, and leaves
`status: [3]` behind.

From then on the status is sent with every list request, but no filter
button stands for it. Clearing "Registered" runs
`removeFilter('doiStatus')`, which deletes `doiStatus` only. A journal
has no "Publication Status" filters, so no press there can delete the
status; `activeFilters` is emptied only when the page is loaded again.

The change that made the filters granular (`pkp/pkp-lib#7524`) brought
this in. Before it, `addFilter()` and `removeFilter()` began, for every
filter except the journal's "Issues" box (`issueIds`), by deleting
`unpublished`, `unregistered`, `doiStatus`, `hasDois` and the status. So
one of those filters applied at a time and nothing was left behind.

Reach:

- Every "Registration" filter pressed after "Unregistered" ("Submitted",
  "Registered", "Has Error", "Needs Sync") takes the same branch (code);
  "Registered" was walked. While that filter is chosen, the list is also
  narrowed to published works, so an unpublished work whose DOI was
  marked registered is not listed under "Registered" (code; seen in the
  request, the dataset has no such work).
- The same component serves the journal's "Articles" tab, the press and
  the preprint server (walked). The journal's "Issues" tab uses the same
  methods with `publishedStatuses.name` set to `isPublished` (code, not
  walked).
- On a press and a preprint server the "Publication Status" filters
  ("Published" or "Posted", "Unpublished") write the same `status` key.
  Pressing one after "Unregistered" overwrites the published-only status,
  and clearing it deletes that status while "Unregistered" stays chosen:
  the request then reads `doiStatus=1&unregistered=true` with no status
  (walked, seen in the request). The fix below does not cover it. It is
  a product question first: whether "Unregistered" may be combined with
  a "Publication Status" filter at all, or should replace it and be
  replaced by it.

## Proposed fix

Recommended: when another "Registration" filter replaces "Unregistered",
take the status that "Unregistered" brought out with it, in
`addFilter()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-filter-clear-hides-unpublished/fix.diff)):

```diff
 				param === 'doiStatus' &&
 				value !== pkp.const.DOI_STATUS_UNREGISTERED
 			) {
+				// "Unregistered" brought its own published-only status: it
+				// leaves with it, unless another filter has since set the status.
+				// An identity test: for an array (`[3]`) Vue returns one reactive
+				// proxy per array, so the stored value and the prop are the same
+				// object; the issues list compares the number 1.
+				if (
+					newFilters['unregistered'] &&
+					newFilters[this.publishedStatuses.name] ===
+						this.publishedStatuses.published
+				) {
+					delete newFilters[this.publishedStatuses.name];
+				}
 				delete newFilters['unregistered'];
 			}
```

It mirrors what `removeFilter('unregistered')` already does, in the
method that owns the rule, and keeps the granular filters of
`pkp/pkp-lib#7524`: the status goes only when "Unregistered" was chosen
and the status is still the one it set, so a "Published" or "Posted"
filter the manager chose stays.

The status test is an identity comparison (`===`). On the works tabs
`publishedStatuses.published` is the array `[3]`, and the test holds
because `addFilter('unregistered')` stores that very array and Vue hands
back the same reactive proxy for it from `activeFilters` and from the
prop; the walk below shows it holding. That reading of Vue's reactivity
was not checked beyond the walk, and a comparison by value would not
depend on it. On the journal's "Issues" tab the value is the number 1,
which `===` compares by value; that tab was not tried.

Tried on `main` on the three apps: after step 4 the list holds every
work again and the request carries no `status`; the request of step 3
reads `doiStatus=3` alone. The neighbours are unchanged with the fix in
and out: "Unregistered" then "Clear filter: Unregistered" gives the
whole list; "DOI Assigned", "Registered", "Clear filter: Registered"
leaves "DOI Assigned" chosen; on the press and the preprint server
"Published" ("Posted"), "Registered", "Clear filter: Registered" leaves
the "Publication Status" filter chosen and the list narrowed by it.

**Alternatives**

- Delete the status in `removeFilter('doiStatus')`: it clears the list
  at step 4 but leaves step 3 narrowed to published works, and would
  drop a "Publication Status" filter chosen on its own.
- Stop storing the status for "Unregistered" and have the list request
  add it while `unregistered` is set (in the fetch's query, or by the
  API honouring `unregistered`): it also settles the "Publication
  Status" overlap named under Reach, but changes how the page builds its
  request and what the API accepts, so it is a larger change.

**What goes with it**

- No data repair: the fault is in the page's state only.
- Backport: the two methods are the same on `stable-3_5_0` and
  `stable-3_4_0`, so the diff applies there as written (not tried).
- Guard: an e2e scenario on the DOIs page ("Unregistered", "Registered",
  "Clear filter: Registered", then the whole list), a Planned item in
  spec U45.

Small: a few lines in one method of one component, following the
pattern of its sibling method, with one e2e scenario. It is a proposal;
the team decides.

## Evidence

- Kept script, which takes the Steps through the screens, then the
  control, the neighbours and the "Publication Status" sequence named
  under Reach:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doi-filter-clear-hides-unpublished/walk.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/doi-filter-clear-hides-unpublished/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5), where `<feature>` is
  the name the install was prepared under (`npm run fleet-prep --
  --feature <feature> --dataset --reset`) and `<id>` any short name for
  the folder the records go to, `.reports/<feature>/<id>/`. After each press it
  records the rows, the filters that read chosen and the query of the
  list's last request. Where it differs from the Steps: it takes the
  control and the neighbours in the same sign-in, each after opening the
  page afresh.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the same walk, then
  `node bin/try-fix.js revert …/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`. Nothing
  here depends on the database. No request failed and no script error
  was recorded.
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a):
    as Observed.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca):
    as Observed, the same counts; the request there opens with
    `stageIds[]=…` in place of `onDoiPage=true`. The code: `addFilter()`
    and `removeFilter()` are the same as on `main`.
- Code reads, not walked:
  - 3.4: ui-library `stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f)
    holds 4534505d41, and `addFilter()` and `removeFilter()` in
    `DoiListPanel.vue` read as on `main`; lib/pkp `stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    `PKPDoiListPanel` gives the `unregistered` filter and
    `publishedStatuses`.
  - 3.3: ui-library `stable-3_3_0` has no `ListPanel/doi`; that version
    has no DOIs page.
- Introduced, traced from `delete newFilters['unregistered'];` in
  `addFilter()` (line 481): `git blame` gives 4534505d41, "pkp/pkp-lib#7524
  Make DOI filters more granular", merged as `pkp/ui-library#256`. Its
  parent is the merge e64d5dcf, and the file's last change before it is
  74ce48c2 (2023-01-11), where both methods still open with the reset
  block that 41aca239b1 (2022-02-18, `pkp/pkp-lib#7682`) wrote: for any
  `param` other than `issueIds` it deletes `unpublished`, `unregistered`,
  `doiStatus`, `hasDois` and the status key. Both changes were made
  during 3.4 development and no release had the earlier behaviour, hence
  Kind defect.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom (DOI filter unregistered, DOI filters clear
  unpublished, DOI filter list reload) and by `DoiListPanel addFilter`.
  `pkp/pkp-lib#7684`, `#7682` and `#7524` are the feature issues that
  designed these filters; none reports this fault.
- Not driven: "Submitted", "Has Error" and "Needs Sync" in place of
  "Registered", and the journal's "Issues" tab; they share the code read
  above.
- Unverified: the dataset holds no work with a DOI, so the two Reach
  points about what "Unregistered" and "Registered" list rest on the
  request, not on rows. "Assign DOIs" after "Select All" on the short
  list was not run; that it reaches only the ticked works is read from
  the bulk actions' requests, each of which sends `ids: this.selected`.
