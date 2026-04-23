import _ from 'lodash'
import Runtime from '../../../lib/plugins/runtime.js'
import Handler from '../../../lib/plugins/handler.js'
import { config } from './config.js'
import { splitMarkDownTemplate, getMustacheTemplating } from './common.js'
import { sendFiles } from './file.js'

function normalizeMessageItem (item) {
  return typeof item === 'object' ? { ...item } : { type: 'text', text: item }
}

function normalizeReply (item) {
  if (item.id?.startsWith?.('event_')) {
    return { type: 'reply', event_id: item.id.replace(/^event_/, '') }
  }
  return item
}

async function appendFileResults (adapter, data, rets) {
  if (!data._files?.length) return

  const fileRets = await sendFiles({
    data,
    files: data._files,
    sep: adapter.sep,
    fileConfig: config.file
  })

  if (config.file?.appendRecallIds !== false) {
    rets.message_id.push(...fileRets.map(i => i.id).filter(Boolean))
  }
  rets.data.push(...fileRets.map(i => i.data))
}

export async function makeRawMarkdownMsg (ctx, data, msg) {
  const { adapter } = ctx
  const messages = []
  const button = []
  let content = ''
  let reply

  for (let i of Array.isArray(msg) ? msg : [msg]) {
    i = normalizeMessageItem(i)

    switch (i.type) {
      case 'record':
        i.type = 'audio'
        i.file = await adapter.makeRecord(i.file)
      case 'video':
      case 'face':
      case 'ark':
      case 'embed':
        messages.push([i])
        break
      case 'file':
        adapter.collectFileMessage(data, i)
        break
      case 'at':
        content += i.qq === 'all' ? '@everyone' : `<@${i.qq?.replace?.(`${data.self_id}${adapter.sep}`, '')}>`
        break
      case 'text':
        content += await adapter.makeRawMarkdownText(data, i.text, button)
        break
      case 'image': {
        const { des, url } = await adapter.makeMarkdownImage(data, i.file, i.summary)
        content += `${des}${url}`
        break
      }
      case 'markdown':
        if (typeof i.data === 'object') messages.push([{ type: 'markdown', ...i.data }])
        else content += i.data
        break
      case 'button':
        button.push(...adapter.makeButtons(data, i.data))
        break
      case 'reply':
        reply = normalizeReply(i)
        continue
      case 'node':
        for (const { message } of i.data) {
          messages.push(...(await makeRawMarkdownMsg(ctx, data, message)))
        }
        continue
      case 'raw':
        if (Array.isArray(i.data)) messages.push(i.data)
        else if (i.data && (i.data.type === 'keyboard' || i.data.type === 'button')) button.push(i.data)
        else messages.push([i.data])
        break
      default:
        content += await adapter.makeRawMarkdownText(data, JSON.stringify(i), button)
    }
  }

  if (content) messages.unshift([{ type: 'markdown', content }])

  if (button.length) {
    for (const item of messages) {
      if (item[0].type === 'markdown') item.push(...button.splice(0, 5))
      if (!button.length) break
    }
    while (button.length) {
      messages.push([{ type: 'markdown', content: ' ' }, ...button.splice(0, 5)])
    }
  }

  if (reply) {
    for (const index in messages) {
      if (Array.isArray(messages[index])) messages[index].unshift(reply)
      else messages[index] = [reply, messages[index]]
    }
  }

  return messages
}

export function makeMarkdownText (ctx, data, text, button) {
  const { adapter } = ctx
  const match = text.match(adapter.toQRCodeRegExp)
  if (match) {
    for (const url of match) {
      button.push(...adapter.makeButtons(data, [[{ text: url, link: url }]]))
      text = text.replace(url, '[链接(请点击按钮查看)]')
    }
  }
  return text.replace(/\n/g, '\r').replace(/@/g, '@​')
}

