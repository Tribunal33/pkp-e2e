# URN settings: while "Use the pattern entered below…" is selected, each click on a box raises a script error

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** [dba6c9d5](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) for `pkp/pkp-lib#1457` · 2015-12-06 · Bozana Bokan (bozana); OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f4](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the URN plugin's settings window, the window's own script fails in
the browser while "Use the pattern entered below to generate URN
suffixes…" is selected. Choosing that option, and every tick or untick
of a content box ("Issues", "Articles", …) or of "Check Number" after
it, raises an error that only the browser's console shows. Opening the
window again once that option is saved raises one more. The script
reads the result of a name match before checking that the match
succeeded, and "Check Number" never matches.

Nothing visible is wrong: the pattern boxes open and grey out as they
should, and "Save" works. OPS is not affected because it has no URN
plugin.

## Impact

- **Lost.** Nothing. The error ends the script's run after it has
  already opened or greyed every pattern box. The browser still ticks
  the box, and the page's other scripts keep running.
- **Who.** A Journal manager or Press manager who sets up the URN
  plugin with "Use the pattern entered below…". Outside the console the
  error reaches only a browser test that fails on any uncaught page
  error, as Cypress does by default; PKP's own Cypress tests do not
  open this window.
- **Way round.** None needed.

Low: a script error the user cannot see, with no effect on the task.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP `main` in brackets). The URN
  plugin is off in the dataset; turning it on is part of the steps.
- The browser's developer console is open (the error shows only there).

Choosing the pattern option:

1. Sign in as `rvaca` (Journal manager) [Press manager].
2. Open Settings › Website, tab "Plugins".
3. In the "URN" row, tick the box to enable the plugin.
4. Open the row's "Settings". The window "URN" opens with "Use default
   patterns." selected.
5. Under "Journal Content" ["Press Content"], tick "Articles"
   ["Monographs"].
6. "URN Suffix": choose "Use the pattern entered below to generate URN
   suffixes…".
7. Untick "Articles" ["Monographs"], then tick it again.
8. Tick "Check Number".

Saving and opening again:

9. "URN Prefix": `urn:nbn:de:0000-`; "for articles" ["for monographs"]:
   `%j.v%vi%i.%a` [`%p.%m`]; "Namespace": "urn:nbn:de"; "Resolver URL":
   `https://nbn-resolving.de/`.
10. "Save". The window closes with "Your changes have been saved."
11. Open the "URN" row's "Settings" again.

**Expected:** no error in the console at any step. Under the pattern
option the "for articles" ["for monographs"] box opens while "Articles"
["Monographs"] is ticked and greys out while it is not; the other
pattern boxes stay grey.

**Observed:** the boxes open and grey out as expected. Steps 6, 7 (each
click), 8 and 11 each raise one uncaught page error, five in all; steps
4 and 5 raise none:

```
TypeError: Cannot read properties of null (reading '1')
    at HTMLInputElement.<anonymous> (<anonymous>:63:25)
```

Line 63 of `URNSettingsFormHandler.js` (the window loads the script,
hence `<anonymous>`); Chrome's console reads it as
`Uncaught TypeError: Cannot read properties of null (reading '1')`.

Control: under "Use default patterns." or "Enter an individual URN
suffix…", the same clicks raise no error.

## Cause

`URNSettingsFormHandler.prototype.updatePatternFormElementStatus_()`
(`plugins/pubIds/urn/js/URNSettingsFormHandler.js`, the same file in
OJS and OMP) runs on every click on a radio button or box of the
window, and once from the constructor when the window opens (line 41).
Under the pattern option it walks every box of the form and matches
its name against `/enable(.*)URN/` to find the box's pattern field. It
reads `patternCheckResult[1]` on line 63, while building the pattern
field's selector, and checks `patternCheckResult !== null` only in the
next statement, on line 66.

The window has one box whose name does not match: "Check Number"
(`urnCheckNo`, template line 62 in OJS, 64 in OMP). For that box
`exec()` returns `null` and the read throws, so the handler fails on
every run under the pattern option, whichever control was clicked.
Under the other two options it takes the `else` branch and never walks
the boxes.

The error has no visible effect because "Check Number" is the last box
in the window: every `enable…URN` box is handled before the loop
reaches it. The throw is in a click handler, which prevents nothing,
so the browser still ticks the box. On reopening (step 11) the throw
comes from the constructor's first call on line 41 and escapes through
`Helper.objectFactory()`, `$.fn.pkpHandler()` and the template's
`$(function() {…})`; nothing follows that call in any of them, and the
click handlers are bound on lines 38–39, before it.

The unguarded read comes from the DOI plugin's settings handler of
2012 (2836c9ce4f), where every box matched `/enable(.*)Doi/`, so it
never threw. The URN handler was written from it in dba6c9d5, which
put the "Check Number" box into the same window; OMP's copy (825986f4)
has both from its first commit.

Reach:

- The URN settings windows of OJS and OMP, the only places the handler
  runs (walked).
- No other handler on `main` has this loop (read in the code).
- A separate fault, 3.3 only and outside this fix (read in the code,
  not walked): OPS 3.3's DOI settings handler has the same loop.
  `enablePublicationDoiAutoAssign` matches `/enable(.*)Doi/` as
  "Publication" and comes after `enablePublicationDoi` in the form, so
  "Preprints" under "Automatic assignment", not "Preprints" under
  "Server Content", decides whether the "for preprints" pattern field
  opens.

