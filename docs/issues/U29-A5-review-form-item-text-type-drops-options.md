# Switching a review form item to a text box deletes its answer options on Save, with no warning

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** a direct commit (no PR), for PKP bug 8594 ("Review forms") · [20fda33e22](https://github.com/pkp/pkp-lib/commit/20fda33e229dbea3597f598a4b794e996fc0b92b) · 2014-03-07 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U29 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager edits a review form item that offers answers to choose from
(radio buttons, checkboxes or a drop-down) and changes its "Item type" to
a text box. No warning appears, and the "Response Options" stay listed
with "Add Item" as if they were kept. "Save" reports "Your changes have
been saved." and deletes every option.

The loss shows when the manager switches the item back to a choice type,
after catching a wrong type later or while trying types out: "Response
Options" reads "No Items" and every option has to be typed again, in each
of the form's languages. The app has a text key for a warning about this
change, but nothing ever shows it.

## Impact

- **Lost**: the item's answer options, in every language, deleted
  silently on "Save". The item itself and its question are kept.
- **Who**: journal and press managers editing a review form item's type,
  an occasional task (a preprint server has no review stage, so no review
  forms). Reviewers are unaffected: a text item never shows options.
- **Way round**: none before the loss; after it, retype the options.

Medium: typed work is lost silently, and the loss is met only in a
narrow state: when the manager switches the item back to a choice type.
It would be high if forms in use lost answers reviewers had already
given, which they do not (a form in use cannot be edited).

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (`publicknowledge`, "Journal of
  Public Knowledge"); OMP the same on "Public Knowledge Press". The
  dataset holds no review form, so step 3 creates one.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Workflow › "Review" › "Review Forms"
   (`/index.php/publicknowledge/en/management/settings/workflow`).
3. Press "Create Review Form", type the Title "Peer review u29w2", press
   "Save".
4. On the new row, open its controls (the arrow) and press "Edit"; in the
   window press "Form Items", then "Create New Item".
5. Type the Item "Is the method sound? u29w2" and choose the Item type
   "Radio buttons (you can only choose one)".
6. Under "Response Options" press "Add Item", type "Yes", press Enter;
   press "Add Item", type "No", press Enter. Press "Save".
7. On the item's row press "Edit". "Response Options" lists "Yes" and
   "No".
8. Change "Item type" to "Extended text box".
9. Press "Save".
10. On the item's row press "Edit" again.
11. Change "Item type" back to "Radio buttons (you can only choose one)".

**Expected**: at step 8 the app warns that a text box has no response
options and that saving deletes them, and lets the manager cancel the
change; "Response Options" is no longer offered while a text type is
chosen.

**Observed**: step 8 shows no warning (no browser dialog was raised) and
the window still reads:

```
Item type*
Response Options
Add Item
Yes
No
```

Step 9 closes the window with "Your changes have been saved.". At step
10 the window reads "Extended text box" with "Response Options", "Add
Item" and "No Items"; the database holds no `possibleResponses` for the
item any more. Step 11 brings nothing back: "No Items".

A change between two choice types (Radio buttons to "Drop-down box")
keeps "Yes" and "No", as it should.

## Cause

The type list is never wired to the warning written for it.
`lib/pkp/templates/manager/reviewForms/reviewFormElementForm.tpl`
defines `togglePossibleResponses()` (lines 18-31), which would raise an
`alert()` with the key `manager.reviewFormElement.changeType` and disable
adding options when a type without options is chosen. Nothing calls the
function: the `{fbvElement type="select" id="elementType"}` (line 77)
carries no `onchange`, and the comments above it say what was left to
do ("when user makes a selection (onchange), warn them if necessary",
"also display/hide options list builder if appropriate", "look to see how
this is done elsewhere under the new JS framework"). The function would
fail if called, too: it disables a form control named `addResponse`,
which the form no longer has.

The key's English text has been only the stub "Changing the form item
type..." since pkp-lib 5708568f1e (2014-04-02) moved the review form
keys into the shared library; OJS 2's text was "Warning: Changing the
review form element type from a multiple-choice type to an open-ended
type will result in the deletion of the multiple choice options."

So the screen keeps listing the options whatever the type, while the
save follows the type: `ReviewFormElementForm::execute()`
(`lib/pkp/controllers/grid/settings/reviewForms/form/ReviewFormElementForm.php`,
lines 152-158) unpacks the "Response Options" list only for
`getMultipleResponsesElementTypes()` (checkboxes, radio buttons,
drop-down box) and otherwise calls `setPossibleResponses(null, null)`,
then `deleteSetting(..., 'possibleResponses')`. Deleting the options of a
text item is right; doing it without the warning the screen was meant to
give is the fault.

The warning last worked in OJS 2: its
`templates/manager/reviewForms/reviewFormElementForm.tpl` put
`onchange="togglePossibleResponses(...)"` on the type list (from 2008)
and an "addResponse" button on the form, so changing to a text type
raised the alert. On 2014-03-07 pkp-lib
[20fda33e22](https://github.com/pkp/pkp-lib/commit/20fda33e229dbea3597f598a4b794e996fc0b92b)
("Review forms bhui contribution commit (partial; with some cleanup)")
created the shared template, with a listbuilder for the options, the
function, no `onchange` and the to-do comments above; the OJS commit of
the same day deleted the OJS 2 template. The template has carried the
function unused since.

Reach:

- The same window offers "Response Options" and "Add Item" for a new item
  before any type is chosen and for a new text item (checked on screen);
  options typed there are dropped on save by the same branch (read in the
  code).
- OJS and OMP share the template and the form class (checked in the
  code); this is the only template in pkp-lib that declares a global
  function nothing calls.
- Stored data: nothing to repair. A text item with no options is what
  the save means to store.

## Proposed fix

Bind the type list in the template's own script: keep "Response Options"
shown only while a choice type is chosen, and ask before a change from a
choice type to a text type while options are listed, putting the old
type back on "Cancel". The warning's English text says what happens
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-item-text-type-drops-options/fix.diff),
against the app root, the same for OJS and OMP):

```diff
+		var multipleResponsesElementTypes = {$multipleResponsesElementTypes|json_encode},
+			$elementType = $('select[name="elementType"]', '#reviewFormElementForm'),
+			$elementOptions = $('#elementOptions'),
+			previousType = $elementType.val(),
+			usesResponses = function(type) {ldelim}
+				return $.inArray(parseInt(type, 10), multipleResponsesElementTypes) !== -1;
+			{rdelim};
+
+		$elementOptions.toggle(usesResponses(previousType));
+		$elementType.change(function() {ldelim}
+			var newType = $elementType.val();
+			if (usesResponses(previousType) && !usesResponses(newType) &&
+					$('#elementOptionsListbuilderContainer tbody tr.gridRow').length &&
+					!confirm({translate|json_encode key="manager.reviewFormElement.changeType"})) {ldelim}
+				$elementType.val(previousType);
+				return;
+			{rdelim}
+			previousType = newType;
+			$elementOptions.toggle(usesResponses(newType));
+		{rdelim});
```

```diff
 msgid "manager.reviewFormElement.changeType"
-msgstr "Changing the form item type..."
+msgstr "Warning: Changing the review form element type from a multiple-choice type to an open-ended type will result in the deletion of the multiple choice options."
```

The English text is OJS 2's own wording for this warning, restored. The
diff also removes the dead `togglePossibleResponses()`, the template's
to-do comments and the `multipleResponsesElementTypesString` that
`ReviewFormElementForm::fetch()` assigned for it alone; the script uses
`multipleResponsesElementTypes`, which `fetch()` already assigns. Saving
is unchanged: a text item still drops its options.

It brings back what OJS 2 did (warn on the change, offer options only to
the types that use them) and adds one thing: OJS 2 used `alert()`, which
only informed, while the `confirm()` here lets the manager keep the old
type with "Cancel". A `confirm()` with a translated text is how the
legacy forms already ask before losing input (`FormHandler` and
`TabHandler` with `form.dataHasChanged`, the administration page's
buttons).

Translations: of the 70 other locales in pkp-lib's `locale/`, 40 carry a
translation of the stub (German "Typ des Formularelements ändern..."),
6 already carry the full warning (Azerbaijani and Turkish in OJS 2's
English, Basque, Italian, Norwegian Bokmål and Dutch translated), 12
have an empty text and 12 lack the key (6 of them have no `manager.po`).
pkp-lib does not fall back to English (`LocaleFile::loadArray()` drops
empty texts, `Locale::translate()` returns `##key##`). With the key kept,
the 40 show their stub as the question, which never mentions deletion
until translators update it, the 6 show the full warning, and 24 show
"##manager.reviewFormElement.changeType##". A new key would show
"##…##" in all 70 until Weblate fills it. Keeping the key is
recommended: 46 locales read words at once, 6 of them the right ones,
and the 24 show the raw key either way.

Tried on OJS and OMP `main`: step 8 raised the confirmation with the
English text above, "Response Options" was hidden, and after "Save" the
reopened item showed "Extended text box" without the options list. Four
side cases, each walked with the fix in and out:

- Radio buttons changed to "Drop-down box" and saved: no question, "Yes"
  and "No" kept (the same without the fix).
- A new item given "Single line text box": no question (the same without
  the fix, where "Response Options" stays offered).
- A choice item changed to "Extended text box", then to "Checkboxes"
  before "Save": the options kept (the same without the fix).
- A choice item changed to "Extended text box" and the question answered
  "Cancel": the type went back to "Checkboxes" and the saved item kept its
  options. Without the fix nothing asks, and "Save" stores a text box and
  deletes the options, as in the Steps.

**Alternatives**

- Keep `possibleResponses` when an item is saved as a text type, so a
  switch back restores them: the options would sit stored but unused
  under a text item, and every reader of the setting (the reviewer's
  form, the review download, the review report plugin, the reviewer
  comments in emails) would have to keep ignoring them by type.
- A `FormHandler` subclass given the type lists as options, as the
  legacy forms that react to a type change do
  (`NavigationMenuItemsFormHandler`, `UserGroupFormHandler`,
  `RepresentationFormHandler`; the only inline `.change(` in
  `lib/pkp/templates` is `install.tpl`'s): the house pattern for this,
  at the cost of a new pkp-lib JavaScript file, a line in
  `registry/minifiedScripts.txt` in each of OJS, OMP and OPS, and a
  rebuild of the minified bundle. The template already runs its own
  script for this window, which a grid-code removal
  (`pkp/pkp-lib#12826`) would replace whole, so the recommendation stays
  with the twenty lines there; the team may prefer the class.
- A new key for the warning: "##…##" in all 70 other locales until
  translated (the trade-off above).

**What goes with it**

- No data repair and no API or hook change.
- Translations: the 40 stub translations need updating to the restored
  English text; the 24 empty or missing ones need a translation.
- Backport: the template is the same on 3.5, 3.4 and 3.3 apart from the
  `router=` expression on two lines outside the changed hunks, so the
  diff applies there; 3.3's English locale is `locale/en_US/manager.po`.
- A guard: spec U29's Rule 14 in the e2e campaign (a type change from a
  choice type to a text type raises the confirmation and keeps the
  options on "Cancel").

Small: one template, one English string and one line of the form class
in pkp-lib, using values the form already provides, tried on both apps.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-item-text-type-drops-options/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-item-text-type-drops-options/lib.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs,omp shared/playwright/checks/issues/review-form-item-text-type-drops-options/walk.js`
  (`MODE=nb` in front runs the four side cases alone). It records every
  browser dialog and reads the item's stored `possibleResponses` from
  `review_form_element_settings` after each save.
- The fix, tried 2026-10-04 on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/review-form-item-text-type-drops-options/fix.diff ojs`
  (then `omp`).
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets 1a5552c (2026-10-04); no server error and no script error
  was recorded, and no browser dialog without the fix:
  - main: OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library 64d67363),
    OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    (lib/pkp cf3f984335), both lib/ui-library d4e01883. The same steps
    and the same result; the template is byte-identical to `main`'s and
    `ReviewFormElementForm::execute()` the same.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441f,
  pkp-lib at 767353f4fe: the template defines `togglePossibleResponses()`
  with no `onchange` on the type list, and `ReviewFormElementForm.php`
  line 159 sets `setPossibleResponses(null, null)` for a text type.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836,
  pkp-lib at ac3fa73402: the same template, and
  `ReviewFormElementForm.inc.php` line 136 the same call.
- Introduced: `git log -S togglePossibleResponses` in pkp-lib finds
  20fda33e22 (created the shared template with the function and no
  `onchange`), 1db7507965 (2014-03-21, added a comment naming the
  function in `ReviewFormElementForm`) and 3d68ac9b71 (2016-12-16, removed
  that comment); none of them binds the type list. The OJS commit of the
  same day as 20fda33e22, 920a100879 ("Review forms bhui contribution
  commit (with some cleanup)"), deleted the OJS 2 template; read at
  920a100879^, its type list carries
  `onchange="togglePossibleResponses(...)"`, there since 37d50a37d2
  (2008, OJS bug 3547), and OJS 2's `locale/en_US/manager.xml` the full
  warning text. 5708568f1e (2014-04-02) moved the key into pkp-lib with
  the stub text. Neither 20fda33e22 nor 920a100879 has a PR (GitHub's
  `commits/<sha>/pulls` answers none).
- Translations: every `locale/<code>/manager.po` in pkp-lib `main`
  (987776cd04) read for the key, a multi-line `msgstr` counted as
  present.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched
  for "review form response options", "review form item type", "review
  form element type change", "review form options lost",
  `togglePossibleResponses`, `possibleResponses`, `changeType` and
  `reviewFormElementForm`. `pkp/pkp-lib#7954` (options could not be
  added at all, a crash fixed in 2022) and `pkp/pkp-lib#2477` (how
  reviewers' choices are stored) are other faults; `pkp/pkp-lib#12826`
  (remove grid code) would replace this window but does not mention it.
- Not driven: 3.4 and 3.3 (read in the code); MySQL not checked (the
  fault is in the page's script, not the database).
