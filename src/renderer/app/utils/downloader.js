import makeDir from 'make-dir'
import fss from 'fs'
import axios from 'axios'
import pMap from 'p-map'
import path from 'path'
import adapter from 'axios/lib/adapters/http'
import http from 'http'
import https from 'https'
import computeFileHash from './computeFileHash'
const fs = fss.promises

export const downloadInstanceFiles = async (
  arr,
  updatePercentage,
  threads = 4,
  updatePercentageThreshold = 5
) => {
  let downloaded = 0
  try {
    const result = await pMap(
      arr,
      async item => {
        let counter = 0
        let res = false

        // remove file
        if (!item.url && item.path) {
          try {
            await fs.rm(item.path)
          } catch (e) {
            console.log(`remove ${item.path} error: `, e)
          }
          return item
        }

        // skip file
        if (!item.path || !item.url || item.needUpgrade === false) {
          console.info('Skipping', item.url, item.needUpgrade)
          return item
        }

        // download file
        do {
          counter += 1
          let { url } = item
          if (counter !== 1) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            if (
              counter % 2 === 0 &&
              url.startsWith('https://resources.download.minecraft.net')
            ) {
              url = url.replaceAll(
                'https://resources.download.minecraft.net',
                'https://mc-lib-mirr.oss-accelerate.aliyuncs.com'
              )
            }
          }
          try {
            // console.log('downloading: ', url, 'counter: ', counter)
            res = await downloadFileInstance(
              item.path,
              url,
              item.sha1,
              item.legacyPath
            )

            if (res) {
              // console.log('downloaded success: ', downloaded + 1, url)
            } else if (counter >= 100) {
              console.error('downloaded fail: ', url)
            }
          } catch (e) {
            console.log(e)
          }
        } while (!res && counter < 100)

        // update percentage
        if (counter >= 100) {
          throw new Error('download failed after retry 100 times')
        }

        downloaded += 1
        if (
          (updatePercentage && downloaded % updatePercentageThreshold === 0) ||
          downloaded === arr.length
        ) { updatePercentage(downloaded) }
        return item
      },
      { concurrency: threads, stopOnError: true }
    )

    console.log(
      'downloadInstanceFiles: ',
      'exact download count ',
      result.length,
      'expect download count',
      arr.length
    )
    if (result.length < arr.length) return false
    return true
  } catch (e) {
    return false
  }
}

const downloadFileInstance = async (fileName, url, sha1, legacyPath) => {
  try {
    const filePath = path.dirname(fileName)
    try {
      await fs.access(fileName)
      if (legacyPath) await fs.access(legacyPath)
      const checksum = await computeFileHash(fileName)
      const legacyChecksum = legacyPath && (await computeFileHash(legacyPath))
      if (checksum === sha1 && (!legacyPath || legacyChecksum === sha1)) {
        return true
      }
    } catch {
      await makeDir(filePath)
      if (legacyPath) await makeDir(path.dirname(legacyPath))
    }

    const { data } = await axios.get(url, {
      responseType: 'stream',
      responseEncoding: null,
      httpAgent: new http.Agent({ keepAlive: true, timeout: 5000 }),
      httpsAgent: new https.Agent({ keepAlive: true, timeout: 5000 }),
      timeout: 5000,
      adapter
    })
    const wStream = fss.createWriteStream(fileName, {
      encoding: null
    })

    data.pipe(wStream)
    let wStreamLegacy
    if (legacyPath) {
      wStreamLegacy = fss.createWriteStream(legacyPath, {
        encoding: null
      })
      data.pipe(wStreamLegacy)
    }

    await new Promise((resolve, reject) => {
      data.on('error', err => {
        console.error(err)
        reject(err)
      })

      data.on('end', () => {
        wStream.end()
        if (legacyPath) {
          wStreamLegacy.end()
        }
        resolve()
      })
    })
    return true
  } catch (e) {
    console.error(
      `Error while downloading <${url}> to <${fileName}> --> ${e.message}`
    )
    return false
  }
}

export const downloadFile = async (fileName, url, onProgress) => {
  await makeDir(path.dirname(fileName))
  const { data, headers } = await axios.get(url, {
    responseType: 'stream',
    responseEncoding: null,
    httpAgent: new http.Agent({ keepAlive: true, timeout: 5000 }),
    httpsAgent: new https.Agent({ keepAlive: true, timeout: 5000 }),
    timeout: 5000,
    adapter
  })

  // console.log(data)
  const out = fss.createWriteStream(fileName, { encoding: null })
  data.pipe(out)

  // Save variable to know progress
  let receivedBytes = 0
  const totalBytes = parseInt(headers['content-length'], 10)

  data.on('data', chunk => {
    // Update the received bytes
    receivedBytes += chunk.length
    if (onProgress) {
      onProgress(parseInt(((receivedBytes * 100) / totalBytes).toFixed(1), 10))
    }
  })

  return new Promise((resolve, reject) => {
    data.on('end', () => {
      out.end()
      resolve()
    })

    data.on('error', () => {
      reject(new Error('download error'))
    })
  })
}
