# "Add Check Number" on an item's "Identifiers" tab writes "NaN" into an empty URN suffix box

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced; the button has acted on an empty box since the URN plugin's first commit, [1b7d1d6262](https://github.com/pkp/ojs/commit/1b7d1d6262c87b6bf049ef4e04cac1d21b321a78) (2012-01-12), and writes "NaN" there since PRs `pkp/ojs#2519` and `pkp/omp#721` for issue `pkp/pkp-lib#5208` · [ce8a2617a0](https://github.com/pkp/ojs/commit/ce8a2617a0ba9f02b8129c431e2870ec75ce0e4e) · 2019-10-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a13)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal or press can let editors type each item's URN suffix by hand
(the URN plugin's "Enter an individual URN suffix…" setting) and have
the app add a check digit ("Check Number"). On the "Identifiers" tab of
a galley, an issue, a chapter, a publication format or a submission
file, "Add Check Number" pressed while "URN Suffix" is empty writes
"NaN" into the box. The article's or monograph's "Identifiers" page
greys the same button while its box is empty.

Nothing refuses the value: "Save" keeps "NaN" as the suffix, and the
item's URN is then built from it, ending in "NaN". OPS has no URN
plugin.

## Impact

- **Lost**: nothing unseen. The box shows "NaN" at once, before any
  save.
- **Who**: editors and managers of a journal or press with the two
  settings above, when they press the button before typing a suffix.
- **Way round**: delete "NaN", type the suffix, then press the button.
  With a suffix typed the button works: "g1" becomes "g16", though that
  digit is itself wrong, because the button works it out from the suffix
  alone ([the check-digit report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A6-urn-check-digit-from-suffix-only.md)).

Low: the wrong value is in plain sight before it can be saved. Once the
check-digit report's fix lands, the empty box would get one ordinary
digit instead of "NaN", which an editor could save without noticing;
that would make this medium.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS or OMP). The steps set up
  the URN plugin, which the dataset leaves off.

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's arrow › "Settings": tick "Articles" and "Galleys"
   [press: "Monographs" and "Chapters"]; "URN Prefix"
   `urn:nbn:de:0000-`; choose "Enter an individual URN suffix for each
   published item. …"; tick "Check Number"; "Namespace" `urn:nbn:de`;
   "Resolver URL" `https://nbn-resolving.de/`; "Save".
4. Open submission 1, "Signalling Theory Dividends" [press: 7,
   "Accessible Elements: Teaching Science Online and at a Distance"],
   Publication › "Identifiers": the "URN" box is empty and "Add Check
   Number" beside it is greyed.
5. Publication › "Galleys" › "PDF Version 2" › "Edit" › "Identifiers"
   [press: Publication › "Chapters" › "Introduction" › "Identifiers"]:
   the "URN Suffix" box is empty.
6. Press "Add Check Number" without typing anything.

**Expected**: "Add Check Number" is greyed while "URN Suffix" is empty,
as on the "Identifiers" page in step 4, and the box stays empty.

**Observed**: the button is active, and the press writes `NaN` into
"URN Suffix". No request is sent and the browser logs no error.

## Cause

The tab's button is drawn by `plugins/pubIds/urn/templates/urnSuffixEdit.tpl`
and handled at the end of `plugins/pubIds/urn/js/checkNumber.js` (OJS
and OMP each ship a copy). The click handler appends whatever
`getCheckNumber()` returns, without asking whether there is a suffix:

```js
$('#checkNo').on('click', () => {
		var urnPrefix = $('[id^="urnPrefix"]').val(), urnSuffix = $('[id^="urnSuffix"]').val();
		urn = urnPrefix + urnSuffix;
		$('[id^="urnSuffix"]').val(urnSuffix + $.pkp.plugins.generic.urn.getCheckNumber(urn, urnPrefix));
	});
```

