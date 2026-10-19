# "Add Check Number" appends "NaN" to a URN suffix holding a character such as "~"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** the URN plugin's first commit · [1b7d1d6262](https://github.com/pkp/ojs/commit/1b7d1d6262c87b6bf049ef4e04cac1d21b321a78) · 2012-01-12 · Bozana Bokan (bozana); "NaN" rather than "N" since PRs `pkp/ojs#2519` and `pkp/omp#721` for `pkp/pkp-lib#5208` · [ce8a2617a0](https://github.com/pkp/ojs/commit/ce8a2617a0ba9f02b8129c431e2870ec75ce0e4e) · 2019-10-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U44 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a15)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal or press can let editors type each item's URN suffix by hand
and have the app add a check digit: the URN plugin's settings "Enter an
individual URN suffix…" and "Check Number". When the suffix holds a
character such as "~", the "Add Check Number" button appends "NaN"
instead of a digit: "a~b" becomes "a~bNaN". This happens on the
"Identifiers" tab of a galley or a chapter and on the article's or
monograph's "Identifiers" page.

The box shows "NaN" at once, but nothing refuses it: "Save" keeps
"a~bNaN" as the suffix, and a URN assigned from it ends in "NaN". The
text above the box says a suffix "can take any form", and nothing warns
that this one cannot take a check digit.

## Impact

- **Lost**: no data. If the editor saves without removing "NaN" and
  assigns the URN, publishing puts it on the public record: the
  article's page shows it as a "URN" link to the resolver, and the Dublin
  Core meta tags and OAI-PMH records carry it (on a press, the book
  page's formats and the chapter's meta tags). The publish window shows
  the URN once more before the editor confirms.
- **Who**: editors and managers of a journal or press with both settings
  chosen (the URN plugin is off until a manager turns it on), who type a
  suffix holding a character other than letters, digits and
  `- : _ / . +` (a "~", a space, an accented letter). Under the German
  National Library's rules such a suffix is not allowed in a
  `urn:nbn:de` URN at all, with or without a digit.
- **Way round**: delete "NaN" and type a check digit worked out
  elsewhere, or leave such characters out. An editor can still correct
  a saved or published URN: "Clear" on the tab, or a new value on the
  page. Anyone who harvested it in the meantime keeps the old one.

Low: the value is in plain sight in the box and again in the publish
window, and only suffixes with unusual characters meet it. A URN that
went out ending in "NaN" without the editor seeing it would make this
medium.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS or OMP). The steps set up
  the URN plugin, which the dataset leaves off.

Setting up URNs:
1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's arrow › "Settings": tick "Articles" and "Galleys"
   [press: "Monographs" and "Chapters"]; "URN Prefix"
   `urn:nbn:de:0000-`; choose "Enter an individual URN suffix for each
   published item. …"; tick "Check Number"; "Namespace" `urn:nbn:de`;
   "Resolver URL" `https://nbn-resolving.de/`; "Save".

The galley's [press: chapter's] tab:
4. Open submission 1, "Signalling Theory Dividends" [press: 7,
   "Accessible Elements: Teaching Science Online and at a Distance"].
   On OJS the workflow opens on version 1.1, which is not published;
   its galley is "PDF Version 2" (the published 1.0 holds "PDF"). Go to
   Publication › "Galleys" › "PDF Version 2" › "Edit" › "Identifiers"
   [press: the book's one version, Publication › "Chapters" ›
   "Introduction" › "Identifiers"].
5. Type `a~b` in "URN Suffix" and press "Add Check Number".
6. Press "Save", then open the same "Identifiers" tab again.

The article's [press: monograph's] page, on the same version:
7. Publication › "Identifiers": type `urn:nbn:de:0000-a~b` in "URN" and
   press "Add Check Number". Do not save.

**Expected**: "Add Check Number" appends one digit, as it does to a
suffix of letters and digits, or says that this suffix cannot take a
check digit; "NaN" never appears.

**Observed**:
- Step 5: "URN Suffix" reads `a~bNaN`. No request is sent and the
  browser logs no error.
- Step 6: the save is accepted; the tab reopens with `a~bNaN` in "URN
  Suffix", now with "What you see is a preview of the URN. Select the
  checkbox and save the form to assign the URN." and the box "Assign
  the URN to this galley" [press: "chapter"] under it.
- Step 7: "URN" reads `urn:nbn:de:0000-a~bNaN`.

A suffix of letters only, `ab`, gets a digit in all three places
(`ab9`).

## Cause

Both buttons call `$.pkp.plugins.generic.urn.getCheckNumber()` in
`plugins/pubIds/urn/js/checkNumber.js` (OJS and OMP each ship a copy):
the tab's through the `$('#checkNo')` click handler at the end of that
file, the page's through `FieldTextUrn.addCheckNumber()`. The function
replaces each character with its value from a conversion table that
holds only letters, digits and `-:_/.+`, and appends the lookup without
checking it:

```js
for (i = 0; i < suffix.length; i++) {
	char = suffix.charAt(i);
	newURN += conversionTable[char];
}
```