export function makeMarkdownTemplate (ctx, data, template) {
  const { markdownTemplate } = ctx
  let keys
  let custom_template_id
  let params = []
  let index = 0
  let type = 0
  const result = []

  if (markdownTemplate) {
    custom_template_id = markdownTemplate.custom_template_id
    params = _.cloneDeep(markdownTemplate.params)
    type = 1
  } else {
    const custom = config.customMD?.[data.self_id]
    custom_template_id = custom?.custom_template_id || config.markdown[data.self_id]
    keys = _.cloneDeep(custom?.keys) || config.markdown.template.split('')
  }

  for (const temp of template) {
    if (!temp.length) continue

    for (const item of splitMarkDownTemplate(temp)) {
      if (index === (type === 1 ? markdownTemplate.params.length : keys.length)) {
        result.push({
          type: 'markdown',
          custom_template_id,
          params: _.cloneDeep(params)
        })
        params = type === 1 ? _.cloneDeep(markdownTemplate.params) : []
        index = 0
      }

      if (type === 1) {
        params[index].values = [item]
      } else {
        params.push({ key: keys[index], values: [item] })
      }
      index++
    }
  }

  if (config.mdSuffix?.[data.self_id]) {
    if (!params.some(p => config.mdSuffix[data.self_id].some(c => c.key === p.key && p.values[0] !== '\u200B'))) {
      for (const item of config.mdSuffix[data.self_id]) {
        if (data.group_id) data.group = data.bot.pickGroup(data.group_id)
        if (data.user_id) data.friend = data.bot.pickFriend(data.user_id)
        if (data.user_id && data.group_id) data.member = data.bot.pickMember(data.group_id, data.user_id)
        params.push({
          key: item.key,
          values: [getMustacheTemplating(item.values[0], { e: data })]
        })
      }
    }
  }

  if (params.length) {
    result.push({
      type: 'markdown',
      custom_template_id,
      params
    })
  }

  return result
}

export async function makeMarkdownMsg (ctx, data, msg) {
  const { adapter, markdownTemplate, tmplPkg, userIdCache } = ctx
  const messages = []
  const button = []
  const template = []
  let content = ''
  let reply
  const length = markdownTemplate?.params?.length || config.customMD?.[data.self_id]?.keys?.length || config.markdown.template.length

  for (let i of Array.isArray(msg) ? msg : [msg]) {
    i = normalizeMessageItem(i)

    switch (i.type) {
      case 'record':
        i.type = 'audio'
        i.file = await adapter.makeRecord(i.file)
      case 'video':
      case 'face':
      case 'ark':
      case 'embed':
        messages.push([i])
        break
      case 'file':
        adapter.collectFileMessage(data, i)
        break
      case 'at':
        if (i.qq === 'all') content += '@everyone'
        else {
          if (config.toQQUin && userIdCache[i.qq]) i.qq = userIdCache[i.qq]
          content += `<@${i.qq?.replace?.(`${data.self_id}${adapter.sep}`, '')}>`
        }
        break
      case 'text':
        content += makeMarkdownText(ctx, data, i.text, button)
        break
      case 'node':
        if (Handler.has('ws.tool.toImg') && config.toImg) {
          const getButton = (nodeData) => {
            return nodeData.flatMap(item => {
              if (Array.isArray(item.message)) {
                return item.message.flatMap(msg => {
                  if (msg.type === 'node') return getButton(msg.data)
                  if (msg.type === 'button') return msg
                  return []
                })
              }
              if (typeof item.message === 'object') {
                if (item.message.type === 'button') return item.message
                if (item.message.type === 'node') return getButton(item.message.data)
              }
              return []
            })
          }
          const btn = getButton(i.data)
          let result = btn.reduce((acc, cur) => {
            const duplicate = acc.find(obj => obj.text === cur.text && obj.callback === cur.callback && obj.input === cur.input && obj.link === cur.link)
            return duplicate ? acc : acc.concat([cur])
          }, [])

          const e = {
            reply: (msg) => {
              i = msg
            },
            user_id: data.bot.uin,
            nickname: data.bot.nickname
          }

          e.runtime = new Runtime(e)
          i.data.cfg = { retType: 'msgId', returnID: true }
          let { wsids } = await Handler.call('ws.tool.toImg', e, i.data)

          if (!result.length && data.wsids?.fnc) {
            wsids = wsids.map((id, k) => ({ text: `${data.wsids.text}${k}`, callback: `#ws查看${id}` }))
            result = _.chunk(_.tail(wsids), data.wsids.col)
          }

          for (const item of result) {
            button.push(...adapter.makeButtons(data, item.data ? item.data : [item]))
          }
        } else if (tmplPkg?.nodeMsg) {
          messages.push(...(await makeMarkdownMsg(ctx, data, tmplPkg.nodeMsg(i.data))))
          continue
        } else {
          for (const { message } of i.data) {
            messages.push(...(await makeMarkdownMsg(ctx, data, message)))
          }
          continue
        }
      case 'image': {
        const { des, url } = await adapter.makeMarkdownImage(data, i.file, i.summary)
        const limit = template.length % (length - 1)
        if (template.length && !limit) {
          if (content) template.push(content)
          template.push(des)
        } else {
          template.push(content + des)
        }
        content = url
        break
      }
      case 'markdown':
        if (typeof i.data === 'object') messages.push([{ type: 'markdown', ...i.data }])
        else content += i.data
        break
      case 'button':
        button.push(...adapter.makeButtons(data, i.data))
        break
      case 'reply':
        reply = normalizeReply(i)
        continue
      case 'raw':
        if (Array.isArray(i.data)) messages.push(i.data)
        else if (i.data && (i.data.type === 'keyboard' || i.data.type === 'button')) button.push(i.data)
        else messages.push([i.data])
        break
      case 'custom':
        template.push(...i.data)
        break
      default:
        content += makeMarkdownText(ctx, data, JSON.stringify(i), button)
    }
  }

  if (content) template.push(content)

  if (template.length > length) {
    messages.push(..._(template).chunk(length).map(v => makeMarkdownTemplate(ctx, data, v)).value())
  } else if (template.length) {
    const tmp = makeMarkdownTemplate(ctx, data, template)
    if (tmp.length > 1) messages.push(...tmp.map(i => [i]))
    else messages.push(tmp)
  }

  if (template.length && button.length < 5 && config.btnSuffix[data.self_id]) {
    let { position, values } = config.btnSuffix[data.self_id]
    position = +position - 1
    if (position > button.length) position = button.length
    const btn = values.filter(i => {
      if (i.show?.type === 'random' && i.show.data <= _.random(1, 100)) return false
      return true
    })
    button.splice(position, 0, ...adapter.makeButtons(data, [btn]))
  }

  if (button.length) {
    for (const item of messages) {
      if (item[0].type === 'markdown') item.push(...button.splice(0, 5))
      if (!button.length) break
    }
    while (button.length) {
      messages.push([
        ...makeMarkdownTemplate(ctx, data, [' ']),
        ...button.splice(0, 5)
      ])
    }
  }

  if (reply) {
    for (const item of messages) item.unshift(reply)
  }

  return messages
}

