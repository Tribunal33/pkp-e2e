# "Add Check Number" and "Assign" end URNs with the wrong check digit

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ojs#2519` and `pkp/omp#721` for `pkp/pkp-lib#5208` · [ce8a2617a0](https://github.com/pkp/ojs/commit/ce8a2617a0ba9f02b8129c431e2870ec75ce0e4e) and [8cadd091c3](https://github.com/pkp/omp/commit/8cadd091c3f54687ab2175166e6ffc2de6c9aebb) · 2019-10-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a6), [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a13)
- **Checked** 2026-09-30 (steps 11–14: 2026-10-01), each branch's tip (the commits in Evidence)

2026-10-01: The same fault shows in a second way. An editor who
presses "Add Check Number" with nothing typed after the URN prefix
gets "NaN" in the box. The fix below stops that, and the button
should then be greyed in that case, which is proposed with it.

## Summary

With "Check Number" ticked in the URN plugin, an editor who presses
"Add Check Number" or "Assign" gets a URN whose last digit is worked
out by the wrong rule. The buttons compute it from the part after the
plugin's "URN Prefix" setting only. The check digit covers the whole
URN, prefix included, and the server computes it that way for the URNs
it builds itself, such as a galley's or a chapter's. For
`urn:nbn:de:0000-abc` (prefix `urn:nbn:de:0000-`), "Add Check Number"
appends "0", while the URN's check digit is "2".

Nothing warns the editor: the URN saves as it stands, and the
published article's or book's page shows it. The two rules give the
same digit about one time in ten, so about nine in ten URNs set
through these buttons end in a digit that fails the check. The way
round is to work out the digit elsewhere and type it by hand.

This affects "Add Check Number" on the "Identifiers" page of an article
or book and on the "Identifiers" tab of a galley, issue, chapter,
publication format or file. It also affects "Assign" on the
"Identifiers" page when URN suffixes come from a pattern.

## Impact

- **Lost.** A correct check digit on a persistent identifier, which
  is not meant to change once published. Until a 2019 change,
  "Add Check Number" on the "Identifiers" tabs gave the right digit. URNs
  already saved this way keep the wrong digit: the fix does not touch
  them, and no automatic repair is proposed. A journal or press can
  list them with a read-only query (Proposed fix, "What goes with
  it").
- **Who.** Journals and presses that assign URNs with a check number,
  typically in the German National Library's `urn:nbn:de` namespace.
- **Way round.** Type the URN with its correct digit into the box.
  Unticking "Check Number" is no way round: it also stops the server
  appending the (correct) digit to the URNs it builds.
- **The agency.** The German National Library's URN service says a
  check digit "is no longer mandatory". Its registration API refuses a
  URN that "does not pass format validation", but does not say whether
  that covers the check digit. Whether the service refuses or flags a
  URN whose digit fails was not established.

Medium: the wrong digits are silent and permanent, but only on
installs with the URN plugin and "Check Number" on, and a hand-typed
digit is accepted. Whether the German National Library's service
refuses or flags such URNs was not established; if it refuses them,
this is high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS and OMP).
- The "URN" plugin switched on and set up, as `rvaca`: Settings ›
  Website › "Plugins", under "Public Identifier Plugins" tick "URN".
  Then open the row's arrow › "Settings":
  - under "Journal Content" tick "Articles" and "Galleys" (press:
    "Press Content" › "Monographs" and "Chapters");
  - "URN Prefix": `urn:nbn:de:0000-`;
  - "URN Suffix": "Enter an individual URN suffix for each published
    item. You'll find an additional URN input field on each item's
    metadata page.";
  - "Check Number": tick "The check number will be automatically
    calculated and added at the end, as the last digit of an URN.";
  - "Namespace": `urn:nbn:de`; "Resolver URL": `https://nbn-resolving.de/`;
  - "Save".

The URN typed on the "Identifiers" page:

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" [press:
   submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture"].
