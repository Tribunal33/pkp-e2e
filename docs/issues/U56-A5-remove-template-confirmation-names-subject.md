# On "Manage Emails", "Remove" on a template a manager created names it by its subject, not its row's name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the confirmation names no template)
- **Introduced** `pkp/ui-library#227` for `pkp/pkp-lib#5716` · [20c3930eda](https://github.com/pkp/ui-library/commit/20c3930eda3e6731f5c91a359d545c931dc1f451) · 2022-11-03 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U56 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On "Manage Emails", a manager opens an email ("Submission Declined
(Pre-Review)") and presses "Remove" on a template they created for it
with "Add Template". The confirmation reads "Are you sure you want to
delete the template Your submission to {$contextName}?". It quotes the
template's subject line, with the variable `{$contextName}` unfilled,
while the row the manager pressed shows the template's name, "Short
decline u56d".

"Add Template" asks for the name and the subject in two separate boxes,
so the two differ as a rule. The installed templates differ the same
way: the default "Submission Declined (Pre-Review)" template's subject
is "Your submission has been declined". The confirmation therefore usually does
not say which template goes. Confirming still removes the row the
manager pressed.

## Impact

- **Lost**: nothing; the template whose "Remove" was pressed is the one
  removed.
- **Who**: every manager who removes a template they created; "Remove"
  is offered on no other kind of template.
- **Way round**: none needed; only the wording is wrong.

Low: the confirmation's wording misleads while the outcome is right.

## Steps to reproduce

Preconditions:

- The default dataset, `main` (OJS, OMP or OPS). Nothing else.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Workflow, press the "Emails" tab, and in the line
   "Email Templates" press "Add and edit templates". The page "Manage
   Emails" opens.
3. Type `Submission Declined (Pre-Review)` (on a preprint server
   `Submission Declined`) in the search box and press Enter. Press
   "Edit" on that email's row. Its window opens and lists one template
   under "Templates", badged "Default".
4. Press "Add Template". Type `Short decline u56d` in "Name",
   `Your submission to {$contextName}` in "Subject" and `Dear author` in
   "Body", then press "Save". The window closes, and the email's window
   lists a second row, "Short decline u56d", with "Edit" and "Remove".
5. Press "Remove" on the row "Short decline u56d".

**Expected:** the confirmation names the template the manager pressed
"Remove" on, by the name its row shows:

```
Remove Template
Are you sure you want to delete the template Short decline u56d?
```

**Observed:** the confirmation quotes the template's subject, with its
placeholder unfilled:

```
Remove Template
Are you sure you want to delete the template Your submission to {$contextName}?
[Remove Template] [Cancel]
```

With a second added template of the same subject, "Long decline u56d",
its "Remove" asks the same question word for word; "Remove Template"
then removes that row and leaves "Short decline u56d".

## Cause

The email's window lists its templates by name
(`EditMailableModal.vue`, the row's subtitle is `localize(item.name)`).
Its "Remove" emits `confirmRemoveTemplate` with that row's template,
and `ManageEmailsPage::confirmRemoveTemplate()` builds the confirmation
from the template's subject instead:

```js
message: this.i18nRemoveTemplateMessage.replace(
	'{$template}',
	this.localize(template.subject),
),
```

`manager.mailables.removeTemplate.confirm` reads "Are you sure you want
to delete the template <strong>{$template}</strong>?". The subject is
inserted as it is stored, before any variable is filled, so its
variables show as raw code. The message is rendered as sanitized HTML
(`DialogBody.vue`, `v-strip-unsafe-html`), so markup typed into a
subject is applied to the dialog's text as well.

The Email Templates list that the Manage Emails page replaced named
each template by its subject. The new page gave every template a name
and showed the name in the rows, but the remove confirmation kept the
subject.

Other places checked:

- No other screen names a template by its subject: this is the only
  `localize(….subject)` in ui-library's `src/` (code).
- The "Reset" confirmation on an email's default template names the
  email ("… for the template Submission Declined (Pre-Review)?", from
  `currentMailable.name`), even after the template's name has been
  edited. "Reset" puts the installed name back, which is that same
  name, so this dialog is right and the fix leaves it alone (on screen).

## Proposed fix

Name the template in the confirmation the way its row does, in
`lib/ui-library/src/components/Container/ManageEmailsPage.vue`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-template-confirmation-names-subject/fix.diff)):

