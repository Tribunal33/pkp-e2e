# The PubMed and DOAJ tools' Settings forms say fields are required, though none is

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; DOAJ only)
  - 3.3: OJS (code; DOAJ and DataCite)
- **Introduced** DOAJ: `pkp/ojs#1202` for `pkp/pkp-lib#850` · [fe63cc198d](https://github.com/pkp/ojs/commit/fe63cc198d4890540117e00666b6fc4268227b22) · 2016-10-01 · Bozana Bokan (bozana); PubMed: `pkp/ojs#4955` for `pkp/pkp-lib#11447` · [1e556c9455](https://github.com/pkp/ojs/commit/1e556c945582c375bfdeba5348a9564195c5a5d0) · 2025-06-24 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs5)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

The "Settings" tabs of Tools › "PubMed XML Export Plugin" and "DOAJ
Export Plugin" end with "Required fields are marked with an asterisk:
*". No field on either form has an asterisk, and none is required: both
forms save empty with "Your changes have been saved.".

A journal manager reading the note looks for a required field that is
not there.

The tools with this tab are PubMed and DOAJ; 3.4 has no PubMed tool. On
3.3 the DataCite tool's "Settings" tab carries the same note with no
required field. From 3.4 on DataCite has no such form: its settings are
part of Settings › Distribution › "DOIs", which does not print the note.

## Impact

- **Lost.** Nothing.
- **Who.** Journal managers opening either tool's "Settings" tab.
- **Way round.** None needed.

Low: wording only.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, journal
`publicknowledge` ("DOAJ Plugin" on, as the dataset has it). Nothing
else.

1. Sign in as `rvaca` (Journal manager).
2. Side menu "Tools"; under "Import/Export" open "PubMed XML Export
   Plugin". The "Settings" tab is open.
3. Read the form: its one field, "NLM Title Abbreviation", and the line
   under "Save".
4. Leave "NLM Title Abbreviation" empty and press "Save".
5. Side menu "Tools"; open "DOAJ Export Plugin". The "Settings" tab is
   open.
6. Read the form: "DOAJ API Key", the box "OJS will deposit articles
   automatically to DOAJ. …", and the line under "Save".
7. Leave "DOAJ API Key" empty and the box unticked, and press "Save".

**Expected.** No note about required fields, since neither form has
one; or, if a field were required, an asterisk on it.

**Observed.** Under "Cancel" and "Save", both forms read:

```
Required fields are marked with an asterisk: *
```

No label carries an asterisk. Steps 4 and 7 each show "Your changes have
been saved.", with no error on the form.

## Cause

Both templates print the note unconditionally, after the button bar:
`<p><span class="formRequired">{translate key="common.requiredField"}</span></p>`
([DOAJ settingsForm.tpl, line 31](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/doaj/templates/settingsForm.tpl#L31);
[PubMed settingsForm.tpl, line 27](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/importexport/pubmed/templates/settingsForm.tpl#L27)).
No `fbvElement` in either template is `required`, and the form classes
add only `FormValidatorPost` and `FormValidatorCSRF`
(`PubMedSettingsForm::__construct()`, `DOAJSettingsForm::__construct()`).
Both forms declare every field optional: `DOAJSettingsForm::isOptional()`
lists `apiKey` and `automaticRegistration`, and
`PubMedSettingsForm::isOptional()` lists `nlmTitle`.

The DOAJ template copied its button bar and this note, in 2016, from the
DOI tools' settings forms. The PubMed template, added in 2025, copied
DOAJ's.

Reach:

- Two more forms in pkp/ojs print the note with no required field (read
  in the code):
  - the "Announcement Feed" plugin's settings,
    `plugins/generic/announcementFeed/templates/settingsForm.tpl`, line 44;
  - the JATS metadata format's settings, `templates/settingsForm.tpl`,
    line 32, in pkp/oaiJats (the `plugins/oaiMetadataFormats/oaiJats`
    submodule).
- Three forms print the note and do need a value, but mark it with no
  asterisk. That is a missing asterisk, a different fault, and is left
  out here:
  - "Web Feed Plugin" (pkp/webFeed), whose form class requires a value
    (seen on screen);
  - "Google Analytics" (pkp/googleAnalytics), the same (read in the
    code);
  - the Native XML plugin's "Import" tab
    (`plugins/importexport/native/templates/index.tpl`, line 59; also on
    3.5 and 3.4), where the import needs an uploaded file
    (`PKPNativeImportExportPlugin::display()` answers `importBounce`
    without one with a failed `JSONMessage`), and the upload has no
    asterisk (read in the code).
- The URN plugin's settings form prints the note and marks its required
  fields (read in the code).
- 3.3: the DataCite tool's `settingsForm.tpl` prints the note with no
  required field; Crossref's marks `depositorName` and `depositorEmail`
  required, so the note fits there (read in the code).
- The pkp-lib forms that print the note were not audited.

## Proposed fix

Delete the note from the two templates. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-required-note-without-required-field/fix.diff):

```diff
--- a/plugins/generic/doaj/templates/settingsForm.tpl
+++ b/plugins/generic/doaj/templates/settingsForm.tpl
 	{fbvFormButtons submitText="common.save"}
-	<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
 </form>
--- a/plugins/importexport/pubmed/templates/settingsForm.tpl
+++ b/plugins/importexport/pubmed/templates/settingsForm.tpl
 		{fbvFormButtons submitText="common.save"}
-		<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
 	</form>
```

Tried on `main`: neither "Settings" tab shows the note, and both still
save empty with "Your changes have been saved.". "Save" with a value
still stores it.

**Alternatives**

- Print the note only when a field is marked required, from pkp-lib's
  form builder (`FormBuilderVocabulary`, which renders each
  `fbvElement` with its `required` flag and the `fbvFormButtons` bar
  through `templates/form/formButtons.tpl`). It would cover every form
  at once, but the note is printed by each template today, so it is a
  new pattern and changes forms beyond these two.
- Keep the note and mark a field required: neither form needs a value
  to work (an empty DOAJ key only means no deposits).

**What goes with it**

- The same one-line deletion in the "Announcement Feed" template in
  pkp/ojs, and in pkp/oaiJats's template, which needs its own PR there
  and a submodule bump in pkp/ojs (not tried).
- No stored data, REST endpoint or plugin hook changes.
- Backport: the same line in `plugins/importexport/doaj/templates/settingsForm.tpl`
  on 3.5, 3.4 and 3.3 (line 33 on 3.4 and 3.3), PubMed's on 3.5, and
  `plugins/importexport/datacite/templates/settingsForm.tpl` (line 46)
  on 3.3.
- Test: an e2e check in U63 that the tools' "Settings" tabs carry no
  required-fields note.

Small: one line in each of two templates.

## Evidence

- Kept scripts, run on a freshly reset install of the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-required-note-without-required-field/walk.js)
    runs the walk of
    [U63-OJS5-tool-settings-cancel-does-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md),
    which reads each form's note, labels and asterisks as the form
    opens and ends with Steps 4 and 7:
    `node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-required-note-without-required-field/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/neighbour.js)
    checks what the fix must leave alone: "Save" with a value on both
    tools, the "Web Feed Plugin" settings window and the Profile
    "Contact" tab, whose "Email" and "Country" are required.
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/trial.sh)
    (`RUNS=fixnote`: `node bin/try-fix.js apply fix.diff ojs`, walk.js
    and neighbour.js, the revert, then neighbour.js without the fix).
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), on `main` and `stable-3_5_0`. The
  fault is in a template, so it does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    and pkp/oaiJats 627c48842a.
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads: on 3.5 the DOAJ form is
  `plugins/importexport/doaj/templates/settingsForm.tpl`, with the same
  note (walked). On 3.4 and 3.3 the DOAJ file prints it with no required
  field (3.3 adds a test-mode box). On `main`, 3.5 and 3.4 DataCite has
  no `settingsForm.tpl`; its settings are the `DataciteSettings` fields
  of the "DOIs" › "Registration" form. The forms in Reach were read for
  `required` in the template and for `FormValidator` checks in the form
  class.
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library: nothing about the note on forms with no required
  field. `pkp/pkp-lib#9503` (closed) and `pkp/pkp-lib#9370` (open) are
  about required fields without the note.
