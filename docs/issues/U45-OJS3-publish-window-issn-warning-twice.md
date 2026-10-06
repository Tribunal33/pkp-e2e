# A journal's publish window lists the missing-ISSN warning for Crossref twice

- **Severity** low
- **Effort** small
- **Kind** regression (on `main` since `pkp/crossref-ojs#81`, December 2025; no release has these warnings)
- **Affects**
  - main: OJS
  - 3.5: none (the publish window has no Crossref warnings)
  - 3.4: none (code; no Crossref warnings at publishing)
  - 3.3: none (code; no Crossref warnings at publishing)
- **Introduced** `pkp/crossref-ojs#81` for `pkp/pkp-lib#11590` · [6970a0b894](https://github.com/pkp/crossref-ojs/commit/6970a0b89442e405cd984f1b5837d654c3d0dc25) · 2025-11-26 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor of a journal that deposits with Crossref and has neither an
online nor a print ISSN opens the publish confirmation window. Under "The
following issues were found, but will not prevent publishing" the window
lists "Either an online ISSN or print ISSN must be provided before
submissions can be deposited with Crossref." twice, where one line is
expected.

The warning itself is right, the other warnings are listed once, and
publishing goes ahead.

The journal must have "Articles" ticked under "Items with DOIs", and its
"Automatic DOI Assignment" must be set to something other than "Upon
publication". The default, "Upon reaching the copyediting stage", is
inside that setup. With "Upon publication" the window shows no Crossref
warnings at all. The Crossref warnings at publishing are new on `main`
and in no release.

## Impact

- **Lost.** Nothing. The editor reads one sentence twice in a list of
  two or three warnings.
- **Who.** Editors of a journal that chose Crossref while it had no ISSN.
  They see the repeated line each time a publish window opens.
- **Way round.** None needed. Saving either ISSN on Settings › Journal ›
  "Masthead" removes both lines.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal has "Articles"
  ticked under "Items with DOIs", "Automatic DOI Assignment" "Upon
  reaching the copyediting stage", no registration agency, a "Publisher",
  and both ISSNs saved (0378-5955).
- The dataset's journal has no DOI prefix, so no DOI was ever assigned:
  submission 5, though in Production, has none. That is why the window
  also lists the "not associated with a DOI" line.
- "Automatic DOI Assignment" stays as the dataset has it. Set to "Upon
  publication", the window lists no Crossref warnings (see Cause).

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Registration": "Registration
   Agency" "Crossref", "Depositor name" `Public Knowledge Project`,
   "Depositor email" `dbarnes@mailinator.com`, "Save".
4. Settings › Journal › "Masthead": empty "Online ISSN" and "Print ISSN",
   "Save".
5. Open submission 5, "Genetic transformation of forest trees". In its
   side menu, under "Publication", open "Title & Abstract" and press
   "Schedule For Publication".
6. In "Review Publishing Details" choose "Publication Stage" "Version of
   Record (VoR)" and "Don't Assign To An Issue", then press "Confirm".
   If "Revision Significance" is empty, choose "Major Revision".
7. Read the list at the top of the "Schedule For Publication" window,
   then "Close" it.

**Expected.** The ISSN sentence once:

```
The following issues were found, but will not prevent publishing
- Either an online ISSN or print ISSN must be provided before submissions can be deposited with Crossref.
- The submission "Genetic transformation of forest trees" is not associated with a DOI and cannot be deposited with Crossref.
```

**Observed.**

```
The following issues were found, but will not prevent publishing
- Either an online ISSN or print ISSN must be provided before submissions can be deposited with Crossref.
- Either an online ISSN or print ISSN must be provided before submissions can be deposited with Crossref.
- The submission "Genetic transformation of forest trees" is not associated with a DOI and cannot be deposited with Crossref.
```

Control: when step 4 empties only one of the two ISSN boxes, whichever
one, the window lists the DOI line alone.

## Cause

`CrossrefPlugin::validate()` (crossref-ojs `CrossrefPlugin.php`, lines
513–517), the plugin's listener on `Publication::validatePublishWarnings`,
states the one rule "the journal has an ISSN" as two Laravel rules, one
per field:

```php
'onlineIssn' => ['required_without:printIssn', 'nullable', 'string'],
'printIssn' => ['required_without:onlineIssn', 'nullable', 'string'],
```

When both are empty, both rules fail. `getValidationMessages()` (lines
565–566) gives both the same sentence,
`plugins.generic.crossref.issn.requiredWithout`, and `formatErrors()`
(line 678) flattens the validator's errors, which are keyed by field,
into one list. So the list holds the sentence once per field, and
lib/pkp's `templates/controllers/modals/publish/publish.tpl` prints each
entry as a list item.

The history explains why the second rule is there. The check's first
commit (7786bbe794) had both rules. A second commit in the same PR
(3e1371efc1) removed two lines: the `printIssn` rule, and the `printIssn`
entry of `$metadata`, the data the validator reads. So `main`, from the
merge of `pkp/crossref-ojs#71` in August 2025, had only the `onlineIssn`
rule and showed the sentence once when both ISSNs were empty.

That version warned a journal with only a print ISSN wrongly. The missing
data entry caused it, not the missing rule: `required_without:printIssn`
found no `printIssn` in the data it was given. `pkp/crossref-ojs#81`
(6970a0b894) put back both the data entry and the rule. The data entry
mended the print-only case, and the rule brought the second line.

`validate()` returns early, with no warnings, unless Crossref is the
configured agency, "Articles" is among the enabled DOI kinds, and the DOI
creation time is not "Upon publication" (lines 506–511). That is why
"Upon publication" shows no list.

Reach:

- Only the ISSN pair: the other rules (`publisherInstitution`, `doi`,
  `issueId`) are one field each, and no other publish-warning listener
  exists in OJS, OMP or OPS (code read: `validatePublishWarnings` has one
  listener, this one).
- The Crossref block on Settings › Distribution › "DOIs" ›
  "Registration" has its own check, `CrossrefSettings` (line 165,
  `!onlineIssn && !printIssn`), which gives one notice (code read).
- OPS's Crossref plugin adds no publish warnings and a press has no
  Crossref plugin (code read).
- A separate matter, not covered by the fix: line 547 assigns
  `$errors = $this->formatErrors(...)`, which replaces the hook's
  warnings array instead of adding to it. No warning is lost today,
  because `Repository::validatePublishWarnings()` starts from an empty
  array and this is the hook's only listener in OJS, OMP and OPS (code
  read). A second plugin listening on the hook before this one would
  lose its warnings whenever the Crossref check finds something.

