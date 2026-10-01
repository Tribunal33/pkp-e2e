# Publication Facts "Start Date" and review due dates: an impossible typed date saves as another date, or none

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS walked; OMP read in the code (its reviewer and chapter date boxes)
  - 3.5: OJS walked; OMP read in the code
  - 3.4: OJS, OMP (code; the reviewer date boxes, no Publication Facts plugin bundled)
  - 3.3: OJS, OMP (code; the reviewer date boxes, no Publication Facts plugin bundled)
- **Introduced** `pkp/pkp-lib#2030` for `pkp/pkp-lib#1868` · [bc4f102bc7](https://github.com/pkp/pkp-lib/commit/bc4f102bc779d829c316b77ba566b02416d3344c) · 2016-10-20 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the "Publication Facts Label plugin" settings, a manager who types an
impossible "Start Date" and presses "OK" is told "Your changes have been
saved.", but the date typed is not what is stored. "2026-99-99" stores
no start date. "2026-02-30" stores 3 February 2026 (not 2 March), and the
box shows that date when the window reopens.

The same happens in every older window that has a date box with a
calendar. An editor who types "2026-11-31" as a reviewer's "Review Due
Date" in "Edit Review" stores 3 November, and the reviewer is emailed at
once to submit by 3 November. The editor is shown no message.

## Impact

- **Lost.** The date the user typed. For a review, the reviewer is told
  a due date nearly four weeks early, and the review's reminders and its
  "overdue" state follow that date. For the plugin, the start date
  decides which articles get the Publication Facts label and which
  articles the label's figures count.
- **Who.** An editor changing a review's due dates, or a manager setting
  the plugin's "Start Date", who types a date that does not exist (a day
  past the month's end, a month past 12).
- **Way round.** Pick the date in the calendar, or type a date that
  exists. A wrong due date can be corrected with another "Edit Review",
  once someone notices it.

Medium: a wrong date is stored and sent to a reviewer without any
warning, but only after a typed date that does not exist, and an editor
can correct it. Without the silence it would be low: an impossible date
refused on screen costs nothing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on `stable-3_5_0`).
- "Publication Facts Label plugin" is off in the dataset; step 2 turns
  it on.

The plugin's "Start Date":

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Publication Facts Label plugin".
3. Press the arrow beside the plugin's name, then "Settings". In the
   window "Publication Facts Label plugin", "Start Date" under "Exclude
   by Date" is empty.
4. Click in "Start Date" (a calendar opens under it) and type
   `2026-99-99` from the keyboard. Press Tab.
5. Press "OK".
6. Open the plugin's "Settings" again and read "Start Date".
7. Click in "Start Date", select its text and type `2026-02-30`. Press
   Tab.
8. Press "OK".
9. Open "Settings" again and read "Start Date".

**Expected.** At steps 5 and 8 the window stays open, refuses the date
under the box, and saves nothing.

**Observed.** Step 5 closes the window with "Your changes have been
saved.", and at step 6 "Start Date" is empty: no start date was stored.
Step 8 closes the window with "Your changes have been saved.", and at
step 9 "Start Date" reads `2026-02-03`, the date stored.

Control: clearing "Start Date", picking the 15th in the calendar and
pressing "OK" saves `2026-10-15`. Typing `2026-03-15` saves it too.

A review's due date (a fresh dataset, after step 1):

10. Open submission 12, "Sodium butyrate improves growth performance of
    weaned piglets during the first period after weaning", stage
    "Review". Julie Janssen's review has the due date the dataset gives
    it (`2026-10-28` in pkp/datasets c0f9f10/38ab955).
11. In the "Reviewers" list, on Julie Janssen's row press "More
    Actions", then "Edit".
12. In "Edit Review", click in "Review Due Date", select its text and
    type `2026-11-31`. Press Tab, then "OK".

**Expected.** The window refuses the date, and the review keeps its due
date.

**Observed.** The window closes with no message. The review's due date
is stored as `2026-11-03` (`review_assignments.date_due`), and
`jjanssen@mailinator.com` receives "Your review assignment has been
changed for Journal of Public Knowledge":

```
Accept or Decline By: 2026-10-28
Submit Review By: 2026-11-03
```

## Cause

