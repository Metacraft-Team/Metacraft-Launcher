import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import { ipcRenderer, clipboard } from 'electron'
import { useSelector, useDispatch } from 'react-redux'
import path from 'path'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import fsa from 'fs-extra'
import { promises as fs } from 'fs'
import {
  faCopy,
  faDownload,
  faTachometerAlt,
  faTrash,
  faPlay,
  faNewspaper,
  faFolder,
  faSort
} from '@fortawesome/free-solid-svg-icons'
import { Select, Tooltip, Button, Switch, Input, Checkbox } from 'antd'
import {
  _getCurrentAccount,
  _getDataStorePath,
  _getInstancesPath,
  _getTempPath
} from '../../../utils/selectors'
import {
  updateHideWindowOnGameLaunch,
  updateInstanceSortType,
  updateShowNews
} from '../../../reducers/settings/actions'
import { updateConcurrentDownloads } from '../../../reducers/actions'
import { openModal } from '../../../reducers/modals/actions'
// import { autoUpdater } from "electron-updater"

const Title = styled.div`
  margin-top: 30px;
  margin-bottom: 5px;
  font-size: 15px;
  font-weight: 700;
  color: ${props => props.theme.palette.text.primary};
  z-index: 1;
  text-align: left;
  -webkit-backface-visibility: hidden;
`

const Content = styled.div`
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  *:first-child {
    margin-right: 15px;
  }
`

const PersonalData = styled.div`
  margin-top: 38px;
  width: 100%;
`

const MainTitle = styled.h1`
  color: ${props => props.theme.palette.text.primary};
  margin: 0 500px 20px 0;
`

const ProfileImage = styled.img`
  position: relative;
  top: 20px;
  left: 20px;
  background: #212b36;
  width: 50px;
  height: 50px;
`

const Uuid = styled.div`
  font-size: smaller;
  font-weight: 200;
  color: ${props => props.theme.palette.grey[100]};
  display: flex;
`

const Username = styled.div`
  font-size: smaller;
  font-weight: 200;
  color: ${props => props.theme.palette.grey[100]};
  display: flex;
`

const PersonalDataContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  background: ${props => props.theme.palette.grey[900]};
  border-radius: ${props => props.theme.shape.borderRadius};
`

const LauncherVersion = styled.div`
  margin: 30px 0;
  p {
    text-align: left;
    color: ${props => props.theme.palette.text.third};
    margin: 0 0 0 6px;
  }

  h1 {
    color: ${props => props.theme.palette.text.primary};
  }
`

const CustomDataPathContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  border-radius: ${props => props.theme.shape.borderRadius};

  h1 {
    width: 100%;
    font-size: 15px;
    font-weight: 700;
    color: ${props => props.theme.palette.text.primary};
    z-index: 1;
    text-align: left;
  }
`

function copy (setCopied, copyText) {
  setCopied(true)
  clipboard.writeText(copyText)
  setTimeout(() => {
    setCopied(false)
  }, 500)
}

function dashUuid (UUID) {
  return `${UUID.substring(0, 8)}-${UUID.substring(8, 12)}-${UUID.substring(
    12,
    16
  )}-${UUID.substring(16, 20)}-${UUID.substring(20, 32)}`
}

