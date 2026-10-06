# A refused "OK" in the Publication Facts Label settings shows the saved values again, dropping every change just made

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; not bundled, a Plugin Gallery install has the same lines)
  - 3.3: none (code; not bundled, a Plugin Gallery install has the same lines)
- **Introduced** pkp/pflPlugin, no pull request · [99efca6b81](https://github.com/pkp/pflPlugin/commit/99efca6b8108deb5467e729cd842622555f5a9ee) · 2023-11-23 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager fills in the "Publication Facts Label plugin" settings
window and presses "OK". When the save is refused (a Scopus or Web of
Science address in the wrong form, an index listing that cannot be
verified), the window stays open with the message, but every field
shows the value saved before: the address just typed, a box just ticked
and every other change made in the window are gone.

The stored settings are untouched. The manager has to enter everything
again, with the refused field corrected. A manager who corrects only
the refused field and presses "OK" again gets "Your changes have been
saved." while the other changes are left out.

It happens at every refused "OK", on any journal with the plugin on. A
refusal does not need a mistake: an index listing is also refused when
the index's server cannot be reached.

## Impact

- **Lost.** What the manager entered in the window since opening it, up
  to nine fields, the refused value included, so they cannot see what
  was wrong with it. If they then correct only the refused field and
  press "OK", the save succeeds with "Your changes have been saved."
  and stores the other fields as they were before: the earlier changes
  are not saved, and that save does not say so.
- **Who.** A journal manager setting up or changing the plugin's
  settings, each time "OK" is refused. Ticking "Directory of Open Access
  Journals", "Latindex" or "MEDLINE" is refused when the index does not
  list the journal's online ISSN, and also when the index's server
  cannot be reached or answers an error, so a refusal can come without
  any mistake by the manager.
- **Way round.** Enter everything again before the second "OK".

Low: the stored settings are never damaged, the window shows the old
values right after the refusal, in view before any second "OK", and the
form is a short one a journal fills in once. That the old values are on
screen is what keeps the second save from being a silent loss; a team
that reads its success message as silence would put this at medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`.
  The "Publication Facts Label plugin" is off and has no settings
  stored.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › "Plugins": tick "Enabled" on "Publication Facts
   Label plugin".
3. Press the row's arrow, then "Settings". The window "Publication
   Facts Label plugin" opens with every field empty.
4. Under "Journal Information", type "u13ir16 Society" in "Society name
   or acronym" and "https://example.org/u13ir16" in "URL".
5. Under "Exclude by Date", type "2020-01-01" in "Start Date".
6. Under "Automated Listing of Indexes in the PFL", tick "Google
   Scholar".
7. Under "Manual Listing of Indexes in the PFL", type
   "https://example.org/u13ir16-scopus" in the Scopus "URL".
8. Press "OK".

**Expected.** The window stays open with "The Scopus URL you entered is
not correct. Please read the instructions and try again." under the
Scopus "URL", and every field still holds what steps 4 to 7 entered, so
only the Scopus address needs correcting.

**Observed.** The window stays open and shows the message under the
Scopus "URL"; the same text also appears as a notice in the top right
corner of the screen, over the window:

```
The Scopus URL you entered is not correct. Please read the instructions and try again.
```

Every field is back to its saved value: "Society name or acronym",
"URL", "Start Date" and the Scopus "URL" are empty, and "Google Scholar"
is unticked.

Entering steps 4 to 6 again with "https://www.scopus.com/sourceid/12345"
as the Scopus "URL" and pressing "OK" closes the window with "Your
changes have been saved.", and the window shows those values when
opened again.

## Cause

`PflPlugin::manage()` (pkp/pflPlugin, bundled with OJS as
`plugins/generic/pflPlugin`, `PflPlugin.php` lines 559–568) handles both
the opening of the settings window and its save:

```php
if ($request->getUserVar('save')) {
    $form->readInputData();
    if ($form->validate()) {
        $form->execute();
        return new JSONMessage(true);
    }
}

$form->initData();
return new JSONMessage(true, $form->fetch($request));
```

When `validate()` refuses, the code falls out of the `if` to
`$form->initData()`, which is meant for a fresh opening.
`PflSettingsForm::initData()` sets all nine fields from the plugin's
stored settings, over the values `readInputData()` has just read from
the request. `fetch()` then renders the form with the stored values and
with the errors `validate()` collected, and the window replaces its
form with that answer.

Reach:

Each item says whether it was followed on screen or read in the code.

- Every refusal the form gives on the server goes this way: a Scopus
  address in the wrong form (on screen); a Web of Science address that
  does not start with the Master Journal List's address, and the DOAJ,
  Latindex and MEDLINE listing checks (code). Each listing check also
  returns false when its request throws or does not answer 200, so an
  unreachable index refuses the save.
- Two of the form's checks do not refuse through the window. An
  impossible "Start Date" never reaches the `strtotime()` check (the
  separate fault in Evidence), and an address that is not a web address
  is stopped in the browser by the `url` class `FormValidatorUrl` puts
  on the box, before any save is sent (code).
- A refusal does not touch the stored settings: `execute()` is not
  reached (code; on screen, the fields showed the saved values).
- A fresh opening of the window shows the stored values (on screen).
- `CitationStyleLanguagePlugin::manage()` in OJS, OMP and OPS has the
  same shape, but its form has only the POST and CSRF checks, so nothing
  a manager types is refused there (code).
- The other bundled settings windows call `initData()` only when
  nothing was posted, and keep the input after a refusal (code):
  `GoogleAnalyticsPlugin` and `WebFeedPlugin` (the three apps),
  `AnnouncementFeedPlugin`, `OAIMetadataFormatPlugin_JATS` and
  `PubMedExportPlugin` (OJS), `BrowseBlockPlugin` (OMP),
  `PubObjectsExportPlugin` (OJS, OPS) and pkp-lib's `PKPPubIdPlugin`.

## Proposed fix

Call `initData()` only when the window is opened, as
`GoogleAnalyticsPlugin::manage()` does. A
refused save then renders the form from the posted values, with its
errors. The change goes in pkp/pflPlugin, followed by a submodule bump
in OJS
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-refused-save-resets/fix.diff)):

```diff
--- a/plugins/generic/pflPlugin/PflPlugin.php
+++ b/plugins/generic/pflPlugin/PflPlugin.php
@@ -562,9 +562,9 @@
                         $form->execute();
                         return new JSONMessage(true);
                     }
