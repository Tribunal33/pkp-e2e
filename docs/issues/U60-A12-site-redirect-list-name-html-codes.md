# Site Settings' "Journal redirect" list shows a journal named with "&" or an apostrophe as `&amp;` and `&#039;`

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; since 3.3.0-16)
- **Introduced** `pkp/pkp-lib#9306` (no PR) · [952ca777cd](https://github.com/pkp/pkp-lib/commit/952ca777cdb8b53158d62a051b5a98d93f5f7e4a) · 2023-09-15 · Alec Smecher (asmecher); 3.4 and 3.3 got it through their own backports of the same change
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U60 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a12)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Administration › "Site Settings", the "Journal redirect" list
("Press redirect", "Server redirect") writes a journal's "&" and
apostrophes as HTML codes. A journal named "Arts & Women's Studies" is
listed as `Arts &amp; Women&#039;s Studies`, while the "Bulk Emails"
tab and the "Hosted Journals" page show its real name.

The Payments settings of a journal or press have the same fault: on a
French page, the "Currency" list shows four currency names as
`Florin d&#039;Aruba` and the like. In both lists the setting saved is
the right one.

Both come from one change: an escape meant for labels the page prints
as HTML was also added to these lists, which print plain text. The fix
removes it from four labels.

## Impact

- **Lost:** nothing. The lists show names wrongly, but the journal or
  currency chosen is saved and used as it should be.
- **Who:** the Site Administrator of a site with two or more journals,
  when a journal's name holds an "&", an apostrophe, a quotation mark,
  "<" or ">". Also a journal or press manager who turns on payments
  with French as the interface language. The currency translations of
  Catalan, Italian, Finnish, Croatian, Hungarian, Dutch and Romanian
  hold such characters too.
- **Way round:** none is needed. The name is still readable.

Low: two lists show names with HTML codes, and what they save is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same, with
  "Press" and "Server" in place of "Journal").
- A second journal, which the dataset does not have. Site Settings
  shows "Journal redirect" only on a site with more than one journal.
  Step 2 creates it.

Steps:

1. Sign in as `admin`.
2. Go to Administration › "Hosted Journals" › "Create Journal". Fill in
   "Journal title" "u60h Arts & Women's Studies", "Journal initials"
   "U60HA", the principal contact's name "u60h Arts & Women's Studies"
   and email `u60ha@mailinator.com`, "Country" "Canada", "Path"
   `u60harts`, and English as a language and as the primary one. Tick
   "Enable this journal to appear publicly on the site". Press "Save".
3. Go back to Administration › "Hosted Journals" and read the new row's
   name.
4. Go to Administration › "Site Settings" › "Site Setup" › "Settings"
   and open the "Journal redirect" list.
5. Open "Site Setup" › "Bulk Emails" and read the boxes' labels.

**Expected:** at step 4, the list offers "Journal of Public Knowledge"
and "u60h Arts & Women's Studies", the names that steps 3 and 5 show.

**Observed:** at step 4, the list offers:

```
(blank)
Journal of Public Knowledge
u60h Arts &amp; Women&#039;s Studies
```

## Cause

`PKPSiteConfigForm::__construct()`
(`lib/pkp/classes/components/forms/site/PKPSiteConfigForm.php`, line
57 on `main`) builds the list's choices with
`'label' => htmlspecialchars($context->getLocalizedData('name'))`. The
list is a `FieldSelect`, which prints each label as text,
`{{ option.label }}`: in `FieldSelect.vue` on 3.3, 3.4 and 3.5, and
through `SelectInput.vue` on `main`. Vue escapes text itself, so the
name is escaped twice. PHP 8.1 and later escape the apostrophe by
default (`ENT_QUOTES`), so apostrophes are affected as well as "&",
`"`, "<" and ">".