## Proposed fix

State the rule once. `required_without:printIssn` on `onlineIssn` already
fails exactly when both are empty, so the mirrored rule on `printIssn`
adds nothing but the second message:

```diff
         $rules = [
             'publisherInstitution' => ['required', 'string'],
+            // One rule for the pair: an ISSN is missing only when both are empty, and is reported once
             'onlineIssn' => ['required_without:printIssn', 'nullable', 'string'],
-            'printIssn' => ['required_without:onlineIssn', 'nullable', 'string'],
+            'printIssn' => ['nullable', 'string'],
             'doi' => ['required', 'string'],
```

```diff
             'onlineIssn.required_without' => __('plugins.generic.crossref.issn.requiredWithout'),
-            'printIssn.required_without' => __('plugins.generic.crossref.issn.requiredWithout'),
             'publisherInstitution.required' => __('plugins.generic.crossref.publisherInstitution.required')
```

The diff, against the OJS root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-window-issn-warning-twice/fix.diff).
The rule belongs to the plugin's own check. Removing the `printIssn` rule
is safe this time because `printIssn` stays in `$metadata`, which is what
`required_without:printIssn` reads: a journal with only a print ISSN, or
only an online one, still gets no ISSN warning. The `printIssn` entry is
kept in `$rules` as `['nullable', 'string']` so the value's type is
still checked, as it is today; deleting the entry would also work.

Tried on `main`: with the fix applied, the Steps showed the ISSN sentence
once beside the DOI line. The two one-ISSN cases (only print kept, only
online kept) listed the DOI line alone, both with the fix applied and
without it.

**Alternatives:**

- `array_unique()` in `formatErrors()`: it hides the repeat and leaves
  two rules stating one fact, and it would also merge two different
  fields' warnings that happened to share a sentence.
