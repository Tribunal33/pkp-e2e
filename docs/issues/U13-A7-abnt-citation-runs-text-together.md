# "ABNT" citations run a preprint's title into the server's name, and on articles and preprints the month into the year

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: none (code)
  - 3.3: none (code; OMP and OPS ship no citation plugin)
- **Introduced** `pkp/citationStyleLanguage#165` (`#164` on 3.5) for `pkp/pkp-lib#5629` · [24cd009](https://github.com/pkp/citationStyleLanguage/commit/24cd009e556cd8cee99c5c6938930cb794ec697b) · 2026-05-29 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01); the date fault is also in the CSL project's current ABNT style
- **Tracked in** U13 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the "ABNT" citation format, a preprint's title and the server's name
print back to back with nothing between them. On a journal article and
on a preprint, the date also runs the month into the year ("30
Sept.2026").

Every part of the citation is there and the other formats print
correctly, but a reader who copies an ABNT citation has to put back the
". " after a preprint's title and the space before the year.

It shows wherever a manager has turned on the "Citation Style Language"
plugin. The plugin is off on a new journal or server, and once it is on,
"ABNT" is one of the formats it offers by default under "More Citation
Formats". On 3.5 it is in a released version, 3.5.0-5.

## Impact

- **Lost**: no data, only the citation's punctuation. It looks finished
  but is wrong, and nobody is told.
- **Who**: every reader who picks "ABNT" on an article or a preprint, in
  a context with the plugin on. A context that makes "ABNT" its "Primary
  Citation Format" shows it to every reader first.
- **Way round**: the reader repairs the text by hand or picks another
  format. The manager can untick "ABNT" in the plugin's settings.

Low: the citation is complete and can be repaired by hand. A context
whose primary format is "ABNT" would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS and OPS, with OMP's book as
  the control. The "Citation Style Language" plugin is off in the
  dataset. Once it is on, its settings tick "ABNT" among the "Additional
  Citation Formats", so nothing else needs changing.

Steps, on each app in turn:

1. Sign in as `rvaca` (the Journal manager, Preprint Server manager or
   Press manager).
2. Go to Settings › Website › "Plugins" and tick "Citation Style
   Language".
3. Sign out.
4. Open the published item's page:
   - OJS: submission 17, "Antimicrobial, heavy metal resistance and
     plasmid profile of coliforms isolated from nosocomial infections in
     a hospital in Isfahan, Iran"
     (`/index.php/publicknowledge/article/view/17`);
   - OPS: submission 2, "The Facets Of Job Satisfaction: A Nine-Nation
     Comparative Study Of Construct Equivalence"
     (`/index.php/publicknowledge/preprint/view/2`);
   - OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive
     Science of LEGO Robots"
     (`/index.php/publicknowledge/catalog/book/14`).
5. Under "How to Cite", press "More Citation Formats", then "ABNT".

The date is the item's publication date. On these installs that is the
day the dataset was built (30 September 2026); yours shows its own date.

**Expected**: on OPS, ". " after the title and a space before the year;
on OJS, a space before the year:

```
KWANTES, C.; KEKKONEN, U. The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence. Public Knowledge Preprint Server, 30 Sept. 2026. …
KARBASIZAED, V. Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran. Journal of Public Knowledge, v. 1, n. 2, 30 Sept. 2026.
```

**Observed**: on OPS the title (in bold) runs straight into the server's
name (in bold), and the month runs into the year. On OJS the title and
the journal's name are separated, but the date is the same:

```
KWANTES, C.; KEKKONEN, U. The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct EquivalencePublic Knowledge Preprint Server, 30 Sept.2026. Disponível em: http://…/index.php/publicknowledge/preprint/view/2. Acesso em: 1 oct. 2026
KARBASIZAED, V. Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran. Journal of Public Knowledge, v. 1, n. 2, 30 Sept.2026.
```

On OMP the book's citation is right: "DAWSON, M.; DUPUIS, B.; WILSON, M.
From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots.
[s.l.] Public Knowledge Press, 2026."

## Cause

The plugin renders "ABNT" with the bundled citeproc-php (v2.7.1), from
its own copy of the CSL style:
`plugins/generic/citationStyleLanguage/citation-styles/associacao-brasileira-de-normas-tecnicas.csl`.
Commit 24cd009, "pkp/pkp-lib#5629 update citeproc version, csl files,
links, and improve attribution", replaced PKP's copy with the CSL
project's 2021-06-13 version. That version lacks two things the previous
copy had, one for each fault.

**The title.** The bibliography's catch-all `<else>` branch covers every
item type that has no branch of its own. It prints `<text macro="title"/>`
with no suffix, and the container title follows with no prefix.
`CitationStyleLanguagePlugin::getCitation()` gives a preprint the CSL
type `article`, which has no branch, so a preprint falls into `<else>`.
OJS articles (`article-journal`) and OMP's books and chapters each have a
branch that ends the title with ". ".

PKP's copy had `suffix=". "` on that line since e57e6f6
(`pkp/citationStyleLanguage#94`, 2022), added for this very fault on a
preprint server, and the update dropped it. The CSL project's current
version (2023-08-20) has the suffix again. The plugin's Composer
dependencies install that version under
`lib/vendor/citation-style-language/styles/`, which is gitignored and
appears only after `composer install`, but the plugin does not use it.

**The date.** The `issued` macro used to print the year alone. It now
prints the day and month in one `<date>` and the year in a second
`<date>`, inside a `<group>` with no delimiter, so the space between them
comes only from the month's `suffix=" "`. citeproc-php trims each date's
rendered parts (`Date::iterateAndRenderDateParts()` ends with
`return trim($return);`). The space is dropped, and the group joins
"30 Sept." to "2026". The trim removes the space whatever the month
(in the code).

The CSL project's current version has the same `issued` macro, so
copying it in again would bring the date fault back.

Reach, beyond what was walked:

- OMP: books and chapters skip the day and month
  (`<if type="book chapter" match="none">`), so neither fault reaches
  them (chapters read in the code).
- The other eleven bundled styles: in none of them does a `<date>` start
  or end with a space affix that the trim would drop (all of
  `citation-styles/` checked in the code).
- The "Acesso em: 1 oct. 2026" on a preprint (the `access` macro) prints
  day, month and year in a single `<date>`, so its spaces survive.

## Proposed fix

Fix PKP's copy of the style in `pkp/citationStyleLanguage`, three changed
lines:

- Put the title's ". " back in the `<else>` branch, as e57e6f6 had it and
  as the CSL project's current version has it.
- Give the `issued` group `delimiter=" "`, so the space no longer depends
  on an affix that citeproc-php trims.
- Remove the month's `suffix=" "`. A CSL processor that keeps date
  affixes would otherwise print two spaces once the group adds its own.

```diff
       <if variable="issued" match="any">
-        <group>
+        <group delimiter=" ">
           <choose>
             <if type="book chapter" match="none">
               <date variable="issued">
                 <date-part name="day" suffix=" "/>
-                <date-part name="month" form="short" suffix=" "/>
+                <date-part name="month" form="short"/>
               </date>
@@
         <else>
           <text macro="author" suffix=". "/>
           <!--Autor-->
-          <text macro="title"/>
+          <text macro="title" suffix=". "/>
```

The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abnt-citation-runs-text-together/fix.diff).
Its paths start at an app's root (`plugins/generic/citationStyleLanguage/citation-styles/…`).
In the plugin repo, apply it with `git apply -p4`, which applies cleanly
to both `main` and `stable-3_5_0`. A group skips empty children, so a
book or chapter still prints the year alone.

The fix was tried on `main` (OJS, OMP, OPS). With it, both Expected lines
of the Steps print as written. "APA" on all three apps and OMP's "ABNT"
book citation print the same with and without the fix.

**Alternatives:**

- Copy the CSL project's current version in again: it restores the
  title's ". ", but the date still runs together, and it changes other
  output (editors as "org.", an italic "[S.d.]").
- Remove the `trim()` in citeproc-php: the library belongs to its own
  maintainers (seboettg/citeproc-php), and a patch to the copy installed
  in `lib/vendor` is lost at the next `composer update`.
- Restore the pre-update copy of the style: this undoes what
  `pkp/pkp-lib#5629` set out to do for this style, including the day and
  month.

**What goes with it:**

- A pull request to `pkp/citationStyleLanguage` `main` and
  `stable-3_5_0`, then the submodule bumps in the three apps. No data
  repair or API or hook change is needed.
- The `issued` change, sent to the CSL project's styles repo as well
  (citation-style-language/styles,
  `associacao-brasileira-de-normas-tecnicas.csl`). Until it lands there,
  PKP's copy keeps the fix only if the next refresh of `citation-styles/`
  re-applies these three lines (a comment beside them in the file would
  say so). The guard below catches a refresh that drops them.
- The guard: an e2e check in U13 that asserts the ". " after a preprint's
  title and the space before the year, on an article and a preprint.

Small: three lines in one style file, tried, and one e2e assertion.

## Evidence

- Walk script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js),
  on installs freshly loaded from PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30; PostgreSQL):
  `node bin/probe.js all shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js`.
  The fix was applied for the trial with
  `node bin/try-fix.js apply …/fix.diff ojs omp ops`.
