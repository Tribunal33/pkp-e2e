# Catalog "Add Entry" still offers a book already chosen, and "Save" publishes it twice

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/ui-library#88` for `pkp/pkp-lib#5865` · [d0ffc05a](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3) · 2020-05-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's Catalog page, an editor chooses a book in the "Add Entry"
box. The box keeps suggesting that book, so it can be chosen a second
time, and "Save" then publishes it twice. Nothing on screen says so.

On `main` the book's first and only version is numbered "Version of
Record 2.0" instead of 1.0, on the public book page too. The author is
mailed "Publication Published" twice, and the Activity Log says "The
submission was published." twice. On 3.5 and older the version stays 1
and no email goes out; only the log line repeats.

Removing the repeated book from the box before "Save" avoids it. After
"Save", nothing on screen renumbers the version or takes the second
email back.

## Impact

- **Lost**: on `main`, a correct version number in the book's public
  record, for good, and a duplicate email and task notification to each
  author.
- **Who**: press managers and Press editors on Content › Catalog ›
  "Add Entry", when they search for a book they have already chosen,
  for instance while adding several books one search at a time.
- **Way round**: none after "Save".

Medium: on `main` every reader sees a wrong version number on a book
that was published once, silently and with no repair on screen, though
the book is published as intended. On 3.5, 3.4 and 3.3, where only the
log line repeats, it is low.

## Steps to reproduce

Preconditions: the default dataset, OMP `main`. Nothing else. Book 7,
"Accessible Elements: Teaching Science Online and at a Distance", is in
Copyediting and unpublished; its author account is `dkennepohl`.

1. Sign in as `dbarnes`.
2. Open Content › "Catalog" (`/index.php/publicknowledge/en/manageCatalog`).
3. Press "Add Entry".
4. In "Find monographs to add to the catalog", type `Accessible`, wait
   for the suggestion and click "Accessible Elements: Teaching Science
   Online and at a Distance". It shows in the box as a chosen book with
   a "Remove …" cross.
5. Type `Accessible` again and wait for the suggestion.
6. Click "Accessible Elements: Teaching Science Online and at a
   Distance" again.
7. Press "Save".
8. Open submission 7. Read the version in the workflow's left-hand menu,
   under "Publication". Then press "Activity Log".
9. Read dkennepohl@mailinator.com's mailbox.
10. Sign out and open the book's page,
    `/index.php/publicknowledge/en/catalog/book/7`. Read "Versions".

**Expected:** at step 5 the book already chosen is not suggested again.
Whatever is chosen, "Save" publishes each book once: version 1.0, one
"The submission was published." line, one "Publication Published"
email, and "Versions" reads "(Version of Record 1.0)".

**Observed:** at step 5 the box suggests "Accessible Elements: …" again,
and step 6 adds it a second time, so the box holds the same title twice.
"Save" sends the ID twice:

```
PUT /index.php/publicknowledge/api/v1/_submissions/addToCatalog
submissionIds[]=7&submissionIds[]=7                 → 200 []
```

The panel closes and the list shows the book once. In its workflow the
menu under "Publication" holds one version, "Version of Record 2.0".
The Activity Log lists "The submission was published." twice, and
dkennepohl@mailinator.com receives two "Publication Published" emails.
Signed out, the book's page reads "Versions 2026-10-03 (Version of
Record 2.0)". No request failed and the browser showed no script error.

[On 3.5 the same steps send the same request. The version stays 1 and
no email arrives; the Activity Log lists the line twice.]

Two different books chosen ("distance" › "Mobile Learning: …", then
"distance" › "Accessible Elements: …") are each published once, at 1.0.

## Cause

Two layers let the duplicate through.

`lib/ui-library/src/components/Form/fields/FieldSelectSubmissions.vue`
`setSuggestions()` drops the books already chosen from the suggestions
with `!this.selected.find((s) => s.id === item.id)`. The chosen items
are the suggestions themselves, `{value, label}`, as the `select()`
method of `FieldBaseAutosuggest.vue` appends them, so `s.id` is always
`undefined` and the filter removes nothing. `FieldSelectIssues.vue`
does the same job correctly with `s.value === item.id`. The `s.id` has
been there since the field was written for the refactor that replaced
the old catalog list panel (`d0ffc05a`, `pkp/pkp-lib#5865`), so a chosen
book has been offered again since 3.3.

OMP's `BackendSubmissionsController::addToCatalog()`
(`api/v1/_submissions/BackendSubmissionsController.php`) works in two
loops. The first loads each posted ID with `Repo::submission()->get()`,
skips a publication that is already published, validates the rest and
collects them in `$validPublications`. The second publishes each one.
A repeated ID is loaded twice in the first loop, as two separate
publication objects for the same row, both unpublished, so both pass
the check before either is published.