The escape was added for `pkp/pkp-lib#9306`, "Properly escape context
name when presenting in form field". That issue was about the "Bulk
Emails" checkboxes. Their field, `FieldOptions`, prints its labels as
HTML (`v-strip-unsafe-html`), so they do need the escape. The same
commit also escaped this list. A second commit the same day,
[43e3855022](https://github.com/pkp/pkp-lib/commit/43e3855022dab1f60a48e062640a7d008e540de3)
("Add escaping to field labels"), escaped eight labels in six files.
Three of those labels feed `FieldSelect` lists: "Theme", "Currency" and
"Payment method".

Reach:

- "Currency" in Settings › Distribution › "Payments"
  (`PKPPaymentSettingsForm`), shown once payments are turned on. Its
  names come in the interface language (`Locale::getCurrencies()`). On
  the French page, four read `Florin d&#039;Aruba`,
  `Unité d&#039;investissement`, `Cordoba d&#039;or` and
  `Sum d&#039;Ouzbékistan`. This was seen on OJS and OMP `main`; OPS
  has no Payments tab. The value saved is the three-letter code, which
  the label does not touch (read in the code).
- "Payment method" in the same form: the stock names hold none of these
  characters (seen on screen). A payment plugin whose name has one would
  show it as an HTML code (read in the code).
- "Theme", in Settings › Website › Appearance and in Site Settings ›
  Appearance (`PKPThemeForm`): "Default Theme" and "Thème par défaut"
  are not affected. A theme plugin whose name has one of these
  characters would show it as an HTML code (read in the code).
- OJS 3.5, 3.4 and 3.3 only: the "Issue" list in the publication's
  issue window (`AssignToIssueForm`, a `FieldSelect`) escapes the
  issue's identification the same way, so an issue title with an "&"
  shows `&amp;` there (read in the code). `main` no longer has that
  form.
- Escaped as they should be, because they print HTML: the `FieldOptions`
  labels in "Bulk Emails" (`PKPSiteBulkEmailsForm`; seen on screen),
  `PKPRestrictBulkEmailsForm`, the users report's `ReportForm`,
  `PKPSubmissionFileForm`'s file types, and the sidebar blocks in
  `PKPAppearanceSetupForm` and `PKPSiteAppearanceForm`. Also OJS's
  `IssueEntryForm` "Issue" field on 3.5, 3.4 and 3.3: it is a
  `FieldSelectIssue`, which extends `FieldSelect` but draws no list, and
  prints the chosen label in a notice through `v-strip-unsafe-html`.
- `PKPAnnouncementForm`'s announcement type label is a `FieldOptions`
  with no escape on `main` and 3.5:
  [b0be24e79b](https://github.com/pkp/pkp-lib/commit/b0be24e79bed051ab6584f735753057c6a7db6f0)
  (`pkp/pkp-lib#9253`) dropped the escape that 43e3855022 added. It is
  outside this fix.

## Proposed fix

Proposed: remove the escape from the four labels that feed a
`FieldSelect` list in pkp-lib, and keep it on the `FieldOptions` labels
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-redirect-list-name-html-codes/fix.diff)):

```diff
--- a/lib/pkp/classes/components/forms/site/PKPSiteConfigForm.php
+++ b/lib/pkp/classes/components/forms/site/PKPSiteConfigForm.php
-                'label' => htmlspecialchars($context->getLocalizedData('name')),
+                'label' => $context->getLocalizedData('name'),
--- a/lib/pkp/classes/components/forms/context/PKPThemeForm.php
+++ b/lib/pkp/classes/components/forms/context/PKPThemeForm.php
-                'label' => htmlspecialchars($plugin->getDisplayName()),
+                'label' => $plugin->getDisplayName(),
--- a/lib/pkp/classes/components/forms/context/PKPPaymentSettingsForm.php
+++ b/lib/pkp/classes/components/forms/context/PKPPaymentSettingsForm.php
-                'label' => htmlspecialchars($currency->getLocalName()),
+                'label' => $currency->getLocalName(),
-                'label' => htmlspecialchars($plugin->getDisplayName()),
+                'label' => $plugin->getDisplayName(),
```

The other `FieldSelect` lists that take stored names already pass them
plain (OJS's `IssueEntryForm` "Section" list:
`'label' => $section['title']`). The labels that `pkp/pkp-lib#9306`
meant to protect keep their escape.

