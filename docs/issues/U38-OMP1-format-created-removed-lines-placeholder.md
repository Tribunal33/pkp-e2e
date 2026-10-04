# A press's activity log prints "{$formatName}" instead of the format's name when a publication format is created or deleted

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#1417` for `pkp/pkp-lib#8933` · [6fa86b62fe](https://github.com/pkp/omp/commit/6fa86b62fef4071f1f2f4201eeaa9bd8cadd3ff4) · 2023-06-01 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U38 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#omp1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

When an editor adds a publication format to a book, or deletes one, the
book's "Activity Log" shows a raw placeholder where the format's name
belongs:

- The publication format "{$formatName}" was created.
- The publication format "{$formatName}" was removed.

The press's other format lines, such as "is made available.", name the
format.

Nothing is lost: the line is written under the right person and date,
and the format's name is stored with it. But a reader of the log cannot
tell from it which format was added or deleted, and a deleted format's
name shows nowhere else.

The sentence is built from the stored name each time the log is shown,
so the fix, a corrected placeholder in two texts of each language's
file, also corrects the lines already in the log, with no repair. Lines
carried over by an upgrade from 3.3 show the name only while the log is
read in the press's primary language.

## Impact

- **Lost.** Nothing: the format's name is stored with the line.
- **Who.** Editors and managers reading a book's "Activity Log", on
  every press, each time a format is created or deleted. Book 4's "PDF"
  format in the default test dataset already shows it.
- **Way round.** For a created format, its availability or approval
  lines name it, once it has been approved or made available; one that
  never was has no line naming it, though the "Publication Formats" list
  still shows it. For a deleted format, none.

