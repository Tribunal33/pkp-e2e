# "Jump to next error" on a refused form always scrolls to the first refused field, never on to the next

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · committed 2018-10-23, merged 2019-01-09 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On the "Create Journal" form in Administration › "Hosted Journals",
after a refused "Save" with several errors, for example with every
field left empty, "Jump to next error" beside "Save" scrolls to the
first refused field, "Journal title". Pressed again it goes to "Journal
title" again, so the later refused fields ("Journal initials",
"Principal Contact Name", "Path" and the rest) are never reached this
way.

Every settings and workflow form that shows "Please correct {n}
errors." beside its "Save" has the same fault, so editors and journal
managers meet it too. The button has gone to the first error since it
was added in 2019.

## Impact

- **Lost**: a little time; no data or work.
- **Who**: anyone whose "Save" is refused with more than one error on a
  form long enough to scroll. On the "Create Journal" form the press
  also scrolls the button itself out of view, so a second press means
  scrolling back down first. The button only scrolls: the keyboard
  focus stays on the button after each press, for the first error as
  for any other, so a keyboard user tabs to the field either way.
- **Way round**: scroll through the form; every refused field shows its
  message in red under it. For screen-reader users the line also holds
  one button per refused field, "Go to {field}: {message}", hidden from
  sight, and each of these scrolls to the field it names.

Low: the task gets done and nothing is wrong afterwards.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; a press or a server shows
  the same with "Hosted Presses" / "Create Press" / "Press Name" or
  "Hosted Servers" / "Create Server" / "Server title"). Nothing beyond
  it.

Steps:

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals"
   (`/index.php/index/en/admin/contexts`).
3. Press "Create Journal". The window opens with every field empty.
4. Press "Save" without typing anything. "This field is required."
   shows under seven fields: "Journal title", "Journal initials",
   "Principal Contact Name", "Principal Contact Email", "Path",
   "Languages" and "Primary locale". Beside "Save" stand "Please
   correct 7 errors." and "Jump to next error".
5. Press "Jump to next error" and note which field the window scrolls
   to.
6. Scroll back down to "Jump to next error" and press it again. Repeat
   until it has been pressed seven times, noting the field each time.

**Expected**: each press moves on to the next refused field: "Journal
title", then "Journal initials", "Principal Contact Name", "Principal
Contact Email", "Path", "Languages" and "Primary locale".

**Observed**: every one of the seven presses scrolls the window to
"Journal title", with "Journal initials", "Principal Contact Name" and
"Principal Contact Email" in view below it. "Path", "Languages" and
"Primary locale", which sit at the end of the form beside the button,
are scrolled out of view each time, and so is the button.

## Cause

The line beside "Save" is ui-library's `FormErrors.vue`
(`lib/ui-library/src/components/Form/FormErrors.vue`). Its button calls
`showNextError()` (line 80), whose whole body is:

```js
showNextError() {
	this.showError(Object.keys(this.errors)[0]);
},
```

It asks for the first key of the errors object on every press. The
component keeps no record of the error it showed last, so there is no
"next". `showError()` then emits `showField`, and `Form.vue`
`showField()` scrolls to that field, which works as it should. It
scrolls only and sets no focus.

The method has read this way since the forms were first written
(7496b3c2, "Initial forms implementation"); its comment says "Emit an
event to display the next error in the list".

Reach:

- Every form built on ui-library's `Form.vue`: `FormPage.vue` draws
  `FormErrors` in the footer whenever the form has errors and
  `showErrorFooter` is not turned off. Five forms turn it off and show
  no such line: `useAuthorResponseForm.js`, the two `MediaFileManager`
  form modals, `useWorkflowVersionForm.js`, and
  `UserInvitationDetailsFormStep.vue` (in its template, as
  `:show-error-footer="false"`). Checked in the browser on the "Create
  Journal" / "Create Press" / "Create Server" form only; the others
  are read in the code.
- With one error the button does what it says, since the first error is
  the only one. Checked in the browser.
- The screen-reader buttons "Go to {field}: {message}" call
  `showError()` with their own field's name and are not affected.
  Checked in the browser for "Go to Path: This field is required.".
- No other place in ui-library, pkp-lib or the apps picks "the next
  error" this way (searched for `showNextError`, `form.errorGoTo` and
  `Object.keys(…errors)[0]`).

## Proposed fix

Remember the field shown last and go to the one after it, starting
over after the last:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jump-to-next-error-stays-on-first-field/fix.diff).

```diff
--- a/lib/ui-library/src/components/Form/FormErrors.vue
+++ b/lib/ui-library/src/components/Form/FormErrors.vue
@@ -30,6 +30,12 @@
 		errors: Object,
 		fields: Array,
 	},
+	data() {
+		return {
+			/** The name of the field whose error was shown last */
+			lastShownError: null,
+		};
+	},
 	computed: {
@@ -78,7 +84,12 @@
 		showNextError() {
-			this.showError(Object.keys(this.errors)[0]);
+			const fieldNames = Object.keys(this.errors);
+			// The error after the one shown last; the first one when none has
+			// been shown yet, the last one was reached or it has been corrected
+			const next =
+				(fieldNames.indexOf(this.lastShownError) + 1) % fieldNames.length;
+			this.showError(fieldNames[next]);
 		},
@@ -91,6 +102,7 @@
 				this.$emit('showLocale', Object.keys(error)[0]);
 			}
+			this.lastShownError = fieldName;
 			this.$emit('showField', fieldName);
 		},
```

