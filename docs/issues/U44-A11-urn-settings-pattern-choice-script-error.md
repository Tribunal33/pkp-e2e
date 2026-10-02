# URN settings window: every click under the pattern choice raises a page script error

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** OJS: `pkp/pkp-lib#1457` · [dba6c9d597](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) · 2015-12-06 · Bozana Bokan (bozana); OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

In the URN plugin's settings window, the window's own script fails
whenever "Use the pattern entered below…" is the selected suffix choice.
A script error, seen only in the browser's console, comes with each of
these: clicking that choice, clicking a box under "Journal Content"
("Press Content") or "Check Number", and opening the window once the
choice is saved.

Nothing else goes wrong: each kind's pattern box still becomes editable
or greyed as it should, and "Save" stores the settings. Preprint
servers have no URN plugin, so they never meet it.

## Impact

- **Lost**: nothing.
- **Who**: a journal or press manager setting up URNs with suffix
  patterns.
- **Way round**: none needed.

Low: the error ends the window's handler early, but nothing in the
handler comes after the point where it throws. The severity would rise
if a later change added code there, because that code would never run.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP the same, with the
  differences in brackets). The "URN" plugin is off in the dataset.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins".
3. Under "Public Identifier Plugins", tick "Enabled" on the "URN" row.
4. Open the browser's developer console.
5. Click the "URN" row's arrow, then "Settings". The "URN" window opens
   with "Use default patterns." selected.
6. Under "URN Suffix", select "Use the pattern entered below to generate
   URN suffixes. …".
7. Under "Journal Content", tick "Articles" [OMP: "Press Content",
   "Monographs"].
8. Under "Check Number", tick "The check number will be automatically
   calculated and added at the end, as the last digit of an URN."
9. Fill "URN Prefix" with `urn:nbn:de:0000-`, "for articles" [OMP: "for
   monographs"] with `%j.%a` [OMP: `%p.%m`], choose `urn:nbn:de` as
   "Namespace", fill "Resolver URL" with `https://nbn-resolving.de/`,
   and click "Save".
10. Open Settings › Website › "Plugins" again, click the "URN" row's
    arrow, then "Settings".

**Expected**: nothing appears in the console. In step 7 the "for
articles" box becomes editable; step 9 saves.

**Observed**: steps 6, 7, 8 and 10 each add one error to the console:

```
Uncaught TypeError: Cannot read properties of null (reading '1')
    at $.pkp.plugins.pubIds.urn.js.URNSettingsFormHandler.updatePatternFormElementStatus_ (<anonymous>:60:20)
```

The "for articles" [OMP: "for monographs"] box still becomes editable in
step 7 while the other pattern boxes stay greyed. Step 9 shows "Your
changes have been saved.", and in step 10 the window reopens with the
pattern choice selected and the same box editable.

With "Use default patterns." selected (step 5), opening the window and
clicking in it raise nothing.

## Cause

`URNSettingsFormHandler.prototype.updatePatternFormElementStatus_()` in
`plugins/pubIds/urn/js/URNSettingsFormHandler.js` runs on every click on a radio or checkbox in the form and once
when the handler is built. Under the pattern choice it walks every
checkbox in the form and matches its name against `enable(.*)URN` to
find the kind's pattern box. It reads `patternCheckResult[1]` (line 63)
before the null check below it (line 66). The "Check Number" box,
`urnCheckNo`, does not match, so `exec()` returns null and the read
throws.

"Check Number" is the last checkbox in the form, so every content kind
has been handled by the time the loop throws. That is why the pattern
boxes still turn on and off. When the window opens, the same call is
the constructor's last statement, after `AjaxFormHandler` has bound the
form, so the save still works.

The handler was copied from the DOI plugin's, whose form's checkboxes
were all `enable…Doi` kinds, so the misplaced null check never mattered
there. The URN form added "Check Number", the first box that does not
match.

Reach:

- OJS and OMP: the one handler, the same file in both apps on `main`,
  3.5, 3.4 and 3.3 (checked in the code; walked on `main` and 3.5).
- OPS ships no URN plugin.
- No other copy: the pattern appears nowhere else in the three apps,
  `lib/pkp/js` or their plugins (checked in the code).

## Proposed fix

Skip the boxes that are not content kinds before using the match, in
`updatePatternFormElementStatus_()`, one diff for OJS and OMP
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-pattern-choice-script-error/fix.diff)):

