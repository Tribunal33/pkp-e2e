# LOCKSS and CLOCKSS pages of a subscription journal say it provides immediate open access

- **Severity** low
- **Effort** small
- **Kind** regression, long-standing: in every release since 3.0.0 (2016)
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#1463` and `pkp/ojs#841` for `pkp/pkp-lib#1397` · [96737f1130](https://github.com/pkp/pkp-lib/commit/96737f1130c2f89ba2a61332632ea07d3056bbea) and [6482428c54](https://github.com/pkp/ojs/commit/6482428c54dcb1f4c2cf0929c8a5a9f143d5561b) · 2016-05-12 · Alec Smecher (asmecher), commits by Nate Wright (NateWr); until then the row printed the journal's editable "Open Access Policy"
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U67 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U67-archiving-preservation.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a journal with LOCKSS or CLOCKSS switched on, the journal's LOCKSS
and CLOCKSS pages, public addresses anyone can open, end their
"Metadata" table with a "Rights" row: "This journal provides immediate
open access to its content on the principle that making research freely
available to the public supports a greater global exchange of
knowledge." Every new journal receives this text. No settings screen
shows it or lets anyone edit it; ticking a language for forms, or "Reload
defaults", only writes the default back.

So a journal that requires subscriptions still tells the preservation
networks it provides immediate open access. The Masthead screen tells
journals to put their access policy in "About the Journal", but the row
never shows that text.

Preservation goes on either way: the networks' software reads nothing
in the table. The proposed fix removes the row.

## Impact

- **Lost:** a true statement of the journal's rights, on a public page
  the networks' staff read. Nobody is told.
- **Who:** every journal that switches on LOCKSS or CLOCKSS and does not
  provide immediate open access (it requires subscriptions, or chose
  "OJS will not be used to publish the journal's contents online."), and
  every open access journal whose policy is not PKP's default sentence.
- **Way round:** none on screen; only a REST API call that sets
  `openAccessPolicy` changes the text.

Low: a wrong value that the networks' crawlers ignore; a network that
relied on the row as the journal's rights would raise it to medium.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. The journal "Journal of Public
  Knowledge" (`publicknowledge`) has LOCKSS and CLOCKSS switched off,
  does not require subscriptions and has no "About the Journal" text.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Distribution
   (`/index.php/publicknowledge/en/management/settings/distribution`),
   press the tab "Archiving", then the side tab "LOCKSS and CLOCKSS".
   Tick "Enable LOCKSS to store and distribute journal content at
   participating libraries via a LOCKSS Publisher Manifest page." and
   "Enable CLOCKSS to store and distribute journal content at
   participating libraries via a CLOCKSS Publisher Manifest page.", and
   press "Save".
3. Open the journal's LOCKSS page (`/index.php/publicknowledge/gateway/lockss`)
   and read the "Rights" row of the "Metadata" table.
4. Back on Settings › Distribution, press the tab "Access", choose "The
   journal will require subscriptions to access some or all of its
   contents." and press "Save".
5. Open Settings › Journal › "Masthead", type
   `u67a This journal requires a subscription to read its articles.`
   into "About the Journal" and press "Save".
6. Open the LOCKSS page and the CLOCKSS page
   (`/index.php/publicknowledge/gateway/clockss`) again and read the
   "Rights" row.
7. Open every tab of Settings › Journal, Website, Workflow and
   Distribution and look for the row's text on screen, including inside
   every text box and rich-text box; then open the journal's "About the
   Journal" page.

**Expected:** the pages carry no access statement the journal did not
write and cannot edit, so neither step 3 nor step 6 shows a "Rights"
row. Step 7 finds no field holding the text.

**Observed:** steps 3 and 6 show the same row on both pages:

```
Rights    This journal provides immediate open access to its content on the
          principle that making research freely available to the public
          supports a greater global exchange of knowledge.
```

No tab of the four Settings pages shows the text, as text or as a
field's value. The "About the Journal" page shows "u67a This journal
requires a subscription to read its articles." and not the row's text.

## Cause

OJS `templates/gateway/lockss.tpl` and `templates/gateway/clockss.tpl`,
lines 109 to 114, print the context setting `openAccessPolicy`:

