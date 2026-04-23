import _ from 'lodash'
import Handler from '../../../lib/plugins/handler.js'
import { config } from './config.js'

export function pickFriend (ctx, id, user_id) {
  const { adapter, userIdCache } = ctx
  if (config.toQQUin && userIdCache[user_id]) user_id = userIdCache[user_id]
  if (user_id.startsWith('qg_')) return pickGuildFriend(ctx, id, user_id)

  const i = {
    ...Bot[id].fl.get(user_id),
    self_id: id,
    bot: Bot[id],
    user_id: user_id.replace(`${id}${adapter.sep}`, '')
  }
  return {
    ...i,
    sendMsg: msg => adapter.sendFriendMsg(i, msg),
    recallMsg: message_id => adapter.recallFriendMsg(i, message_id),
    getAvatarUrl: () => `https://q.qlogo.cn/qqapp/${i.bot.info.appid}/${i.user_id}/0`
  }
}

export function pickMember (ctx, id, group_id, user_id) {
  const { adapter, userIdCache } = ctx
  if (config.toQQUin && userIdCache[user_id]) user_id = userIdCache[user_id]
  if (user_id.startsWith('qg_')) return pickGuildMember(ctx, id, group_id, user_id)

  const i = {
    ...Bot[id].fl.get(user_id),
    ...Bot[id].gml.get(group_id)?.get(user_id),
    self_id: id,
    bot: Bot[id],
    user_id: user_id.replace(`${id}${adapter.sep}`, ''),
    group_id: group_id.replace(`${id}${adapter.sep}`, '')
  }
  return {
    ...pickFriend(ctx, id, user_id),
    ...i
  }
}

export function pickGroup (ctx, id, group_id) {
  if (group_id.startsWith?.('qg_')) return pickGuild(ctx, id, group_id)

  const i = {
    ...Bot[id].gl.get(group_id),
    self_id: id,
    bot: Bot[id],
    group_id: group_id.replace?.(`${id}${ctx.adapter.sep}`, '') || group_id
  }
  return {
    ...i,
    sendMsg: msg => ctx.adapter.sendGroupMsg(i, msg),
    pickMember: user_id => pickMember(ctx, id, group_id, user_id),
    recallMsg: message_id => ctx.adapter.recallGroupMsg(i, message_id),
    getMemberMap: () => i.bot.gml.get(group_id)
  }
}

export function pickGuildFriend (ctx, id, user_id) {
  const i = {
    ...Bot[id].fl.get(user_id),
    self_id: id,
    bot: Bot[id],
    user_id: user_id.replace(/^qg_/, '')
  }
  return {
    ...i,
    sendMsg: msg => ctx.adapter.sendDirectMsg(i, msg),
    recallMsg: (message_id, hide) => ctx.adapter.recallDirectMsg(i, message_id, hide)
  }
}

export function pickGuildMember (ctx, id, group_id, user_id) {
  const guild_id = group_id.replace(/^qg_/, '').split('-')
  const i = {
    ...Bot[id].fl.get(user_id),
    ...Bot[id].gml.get(group_id)?.get(user_id),
    self_id: id,
    bot: Bot[id],
    src_guild_id: guild_id[0],
    src_channel_id: guild_id[1],
    user_id: user_id.replace(/^qg_/, '')
  }
  return {
    ...pickGuildFriend(ctx, id, user_id),
    ...i,
    sendMsg: msg => ctx.adapter.sendDirectMsg(i, msg),
    recallMsg: (message_id, hide) => ctx.adapter.recallDirectMsg(i, message_id, hide)
  }
}

export function pickGuild (ctx, id, group_id) {
  const guild_id = group_id.replace(/^qg_/, '').split('-')
  const i = {
    ...Bot[id].gl.get(group_id),
    self_id: id,
    bot: Bot[id],
    guild_id: guild_id[0],
    channel_id: guild_id[1]
  }
  return {
    ...i,
    sendMsg: msg => ctx.adapter.sendGuildMsg(i, msg),
    recallMsg: (message_id, hide) => ctx.adapter.recallGuildMsg(i, message_id, hide),
    pickMember: user_id => pickGuildMember(ctx, id, group_id, user_id),
    getMemberMap: () => i.bot.gml.get(group_id)
  }
}

export async function makeFriendMessage (ctx, data, event) {
  const { adapter } = ctx
  data.sender = {
    user_id: `${data.self_id}${adapter.sep}${event.sender.user_id}`
  }
  Bot.makeLog('info', `好友消息：[${data.user_id}] ${data.raw_message}`, data.self_id)
  data.reply = msg => adapter.sendFriendMsg({ ...data, user_id: event.sender.user_id }, msg, { id: data.message_id })
  await setFriendMap(ctx, data)
}

