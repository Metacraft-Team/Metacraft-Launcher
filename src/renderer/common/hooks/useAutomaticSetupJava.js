import { useState, useEffect } from 'react'
import { notification } from 'antd'
import fse from 'fs-extra'
import { useSelector, useDispatch } from 'react-redux'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import { downloadFile } from '../../app/utils/downloader'
import { convertOSToJavaFormat, extractAll } from '../../app/utils'
import { _getTempPath } from '../utils/selectors'
import { updateJavaPath, updateJava17Path } from '../reducers/settings/actions'

const useAutomaticSetupJava = ({ shouldInstall }) => {
  const [downloadPercentage, setDownloadPercentage] = useState(0)
  const [currentSubStep, setCurrentSubStep] = useState('Downloading Java')
  const [currentStepPercentage, setCurrentStepPercentage] = useState(0)
  const java17Manifest = useSelector(state => state.app.java17Manifest)
  const userData = useSelector(state => state.userData)
  const tempFolder = useSelector(_getTempPath)
  const dispatch = useDispatch()

  const javaToInstall = [17]

  const installJava = async () => {
    const javaOs = convertOSToJavaFormat(process.platform)
    const java17Meta = java17Manifest.find(
      v =>
        v.os === javaOs &&
        v.architecture === 'x64' &&
        (v.binary_type === 'jre' || v.binary_type === 'jdk')
    )

    const totalExtractionSteps = process.platform !== 'win32' ? 2 : 1
    const totalSteps = (totalExtractionSteps + 1) * javaToInstall.length

    const setStepPercentage = (stepNumber, percentage) => {
      setCurrentStepPercentage(
        parseInt(percentage / totalSteps + (stepNumber * 100) / totalSteps, 10)
      )
    }

    let index = 0
    for (const javaVersion of javaToInstall) {
      const {
        version_data: { openjdk_version: version },
        binary_link: url,
        release_name: releaseName
      } = java17Meta
      const javaBaseFolder = path.join(userData, 'java')

      await fse.remove(path.join(javaBaseFolder, version))
      const downloadLocation = path.join(tempFolder, path.basename(url))

      setCurrentSubStep(`Java ${javaVersion} - Downloading`)
      await downloadFile(downloadLocation, url, p => {
        setDownloadPercentage(p)
        setStepPercentage(index, p)
      })

      index += 1
      setDownloadPercentage(0)
      setStepPercentage(index, 0)
      await new Promise(resolve => setTimeout(resolve, 500))

      setCurrentSubStep(
        `Java ${javaVersion} - Extracting 1 / ${totalExtractionSteps}`
      )
      await extractAll(
        downloadLocation,
        tempFolder,
        {
          $progress: true
        },
        {
          update: percent => {
            setDownloadPercentage(percent)
            setStepPercentage(index, percent)
          }
        }
      )

      index += 1
      setDownloadPercentage(0)
      setStepPercentage(index, 0)

      await fse.remove(downloadLocation)

      // If NOT windows then tar.gz instead of zip, so we need to extract 2 times.
      if (process.platform !== 'win32') {
        await new Promise(resolve => setTimeout(resolve, 500))
        setCurrentSubStep(
          `Java ${javaVersion} - Extracting 2 / ${totalExtractionSteps}`
        )

        const tempTarName = path.join(
          tempFolder,
          path.basename(url).replace('.tar.gz', '.tar')
        )

        await extractAll(
          tempTarName,
          tempFolder,
          {
            $progress: true
          },
          {
            update: percent => {
              setDownloadPercentage(percent)
              setStepPercentage(index, percent)
            }
          }
        )
        await fse.remove(tempTarName)
        index += 1
        setDownloadPercentage(0)
        setStepPercentage(index, 0)
      }

      const directoryToMove =
        process.platform === 'darwin'
          ? path.join(tempFolder, `${releaseName}-jre`, 'Contents', 'Home')
          : path.join(tempFolder, `${releaseName}-jre`)
      await fse.move(directoryToMove, path.join(javaBaseFolder, version))

      await fse.remove(path.join(tempFolder, `${releaseName}-jre`))

      const ext = process.platform === 'win32' ? '.exe' : ''

      if (process.platform !== 'win32') {
        const execPath = path.join(
          javaBaseFolder,
          version,
          'bin',
          `java${ext}`
        )

        await promisify(exec)(`chmod +x "${execPath}"`)
        await promisify(exec)(`chmod 755 "${execPath}"`)
      }
    }

    dispatch(updateJavaPath(null))
    dispatch(updateJava17Path(null))
    setCurrentSubStep('Java is ready!')
    setDownloadPercentage(100)
    setCurrentStepPercentage(100)
    await new Promise(resolve => setTimeout(resolve, 2000))
    notification.close()
  }

  useEffect(() => {
    if (shouldInstall) {
      installJava()
    }
  }, [shouldInstall])

  useEffect(() => {
    if (shouldInstall) {
      notification.open({
        key: 'Java Setup Notification',
        message: `${currentSubStep}`,
        description: `downloadPercentage: ${downloadPercentage}, currentStepPercentage: ${currentStepPercentage}`
      })
    }
  }, [
    shouldInstall,
    currentStepPercentage,
    downloadPercentage,
    currentSubStep
  ])
}

export default useAutomaticSetupJava
