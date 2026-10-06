# A preprint server with nothing posted shows a blank "Archives" page, with no message

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** two changes together: [df0ab2a2f5](https://github.com/pkp/ops/commit/df0ab2a2f534b4c3767205d3eda67353d7d8275f) · 2019-09-26 · ajnyga (ajnyga) wrote the empty-list branch with a message key that was never added; `pkp/pkp-lib#5123` for `pkp/pkp-lib#5122` · [cafe5d98cb](https://github.com/pkp/pkp-lib/commit/cafe5d98cb9f3a95492c4bf4512e568499c90ae7) · 2019-10-02 · Alec Smecher (asmecher) made the list an object, so the template's check for an empty list is always false
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#ops1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A visitor opens "Archives" on a preprint server with nothing posted yet
and sees the heading and the search box, then nothing: no sentence says that nothing has been posted, as a section's
empty page does ("Nothing has been posted in this section yet.").

It costs nothing but a moment's doubt: the visitor cannot tell an empty
server from a page that failed to load its list.

## Impact

- **Lost**: nothing.
- **Who**: any visitor to a new server, from its launch until its first
  preprint is posted. A new server's main menu links to "Archives", and
  every theme without its own copy of the page shows it this way (OPS
  ships only the default theme, which uses the core page).
- **Way round**: none needed.

Low: a missing sentence; the page's content is otherwise right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`, freshly loaded. Its server
  `publicknowledge` has posted preprints, so the steps create a second
  server with nothing posted. The `stable-3_5_0` dataset takes the same steps.

1. Sign in as `admin` (password `admin`).
2. Go to Administration › "Hosted Servers" and press "Create Server".
3. Fill in "Server title" "Empty Server u17j", "Server initials" "ESU",
   "Principal Contact Name" "Empty Server u17j", "Principal Contact
   Email" "emptyu17j@mailinator.com", "Country" "Canada", "Path"
   "emptyu17j",
   keep English as the language, and tick "Enable this preprint server
   to appear publicly on the site". Press "Save".
4. Log out.
5. Open the new server's home page (`/index.php/emptyu17j`) and press
   "Archives" in the main menu.

**Expected:** under the heading "Archives" and the search box, a
sentence saying that nothing has been posted yet.

**Observed:** the page (`/index.php/emptyu17j/preprints`) reads, in
full below the site header:

```
Home / Archives
Archives
Search
```

The server's one section has its own page,
`/index.php/emptyu17j/preprints/section/preprints`, which on the same
server reads "Nothing has been posted in this section yet."

## Cause

The "Archives" template, OPS `templates/frontend/pages/preprints.tpl`
([line 36](https://github.com/pkp/ops/blob/c8af945bb7/templates/frontend/pages/preprints.tpl#L36)),
chooses its empty branch with `{if empty($publishedSubmissions)}`.
`PreprintsHandler::index()`
([line 78](https://github.com/pkp/ops/blob/c8af945bb7/pages/preprints/PreprintsHandler.php#L78))
assigns `$publishedSubmissions` from the submission collector's
`getMany()`, a `LazyCollection`. `empty()` on an object is always false,
so the template always takes the list branch: on an empty server it
prints an empty `<ul>`, and the pagination include prints nothing
because there is no previous or next page.

When the archive page was written (df0ab2a2f5, 2019), the handler's
`getMany()` returned a PHP array and the check worked. A week later
`pkp/pkp-lib#5123` (cafe5d98cb, for `pkp/pkp-lib#5122`) made the
submission service return an iterator, and every later version returns
an object (`DAOResultIterator` on 3.3, `LazyCollection` from 3.4).

The empty branch would not have helped anyway: the key it prints,
`archive.noSubmissions`, is defined in no locale file of OPS or its
pkp-lib, in any version. Had the branch been taken, the page would have
shown `##archive.noSubmissions##`.

Reach:

- The home page's "Latest preprints" (`indexServer.tpl`) has no empty
  branch at all and shows its heading over an empty list on the same
  server (code). That page never had a message, so its gap is not this
  fault; it is left out.
- Any "Archives" page past the last one also has an empty list, on a
  server that has posted preprints; it is spec U17's separate entry
  OPS5 (code and on screen).
- The same `empty()` check on a collection object sits in the category
  page's `catalogCategory.tpl` (`empty($results)` on a paginator, all
  three apps), tracked as spec U16 A1 (code). OJS's issue archive and
  OMP's catalog pages pass arrays (`->toArray()`) and are not affected
  (code).

## Proposed fix

Test the archive's total, which the handler already assigns, and add
the missing English text:

```diff
--- a/templates/frontend/pages/preprints.tpl
+++ b/templates/frontend/pages/preprints.tpl
@@ -33,7 +33,7 @@
 	{include file="frontend/components/archiveHeader.tpl"}
 
 	{* No preprints have been published *}
-	{if empty($publishedSubmissions)}
+	{if !$total}
 		<p>{translate key="archive.noSubmissions"}</p>
 
 	{* List preprints *}
--- a/locale/en/locale.po
+++ b/locale/en/locale.po
@@ -209,6 +209,9 @@
 msgid "archive.archivesPageNumber"
 msgstr "Archives - Page {$pageNumber}"
 
+msgid "archive.noSubmissions"
+msgstr "Nothing has been posted yet."
+
 msgid "about.contact"
 msgstr "Contact"
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archives-empty-server-says-nothing/fix.diff).
Tried on `main`: the new server's "Archives" read "Nothing has been
posted yet." under the search box. `publicknowledge`'s "Archives"
still listed its 17 preprints, and its page 2, past the last one,
read the same with the fix in and out ("Previous 26-25 of 17", OPS5's
fault, not the fix's).

`$total` is the count of every posted preprint of the server, so the
branch means what its comment says ("No preprints have been
published"), and the wording follows the section page's
`section.emptySection`. The rule sits in the template, as in
`pkp/pkp-lib#10716`, where the editorial masthead's `!empty($reviewers)`
on a `LazyCollection` was fixed in the template too.

This is a proposal; the team decides.

**Alternatives**:

- Pass an array from the handler (`getMany()->toArray()`, as
  `SectionsHandler` and OJS's `IssueHandler` do): tried, and it also
  makes a page past the last one say "Nothing has been posted yet." on a
  server that has posted preprints, dropping that page's "Previous"
  link. That page is better answered with "404 Not Found" (spec U17
  OPS5).
- `{if !$publishedSubmissions->count()}`, as in `pkp/pkp-lib#10716`: the
  same past-the-end effect as the array.

**What goes with it**:

- Translations: PKP has no fallback to English. For a language that
  lacks a key, `Locale::translate()` prints the key itself, so until
  the key is translated an empty server in any other language shows
  `##archive.noSubmissions##` where today it shows nothing. No
  translated key fits: `section.emptySection` names a section, and
  pkp-lib's `common.noItemsFound` ("No items found.", in 47 of 71
  languages) reads as an empty search and names no preprints. The new
  key is recommended, with that cost accepted until Weblate fills it:
  it shows only on an empty server's "Archives", and the page's own
  heading, `archive.archives`, is translated in only 11 of OPS's 18
  languages anyway.
- Backport: both hunks apply to `stable-3_5_0` and `stable-3_4_0` as
  written. On `stable-3_3_0` the template line is the same, and the text
  goes in `locale/en_US/locale.po`.
- A third-party theme that overrides `preprints.tpl` keeps its own
  copy of the check and needs the same change.
- Test: an e2e check in spec U17 (a **Planned** item): a server with
  nothing posted shows the sentence on "Archives".

Small: one line in one template and one English text.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archives-empty-server-says-nothing/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archives-empty-server-says-nothing/lib.js))
  takes the Steps and records what stands under the archive header,
  then the section page as the control.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js ops shared/playwright/checks/issues/archives-empty-server-says-nothing/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `WALK=neighbour` in front, signed out and
    creating nothing, reads `publicknowledge`'s "Archives" (its 17
    preprints) and its page 2, past the last one.
- Walks: OPS on `main` and `stable-3_5_0`, on PostgreSQL; datasets from
  pkp/datasets c657990 (2026-10-01). No request failed on the server and
  no page script failed.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/archives-empty-server-says-nothing/fix.diff ops`,
  the walk and the neighbour check each on a freshly loaded dataset,
  then reverted; the handler alternative was tried the same way.
- Not driven: 3.4 and 3.3. A theme other than the default.
- Tips:
  - **`main`:** OPS c8af945bb7, its pkp-lib 3dc90c81a6.
  - **`stable-3_5_0`:** OPS 38b61882d3, pkp-lib cf3f984335.
  - **`stable-3_4_0`:** OPS acd8ae704b, pkp-lib 32b0f4b4af.
  - **`stable-3_3_0`:** OPS c5532e2161, pkp-lib f6ab331645.
- Code reads:
  - `main` and 3.5: `PreprintsHandler::index()`, `preprints.tpl`,
    `sections.tpl` and `SectionsHandler`, `indexServer.tpl`,
    pkp-lib's `frontend/components/pagination.tpl`; a search for
    `archive.noSubmissions` over OPS, its pkp-lib and plugins (the
    template's use only); a search for `empty($` in the frontend
    templates of OJS, OMP, OPS and pkp-lib, with each handler's type.
  - 3.4: the same handler line (`getMany()`, a `LazyCollection` from
    pkp-lib's `Collector::getMany()`) and template; the key undefined.
  - 3.3: `PreprintsHandler.inc.php` assigns
    `Services::get('submission')->getMany()`, which returns
    `DAOResultFactory::toIterator()` (a `DAOResultIterator`); the same
    template; the key undefined in `locale/en_US`.
- The trace: `git blame` on the template's check and key (df0ab2a2f5,
  "Introduce simple frontend archive", no PR, the file then
  `templates/frontend/pages/archive.tpl`); the handler's line through
  48d5e43981, 26d6667836 and b89fd59f16 (refactors, the same
  collection type); pkp-lib's `PKPSubmissionService::getMany()` returned
  `toArray()` at df0ab2a2f5's date (4afccd37c8) and `toIterator()` from
  cafe5d98cb (`git log -S "toIterator()"`); `git log -S
  "archive.noSubmissions"` over the locale files of both.
- Upstream searches (2026-10-02, pkp/pkp-lib, pkp/ops, pkp/ui-library):
  "archive empty preprints", "archives page nothing posted", "archives
  page no preprints message", `archive.noSubmissions`,
  `PreprintsHandler`, "OPS archive pagination" (`pkp/pkp-lib#9716`, the
  archive's page links, fixed; not this), "LazyCollection empty template"
  (`pkp/pkp-lib#10716`, the masthead's reviewers, fixed; the same
  mistake on another page). No match.
