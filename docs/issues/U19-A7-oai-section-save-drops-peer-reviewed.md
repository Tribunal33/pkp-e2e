# Saving a journal section's settings, even unchanged, removes "Peer-reviewed Article" from its OAI records

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** [8ac04ca1c7](https://github.com/pkp/ojs/commit/8ac04ca1c71bbfd0a4c27cf974e7409a468aece2), "#2961# Localization overhaul" (no pull request) · 2007-08-29 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#10839` (open), covering this fault and, beyond it, whether "Peer-reviewed Article" should be the default at all
- **Tracked in** spec U19 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal's Dublin Core records in OAI-PMH give each article a "Resource
Type". A section whose "Identify items published in this section as a(n)"
box is empty types its articles "Peer-reviewed Article", but only until
someone saves the section. When a Journal Manager opens the section's
"Edit" form under Settings › Journal › "Sections" and presses "Save",
even with nothing changed, every record of the section loses that type.
Nothing on screen says so.

Every section with an empty box loses the type once it is saved, whether
or not "Will not be peer-reviewed" is ticked. Only a section that was
never saved keeps it, such as the "Articles" section a new journal starts
with. A section created on the "Sections" page never has it.

The fix is rated medium effort, although the code change is small.
Restoring the type changes the records of the majority of journals, and
that change of default output still has to be agreed in pkp's open issue
on it.

## Impact

- **Lost**: the "Peer-reviewed Article" type in the Dublin Core record of
  every article in the section. The two machine-readable types
  ("info:eu-repo/semantics/article",
  "info:eu-repo/semantics/publishedVersion") stay. The records keep their
  datestamps, so a harvester already holding them keeps the old type until
  it re-harvests in full.
- **Who**: any journal whose manager saves a section with the box
  empty, for example to edit its policy or editors. Harvesters that
  read the free-text type get it for some journals and not for others.
- **Way round**: type "Peer-reviewed Article" into the box. The records
  carry the words once for each language they were typed in, so a journal
  that publishes in several languages types them in each language it wants
  (the default gave the word once, in the language the harvester asked
  for). Like the loss, the typed words reach a harvester's existing copies
  only on a full re-harvest. Nothing on screen says that the box has a
  default or that saving changes it.

Low: the records lose a free-text type word that harvesters are not known
to rely on. If a harvester turns out to use the word to mark peer review,
this becomes medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Its journal
  `publicknowledge` has articles 1 ("Signalling Theory Dividends") and 17
  published, both in "Articles". The dataset's repository identifier is
  `ojs2.localhost`.
- A second journal, created in step 1. Both of the dataset's sections
  were saved when the dataset was built, so neither shows the type; a new
  journal's own "Articles" section has never been saved.

1. Sign in as `admin`. Under Administration › "Hosted Journals", click
   "Create Journal". Fill in "Journal title" "u19w10 Harbour Journal",
   "Journal initials" "HJ", "Principal Contact Name" "Harbour Contact",
   "Principal Contact Email" `harbour.contact@mailinator.com`, "Country"
   "Canada", "Path" `u19w10`, English under "Languages" and "Primary
   locale". Tick "Enable this journal to appear publicly on the site",
   then click "Save".
2. In "u19w10 Harbour Journal", start a "New Submission" titled "u19w10
   Tidal Patterns". Tick the confirmation boxes and click "Begin
   Submission". Upload a PDF as "Article Text" and enter the abstract
   "Tides follow the moon.". Continue to "Review", click "Submit" and
   confirm.
3. Open the submission's workflow and its Publication › "Title & Abstract"
   page. Click "Schedule For Publication" in the workflow's header, at the
   top right. On `main` a journal can publish a submission straight from
   the submission stage, with no review and into no issue, and these steps
   rely on that: choose "Don't Assign To An Issue", click "Confirm", then
   "Publish".
   [3.5: a journal publishes only past review and into an issue. First,
   on the "Submission" stage, click "Accept and Skip Review", continue
   through its pages and click "Record Decision". Then create "Vol. 1
   No. 1 (2026)" under Issues › "Create Issue", with "Title" unticked.
   Back on "Title & Abstract", click "Schedule For Publication", pick the
   issue in "Select an issue to schedule for publication", "Save", and
   confirm "Schedule For Publication". Then, under Issues › "Future
   Issues", click the issue's "Publish Issue" › "OK".]
4. Signed out, open
   `/index.php/u19w10/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/21`
   (21 on a fresh load; another install gives the next free id).
5. As `admin`, in "u19w10 Harbour Journal", open Settings › Journal ›
   "Sections". On the "Articles" row, open the arrow and click "Edit".
   Change nothing and click "Save".
6. Signed out, open the address of step 4 again.

**Expected.** Step 6 shows the same "Resource Type" rows as step 4.
Saving a section without changing anything changes no record.

**Observed.** Step 4, in the browser view and in the XML:

```
Resource Type	info:eu-repo/semantics/article
Resource Type	info:eu-repo/semantics/publishedVersion
Resource Type	Peer-reviewed Article
```

```xml
<dc:type>info:eu-repo/semantics/article</dc:type>
<dc:type>info:eu-repo/semantics/publishedVersion</dc:type>
<dc:type xml:lang="en">Peer-reviewed Article</dc:type>
```

Step 6, after the unchanged save:

```xml
<dc:type>info:eu-repo/semantics/article</dc:type>
<dc:type>info:eu-repo/semantics/publishedVersion</dc:type>
```

The record's datestamp is the same in steps 4 and 6.

Control: `publicknowledge`'s article 1
(`…/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/1`)
has no "Peer-reviewed Article" either.

## Cause

`Dc11SchemaArticleAdapter::extractMetadataFromDataObject()`
(`plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php`, line 142)
reads the section's words in every language with
`$section->getIdentifyType(null)`. It falls back to
`metadata.pkp.peerReviewed` ("Peer-reviewed Article") only when the result is
`empty()`.

A section that was never saved has no `identifyType` row, so the result
is `null` and the fallback applies. The default section that
`ContextService::afterAddContext()` creates for a new journal sets a
title, abbreviation and policy, but no words. `SectionForm::execute()`
(`controllers/grid/settings/sections/form/SectionForm.php`) always calls
`setIdentifyType($this->getData('identifyType'), null)`, and
`EntityUpdate::updateSettings()` (`lib/pkp/classes/core/traits/EntityUpdate.php`,
used by the section DAO) deletes a language's row only for a `null` value,
so it stores an empty box as an empty string per language (the stored row
was `en=''` after step 5). An array of empty strings is not
`empty()`, so the fallback is skipped. `addLocalizedElements()` then drops
the empty values, and no type word is written.

The fallback was added in 2005 with the box
([5d177baa85](https://github.com/pkp/ojs/commit/5d177baa8579f1b7a829deb475ea80ccc5dd3ff1),
"Allow identifying type of items in a section to be overridden from the
default 'Peer-reviewed Article'"). At that time the value was one string,
and `empty('')` sent an empty box to the default. The 2007 localization
overhaul made the box multilingual, and the same `empty()` test began to
receive an array. From then on, only a section that was never saved gets
the default.

Reach:

- Every OJS journal's Dublin Core records (`oai_dc`), in every section
  with an empty box (checked in a browser on main and 3.5).
- The MARC and MARCXML records (`plugins/oaiMetadataFormats/marc*`,
  field 655) print the words of the primary language with `{if}` and have
  no default, so `null` and `''` read alike there (code).
- The "Dublin Core Indexing" meta tags (`DublinCoreMetaPlugin`) write the
  publication's own "Type" and not the section's words (code).
- OMP and OPS: their Dublin Core adapters do not read a section's words
  (OMP writes "Book", OPS the two eu-repo types), so they have no such
  fault (code).

## Proposed fix

A proposal; the team decides. In the adapter, treat a box that is empty in
every language as unset. Give the default only to a section that is peer
reviewed, meaning "Will not be peer-reviewed" is not ticked
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-save-drops-peer-reviewed/fix.diff)):

```diff
-        $types = $section->getIdentifyType(null);
-        $types = array_merge_recursive(
-            empty($types) ? [Locale::getLocale() => __('metadata.pkp.peerReviewed')] : $types,
-            (array) $publication->getData('type')
+        // The section's own words where they were typed; a section saved with
+        // the box empty stores an empty string per language, which counts as none.
+        $types = array_filter(
+            (array) $section->getIdentifyType(null),
+            fn ($type) => trim((string) $type) !== ''
         );
+        if (empty($types) && $section->getMetaReviewed()) {
+            $types = [Locale::getLocale() => __('metadata.pkp.peerReviewed')];
+        }
+        $types = array_merge_recursive($types, (array) $publication->getData('type'));
```

The rule and its only reader are both in this adapter, so the fix belongs
there and not in the form. Changing what the form stores would still leave
the empty strings already stored at every journal.

The peer-review condition keeps the restored default from claiming peer
review for a section the journal marks "Will not be peer-reviewed", such as
editorials. Before the fix, only never-saved sections got the default, and
a new journal's default section is always peer reviewed
(`setMetaReviewed(true)`), so no record claimed peer review falsely. The
Publication Facts Label plugin already reads the section's peer-review
flag the same way (`PflPlugin`, `$section->getMetaReviewed()`).

The `empty()` test on the section's words is the only one of its kind in
the adapter. The publisher test (`publisherInstitution`) reads a setting
that is not multilingual, where `''` is `empty()`.

Tried on `main`, OJS:

- Step 6 kept "Peer-reviewed Article".
- `publicknowledge`'s article 1 (reviewed "Articles", saved with the box
  empty) gained it.
- A section saved with "Will not be peer-reviewed" ticked and the box empty
  still gave no type word.
- A section with typed words gave those words alone, as without the fix.

**Alternatives:**

- Filter the empty strings without the peer-review condition: this also
  types editorials and other unreviewed sections "Peer-reviewed Article"
  at every journal whose sections were saved.
- Drop the default, so records carry only typed words: this makes the two
  kinds of section consistent the other way, and removes the word from
  every never-saved section's records. `pkp/pkp-lib#10839` also proposes
  a neutral default word ("Text"). Either is a product choice, and either
  is a one-line change to the diff above.
- Stop the form from storing empty strings: leaves the rows already stored
  at every install, so it needs a migration, and the adapter's `empty()`
  test would still get them wrong.

**What goes with it:**

- No data repair. At the majority of journals, every peer-reviewed section
  with an empty box gains "Peer-reviewed Article".
- Datestamps: neither saving a section nor deploying the fix moves a
  record's datestamp. OJS's `OAIDAO` (`classes/oai/ojs/OAIDAO.php`) takes
  it from `GREATEST(a.last_modified, i.last_modified, p.last_modified)`,
  that is the submission, issue and publication, and the section is not
  among them. So harvesters that ask only for changed records (`from=`)
  see neither the loss nor the fix until they re-harvest in full. Moving
  every record's datestamp on deployment would reach them, at the cost of
  a full re-harvest for every journal; the fix does not do that.
- Backport: the adapter has the same test on 3.5, 3.4 and 3.3, but the
  diff needs adapting. There the helper is `_addLocalizedElements()` (the
  context lines differ), 3.4 and 3.3 read `$article->getType(null)`, and
  3.3 uses `AppLocale::`. 3.3 also requires only PHP 7.3
  (`PHP_REQUIRED_VERSION` '7.3.0'), so the arrow function becomes
  `function ($type) { return trim((string) $type) !== ''; }`.
- Guard: a case in `plugins/oaiMetadataFormats/dc/tests/OAIMetadataFormat_DCTest.php`
  with a section whose words are empty strings, and one with "Will not be
  peer-reviewed". Both must call `setMetaReviewed()`: the test builds a
  bare `new Section()`, and `Section::getMetaReviewed(): bool` throws a
  TypeError when the property was never set. Or a pkp-e2e scenario on U19
  that saves a section and reads its record.

Medium: a few lines in one adapter, but they change the "Resource Type"
of records at the majority of journals, a change of default output the
team needs to agree in `pkp/pkp-lib#10839` before merging.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-save-drops-peer-reviewed/walk.js)
  takes the Steps through the screens on PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30, PostgreSQL), OJS. It records each
  OAI read's `dc:type` elements and, beside them, the section's stored
  `identifyType` rows. Run from pkp-e2e: `PROBE_FEATURE=issues-w10
  PROBE_AGENT=w10 node bin/probe.js ojs
  shared/playwright/checks/issues/oai-section-save-drops-peer-reviewed/walk.js`.
  For 3.5, put `PKP_E2E_LINE=stable-3_5_0` in front (with that line's
  fleet).
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-save-drops-peer-reviewed/neighbour.js)
  runs after it, with the fix in and out; only article 1 differed between
  the two runs.
