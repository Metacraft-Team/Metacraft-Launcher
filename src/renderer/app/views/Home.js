import React, { useEffect } from 'react'
import styled from 'styled-components'
import { Button } from 'antd'
import { useSelector, useDispatch } from 'react-redux'
import { openModal } from '@common/reducers/modals/actions'
import { _getCurrentAccount } from '@common/utils/selectors'
import { useAddFabricInstance } from '@common/hooks'
import {
  FABRIC,
  MC_VERSION,
  FABRIC_LOADER_VERSION
} from '@common/utils/constants'
import { isLatestJavaDownloaded } from '@utils'
import Instances from '@components/Instances'

const AccountContainer = styled(Button)`
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  align-items: center;
`

function Home () {
  const dispatch = useDispatch()
  const account = useSelector(_getCurrentAccount)
  const userData = useSelector(state => state.userData)
  const java17Path = useSelector(state => state?.settings?.java?.path17)
  const java17Manifest = useSelector(state => state?.app?.java17Manifest)
  // const [profileImage, setProfileImage] = useState(null);

  const openAccountModal = () => {
    dispatch(openModal('AccountsManager'))
  }

  const createInstance = useAddFabricInstance({
    instanceVersion: {
      loaderType: FABRIC,
      loaderVersion: FABRIC_LOADER_VERSION,
      mcVersion: MC_VERSION
    }
  })

  const checkAndInstallJava = async () => {
    const store = window.store
    let isJava17Valid = java17Path
    if (!java17Path) {
      ({ isValid: isJava17Valid } = await isLatestJavaDownloaded(
        { java17: java17Manifest }, userData, true, 17))
    }

    if (!isJava17Valid) {
      dispatch(openModal('JavaSetup', { preventClose: true }))

      // Super duper hacky solution to await the modal to be closed...
      // Please forgive me
      await new Promise(resolve => {
        function checkModalStillOpen (state) {
          return state.modals.find(v => v.modalType === 'JavaSetup')
        }

        let currentValue
        const unsubscribe = store.subscribe(() => {
          const previousValue = currentValue
          currentValue = store.getState().modals.length
          if (previousValue !== currentValue) {
            const stillOpen = checkModalStillOpen(store.getState())

            if (!stillOpen) {
              unsubscribe()
              return resolve()
            }
          }
        })
      })
    }
  }

  useEffect(() => {
    const init = async () => {
      if (!java17Path && userData) {
        await checkAndInstallJava()
      }
      if (userData) {
        createInstance()
      }
    }

    init()
  }, [userData])

  return (
    <>
      <Instances />
      <AccountContainer type='primary' onClick={openAccountModal}>
        {account && account.selectedProfile.name}
      </AccountContainer>
    </>
  )
}

export default Home
