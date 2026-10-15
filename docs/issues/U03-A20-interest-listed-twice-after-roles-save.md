# After a newcomer registers with an existing reviewing interest, accounts that save their Roles tab list it twice

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10324` for `pkp/pkp-lib#10292` · [025a6fc71a](https://github.com/pkp/pkp-lib/commit/025a6fc71ade25af6dfd75ba27a0be82e22db6c9) · 2025-01-04 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U03 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a20)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a Register page, the reviewing interests box takes a typed list. When
an interest after the first is typed with a space after the comma
("glacier, ethics") and the site already holds that interest, the site
stores it a second time. Typed without the space ("glacier,ethics"), or
first in the list, it is not stored again.

After that, any account that holds "ethics" and presses "Save" on its
Profile's "Roles" tab, even with nothing changed, is given both stored
copies. Its tab still shows "ethics" once, but a manager's "View more
details" under Users & Roles › "Edit" reads "ethics, ethics". An account
is not affected until it saves its own Roles tab. Every further copy adds
one more repeat at the next save, and nothing on screen removes a copy.

It needs reviewer self-registration with interests typed, which a journal
and a press offer by default. On 3.5 a preprint server shows it too. On
`main` a server's Roles tab has no interests box, and its "Save" erases
the interests instead (*User profile*
[OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#ops3)).

## Impact

- **Lost**: nothing; the interests are only listed with repeats, and a
  reviewer search still finds the reviewer.
- **Who**: managers reading a user's "View more details". In the code
  (not seen on screen), editors also see the repeats in the Add Reviewer
  list, and so does the review report.
- **Way round**: none on screen. Removing the chip and adding it back
  links the account to every copy again.

Low: a wrong listing that nothing downstream relies on. It would be
medium if the repeats changed which reviewers a search finds.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` ("Journal of Public Knowledge").
  On OMP, read "press" for "journal"; `rvaca` is the Press manager there.
- The dataset holds no reviewing interests.

Steps:

1. Sign in as `jjanssen` (a Reviewer). Open the journal's Profile
   (`/index.php/publicknowledge/en/user/profile`) and select "Roles".
2. In "Reviewing interests" type `ethics`, press Enter, then press "Save".
3. Sign out and open the journal's "Register" page
   (`/index.php/publicknowledge/en/user/register`).
4. Fill "Given Name" `h15b`, "Family Name" `Newcomer`, "Affiliation"
   `h15b`, "Country" "Canada", "Email" `h15b.newcomer@mailinator.com`,
   "Username" `h15bnewcomer`, and "Password" and "Repeat password"
   `h15bnewcomerh15bnewcomer`.
5. Tick "Yes, I agree to have my data collected and stored according to
   the privacy statement." and "Yes, I would like to be contacted with
   requests to review submissions to this journal."
6. In "Reviewing interests", which appears under the second box, type
   `glacier, ethics` (a comma and a space). Press "Register".
7. Sign in as `h15bnewcomer`, open Profile › "Roles" and press "Save"
   without changing anything.
8. Sign in as `jjanssen`, open Profile › "Roles" and press "Save" without
   changing anything.
9. Sign in as `rvaca` (Journal manager). Open Settings › "Users & Roles",
   search `h15b.newcomer`, choose "Edit" in the row's menu, then press
   "View more details". Do the same for `jjanssen`.

[3.5, OPS: the server's own Register page has no reviewer box. So steps
3 to 6 use the site-wide Register page (`/index.php/index/en/user/register`):
tick "Reader" and the privacy line under "Public Knowledge Preprint
Server", and type `glacier, ethics` in the box under "If you requested to
be a reviewer, please enter your subject interests.". The server has no
reviewers, so `ccorino` takes `jjanssen`'s steps. `rvaca` is the Preprint
Server manager.]

**Expected**: step 9 lists each interest once: "Reviewing interests
ethics, glacier" for the newcomer and "Reviewing interests ethics" for
`jjanssen`.

**Observed**: step 6 ends on "Registration complete". In steps 7 and 8,
each "Save" shows "Your changes have been saved.". The newcomer's tab
shows the chips "ethics" and "glacier", and `jjanssen`'s tab the chip
"ethics", each once. Step 9 reads:

```
h15bnewcomer: Reviewing interests ethics, glacier, ethics
jjanssen:     Reviewing interests ethics, ethics
```

The save at step 8 posted the one interest the tab shows
(`interests[]=ethics`). Until that save, `jjanssen` was linked to one
"ethics" only, while the newcomer was already linked to both.

## Cause

`PKP\user\interest\Repository::setInterestsForUser()` (pkp-lib
`classes/user/interest/Repository.php`) looks the posted names up before
it trims them. It then links the account to every entry it found. Line
numbers below are `main`'s; on 3.5 they are 94, 113, 125 and 136–141.

- A Register page posts its interests box as one string, which the method
  splits on "," (line 66). "glacier, ethics" becomes "glacier" and
  " ethics". The lookup (`withSettings('name', $interests)`, line 85)
  matches names exactly, so it does not find " ethics". The method then
  trims the names it did not find (line 97) and creates them. A second
  "ethics" entry is added to the site's interests.
- The lookup returns every entry whose name was posted, and lines
  108–113 link the account to each. An account that posts "ethics" is
  linked to both copies.

The Roles tab's own box (tag-it) sends each chip already trimmed, so it
never makes a copy. But its "Save" posts "ethics", and so it links both.

The method came with `pkp/pkp-lib#10324` for `pkp/pkp-lib#10292`, which
moved the controlled vocabularies to Eloquent. The method it replaced,
`InterestDAO::setUserInterests()`, trimmed every name first and linked
the single entry its lookup returned.

Reach:

- On screen: every account that holds an interest with a copy on the
  site, at its next Roles "Save". That is OJS and OMP, and OPS on 3.5,
  whose Roles tab has the box.
- The other callers link every copy in the same way (code):
  - `RegistrationForm::execute()`, for the first name typed in the box,
    which has no leading space and so finds every copy;
  - `CreateReviewerForm::execute()` (an editor's "Create New Reviewer");
  - `UserDetailsForm::execute()` (Administration › a context's settings
    › "Users" › "Edit User");
  - the Users XML import, which splits on `/,\s*/`, so it never makes a
    copy but links every copy that exists.
- These places list the repeats (code):
  - "View more details", through `UserRoleAssignmentInviteResource`
    (`reviewInterests`, `$user->getInterestString()`);
  - the review report (`ReviewReportDAO`,
    `Repo::userInterest()->getInterestsString()`);
  - `UserSelectGridCellProvider`;
  - the Users XML export;
  - the users API's `interests` (`Repo::user()->preloadInterests()`),
    which the Add Reviewer list (`SelectReviewerListItem.vue`) shows.
- The interest suggestions are not affected: the `vocabs/interests` API
  returns each name once (`PKPInterestController::getMany()`).

## Proposed fix

In `setInterestsForUser()`, trim the names before the lookup, and drop
empty names and repeats. Then link one entry per name, the lowest id,
where the site already holds copies.

```php
// Trim before the lookup, so an interest typed after ", " finds the stored one
$interests = collect(is_array($interests) ? $interests : explode(',', (string) $interests))
    ->map(fn ($interest): string => trim((string) $interest))
    ->filter(fn (string $interest): bool => $interest !== '')
    ->unique()
    ->values()
    ->all();
…
    ->withSettings('name', $interests)
    ->get()
    // One entry per name (the oldest) where the vocabulary already holds copies
    ->sortBy(fn (ControlledVocabEntry $entry) => $entry->getKey())
    ->unique(fn (ControlledVocabEntry $entry) => collect($entry->name)->first());
```

The full change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/interest-listed-twice-after-roles-save/fix.diff).
It applies to 3.5 as it stands, at the line offsets above.

The fix was tried on `main` in OJS and OMP:

- With the fix, step 9 reads "ethics, glacier" for the newcomer and
  "ethics" for `jjanssen`.
- On OJS, steps 1 to 6 were taken without the fix, so the site held
  "ethics" twice. Steps 7 to 9 were then taken with the fix, and step 9
  read the same, because each save linked one "ethics" entry only.
- Adding and removing interests on the Roles tab, and registering with
  "glacier,ethics", gave the same result with the fix and without it.

**Alternatives**

- Only trim before the lookup. No new copies would appear, but accounts
  would still be linked to every copy already stored.
- Trim in each form's `readInputData()`. Every caller would need it, and
  a plugin calling the method would still make copies.
- Make interest names unique in the database. That is a schema change,
  and the stored copies would have to be merged first.

**What goes with it**

- An optional repair. The fix works without one: each account sheds its
  repeats at its next save, and the extra entries are not shown anywhere
  else. Accounts that never save again keep their repeats. An upgrade
  migration could remove them by relinking `user_interests` to the
  lowest-id entry per name and deleting the other entries. Only
  `user_interests` and `controlled_vocab_entry_settings` point at an
  interest entry.
- On MySQL, whose default collation ignores case, the lookup also
  matches "Ethics" when "ethics" is posted. With the fix as written,
  posting "Ethics" while "ethics" is stored still creates an "Ethics"
  entry and links both, because `array_diff` is case-sensitive. Whether
  case variants are the same interest is the team's call. Not tried;
  MySQL not checked.
- No change to the REST API or a hook.
- Guard: a unit test of `setInterestsForUser()` with "glacier, ethics"
  posted for two accounts (one entry per name, one link per name), and
  an e2e check of this walk.

Small: a few lines in one pkp-lib method and a unit test; the repair
migration is optional cleanup.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/interest-listed-twice-after-roles-save/walk.js)
  (helpers in `lib.js` beside it), on an install freshly loaded from
  PKP's default test dataset (pkp/datasets 7912e09, 2026-10-14;
  PostgreSQL). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/interest-listed-twice-after-roles-save/walk.js`
  for steps 1 to 9 (`PKP_E2E_LINE=stable-3_5_0` in front and `all` for
  3.5). Its argument `neighbour` runs the checks of what the fix must
  leave alone instead of the steps: `jjanssen` adds "ethics" and
  "statistics", then removes "statistics", then "ethics", saving each
  time, and a newcomer registers with "glacier,ethics". The fix was
  applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/interest-listed-twice-after-roles-save/fix.diff ojs omp`.
  `PART=1-6` and `PART=7-9` in front of the run command take half the
  steps each. The script also reads the stored entries and their links
  (read-only SQL) after steps 2, 6, 7 and 8. After step 6 the site held
  "ethics" twice. After step 7 `jjanssen` was still linked to one copy,
  and after step 8 to both.
- Branch tips (2026-10-15). `main`: OJS 378eced941, OMP f4836d4fb, OPS
  2ece50497f (pkp-lib b17fadae59 on all three). 3.5: OJS ca763c91cd, OMP
  a70bbb9c4, OPS 44aec6e131 (pkp-lib 4045d9241e). 3.4: pkp-lib
  55c8e406b3. 3.3: pkp-lib 5e84acd11b.
- 3.4 and 3.3 (code): `stable-3_4_0` `classes/user/InterestDAO.php` and
  `stable-3_3_0` `classes/user/InterestDAO.inc.php`,
  `setUserInterests()`. Both trim every name first and link the row that
  `InterestEntryDAO::getBySetting()` returns. That query has no ORDER BY,
  so it gives one entry, not necessarily the oldest.
- Introduced: `git blame` on the method gives 025a6fc71a; a later commit,
  402aa895bb, only re-indented some lines.
- `pkp/pkp-lib#3371` ("return only distinct interests", closed 2018) is
  about the suggestions list of an older version, not this fault.
- Not driven: the Add Reviewer list, the review report, the
  administrator's "Edit User" form and the Users XML import (read in the
  code); 3.4 and 3.3 (code); MySQL.