export async function makeMsg (ctx, data, msg) {
  const { adapter } = ctx
  const sendType = ['audio', 'image', 'video', 'file']
  const messages = []
  const button = []
  let message = []
  let reply

  for (let i of Array.isArray(msg) ? msg : [msg]) {
    i = normalizeMessageItem(i)

    switch (i.type) {
      case 'at':
        continue
      case 'text':
      case 'face':
      case 'ark':
      case 'embed':
        break
      case 'record':
        i.type = 'audio'
        i.file = await adapter.makeRecord(i.file)
      case 'video':
      case 'image':
        if (message.some(s => sendType.includes(s.type))) {
          messages.push(message)
          message = []
        }
        break
      case 'file':
        adapter.collectFileMessage(data, i)
        continue
      case 'reply':
        reply = normalizeReply(i)
        continue
      case 'markdown':
        i = typeof i.data === 'object' ? { type: 'markdown', ...i.data } : { type: 'markdown', content: i.data }
        break
      case 'button':
        if (config.sendButton) button.push(...adapter.makeButtons(data, i.data))
        continue
      case 'node':
        if (Handler.has('ws.tool.toImg') && config.toImg) {
          const e = {
            reply: (msg) => {
              i = msg
            },
            user_id: data.bot.uin,
            nickname: data.bot.nickname
          }
          e.runtime = new Runtime(e)
          await Handler.call('ws.tool.toImg', e, i.data)
          if (message.some(s => sendType.includes(s.type))) {
            messages.push(message)
            message = []
          }
        } else {
          for (const { message: nodeMessage } of i.data) {
            messages.push(...(await makeMsg(ctx, data, nodeMessage)))
          }
        }
        break
      case 'raw':
        if (Array.isArray(i.data)) {
          messages.push(i.data)
          continue
        }
        i = i.data
        break
      default:
        i = { type: 'text', text: JSON.stringify(i) }
    }

    if (i.type === 'text' && i.text) {
      const match = i.text.match(adapter.toQRCodeRegExp)
      if (match) {
        for (const url of match) {
          const qrMsg = segment.image(await Bot.fileToUrl(await adapter.makeQRCode(url)))
          if (message.some(s => sendType.includes(s.type))) {
            messages.push(message)
            message = []
          }
          message.push(qrMsg)
          i.text = i.text.replace(url, '[链接(请扫码查看)]')
        }
      }
    }

    if (i.type !== 'node') message.push(i)
  }

  if (message.length) messages.push(message)
  while (button.length) {
    messages.push([{ type: 'keyboard', content: { rows: button.splice(0, 5) } }])
  }
  if (reply) {
    for (const item of messages) item.unshift(reply)
  }
  return messages
}

