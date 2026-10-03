# "Cancel" on the PubMed and DOAJ tools' Settings tabs does nothing, and both forms announce required fields

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; DOAJ only, as PubMed has no Settings tab)
  - 3.3: OJS (code; DOAJ only, as PubMed has no Settings tab)
- **Introduced** DOAJ: `pkp/ojs#1202` for `pkp/pkp-lib#850` · [fe63cc198d](https://github.com/pkp/ojs/commit/fe63cc198d4890540117e00666b6fc4268227b22) · 2016-10-01 · Bozana Bokan (bozana); PubMed copied the form in `pkp/ojs#4918` (3.5) and `pkp/ojs#4955` (main) for `pkp/pkp-lib#11447` · [c1d5f94e79](https://github.com/pkp/ojs/commit/c1d5f94e79c645f028c7c7aaed666685912a32b8), [1e556c9455](https://github.com/pkp/ojs/commit/1e556c945582c375bfdeba5348a9564195c5a5d0) · 2025 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the "Settings" tab of the PubMed XML Export Plugin and of the DOAJ
Export Plugin, a journal manager who has typed a change and presses
"Cancel" under the form expects the change to be thrown away. Nothing
happens: the typed text stays in the box and no message shows.

"Cancel" does turn off one thing: the question the tool asks before
another of its tabs opens with an unsaved change. After "Cancel", the
manager can open "Export Articles" or "Articles" without being asked.
Back on "Settings", the typed text is still in the box, unsaved. Both
forms also end with "Required fields are marked with an asterisk: *",
though no field on them is required or marked with an asterisk.

## Impact

- **Lost**: nothing unless "Save" is pressed later. The cancelled text
  stays in the box until the page is reloaded, so a "Save" in the same
  visit stores it. On DOAJ, the API key box shows dots, so a cancelled
  key looks the same as the saved one.
- **Who**: everyone who can open Tools › "Import/Export": users in a
  manager-level group (by default "Journal manager" and "Journal
  editor") and site administrators. Both tools open on "Settings", so
  every visit shows the dead "Cancel" and the note.
- **Way round**: reload the page to drop a typed change.

Low: a change is stored only if "Save" is pressed after "Cancel", in
the same visit, with the change still in the form. It would be medium if
managers were found to save cancelled DOAJ keys unseen behind the dots.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. "DOAJ Plugin" is on there, so
  the Tools list shows "DOAJ Export Plugin". Nothing else is needed.

PubMed:

1. Sign in as `dbarnes`.
2. Open Tools › "Import/Export" › "PubMed XML Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/PubMedExportPlugin`).
   It opens on "Settings": "NLM Title Abbreviation" (empty), "Cancel"
   and "Save", then "Required fields are marked with an asterisk: *".
3. Type "J Pub Knowl u63ir19" in "NLM Title Abbreviation".
4. Press "Cancel" under the form.
5. Press the "Export Articles" tab.
6. Press the "Settings" tab.
7. Reload the page.

DOAJ:

8. Open Tools › "Import/Export" › "DOAJ Export Plugin". It opens on
   "Settings": "DOAJ API Key" (empty), the automatic-deposit box
   (unticked), "Cancel" and "Save", then the same note.
9. Type "u63ir19-key" in "DOAJ API Key" and tick the automatic-deposit
   box.
10. Press "Cancel".
11. Press the "Articles" tab.
12. Press the "Settings" tab, then reload the page.

**Expected**: no form has a "Cancel" that does nothing. Either "Cancel"
puts the boxes back to their saved values, or the form has no "Cancel",
like the other forms that sit on a page of their own. With the typed
change still in the box, steps 5 and 11 ask "The data on this form has
changed. Do you wish to continue without saving?". Neither form shows
the required-fields note, since no field is required.

**Observed**: steps 4 and 10 do nothing. The page sends no request, the
typed text and the ticked box stay, and no message shows. Steps 5 and 11
open the other tab without a question. At steps 6 and 12 the typed text
(and the ticked box) are still in the form. After the reload the boxes
are empty and unticked again, so nothing was saved. Both forms show
"Required fields are marked with an asterisk: *", and no field carries
an asterisk.

Control: typing in "NLM Title Abbreviation" and pressing "Export
Articles" without "Cancel" asks "The data on this form has changed. Do
you wish to continue without saving?".

## Cause

Both templates end with the default button bar and the note:

```smarty
{fbvFormButtons submitText="common.save"}
<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
```

(`plugins/generic/doaj/templates/settingsForm.tpl` and
`plugins/importexport/pubmed/templates/settingsForm.tpl`; on 3.5 and
older DOAJ's lives in `plugins/importexport/doaj/templates/`.)

`lib/pkp/templates/form/formButtons.tpl` always renders a "Cancel" link
unless `hideCancel` is set. Without a `cancelAction` or `cancelUrl` the
link is a bare `<a href="#">`, and its only behavior comes from
`FormHandler.cancelForm()` (`lib/pkp/js/controllers/form/FormHandler.js`):
it calls `unregisterForm()`, then triggers `formCanceled`. The only
listener for `formCanceled` is `AjaxModalHandler`, which closes its
modal (a file-upload wizard template also sends the event). These two
forms are not in a modal: each tool page loads its form into the
"Settings" tab (`load_url_in_div` of `settingsPluginGridHandler`,
`verb=index`). So nothing closes and nothing resets the fields.

`unregisterForm()` is also what turns off the unsaved-change question
the Summary describes. It sets `formChangesTracked` to false, which
`TabHandler.tabsBeforeActivate()` reads before asking, and triggers
`unregisterChangedForm`, which takes the form off `SiteHandler`'s list
of changed forms. Typing again in the form turns tracking back on.

The forms have no required field: `DOAJSettingsForm` and
`PubMedSettingsForm` add only the POST and CSRF checks, and no field is
marked required in the templates. The note is a leftover of the template
the form was copied from.

Reach:

- These are the only legacy settings forms loaded into a tool page's
  tab. A search of OJS, OMP and OPS templates for
  `settingsPluginGridHandler` finds only the two `index.tpl`s above
  (code).
- The same forms are not opened anywhere else. Import/export tools have
  no settings window on the Plugins list: `ImportExportPlugin::getActions()`
  links to the tool page (code).

## Proposed fix

Hide "Cancel" and drop the note in both templates
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/fix.diff)):

```diff
-	{fbvFormButtons submitText="common.save"}
-	<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
+	{fbvFormButtons submitText="common.save" hideCancel=true}
```

This is how the code base handles legacy forms that sit on a page
rather than in a modal: the native and users import/export forms, the
subscription policy and payment forms, and every user profile form but
the Password tab pass `hideCancel=true` (the Password tab's dead
"Cancel" is
[its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U03-A12-password-tab-cancel-does-nothing.md)). The forced "Change Password" form got the same
fix for the same symptom (`pkp/pkp-lib#6654`, pkp-lib e141d7fb8f).
Removing "Cancel" also keeps the unsaved-change question working, since
nothing switches it off any more.

Tried on OJS `main`: both forms then showed only "Save" and no note, and
steps 5 and 11 asked "The data on this form has changed. Do you wish to
continue without saving?". A check of the nearby behaviour, run with
the fix in and out, gave the same result both times on both tools: the
question was still asked when leaving "Settings" with a typed change,
and "Save" still saved ("Your changes have been saved.", kept after a
reload).

**Alternatives**:

- Make "Cancel" put the fields back to their saved values (a reset
  through `cancelAction`). No legacy form on a page does this, so it
  would be a new pattern for two small forms.
- Give `FormHandler.cancelForm()` a default for forms outside a modal.
  It cannot tell such forms from those whose page relies on the event,
  and it would touch every legacy form.

**What goes with it**:

- Every instance: the fix covers both settings forms that sit in a tool
  page's tab (Cause, Reach). Two other plugin settings forms carry the required-fields note with no
  required field, `plugins/generic/announcementFeed/templates/settingsForm.tpl`
  and `plugins/oaiMetadataFormats/oaiJats/templates/settingsForm.tpl`
  (code). They open in a modal from the Plugins list, where "Cancel"
  works, and are left out of this fix.
- Backport: on `stable-3_5_0` the PubMed hunk applies as written, and
  the DOAJ hunk applies with its path changed to
  `plugins/importexport/doaj/templates/settingsForm.tpl`. On
  `stable-3_4_0` and `stable-3_3_0` the two changed lines are the same,
  but a "testMode" checkbox sits just above them, so the DOAJ hunk has
  to be regenerated there.
- The guard: a browser test that the tools' Settings tabs offer no
  "Cancel" and still ask before another tab opens with a typed change.

Small: two template lines in each of two files, following an existing
pattern.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/walk.js)
  (steps 1 to 12 and the control; helpers in its `lib.js`), run on an
  install freshly loaded from PKP's default test dataset (pkp/datasets
  38ab955, 2026-09-30, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/walk.js`.
  Walked on `main` and on `stable-3_5_0`, with the same result on both.
  No request failed and no script error was logged.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs`, then `walk.js`
  and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pubmed-doaj-settings-cancel-does-nothing/neighbour.js)
  (the nearby behaviour; also run without the fix).