The date boxes of the windows run by `FormHandler` (the forms that are
not Vue components) are a visible box and a hidden copy. lib/pkp
`templates/form/textInput.tpl`
([lines 73–78](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/templates/form/textInput.tpl#L73-L78))
adds a hidden `<field>-altField` beside every box with the class
`datepicker`. `FormHandler`
([lines 64–76](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L64-L76))
attaches jQuery UI's date picker with `altField` and renames the visible
box to `<field>-removed`. So the form posts the hidden copy, in
`yy-mm-dd`, and never the text the user sees.

jQuery UI writes the hidden copy only when a day is picked in the
calendar, or after a key press that leaves text in the box that reads as
a date in the box's format (`_doKeyUp`, "only if valid"). Text that does
not read as a date leaves the copy as it was. While `2026-02-30` is
typed, `2026-02-3` reads as 3 February and is copied. The final `0`
makes the text unreadable, so 3 February stays. `2026-99-99` is never
readable, so the copy stays empty. Text put in without a key press (a
mouse paste, the browser's autofill) is never copied either.

At "OK", `FormHandler::submitHandler_()`
([lines 437–442](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L437-L442))
brings the two in line only for an empty box. Nothing checks that the box
holds a date. The server receives only the hidden copy, which is always
a real date or empty, so no server-side check can see what was typed:
the plugin's `strtotime()` check on `dateStart`
(`PflSettingsForm::__construct()`,
[line 95](https://github.com/pkp/pflPlugin/blob/622c85dcb1ac3f0f70f4d4c0584bcf97faf0f1ee/PflSettingsForm.php#L95))
never fails.

bc4f102bc7 brought in the hidden copy so that a box could show the
configured short date format while the form posts `yy-mm-dd`. Before it,
the box posted its own text. [2bad175b40](https://github.com/pkp/pkp-lib/commit/2bad175b4029df95bcadddcff4a99f15cd87fc8b)
(`pkp/pkp-lib#4216`, 2018) added the handling for an empty box.

What the stored date drives:

- A review: `EditReviewForm::execute()` emails the reviewer
  `REVIEW_EDIT` ("Submit Review By:") whenever a due date changes
  (walked). `ReviewReminder` times the review reminders from `date_due`,
  and `ReviewAssignment::getStatus()` marks the review overdue from it
  (code).
- The plugin: `PflPlugin` gives no label to an article submitted before
  `dateStart`, and counts only articles submitted from that date in the
  label's figures (acceptance, reviewers per article, days to
  publication, competing interests, funding) (code).

The windows with such a date box (all through the same `FormHandler`):

- "Edit Review": walked on `main` (steps 10–12). "Add Reviewer" and
  "Resend Review Request" ("Response Due Date", "Review Due Date"): code.
- OJS: "Date Published" in the issue window, "Open access date" on the
  issue's access tab, "Start date" and "End date" in "Create New
  Subscription" and "Edit Subscription" (individual and institutional),
  and the plugin's "Start Date" (walked): code apart from the last.
- OMP: the reviewer windows above, and a chapter's "Date Published":
  code. OPS has none of these windows.

A stored wrong date is a real date, so it cannot be told from one typed
on purpose.

## Proposed fix

In `FormHandler`, refuse a date box whose text does not read as a date
in the box's own format, and keep the hidden copy in step with the box
on every change of its text
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/form/FormHandler.js
+++ b/lib/pkp/js/controllers/form/FormHandler.js
@@ -69,7 +69,31 @@
 				altField: '#' + $this.prop('id') + '-altField',
 				altFormat: 'yy-mm-dd',
 				dateFormat: $('#' + $this.prop('id') + '-altField')
-						.attr('data-date-format')
+						.attr('data-date-format'),
+				onSelect: function() {
+					// A picked day replaces the box's text: check it again (an
+					// earlier refusal goes), and fire the change event the
+					// datepicker fires when it has no onSelect.
+					var validator = $(this).closest('form').data('validator');
+					if (validator) {
+						validator.element(this);
+					}
+					$(this).trigger('change');
+				}
+			});
+
+			// The datepicker copies a date to the altField only on a key press;
+			// text set without one (a mouse paste, autofill) is copied here.
+			$this.on('input', function() {
+				var date;
+				try {
+					date = $.datepicker.parseDate(
+							$this.datepicker('option', 'dateFormat'), $this.val());
+				} catch (e) {
+					return;
+				}
+				$('#' + $this.prop('id') + '-altField').val(
+						date ? $.datepicker.formatDate('yy-mm-dd', date) : '');
 			});
 
 			$this.prop('name', $this.prop('name') + '-removed');
@@ -124,6 +148,27 @@
 			}
 		});
 
+		// A date box must hold a date the datepicker can read: the form posts
+		// the altField, which keeps the last date the box could read.
+		if (!$.validator.methods.pkpDatepickerDate) {
+			$.validator.addMethod('pkpDatepickerDate', function(value, element) {
+				if (this.optional(element)) {
+					return true;
+				}
+				try {
+					return !!$.datepicker.parseDate(
+							$(element).datepicker('option', 'dateFormat'), value);
+				} catch (e) {
+					return false;
+				}
+			}, function() {
+				return $.validator.messages.date;
+			});
+		}
+		$form.find('.datepicker').each(function() {
+			$(this).rules('add', {pkpDatepickerDate: true});
+		});
+
 		// Activate the cancel button (if present).
 		$('[id^=\'cancelFormButton-\']', $form)
 				.click(this.callbackWrapper(this.cancelForm));
