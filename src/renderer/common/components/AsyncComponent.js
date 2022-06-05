import React, { Suspense } from 'react'

function WaitingComponent (MyComponent) {
  return props => (
    <Suspense fallback='loading...'>
      <MyComponent {...props} />
    </Suspense>
  )
}

export default WaitingComponent
