import * as ActionTypes from './actionTypes'
import features from './features'

const FEATURES = Object.values(features)

const defaultState = FEATURES.reduce(
  (previous, current) => ({
    ...previous,

    [current]: {
      isRequesting: false,
      isReceived: false,
      error: null,
      updated: null,
      isLoginViaEth: false,
      isGlobalLodingChecking: false
    }
  }),
  {}
)

function loading (state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.REQUEST_DATA:
      return {
        ...state,

        [action.feature]: {
          ...state[action.feature],
          isRequesting: true,
          isReceived: false,
          error: null
        }
      }
    case ActionTypes.RECEIVED_DATA:
      return {
        ...state,

        [action.feature]: {
          ...state[action.feature],
          isRequesting: false,
          isReceived: true,
          updated: new Date().toISOString()
        }
      }
    case ActionTypes.CATCH_ERROR:
      return {
        ...state,

        [action.feature]: {
          ...state[action.feature],
          isRequesting: false,
          error: action.error
        }
      }
    case ActionTypes.RESET:
      return {
        ...state,

        [action.feature]: {
          ...state[action.feature],
          isRequesting: false,
          isReceived: false,
          error: null,
          updated: null
        }
      }
    case ActionTypes.LOGIN_VIA_ETH:
      return {
        ...state,
        isLoginViaEth: action.data
      }
    case ActionTypes.GLOBAL_LOGIN_CHECKING:
      return {
        ...state,
        isGlobalLodingChecking: action.data
      }
    default:
      return state
  }
}

export default loading
