# LOCKSS and CLOCKSS pages show the "Copyright" row only when an unrelated Copyright Notice is set

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2215` for `pkp/pkp-lib#1908` · [fdff6af2e5](https://github.com/pkp/ojs/commit/fdff6af2e52edfe5dacd1cda6f2134ac627c370b) · 2019-01-16 · jmacgreg (jmacgreg); before it the row tested the setting it printed (3.1 and earlier: the Copyright Notice), and the change first shipped in 3.2.0
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#ojs1) · spec U67 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U67-archiving-preservation.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a journal with LOCKSS or CLOCKSS switched on, the journal's LOCKSS
and CLOCKSS pages have a "Copyright" row that prints the journal's
License Terms (Settings › Distribution › "License"). The row appears
only while a "Copyright Notice" is saved on Settings › Workflow ›
Submission › "Author Guidance", a separate text that submitting authors
agree to.

So a journal with License Terms and no Copyright Notice gets no
"Copyright" row on either page. A journal with a Copyright Notice and no
License Terms gets a "Copyright" row with nothing in it. The Copyright
Notice's own text appears on neither page.

Preservation goes on either way. The archiving software both networks
use crawls from the page's links to the issues and reads nothing in its
table, and LOCKSS accepts the journal by the permission sentence at the
foot of the page, which is always there.

## Impact

- **Lost:** the journal's licensing statement in the page's "Metadata"
  table, which people at the archiving networks can read. Nobody is
  told. What the networks collect does not change: their OJS plugin
  crawls from the page's links to the year's issues, and LOCKSS accepts
  the journal by the sentence "LOCKSS system has permission to collect,
  preserve, and serve this Archival Unit."; neither depends on the row.
- **Who:** every journal that switches on LOCKSS or CLOCKSS and has only
  one of the two texts set.
- **Way round:** save any Copyright Notice, and the row shows the
  License Terms. A journal whose row is there but empty can fill it by
  saving License Terms; the only way to remove the empty row instead is
  to empty the Copyright Notice, which also takes the notice off the
  submission form.

Low: the "Copyright" row is missing when License Terms are set, or
empty when they are not, and preservation is unaffected.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. The journal "Journal of Public
  Knowledge" (`publicknowledge`) has LOCKSS and CLOCKSS switched off, no
  License Terms and no Copyright Notice.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Distribution
   (`/index.php/publicknowledge/en/management/settings/distribution`),
   press the tab "Archiving", then the side tab "LOCKSS and CLOCKSS".
3. Tick "Enable LOCKSS to store and distribute journal content at
   participating libraries via a LOCKSS Publisher Manifest page." and
   the same box under "CLOCKSS", and press "Save".
4. Press the tab "License", type `u58d License Terms: CC BY 4.0.` into
   "License Terms" and press "Save".
5. Open the journal's LOCKSS page (`/index.php/publicknowledge/gateway/lockss`)
   and read the "Metadata" table; then the CLOCKSS page
   (`/index.php/publicknowledge/gateway/clockss`).
6. Open Settings › Workflow › "Submission" › "Author Guidance", type
   `u58d Copyright Notice: authors keep the copyright.` into "Copyright
   Notice" and press "Save".
7. Open the LOCKSS and CLOCKSS pages again and read the "Metadata" table.
8. Back on Settings › Distribution › "License", empty "License Terms" and
   press "Save".
9. Open the LOCKSS and CLOCKSS pages again and read the "Metadata" table.

**Expected:** the "Copyright" row is there whenever there are License
Terms to print. Steps 5 and 7 show the row "Copyright" reading
"u58d License Terms: CC BY 4.0." on both pages; step 9 shows no
"Copyright" row.

**Observed:** step 5 shows no "Copyright" row on either page; the table's
rows are "Journal URL", "Title", "Publisher", "Description", "ISSN",
"Language(s)", "Publisher Email", "Rights". Step 7 shows the row
"Copyright" between "Publisher Email" and "Rights", reading
"u58d License Terms: CC BY 4.0."; the Copyright Notice's text is on
neither page. Step 9 still shows the row "Copyright", with an empty value.

## Cause

OJS `templates/gateway/lockss.tpl` and `templates/gateway/clockss.tpl`,
line 103, guard the row with one setting and print another:

```smarty
{if $journal->getLocalizedData('copyrightNotice')}
<tr>
	<td class="label">Copyright</td>
	<td class="value">{$journal->getLocalizedData('licenseTerms')|nl2br}</td>
</tr>
{/if}
```

