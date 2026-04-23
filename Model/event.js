import fs from 'node:fs'
import { join } from 'node:path'
import { config } from './config.js'

export async function makeCallback (ctx, id, event) {
  const { adapter } = ctx
  const reply = event.reply.bind(event)
  event.reply = async (...args) => {
    try {
      return await reply(...args)
    } catch (err) {
      Bot.makeLog('debug', ['回复按钮点击事件错误', err], id)
    }
  }

  const data = {
    raw: event,
    bot: Bot[id],
    self_id: id,
    post_type: 'message',
    message_id: event.notice_id,
    message_type: event.notice_type,
    sub_type: 'callback',
    get user_id () { return this.sender.user_id },
    sender: { user_id: `${id}${adapter.sep}${event.operator_id}` },
    message: [],
    raw_message: ''
  }

  const callback = data.bot.callback[event.data?.resolved?.button_id]
  if (callback) {
    if (!event.group_id && callback.group_id) event.group_id = callback.group_id
    data.message_id = callback.id
    if (callback.message_id.length) {
      for (const messageId of callback.message_id) {
        data.message.push({ type: 'reply', id: messageId })
      }
      data.raw_message += `[回复：${callback.message_id}]`
    }
    data.message.push({ type: 'text', text: callback.message })
    data.raw_message += callback.message
  } else {
    if (event.data?.resolved?.button_id) {
      data.message.push({ type: 'reply', id: event.data.resolved.button_id })
      data.raw_message += `[回复：${event.data.resolved.button_id}]`
    }
    if (event.data?.resolved?.button_data) {
      data.message.push({ type: 'text', text: event.data.resolved.button_data })
      data.raw_message += event.data.resolved.button_data
    } else {
      event.reply(1)
    }
  }
  event.reply(0)

  switch (data.message_type) {
    case 'direct':
    case 'friend':
      data.message_type = 'private'
      Bot.makeLog('info', [`好友按钮点击事件：[${data.user_id}]`, data.raw_message], data.self_id)
      data.reply = msg => adapter.sendFriendMsg({ ...data, user_id: event.operator_id }, msg, { id: data.message_id })
      await adapter.setFriendMap(data)
      break
    case 'group':
      data.group_id = `${id}${adapter.sep}${event.group_id}`
      Bot.makeLog('info', [`群按钮点击事件：[${data.group_id}, ${data.user_id}]`, data.raw_message], data.self_id)
      data.reply = msg => adapter.sendGroupMsg({ ...data, group_id: event.group_id }, msg, { id: data.message_id })
      await adapter.setGroupMap(data)
      break
    case 'guild':
      break
    default:
      Bot.makeLog('warn', ['未知按钮点击事件', event], data.self_id)
  }

  Bot.em(`${data.post_type}.${data.message_type}.${data.sub_type}`, data)
}

export function makeNotice (ctx, id, event) {
  const { adapter } = ctx
  const data = {
    raw: event,
    bot: Bot[id],
    self_id: id,
    post_type: event.post_type,
    notice_type: event.notice_type,
    sub_type: event.sub_type,
    notice_id: event.notice_id,
    group_id: event.group_id,
    user_id: event.user_id || event.operator_id
  }

  switch (data.sub_type) {
    case 'action':
      return adapter.makeCallback(id, event)
    case 'increase':
      Bot[data.self_id].dau.setDau('group_increase', data)
      if (config.groupIncreaseMsg !== false && event.notice_type === 'group') {
        const path = join(process.cwd(), 'plugins', 'QQBot-Plugin', 'Model', 'template', 'groupIncreaseMsg.js')
        if (fs.existsSync(path)) {
          import(`file://${path}`).then(i => i.default).then(async i => {
            const msg = typeof i === 'function'
              ? await i(`${data.self_id}${adapter.sep}${event.group_id}`, `${data.self_id}${adapter.sep}${data.user_id}`, data.self_id)
              : i
            if (msg?.length > 0) {
              adapter.sendMsg(data, msg => data.bot.sdk.sendGroupMessage(event.group_id, msg), msg)
            }
          })
        }
      }
      return
    case 'decrease':
      Bot[data.self_id].dau.setDau('group_decrease', data)
    case 'update':
    case 'member.increase':
    case 'member.decrease':
    case 'member.update':
    case 'add':
    case 'remove':
      break
    case 'receive_open':
    case 'receive_close':
      Bot.em(`${data.post_type}.${data.notice_type}.${data.sub_type}`, data)
      break
    default:
      Bot.makeLog('warn', ['未知通知', event], id)
  }
}
