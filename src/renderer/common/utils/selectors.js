import { createSelector } from 'reselect'
import path from 'path'
import memoize from 'lodash/memoize'
import { convertOSToJavaFormat } from '../../app/utils'

const _instances = state => state.instances
const _accounts = state => state.app.accounts
const _java = state => state.settings.java
const _currentAccountId = state => state.app.currentAccountId
const _currentDownload = state => state.currentDownload
const _downloadQueue = state => state.downloadQueue
const _app = state => state.app
const _userData = state => state.userData

export const _getInstances = createSelector(_instances, instances =>
  Object.values(instances.list)
)

export const _getInstance = createSelector(_instances, instances =>
  memoize(instance => instances.list[instance])
)

export const _getCurrentAccount = createSelector(
  _accounts,
  _currentAccountId,
  (accounts, currentAccountId) =>
    accounts.find(account => account.selectedProfile.id === currentAccountId)
)

export const _getAccounts = createSelector(_accounts, accounts => accounts)

export const _getDownloadQueue = createSelector(
  _downloadQueue,
  downloadQueue => downloadQueue
)

export const _getCurrentDownloadItem = createSelector(
  _currentDownload,
  _downloadQueue,
  (currentDownload, downloadQueue) => {
    return downloadQueue[currentDownload]
  }
)

export const _getJavaPath = createSelector(
  _app,
  _java,
  _userData,
  (javaManifest, java, userData) => {
    // version
    return memoize(async () => {
      const manifest = javaManifest.java17Manifest

      const customJava = java.path17

      const javaOs = convertOSToJavaFormat(process.platform)
      const javaMeta = manifest.find(
        version =>
          version.os === javaOs &&
          version.architecture === 'x64' &&
          (version.binary_type === 'jre' || version.binary_type === 'jdk')
      )

      const {
        version_data: { openjdk_version: version }
      } = javaMeta
      const filename = process.platform === 'win32' ? 'java.exe' : 'java'
      return (
        customJava || path.join(userData, 'java', version, 'bin', filename)
      )
    })
  }
)

export const _getInstancesPath = createSelector(_userData, userData =>
  userData ? path.join(userData, 'instances') : null
)

export const _getTempPath = createSelector(_userData, userData =>
  userData ? path.join(userData, 'temp') : null
)

export const _getDataStorePath = createSelector(_userData, userData =>
  userData ? path.join(userData, 'datastore') : null
)

export const _getLibrariesPath = createSelector(
  _getDataStorePath,
  datastorePath => datastorePath ? path.join(datastorePath, 'libraries') : null
)

export const _getMinecraftVersionsPath = createSelector(
  _getLibrariesPath,
  librariesPath => librariesPath ? path.join(librariesPath, 'net', 'minecraft') : null
)

export const _getAssetsPath = createSelector(_getDataStorePath, datastorePath =>
  datastorePath ? path.join(datastorePath, 'assets') : null
)
