import axios from 'axios'
import path from 'path'
import { ipcRenderer } from 'electron'
import fse from 'fs-extra'
import coerce from 'semver/functions/coerce'
import gte from 'semver/functions/gte'
import gt from 'semver/functions/gt'
import log from 'electron-log'
import lockfile from 'lockfile'
import omit from 'lodash/omit'
import { push } from 'connected-react-router'
import { spawn } from 'child_process'
import symlink from 'symlink-dir'
import fss, { promises as fs } from 'fs'
import pMap from 'p-map'
import makeDir from 'make-dir'
import { message } from 'antd'
import * as ActionTypes from './actionTypes'
import {
  MC_RESOURCES_URL,
  GDL_LEGACYJAVAFIXER_MOD_URL,
  FABRIC,
  FORGE,
  ACCOUNT_MOJANG,
  CURSEFORGE,
  FTB,
  MC_STARTUP_METHODS,
  METACRAFT_SERVICES_URL
} from '../utils/constants'
import {
  getAddon,
  getAddonFile,
  getAddonFiles,
  getFabricJson,
  getFTBModpackVersionData,
  getJava17Manifest,
  getMcExtraDependency,
  getMcManifest,
  // mcAuthenticate,
  mcInvalidate,
  metaCraftAuthenticateRequest,
  metaCraftLogout,
  metaCraftValidateRequest,
  metaCraftGetUserData
} from '../api'
import {
  _getAccounts,
  _getAssetsPath,
  _getCurrentAccount,
  _getCurrentDownloadItem,
  _getDataStorePath,
  _getInstance,
  _getInstancesPath,
  _getJavaPath,
  _getLibrariesPath,
  _getMinecraftVersionsPath,
  _getTempPath
} from '../utils/selectors'
import {
  convertCompletePathToInstance,
  convertcurseForgeToCanonical,
  copyAssetsToLegacy,
  copyAssetsToResources,
  downloadAddonZip,
  extractFabricVersionFromManifest,
  extractNatives,
  filterFabricFilesByVersion,
  filterForgeFilesByVersion,
  getJVMArguments112,
  getJVMArguments113,
  getPatchedInstanceType,
  // getPlayerSkin,
  isInstanceFolderPath,
  isMod,
  librariesMapper,
  normalizeModData,
  reflect
} from '../../app/utils'
import {
  downloadFile,
  downloadInstanceFiles
} from '../../app/utils/downloader'
import {
  removeDuplicates,
  lt
} from '../utils'
import { UPDATE_CONCURRENT_DOWNLOADS } from './settings/actionTypes'
import { UPDATE_MODAL } from './modals/actionTypes'
import PromiseQueue from '../../app/utils/PromiseQueue'
import { openModal } from './modals/actions'

const messageAntd = message

export function initManifests () {
  return async (dispatch, getState) => {
    const { app } = getState()
    let mc = null
    try {
      mc = (await getMcManifest()).data
      dispatch({
        type: ActionTypes.UPDATE_VANILLA_MANIFEST,
        data: mc
      })
    } catch (err) {
      console.error(err)
    }

    // const getFabricVersions = async () => {
    //   const fabric = (await getFabricManifest()).data;
    //   dispatch({
    //     type: ActionTypes.UPDATE_FABRIC_MANIFEST,
    //     data: fabric
    //   });
    //   return fabric;
    // };

    const getJava17ManifestVersions = async () => {
      const java = (await getJava17Manifest()).data
      dispatch({
        type: ActionTypes.UPDATE_JAVA17_MANIFEST,
        data: java
      })
      return java
    }
    // Using reflect to avoid rejection
    // const [fabric, java17] = await Promise.all([
    // reflect(getFabricVersions()),
    // reflect(getJava17ManifestVersions())
    // ]);
    const java17 = await reflect(getJava17ManifestVersions())

    // if (fabric.e) {
    //   console.error(fabric);
    // }

    return {
      mc: mc || app.vanillaManifest,
      // fabric: fabric.status ? fabric.v : app.fabricManifest,
      java17: java17.status ? java17.v : app.java17Manifest
    }
  }
}

export function updateAccount (uuidVal, account) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_ACCOUNT,
      id: uuidVal,
      account
    })
  }
}

export function switchToFirstValidAccount (id) {
  return async (dispatch, getState) => {
    const state = getState()
    const accounts = _getAccounts(state)
    const currentAccountId = id || state.app.currentAccountId
    let found = null
    for (let i = 0; i < accounts.length; i += 1) {
      if (found) {
        continue
      }
      if (accounts[i].selectedProfile.id === currentAccountId) {
        found = currentAccountId
        continue
      }
      try {
        dispatch(updateCurrentAccountId(accounts[i].selectedProfile.id))
        found = accounts[i].selectedProfile.id
      } catch {
        dispatch(
          updateAccount(accounts[i].selectedProfile.id, {
            ...accounts[i],
            accessToken: accounts[i].accessToken
          })
        )
        console.error(`Failed to validate ${accounts[i].selectedProfile.id}`)
      }
    }
    if (!found) {
      dispatch(updateCurrentAccountId(null))
    }
    return found
  }
}

export function removeAccount (id) {
  return async (dispatch, getState) => {
    await dispatch({
      type: ActionTypes.REMOVE_ACCOUNT,
      id
    })

    const state = getState()
    const { currentAccountId } = state.app
    let newId = id
    if (currentAccountId === id) {
      newId = await dispatch(switchToFirstValidAccount(id))
    }
    return newId
  }
}

export function updateCurrentAccountId (id) {
  return async dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_CURRENT_ACCOUNT_ID,
      id
    })
  }
}

export function updateConcurrentDownloads (concurrentDownloads) {
  return async dispatch => {
    dispatch({
      type: UPDATE_CONCURRENT_DOWNLOADS,
      concurrentDownloads
    })
  }
}

export function updateUpdateAvailable (updateAvailable) {
  return async dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_UPDATE_AVAILABLE,
      updateAvailable
    })
  }
}

export function updateDownloadProgress (percentage) {
  return (dispatch, getState) => {
    const { currentDownload } = getState()
    dispatch({
      type: ActionTypes.UPDATE_DOWNLOAD_PROGRESS,
      instanceName: currentDownload,
      percentage: Number(percentage).toFixed(0)
    })
    ipcRenderer.invoke('update-progress-bar', percentage)
  }
}

export function updateServerMetaData (metaData) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_SERVER_META_DATA,
      metaData
    })

    return metaData
  }
}

export function updateUserData (userData) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_USERDATA,
      path: userData
    })
    return userData
  }
}

export function updateMessage (message) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_MESSAGE,
      message
    })
  }
}

export function downloadJavaLegacyFixer () {
  return async (dispatch, getState) => {
    const state = getState()
    await downloadFile(
      path.join(_getDataStorePath(state), '__JLF__.jar'),
      GDL_LEGACYJAVAFIXER_MOD_URL
    )
  }
}