- A "Save" after "Cancel" was not walked. `neighbour.js` shows that
  "Save" stores what the box holds after the manager has left the tab
  and come back, and `cancelForm()` changes no field (code).
- Branch tips: OJS `main` bade233f73 (lib/pkp 2e377d27fc); OJS
  `stable-3_5_0` 92b9a16b48 (lib/pkp a9c76aed62); OJS `stable-3_4_0`
  9571d8fde7 (lib/pkp df13621c2d); OJS `stable-3_3_0` 9fdb9bcf9a (lib/pkp
  d446601ebe).
- Code reads: on `main`, the files the Cause names, plus
  `PubMedExportPlugin::manage()`, `PubObjectsExportPlugin::manage()` and
  `PKPToolsHandler` (Tools open to managers and site administrators). On
  `stable-3_5_0`, both templates (DOAJ's under
  `plugins/importexport/doaj/`). On `stable-3_4_0` and `stable-3_3_0`,
  DOAJ's `settingsForm.tpl` and `index.tpl`, `formButtons.tpl` and
  `FormHandler.js`: the form has the same "Cancel" and the same
  required-fields note, loaded into the "Settings" tab, and the same
  `cancelForm()`. The PubMed tool has no "Settings" tab there.
- Introduced: `git blame` follows DOAJ's lines through the move to
  `plugins/generic/doaj`. Whether DOAJ's "Cancel" did nothing already in
  2016 is not known; that version was not run.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  for "cancel button does nothing", "DOAJ settings cancel", "pubmed
  settings cancel", "Required fields are marked", "hideCancel",
  "cancelForm formCanceled".
- 3.4 and 3.3 were read in the code, not walked.
