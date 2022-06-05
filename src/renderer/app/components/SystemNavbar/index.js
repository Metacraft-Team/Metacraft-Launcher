import React, { useEffect, useState } from 'react'
import { ipcRenderer } from 'electron'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useSelector, useDispatch } from 'react-redux'
import {
  faWindowMinimize,
  faWindowMaximize,
  faWindowRestore,
  faTimes,
  faCog
} from '@fortawesome/free-solid-svg-icons'
import { openModal } from '@common/reducers/modals/actions'
import { MainContainer, Container } from './style'

export default function SystemNavbar () {
  const [isMaximized, setIsMaximized] = useState(false)
  const dispatch = useDispatch()
  const location = useSelector(state => state.router.location.pathname)

  useEffect(() => {
    ipcRenderer.on('window-maximized', () => {
      setIsMaximized(true)
    })
    ipcRenderer.on('window-minimized', () => {
      setIsMaximized(false)
    })
  }, [])

  const quitApp = () => {
    ipcRenderer.invoke('quit-app')
  }

  const isLocation = loc => loc === location

  return (
    <MainContainer onDoubleClick={() => { ipcRenderer.invoke('min-max-window') }}>
      <Container>
        <div onClick={quitApp}>
          <FontAwesomeIcon icon={faTimes} />
        </div>
        <div onClick={() => ipcRenderer.invoke('min-max-window')}>
          <FontAwesomeIcon icon={isMaximized ? faWindowRestore : faWindowMaximize} />
        </div>
        <div onClick={() => ipcRenderer.invoke('minimize-window')}>
          <FontAwesomeIcon icon={faWindowMinimize} />
        </div>
        {isLocation('/home') && (
          <div onClick={() => dispatch(openModal('Settings'))}>
            <FontAwesomeIcon icon={faCog} />
          </div>
        )}
      </Container>
    </MainContainer>
  )
}
