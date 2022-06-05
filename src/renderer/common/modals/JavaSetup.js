import React, { useState, useEffect } from 'react'
import { Button, Progress, notification } from 'antd'
import { Transition } from 'react-transition-group'
import { useTheme } from 'styled-components'
import { ipcRenderer } from 'electron'
import fse from 'fs-extra'
import { useSelector, useDispatch } from 'react-redux'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import Modal from '../components/Modal'
import { downloadFile } from '../../app/utils/downloader'
import {
  convertOSToJavaFormat,
  extractAll,
  isLatestJavaDownloaded
} from '../../app/utils'
import { _getTempPath } from '../utils/selectors'
import { closeModal } from '../reducers/modals/actions'
import { updateJavaPath, updateJava17Path } from '../reducers/settings/actions'

const JavaSetup = props => {
  const { checkLatestJavaDownloaded = false } = props

  const [isJava17Downloaded, setIsJava17Downloaded] = useState(null)
  const [java17Log, setJava17Log] = useState(null)
  const java17Manifest = useSelector(state => state.app.java17Manifest)
  const userData = useSelector(state => state.userData)
  const manifests = {
    java17: java17Manifest
  }

  useEffect(() => {
    if (checkLatestJavaDownloaded) {
      isLatestJavaDownloaded(manifests, userData, true, 17)
        .then(e => {
          setIsJava17Downloaded(e?.isValid)
          return setJava17Log(e?.log)
        })
        .catch(err => console.error(err))
    }
  }, [checkLatestJavaDownloaded])

  return (
    <Modal
      title='Java Setup'
      css={`
        height: 380px;
        width: 600px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 20px;
        position: relative;
      `}
      header={false}
    >
      <Transition in timeout={200}>
        <>
          <div
            css={`
              font-size: 28px;
              text-align: center;
              margin-bottom: 20px;
            `}
          >
            Java Setup
          </div>
          <AutomaticSetup
            isJava17Downloaded={isJava17Downloaded}
            java17Log={java17Log}
          />
        </>
      </Transition>
    </Modal>
  )
}

const AutomaticSetup = ({ isJava17Downloaded, java17Log }) => {
  const [downloadPercentage, setDownloadPercentage] = useState(0)
  const [currentSubStep, setCurrentSubStep] = useState('Downloading Java')
  const [currentStepPercentage, setCurrentStepPercentage] = useState(0)
  const java17Manifest = useSelector(state => state.app.java17Manifest)
  const userData = useSelector(state => state.userData)
  const tempFolder = useSelector(_getTempPath)
  // const modals = useSelector(state => state.modals)
  const dispatch = useDispatch()

  notification.config({
    placement: 'topRight',
    top: 50,
    duration: null
  })

  const theme = useTheme()
  const javaToInstall = []
  // useEffect(() => {
  //   if (javaToInstall.length > 0) {
  //     const instanceManagerModalIndex = modals.findIndex(
  //       x => x.modalType === 'JavaSetup'
  //     );

  //     dispatch({
  //       type: UPDATE_MODAL,
  //       modals: [
  //         ...modals.slice(0, instanceManagerModalIndex),
  //         {
  //           modalType: 'JavaSetup',
  //           modalProps: { preventClose: true }
  //         },
  //         ...modals.slice(instanceManagerModalIndex + 1)
  //       ]
  //     });
  //   }
  // }, []);

  if (!isJava17Downloaded) javaToInstall.push(17)

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
        ipcRenderer.invoke('update-progress-bar', p)
        setDownloadPercentage(p)
        setStepPercentage(index, p)
      })

      ipcRenderer.invoke('update-progress-bar', -1)
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
            ipcRenderer.invoke('update-progress-bar', percent)
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
        ipcRenderer.invoke('update-progress-bar', -1)
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
              ipcRenderer.invoke('update-progress-bar', percent)
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
    ipcRenderer.invoke('update-progress-bar', -1)
    setDownloadPercentage(100)
    setCurrentStepPercentage(100)
    await new Promise(resolve => setTimeout(resolve, 2000))
    if (!java17Log) dispatch(closeModal())
  }

  useEffect(() => {
    installJava()
  }, [])

  return (
    <div
      css={`
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
      `}
    >
      {javaToInstall.length > 0
        ? (
          <>
            <div
              css={`
              margin-top: -15px; //cheaty way to get up to the Modal title :P
              margin-bottom: 50px;
              width: 50%;
            `}
            >
              <Progress
                percent={currentStepPercentage}
                strokeColor={theme.palette.primary.main}
                status='normal'
              />
            </div>
            <div
              css={`
              margin-bottom: 20px;
              font-size: 18px;
            `}
            >
              {currentSubStep}
            </div>
            <div
              css={`
              padding: 0 10px;
              width: 100%;
            `}
            >
              {downloadPercentage
                ? (
                  <Progress
                    percent={downloadPercentage}
                    strokeColor={theme.palette.primary.main}
                    status='normal'
                  />
                  )
                : null}
            </div>
          </>
          )
        : (
          <div
            css={`
            display: flex;
            flex-direction: column;
            div {
              display: flex;
              flex-direction: column;
            }
          `}
          >
            <h2>Java is already installed!</h2>
            <div
              css={`
              margin-bottom: 10px;
            `}
            >
              <h3>Java 17 details:</h3>
              <code>{java17Log}</code>
            </div>
          </div>
          )}
      {java17Log && (
        <Button
          css={`
            position: absolute;
            bottom: 0;
            right: 0;
          `}
          type='primary'
          onClick={() => dispatch(closeModal())}
        >
          Close
        </Button>
      )}
    </div>
  )
}

export default JavaSetup
