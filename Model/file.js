import fs from 'node:fs'
import crypto from 'node:crypto'

export function patchSegmentFile (segment) {
  if (segment.__qqBotFilePatched) return

  const originalSegmentFile = segment.file.bind(segment)
  segment.file = function (file, name, forceChunk) {
    let result
    if (typeof file === 'object' && file !== null && !Buffer.isBuffer(file)) {
      result = originalSegmentFile(file)
      if (typeof file.force_chunk !== 'undefined') {
        result.force_chunk = file.force_chunk
      }
    } else {
      result = originalSegmentFile(file, name)
      if (typeof forceChunk !== 'undefined') {
        result.force_chunk = forceChunk
      }
    }

    return result
  }

  segment.__qqBotFilePatched = true
}

export function normalizeFileSegment (segmentItem) {
  if (!segmentItem || !Object.prototype.hasOwnProperty.call(segmentItem, 'file')) return null

  let file = null
  let name = null
  let forceChunk = false

  if (typeof segmentItem.file === 'string') {
    file = segmentItem.file

    if (typeof segmentItem.name === 'object' && segmentItem.name !== null) {
      name = segmentItem.name.name || null
      forceChunk = typeof segmentItem.name.force_chunk !== 'undefined'
        ? !!segmentItem.name.force_chunk
        : !!segmentItem.force_chunk
    } else {
      name = segmentItem.name || null
      forceChunk = !!segmentItem.force_chunk
    }
  } else if (typeof segmentItem.file === 'object' && segmentItem.file !== null) {
    if (Object.prototype.hasOwnProperty.call(segmentItem.file, 'file')) {
      file = segmentItem.file.file
      name = segmentItem.file.name || segmentItem.name || null
      forceChunk = typeof segmentItem.file.force_chunk !== 'undefined'
        ? !!segmentItem.file.force_chunk
        : !!segmentItem.force_chunk
    } else {
      file = segmentItem.file
      name = segmentItem.name || null
      forceChunk = !!segmentItem.force_chunk
    }
  } else {
    file = segmentItem.file
    name = segmentItem.name || null
    forceChunk = !!segmentItem.force_chunk
  }

  if (!name && typeof file === 'string') {
    name = extractFileNameFromUrl(file)
  }

  return { file, name, force_chunk: forceChunk }
}

function extractFileName (fileData, fileBuffer) {
  let name = ''
  let ext = ''

  if (typeof fileData === 'string') {
    if (fileData.startsWith('http')) {
      try {
        const url = new URL(fileData)
        const lastSegment = url.pathname.split('/').pop()
        const fileName = lastSegment?.split('?')[0]
        if (fileName && fileName.includes('.')) {
          name = decodeURIComponent(fileName)
          ext = name.substring(name.lastIndexOf('.'))
        }
      } catch {}
    } else if (fileData.startsWith('file://')) {
      const path = fileData.replace('file://', '')
      name = path.split('/').pop() || path.split('\\').pop()
      if (name && name.includes('.')) {
        ext = name.substring(name.lastIndexOf('.'))
      }
    } else {
      name = fileData.split('/').pop() || fileData.split('\\').pop()
      if (name && name.includes('.')) {
        ext = name.substring(name.lastIndexOf('.'))
      }
    }
  }

  if (!ext && fileBuffer) {
    const header = fileBuffer.toString('hex', 0, 16).toUpperCase()
    const fileTypeMap = {
      '89504E47': '.png',
      '47494638': '.gif',
      FFD8FF: '.jpg',
      '25504446': '.pdf',
      '494433': '.mp3',
      '52494646': '.wav',
      '00000018': '.mp4',
      '00000020': '.mp4',
      D0CF11E0: '.doc',
      '504B0304': '.zip',
      '7B22': '.json',
      '3C3F786D': '.xml',
      EFBBBF: '.txt',
      FFFE: '.txt',
      FEFF: '.txt'
    }

    for (const [signature, extension] of Object.entries(fileTypeMap)) {
      if (header.startsWith(signature)) {
        ext = extension
        break
      }
    }

    if (header.startsWith('52494646')) {
      const riffType = fileBuffer.toString('hex', 8, 12).toUpperCase()
      ext = riffType === '57454250' ? '.webp' : '.wav'
    }
  }

  if (!name || !name.includes('.')) {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 8)
    name = `file_${timestamp}_${random}${ext || '.bin'}`
  }

  if (name.length > 100) {
    const extension = name.includes('.') ? name.substring(name.lastIndexOf('.')) : ''
    const baseName = extension ? name.substring(0, name.lastIndexOf('.')) : name
    name = `${baseName.substring(0, 80)}...${extension || '.bin'}`
  }

  return name
}

