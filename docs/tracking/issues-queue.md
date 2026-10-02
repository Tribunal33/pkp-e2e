# Issues queue

The specs the issues session works next (MAINTENANCE "The issues
session"), top first. The order puts the likely-severe first: the count
of 🐞 entries with a crash word, then those marked user-visible, then all
🐞 entries, as the registers stood when the queue was made. A spec leaves
the queue when every 🐞 entry has an outcome; a spec left mid-way names
its open entries in the Note. A spec gains a row again when a new 🐞
entry lands in it (MAINTENANCE "The issues session").

A session takes a row by marking its Note "**Taken: issues session,
<VM or workstation> s<n>, <date>**" and pushing before any other work
(MAINTENANCE issues session step 4); a row so marked is not free. The
VM marks also count the VM's issues sessions: at most two run at once,
and the hourly routine starts one only when none is running
(MAINTENANCE "The issues session").

| Spec | 🐞 | crash | user-visible | Note |
|---|---|---|---|---|
| [U37](../specs/U37-tasks-and-discussions.md) | 21 | 2 | 5 | A1: open report docs/reports/2026-09-04-omp-ops-discussion-save-missing-notification-class.md (the rest of U37 written up by the issues session, VM s1, 2026-10-02) |
| [U36](../specs/U36-submission-files.md) | 17 | 2 | 2 | A23, A24: open report docs/reports/2026-09-27-pkp-lib-13288.md (the rest of U36 written up by the issues session, workstation s0, 2026-10-02) |
| [U17](../specs/U17-sections.md) | 16 | 2 | 2 | OMP9, OPS6: open reports docs/reports/2026-09-25-omp-series-page-blank.md and docs/reports/2026-09-25-ops-oai-empty-abstract.md (the rest of U17 written up by the issues session, workstation s0, 2026-10-02) |
| [U18](../specs/U18-web-feeds.md) | 6 | 2 | 2 | A1, A7, OPS1: open reports docs/reports/2026-09-26-webfeed-rss2-empty-feed-fails.md, docs/reports/2026-09-26-webfeed-terms-read-array.md and docs/reports/2026-09-26-webfeed-ops-publisher-array.md (the rest of U18 written up by the issues session, workstation s0, 2026-10-02) |
| [U16](../specs/U16-categories.md) | 22 | 1 | 4 | OMP5: open report docs/reports/2026-09-30-php-gh20469-segfaults.md (the rest of U16 written up by the issues session, VM s0, 2026-10-02) |
| [U64](../specs/U64-usage-statistics.md) | 13 | 1 | 4 | **Taken: issues session, workstation s0, 2026-10-02**; OMP3 done with U69 A9 (pkp-e2e#282); A1, A4, A5, A7, A8, A10, A11, OJS4 done; open: A3, A6, OJS5, OJS6 |
| [U46](../specs/U46-galleys.md) | 9 | 1 | 4 | **Taken: issues session, VM s2, 2026-10-02**; OPS2 done (pkp-e2e#613), OPS3 done (pkp-e2e#614); A7 done (pkp-e2e#617, with U73 A14); A4 and OJS1 done (pkp-e2e#618); A5 done (pkp-e2e#619, with U42 A19 and U43 A5's arrows); A1 done (docs/issues/U46-A1-galley-edit-window-upload-heading.md), A3 done (docs/issues/U46-A3-remote-galley-asked-for-file.md) |
| [U08](../specs/U08-navigation-menus-and-site-chrome.md) | 21 | 1 | 3 | OPS2 done with U51 OPS1 (pkp-e2e#380) |
| [U65](../specs/U65-editorial-statistics.md) | 18 | 1 | 3 | A5 done with U64 A7 (pkp-e2e#616) |
| [U20](../specs/U20-search-engine-metadata-and-analytics.md) | 14 | 1 | 2 | OPS1 done with U13 OPS2, OPS3 (docs/issues/U13-OPS2-OPS3-ops-number-address-url-path.md); OMP6 done with U69 A9 (pkp-e2e#282) |
| [U75](../specs/U75-preprint-relations.md) | 8 | 1 | 2 |  |
| [U39](../specs/U39-submission-and-publisher-libraries.md) | 8 | 1 | 1 |  |
| [U27](../specs/U27-reviewer-assignment-and-management.md) | 24 | 0 | 6 |  |
| [U74](../specs/U74-onix-metadata-export.md) | 16 | 0 | 6 | A16 done with U63 A12 (pkp-e2e#258) |
| [U15](../specs/U15-search.md) | 13 | 0 | 6 |  |
| [U04](../specs/U04-orcid-integration.md) | 8 | 0 | 6 | OPS2 done with U06 OPS1 (docs/issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md) |
| [U70](../specs/U70-catalog-management.md) | 14 | 0 | 5 |  |
| [U41](../specs/U41-contributors-and-affiliations.md) | 12 | 0 | 5 | A22 joined pkp-e2e#4 by the housekeeping fold (2026-10-01); the report's "Tracked in" line does not list it yet |
| [U12](../specs/U12-announcements.md) | 11 | 0 | 5 | A11 written with U66 A2 ([pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4), the pilot) |
| [U10](../specs/U10-appearance-and-theming.md) | 13 | 0 | 4 | A4 done with U09 A15 ([pkp-e2e#370](https://github.com/jardakotesovec/pkp-e2e/issues/370)) |
| [U03](../specs/U03-user-profile.md) | 12 | 0 | 4 | A19 done with U09 A19 (pkp-e2e#375); OPS2 done with U06 OPS1 (docs/issues/U06-OPS1-preprint-emails-list-misses-sent-emails.md) |
| [U07](../specs/U07-journal-identity-and-about-pages.md) | 9 | 0 | 4 | OPS3 done with U57 A8 (pkp-e2e#360); OPS4 done with U57 A8 (pkp-e2e#360); A11 done with U59 A1 (pkp-e2e#496) |
| [U73](../specs/U73-publication-formats-proof-terms.md) | 18 | 0 | 3 | A14 done with U46 A7 (pkp-e2e#617) |
| [U40](../specs/U40-publication-metadata.md) | 8 | 0 | 3 | A1 done with U21 A20 ([pkp-e2e#323](https://github.com/jardakotesovec/pkp-e2e/issues/323)) |
| [U30](../specs/U30-author-response-to-reviews.md) | 7 | 0 | 3 |  |
| [U58](../specs/U58-submission-intake-configuration.md) | 10 | 0 | 2 | A10 done with U17 A6 (docs/issues/U17-A6-section-or-component-name-of-spaces-raw-code.md); A12 done with U62 A9 (pkp-e2e#511) |
| [U01](../specs/U01-login-and-sessions.md) | 9 | 0 | 2 |  |
| [U02](../specs/U02-registration-and-account-validation.md) | 8 | 0 | 2 |  |
| [U31](../specs/U31-reviewer-suggestions.md) | 8 | 0 | 2 |  |
| [U68](../specs/U68-catalog-browse.md) | 8 | 0 | 2 | A1 done with U16 A19 (pkp-e2e#587); A8 done with U16 A15 (pkp-e2e#291) |
| [U05](../specs/U05-notifications-center-and-email-preferences.md) | 7 | 0 | 2 |  |
| [U72](../specs/U72-chapters-work-type.md) | 7 | 0 | 2 |  |
| [U34](../specs/U34-editorial-decision-recording.md) | 5 | 0 | 2 |  |
| [U26](../specs/U26-review-stage-and-rounds.md) | 4 | 0 | 2 | A1 done (pkp-e2e#520) |
| [U42](../specs/U42-citations-and-references.md) | 16 | 0 | 1 | A19 done with U46 A5 (pkp-e2e#619) |
| [U56](../specs/U56-emails-management.md) | 9 | 0 | 1 | OMP1 done with U53 A14 (pkp-e2e#447) |
| [U60](../specs/U60-site-settings.md) | 9 | 0 | 1 |  |
| [U38](../specs/U38-submission-activity-log-and-notes.md) | 8 | 0 | 1 | A2 done with U36 A10 (pkp-e2e#521) |
| [U11](../specs/U11-highlights.md) | 5 | 0 | 1 | A4 written with U66 A2 ([pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4), the pilot) |
| [U43](../specs/U43-funding.md) | 4 | 0 | 1 | A5: the ordering arrows done with U46 A5 (pkp-e2e#619); its typed-name boxes half (the multilingual name boxes' accessible names) open, a cause of its own |
| [U22](../specs/U22-my-submissions.md) | 2 | 0 | 1 |  |
| [U14](../specs/U14-reader-comments-and-moderation.md) | 5 | 0 | 0 |  |
| [U23](../specs/U23-submissions-dashboard.md) | 5 | 0 | 0 |  |
| [U29](../specs/U29-review-setup-and-review-forms.md) | 5 | 0 | 0 | A11 joined pkp-e2e#4 by the housekeeping fold (2026-10-01); the report's "Tracked in" line does not list it yet |
| [U32](../specs/U32-copyediting-stage.md) | 5 | 0 | 0 | A9 done with U35 A5 (pkp-e2e#343); A6 done with U71 OMP10 (pkp-e2e#560) |
| [U55](../specs/U55-notify-users.md) | 4 | 0 | 0 |  |
| [U33](../specs/U33-production-stage.md) | 3 | 0 | 0 |  |
| [U67](../specs/U67-archiving-preservation.md) | 3 | 0 | 0 |  |
| [U63](../specs/U63-import-export.md) | 2 | 0 | 0 | A23: open report docs/reports/2026-10-01-pkp-lib-13414.md (the rest of U63 written up by the issues session, workstation s0, 2026-10-01); A24 open (new 2026-10-02 by the housekeeping fold: the Native XML export list past one page repeats and skips submissions) |
| [U13](../specs/U13-article-landing-page-and-reading.md) | 1 | 0 | 0 | A13 open (new 2026-10-02 by the housekeeping fold: the PDF reader from a new version's preview says "outdated version published on ."; the OPS1 report docs/issues/U13-OPS1-new-version-preview-called-outdated.md names it and leaves it out of its fix) |
