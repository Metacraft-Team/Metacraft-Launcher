import localForage from 'localforage'
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2'

try {
  localForage.config({
    driver: localForage.INDEXEDDB,
    name: 'metacraft',
    version: 2.1,
    storeName: 'metacraft'
  })
} catch (error) {
  console.error(error)
}

export default {
  key: 'root',
  storage: localForage,
  whitelist: ['settings', 'app'],
  stateReconciler: autoMergeLevel2
}