On `main`, `Repo::publication()->publish()` numbers a version when it
publishes one that has none. The first call stores 1.0. The second
starts from its own copy, loaded before the first call, which still has
no version, so it asks `getNextAvailableVersion()`, gets 2.0 because
1.0 is now taken, and writes its copy over the row. On 3.5 and older the
version number is set when a version is created, not when it is
published, so it stays 1.

Reach of the second `publish()` on `main`:

- Seen on the walk: a second "The submission was published." log row, a
  second "Publication Published" email and a second
  `NOTIFICATION_TYPE_PUBLICATION_PUBLISHED` task notification for the
  author (`NotifyAuthorOnPublication`).
- Code read: the `Publication::publish` hook fires twice for plugins,
  and the search index is updated twice. The submission is moved to the
  Done stage once, since `ApplyDoneWorkflowStage` finds it there on the
  second event. OMP never deposits a monograph
  to ORCID (`SendSubmissionToOrcid::canDepositSubmission()` returns
  false), so there is no second deposit. With DOIs created at
  copyediting, the default, the publication already holds its DOI when
  it is loaded, so `VersionDois` mints nothing and `markStale()` marks
  the same DOIs stale a second time, which changes nothing. With DOIs
  created on publication, the second copy writes the row back without
  the DOI the first call minted, and `VersionDois` mints another (code,
  not walked).

Reach of the filter:

- OMP "Add Entry" (`AddEntryForm`), the only form with a
  `FieldSelectSubmissions`: this report (walked).
- `FieldSelectUsers.vue` has the same `s.id` filter. It serves the
  dashboard's "Filters" › "Assigned To Editor"
  (`PKPSubmissionFilters::addAssignedTo()`) and the same filter in
  `PKPSubmissionsListPanel`, which the Native XML and ONIX export tabs
  still use, on all three apps. An editor already chosen is offered
  again and can be added twice, which only repeats a filter (code, not
  walked).
- `FieldControlledVocab.vue` (Keywords and the other vocabularies) does
  not leave chosen items out of its suggestions at all; it filters by
  the typed text only. Whether a keyword chosen twice is stored twice
  was not checked.
- Not affected: `FieldSelectIssues` and `FieldAutosuggestPreset` (the
  Categories boxes), which leave out chosen items by value (code).

## Proposed fix

Make the filter compare the right key, and make `addToCatalog()` take
each ID once.
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-book-chosen-twice-published-twice/fix.diff):

```diff
--- a/api/v1/_submissions/BackendSubmissionsController.php
-        $submissionIds = array_map(intval(...), (array) $params['submissionIds']);
+        $submissionIds = array_values(array_unique(array_map(intval(...), (array) $params['submissionIds'])));
--- a/lib/ui-library/src/components/Form/fields/FieldSelectSubmissions.vue
-					return !this.selected.find((s) => s.id === item.id);
+					return !this.selected.find((s) => s.value === item.id);
--- a/lib/ui-library/src/components/Form/fields/FieldSelectUsers.vue
-					return !this.selected.find((s) => s.id === item.id);
+					return !this.selected.find((s) => s.value === item.id);
```

Tried on OMP `main`. With the whole fix, step 5 suggested nothing,
"Save" sent `submissionIds[]=7` once, and book 7 was published once at
1.0, with one log line and one email. With the server line alone, the
box still offered the book again and sent the ID twice, but the book was
published once at 1.0. Two different books chosen and saved were each
published once at 1.0, with the fix in and out.

- **Where the rule lives.** "A chosen book is not offered again" lives
  in the field that builds the suggestions. "Each book is published
  once" lives in `addToCatalog()`, which must hold for any client of the
  endpoint, not only this form. A guard in `publish()` would cover every
  caller, but it would have to re-read the stored status on each call;
  the first loop here already means to skip a published book and only
  misses a repeated ID.
- **How the code base does it.** `FieldSelectIssues` filters by
  `s.value`, and `FieldAutosuggestPreset` by the field's values. The
  same `array_values(array_unique(array_map('intval', …)))` idiom tidies
  the user IDs in `PKP\user\Repository::permissionMapForManager()`.
- **Every instance.** `s.id === item.id` appears only in
  `FieldSelectSubmissions` and `FieldSelectUsers`, and both are fixed.
  `addToCatalog()` is the only endpoint that publishes a list of IDs.
- **The introducing change.** The refactor meant the filter to leave out
  chosen items; the fix only corrects the key.