export async function sendMsg (ctx, data, send, msg) {
  const { adapter, tmplPkg } = ctx
  const rets = { message_id: [], data: [], error: [] }
  let msgs

  const doSend = async () => {
    for (const item of msgs) {
      try {
        Bot.makeLog('debug', ['发送消息', item], data.self_id)
        const ret = await send(item)
        Bot.makeLog('debug', ['发送消息返回', ret], data.self_id)
        rets.data.push(ret)
        if (ret.id) rets.message_id.push(ret.id)
        Bot[data.self_id].dau.setDau('send_msg', data)
      } catch (err) {
        logger.error(data.self_id, '发送消息错误', item, err)
        rets.error.push(err)
        return false
      }
    }
  }

  if (tmplPkg?.Button && !data.toQQBotMD) {
    const fncName = /\[.*?\((\S+)\)\]/.exec(data.logFnc)[1]
    const Btn = tmplPkg.Button[fncName]

    if (msg.type === 'node') data.wsids = { toImg: config.toImg }

    let res
    if (Btn) res = Btn(data, msg)

    if (res?.nodeMsg) {
      data.toQQBotMD = true
      data.wsids = { text: res.nodeMsg, fnc: fncName, col: res.col }
    } else if (res) {
      data.toQQBotMD = true
      res = segment.button(...res)
      msg = _.castArray(msg)
      const buttonIndex = msg.findIndex(b => b.type === 'button')
      if (buttonIndex === -1) msg.push(res)
      else msg[buttonIndex] = res
    }
  }

  if ((config.markdown[data.self_id] || (data.toQQBotMD === true && config.customMD[data.self_id])) && data.toQQBotMD !== false) {
    msgs = config.markdown[data.self_id] === 'raw'
      ? await makeRawMarkdownMsg(ctx, data, msg)
      : await makeMarkdownMsg(ctx, data, msg)

    const [mds, btns] = _.partition(msgs[0], v => v.type === 'markdown')
    if (mds.length > 1) {
      for (const idx in mds) {
        msgs = mds[idx]
        if (idx === mds.length - 1) msgs.push(...btns)
        await doSend()
      }
      await appendFileResults(adapter, data, rets)
      return rets
    }
  } else {
    msgs = await makeMsg(ctx, data, msg)
  }

  if (await doSend() === false) {
    msgs = await makeMsg(ctx, data, msg)
    await doSend()
  }

  await appendFileResults(adapter, data, rets)
  if (Array.isArray(data._ret_id)) data._ret_id.push(...rets.message_id)
  return rets
}

export async function makeGuildMsg (ctx, data, msg) {
  const { adapter } = ctx
  const messages = []
  let message = []
  let reply

  for (let i of Array.isArray(msg) ? msg : [msg]) {
    i = normalizeMessageItem(i)

    switch (i.type) {
      case 'at':
        i.user_id = i.qq?.replace?.(/^qg_/, '')
      case 'text':
      case 'face':
      case 'ark':
      case 'embed':
        break
      case 'image':
        message.push(i)
        messages.push(message)
        message = []
        continue
      case 'record':
      case 'video':
      case 'file':
        if (i.type === 'file') {
          adapter.collectFileMessage(data, i)
          continue
        }
        return []
      case 'reply':
        reply = normalizeReply(i)
        continue
      case 'markdown':
        i = typeof i.data === 'object' ? { type: 'markdown', ...i.data } : { type: 'markdown', content: i.data }
        break
      case 'button':
        continue
      case 'node':
        for (const { message: nodeMessage } of i.data) {
          messages.push(...(await makeGuildMsg(ctx, data, nodeMessage)))
        }
        continue
      case 'raw':
        if (Array.isArray(i.data)) {
          messages.push(i.data)
          continue
        }
        i = i.data
        break
      default:
        i = { type: 'text', text: JSON.stringify(i) }
    }

    if (i.type === 'text' && i.text) {
      const match = i.text.match(adapter.toQRCodeRegExp)
      if (match) {
        for (const url of match) {
          message.push(segment.image(await adapter.makeQRCode(url)))
          messages.push(message)
          message = []
          i.text = i.text.replace(url, '[链接(请扫码查看)]')
        }
      }
    }

    message.push(i)
  }

  if (message.length) messages.push(message)
  if (reply) {
    for (const item of messages) item.unshift(reply)
  }
  return messages
}

export async function sendGMsg (ctx, data, send, msg) {
  const rets = { message_id: [], data: [], error: [] }
  let msgs

  const doSend = async () => {
    for (const item of msgs) {
      try {
        Bot.makeLog('debug', ['发送消息', item], data.self_id)
        const ret = await send(item)
        Bot.makeLog('debug', ['发送消息返回', ret], data.self_id)
        rets.data.push(ret)
        if (ret.id) rets.message_id.push(ret.id)
        Bot[data.self_id].dau.setDau('send_msg', data)
      } catch (err) {
        logger.error(data.self_id, '发送消息错误', item, err)
        rets.error.push(err)
        return false
      }
    }
  }

  msgs = await makeGuildMsg(ctx, data, msg)
  if (await doSend() === false) {
    msgs = await makeGuildMsg(ctx, data, msg)
    await doSend()
  }

  await appendFileResults(ctx.adapter, data, rets)
  return rets
}
