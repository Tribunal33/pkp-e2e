# A typed date that does not exist is saved as another date, or not at all, with no message

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#2030` for `pkp/pkp-lib#1868` · [bc4f102bc7](https://github.com/pkp/pkp-lib/commit/bc4f102bc779d829c316b77ba566b02416d3344c) · 2016-10-20 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor or manager types a date that does not exist into a date box
and presses "OK": "2030-02-30" as a review's "Review Due Date", or
"2026-99-99" as the "Start Date" in the Publication Facts Label
settings. The window closes as after any save, with no message, but
what is stored is another date ("2030-02-03"), the date that was there
before, or no date. They expect the date to be refused.

For a review, the reviewer is emailed the wrong due date and the
reminders follow it. A date picked in the calendar, or a real date
typed, is saved correctly.

It was seen in a review's "Edit" window and in the Publication Facts
Label settings. By the code it is the same in every window whose date
box opens a calendar: adding a reviewer, an issue's data and access, a
subscription, a book chapter. A preprint server has no such window.

## Impact

- **Lost.** The date the person meant. What is stored instead depends
  on the box and the text:
  - an empty box, a text that is never a date while typed
    ("2026-99-99"): no date is stored;
  - a day past the end of the month ("2030-02-30", "2026-11-31"): the
    date read before the last key is stored ("2030-02-03",
    "2026-11-03");
  - a box that already held a date, a text that is never a date: the
    old date is kept.
- **Who.** An editor who types a review's due date and mistypes it:
  the reviewer's email "Your review assignment has been changed" says
  "Submit Review By: 2030-02-03", and the review's reminders and its
  overdue status follow the stored date. A journal manager who types
  the Publication Facts Label "Start Date".
- **Way round.** Pick the date in the calendar, or type it again
  correctly; opening the window again shows what was stored.

Medium: a date other than the one typed is stored and sent to the
reviewer while the screen reports a normal save, on a narrow input (a
typed date that does not exist) and with a way round; it would be low if
the team judges that a mistyped date's wrong due date is of no
consequence, since a date that exists always saves correctly.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`.
  Dates are shown as year-month-day (`date_format_short = "Y-m-d"`,
  the dataset's setting).
- The "Publication Facts Label plugin" is off in the dataset; step 2
  turns it on.
- For the review window on OMP: PKP's default test dataset, OMP `main`.

Every date is typed on the keyboard, key by key. A text put into the
box without key presses (a paste from the mouse menu) is not read at
all, and the box saves what it held before.

In the Publication Facts Label settings (OJS):

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › "Plugins": tick "Enabled" on "Publication Facts
   Label plugin".
3. Press the row's arrow, then "Settings".
4. Under "Exclude by Date", type "2026-99-99" in the empty "Start Date"
   and press Tab.
5. Press "OK".
6. Press "Settings" again and read "Start Date".
7. Type "2020-02-30" in "Start Date", press Tab, then "OK".
8. Press "Settings" again and read "Start Date".
9. Select the date in "Start Date", type "2026-99-99" in its place,
   press Tab, then "OK".
10. Press "Settings" again and read "Start Date".

In a review's due dates (OJS submission 12, "Sodium butyrate improves
growth performance of weaned piglets during the first period after
weaning"; on OMP submission 17, "Open Development: Networked Innovations
in International Development"):

11. Sign in as `dbarnes` and open the submission's workflow.
12. On Julie Janssen's row under "Reviewers", press "More Actions", then
    "Edit". "Response Due Date" and "Review Due Date" both hold the
    dataset's date ("2026-10-28" on the day of the walk).
13. Select the date in "Review Due Date", type "2030-02-30" in its
    place, press Tab, then "OK".
14. Press "More Actions", then "Edit" again and read "Review Due Date".

**Expected.** At steps 5, 7, 9 and 13 "OK" is refused: the window stays
open with a message beside the date box, and nothing is saved.

**Observed.** Each "OK" closes the window, and no step shows a message
about the date. In the settings window each "OK" shows:

```
Your changes have been saved.
```

- Step 6: "Start Date" is empty.
- Step 8: "Start Date" holds "2020-02-03".
- Step 10: "Start Date" still holds "2020-02-03".
- Step 14: "Review Due Date" holds "2030-02-03", on OJS and on OMP.
  "Response Due Date" is unchanged. Julie Janssen is sent "Your review
  assignment has been changed for Journal of Public Knowledge" with
  "Submit Review By: 2030-02-03".

A real date typed the same way ("2021-03-04" in "Start Date") is saved
and shown again, and an emptied "Start Date" is saved empty.

## Cause

A date box in a legacy form is two fields. `templates/form/textInput.tpl`
(pkp-lib) renders the visible box and, for the class `datepicker`, a
hidden field `<id>-altField` that carries the form's real field name.
The constructor of `$.pkp.controllers.form.FormHandler` (pkp-lib
`js/controllers/form/FormHandler.js`, lines 64–76) renames the visible
box to `<name>-removed` and sets up the jQuery UI datepicker with
`altField` pointing at the hidden field. Only the hidden field is
posted.

The hidden field is written by the datepicker alone. On each key,
jQuery UI's `_doKeyUp` parses the box in the display format and calls
`_updateAlternate` only when the text parses to a real date; a text
that does not parse is skipped without a sign. So the hidden field
holds the last text that was a date while the keys were typed: nothing
for "2026-99-99" in an empty box, "2020-02-03" for "2020-02-30" (the
text was a date at "2020-02-3"), and the stored date when an unreadable
text replaces it.

Nothing compares the two fields before the form is sent.
`FormHandler.prototype.submitHandler_` (from line 419; its datepicker
block is lines 437–442) handles one case, the emptied box, added by
2bad175b40 for `pkp/pkp-lib#4216`. The form's jQuery validation has no
rule for the visible box, and the server sees only the hidden field's
valid date or empty value, so a server check such as
`PflSettingsForm`'s on `dateStart` never meets the typed text.