export function login (username, password, redirect = true) {
  return async (dispatch, getState) => {

  }
}

export function checkUserData () {
  return async (dispatch, getState) => {
    const state = getState()
    const currentAccountId = state.app.currentAccountId
    const accounts = state.app.accounts

    if (accounts.length > 0 && currentAccountId) {
      const account = accounts.find(a => a.selectedProfile.id === currentAccountId)

      if (account && account.accessToken) {
        const result = await metaCraftGetUserData(account.accessToken)
        if (result.error && result.error > 0) {
          console.error(result.errorMessage)
          return
        }
        const newAccount = {
          accountType: ACCOUNT_MOJANG,
          address: result.address,
          accessToken: account.accessToken,
          selectedProfile: {
            id: account.selectedProfile.id,
            name: result.nickname,
            avatar: result.face
          },
          skin: result.skin,
          user: {
            username: result.nickname,
            avatar: result.face
          }
        }
        dispatch(updateAccount(account.selectedProfile.id, newAccount))
        dispatch(push('/home'))
      }
    }
  }
}

export function loginMetamask (params) {
  return async (dispatch, getState) => {
    try {
      const result = await metaCraftAuthenticateRequest(params)
      const {
        data: { selectedProfile = {}, accessToken = '', error, errorMessage }
      } = result

      if (error) {
        console.error(errorMessage)
        console.error(error)
        return
      }

      const account = {
        accountType: ACCOUNT_MOJANG,
        address: params.address,
        accessToken,
        selectedProfile: {
          id: selectedProfile.id,
          name: selectedProfile.name
        },
        skin: undefined,
        user: {
          username: selectedProfile.name
        }
      }

      dispatch(updateAccount(selectedProfile.id, account))
      dispatch(updateCurrentAccountId(selectedProfile.id))
      dispatch(push('/home'))
      dispatch(checkUserData())
    } catch (error) {
      console.error(error)
    }
  }
}

export function logoutMetamask (params) {
  return (dispatch, getState) => {
    const state = getState()
    const {
      selectedProfile: { id }
    } = _getCurrentAccount(state)

    metaCraftLogout(params).catch(console.error)
    dispatch(removeAccount(id))
    dispatch(push('/'))
  }
}

export function metaCraftValidate (params) {
  return async (dispatch, getState) => {
    try {
      await metaCraftValidateRequest(params).then(result => {
        const {
          data: { error, errorMessage }
        } = result
        console.log(result)

        if (result.status === 204) {
          return Promise.resolve(true)
        }
        if (error) {
          return Promise.reject(
            new Error(`error: ${error}, errorMessage: ${errorMessage}`)
          )
        }
        return Promise.reject(new Error('Account validate failed'))
      })
    } catch (error) {
      console.error(error)
      throw new Error(error)
    }
  }
}

export function logout () {
  return (dispatch, getState) => {
    const state = getState()
    const {
      clientToken,
      accessToken,
      selectedProfile: { id }
    } = _getCurrentAccount(state)
    mcInvalidate(accessToken, clientToken).catch(console.error)
    dispatch(removeAccount(id))
    dispatch(push('/'))
  }
}

export function updateLatestModManifests (manifests) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_MOD_MANIFESTS,
      manifests
    })
  }
}

export function clearLatestModManifests () {
  return dispatch => {
    dispatch({
      type: ActionTypes.CLEAR_MOD_MANIFESTS
    })
  }
}

export function updateCurrentDownload (instanceName) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_CURRENT_DOWNLOAD,
      instanceName
    })
  }
}

export function updateSelectedInstance (name) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_SELECTED_INSTANCE,
      name
    })
  }
}

export function addStartedInstance (instance) {
  return dispatch => {
    dispatch({
      type: ActionTypes.ADD_STARTED_INSTANCE,
      instance
    })
  }
}

export function updateStartedInstance (instance) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_STARTED_INSTANCE,
      instance
    })
  }
}

export function removeStartedInstance (instanceName) {
  return dispatch => {
    dispatch({
      type: ActionTypes.REMOVE_STARTED_INSTANCE,
      instanceName
    })
  }
}

export function removeDownloadFromQueue (instanceName) {
  return async (dispatch, getState) => {
    const lockFilePath = path.join(
      _getInstancesPath(getState()),
      instanceName,
      'installing.lock'
    )
    const isLocked = await new Promise((resolve, reject) => {
      lockfile.check(lockFilePath, (err, locked) => {
        if (err) reject(err)
        resolve(locked)
      })
    })
    if (isLocked) {
      lockfile.unlock(lockFilePath, err => {
        if (err) console.log(err)
      })
    }
    dispatch({
      type: ActionTypes.UPDATE_CURRENT_DOWNLOAD,
      instanceName: null
    })
    dispatch({
      type: ActionTypes.REMOVE_DOWNLOAD_FROM_QUEUE,
      instanceName
    })
  }
}

export function updateDownloadStatus (instanceName, status) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_DOWNLOAD_STATUS,
      status,
      instanceName
    })
    dispatch(updateDownloadProgress(0))
  }
}

export function updateLastUpdateVersion (version) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_LAST_UPDATE_VERSION,
      version
    })
  }
}

export function updateDownloadCurrentPhase (instanceName, status) {
  return dispatch => {
    dispatch({
      type: ActionTypes.UPDATE_DOWNLOAD_STATUS,
      status,
      instanceName
    })
  }
}

export function updateInstanceConfig (
  instanceName,
  updateFunction,
  forceWrite = false
) {
  return async (dispatch, getState) => {
    const state = getState()
    const instance = _getInstance(state)(instanceName) || {}
    const update = async () => {
      const configPath = path.join(
        _getInstancesPath(state),
        instanceName,
        'config.json'
      )
      const tempConfigPath = path.join(
        _getInstancesPath(state),
        instanceName,
        'config_new_temp.json'
      )
      // Remove queue and name, they are augmented in the reducer and we don't want them in the config file
      const newConfig = updateFunction(omit(instance, ['queue', 'name']))
      const JsonString = JSON.stringify(newConfig)
      // Ensure that the new config is actually valid to write
      try {
        const isJson = JSON.parse(JsonString)
        if (!isJson || typeof isJson !== 'object') {
          const err = `Cannot write this JSON to ${instanceName}. Not an object`
          log.error(err)
          throw new Error(err)
        }
      } catch {
        const err = `Cannot write this JSON to ${instanceName}. Not parsable`
        log.error(err, newConfig)
        throw new Error(err)
      }

      const writeFileToDisk = async (content, tempP, p) => {
        await new Promise((resolve, reject) => {
          fss.open(tempP, 'w', async (err, fd) => {
            if (err) reject(err)

            const buffer = Buffer.from(content)
            fss.write(
              fd,
              buffer,
              0,
              buffer.length,
              null,
              (err1, bytesWritten, writtenBuffer) => {
                if (err1) reject(err1)

                if (
                  buffer.length !== bytesWritten ||
                  Buffer.compare(buffer, writtenBuffer) !== 0
                ) {
                  reject(new Error('Content corrupted'))
                }

                fss.close(fd, () => resolve())
              }
            )
          })
        })

        const readBuff = Buffer.alloc(50)
        const newFile = await fs.open(tempP, 'r')
        await newFile.read(readBuff, 0, 50, null)

        if (readBuff.every(v => v === 0)) {
          throw new Error('Corrupted file')
        }
        await fs.rename(tempP, p)
      }

      try {
        await fs.access(configPath)
        await writeFileToDisk(JsonString, tempConfigPath, configPath)
      } catch {
        if (forceWrite) {
          await writeFileToDisk(JsonString, tempConfigPath, configPath)
        }
      }
      dispatch({
        type: ActionTypes.UPDATE_INSTANCES,
        instances: {
          ...state.instances.list,
          [instanceName]: updateFunction(instance)
        }
      })
    }

    if (instance?.queue) {
      // Add it to the instance promise queue
      await instance.queue.add(update)
    } else {
      await update()
    }
  }
}

