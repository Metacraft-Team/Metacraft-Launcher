import React, { useState, useEffect } from 'react'
import { transparentize } from 'polished'
import styled, { keyframes } from 'styled-components'
import { promises as fs } from 'fs'
import { LoadingOutlined } from '@ant-design/icons'
import path from 'path'
import { ipcRenderer } from 'electron'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlay,
  faClock,
  faWrench,
  faFolder,
  faTrash,
  faStop
  // faBoxOpen,
  // faCopy
} from '@fortawesome/free-solid-svg-icons'
import psTree from 'ps-tree'
import { ContextMenuTrigger, ContextMenu, MenuItem } from 'react-contextmenu'
import { useSelector, useDispatch } from 'react-redux'
import {
  _getInstance,
  _getInstancesPath,
  _getDownloadQueue
} from '@common/utils/selectors'
import { launchInstance } from '@common/reducers/actions'
import { openModal } from '@common/reducers/modals/actions'
import instanceDefaultBackground from '@common/assets/instance_default.png'
import { convertMinutesToHumanTime } from '@common/utils'

const Container = styled.div`
  font-family: monospace;
  position: relative;
  width: 260px;
  height: 160px;
  transform: ${p =>
    p.isHovered && !p.installing
      ? 'scale3d(1.1, 1.1, 1.1)'
      : 'scale3d(1, 1, 1)'};
  margin-right: 20px;
  margin-top: 20px;
  transition: transform 150ms ease-in-out;
  &:hover {
    ${p => (p.installing ? '' : 'transform: scale3d(1.1, 1.1, 1.1);')}
  }
`

const Spinner = keyframes`
  0% {
    transform: translate3d(-50%, -50%, 0) rotate(0deg);
  }
  100% {
    transform: translate3d(-50%, -50%, 0) rotate(360deg);
  }
`

const PlayButtonAnimation = keyframes`
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`

const InstanceContainer = styled.div`
  display: flex;
  position: absolute;
  justify-content: center;
  align-items: center;
  text-align: center;
  width: 100%;
  font-size: 20px;
  overflow: hidden;
  height: 100%;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.8)),
    url('${props => props.background}') center no-repeat;
  background-position: center;
  color: ${props => props.theme.palette.text.secondary};
  font-weight: 600;
  background-size: cover;
  border-radius: 4px;
  margin: 10px;
`

const HoverContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 18px;
  margin: 10px;
  text-align: center;
  font-weight: 800;
  border-radius: 4px;
  transition: opacity 150ms ease-in-out;
  width: 100%;
  height: 100%;
  color: white;
  opacity: ${p => (p.installing || p.isHovered ? '1' : '0')};
  backdrop-filter: blur(4px);
  will-change: opacity;
  background: ${p => transparentize(0.5, p.theme.palette.grey[800])};
  &:hover {
    opacity: 1;
  }

  .spinner {
    position: relative;
  }

  .spinner:before {
    animation: 1.5s linear infinite ${Spinner};
    animation-play-state: inherit;
    border: solid 3px transparent;
    border-bottom-color: ${props => props.theme.palette.colors.yellow};
    border-radius: 50%;
    content: '';
    height: 30px;
    width: 30px;
    position: absolute;
    top: 10px;
    transform: translate3d(-50%, -50%, 0);
    will-change: transform;
  }
`

const MCVersion = styled.div`
  position: absolute;
  right: 5px;
  top: 5px;
  font-size: 11px;
  color: ${props => props.theme.palette.text.third};
`

const TimePlayed = styled.div`
  position: absolute;
  left: 5px;
  top: 5px;
  font-size: 11px;
  color: ${props => props.theme.palette.text.third};
`

const MenuInstanceName = styled.div`
  background: ${props => props.theme.palette.grey[800]};
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  color: ${props => props.theme.palette.text.primary};
  padding: 0 20px;
  font-weight: 700;
`

const PlayingIcon = styled(FontAwesomeIcon)`
  color: ${({ theme }) => theme.palette.colors.green};
  font-size: 27px;
  position: absolute;
  margin-left: -6px;
  margin-top: -2px;
  animation: ${PlayButtonAnimation} 0.5s
    cubic-bezier(0.75, -1.5, 0, 2.75);
