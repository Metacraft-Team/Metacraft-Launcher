import React, { useState } from 'react'
import Modal from '../../components/Modal'
import InstanceName from './InstanceName'
import Content from './Content'

const AddInstance = ({ defaultPage }) => {
  const [version, setVersion] = useState(null)
  const [step, setStep] = useState(0)
  const [modpack, setModpack] = useState(null)
  const [importZipPath, setImportZipPath] = useState('')
  const [page, setPage] = useState(defaultPage)

  return (
    <Modal
      style={{
        height: '85%',
        width: '80%',
        maxWidth: 1000,
        overflow: 'hidden'
      }}
      title='Add New Instance'
    >
      <Content
        in={step === 0}
        page={page}
        setPage={setPage}
        setStep={setStep}
        setVersion={setVersion}
        version={version}
        setModpack={setModpack}
        modpack={modpack}
        setImportZipPath={setImportZipPath}
        importZipPath={importZipPath}
      />
      <InstanceName
        version={version}
        in={step === 1}
        setStep={setStep}
        modpack={modpack}
        setVersion={setVersion}
        setModpack={setModpack}
        importZipPath={importZipPath}
        step={step}
      />
    </Modal>
  )
}

export default AddInstance
