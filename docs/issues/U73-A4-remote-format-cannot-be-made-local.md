# Unticking a book format's "available at a separate website" box keeps the format remote after "OK"

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#5025` for `pkp/pkp-lib#2072` · [718ad72e59](https://github.com/pkp/pkp-lib/commit/718ad72e597285d2899932efbd1d87635b90efe7) · 2019-06-26 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

In a remote format's "Edit" tab, unticking "This format will be
available at a separate website." hides "URL of remotely-hosted
content" but keeps the address in it. "OK" then saves the format still
remote. Its name stays a link to the address, and its row offers no
"Change File", so no file can be attached to it. When the editor opens
"Edit" again, the box is ticked.

A press that moves an e-book from another website onto its own files
cannot do it the obvious way, and no message says why.

## Impact

- **Lost**: the editor's change. On a published book, the format keeps
  sending readers to the other website. A press usually moves a format
  home because that site is going away, and then readers meet a dead
  link until someone at the press notices.
- **Who**: a press editor or manager turning a remote format into one
  the press hosts itself. This is a rare change.
- **Way round**: in "Edit", empty "URL of remotely-hosted content" while
  the box is still ticked, then untick it and press "OK". The format is
  then local, and its row offers "Change File" and "Select Files" again.

Medium: the press's change is not made, and the window closes as if it
were. On a published book, readers keep being sent to a site the press
meant to leave. The way round on screen and the rarity of the change
keep it from high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (or `stable-3_5_0`). Book 4,
  "How Canadians Communicate: Contexts of Canadian Popular Culture"
  (in Production), already has a format "PDF" saved as hosted at a
  separate website
  (`https://file-examples-com.github.io/uploads/2017/10/file-sample_150kB.pdf`).

Steps:

1. Sign in as `dbarnes`.
2. Open submission 4, "How Canadians Communicate: Contexts of Canadian
   Popular Culture", and its "Publication Formats" page. The "PDF"
   row's name is a link to the address, with "This item is remotely
   hosted." under it.
3. Open the arrow before "PDF" and press "Edit". "This format will be
   available at a separate website." is ticked and "URL of
   remotely-hosted content" holds the address.
4. Untick "This format will be available at a separate website.". The
   address box hides and "URL Path" appears.
5. Press "OK".
6. Open the arrow before "PDF" and press "Edit" again.

**Expected**: unticking the box empties the address. After "OK" the
"PDF" row's name is plain text with "No Items" under it, and the row
offers "Change File" and "Select Files". Reopened, the box is unticked.

**Observed**: the hidden address box still holds the address after
step 4. After "OK" the "PDF" row is unchanged: its name is a link to
the address, "This item is remotely hosted." is under it, and it offers
no "Change File" or "Select Files". Reopened, the box is ticked and the
address is back.

Control: in a journal's "Add galley" window, ticking "This galley will
be available at a separate website.", typing an address and unticking
the box empties the address (OJS submission 5, "Genetic transformation
of forest trees").

## Cause

The script behind the "Edit" tab empties the address box by an id the
press's form does not use. `RepresentationFormHandler.toggleRemote_()`
(pkp-lib `js/controllers/grid/representations/form/RepresentationFormHandler.js`
line 77), the shared handler of the galley and format forms, runs
`$('input[id^="urlRemote"]').val('')` when the box is unticked. OJS's
and OPS's galley forms name the box `urlRemote`, so they are not
affected. OMP's format form
(`templates/controllers/grid/catalogEntry/form/formatForm.tpl` line 42)
names it `remoteURL`, so nothing is emptied.

The hidden box is still posted. `PublicationFormatForm::readInputData()`
reads `remoteURL`, and `execute()` (OMP
`controllers/grid/catalogEntry/form/PublicationFormatForm.php` line 234)
stores the posted value as `urlRemote`, or null when it is empty. The
server never reads the box's tick, so the old address is saved again
and the format stays remote. The list (`PublicationFormatGridCellProvider`)
and the book's page (`templates/frontend/components/publicationFormats.tpl`)
treat any format with `urlRemote` as remote.

Up to 3.1 the selector was `input[id^="remoteURL"]`, which matched
OMP's box, so unticking emptied it. The versioning work of
`pkp/pkp-lib#2072` renamed OJS's galley box to `urlRemote` and changed
the shared selector with it, in pkp-lib 718ad72e59 and OJS 88aba9a0cb
(`pkp/ojs#2457`). OMP's format form kept `remoteURL`, the id it has
had since a994cdb13 (`pkp/omp#218`, 2016).

Reach:

- Every role that can edit a format, on the format's "Edit" tab (walked
  as the Press editor).
- Readers: the book's page links a format with an address to that
  address, so a published book keeps sending readers there (checked in
  the code).

