# Changelog

All notable changes to **dsh-overview** are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.1] — 2026-11-19

### Fixed
- **Plugin config card visibility**: `plugins.bundle.config` key corrected from
  `@vlln/dsh-overview` to `dsh-overview` so the per-section switches (To-dos,
  Subagents, Background Tasks, Inputs, Deliverables, Delta indicators) now
  render on the bundle's plugin detail page. The mismatch also blocked the
  cordis-config round-trip (`configForms.set`).
- **Module loader / bundle name alignment**: carried over from 0.1.0 source
  (commit `754108d`) — the npm 0.1.0 tarball still shipped the old
  `@vlln/dsh-overview` loader id, which prevented the client half from
  registering. 0.1.1 is the first npm release with the aligned `dsh-overview`
  id on all layers (package name, `cordis.patch.yml`, client loader id,
  config key).

### Added
- **Plugin icon** (`icon.svg`): a blue-gradient overview-card glyph with a
  title bar and two section rows, exported via `./icon` and included in
  `files`. Follows the DSH artwork rules (36×36, no tile, flat + short
  gradient, no script/style/image/text).

### Changed
- **Trigger button order** raised from `10` to `9999` in
  `conversation.session.header.utilities`, placing the Overview button
  directly beside the host "more actions" control with the highest sort
  priority.
- **Overview title typography**: `.dsh-ov-title` changed from `12px / 500 /
  tertiary` to `13px / 600 / primary` for stronger visual emphasis.

## [0.1.0] — 2026-11-19

Initial release.