3. In the side menu under "Publication", choose "Identifiers".
4. In "URN" type `urn:nbn:de:0000-abc` and press "Add Check Number".
5. Press "Save".

The suffix typed on an "Identifiers" tab:

6. Open submission 1, "Signalling Theory Dividends". In the side menu
   under "Version of Record 1.1", choose "Galleys". On the row "PDF
   Version 2", open "More Actions" › "Edit", then the "Identifiers" tab.
   [press: submission 7, "Accessible Elements: Teaching Science Online
   and at a Distance", side menu "Chapters", the chapter
   "Introduction", then the "Identifiers" tab]
   [3.5: the side menu has one "Galleys" entry, which shows version 2;
   the galley's "Edit" is a link in the row's controls]
7. In "URN Suffix" type `abc` and press "Add Check Number".

The URN built from the default pattern:

8. As `rvaca`, open the URN plugin's "Settings" again, choose "URN
   Suffix" › "Use default patterns." and press "Save".
9. As `dbarnes`, open submission 1's "Identifiers" under "Version of
   Record 1.1" [press: submission 7's "Identifiers"] and press "Assign".
10. Open the galley "PDF Version 2" › "Edit" › "Identifiers" as in step
    6 [press: the chapter "Introduction" › "Identifiers"]. The tab
    previews the galley's (chapter's) URN, which the app builds on the
    server.

Nothing typed after the prefix:

Reload the default dataset and set up the plugin as in the
preconditions again. Step 5 saved a URN on submission 5, and step 8
switched the suffix setting away.

11. As `dbarnes`, open the galley "PDF Version 2" › "Edit" ›
    "Identifiers" as in step 6 [press: the chapter "Introduction" ›
    "Identifiers"].
12. Leave "URN Suffix" empty and press "Add Check Number".
13. Open submission 5's "Identifiers" as in steps 2–3 [press:
    submission 4's]. With "URN" empty, "Add Check Number" is greyed.
    [3.5, press: the page shows no "URN" field while the book has no
    URN (Evidence), so steps 13–14 cannot be taken]
14. In "URN" type `urn:nbn:de:0000-` (the prefix alone) and press "Add
    Check Number".

**Expected.** The buttons append the check digit of the whole URN,
the digit the app appends to the URN in step 10, and never "NaN":

- step 4: `urn:nbn:de:0000-abc2`; step 7: the suffix reads `abc2`;
- step 9: `urn:nbn:de:0000-jpkjpk.v1i2.18` [press:
  `urn:nbn:de:0000-jpk.74`];
- step 12: "Add Check Number" is greyed while "URN Suffix" is empty,
  as the page's is in step 13. That is what the greying recommended
  under "What goes with it" gives. The tried fix gives `6` instead,
  the prefix's check digit, as the whole suffix;
- step 14: `urn:nbn:de:0000-6`, the check digit of the URN as typed.

**Observed.** Both apps, the same values:

```
step 4   URN          urn:nbn:de:0000-abc0            (step 5: "Saved", stored as urn:nbn:de:0000-abc0)
step 7   URN Suffix   abc0
step 9   URN          urn:nbn:de:0000-jpkjpk.v1i2.12   [press: urn:nbn:de:0000-jpk.70]
step 10  preview      urn:nbn:de:0000-jpkjpk.v1i2.1.g27  [press: urn:nbn:de:0000-jpk.7.c277]
step 12  URN Suffix   NaN
step 14  URN          urn:nbn:de:0000-NaN
```

The final digit is wrong in steps 4, 7 and 9. For example, the check
digit of `urn:nbn:de:0000-jpkjpk.v1i2.1` is 8, and "Assign" appends 2.
The final digit in step 10 is right: the galley's preview ends in 7,
the check digit of `urn:nbn:de:0000-jpkjpk.v1i2.1.g2`. Every digit
this report names was worked out with the plugin's own algorithm,
applied to the whole URN.

## Cause

`$.pkp.plugins.generic.urn.getCheckNumber(urn, urnPrefix)` in
`plugins/pubIds/urn/js/checkNumber.js` (line 52 in OJS and OMP)
removes the prefix before it computes:

