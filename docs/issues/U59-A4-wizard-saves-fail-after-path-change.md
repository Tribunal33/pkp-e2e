# Settings Wizard: after a saved "Path" change, further saves and list actions fail until a reload

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · committed 2018-10-23, merged 2019-01-09 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U59 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U59-hosted-journals.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The Site Administrator changes "Path" on the Settings Wizard's "Journal"
tab and sees "Saved". Every later action on that page then fails. A
second save on the "Journal" tab, or a save on "Appearance" or "Search
Indexing", shows "Saving" and then the notice "An unexpected error has
occurred. Please reload the page and try again.", and the change is not
kept.

The lists on the page fail too. A box pressed in the "Website
Languages" list does not change, and no message shows. The same goes
for an "Enabled" box in the "Installed Plugins" list. "Users" › "Add
User" opens an "Error" window with the notice's sentence.

The path change itself is stored, and after a reload of the page every
action works. No setting narrows this: any install shows it.

## Impact

- **Lost**: the changes typed into a save that failed. The reload
  discards them, so they are typed again.
- **Who**: Site Administrators who change a journal's path on the
  Settings Wizard and go on working on the same page. A path change is
  rare. Changing the path in the "Edit" window of "Hosted Journals"
  instead does not break later actions.
- **Way round**: reload the page and do the action again.

Medium: tasks fail and there is a way round on screen. The silence of
the "Website Languages" and "Installed Plugins" boxes was weighed and
does not raise it, because a box that does not change does not look
done. It would be low if the page only showed a wrong word.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; a press or a server shows
  the same with "Hosted Presses" or "Hosted Servers", and "Press Name" or
  "Server title" for "Journal title"). Its journal `publicknowledge` has
  French (`fr_CA`) among its "Forms" languages and the "Developed By"
  block plugin switched off, which steps 7 and 8 use.

Steps:

1. Sign in as `admin`.
2. Open Administration › "Hosted Journals"
   (`/index.php/index/en/admin/contexts`), press the arrow at the start
   of the "Journal of Public Knowledge" row and choose "Settings wizard"
   (`/index.php/index/en/admin/wizard/1`).
3. On the "Journal" side tab, replace `publicknowledge` in "Path" with
   `publicknowledge2` and press "Save". "Saved" shows beside the button.
4. Wait until "Saved" has gone (about five seconds). Replace "Journal
   title" with "Journal of Public Knowledge Renamed" and press "Save".
5. Open the side tab "Search Indexing", type "u59f description" into
   "Description" and press "Save".
6. Open the side tab "Appearance" and press "Save" with nothing
   changed.
7. Open the side tab "Languages" and, in the "Website Languages" list,
   untick "Forms" on the "French/français" row (code `fr_CA`).
8. Open the top tab "Plugins" and tick "Enabled" on the ""Developed By"
   Block" row.
9. Open the top tab "Users" and press "Add User".
10. Reload the page, and take steps 4, 7, 8 and 9 again.

**Expected**: steps 4 and 5 show "Saved" and are kept; step 6 shows
"Saved", which there means only that the save was accepted. Step 7 unticks
the box and shows "Locale settings saved.", step 8 ticks the box and
shows "The plugin ""Developed By" Block" has been enabled.", and step 9
opens the "Add User" window.

**Observed**: at steps 4, 5 and 6 the button shows "Saving", "Saved"
never follows, and the page shows this notice. Nothing is stored:

```
An unexpected error has occurred. Please reload the page and try again.
```

At steps 7 and 8 the box stays as it was (ticked at 7, unticked at 8),
no message shows and nothing is stored. At step 9 a window headed
"Error" opens with the same sentence and "OK". Each request went to the
journal's old address and answered 404:

```
404 POST /index.php/publicknowledge/api/v1/contexts/1
404 POST /index.php/publicknowledge/api/v1/contexts/1/theme
404 POST /index.php/publicknowledge/$$$call$$$/grid/settings/languages/manage-language-grid/save-language-setting
404 POST /index.php/publicknowledge/$$$call$$$/grid/settings/plugins/settings-plugin-grid/enable
404 GET  /index.php/publicknowledge/$$$call$$$/grid/settings/user/user-grid/add-user
```

At step 10, after the reload, "Journal title" still reads "Journal of
Public Knowledge". The title save then shows "Saved", the two boxes
change with their messages, and "Add User" opens its window; each
request goes to `/index.php/publicknowledge2/…` and answers 200.