export function extractFileNameFromUrl (url) {
  try {
    const urlObj = new URL(url)
    const lastSegment = urlObj.pathname.split('/').pop()
    const fileName = lastSegment?.split('?')[0]
    if (fileName && fileName.includes('.')) {
      return decodeURIComponent(fileName)
    }
  } catch {}

  return ''
}

async function getFileBuffer (data, fileData) {
  if (fileData instanceof Uint8Array) return Buffer.from(fileData)
  if (Buffer.isBuffer(fileData)) return fileData

  if (typeof fileData === 'string') {
    if (fileData.startsWith('http')) {
      Bot.makeLog('info', ['开始下载网络文件...'], data.self_id)
      const response = await fetch(fileData)
      const buffer = Buffer.from(await response.arrayBuffer())
      Bot.makeLog('info', [`下载完成，大小: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`], data.self_id)
      return buffer
    }

    if (fileData.startsWith('base64://')) {
      return Buffer.from(fileData.replace('base64://', ''), 'base64')
    }

    if (fileData.startsWith('file://')) {
      return fs.readFileSync(fileData.replace('file://', ''))
    }

    try {
      return fs.readFileSync(fileData)
    } catch {
      return Buffer.from(fileData)
    }
  }

  throw new Error('不支持的文件数据类型')
}

function resolveFileTarget (data, sep) {
  if (data.group_id && !String(data.group_id).startsWith('qg_')) {
    return {
      targetType: 'group',
      targetId: data.raw?.group_id || String(data.group_id).replace(`${data.self_id}${sep}`, '')
    }
  }

  if (data.guild_id && data.user_id) {
    return {
      targetType: 'user',
      targetId: data.raw?.sender?.user_id || String(data.user_id).replace(/^qg_/, '')
    }
  }

  if (data.channel_id && data.group_id && String(data.group_id).startsWith('qg_')) {
    return null
  }

  return {
    targetType: 'user',
    targetId: data.raw?.sender?.user_id || String(data.user_id).replace(`${data.self_id}${sep}`, '').replace(/^qg_/, '')
  }
}

