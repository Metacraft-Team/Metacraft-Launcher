import React from 'react'
import { useDispatch } from 'react-redux'
import styled from 'styled-components'
import CloseButton from './CloseButton'
import { closeModal } from '../reducers/modals/actions'

const HeaderComponent = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  font-size: 16px;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 10px;
  height: 40px;
  border-radius: 4px;
  color: white;

  h3 {
    line-height: 40px;
    margin: 0;
  }
`

const ModalContainer = styled.div`
  background: ${props => props.theme.palette.grey[700]};
  position: absolute;
  border-radius: 4px;
  padding: 16px 24px;
  height: 70%;
  width: 400px;
  ${'' /* max-height: 700px; */}
`

const ModalContent = styled.div`
  height: ${props => props.header === undefined || props.header === true
    ? 'calc(100% - 40px)'
    : '100%'};
  width: 100%;
  overflow-y: hidden;
  overflow-x: hidden;
  position: relative;
`

const Modal = ({
  header,
  title,
  backBtn,
  children,
  className,
  removePadding,
  closeCallback
}) => {
  const dispatch = useDispatch()

  const closeFunc = () => {
    if (closeCallback) closeCallback()
    dispatch(closeModal())
  }

  return (
    <ModalContainer
      onMouseDown={e => e.stopPropagation()}
      className={className}
    >
      {(header === undefined || header === true) && (
        <HeaderComponent>
          <h3>{title || 'Modal'}</h3>
          <CloseButton onClick={closeFunc} />
        </HeaderComponent>
      )}
      <ModalContent
        header={header}
        removePadding={removePadding}
      >
        <span onClick={closeFunc}>{backBtn !== undefined && backBtn}</span>
        {children}
      </ModalContent>
    </ModalContainer>
  )
}

export default Modal