const General = () => {
  const tempPath = useSelector(_getTempPath)
  const dataStorePath = useSelector(_getDataStorePath)
  const instancesPath = useSelector(_getInstancesPath)
  const currentAccount = useSelector(_getCurrentAccount)
  const userData = useSelector(state => state.userData)
  const isPlaying = useSelector(state => state.startedInstances)
  const queuedInstances = useSelector(state => state.downloadQueue)
  const showNews = useSelector(state => state.settings.showNews)
  const concurrentDownloads = useSelector(state => state.settings.concurrentDownloads)
  const hideWindowOnGameLaunch = useSelector(state => state.settings.hideWindowOnGameLaunch)
  const instanceSortMethod = useSelector(state => state.settings.instanceSortOrder)
  const [dataPath, setDataPath] = useState(userData)
  const [copiedUuid, setCopiedUuid] = useState(false)
  const [moveUserData, setMoveUserData] = useState(false)
  const [deletingInstances, setDeletingInstances] = useState(false)
  const [loadingMoveUserData, setLoadingMoveUserData] = useState(false)
  const [version, setVersion] = useState(null)
  // const [profileImage, _setProfileImage] = useState(null) // eslint-disable-line

  const dispatch = useDispatch()
  const [updateAvailable, setUpdateAvailable] = useState(false)

  const disableInstancesActions =
    Object.keys(queuedInstances).length > 0 ||
    Object.keys(isPlaying).length > 0

  useEffect(() => {
    ipcRenderer.invoke('getAppVersion')
      .then(setVersion)
      .catch(console.log)
    // if (currentAccount && currentAccount.skin) {
    // extractFace(currentAccount.skin)
    //   .then(setProfileImage)
    //   .catch(console.error)
    // }
  }, [])

  const clearSharedData = async () => {
    setDeletingInstances(true)
    try {
      await fsa.emptyDir(dataStorePath)
      await fsa.emptyDir(instancesPath)
      await fsa.emptyDir(tempPath)
    } catch (e) {
      console.error(e)
    }
    setDeletingInstances(false)
  }

  const changeDataPath = async () => {
    setLoadingMoveUserData(true)
    const appDataPath = await ipcRenderer.invoke('getUserData')
    const notCopiedFiles = [
      'Cache',
      'Code Cache',
      'Dictionaries',
      'GPUCache',
      'Cookies',
      'Cookies-journal'
    ]

    await fsa.writeFile(path.join(appDataPath, 'override.data'), dataPath)

    if (moveUserData) {
      try {
        const files = await fs.readdir(userData)
        await Promise.all(
          files.map(async name => {
            if (!notCopiedFiles.includes(name)) {
              await fsa.copy(
                path.join(userData, name),
                path.join(dataPath, name),
                {
                  overwrite: true
                }
              )
            }
          })
        )
      } catch (e) {
        console.error(e)
      }
    }
    setLoadingMoveUserData(false)
    await ipcRenderer.invoke('appRestart')
  }

  const openFolder = async () => {
    const { filePaths, canceled } = await ipcRenderer.invoke(
      'openFolderDialog',
      userData
    )
    if (!filePaths[0] || canceled) return
    setDataPath(filePaths[0])
  }

  return (
    <>
      <PersonalData>
        <MainTitle>General</MainTitle>
        <PersonalDataContainer>
          <ProfileImage src={currentAccount.selectedProfile.avatar} />
          <div
            css={`
              margin: 20px 20px 20px 40px;
              width: 330px;
              * {
                text-align: left;
              }
            `}
          >
            <div>
              Username <br />
              <Username>{currentAccount.selectedProfile.name}</Username>
            </div>
            <div>
              UUID
              <br />
              <Uuid>
                {dashUuid(currentAccount.selectedProfile.id)}
                <Tooltip title={copiedUuid ? 'Copied' : 'Copy'} placement='top'>
                  <div
                    css={`
                      width: 13px;
                      height: 14px;
                      margin: 0 0 0 10px;
                    `}
                  >
                    <FontAwesomeIcon
                      icon={faCopy}
                      onClick={() =>
                        copy(
                          setCopiedUuid,
                          dashUuid(currentAccount.selectedProfile.id)
                        )}
                    />
                  </div>
                </Tooltip>
              </Uuid>
            </div>
          </div>
        </PersonalDataContainer>
      </PersonalData>
      <Title>
        Concurrent Downloads &nbsp; <FontAwesomeIcon icon={faTachometerAlt} />
      </Title>
      <Content>
        <p>
          Select the number of concurrent downloads. If you have a slow
          connection, select at most 3.
        </p>
        <Select
          onChange={v => dispatch(updateConcurrentDownloads(v))}
          value={concurrentDownloads}
          css={`
            width: 70px;
            text-align: start;
          `}
          virtual={false}
        >
          {[...Array(20).keys()]
            .map(x => x + 1)
            .map(x => (
              <Select.Option key={x} value={x}>
                {x}
              </Select.Option>
            ))}
        </Select>
      </Content>
      <Title>
        Instance Sorting &nbsp; <FontAwesomeIcon icon={faSort} />
      </Title>
      <Content>
        <p css='margin: 0; width: 400px;'>
          Select the method in which instances should be sorted.
        </p>
        <Select
          onChange={v => dispatch(updateInstanceSortType(v))}
          value={instanceSortMethod}
          css='width: 136px; text-align: start;'
        >
          <Select.Option value={0}>Alphabetical</Select.Option>
          <Select.Option value={1}>Last Played</Select.Option>
          <Select.Option value={2}>Most Played</Select.Option>
        </Select>
      </Content>
      <Title>
        Minecraft News &nbsp; <FontAwesomeIcon icon={faNewspaper} />
      </Title>
      <Content>
        <p>Enable / disable Minecraft news.</p>
        <Switch
          onChange={e => {
            dispatch(updateShowNews(e))
          }}
          checked={showNews}
        />
      </Content>
      <Title>
        Hide Launcher While Playing &nbsp; <FontAwesomeIcon icon={faPlay} />
      </Title>
      <Content>
        <p>
          Automatically hide the launcher when launching an instance. You will
          still be able to open it from the icon tray.
        </p>
        <Switch
          onChange={e => {
            dispatch(updateHideWindowOnGameLaunch(e))
          }}
          checked={hideWindowOnGameLaunch}
        />
      </Content>
      <Title>
        Clear Shared Data&nbsp; <FontAwesomeIcon icon={faTrash} />
      </Title>
      <Content>
        <p>
          Deletes all the shared files between instances. Doing this will remove
          ALL instance data.
        </p>
        <Button
          onClick={() => {
            dispatch(
              openModal('ActionConfirmation', {
                message: 'Are you sure you want to delete shared data?',
                confirmCallback: clearSharedData,
                title: 'Confirm'
              })
            )
          }}
          disabled={disableInstancesActions}
          loading={deletingInstances}
        >
          Clear
        </Button>
      </Content>
      <Title>
        User Data Path&nbsp; <FontAwesomeIcon icon={faFolder} />
        <a
          css='margin-left: 30px;'
          onClick={async () => {
            const appDataPath = await ipcRenderer.invoke('getUserData')
            setDataPath(appDataPath)
          }}
        >
          Reset Path
        </a>
      </Title>
      <CustomDataPathContainer>
        <div
          css={`
            display: flex;
            justify-content: space-between;
            text-align: left;
            width: 100%;
            height: 30px;
            margin-bottom: 10px;
            p {
              text-align: left;
              color: ${props => props.theme.palette.text.third};
            }
          `}
        >
          <Input
            value={dataPath}
            onChange={e => setDataPath(e.target.value)}
            disabled={
              loadingMoveUserData ||
              deletingInstances ||
              disableInstancesActions
            }
          />
          <Button
            css='margin-left: 20px;'
            onClick={openFolder}
            disabled={loadingMoveUserData || deletingInstances}
          >
            <FontAwesomeIcon icon={faFolder} />
          </Button>
          <Button
            css='margin-left: 20px;'
            onClick={changeDataPath}
            disabled={
              disableInstancesActions ||
              userData === dataPath ||
              !dataPath ||
              dataPath.length === 0 ||
              deletingInstances
            }
            loading={loadingMoveUserData}
          >
            Apply & Restart
          </Button>
        </div>
        <div
          css={`
            display: flex;
            justify-content: flex-start;
            width: 100%;
          `}
        >
          <Checkbox
            onChange={e => {
              setMoveUserData(e.target.checked)
            }}
          >
            Copy current data to the new directory
          </Checkbox>
        </div>
      </CustomDataPathContainer>
      <LauncherVersion>
        <div
          css={`
            display: flex;
            justify-content: flex-start;
            align-items: center;
            margin: 10px 0;
          `}
        >
          <div css='margin-left: 10px;'>
            v {version}
          </div>
        </div>
        <p>
          {updateAvailable
            ? 'There is an update available to be installed. Click on update to install it and restart the launcher.'
            : 'You’re currently on the latest version. We automatically check for updates and we will inform you whenever one is available.'}
        </p>
        <div
          css={`
            margin-top: 20px;
            height: 36px;
            display: flex;
            flex-direction: row;
          `}
        >
          {updateAvailable
            ? (
              <Button
                onClick={() =>
                  ipcRenderer.invoke('installUpdateAndQuitOrRestart')}
                css={`
                margin-right: 10px;
              `}
                type='primary'
              >
                Update &nbsp;
                <FontAwesomeIcon icon={faDownload} />
              </Button>
              )
            : (
              <div
                css={`
                width: 96px;
                height: 36px;
                padding: 6px 8px;
              `}
              >
                Up to date
              </div>
              )}
        </div>
      </LauncherVersion>
    </>
  )
}

export default General