```diff
 			$contentChoices.each(function() {
 				var patternCheckResult = pattern.exec($(this).attr('name')),
-						$correspondingTextField = $element.find('[id*="' +
+						$correspondingTextField;
+
+				// Only the content boxes (enable...URN) have a pattern box;
+				// skip the others, such as "Check Number" (urnCheckNo).
+				if (patternCheckResult === null) {
+					return;
+				}
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
 			});
```

The null check moves ahead of the read. The second condition,
`patternCheckResult[1] !== 'undefined'`, compares with the string
`'undefined'` and is always true, so it goes. The file is loaded as it
stands by `templates/settingsForm.tpl`, so no build step is involved.
Tried on OJS and OMP `main`: no error, and the same box states as
without the fix (Evidence).

**Alternatives**:

- Narrow the loop to the content boxes (`$element.find(':checkbox[name^="enable"]')`):
  also works, but a later `enable…` box whose name does not end in
  `URN` would throw again.
- Move "Check Number" out of the form: changes the screen for a script
  fault.

**What goes with it**:

- Backport: the diff applies as written to 3.5, 3.4 and 3.3.
- Guard: an e2e check on the URN settings window (spec U44, scenario 2)
  that fails on any page error while the pattern choice is used.

Small: a few lines in one JavaScript file per app, and an e2e check.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-settings-pattern-choice-script-error/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-settings-pattern-choice-script-error/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). It records the page errors each step
  raised and the pattern boxes' state. `WALK=neighbour` in front takes
  the neighbour check (the pattern choice, a kind ticked, unticked,
  ticked again, then "Use default patterns.") on a fresh load.
- Walked on `main` and `stable-3_5_0`, OJS and OMP: one page error at
  each of steps 6, 7, 8 and 10, none elsewhere, the same on both lines.
  The stack's `<anonymous>:60:20` is jQuery's evaluated copy of the
  script, not the file; line 63 is from the code.
- Fix tried: `node bin/try-fix.js apply shared/playwright/checks/issues/urn-settings-pattern-choice-script-error/fix.diff ojs omp`
  on `main`: the walk raised no page error, with the same box states at
  every step. The neighbour check gave the same box states with the fix
  in and out.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794; `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246; `stable-3_4_0` OJS 75cc2d488b, OMP
  0aec65441; `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883.
- 3.4 and 3.3 (code), both apps:
  the handler is as on `main`, and `templates/settingsForm.tpl` holds the `urnCheckNo`
  checkbox after the content kinds, as on `main`.
- Introduced: `git blame` on lines 61–67 gives dba6c9d597 (`pkp/pkp-lib#1457 pub ids`, OJS; no PR on GitHub) and, in OMP, 825986f471 (`pkp/pkp-lib#1527 URN plugin`, `pkp/omp#306`). Both created the URN handler as a copy of
  the DOI plugin's, whose form at dba6c9d597 had only the four
  `enable…Doi` checkboxes.
- Not walked: the window's "Save" after it is reopened with the pattern
  choice stored (step 10); the Cause's statement that it still works is
  from the code.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library,
  issues and PRs, for "URN settings pattern", "URN suffix pattern
  console", "URN check number pattern", "URN plugin settings form",
  "Cannot read properties of null" with URN,
  `URNSettingsFormHandler` and `updatePatternFormElementStatus`.
  `pkp/pkp-lib#10927` (the prefix warning's written-out HTML) and
  `pkp/pkp-lib#8811` (the settings form's failed AJAX answer) concern
  other faults in the same window.
