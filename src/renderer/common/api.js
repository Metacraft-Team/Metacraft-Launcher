import axios from 'axios'
import {
  FORGESVC_URL,
  MC_MANIFEST_URL,
  FABRIC_APIS,
  JAVA17_MANIFEST_URL,
  IMGUR_CLIENT_ID,
  FTB_API_URL,
  GDL_SERVE_API,
  METACRAFT_SERVICES_URL,
  MOJANG_APIS
} from './utils/constants'
import { sortByDate } from './utils'

export const mcRefresh = () => true

export const mcValidate = (accessToken, clientToken) => {
  return axios.post(
    `${MOJANG_APIS}/validate`,
    {
      accessToken,
      clientToken
    },
    { headers: { 'Content-Type': 'application/json' } }
  )
}

export const mcInvalidate = () => true
export const mcAuthenticate = () => true

export const mcGetPlayerSkin = uuid => {
  return axios.get(
    `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`
  )
}

const trackCurseForgeAPI = (url, params = {}, method = 'get') => {
  // Temporarily disable this
  const switcher = true
  if (switcher) {
    let req = null
    if (method === 'get') {
      req = axios.get(url, { params })
    } else if (method === 'post') {
      req = axios.post(url, params)
    }

    if (req) {
      req.catch(console.error)
    }
  }
}