- Tips: OJS `main` bade233f73 (2026-09-30), OMP `main` 3b0ecf794 and OPS
  `main` c8af945bb7 (2026-09-29), with the plugin at 9dd6eba (2026-09-18)
  in all three. On `stable-3_5_0`, walked with the same script on the
  3.5 dataset: OJS 92b9a16b48, OMP 3081c9b00 and OPS cf4fce69bd, with
  the plugin at 41ddd1b. That pointer carries c3a1bb8, the 3.5 commit of
  the same change, and the walk printed the same two faults.
- Release: OJS 3.5.0-5's plugin pointer (5613aca) contains the change;
  3.5.0-4's (581e7a4) does not.
- 3.4 (code): `upstream/stable-3_4_0` of OJS (9571d8fde7), OMP
  (0aec65441) and OPS (acd8ae704b) record the plugin at 8f54149. Its ABNT
  copy has the title's suffix in `<else>` and an `issued` macro that
  prints the year alone in one `<date>`.
- 3.3 (code): OJS `upstream/stable-3_3_0` (9fdb9bcf9a) records the
  plugin at 648ae36, which has the same copy as 3.4.
- Default state: the plugin has no `settings.xml`, which is what turns a
  plugin on for a new context
  (`Plugin::getContextSpecificPluginSettingsFile()`), so it starts off.
  `getCitationStyles()` marks every format, "ABNT" included,
  `isEnabled`.
- Introduced: `git log` on the style file gives 24cd009 on `main` and
  c3a1bb8 on `stable-3_5_0`, both dated 2026-05-29 and merged on
  2026-06-02. The parent's copy has the title's suffix (e57e6f6) and the
  year-only `issued` macro.
- The CSL project's current file: read on 2026-10-01 from
  citation-style-language/styles `master` (`<updated>`
  2023-08-20T17:15:26+00:00), with the same `issued` macro as PKP's copy.
- Upstream searched in pkp/pkp-lib, pkp/citationStyleLanguage, pkp/ojs,
  pkp/ops and pkp/ui-library (ABNT, citation date space, citation title
  server, the plugin's pull requests since May 2026): no report of
  either fault. A search of seboettg/citeproc-php for the trim did not
  run because the search API refused the query, so whether that project
  tracks the trim is unverified.
- Not walked: an OMP chapter's citation (read in the code), an earlier
  version's page, and a context whose primary format is "ABNT". MySQL
  not checked; nothing here depends on the database.