- **What it touches.** The suggestions of "Add Entry" and of the
  "Assigned To Editor" filter, and a repeated ID in the `addToCatalog`
  request, which is now taken once. No hook, no schema and no stored
  data. A book already published twice on `main` keeps its 2.0, but
  `main` is unreleased and the released lines never renumber, so no
  repair is needed. The diff applies to `stable-3_5_0` as written; 3.4
  and 3.3 need the same one-line changes in their older files.
- **The test.** A ui-library component test: `setSuggestions()` leaves
  out an item already in `selected`.

**Alternatives:**

- The server line alone: it stops the double publication for every
  client, but the box still offers the book again and shows it twice,
  which reads as a promise of two entries.
- The ui-library line alone: the form stops sending duplicates, but any
  other client of the endpoint still can.
- A check in `publish()` that refuses a publication already published:
  it covers every caller, but it changes a shared repository method that
  plugins and other handlers call, for a fault one loop can close.

**What goes with it:** a ui-library change and its submodule bump in the
three apps, and the OMP controller line; the same on `stable-3_5_0` for
3.5 builds.

Medium: three lines, tried, but in two repos, with a submodule bump in
each app.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/add-entry-book-chosen-twice-published-twice/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-book-chosen-twice-published-twice/walk.js)
  (helpers in its `lib.js`, which reuses the "Add Entry" helpers of
  [`../add-entry-save-publishes-unchosen-book/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/lib.js))
  takes Steps 1 to 10 on OMP loaded from the default dataset and reads
  book 7's publications and log rows as stored. `MODE=neighbour` runs the
  two-books control alone. The fix was tried with
  `bin/try-fix.js` (harness.md "Trying a fix"); the server line alone is
  the first hunk of `fix.diff`.
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default datasets
  of pkp/datasets 566bb1f (2026-10-03). On `main` the publication was
  stored as `VoR 2.0` with two `publication.event.published` rows and
  two `notifications` rows of type `0x100002F` for the author. On 3.5 the
  stored `version` stayed 1, the log held two rows, and no "Publication
  Published" came from the 3.5 install (3.5 has no listener that mails
  authors on publication).
- Code read on `main`: the three `FieldSelect*.vue` fields,
  `FieldAutosuggestPreset.vue`, `FieldControlledVocab.vue` and the
  `select()` method of `FieldBaseAutosuggest.vue` (OJS, OMP and OPS
  ui-library); OMP `addToCatalog()`, `createDois()` and
  `SendSubmissionToOrcid`; pkp-lib `publish()`, `EntityDAO::_update()`
  (writes every column the object carries, `doi_id` included), the
  `PublicationPublished` listeners, `PKPSubmissionFilters` and
  `PKPSubmissionsListPanel`. 3.5: the same fields and `addToCatalog()`
  lines at the 3.5 tips. 3.4 and 3.3: OMP `upstream/stable-3_4_0` and
  `upstream/stable-3_3_0` `api/v1/_submissions/BackendSubmissionsHandler`
  (the same two loops, `array_map('intval', …)` without a dedupe),
  `FieldSelectSubmissions.vue` at the ui-library commits those branches
  pin (ee684b34, 96959f9e: the same `s.id` filter, with `select()`
  storing `{value, label}`), and pkp-lib `publish()` there (a log line
  and the event or hook, no version change, no author email).
- Introduced: `git log -L` on the filter line reaches `c7cb4e12` (2022,
  formatting only) and then `d0ffc05a`, which created the file; the
  chosen items were already `{value, label}` there. OMP's `AddEntryForm`
  and `addToCatalog()` arrived in the same refactor,
  [6a4168a7b](https://github.com/pkp/omp/commit/6a4168a7b46230ff556f495553e9d127d8473b39)
  (`pkp/omp#812`).
- Branch tips: main OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5), OJS ff004d0973 (lib/ui-library 64d67363), OPS c8af945bb7
  (lib/ui-library 280f98c5); 3.5 OMP 9c5e24246c (lib/pkp cf3f984335,
  lib/ui-library d4e01883); 3.4 OMP 0aec65441 (lib/pkp df13621c2d,
  lib/ui-library ee684b34); 3.3 OMP 8e72fc883 (lib/pkp d446601ebe,
  lib/ui-library 96959f9e).
- Unverified: the second DOI with DOIs created on publication (the
  dataset sets no DOI prefix, so nothing is minted there); the "Assigned
  To Editor" filter and `FieldControlledVocab` (code only); MySQL not
  checked (the duplicate comes from the browser and a PHP loop, not from
  a query).
