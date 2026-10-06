# "ABNT" citation runs a preprint's title into the server's name and prints the date as "30 Sept.2026"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS (the date), OPS
  - 3.5: OJS (the date), OPS
  - 3.4: none (code; the earlier "ABNT" file)
  - 3.3: none (code; the earlier "ABNT" file)
- **Introduced** `pkp/citationStyleLanguage#165` (3.5: `pkp/citationStyleLanguage#164`) for `pkp/pkp-lib#5629` · [24cd009](https://github.com/pkp/citationStyleLanguage/commit/24cd009e556cd8cee99c5c6938930cb794ec697b) (3.5: [c3a1bb8](https://github.com/pkp/citationStyleLanguage/commit/c3a1bb8fc448e6109133cb4d31734f5dcc3115e5)) · 2026-05-29 · Kaitlin Newson (kaitlinnewson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the "ABNT" format under "How to Cite", a preprint's title and the
preprint server's name are printed with no space or full stop between
them, and on a journal and a preprint server alike the date runs the
month into the year ("30 Sept.2026"). A reader who copies the citation
has to repair it by hand. The citation was punctuated correctly until
the plugin's "ABNT" style file was replaced in May 2026.

On a preprint server whose plugin settings have "Publisher Location"
filled in, the citation also runs the server's name into the place
("Public Knowledge Preprint ServerLondon, U.K."). A journal's citation
does not print the place and is not affected by this part.

It needs the "Citation Style Language" plugin, which is off on a new
journal or server until a manager turns it on, and a reader who picks
"ABNT" under "More Citation Formats", or "ABNT" set as the primary
format. The other ten formats, the two citation downloads and a press's
"ABNT" citation of a book are not affected.

## Impact

- **Lost.** The citation's punctuation: a space in the date and, on a
  preprint, a full stop after the title and before the place are
  missing. Nothing is stored wrong, and no message is shown.
- **Who.** Every reader who uses "ABNT" on a preprint or a journal
  article; on a journal only the date is wrong. "ABNT" is the Brazilian
  standard, so journals and servers there may have it as their primary
  format, which shows it on every article's page.
- **Way round.** The reader picks another format. A manager cannot
  correct it in the settings.

Low: the citation is complete and readable, and only its punctuation is
wrong. It would be medium if the downloads or every format were
affected.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main`: the OPS server and the OJS journal
  `publicknowledge`.
- The "Citation Style Language" plugin is off in the dataset. On each
  app, sign in as `rvaca`, open Settings › Website › "Plugins", tick
  "Citation Style Language" and sign out.

On the preprint server, signed out:

1. Open preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence":
   `/index.php/publicknowledge/preprint/view/2`.
2. Under "How to Cite", press "More Citation Formats", then "ABNT".

On the journal, signed out:

3. Open article 17, "Antimicrobial, heavy metal resistance and plasmid
   profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran":
   `/index.php/publicknowledge/article/view/17`.
4. Press "More Citation Formats", then "ABNT".

The dataset is rebuilt from time to time, so its publication dates move:
"30 Sept." below is the date preprint 2 and article 17 were published in
the build these steps were taken on, and "1 oct. 2026" the day of the
visit.

With a publisher location, on the preprint server:

5. Sign in as `rvaca`, open Settings › Website › "Plugins", press the
   arrow beside "Citation Style Language", then "Settings". Type
   "London, U.K." into "Publisher Location", press "OK" and sign out.
6. Take steps 1 and 2 again.

**Expected.** The title, the server's name, the place and the date are
set apart, as the journal's citation sets the title apart, and the date
reads "30 Sept. 2026" on the preprint and the article. After step 2:

```
KWANTES, C.; KEKKONEN, U. The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence. Public Knowledge Preprint Server, 30 Sept. 2026. Disponível em: {address}. Acesso em: 1 oct. 2026
```

After step 6 the place stands apart too: "… Construct Equivalence. Public
Knowledge Preprint Server. London, U.K., 30 Sept. 2026. …".

**Observed.** Below, {address} stands for the page's address on the
install. After step 2, with the title and the server's name each in
bold and no space or full stop between them:

```
KWANTES, C.; KEKKONEN, U. The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct EquivalencePublic Knowledge Preprint Server, 30 Sept.2026. Disponível em: {address}. Acesso em: 1 oct. 2026
```

After step 4:

```
KARBASIZAED, V. Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran. Journal of Public Knowledge, v. 1, n. 2, 30 Sept.2026.
```

After step 6 the citation reads "… Construct EquivalencePublic Knowledge
Preprint ServerLondon, U.K., 30 Sept.2026. …".

Control: on a press (the default dataset, OMP, the plugin ticked the
same way), open book 5, `/index.php/publicknowledge/catalog/book/5`, and
choose "ABNT": it reads "ALLAN, C. Bomb Canada and Other Unkind Remarks
in the American Media. [s.l.] Public Knowledge Press, 2026." After
step 5 the journal's citation at step 4 is unchanged: it prints no
place. The other ten formats on the same preprint and
article print their parts apart ("MLA": "… Public Knowledge Preprint
Server, 30 Sept. 2026, {address}.").

## Cause

All three faults sit in one file of the `citationStyleLanguage` plugin,
`citation-styles/associacao-brasileira-de-normas-tecnicas.csl`, as the
library the plugin renders it with (`seboettg/citeproc-php`, from
`pkp/citeproc-php`) reads it.

**The title and the server's name.** `getCitation()`
(`CitationStyleLanguagePlugin.php`) gives a preprint the CSL type
`article` and the server's name as its `container-title`. The style has
no layout for `article`, so the bibliography's last `<else>` branch
prints it, and that branch prints the title and the container title one
after the other with no affix:

```xml
<text macro="author" suffix=". "/>
<text macro="title"/>
…
<text macro="container-title"/>
```

A journal article is `article-journal`, whose branch reads
`<text macro="title" suffix=". "/>`, so the journal's citation is not
affected.

**The place.** The same `<else>` branch prints
`<text variable="publisher-place"/>` right after the container title,
again with no affix. The plugin sets `publisher-place` from its
"Publisher Location" setting.

**The date.** The style's `issued` macro prints the day and month in one
`<date>` and the year in a second one, with no delimiter on the group,
and relies on the month's `suffix=" "` to set them apart.
`Seboettg\CiteProc\Rendering\Date\Date::iterateAndRenderDateParts()`
ends with `return trim($return);`, which removes that trailing space, so
the two dates join. Books and chapters skip the first `<date>`, which is
why a press's citation is not affected.

**How it came in.** Until May 2026 the plugin shipped another file under
this name: the "Universidade de São Paulo - Escola de Comunicações e
Artes - ABNT" style (NBR 6023:2018), chosen in
`pkp/citationStyleLanguage#73`, with a full stop after the title added
to the `<else>` branch in `pkp/citationStyleLanguage#94` for this very
fault on a preprint. It printed the year alone.
`pkp/citationStyleLanguage#165` refreshed every style from the CSL
styles repository's `v1.0.1` branch, and for this file took the
repository's file of the same name, a different style (NBR 6023:2002).
That replaced the 2018 style, dropped the full stop of #94 and brought
in the two-part date.

Reach:

- "ABNT" on a preprint and on a journal article, on the page and as the
  primary format (walked through "More Citation Formats"; the primary
  format uses the same call, by the code).
- The place needs "Publisher Location" filled in (walked on the
  preprint server).
- The library's `trim()` touches no other shipped style: each of the
  twelve style files was rendered from the command line for a preprint,
  an article, a book and a chapter with and without it, and only
  "ABNT"'s date differed.
- A publisher on a preprint or an article, which only another plugin
  can set through the `CitationStyleLanguage::citation` hook (the plugin
  itself sets `publisher` for books and chapters only): the same
  `<else>` branch prints `<text variable="publisher" suffix=", "/>`
  right after the place and before `issued`'s `prefix=", "`, so it reads
  "London, U.K.Name, , 30 Sept.2026" (rendered from the command line; no
  screen reaches it). The fix leaves it out, see below.
- The same change also took the journal's "ABNT" citation from the 2018
  standard back to the 2002 one: given names are now initials, and the
  article's address and "Acesso em" date are no longer printed. Whether
  that was meant is a question for the team; this fix does not touch it.

## Proposed fix

Correct the three places in the plugin's own copy of the style, as
`pkp/citationStyleLanguage#94` did for the first of them. A proposal,
tried; the team decides.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abnt-citation-runs-text-together/fix.diff)
(against the app root, the same for the three apps):

