# A refused "OK" in the Publication Facts Label settings puts back the saved values, and the corrected save drops the other entries

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code; the plugin comes from the Plugin Gallery)
  - 3.3: OJS (code; the plugin comes from the Plugin Gallery)
- **Introduced** pushed without a PR · [99efca6](https://github.com/pkp/pflPlugin/commit/99efca6b8108deb5467e729cd842622555f5a9ee) · 2023-11-23 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a journal manager presses "OK" in the "Publication Facts Label
plugin" settings and the window refuses it, the window stays open with
the message, but every field goes back to its saved value. The address
just typed, a box just ticked and every other change made in the window
are replaced.

A manager who corrects only the field the message names and presses
"OK" again gets "Your changes have been saved.", but only that field is
stored: the other entries are silently dropped. The way round is to
retype every entry after each refusal.

A save is refused for an index address in the wrong form, and for a
ticked DOAJ, Latindex or MEDLINE box that the index does not confirm.

## Impact

- **Lost**: the manager's other entries in the window. The save after
  the correction reports success, and nothing says that those entries
  were not stored.
- **Who**: OJS journal managers who use the label. The plugin ships
  with OJS and is off until a manager ticks it. The window refuses a
  Scopus "URL" that is not a Scopus source page and a Web of Science
  "URL" outside the Master Journal List. It also refuses a ticked DOAJ,
  Latindex or MEDLINE box unless that index, asked from the server by
  the journal's online ISSN, returns the journal. "Google Scholar" is
  never checked.
- **Way round**: after a refusal, enter everything again before
  pressing "OK". When an index box is refused because the server cannot
  reach the index, or the index does not list the journal, retyping
  does not help: the box has to be unticked.

Medium: a save that reports success drops the manager's entries, and
nothing on screen says so.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal
  `publicknowledge`). "Publication Facts Label plugin" is off in it, and
  none of its settings are saved.

Steps:

1. Sign in as `dbarnes`.
2. Go to Settings › Website, tab "Plugins", and tick "Publication Facts
   Label plugin".
3. Press the arrow beside the plugin's name, then "Settings". The
   "Publication Facts Label plugin" window opens with every field empty.
4. Under "Journal Information", type `u13ojs7 Society` in "Society name
   or acronym".
5. Under "Automated Listing of Indexes in the PFL", tick "Google
   Scholar".
6. Under "Manual Listing of Indexes in the PFL", type
   `https://www.example.org/u13ojs7` in the Scopus "URL" (not a Scopus
   source page).
7. Press "OK".
8. Type `https://www.scopus.com/sourceid/12345` in the Scopus "URL".
9. Press "OK".
10. Open the plugin's "Settings" again.

**Expected**: after step 7 the window shows the Scopus message and
keeps "u13ojs7 Society", "Google Scholar" ticked and the address to
correct. After step 9 all three are stored, and step 10 shows them.

**Observed**: after step 7 the window stays open. Under the Scopus
"URL", and in a notice at the top of the page, it says:

```
The Scopus URL you entered is not correct. Please read the instructions and try again.
```

"Society name or acronym" is empty, "Google Scholar" is unticked and the
Scopus "URL" is empty: the saved values, which are empty on this
dataset. Step 9 closes the window with "Your changes have been saved."
In step 10, "Society name or acronym" is empty and "Google Scholar" is
unticked. Only the Scopus address was stored.

[3.5: steps 1 to 7 give the same result.]

## Cause

`PflPlugin::manage()` (in `pkp/pflPlugin`, shipped in OJS as
`plugins/generic/pflPlugin`) handles opening the window and saving it
in one path:

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

When `validate()` refuses the save, the code falls through to
`initData()`. `PflSettingsForm::initData()` sets every field from the
plugin's saved settings (`getSetting()`), overwriting what
`readInputData()` had just read from the request. `fetch()` then renders
the form with the validation errors over the saved values. The window's
form handler (`AjaxFormHandler`) puts that form in place of the one the
manager filled in. The next "OK" posts what that form holds.

`initData()` is meant for the window's first display only. The other
settings windows in OJS, OMP and OPS that can refuse a save do not call
it after a refusal, so they show the manager's input again. Google
Analytics, Announcement Feed and the OAI JATS format call `initData()`
in an `else` of the `save` branch. Web Feed, the PubMed export and
pkp-lib's `PKPPubIdPlugin` return `fetch()` straight after a failed
`validate()`.

`manage()` has had this shape since 99efca6 added the settings window,
with its Scopus check.

Reach:

- Every refusal in the window takes this path: the Scopus and Web of
  Science address checks, the DOAJ, Latindex and MEDLINE listing checks,
  the society "URL" check and the "Start Date" check. Checked in the
  code.
