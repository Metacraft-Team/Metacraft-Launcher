import React, { useEffect, useState } from 'react'
import { BlueMapApp } from './pure/BlueMapApp'
import styled from 'styled-components'
import { Radio } from 'antd'

const Container = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
`

const states = ['perspective', 'flat', 'free']
export default function Map () {
  const [size, setSize] = useState('flat')

  useEffect(() => {
    const bluemap = new BlueMapApp(document.getElementById('bluemap-container'))
    window.bluemap = bluemap
    bluemap.load().catch(error => console.error(error))
  }, [])

  function setPerspectiveView () {
    window.bluemap.setPerspectiveView(500, 100)
  }

  function setFlatView () {
    window.bluemap.setFlatView(500, 0)
  }

  function setFreeFlight () {
    window.bluemap.setFreeFlight(500)
  }

  const onControlChange = e => {
    setSize(e.target.value)
    switch (e.target.value) {
      case 'perspective':
        setPerspectiveView()
        break
      case 'flat':
        setFlatView()
        break
      case 'free':
        setFreeFlight()
        break
      default:
        break
    }
  }

  return (
    <>
      <Container id='bluemap-container' />
      <Radio.Group value={size} onChange={onControlChange}>
        {states.map(s => {
          return <Radio.Button value={s} key={s}>{s}</Radio.Button>
        })}
      </Radio.Group>
    </>
  )
}
