# Activity Log file lines show an empty file name when read in a language other than the submission's

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the file name was stored as plain text)
- **Introduced** `pkp/pkp-lib#9070` for `pkp/pkp-lib#9067` · [276ba73d4a](https://github.com/pkp/pkp-lib/commit/276ba73d4ae1c5767bb8c1f04d75b3a03c17e1c8) · 2023-06-06 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U38 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a7)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor who reads a submission's Activity Log in an interface language
other than the submission's own sees every file line with an empty file
name. In French (Canada), the log reads "La révision « » a été téléversée
pour le fichier 12." where an English reader of the same line reads
"Revision "article.pdf" was uploaded for file 12.".

A file's name is stored in the submission's language, the one chosen
when it was submitted, whoever uploads the file and in whatever
interface language they work. Switching to the submission's language
therefore always brings the names back. The fault needs a journal,
press or server that offers a second interface language.

On `main` only, the same fault also empties the "was assigned to this
submission" line: a participant whose name is filled in only in another
language appears as "(amwandenga) a été ajouté-e …". This is part of
this report, with the same fix: one line in the shared code that builds
every log sentence, for every log line and all three apps.

## Impact

- **Lost**: the file name in every file line of the log (uploads,
  revisions, metadata edits, deletions), and on `main` the participant's
  name in the "was assigned" and "was removed" lines. The lost name is
  only missing from the reader's screen; nothing stored is lost, and
  nobody is told the name is missing.
- **Who**: editors and managers reading "Activity Log" in a language
  other than the submission's, on every submission's file lines. On
  `main`, also every assignment line of a participant whose name is
  filled in for one language only, which is common for users who
  registered in one language. 3.5 and older store that name as plain
  text and show it.
- **Way round**: switch the interface to the submission's language, or
  find the file by its number on the workflow's file lists.

Low, for both symptoms: each costs the reader a language switch and no
work. It would be medium if the log were the only record of which file
changed or who was assigned.

## Steps to reproduce

Preconditions:

- The default dataset, OJS, OMP or OPS `main`. Its `publicknowledge`
  offers English and French (Canada) as interface languages, and its
  submissions were made in English. Nothing else is needed.

The submission and the line to compare on each app:

- OJS: submission 1 "Signalling Theory Dividends"; "Revision
  "article.pdf" was uploaded for file 12.", and "Alan Mwandenga
  (amwandenga) was assigned to this submission as a Author.".
- OMP: submission 1 "The ABCs of Human Survival: A Paradigm for Global
  Citizenship"; "Revision "chapter1.pdf" was uploaded for file 6.".
- OPS: submission 1 "The influence of lactation on the quantity and
  quality of cashmere production"; "The metadata for file "The influence
  of lactation on the quantity and quality of cashmere production.pdf"
  was edited by ccorino.".

1. Sign in as `dbarnes`.
2. Open submission 1
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. Press "Activity Log" in the submission's header and find the line to
   compare under "History". Press "Close".
4. Close the submission's window with its "Close".
5. Open the menu under the initials at the top right and choose
   "français".
6. Open submission 1 again
   (`/index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=1`).
7. Press "Journal d'événements" in the header and find the same lines
   under "Historique".

**Expected**: the French lines carry the file names and the person, as
the English ones do:

```
OJS  La révision « article.pdf » a été téléversée pour le fichier 12.
OJS  Alan Mwandenga (amwandenga) a été ajouté-e à cette soumission en tant que Auteur-e.
OMP  La révision « chapter1.pdf » a été téléversée pour le fichier 6.
OPS  Les métadonnées du fichier « The influence of lactation on the quantity and quality of cashmere production.pdf » ont été modifiées par ccorino.
```

**Observed**: every file line has an empty name (OJS 20 of 20 lines,
OMP 9 of 9, OPS 3 of 3), and on OJS the participant's line starts with
the username:

```
OJS  La révision « » a été téléversée pour le fichier 12.
OJS  (amwandenga) a été ajouté-e à cette soumission en tant que Auteur-e.
OMP  La révision « » a été téléversée pour le fichier 6.
OPS  Les métadonnées du fichier « » ont été modifiées par ccorino.
```

On 3.5 the file lines read the same, and the participant line keeps the
name. A participant who has a French name keeps it ("Sarah Vogt (svogt)
a été ajouté-e à cette soumission en tant que Réviseur-e."), and the
English reader sees every name.

## Cause

`EventLogEntry::getTranslatedMessage()` (lib/pkp
`classes/log/event/EventLogEntry.php`, line 228 on `main`) builds the
sentence's parameters from the entry's data. A per-language value is
read in the reader's language only, with no fallback:

```php
$params[$key] = $eventLog->getData($key, $locale);
```

`getData($key, $locale)` returns null when the entry holds no value in
that language, and the sentence prints the parameter as empty.

The file lines store the file's name as the file holds it: in the
submission's language only. `SubmissionFilesUploadForm::execute()` and
`PKPSubmissionFileController` set `name` under the submission's
`locale`, and `Repository::getSubmissionFileLogData()` copies that
per-language `name` into the entry's `filename` (multilingual in
`schemas/eventLog.json`). A reader in any other language gets null.

This breaks the rule that every other piece of code that reads these
values follows: show the reader's language, else the best one available
(`DataObject::getLocalizedData()`). The same log's "Download" link reads
`$logEntry->getLocalizedData('filename')` (`EventLogGridRow`), the task
and discussion activity on `main` reads `filename`, `userFullName` and
`userGroupName` that way (`TaskResource`), and
[173bde9155](https://github.com/pkp/pkp-lib/commit/173bde915526e442bde45ee9369afec0f600fbbd)
(`pkp/pkp-lib#13007`), which made the participant's name per-language,
moved `getUserFullName()` to `getLocalizedData('userFullName')` but left
line 228 as it was.

How it came about, in order:

1. `pkp/pkp-lib#8941` for `pkp/pkp-lib#8933`
   ([13653090ce](https://github.com/pkp/pkp-lib/commit/13653090ce48072081ca249544e3ec468b53ddee),
   2023-05-17) made `filename` per-language.
2. The old `getTranslatedMessage()` merged all entry data into the
   parameters, so it now passed arrays into the translation and failed
   (`pkp/pkp-lib#9067`).
3. `pkp/pkp-lib#9070` fixed that by reading each per-language value in
   the reader's language only, with no fallback.

Reach:

- Every `submission.event.file*` and `revision*` line, on the
  submission's "History" and on a file's own history (the same grid), on
  all three apps (walked: the submission's "History").
- The "was assigned" and "was removed" lines on `main`: since
  `pkp/pkp-lib#13007` for `pkp/pkp-lib#12821` (2026-07) they store the
  participant's name per language (`getFullNames()`), which holds only
  the languages the user filled in. Walked on OJS (`amwandenga`); the
  dataset's OMP and OPS logs hold no such line. On 3.5 and 3.4 the
  handler stores `getFullName()`, a plain string, which shows.
- `userGroupName` (the role) on the same lines, when a role has no name
  in the reader's language (read in the code; the dataset's roles have
  both).
- A press's publication format lines: the separate report `pkp-e2e#895`
  (https://github.com/jardakotesovec/pkp-e2e/issues/895) notes that lines
  upgraded from 3.3 hold the format's name only in the press's primary
  language. This fix's fallback shows that name in the other languages
  too (read in the code).
- The REST API's event log output gives the raw per-language values and
  is not affected (read in the code).

## Proposed fix

Read per-language parameters with the fallback the rest of the code
base uses, in `EventLogEntry::getTranslatedMessage()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-lines-empty-name-other-language/fix.diff)):

```diff
-            $params[$key] = $eventLog->getData($key, $locale);
+            $params[$key] = $eventLog->getLocalizedData($key, $locale);
```

`getLocalizedData()` returns the reader's language first, then the
context's and the site's primary language, then the first value
present. It keeps what `pkp/pkp-lib#9067` was for: each parameter is
still one string, never an array.

Tried on `main`, all three apps: the walk then shows the Expected lines,
every file line named and Alan Mwandenga named. The paths the fix must
leave alone stayed the same: comparing the log with and without the
fix, the English log was identical line for line, French role names
stayed French ("Réviseur-e"), and the email lines stayed as sent.

**Alternatives**:

- Store the file name in every language, or as plain text as 3.3 did.
  This needs a repair of every stored entry, goes against the
  per-language storage that `pkp/pkp-lib#8941` for `pkp/pkp-lib#8933`
  chose, and leaves participant names without the fallback.
- Fall back to the submission's language only. This covers file names
  but not participant names, and `getLocalizedData()` already includes
  that case.

**What goes with it**:

- Callers: the log grid's "Event" column is the only caller. When the
  reader is an editor who is also an author of the submission, the file
  names of anonymous reviewers' files are blanked first; they stay
  blank, because `getLocalizedData()` skips empty values (read in the
  code, not walked). `taskParticipantsModifiedUserIds`, a plain list,
  would now pass its first id instead of null, but no log message
  prints it.
- Stored data: none to repair.
- Backport: applies as written to 3.5 and 3.4 (the same line, at 211 and
  243).
- Guard: an e2e check that reads a file line and an assignment line in
  French, a Planned item in spec U38. A pkp-lib unit test of
  `getTranslatedMessage()` with a `filename` held in `en` only, read in
  `fr_CA`, would also do. It needs a request with a site and a context,
  because `getLocalizedData()` goes through `getLocalePrecedence()`, and
  pkp-lib has no `EventLogEntry` test to copy.

Small: one line in the shared class, following the pattern its siblings
use, with no data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-lines-empty-name-other-language/walk.js)
  (helpers in `lib.js` beside it), run with pkp-e2e's own probe runner
  on a fresh load of the default dataset: `PROBE_FEATURE=<feature>
  PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/file-lines-empty-name-other-language/walk.js`;
  `MODE=neighbour` reads only the lines the fix must leave alone. Walked
  on `main` and `stable-3_5_0` on PostgreSQL. The fault does not depend
  on the database; MySQL was not run. No request failed and no page
  script failed during the walks.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794 and OPS
  c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246 and OPS 38b61882d3 (lib/pkp cf3f984335);
  `stable-3_4_0` lib/pkp 767353f4fe, apps OJS d68934d0d1, OMP 0aec65441,
  OPS acd8ae704b; `stable-3_3_0` lib/pkp ac3fa73402, apps OJS ac77c9fb35,
  OMP 8e72fc883, OPS c5532e2161. Default dataset from pkp/datasets
  566bb1f (2026-10-03).
- Code reads beyond the Cause: 3.4 has the same line and stores the
  file's `name` under the submission's language; the commit is in 3.4.0
  (tag `3_4_0-0`). 3.3's `PKPSubmissionFileService` stored
  `originalFileName` as `getLocalizedData('name')`.
- Not walked: a submission made in French read in English (the reverse
  case, read in the code), a file's own history window, the
  publication format lines of `pkp-e2e#895`, and the anonymous-reviewer
  case with the fix in.