## Proposed fix

A proposal: let the handler empty the input inside the box's own group,
`#remote`, which the handler already shows and hides and which all
three forms wrap the address in. It then works whatever the field is
named, with no template or form change in the apps. The source change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-format-cannot-be-made-local/fix.diff):

```diff
--- a/lib/pkp/js/controllers/grid/representations/form/RepresentationFormHandler.js
+++ b/lib/pkp/js/controllers/grid/representations/form/RepresentationFormHandler.js
@@ -74,7 +74,7 @@
 		} else {
 			// hide and clear the remote URL input field
 			$('#remote').hide(20);
-			$('input[id^="urlRemote"]').val('');
+			$('#remote input').val('');
 			$('#urlPathSection').show(20);
 		}
 		return true;
```

Each app also commits the built `js/pkp.min.js`, which OJS, OMP and OPS
carry on `main`, 3.5, 3.4 and 3.3. An install with
`enable_minified = On` loads that bundle, which still clears
`input[id^="urlRemote"]`. So the bundle is rebuilt
(`lib/pkp/tools/buildjs.sh`) and committed in each app on each branch
the fix goes to, or those installs keep the fault.

Tried on `main`, OMP and OJS, from the source file
(`enable_minified = Off`; the bundle was not rebuilt): the Steps showed
the Expected, and the OJS galley window still emptied its address.
Saving with the box left ticked was walked with the fix applied and
again with it reverted, with the same result: a new format "E-book
u73f" saved with the box ticked and an address stayed remote, and the
dataset's "PDF" saved with the box still ticked kept its address.

**Alternatives**

- Rename OMP's field to `urlRemote` (the template, and
  `PublicationFormatForm`'s `initData()`, `readInputData()` and
  `execute()`), as the 2019 change did for OJS. It also works, needs
  only OMP's bundle rebuilt, but touches three places in OMP, and
  OMP's own Cypress data test, which builds the default dataset, types
  into `input[id^="remoteURL-"]`.
- Have `PublicationFormatForm::execute()` read the box's tick and drop
  the address when it is unticked. That makes the server follow the
  box, but the galley forms would still rely on the script, and the
  hidden box would still hold the old address on screen.

**What goes with it**

- The rebuilt `js/pkp.min.js` in OJS, OMP and OPS on each branch, as
  above.
- No data repair: a format saved remote stays remote until an editor
  unticks it again.
- No API or hook change. `pkp/pkp-lib#12826` (open) plans to retire the
  grid code this handler belongs to; whatever replaces the format
  window should keep the rule.
- Backport: the handler's line is the same on 3.5, 3.4 and 3.3, so the
  source diff applies as written there; each branch needs its own
  bundle rebuild.
- Guard: a step in OMP's Cypress tests should untick a remote format and
  check that it saves local; the e2e scenario is recorded as a
  **Planned** item in the spec.

Medium: one line in pkp-lib, but the built bundle has to be rebuilt and
committed in three apps on each branch, and a test added.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-format-cannot-be-made-local/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-format-cannot-be-made-local/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/remote-format-cannot-be-made-local/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `MODE=nb` for the
  check with the box left ticked). It takes Steps 1–6 on OMP, then the
  way round, and the control on OJS. The way round was walked as far as
  the row offering "Change File" and "Select Files"; no file was
  uploaded there. OPS has no formats; its galley window is not walked.
- The fix was tried with `node bin/try-fix.js apply` on the source file
  only; the walks ran with `enable_minified = Off`.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
  (lib/pkp cf3f984335); `stable-3_4_0` OMP 0aec65441 (lib/pkp
  767353f4fe); `stable-3_3_0` OMP 8e72fc883 (lib/pkp ac3fa73402).
- Code reads, on each branch: the handler's line 77, OMP's
  `formatForm.tpl` and `PublicationFormatForm` read as in the Cause
  (on 3.3 `setRemoteURL()` stores the posted value as it is), and the
  committed `js/pkp.min.js` of OJS, OMP and OPS, which holds
  `a('input[id^="urlRemote"]').val("")`. Up to 3.1, pkp-lib tag
  `3_1_2-4` and 718ad72e59's parent clear `input[id^="remoteURL"]`.
- Tracker search (2026-10-03): pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs, for "remote publication format", "remotely hosted",
  "separate website", "remoteURL", `RepresentationFormHandler` and
  `toggleRemote`. `pkp/pkp-lib#1123` (the feature) and `pkp/pkp-lib#7086`
  (the "Metadata" tab of remote formats) are other faults;
  `pkp/pkp-lib#12826` lists the handler among grid code to retire.
- Not walked: 3.4 and 3.3 (code only); the book's public page for a
  published remote format (code).