- Walked on `main` and `stable-3_5_0`, OJS, each on a fresh load of that
  branch's dataset. The new journal's "Articles" had no `identifyType` row
  before step 5 and `en=''` after it; the dataset's own "Articles" holds
  `en=''` and `fr_CA=''`. The record's datestamp was
  `2026-09-30T22:15:55Z` in both steps 4 and 6 on main.
- Tips walked or read (OJS; OMP and OPS read only for the reach):
  - main: OJS bade233f73, pkp-lib 2e377d27fc.
  - stable-3_5_0: OJS 92b9a16b48, pkp-lib a9c76aed62. The adapter and
    `SectionForm::execute()` are as on main.
  - stable-3_4_0 (code): OJS 9571d8fde7, pkp-lib df13621c2d. The adapter
    has the same `empty($types)` test. `SectionForm` saves through
    `Repo::section()->edit()`, whose `EntityDAO::_update()` deletes only a
    `null` value and stores `''`. The default section
    (`ContextService::afterAddContext()`) sets no words.
  - stable-3_3_0 (code): OJS 9fdb9bcf9a, pkp-lib d446601ebe. The adapter
    (`Dc11SchemaArticleAdapter.inc.php`) has the same test, and
    `DAO::updateDataObjectSettings()` stores `''` with `replace()`. The
    default section sets no words.