The paths in `fix.diff` start at the app root (`lib/ui-library/…`).
From a ui-library checkout, apply it with `git apply -p3` or
`patch -p3`.

The fix sits in `FormErrors.vue`, which owns the button, so every form
gets it. The jumps follow the keys of the errors object, the order
today's first jump and the screen-reader list (`errorList`) already
use. The field is remembered by name, not by position, so when the
user corrects the field they were taken to and its error goes, the
next press starts from the first error still standing. `showError()`
records the field too, so after a "Go to {field}" press, "Jump to next
error" goes to the error after that field; this is read in the diff
and was not tried in the browser.

The memory is per form page. `Form.vue` mounts one `FormPage` per
page, each with its own `FormErrors`, so on a form with several pages
a jump that lands on another page is followed by a press on that
page's button, which starts from the first error again: no worse than
today, and not cycling. Every form that adds a page in pkp-lib, the
three apps and ui-library on `main` adds exactly one, so no core form
shows this. Keeping the memory in `Form.vue` instead would cover a
plugin's multi-page form.

Tried on `main`, all three apps, with the Steps. Presses one to four
scrolled to "Journal title", "Journal initials", "Principal Contact
Name" and "Principal Contact Email" in turn. Presses five to seven left
the window scrolled to its end, where "Path", "Languages" and "Primary
locale" are in view together, so the screen cannot show which of the
three each press asked for. Two cases the fix must not change behaved
the same with and without it: "Go to Path: This field is required."
brings "Path" into view, and with "Path" the only error left, two
presses of "Jump to next error" both bring "Path" into view.

**Alternatives**:

- Order the jumps by the form's fields instead of by the errors object.
  A refusal the server sends back lists the errors in the server's
  order, which need not be the order on screen. That is a larger change
  (fields sit in groups and pages), and the screen-reader list would
  want the same order.
- Rename the button "Jump to first error". It makes the label true and
  leaves the later errors to scrolling.

**What goes with it**:

- No data repair, and no change to what the component takes or emits.
- The memory does not outlive a round of errors: "Save" stays disabled
  while an error stands, and `FormPage.vue` removes `FormErrors` once
  the errors are gone, so the next refusal starts from the first error.
- Backport: the same three hunks fit 3.5 as they stand. On 3.4 and 3.3
  `showNextError()` and `showError()` are the same code, and the component
  has no `data()` either, so the same change applies.
- Guard: a unit test for `FormErrors.vue` (three errors, three presses,
  three `showField` events naming each in turn, the fourth the first
  again); ui-library runs vitest but has no test for this component
  yet. Or a step in the e2e scenario of spec U59 that refuses the empty
  form.

Small: a few lines in one component, and one unit test.

## Evidence

- The kept script takes the Steps. With the word `neighbour` as a last
  argument it checks the two cases the fix must not change instead:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jump-to-next-error-stays-on-first-field/walk.js),
  helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jump-to-next-error-stays-on-first-field/lib.js).
  Run it from a pkp-e2e checkout on an install freshly loaded from the
  default dataset (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/jump-to-next-error-stays-on-first-field/walk.js [neighbour]`.
  Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- The walks ran in Chromium, 1280×900, on PostgreSQL. Datasets:
  pkp/datasets c657990 (2026-10-01). After each press the script waits
  for the scroll to stop and reads which refused field sits 50 px below
  the top of the window's scrolling box (the offset `showField()`
  uses), which are in view, and which element has the focus (the
  button, after every press). On `main` and 3.5, all three apps, the
  seven presses gave the same result. "Save" on the empty form sent no
  request, no request failed and no script error was logged.
- Read from the code, not seen on screen: with the fix, that an eighth
  press starts over at "Journal title".
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335; ui-library d4e01883.
  3.4: OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b; pkp-lib
  32b0f4b4af; ui-library ee684b34. 3.3: OJS ac77c9fb35, OMP 8e72fc8836,
  OPS c5532e2161; pkp-lib f6ab331645; ui-library 96959f9e.
- Code reads. `main`: `FormErrors.vue`, `FormPage.vue` (where the
  footer draws it, `showErrorFooter`), `Form.vue` (`showField`,
  `showLocale`, `validateRequired`, `error`), `useScrollTo.js`, the
  forms that set `showErrorFooter`, and every `addPage()` call in
  pkp-lib, the apps and ui-library (one page per form). `FormErrors.vue` is the same file
  in the three apps' ui-library on `main` and on 3.5. 3.4 and 3.3:
  `FormErrors.vue` (`showNextError()` with the same one line),
  `FormPage.vue` (the footer draws it whenever the form has errors) and
  `Form.vue` `showField()`. The three apps share one ui-library branch
  per version.
- Introduced: `git log -L` on `showNextError()` gives 5e6d3fce (2019,
  the ES6 method syntax), ec2afc8d (2019, a move) and 7496b3c2, which
  wrote the line. The GitHub API's `commits/<sha>/pulls` gives
  `pkp/ui-library#20`.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for "Jump to next error", the jump going to the first
  field or error, `showNextError`, `FormErrors` and `form.errorGoTo`.
  The hits that quote the button (`pkp/pkp-lib#10908`,
  `pkp/pkp-lib#12534`, `pkp/pkp-lib#12378`, `pkp/pkp-lib#6517`) are
  about other faults. `pkp/ui-library#934` (open, for
  `pkp/pkp-lib#12599` and `pkp/pkp-lib#12837`) adds a `focus()` method
  to `FormErrors.vue` and leaves `showNextError()` as it is.
- The fault is in the browser and does not depend on the database.