For "~" the lookup is `undefined`, so `newURN` becomes
`"18undefined14"`. The weighted sum over its characters is then `NaN`,
and the function returns `parseInt('N')`, `NaN`, which the caller
appends as text.

The server's copy of the calculation, `URNPubIdPlugin::_calculateCheckNo()`,
has the same unchecked lookup (`$newURN .= $conversionTable[$char];`).
In PHP a missing key gives `null` and an "Undefined array key" warning,
so the server leaves the character out and still returns a digit. The
two copies already disagree on other grounds: the browser computes over
the suffix alone and the server over the whole URN
([the check-digit report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A6-urn-check-digit-from-suffix-only.md)).

The fault is as old as the plugin: its first version (2012) built the
digit the same way and appended the last character of `"NaN"`, an "N".
ce8a2617a0 moved the calculation into `getCheckNumber()` and added the
`parseInt()`, which made it "NaN".

Nothing on the server refuses the result. The tab's save checks only
that no other item uses the suffix (`PKPPubIdPlugin::verifyData()`),
and `URNPubIdPlugin::constructPubId()` adds no digit to a typed suffix,
so "NaN" is kept as typed (walked: step 6). The page's save goes
through `URNPubIdPlugin::validatePublicationUrn()`, which checks only
the prefix and duplicates (`checkDuplicate()`) (code).

Reach:
- The issue (OJS), publication format and submission file (OMP) tabs
  use the same template and handler (code).
- "Assign" on the page, under a suffix pattern with "Check Number"
  ticked: `FieldPubIdUrn.generateId()` passes the URN the pattern gives
  to the same function. The pattern's pieces are not limited to table
  characters: the issue number (`%i`) and the publisher ID (`%x`) are
  free text, and an own pattern may hold any character. Such a URN
  gets "NaN" in the browser (code).
- URNs the server builds from a pattern (the tabs' previews, "Publish
  Issue", OMP's "Format Approval") get a digit with the character left
  out, and the PHP log gets one warning per byte of such a character,
  two for "é" (code; the lookup confirmed with `php -r`).

## Proposed fix

Skip characters that have no value in the conversion table, in both
copies of the calculation. The diffs are relative to each app's
repository root, OJS and OMP
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-nan-unlisted-character/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-nan-unlisted-character/fix-omp.diff);
the same change, at different line numbers):

```diff
--- a/plugins/pubIds/urn/js/checkNumber.js
+++ b/plugins/pubIds/urn/js/checkNumber.js
-				newURN += conversionTable[char];
+				// A character without a value in the table (such as "~") is skipped,
+				// as URNPubIdPlugin::_calculateCheckNo() does.
+				if (Object.prototype.hasOwnProperty.call(conversionTable, char)) {
+					newURN += conversionTable[char];
+				}
--- a/plugins/pubIds/urn/URNPubIdPlugin.php
+++ b/plugins/pubIds/urn/URNPubIdPlugin.php
-            $newURN .= $conversionTable[$char];
+            // A character without a value in the table (such as "~") is skipped,
+            // as getCheckNumber() in js/checkNumber.js does.
+            $newURN .= $conversionTable[$char] ?? '';
```

The JavaScript change covers every caller of `getCheckNumber()` (both
"Add Check Number" buttons and "Assign"). The PHP change keeps the
digit the server has always returned and stops the warning. A search of
OJS, OMP, pkp-lib and ui-library finds no other copy of the table.

On its own this fix does not make the browser and the server agree:
with it, `urn:nbn:de:0000-a~b` gets 9 in the browser (over `ab`) and 5
on the server (over the whole URN). They agree once the check-digit
report's fix also lands, which changes the lines just above in the same
loop. Together the loop reads:

```js
urnLower = urn.toLowerCase();
for (i = 0; i < urnLower.length; i++) {
	char = urnLower.charAt(i);
	if (Object.prototype.hasOwnProperty.call(conversionTable, char)) {
		newURN += conversionTable[char];
	}
}
```

With both, `urn:nbn:de:0000-a~b` gets 5 in the browser as on the
server. The two diffs touch neighbouring lines, so the second to land
needs its hunk redone by hand.

Whether the skipped digit means anything is the team's call. The German
National Library's policy for `urn:nbn:de` allows only `0-9`, `a-z`, "-"
and ".", and computes the check digit over the whole URN; a character
outside its table has no value, so neither copy's digit is one its rules
define. RFC 8458 leaves the characters of a URN:NBN to each national
library, and `~` is legal URN syntax (RFC 8141). Skipping stops the
"NaN" and the warning, and leaves the question of which characters to
allow open.

Tried on `main`, OJS and OMP: with the fix, steps 5 to 7 added 9 in all
three places (`a~b9` on the tab, saved as such, and
`urn:nbn:de:0000-a~b9` on the page). 9 is the digit `ab` gets without
the fix. A control run with `ab` gave `ab9` on the tab, in the saved
suffix and on the page, with the fix and without it. No step builds a
server-side pattern URN with such a character, so the PHP line was not
driven.

**Alternatives**:
- Refuse such characters: grey the button, or have both saves (the
  tab's `verifyData()` and the page's `validatePublicationUrn()`) reject
  a suffix with a character the check digit cannot cover. That needs a
  product decision first (which characters a suffix may hold, for each
  namespace the plugin offers), a new message in both apps, and a rule
  for URNs already stored.
