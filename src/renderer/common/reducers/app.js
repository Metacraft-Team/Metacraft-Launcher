import { combineReducers } from 'redux'
import * as ActionTypes from './actionTypes'

function accounts (state = [], action) {
  const index = state.findIndex(
    account => account && account.selectedProfile.id === action.id
  )
  switch (action.type) {
    case ActionTypes.UPDATE_ACCOUNT:
      return index !== -1
        ? [...state.slice(0, index), action.account, ...state.slice(index + 1)]
        : [...state, action.account]
    case ActionTypes.REMOVE_ACCOUNT:
      return state.filter(
        account => account && account.selectedProfile.id !== action.id
      )
    default:
      return state
  }
}

// Based on account UUID
function currentAccountId (state = null, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_CURRENT_ACCOUNT_ID:
      return action.id
    default:
      return state
  }
}

function vanillaManifest (state = [], action) {
  switch (action.type) {
    case ActionTypes.UPDATE_VANILLA_MANIFEST:
      return action.data
    default:
      return state
  }
}

function fabricManifest (state = [], action) {
  switch (action.type) {
    case ActionTypes.UPDATE_FABRIC_MANIFEST:
      return action.data
    default:
      return state
  }
}

function forgeManifest (state = [], action) {
  switch (action.type) {
    case ActionTypes.UPDATE_FORGE_MANIFEST:
      return action.data
    default:
      return state
  }
}

function curseforgeCategories (state = [], action) {
  switch (action.type) {
    case ActionTypes.UPDATE_CURSEFORGE_CATEGORIES_MANIFEST:
      return action.data
    default:
      return state
  }
}

function java17Manifest (state = {}, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_JAVA17_MANIFEST:
      return action.data
    default:
      return state
  }
}

function lastUpdateVersion (state = null, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_LAST_UPDATE_VERSION:
      return action.version
    default:
      return state
  }
}

function serverMetaData (state = {}, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_SERVER_META_DATA:
      return { ...state, ...action.metaData }
    default:
      return state
  }
}

function extraDependencies (state = {}, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_EXTRA_DEPENDENCIES:
      return action.data
    default:
      return state
  }
}

export default combineReducers({
  accounts,
  currentAccountId,
  vanillaManifest,
  forgeManifest,
  fabricManifest,
  java17Manifest,
  curseforgeCategories,
  lastUpdateVersion,
  serverMetaData,
  extraDependencies
})
