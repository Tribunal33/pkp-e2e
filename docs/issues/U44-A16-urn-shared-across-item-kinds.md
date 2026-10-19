# An editor can give one URN to an issue, an article and its galley without any warning

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10826` for `pkp/pkp-lib#10821` · [3fdd61a86a](https://github.com/pkp/pkp-lib/commit/3fdd61a86aa5ba6e72aac38304de38dea4c540b5) · 2025-01-20 · Bozana Bokan (bozana); with `pkp/ojs#4613` ([3576a57f07](https://github.com/pkp/ojs/commit/3576a57f0777a0a82a5698eddd7de41c815a9cd0)) and `pkp/omp#1813` ([0de89cb31c](https://github.com/pkp/omp/commit/0de89cb31cbd711110fe063a4ac500a11420e838), its commit titled for `pkp/pkp-lib#9497`)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U44 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a16)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor types, on an article's "Identifiers" page in the workflow, a
URN that an issue or a galley of the journal already carries, and "Save"
stores it. The other way round, the "Identifiers" tab of a galley's or
an issue's edit window accepts a suffix whose URN another kind of item
already carries, and assigns it. On a press, a monograph, its chapters,
its publication formats and (by the code) its files can share one URN
the same way. The tab's own help line says a suffix "must be unique
among all publishing objects with the same URN prefix assigned", and
3.4 refused such a URN (by the code); today only a second item of the
same kind is refused.

The duplicate is stored with no message, and it goes out: once the
items are published, the article page, the issue's table of contents,
the book page's formats, the pages' meta tags and the OAI records name
it for each item (by the code). Every 3.5 release has the narrowed
check, so a 3.5 install that assigns URNs this way may already hold
such duplicates, and no screen lists them.

It needs the URN plugin with "Enter an individual URN suffix for each
published item…" chosen and URNs on for more than one kind of item.

## Impact

- **Lost**: a correct public record. Two or three items carry one URN,
  and the public pages, the meta tags readers' tools collect, the OAI
  records and the native XML export all name it for each of them.
- **Who**: editors and managers of journals and presses that assign URNs
  with individual suffixes to more than one kind of item (articles,
  galleys, issues; monographs, chapters, formats, files). It takes a
  suffix typed for one item that matches another kind of item's. OPS
  ships no URN plugin.
- **Way round**: none on screen to find a clash. Once found, "Clear" on
  the item's tab, or an emptied "URN" box on the article's page, removes
  the URN from the item that should not have it.

Medium: the duplicate reaches the public record silently, but only when
a typed suffix matches another kind of item's. It would be high if a URN
registration plugin sent the clash to a national library; none ships
with the apps.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` or OMP `main` (or
  `stable-3_5_0`). The URN plugin is off; steps 1 to 3 turn it on.

Setting up the URN plugin:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins". On the "URN" row under "Public
   Identifier Plugins", tick "Enabled".
3. Press the row's arrow, then "Settings". Tick "Articles", "Issues" and
   "Galleys" (OMP: "Monographs", "Chapters" and "Publication Formats"),
   type `urn:nbn:de:0000-` under "URN Prefix", choose "Enter an
   individual URN suffix for each published item…" under "URN Suffix",
   leave "Check Number" unticked, choose `urn:nbn:de` under "Namespace",
   type `https://nbn-resolving.de/` under "Resolver URL", and press
   "Save".

OJS:

4. Open Issues › "Future Issues", press the arrow of "Vol. 2 No. 1
   (2015)", then "Edit", then the "Identifiers" tab. Type `h19k` under
   "URN Suffix" and press "Save".
5. Open the issue's "Identifiers" tab again. It shows the greyed "URN
   Prefix" box with `urn:nbn:de:0000-`, `h19k` in "URN Suffix", the line
   "What you see is a preview of the URN. Select the checkbox and save
   the form to assign the URN." and "Assign the URN to this issue",
   ticked. Press "Save".
6. Open submission 1, "Signalling Theory Dividends" (it opens on its
   unpublished version 1.1), and select Publication › "Identifiers".
   Type `urn:nbn:de:0000-h19k` under "URN" and press "Save".
7. Select Publication › "Galleys", open the "PDF Version 2" row's menu,
   press "Edit", then the "Identifiers" tab. Type `h19k` under "URN
   Suffix" and press "Save".
8. Open the galley's "Identifiers" tab again: the prefix and suffix
   boxes, the preview line and "Assign the URN to this galley", ticked.
   Press "Save".
9. Open submission 5, "Genetic transformation of forest trees", select
   "Identifiers", type `urn:nbn:de:0000-h19k` and press "Save".

