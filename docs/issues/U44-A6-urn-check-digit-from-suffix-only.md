# "Add Check Number" and "Assign" end URNs with the wrong check digit

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP (one OMP step in code)
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ojs#2519` and `pkp/omp#721` for `pkp/pkp-lib#5208` · [ce8a2617a0](https://github.com/pkp/ojs/commit/ce8a2617a0ba9f02b8129c431e2870ec75ce0e4e), [8cadd091c3](https://github.com/pkp/omp/commit/8cadd091c3f54687ab2175166e6ffc2de6c9aebb) · 2019-10-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A journal or press can have the URN plugin add a check digit to every
URN ("Check Number", off by default). The digit is meant to cover the
whole URN, prefix included. Two buttons in the browser work it out from
the part after the prefix alone, so the URNs they make usually end in
the wrong digit. With the prefix `urn:nbn:de:0000-`, "abc" becomes
"abc0" where the whole URN gives "abc2".

The two buttons are "Assign", on a submission's "Identifiers" page,
and "Add Check Number", on that page and on the "Identifiers" tab of an
issue, galley, chapter, publication format or file. The URNs the server
makes from a pattern are right: the tabs' previews, "Publish Issue" and
"Format Approval".

Nothing on screen says the digit is wrong: the URN is saved as shown
and appears on the reader pages as a link to the resolver. For
"Assign" there is no way round, because the box cannot be typed in.

## Impact

- **Lost**: the check digit's purpose. The URN is permanent once
  published, and its last digit fails the check it exists for.
- **Who**: editors and managers of a journal or press with "Check
  Number" ticked. With a suffix pattern ("Use default patterns." or an
  own pattern), every article or monograph URN made with "Assign"; the
  tabs' URNs are right. With "Enter an individual URN suffix…", every
  URN made with "Add Check Number", on the page and on every tab.
- **Way round**: with an individual suffix, the editor can type a digit
  worked out by hand or with a tool outside the app instead of pressing
  the button. With a suffix pattern, none for the article or monograph.

Medium: a public identifier ends in a wrong digit for most URNs these
buttons make, silently, on journals and presses that ask for a check
digit. The German National Library no longer requires a check digit
(Evidence), so registration is not expected to fail; if it did, this
would be high.

## Steps to reproduce

Two screens below: the **page** is a submission's Publication ›
"Identifiers" (the article's or monograph's URN); a **tab** is the
"Identifiers" tab of an item's edit window (here a galley, on a press a
chapter).

Preconditions:
- PKP's default test dataset for `main` (OJS or OMP). The steps set up
  the URN plugin, which the dataset leaves off.

Setting up URNs:
1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's arrow › "Settings": tick "Articles" and "Galleys"
   [press: "Monographs" and "Chapters"]; "URN Prefix"
   `urn:nbn:de:0000-`; leave "Use default patterns."; tick "Check
   Number"; "Namespace" `urn:nbn:de`; "Resolver URL"
   `https://nbn-resolving.de/`; "Save".

Suffix pattern ("Assign"):
4. Open submission 1, "Signalling Theory Dividends" [press: 7,
   "Accessible Elements: Teaching Science Online and at a Distance"],
   Publication › "Identifiers". On OJS the workflow opens on version
   1.1, which is unpublished and in Vol. 1 No. 2.
5. Press "Assign" and read the box. Do not press "Save".
6. Publication › "Galleys" › "PDF Version 2" › "Edit" › "Identifiers"
   [press: Publication › "Chapters" › "Introduction" › "Identifiers"]:
   read the URN the tab previews, then "Close".

Individual suffix ("Add Check Number"):
7. Plugins › "URN" › "Settings": choose "Enter an individual URN suffix
   for each published item. You'll find an additional URN input field
   on each item's metadata page.", "Save".
8. Open the submission's "Identifiers" page again (the box is empty,
   since step 5 was not saved), type `urn:nbn:de:0000-abc` in "URN" and
   press "Add Check Number".
9. The galley's [press: chapter's] "Identifiers" tab: type `abc` in "URN
   Suffix" and press "Add Check Number"; "Close" without saving.