`

const Instance = ({ instanceName }) => {
  const dispatch = useDispatch()
  const [isHovered, setIsHovered] = useState(false)
  const [background, setBackground] = useState(`${instanceDefaultBackground}`)
  const instance = useSelector(state => _getInstance(state)(instanceName))
  const downloadQueue = useSelector(_getDownloadQueue)
  const currentDownload = useSelector(state => state.currentDownload)
  const startedInstances = useSelector(state => state.startedInstances)
  const instancesPath = useSelector(_getInstancesPath)
  const isInQueue = downloadQueue[instanceName]

  const isPlaying = startedInstances[instanceName]

  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (instance.background && instancesPath && instanceName) {
      fs.readFile(path.join(instancesPath, instanceName, instance.background))
        .then(res =>
          setBackground(`data:image/png;base64,${res.toString('base64')}`)
        )
        .catch(console.warning)
    } else {
      setBackground(`${instanceDefaultBackground}`)
    }
  }, [instance.background, instancesPath, instanceName])

  useEffect(() => {
    if (isPlaying || isInQueue) {
      setIsChecking(false)
    }
  }, [isPlaying, isInQueue])

  const startInstance = () => {
    if (isInQueue || isPlaying) return
    dispatch(launchInstance(instanceName))
  }

  const openFolder = () => {
    ipcRenderer.invoke('openFolder', path.join(instancesPath, instance.name))
  }

  const openConfirmationDeleteModal = () => {
    dispatch(openModal('InstanceDeleteConfirmation', { instanceName }))
  }

  const manageInstance = () => {
    dispatch(openModal('InstanceManager', { instanceName }))
  }

  // const instanceExportCurseForge = () => {
  //   dispatch(openModal('InstanceExportCurseForge', { instanceName }))
  // }

  // const openDuplicateNameDialog = () => {
  //   dispatch(openModal('InstanceDuplicateName', { instanceName }))
  // }

  const killProcess = () => {
    psTree(isPlaying.pid, (err, children) => {
      console.log(err)
      if (children.length) {
        children.forEach(el => {
          process.kill(el.PID)
        })
      } else {
        process.kill(isPlaying.pid)
      }
    })
  }

  return (
    <>
      <ContextMenuTrigger id={instanceName}>
        <Container
          installing={isInQueue}
          onClick={startInstance}
          isHovered={isHovered || isPlaying}
        >
          <InstanceContainer installing={isInQueue} background={background}>
            <TimePlayed>
              <FontAwesomeIcon
                icon={faClock}
                style={{ marginRight: 5 }}
              />

              {convertMinutesToHumanTime(instance.timePlayed)}
            </TimePlayed>
            <MCVersion>{instance.loader?.mcVersion}</MCVersion>
            {instanceName}
          </InstanceContainer>
          <HoverContainer
            installing={isInQueue}
            isHovered={isHovered || isPlaying || isChecking}
          >
            {currentDownload === instanceName
              ? (
                <>
                  <div>
                    {isInQueue ? isInQueue.status : null}
                  </div>
                  {`${
                  Number(isInQueue.percentage) === -1
                    ? ''
                    : `${isInQueue.percentage}%`
                   }`}
                  {Number(isInQueue.percentage) !== -1 && (
                    <LoadingOutlined
                      style={{ position: 'absolute', bottom: 8, right: 8 }}
                    />
                  )}
                </>
                )
              : (
                <>
                  {isPlaying && (
                    <div style={{ width: 20, height: 20, position: 'relative' }}>
                      {isPlaying?.initialized && (
                        <PlayingIcon icon={faPlay} />
                      )}
                      {!isPlaying?.initialized &&
                        <div className='spinner' />}
                    </div>
                  )}
                  {!isChecking && isInQueue ? isInQueue.status || 'In Queue' : ''}
                  {!isChecking && !isInQueue && !isPlaying && 'PLAY'}
                  {isChecking ? 'Prepare for checking' : ''}
                </>
                )}
          </HoverContainer>
        </Container>
      </ContextMenuTrigger>
      <ContextMenu
        id={instance.name}
        onShow={() => setIsHovered(true)}
        onHide={() => setIsHovered(false)}
      >
        <MenuInstanceName>{instanceName}</MenuInstanceName>
        {isPlaying && (
          <MenuItem onClick={killProcess}>
            <FontAwesomeIcon icon={faStop} style={{ marginRight: 10 }} />
            Kill
          </MenuItem>
        )}
        <MenuItem disabled={Boolean(isInQueue)} onClick={manageInstance}>
          <FontAwesomeIcon icon={faWrench} style={{ marginRight: 10 }} />
          Manage
        </MenuItem>
        <MenuItem onClick={openFolder}>
          <FontAwesomeIcon icon={faFolder} style={{ marginRight: 10 }} />
          Open Folder
        </MenuItem>
        <MenuItem divider />
        <MenuItem
          disabled={Boolean(isInQueue) || Boolean(isPlaying)}
          onClick={openConfirmationDeleteModal}
        >
          <FontAwesomeIcon
            icon={faTrash}
            style={{ marginRight: 10 }}
          />
          Delete
        </MenuItem>
      </ContextMenu>
    </>
  )
}

export default Instance
