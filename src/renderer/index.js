import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { ThemeProvider } from 'styled-components'
import { PersistGate } from 'redux-persist/integration/react'
import { ConnectedRouter } from 'connected-react-router'
import { configureStore, history } from '@common/store/configureStore'
import ModalsManager from '@common/components/ModalsManager'
import ErrorBoundary from '@common/ErrorBoundary'
import GlobalStyle from './ui/GlobalStyle'
import theme from './ui/theme'
import Root from './root.js'
import 'typeface-roboto'
import 'inter-ui'
import './index.less'

const { store, persistor } = configureStore()
window.store = store

ReactDOM.render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ThemeProvider theme={theme}>
        <ConnectedRouter history={history}>
          <ErrorBoundary>
            <ModalsManager />
            <GlobalStyle />
            <Root />
          </ErrorBoundary>
        </ConnectedRouter>
      </ThemeProvider>
    </PersistGate>
  </Provider>,
  document.getElementById('root')
)