**Expected**: every check digit is the one the whole URN gives, as in the
tab's own preview in step 6:

| Step | OJS | OMP |
|------|-----|-----|
| 5 | `urn:nbn:de:0000-jpkjpk.v1i2.18` | `urn:nbn:de:0000-jpk.74` |
| 8 | `urn:nbn:de:0000-abc2` | `urn:nbn:de:0000-abc2` |
| 9 | `abc2` | `abc2` |

**Observed**: the buttons add the digit of the part after the prefix:

| Step | OJS | OMP |
|------|-----|-----|
| 5 | `urn:nbn:de:0000-jpkjpk.v1i2.12` | `urn:nbn:de:0000-jpk.70` |
| 8 | `urn:nbn:de:0000-abc0` | `urn:nbn:de:0000-abc0` |
| 9 | `abc0` | `abc0` |

The tab's preview in step 6 is right: `urn:nbn:de:0000-jpkjpk.v1i2.1.g27`
[press `urn:nbn:de:0000-jpk.7.c277`], the digit of the whole URN (the
part after the prefix alone would give 8 [press 1]).

## Cause

`$.pkp.plugins.generic.urn.getCheckNumber(urn, urnPrefix)` in
`plugins/pubIds/urn/js/checkNumber.js` (OJS and OMP each ship a copy)
removes the prefix before it computes:

```js
suffix = urn.replace(urnPrefix, '').toLowerCase();
for (i = 0; i < suffix.length; i++) {
```

The check digit, as URN registries apply it, covers the whole URN,
`urn:nbn:de:` included (Evidence). The server's twin,
`URNPubIdPlugin::_calculateCheckNo($urn)`, does exactly that: it runs the
same conversion table over the whole URN for every URN that
`constructPubId()` builds from a suffix pattern.

