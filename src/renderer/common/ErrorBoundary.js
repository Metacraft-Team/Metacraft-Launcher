import React from 'react'
import { Button } from 'antd'
import creeper from './assets/creeper.png'
import styled from 'styled-components'

const Container = styled.div`
  -webkit-user-select: none;
  user-select: none;
  cursor: default;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px;
`

export default class ErrorBoundary extends React.Component {
  static getDerivedStateFromError (error) {
    return { error: error.message }
  }

  constructor (props) {
    super(props)
    this.state = { error: null, info: null }
  }

  componentDidCatch (error, info) {
    this.setState(prevState => {
      return {
        ...prevState,
        error: prevState.error
          ? `${prevState.error} / ${error.message}`
          : error.message,
        info: info.componentStack || prevState.info
      }
    })
  }

  render () {
    const { error, info } = this.state
    const { children } = this.props
    if (error) {
      // You can render any custom fallback UI
      return (
        <Container>
          <img src={creeper} alt='creeper' />
          <h1 style={{ color: '#E1E2E4' }}>
            WE’RE SSSSSSORRY. Metacraft ran into a creeper and blew up..
          </h1>
          <div style={{ marginTop: 20 }}>
            {error} <br />
            {info}
          </div>
          <Button
            type='primary'
            onClick={() => { require('electron').ipcRenderer.invoke('appRestart') }}
            style={{ marginTop: 30 }}
          >
            Restart Metacraft
          </Button>
        </Container>
      )
    }
    return children
  }
}