```

The three parts:

- **The rule** refuses a typed date that does not exist, before
  anything is posted. It is a jQuery Validate rule, which is how these
  forms already refuse a missing required field or a malformed web
  address. Its message is jQuery Validate's own "Please enter a valid
  date.", translated by the locale file the page already loads.
- **The `input` listener** copies a readable date into the hidden copy
  whatever put it in the box. Without it, a pasted date passes the rule
  but is not the date posted.
- **`onSelect`** checks the box again when a day is picked. jQuery
  Validate checks a box again on a key press or when it loses focus, not
  on a pick, so without this the refusal message could stay under a box
  that now holds a valid date (code). Supplying `onSelect` stops the date picker
  from firing `change` itself, so the handler fires it.

`FormHandler` owns the pair of box and hidden copy, and it is the only
layer that sees both. So one change covers every window listed in the
Cause, in all apps and plugins. The box keeps showing the configured
short format and the form keeps posting `yy-mm-dd`, which is what
bc4f102bc7 was for. An empty box still posts nothing (2bad175b40).

Tried on OJS `main`:

- With the fix in, "OK" at steps 5 and 8 leaves the window open with
  "Please enter a valid date." under "Start Date", and saves nothing.
  Picking the 15th in the calendar straight after removes the message,
  and "OK" saves `2026-10-15`.
- In "Edit Review", `2026-11-31` is refused the same way. The due date
  stays `2026-10-28` and no email is sent.
- Paths that already work give the same result with the fix in and out:
  `2026-03-15` and `2026-11-30` typed in full are saved, and an emptied
  "Start Date" saves no date.
- A date put in the box without a key press (`2026-03-20`) is saved with
  the fix in. Without it, no date is saved.

**Alternatives**

- A check on the server: the server receives only the hidden copy, so it
  cannot see the typed text.
- Posting the box's text when it does not read as a date, for the
  server to judge: every form would need its own check, and
  `strtotime('2026-02-30')` accepts it as 2 March.
- jQuery Validate's built-in `date` rule: it parses with JavaScript's
  `Date`, not the configured format, so a journal using `d.m.Y` would be
  refused real dates.
- Bringing the two in line at "OK" instead of on every change: this
  would also post a date drawn into the box by the server. pkp-e2e#53
  ("After a refused "Save", a subscription's empty date boxes show
  today's date, and "Save" says they are empty") is such a case: after a
  refused save, the server fills empty date boxes with today's date
  while the hidden copy stays empty. The proposed fix changes nothing
  there, because a date drawn by the server fires no `input` event.

**What goes with it**

- Backport: the diff applies to 3.5 as written, and to 3.4 and 3.3 with
  a two-line offset (checked with `patch --dry-run`).
- No data repair: see the end of the Cause.
- An e2e check in U13 that types an impossible "Start Date" and an
  impossible "Review Due Date", and expects the refusal.

Small: one pkp-lib file, following the forms' existing validation.

## Evidence

- Kept scripts, on PKP's default test dataset (OJS, freshly loaded
  before each walk):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date/walk.js)
  (steps 1–9 and the calendar control) and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date/neighbour.js)
  (the typed, emptied and no-key-press checks, steps 10–12 and the
  reviewer's email from Mailpit), run with
  `node bin/probe.js ojs <script>`. The fix was tried with
  `node bin/try-fix.js apply|revert fix.diff ojs`. The no-key-press
  check sets the box's text with Playwright's `fill()`, which fires
  `input` and no key events, as a paste does.
- Walked: steps 1–9 and the calendar control on OJS `main` and
  `stable-3_5_0`, with the same results. Steps 10–12 and the other
  checks on `main` only.
- Tips: OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
  pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12),
  pflPlugin [622c85dcb1](https://github.com/pkp/pflPlugin/commit/622c85dcb1ac3f0f70f4d4c0584bcf97faf0f1ee);
  OJS `stable-3_5_0` [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
  pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1),
  pflPlugin [95f7a35886](https://github.com/pkp/pflPlugin/commit/95f7a35886224f0e618bc9dd97a44177db18f005);
  OJS `stable-3_4_0` [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
  OJS `stable-3_3_0` [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
  pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
  The walks ran on PostgreSQL. The fault is in the browser, so the
  database plays no part.
- Code reads: `FormHandler.js` and `textInput.tpl` on all four lines
  (the same code); jQuery UI 1.14.1's `_doKeyUp` and `_selectDate` in
  OJS `main`. 3.4 and 3.3 ship jQuery UI 1.13.3 (`composer.json`), whose
  `_doKeyUp` was not read. The 3.4 and 3.3 app trees carry no
  `pflPlugin`. `EditReviewForm::execute()`, `ReviewReminder`,
  `ReviewAssignment::getStatus()` and `PflPlugin` on `main`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/pflPlugin and pkp/ui-library were
  searched for datepicker, invalid date, typed date, altField and due
  date. `pkp/pkp-lib#3420` (pre-filled review due dates in a
  non-default format), and `pkp/pkp-lib#4941` and `pkp/pkp-lib#5823`
  (the calendar's year range), are other faults.
