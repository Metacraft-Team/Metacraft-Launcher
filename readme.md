![64x64](https://user-images.githubusercontent.com/5381613/184220932-4ee68828-87f5-4cb5-8a8a-dcfb54353a7c.png)

## Metacraft Launcher (Minecraft Old)
[![Website](https://img.shields.io/website?down_message=offline&style=for-the-badge&up_color=blue&up_message=online&url=https%3A%2F%2Fmetacraft.cc)](https://metacraft.cc)
[![license](https://img.shields.io/github/license/Metacraft-Team/Metacraft-Launcher.svg?style=for-the-badge)](https://github.com/Metacraft-Team/Metacraft-Launcher/blob/master/LICENSE)
[![Discord](https://img.shields.io/discord/881890111644631122?label=Discord&style=for-the-badge)](http://discord.gg/yEv3qKhVBH)
[![Twitter Follow](https://img.shields.io/twitter/follow/MetacraftCC?color=green&logoColor=green&style=for-the-badge&label=Twitter)](https://twitter.com/MetacraftCC)
[![YouTube Channel Views](https://img.shields.io/youtube/channel/views/UC-fAgQr5lxNVZU4_LVXmKOg?style=for-the-badge&label=Youtube%20Views)](https://www.youtube.com/channel/UC-fAgQr5lxNVZU4_LVXmKOg)

Electron launcher to start metacraft game, forked from GDLauncher and based on Electron.

![image](https://user-images.githubusercontent.com/5381613/186475638-1b9770d8-d6e8-42f7-b52b-ea6104413a6d.png)

![image](https://user-images.githubusercontent.com/5381613/186475797-36ca7234-0521-4823-94cf-c525fdd36793.png)


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
