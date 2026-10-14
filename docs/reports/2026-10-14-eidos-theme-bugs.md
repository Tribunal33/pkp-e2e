# The Eidos theme: bugs

- **Scope** bugs in the Eidos theme with Eidos enabled: things that are
  broken or wrong in what it already does. What Eidos lacks against the
  Default and ORE themes is in the companion report,
  `2026-10-14-eidos-theme-gap-analysis.md`. The first report,
  `2026-10-08-pkp-lib-13260.md`, covered what the same PRs break on
  installs that never switch to Eidos.
- **PRs** `pkp-lib#13260`, `ojs#5784`, `ui-library#972` and `crossref-ojs#107`,
  for `pkp-lib#13242`. Their heads are listed in Evidence and have not
  changed since the first report.
- **Checked** 2026-10-14, OJS only (Eidos is an OJS theme). Eidos was built
  from its own `package.json` and driven live in Chromium at 1280 px and
  390 px, on the Default theme as well for comparison. The code was read
  at the PR heads.
- **Model** claude-opus-5-5

Each item is marked **Driven** (seen on the live install) or **Code**
(read in the code only).

## Summary

Eidos is a complete, polished design for the pages it covers: the home
page blocks, the issue pages, the article page with its tabs, search,
categories, announcements, the About pages, login and registration.

1. **Two script injections.** A search link runs script for whoever opens
   it, and an author's response to reviewers runs script on the public
   article page.
2. **Pages and flows that break.**
   - Images and stylesheets inside HTML galleys answer 404.
   - Registration fails silently when a captcha or the site-wide privacy
     statement is on.
   - The masthead answers 500 when it lists a reviewer with an ORCID iD.
   - The site home page answers 500 on a fresh install, and is empty once
     it renders.
   - A full-issue PDF downloads instead of opening in the viewer.
3. **Wrong information on public pages.**
   - Every masthead person gets a fake, verified ORCID iD.
   - Editorial History has no dates.
   - The "outdated version" notice in the galley viewers is the wrong
     way round.
   - The metrics block shows only when a count is zero.
   - Peer review appears on articles that were never reviewed.
   - Every OJS article's date reads "Posted".

