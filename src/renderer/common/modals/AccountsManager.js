import React, { useCallback } from 'react'
import styled from 'styled-components'
import { Spin, message } from 'antd'
import { useSelector, useDispatch } from 'react-redux'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { push } from 'connected-react-router'
import { ipcRenderer } from 'electron'
import Modal from '../components/Modal'
import { _getAccounts, _getCurrentAccount } from '../utils/selectors'
import { closeModal } from '../reducers/modals/actions'
import {
  updateCurrentAccountId,
  updateAccount,
  removeAccount,
  metaCraftValidate
} from '../reducers/actions'
import { loginViaETH } from '../reducers/loading/actions'

const DeleteIcon = styled.div`
  margin-left: 10px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  height: 40px;
  align-items: center;
  justify-content: center;
  color: white;
  transition: color 0.1s ease-in-out;
  &:hover {
    color: ${props => props.theme.palette.error.main};
  }
`

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-content: space-between;
`

const AccountItem = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  flex: 1;
  justify-content: space-between;
  height: 40px;
  padding: 0 10px;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  ${props =>
    props.active ? `background: ${props.theme.palette.primary.main};` : ''}
  transition: background 0.1s ease-in-out;
  &:hover {
    ${props =>
      props.active ? '' : `background: ${props.theme.palette.grey[600]};`}
  }
`

const HoverContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  left: 0;
  align-items: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: 800;
  border-radius: 4px;
  transition: opacity 150ms ease-in-out;
  width: 100%;
  height: 100%;
  opacity: 0;
  backdrop-filter: blur(4px);
  will-change: opacity;
  &:hover {
    opacity: 1;
  }
`

const AccountsContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: auto;
  padding-right: 2px;
  display: flex;
  flex-direction: column;
  flex: 1;
`

const AccountContainer = styled.div`
  display: flex;
  position: relative;
  width: 100%;
  justify-content: space-between;
  align-items: flex-start;
`

const ProfileSettings = () => {
  const dispatch = useDispatch()
  const accounts = useSelector(_getAccounts)
  const currentAccount = useSelector(_getCurrentAccount)
  const isLoading = useSelector(state => state.loading.accountAuthentication)
  const handleAddAccount = useCallback(() => {
    dispatch(closeModal())
    dispatch(push('/'))
  }, [])

  const onAccountClick = async account => {
    if (
      isLoading.isRequesting ||
      account.selectedProfile.id ===
        currentAccount.selectedProfile.id ||
      !account.accessToken
    ) {
      return
    }
    const currentId = currentAccount.selectedProfile.id
    dispatch(
      updateCurrentAccountId(account.selectedProfile.id)
    )

    await dispatch(
      metaCraftValidate({
        accessToken: account.accessToken
      })
    ).catch(e => {
      dispatch(updateCurrentAccountId(currentId))
      dispatch(
        updateAccount(account.selectedProfile.id, {
          ...account,
          accessToken: null
        })
      )
      message.error('Account not valid')
      console.error(e)
    })

    dispatch(closeModal())
  }

  return (
    <Modal title='Account Manager'>
      <Container>
        <AccountsContainer>
          {accounts.map(account => {
            if (!account || !currentAccount) return null
            return (
              <AccountContainer key={account.selectedProfile.id}>
                <AccountItem
                  active={
                    account.selectedProfile.id ===
                    currentAccount.selectedProfile.id
                  }
                  onClick={() => onAccountClick(account)}
                >
                  <div>
                    {account.selectedProfile.name}{' '}
                    <span style={{ color: '#F20404' }}>
                      {!account.accessToken && '(EXPIRED)'}
                    </span>
                  </div>
                  {!account.accessToken && (
                    <HoverContainer
                      onClick={async () => {
                        dispatch(closeModal())
                        await dispatch(push('/'))
                        ipcRenderer.invoke(
                          'loginWithMetamask',
                          account.address
                        )
                        dispatch(loginViaETH(true))
                      }}
                    >
                      Login again
                    </HoverContainer>
                  )}
                  {account.selectedProfile.id ===
                    currentAccount.selectedProfile.id && (
                      <Spin spinning={isLoading.isRequesting} />
                  )}
                </AccountItem>
                <DeleteIcon>
                  <FontAwesomeIcon
                    onClick={async () => {
                      const result = await dispatch(
                        removeAccount(account.selectedProfile.id)
                      )
                      if (!result) {
                        dispatch(closeModal())
                      }
                    }}
                    icon={faTrash}
                  />
                </DeleteIcon>
              </AccountContainer>
            )
          })}
        </AccountsContainer>
        <AccountContainer>
          <AccountItem onClick={handleAddAccount}>Add Account</AccountItem>
        </AccountContainer>
      </Container>
    </Modal>
  )
}

export default ProfileSettings
