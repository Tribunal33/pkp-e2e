# In French, readers and editors see a raw translation key in place of every version's name and number

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10810` for `pkp/pkp-lib#10669` · [958592a159](https://github.com/pkp/pkp-lib/commit/958592a15966ca41ce8b02cfe655b74d7f554241) · 2025-05-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a1), spec U69 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15) (the version names)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On an article, book or preprint page shown in French, the "Versions"
list names every version with a raw translation key,
"##publication.versionStage.display##": two versions posted the same day
read "2026-09-30 (##publication.versionStage.display##)" twice. The
English page reads "2026-09-30 (Author Original 2.0)" and "2026-09-30
(Author Original 1.0)". A preprint's line above its title shows the same
key, and so does the editor's workflow, whose "Publication" menu lists
one entry per version.

Nothing is lost and every link still opens its version, but neither a
reader nor an editor can tell the versions apart by name or number in
French. The release before listed them by number in French ("2026-09-30
(2)").

French (Canada) was walked. By the code, every language but English
shows the key. The text behind it is only the pattern "stage
major.minor", which holds no word. New texts are offered to translators
once the release branch opens, so this one would reach them before the
release, and each language shows the key until its translators copy the
pattern. The proposed fix builds the name in code instead, so the
numbers show in every language at once. After it a French reader sees
"2026-09-30 (##publication.versionStage.authorOriginal## 2.0)": the
stage name stays a raw key until it is translated.

## Impact

- **Lost.** Nothing stored; the version's stage and number do not show.
- **Who.** Readers and editors using any language but English.
- **Way round.** Switch the page to English. On the public page the date
  tells versions apart when they were published on different days.

Low: a raw translation key in place of a label, with the pages, the
links and the stored versions intact.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the context `publicknowledge`,
  which offers English and French (Canada).
- The reader's steps are taken signed out. (The dataset's pages show no
  language menu, so French is reached by its address.)

Reader, preprint server (OPS):

1. Open the home page in French, `/index.php/publicknowledge/fr_CA`.
2. Open "Computer Skill Requirements for New and Existing Teachers:
   Implications for Policy and Practice" (preprint 3, two posted
   versions).
3. Read the line above the title and the "Versions" list in the side
   column.

Reader, journal (OJS):

1. Open `/index.php/publicknowledge/fr_CA`.
2. Open "Signalling Theory Dividends" (submission 1).
3. Read the "Versions" list.

Reader, press (OMP):

1. Open `/index.php/publicknowledge/fr_CA/catalog`.
2. Open "Bomb Canada and Other Unkind Remarks in the American Media"
   (book 5).
3. Read the "Versions" list.

Editor, journal (OJS):

1. Sign in as `dbarnes`.
2. Open "Signalling Theory Dividends" in French, at
   `/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=1`.
3. Read the entries under "Publication" in the workflow's menu, one per
   version (the submission has versions 1.0 and 1.1).

**Expected.** Each entry names its version with its stage and number,
as the English page does: "2026-09-30 (Author Original 2.0)" and
"2026-09-30 (Author Original 1.0)" on the preprint, "2026-09-30 (Version
of Record 1.0)" on the article and the book, "Version of Record 1.0" and
"Version of Record 1.1" in the editor's menu, with the stage name in
French once it is translated.

**Observed.**

```
OPS, above the title: Prépublication / 2026-09-30 (##publication.versionStage.display##)
OPS, "Versions":      2026-09-30 (##publication.versionStage.display##)
                      2026-09-30 (##publication.versionStage.display##)
OJS, "Versions":      2026-09-30 (##publication.versionStage.display##)
OMP, "Versions":      2026-09-30 (##publication.versionStage.display##)
OJS, editor's menu:   ##publication.versionStage.display##
                      ##publication.versionStage.display##
```

The same pages at `/index.php/publicknowledge/en/…` read as Expected.
On 3.5 the French preprint page reads "Prépublication / Version 2" and
"2026-09-30 (2)", "2026-09-30 (1)".

## Cause

