# Changelog

## 1.0.7

Compatibility and small fixes after the security patch (#319).

- **dev:** The storefront no longer serves unreviewed `dev/` theme files without a signed preview token. On that 403, `crafter dev` no longer crashes and prints a clear message: live preview is temporarily unavailable after a security update, your files are still being synced, and a CLI update will bring preview back. If the theme is published, the published preview link is shown. File watching, sync and upload keep working. A preview server error no longer stops the process.
- **Manifest:** `init`, `dev` and `publish` no longer overwrite the local `crafter-manifest.json` with the server manifest (this used to drop `themeVersion` and turn v2 themes into v1). The server manifest is only used to fill in missing fields, and the file is only written after you confirm. `init` also no longer copies the starter template's own manifest.
- **pull:** The server has no endpoint to download theme file contents, so `pull` now fails with a clear message instead of reporting "0 files downloaded". Local files are not changed.
- **Hidden files and ignore rules:** Dotfiles and dot folders such as `.env` are no longer sent in the zip or by the watcher. `dev`, `push`, `pack` and the watcher share one ignore list. File types the server does not accept and files over 10 MB are skipped locally with a warning instead of getting a 400/413 from the server.
- **Config permissions:** `~/.crafter/config.json`, which holds tokens, is now written with mode 0600 (its folder with 0700).
- **Token refresh:** The refreshed access and refresh tokens are saved to the config file. Concurrent requests share a single refresh call.
- **Development:** Added a vitest test setup (`npm test`).