OMP:

4. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture", select Publication › "Chapters" and press
   "Introduction: Contexts of Popular Culture", then the "Identifiers"
   tab. Type `h19k` under "URN Suffix" and press "Save".
5. Open the chapter's "Identifiers" tab again: the prefix and suffix
   boxes, the preview line and "Assign the URN to this chapter", ticked.
   Press "Save".
6. Select Publication › "Identifiers", type `urn:nbn:de:0000-h19k` under
   "URN" and press "Save".
7. Select Publication › "Publication Formats" and press "Add publication
   format". Type `h19k EPUB` under "Name" and press "OK". (The book's own
   "PDF" format is hosted remotely, and a remote format has no
   "Identifiers" tab.) Press the new format's arrow, then "Edit", then
   the "Identifiers" tab. Type `h19k` under "URN Suffix" and press "Save".
8. Open the format's "Identifiers" tab again: the prefix and suffix
   boxes, the preview line and "Assign the URN to this publication
   format", ticked. Press "Save".
9. Open submission 7, "Accessible Elements: Teaching Science Online and
   at a Distance", select "Identifiers", type `urn:nbn:de:0000-h19k` and
   press "Save".

**Expected**: step 6 is refused under "URN" with "The given URN suffix
is already in use for another published item. Please enter a unique URN
suffix for each item.", because the issue (OMP: the chapter) carries
that URN. Step 7 is refused on the tab with "Errors occurred processing
this form" and the same message, and nothing is saved.

**Observed**: step 6 shows "Saved", and the box keeps
`urn:nbn:de:0000-h19k` (`POST …/submissions/1/publications/2` answers
200; OMP `…/submissions/4/publications/4`). Step 7 closes the window,
and step 8 assigns the URN: the galley's (format's) tab then reads
"urn:nbn:de:0000-h19k The URN is assigned to this galley." ("… to this
publication format."). The issue, version 1.1 of submission 1 and its
galley "PDF Version 2" all carry `urn:nbn:de:0000-h19k`; on OMP the
chapter, book 4 and the format "h19k EPUB" do.

Step 9 is refused, as it should be:

```
POST …/api/v1/submissions/5/publications/6   400
{"pub-id::other::urn":["The given URN suffix is already in use for another published item. Please enter a unique URN suffix for each item."]}
```

## Cause

`PKPPubIdPlugin::checkDuplicate()`
(`lib/pkp/classes/plugins/PKPPubIdPlugin.php` line 480) asks only the
DAO of the object's own type. It loops over `getPubObjectTypes()`
(publication, representation, submission file) and skips every type the
object is not an instance of:

```php
foreach ($this->getPubObjectTypes() as $type => $fqcn) {
    if (!$pubObject instanceof $fqcn) {
        continue;
    }
```

The apps' subclasses do the same for their own type and return early.
OJS `PubIdPlugin::checkDuplicate()` (`classes/plugins/PubIdPlugin.php`
line 151) checks an issue only against issues and never asks the issue
DAO for any other object. OMP's (line 224) does the same for chapters.
Both callers go through these methods: the "Identifiers" page through
`URNPubIdPlugin::validatePublicationUrn()`, the tabs through
`PKPPubIdPlugin::verifyData()`.

3.3 and 3.4 asked every type's DAO, and the OJS and OMP subclasses
added the issue or chapter DAO before calling the parent. The ID to
leave out was passed only where the caller's type name equalled the
type's key. The article's page passed the literal `'Publication'` with
the submission ID, so it was checked against every kind with only its
own submission left out. The tabs passed `get_class($pubObject)`, which
on 3.4 (a namespaced class) never equals a key, and on 3.3 does only
for issues, chapters and files. So on those tabs every kind was checked,
the item's own one included. That refused nothing in practice, because
a tab's URN is not stored while its suffix is being checked (by the
code).