- The "Citation Style Language" plugin's `manage()` has the same shape
  in OJS, OMP and OPS. Its form has only the request checks (POST,
  CSRF), so no entry a manager makes is refused there. Latent. Checked
  in the code.
- No other `manage()` or settings handler in OJS, OMP, OPS, their
  `lib/pkp` or their bundled plugins calls `initData()` after a refused
  `validate()`. Checked in the code.

## Proposed fix

Load the saved settings only when the window opens, not after a refused
save, as the Google Analytics and Announcement Feed plugins do. In
`PflPlugin::manage()`:

```diff
                         $form->execute();
                         return new JSONMessage(true);
                     }
+                } else {
+                    $form->initData();
                 }
 
-                $form->initData();
                 return new JSONMessage(true, $form->fetch($request));
```

The change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/fix.diff).
Its path starts at the OJS root; in a `pkp/pflPlugin` checkout, apply it
with `git apply -p4`.

The fix was tried on `main`, and the Steps end as Expected. A refused
"OK" followed by "Cancel" still stores nothing. A valid save still
closes with "Your changes have been saved." and the window reopens with
the stored values.

**Alternatives:**

- Return `fetch()` straight after a failed `validate()`, as Web Feed
  does: the same behavior, with a larger change to the method.
- Call `readInputData()` again after `initData()`: this works, but it
  reads the request a second time to undo a call that should not run.

**What goes with it:**

- Branches: `pkp/pflPlugin` `main`, `stable-3_5_0` and `stable-3_4_0`
  have the same block in `PflPlugin.php`, and the diff applies there
  with an offset. Bump the submodule in OJS `main` and `stable-3_5_0`.
  On `stable-3_3_0` the file is `PflPlugin.inc.php`, so the diff's path
  has to be changed there.
- The "Citation Style Language" plugin can take the same change in
  `pkp/citationStyleLanguage`, so that a check added there later does
  not bring the fault back. Not tried.
- No data repair, API or hook change.
- The guard: an e2e check in U13 that saves a refused entry and then a
  corrected one, and asserts every entry is stored.

Small: one method in one plugin, with no change to stored data or to
what other code relies on.

## Evidence

- Walk script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/walk.js)
  takes Steps 1 to 10 on an install freshly loaded from PKP's default
  test dataset (pkp/datasets 38ab955, 2026-09-30; PostgreSQL):
  `node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/walk.js`.
  The neighbour check,
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/neighbour.js),
  does two things. It presses "OK" on a refused entry, then "Cancel",
  and reopens. It then saves the entries with a valid Scopus address
  and reopens. The fix was applied with
  `node bin/try-fix.js apply …/fix.diff ojs`
  ([trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-settings-refused-ok-loses-changes/trial.sh)).
- Branch heads walked: OJS `main` bade233f73 (2026-09-30), `lib/pkp`
  2e377d27fc, plugin 622c85d (2026-08-27). On `stable-3_5_0`, steps 1
  to 7 were walked with the same result, on the 3.5 dataset: OJS
  92b9a16b48, `lib/pkp` a9c76aed62, plugin 95f7a35. Its `manage()` is
  the block above, so steps 8 to 10 follow from the code.
- The plugin is a submodule of OJS `main` and `stable-3_5_0`
  (`.gitmodules`). Nothing in the app enables it at install, and the
  dataset has it off.
- 3.4 and 3.3, read in the code: OJS `upstream/stable-3_4_0`
  (9571d8fde7) and `upstream/stable-3_3_0` (9fdb9bcf9a) do not bundle the
  plugin. The Plugin Gallery (`https://pkp.sfu.ca/ojs/xml/plugins.xml`,
  read 2026-10-01) lists releases 1.1.1.x for 3.4 and 1.0.1.x for 3.3.
  `pkp/pflPlugin` `stable-3_4_0` (97cf5da) and `stable-3_3_0` (7a91388)
  have the same `manage()` block and the same Scopus, Web of Science,
  index and date checks in the settings form.
- Trace: `git blame` on `manage()` gives 01f8488 (2024-07-16, "Reformat
  code with spaces"), which only re-indented it. `git log -S` on the
  `initData()` line gives 99efca6 ("Add settings and indexing data");
  the `commits/<sha>/pulls` API lists no PR for it.
- Upstream searched in pkp/pflPlugin, pkp/pkp-lib, pkp/ojs and
  pkp/ui-library (settings, scopus, validation, publication facts label
  settings, `PflSettingsForm`, `initData`, pflPlugin manage). Nothing
  reports this fault. `pkp/pkp-lib#4533` (closed 2019) noted that a
  refused plugin settings form lost the refused field's value. It was
  about other plugins, before this one existed.
- Not walked: the DOAJ, Latindex and MEDLINE refusals on an install that
  can reach those services. The test install sends its outbound
  requests to a closed port, so every listing check is refused there.