`getCheckNumber(urn, urnPrefix)` removes the prefix first
(`urn.replace(urnPrefix, '')`), so for an empty suffix it converts
nothing: `lastNumber` is the empty string, `sum / lastNumber` is `0 / 0`,
and the function returns `parseInt('N')`, which is `NaN`. The handler
appends it as text.

The page's twin, `FieldTextUrn` (`plugins/pubIds/urn/js/FieldTextUrn.js`),
greys its "Add Check Number" with
`:disabled="currentValue === null || currentValue?.length === 0"` (OMP:
`currentValue.length === 0`). The tab's handler has never had such a
check. In the plugin's first version (2012) it computed over prefix plus
suffix, so an empty box got the check digit of the prefix alone. "NaN"
came with ce8a2617a0 (PRs `pkp/ojs#2519` and `pkp/omp#721`, for issue
`pkp/pkp-lib#5208`), which moved the calculation into `getCheckNumber()`
and made it drop the prefix. That change also brought the wrong check
digit of [the check-digit report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A6-urn-check-digit-from-suffix-only.md).

When the tab is saved, the plugin checks only that no other item uses
the suffix (`PKPPubIdPlugin::verifyData()`), and `URNPubIdPlugin::constructPubId()` adds no digit
for a typed suffix, so "NaN" is kept as typed (code).

Reach:
- Every "Identifiers" tab with a typed suffix: a galley's and a
  chapter's walked; an issue's (OJS), a publication format's and a
  submission file's (OMP) use the same template and handler (code).
- The article's or monograph's "Identifiers" page: greyed while the box
  is empty (walked). A box holding only the prefix, `urn:nbn:de:0000-`,
  reaches the same empty suffix in `getCheckNumber()` and gets "NaN" too
  (code). Left out of this fix (see below).
- A suffix holding a character outside `getCheckNumber()`'s conversion
  table (letters, digits and `-:_/.+`) gets "NaN" too: `a~b` became
  `a~bNaN` on the galley's and the chapter's tab (walked), since
  `conversionTable['~']` is `undefined`. Left out of this fix (see
  below).

## Proposed fix

Grey the tab's "Add Check Number" while "URN Suffix" is empty, the rule
the page's `FieldTextUrn` already follows, in both apps'
`plugins/pubIds/urn/js/checkNumber.js`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-number-empty-urn-suffix-nan/fix.diff),
the same diff for each app root):

```diff
+	// Grey the button while the suffix box is empty, as the "Add Check Number"
+	// of the publication's URN field (FieldTextUrn.js) is: there is nothing
+	// to add a check number to.
+	$('#checkNo').prop('disabled', !$('[id^="urnSuffix"]').val());
+	$('[id^="urnSuffix"]').on('input', function() {
+		$('#checkNo').prop('disabled', !$(this).val());
+	});
+
 	// Apply the check number when the button is clicked
 	$('#checkNo').on('click', () => {
```

