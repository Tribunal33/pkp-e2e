# The Payment Types form and the PubMed and DOAJ tools' Settings forms say fields are required, though none is

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; DOAJ and Payment Types)
  - 3.3: OJS (code; DOAJ, DataCite and Payment Types)
- **Introduced** DOAJ: `pkp/ojs#1202` for `pkp/pkp-lib#850` · [fe63cc198d](https://github.com/pkp/ojs/commit/fe63cc198d4890540117e00666b6fc4268227b22) · 2016-10-01 · Bozana Bokan (bozana); PubMed: `pkp/ojs#4955` for `pkp/pkp-lib#11447` · [1e556c9455](https://github.com/pkp/ojs/commit/1e556c945582c375bfdeba5348a9564195c5a5d0) · 2025-06-24 · Kaitlin Newson (kaitlinnewson); Payment Types: no PR, for `pkp/pkp-lib#1816` · [6d3fa52e52](https://github.com/pkp/ojs/commit/6d3fa52e5264a2e45e5b51453c1a93d8813a6076) · 2017-09-28 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30; Payment Types 2026-10-01)
- **Tracked in** spec U63 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs5) · spec U52 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U52-payments-and-apcs.md#a4)
- **Checked** 2026-09-30 (the tools) and 2026-10-01 (Payment Types), each branch's tip (the commits in Evidence)

## Summary

Three OJS forms show the line "Required fields are marked with an
asterisk: *" below their "Save" button: the "Settings" tabs of Tools ›
"PubMed XML Export Plugin" and "DOAJ Export Plugin", and the "Payment
Types" tab of the "Payments" page. No field on any of them has an
asterisk, and none is required: each form saves empty with "Your changes
have been saved.".

A journal manager reading the note looks for a required field that is
not there.

