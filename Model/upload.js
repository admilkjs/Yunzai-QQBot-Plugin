import axios from 'axios'
import FormData from 'form-data'
import fs from 'node:fs'
import { basename, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import imageSize from 'image-size'

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0'
const UKAKA_SIGN_URL = 'https://bed-sign.vercel.0013107.xyz/sign'
const UKAKA_ORIGIN = 'https://bed.vercel.0013107.xyz'

const extMimeMap = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml'
}

const typeExtMap = {
  png: '.png',
  jpg: '.jpg',
  jpeg: '.jpeg',
  gif: '.gif',
  webp: '.webp',
  bmp: '.bmp',
  svg: '.svg'
}

function getBufferFromFile (file) {
  if (Buffer.isBuffer(file)) return file
  if (typeof file === 'string') return fs.readFileSync(file)
  throw new Error('不支持的图片文件类型')
}

function detectImageType (buffer) {
  try {
    return imageSize(buffer)?.type
  } catch {
    return undefined
  }
}

function getFileMeta (file) {
  const buffer = getBufferFromFile(file)
  const detectedType = detectImageType(buffer)
  const ext = typeof file === 'string'
    ? extname(file).toLowerCase()
    : (detectedType ? (typeExtMap[detectedType] || `.${detectedType}`) : '.png')

  const filename = typeof file === 'string'
    ? basename(file)
    : `${randomUUID()}${ext || '.png'}`

  const mimeType = extMimeMap[ext] || (detectedType ? `image/${detectedType}` : 'application/octet-stream')

  return {
    buffer,
    filename,
    mimeType
  }
}

export class ChatGLMUpload {
  async upload (file) {
    const { filename, mimeType } = getFileMeta(file)
    const data = new FormData()
    data.append('file', typeof file === 'string' ? fs.createReadStream(file) : file, {
      filename,
      contentType: mimeType
    })

    try {
      const response = await axios.post(
        'https://chatglm.cn/chatglm/backend-api/assistant/file_upload',
        data,
        {
          headers: {
            ...data.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
            'Accept-Encoding': 'gzip, deflate, br'
          }
        }
      )

      return response?.data?.result?.file_url
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message)
    }
  }
}

export class UkakaUpload {
  async upload (file) {
    const { buffer, filename, mimeType } = getFileMeta(file)

    let signData
    try {
      const response = await axios.get(UKAKA_SIGN_URL, {
        params: {
          module: 'ukaka',
          filename,
          mimeType
        },
        headers: {
          Accept: '*/*',
          Origin: UKAKA_ORIGIN,
          Referer: `${UKAKA_ORIGIN}/`,
          'User-Agent': DEFAULT_USER_AGENT
        }
      })
      signData = response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }

    if (!signData?.url || !signData?.body?.token || !signData?.resourceUrl) {
      throw new Error('签名图床返回数据不完整')
    }

    const data = new FormData()
    for (const [key, value] of Object.entries(signData.body)) {
      if (key === 'file' || value === undefined || value === null || value === '') continue
      data.append(key, String(value))
    }
    data.append('file', buffer, {
      filename,
      contentType: mimeType
    })

    try {
      await axios.post(signData.url, data, {
        headers: {
          ...data.getHeaders(),
          'User-Agent': DEFAULT_USER_AGENT
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      })
      return signData.resourceUrl
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message)
    }
  }
}

export class XingyeUpload {
  async upload (file) {
    const { buffer, filename, mimeType } = getFileMeta(file)

    let signData
    try {
      const response = await axios.get(UKAKA_SIGN_URL, {
        params: {
          module: 'xingye',
          filename,
          mimeType
        },
        headers: {
          Accept: '*/*',
          Origin: UKAKA_ORIGIN,
          Referer: `${UKAKA_ORIGIN}/`,
          'User-Agent': DEFAULT_USER_AGENT
        }
      })
      signData = response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message)
    }

    if (!signData?.url || !signData?.resourceUrl) {
      throw new Error('星野图床返回数据不完整')
    }

    const headers = {}
    const contentType = signData?.header?.['Content-Type']
    if (contentType) {
      headers['Content-Type'] = contentType
    }

    try {
      const response = await fetch(signData.url, {
        method: 'PUT',
        headers,
        body: buffer
      })
      if (!response.ok) {
        throw new Error(await response.text() || `HTTP ${response.status}`)
      }
      return signData.resourceUrl
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message)
    }
  }
}

const uploaderMap = {
  chatglm: new ChatGLMUpload(),
  ukaka: new UkakaUpload(),
  xingye: new XingyeUpload()
}

export async function uploadImageByProvider (provider, file) {
  const uploader = uploaderMap[provider]
  if (!uploader) return false
  const url = await uploader.upload(file)
  return url ? { url } : false
}