export function addToQueue (
  instanceName,
  loader,
  manifest,
  background,
  timePlayed,
  settings = {}
) {
  return async (dispatch, getState) => {
    const state = getState()
    const { currentDownload } = state
    const patchedSettings =
      typeof settings === 'object' && settings !== null ? settings : {}

    dispatch({
      type: ActionTypes.ADD_DOWNLOAD_TO_QUEUE,
      instanceName,
      loader,
      manifest,
      background,
      ...patchedSettings
    })

    await makeDir(path.join(_getInstancesPath(state), instanceName))
    lockfile.lock(
      path.join(_getInstancesPath(state), instanceName, 'installing.lock'),
      err => {
        if (err) console.error(err)
      }
    )

    dispatch(
      updateInstanceConfig(
        instanceName,
        prev => {
          return {
            ...(prev || {}),
            loader,
            timePlayed: prev.timePlayed || timePlayed || 0,
            background,
            mods: prev.mods || [],
            ...patchedSettings
          }
        },
        true
      )
    )
    if (!currentDownload) {
      dispatch(updateCurrentDownload(instanceName))
      dispatch(downloadInstance(instanceName))
    }
  }
}

export function addNextInstanceToCurrentDownload () {
  return (dispatch, getState) => {
    const { downloadQueue } = getState()
    const queueArr = Object.keys(downloadQueue)
    if (queueArr.length > 0) {
      dispatch(updateCurrentDownload(queueArr[0]))
      dispatch(downloadInstance(queueArr[0]))
    }
  }
}

export function downloadExtraDependencies (
  instanceName,
  loadingText = 'Downloading extra dependencies...'
) {
  return async (dispatch, getState) => {
    const state = getState()

    dispatch(updateDownloadStatus(instanceName, loadingText))

    const extraDependenciesPath = path.join(
      _getDataStorePath(state),
      'extra_dependencies.json'
    )

    let prevExtraDependencies
    try {
      prevExtraDependencies = await fse.readJson(extraDependenciesPath)
    } catch (e) {
      prevExtraDependencies = []
    }
    const extraDependencies = (await getMcExtraDependency()).data

    const dependencies = []
    Object.keys(extraDependencies).forEach(filePath => {
      const item = extraDependencies[filePath]
      const deps = Object.keys(item).map(key => {
        let needUpgrade = true
        if (
          item[key] &&
          prevExtraDependencies[filePath] &&
          prevExtraDependencies[filePath][key]
        ) {
          needUpgrade = prevExtraDependencies[filePath][key].version < item[key].version
        }

        return {
          path: path.join(
            _getInstancesPath(state),
            instanceName,
            filePath,
            key
          ),
          url: item[key].url,
          version: item[key].version,
          needUpgrade
        }
      })
      dependencies.push(...deps)
    })

    let prev = 0
    const updatePercentage = downloaded => {
      const percentage = (downloaded * 100) / dependencies.length
      const progress = parseInt(percentage, 10)
      if (progress !== prev) {
        prev = progress
        dispatch(updateDownloadProgress(progress))
      }
    }

    const succeeded = await downloadInstanceFiles(
      dependencies,
      updatePercentage,
      state.settings.concurrentDownloads,
      1
    )
    if (succeeded) {
      await fse.outputJson(extraDependenciesPath, extraDependencies)
    } else {
      messageAntd.error('Download failed, Please retry after a while')
      dispatch(updateDownloadStatus(instanceName, 'Download failed'))
      dispatch(updateDownloadProgress(-1))
    }

    return succeeded
  }
}

export function downloadFabric (instanceName) {
  return async (dispatch, getState) => {
    const state = getState()
    const { loader } = _getCurrentDownloadItem(state)

    dispatch(
      updateDownloadStatus(
        instanceName,
        loader.downloadStatus === 'checking'
          ? 'Checking fabric files...'
          : 'Downloading fabric files...'
      )
    )

    let fabricJson
    const fabricJsonPath = path.join(
      _getLibrariesPath(state),
      'net',
      'fabricmc',
      loader?.mcVersion,
      loader?.loaderVersion,
      'fabric.json'
    )
    try {
      fabricJson = await fse.readJson(fabricJsonPath)
      // fabric is no hash check
      return true
    } catch (err) {
      fabricJson = (await getFabricJson(loader)).data
    }

    const libraries = librariesMapper(
      fabricJson.libraries,
      _getLibrariesPath(state)
    )

    let prev = 0
    const updatePercentage = downloaded => {
      const percentage = (downloaded * 100) / libraries.length
      const progress = parseInt(percentage, 10)
      if (progress !== prev) {
        prev = progress
        dispatch(updateDownloadProgress(progress))
      }
    }

    const succeeded = await downloadInstanceFiles(
      libraries,
      updatePercentage,
      state.settings.concurrentDownloads
    )
    if (succeeded) {
      await fse.outputJson(fabricJsonPath, fabricJson)
    } else {
      messageAntd.error('Download failed, Please retry after a while')
      dispatch(updateDownloadStatus(instanceName, 'Download failed'))
      dispatch(updateDownloadProgress(-1))
    }

    return succeeded
  }
}