The fix was tried on all three apps on `main`. The Steps then showed
"u60h Arts & Women's Studies" in the list. A check of the nearby fields
with the fix in and out showed "Bulk Emails" unchanged, the journal
chosen in "Journal redirect" still saved and shown under its right name
after a reload, and the French "Currency" list reading "Florin
d'Aruba".

**Alternatives:**

- Decode the label in ui-library's `FieldSelect`, or print it as HTML.
  No: a list cannot hold markup, and that would undo Vue's escaping
  for every caller.
- Move all label escaping into `FieldOptions` in ui-library. That is
  cleaner in the long run, but it touches every `FieldOptions` caller
  and plugin, which is too much for this fault.

**What goes with it:**

- Backport: remove the same escapes, which these commits added:
  - 3.4: [941879f384](https://github.com/pkp/pkp-lib/commit/941879f3842a6e12a100e01de453f4c6b3cb0a60)
    (`PKPSiteConfigForm`) and
    [85b35c1052](https://github.com/pkp/pkp-lib/commit/85b35c10527dd15f3d1f1dea45a8d80da1c3a1b8)
    (the theme and payment lists).
  - 3.3: [d4111c4d0e](https://github.com/pkp/pkp-lib/commit/d4111c4d0eef783f1ed2e55654a5b83d9d527d97)
    and [f88b5d13e6](https://github.com/pkp/pkp-lib/commit/f88b5d13e6c7bdb581913cdd8d3fc397ae0499e5),
    in the `.inc.php` files.
  - On 3.5, 3.4 and 3.3, also take the escape out of OJS's two
    `AssignToIssueForm` labels. It was added by
    [844310cbbc](https://github.com/pkp/ojs/commit/844310cbbcd1b8a36a575036600480b6eddb93d3) (carried
    to 3.5),
    [471e4ff37d](https://github.com/pkp/ojs/commit/471e4ff37d5fcf2151a4b6e2c402c07cf861ca01)
    (3.4) and
    [27e59d5712](https://github.com/pkp/ojs/commit/27e59d571250c3dcc218dc07ab162115d6bf8668)
    (3.3). Leave `IssueEntryForm` as it is.
- Test: a test with a journal named with "&" and an apostrophe, checking
  the "Journal redirect" list.
- No data repair.

Small: four lines in three shared pkp-lib forms.

## Evidence

- The walk script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-redirect-list-name-html-codes/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-redirect-list-name-html-codes/lib.js))
  takes the Steps as `admin`. With the argument `neighbour`, it checks
  the nearby fields instead: the French Payments lists (after ticking
  the box that turns payments on, without saving), "Bulk Emails", and
  the redirect chosen, saved and reloaded. Run it with
  `node bin/probe.js all shared/playwright/checks/issues/site-redirect-list-name-html-codes/walk.js`.
- Walks: OJS, OMP and OPS on `main` and on `stable-3_5_0` showed the
  Observed. `main` with the fix showed the Expected.
- Not driven: 3.4 and 3.3 (read in the code); the "Theme" and
  "Payment method" lists with a plugin named with these characters; the
  OJS issue window on 3.5; a currency save; the interface languages
  other than French.
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04, ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
    ui-library 280f98c5).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e, ui-library
    d4e01883), OMP 9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335).
  - **`stable-3_4_0`** (code): pkp-lib 767353f4fe, ui-library ee684b34,
    OJS d68934d0d1.
  - **`stable-3_3_0`** (code): pkp-lib ac3fa73402, ui-library 96959f9e,
    OJS ac77c9fb35.
- Code reads beyond the Cause: every `htmlspecialchars(` in pkp-lib's
  and the three apps' `classes/components/forms`, checked against its
  field type on all four branches; `FieldSelect.vue`, `SelectInput.vue`,
  `FieldSelectIssue.vue` and `FieldOptions.vue` (`v-html` on 3.3 before
  ui-library bf37079d); `Locale::getCurrencies()`; and the currency
  translations in pkp-lib's `sokil/php-isocodes-db-i18n`, for the
  languages listed under Impact.
- The trace: `git blame` on line 57 gives 952ca777cd, which wrapped the
  plain name in `htmlspecialchars()`. On 3.3 the backport d4111c4d0e
  first shipped in 3.3.0-16.