- A separate sentence per field ("online ISSN missing", "print ISSN
  missing"): wrong, since only one of the two is needed.

**What goes with it:**

- No backport: the publish warnings exist only on `main`.
- Test: the plugin has no unit tests of its own, so none is offered for
  the plugin's PR. The end-to-end test in pkp-e2e (U45 spec, scenario
  14) already reads the ISSN sentence in this window and can assert one
  line once the fix lands.

Small: two lines in two methods of one plugin file.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publish-window-issn-warning-twice/walk.js).
  Run it on an OJS install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/publish-window-issn-warning-twice/walk.js`
  (`KEEP=print` or `KEEP=online` empties only the other ISSN box in step
  4; `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). In step 6 the script
  fills only the panel's empty required boxes and leaves "Revision
  Significance" as the panel has it; the window then names the version
  "Version of Record 1.0".
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply …/fix.diff ojs`, then walk.js three times
  (the Steps, `KEEP=print`, `KEEP=online`), then
  `node bin/try-fix.js revert …/fix.diff ojs`. `KEEP=print` and
  `KEEP=online` were also walked without the fix.
- Walked 2026-10-01 on PostgreSQL; the fault does not depend on the
  database. Each install was freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`.
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12),
    crossref-ojs [46a4d469bf](https://github.com/pkp/crossref-ojs/commit/46a4d469bfc7587fe3c4cc11ce3ca371499bb321)):
    as Observed.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    (lib/pkp [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1),
    crossref-ojs [97a9311998](https://github.com/pkp/crossref-ojs/commit/97a93119980cd6167dc7ea7d1f1eeef938e87741)):
    steps 1 to 5 as written; there "Schedule For Publication" opens
    "Select an issue to schedule for publication" instead of step 6's
    panel ("Vol. 1 No. 2 (2014)", "Save"). The confirmation window read
    "All publication requirements have been met. This will be published
    immediately in Vol. 1 No. 2 (2014). Are you sure you want to publish
    this?" with no warning list. The code agrees: that branch's
    `CrossrefPlugin.php` has no `required_without` rule and no publish
    listener, and its lib/pkp has no `validatePublishWarnings()`.
- Code reads, not walked:
  - 3.4: crossref-ojs `origin/stable-3_4_0`
    [f073a208eb](https://github.com/pkp/crossref-ojs/commit/f073a208eb99bdf8aeae118373ae041fac9cf661)
    (the commit OJS `upstream/stable-3_4_0`
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    pins): `CrossrefPlugin.php` registers no `Publication::validatePublish`
    listener; lib/pkp `origin/stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    has no `validatePublishWarnings()`.
  - 3.3: OJS `upstream/stable-3_3_0`
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144):
    Crossref is the import/export plugin `plugins/importexport/crossref`,
    which has no publish check.
  - OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    (crossref-ops b6b94dd): `CrossrefPlugin.php` registers no publish
    listener. OMP ships no Crossref plugin.
- Introduced, traced by `git blame` on lines 515–516 and
  `git log -S required_without` in crossref-ojs:
  [7786bbe794](https://github.com/pkp/crossref-ojs/commit/7786bbe7944dc32dfa79817fe2eecd39b196740f)
  (2025-07-09, Ipula Ranasinghe, ipula) wrote the check with both rules
  and the shared sentence;
  [3e1371efc1](https://github.com/pkp/crossref-ojs/commit/3e1371efc166f07c1dc529c01d921d4027cc26c6)
  (2025-07-18, withanage) removed the `printIssn` rule and its
  `$metadata` entry; both reached
  `main` together in `pkp/crossref-ojs#71` (merged 2025-08-11). 6970a0b894
  added the `printIssn` rule again, in `pkp/crossref-ojs#81` (merged
  2025-12-07). The check listed errors that blocked publishing until
  `pkp/pkp-lib#12617` (June 2026) made them warnings.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs, pkp/crossref-ojs and
  pkp/ui-library, by the symptom (ISSN warning twice, duplicate Crossref
  publish warning, "online ISSN or print ISSN") and by
  `validatePublishWarnings` and `required_without`. `pkp/pkp-lib#12617`
  (closed) turned the Crossref check from a block into warnings and does
  not mention the repeated line.
- Unverified: the state of `main` between `pkp/crossref-ojs#71` and `#81`
  (one ISSN line when both are empty, the print-only false warning) is
  read from the code of that time, not walked. "Upon publication"
  showing no list is read from the code, not walked today.
