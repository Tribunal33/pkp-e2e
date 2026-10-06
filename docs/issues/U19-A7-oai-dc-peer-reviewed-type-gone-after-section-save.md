# Saving a journal section removes "Peer-reviewed Article" from its articles' OAI-PMH Dublin Core records

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** not traced; present since at least
  [8ac04ca1c7](https://github.com/pkp/ojs/commit/8ac04ca1c71bbfd0a4c27cf974e7409a468aece2)
  (2007-08-29), which made the section's type a value per language
- **Upstream** `pkp/pkp-lib#10839` (open), covering more: it asks
  whether "Peer-reviewed Article" should be the default at all, and
  notes that the default is skipped for a section whose type is stored
  empty
- **Tracked in** spec U19 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal section's edit form has a box "Identify items published in
this section as a(n)". While the box is empty, the OAI-PMH Dublin Core
record of each article in the section gives "Peer-reviewed Article" as
a resource type, beside "info:eu-repo/semantics/article" and
"info:eu-repo/semantics/publishedVersion". That holds only until someone
saves the form. From then on the records keep the two "info:eu-repo"
values and lose "Peer-reviewed Article", although the box is still
empty.

A Journal Manager who opens a section and presses "Save", for any
reason, changes every record of the section and is not told. A section
created through the form never has the default. Only a section made
with a new journal, or imported, still gives it.

This report takes the default for an empty box as the intended
behaviour and the loss on save as the fault. The open
`pkp/pkp-lib#10839` questions the default itself, so the team's
decision on that issue comes first: if the default goes, the fix is to
remove it everywhere, not to restore it.

## Impact

- **Lost.** "Peer-reviewed Article" among the resource types of the
  section's articles in the Dublin Core records.
- **Who.** Harvesters of the journal's OAI-PMH address. Every edit of a
  section goes through the same form (adding a section editor, a
  policy), so the sections of a journal in use have mostly been saved.
- **Way round.** Type the words into the box, per section and per
  language. Whether a harvester that reads by date then picks the
  records up again was not checked.

Low: a default descriptive word is missing from a secondary output and
the record's other types stay right. No harvester was shown to rely on
the word; one that sorts articles by it would make this medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the journal "Journal of Public
  Knowledge" (`publicknowledge`). Its section "Articles" has "Identify
  items published in this section as a(n)" empty and "Will not be
  peer-reviewed" unticked, and its form was saved when the dataset was
  built.
- For the second group, a journal created on screen, because a section
  that was never saved comes with a new journal: "u19a7 Journal", path
  `u19a7`.
- The second group is for `main`. On 3.5 an article is published only
  in an issue, so step 5 there needs an issue created and published
  first; the first group is the same on 3.5.

On the dataset's journal:

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   and copy the identifier that ends in "article/17"
   (`oai:ojs2.localhost:article/17` with the dataset's own
   `config.inc.php`; the middle part is the install's `repository_id`).
2. Open `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=`
   followed by that identifier, and read "Resource Type".
3. Sign in as `admin`. Open Settings › Journal › "Sections", press
   "Edit" on "Articles", read the two fields, press "Cancel".

On a new journal, before and after a save, still as `admin`:

4. Open Administration › "Hosted Journals" and press "Create Journal".
   Type "u19a7 Journal" as the title, "UJ" as the initials, "u19a7
   Journal" as the principal contact's name, `u19a7@mailinator.com` as
   its email and `u19a7` as the path; choose "Canada" as the country;
   tick "English" as a language and as the primary language; tick
   "Enable this journal to appear publicly on the site". Press "Save".
5. Open `/index.php/u19a7/en/submission`. Make a submission titled
   "u19a7 article" in "Articles", with a file and an abstract, to
   "Submit".
6. Open the submission in the dashboard and press "Title & Abstract",
   then "Schedule For Publication". In "Review Publishing Details"
   choose "Version of Record (VoR)" and "Major Revision", press
   "Confirm", then "Publish". The new journal has no issue, so the
   panel offers no issue choice.
7. Open `/index.php/u19a7/oai?verb=ListRecords&metadataPrefix=oai_dc`
   and read "Resource Type".
8. Open Settings › Journal › "Sections", press "Edit" on "Articles",
   change nothing, press "Save".
9. Open the address of step 7 again.

**Expected.** "Resource Type" holds "Peer-reviewed Article" at steps 2,
7 and 9: at each of them the section's box is empty and "Will not be
peer-reviewed" is unticked.

**Observed.** Step 2 shows only "info:eu-repo/semantics/article" and
"info:eu-repo/semantics/publishedVersion". Step 3 shows the box empty
and "Will not be peer-reviewed" unticked. Step 7 shows the same two
values and "Peer-reviewed Article". Step 9 shows the two values alone.
In the XML:

```
step 7   <dc:type>info:eu-repo/semantics/article</dc:type>
         <dc:type>info:eu-repo/semantics/publishedVersion</dc:type>
         <dc:type xml:lang="en">Peer-reviewed Article</dc:type>

step 9   <dc:type>info:eu-repo/semantics/article</dc:type>
         <dc:type>info:eu-repo/semantics/publishedVersion</dc:type>
```

Control: with "Research Article" typed into the box and saved, the
record reads `<dc:type xml:lang="en">Research Article</dc:type>`.

## Cause

The Dublin Core record is built by OJS's
`Dc11SchemaArticleAdapter::extractMetadataFromDataObject()`. It reads
the section's type in every language and falls back to "Peer-reviewed
Article" when that is empty
([lines 142 to 146 on main](https://github.com/pkp/ojs/blob/06fd981b01c2793a006d0c2929f805dca2f781b7/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php#L142-L146)):

```php
$types = $section->getIdentifyType(null);
$types = array_merge_recursive(
    empty($types) ? [Locale::getLocale() => __('metadata.pkp.peerReviewed')] : $types,
    (array) $publication->getData('type')
);
```

`empty($types)` is true only while the section has no stored type at
all, which is how a journal's first section is created. The section
form (`SectionForm::execute()`, line 177,
`$section->setIdentifyType($this->getData('identifyType'), null)`)
stores the box for every language of the journal, as an empty string
when nothing was typed. After a save `$types` holds one empty string
per language (`['en' => '', 'fr_CA' => '']` on the dataset's journal),
a non-empty array, so no default is added. `addLocalizedElements()`
then skips the empty strings.

Reach:

- Every section saved or created through the section form with the box
  empty, whatever the language of the OAI request. One section was
  driven on screen; the rest is from the code.
- Native import is a second way to a section with no stored type:
  `NativeXmlIssueFilter` (line 343) sets `setMetaReviewed()` from the
  XML's `meta_reviewed` and never sets the type. So an imported section
  gives the default until it is saved, and one imported with
  `meta_reviewed="0"` reads "Peer-reviewed Article" today although it
  is marked as not peer-reviewed (code). The form cannot produce that
  second state, because ticking "Will not be peer-reviewed" is a save.
- No other reader: the MARC templates test the value itself
  (`{if $identifyType}`), and the Dublin Core meta tags of the article
  page do not use the section's type (code).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/fix.diff)
applied to OJS. With it, steps 2, 7 and 9 all read "Peer-reviewed
Article". Two neighbours read the same with the fix as without it: a
section saved with "Will not be peer-reviewed" ticked gives no
"Peer-reviewed Article", and one with "Research Article" typed gives
"Research Article".

Recommended, if the default stays: test the values, and give the
default only to a section that is peer-reviewed.

```diff
--- a/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php
+++ b/plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php
@@ -139,11 +139,12 @@
             $driverType,
             MetadataDescription::METADATA_DESCRIPTION_UNKNOWN_LOCALE
         );
-        $types = $section->getIdentifyType(null);
-        $types = array_merge_recursive(
-            empty($types) ? [Locale::getLocale() => __('metadata.pkp.peerReviewed')] : $types,
-            (array) $publication->getData('type')
-        );
+        // A section saved with the field left empty stores an empty string per language.
+        $types = array_filter((array) $section->getIdentifyType(null));
+        if (empty($types) && $section->getMetaReviewed()) {
+            $types = [Locale::getLocale() => __('metadata.pkp.peerReviewed')];
+        }
+        $types = array_merge_recursive($types, (array) $publication->getData('type'));
         $this->addLocalizedElements($dc11Description, 'dc:type', $types);
         $driverVersion = 'info:eu-repo/semantics/publishedVersion';
         $dc11Description->addStatement(
```

The `getMetaReviewed()` condition is there because the corrected test
alone would write "Peer-reviewed Article" for every section ticked
"Will not be peer-reviewed" whose box is empty, such as an editorial
section; it also corrects the imported section named in the Reach. The
Publication Facts Label plugin reads the same flag for the same purpose
(`PflPlugin.php`, line 209). The default stays in the language of the
request alone (`Locale::getLocale()`), as today; the fix does not
change that.

**Alternatives:**

- Remove the default, or replace it with a neutral word, which is what
  `pkp/pkp-lib#10839` asks for. Saved and never-saved sections would
  then agree too, with fewer lines. It is a product decision, and that
  issue leaves it open.
- Stop the section form from storing empty strings: wider than the
  fault, since every multilingual field of every form stores them, and
  sections already saved would still need the corrected test.

**What goes with it:**

- Behavior change: articles of peer-reviewed sections whose box is
  empty gain "Peer-reviewed Article" in their records on the next
  harvest, on every journal. No stored data, hook or API changes.
- Backport: `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` have the
  same lines with small differences around them (`AppLocale` and
  `$article->getType(null)` on 3.3), so the change is made by hand
  there. `getMetaReviewed()` is typed `bool` on 3.4 and untyped on 3.3,
  where it returns the stored integer; both work in the condition.
- Guard: a case in `OAIMetadataFormat_DCTest` for a section whose type
  is `['en' => '']`. The test's section is a bare `new Section()` (line
  286) with no `metaReviewed`, and `getMetaReviewed(): bool` would then
  throw a `TypeError` once the type is empty, so the case must call
  `$section->setMetaReviewed(true)`. A pkp-e2e test would save a
  section's form unchanged and read the record before and after.

Small: a few lines in one method and a unit test, tried as written.
That holds for restoring the default; dropping the default instead is
as few lines, but it is a product decision first.

## Evidence

- Kept script that takes the Steps as `admin` on an install freshly
  loaded from PKP's default test dataset (pkp/datasets 2c84c3c,
  2026-10-01, the `main` and `stable-3_5_0` PostgreSQL dumps, no
  upgrade needed):
  [`shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/walk.js),
  run with `PROBE_FEATURE=issues-a7 PROBE_AGENT=a7 node bin/probe.js ojs shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). After the steps it
  takes the two neighbour saves on the new journal's "Articles".
- Where the walk differed from the Steps: it did not open
  ListIdentifiers (step 1) but used `oai:ojs2.localhost:article/17`,
  the identifier under the dataset's own config.
- On 3.5 the script takes steps 1 to 3 only, which showed what main
  showed. Steps 4 to 9 were not taken there; the adapter's lines (140
  to 144) and the section form's save are the same in the code.
- The script also reads the new section's `section_settings` rows:
  before the save `abbrev`, `policy` and `title` only; after it an
  `identifyType` row for `en` holding an empty string.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/fix.diff ojs`,
  then `walk.js` as above, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/oai-dc-peer-reviewed-type-gone-after-section-save/fix.diff ojs`.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc); 3.5 at OJS
  18d097d94e (lib/pkp 1fb843f491), on PostgreSQL.
- Code read on main: `plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php`
  (the type lines, `addLocalizedElements()`),
  `controllers/grid/settings/sections/form/SectionForm.php`
  (`initData()`, `execute()`), `classes/section/Section.php`,
  `schemas/section.json`, lib/pkp `classes/core/EntityDAO.php`
  (`_insert()`, `_update()`),
  `plugins/importexport/native/filter/NativeXmlIssueFilter.php` (the
  section it builds), the `marc` and `marcxml` record templates,
  `plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`,
  `plugins/generic/pflPlugin/PflPlugin.php`,
  `plugins/oaiMetadataFormats/dc/tests/OAIMetadataFormat_DCTest.php`.
- 3.4 and 3.3 by code: the adapter on pkp/ojs `stable-3_4_0`
  (9571d8fde7) and `stable-3_3_0` (9fdb9bcf9a,
  `Dc11SchemaArticleAdapter.inc.php`) has the same `empty($types)`
  test, and each branch's `SectionForm` sets the type from the form for
  every language. On 3.3 the settings are written by pkp-lib
  `DAO::updateDataObjectSettings()` (d446601ebe), which stores an empty
  string as a row too.
- Introduced: `git log -S'empty($types)'` in pkp/ojs ends at
  8ac04ca1c7 ("#2961# Localization overhaul", Alec Smecher), which
  turned the type into a value per language in
  `classes/oai/format/OAIMetadataFormat_DC.inc.php`. Whether the form
  stored empty strings then was not read, hence "not traced". The
  default itself is older (5d177baa85, 2005).
- Upstream search, 2026-10-01, issues and PRs, open and closed:
  pkp/pkp-lib by ""Peer-reviewed Article"", "identifyType", "dc:type
  section OAI" and "Dc11SchemaArticleAdapter"; pkp/ojs by
  ""Peer-reviewed Article"". `pkp/pkp-lib#10839` (Kaitlin Newson,
  2025-01-24, no PR) says of this test that it "doesn't work correctly
  if there are empty entries for section types in the database".
  `pkp/pkp-lib#2688` (closed, not planned) is about the "Will not be
  peer-reviewed" flag being unused, not this fault.
- Not driven: the French record (`…/fr_CA/oai`), a journal with two
  languages where one language's box is filled, a section created
  through the form, an imported section, and the fix's unit test (the
  `TypeError` is from reading the test and the getter).
