import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import styled from 'styled-components'
import { closeModal } from '../reducers/modals/actions'
import Settings from '../modals/Settings'
import AccountsManager from '../modals/AccountsManager'
import AddInstance from '../modals/AddInstance'
import InstanceDeleteConfirmation from '../modals/InstanceDeleteConfirmation'
import JavaSetup from '../modals/JavaSetup.js'
import InstanceCrashed from '../modals/InstanceCrashed.js'
import InstanceManager from '../modals/InstanceManager'
import AddAccount from '../modals/AddAccount'
import Screenshot from '../modals/Screenshot'
import ActionConfirmation from '../modals/ActionConfirmation'
import ModpackDescription from '../modals/ModpackDescription'
import InstanceExportCurseForge from '../modals/InstanceExport/CurseForge'
import AutoUpdatesNotAvailable from '../modals/AutoUpdatesNotAvailable'
import ModsBrowser from '../modals/ModsBrowser.js'
import ModsUpdater from '../modals/ModsUpdater.js'
import McVersionChanger from '../modals/McVersionChanger.js'
import PolicyModal from '../modals/PolicyModal.js'
import InstancesMigration from '../modals/InstancesMigration.js'
import ChangeLogs from '../modals/ChangeLogs/index.js'
import ModOverview from '../modals/ModOverview.js'
import ModChangelog from '../modals/ModChangelog.js'

const Overlay = styled.div`
  position: absolute;
  top: ${props => props.theme.sizes.height.systemNavbar}px;
  left: 0;
  bottom: 0;
  right: 0;
  backdrop-filter: blur(4px);
  will-change: opacity;
  z-index: 1000;
`

const Modal = styled.div`
  position: absolute;
  height: 100%;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: transparent;
  will-change: transform;
  z-index: 1001;
`

const modalsComponentLookupTable = {
  AddInstance,
  AccountsManager,
  Settings,
  InstanceDeleteConfirmation,
  JavaSetup,
  InstanceCrashed,
  AddAccount,
  InstanceManager,
  Screenshot,
  ActionConfirmation,
  ModpackDescription,
  InstanceExportCurseForge,
  AutoUpdatesNotAvailable,
  ModsBrowser,
  ModsUpdater,
  ChangeLogs,
  InstancesMigration,
  McVersionChanger,
  PolicyModal,
  ModOverview,
  ModChangelog
}

const ModalContainer = ({
  unmounting,
  children,
  preventClose,
  closeCallback
}) => {
  const [modalStyle, setModalStyle] = useState({
    opacity: 0
  })
  const [bgStyle, setBgStyle] = useState({
    background: 'rgba(0, 0, 0, 0.70)',
    opacity: 0
  })

  const dispatch = useDispatch()

  useEffect(() => {
    setTimeout(mountStyle, 0)
  }, [])

  useEffect(() => {
    if (unmounting) unMountStyle()
    else mountStyle()
  }, [unmounting])

  const back = () => {
    if (preventClose) {
      setModalStyle({
        animation: 'modalShake 0.25s linear infinite'
      })

      setTimeout(() => {
        setModalStyle({
          transform: 'scale(1)'
        })
      }, 500)
      return
    }
    if (closeCallback) closeCallback()
    dispatch(closeModal())
  }

  const unMountStyle = () => {
    setModalStyle({
      opacity: 0
    })
    setBgStyle({
      background: 'rgba(0, 0, 0, 0.70)',
      opacity: 0
    })
  }

  const mountStyle = () => {
    setModalStyle({
      opacity: 1
    })

    setBgStyle({
      background: 'rgba(0, 0, 0, 0.70)',
      opacity: 1
    })
  }

  return (
    <Overlay onMouseDown={back} style={bgStyle}>
      <Modal style={modalStyle}>{children}</Modal>
    </Overlay>
  )
}

const ModalsManager = () => {
  const currentModals = useSelector(state => state.modals)

  const renderedModals = currentModals.map(modalDescription => {
    const { modalType, modalProps = {}, unmounting = false } = modalDescription
    const ModalComponent = modalsComponentLookupTable[modalType]

    return (
      <ModalContainer
        unmounting={unmounting}
        key={modalType}
        preventClose={modalProps.preventClose}
        closeCallback={modalProps.abortCallback}
        modalType={modalType}
      >
        <ModalComponent {...modalProps} />
      </ModalContainer>
    )
  })

  return renderedModals
}

export default ModalsManager