The script runs each time the tab's form is loaded, so the button's
state is set for every tab, and `input` follows typing, pasting and
cutting. The plugin also loads `checkNumber.js` on the workflow page
when "Check Number" is ticked (for the page's field), where
`#checkNo` and `urnSuffix` match nothing, so the new lines do nothing
there.

Tried on `main`, OJS and OMP: the galley's and the chapter's tab then
opened with the button greyed, and step 6 left the box empty. To check
that a typed suffix still works, `g1` was typed and the button pressed,
then the box emptied: `g16` with the fix in and out, and the emptied box
greyed the button only with the fix in.

**Alternatives**:
- Return early from the click handler when the suffix is empty: no
  "NaN", but a button that silently does nothing, unlike the page.
- Make `getCheckNumber()` return an empty string for an empty suffix:
  the check-digit report's fix has the function compute over the whole
  URN, prefix included, so it never sees an empty input and this check
  would stop firing.

**What goes with it**:
- [The check-digit report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A6-urn-check-digit-from-suffix-only.md)'s
  fix changes this fault's symptom without fixing it: the empty box
  would get one ordinary-looking digit instead of "NaN". The two diffs
  touch different lines of the same file and apply together.
- Left out of this fix, the two other ways to get "NaN":
  - A page box holding only the prefix. Once the check-digit fix lands
    the press there gives a digit, not "NaN"; whether the page should
    grey its button until something follows the prefix is a separate,
    one-line question in each app's `FieldTextUrn.js`.
  - A suffix with a character outside the conversion table (`a~b`).
    The fix needs a decision first: which characters a URN suffix may
    hold, and whether the tab should refuse the others or skip them as
    the server's `_calculateCheckNo()` does.
- No stored data to repair: a "NaN" suffix is saved only when an editor
  saves the box as it stands.
- Backport: the diff applies as written to `stable-3_5_0` and
  `stable-3_4_0` in both apps. On `stable-3_3_0` the handler reads
  `$('#checkNo').click(function() {`, so `git apply --check` refuses the
  diff (OJS ac77c9fb35, OMP 8e72fc883) and the change is re-applied by
  hand there.
- The guard: the spec's scenario for a typed suffix on the tab should
  press the button on an empty box and assert it is greyed (a Planned
  item in the spec).

This is a proposal; the team decides.

Medium: only a few lines, but each app ships its own copy of the plugin,
so the change and its review go to two repositories (OJS and OMP).

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/check-number-empty-urn-suffix-nan/walk.js)
  (helpers from `urn-check-digit-from-suffix-only/lib.js`), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/check-number-empty-urn-suffix-nan/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). `WALK=neighbour` in front takes the
  typed-suffix check of the Proposed fix on a fresh load (it also
  types `a~b`, the character case in the Cause's reach).
- Walked on `main` (OJS, OMP) and `stable-3_5_0` (OJS, OMP): "NaN" on
  every walk. On OMP 3.5, step 4 could not be read: the page raised
  `TypeError: Cannot read properties of null (reading 'length')` and
  showed no "URN" box (OMP's `FieldTextUrn.js` reads
  `currentValue.length` without a null check; a separate fault, also met
  by the check-digit report). Steps 5 and 6 there were taken as written.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794; `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246; `stable-3_4_0` OJS 75cc2d488b, OMP
  0aec65441; `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883.
- 3.4 and 3.3 (code), both apps: `urnSuffixEdit.tpl` draws the
  `checkNo` button when "Check Number" is ticked; `checkNumber.js` has
  the same unguarded handler (3.3 written as `.click(function() {…})`)
  and the same `getCheckNumber()` that drops the prefix.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/check-number-empty-urn-suffix-nan/fix.diff ojs omp`,
  the walk and the typed-suffix check on a fresh load each, then
  `revert` and the typed-suffix check again without it.
- Not walked: saving a tab with "NaN" in the box (read in the code:
  `PKPPubIdPlugin::verifyData()`, `URNPubIdPlugin::constructPubId()`;
  the spec's probe of a typed suffix "g1" saw the same save keep it);
  the issue, publication format and submission file tabs (code).
- Introduced: `git blame` on the handler gives 17dc1e0bf4
  (`pkp/pkp-lib#8940`, 2023), which only rewrote it as an arrow
  function; the last change of substance before it (after copyright
  updates ef6facfcdc and c2afc22fda) is ce8a2617a0 (OJS; OMP
  8cadd091c3), which moved the
  calculation into `getCheckNumber()` with the prefix removal; before
  that, the handler computed over `urnPrefix + urnSuffix`, so an empty
  box got the prefix's digit. The first version, 1b7d1d6262 (OJS, 2012;
  OMP 825986f47, 2016), had no empty check either.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library,
  issues and PRs, for "URN NaN", "URN check number", "URN suffix
  empty", `checkNo`, `checkNumber.js` and `getCheckNumber`. Nothing is
  about the empty box; `pkp/pkp-lib#6293` is about a missing check
  digit, `pkp/pkp-lib#8940` added the "Check Number" setting to the page.