The split into a visible box and a hidden posted field came with
bc4f102bc7, which made the box follow `date_format_short`. Before it,
the visible box was the posted field.

Downstream of a review's due date: `EditReviewForm::execute()` stores
the posted date, notifies the reviewer and sends `EditReviewNotify`
(template `REVIEW_EDIT`, which prints `{$reviewDueDate}`);
`ReviewReminder` and `ReviewAssignment::getStatus()` read the stored
`date_due`.

Reach, every `class="datepicker"` field in the three apps' templates:

- "Start Date" in the Publication Facts Label settings, OJS: walked.
- "Review Due Date" in a review's "Edit" window, OJS and OMP: walked.
- Read in the templates, not walked: "Response Due Date" in the same
  window, and both due dates in the "Add Reviewer" and resend-request
  forms (pkp-lib); "Date Published" in an issue's "Issue Data", the open
  access date in its "Access" form, and "Start Date" and "End Date" of
  an individual or institutional subscription (OJS); "Date Published"
  in a chapter's form (OMP).
- OPS has no template with such a field on `main`.
- Any text the datepicker does not read as a date in the display format
  goes the same way, for example a date typed in another order. jQuery
  UI updates the hidden field on key events and on a calendar pick
  only, so a text that arrives without a key press leaves it as it was.

## Proposed fix

Give the visible box a validation rule in `FormHandler`, where the two
fields are set up: a date box is valid when it is empty, when its text
is the one the page rendered, or when the datepicker can parse it. The
form's jQuery validation then refuses "OK" in the browser and shows its
own, already translated "Please enter a valid date." beside the box, as
it does for a required or a URL field. In `submitHandler_`, where the
emptied box is already handled, the hidden field is set from the box,
so that the posted value always is what the box shows
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/impossible-typed-date-saved-wrong/fix.diff),
against the app root):

```diff
--- a/lib/pkp/js/controllers/form/FormHandler.js
+++ b/lib/pkp/js/controllers/form/FormHandler.js
@@ -73,8 +73,29 @@
 			});
 
 			$this.prop('name', $this.prop('name') + '-removed');
+
+			// A date picked in the calendar is checked at once, so that a
+			// message about the text typed before it does not stay.
+			$this.change(function() {
+				$(this).valid();
+			});
 		});
 
+		// Refuse a date field whose text was changed to something the
+		// datepicker cannot read: the hidden field would otherwise post
+		// the last date it could read.
+		if (!$.validator.methods.pkpDatepicker) {
+			$.validator.addMethod('pkpDatepicker', function(value, element) {
+				return this.optional(element) ||
+						value === element.defaultValue ||
+						$.pkp.controllers.form.FormHandler
+								.parseDatepickerValue_($(element)) !== null;
+			}, function() {
+				return $.validator.messages.date;
+			});
+			$.validator.addClassRules('datepicker', {pkpDatepicker: true});
+		}
+
 
 		// Set the redirect-to URL for the cancel button (if there is one).
 		if (options.cancelRedirectUrl) {
@@ -405,6 +426,33 @@
 	// Private Methods
 	//
 	/**
+	 * Read a datepicker field's text the way the datepicker itself does
+	 * when a key is pressed: in its own format, with its own names.
+	 *
+	 * @private
+	 *
+	 * @param {jQueryObject} $field The visible datepicker field.
+	 * @return {Date} The date, or null when the text is not one.
+	 */
+	$.pkp.controllers.form.FormHandler.parseDatepickerValue_ =
+			function($field) {
+		try {
+			return $.datepicker.parseDate(
+					$field.datepicker('option', 'dateFormat'),
+					$field.prop('value'), {
+						shortYearCutoff: $field.datepicker('option', 'shortYearCutoff'),
+						dayNamesShort: $field.datepicker('option', 'dayNamesShort'),
+						dayNames: $field.datepicker('option', 'dayNames'),
+						monthNamesShort: $field.datepicker('option', 'monthNamesShort'),
+						monthNames: $field.datepicker('option', 'monthNames')
+					});
+		} catch (e) {
+			return null;
+		}
+	};
+
+
+	/**
 	 * Internal callback called after form validation to handle form
 	 * submission.
 	 *
@@ -434,10 +482,23 @@
 			return;
 		}
 
-		// For datepicker controls, ensure that empty values are respected.
+		// For datepicker controls, post what the visible field holds: an
+		// empty value, the date it was rendered with when its text is
+		// unchanged, or the date typed (the pkpDatepicker rule has checked it).
 		$(formElement).find('.datepicker').each(function() {
-			if ($(this).prop('value') === '') {
-				$('#' + $(this).prop('id') + '-altField').prop('value', '');
+			var $this = $(this), date,
+					$altField = $('#' + $this.prop('id') + '-altField');
+			if ($this.prop('value') === '') {
+				$altField.prop('value', '');
+			} else if ($this.prop('value') === $this.prop('defaultValue')) {
+				$altField.prop('value', $altField.prop('defaultValue'));
+			} else {
+				date = $.pkp.controllers.form.FormHandler
+						.parseDatepickerValue_($this);
+				if (date !== null) {
+					$altField.prop('value',
+							$.datepicker.formatDate('yy-mm-dd', date));
+				}
 			}
 		});
 
```