- Guard only the browser: the button would stop writing "NaN", but the
  server would keep warning, and nothing in the PHP code would say that
  unlisted characters are skipped on purpose.

**What goes with it**:
- Land it with [the check-digit report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A6-urn-check-digit-from-suffix-only.md)'s
  fix, as above. Until that lands, a suffix made only of such
  characters (`~`) still gets "NaN", since nothing is left to compute
  over.
- [The empty-box report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A13-check-number-empty-urn-suffix-nan.md)
  has a separate cause (the tab's button is active on an empty box).
- No stored data to repair: a "NaN" suffix exists only where an editor
  saved the box as it stood.
- Backport: both diffs apply as written to `stable-3_5_0` and
  `stable-3_4_0`. On `stable-3_3_0` the JavaScript hunk applies and the
  PHP hunk does not (that file is `URNPubIdPlugin.inc.php`, indented
  with tabs), so the PHP change is made by hand there.
- The guard: a test that "Add Check Number" on `a~b` adds one digit
  (the spec's typed-suffix scenario, a Planned item there).

This is a proposal; the team decides.

Medium: two lines, one in each copy of the calculation, but each app
ships its own plugin, so the change goes to two repositories (OJS and
OMP). It should also be merged with the check-digit fix in the same
loop.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-check-number-nan-unlisted-character/walk.js)
  (helpers in `lib.js` beside it), on an install freshly loaded from the
  default dataset (pkp/datasets eaf024c5, 2026-10-18, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-check-number-nan-unlisted-character/walk.js`.
  `WALK=neighbour` in front takes the same steps with `ab`.
- The fix trial: `node bin/try-fix.js apply <fix-ojs.diff> ojs` and
  `apply <fix-omp.diff> omp`, the walk and `WALK=neighbour` on fresh
  loads, then `revert` and `WALK=neighbour` again.
- Walked on `main` (OJS, OMP) and `stable-3_5_0` (OJS, OMP): "NaN" on
  every walk, at steps 5, 6 and 7. On OMP 3.5, step 7 could not be
  taken: the monograph's "Identifiers" page raised `TypeError: Cannot
  read properties of null (reading 'length')` and showed no "URN" box (a
  separate fault in OMP's `FieldTextUrn.js` on 3.5, already in the
  empty-box report's Evidence). Steps 5 and 6 were taken there as
  written.
- Tips: `main` OJS 6b4323ced7, OMP 5777025be; `stable-3_5_0` OJS
  007c2cd0d6, OMP 2d575f250; `stable-3_4_0` OJS 0012bd1022, OMP
  e30fa7e38; `stable-3_3_0` OJS d7d9dd14ec, OMP 8e72fc883.
- 3.4 and 3.3 (code), both apps: `checkNumber.js` has the same
  `newURN += conversionTable[char]` and `parseInt()` return, and
  `_calculateCheckNo()` the same lookup; 3.3 has `FieldTextUrn.js` too.
- PHP side: `php -r` running the same lookup over `a~b` printed
  `PHP Warning:  Undefined array key "~"` and returned `1814`, the
  values of `a` and `b`. The combined loop gives 5 for
  `urn:nbn:de:0000-a~b`, computed in Node.
- What goes out, read in the code and not walked: OJS
  `templates/frontend/objects/article_details.tpl` (the "URN" link),
  `plugins/generic/dublinCoreMeta` (`DC.Identifier.URN`),
  `plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php` (OAI DC
  identifiers of the issue, article and galleys); OMP
  `monograph_full.tpl` (format URNs) and its `dublinCoreMeta` (chapter
  URN). The publish window's URN line is the spec's Rule 17. Correction
  after publication: `Repo::submission()->canEditPublication()` locks
  published versions for authors only; not walked.
- DNB rules: "Policy für die Vergabe von URNs im Namensraum urn:nbn:de",
  version 1.0 (2012), <https://d-nb.info/1029114455/34>, p. 11:
  "Zugelassene Zeichen sind die Ziffern 0-9 und a-z ohne Umlaute. …
  als Sonderzeichen nur Bindestrich (-) und Punkt (.) erlaubt." The
  check digit "bezieht sich auf die Zeichenkette "urn:nbn:de:[...]"". The
  DNB's URN-Service page now marks the policy as partly outdated and the
  check digit as no longer required (the check-digit report's Evidence).
  RFC 8458 §4.2: `nbn-string = path-rootless`, the structure set by the
  prefix's authority.
- Introduced: the lookup line is the same in the plugin's first
  version, 1b7d1d6262 (OJS 2012; OMP's copy 825986f47, 2016), whose
  `calculateCheckNo()` appended the last character of the quotient's
  string, "N" for `NaN`.
- Not walked: "Assign" under a pattern holding such a character, the
  server's pattern URNs with one, and the issue, publication format and
  submission file tabs (all code).
- Upstream: `pkp/pkp-lib#6293` is about a missing check digit and
  `pkp/pkp-lib#7595` about DOI suffix characters; nothing found is
  about this fault.
