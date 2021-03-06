import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { useDispatch, useSelector } from 'react-redux'
import { Progress } from 'antd'
import Modal from '../components/Modal'
import { updateMod } from '../reducers/actions'
import { closeModal } from '../reducers/modals/actions'
import { _getInstance } from '../utils/selectors'

const ModsUpdater = ({ instanceName }) => {
  const dispatch = useDispatch()
  const latestMods = useSelector(state => state.latestModManifests)
  const instance = useSelector(state => _getInstance(state)(instanceName))
  const [computedMods, setComputedMods] = useState(0)
  const [installProgress, setInstallProgress] = useState(null)

  const filterAvailableUpdates = () => {
    return instance.mods.filter(mod => {
      return (
        latestMods[mod.projectID] &&
        latestMods[mod.projectID].id !== mod.fileID
      )
    })
  }

  const totalMods = useMemo(() => filterAvailableUpdates(), [])

  useEffect(() => {
    let cancel = false
    const updateMods = async () => {
      let i = 0
      while (i < totalMods.length) {
        const mod = totalMods[i]
        await dispatch(
          updateMod(
            instanceName,
            mod,
            latestMods[mod.projectID].id,
            instance.loader?.mcVersion,
            p => { setInstallProgress(p) }
          )
        )
        setComputedMods(p => p + 1)
        i += 1
      }
      if (!cancel) {
        dispatch(closeModal())
      }
    }

    updateMods()
    return () => {
      cancel = true
    }
  }, [])

  return (
    <Modal
      css={`
        height: 160px;
        width: 350px;
      `}
      title='Mods Updater'
    >
      <Container>
        Updating mod {computedMods} / {totalMods.length}
        {installProgress !== null && (
          <Progress percent={parseInt(installProgress, 10)} />
        )}
      </Container>
    </Modal>
  )
}

export default ModsUpdater

const Container = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-content: space-between;
  justify-content: center;
  text-align: center;
  font-size: 20px;
`
