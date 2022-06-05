import React, { useEffect } from 'react'
import styled from 'styled-components'
import { Switch } from 'react-router-dom'
import { Route } from 'react-router'
import { push } from 'connected-react-router'
import { ipcRenderer } from 'electron'
import { useSelector, useDispatch } from 'react-redux'
import { message } from 'antd'
import {
  initManifests,
  updateUserData,
  updateServerMetaData,
  checkUserData
} from '@common/reducers/actions'
import { globalLoginChecking } from '@common/reducers/loading/actions'
import GlobalStyles from '@common/GlobalStyles'
import RouteBackground from '@common/components/RouteBackground'
import { _getCurrentAccount } from '@common/utils/selectors'
import { openModal } from '@common/reducers/modals/actions'
import { metaCraftServerCheck } from '@common/api'

import { isLatestJavaDownloaded } from '@utils'
import SystemNavbar from '@components/SystemNavbar'
import Message from '@components/Message'

import Login from '@views/Login'
import Home from '@views/Home'
// import Map from '@views/Map'

const Wrapper = styled.div`
  height: 100vh;
  width: 100vw;
`

const Container = styled.div`
  position: absolute;
  top: ${props => props.theme.sizes.height.systemNavbar}px;
  height: calc(100vh - ${props => props.theme.sizes.height.systemNavbar}px);
  width: 100vw;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
  transition-timing-function: cubic-bezier(0.165, 0.84, 0.44, 1);
  will-change: transform;
`

export default function Root () {
  const dispatch = useDispatch()
  const currentAccount = useSelector(_getCurrentAccount)
  const java17Path = useSelector(state => state.settings.java.path17)

  message.config({
    top: 45,
    maxCount: 1
  })

  const getMetaData = () => {
    metaCraftServerCheck()
      .then(async result => {
        const metaData = await dispatch(updateServerMetaData(result.data))
        console.log('metacraft metadata: ', metaData)
        return metaData
      })
      .catch(error => {
        console.error('get metaData failed: ', error)
      })
  }

  const init = async () => {
    dispatch(globalLoginChecking(true))

    const userDataStatic = await ipcRenderer.invoke('getUserData')
    const userData = dispatch(updateUserData(userDataStatic))
    const manifests = await dispatch(initManifests())
    let isJava17Valid = java17Path

    if (!java17Path) {
      ({ isValid: isJava17Valid } = await isLatestJavaDownloaded(
        manifests,
        userData,
        true,
        17
      ))
    }

    if (!isJava17Valid) {
      dispatch(openModal('JavaSetup', { preventClose: true }))
    }

    dispatch(checkUserData())
    dispatch(globalLoginChecking(false))
    getMetaData()
  }

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (!currentAccount) {
      dispatch(push('/'))
    }
  }, [currentAccount])

  return (
    <Wrapper>
      <SystemNavbar />
      <Message />
      <Container>
        <GlobalStyles />
        <RouteBackground />
        <Switch>
          <Route path='/home' exact render={props => <Home {...props} />} />
          {/* <Route path='/map' exact render={props => <Map {...props} />} /> */}
          <Route path='/' render={props => <Login {...props} />} />
        </Switch>
      </Container>
    </Wrapper>
  )
}