Three choices in it:

- The rule and `submitHandler_` parse through one helper,
  `parseDatepickerValue_`, which gives `$.datepicker.parseDate` the
  field's own format, year cutoff and day and month names: the same
  values `_doKeyUp` gets from `_getFormatConfig(inst)`, read through
  the public `option` getter instead of that private method. The rule
  and the datepicker therefore agree on what a date is.
- A box whose text is unchanged is not checked, and posts the date it
  was rendered with. `PKPString::dateformatPHP2JQueryDatepicker()`
  translates only the PHP letters `d j l m n F Y`, so an install whose
  `date_format_short` uses another letter renders a text the datepicker
  cannot parse back; without this, every such form would be refused
  with its date untouched.
- A `change` handler runs the rule when a date is picked in the
  calendar, so the message does not wait for "OK".

Tried on OJS `main`. With the fix, steps 4, 7, 9 and 13 show "Please
enter a valid date." beside the box when Tab is pressed, "OK" sends
nothing, the window stays open and the stored date is unchanged. After
"2026-99-99", a day picked in the calendar clears the message at once
and "OK" saves that day. A real date ("2021-03-04") and an emptied box
save and come back, with the fix in and out.

**Alternatives**

- Post the typed text when it does not parse and let each form's server
  check refuse it. Only some forms have such a check, and PHP's
  `strtotime()`, which `PflSettingsForm` uses, reads "2020-02-30" as
  the 1st of March, so a wrong date would still be stored.
- Correct the box to the hidden field's date when the box loses focus.
  The person would see what will be saved, but a typed "2026-99-99"
  would turn into an old date or an empty box without a reason given.

**What goes with it**

- One change in pkp-lib covers every field in the Cause's Reach, in OJS
  and OMP; no template or PHP form changes.
- On an install whose `date_format_short` the datepicker cannot parse,
  a date typed in that format is now refused, where today it is
  silently not saved; the calendar still works there. Making
  `dateformatPHP2JQueryDatepicker()` cover more letters is a separate
  change.
- Backport: `FormHandler.js` has the same blocks on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`; the diff was not tried there.
- No stored data to repair: what was saved is a valid date or none,
  and nothing marks it as unintended.
- Test: an e2e scenario that types "2030-02-30" into a review's "Review
  Due Date" and expects the window to stay open with the message.

A proposal. Small: one rule, one helper and a few lines in one shared
JavaScript file, following the validation the form already runs, tried.

## Evidence

- Kept script, which takes the Steps through the screens on installs
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps):
  [`shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk.js),
  with its helpers in `lib.js` beside it, run with
  `PROBE_FEATURE=issues-ir17 PROBE_AGENT=ir17 node bin/probe.js all shared/playwright/checks/issues/impossible-typed-date-saved-wrong/walk.js`.
  (`ONLY=ojs,omp` in front skips OPS, where the script does nothing.)
  It runs steps 1 to 14 on OJS and steps 11 to 14 on OMP, types each
  date key by key into the visible box, and records the box, the hidden
  field, any message, whether "OK" sent a save, and the stored value
  (the plugin's `dateStart` setting, the review assignment's
  `date_due`). With `neighbour` as its argument it then types
  "2021-03-04" into "Start Date" and saves, empties the box and
  saves, and types "2026-99-99", picks the 15th in the calendar and
  saves.