- Introduced: `git blame` on the `empty($types)` line gives 44a4cde456
  (2021, the `Locale` rename) and 665ed1f925 (2021, PSR-12 formatting).
  Before them, `git log -S` gives 5cf91ef5e4 (2010, the move to the
  metadata adapter) and cdd367e37c (2008, the OAI overhaul), which each
  carried the test as it was, back to 8ac04ca1c7. At that commit
  `DAO::updateDataObjectSettings()` already stored each language's value,
  empty strings included. The commit predates pkp's use of GitHub, so
  there is no pull request.
- Upstream search (2026-10-01): pkp/pkp-lib and pkp/ojs for "Peer-reviewed
  Article", "identifyType", "dc:type section", "peerReviewed OAI",
  "Identify items published", "Dc11SchemaArticleAdapter".
  `pkp/pkp-lib#10839` (open, no linked pull request) names the `empty()`
  check failing on stored empty values and asks for another default.
  `pkp/pkp-lib#2688` (the "Will not be peer reviewed" flag being unused,
  closed as outdated in 2022) is a different fault.
- MySQL not checked. The stored empty string is the same there; the
  fault is in PHP.
- Not driven: 3.4 and 3.3 (the team asked for code reads there); the
  French view of the record. There the default reads "Article évalué par
  les pairs", per the request's language.