```smarty
{if $journal->getLocalizedData('openAccessPolicy')}
<tr>
	<td class="label">Rights</td>
	<td class="value">{$journal->getLocalizedData('openAccessPolicy')|nl2br}</td>
</tr>
{/if}
```

That setting was retired before 3.0. Until 2016 the manager edited it
as "Open Access Policy" (OJS 2.4: Setup step 4; the 3.0 development
line: Settings › Journal › "Policies"). The settings consolidation of
`pkp/pkp-lib#1397` removed the field from `PoliciesForm` and folded the
journal's policies into one "About the Journal" text. The 3.1.0 upgrade
then copied each journal's open access policy into "About the Journal"
and deleted the setting
([1b3e4f625c](https://github.com/pkp/ojs/commit/1b3e4f625c58f21cc8f4ebbb47e084cbf1507faa),
`pkp/pkp-lib#2392`: `Upgrade::concatenateIntoAbout()`, then a `DELETE`
in `dbscripts/xml/upgrade/3.1.0_update.xml`).

The retirement missed the default and the row. New journals still
receive the default text: from `registry/journalSettings.xml` through
3.1, and since 3.2 from lib/pkp `schemas/context.json` (`defaultLocaleKey`
`default.contextSettings.openAccessPolicy`, written by
`PKPSchemaService::setDefaults()` in `PKPContextService::add()`). The
two templates still print it, whatever the journal's "Publishing Mode".

Reach:

- Other writers of the default:
  `PKPContextService::restoreLocaleDefaults()` writes every context
  default for one language, this one included, replacing what is
  stored there. It runs when a manager ticks a language's "Forms" or
  "Submissions" box (`LanguageGridHandler::saveLanguageSetting()`,
  lib/pkp `controllers/grid/languages/LanguageGridHandler.php` lines
  103 and 112) and on "Reload defaults" in Settings › Website › "Setup"
  › "Languages" (`ManageLanguageGridHandler::reloadLocale()`, line 122).
  The same calls are on 3.4 and 3.3 (checked in the code).
- Journals upgraded from 3.0 or older lost the setting in the 3.1.0
  upgrade: no "Rights" row until one of those actions writes it back.
- Readers: in OJS, lib/pkp, lib/ui-library and the bundled plugins only
  the two templates print it. The REST API's context endpoint returns
  and accepts it as a schema property, and `PKPv3_3_0UpgradeMigration`
  deletes it, with the other defaults, for languages a context does not
  use (checked in the code).
- The PKP PN plugin (`pkp/pln`, from the Plugin Gallery, not part of
  the install) sends the same text in every deposit's
  `<pkp:openAccessPolicy>`, beside a `<pkp:publishingMode>` that follows
  the journal's choice (read on GitHub, Evidence). The fix does not
  touch it.
- OMP and OPS store the same default for every new press and server
  (their `default.po`); nothing there reads it, and they have no LOCKSS
  or CLOCKSS pages (checked in the code).
- OJS's `lockssLicense` and `clockssLicense`, retired by the same
  consolidation, also still receive defaults, but nothing prints them
  (checked in the code).

## Proposed fix

Remove the "Rights" row from both templates
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archiving-pages-rights-row-says-open-access/fix.diff)):

```diff
 	<td class="value">{$journal->getLocalizedData('licenseTerms')|nl2br}</td>
 </tr>
 {/if}
-{if $journal->getLocalizedData('openAccessPolicy')}
-<tr>
-	<td class="label">Rights</td>
-	<td class="value">{$journal->getLocalizedData('openAccessPolicy')|nl2br}</td>
-</tr>
-{/if}
 </table>
```

The consolidation's intent was that a journal states its access policy
in "About the Journal", and the 3.1.0 upgrade deleted the setting for
every journal that existed then. Removing the row covers every journal
at once, with no stored data to repair and no change to the REST API or
the PN plugin.

Tried on `main`: with the fix in, the steps show no "Rights" row on
either page at steps 3 and 6. On the open access journal, both pages'
other rows, their closing lines and the site-level lists of journals
read the same with the fix in and out.

**Alternatives:**

