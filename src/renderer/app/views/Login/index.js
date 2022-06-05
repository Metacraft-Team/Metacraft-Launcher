import React, { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ipcRenderer } from 'electron'
import { Transition } from 'react-transition-group'
// import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faExternalLinkAlt,
  faQuestionCircle
} from '@fortawesome/free-solid-svg-icons'
import { loginMetamask } from '@common/reducers/actions'
import { load, loginViaETH } from '@common/reducers/loading/actions'
import features from '@common/reducers/loading/features'
import backgroundImg from '@common/assets/background.png'
import whitepaperIcon from '@common/assets/whitepaper.png'
import twitterIcon from '@common/assets/twitter.png'
import githubIcon from '@common/assets/github.png'
import discordIcon from '@common/assets/discord.png'
import metaCraftLogo from '@common/assets/metaCraft-logo.svg'
import logoWithoutText from '@common/assets/logo.png'
import formatAddress from '@common/utils/formatAddress'
import {
  SocialMediaContainer,
  SocialMediaIcon,
  ButtonGroup,
  CenteredButton,
  CancelButton,
  AccountInfoContainer,
  AccountInfoLabel,
  AccountInfoContent,
  HelpLink,
  Logo,
  Container,
  LeftSide,
  Background,
  Header,
  Content,
  Footer,
  Loading,
  FlexCenter
} from './style'

const Login = () => {
  console.log('login')
  const dispatch = useDispatch()
  const [isConfirmAccount, setConfirmAccount] = useState(false)

  // account informations which received from matemask
  const [params, setParams] = useState(null)
  const [setLoginFailed] = useState(false)

  const isGlobalLodingChecking = useSelector(state => state.loading.isGlobalLodingChecking)
  const loading = useSelector(state => state.loading.isLoginViaEth)

  const openChromeWithMetamask = useCallback(() => {
    ipcRenderer.invoke('loginWithMetamask')
    dispatch(loginViaETH(true))
  }, [dispatch])

  const handleLogin = () => {
    console.log(params)
    dispatch(
      load(
        features.mcAuthentication,
        dispatch(
          loginMetamask({
            address: params.checksumAddress,
            username: params.name,
            timestamp: Number(params.timestamp),
            signature: params.signature
          })
        )
      )
    ).catch(error => {
      console.error(error)
      setLoginFailed(error)
    })
  }

  const handleCancel = useCallback(() => {
    dispatch(loginViaETH(false))
    setConfirmAccount(false)
    // clear old account informations
    setParams(null)
  }, [dispatch, setConfirmAccount, setParams])

  useEffect(() => {
    ipcRenderer.on('receive-metamask-login-params', (e, received) => {
      console.log('authenticate ....')
      dispatch(loginViaETH(false))
      setParams(received)
      setConfirmAccount(true)
    })

    return () => {
      ipcRenderer.removeAllListeners('receive-metamask-login-params')
    }
  }, [dispatch, setParams])

  return (
    <Transition timeout={300}>
      {transitionState => (
        <Container>
          <LeftSide transitionState={transitionState}>
            <a
              href='https://metacraft.cc/'
              rel='noopener noreferrer'
            >
              <Logo
                src={metaCraftLogo}
                alt='Metacraft'
                style={{ cursor: 'pointer' }}
              />
            </a>
            <Header>
              <a
                href='https://metacraft.cc/'
                rel='noopener noreferrer'
              >
                <img
                  src={logoWithoutText}
                  alt='Metacraft'
                  style={{ cursor: 'pointer' }}
                />
              </a>
            </Header>
            <Content>
              <AccountInfoContainer
                direction='vertical'
                align='center'
                size={14}
              >
                {isConfirmAccount
                  ? (
                    <>
                      <div>
                        <AccountInfoLabel>Address</AccountInfoLabel>
                        <AccountInfoContent>
                          {formatAddress(params.address)}
                        </AccountInfoContent>
                      </div>
                      <div>
                        <AccountInfoLabel>Nickname</AccountInfoLabel>
                        <AccountInfoContent>{params.name}</AccountInfoContent>
                      </div>
                    </>
                    )
                  : null}
              </AccountInfoContainer>
              <ButtonGroup direction='vertical' align='center'>
                {isConfirmAccount
                  ? (
                    <>
                      <CenteredButton onClick={handleLogin}>Login</CenteredButton>
                      <CancelButton onClick={handleCancel}>Cancel</CancelButton>
                    </>
                    )
                  : (
                    <>
                      <CenteredButton onClick={loading ? () => { console.log('--------') } : openChromeWithMetamask}>
                        {loading || isGlobalLodingChecking
                          ? 'authing...'
                          : (
                            <FlexCenter>
                              <div style={{ marginRight: 12 }}>Sign in with Metamask</div>
                              <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </FlexCenter>
                            )}
                      </CenteredButton>
                      {loading && <CancelButton onClick={handleCancel}>Cancel</CancelButton>}
                    </>
                    )}
              </ButtonGroup>
              {isConfirmAccount
                ? null
                : (
                  <HelpLink href='https://docs.metacraft.cc/guides/how-to-install-and-use-metamask'>
                    How to install and use Metamask?
                    <FontAwesomeIcon
                      style={{ marginLeft: 6 }}
                      icon={faQuestionCircle}
                    />
                  </HelpLink>
                  )}
              <HelpLink
                href='https://docs.metacraft.cc/guides/beginners-guide'
                style={{ marginLeft: 6 }}
              >
                How to play metacraft?
                <FontAwesomeIcon
                  style={{ marginLeft: 6 }}
                  icon={faQuestionCircle}
                />
              </HelpLink>
              {/* <Link
                // href='https://docs.metacraft.cc/guides/beginners-guide'
                to='/map'
                style={{ marginLeft: 6 }}
              >
                How to play?
                <FontAwesomeIcon
                  style={{ marginLeft: 6 }}
                  icon={faQuestionCircle}
                />
              </Link> */}
            </Content>
            <Footer>
              <SocialMediaContainer>
                <a href='https://docs.metacraft.cc/guides'>
                  <SocialMediaIcon>
                    <img src={whitepaperIcon} alt='Guides' />
                    <p>Docs</p>
                  </SocialMediaIcon>
                </a>
                <a href='https://twitter.com/MetacraftCC'>
                  <SocialMediaIcon>
                    <img src={twitterIcon} alt='twitter' />
                    <p>Twitter</p>
                  </SocialMediaIcon>
                </a>
                <a href='https://discord.com/invite/PvzFHa4QJd'>
                  <SocialMediaIcon>
                    <img src={discordIcon} alt='discord' />
                    <p>Discord</p>
                  </SocialMediaIcon>
                </a>
                <a href='https://github.com/Metacraft-Team'>
                  <SocialMediaIcon>
                    <img src={githubIcon} alt='github' />
                    <p>Github</p>
                  </SocialMediaIcon>
                </a>
              </SocialMediaContainer>
            </Footer>
          </LeftSide>
          <Background transitionState={transitionState}>
            <img src={backgroundImg} alt='background' />
          </Background>
          <Loading transitionState={transitionState}>Loading...</Loading>
        </Container>
      )}
    </Transition>
  )
}

export default Login
