# On a site hosting several presses, the site's "About Open Monograph Press" page says "This press uses"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code)
- **Introduced** [130046e0b2](https://github.com/pkp/omp/commit/130046e0b23d11306247aab42e235fdfbf57a79e) (a Weblate commit, no PR) · 2022-07-02 · Jonas Raoni Soares da Silva (jonasraoni); reached `main` in the translations merge [9cf7f6160](https://github.com/pkp/omp/commit/9cf7f6160747dafb9e8d74e9bc6c42d6e33b2c3e)
- **Upstream** none found (2026-10-03)
- **Tracked in** U07 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U07-journal-identity-and-about-pages.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a site that hosts several presses, the "About Open Monograph Press" page,
reached from the PKP logo in the footer of the site's home page, opens "This
press uses Open Monograph Press {version}…" and then asks the visitor to
contact "the site" about "its presses". A journal and a preprint server
site open "This site uses …" there.

The page read "This site uses …" until 2022, and the fix is one English
sentence. Other languages are left to their translators: fifteen also name
the press, and French (Canada) is right.

The site's home page, the list of presses, exists only when the site hosts
two or more presses; with one, the site's address opens that press.

## Impact

- **Lost**: nothing; one sentence names the wrong thing.
- **Who**: any visitor to the site-level page of an install with two or
  more enabled presses, in English.
- **Way round**: none needed. The links on the page work.

Low: wording on a public page that sends no visitor to the wrong place.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (OJS and OPS the control, the same
  steps).
- A second press, since with one enabled press the site's address opens
  that press's home page. Sign in as `admin` (password `admin`),
  Administration › "Hosted Presses" › "Create Press": name "u07e Second
  Press", acronym "U07E", contact name "u07e Second Press", email
  `u07e@mailinator.com`, country Canada, path `u07esecond`, English ticked
  and primary, "Enable this press to appear publicly on the site" ticked,
  "Save". (OJS: "Hosted Journals" › "Create Journal"; OPS: "Hosted
  Servers" › "Create Server".)

Steps:

1. Sign out.
2. Open the site's home page (`/index.php/index/en`). It lists "Public
   Knowledge Press" and "u07e Second Press".
3. In the footer, press the PKP logo ("More information about the
   publishing system, Platform and Workflow by OMP/PKP.").
4. Read the paragraph under "About Open Monograph Press"
   (`/index.php/index/en/about/aboutThisPublishingSystem`).
5. Control: open "Public Knowledge Press" (`/index.php/publicknowledge/en`),
   press the same logo and read the paragraph.

**Expected:** step 4 reads as on a journal or a preprint server site:

```
This site uses Open Monograph Press 3.6.0.0, which is open source press management and publishing software developed, supported, and freely distributed by the Public Knowledge Project under the GNU General Public License. Visit PKP's website to learn more about the software. Please contact the site directly with questions about its presses and submissions to its presses.
```

**Observed:** step 4 reads:

```
This press uses Open Monograph Press 3.6.0.0, which is open source press management and publishing software developed, supported, and freely distributed by the Public Knowledge Project under the GNU General Public License. Visit PKP's website to learn more about the software. Please contact the site directly with questions about its presses and submissions to its presses.
```

OJS reads "This site uses Open Journal Systems 3.6.0.0, … Please contact the
site directly with questions about its journals and submissions to its
journals." and OPS "This site uses Open Preprint Systems 3.6.0.0, … its
servers and submissions of preprints." The control, the press's own page,
reads "This press uses … Please contact the press directly with questions
about the press and submissions to the press.", with "contact the press"
linking to the press's Contact page, as it should.

## Cause

OMP's `templates/frontend/pages/aboutThisPublishingSystem.tpl` prints
`about.aboutOMPPress` when there is a current press and `about.aboutOMPSite`
when there is none (line 26). The template is right; the English text of
`about.aboutOMPSite` in `locale/en/locale.po` (the `msgid` at line 1039) is
wrong. It opens with the press string's words:

```
msgid "about.aboutOMPSite"
msgstr ""
"This press uses Open Monograph Press {$ompVersion}, which is open source "
…
"about the software</a>. Please contact the site directly with questions "
"about its presses and submissions to its presses."
```

From 2008 to 2022 the string opened "This site uses". Weblate commit
[130046e0b2](https://github.com/pkp/omp/commit/130046e0b23d11306247aab42e235fdfbf57a79e)
(2022-07-02, "Translated using Weblate (English (United States))") rewrote
both about strings to change `http://pkp.sfu.ca/` to `https://pkp.sfu.ca/`,
and in the site string replaced "This site uses" with the press string's
"This press uses". It reached `main` with the translations merge
[9cf7f6160](https://github.com/pkp/omp/commit/9cf7f6160747dafb9e8d74e9bc6c42d6e33b2c3e)
on 2022-07-12 and was released in 3.4.

Reach:

- OJS's `about.aboutOJSSite` and OPS's `about.aboutOPSSite` open "This site
  uses" (in the code and on screen).
- OMP's other languages: the Canadian French string reads "Ce site utilise"
  (in the code). Fifteen other translations name the press or the publisher
  in the site string (bg, cs, da, de, es, fa, fr, hr, id, it, pt, pt_BR, ro,
  sl, uk; in the code), some of them since following the 2022 English
  text.
- No other template or code reads `about.aboutOMPSite` (a search of OMP and
  its `lib/pkp`).

## Proposed fix

Restore the opening of the English site string with a pkp/omp commit to
`locale/en/locale.po` on `main`, backported to `stable-3_5_0` and
`stable-3_4_0`. Tried on `main`:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-software-page-says-this-press/fix.diff).

```diff
 msgid "about.aboutOMPSite"
 msgstr ""
-"This press uses Open Monograph Press {$ompVersion}, which is open source "
+"This site uses Open Monograph Press {$ompVersion}, which is open source "
```

With the fix in, the walk showed the Expected on OMP. The press's own page
(step 5) kept "This press uses … contact the press" and its Contact link,
with the fix in and out.

A git commit is how English strings reach OMP today. Since 2023 every change
to `locale/en/locale.po` on `main` and the stable branches has been a
developer's commit, the latest
[78ca68e30](https://github.com/pkp/omp/commit/78ca68e30158d6ee92025132bf84bde6bf4feeaa)
(2026-08-14, `pkp/pkp-lib#13059`). Weblate commits straight to `main`,
`stable-3_5_0` and `stable-3_4_0` (the latest 2026-09-15 on 3.5), but only
for the other languages; English was last edited there in the commit that
broke this string. Weblate updates from the repository before it commits,
so a git edit stays unless someone edits the English string on Weblate
again.

**Alternatives**

- Edit the English source string on Weblate: one change, but it reaches each
  branch only through Weblate's components, and the backports are clearer as
  commits.
- One shared site string in pkp-lib with the application's name as a
  parameter: it removes the three copies, but the apps describe their
  software differently and every translation would be redone for a one-word
  fix.

**What goes with it**

- The fifteen translations that name the press: mark their
  `about.aboutOMPSite` `#, fuzzy` in the same commit, as 78ca68e30 did for
  `pkp/pkp-lib#13059`, so their translators see them in Weblate. A fuzzy
  entry is still shown (the gettext loader drops only empty and disabled
  ones), so the pages do not change until a translator does.
- Backport: the same `msgid` is at line 1039 on 3.5 and line 1090 on 3.4,
  and the diff applies to both as it stands.
- Guard: an end-to-end check that the site-level page of a two-press site
  opens "This site uses".

Small: one line in one English locale file, and the fuzzy flags.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-software-page-says-this-press/walk.js).
  It takes the Steps on OJS, OMP and OPS, the second context created
  through Administration's screens, on an install freshly loaded from the
  default dataset (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL). From a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-site-software-page-says-this-press/walk.js`;
  the argument `neighbour` reads only the press's own page (step 5). No request
  failed and no page script failed, with the fix in or out.
- Tips: `main` OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7;
  `stable-3_5_0` OJS c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3;
  `stable-3_4_0` OMP 0aec65441f; `stable-3_3_0` OMP 8e72fc8836.
- 3.5 walked: the same Steps and the same paragraph, with version 3.5.0.5.
- Code reads: `templates/frontend/pages/aboutThisPublishingSystem.tpl` and
  `locale/en/locale.po` on `main`, 3.5 and 3.4 (the template the same, the
  string "This press uses"); 3.3 `locale/en_US/locale.po` line 1079 ("This
  site uses") and the same template. `git log -S` on the string: present
  since the initial revision (16111b123, 2008) until 130046e0b2, which
  `stable-3_4_0` contains and `stable-3_3_0` does not.
  `PKPHandler::getTargetContext()` sends the site's address to the only
  enabled press. `git log` of `locale/en/locale.po` and of `locale/` on
  `main`, `stable-3_5_0` and `stable-3_4_0` for how English and the
  translations arrive.
- Upstream searched in pkp/pkp-lib, pkp/omp and pkp/ui-library for "This
  press uses", "This site uses", `aboutOMPSite`,
  `aboutThisPublishingSystem` and "about this publishing system":
  `pkp/pkp-lib#5984` (the page's wording about contacting the journal) and
  `pkp/pkp-lib#7349` (OMP not showing its version) are other faults.
- Seen on the way, a separate fault (in the code, not walked): the Russian
  site string reads `{$ompVersion, которая` with no closing brace, so the
  placeholder is not filled.