The value is the intended one. Until 3.1 a journal had one copyright
text, the Copyright Notice, and the row guarded and printed it. The
settings-forms rewrite for 3.2 (`pkp/pkp-lib#3594`) split it into a
"Copyright Notice" for submitting authors and "License Terms" to show
with published content (`pkp/pkp-lib#3562`). There the maintainers ruled
that the manifest pages use `licenseTerms`, "they're to be displayed
with the content", and commit
[43b3907299](https://github.com/pkp/ojs/commit/43b3907299b8cfd08c0903f672027fc32320beeb)
changed both the guard and the value to `licenseTerms`.

Three months later the LOCKSS fix for `pkp/pkp-lib#1908` was written on
OJS 3.1.1 (`pkp/ojs#2215`), where the row still guarded and printed
`copyrightNotice`. Its forward-port to `master`,
[fdff6af2e5](https://github.com/pkp/ojs/commit/fdff6af2e52edfe5dacd1cda6f2134ac627c370b),
brought the 3.1 guard back on line 103 and kept `master`'s value, in both
templates.

Reach:

- The two templates are the only place that tests `copyrightNotice` and
  prints something else (checked in the code: OJS, `lib/pkp`, the
  bundled plugins). The other readers of `copyrightNotice` are the
  "Submissions" page, the submission form's confirmation and
  `PKPSubmissionController::submit()`, which copies the notice into the
  event log when the author agrees to it. All three are about the
  author's agreement, and the fix touches none of them.
- The RSS 1.0 and 2.0 feeds guard and print `licenseTerms` in their
  copyright element. The article page's licence block guards on
  `licenseTerms` or the publication's `licenseUrl`, because it prints
  both (checked in the code).
- The site-level LOCKSS and CLOCKSS pages, which list the journals, have
  no "Metadata" table and are not affected.
- OMP and OPS have no such pages: `gateway/lockss` answers 404 (checked on
  screen, `main` and 3.5).

## Proposed fix

Guard the row with the setting it prints, in both templates
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archiving-pages-copyright-row-license-terms/fix.diff)):

```diff
-{if $journal->getLocalizedData('copyrightNotice')}
+{if $journal->getLocalizedData('licenseTerms')}
 <tr>
 	<td class="label">Copyright</td>
 	<td class="value">{$journal->getLocalizedData('licenseTerms')|nl2br}</td>
```

The table's other guarded rows ("Publisher", "Description", "ISSN",
"Publisher Email", "Rights") each test the setting they print, as do
the RSS feeds' copyright element. The article page tests `licenseTerms`
or `licenseUrl` because it also prints the publication's licence link;
the row prints only the journal's License Terms, so testing
`licenseUrl` too would bring the empty row back.

Tried on `main`: with the fix in, the steps show the row with the
License Terms at steps 5 and 7 and no row at step 9. With neither text
set, both pages' tables and the site-level lists of journals read the
same with the fix in and out.

**Alternatives:**

- Print the Copyright Notice in the row, as 3.1 did: it goes against the
  `pkp/pkp-lib#3562` ruling, and the notice is the long, author-facing
  agreement rather than the licence of the published content.
- Also print the journal's default licence (the "License" choice on the
  same tab) in the row, and guard on either: new content on a page
  preservation networks read, so a decision for the team, not needed to
  fix the guard.
- Rename the row "License" to match the setting: a change to the words of
  a page that CLOCKSS staff checked in `pkp/pkp-lib#1908`; not needed
  for the fix.

**What goes with it:**

- No data repair: both settings are stored correctly.
- The same two-line change applies as written to `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, whose templates hold the same line.
- A guard in pkp-e2e's U67 suite: a journal with License Terms and no
  Copyright Notice shows the "Copyright" row on both pages.

This is a proposal; the team decides.

Small: one condition in each of two templates, following the table's own
pattern, and an e2e check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archiving-pages-copyright-row-license-terms/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archiving-pages-copyright-row-license-terms/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/archiving-pages-copyright-row-license-terms/walk.js`;
  `WALK_MODE=nb` runs the neighbour check (steps 1 to 3, then every row of
  both tables and the site-level lists).
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default dataset
  from pkp/datasets 566bb1f (2026-10-03). The 3.5 walk showed the same
  three states at steps 5, 7 and 9. No request failed and no page script
  failed on either line.
- Tips: OJS `main` ff004d0973, `stable-3_5_0` c1cee76b95,
  `stable-3_4_0` d68934d0d1, `stable-3_3_0` ac77c9fb35.
- Code reads: `templates/gateway/lockss.tpl` and `clockss.tpl` on all four
  lines (3.4 and 3.3 read with `git show upstream/stable-3_4_0:…` and
  `upstream/stable-3_3_0:…`), each with the same guard and value on lines
  103 and 106; on `ojs-stable-3_1_1` and `stable-3_1_2` the row guards
  and prints `copyrightNotice`; the `licenseTerms` and `copyrightNotice`
  fields in `lib/pkp` `PKPLicenseForm`, `SubmissionGuidanceSettings`
  (3.3: `PKPAuthorGuidelinesForm`); every reader of the two settings in
  OJS, `lib/pkp` and the bundled plugins on `main`.
- The trace: fdff6af2e5 is on `master` with no PR of its own; it is the
  forward-port of 22f1d220da, merged into `ojs-stable-3_1_1` through
  `pkp/ojs#2215` (`pkp/pkp-lib#1908`: "Merged and forward-ported"). The
  first tag holding the mismatch is `3_2_0-0`.
- What the networks read, from the LOCKSS software (`lockss/lockss-daemon`
  `master`): `src/org/lockss/daemon/LockssPermission.java` accepts a
  page by the permission sentence (or a Creative Commons licence link);
  `plugins/src/org/lockss/plugin/ojs3/Ojs3Plugin.xml` and
  `ClockssOjs3Plugin.xml` start the crawl at `gateway/lockss?year=…`
  (`gateway/clockss?year=…`) and follow the issue links; no file of the
  OJS 3 plugin refers to the "Metadata" table or its "Copyright" row.
- Unverified: how CLOCKSS checks its permission. `LockssPermission.java`
  holds only the LOCKSS sentences, and the CLOCKSS side was not found in
  the LOCKSS software; the CLOCKSS page carries its own sentence
  ("CLOCKSS system has permission to ingest, preserve, and serve this
  Archival Unit.") in every state, and `ClockssOjs3Plugin.xml` inherits
  the OJS 3 plugin's crawl, which reads nothing in the table.