On `main`, a 2024 clean-up
([6bfef785aa](https://github.com/pkp/pkp-lib/commit/6bfef785aa7c1512dc37eba17ca79b394638d347))
typed the exclude-ID parameter of every `pubIdExists()` as `int`. From
then, the `null` the old loop passed for the other types (for every type
on the tabs) made each URN check throw a `TypeError`. 3fdd61a86a,
written to fix the URN plugin for the 3.5 workflow, removed the `null`
by taking the object and checking only its own type, and the other
kinds were dropped with it.

Reach:

- The article's or monograph's "Identifiers" page, and the "Identifiers"
  tabs of galleys, issues, chapters and publication formats: checked on
  screen on OJS and OMP, `main` and 3.5. A press file's tab goes through
  the same `verifyData()` path (checked in the code).
- Only the URN plugin calls `checkDuplicate()` in the three apps; DOIs
  are no longer a pub-id plugin (checked in the code).
- URNs made from patterns or the default pattern are never checked, by
  design (each kind's pattern differs).
- Where the shared URN shows, by the code: OJS's article page and its
  `DC.Identifier.URN` and `citation_urn` tags (the publication's), the
  issue's table of contents (the issue's), the OAI Dublin Core record
  (`Dc11SchemaArticleAdapter`: the issue's as `dc:source`, the
  article's as `dc:identifier`, each galley's as `dc:relation`, so one
  record can carry it three times); OMP's book page (the formats'),
  its meta tags (the monograph's, a chapter page's the chapter's) and
  the per-format OAI record; and the native XML export of issues, articles, galleys, formats and files.
- Separate faults, not covered here: the page's check leaves out the
  wrong submission ([U44 A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A4-article-own-urn-refused-as-in-use.md)),
  and two URNs that differ only in case pass (U44 A12).

## Proposed fix

Make `checkDuplicate()` ask every type's DAO again, excluding the
object's own ID only in its own type and passing `0` (an ID no row has)
to the others, so the `int` parameter is respected. The apps' subclasses
check their own type the same way, then always hand on to the parent.
It is a proposal.

```diff
         foreach ($this->getPubObjectTypes() as $type => $fqcn) {
-            if (!$pubObject instanceof $fqcn) {
-                continue;
-            }
             $typeDao = match ($type) {
                 'Publication' => Repo::publication()->dao,
                 'Representation' => Application::getRepresentationDAO(),
                 'SubmissionFile' => Repo::submissionFile()->dao,
+                default => null, // An application's own types are checked by its subclass.
             };
-            if (isset($typeDao) && $typeDao->pubIdExists($this->getPubIdType(), $pubId, $pubObject->getId(), $contextId)) {
+            // Only the object itself is excluded, among the objects of its own type.
+            $excludeId = $pubObject instanceof $fqcn ? (int) $pubObject->getId() : 0;
+            if ($typeDao && $typeDao->pubIdExists($this->getPubIdType(), $pubId, $excludeId, $contextId)) {
```

OJS `PubIdPlugin::checkDuplicate()` (OMP the same with `Chapter` and
`ChapterDAO`):

```diff
-        $allowedPubObjectTypes = $this->getPubObjectTypes();
-        if ($pubObject instanceof $allowedPubObjectTypes['Issue']) {
-            if (Repo::issue()->dao->pubIdExists($this->getPubIdType(), $pubId, $pubObject->getId(), $contextId)) {
-                return false;
-            }
-            return true;
+        $excludeId = $pubObject instanceof Issue ? (int) $pubObject->getId() : 0;
+        if (Repo::issue()->dao->pubIdExists($this->getPubIdType(), $pubId, $excludeId, $contextId)) {
+            return false;
         }
         return parent::checkDuplicate($pubId, $pubObject, $contextId);
```

The full diffs are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-shared-across-item-kinds/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-shared-across-item-kinds/fix-omp.diff)
(the pkp-lib part is the same in both). It was tried on `main`: with it, steps 6 and 7 were refused with the
"already in use" message on OJS and OMP, and step 9 still was. As a
neighbour check, URNs no other item carries were saved on the issue (OMP:
the chapter), the galley (a new format) and the article's (monograph's)
page, each tab's second "Save" assigned its own suffix, and OMP saved the
monograph's own URN a second time: all accepted with and without the
fix, so it refuses nothing it should not.

**Alternatives**

- Restore the 3.4 signature (a type name and an ID): it undoes the
  object-based API that 3fdd61a86a gave callers, for no gain.
- One query over every settings table: a new pattern, and each app
  would still need its own tables added.
- Let `pubIdExists()` take a nullable ID: changes an interface that
  plugins implement.

**What goes with it**

- Callers keep their signatures; no REST API or hook changes. A
  third-party plugin that extends `PubIdPlugin` gets the stricter check,
  which is what the screens promise.
- The U44 A4 fix changes the same line: a publication is left out by its
  submission ID, since the publication DAO's `pubIdExists()` compares
  `s.submission_id`. Whichever lands second writes the line as:

  ```php
  $excludeId = match (true) {
      !$pubObject instanceof $fqcn => 0,
      $type === 'Publication' => (int) $pubObject->getData('submissionId'),
      default => (int) $pubObject->getId(),
  };
  ```

  The two fixes meet only there: A4 picks the ID for the object's own
  type, this one adds the other types with `0`.
- `validatePublicationUrn()` hands `null` to `checkDuplicate()` when a
  publication is added through the REST API with a URN (no screen does
  this). Today that checks nothing; with the fix, `null` matches no type
  and is checked against every kind with `0`, so such a URN is refused
  when any item carries it, an earlier version of the same submission
  included (by the code).
- Duplicates already stored stay as they are; which item keeps the URN
  is the journal's call. A query over the settings tables
  (`pub-id::other::urn` in `publication_settings`,
  `publication_galley_settings`, `issue_settings`,
  `submission_chapter_settings`, `publication_format_settings`,
  `submission_file_settings`), grouped by value, lists them.
- Backport: the diffs apply to `stable-3_5_0` as written (its
  `checkDuplicate()` methods match `main`). 3.4 and 3.3 need nothing.
- Guard: a pkp-lib test that gives a galley an article's URN and an
  article a galley's, and expects both refused; the e2e scenario for
  U44 Rule 12a.

Medium: the existing check is widened in place, a few lines each, but in three repos (pkp-lib and the OJS and OMP subclasses), with a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-shared-across-item-kinds/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-shared-across-item-kinds/walk.js`
  (the command's header names the reset) on an install freshly loaded from the default dataset (pkp/datasets
  eaf024c5, 2026-10-18, PostgreSQL), and on 3.5 with
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front. `WALK=neighbour`
  takes the neighbour check alone on a fresh load: steps 1 to 3, then
  suffix `h19n` on the issue (OMP: the chapter) saved and assigned, suffix
  `h19n2` on the galley (OMP: a new format "h19k EPUB"), and
  `urn:nbn:de:0000-h19n3` on the article's (monograph's) page, OMP saved a
  second time. The fix was tried with
  `node bin/try-fix.js apply …/fix-ojs.diff ojs` and `… fix-omp.diff omp`,
  and reverted after.
- Tips: `main` OJS 6b4323ced7, OMP 5777025be (pkp-lib 042726ebf6);
  `stable-3_5_0` OJS 007c2cd0d6, OMP 2d575f250 (pkp-lib 092ec34b0f);
  `stable-3_4_0` OJS 0012bd1022, OMP e30fa7e38c (pkp-lib a71d6bd2ca);
  `stable-3_3_0` OJS d7d9dd14ec, OMP 8e72fc8836 (pkp-lib 5e84acd11b).
- Code read on each branch: pkp-lib `PKPPubIdPlugin::checkDuplicate()`,
  `verifyData()` and `getPubObjectTypes()` (3.3: `.inc.php`); OJS and OMP
  `classes/plugins/PubIdPlugin.php` `checkDuplicate()`;
  `URNPubIdPlugin::validatePublicationUrn()`; the `pubIdExists()` of the
  publication, galley, submission-file, issue, chapter and
  publication-format DAOs; for the reach, the article, issue and book
  templates, the Dublin Core and Google Scholar plugins, the dc11 OAI
  adapters and the native export filters. Not in scope, 3.4 only: its submission-file
  `pubIdExists()` compares the file ID with `=` rather than `<>`, so a
  file's URN is never found there.
- Introduced: `git blame` on the `continue` lines gives 3fdd61a86a; the
  OJS and OMP subclass lines blame to 3576a57f07 and 0de89cb31c. The PRs
  are listed on `pkp/pkp-lib#10821`; OMP 0de89cb31c is titled
  `pkp/pkp-lib#9497` ("Update pubIds plugin for vue3") but merged in
  `pkp/omp#1813`, titled for #10821. 6bfef785aa added the `int` type to
  `PKPPubIdPluginDAO::pubIdExists()`. Every 3.5 tag (3_5_0-0 on)
  contains 3fdd61a86a.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library,
  issues and PRs, for "URN duplicate", "URN unique galley", "already in
  use" URN, "URN issue galley same", "URN unique", `checkDuplicate` and
  `pubIdExists`. `pkp/pkp-lib#10821` and PR `pkp/pkp-lib#10826` are the
  introducing change; `pkp/pkp-lib#6293` (PR `pkp/pkp-lib#8986`) is about
  check numbers; `pkp/pkp-lib#285` is a 2.x change about galley
  identifiers.
- Not driven: a press file's tab (the `verifyData()` path, read in the
  code); an issue galley (no URN support); 3.4 and 3.3 (code only);
  published items' pages, meta tags, OAI records and exports (read in the
  code); third-party URN registration plugins (not in the apps). MySQL not checked (the queries
  compare strings and integers only).