export async function uploadFileToQQ ({ data, targetId, targetType, fileData, fileName, forceChunk = false, fileConfig = {} }) {
  const effectiveForceChunk = fileConfig.allowForceChunk === false ? false : forceChunk
  const preferUrlUpload = fileConfig.preferUrlUpload !== false
  const groupBase64Upload = fileConfig.groupBase64Upload !== false
  const privateForceChunk = fileConfig.privateForceChunk !== false
  const autoExtractName = fileConfig.autoExtractName !== false

  if (preferUrlUpload && typeof fileData === 'string' && fileData.startsWith('http') && !effectiveForceChunk) {
    let fileSizeMB = 0
    try {
      const headResponse = await fetch(fileData, { method: 'HEAD' })
      const contentLength = headResponse.headers.get('content-length')
      fileSizeMB = contentLength ? parseInt(contentLength) / (1024 * 1024) : 0
      Bot.makeLog('info', [`网络文件大小: ${fileSizeMB.toFixed(2)} MB`], data.self_id)
    } catch (err) {
      Bot.makeLog('debug', ['无法获取文件大小，尝试直传', err.message], data.self_id)
    }

    try {
      const filesUrl = `/v2/${targetType}s/${targetId}/files`
      const filesData = {
        file_type: 4,
        srv_send_msg: false,
        url: fileData,
        file_name: fileName || extractFileNameFromUrl(fileData) || `file_${Date.now()}.bin`
      }

      const { data: result } = await data.bot.sdk.request.post(filesUrl, filesData)
      Bot.makeLog('info', ['URL 直传成功，无需下载文件', result], data.self_id)
      return result
    } catch (error) {
      Bot.makeLog('warn', ['URL 直传失败', error.message, error.response?.data], data.self_id)
      if (fileSizeMB > 10) {
        forceChunk = true
      }
    }
  }

  try {
    const fileBuffer = await getFileBuffer(data, fileData)
    const fileSize = fileBuffer.length
    const finalFileName = fileName || (autoExtractName ? extractFileName(fileData, fileBuffer) : `file_${Date.now()}.bin`)
    const shouldUseChunk = forceChunk || (privateForceChunk && targetType === 'user')

    Bot.makeLog('debug', ['上传方式判断', {
      force_chunk: forceChunk,
      target_type: targetType,
      shouldUseChunk,
      file_size_mb: (fileSize / 1024 / 1024).toFixed(2)
    }], data.self_id)

    if (!shouldUseChunk && targetType === 'group' && groupBase64Upload) {
      const filesUrl = `/v2/${targetType}s/${targetId}/files`
      const { data: result } = await data.bot.sdk.request.post(filesUrl, {
        file_type: 4,
        srv_send_msg: false,
        file_data: fileBuffer.toString('base64'),
        file_name: finalFileName
      })

      return result
    }

    const md5Hash = crypto.createHash('md5').update(fileBuffer).digest('hex')
    const sha1Hash = crypto.createHash('sha1').update(fileBuffer).digest('hex')
    const md5_10m = crypto.createHash('md5')
      .update(fileBuffer.slice(0, Math.min(10002432, fileSize)))
      .digest('hex')

    const prepareUrl = `/v2/${targetType}s/${targetId}/upload_prepare`
    const { data: prepareResult } = await data.bot.sdk.request.post(prepareUrl, {
      file_type: 4,
      file_name: finalFileName,
      file_size: fileSize,
      md5: md5Hash,
      sha1: sha1Hash,
      md5_10m
    })

    const { upload_id: uploadId, parts, block_size: blockSizeRaw } = prepareResult
    const blockSize = Number(blockSizeRaw)
    const axios = await import('axios').then(m => m.default)

    for (const part of parts) {
      const start = (part.index - 1) * blockSize
      const end = Math.min(start + blockSize, fileSize)
      const partBuffer = fileBuffer.slice(start, end)

      await axios.put(part.presigned_url, partBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      })

      await data.bot.sdk.request.post(`/v2/${targetType}s/${targetId}/upload_part_finish`, {
        upload_id: uploadId,
        part_index: part.index,
        block_size: partBuffer.length,
        md5: crypto.createHash('md5').update(partBuffer).digest('hex')
      })
    }

    const { data: filesResult } = await data.bot.sdk.request.post(`/v2/${targetType}s/${targetId}/files`, {
      upload_id: uploadId
    })

    return filesResult
  } catch (error) {
    Bot.makeLog('error', ['文件上传失败，尝试最终降级', error.message, error.response?.data], data.self_id)

    const fileBuffer = await getFileBuffer(data, fileData)
    const finalFileName = fileName || (autoExtractName ? extractFileName(fileData, fileBuffer) : `file_${Date.now()}.bin`)
    const filesUrl = `/v2/${targetType}s/${targetId}/files`

    const payload = typeof fileData === 'string' && fileData.startsWith('http') && preferUrlUpload
      ? {
          file_type: 4,
          srv_send_msg: false,
          url: fileData,
          file_name: finalFileName
        }
      : {
          file_type: 4,
          srv_send_msg: false,
          file_data: fileBuffer.toString('base64'),
          file_name: finalFileName
        }

    const { data: result } = await data.bot.sdk.request.post(filesUrl, payload)
    return result
  }
}

export async function sendFileMessage ({ data, targetId, targetType, fileInfo, fileConfig }) {
  const result = await uploadFileToQQ({
    data,
    targetId,
    targetType,
    fileData: fileInfo.file,
    fileName: fileInfo.name,
    forceChunk: fileInfo.force_chunk,
    fileConfig
  })

  const messageData = {
    msg_type: 7,
    media: {
      file_info: result.file_info
    }
  }

  if (data.message_id) {
    messageData.msg_id = data.message_id
  }

  const { data: sendResult } = await data.bot.sdk.request.post(
    `/v2/${targetType}s/${targetId}/messages`,
    messageData
  )

  return { id: sendResult.id, data: sendResult }
}

export async function sendFiles ({ data, files, sep, fileConfig }) {
  if (!files?.length || fileConfig?.enable === false) {
    return []
  }

  const target = resolveFileTarget(data, sep)
  if (!target?.targetId) {
    Bot.makeLog('warn', ['当前场景暂不支持文件发送', { group_id: data.group_id, user_id: data.user_id }], data.self_id)
    return []
  }

  const results = []
  for (const fileInfo of files) {
    try {
      const ret = await sendFileMessage({
        data,
        targetId: target.targetId,
        targetType: target.targetType,
        fileInfo,
        fileConfig
      })
      results.push(ret)
      Bot.makeLog('info', ['文件发送成功', {
        target_type: target.targetType,
        target_id: target.targetId,
        file: fileInfo.name,
        force_chunk: fileInfo.force_chunk
      }], data.self_id)
    } catch (err) {
      Bot.makeLog('error', ['发送文件失败', fileInfo, err.message, err.response?.data], data.self_id)
    }
  }

  return results
}
