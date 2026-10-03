# Removing an announcement type deletes every announcement of that type, behind a dialog that names neither the type nor its announcements

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the announcements are kept and lose their type)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** no PR · [6bfef785aa](https://github.com/pkp/pkp-lib/commit/6bfef785aa7c1512dc37eba17ca79b394638d347) · 2024-07-05 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#10060` (open); its PR `pkp/pkp-lib#10064`, against `stable-3_4_0`, keeps the announcements like this fix and was never merged; `pkp/pkp-lib#10096` (open) proposes refusing the removal instead (searched 2026-10-03)
- **Tracked in** spec U12 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager who presses "Remove" on an announcement type reads "Are you
sure you wish to delete this item? This action cannot be undone." and
expects the type alone to go. "OK" also deletes every announcement of
that type, from the list and the public site, and the only message is
"Announcement type removed."; the "Announcements" tab's list still shows
the deleted announcements until the page is reloaded.

The application carries the warning "Warning! All announcements with
this announcement type will also be deleted…" but never shows it. The
deletion is not what the code base intends today: since 3.4 the
database is set up to keep the announcements and clear their type, and
3.4 did keep them; deleting them was once meant only with that warning.
The deleted announcements cannot be brought back.

It reaches only journals, presses and preprint servers that give their
announcements a type.

## Impact

- **Lost.** Every announcement of the removed type, published or not,
  with its public page.
- **Who.** A manager who removes a type still in use, under
  Announcements › "Announcement Types".
- **Way round.** Give each announcement of the type another type before
  removing it. A type can be changed but not cleared, so a journal with
  a single type has none; nothing on screen suggests this either.

High: published public content is lost for good. Removing a type still
in use is not an everyday task, which alone would make it medium, but
the loss is silent: the dialog names neither the type nor its
announcements and the notice reports only the type, so the silence
rule lifts it a level. A dialog that said what goes would lower it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same).
  It has announcements off and no announcement types; the steps create
  them.

1. Sign in as `rvaca`.
2. Open Settings › Website › Setup › "Announcements", tick "Enable
   announcements" and press "Save".
3. Open the Announcements page by its address
   (`/index.php/publicknowledge/en/management/settings/announcements`;
   the side menu shows "Announcements" only after a reload), tab
   "Announcement Types". Press "Add Announcement Type", type
   "u12r1 Event" in "Name" and press "Save". Do the same for
   "u12r1 News".
4. Reload the page (the announcement panel offers a type only once the
   page is loaded after the type was made), tab "Announcements".
5. Press "Add Announcement", type "u12r1 Workshop" in "Title", choose
   "u12r1 Event" under "Announcement Type" and press "Save".
6. The same for "u12r1 Conference", type "u12r1 Event".
7. The same for "u12r1 Newsletter", type "u12r1 News".
8. Sign out and open the public Announcements page
   (`/index.php/publicknowledge/announcement`). Open "u12r1 Workshop"
   and note its address.
9. Sign in as `rvaca`, open the Announcements page, tab "Announcement
   Types". Press the arrow on "u12r1 Event", then "Remove", then "OK".
10. Open the tab "Announcements". Reload the page.
11. Sign out, open the public Announcements page, then the address of
    "u12r1 Workshop" noted in step 8.

**Expected.** The dialog asks about "this item", so only the type goes:
"u12r1 Workshop" and "u12r1 Conference" stay on the "Announcements" tab
and on the public site, without a type.

**Observed.** Step 9's dialog, headed "Remove", with "OK" and "Cancel":

```
Are you sure you wish to delete this item? This action cannot be undone.
```

After "OK" the notice "Announcement type removed." shows and the types
table lists "u12r1 News" alone. In step 10 the tab "Announcements"
still lists "u12r1 Newsletter", "u12r1 Conference" and "u12r1 Workshop";
after the reload it lists "u12r1 Newsletter" alone. In step 11 the
public Announcements page lists "u12r1 Newsletter" alone, and the
address of "u12r1 Workshop" (`/index.php/publicknowledge/en/announcement/view/1`)
answers 302 and lands on the Announcements page. No request failed.

Control: "u12r1 Newsletter", of the type that stayed, is listed
throughout.

## Cause

`AnnouncementTypeDAO::deleteById()` (lib/pkp
`classes/announcement/AnnouncementTypeDAO.php`, line 118) deletes the
type's announcements before the type:

```php
Announcement::withTypeIds([$typeId])->delete();

return DB::table('announcement_types')
    ->where('type_id', '=', $typeId)
    ->delete();
```