Both tools are on in every new journal: the PubMed tool has no on/off
switch, and the DOAJ plugin is turned on for each new journal. The side
menu offers "Payments" while payments are on. These three forms are a
sample, not the whole list: two more OJS plugin forms ("Announcement
Feed" and the JATS metadata format) print the same note with no required
field, and the forms in pkp-lib were not checked.

## Impact

- **Lost.** Nothing.
- **Who.** Journal managers opening either tool's "Settings" tab, or
  setting the journal's fees on "Payment Types".
- **Way round.** None needed.

Low: wording only.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, journal
`publicknowledge` ("DOAJ Plugin" on, as the dataset has it). Payments are
off in the dataset, and the side menu offers "Payments" only while they
are on, so steps 8 to 10 turn them on.

The tools:

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

Payment Types:

8. Side menu "Settings" › "Distribution", tab "Payments": tick
   "Enable", and choose "Manual Fee Payment" under "Payment Plugins".
9. Press "Save".
10. Side menu "Payments"; open the tab "Payment Types".
11. Read the form: "Article Processing Charge", "Purchase Issue",
    "Purchase Article", "Only Restrict Access to PDF version of issues and
    articles", "Association Membership", and the line under "Save".
12. Leave every box empty and press "Save".

**Expected.** No note about required fields, since none of the three
forms has one; or, if a field were required, an asterisk on it.

**Observed.** Under "Cancel" and "Save" on the tools, and under "Save"
on "Payment Types", the three forms read:

```
Required fields are marked with an asterisk: *
```

No label carries an asterisk. Steps 4, 7 and 12 each show "Your changes
have been saved.", with no error on the form.

## Cause

The three templates print the note unconditionally, after the button bar:
`<p><span class="formRequired">{translate key="common.requiredField"}</span></p>`
([DOAJ settingsForm.tpl, line 31](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/doaj/templates/settingsForm.tpl#L31);
[PubMed settingsForm.tpl, line 27](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/importexport/pubmed/templates/settingsForm.tpl#L27);
[paymentTypesForm.tpl, line 45](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/templates/payments/paymentTypesForm.tpl#L45)).
No `fbvElement` in any of the three templates is `required`.

On the two tools the form classes add only `FormValidatorPost` and
`FormValidatorCSRF` (`PubMedSettingsForm::__construct()`,
`DOAJSettingsForm::__construct()`), so no field is checked for a value.

On "Payment Types", `PaymentTypesForm::__construct()` checks each of the
four fees with a `FormValidatorCustom` of type `optional`
(`manager.payment.form.numeric`: a number of 0 or more when one is
given), so an empty box passes. The "Only Restrict Access to PDF…"
checkbox has no validator at all.

Reach (read in the code): among pkp/ojs's own templates outside the
plugins, the Payment Types form is the only one with this fault. Two
plugin forms have it too:

- the "Announcement Feed" plugin's settings,
  `plugins/generic/announcementFeed/templates/settingsForm.tpl`, line 44;
- the JATS metadata format's settings, `templates/settingsForm.tpl`,
  line 32, in pkp/oaiJats (the `plugins/oaiMetadataFormats/oaiJats`
  submodule).

The pkp-lib forms that print the note were not checked.

## Proposed fix

Delete the note from the three templates. The diff is
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
--- a/templates/payments/paymentTypesForm.tpl
+++ b/templates/payments/paymentTypesForm.tpl
 	{fbvFormButtons hideCancel=true submitText="common.save"}
-	<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
 </form>
```

Tried on `main`: none of the three forms shows the note, each still
saves empty and still stores a value, and "Payment Types" still refuses
"abc". The note stays on forms that do have required fields.

**Alternatives**

- Print the note only when a field is marked required, from pkp-lib's
  form builder (`FormBuilderVocabulary`, which renders each
  `fbvElement` with its `required` flag and the `fbvFormButtons` bar
  through `templates/form/formButtons.tpl`). It would cover every form
  at once, but the note is printed by each template today, so it is a
  new pattern and changes forms beyond these three.
- Keep the note and mark a field required: none of the forms needs a value
  to work (an empty DOAJ key only means no deposits).

**What goes with it**

- The same one-line deletion in the "Announcement Feed" template in
  pkp/ojs, and in pkp/oaiJats's template, which needs its own PR there
  and a submodule bump in pkp/ojs (not tried).
- Backport: the same line in `plugins/importexport/doaj/templates/settingsForm.tpl`
  on 3.5, 3.4 and 3.3 (line 33 on 3.4 and 3.3), PubMed's on 3.5, and
  `plugins/importexport/datacite/templates/settingsForm.tpl` (line 46)
  on 3.3, and `templates/payments/paymentTypesForm.tpl` (line 45) on
  3.5, 3.4 and 3.3.
- Test: an e2e check that the three forms carry no required-fields
  note.

Small: one line in each of three templates.

## Evidence

- Kept scripts, run on a freshly reset install of the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-required-note-without-required-field/walk.js)
    takes Steps 1 to 7 of this report. It runs the script it shares
    with
    [U63-OJS5-tool-settings-cancel-does-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md).
    That script reads each tool form's note, labels and asterisks as the
    form opens, then saves it empty:
    `node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-required-note-without-required-field/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/neighbour.js)
    checks what the fix must leave alone: "Save" with a value on both
    tools, the "Web Feed Plugin" settings window and the Profile
    "Contact" tab, whose "Email" and "Country" are required.
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/trial.sh)
    (`node bin/try-fix.js apply fix.diff ojs`, walk.js and neighbour.js,
    the revert, then neighbour.js without the fix).
  - [payment-types.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-required-note-without-required-field/payment-types.js)
    takes Steps 1 and 8 to 12 and reads the "Payment Types" form's
    labels, asterisks and note:
    `node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-required-note-without-required-field/payment-types.js`.
    With `neighbour` it goes on to the fix check ("abc" refused, "10"
    stored, the "Create New Subscription Type" window's note and
    asterisks); it was run with the fix applied (`node bin/try-fix.js
    apply fix.diff ojs`) and again without it.
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
- Payment Types code reads: `templates/payments/paymentTypesForm.tpl`
  and `classes/subscription/form/PaymentTypesForm.php` on `main` and 3.5
  (walked), `upstream/stable-3_4_0` and `upstream/stable-3_3_0`
  (`PaymentTypesForm.inc.php` there): the four `optional` checks are
  the same on every line. Introduced: blame on line
  45 reaches [37de9bf480](https://github.com/pkp/ojs/commit/37de9bf480090ac63554f709d41b4067cd2e0fa5)
  (2017-11-08, "Re-add moved templates", the move from
  `templates/subscriptions/`), and before the move the line is in the
  file's first commit, 6d3fa52e52, which has no PR on GitHub. OMP and
  OPS have no "Payment Types" form.
- Default install: the PubMed tool is an import/export plugin, which
  has no on/off switch (`Plugin::getEnabled()` returns true). The DOAJ
  plugin installs `enabled` true for the site and for each new journal
  (`plugins/generic/doaj/settings.xml`, through
  `DOAJPlugin::getInstallSitePluginSettingsFile()` and
  `getContextSpecificPluginSettingsFile()`). The default dataset has it
  on for `publicknowledge`.
- Code reads: on 3.5 the DOAJ form is
  `plugins/importexport/doaj/templates/settingsForm.tpl`, with the same
  note (walked). On 3.4 and 3.3 the DOAJ file prints it with no required
  field; on 3.3 the form has a third field, a "test mode" checkbox,
  which is optional too. On 3.3 the DataCite tool's
  `settingsForm.tpl` prints the note with no required field. On `main`,
  3.5 and 3.4, DataCite has no `settingsForm.tpl`; its settings are the
  `DataciteSettings` fields of the "DOIs" › "Registration" form, which
  does not print the note. The forms in Reach were read for
  `required` in the template and for `FormValidator` checks in the form
  class.
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library: nothing about the note on forms with no required
  field. `pkp/pkp-lib#9503` (closed) and `pkp/pkp-lib#9370` (open) are
  about required fields without the note. Searched again 2026-10-01 for
  the Payment Types form ("Payment Types" required, `paymentTypesForm`,
  `PaymentTypesForm`, "required fields" payment): nothing about the
  note.