+                } else {
+                    $form->initData();
                 }
-
-                $form->initData();
                 return new JSONMessage(true, $form->fetch($request));
         }
         return parent::manage($args, $request);
```

Tried on `main`. With the fix, the refused "OK" of step 8 leaves the
window open with the message and with every field as steps 4 to 7
entered it, the wrong Scopus address included. A valid save still
closes the window with "Your changes have been saved.", and a fresh
opening still shows the stored values, with the fix in and out.

**Alternatives**

- Return the refused form from inside the `if`, as `PKPPubIdPlugin`
  does (`return new JSONMessage(true, $form->fetch($request));` after
  the failed `validate()`). The same result with one more `return`; the
  `else` keeps the method closest to its neighbours among the generic
  plugins.

**What goes with it**

- An OJS `main` commit moving `plugins/generic/pflPlugin` to the fixed
  plugin commit, and the same change on the plugin's `stable-3_5_0`
  branch with its OJS bump, where the method is identical.
- Optional, for the Plugin Gallery's copies: the plugin's
  `stable-3_4_0` and `stable-3_3_0` branches hold the same lines. The
  diff does not apply there as it stands: the method sits at other
  line numbers (570 and 585), and on `stable-3_3_0` the file is
  `PflPlugin.inc.php`.
- Optional: the same `else` in pkp/citationStyleLanguage's `manage()`.
  It has no effect on screen today (Reach).
- No stored data to repair, and no caller, API or hook changes.
- Test: an e2e scenario in U13 that presses "OK" with a Scopus address
  in the wrong form and reads the other fields back.

A proposal. Small: three lines in one method, and a submodule bump.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/publication-facts-settings-refused-save-resets/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-refused-save-resets/walk.js),
  with its helpers in `lib.js` beside it, run with
  `PROBE_FEATURE=issues-ir16 PROBE_AGENT=ir16 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-refused-save-resets/walk.js`.
  It records the window's fields when opened, as typed and after "OK",
  the save's answer and the message. With `neighbour` as its argument it
  adds a check that the fix reaches no further: it enters the fields
  again with a Scopus address of the right form, presses "OK" and opens
  the window once more.
- The refused save answered 200 with the form in its body, as a legacy
  form does. No request failed and no page script failed during the
  walks.
- The fix was applied with `bin/try-fix.js` and `walk.js neighbour` run
  on a freshly loaded install, with the fix and without it.
- Tips: OJS `main` bade233f73 with pkp-lib 2e377d27fc and pflPlugin
  622c85dcb1 (pkp/pflPlugin `main`'s tip on 2026-10-01); OJS
  `stable-3_5_0` 92b9a16b48 with pkp-lib a9c76aed62 and pflPlugin
  95f7a35886 (1.2.1.4); OJS `stable-3_4_0` 9571d8fde7; OJS
  `stable-3_3_0` 9fdb9bcf9a.
- 3.5 (followed on screen, and read): the same script, steps 1 to 8, on the
  `stable-3_5_0` install, with the same message and the same emptied
  fields. The read: `PflPlugin::manage()` and
  `PflSettingsForm::initData()` in pflPlugin 95f7a35886, identical to
  `main`'s.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` and `upstream/stable-3_3_0`
  of OJS have no `plugins/generic/pflPlugin` and no such entry in
  `.gitmodules`. The plugin's own `stable-3_4_0` (97cf5da) and
  `stable-3_3_0` (7a91388) branches hold the same `manage()`, so a copy
  installed from the Plugin Gallery has the fault; it was not followed
  on screen there.
