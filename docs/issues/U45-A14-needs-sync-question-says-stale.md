# The "Mark DOIs Needs Sync" window on the DOIs page asks to mark the records "as stale"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no DOIs page)
- **Introduced** `pkp/pkp-lib#8688` for `pkp/pkp-lib#7524` · [c0be868701](https://github.com/pkp/pkp-lib/commit/c0be8687012685ddb4c22e523dad31d5f3c339e7) · 2023-02-22 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager chooses "Mark DOIs Needs Sync" in the DOIs page's "Bulk
Actions" menu. The confirmation window ends "Are you sure you want to
mark these records as stale?", while the action, the filter, the badge
and the rest of the same window all call the status "Needs Sync".

The action still sets "Needs Sync"; only the question's last word is
wrong.

It is one English sentence left over from 2023, when the status was
renamed from "Stale" to "Needs Sync". The window shows on every journal,
press and preprint server that has DOIs turned on.

## Impact

- **Lost.** Nothing.
- **Who.** A manager or editor who chooses "Mark DOIs Needs Sync" on the
  DOIs page, in English. The page is there once DOIs are turned on; the
  window reads the same with or without a DOI prefix and a registration
  agency.
- **Way round.** None needed.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the steps name OJS; square brackets
  give OMP and OPS).
- Nothing to set up: in the dataset DOIs are already on, with "Articles"
  ["Monographs", "Preprints"] ticked, so the side menu has "DOIs".

Steps:

1. Sign in as `dbarnes`.
2. Side menu "DOIs". The "Articles" ["Monographs", "Preprints"] tab is
   open.
3. Tick submission 17, "Antimicrobial, heavy metal resistance and plasmid
   profile of coliforms isolated from nosocomial infections in a hospital
   in Isfahan, Iran" [OMP: submission 5, "Bomb Canada and Other Unkind
   Remarks in the American Media"; OPS: submission 2, "The Facets Of Job
   Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence"].
4. "Bulk Actions" › "Mark DOIs Needs Sync". Read the window.

**Expected.** The question names the status as the rest of the page does:
"… Are you sure you want to mark these records as needing to be synced?"

**Observed.** The window "Mark DOIs Needs Sync" reads:

```
You are about to mark DOI metadata records for 1 item(s) as needing to be synced. The Needs Sync status can only be applied to previously submitted DOIs. Are you sure you want to mark these records as stale?
```

Its buttons are "Mark DOIs Needs Sync" and "Cancel". The menu item and the
filter beside the list read "Needs Sync". The word "stale" is nowhere
else on the page.

The two neighbouring windows repeat their own word: "… as unregistered.
Are you sure you want to mark these records as unregistered?" and "… as
registered. Are you sure you want to mark these records as registered?".

## Cause

The window's text is the locale string
`manager.dois.actions.markStale.prompt` in lib/pkp
`locale/en/manager.po` (the `msgid` is on line 190), which
`DoiListPanel.vue` `openBulkMarkStale()` shows. The string's last line,
line 194, reads `"sure you want to mark these records as stale?"`.

The sentence dates from fc555dce1d (2022-06-14, `pkp/pkp-lib#7518`),
which added the action as "Mark DOIs Stale". A Weblate commit, 08fd12645a4
(2022-08-12), wrapped the string onto three lines, and line 194 has not
changed since.

c0be868701 then renamed the status in the English locale. Until then the
action and the badge read "Stale" and only the filter read "Needs Sync".
The commit changed the action's label, the badge, the success notice, the
refusal message `doi.incorrectStaleStatus` and the first two lines of
this prompt, and left line 194. Its PR is titled "Remove unpublished
filter" and does not state the rename as an aim.

Reach:

- The fault is this one lib/pkp string, and all three apps show it. A
  journal's "Issues" tab on the DOIs page uses the same component and the
  same prompt (code read).
