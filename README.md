# @crafter-cms/cli

Theme management tool for the Crafter platform (Marketplace).

## Installation

```bash
npm install -g @crafter-cms/cli
```

Or use it directly with `npx`:

```bash
npx @crafter-cms/cli <command>
```

Shortcut command:

```bash
crafter <command>
```

## Commands

### Authentication

- `crafter login`: Log in through the browser.
- `crafter logout`: Log out.
- `crafter whoami`: Show the logged-in user.

### Theme Development

- `crafter init`: Start a new theme project or pick one of your existing themes.
- `crafter dev`: Start the smart sync and development watcher. (1.0.7: live preview is temporarily disabled after a security update; file sync works.)
- `crafter push`: Upload all local files to the cloud (full sync).
- `crafter pull`: Download all files from the cloud into the local folder. (1.0.7: temporarily unavailable because the server has no download endpoint.)
- `crafter pack`: Pack the theme into a .zip for sale or distribution.
- `crafter publish`: Takes the files in your development (dev) environment, packages them as an official release (version) and submits it for review.