- Print the row only while the journal's "Publishing Mode" is open
  access: no longer wrong for subscription journals, but it keeps a text
  no journal can see or edit; a product decision.
- Bring back an "Open Access Policy" field (its strings
  `manager.setup.openAccessPolicy` and its description are still in
  lib/pkp's `manager.po`): it reverses the `pkp/pkp-lib#1397`
  consolidation; a product decision.
- Stop writing the default instead (lib/pkp's context schema): stored
  texts stay printed without a migration, across all three apps.

**What goes with it:**

- Dropping the schema default in the same PR is not needed: once
  nothing prints the text, the default that new journals and language
  actions write is harmless, except that the PN plugin still deposits
  it.
- The same change applies as written to `stable-3_5_0`, `stable-3_4_0`
  and `stable-3_3_0`, whose templates hold the same lines.
- A guard in pkp-e2e's U67 suite: a journal's LOCKSS and CLOCKSS pages
  have no "Rights" row.

This is a proposal; the team decides.

Small: one block out of each of two templates, and an e2e check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archiving-pages-rights-row-says-open-access/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archiving-pages-rights-row-says-open-access/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js ojs shared/playwright/checks/issues/archiving-pages-rights-row-says-open-access/walk.js`;
  `WALK_MODE=nb` runs the neighbour check of the fix. Step 7 searches
  each tab's text, its field values (rich-text boxes included) and the
  page as served for "immediate open access" and the French default's
  "libre accès immédiat"; as a control, the same search finds the
  dataset's "Description" and the step 5 text where they are.
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default dataset
  from pkp/datasets 1a5552c (2026-10-04), with the same result on both.
  No request or page script failed (the Plugin Gallery list fails on
  these offline test installs only).
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), `stable-3_5_0` c1cee76b95 (lib/pkp 771474347e),
  `stable-3_4_0` d68934d0d1 (lib/pkp 767353f4fe), `stable-3_3_0`
  ac77c9fb35 (lib/pkp ac3fa73402).
- Code reads: `templates/gateway/lockss.tpl` and `clockss.tpl` on all
  four lines (3.4 and 3.3 with `git show upstream/stable-3_4_0:…` and
  `upstream/stable-3_3_0:…`), the same row at lines 109 to 114; lib/pkp
  `schemas/context.json`, `PKPContextService::restoreLocaleDefaults()`
  and `LanguageGridHandler` on all four (3.4 and 3.3 with `git show
  origin/stable-3_x_0:…`); every reader and writer of `openAccessPolicy`
  in OJS, lib/pkp, lib/ui-library and the bundled plugins on `main` and
  3.5, and in OMP and OPS on `main`.
- The PN plugin: `pkp/pln` `main` at 82e7b9c777,
  [classes/DepositPackage.php line 201](https://github.com/pkp/pln/blob/82e7b9c777dd517df0bd51cfcc0308edb6eedb6a/classes/DepositPackage.php#L201).
- The trace: the blamed lines 109 and 112 come from
  [43b3907299](https://github.com/pkp/ojs/commit/43b3907299b8cfd08c0903f672027fc32320beeb)
  (2018, `getLocalizedSetting()` renamed `getLocalizedData()`); before
  it the row printed the same setting since 2005. 6482428c54 is on
  `ojs-stable-3_0_0`; the OJS 2.4.6 field is in
  `templates/manager/setup/step4.tpl`. `registry/journalSettings.xml`
  still wrote the default on `ojs-stable-3_0_0` and at `3_1_2-0`, and
  43b3907299 moved it into the context schema
  ([5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) in
  lib/pkp).
- What the networks read: the report on the "Copyright" row of the same
  pages (spec U67 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U67-archiving-preservation.md#a1),
  [pkp-e2e#822](https://github.com/jardakotesovec/pkp-e2e/issues/822))
  read the LOCKSS software (`lockss/lockss-daemon`): LOCKSS checks the
  permission sentence at the foot of the page before collecting, and
  the OJS 3 plugin crawls from the issue links and reads nothing in the
  table.
- The pages open signed out (spec U67, the LOCKSS page's scenario).
- Unverified: whether CLOCKSS staff read the "Rights" row when they take
  on a journal; the REST API path was read in the code, not tried, as no
  screen sends it.