For an individual suffix the server adds nothing: `constructPubId()`
skips the digit when the suffix setting is `customId` ("checkNo is
already calculated for custom suffixes"), so it stores whatever digit
the browser added. That is why a tab's save keeps the wrong digit, and
why fixing the browser's function is enough.

The prefix removal came with ce8a2617a0 (`pkp/pkp-lib#5208`, OJS 3.2.0),
which moved the calculation out of the tab button's click handler into a
shared function, so that the new publication fields could use it. Before
that, the handler computed over `urnPrefix + urnSuffix`.

Reach, every caller passing the whole URN:
- "Assign" on the page, under a suffix pattern:
  `FieldPubIdUrn.generateId()`. Walked.
- "Add Check Number" on the page, under an individual suffix:
  `FieldTextUrn.addCheckNumber()`. Walked.
- "Add Check Number" on the tabs, under an individual suffix: the
  `$('#checkNo')` click handler at the end of `checkNumber.js`, which
  passes prefix + suffix (`urnSuffixEdit.tpl` only draws the button).
  Walked on a galley and a chapter; the issue, publication format and
  file tabs use the same template and handler (code).
- URNs the server builds under a suffix pattern (the tabs' previews and
  saves, "Publish Issue", OMP's "Format Approval"): right
  (`constructPubId()`; the galley and chapter previews walked).
- OPS ships no URN plugin.

## Proposed fix

Work the check digit out over the whole URN in `getCheckNumber()`, in
both apps' `plugins/pubIds/urn/js/checkNumber.js`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-digit-from-suffix-only/fix.diff),
the same diff for each app root):

```diff
-			suffix = urn.replace(urnPrefix, '').toLowerCase();
-			for (i = 0; i < suffix.length; i++) {
-				char = suffix.charAt(i);
+			urnLower = urn.toLowerCase();
+			for (i = 0; i < urnLower.length; i++) {
+				char = urnLower.charAt(i);
```

This matches `URNPubIdPlugin::_calculateCheckNo()` and the code before
ce8a2617a0. The `urnPrefix` parameter stays, unused and documented as
such, so callers (and any plugin that calls the function) keep working.
The diff also declares the variable, which the old `suffix` was not. A
search of OJS, OMP, pkp-lib and ui-library finds no other check-digit
code than these two copies and the PHP method.

Tried on `main`, OJS and OMP: steps 5, 8 and 9 then gave the Expected
digits. A neighbour check, steps 1 to 6 with "Check Number" left
unticked, added no digit anywhere, with the fix in and out.

**Alternatives**:
- Have the browser ask the server for the digit, so that one rule lives
  in one place: a new request for a one-line fault.
- Make the server use the part after the prefix alone, to agree with the
  browser: wrong for every URN the server builds, and against the
  registries' rule.

**What goes with it**:
- URNs already stored keep their digit. Whether journals should be told,
  or offered a list of URNs whose last digit does not match, is the
  team's decision; a published URN should not be rewritten silently.
- After the fix, "Add Check Number" pressed on a tab while "URN Suffix"
  is empty appends the prefix's digit instead of "NaN"; that empty-box
  fault is its own entry in the spec.
- Backport: the diff applies as written on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0` in both apps. On 3.3 the tab
  button's click handler is written differently, outside the diff's
  lines.
- The guard: the spec's scenario for the typed URN asserts only that one
  digit is added; it should assert "urn:nbn:de:0000-abc2" (a Planned
  item in the spec).

This is a proposal; the team decides.

Medium: a few lines, but in two repositories (OJS and OMP), with the
question of the URNs already stored.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-digit-from-suffix-only/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-check-digit-from-suffix-only/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). `WALK=neighbour` in front takes the
  neighbour check on a fresh load.
- Walked on `main` (OJS, OMP) and `stable-3_5_0` (OJS, OMP), with the
  same digits on both. On OMP 3.5, step 8 could not be taken: after step
  7 the page raised `TypeError: Cannot read properties of null (reading
  'length')` and showed no "URN" box. That is a separate fault (OMP's
  `FieldTextUrn.js` reads `currentValue.length` without the null check
  OJS added in 1f04ae4160); step 8 there is read in the code, which is
  the same `getCheckNumber()`.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794; `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246; `stable-3_4_0` OJS 75cc2d488b, OMP
  0aec65441; `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883.
- 3.4 and 3.3 (code), both apps: `plugins/pubIds/urn/js/checkNumber.js`
  has the prefix removal; `URNPubIdPlugin.php` (3.3:
  `URNPubIdPlugin.inc.php`) `_calculateCheckNo()` covers the whole URN
  and `constructPubId()` skips `customId`. The fix diff applies to each
  branch's file (dry run).
- Introduced: `git blame` on the `urn.replace(urnPrefix, '')` line gives
  ce8a2617a0 (OJS) and 8cadd091c3 (OMP), "pkp/pkp-lib#5208 Update URN
  plugin to support publications"; the parent's handler computed over
  `urnPrefix + urnSuffix`. Tags 3_2_0-0 onwards contain ce8a2617a0.
- The rule: three URNs registered at the German National Library
  resolve at `https://nbn-resolving.org/<urn>` and end in the whole-URN
  digit, not the one of the part after the prefix:
  `urn:nbn:de:bvb:19-146642`, `urn:nbn:de:hbz:6-85659524771`,
  `urn:nbn:de:gbv:089-3321752945` (the part alone gives 7, 6 and 3). The
  reference implementation linked from `pkp/pkp-lib#6293`
  (github.com/bohnelang/URN-Pruefziffer) also computes over the whole
  URN, with its test URN `urn:nbn:de:0183-mbi0003721`.
- Registration: the German National Library's URN service help
  (https://wiki.dnb.de/display/URNSERVDOK/URN-Service+Admin+-+Hilfe,
  "Neue URN anlegen") says "Eine Prüfziffer ist nicht mehr
  verpflichtend." (a check digit is no longer required). It does not say
  whether a wrong digit is refused; unverified, and nothing was
  registered to find out.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library,
  issues and PRs, for "URN check number", "URN check digit", "URN
  checksum", "URN wrong check", "URN invalid DNB", "URN Prüfziffer",
  `getCheckNumber`, `checkNumber.js`, `_calculateCheckNo` and
  `urnCheckNo`. `pkp/pkp-lib#6293` ("Generated URN does not contain check
  number", fixed in 2023) is about the digit missing, not wrong.