## Proposed fix

Do the null check before the read, so the loop skips the boxes that
have no pattern field, as the existing check already meant to:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-pattern-script-error/fix.diff),
the same diff for OJS and OMP.

```diff
 				var patternCheckResult = pattern.exec($(this).attr('name')),
-						$correspondingTextField = $element.find('[id*="' +
+						$correspondingTextField;
+
+				// Only the enable...URN boxes have a pattern field;
+				// skip the others ("Check Number").
+				if (patternCheckResult === null) {
+					return;
+				}
+
+				$correspondingTextField = $element.find('[id*="' +
 						patternCheckResult[1] + 'SuffixPattern"]').
 						filter(':text');
-
-				if (patternCheckResult !== null &&
-						patternCheckResult[1] !== 'undefined') {
-					if ($(this).is(':checked')) {
-						$correspondingTextField.removeAttr('disabled');
-					} else {
-						$correspondingTextField.attr('disabled', 'disabled');
-					}
+				if ($(this).is(':checked')) {
+					$correspondingTextField.removeAttr('disabled');
+				} else {
+					$correspondingTextField.attr('disabled', 'disabled');
 				}
```

The `patternCheckResult[1] !== 'undefined'` test goes with it: it
compares with the string `'undefined'` and is always true, since
`(.*)` always captures. The fix keeps what the handler is for, opening
a pattern field only for a ticked box under the pattern option, and no
longer depends on "Check Number" being the last box.

Tried on `main`, OJS and OMP: the steps raise no error, and the pattern
fields open and grey out the same with the fix as without it.

**Alternatives:**

- Walk only the `enable…URN` boxes
  (`$element.find(':checkbox[name^="enable"]')`): also works, but
  leaves the read unguarded for the next box whose name starts with
  "enable".
- Wrap the loop in `try`/`catch`: hides the error and leaves the read
  before the check.

**What goes with it:**

- No stored data, API or plugin hook is involved, and the file is
  loaded by the window's template as it stands, with no build step.
- The file is the same on every branch from `stable-3_3_0` to `main` in
  both apps, so the diff applies as written to each.
- A guard, proposed and not yet written: a scenario in pkp-e2e's U44
  suite that clicks through the pattern option and fails on any page
  error.

Small: a few lines in one file, the same change in each of the two
apps.

## Evidence

- Kept scripts, in
  [urn-settings-pattern-script-error/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-pattern-script-error/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-pattern-script-error/walk.js)
    takes steps 1–11 on a fresh load of the default dataset and records
    the page errors and the pattern fields' state after each click:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-settings-pattern-script-error/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-pattern-script-error/neighbour.js),
    walked with the fix in and out, each on a fresh load: every box
    ticked and unticked under each of the three options, a save with
    every pattern, and the window reopened. The open and grey fields
    after each click are the same both ways; page errors 11 (OJS) and
    12 (OMP) without the fix, 0 with it.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-settings-pattern-script-error/fix.diff ojs omp`,
    then `walk.js` and `neighbour.js`, then `node bin/try-fix.js revert ojs omp`.
- Walked in Chromium on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main` and `stable-3_5_0`, OJS and
  OMP, every step, the same observations on both lines. Firefox and
  Safari were not driven; their wording of the error is unverified. A
  browser script error, so the database plays no part.
- Tips: `main` OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00d;
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441f; `stable-3_3_0` OJS
  9fdb9bcf9a, OMP 8e72fc8836.
- Code reads: `plugins/pubIds/urn/js/URNSettingsFormHandler.js`
  compared byte for byte across OJS and OMP on the four branches, and
  each branch's `plugins/pubIds/urn/templates/settingsForm.tpl` (the
  `urnCheckNo` box after the `enable…URN` boxes; the handler loaded).
  On `main`, the three apps, `lib/pkp` and `lib/ui-library` searched for
  `patternCheckResult` and `updatePatternFormElementStatus`. On
  `stable-3_3_0`, `plugins/pubIds/doi/js/DOISettingsFormHandler.js` and
  its template in OJS, OMP and OPS: OJS and OMP have only `enable…Doi`
  boxes, OPS adds `enablePublicationDoiAutoAssign` after them.
  `lib/pkp/js/classes/Helper.js` `objectFactory()` and
  `lib/pkp/js/lib/jquery/plugins/jquery.pkp.js` `pkpHandler()` for the
  constructor's throw. The Cypress tests of OJS, OMP and their
  `lib/pkp` searched for the URN plugin and for an `uncaught:exception`
  handler: neither found.
- Introduced: `git blame` on lines 61–67 in each app; `git log
  --follow` for the DOI origin. The GitHub API lists no PR for
  dba6c9d5.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched
  for "URNSettingsFormHandler", "patternCheckResult", "URN settings
  form", "URN check number", "URN suffix pattern", "URN plugin settings
  console error" and the error text. `pkp/pkp-lib#10927` (the prefix
  message's written-out angle brackets), `pkp/pkp-lib#8811` (the window
  failing to open on 3.3) and `pkp/pkp-lib#8940` (the plugin's port to
  3.4) are other faults. One pkp/omp search was refused by the API's
  rate limit; a narrower one there found nothing.