`PublicationVersionInfo::__toString()`
([`lib/pkp/classes/publication/helpers/PublicationVersionInfo.php`](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/publication/helpers/PublicationVersionInfo.php#L36-L45))
builds a version's name by translating `publication.versionStage.display`,
whose English text is `{$stage} {$majorNumbering}.{$minorNumbering}`:
a pattern with no word in it. The stage name it takes is a second
translation, `VersionStage::label()`.

Only `locale/en/submission.po` holds the pattern: none of the 65 other
`submission.po` files has it, and five more languages have no
`submission.po`. `Locale::translate()` does not fall back to another
language (PKP's design, `pkp/pkp-lib#784`), so in those 70 languages the
call returns `##publication.versionStage.display##`, and the stage name
and both numbers, which were passed in as parameters, are dropped with
it.

The change that brought the name in (958592a159, the NISO JAV stages of
`pkp/pkp-lib#10669`) replaced the plain version number that 3.5 prints.
`main`'s new texts are not translated yet: translations arrive through
the `stable-3_5_0` branch, and of the 392 keys `main` adds to
`locale/en/submission.po` over 3.5, `locale/fr_CA` has one. So the stage
names are missing in French as well, as is usual before a release. The
pattern differs from them in that it needs no translator, yet every
language loses the whole name until it copies it.

Reach. Most readers take the name from
`Repo::publication()->getVersionString()`, which casts the object to a
string; two cast it themselves. The fix covers all of them:

- The "Versions" list on the article, book, chapter and preprint pages,
  and the preprint's line above the title (on screen: OJS, OMP, OPS,
  and a press's chapter page).
- The publication's `versionString` in the REST API, which the workflow
  prints in its "Publication" menu (on screen, all three apps).
- The author's dashboard list of publications, the DOIs page's version
  rows, the public comments and open review panels (code).
- Cast directly: each app's `PublishForm` ("The publication version is
  …" in the "Publish" window), and `PublicationVersionInfoResource`,
  whose `versionDisplay` field the REST API returns for the next
  available version (code).
- Machine output written under the request's language: field 251 of
  OJS's MARC and MARC21 OAI records and the `related-article` text of
  the JATS plugin (code; OJS `main` only, its pkp-lib is ahead of the
  other two apps').
- Not touched: a version without a stage reads
  `publication.versionStage.unassignedVersion`, a text with words, which
  waits for its translation like the stage names. The JATS
  `article-version` element reads the stage name in English on purpose
  (`label('en')`).

A second pattern of the same shape is left as it is.
`submission.versionIdentity` ("{$datePublished} ({$version})", since
3.2) wraps each entry of the "Versions" list. French (Canada) has it, so
the walk's pages show the date and the brackets. By the code 25 of the
70 other languages have no text for it (12 files lack the entry, 8 hold
it empty, 5 languages have no `submission.po`), and their "Versions"
list reads `##submission.versionIdentity##` on every version from 3.2
on, before and after this fix.

## Proposed fix

Build the name in `__toString()` instead of translating a pattern, and
drop the key
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-version-name-raw-key/fix.diff)):

```diff
-        $versionStageLabel = $this->stage->label();
-
-        return __('publication.versionStage.display', [
-            'stage' => $versionStageLabel,
-            'majorNumbering' => $this->majorNumbering,
-            'minorNumbering' => $this->minorNumbering,
-        ]);
+        return "{$this->stage->label()} {$this->majorNumbering}.{$this->minorNumbering}";
```

This removes something `pkp/pkp-lib#10810` put in on purpose: a pattern
each language can change, to put the number before the stage name or to
use another separator. No language uses that today only because no
language has the key yet. The question for the team is whether a fixed
"stage major.minor" in every language is acceptable. If it is not, the
first alternative below keeps the pattern.

How this was settled:

- **Where the rule lives.** `__toString()` is the one place the name is
  built; every reader listed under Cause ends there.
- **How the code base does it.** Both routes have a precedent. The same
  feature joins a stage name in code: `PKPDashboardHandler` builds the
  stage filter's entries as
  `$versionStage->label() . ' (' . $versionStage->value . ')'`. And
  `ValidationServiceProvider` detects a missing text by comparing the
  result with `'##' . $key . '##'`, which is what the alternative needs.
- **Every instance.** `publication.versionStage.display` has one reader.
  No other key added with the feature is a pattern without words.
  `submission.versionIdentity`, the older pattern described under Cause,
  is the same mistake and is left out: it is on every released version,
  has its own history, and removing it would change a text 45 languages
  have translated.
- **What the change was for.** Naming versions by JAV stage and
  major.minor number. The recommendation keeps the name as it reads in
  English and gives up the per-language pattern; the alternative keeps
  both.
- **What it touches.** English output is unchanged. Nothing is stored,
  so there is no data to repair, and the API's `versionString` and
  `versionDisplay` keep their shape.
- **The guard.** The U13 spec's French-page scenario asserting that the
  "Versions" list shows each version's number (a Planned item), or a
  unit test of `__toString()` under a locale without the key.

The recommendation is the shorter of the two because the number is
language-neutral, the stage name is already translated on its own, and
a fallback would have to be remembered for every pattern of this kind.

Tried on `main`, on the three apps. With the diff applied the French
pages read "2026-09-30 (##publication.versionStage.authorOriginal##
2.0)" and "… 1.0)" on the preprint and
"(##publication.versionStage.versionOfRecord## 1.0)" on the article and
the book, and the editor's menu "… 1.0" and "… 1.1": the numbers are
back, and the stage name shows its own raw key until it is translated.
The English pages read the same with the fix in and out.

