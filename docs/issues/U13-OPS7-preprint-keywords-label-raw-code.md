# A preprint page in French or most other languages labels its keywords "##preprint.subject##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** not traced to a PR; [11f39599b0](https://github.com/pkp/ops/commit/11f39599b0dd11630a64e543fcf4d8fe12e2b82a) · 2019-09-08 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A reader who opens a preprint's page in French sees its keywords
labelled "##preprint.subject## :" instead of "Mots-clés :". A journal's
or a press's French page reads "Mots-clés :".

The label's text, `preprint.subject`, has a translation only in
English, Bulgarian, Czech, German, Macedonian, Brazilian Portuguese and
Ukrainian. In every other language a server offers to its readers, the
raw key name replaces the label on every preprint with keywords. The
keywords themselves show, and no setting lets a server manager change
the label.

## Impact

- **Lost.** No content: the keywords show, under the raw key name
  instead of a word.
- **Who.** Readers who view a preprint server in a language it offers
  under "UI" (Website › Setup › "Languages") other than the seven above,
  on every preprint page with keywords. A language offered only for
  forms or submissions does not show it, since readers never view the
  page in it.
- **Way round.** None on screen; only a custom locale plugin could
  override the text.

Low: a raw translation key in place of a label.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (OJS `main` is the control).
  Its "Public Knowledge Preprint Server" (`publicknowledge`) offers
  English and French (Canada) to readers, English primary. Its preprint
  2, "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence", is published with the keywords "survey" and
  "employees", entered in English; the French page shows them too.

Reader (signed out):