// MetaCraft API
export const metaCraftServerCheck = () => {
  return axios.get(`${METACRAFT_SERVICES_URL}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  })
}

export const metaCraftGetUserData = async accessToken => {
  const response = await axios.get(`${METACRAFT_SERVICES_URL}/user/center/profile`, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `bearer ${accessToken}`
    }
  })
  return response.data
}

export const metaCraftAuthenticateRequest = ({
  address,
  username,
  signature,
  timestamp
}) => {
  return axios.post(
    `${METACRAFT_SERVICES_URL}/authserver/authenticate`,
    {
      agent: {
        name: 'Minecraft',
        version: 1
      },
      username,
      address,
      signature,
      timestamp,
      requestUser: true
    },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  )
}

export const metaCraftLogout = ({
  address,
  username,
  signature,
  timestamp
}) => {
  return axios.post(
    `${METACRAFT_SERVICES_URL}/authserver/signout`,
    {
      agent: {
        name: 'Minecraft',
        version: 1
      },
      username,
      address,
      signature,
      timestamp,
      requestUser: true
    },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  )
}

export const metaCraftValidateRequest = ({ accessToken }) => {
  return axios.post(
    `${METACRAFT_SERVICES_URL}/authserver/validate`,
    {
      access_token: accessToken
    },
    { headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  )
}

export const imgurPost = (image, onProgress) => {
  const bodyFormData = new FormData()
  bodyFormData.append('image', image)

  return axios.post('https://api.imgur.com/3/image', bodyFormData, {
    headers: {
      Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
    },
    ...(onProgress && { onUploadProgress: onProgress })
  })
}

export const getMcManifest = () => {
  const url = `${MC_MANIFEST_URL}?timestamp=${new Date().getTime()}`
  return axios.get(url)
}

export const getMcExtraDependency = () => {
  const url = `${METACRAFT_SERVICES_URL}/configs/dependency.json?platform=${
    process.platform
  }&timestamp=${new Date().getTime()}`
  return axios.get(url)
}

export const getForgeManifest = () => {
  const url = `https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json?timestamp=${new Date().getTime()}`
  return axios.get(url)
}

export const getFabricManifest = () => {
  const url = `${FABRIC_APIS}/versions`
  return axios.get(url)
}

export const getJava17Manifest = () => {
  const url = JAVA17_MANIFEST_URL
  return axios.get(url)
}

export const getFabricJson = ({ mcVersion, loaderVersion }) => {
  return axios.get(
    `${FABRIC_APIS}/versions/loader/${encodeURIComponent(
      mcVersion
    )}/${encodeURIComponent(loaderVersion)}/profile/json`
  )
}

// FORGE ADDONS

export const getAddon = projectID => {
  const url = `${FORGESVC_URL}/addon/${projectID}`
  const myUrl = `${GDL_SERVE_API}/mods/${projectID}`
  trackCurseForgeAPI(myUrl)
  return axios.get(url)
}

export const getMultipleAddons = async addons => {
  const url = `${FORGESVC_URL}/addon`
  const myUrl = `${GDL_SERVE_API}/mods`
  trackCurseForgeAPI(myUrl, addons, 'post')
  return axios.post(url, addons)
}

export const getAddonFiles = projectID => {
  const url = `${FORGESVC_URL}/addon/${projectID}/files`
  const myUrl = `${GDL_SERVE_API}/mods/${projectID}/files`
  trackCurseForgeAPI(myUrl)
  return axios.get(url).then(res => ({
    ...res,
    data: res.data.sort(sortByDate)
  }))
}

export const getAddonDescription = projectID => {
  const url = `${FORGESVC_URL}/addon/${projectID}/description`
  const myUrl = `${GDL_SERVE_API}/mods/${projectID}/description`

  trackCurseForgeAPI(myUrl)
  return axios.get(url)
}

export const getAddonFile = (projectID, fileID) => {
  const url = `${FORGESVC_URL}/addon/${projectID}/file/${fileID}`
  const myUrl = `${GDL_SERVE_API}/mods/${projectID}/files/${fileID}`

  trackCurseForgeAPI(myUrl)
  return axios.get(url)
}

export const getAddonsByFingerprint = fingerprints => {
  const url = `${FORGESVC_URL}/fingerprint`
  const myUrl = `${GDL_SERVE_API}/fingerprints`

  trackCurseForgeAPI(myUrl, fingerprints, 'post')
  return axios.post(url, fingerprints)
}

export const getAddonFileChangelog = (projectID, fileID) => {
  const url = `${FORGESVC_URL}/addon/${projectID}/file/${fileID}/changelog`
  const myUrl = `${GDL_SERVE_API}/mods/${projectID}/files/${fileID}/changelog`

  trackCurseForgeAPI(myUrl)
  return axios.get(url)
}

export const getAddonCategories = () => {
  const url = `${FORGESVC_URL}/category?gameId=432`
  const myUrl = `${GDL_SERVE_API}/categories?gameId=432`

  trackCurseForgeAPI(myUrl)
  return axios.get(url)
}

export const getSearch = (
  type,
  searchFilter,
  pageSize,
  index,
  sort,
  isSortDescending,
  gameVersion,
  categoryId,
  modLoaderType
) => {
  const url = `${FORGESVC_URL}/addon/search`
  const myUrl = `${GDL_SERVE_API}/mods/search`

  const params = {
    gameId: 432,
    categoryId: categoryId || 0,
    pageSize,
    index,
    sort,
    isSortDescending,
    gameVersion: gameVersion || '',
    ...(modLoaderType === 'fabric' && { modLoaderType: 4 }),
    sectionId: type === 'mods' ? 6 : 4471,
    searchFilter
  }
  trackCurseForgeAPI(myUrl, { ...params, pageSize: 20 })
  return axios.get(url, { params })
}

export const getFTBModpackData = async modpackId => {
  try {
    const url = `${FTB_API_URL}/modpack/${modpackId}`
    const { data } = await axios.get(url)
    return data
  } catch {
    return { status: 'error' }
  }
}

export const getFTBModpackVersionData = async (modpackId, versionId) => {
  try {
    const url = `${FTB_API_URL}/modpack/${modpackId}/${versionId}`
    const { data } = await axios.get(url)
    return data
  } catch {
    return { status: 'error' }
  }
}
export const getFTBChangelog = async (modpackId, versionId) => {
  try {
    const url = `https://api.modpacks.ch/public/modpack/${modpackId}/${versionId}/changelog`
    const { data } = await axios.get(url)
    return data
  } catch {
    return { status: 'error' }
  }
}

export const getFTBMostPlayed = async () => {
  const url = `${FTB_API_URL}/modpack/popular/plays/1000`
  return axios.get(url)
}

export const getFTBSearch = async searchText => {
  const url = `${FTB_API_URL}/modpack/search/1000?term=${searchText}`
  return axios.get(url)
}