- OJS `locale/en/locale.po` has a second leftover,
  `doi.issue.incorrectStaleStatus`: "Could not set the DOI status to
  stale for the following issue: {$itemTitle}. …". No code uses the key:
  the issue endpoint refuses with `DoiException::INCORRECT_STALE_STATUS`,
  which is `doi.incorrectStaleStatus` (OJS `api/v1/dois/DoiController.php`
  line 288). No screen shows it (code read).
- No other English string in lib/pkp or the three apps says "stale" to
  the user (searched `locale/en/*.po`; the keys and method names keep
  the word, which no user sees).
- Translations: 59 locales of lib/pkp translate this prompt. Two were
  read. `fr` has the same leftover: it ends "comme périmés" ("as
  outdated"). `fr_CA` does not: it ends "comme déjà soumis et à
  synchroniser". The other 57 were not checked.

## Proposed fix

Finish the rename on line 194 of lib/pkp `locale/en/manager.po`,
repeating the first sentence's wording as the two sibling prompts do:

```diff
-"sure you want to mark these records as stale?"
+"sure you want to mark these records as needing to be synced?"
```

The diff that applies, against the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/needs-sync-question-says-stale/fix.diff).

Tried on `main` on the three apps: step 4's window then ends "Are you
sure you want to mark these records as needing to be synced?". The
neighbour check read the "Mark DOIs Unregistered" and "Mark DOIs
Registered" windows, whose text did not change.

**Alternatives:**

- `… mark these records as "Needs Sync"?`, the status by its badge name.
  It reads less like the two sibling prompts, which repeat the first
  sentence's phrase.

**What goes with it:**

- The unused OJS key `doi.issue.incorrectStaleStatus` can be removed in
  the same pass. It is not in the diff.
- Translations: what Weblate does to the 59 translations when the English
  source changes was not checked. The `fr` string needs the same
  correction from its translators.
- Backport: the diff applies as written to `stable-3_5_0` and
  `stable-3_4_0` (`patch --dry-run`); it was not walked there.
- Test: none advised.

Small: one line in one locale file.

## Evidence

- Kept script, which takes the Steps through the screens, then reads the
  two sibling windows and confirms the action once:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/needs-sync-question-says-stale/walk.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/needs-sync-question-says-stale/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The walk changes no
  data: the one confirmed action is refused.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the same
  walk, then `node bin/try-fix.js revert …/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30).
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
    The same window text on the three apps.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
    The same Steps and the same window text; `locale/en/manager.po` line
    194 is the same line.
- Code reads, not walked:
  - 3.4: lib/pkp `stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    holds c0be868701 and the same three-line prompt;
    `PKPDoiListPanel.php` passes the key to the page and ui-library
    `stable-3_4_0`
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f)
    `DoiListPanel.vue` `openBulkMarkStale()` shows it.
  - 3.3: lib/pkp `stable-3_3_0`
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072)
    has no `classes/doi` and no `manager.dois.*` strings in
    `locale/en_US/manager.po`.
- Introduced: `git log -S` on the sentence gives fc555dce1d, and `git
  blame` on line 194 gives 08fd12645a4, which only wrapped it. Blame on
  the prompt's first two lines gives c0be868701, the rename. The commit
  is in `pkp/pkp-lib#8688`, titled for `pkp/pkp-lib#7524` ("Remove
  unpublished filter"). The rename it carries answers `pkp/pkp-lib#8677`
  ("DOIs that need to be synced still shown as 'stale'", closed), which
  asked only for the badge to match the filter's "Needs Sync".
- Kind: "defect", not "intention gap". Neither the PR nor `pkp/pkp-lib#8677`
  asked for the word to be renamed everywhere, so no issue's request was
  missed.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for "as
  stale", "Needs Sync" with "stale", and `markStale` (2026-10-01).
  `pkp/pkp-lib#8677` is the closed request behind the rename, not a report
  of this leftover.
- Not driven: the "Issues" tab's window (it needs issue DOIs turned on;
  the same component and string, code read), and any language other
  than English.
- The fix walk also confirmed "Mark DOIs Needs Sync" for the ticked work,
  which has no submitted DOI. With and without the fix the "DOI Updates
  Failed" window opened with one and the same message.
