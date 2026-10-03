# The default "For Readers" text's "Privacy Statement" link opens the Submissions page, not the Privacy Statement page

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3682` for `pkp/pkp-lib#3575` · [8235a21f27](https://github.com/pkp/pkp-lib/commit/8235a21f27b1299a0234aee6c761d6f491b0c68a) · 2018-05-10 · Nate Wright (NateWr), which added the "Privacy Statement" page and pointed the application's own links at it, leaving the default text's link (written in 2005, [3450a690da](https://github.com/pkp/ojs/commit/3450a690da151b749aed857d2b33d5c328b5a7f2)) on the Submissions page
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U07 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The "For Readers" text every new journal and press arrives with points
readers to the journal's "Privacy Statement" through a link of that
name. A reader who opens "Information For Readers" and follows it lands
on the "Submissions" page, scrolled down to its "Privacy Statement"
section, not on the "Privacy Statement" page that the "About" menu and
the registration form open.

The reader still reads the statement, under a page headed
"Submissions". A manager can change the link in Settings › Website ›
"Setup" › "Information".

Every journal and press that holds the default text has the link, in
every language that translates it.

## Impact

- **Lost.** Nothing: the statement is on screen.
- **Who.** Readers of a journal or press that shows its "Information"
  pages and keeps the default "For Readers" text.
- **Way round.** A manager edits the link.

Low: a misleading page, nothing lost. It would rise if the site-wide
statement case under Cause showed on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` or OMP `main`. The steps
  create a journal (press), because the dataset's own stored "For
  Readers" text names the address the dataset was built on
  (`http://localhost`); its "Privacy Statement" link,
  `http://localhost/index.php/publicknowledge/about/submissions#privacyStatement`,
  opens the same page on an install served there.

1. Sign in as `admin`. Administration › "Hosted Journals" ("Hosted
   Presses") › "Create Journal" ("Create Press"): title "u07c Journal"
   ("u07c Press"), initials "u07c", contact "u07c Journal" and
   u07c@mailinator.com, country Canada, path `u07c`, English, "Enable
   this journal to appear publicly on the site" ticked. "Save".
2. Sign out. Open `/index.php/u07c/information/readers` ("Information
   For Readers"; the sidebar's "Information" block links there once a
   manager adds it).
3. Press "Privacy Statement".

Control:

4. In the top menu, open "About" › "Privacy Statement".

**Expected.** Step 3 opens the "Privacy Statement" page, as step 4
does: `/index.php/u07c/about/privacy`, headed "Privacy Statement", with
"The names and email addresses entered in this journal site will be
used exclusively for the stated purposes of this journal and will not
be made available for any other purpose or to any other party." (press:
"… entered in this press site … purposes of this press …").

**Observed.** The link is
`/index.php/u07c/about/submissions#privacyStatement`. It opens the
"Submissions" page (title "Submissions | u07c Journal"), which lists
"Author Guidelines", "Submission Preparation Checklist", "Copyright
Notice" and, last, "Privacy Statement". The browser scrolls to the
bottom, so "Privacy Statement" and its text are on screen and the
"Submissions" heading is not. Step 4 opens `/about/privacy`, "Privacy
Statement".

## Cause

The link is written into each application's default text,
`default.contextSettings.forReaders` in `locale/<lang>/default.po` (OJS
and OMP; pkp-lib has no such key):

```
See the journal's <a href="{$indexUrl}/{$contextPath}/about/submissions#privacyStatement">Privacy Statement</a>, …
```

The text is copied into the context's `readerInformation` from the
schema's defaults (`PKPSchemaService::getDefault()`) in two places:
`PKPContextService::add()` for every language when the context is
created, and `PKPContextService::restoreLocaleDefaults()` for one
language when a manager ticks "Forms" for a language
(`LanguageGridHandler`) or presses "Reload defaults" on its row
(`ManageLanguageGridHandler::reloadLocale()`).
`InformationHandler::index()` shows the stored text on
`information/readers`.

