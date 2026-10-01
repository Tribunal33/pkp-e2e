# A Publisher ID emptied on a galley's, chapter's or format's "Identifiers" tab comes back after "Save"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (every release, 3.5.0-0 on)
  - 3.4: none (read in the code: an emptied box is saved as empty)
  - 3.3: none (read in the code: an emptied box is saved as empty)
- **Introduced** `pkp/pkp-lib#10826` for `pkp/pkp-lib#10821` · [3fdd61a86a](https://github.com/pkp/pkp-lib/commit/3fdd61a86aa5ba6e72aac38304de38dea4c540b5) · 2025-01-20 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

An editor empties "Publisher ID" on the "Identifiers" tab of a galley,
a chapter or a publication format and presses "Save". The window closes
as if the change was saved, but the old value is back when the tab is
reopened. The article's own Publisher ID on the Metadata page empties
normally.

The ID can be replaced by another value but never removed, and nothing
says so. It stays in the item's native XML export, no other item of the
same kind in the journal, press or server can take it, and a DOI or URN
assigned to the item later from a custom pattern with "%x" is built
from it. The fix is a few lines in one shared form class.

## Impact

- **Lost.** No data is lost; an ID the user removed stays on the item
  and keeps being used.
- **Who.** Managers, editors and production staff on a galley's (OJS,
  OPS), chapter's or publication format's (OMP) "Identifiers" tab, where
  the manager has ticked "Enable for Galleys", "Enable for Chapters" or
  "Enable for Publication Formats" under Publisher ID, which are off by
  default.
- **Way round.** None that removes the ID. Deleting the item and adding
  it again does, at a price: a galley or format is deleted with its
  file, which must be uploaded again, a chapter loses its title,
  contributors and assigned files, and the new item has none of the old
  one's identifiers, its DOI included.

Medium: the save looks done and keeps the ID, but it reaches anything
public only through a galley, chapter or format DOI assigned after the
failed removal from a custom DOI pattern containing "%x". The DOI
settings call custom patterns "not recommended", and such a DOI can be
corrected on the DOIs page before it is deposited. The native XML
export, which carries the ID to whichever install imports it, is neither
a public page nor a deposit. It would be high if "%x" DOI patterns were
common, since the wrong DOI is assigned without a warning.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, freshly loaded. Publisher IDs
  are off for every kind of item.
- OJS: submission 1, "Signalling Theory Dividends", is published, and
  its second version, "Version of Record 1.1", is not. That version
  has the galley "PDF Version 2".
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production", is not yet posted and has the galley
  "PDF".
- OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is not yet published. It has the chapter
  "Introduction: Contexts of Popular Culture" and one publication format,
  "PDF". "PDF" is hosted on a separate website, so it has no
  "Identifiers" tab, and the steps add another format.