- Introduced: `git blame` on `PflPlugin.php` lines 559–568 names
  01f8488a (2024-07-16, "Reformat code with spaces"); `git log -L` on
  the method before it ends at 99efca6b81, which wrote it in this
  shape. The commit's page on GitHub names no pull request.
- Every instance: `function manage` in the OJS, OMP and OPS `main`
  checkouts (`plugins`, `classes`, `lib/pkp/classes`,
  `lib/pkp/plugins`), each read for where it calls `initData()`. The
  two with the fault's shape are `PflPlugin` and
  `CitationStyleLanguagePlugin`, whose `CitationStyleLanguageSettingsForm`
  adds only `FormValidatorPost` and `FormValidatorCSRF`.
- Upstream search (2026-10-01), issues and pull requests, open and
  closed, in pkp/pkp-lib, pkp/ojs, pkp/ui-library and pkp/pflPlugin, for
  "publication facts settings", "plugin settings values lost validation
  error" and `PflSettingsForm`, among others. `pkp/pflPlugin#61`
  (closed, a fatal error in the MEDLINE check on save, since fixed) and
  `pkp/pkp-lib#4533` (closed, "Duplicated content when submitting an
  invalid plugin's settings form") are other faults. No candidate is
  this one.
- Not driven: the refusals other than the Scopus address (the test
  install reaches no outside server, so the DOAJ, Latindex and MEDLINE
  checks refuse there whatever the journal's ISSN), and the second
  "OK" with only the refused field corrected, which follows from the
  form posting the values it shows (code).
- The window's "Start Date" accepting an impossible date with "Your
  changes have been saved." (U13 OJS8) is a separate fault: the date
  picker copies only a date it can read into the field the form posts,
  so nothing reaches the form's checks. It is not covered here.