```diff
   <macro name="issued">
     <choose>
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
```

```diff
         <else>
           <text macro="author" suffix=". "/>
-          <text macro="title"/>
+          <text macro="title" suffix=". "/>
 …
-          <text variable="publisher-place"/>
+          <text variable="publisher-place" prefix=". "/>
```

Tried on OJS, OMP and OPS `main`. The preprint's citation read "…
Construct Equivalence. Public Knowledge Preprint Server, 30 Sept. 2026.
…", with the place "… Preprint Server. London, U.K., 30 Sept. 2026. …",
and the article's "… v. 1, n. 2, 30 Sept. 2026." The other ten formats
on the three apps and the book's "ABNT" citation, with and without a
place, read the same as without the fix.

The rule lives in the style file, which owns the citation's layout, and
the plugin already carried a correction of its own in this file (#94).
The full stop after the title is also what the CSL repository's current
file has in this branch; its date macro is unchanged there. The search
for the same mistake covered the other eleven shipped styles (see
Reach). The change keeps the intent of #165: the file stays the `v1.0.1`
one, which the library supports, with three affixes changed.

Left out: a publisher set through the hook (Reach) still prints as
"London, U.K.Name, , 30 Sept. 2026" with the fix. Correcting it means
rebuilding the end of the `<else>` branch as a delimited group (place,
publisher, date) with a colon between place and publisher as the book
layout has, a larger departure from the repository's file for a case
the plugin's own data never produces.

**Alternatives**

- Remove the `trim()` in `pkp/citeproc-php`
  (`Date::iterateAndRenderDateParts()`). It corrects the date for any
  style written this way and left the other shipped styles unchanged
  when rendered from the command line, but it needs a library release
  and a lock file bump in the plugin, and does not correct the title or
  the place.
- Restore the earlier file (the 2018 style with #94's full stop). It
  corrects the preprint and the journal, and brings back NBR 6023:2018.
  Rendered with today's library it prints a book's publisher and year
  with no space ("Public Knowledge Press,2026"), the same `trim()` on
  that file's year prefix, so it would need the library change or an
  edit too. Which standard "ABNT" should follow is the team's call.

**What goes with it**

- No stored data changes; citations are rendered on each request.
- The file is the same on `stable-3_5_0`, so the diff applies there as
  written.
- A later refresh of the style files would drop the correction again,
  as #165 dropped #94: a note beside the "CSL Files" section of the
  plugin's README naming the locally changed file would guard it.
- Guard: an e2e scenario in this repository's spec, U13 Rule 15 (the
  "ABNT" citation of a preprint and of an article sets its parts apart),
  and a plugin test that renders each shipped style for a preprint and
  an article and fails on two words joined without a space.

Small: three attributes in one style file, following a correction the
plugin made before, tried on the three apps.

## Evidence

- Kept script that takes the Steps on OPS and OJS, and the control on
  OMP, on installs freshly loaded from PKP's default test dataset
  (pkp/datasets 38ab955, the `main` and `stable-3_5_0` PostgreSQL dumps,
  no upgrade needed):
  [`shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js),
  run with `PROBE_FEATURE=issues-ir22 PROBE_AGENT=ir22 node bin/probe.js all shared/playwright/checks/issues/abnt-citation-runs-text-together/walk.js`.
  It records the text and markup of "ABNT" and then of every other
  format in the list. With `place` as its argument it takes steps 5 and
  6 (it fills in "Publisher Location" in the same visit that ticks the
  plugin, on the three apps) and records "ABNT" alone.
- Walked on `main` (OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7; the
  plugin at 9dd6eba) and on `stable-3_5_0` (OJS 92b9a16b48, OMP
  3081c9b00, OPS cf4fce69bd; the plugin at 41ddd1b), where the three
  citations read the same as on `main`; the `place` steps on `main`
  only. No request answered an error and no page script failed. The
  walks ran on PostgreSQL; the fault does not depend on the database.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/abnt-citation-runs-text-together/fix.diff ojs omp ops`,
  then the script as above and with `place`, compared format by format
  with the runs without the fix; then reverted.
- Code reads on `main`: the style file; `getCitation()` and
  `loadStyle()` in `CitationStyleLanguagePlugin.php`; `Date.php` and
  `AffixesTrait.php` in the installed `seboettg/citeproc-php` 2.7.1
  (`pkp/citeproc-php` a7200e4). `stable-3_5_0` has the same style file,
  byte for byte, from c3a1bb8.
- 3.4 and 3.3 (code): the plugin's `stable-3_4_0` (8f54149) and
  `stable-3_3_0` (648ae36) branches ship the earlier file, whose
  `<else>` branch has the title's `suffix=". "` and whose `issued` macro
  prints the year alone; neither has #164 or #165. OJS 3.3 gives every
  item the type `article-journal`, and OPS 3.3 does not ship the plugin.
  Not walked there.
- The trace: `git log` on the style file gives 24cd009 as the last
  change, a whole-file replacement; its parent holds the 2018 style with
  e57e6f6 (#94). The shipped file equals the CSL styles repository's
  `v1.0.1` file but for trailing spaces in two comments. The 3.5 release
  the change went into is the milestone of `pkp/pkp-lib#5629`, 3.5.0-5.
- Command-line renders (the installed library and a copy of it without
  the `trim()`, on made-up items of each type): the reach of the
  `trim()`, the earlier file's output with today's library, and the CSL
  repository's current file (updated 2023-08-20), which prints the
  title's full stop and the same "30 Sept.2026".
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ops,
  pkp/citationStyleLanguage and pkp/citeproc-php for "ABNT", the date's
  spacing, the title and the server's name, and the date `trim()`. No
  issue or open pull request covers the fault as it stands today;
  `pkp/citationStyleLanguage#94` (merged 2022) is the earlier fix of the
  title that #165 undid.
- The downloads ("Endnote/Zotero/Mendeley (RIS)", "BibTeX") are built
  from `templates/citation-styles/ris.blade` and `bibtex.csl`, not from
  the "ABNT" file (code; not walked for this report).
- The wider effect on the journal's citation (2018 to 2002 standard) was
  read from the earlier file rendered from the command line with today's
  library, beside today's journal citation on screen.
- Unverified: the primary-format path and a later version's page were
  not walked; whether the 3.5.0-5 release package carries the change was
  read from the milestone, not from the package.