Setup:
1. Sign in as `rvaca` (manager).
2. Open Settings › Workflow › "Submission" › "Metadata".
3. Under "Publisher ID", tick "Enable for Galleys" (OMP: "Enable for
   Chapters" and "Enable for Publication Formats") and press "Save".
4. Sign out.

A galley (OJS, OPS):
5. Sign in as `dbarnes` (editor; on OPS a manager).
6. Open submission 1, then "Galleys" in its Publication area (OJS: under
   "Version of Record 1.1"; OPS: the "Preprint" area).
7. On the row "PDF Version 2" (OPS: "PDF"), open "More Actions" and
   press "Edit". [3.5: open the row with its arrow and press "Edit".]
   Open the tab "Identifiers".
8. Type `u44r21-galley` in "Publisher ID" and press "Save". The window
   closes.
9. Open "Edit" › "Identifiers" again. The box holds `u44r21-galley`.
10. Empty "Publisher ID" and press "Save". The window closes.
11. Open "Edit" › "Identifiers" again.

A chapter and a format (OMP):
5. Sign in as `dbarnes` (editor).
6. Open submission 4, then "Chapters" in its Publication area.
7. Press the chapter title "Introduction: Contexts of Popular Culture".
   The window "Edit Chapter" opens. Open the tab "Identifiers".
8. Type `u44r21-chapter` in "Publisher ID" and press "Save". The window
   closes.
9. Open the chapter and "Identifiers" again. The box holds
   `u44r21-chapter`.
10. Empty "Publisher ID" and press "Save". The window closes.
11. Open the chapter and "Identifiers" again.
12. Open "Publication Formats" and press "Add publication format". Type
    the Name `u44r21 EPUB`, keep the format type, and press "OK".
13. Open the row "u44r21 EPUB" with its arrow, press "Edit" and open
    "Identifiers".
14. Type `u44r21-format`, press "Save", and reopen "Edit" ›
    "Identifiers". The box holds `u44r21-format`.
15. Empty "Publisher ID" and press "Save". The window closes.
16. Open "Edit" › "Identifiers" again.

**Expected:** at steps 11 and 16, "Publisher ID" is empty.

**Observed:** at step 11 the box still holds `u44r21-galley` (OJS,
OPS) or `u44r21-chapter` (OMP), and at step 16 `u44r21-format`. Each
emptied save (steps 10 and 15) got a 200 response with
`{"status":true}`, and the item's `pub-id::publisher-id` setting (in
`publication_galley_settings`, `submission_chapter_settings` or
`publication_format_settings`) still holds the value. No error was
logged.

Typing another value (`u44r21-new`) at step 10 instead is saved, and a
value of digits alone is refused with "The public identifier '12345'
must not be a number."

## Cause

Each tab saves through its grid handler's `updateIdentifiers()` (OJS
`ArticleGalleyGridHandler`, OPS `PreprintGalleyGridHandler`, OMP
`ChapterGridHandler` and `PublicationFormatGridHandler`). These run the
app's `PublicIdentifiersForm`, which ends in lib/pkp's
`PKPPublicIdentifiersForm::execute()` (OJS and OMP call it from their
own `execute()`, OPS inherits it)
(`controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`, lines
226–228):

```php
if ($this->getData('publisherId')) {
    $pubObject->setStoredPubId('publisher-id', $this->getData('publisherId'));
}
```

An emptied box posts `publisherId=` and `readInputData()` reads it as
`''`, which is falsy, so the object keeps the value it was loaded with.
The DAO then saves the object with that old value, and the form reports
success.

Before `pkp/pkp-lib#10826` the line was unconditional, as it still is
on `stable-3_4_0` and `stable-3_3_0`:
`$pubObject->setStoredPubId('publisher-id', $this->getData('publisherId'))`.
The PR does not say why it added the condition. One case it covers is
the tab without a "Publisher ID" box, which appears when a URN is
enabled for that kind of item but Publisher IDs are not. There
`publisherId` is not posted at all, `getData()` gives `null`, and the
unconditional line would have removed a stored ID from a galley or a
format. On a chapter it would have thrown a `TypeError`, because OMP's
`Chapter::setStoredPubId(string $pubIdType, string $pubId)` has taken
only a string since dca972683 (2024). The condition is right to skip
`null`, but it also skips the user's `''`.

Reach:

- Galleys (OJS, OPS), chapters and publication formats (OMP): seen on
  screen on `main` and 3.5.
