const path = require('path')
const { URL } = require('url')
const { exec } = require('child_process')
const { promisify } = require('util')
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  screen,
  globalShortcut,
  systemPreferences,
  session
} = require('electron')
const log = require("electron-log")
const { autoUpdater } = require('electron-updater')

let mainWindow
const gotTheLock = app.requestSingleInstanceLock()

// 注册协议
const PROTOCOL = 'metacraft'
app.setAsDefaultProtocolClient(PROTOCOL)

const sendLoginParams = urlStr => {
  log.log('==== chrome login callback ====')
  log.log(urlStr)
  try {
    const urlObj = new URL(urlStr)
    const { searchParams } = urlObj
    const signature = searchParams.get('signature')
    const address = searchParams.get('address')
    const checksumAddress = searchParams.get('checksumAddress')
    const timestamp = searchParams.get('timestamp')
    const name = searchParams.get('name')

    if (mainWindow) {
      if (process.platform === 'win32' && mainWindow.isMinimized()) {
        mainWindow.restore()
      }

      mainWindow.focus()
      mainWindow.show()
      mainWindow.webContents.send('receive-metamask-login-params', {
        name,
        address,
        checksumAddress,
        signature,
        timestamp
      })
    }
  } catch (e) {
    console.error(e)
  }
}

// Prevent multiple instances
if (gotTheLock) {
  // macos
  app.on('open-url', (_, urlStr) => {
    sendLoginParams(urlStr)
  })

  // windows
  app.on('second-instance', (_, commandLine) => {
    if (process.platform === 'win32') {
      sendLoginParams(commandLine[commandLine.length - 1])
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
} else {
  app.quit()
}

app.setPath('userData', path.join(app.getPath('appData'), process.env.APP_DATA_FOLDER))

const get7zPath = async () => {
  let baseDir = path.dirname(app.getPath('exe'))
  if (!app.isPackaged) {
    baseDir = path.resolve(baseDir, '../../')

    if (process.platform === 'win32') {
      baseDir = path.join(baseDir, '7zip-bin/win/x64')
    } else if (process.platform === 'linux') {
      baseDir = path.join(baseDir, '7zip-bin/linux/x64')
    } else if (process.platform === 'darwin') {
      baseDir = path.resolve(baseDir, '../../../', '7zip-bin/mac/x64')
    }
  }

  if (process.platform === 'darwin') {
    return path.resolve(baseDir, !app.isPackaged ? '' : '../', '7za')
  }
  return path.join(baseDir, '7za.exe')
}

async function patchSevenZip () {
  try {
    if (process.platform === 'linux' || process.platform === 'darwin') {
      const sevenZipPath = await get7zPath()
      await promisify(exec)(`chmod +x "${sevenZipPath}"`)
      await promisify(exec)(`chmod 755 "${sevenZipPath}"`)
    }
  } catch (e) {
    console.error(e)
  }
}

patchSevenZip()

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 1200,
    minHeight: 850,
    show: true,
    frame: false,
    backgroundColor: '#1B2533',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  globalShortcut.register('CommandOrControl+Shift+P', () => {
    mainWindow.reload()
  })

  globalShortcut.register('CommandOrControl+Shift+J', () => {
    mainWindow.webContents.openDevTools()
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-minimized')
  })

  // accept all CORS request
  session.defaultSession.webRequest.onHeadersReceived(
    {
      urls: ['http://*/*', 'https://*/*']
    },
    (details, callback) => {
      delete details.responseHeaders['Access-Control-Allow-Origin']
      delete details.responseHeaders['access-control-allow-origin']
      delete details.responseHeaders['Access-Control-Allow-Headers']
      details.responseHeaders['Access-Control-Allow-Origin'] = ['*']
      details.responseHeaders['Access-Control-Allow-Headers'] = ['*']
      callback({ // eslint-disable-line
        cancel: false,
        responseHeaders: details.responseHeaders
      })
    }
  )

  const handleRedirect = (e, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      e.preventDefault()
      shell.openExternal(url)
    }
  }

  mainWindow.webContents.on('will-navigate', handleRedirect)
  mainWindow.webContents.on('new-window', handleRedirect)

  if (process.platform === 'darwin') {
    systemPreferences.askForMediaAccess('microphone')
  }
}

app.on('ready', () => {
  createWindow()

  autoUpdater.on('checking-for-update', e => {
    log.log('===== checking for updates ======')
    log.log(e)
  })

  autoUpdater.on('update-available', e => {
    log.log('===== update-available ======')
    log.log(e)
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      title: 'Install Updates',
      message: 'Updates downloaded, application will be quit for update...'
    }).then(() => {
      setImmediate(() => autoUpdater.quitAndInstall())
    })
  })

  autoUpdater.on('update-not-available', e => {
    log.log('===== update-not-available ======')
    log.log(e)
  })

  autoUpdater.checkForUpdatesAndNotify()
})

app.on('window-all-closed', app.quit)

app.on('activate', () => {
  if (!mainWindow) { createWindow() }
})

app.on('web-contents-created', (e, webContents) => {
  webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
  })
})

app.on('browser-window-blur', function () {
  try {
    globalShortcut.unregister('CommandOrControl+R')
    globalShortcut.unregister('F5')
  } catch (error) {
    log.log(error)
  }
})

ipcMain.handle('loginWithMetamask', (e, address = '') => {
  const url = `${process.env.WEBSITE_URL}/launcher-login?address=${address}&origin=launcher`
  shell.openExternal(url)
})

ipcMain.handle('update-progress-bar', (_, p) => {
  mainWindow.setProgressBar(p / 100)
})

ipcMain.handle('hide-window', () => {
  if (mainWindow) { mainWindow.hide() }
})

ipcMain.handle('min-max-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.handle('minimize-window', () => {
  mainWindow.minimize()
})

ipcMain.handle('show-window', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
})

ipcMain.handle('quit-app', async () => {
  mainWindow.close()
  app.quit()
})

ipcMain.handle('getUserData', () => {
  return app.getPath('userData')
})

ipcMain.handle('getExecutablePath', () => {
  return path.dirname(app.getPath('exe'))
})

ipcMain.handle('getAppVersion', () => {
  return app.getVersion()
})

ipcMain.handle('openFolder', (e, folderPath) => {
  shell.openPath(folderPath)
})

ipcMain.handle('open-devtools', () => {
  mainWindow.webContents.openDevTools()
})

ipcMain.handle('openFolderDialog', (e, defaultPath) => {
  dialog.showOpenDialog({
    properties: ['openDirectory'],
    defaultPath: path.dirname(defaultPath)
  })
})

ipcMain.handle('openFileDialog', (e, filters) => {
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters
  })
})

ipcMain.handle('appRestart', async () => {
  app.relaunch()
  app.quit()
})

ipcMain.handle('getAllDisplaysBounds', () => {
  screen.getAllDisplays().map(v => v.bounds)
})