| # | Finding | Severity | Effort | Seen |
|---|---|---|---|---|
| [1](#finding-1) | Search page prints the query as HTML: a link runs script (security) | high | small | Driven |
| [2](#finding-2) | Author's response to reviewers printed as HTML on the public article page (security) | high | small | Driven |
| [3](#finding-3) | HTML galleys lose their images and stylesheets (404) | high | small | Driven |
| [4](#finding-4) | Registration fails silently with a captcha on, or at site level with the site-wide privacy statement on | high | small | Driven |
| [5](#finding-5) | Editorial Masthead answers 500 when it lists a reviewer with an ORCID iD | high | small | Driven |
| [6](#finding-6) | Every masthead and history person shows a fake, verified ORCID iD | high | small | Driven |
| [7](#finding-7) | Site home page: 500 without a site title, empty with one | medium | small | Driven |
| [8](#finding-8) | "Outdated version" notice inverted in the PDF and HTML viewers | medium | small | Driven |
| [9](#finding-9) | Full-issue PDF crashes the viewer template and downloads instead | medium | small | Driven |
| [10](#finding-10) | Peer review shown per journal, not per article; metrics block inverted | medium | small | Driven |
| [11](#finding-11) | Editorial History shows no dates; contact page prints template source | medium | small | Driven |
| [12](#finding-12) | Smaller bugs (dates, labels, raw keys, escaping, accessibility, warnings, build) | low | small | Driven / Code |
| [13](#finding-13) | Side effect on the Default theme: the comments sign-in link lost its anchor | low | small | Driven |
| [14](#finding-14) | A short issue description is faded out almost completely (home page "Current Issue (Summary)" block) | low | small | Driven |

Findings 1 and 2 carry the `security` label. Eidos is unreleased, so per
the security policy they are ordinary findings. Two manager-only
injections are in finding 12.

<a name="finding-1"></a>
## Finding 1: the search page prints the query as HTML

- **Severity** high · **Effort** small · **Security** unreleased · Driven

**What happens.** A search address carrying markup in `query` puts that
markup into the results line, and a script in it runs. Anyone can
receive such a link, an editor or a manager included.

**Steps.** Open
`/index.php/<journal>/search/search?query=<img src=x onerror="window.__q=1">zz`.
`window.__q` is `1`, and an injected `<img>` sits in "Showing 1-1 articles
matching the phrase …". The Default theme prints the query as text.

![The injected image in the results line](img/2026-10-14-eidos-theme/01-search.png)

**Cause.** `plugins/themes/eidos/templates/frontend/pages/search.blade:61`
and `:76` print `__('plugins.themes.eidos.search.noMatches' | …showing…,
['phrase' => $query])` with `{!! !!}`. `$query` is the raw request value.
`:23` also builds `$urlPattern` from raw `$_SERVER['REQUEST_URI']`, and
`components/pagination-custom.blade:75` prints it unescaped in an `href`.

**Fix.** Escape the phrase before it goes into the translation, as in
`['phrase' => e($query)]`, and keep `{!! !!}` only for the markup the locale
adds. Print `$urlPattern` with `{{ }}`, and build it from the route rather
than `REQUEST_URI`.

<a name="finding-2"></a>
## Finding 2: an author's response to reviewers runs on the public article page

- **Severity** high · **Effort** small · **Security** unreleased · Driven

**What happens.** With open review, the Peer Review tab shows the
author's response under each round. The response is printed as HTML
without cleaning, so markup the author typed runs for every reader.

**Steps.** On a published article with public, confirmed reviews, store
an author response holding `<img src=x onerror="window.__authorXss=1">`.
Open the article's Peer Review tab and press "Author Response".
`window.__authorXss` is `1`.

**Cause.** `components/article/tab-peer-review.blade:154` prints
`{!! $round['authorResponse']['response'] !!}`. Every other review field
in Eidos goes through `ViewHelper::sanitizeHtml()`, and ORE's Vue
component cleans the response too (`v-strip-unsafe-html`).

**Also wrong here.** The response's header gives the date of the round's
last review, not of the response (`:110` uses the leftover
`$review['dateCompleted']`). In the screenshot it reads "June 1, 2025"
above a response dated October 14, 2026.

![Author response header with the review's date](img/2026-10-14-eidos-theme/02-author-response.png)

**Fix.** Use `{!! ViewHelper::sanitizeHtml(...) !!}`, and take the date from
`$round['authorResponse']['createdAt']`.

**Note on the first report.** Finding 7 there proposes that
`ReviewRoundAuthorResponseResource` return the response as a locale map,
which the editor's window needs. With that fix in place this template
prints "Array". So the Eidos fix must pick the localized value as well
as sanitize it.

<a name="finding-3"></a>
## Finding 3: HTML galleys lose their images and stylesheets

- **Severity** high · **Effort** small · Driven

**What happens.** An HTML galley opens in Eidos's viewer, but every file
the HTML refers to (stylesheet, figures) answers 404. Readers see broken
images and unstyled text. On the Default theme the same galley loads
them.

**Steps.** Publish an HTML galley with a dependent image and stylesheet,
then open it from the article page.
- Eidos requests `…/article/download/21/figure.png` and gets 404.
- Default requests `…/article/download/21/11/figure.png` and gets 200.

![Eidos: broken figure](img/2026-10-14-eidos-theme/03-html-galley-eidos.png)
![Default: the same galley](img/2026-10-14-eidos-theme/03-html-galley-default.png)

**Cause.**
`plugins/themes/eidos/templates/plugins/generic/htmlArticleGalley/templates/display.blade:5-16`
builds the iframe address as `article/download/<id>/<galleyId>?inline=1`,
without the file id. The plugin's own `display.tpl:41,45` passes
`<galleyId>/<fileId>`. Relative links inside the HTML therefore resolve
one level too high, where nothing serves them.

**Fix.** Append `$submissionFile->getId()` to the path, as the plugin's
template does.

<a name="finding-4"></a>
## Finding 4: registration fails silently under two common settings

- **Severity** high · **Effort** small · Driven

**What happens.**
- **With a captcha on registration** (`[captcha] altcha = On` with the
  default `altcha_on_register = on`, or reCAPTCHA with
  `captcha_on_register`): Eidos's registration form shows no captcha
  widget. The server refuses the form every time, and the page comes
  back with the passwords cleared and no message, so nobody can register
  and nobody is told why. With ALTCHA off the same form registers. On
  the Default theme, with ALTCHA on, the widget shows and registration
  succeeds.
- **At site level with `sitewide_privacy_statement = On`** and a site
  privacy statement: the form has no site consent box. It is refused the
  same silent way. On the Default theme the box `privacyConsent[0]` shows
  and registration succeeds.

![Register page returned with no message](img/2026-10-14-eidos-theme/04-register-altcha.png)

Field errors do show ("The selected username is already in use…"). What
is missing is the form-level error, so these two refusals are invisible.

**Cause.** `frontend/pages/userRegister.blade` has no reCAPTCHA or ALTCHA
block; `userLogin.blade:75-81` has both. The consent boxes sit under
`@if ($currentContext)` (`:277`), and nothing prints the form's general
errors.

**Fix.**
- Add the captcha blocks from `userLogin.blade`.
- Add the site consent box when `$enableSiteWidePrivacyStatement` is set,
  as core `userRegister.tpl:136-148` does.
- Print the form's error list at the top.

<a name="finding-5"></a>
## Finding 5: the Editorial Masthead answers 500 when it lists a reviewer with an ORCID iD

- **Severity** high · **Effort** small · **Crash** server · Driven

**What happens.** With the masthead's reviewer list on
("enableEnrollmentMastheadReviewers") and one of last year's reviewers
holding an ORCID iD, the whole page answers 500.

**Server log.**

```
Call to a member function getData() on string (View: …/editorialMasthead.blade)
```

**Cause.** `frontend/pages/editorialMasthead.blade:52` calls
`$reviewer->getData('orcid')->getData('orcid')`, but `getData('orcid')`
is a string.

**Fix.** Use `$reviewer->getData('orcid')` directly, and
`$reviewer->hasVerifiedOrcid()` for the badge.

<a name="finding-6"></a>
## Finding 6: every masthead and history person shows a fake, verified ORCID iD

- **Severity** high · **Effort** small · Driven

**What happens.** On Editorial Masthead and Editorial History every
person has a green ORCID iD icon linking to `https://orcid.org/123454646`,
whether or not they have an ORCID. The Default theme shows an iD only
for verified ones.

![History with the fake iD and no dates](img/2026-10-14-eidos-theme/07-history-eidos.png)

**Cause.**
- `components/masthead-user.blade:10` hard-codes
  `$orcid = 'https://orcid.org/123454646'`.
- `editorialMasthead.blade:18` and `editorialHistory.blade:22` pass
  `hasVerifiedOrcid="$mastheadUser[…]->hasVerifiedOrcid()"` without the
  `:` binding, so the attribute is a non-empty string and always true.

**Fix.** Pass the user's iD (`:orcid="$user->getData('orcid')"`), bind
`:hasVerifiedOrcid`, and show the icon only when both are set.

<a name="finding-7"></a>
## Finding 7: the site home page answers 500 without a site title, and is empty with one

- **Severity** medium · **Effort** small · **Crash** server · Driven

**What happens.**
- With Eidos as the site's theme, the site home page answers 500 while
  the site has no title. That is the state a fresh install is in: neither
  PKP's test dataset nor the campaign's own install stores a site title.
  The admin can fix it by saving a Site Name.
- Once a title exists, the page renders a header, an empty body and the
  footer, with no list of journals, although two journals are enabled.

![Site home page with Eidos](img/2026-10-14-eidos-theme/05-site-home.png)

**Cause.**
- `EidosTheme.php:218-224` `contextName(): string` returns
  `getSite()->getLocalizedTitle()`, which is null. The resulting
  TypeError aborts `addTemplateData`, so `$getBlocks` is never shared and
  `homepage-blocks/index.blade` fails.
- The site uses `Options::HOMEPAGE_BLOCKS_DEFAULT` (announcement, about,
  how-to-submit, issue-toc), which holds nothing a site can show. The
  journals block `homepage-blocks.contexts` is never on by default.

**Fix.** Return `?? ''` in `contextName()`, and give the site its own
default block list starting with `homepage-blocks.contexts`.

<a name="finding-8"></a>
## Finding 8: the "outdated version" notice is the wrong way round in the galley viewers

- **Severity** medium · **Effort** small · Driven

**What happens.** With two published versions:
- The **latest** version's PDF and HTML galleys say "This is an outdated
  version published on October 14, 2026. Read the most recent version."
- The **old** version's galleys say nothing.

The article pages themselves are right, and so is the Default theme in
both places.

![Latest version's PDF called outdated](img/2026-10-14-eidos-theme/08-pdf-latest-eidos.png)
![Old version's PDF, no notice](img/2026-10-14-eidos-theme/08-pdf-old-eidos.png)
![Default: old version's PDF with the notice](img/2026-10-14-eidos-theme/08-pdf-old-default.png)

**Cause.** `!$isLatestPublication ? '' : notice` in
`templates/plugins/generic/pdfJsViewer/templates/display.blade:7-14` and
`htmlArticleGalley/templates/display.blade:24-31`.

**Fix.** Swap the two branches.

<a name="finding-9"></a>
## Finding 9: a full-issue PDF crashes the viewer template

- **Severity** medium · **Effort** small · Driven

**What happens.** On an issue with a full-issue PDF galley, the galley
link downloads the file instead of opening the PDF viewer, as it does on
the Default theme.

**Server log.**

```
Call to a member function getLocalizedFullTitle() on null
  (View: …/eidos/templates/plugins/generic/pdfJsViewer/templates/display.blade)
Plugin APP\plugins\generic\pdfJsViewer\PdfJsViewerPlugin failed to handle the hook IssueHandler::view::galley
```

**Cause.** The template reads `$publication` and `$galleyPublication`,
which the plugin's issue callback does not assign.

**Fix.** Branch on `$issue` in the template, or add an issue variant of
the template.

<a name="finding-10"></a>
## Finding 10: peer review shown per journal, not per article; metrics block inverted

- **Severity** medium · **Effort** small · Driven

**Peer review on every article.**
- **What happens.** The Peer Review tab and the sidebar's "Reviewer
  Recommendations" show whenever the journal's default review visibility
  is on, even for an article that was never reviewed. That article
  reads "Peer review has not been completed yet" and offers a "full peer
  review record" that says "Peer review data is not yet available". ORE
  hides all of it for an item with no public review activity.
- **Cause.** `components/article/tabs.blade:12` and core
  `metadata-blocks/peer-review.blade:1` test
  `$currentContext->getData('defaultReviewPublicVisibility')`.

**Metrics block inverted.**
- **What happens.** With "Metrics" in the sidebar, an article with 103
  views and 54 downloads shows no metrics block, while articles with no
  usage show "0 views and 0 downloads".
- **Cause.** `components/metadata-blocks/metrics.blade:1` reads
  `@if (!$metricsViews || !$metricsDownloads)`.

![Reviewed article: no metrics block](img/2026-10-14-eidos-theme/09-sidebar-reviewed.png)
![Never-reviewed article: review block, and metrics at 0](img/2026-10-14-eidos-theme/09-sidebar-unreviewed.png)

**Fix.** Gate the peer-review UI on the article's public review rounds.
Invert the metrics condition to `@if ($metricsViews || $metricsDownloads)`,
and default both variables to 0 in `classes/MetadataBlocks.php:38-41`.

<a name="finding-11"></a>
## Finding 11: Editorial History shows no dates; the contact page prints template source

- **Severity** medium · **Effort** small · Driven

**Editorial History has no dates.**
- **What happens.** A board member who served 2023–2025 is listed with no
  years. The Default theme shows "2023 – 2025" (screenshots under finding
  6 and below).
- **Cause.** `editorialHistory.blade:24-25` reads
  `$mastheadUser['dateStart' | 'dateEnd']`, but the handler supplies
  `services => [[dateStart, dateEnd], …]`
  (`lib/pkp/pages/about/AboutContextHandler.php:180-193`). Each person
  also logs two "Undefined array key" warnings.

**The contact page prints template source.**
- **What happens.** With a principal contact affiliation set, the page
  prints the literal text `{!! ViewHelper::sanitizeHtml($contactAffiliation) }}`
  instead of the affiliation.
- **Cause.** `frontend/pages/contact.blade:25` opens with `{!!` and closes
  with `}}`.

![Default: History with dates](img/2026-10-14-eidos-theme/07-history-default.png)
![Contact page](img/2026-10-14-eidos-theme/10-contact.png)

<a name="finding-12"></a>
## Finding 12: smaller bugs

All low, small effort.

| What | Where | Seen |
|---|---|---|
| Every OJS article's date is labelled "Posted" (OPS wording) instead of "Published". `getData('versionStage')` is the string `'VoR'`, compared with the enum, so the comparison is never true | `lib/pkp/templates/components/metadata-blocks/date-published.blade:5` | Driven |
| "Version history" dropdown on articles with one version | `lib/pkp/templates/components/metadata-blocks/version.blade:10` (`count(...)`, should be `> 1`) | Driven |
| Page titles double-escaped: "Neural networks &amp;amp; species…" in the browser tab | `components/layout/index.blade:40`, `galley.blade:16`, `system/layout.blade:16` | Driven |
| Raw translation keys: `##plugins.themes.eidos.menu##` (the mobile menu button's screen-reader text, every page), `##plugins.themes.individualizeTheme.backToTitle##` (subcategory page), `plugins.themes.individualizeTheme.announcements.none` (copied from another theme) | `header/mobile.blade:32`, `catalogCategory.blade:40`, `announcements.blade:9` | Driven (first two) |
| No `<main>` landmark on the home, article, login, register and lost-password pages (axe `landmark-one-main`; the Default theme passes) | layouts | Driven |
| Two `<h1>` on every page when a logo is set (a hidden site name plus the page's) | `header/mobile.blade:11` | Driven |
| Logo without alt text: the desktop `<img>` has none, and the mobile one reads `['alt']` where the key is `altText` | `header/desktop.blade:50-51`, `mobile.blade:15` | Driven |
| Login password field `autocomplete="password"` (invalid; axe) | `userLogin.blade:56` | Driven |
| Search field's label is the Smarty leftover `{$label}` | `components/search-form.blade:12` | Code |
| Search form loops `$formUrlParameters`, which nothing assigns (warning on every search) | `components/search-form.blade:6` | Driven |
| Date pickers on Search show English month names in every language (`date('M')`) | `lib/pkp/templates/components/date-select.blade:22` | Code |
| Supplementary galleys never found in listings (galley id compared with genre ids) | `components/article-summary.blade:77` | Code |
| Article galleys show the issue fee (`purchaseIssueFee`) as their price | `components/galley-link.blade:49-53` | Code |
| Share links put the page address in query strings without URL-encoding | `components/share-links.blade:22-50` | Code |
| Account menu `aria-label={{ … }}` unquoted (breaks on multi-word translations) | `header/utility-menu.blade:15` | Code |
| Comments and Metrics tabs put `json_encode` output in single-quoted `v-bind='…'` (a `'` in a translation breaks them; use `@json`) | `tab-comments.blade:7`, `tab-metrics.blade:7` | Code |
| Comment dates: `new Date().getTime() - dateTime.toTimeString()` is NaN, so comments always show a relative date; `msWeek = 605800000` | ui-library `src/frontend/components/PkpComments/usePkpCommentsStore.js:131-133` | Code |
| "Latest Announcement" block, on by default, stays empty until "Display on homepage" has a number (silent) | `homepage-blocks/announcement.blade` | Driven |
| PHP warnings from undefined Blade props on nearly every page (`$class`, `$labelledBy`, `$description`, `$head`, `$pubIdPlugins`, `$error`, `$altchaEnabled`, `privacyConsent`, `$primaryFileGenreIds`, …): logs fill on production | many components | Driven |
| **Manager-entered (low by rule):** colour options go raw into an inline `<style>`. A stored `…</style><script>` runs (the Default theme validates, pkp-lib#11974) | `classes/Options.php:170-273` → `EidosTheme.php:45` | Driven |
| **Manager-entered:** the issue summary's `html2text` decodes entities, so an issue description containing `&lt;img onerror…&gt;` runs on the home page | `templates/components/issue-summary.blade:36` (OJS) | Driven |
| `npm ci` fails: `package-lock.json` is out of step with `package.json` (`@emnapi/*`). `npm install` works | `plugins/themes/eidos/package-lock.json` | Driven |

<a name="finding-13"></a>
## Finding 13: side effect on the Default theme, the comments sign-in link

- **Severity** low · **Effort** small · Driven

On the Default theme, "Sign in to leave a comment" now returns the
reader to `…/article/view/21?section=comments`, where it used to return
to `…#public-comments`. The Default theme has no `section` tab, so after
signing in the reader lands at the top of the article instead of at the
comments.

**Cause.** `lib/pkp/classes/components/UserCommentComponent.php:153` in
the PR (was `:141`, `'#public-comments'`).

**Fix.** Let the theme supply the return anchor, or keep both, as in
`?section=comments#public-comments`.

<a name="finding-14"></a>
## Finding 14: a short issue description is faded out almost completely

- **Severity** low · **Effort** small · Driven (screenshot from the maintainer)

**What happens.** On the home page's "Current Issue (Summary)" block,
the issue description fades into the background at its bottom edge, to
hint that longer text is cut off. The fade is always drawn, so a
one-line description ("The current issue of the Journal of Public
Knowledge.") sits entirely inside it and is barely readable.

![A one-line issue description almost invisible](img/2026-10-14-eidos-theme/14-issue-summary-fade.png)

**Cause.** `plugins/themes/eidos/src/css/components/issue-summary.css:44-59`.
`.issue-summary-description:after` is placed at `top: 100%`, right
under the text, with `box-shadow: 0 -2rem 2rem var(--color-page-background)`.
The shadow covers the bottom 3 to 4 rem of the description whatever its
length. The fade only belongs when the text reaches `max-height`
(16 rem, or 9.5 rem from 1024 px).

**Fix.** Draw the fade only when the text overflows. For example, add a
class from JavaScript when `scrollHeight > clientHeight`, or replace the
fade with `line-clamp`, which cuts and adds an ellipsis only when needed.

## Evidence

- **Heads.**
  - pkp-lib#13260 `571ea1fcac` (base `151e6e9d69`)
  - ojs#5784 `b8904676e1` (base `49515c6e3e`, with the pointer bumps)
  - ui-library#972 `96764aa950`
  - crossref-ojs#107 `9e869168b9`
  - The plugin submodules are at the PR's pointers.
  - ORE theme: `16b821e` (`ore/ore` `d7cf416029`).
- **Install.**
  - OJS was checked out at ojs#5784 with its submodules and built.
  - Eidos was built in `plugins/themes/eidos` with `npm install && npm run
    build`; `npm ci` fails (finding 12).
  - The first report's fix diffs for the shared code were applied, so its
    findings would not get in the way. One exception: for finding 2,
    `ReviewRoundAuthorResponseResource.php` was put back to the PR head.
  - PKP's default dataset for `main` (pkp/datasets `1a5552c`), PostgreSQL,
    PHP's built-in server.
- **Content.** A second journal, "Eidos Demo Journal", was seeded through
  the harness's scenario API with Eidos as its theme:
  - three published issues and one future issue, with covers and a
    full-issue PDF
  - three categories, one with a subcategory
  - three announcements, one homepage highlight, a static page, a logo
    and a principal contact affiliation
  - open review with public visibility, public comments on
  - an article with:
    - three co-authors, keywords, subjects, a plain language summary,
      references and a data citation
    - PDF, HTML and remote galleys
    - three review rounds, completed reviews confirmed by the editor, an
      author response
    - approved, pending and reported comments, and usage figures
    - a second published version made through the publications API
  - an article with eight authors and no galley, a review article, an
    article with no review, and one still in review
  - a masthead editor, a section editor, a board member whose role ended
    in 2025, and a reviewer with an ORCID iD whose review is dated last
    year
- **Settings flipped for single findings and put back afterwards:**
  - `[captcha] altcha` (finding 4)
  - `sitewide_privacy_statement` and the site privacy statement (finding 4)
  - the site's theme and title (finding 7)
  - `primaryColor` and the issue description (finding 12)
- **Each page on both themes.** About 40 reader pages were opened at
  1280 px and 390 px on Eidos, and at 1280 px on the Default theme, with
  axe-core 4.10.2 (WCAG 2.1 A/AA plus best practice). The console, failed
  requests and the server log were captured for each.
- **Not kept.** The walk scripts were throwaway, and no checks were added
  to the suite.