export async function makeGroupMessage (ctx, data, event) {
  const { adapter, userIdCache } = ctx
  data.sender = {
    user_id: `${data.self_id}${adapter.sep}${event.sender.user_id}`
  }
  data.group_id = `${data.self_id}${adapter.sep}${event.group_id}`

  if (config.toQQUin && Handler.has('ws.tool.findUserId')) {
    const user_id = await Handler.call('ws.tool.findUserId', { user_id: data.user_id })
    if (user_id?.custom) {
      userIdCache[user_id.custom] = data.user_id
      data.sender.user_id = user_id.custom
    }
  }

  const filterLog = config.filterLog?.[data.self_id] || []
  const logStat = filterLog.includes(_.trim(data.raw_message)) ? 'debug' : 'info'
  Bot.makeLog(logStat, `群消息：[${data.group_id}, ${data.user_id}] ${data.raw_message}`, data.self_id)

  data.reply = msg => adapter.sendGroupMsg({ ...data, group_id: event.group_id }, msg, { id: data.message_id })
  await setGroupMap(ctx, data)
}

export async function makeDirectMessage (ctx, data, event) {
  const { adapter } = ctx
  data.sender = {
    ...data.bot.fl.get(`qg_${event.sender.user_id}`),
    ...event.sender,
    user_id: `qg_${event.sender.user_id}`,
    nickname: event.sender.user_name,
    avatar: event.author.avatar,
    guild_id: event.guild_id,
    channel_id: event.channel_id,
    src_guild_id: event.src_guild_id
  }
  Bot.makeLog('info', `频道私聊消息：[${data.sender.nickname}(${data.user_id})] ${data.raw_message}`, data.self_id)
  data.reply = msg => adapter.sendDirectMsg({
    ...data,
    user_id: event.user_id,
    guild_id: event.guild_id,
    channel_id: event.channel_id
  }, msg, { id: data.message_id })
  await setFriendMap(ctx, data)
}

export async function makeGuildMessage (ctx, data, event) {
  const { adapter, userIdCache } = ctx
  data.message_type = 'group'
  data.sender = {
    ...data.bot.fl.get(`qg_${event.sender.user_id}`),
    ...event.sender,
    user_id: `qg_${event.sender.user_id}`,
    nickname: event.sender.user_name,
    card: event.member.nick,
    avatar: event.author.avatar,
    src_guild_id: event.guild_id,
    src_channel_id: event.channel_id
  }

  if (config.toQQUin && Handler.has('ws.tool.findUserId')) {
    const user_id = await Handler.call('ws.tool.findUserId', { user_id: data.user_id })
    if (user_id?.custom) {
      userIdCache[user_id.custom] = data.user_id
      data.sender.user_id = user_id.custom
    }
  }

  data.group_id = `qg_${event.guild_id}-${event.channel_id}`
  Bot.makeLog('info', `频道消息：[${data.group_id}, ${data.sender.nickname}(${data.user_id})] ${data.raw_message}`, data.self_id)
  data.reply = msg => adapter.sendGuildMsg({
    ...data,
    guild_id: event.guild_id,
    channel_id: event.channel_id
  }, msg, { id: data.message_id })
  await setFriendMap(ctx, data)
  await setGroupMap(ctx, data)
}

export async function setFriendMap (ctx, data) {
  if (!data.user_id) return
  await data.bot.fl.set(data.user_id, {
    ...data.bot.fl.get(data.user_id),
    ...data.sender
  })
}

export async function setGroupMap (ctx, data) {
  if (!data.group_id) return
  await data.bot.gl.set(data.group_id, {
    ...data.bot.gl.get(data.group_id),
    group_id: data.group_id
  })
  let gml = data.bot.gml.get(data.group_id)
  if (!gml) {
    gml = new Map()
    await data.bot.gml.set(data.group_id, gml)
  }
  await gml.set(data.user_id, {
    ...gml.get(data.user_id),
    ...data.sender
  })
}

export async function makeMessage (ctx, id, event) {
  const { adapter } = ctx
  const data = {
    raw: event,
    bot: Bot[id],
    self_id: id,
    post_type: event.post_type,
    message_type: event.message_type,
    sub_type: event.sub_type,
    message_id: event.message_id,
    get user_id () { return this.sender.user_id },
    message: event.message,
    raw_message: event.raw_message
  }

  for (const i of data.message) {
    if (i.type === 'at') {
      i.qq = data.message_type === 'group'
        ? `${data.self_id}${adapter.sep}${i.user_id}`
        : `qg_${i.user_id}`
    }
  }

  switch (data.message_type) {
    case 'private':
    case 'direct':
      if (data.sub_type === 'friend') await makeFriendMessage(ctx, data, event)
      else await makeDirectMessage(ctx, data, event)
      break
    case 'group':
      await makeGroupMessage(ctx, data, event)
      break
    case 'guild':
      await makeGuildMessage(ctx, data, event)
      if (data.message.length === 0) data.message.push({ type: 'text', text: '' })
      break
    default:
      Bot.makeLog('warn', ['未知消息', event], id)
      return
  }

  data.bot.stat.recv_msg_cnt++
  Bot[data.self_id].dau.setDau('receive_msg', data)
  Bot.em(`${data.post_type}.${data.message_type}.${data.sub_type}`, data)
}