- An OJS issue's tab and an OMP format file's tab run the same
  `execute()`, but those IDs are not stored in the first place
  ([An issue's Publisher ID, typed on its "Identifiers" tab, is silently dropped on "Save"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OJS3-issue-publisher-id-not-kept.md),
  [A Publisher ID typed for a publication format's file is dropped on "Save", with no message](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OMP5-press-file-publisher-id-not-kept.md)).
  Once those are fixed, they would meet this fault too (read in the
  code).
- An OJS issue galley's Publisher ID has its own form, and
  `IssueGalleyForm::execute()` saves the posted value without a
  condition, so it empties (read in the code).
- The kept value is still used (read in the code):
  - DOIs, in all three apps: a galley's (OJS, OPS), chapter's or
    format's (OMP) DOI assigned from a custom suffix pattern goes
    through the app's `Repository::generateSuffixPattern()` (OJS
    `classes/doi/Repository.php` line 174, OMP line 252, OPS line 92)
    to `PubIdPlugin::generateCustomPattern()`, which replaces `%x` with
    the stored Publisher ID. A DOI assigned after the failed removal
    therefore carries the kept ID. That path was walked for issue DOIs in
    [An issue's Publisher ID, typed on its "Identifiers" tab, is silently dropped on "Save"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OJS3-issue-publisher-id-not-kept.md);
    the galley, chapter and format patterns call the same function with
    the item itself. OJS's Crossref and DataCite exports include galley
    DOIs, and OMP's book page shows chapter and format DOIs. A DOI
    assigned before the removal does not change.
  - URNs (OJS, OMP): a URN pattern with `%x` uses the same function.
  - The native XML export writes it as `<id type="public">`
    (`RepresentationNativeXmlFilter`, `ChapterNativeXmlFilter`).
  - The tab's duplicate check (`anyPubIdExists()`, across the journal,
    press or server) refuses it on any other item of the same kind.

## Proposed fix

Tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publisher-id-cannot-be-removed/fix.diff):
steps 11 and 16 then showed an empty box on all three apps, and the
settings rows were gone. The other cases did not change: a new value
was saved, digits alone were refused, and the tab without the box (URN
on, Publisher IDs off for galleys or chapters, OJS and OMP) saved
without touching the stored ID, which was there again once Publisher
IDs were turned back on.

Recommended: in `PKPPublicIdentifiersForm::execute()`, handle the three
states the posted box can have. Absent (`null`) leaves the ID alone, as
the condition does today. Emptied (`''`) removes it. A value stores it.

```diff
         $pubObject = $this->getPubObject();
-        if ($this->getData('publisherId')) {
-            $pubObject->setStoredPubId('publisher-id', $this->getData('publisherId'));
+        // The "Publisher ID" box is posted only while publisher IDs are on for this kind of
+        // object: an emptied box removes the stored ID, a tab without the box leaves it alone.
+        $publisherId = $this->getData('publisherId');
+        if ($publisherId === '') {
+            $pubObject->unsetData('pub-id::publisher-id');
+        } elseif ($publisherId !== null) {
+            $pubObject->setStoredPubId('publisher-id', $publisherId);
         }
```

With the key unset, each DAO behind this form deletes the setting, as
it does for any setting the object no longer holds: the galley DAO
through `EntityUpdate::updateSettings()`, `ChapterDAO` and
`PublicationFormatDAO` through `DAO::updateDataObjectSettings()`. The
change is in the shared base class, so every tab built on it is
covered, the issue and file tabs too once their IDs are stored.
`PKPPubIdPluginHelper::clearPubId()` is only a loose precedent: it
deletes a pub ID with the DAO's `deletePubId()` and then sets the key
to `null`.

`validate()` should get the same test. It guards the number, "/" and
duplicate checks with `if ($publisherId)` (line 191), so a value of
`0` skips them. Today `execute()` then drops `0`; with the fix it would
be stored, on any number of items. Changing that line to
`if ($publisherId !== null && $publisherId !== '')` refuses `0` as a
number, like any other digits. This line was read in the code and is
not in the tried diff.

**Alternatives:**

- Restore the unconditional 3.4 line: this brings back what the
  condition prevents. The tab without the box would remove a stored ID,
  or throw on a chapter.
- `setStoredPubId('publisher-id', null)` for the emptied box: this
  throws on chapters (`Chapter::setStoredPubId()` takes a string).
  Widening that signature is a second repo, and `ChapterDAO` and
  `PublicationFormatDAO` would keep a row with a NULL value rather than
  none.
- Deciding in the base form whether the box was shown, from each app's
  `enablePublisherId` setting: this repeats the subclasses' `fetch()`
  logic, while the posted field already tells.

**What goes with it:**

- Only the tab's save changes; no REST API or hook changes. The
  `publicidentifiersform::execute` hook still runs first.
- Stored data: no repair. IDs that users tried to remove are still
  stored, and they can then be emptied. DOIs or URNs already built from
  them stay as they are.
- With the fix, a DOI or URN assigned from a `%x` pattern to an item
  with no Publisher ID keeps a literal `%x`, as the issue report linked
  under Cause shows for issues. That is the pattern's own gap and is not
  changed here.
- Backport: the same diff applies to `stable-3_5_0`.
- Guard: an e2e scenario that saves a galley's, a chapter's and a
  format's Publisher ID, empties it, and reads the reopened tab. A
  second case saves the tab without the box and checks that the stored
  ID is kept.

Small: two short changes in one shared form class, with an e2e scenario.

## Evidence

- The script that takes the Steps in the browser on an install loaded
  from PKP's default test dataset, reading the stored setting after each
  save:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publisher-id-cannot-be-removed/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/publisher-id-cannot-be-removed/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front).
  `PHASE=controls` in front runs the control cases on the galley (OJS,
  OPS) and the chapter (OMP): a value saved and reopened, digits alone
  refused, a changed value saved, and (OJS, OMP) the tab without the box
  saved while the URN plugin is on and Publisher IDs are off, then the
  stored ID read once they are on again.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/publisher-id-cannot-be-removed/fix.diff ojs omp ops`,
  then walk.js and `PHASE=controls` walk.js, each on a freshly loaded
  dataset, then `node bin/try-fix.js revert ojs omp ops`. The control
  cases gave the same results without the fix.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6);
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd (lib/pkp
    a9c76aed62, whose `PKPPublicIdentifiersForm.php` is the same as
    `main`'s). On 3.5 the galley rows open with their arrow (the bracket
    at step 7), and the Galleys page shows version 2.
  - The fault does not depend on the database: the emptied value is
    dropped in PHP before any query. MySQL not checked.
- Code also read on `main`: `Form::readUserVars()` and
  `PKPRequest::getUserVars()` (an absent field is `null`, posted strings
  are trimmed), the apps' `publicIdentifiersForm.tpl` and
  `PublicIdentifiersForm::fetch()` (the box only while
  `enablePublisherId` names that kind of item).
- 3.4: lib/pkp `stable-3_4_0` at df13621c2d (OJS 9571d8fde7, OMP
  0aec65441, OPS acd8ae704b). `execute()` calls `setStoredPubId()`
  unconditionally, so an emptied box stores an empty value and the tab
  shows it empty. OMP's `Chapter::setStoredPubId()` there has no type
  declarations.
- 3.3: lib/pkp `stable-3_3_0` at d446601ebe (OJS 9fdb9bcf9a, OMP
  8e72fc883, OPS c5532e2161). `PKPPublicIdentifiersForm.inc.php`
  `execute()` makes the same unconditional call.
- Introduced: `git blame` on lines 226–228 gives 3fdd61a86a ("fix
  checkDuplicate, changePubId, pubIdExists, publisher-id storing"), the
  URN work for the redesigned workflow. Its first tags are `3_5_0rc2`
  and `3_5_0-0`.
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library (publisher id remove, publisher id empty, publisher
  id galley, publisher id chapter, publisher id delete, `publisherId`,
  publisher-id identifiers tab, `PKPPublicIdentifiersForm`). The only
  candidate, `pkp/pkp-lib#8946` ("Clean PubId code"), is about removing
  old pub ID code, not about this fault.
- Not driven: the DOI, URN, native XML and duplicate-check effects
  listed under Cause; the `validate()` change for `0`; deleting and
  re-adding an item as the way round, including whether the screens
  allow it on a published version.
