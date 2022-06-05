import { useMemo } from 'react'
import path from 'path'
import os from 'os'
import fse from 'fs-extra'
import { useSelector, useDispatch } from 'react-redux'
import { addToQueue } from '../reducers/actions'
import { closeModal, openModal } from '../reducers/modals/actions'
import {
  downloadAddonZip,
  importAddonZip,
  convertcurseForgeToCanonical,
  extractFabricVersionFromManifest
} from '../../app/utils'
import { _getInstancesPath, _getTempPath } from '../utils/selectors'
import { downloadFile } from '../../app/utils/downloader'
import { FABRIC, VANILLA, FORGE, FTB } from '../utils/constants'
import { getFTBModpackVersionData } from '../api'

const useAddFabricInstance = ({
  instanceVersion,
  modpack = null,
  importZipPath = ''
}) => {
  const version = instanceVersion
  const mcName = 'Metacraft'

  const originalMcName =
    modpack?.name || (version && `Minecraft ${version?.loaderType}`)

  const dispatch = useDispatch()
  const instancesPath = useSelector(_getInstancesPath)
  const tempPath = useSelector(_getTempPath)
  const forgeManifest = useSelector(state => state.app.forgeManifest)

  const imageURL = useMemo(() => {
    if (!modpack) return null
    // Curseforge
    if (!modpack.synopsis) {
      return modpack?.attachments?.find(v => v?.isDefault)?.thumbnailUrl
    }
    // FTB
    const image = modpack?.art?.reduce((prev, curr) => {
      if (!prev || curr.size < prev.size) return curr
      return prev
    })
    return image.url
  }, [modpack])

  const wait = t => {
    return new Promise(resolve => {
      setTimeout(() => resolve(), t)
    })
  }

  const isInstanceAlreadyExists = async () => {
    if (mcName) {
      const regex = /^[\sa-zA-Z0-9_.-]+$/
      const finalWhiteSpace = /[^\s]$/
      if (
        !regex.test(mcName) ||
        !finalWhiteSpace.test(mcName) ||
        mcName.length >= 45
      ) {
        console.error('download instance name is invalid')
        return false
      }
      return fse
        .pathExists(path.join(instancesPath, mcName))
        .then(exists => {
          return exists
        })
        .catch(e => {
          console.error('read download instance path failed: ', e)
          return false
        })
    }
  }

  const createInstance = async () => {
    const localInstanceName = mcName

    if (!version || !localInstanceName) return

    const isExists = await isInstanceAlreadyExists()

    const initTimestamp = Date.now()

    const isCurseForgeModpack = Boolean(modpack?.attachments)
    const isFTBModpack = Boolean(modpack?.art)
    let manifest

    // If it's a curseforge modpack grab the manfiest and detect the loader
    // type as we don't yet know what it is.
    if (isCurseForgeModpack) {
      if (importZipPath) {
        manifest = await importAddonZip(
          importZipPath,
          path.join(instancesPath, localInstanceName),
          path.join(tempPath, localInstanceName),
          tempPath
        )
      } else {
        manifest = await downloadAddonZip(
          version?.projectID,
          version?.fileID,
          path.join(instancesPath, localInstanceName),
          path.join(tempPath, localInstanceName)
        )
      }

      const isForgeModpack = (manifest?.minecraft?.modLoaders || []).some(
        v => v.id.includes(FORGE) && v.primary
      )

      const isFabricModpack = (manifest?.minecraft?.modLoaders || []).some(
        v => v.id.includes(FABRIC) && v.primary
      )

      if (isForgeModpack) {
        version.loaderType = FORGE
      } else if (isFabricModpack) {
        version.loaderType = FABRIC
      } else {
        version.loaderType = VANILLA
      }
    }

    const isVanilla = version?.loaderType === VANILLA
    const isFabric = version?.loaderType === FABRIC
    const isForge = version?.loaderType === FORGE

    if (isCurseForgeModpack) {
      if (imageURL) {
        await downloadFile(
          path.join(
            instancesPath,
            localInstanceName,
            `background${path.extname(imageURL)}`
          ),
          imageURL
        )
      }

      if (isForge) {
        const loader = {
          loaderType: FORGE,
          mcVersion: manifest.minecraft.version,
          loaderVersion: convertcurseForgeToCanonical(
            manifest.minecraft.modLoaders.find(v => v.primary).id,
            manifest.minecraft.version,
            forgeManifest
          ),
          fileID: version?.fileID,
          projectID: version?.projectID,
          source: version?.source,
          sourceName: manifest.name
        }

        dispatch(
          addToQueue(
            localInstanceName,
            loader,
            manifest,
            imageURL ? `background${path.extname(imageURL)}` : null
          )
        )
      } else if (isFabric) {
        const loader = {
          loaderType: FABRIC,
          mcVersion: manifest.minecraft.version,
          loaderVersion: extractFabricVersionFromManifest(manifest),
          fileID: version?.fileID,
          projectID: version?.projectID,
          source: version?.source,
          sourceName: manifest.name
        }
        dispatch(
          addToQueue(
            localInstanceName,
            loader,
            manifest,
            imageURL ? `background${path.extname(imageURL)}` : null
          )
        )
      } else if (isVanilla) {
        const loader = {
          loaderType: VANILLA,
          mcVersion: manifest.minecraft.version,
          loaderVersion: version?.loaderVersion,
          fileID: version?.fileID
        }

        dispatch(
          addToQueue(
            localInstanceName,
            loader,
            manifest,
            imageURL ? `background${path.extname(imageURL)}` : null
          )
        )
      }
    } else if (isFTBModpack) {
      // Fetch mc version

      const data = await getFTBModpackVersionData(
        version?.projectID,
        version?.fileID
      )

      const forgeModloader = data.targets.find(v => v.type === 'modloader')
      const mcVersion = data.targets.find(v => v.type === 'game').version
      const loader = {
        loaderType: forgeModloader?.name,
        mcVersion,
        loaderVersion:
          data.targets[0].name === FABRIC
            ? forgeModloader?.version
            : convertcurseForgeToCanonical(
              forgeModloader?.version,
              mcVersion,
              forgeManifest
            ),
        fileID: version?.fileID,
        projectID: version?.projectID,
        source: FTB,
        sourceName: originalMcName
      }

      let ramAmount = null

      const userMemory = Math.round(os.totalmem() / 1024 / 1024)

      if (userMemory < data?.specs?.minimum) {
        try {
          await new Promise((resolve, reject) => {
            dispatch(
              openModal('ActionConfirmation', {
                message: `At least ${data?.specs?.minimum}MB of RAM are required to play this modpack and you only have ${userMemory}MB. You might still be able to play it but probably with low performance. Do you want to continue?`,
                confirmCallback: () => resolve(),
                abortCallback: () => reject(new Error('abort')),
                title: 'Low Memory Warning'
              })
            )
          })
        } catch {
          return
        }
      }
      if (userMemory >= data?.specs?.recommended) {
        ramAmount = data?.specs?.recommended
      } else if (userMemory >= data?.specs?.minimum) {
        ramAmount = data?.specs?.minimum
      }

      await downloadFile(
        path.join(
          instancesPath,
          localInstanceName,
          `background${path.extname(imageURL)}`
        ),
        imageURL
      )

      dispatch(
        addToQueue(
          localInstanceName,
          loader,
          data,
          `background${path.extname(imageURL)}`,
          null,
          ramAmount ? { javaMemory: ramAmount } : null
        )
      )
    } else if (importZipPath) {
      manifest = await importAddonZip(
        importZipPath,
        path.join(instancesPath, localInstanceName),
        path.join(tempPath, localInstanceName),
        tempPath
      )

      const loader = {}

      if (version?.loaderType === FORGE) {
        Object.assign(loader, {
          loaderType: version?.loaderType,
          mcVersion: manifest.minecraft.version,
          loaderVersion: convertcurseForgeToCanonical(
            manifest.minecraft.modLoaders.find(v => v.primary).id,
            manifest.minecraft.version,
            forgeManifest
          )
        })

        dispatch(addToQueue(localInstanceName, loader, manifest))
      } else if (version?.loaderType === FABRIC) {
        Object.assign(loader, {
          loaderType: version?.loaderType,
          mcVersion: manifest.minecraft.version,
          loaderVersion: manifest.minecraft.modLoaders[0].yarn,
          fileID: manifest.minecraft.modLoaders[0].loader
        })

        dispatch(addToQueue(localInstanceName, loader, manifest))
      } else if (version?.loaderType === VANILLA) {
        Object.assign(loader, {
          loaderType: version?.loaderType,
          mcVersion: manifest.minecraft.version
        })

        dispatch(addToQueue(localInstanceName, loader, manifest))
      }
    } else if (isVanilla) {
      dispatch(
        addToQueue(localInstanceName, {
          loaderType: version?.loaderType,
          mcVersion: version?.mcVersion
        })
      )
    } else if (isFabric) {
      dispatch(
        addToQueue(localInstanceName, {
          loaderType: FABRIC,
          mcVersion: version?.mcVersion,
          loaderVersion: version?.loaderVersion,
          downloadStatus: isExists ? 'checking' : 'downloading'
        })
      )
    } else if (isForge) {
      dispatch(
        addToQueue(localInstanceName, {
          loaderType: version?.loaderType,
          mcVersion: version?.mcVersion,
          loaderVersion: version?.loaderVersion
        })
      )
    }

    if (Date.now() - initTimestamp < 2000) {
      await wait(2000 - (Date.now() - initTimestamp))
    }

    dispatch(closeModal())
  }

  return createInstance
}

export default useAddFabricInstance