**Alternatives**

- Keep the key and fall back to the built string when the language has
  no text for it: `__toString()` compares the result with
  `'##publication.versionStage.display##'` and returns
  `"{$label} {$major}.{$minor}"` on a match. It keeps what
  `pkp/pkp-lib#10810` intended and gives the same pages as the
  recommendation today. It costs a comparison that breaks when a plugin
  replaces the missing-key text (`Locale::setMissingKeyHandler()`), and
  a "Missing locale key" log line per name in strict mode. Not tried.
- Leave it to the translators: the pattern is offered for translation
  with the rest of 3.6, and the maintained languages will copy it.
  Every partly translated language keeps the raw key in place of the
  whole name, as 25 do today for `submission.versionIdentity`.
- Copy the pattern into each language's `submission.po` by hand: 65
  files, and the five languages without the file and every new language
  start without it.
- Fall back to English for this key or for the stage names: against
  PKP's rule for missing texts (`pkp/pkp-lib#784`).

**What goes with it**

- French texts for `publication.versionStage.authorOriginal`,
  `…publishedManuscriptUnderReview`, `…versionOfRecord` and
  `…unassignedVersion`, through Weblate once 3.6's texts open there.
- No backport: the code is on `main` only.

Small: seven lines replaced by one in a single pkp-lib method and one
English locale entry removed, tried, with no data to repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/french-version-name-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/french-version-name-raw-key/walk.js)
  takes the Steps on the three apps, then the same pages in English (the
  control, and the neighbour check with the fix in and out), then the
  editor's steps on each app's same submission (the Steps name OJS,
  whose submission has two versions). It changes nothing in the
  dataset. Run it on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/french-version-name-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  38ab955 (2026-09-30). No request failed and no script error showed. A
  database plays no part (a locale file and a string).
- Differences from the Steps: on the press the script opens the French
  home page first and, finding no link to the book there, goes on to
  the catalogue address the Steps start from.
- 3.5 walk: the French preprint page read "Prépublication / Version 2"
  and "2026-09-30 (2)", "2026-09-30 (1)". The article and the book,
  each with one published version there, show no "Versions" list on
  3.5. No code showed for a version on any of the three.
- Tips: `main` OJS bade233f73 (`lib/pkp` 2e377d27fc), OMP 3b0ecf794c and
  OPS c8af945bb7 (`lib/pkp` 3dc90c81a6). `stable-3_5_0` OJS 92b9a16b48,
  OMP 3081c9b00d, OPS cf4fce69bd (`lib/pkp` a9c76aed62). pkp-lib
  `stable-3_4_0` df13621c2d, `stable-3_3_0` d446601ebe.
- Code reads: on `main`, `PublicationVersionInfo::__toString()`,
  `VersionStage::label()`, `Repository::getVersionString()`,
  `publication\DAO::fromRow()` and `maps\Schema` (`versionString`),
  `Locale::translate()`, the three apps' item templates, every
  `locale/*/submission.po` of pkp-lib for the key (English only) and
  for the stage names (English only), for `submission.versionIdentity`
  (an empty `msgstr` counts as missing), and the callers listed under
  Cause, `PublishForm` and `PublicationVersionInfoResource` included. On 3.5, the templates print `getData('version')`, and neither
  `versionStage` nor `PublicationVersionInfo` exists in pkp-lib's
  classes or English locale; the same on `stable-3_4_0` and
  `stable-3_3_0` (`git grep versionStage`: nothing).
- Introduced: `git blame` on `__toString()` and `git log -S` of the key
  both give 958592a159, on `main` only; its PR is `pkp/pkp-lib#10810`
  by defstat.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched on github.com by the key, "versionStage",
  "PublicationVersionInfo", "version stage translation", "Version of
  Record locale" and "versions list locale key". Read:
  `pkp/pkp-lib#10669` and `pkp/pkp-lib#10810` (no mention of the
  pattern's translation).
- The chapter page: a press's chapter page was read in the walk of
  [`omp-french-book-page-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-french-book-page-raw-keys/walk.js)
  (the other French codes of a book's pages, spec U69 A15). Its
  "Versions" list read "2026-10-01
  (##publication.versionStage.display##)" on both versions of book 14,
  without this fix.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/french-version-name-raw-key/fix.diff ojs omp ops`,
  the kept script, then `revert`.
- Not driven: 3.4 and 3.3 (code only); languages other than French
  (Canada) (code only); the author's dashboard, the
  "Publish" window, the next-version API field, the DOIs page, the
  comments and open review panels, and the MARC and JATS output (code
  only); the languages without `submission.versionIdentity` (code
  only).
- Unverified: whether the Default Translation or Custom Locale plugins
  would replace the code; neither was installed.