```js
suffix = urn.replace(urnPrefix, '').toLowerCase();
```

Then it runs the check-digit algorithm over what is left. The algorithm
cited in the function's comment covers the whole URN, including
`urn:nbn:de:` and the rest of the prefix. The server's twin,
`URNPubIdPlugin::_calculateCheckNo($urn)` (`plugins/pubIds/urn/URNPubIdPlugin.php`,
line 531 in OJS, 529 in OMP), uses the same table and steps, and
`constructPubId()` calls it with prefix plus suffix. Two published URNs
pass the whole-URN rule and fail the suffix-only one:

- the German National Library's example, `urn:nbn:de:1111-200606299`;
- the test URN of [bohnelang/URN-Pruefziffer](https://github.com/bohnelang/URN-Pruefziffer),
  `urn:nbn:de:0183-mbi0003721`. pkp's own `pkp/pkp-lib#6293`
  discussion points to that implementation.

With nothing after the prefix, the same line leaves an empty string.
The sum is then 0 and the "last number" an empty string, so the
division gives `NaN`, which the function returns and both buttons
append as text. The page's button is greyed only while its box is
empty (`FieldTextUrn`'s `:disabled`), so a box holding the prefix
alone gets through; the tab's `#checkNo` has no guard at all.

The Kind is regression because this worked before `pkp/pkp-lib#5208`
(2019): the tabs' button (`#checkNo`) computed over `urnPrefix +
urnSuffix`. That change moved the algorithm into a shared function for
the new publication page's Vue URN field, and added the prefix removal.
All three callers pass the whole URN:

- `FieldTextUrn.addCheckNumber()` passes the box's value;
- `FieldPubIdUrn.generateId()` passes prefix plus pattern;
- the `#checkNo` handler passes prefix plus suffix.

Reach:

- "Add Check Number" on the "Identifiers" page (`FieldTextUrn`):
  walked, OJS and OMP.
- "Assign" on the "Identifiers" page under "Use default patterns." or
  an own pattern (`FieldPubIdUrn`): walked with the default patterns.
  Before `pkp/pkp-lib#8940` (3.4) and `pkp/pkp-lib#6293` (3.3),
  "Assign" appended no check digit at all. Those changes made it
  append one, computed by this same function.
- "Add Check Number" on the tabs (`urnSuffixEdit.tpl`, `#checkNo`):
  walked on the galley and chapter tabs. The issue, publication format
  and file tabs use the same template (read in the code).
- URNs the server builds (`constructPubId()`: the tabs' previews and
  saves, "Publish Issue", the plugin's assignment of missing URNs) get
  the right digit, and this fix does not touch them.
- Stored data: every URN saved from these buttons with "Check Number"
  on has its digit from the suffix-only rule, and is wrong unless the
  two rules happen to agree.
- The server never checks the last digit.
  `URNPubIdPlugin::validatePublicationUrn()`, which checks a typed
  publication URN on save, checks only the prefix and duplicates. With
  an individual suffix, `constructPubId()` appends nothing ("checkNo is
  already calculated for custom suffixes").
- A character outside the conversion table (a space, "#", "ä") makes
  the function return `NaN` too, before and after the fix: read in the
  code and run in Node, not walked. It is left out of this fix.
- No other copy of the algorithm exists in OJS, OMP, OPS or their
  pkp-lib and ui-library (searched for the conversion table and the
  function's name).

## Proposed fix

In `getCheckNumber()`, compute over the whole URN, as the server's
`_calculateCheckNo()` does. The `urnPrefix` parameter stays so that
callers, third-party ones included, need no change. OJS and OMP each
carry an identical `checkNumber.js`, and the same diff applies to
both. The diff also removes the `suffix` variable the file leaked as a
global and the unused `newSuffix`, and declares `urn` in the `#checkNo`
handler, where it leaked too. The diff, verbatim from
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/fix.diff):

```diff
--- a/plugins/pubIds/urn/js/checkNumber.js
+++ b/plugins/pubIds/urn/js/checkNumber.js
@@ -19,8 +19,10 @@
 
 		/**
 		 * Get the last, check number.
-		 * Algorithm (s. http://www.persistent-identifier.de/?link=316):
-		 *  every URN character is replaced with a number
+		 * Algorithm (s. http://www.persistent-identifier.de/?link=316),
+		 * the same as URNPubIdPlugin::_calculateCheckNo():
+		 *  every character of the whole URN, prefix included,
+		 *  is replaced with a number
 		 *  according to the conversion table,
 		 *  every number is multiplied by
 		 *  it's position/index (beginning with 1),
@@ -29,8 +31,9 @@
 		 *  the last number of the quotient
 		 *  before the decimal point is the check number.
 		 *
-		 * @param {string} urn
-		 * @param {string} urnPrefix
+		 * @param {string} urn The whole URN, without its check number
+		 * @param {string} urnPrefix Not used: the check number covers the
+		 *  whole URN, prefix included (kept for existing callers)
 		 */
 		getCheckNumber: function(urn, urnPrefix) {
 			var newURN = '',
@@ -47,11 +50,11 @@
 						'-': '39', ':': '17', '_': '43', '/': '45',
 						'.': '47', '+': '49'
 					},
-					i, j, char, sum, lastNumber, quot, quotRound, quotString, newSuffix;
+					i, j, char, sum, lastNumber, quot, quotRound, quotString,
+					urnLower = urn.toLowerCase();
 
-			suffix = urn.replace(urnPrefix, '').toLowerCase();
-			for (i = 0; i < suffix.length; i++) {
-				char = suffix.charAt(i);
+			for (i = 0; i < urnLower.length; i++) {
+				char = urnLower.charAt(i);
 				newURN += conversionTable[char];
 			}
 			sum = 0;
@@ -68,8 +71,8 @@
 
 	// Apply the check number when the button is clicked
 	$('#checkNo').on('click', () => {
-			var urnPrefix = $('[id^="urnPrefix"]').val(), urnSuffix = $('[id^="urnSuffix"]').val();
-			urn = urnPrefix + urnSuffix;
+			var urnPrefix = $('[id^="urnPrefix"]').val(), urnSuffix = $('[id^="urnSuffix"]').val(),
+					urn = urnPrefix + urnSuffix;
 			$('[id^="urnSuffix"]').val(urnSuffix + $.pkp.plugins.generic.urn.getCheckNumber(urn, urnPrefix));
 		});
 
```

Tried on `main`, OJS and OMP:

- With the fix, steps 4 and 7 give `abc2`, step 5 stores
  `urn:nbn:de:0000-abc2`, and step 9 gives
  `urn:nbn:de:0000-jpkjpk.v1i2.18` (press `urn:nbn:de:0000-jpk.74`):
  the digits the server gives.
- The previews in step 10 did not change.
- With "Check Number" unticked, "Assign" and the tab previews still
  give URNs without a digit, and no "Add Check Number" is offered,
  with the fix in and out.
- Step 12 gives `6` and step 14 `urn:nbn:de:0000-6`, with no "NaN";
  the page's button stays greyed on an empty box (step 13). The
  greying of the tab's button (below) was not tried.

**Alternatives**

- Pass an empty prefix at the three callers. This fixes the screens
  but leaves a function that is wrong for any other caller.
- Let the server append the digit on save. With an individual suffix,
  the server cannot tell whether a typed URN already ends in its digit,
  so it would need a new setting. That is a larger change for the same
  result.

**What goes with it**

- Stored data: no automatic repair, since some wrong URNs may already
  be registered or cited. A read-only query lists the stored URNs
  (`pub-id::other::urn` in the settings tables of publications,
  galleys and issues, or publications, chapters, formats and files)
  whose last digit is not the whole-URN check digit, with the right
  digit beside each:
  [find-wrong-digits-ojs.sql](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/find-wrong-digits-ojs.sql)
  and
  [find-wrong-digits-omp.sql](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/find-wrong-digits-omp.sql)
  (PostgreSQL, `main`'s tables). A journal or press can then decide
  what to do with each.
- Follow-up, not part of this fix: a check-digit test in
  `validatePublicationUrn()` and the tab forms would also catch a
  wrong hand-typed digit. It would refuse input the app accepts today,
  while the agency itself makes the digit optional.
- Backport: applies as written to `stable-3_5_0` and `stable-3_4_0`. On
  `stable-3_3_0` the `#checkNo` handler is written as
  `.click(function() {…})`, so that hunk needs its context adjusted; the
  function's hunks apply. On 3.4 and 3.3 the page's `FieldTextUrn.js`
  has no greying and no null guard, so there a box the editor has
  emptied still gets "NaN" with the fix (the whole URN is then empty),
  and a box never filled throws a TypeError. A backport there also
  needs the page button's empty-box guard, which came with
  `pkp/pkp-lib#10821`
  ([972f4af1d5](https://github.com/pkp/ojs/commit/972f4af1d5833b0b73a89c85fbf855056f2b5595), with a null guard in
  [1f04ae4160](https://github.com/pkp/ojs/commit/1f04ae4160b756f8744278e22d54be72d51de196); OMP
  [55b885600](https://github.com/pkp/omp/commit/55b885600019dd365bc85156d512b96d17f92f41)).
- The tab's button on an empty box, recommended with the fix but not
  tried: grey `#checkNo` while "URN Suffix" is empty, as
  `FieldTextUrn` greys the page's button. Without it, the fixed button
  writes the prefix's check digit (`6`) as the whole suffix, as it did
  before 2019. An untried sketch, after the click handler in
  `checkNumber.js`:

  ```js
  $('#checkNo').prop('disabled', !$('[id^="urnSuffix"]').val());
  $('[id^="urnSuffix"]').on('input', function() {
  	$('#checkNo').prop('disabled', !$(this).val());
  });
  ```
- Test: an e2e check in the identifiers scenario that "Add Check
  Number" on `urn:nbn:de:0000-abc` gives `urn:nbn:de:0000-abc2`, and
  that "Assign" ends in the digit the tab preview's rule gives.

Medium: the same few-line change in two repositories, OJS and OMP,
each its own pull request and test, with no data repair; tried. In one
repository it would be small.

## Evidence

- Kept scripts, in
  [urn-check-number-wrong-digit/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/walk.js)
    takes steps 1–10 on a fresh load of the default dataset:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-check-number-wrong-digit/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Beside each digit,
    it records what the plugin's algorithm gives over the whole URN and
    over the suffix alone.
  - [empty-suffix.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/empty-suffix.js)
    takes the preconditions and steps 11–14 on a fresh load:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js
    all shared/playwright/checks/issues/urn-check-number-wrong-digit/empty-suffix.js`.
    Walked 2026-10-01 on `main` (OJS, OMP) and `stable-3_5_0` (OJS
    steps 11–14, OMP steps 11–12), the same tips; on `main` again with
    the fix applied.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-wrong-digit/neighbour.js)
    is the check with "Check Number" unticked, run with the fix in and
    out, each time on a fresh load.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-check-number-wrong-digit/fix.diff ojs omp`,
    then `walk.js` and `neighbour.js` (and on 2026-10-01
    `empty-suffix.js`), then `node bin/try-fix.js revert
    ojs omp`. The fixed function was also run in Node on the two
    published URNs in the Cause, without their last digit. It returned
    that digit for each (9 and 1).
- The agency's documentation, read 2026-09-30:
  - [URN-Service Admin - Hilfe](https://wiki.dnb.de/display/URNSERVDOK/URN-Service+Admin+-+Hilfe),
    under "Neue URN anlegen": "Eine Prüfziffer ist nicht mehr
    verpflichtend." (A check digit is no longer mandatory.)
  - [URN-Service API, `/urns`](https://api.nbn-resolving.org/v2/docs/resource__urns.html):
    registration answers 400 "if the URN does not pass format
    validation (error code 40010)". The format is not defined there.
  - The same service's
    [Beispiele: URN-Verwaltung](https://wiki.dnb.de/display/URNSERVDOK/Beispiele:+URN-Verwaltung)
    and the DNB's
    [URN standard page](https://www.dnb.de/DE/Professionell/Standardisierung/Standards/_content/urn.html)
    do not mention the check digit.
  - The DNB example `urn:nbn:de:1111-200606299` is quoted on
    [Vorlage:URN](https://de.wikisource.org/wiki/Vorlage:URN).
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main`, OJS and OMP, steps 1–10;
  `stable-3_5_0`, OJS steps 1–10 and OMP steps 6–10. The fault is in
  the browser's code, so the database plays no part. On OMP 3.5 the
  "Identifiers" page shows no "URN" field while the book has no URN:
  the field's template reads `currentValue.length` on a null value, and
  the page logs "TypeError: Cannot read properties of null (reading
  'length')". That is a separate fault. OJS has the null guard
  (`currentValue === null || currentValue?.length === 0`). The
  check-digit code on OMP 3.5 is the same as on `main`.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    and OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    both with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2).
- Code reads:
  - 3.5: `checkNumber.js` line 52 as on `main`, and
    `_calculateCheckNo()` over the whole URN (OJS and OMP).
  - 3.4 and 3.3: the same line 52 in both apps' `checkNumber.js`,
    and `urnSuffixEdit.tpl` offers `#checkNo` with no guard on an
    empty suffix. The page's `FieldTextUrn.js` renders a plain
    `<button>` with no `:disabled` and passes `this.currentValue`
    unguarded, so step 13's greying is not there: an emptied box gets
    "NaN" with or without the fix, and a never-filled one (null) throws.
    `FieldTextUrn.js` and `FieldPubIdUrn.js` call it, and
    `URNPubIdPlugin` (`.inc.php` on 3.3) computes over the whole URN
    (`strtolower_codesafe($urn)`). "Assign" appends the function's
    digit on 3.3 since
    [cf4621715c](https://github.com/pkp/ojs/commit/cf4621715cc88580fbfa44e7cc80d22fba09b52c)
    (`pkp/pkp-lib#6293`, 2023-05-10), and on 3.4 since
    [17dc1e0bf4](https://github.com/pkp/ojs/commit/17dc1e0bf49a87dc70cfd00269d680c1869e7f61)
    (`pkp/pkp-lib#8940`).
- Introduced, the trace: `git blame` of line 52 gives ce8a2617a0 (OJS)
  and 8cadd091c3 (OMP), "pkp/pkp-lib#5208 Update URN plugin to support
  publications" (PRs `pkp/ojs#2519` and `pkp/omp#721`, merged
  2019-10-25).
- Upstream search, 2026-09-30: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by "URN check number", "URN check digit", "URN check
  no", "URN invalid", "URN prefix wrong", "URN DNB", `getCheckNumber` and
  `_calculateCheckNo`; on 2026-10-01 also "URN NaN" (pkp-lib, ojs,
  omp, ui-library), "check number URN empty" and "checkNo URN".
  `pkp/pkp-lib#10821` (closed, the 3.5 URN test pass) does not mention
  "NaN" or an empty suffix. `pkp/pkp-lib#6293` (closed) asked for a check
  number on generated URNs, and its fix is the one that made "Assign"
  use this function. `pkp/pkp-lib#8940` (closed) is the 3.4 URN
  rework. Neither mentions the prefix.
- The two queries were run on the `main` dataset installs with six
  known URNs added in the query: they flagged the two this report
  computes as wrong and passed the four right ones, the two published
  ones included.
- Not driven: OPS (no URN plugin); the issue, publication format and
  file tabs (read in the code).
- Unverified: whether the German National Library's URN service
  refuses or flags a URN whose check digit fails.