On the same page with "Path" left alone, a "Journal title" save and a
"Search Indexing" save both show "Saved".

## Cause

The Settings Wizard is a site-level page (`index/admin/wizard/{id}`),
but everything on it talks to the journal's own address.
`AdminHandler::wizard()` (`lib/pkp/pages/admin/AdminHandler.php`, lines
330 to 332) builds the forms' save addresses once, when the page loads,
from `$context->getPath()`: `{path}/api/v1/contexts/{id}` for the
"Journal", "Search Indexing" and "Restrict Bulk Emails" forms and
`…/theme` for "Appearance". `templates/admin/contextSettings.tpl` loads
the "Languages", "Installed Plugins", "Plugin Gallery" and "Users" lists
from `$editContext->getPath()` in the same way, and each list builds its
actions from the address it was loaded from.

The "Journal" tab's form holds the "Path" box (`PKPContextForm`, field
`urlPath`). Once a new path is saved, the journal answers only at the new
path, and an API or component request for the old one finds no context
and answers 404. Nothing on the page reacts to the change: the forms
keep their `action`, and the lists keep their addresses, until the page
is loaded again.

The page was built this way in 5f3be929e6, which replaced the earlier
settings window with this page and its Vue forms. The site-wide address
is not an alternative for the forms: `PKPContextController::edit()` and
`editTheme()` refuse it on purpose (`api.contexts.403.requiresContext`,
"the context's plugins will not be enabled").

Reach:

- The "Journal", "Search Indexing" and "Appearance" saves, the
  "Languages" and "Installed Plugins" boxes and "Users" › "Add User":
  walked on all three apps, `main` and 3.5.
- "Restrict Bulk Emails" (shown only while the site allows bulk emails
  for the journal), the second "Languages" list (submission languages),
  "Plugin Gallery" and the other actions of the lists ("Edit" on a user,
  a plugin's "Settings"): the same addresses (code).
- The "Sitemap" address in "Search Indexing"'s description is built from
  the path too and shows the old one until a reload (code).
- The "Edit" window of "Hosted Journals" is the only other place that
  holds "Path". It is built anew each time it opens, and the list's own
  actions use the journal's id, so nothing there keeps an old address
  (code; the window's save walked as the fix's control).

## Proposed fix

Reload the Settings Wizard once a save has changed the path. The page's
Vue container, `AdminPage.vue` in ui-library, already listens for
`form-success`; the saved journal's `_href` is its API address at the
path it now has, so a form whose `action` no longer starts with it sits
on a page built for the old path:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-saves-fail-after-path-change/fix.diff).

```diff
--- a/lib/ui-library/src/components/Container/AdminPage.vue
+++ b/lib/ui-library/src/components/Container/AdminPage.vue
@@ -20,10 +20,18 @@
 	mounted() {
-		pkp.eventBus.$on('form-success', (formId, site) => {
+		pkp.eventBus.$on('form-success', (formId, data) => {
 			if (formId === pkp.const.FORM_ANNOUNCEMENT_SETTINGS) {
-				this.announcementsEnabled = !!site.enableAnnouncements;
+				this.announcementsEnabled = !!data.enableAnnouncements;
 			}
+
+			// The Settings Wizard's forms and lists are built with the context's
+			// path when the page loads. Reload the page once a save has changed
+			// the path, since they would otherwise go on using the old address.
+			const form = this.components?.[formId];
+			if (form?.action && data?._href && !form.action.startsWith(data._href)) {
+				window.location.reload();
+			}
 		});
```

A reload is the one change that covers the forms and the legacy lists
together, since the lists' addresses sit in the HTML they were loaded
with. `SettingsPage.vue` does the same after the "Comments" form saves
(`FORM_CONTENT_COMMENT`), for a menu that only the server can rebuild.
The page keeps its open tab across the reload, because the tabs write
their key into the address.

Tried on `main`, all three apps. At step 3 the page reloads right after
the save (the button shows "Saving", then the page loads again with
`publicknowledge2` in "Path"), and steps 4 to 9 succeed and are stored:
each save shows "Saved", the two boxes change with their messages, and
"Add User" opens its window. Two actions the fix must leave alone were
checked with and without it. On the wizard with "Path" left alone, a "Journal
title" save and a "Search Indexing" save show "Saved" with no reload. In
the "Edit" window of "Hosted Journals", a saved new path closes the
window and does not reload the page.

**Alternatives**:

- Setting the forms' `action` from `_href` without a reload. It mends
  the Vue forms but not the lists, which would keep failing silently.