- The reviewer's email was read in the test install's mailbox after
  step 13 on OJS and OMP. That reminders and the overdue status follow
  the stored date is read in `ReviewReminder` and
  `ReviewAssignment::getStatus()`, not driven.
- Every save answered 200. No request failed and no page script failed
  during the walks. The review window's "OK" shows no notice of its
  own; the settings window's does.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/impossible-typed-date-saved-wrong/fix.diff ojs`,
  then `walk.js neighbour` on a freshly loaded install, then
  `node bin/try-fix.js revert` with the same diff; `walk.js neighbour`
  was also run without the fix. The fix was tried on OJS only; OMP
  shares the file unchanged (`diff` of the two checkouts' copies).
  Not tried: whether the message would stay after a calendar pick
  without the fix's `change` handler; an install with a
  `date_format_short` the datepicker cannot parse (the unchanged-text
  branch was read, not driven).
- Tips: OJS `main` bade233f73 with pkp-lib 2e377d27fc and pflPlugin
  622c85dcb1; OMP `main` 3b0ecf794 with pkp-lib 3dc90c81a6; OPS `main`
  c8af945bb7; `stable-3_5_0` OJS 92b9a16b48 and OMP 3081c9b00 with
  pkp-lib a9c76aed62; `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441,
  pkp-lib df13621c2d; `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883,
  pkp-lib d446601ebe.
- 3.5 (walked, and read): the same script on the `stable-3_5_0`
  installs, steps 1 to 14 on OJS and 11 to 14 on OMP, with the same
  results at every step. The read: `FormHandler.js` lines 54–76 and the
  datepicker block of `submitHandler_`, the same as `main`'s apart from white space.
- 3.4 and 3.3, read in the code: pkp-lib's `js/controllers/form/FormHandler.js`
  and `templates/form/textInput.tpl` on each branch hold the same
  `altField` setup and the same emptied-box block in `submitHandler_`; the review forms'
  date boxes are in pkp-lib's `editReviewForm.tpl` and
  `reviewerFormFooter.tpl`, the issue and subscription forms' in OJS,
  the chapter form's in OMP. Neither OJS branch bundles the Publication
  Facts Label plugin.
- Not looked at on screen: on 3.5, 3.4 and 3.3 pkp-lib's
  `submissionFileMetadataForm.tpl` also has a date box ("Date", in a
  file's metadata), which could bring the fault to OPS there; which
  files show that field was not read, so OPS is left out of Affects.
- Introduced: `git blame` on `FormHandler.js` lines 64–76 names
  2bad175b40 (2018, `pkp/pkp-lib#4216`, which scoped the setup to the
  form and added the emptied-box block) over bc4f102bc7, which replaced
  `$('.datepicker').datepicker({dateFormat: 'yy-mm-dd'})` with the
  hidden `altField` and the `-removed` rename, and added the hidden
  field to `textInput.tpl`. GitHub's branch list for the commit names
  pull request 2030. How an impossible date fared before 2016, when the
  box itself was posted, was not checked.
- jQuery UI: `_doKeyUp` and `parseDate` ("Invalid date") in
  `js/build/jquery-ui/jquery-ui.js` of the OJS `main` checkout.
- Every instance: `datepicker` in the `.tpl` files of the OJS, OMP and
  OPS `main` checkouts (`templates`, `plugins`, `lib/pkp/templates`),
  and the same search on the 3.5 checkouts and the 3.4 and 3.3
  branches.
- Upstream search (2026-10-01), issues and pull requests, open and
  closed: pkp/pkp-lib for "datepicker invalid date", "datepicker typed
  date", "date picker manually entered", "altField", "review due date
  wrong date typed", "FormHandler datepicker" and "date published issue
  wrong day typing"; pkp/ojs for "datepicker"; pkp/pflPlugin for
  "date"; pkp/ui-library for "datepicker invalid". Read and found to be
  other faults: `pkp/pkp-lib#4216` (closed and fixed: an emptied expiry
  date kept the old date, the same mechanism for the empty box only),
  `pkp/pkp-lib#3420` (closed: due dates wrong under a non-default
  `date_format_short`) and `pkp/pkp-lib#5823` (open: the picker is slow
  to reach old years).
- Not driven: the fields the Cause's Reach lists as read in the
  templates; a date typed in another order; a paste from the mouse menu
  (the Steps' sentence on it rests on the jQuery UI read and on
  Playwright's `fill()`, which sets the box without key presses and
  saved an empty date in this window); a
  `date_format_short` other than the dataset's `Y-m-d`; MySQL (the
  fault is in the browser and does not depend on the database).