The address dates from OJS 2, when the privacy statement lived on the
Submissions page (3450a690da, 2005). In 2018 `pkp/pkp-lib#3575` gave the
statement its own page, `privacy()` in `AboutContextHandler` (later
moved to `AboutSiteHandler` by `pkp/pkp-lib#3836`, which added the
site's statement), and pointed the "Privacy Statement" menu item
(`NMI_TYPE_PRIVACY`) and every consent link (registration, the
submission and review forms, the profile forms) at `about/privacy`. The
default texts were left on the old address. Later that year
`pkp/pkp-lib#4170` added `id="privacyStatement"` to the Submissions
page's section, so the old link scrolls to the statement.

Reach:

- Every language's text, read in the code on `main`: 65 OJS and 29 OMP
  `default.po` files carry the address, OJS Uzbek twice (its "For
  Authors" text is a copy of "For Readers"). The languages that leave
  the text empty (OJS Albanian, OMP Arabic and Vietnamese) have none.
- OPS has 14 `default.po` files, 10 of which carry the address; a
  preprint server stores the text, but no page shows it.
- Journals and presses that exist keep the address in their stored
  text, and get it again in each language a manager adds for forms or
  reloads.
- When an administrator turns on one privacy statement for the whole
  site (`sitewide_privacy_statement = On` in `config.inc.php`, Off by
  default), "Privacy Statement" and the consent boxes show the site's
  statement, while the Submissions page still shows the journal's own,
  so the link shows a statement that no longer applies. Read in the
  code only.

## Proposed fix

Point the default texts' link at the "Privacy Statement" page: replace
`/about/submissions#privacyStatement` with `/about/privacy` in every
language's `default.po` of OJS, OMP and OPS. One diff per application:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/fix-ops.diff)
(the obsolete `#~` entries in five files are left alone). The English
line:

```diff
-msgstr "… See the journal's <a href=\"{$indexUrl}/{$contextPath}/about/submissions#privacyStatement\">Privacy Statement</a>, …"
+msgstr "… See the journal's <a href=\"{$indexUrl}/{$contextPath}/about/privacy\">Privacy Statement</a>, …"
```

The edit goes into each application's repository in one commit, the
English source and the translations together, as `pkp/pkp-lib#6495`
corrected these texts' addresses (2020-12-17: OJS b3fd6e30c0, 38
files; OMP ef6f845ad, 5; OPS 45d501bc07, 4). Left to Weblate, each
language would keep the old address until a translator changed it.
The Submissions page keeps its `privacyStatement` anchor, so the texts
already stored keep working.

Tried on `main`, OJS and OMP:

- On a journal and a press created after the change, "Privacy
  Statement" opened `/about/privacy`, headed "Privacy Statement".
- On the dataset's journal and press, "Reload defaults" on the English
  row as `admin` brought the link `/about/privacy`; without the fix it
  brought the old address back.
- The "Register" link of "For Readers", the four links of "For
  Authors" and the dataset journal's stored text were the same with the
  fix in and out.
- OPS's diff applies to `main` but was not walked: no page shows the
  text.

**Alternatives**

- Leave the link: the statement shows, under the wrong page.
- Build the address in code (a `{$privacyUrl}` parameter from the
  dispatcher, in `add()` and `restoreLocaleDefaults()`): it would also
  follow the install's address settings, as `disable_path_info` did
  on 3.3 (gone since 3.4). The texts' other links are fixed paths built
  from `{$indexUrl}/{$contextPath}`, and every translation would need
  the same edit to take the parameter, so the path edit is the smaller
  change in the existing pattern.

**What goes with it**

- Stored texts: no repair needed. The text is the manager's to edit,
  and a manager's "Reload defaults" or a newly added language brings the
  new link; `pkp/pkp-lib#6495` repaired none either.
- Backport: on 3.5 OMP's diff applies as written and OJS's fails one
  hunk (Spanish), which takes the same edit by hand; 3.4 and 3.3 carry
  the same address (3.3 in `locale/en_US/default.po`).
- The guard: an e2e check in pkp-e2e's U07 suite that a new journal's
  "Information For Readers" "Privacy Statement" link opens the "Privacy
  Statement" page.

Medium: three application repositories and about 104 language files,
most of them translations otherwise kept through Weblate, so the bulk
commit has to be made and merged in each repository; no data repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/lib.js).
  It takes the Steps on OJS and OMP, on an install freshly loaded from
  the default dataset, and before them reads the dataset journal's own
  "Information For Readers" link and opens its path on the install
  under test:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/for-readers-privacy-link-opens-submissions/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `MODE=nb` in
  front runs the neighbour check alone (a journal "u07cnb", its "For
  Readers" and "For Authors" links, the dataset journal's stored link);
  `MODE=reload` the "Reload defaults" check. The fix was tried with
  `node bin/try-fix.js apply …/fix-ojs.diff ojs` and `…/fix-omp.diff
  omp`, the script, the neighbour and the reload check, then `revert`,
  and the neighbour and the reload check again.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03); both lines gave the same addresses and pages.
  The database plays no part (locale files and a template).
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04), OMP 3b0ecf794c
  and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6). `stable-3_5_0`: OJS
  c1cee76b95 (`lib/pkp` 771474347e), OMP 9c5e24246c (`lib/pkp`
  cf3f984335). `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441f, `lib/pkp`
  767353f4fe. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, `lib/pkp`
  ac3fa73402.
- Code reads: `main` and 3.5, `locale/*/default.po` of the three
  applications, pkp-lib's `templates/frontend/pages/submissions.tpl`
  (the `privacyStatement` anchor), `AboutSiteHandler::privacy()`,
  `PKPNavigationMenuService` (`NMI_TYPE_PRIVACY` to `about/privacy`),
  `PKPContextService::add()` and `restoreLocaleDefaults()` with their
  callers, the apps' `InformationHandler`. 3.4: the same address in
  OJS's and OMP's `locale/en/default.po`, the same anchor and
  `AboutSiteHandler::privacy()`, `pages/information/` in both. 3.3: the
  address in both apps' `locale/en_US/default.po`, the anchor in
  `submissions.tpl`, `AboutSiteHandler.inc.php` `privacy()` with
  `sitewide_privacy_statement`, `restoreLocaleDefaults()`,
  `pages/information/` in both.
- Introduced: the line blamed to OJS b3fd6e30c0 (`pkp/pkp-lib#6495`, a
  slash fix) and, through `git log -S`, back to 3450a690da, where the
  address was right; `privacy()` traced through `git log -S` to
  8235a21f27 and 15c1290474 (`pkp/pkp-lib#3836`, the move).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched by
  "privacy statement" with "for readers" or "information block",
  `submissions#privacyStatement`, `forReaders`, `readerInformation` and
  `about/privacy`. Read: `pkp/pkp-lib#4170` (the anchor, merged),
  `pkp/pkp-lib#6495` (the slash in these addresses, closed),
  `pkp/pkp-lib#4483` (`localhost` in the dataset's addresses, closed),
  none this fault.
- Not driven: OPS (no Information pages); 3.4 and 3.3 (code only);
  other languages than English (code only).
- Unverified: the site-wide statement case under Cause.
