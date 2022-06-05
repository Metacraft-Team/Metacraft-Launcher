## Metacraft Launcher
Electron launcher to start metacraft game, forked from GDLauncher and based on Electron.

### Up and running

```bash
yarn

yarn dev    # start development
yarn build  # build application
```

### Core Concepts

* Build with vite, and remove all webpack/babel stuff from original GDLauncher.
* Currently still many nodejs side code in renderer thread, which need to be move to preload thread to get better security and scalability.

```bash
resources    # build related things
src
  /main      # main electron thread
  /renderer  # UI thread, general react application
```

### Build

* Mac - `yarn build:mac`
* Win - run `yarn build:win`