export function downloadInstance (instanceName) {
  return async (dispatch, getState) => {
    const state = getState()
    const {
      app: {
        vanillaManifest: { versions: mcVersions }
      }
    } = state

    const { loader } = _getCurrentDownloadItem(state)

    dispatch(
      updateDownloadStatus(
        instanceName,
        loader.downloadStatus === 'checking'
          ? 'Checking game files'
          : 'Downloading game files...'
      )
    )

    const mcVersion = loader?.mcVersion

    let mcJson

    // DOWNLOAD MINECRAFT JSON
    const mcJsonPath = path.join(
      _getMinecraftVersionsPath(state),
      `${mcVersion}.json`
    )

    try {
      mcJson = await fse.readJson(mcJsonPath)
    } catch (err) {
      const versionURL = mcVersions.find(v => v.id === mcVersion).url
      mcJson = (await axios.get(versionURL)).data
      await fse.outputJson(mcJsonPath, mcJson)
    }

    // COMPUTING MC ASSETS
    let assetsJson
    const assetsFile = path.join(
      _getAssetsPath(state),
      'indexes',
      `${mcJson.assets}.json`
    )
    try {
      assetsJson = await fse.readJson(assetsFile)
    } catch (e) {
      assetsJson = (await axios.get(mcJson.assetIndex.url)).data
      await fse.outputJson(assetsFile, assetsJson)
    }

    const mcMainFile = {
      url: mcJson.downloads.client.url,
      sha1: mcJson.downloads.client.sha1,
      path: path.join(_getMinecraftVersionsPath(state), `${mcJson.id}.jar`)
    }

    const assets = Object.entries(assetsJson.objects).map(
      ([assetKey, { hash }]) => ({
        url: `${MC_RESOURCES_URL}/${hash.substring(0, 2)}/${hash}`,
        type: 'asset',
        sha1: hash,
        path: path.join(
          _getAssetsPath(state),
          'objects',
          hash.substring(0, 2),
          hash
        ),
        resourcesPath: path.join(
          _getInstancesPath(state),
          instanceName,
          'resources',
          assetKey
        ),
        legacyPath: path.join(
          _getAssetsPath(state),
          'virtual',
          'legacy',
          assetKey
        )
      })
    )

    const libraries = librariesMapper(
      mcJson.libraries,
      _getLibrariesPath(state)
    )

    let prev = 0
    const updatePercentage = downloaded => {
      const percentage =
        (downloaded * 100) / (assets.length + libraries.length + 1)

      const progress = parseInt(percentage, 10)

      if (progress !== prev) {
        prev = progress
        dispatch(updateDownloadProgress(progress))
      }
    }

    const succeeded = await downloadInstanceFiles(
      [...libraries, ...assets, mcMainFile],
      updatePercentage,
      state.settings.concurrentDownloads
    )
    if (!succeeded) {
      messageAntd.error('Download failed, Please retry after a while')
      dispatch(updateDownloadStatus(instanceName, 'Download failed'))
      dispatch(updateDownloadProgress(-1))
      return
    }

    dispatch(updateDownloadStatus(instanceName, 'Extracting game files...'))

    // Wait 400ms to avoid "The process cannot access the file because it is being used by another process."
    await new Promise(resolve => setTimeout(() => resolve(), 1000))

    prev = 0
    await extractNatives(
      libraries,
      path.join(_getInstancesPath(state), instanceName),
      percent => {
        const progress = parseInt(percent, 10)

        if (progress !== prev) {
          prev = progress
          dispatch(updateDownloadProgress(progress))
        }
      }
    )

    if (assetsJson.map_to_resources) {
      await copyAssetsToResources(assets)
    }
    if (mcJson.assets === 'legacy') {
      await copyAssetsToLegacy(assets)
    }
    if (loader?.loaderType === FABRIC) {
      const result = await dispatch(downloadFabric(instanceName))
      if (!result) {
        return
      }
    }

    const result = await dispatch(
      downloadExtraDependencies(
        instanceName,
        loader.downloadStatus === 'checking'
          ? 'Checking game dependencies...'
          : 'Downloading extra dependencies...'
      )
    )

    dispatch(updateDownloadProgress(-1))
    // Be aware that from this line the installer lock might be unlocked!
    if (result) {
      await dispatch(removeDownloadFromQueue(instanceName))
      dispatch(addNextInstanceToCurrentDownload())
    }
  }
}

export const changeModpackVersion = (instanceName, newModpackData) => {
  return async (dispatch, getState) => {
    const state = getState()
    const instance = _getInstance(state)(instanceName)
    const tempPath = _getTempPath(state)
    const instancePath = path.join(_getInstancesPath(state), instanceName)

    if (instance.loader.source === CURSEFORGE) {
      const { data: addon } = await getAddon(instance.loader?.projectID)

      const manifest = await fse.readJson(
        path.join(instancePath, 'manifest.json')
      )

      await fse.remove(path.join(instancePath, 'manifest.json'))

      // Delete prev overrides
      await Promise.all(
        (instance?.overrides || []).map(async v => {
          try {
            await fs.stat(path.join(instancePath, v))
            await fse.remove(path.join(instancePath, v))
          } catch {
            // Swallow error
          }
        })
      )

      const modsprojectIds = (manifest?.files || []).map(v => v?.projectID)

      dispatch(
        updateInstanceConfig(instanceName, prev =>
          omit(
            {
              ...prev,
              mods: prev.mods.filter(
                v => !modsprojectIds.includes(v?.projectID)
              )
            },
            ['overrides']
          )
        )
      )

      await Promise.all(
        modsprojectIds.map(async projectID => {
          const modFound = instance.mods?.find(v => v?.projectID === projectID)
          if (modFound?.fileName) {
            try {
              await fs.stat(
                path.join(instancePath, 'mods', modFound?.fileName)
              )
              await fse.remove(
                path.join(instancePath, 'mods', modFound?.fileName)
              )
            } catch {
              // Swallow error
            }
          }
        })
      )

      const imageURL = addon?.attachments?.find(v => v.isDefault)?.thumbnailUrl

      const newManifest = await downloadAddonZip(
        instance.loader?.projectID,
        newModpackData.id,
        path.join(_getInstancesPath(state), instanceName),
        path.join(tempPath, instanceName)
      )

      await downloadFile(
        path.join(
          _getInstancesPath(state),
          instanceName,
          `background${path.extname(imageURL)}`
        ),
        imageURL
      )

      let loaderVersion
      if (instance.loader?.loaderType === FABRIC) {
        loaderVersion = extractFabricVersionFromManifest(newManifest)
      } else {
        loaderVersion = convertcurseForgeToCanonical(
          newManifest.minecraft.modLoaders.find(v => v.primary).id,
          newManifest.minecraft.version,
          state.app.forgeManifest
        )
      }

      const loader = {
        loaderType: instance.loader?.loaderType,
        mcVersion: newManifest.minecraft.version,
        loaderVersion,
        fileID: instance.loader?.fileID,
        projectID: instance.loader?.projectID,
        source: instance.loader?.source
      }

      dispatch(
        addToQueue(
          instanceName,
          loader,
          newManifest,
          `background${path.extname(imageURL)}`
        )
      )
    } else if (instance.loader.source === FTB) {
      const imageURL = newModpackData.imageUrl

      await downloadFile(
        path.join(
          _getInstancesPath(state),
          instanceName,
          `background${path.extname(imageURL)}`
        ),
        imageURL
      )

      const newModpack = await getFTBModpackVersionData(
        instance.loader?.projectID,
        newModpackData.id
      )

      const loader = {
        loaderType: instance.loader?.loaderType,

        mcVersion: newModpack.targets[1].version,
        loaderVersion: convertcurseForgeToCanonical(
          `forge-${newModpack.targets[0].version}`,
          newModpack.targets[1].version,
          state.app.forgeManifest
        ),
        fileID: newModpack?.id,
        projectID: instance.loader?.projectID,
        source: instance.loader?.source
      }

      dispatch(
        addToQueue(
          instanceName,
          loader,
          null,
          `background${path.extname(imageURL)}`
        )
      )
    }
  }
}