That overrides the schema. Since `pkp/pkp-lib#6093` (3.4,
[86ace4305e](https://github.com/pkp/pkp-lib/commit/86ace4305e3569238d9062812f5a587a597009f1)),
`announcements.type_id` is `REFERENCES announcement_types ON DELETE SET
NULL`: removing a type keeps its announcements and clears their type.
A fresh install gets the key from the install migration, and an install
upgraded from 3.3 from `I6093_AddForeignKeys` (the column was already
nullable, and the upgrade's preflight check clears orphaned type ids
first).

The history in three steps:

- 3.3 deleted them: with no foreign keys,
  `AnnouncementDAO::deleteByTypeId()` deleted each announcement of the
  type.
- 3.4 kept them: `deleteById()` deleted the type row first, so the
  database had already cleared `type_id`, and the announcement delete
  that followed matched nothing.
- 6bfef785aa ("Clean up delete function returns; clean out redundant
  deletes due to cascades") brought the deletion back for 3.5: it moved
  the type delete to the end so its count could be returned, which put
  the announcement delete first.

The confirmation never caught up. The warning
`manager.announcementTypes.confirmDelete` was last shown by pkp-lib's
own pre-grid types list (`templates/manager/announcement/announcementTypes.tpl`),
replaced by the grid in 2012
([83e701cfce](https://github.com/pkp/pkp-lib/commit/83e701cfceee3a26e1d2dac3d4d744550c386c95));
`AnnouncementTypeGridRow::initialize()` has used the generic
`common.confirmDelete` since the grid came to pkp-lib
([61c3427edf](https://github.com/pkp/pkp-lib/commit/61c3427edf21b95d33d76c74f5b99362b0a74927)).
In `pkp/pkp-lib#10060` the reviewer asked why the announcements are
deleted when the foreign key already clears their type, and the PR for
3.4 was changed to keep them; that change never reached `main`.

Reach:

- The site's types (Administration › Site Settings › Announcements ›
  "Announcement Types") use the same grid and DAO (code).
- The delete is a query-builder delete, so `Announcement::delete()`
  never runs for these announcements: an image one of them had stays in
  the public files (code).
- `deleteByContextId()`, used when a journal is deleted, calls the same
  method; `PKPContextService::delete()` then deletes the journal's
  announcements itself (`Announcement::withContextIds()`), so a deleted
  journal leaves none behind with or without this delete (code, and on
  screen with the fix in and out).

## Proposed fix

Keep the announcements and let the foreign key clear their type: drop
the announcement delete from `AnnouncementTypeDAO::deleteById()` and
correct the two docblocks
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-announcement-type-deletes-announcements/fix.diff)):

```diff
     public function deleteById(int $typeId): int
     {
-        Announcement::withTypeIds([$typeId])->delete();
-
         return DB::table('announcement_types')
             ->where('type_id', '=', $typeId)
             ->delete();
```

A type is a label: no page, email or feed prints it (spec U12
[A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a5)),
so losing published announcements with it is out of proportion, and the
generic "delete this item?" becomes true as it stands.

The fix was tried on OJS, OMP and OPS `main`: after "OK" the two
announcements stayed on the "Announcements" tab and the public site,
their type cleared, and "u12r1 Newsletter" kept its type.

**Alternatives**

- Keep the deletion and show the existing warning: one line in
  `AnnouncementTypeGridRow::initialize()`
  (`manager.announcementTypes.confirmDelete` for `common.confirmDelete`,
  as OJS's `SubscriptionTypesGridRow` does with
  `manager.subscriptionTypes.confirmDelete`). The manager is told, but
  still loses content for removing a label, and the stale list and the
  left-behind images stay.
- Refuse the removal while announcements use the type, as genres and
  sections do (`pkp/pkp-lib#10096`). Safe, but the manager must retype
  every announcement first.

**What goes with it**

- `manager.announcementTypes.confirmDelete` is then unused in every
  locale and can go.
- Announcements already deleted cannot be restored; no repair applies.
- Backport: 3.3 has no foreign key, so there the fix would set
  `type_id` to null instead of deleting.
- A guard: `lib/pkp/tests` has no announcement-type test to copy, so a
  new `DatabaseTestCase`, for example `AnnouncementTypeDAOTest`, that
  makes a context, a type and two announcements of it, deletes the type
  and finds both announcements with no type; and the e2e scenario in
  spec U12.

Small: one line in the shared DAO with its docblocks, a test, no data
repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-announcement-type-deletes-announcements/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-announcement-type-deletes-announcements/lib.js),
  on PKP's default test dataset (pkp/datasets 566bb1f, 2026-10-03,
  PostgreSQL): `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/remove-announcement-type-deletes-announcements/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It also reads the
  `announcements` rows before and after the removal: the two rows of the
  removed type are gone, not hidden. `NB=1` runs the journal-deletion
  check alone (as `admin`: a journal "u12r1 Scratch" created under
  Hosted Journals, announcements on, a type, one typed and one untyped
  announcement, then the journal's "Remove"), which reads the database
  for what is left of its announcements and types.
- The site's types were not walked.
- Tips: `main` OJS ff004d0973 (pkp-lib 987776cd04), OMP 3b0ecf794 and
  OPS c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (pkp-lib 771474347e), OMP 9c5e24246 and OPS 38b61882d3 (pkp-lib
  cf3f984335); pkp-lib `stable-3_4_0` 767353f4fe and `stable-3_3_0`
  ac3fa73402 (OJS d68934d0d1 and ac77c9fb35, OMP 0aec65441 and
  8e72fc883, OPS acd8ae704b and c5532e2161).
- Code reads: on each line `AnnouncementTypeDAO::deleteById()`,
  `AnnouncementTypeGridRow::initialize()` and
  `AnnouncementTypeGridHandler::deleteAnnouncementType()`, and the
  `announcements.type_id` foreign key (the install migration; 3.4's
  `I6093_AddForeignKeys` and OJS's `dbscripts/xml/upgrade.xml`); 3.4 and
  3.3 were not walked.
- Introduced: blame on line 118 gives c9cda06979
  (`pkp/pkp-lib#10328` "Refactor Announcements", merged in PR
  `pkp/pkp-lib#10382`), which only rewrote the same call; `git log -L`
  gives 6bfef785aa, which reordered the method; the GitHub API names no
  PR for it.
- Upstream: `pkp/pkp-lib#10060` is titled for the image files a removed
  type leaves; its comments and the title of its PR's commit 85d92e7784
  ("not remove the related announcements by default") cover this fault
  for 3.4. That commit is not in the local pkp-lib history, so only its
  title was read. `pkp/pkp-lib#6798` and `pkp/pkp-lib#6791` (closed) are
  other faults of the same screen.
- MySQL not checked; the fix relies on the foreign key, which both
  databases enforce.
- Unverified: the image left behind (code only, not driven).
