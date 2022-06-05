import { combineReducers } from 'redux'
import * as ActionTypes from './actionTypes'
import {
  DEFAULT_JAVA_ARGS,
  DEFAULT_MEMORY
} from '../../../app/utils/constants'
import { MC_STARTUP_METHODS } from '../../utils/constants'

function sounds (state = true, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_SOUNDS:
      return action.sounds
    default:
      return state
  }
}

// 0 is Alphabetical, 1 is last played, 2 is most played
function instanceSortOrder (state = 0, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_INSTANCE_SORT_METHOD:
      return action.value
    default:
      return state
  }
}

// 0 is stable, 1 is beta
function concurrentDownloads (state = 20, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_CONCURRENT_DOWNLOADS:
      return action.concurrentDownloads
    default:
      return state
  }
}

function hideWindowOnGameLaunch (state = false, action) {
  switch (action.type) {
    case ActionTypes.HIDE_WINDOW_ON_GAME_LAUNCH:
      return action.hideWindow
    default:
      return state
  }
}

function showNews (state = false, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_SHOW_NEWS:
      return action.value
    default:
      return state
  }
}

function minecraftSettings (
  state = { resolution: { height: 480, width: 854 } },
  action
) {
  switch (action.type) {
    case ActionTypes.UPDATE_MINECRAFT_RESOLUTION:
      return {
        ...state,
        resolution: { ...state.resolution, ...action.resolution }
      }
    default:
      return state
  }
}

function mcStartupMethod (state = MC_STARTUP_METHODS.DEFAULT, action) {
  switch (action.type) {
    case ActionTypes.UPDATE_MC_STARTUP_METHOD:
      return action.method
    default:
      return state
  }
}

function java (
  state = {
    path: null,
    path17: null,
    memory: DEFAULT_MEMORY,
    args: DEFAULT_JAVA_ARGS
  },
  action
) {
  switch (action.type) {
    case ActionTypes.UPDATE_JAVA_ARGUMENTS:
      return { ...state, args: action.args }
    case ActionTypes.UPDATE_JAVA_MEMORY:
      return { ...state, memory: action.memory }
    case ActionTypes.UPDATE_JAVA_PATH: {
      return { ...state, path: action.path }
    }
    case ActionTypes.UPDATE_JAVA17_PATH: {
      return { ...state, path17: action.path }
    }
    default:
      return state
  }
}

export default combineReducers({
  sounds,
  instanceSortOrder,
  concurrentDownloads,
  hideWindowOnGameLaunch,
  showNews,
  java,
  minecraftSettings,
  mcStartupMethod
})