export const startListener = () => {
  return async (dispatch, getState) => {
    // Real Time Scanner
    const state = getState()
    const instancesPath = _getInstancesPath(state)
    const Queue = new PromiseQueue()

    Queue.on('start', queueLength => {
      if (queueLength > 1) {
        dispatch(
          updateMessage({
            content: `Synchronizing mods. ${queueLength} left.`,
            duration: 0
          })
        )
      }
    })

    Queue.on('executed', queueLength => {
      if (queueLength > 1) {
        dispatch(
          updateMessage({
            content: `Synchronizing mods. ${queueLength} left.`,
            duration: 0
          })
        )
      }
    })

    Queue.on('end', () => {
      dispatch(updateMessage(null))
    })

    const changesTracker = {}

    const processAddedFile = async (fileName, instanceName) => {
      // const processChange = async () => {
      //   const newState = getState();
      //   const instance = _getInstance(newState)(instanceName);
      //   const isInConfig = (instance?.mods || []).find(
      //     mod => mod.fileName === path.basename(fileName)
      //   );
      //   try {
      //     const stat = await fs.lstat(fileName);
      //     if (instance?.mods && !isInConfig && stat.isFile() && instance) {
      //       // get murmur hash
      //       const murmurHash = await getFileMurmurHash2(fileName);
      //       const { data } = await getAddonsByFingerprint([murmurHash]);
      //       const exactMatch = (data.exactMatches || [])[0];
      //       const notMatch = (data.unmatchedFingerprints || [])[0];
      //       let mod = {};
      //       if (exactMatch) {
      //         let addon = null;
      //         try {
      //           addon = (await getAddon(exactMatch.file.projectId)).data;
      //           mod = normalizeModData(
      //             exactMatch.file,
      //             exactMatch.file.projectId,
      //             addon.name
      //           );
      //           mod.fileName = path.basename(fileName);
      //         } catch {
      //           mod = {
      //             fileName: path.basename(fileName),
      //             displayName: path.basename(fileName),
      //             packageFingerprint: murmurHash
      //           };
      //         }
      //       } else if (notMatch) {
      //         mod = {
      //           fileName: path.basename(fileName),
      //           displayName: path.basename(fileName),
      //           packageFingerprint: murmurHash
      //         };
      //       }
      //       const updatedInstance = _getInstance(getState())(instanceName);
      //       const isStillNotInConfig = !(updatedInstance?.mods || []).find(
      //         m => m.fileName === path.basename(fileName)
      //       );
      //       if (isStillNotInConfig && updatedInstance) {
      //         console.log('[RTS] ADDING MOD', fileName, instanceName);
      //         await dispatch(
      //           updateInstanceConfig(instanceName, prev => ({
      //             ...prev,
      //             mods: [...(prev.mods || []), mod]
      //           }))
      //         );
      //       }
      //     }
      //   } catch (err) {
      //     console.error(err);
      //   }
      // };
      // Queue.add(processChange);
    }

    const processRemovedFile = async (fileName, instanceName) => {
      const processChange = async () => {
        const instance = getState().instances.list[instanceName]
        const isInConfig = (instance?.mods || []).find(
          mod => mod.fileName === path.basename(fileName)
        )
        if (isInConfig) {
          try {
            console.log('[RTS] REMOVING MOD', fileName, instanceName)
            await dispatch(
              updateInstanceConfig(instanceName, prev => ({
                ...prev,
                mods: (prev.mods || []).filter(
                  m => m.fileName !== path.basename(fileName)
                )
              }))
            )
          } catch (err) {
            console.error(err)
          }
        }
      }
      Queue.add(processChange)
    }

    const processRenamedFile = async (
      fileName,
      oldInstanceName,
      newFilePath
    ) => {
      const processChange = async () => {
        const newState = getState()
        const instances = newState.instances.list
        const modData = instances[oldInstanceName].mods.find(
          m => m.fileName === path.basename(fileName)
        )
        if (modData) {
          try {
            console.log('[RTS] RENAMING MOD', fileName, newFilePath, modData)
            await dispatch(
              updateInstanceConfig(oldInstanceName, prev => ({
                ...prev,
                mods: [
                  ...(prev.mods || []).filter(
                    m => m.fileName !== path.basename(fileName)
                  ),
                  { ...modData, fileName: path.basename(newFilePath) }
                ]
              }))
            )
          } catch (err) {
            console.error(err)
          }
        }
      }
      Queue.add(processChange)
    }

    const processAddedInstance = async instanceName => {
      const processChange = async () => {
        const newState = getState()
        const instance = _getInstance(newState)(instanceName)
        if (!instance) {
          const configPath = path.join(
            instancesPath,
            instanceName,
            'config.json'
          )
          try {
            const config = await fse.readJSON(configPath)

            if (!config.loader) {
              throw new Error(`Config for ${instanceName} could not be parsed`)
            }
            console.log('[RTS] ADDING INSTANCE', instanceName)
            dispatch({
              type: ActionTypes.UPDATE_INSTANCES,
              instances: {
                ...newState.instances.list,
                [instanceName]: { ...config, name: instanceName }
              }
            })
          } catch (err) {
            console.warn(err)
          }
        }
      }
      Queue.add(processChange)
    }

    const processRemovedInstance = instanceName => {
      const processChange = async () => {
        const newState = getState()
        if (_getInstance(newState)(instanceName)) {
          console.log('[RTS] REMOVING INSTANCE', instanceName)
          dispatch({
            type: ActionTypes.UPDATE_INSTANCES,
            instances: omit(newState.instances.list, [instanceName])
          })
        }
      }
      Queue.add(processChange)
    }

    const processRenamedInstance = async (oldInstanceName, newInstanceName) => {
      const processChange = async () => {
        const newState = getState()
        const instance = _getInstance(newState)(newInstanceName)

        if (!instance) {
          try {
            const configPath = path.join(
              instancesPath,
              newInstanceName,
              'config.json'
            )
            const config = await fse.readJSON(configPath)
            if (!config.loader) {
              throw new Error(
                `Config for ${newInstanceName} could not be parsed`
              )
            }
            console.log(
              `[RTS] RENAMING INSTANCE ${oldInstanceName} -> ${newInstanceName}`
            )
            dispatch({
              type: ActionTypes.UPDATE_INSTANCES,
              instances: {
                ...omit(newState.instances.list, [oldInstanceName]),
                [newInstanceName]: { ...config, name: newInstanceName }
              }
            })

            const instanceManagerModalIndex = newState.modals.findIndex(
              x =>
                x.modalType === 'InstanceManager' &&
                x.modalProps.instanceName === oldInstanceName
            )

            dispatch({
              type: UPDATE_MODAL,
              modals: [
                ...newState.modals.slice(0, instanceManagerModalIndex),
                {
                  modalType: 'InstanceManager',
                  modalProps: { instanceName: newInstanceName }
                },
                ...newState.modals.slice(instanceManagerModalIndex + 1)
              ]
            })
          } catch (err) {
            console.error(err)
          }
        }
      }
      Queue.add(processChange)
    }

    ipcRenderer.on('listener-events', async (e, events) => {
      await Promise.all(
        events.map(async event => {
          // Using oldFile instead of newFile is intentional.
          // This is used to discard the ADD action dispatched alongside
          // the rename action.
          const completePath = path.join(
            event.directory,
            event.file || event.oldFile
          )

          const isRename = event.newFile && event.oldFile

          if (
            (!isMod(completePath, instancesPath) &&
              !isInstanceFolderPath(completePath, instancesPath) &&
              !isRename) ||
            // When renaming, an ADD action is dispatched too. Try to discard that
            (event.action !== 2 && changesTracker[completePath]) ||
            // Ignore java legacy fixer
            path.basename(completePath) === '__JLF__.jar'
          ) {
            return
          }
          if (event.action !== 2 && !changesTracker[completePath]) {
            // If we cannot find it in the hash table, it's a new event
            changesTracker[completePath] = {
              action: event.action,
              completed:
                event.action !== 0 ||
                (event.action === 0 &&
                  isInstanceFolderPath(completePath, instancesPath)),
              ...(event.action === 3 && {
                newFilePath: path.join(event.newDirectory, event.newFile)
              })
            }
          }

          if (
            changesTracker[completePath] &&
            !changesTracker[completePath].completed &&
            (event.action === 2 || event.action === 0 || event.action === 1)
          ) {
            try {
              await new Promise(resolve => setTimeout(resolve, 300))
              await fs.open(completePath, 'r+')
              changesTracker[completePath].completed = true
            } catch {
              // Do nothing, simply not completed..
            }
          }
        })
      )

      // Handle edge case where MOD-REMOVE is called before INSTANCE-REMOVE
      Object.entries(changesTracker).forEach(
        async ([fileName, { action, completed }]) => {
          if (
            isInstanceFolderPath(fileName, instancesPath) &&
            action === 1 &&
            completed
          ) {
            const instanceName = convertCompletePathToInstance(
              fileName,
              instancesPath
            )
              .substr(1)
              .split(path.sep)[0]
            // Check if we can find any other action with this instance name
            Object.entries(changesTracker).forEach(
              ([file, { action: act }]) => {
                if (isMod(file, instancesPath) && act === 1) {
                  const instName = convertCompletePathToInstance(
                    file,
                    instancesPath
                  )
                    .substr(1)
                    .split(path.sep)[0]
                  if (instanceName === instName) {
                    delete changesTracker[file]
                  }
                }
              }
            )
          }
        }
      )

      Object.entries(changesTracker).map(
        async ([fileName, { action, completed, newFilePath }]) => {
          const filePath = newFilePath || fileName
          // Events are dispatched 3 times. Wait for 3 dispatches to be sure
          // that the action was completely executed
          if (completed) {
            // Remove the current file from the tracker.
            // Using fileName instead of filePath is intentional for the RENAME/ADD issue
            delete changesTracker[fileName]

            // Infer the instance name from the full path
            const instanceName = convertCompletePathToInstance(
              filePath,
              instancesPath
            )
              .substr(1)
              .split(path.sep)[0]

            // If we're installing a modpack we don't want to process anything
            const isLocked = await new Promise((resolve, reject) => {
              lockfile.check(
                path.join(instancesPath, instanceName, 'installing.lock'),
                (err, locked) => {
                  if (err) reject(err)
                  resolve(locked)
                }
              )
            })
            if (isLocked) return

            if (
              isMod(fileName, instancesPath) &&
              _getInstance(getState())(instanceName) &&
              action !== 3
            ) {
              if (action === 0) {
                processAddedFile(filePath, instanceName)
              } else if (action === 1) {
                processRemovedFile(filePath, instanceName)
              }
            } else if (
              action === 3 &&
              !isInstanceFolderPath(fileName, instancesPath) &&
              !isInstanceFolderPath(newFilePath, instancesPath)
            ) {
              // Infer the instance name from the full path
              const oldInstanceName = convertCompletePathToInstance(
                fileName,
                instancesPath
              )
                .substr(1)
                .split(path.sep)[0]
              if (
                oldInstanceName === instanceName &&
                isMod(newFilePath, instancesPath) &&
                isMod(fileName, instancesPath)
              ) {
                processRenamedFile(fileName, instanceName, newFilePath)
              } else if (
                oldInstanceName !== instanceName &&
                isMod(newFilePath, instancesPath) &&
                isMod(fileName, instancesPath)
              ) {
                processRemovedFile(fileName, oldInstanceName)
                processAddedFile(newFilePath, instanceName)
              } else if (
                !isMod(newFilePath, instancesPath) &&
                isMod(fileName, instancesPath)
              ) {
                processRemovedFile(fileName, oldInstanceName)
              } else if (
                isMod(newFilePath, instancesPath) &&
                !isMod(fileName, instancesPath)
              ) {
                processAddedFile(newFilePath, instanceName)
              }
            } else if (isInstanceFolderPath(filePath, instancesPath)) {
              if (action === 0) {
                processAddedInstance(instanceName)
              } else if (action === 1) {
                processRemovedInstance(instanceName)
              } else if (action === 3) {
                const oldInstanceName = convertCompletePathToInstance(
                  fileName,
                  instancesPath
                )
                  .substr(1)
                  .split(path.sep)[0]
                processRenamedInstance(oldInstanceName, instanceName)
              }
            }
          }
        }
      )
    })

    // await ipcRenderer.invoke('start-listener', instancesPath)
  }
}