1. Open `/index.php/publicknowledge/en/preprint/view/2`.
2. Open the same preprint in French:
   `/index.php/publicknowledge/fr_CA/preprint/view/2` (or "Français
   (Canada)" in the language menu).

**Expected.** Step 1 reads "Keywords: employees, survey". Step 2 reads
"Mots-clés : employees, survey".

**Observed.** Step 1 reads "Keywords: employees, survey". Step 2:

```html
<h2 class="label">##preprint.subject## :</h2>
<span class="value">employees, survey</span>
```

Control: the journal's French article page,
`/index.php/publicknowledge/fr_CA/article/view/1` ("The Signalling
Theory Dividends"), reads "Mots-clés : Professional Development, Social
Transformation", and a press's French book page
(`/index.php/publicknowledge/fr_CA/catalog/book/14`) reads
"Mots-clés : Psychology".

## Cause

OPS's preprint page labels the keywords with its own translation key,
`preprint.subject`, in
[`templates/frontend/objects/preprint_details.tpl` line 210](https://github.com/pkp/ops/blob/c8af945bb7/templates/frontend/objects/preprint_details.tpl#L210):

```smarty
{capture assign=translatedKeywords}{translate key="preprint.subject"}{/capture}
```

A server can offer every language that has a folder under OPS's
`locale/` or pkp-lib's `lib/pkp/locale/` (`Locale::getLocales()` lists
both registered paths): 70 besides English. OPS translates
`preprint.subject` in six of them (`bg`, `cs`, `de`, `mk`, `pt_BR`,
`uk`). It is an empty entry in `ca`, `es`, `fi`, `fr_CA`, `nb_NO` and
`tr`, for example
[`locale/fr_CA/locale.po` line 512](https://github.com/pkp/ops/blob/c8af945bb7/locale/fr_CA/locale.po#L512-L513),
and missing from the other 58, French (`fr`) and Portuguese (Portugal,
`pt`) among them. The loader drops an empty entry
(`LocaleFile::loadArray()`, `includeEmpty => false`), so
`Locale::translate()` finds no text and returns the key between hash
signs
([`Locale.php` line 525](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/classes/i18n/Locale.php#L525)).

pkp-lib already has the same word: `common.keywords` ("Keywords") has a
text in 48 of those 64 languages, French (Canada) included
("Mots-clés"). OMP's book page uses it
([`monograph_full.tpl` line 126](https://github.com/pkp/omp/blob/3b0ecf794c/templates/frontend/objects/monograph_full.tpl#L126)).
The OPS key came with 11f39599b0, which renamed OJS's
`article_details.tpl` to `preprint_details.tpl` and `article.subject` to
`preprint.subject` without an entry in any language; English got one
in [271a2052c4](https://github.com/pkp/ops/commit/271a2052c41e141061defd8db68bec848064c1c7)
(2020-03-03, "Correct missing locale key").

Reach:

- The template is OPS's own and the default theme uses it. PKP's other
  themes (Pragma, Health Sciences, Immersion, Classic, Bootstrap 3) have
  no `preprint_details.tpl` on their `main` branch, so on OPS they show
  this one too. The preprint summary in lists has no keywords label.
- The same page has other texts that only OPS defines and whose
  translation is empty or missing. This report's fix does not cover
  them; each needs its translation:
  - "##submissions.published##" (line 361, the date heading of every
    published preprint) and "##common.publication##" (line 109, the
    "Preprint" label at the top of every preprint): in `ca`, `fr`,
    `nb_NO`, `pt`, and in `hr`, `id` and `ky`, which have no OPS
    `locale.po` at all.
  - "##doi.readerDisplayName##" (line 195, the DOI label of a preprint
    with a DOI): in `ca`, `fi`, `fr`, `fr_CA`, `pt`, `tr`, `hr`, `id`,
    `ky` (for French (Canada) an empty entry,
    [`locale/fr_CA/manager.po` line 569](https://github.com/pkp/ops/blob/c8af945bb7/locale/fr_CA/manager.po#L569-L570)).
  - In French (Canada) these are the empty-translation fault of
    `pkp-e2e#124`
    ([its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A8-omp-ops-french-texts-internal-names.md)),
    which names `doi.readerDisplayName` for OMP only; in the other
    languages they are not tracked. The keywords label differs: pkp-lib
    already translates it, so a template change fixes it without
    translator work.

## Proposed fix

Use pkp-lib's `common.keywords` for the label, as OMP's book page does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-keywords-label-raw-code/fix.diff)):

```diff
--- a/templates/frontend/objects/preprint_details.tpl
+++ b/templates/frontend/objects/preprint_details.tpl
@@ -207,7 +207,7 @@
 			{if !empty($publication->getLocalizedData('keywords'))}
 			<section class="item keywords">
 				<h2 class="label">
-					{capture assign=translatedKeywords}{translate key="preprint.subject"}{/capture}
+					{capture assign=translatedKeywords}{translate key="common.keywords"}{/capture}
 					{translate key="semicolon" label=$translatedKeywords}
 				</h2>
 				<span class="value">
```

The label then reads in the 48 languages where pkp-lib has the word;
the 16 where it has neither (such as `be`, `ko`, `zh_Hant`) show
"##common.keywords##" instead, until they are translated.

Tried on `main`: with the fix, step 2 read "Mots-clés : employees,
survey", and the English page still read "Keywords:".

**Alternatives:**

- Fill `preprint.subject` in each language (on Weblate, or as a commit
  each translation team picks up): fixes them one by one, and keeps a
  second key for a word pkp-lib already translates.
- Delete `preprint.subject` from OPS's locale files along with the
  template change: tidier, but a custom theme that still uses the key
  would show it raw in English too. Leave the key in place for now.

**What goes with it:**

- No stored data: the label is translated each time the page is shown.
- Backport: the diff applies as it stands to `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0` (checked with `git apply --check`
  and `patch --dry-run`). `common.keywords` has French on all three.
- Test: an e2e check that a preprint's French page shows no `##…##`
  key, which spec U13 Rule 21 covers.

Small: one line in one template.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-keywords-label-raw-code/walk.js)
  takes steps 1 and 2 on OPS and the same two pages on OJS (article 1)
  and OMP (book 14), reading each keywords heading's raw text and every
  `##…##` key on the page:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-keywords-label-raw-code/walk.js`,
  on an install reset to the default dataset; on 3.5 with
  `PKP_E2E_LINE=stable-3_5_0` in front. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-keywords-label-raw-code/fix.diff ops`
  around the same walk, then reverted.
- Tips: OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7)
  (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)),
  OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73),
  OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794c);
  OPS `stable-3_5_0` [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd)
  (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)),
  where the walk showed the same "##preprint.subject## :" and the same
  languages lack the entry. PostgreSQL; the fault does not depend on
  the database.
- Language counts: every folder of OPS's `locale/` and pkp-lib's
  `locale/` on `main`, read for `preprint.subject` and `common.keywords`,
  and for every key `preprint_details.tpl` translates in the
  languages named under Reach.
- 3.4 (OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b),
  pkp-lib [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d)):
  line 174 uses `preprint.subject`; OPS's own folders lack it in `ca`,
  `es`, `fi`, `fr_CA`, `fr_FR`, `id`, `ky`, `nb`, `pt_PT`, `tr` and
  `uk`. 3.3 (OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161),
  pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)):
  line 173 the same; `ca_ES`, `es_ES`, `fi_FI`, `fr_CA`, `id_ID`,
  `mk_MK`, `nb_NO`, `pt_BR`, `pt_PT` and `tr_TR` lack it, and
  `PKPLocale::translate()` returns the key between hash signs too.
  `common.keywords` reads "Mots-clés" in French (Canada) on both.
- Introduced: `git blame` on line 210; the GitHub API lists no PR for
  the commit. The French (Canada) entry first appears, empty, with the
  locale rearrangement
  [eb1d961fe7](https://github.com/pkp/ops/commit/eb1d961fe79bbdf2feb2a8035934b1ecb1c6f8e7)
  (2023-01-30).
- Themes: `templates/frontend/objects/preprint_details.tpl` looked for
  on the `main` and `master` branches of pkp/pragma, healthSciences,
  immersion, classic and bootstrap3 (none has it); third-party themes
  outside pkp not checked.
- Upstream search (2026-10-01; pkp/pkp-lib, pkp/ops, issues and PRs):
  `preprint.subject`, "keywords french preprint", "keywords label
  translation", "OPS locale keys missing translation". Nothing on this
  label; `pkp/pkp-lib#8081` ("Address invalid localization files") is
  about file validity.
- Not driven: 3.4 and 3.3 (code); languages other than French (Canada),
  which the default dataset does not offer (code); the sibling keys
  under Reach (code; preprint 2 has no DOI, and its French (Canada)
  page showed no other raw key with the fix in, apart from the version
  names that spec U13 A1 covers).
