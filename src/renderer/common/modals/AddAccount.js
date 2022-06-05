import React, { useState } from 'react'
import styled from 'styled-components'
import { useDispatch } from 'react-redux'
import { Input, Button, Menu } from 'antd'
import Modal from '../components/Modal'
import { load } from '../reducers/loading/actions'
import features from '../reducers/loading/features'
import { login } from '../reducers/actions'
import { closeModal } from '../reducers/modals/actions'
import { ACCOUNT_MOJANG } from '../utils/constants'

const AddAccount = ({ username }) => {
  const dispatch = useDispatch()
  const [email, setEmail] = useState(username || '')
  const [password, setPassword] = useState('')
  const [accountType, setAccountType] = useState(ACCOUNT_MOJANG)

  const addAccount = () => {
    dispatch(
      load(features.mcAuthentication, dispatch(login(email, password, false)))
    )
      .then(() => dispatch(closeModal()))
      .catch(console.error)
  }

  const renderAddMojangAccount = () => (
    <Container>
      <FormContainer>
        <h1
          css={`
            height: 80px;
          `}
        >
          Mojang Login
        </h1>
        <StyledInput
          disabled={!!username}
          placeholder='Email'
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <StyledInput
          type='password'
          placeholder='Password'
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </FormContainer>
      <FormContainer>
        <StyledButton onClick={addAccount}>Add Account</StyledButton>
      </FormContainer>
    </Container>
  )

  return (
    <Modal
      css={`
        height: 450px;
        width: 420px;
      `}
      title=' '
    >
      <Container>
        <Menu
          mode='horizontal'
          selectedKeys={[accountType]}
          overflowedIndicator={null}
        >
          <StyledAccountMenuItem
            key={ACCOUNT_MOJANG}
            onClick={() => setAccountType(ACCOUNT_MOJANG)}
          >
            Mojang Account
          </StyledAccountMenuItem>
        </Menu>
        {accountType === ACCOUNT_MOJANG ? renderAddMojangAccount() : null}
      </Container>
    </Modal>
  )
}

export default AddAccount

const StyledButton = styled(Button)`
  width: 40%;
`

const StyledInput = styled(Input)`
  margin-bottom: 20px !important;
`

const StyledAccountMenuItem = styled(Menu.Item)`
  width: auto;
  height: auto;
  font-size: 18px;
`

const FormContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-content: space-between;
  justify-content: center;
`