export function getJavaVersionForMCVersion (mcVersion) {
  return (_, getState) => {
    const { app } = getState()
    const { versions } = app?.vanillaManifest || {}
    if (versions) {
      const version = versions.find(v => v.id === mcVersion)
      const java17sInitialDate = new Date('2021-09-14')
      if (new Date(version?.releaseTime) < java17sInitialDate) {
        return 8
      }
    }
    return 17
  }
}

export function launchInstance (instanceName) {
  return async (dispatch, getState) => {
    const state = getState()

    const { userData, app } = state
    const account = _getCurrentAccount(state)
    const librariesPath = _getLibrariesPath(state)
    const assetsPath = _getAssetsPath(state)
    const { memory, args } = state.settings.java
    const { resolution: globalMinecraftResolution } =
      state.settings.minecraftSettings
    const {
      loader,
      javaArgs,
      javaMemory,
      customJavaPath,
      resolution: instanceResolution
    } = _getInstance(state)(instanceName)

    // let discordRPCDetails = `Minecraft ${loader?.mcVersion}`

    // if (loader.source && loader.sourceName) {
    //   discordRPCDetails = `${loader.sourceName}`
    // }

    // ipcRenderer.invoke('update-discord-rpc', discordRPCDetails)

    const defaultJavaPathVersion = await _getJavaPath(state)()

    const javaPath = customJavaPath || defaultJavaPathVersion

    const instancePath = path.join(_getInstancesPath(state), instanceName)

    const configPath = path.join(instancePath, 'config.json')
    const backupConfigPath = path.join(instancePath, 'config.bak.json')
    await fs.copyFile(configPath, backupConfigPath)

    const instanceJLFPath = path.join(
      _getInstancesPath(state),
      instanceName,
      'mods',
      '__JLF__.jar'
    )

    let errorLogs = ''

    const mcJson = await fse.readJson(
      path.join(_getMinecraftVersionsPath(state), `${loader?.mcVersion}.json`)
    )
    let libraries = []
    let mcMainFile = {
      url: mcJson.downloads.client.url,
      sha1: mcJson.downloads.client.sha1,
      path: path.join(_getMinecraftVersionsPath(state), `${mcJson.id}.jar`)
    }

    if (loader && loader?.loaderType === 'fabric') {
      const fabricJsonPath = path.join(
        _getLibrariesPath(state),
        'net',
        'fabricmc',
        loader?.mcVersion,
        loader?.loaderVersion,
        'fabric.json'
      )
      const fabricJson = await fse.readJson(fabricJsonPath)
      const fabricLibraries = librariesMapper(
        fabricJson.libraries,
        librariesPath
      )
      libraries = libraries.concat(fabricLibraries)
      // Replace classname
      mcJson.mainClass = fabricJson.mainClass
    } else if (loader && loader?.loaderType === 'forge') {
      if (gt(coerce(loader?.mcVersion), coerce('1.5.2'))) {
        const getForgeLastVer = ver =>
          Number.parseInt(ver.split('.')[ver.split('.').length - 1], 10)

        if (
          lt(coerce(loader?.loaderVersion.split('-')[1]), coerce('10.13.1')) &&
          gte(coerce(loader?.loaderVersion.split('-')[1]), coerce('9.11.1')) &&
          getForgeLastVer(loader?.loaderVersion) < 1217 &&
          getForgeLastVer(loader?.loaderVersion) > 935
        ) {
          const moveJavaLegacyFixerToInstance = async () => {
            await fs.lstat(path.join(_getDataStorePath(state), '__JLF__.jar'))
            await fse.move(
              path.join(_getDataStorePath(state), '__JLF__.jar'),
              instanceJLFPath
            )
          }
          try {
            await moveJavaLegacyFixerToInstance()
          } catch {
            await dispatch(downloadJavaLegacyFixer(loader))
            await moveJavaLegacyFixerToInstance()
          }
        }

        const forgeJsonPath = path.join(
          _getLibrariesPath(state),
          'net',
          'minecraftforge',
          loader?.loaderVersion,
          `${loader?.loaderVersion}.json`
        )
        const forgeJson = await fse.readJson(forgeJsonPath)
        const forgeLibraries = librariesMapper(
          forgeJson.version.libraries,
          librariesPath
        )
        libraries = libraries.concat(forgeLibraries)
        // Replace classname
        mcJson.mainClass = forgeJson.version.mainClass
        if (forgeJson.version.minecraftArguments) {
          mcJson.minecraftArguments = forgeJson.version.minecraftArguments
        } else if (forgeJson.version.arguments.game) {
          // 1.17 check
          if (forgeJson.version.arguments.jvm) {
            mcJson.forge = { arguments: {} }
            mcJson.forge.arguments.jvm = forgeJson.version.arguments.jvm.map(
              arg => {
                return arg
                  .replace(/\${version_name}/g, mcJson.id)
                  .replace(
                    /\${library_directory}/g,
                    `"${_getLibrariesPath(state)}"`
                  )
                  .replace(
                    /\${classpath_separator}/g,
                    process.platform === 'win32' ? ';' : ':'
                  )
              }
            )
          }
          mcJson.arguments.game = mcJson.arguments.game.concat(
            forgeJson.version.arguments.game
          )
        }
      } else {
        mcMainFile = {
          path: path.join(
            _getMinecraftVersionsPath(state),
            `${loader?.loaderVersion}.jar`
          )
        }
      }
    }
    libraries = removeDuplicates(
      libraries.concat(librariesMapper(mcJson.libraries, librariesPath)),
      'url'
    )

    console.log(mcJson.assets !== 'legacy' && gte(coerce(mcJson.assets), coerce('1.13')))
    const getJvmArguments =
      mcJson.assets !== 'legacy' && gte(coerce(mcJson.assets), coerce('1.13'))
        ? getJVMArguments113
        : getJVMArguments112

    const javaArguments = (javaArgs !== undefined ? javaArgs : args).split(' ')
    const javaMem = javaMemory !== undefined ? javaMemory : memory
    const gameResolution = instanceResolution || globalMinecraftResolution
    const isDev = process.env.NODE_ENV === 'development'
    const RESOURCE_DIR = isDev
      ? `${process.cwd()}/resources/`
      : process.resourcesPath

    const injectedJvmArguments = [
      `"-javaagent:${path.join(
        RESOURCE_DIR,
        'authlib-injector.jar'
      )}=${METACRAFT_SERVICES_URL}"`,
      `-Dauthlibinjector.yggdrasil.prefetched=${Buffer.from(
        JSON.stringify(app.serverMetaData)
      ).toString('base64')}`
    ]

    const injectedJvmArgumentsIndex = mcJson.arguments.jvm.findIndex(
      jvmItem => {
        if (typeof jvmItem === 'string') {
          return /^-Djava.library.path/.test(jvmItem)
        }
        return false
      }
    )

    mcJson.arguments.jvm.splice(
      injectedJvmArgumentsIndex,
      0,
      ...injectedJvmArguments
    )

    const jvmArguments = getJvmArguments(
      libraries,
      mcMainFile,
      instancePath,
      assetsPath,
      mcJson,
      account,
      javaMem,
      gameResolution,
      false,
      javaArguments
    )

    const { mcStartupMethod } = state.settings
    let replaceWith = `..${path.sep}..`

    const symLinkDirPath = path.join(userData.split('\\')[0], '_gdl')
    if (MC_STARTUP_METHODS[mcStartupMethod] === MC_STARTUP_METHODS.SYMLINK) {
      replaceWith = symLinkDirPath
      if (process.platform === 'win32') await symlink(userData, symLinkDirPath)
    }

    const replaceRegex = [
      process.platform === 'win32'
        ? new RegExp(userData.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1'), 'g')
        : null,
      replaceWith
    ]

    console.log('javaPath: ', javaPath)
    console.log('jvmArguments: ', jvmArguments.join(' '))

    if (state.settings.hideWindowOnGameLaunch) {
      await ipcRenderer.invoke('hide-window')
    }

    const ps = spawn(
      `"${javaPath}"`,
      jvmArguments.map(v => v.toString().replace(...replaceRegex)),
      {
        cwd: instancePath,
        shell: true
      }
    )

    const playTimer = setInterval(() => {
      dispatch(
        updateInstanceConfig(instanceName, prev => ({
          ...prev,
          timePlayed: (Number(prev.timePlayed) || 0) + 1
        }))
      )
    }, 60 * 1000)

    dispatch(
      updateInstanceConfig(instanceName, prev => ({
        ...prev,
        lastPlayed: Date.now()
      }))
    )
    dispatch(addStartedInstance({ instanceName, pid: ps.pid }))

    ps.stdout.on('data', data => {
      console.log(data.toString())
      if (data.toString().includes('Setting user:')) {
        dispatch(updateStartedInstance({ instanceName, initialized: true }))
      }
    })

    ps.stderr.on('data', data => {
      console.error(`ps stderr: ${data}`)
      errorLogs += data || ''
    })

    ps.on('close', async code => {
      clearInterval(playTimer)
      if (!ps.killed) {
        ps.kill('SIGKILL')
      }
      // ipcRenderer.invoke('reset-discord-rpc')
      await new Promise(resolve => setTimeout(resolve, 200))
      ipcRenderer.invoke('show-window')
      dispatch(removeStartedInstance(instanceName))
      await fse.remove(instanceJLFPath)
      await fs.unlink(backupConfigPath)

      if (
        process.platform === 'win32' &&
        MC_STARTUP_METHODS[mcStartupMethod] === MC_STARTUP_METHODS.SYMLINK
      ) {
        fse.remove(symLinkDirPath)
      }

      if (code !== 0 && errorLogs) {
        dispatch(
          openModal('InstanceCrashed', {
            code,
            errorLogs: errorLogs?.toString('utf8')
          })
        )
        console.warn(`Process exited with code ${code}. Not too good..`)
      }
    })
  }
}

export function installMod (
  projectID,
  fileID,
  instanceName,
  gameVersion,
  installDeps = true,
  onProgress,
  useTempMiddleware
) {
  return async (dispatch, getState) => {
    const state = getState()
    const instancesPath = _getInstancesPath(state)
    const instancePath = path.join(instancesPath, instanceName)
    const instance = _getInstance(state)(instanceName)
    const mainModData = await getAddonFile(projectID, fileID)
    const { data: addon } = await getAddon(projectID)
    mainModData.data.projectID = projectID
    const destFile = path.join(instancePath, 'mods', mainModData.data.fileName)
    const tempFile = path.join(_getTempPath(state), mainModData.data.fileName)

    if (useTempMiddleware) {
      await downloadFile(tempFile, mainModData.data.downloadUrl, onProgress)
    }

    let needToAddMod = true
    await dispatch(
      updateInstanceConfig(instanceName, prev => {
        needToAddMod = !prev.mods.find(
          v => v.fileID === fileID && v.projectID === projectID
        )
        return {
          ...prev,
          mods: [
            ...prev.mods,
            ...(needToAddMod
              ? [normalizeModData(mainModData.data, projectID, addon.name)]
              : [])
          ]
        }
      })
    )

    if (!needToAddMod) {
      if (useTempMiddleware) {
        await fse.remove(tempFile)
      }
      return
    }

    if (!useTempMiddleware) {
      return
      // try {
      //   await fse.access(destFile);
      //   const murmur2 = await getFileMurmurHash2(destFile);
      //   if (murmur2 !== mainModData.data.packageFingerprint) {
      //     await downloadFile(
      //       destFile,
      //       mainModData.data.downloadUrl,
      //       onProgress
      //     );
      //   }
      // } catch {
      //   await downloadFile(destFile, mainModData.data.downloadUrl, onProgress);
      // }
    } else {
      await fse.move(tempFile, destFile, { overwrite: true })
    }

    if (installDeps) {
      await pMap(
        mainModData.data.dependencies,
        async dep => {
          // type 1: embedded
          // type 2: optional
          // type 3: required
          // type 4: tool
          // type 5: incompatible
          // type 6: include

          if (dep.type === 3) {
            if (instance.mods.some(x => x.addonId === dep.addonId)) return
            const depList = await getAddonFiles(dep.addonId)
            const depData = depList.data.find(v =>
              v.gameVersion.includes(gameVersion)
            )
            await dispatch(
              installMod(
                dep.addonId,
                depData.id,
                instanceName,
                gameVersion,
                installDeps,
                onProgress,
                useTempMiddleware
              )
            )
          }
        },
        { concurrency: 2 }
      )
    }
    return destFile
  }
}

export const deleteMod = (instanceName, mod) => {
  return async (dispatch, getState) => {
    const instancesPath = _getInstancesPath(getState())
    await dispatch(
      updateInstanceConfig(instanceName, prev => ({
        ...prev,
        mods: prev.mods.filter(m => m.fileName !== mod.fileName)
      }))
    )
    await fse.remove(
      path.join(instancesPath, instanceName, 'mods', mod.fileName)
    )
  }
}

export const updateMod = (
  instanceName,
  mod,
  fileID,
  gameVersion,
  onProgress
) => {
  return async dispatch => {
    await dispatch(
      installMod(
        mod.projectID,
        fileID,
        instanceName,
        gameVersion,
        false,
        onProgress,
        true
      )
    )
    await dispatch(deleteMod(instanceName, mod))
  }
}

export const initLatestMods = instanceName => {
  return async (dispatch, getState) => {
    const state = getState()
    const instance = _getInstance(state)(instanceName)
    const { latestModManifests } = state

    const modIds = instance?.mods
      ?.filter(v => v.projectID)
      ?.map(v => v.projectID)

    // Check which mods need to be initialized
    const modsToInit = modIds?.filter(v => {
      return !latestModManifests[v]
    })

    if (!modsToInit || modsToInit?.length === 0) return

    // Need to split in multiple requests
    const manifests = await pMap(
      modsToInit,
      async mod => {
        let data = null
        try {
          ({ data } = await getAddonFiles(mod))
        } catch {
          // nothing
        }
        return { projectID: mod, data }
      },
      { concurrency: 40 }
    )
    const manifestsObj = {}
    manifests
      .filter(v => v.data)
      .map(v => {
        // Find latest version for each mod
        const [latestMod] =
          getPatchedInstanceType(instance) === FORGE || v.projectID === 361988
            ? filterForgeFilesByVersion(v.data, instance.loader?.mcVersion)
            : filterFabricFilesByVersion(v.data, instance.loader?.mcVersion)
        if (latestMod) {
          manifestsObj[v.projectID] = latestMod
        }
        return null
      })

    dispatch(updateLatestModManifests(manifestsObj))
  }
}