Low: the log keeps who did what and when, and only the format's name is
missing from two kinds of line.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` (press `publicknowledge`).
  Nothing else: book 4 and its editor are the dataset's.

Steps (the same on `stable-3_5_0`):

1. Sign in as `dbarnes`.
2. On the dashboard, press "View" on book 4, "How Canadians Communicate:
   Contexts of Canadian Popular Culture" (Production).
3. In the side menu, open "Publication" › "Publication Formats".
4. Press "Add publication format", type `Paperback u38d` in "Name" and
   press "OK".
5. In the new row, press "Not Available", then "OK" in "Format
   Availability".
6. Open the row's arrow, press "Delete", then "OK".
7. In the workflow's header, press "Activity Log". The window opens on
   "History".

**Expected.** Each format line names its format, newest first:

```
Daniel Barnes   The publication format "Paperback u38d" was removed.
Daniel Barnes   The publication format "Paperback u38d" is made available.
Daniel Barnes   The publication format "Paperback u38d" was created.
Daniel Barnes   The publication format "PDF" was created.
```

**Observed.**

```
Daniel Barnes   The publication format "{$formatName}" was removed.
Daniel Barnes   The publication format "Paperback u38d" is made available.
Daniel Barnes   The publication format "{$formatName}" was created.
Daniel Barnes   The publication format "{$formatName}" was created.
```

The last line is the dataset's own record of book 4's "PDF" format, so
step 7 alone, on the freshly loaded dataset, already shows the fault.

## Cause

The English texts of `submission.event.publicationFormatCreated` and
`submission.event.publicationFormatRemoved`
([`locale/en/submission.po` lines 279–283](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/locale/en/submission.po#L279-L283))
read `{$formatName}`. Their writers,
`PublicationFormatForm::execute()`
([line 284](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/controllers/grid/catalogEntry/form/PublicationFormatForm.php#L276-L286))
and `PublicationFormatService::deleteFormat()`
([line 82](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/classes/services/PublicationFormatService.php#L72-L84)),
store the name as `publicationFormatName`, the property OMP's
`schemas/eventLog.json` declares. The log keeps the locale key and its
parameters, and `EventLogEntry::getTranslatedMessage()` builds the
sentence each time the log is shown. `LocaleBundle::_format()` replaces
only the `{$key}` tokens it is given a value for, so `{$formatName}`
prints as typed.

6fa86b62fe, the event log refactor of `pkp/pkp-lib#8933`, moved these
two writers from `SubmissionLog::logEvent(…, ['formatName' => …])` to
`Repo::eventLog()` with the key `publicationFormatName`, the name the
availability and approval lines had always used. Its upgrade,
`I8933_EventLogLocalized::mapSettings()`, renames the stored
`formatName` to `publicationFormatName` for both event types. The two
texts were left reading `{$formatName}`. pkp-lib's own sweep of event
log placeholders after that refactor
([276ba73d4a](https://github.com/pkp/pkp-lib/commit/276ba73d4ae1c5767bb8c1f04d75b3a03c17e1c8), `pkp/pkp-lib#9067`)
covered pkp-lib's `submission.po` files only, not OMP's.

Reach:

- Every press, every created or deleted format, in English and in the
  28 other languages whose texts hold `{$formatName}`; `ckb` and `vi`
  have no text for these keys (code). Walked: OMP in English on `main`
  and 3.5.
- The lines already stored hold the name under `publicationFormatName`,
  so a corrected text shows the name for them too (code; checked on
  screen for book 4's "PDF" line).
- The name is read in the reader's language only:
  `getTranslatedMessage()` passes `getData($key, $locale)`, with no
  fallback to another language. With the interface in French, the
  corrected line reads `Le format de publication "" a été créé.`,
  because the format's name was typed in English only (on screen). Lines
  an upgrade from 3.3 renamed are stored by
  `I8933_EventLogLocalized::up()` under the press's primary locale, so
  after the fix they show the name only when the log is read in that
  language (code). This is the mechanism of the separate report on file
  lines read in another language, which has its own fix.
- `submission.event.publicationMetadataUpdated` also reads
  `{$formatName}` but has no writer anywhere in OMP or pkp-lib (code).
- No other screen: `getTranslatedMessage()` has one caller, the
  activity log's grid (`EventLogGridCellProvider`). OJS and OPS have no
  publication format lines (code).

## Proposed fix

Put `{$publicationFormatName}` in the two texts, in every OMP
`submission.po` that has them
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-created-removed-lines-placeholder/fix.diff),
OMP only):

```diff
 msgid "submission.event.publicationFormatCreated"
-msgstr "The publication format \"{$formatName}\" was created."
+msgstr "The publication format \"{$publicationFormatName}\" was created."

 msgid "submission.event.publicationFormatRemoved"
-msgstr "The publication format \"{$formatName}\" was removed."
+msgstr "The publication format \"{$publicationFormatName}\" was removed."
```

How this was settled:

- **Where the rule lives.** In the texts. Changing the writers back to
  `formatName` would leave every line stored since 3.4 without a name.
- **How the code base does it.** The four availability and approval
  texts beside these two read `{$publicationFormatName}`. In
  `pkp/pkp-lib#10362`, a mismatch of the same kind, the review-confirmed
  line was fixed in its text alone, its placeholder changed in every
  language file
  ([3a750ac043](https://github.com/pkp/pkp-lib/commit/3a750ac0434c6777995e48a4bec02134e1636163));
  the issue's decision lines, whose stored rows lacked the value, needed
  a data migration (`I10362_EventLogEditorNames`). Here the rows hold
  the value, so the text alone is the fix.
- **Every instance.** OMP's own event log writers are these two and the
  availability, approval and sign-off lines; the others' texts match
  what they store. The unused `publicationMetadataUpdated` text is left
  as it is.
- **What it touches.** The log's sentence only: no API field, hook or
  stored row changes, and no data needs repairing. fix.diff applies as
  it stands to `main` and 3.5. 3.4 needs the same edit in its own
  folders: there the texts with `{$formatName}` are in `bg`, `ca`, `cs`,
  `da`, `de`, `el`, `en`, `es`, `fi`, `fr_CA`, `fr_FR`, `gd`, `gl`,
  `hr`, `hu`, `id`, `it`, `mk`, `nb`, `pl`, `pt_BR`, `pt_PT`, `ro`,
  `ru`, `sl`, `sv`, `tr` and `uk` (both keys in each); 3.4 names `fr`,
  `nb_NO` and `pt` as `fr_FR`, `nb` and `pt_PT`, has no `mn`, and its
  `ar`, `fa`, `ky`, `ckb` and `vi` have no such text.

Tried on `main`. With the diff applied, the walk's lines read
"…"Paperback u38d" was removed." and "…"Paperback u38d" was created.",
and the dataset's line "…"PDF" was created.".

**Alternatives**

- Store the name under both keys: keeps a wrong text alive and stores
  the name twice in every new line, while the old lines still lack
  `formatName`.

**What goes with it**

- Weblate carries the translated texts; the fix changes only their
  placeholder, as 3a750ac043 did, and the translators keep their
  wording.
- A test: an OMP unit test or e2e check that every
  `submission.event.publicationFormat*` text's placeholders are among
  the keys its writer stores.

Small: a token rename in two texts per language file, with no code,
data or API change.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/format-created-removed-lines-placeholder/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-created-removed-lines-placeholder/walk.js)
  takes the Steps on OMP and reads the format lines as stored. It runs
  through pkp-e2e's own probe runner,
  `node bin/probe.js omp shared/playwright/checks/issues/format-created-removed-lines-placeholder/walk.js`,
  on an install freshly loaded from the default dataset.
- Neighbour check (`MODE=neighbour` in front), with the fix in and out:
  book 5's ("Bomb Canada and Other Unkind Remarks in the American
  Media") approval and availability lines for "PDF" read the same both
  times; book 4's "PDF" line read in English and in French
  (`/index.php/publicknowledge/fr_CA/dashboard/editorial`) changed as
  the Cause says.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from pkp/datasets
  566bb1f (2026-10-03).
- Branch heads walked or read: `main` OMP 3b0ecf794c (`lib/pkp`
  3dc90c81a6); `stable-3_5_0` OMP 9c5e24246c (`lib/pkp` cf3f984335);
  `stable-3_4_0` OMP 0aec65441f (`lib/pkp` 767353f4fe); `stable-3_3_0`
  OMP 8e72fc8836 (`lib/pkp` ac3fa73402).
- 3.4 (code): 6fa86b62fe is on `stable-3_4_0`; its
  `PublicationFormatForm.php` and `PublicationFormatService.php` store
  `publicationFormatName`, its `locale/en/submission.po` reads
  `{$formatName}` for both keys, and its `EventLogEntry::getTranslatedMessage()`
  builds the sentence from the stored data as on `main`.
- 3.3 (code): `PublicationFormatForm.inc.php` and
  `PublicationFormatService.inc.php` log
  `['formatName' => $publicationFormat->getLocalizedName()]`, which the
  `locale/en_US/submission.po` texts read: no fault.
- Introduced: before 6fa86b62fe both writers passed `formatName`; the
  texts date from the PO conversion
  ([21fae1d76c](https://github.com/pkp/omp/commit/21fae1d76cefe797cdef61567e1ae922bac6b9b7), 2019) unchanged.
- Upstream search: pkp/pkp-lib, pkp/omp and pkp/ui-library, by the
  symptom's words and by `formatName`, `publicationFormatName` and the
  two keys. `pkp/pkp-lib#10362` (closed, fixed) is the same kind of
  mismatch for other lines; it does not cover these.
- 3.4 locale files: `git grep '{$formatName}' upstream/stable-3_4_0 --
  'locale/*/submission.po'` in the OMP checkout (28 files, 56 lines for
  the two keys).
- Not driven: an install upgraded from 3.3 or 3.4 (code only); MySQL
  not checked (the fault is in the texts, not the database).