- Building the page's addresses without the path. The contexts API
  refuses edits at the site-wide address by design, and the lists'
  handlers need a context in the address, so this changes two contracts.
- Taking "Path" off the wizard's "Journal" tab and leaving it to the
  "Edit" window. A product decision, and it removes something that works.

**What goes with it**:

- No data repair. What changes: after a path-changing save, the wizard reloads instead
  of showing "Saved"; the new path in the box is the confirmation.
  Changes typed into the page's other forms and not yet saved are
  dropped by the reload without a warning. The Vue forms on this page
  register no page-leave question (`Form.vue` has none; the legacy
  `SiteHandler` one fires only for legacy forms), so leaving the page
  any other way drops them the same way today. No API or plugin hook
  changes.
- Backport: the listener is the same in 3.5's `AdminPage.vue`, so the
  diff applies there. 3.4 has the same listener in its Vue 2 component.
  3.3's `AdminPage.vue` has no `mounted()` and no `form-success`
  listener, so it needs the listener added. Both have `_href` in the
  context's answer; the optional chaining may need writing out for
  their older builds (not tried).
- Guard: an e2e scenario for spec U59 (a **Planned** item): on the
  Settings Wizard, save a new "Path", then save "Journal title" and
  expect "Saved".

Small: a few lines in one ui-library component, following the reload
`SettingsPage.vue` already does, and one test.

## Evidence

- The kept script walks the Steps. Run with `neighbour` after its path,
  it checks the two actions the fix must leave alone instead (the wizard's saves with
  "Path" left alone, and the "Edit" window's path save):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-saves-fail-after-path-change/walk.js),
  helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-saves-fail-after-path-change/lib.js).
  Run it from a pkp-e2e checkout on an install freshly loaded from the
  default dataset (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/wizard-saves-fail-after-path-change/walk.js [neighbour]`.
  Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  c657990 (2026-10-01). The fault is in the page and does not depend
  on the database.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d6736318 (OJS) and 280f98c570 (OMP, OPS). 3.5: OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3; pkp-lib cf3f984335; ui-library d4e0188353.
  3.4: pkp-lib 32b0f4b4af; ui-library ee684b34. 3.3: pkp-lib f6ab331645;
  ui-library 96959f9e.
- Code reads. `main` and 3.5: `AdminHandler::wizard()` and
  `initialize()` (the page component), `templates/admin/contextSettings.tpl`,
  `PKPContextForm.php` (the `urlPath` field), `PKPContextController::edit()`
  and `editTheme()`, `PKPContextService::getProperties()` (`_href`),
  `ContextGridHandler::editContext()` and `templates/admin/editContext.tpl`
  (a Vue app of its own, so `AdminPage`'s `components` hold no context
  form on "Hosted Journals"), ui-library `AdminPage.vue`,
  `SettingsPage.vue` and `Form.vue` (`success`; no page-leave
  question), and `SiteHandler.js` (`beforeunload`). 3.4 and 3.3:
  `AdminHandler::wizard()` builds the same two addresses from
  `$context->getPath()`, `contextSettings.tpl` loads the same lists from
  `$editContext->getPath()`, and `PKPContextForm` holds `urlPath`.
  3.4's `AdminPage.vue` has the same `form-success` listener; 3.3's has
  none.
- Introduced: `git blame` on the two address lines gives 1d84573cc5
  (2022) and e3f570bc37 (2021), which only reworded them. `git log -S`
  on `contexts/` in `AdminHandler` and the first commit of
  `contextSettings.tpl` give 5f3be929e6 ("Rebuild journal settings
  wizard"), which built the page with these addresses and the "Path" box
  together. The kind is "defect" because the page has had the fault
  since it was built; the settings window it replaced was not read.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for the settings wizard with a path or path change, a
  journal path change with an error or reload, "hosted journals" path
  404, `urlPath` wizard, `contextSettings.tpl`, `AdminHandler` wizard
  and `AdminPage`. `pkp/pkp-lib#7163` (open) is a neighbour, not this
  fault: a journal on a custom domain cannot be edited from
  Administration because the request crosses domains and fails the CSRF
  check.
- Not driven: "Restrict Bulk Emails" (it needs bulk emails allowed for
  the journal in Site Settings), the submission languages list, "Plugin
  Gallery" and the lists' other actions; the fix on 3.5; 3.4 and 3.3.
- Unverified: that the diff builds on 3.4 as written; 3.3 needs the
  listener added first.