```diff
 				message: this.i18nRemoveTemplateMessage.replace(
 					'{$template}',
-					this.localize(template.subject),
+					this.localize(template.name),
 				),
```

`name` is in the template's API summary (`schemas/emailTemplate.json`,
`apiSummary`), so every row already carries it, and `localize()` falls
back to another language the same way it does for the row. Templates
created before 3.4 got a name in the 3.4 upgrade
(`I5716_EmailTemplateAssignments::createAlternateTemplateNames()`), so
no row lacks one. Since the dialog shows the name, the subject's
unfilled `{$contextName}` no longer appears in it.

Tried on `main` in the three apps: the confirmation reads "Are you sure
you want to delete the template Short decline u56d?". With two templates
of one subject, "Remove" on the second names that one, "Remove
Template" removes only that row, and the "Reset" confirmation is
unchanged.

**Alternatives**

- Change the locale string to speak of the subject ("… the template
  with the subject …"): keeps a label the manager never sees in the
  list and still shows raw placeholders.
- Show both name and subject: longer, and the row shows only the name,
  so the name is what the manager recognizes.

**What goes with it**

- No data repair and no API change. The name goes through the same
  sanitizing (`v-strip-unsafe-html`) the subject goes through today.
- Backport: the same one line applies to `stable-3_5_0` and to
  `stable-3_4_0` (there at line 99, without the trailing comma).
- Guard: an e2e check that presses "Remove" on a template whose name
  and subject differ and reads the name in the confirmation.

Small: one line in ui-library, tried on all three apps.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/remove-template-confirmation-names-subject/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-template-confirmation-names-subject/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all <script>`
  on an install loaded from PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03), PostgreSQL; `PKP_E2E_LINE=stable-3_5_0` in
  front for 3.5, `STEPS=nb` for the second check alone (two templates
  of one subject, one removed, then "Reset" on the edited default).
- Walked: `main` and 3.5, OJS, OMP and OPS. The default template's name
  and subject in the Summary were read in its "Edit Template" window on
  the same dataset, in all three apps.
- Fix tried: `node bin/try-fix.js apply <fix.diff> ojs omp ops`, which
  rebuilds the JavaScript, then the steps and the second check with the
  fix in, and the second check again after the revert.
- Introduced: `git blame` on the line in `ManageEmailsPage.vue` gives
  7f13651e9 (2023-10-02, the Vue 3 migration), which only added the
  trailing comma; the line before it is 20c3930eda, whose PR is
  `pkp/ui-library#227` (merged 2022-11-30). The app PRs of the same
  change are `pkp/ojs#3609`, `pkp/omp#1242` and `pkp/ops#387`.
- Upstream: pkp/pkp-lib, pkp/ui-library and the three app repos
  searched; `pkp/pkp-lib#10094` (a 500 on the same "Remove") is another
  fault.
- Code reads:
  - main: `ManageEmailsPage.vue` `confirmRemoveTemplate()` and
    `confirmResetTemplate()`, `EditMailableModal.vue`, `DialogBody.vue`,
    lib/pkp `locale/en/manager.po`, `schemas/emailTemplate.json`,
    `pages/management/ManagementHandler.php` (the message strings).
  - 3.5: the same files in each app's `stable-3_5_0` checkout, the same
    line.
  - 3.4: ui-library `ee684b34` (the pointer all three apps' 3.4 tips
    record) `ManageEmailsPage.vue` line 99, `localize(template.subject)`;
    pkp-lib `templates/management/manageEmails.tpl` (OJS pointer
    767353f4fe, OMP and OPS df13621c2d) rows with `localize(item.name)`
    and `confirmRemoveTemplate(item)`.
  - 3.3: ui-library `EmailTemplatesListItem.vue` names each row by
    `localize(item.subject)`; pkp-lib `PKPEmailTemplatesListPanel`
    confirms with "Are you sure you want to delete this email
    template?", naming no template.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335),
  lib/ui-library d4e01883; `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441,
  OPS acd8ae704b, lib/pkp 767353f4fe, lib/ui-library ee684b34;
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp
  ac3fa73402, lib/ui-library 96959f9e.
- Not walked: 3.4 and 3.3 (code only). Unverified: markup in a
  subject was not typed in this walk; the HTML rendering is read in the
  code.
