# On the PubMed and DOAJ tools' Settings tab, "Cancel" keeps the change and a later "Save" stores it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; DOAJ only)
  - 3.3: OJS (code; DOAJ, Crossref and DataCite)
- **Introduced** DOAJ: `pkp/ojs#1202` for `pkp/pkp-lib#850` · [fe63cc198d](https://github.com/pkp/ojs/commit/fe63cc198d4890540117e00666b6fc4268227b22) · 2016-10-01 · Bozana Bokan (bozana); PubMed: `pkp/ojs#4955` for `pkp/pkp-lib#11447` · [1e556c9455](https://github.com/pkp/ojs/commit/1e556c945582c375bfdeba5348a9564195c5a5d0) · 2025-06-24 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs5)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal manager changes a setting on the "Settings" tab of Tools ›
"PubMed XML Export Plugin" or "DOAJ Export Plugin", then presses
"Cancel" under the form to drop the change. Nothing happens: the typed
text and the ticked box stay, and nothing is saved yet.

The next "Save" on that form stores the change along with whatever the
manager meant to save. A DOAJ manager who ticks "OJS will deposit
articles automatically to DOAJ", presses "Cancel", then enters the API
key and saves, has turned automatic deposits on. Right after "Cancel"
the tool's other tabs open without the usual "The data on this form has
changed" question. Reloading the page before saving brings back the
saved values.

The tools with this tab are PubMed and DOAJ; 3.4 has no PubMed tool.
On 3.3 the Crossref and DataCite tools have a "Settings" tab of their
own with the same button; from 3.4 on their settings live under
Settings › Distribution › "DOIs" instead.

## Impact

- **Lost.** A setting the manager cancelled is stored by their next
  "Save", with no warning. The change stays visible in the form until
  then.
- **Who.** Journal managers on either tool's "Settings" tab who press
  "Cancel". The forms are set rarely, once per journal.
- **Way round.** Reload the page after "Cancel", or put the saved value
  back by hand before saving.

Medium: "Cancel" misleads and a later "Save" stores a setting the
manager meant to drop, but the change stays on screen and a reload
undoes it. A change stored where the form no longer shows it would make
it high.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, journal
`publicknowledge` ("DOAJ Plugin" on, as the dataset has it). Nothing
else.

PubMed:

1. Sign in as `rvaca` (Journal manager).
2. Side menu "Tools"; under "Import/Export" open "PubMed XML Export
   Plugin". The "Settings" tab is open.
3. Type "u63ojs5 NLM" into "NLM Title Abbreviation".
4. Press the "Export Articles" tab. The browser asks "The data on this
   form has changed. Do you wish to continue without saving?"; press its
   "Cancel". "Settings" stays open.
5. Press "Cancel" under the form.
6. Press "Export Articles", then "Settings".
7. Reload the page.

DOAJ:

8. Side menu "Tools"; open "DOAJ Export Plugin". The "Settings" tab is
   open.
9. Type "u63ojs5key" into "DOAJ API Key" and tick "OJS will deposit
   articles automatically to DOAJ. …".
10. Press the "Articles" tab. The browser asks the same question; press
    its "Cancel".
11. Press "Cancel" under the form.
12. Press "Articles", then "Settings".
13. Reload the page.

"Cancel", then "Save" (DOAJ, continuing):

14. Tick "OJS will deposit articles automatically to DOAJ. …".
15. Press "Cancel" under the form.
16. Press "Articles", then "Settings".
17. Type "u63ojs5key" into "DOAJ API Key".
18. Press "Articles". The browser asks the question again; press its
    "Cancel".
19. Press "Save", then reload the page.

**Expected.** "Cancel" drops the change and puts the form back to its
saved values, or the form offers no "Cancel", as the tools' export tabs
and the Profile page's tabs do not. While a change is unsaved, pressing
another tab asks. After step 19 the key is saved and the box is
unticked.

**Observed.** At step 5 nothing happens: no request is sent, nothing is
asked, and "NLM Title Abbreviation" still reads "u63ojs5 NLM". At step 6
"Export Articles" opens without asking, and back on "Settings" the box
still reads "u63ojs5 NLM". After the reload at step 7 the box is empty:
nothing was saved. Steps 11 to 13 go the same way for the key and the
box. At step 16 "Articles" opens without asking and the box is still
ticked; at step 18 the question is back. After step 19 the form shows
"Your changes have been saved.", and after the reload "DOAJ API Key"
reads "u63ojs5key" and the box is ticked. No request failed and no page
script failed.

The same holds for PubMed: "Save" after "Cancel" stores "u63ojs5 NLM".

## Cause

Both templates end the form with `{fbvFormButtons submitText="common.save"}`
([DOAJ settingsForm.tpl, line 30](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/generic/doaj/templates/settingsForm.tpl#L30);
[PubMed settingsForm.tpl, line 26](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/plugins/importexport/pubmed/templates/settingsForm.tpl#L26)).
With no `hideCancel`, `cancelAction` or `cancelUrl`,
`templates/form/formButtons.tpl` renders a bare
`<a href="#" id="cancelFormButton-…" class="cancelButton">Cancel</a>`.

`FormHandler` binds that link to `cancelForm()`
([js/controllers/form/FormHandler.js, lines 127–129](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/form/FormHandler.js#L127-L129)).
`cancelForm()` calls `unregisterForm()`, which clears
`formChangesTracked`, and triggers `formCanceled`. Only the modal
wrappers listen for that event: `AjaxModalHandler`
([js/controllers/modal/AjaxModalHandler.js, line 38](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/modal/AjaxModalHandler.js#L38)),
and ui-library's `AjaxModalWrapper.vue` (line 123) for legacy modals
opened from Vue. Both close the modal the form sits in. So "Cancel"
means "close this window", and works only in a modal.

These two forms are not in a modal. Each tool's `index.tpl` loads its
settings form into the page's "Settings" tab (`load_url_in_div`), and
the Plugins list's link for an import/export plugin redirects to that
page (`ImportExportPlugin::getActions()`). Nothing answers
`formCanceled`, and "Cancel" does only two things. The form keeps its
values, so the next "Save" posts them. And with `formChangesTracked`
cleared, a tab switch does not ask until the next edit, when
`FormHandler.formChange()` sets it again.

Reach:

- Plugin settings forms opened from the Plugins list's "Settings" link
  sit in a modal, where "Cancel" closes it: seen for "Web Feed Plugin",
  read in the code for the others.
- The Profile page's tab forms (`identityForm.tpl`, `contactForm.tpl`,
  `rolesForm.tpl`, `publicProfileForm.tpl`,
  `notificationSettingsForm.tpl`) and the tools' own export and import
  forms already set `hideCancel` (read in the code).
- 3.3: the Crossref and DataCite tools load their `settingsForm.tpl`
  into a "Settings" tab the same way, with the same button bar (read in
  the code).

## Proposed fix

Hide the button on both forms, as the other forms that sit on a page
rather than in a modal do. `pkp/pkp-lib#6654` fixed the same thing on
the change-password form in
[e141d7fb8f](https://github.com/pkp/pkp-lib/commit/e141d7fb8fdf6ecdd5d061a7126343a47fd54be7)
(`{fbvFormButtons hideCancel=true}`). The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/fix.diff):

```diff
--- a/plugins/generic/doaj/templates/settingsForm.tpl
+++ b/plugins/generic/doaj/templates/settingsForm.tpl
-	{fbvFormButtons submitText="common.save"}
+	{fbvFormButtons submitText="common.save" hideCancel=true}
--- a/plugins/importexport/pubmed/templates/settingsForm.tpl
+++ b/plugins/importexport/pubmed/templates/settingsForm.tpl
-		{fbvFormButtons submitText="common.save"}
+		{fbvFormButtons submitText="common.save" hideCancel=true}
```

Tried on `main`: both "Settings" tabs show "Save" alone; the typed change
stays until a reload, and pressing the other tab still asks "The data on
this form has changed. …". "Save" still stores both forms' values (a
reload shows them), and the "Web Feed Plugin" settings window keeps its
"Cancel", which still closes it.

**Alternatives**

- Make `FormHandler.cancelForm()` put the form back to its saved values
  when no modal listens. That is new behaviour in the shared form
  handler, made for two forms, and it would reach every form that sits
  on a page.
- Give "Cancel" a `cancelUrl` that reloads the tool's page: it works,
  but reloads the whole page to reset one box, which no other form on a
  page does.

**What goes with it**

- No stored data, REST endpoint or plugin hook changes.
- Backport: the same line in `plugins/importexport/doaj/templates/settingsForm.tpl`
  on 3.5, 3.4 and 3.3, PubMed's on 3.5, and on 3.3 the Crossref and
  DataCite `settingsForm.tpl`.
- Test: an e2e check in U63 that the tools' "Settings" tabs offer no
  "Cancel" and that a tab switch with an unsaved change asks.

Small: one attribute in each of two templates, following an existing
fix.

## Evidence

- Kept scripts, run on a freshly reset install of the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/walk.js)
    takes steps 1–13, then saves each form empty (the check of
    [U63-OJS5-tool-settings-required-note-without-required-field.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md)):
    `node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-cancel-does-nothing/walk.js`.
  - [cancel-then-save.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/cancel-then-save.js)
    takes steps 14–19, and the same for PubMed, on a fresh install
    rather than after step 13 (nothing is saved by then, so the state is
    the same):
    `node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-cancel-does-nothing/cancel-then-save.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/neighbour.js)
    checks what the fix must leave alone: "Save" on both tools, the
    "Web Feed Plugin" settings window's "Cancel", and the Profile
    "Contact" tab.
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/tool-settings-cancel-does-nothing/trial.sh)
    (`node bin/try-fix.js apply fix.diff ojs`, walk.js and neighbour.js,
    the revert, then neighbour.js without the fix).
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): walk.js on `main` and
  `stable-3_5_0`, cancel-then-save.js on `main`. The fault is in the
  browser, so it does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    and ui-library 280f98c5.
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1)
    and ui-library 1a7a4750.
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads: on 3.5 the DOAJ form is
  `plugins/importexport/doaj/templates/settingsForm.tpl`, with the same
  button bar, and `AjaxModalWrapper.vue` binds `formCanceled` at line
  114. On 3.4 and 3.3 the DOAJ file has it (line 32) and `index.tpl`
  loads it into the "Settings" tab; `FormHandler.cancelForm()` and
  `AjaxModalHandler`'s `formCanceled` binding are the same there. 3.3's
  Crossref and DataCite `settingsForm.tpl` have it at line 45. From 3.4
  on, the Crossref and DataCite tool pages only point to Settings ›
  Distribution › "DOIs" (`manager.dois.settings.relocated`).
- Introduced: `git blame` on the `fbvFormButtons` line gives fe63cc198d
  (created the DOAJ form, then under `plugins/importexport/doaj`; blame
  follows the later move) and 1e556c9455 (created PubMed's).
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by the symptom's words and by `formCanceled` and
  `hideCancel`: nothing about these forms. `pkp/pkp-lib#6654` (closed,
  fixed) is the same fault on the change-password form.
- Not driven: 3.4 and 3.3 (code only), MySQL.
