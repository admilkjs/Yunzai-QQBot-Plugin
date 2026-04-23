import _ from 'lodash'
import { config, configSave, refConfig } from './config.js'
import { importJS } from './common.js'

export const setMap = {
  二维码: 'toQRCode',
  按钮回调: 'toCallback',
  转换: 'toQQUin',
  转图片: 'toImg',
  调用统计: 'callStats',
  用户统计: 'userStats'
}

export function getImageUploadProviderLabel () {
  switch (config.imageUploadProvider) {
    case 'chatglm':
      return 'ChatGLM图床'
    case 'ukaka':
      return 'Ukaka签名图床'
    case 'xingye':
      return '星野图床'
    default:
      return 'Bot图链'
  }
}

export function getUploadStatusText () {
  if (!config.toBotUpload) return '关闭'
  return `开启(${getImageUploadProviderLabel()})`
}

export function help (ctx) {
  const { plugin } = ctx
  plugin.reply([' ', segment.button(
    [
      { text: 'dau', callback: '#QQBotdau' },
      { text: 'daupro', callback: '#QQBotdaupro' },
      { text: '调用统计', callback: '#QQBot调用统计' },
      { text: '用户统计', callback: '#QQBot用户统计' }
    ],
    [
      { text: `图片上传:${getUploadStatusText()}`, callback: '#QQBot帮助' },
      { text: `${config.toCallback ? '关闭' : '开启'}按钮回调`, callback: `#QQBot设置按钮回调${config.toCallback ? '关闭' : '开启'}` },
      { text: `${config.callStats ? '关闭' : '开启'}调用统计`, callback: `#QQBot设置调用统计${config.callStats ? '关闭' : '开启'}` }
    ],
    [
      { text: `${config.userStats ? '关闭' : '开启'}用户统计`, callback: `#QQBot设置用户统计${config.userStats ? '关闭' : '开启'}` }
    ]
  )])
}

export function refreshConfig () {
  refConfig()
}

export function listAccounts (ctx) {
  ctx.plugin.reply(`共${config.token.length}个账号：\n${config.token.join('\n')}`, true)
}

export async function saveToken (ctx) {
  const { plugin, adapter } = ctx
  const token = plugin.e.msg.replace(/^#q+bot设置/i, '').trim()
  if (config.token.includes(token)) {
    config.token = config.token.filter(item => item !== token)
    plugin.reply(`账号已删除，重启后生效，共${config.token.length}个账号`, true)
  } else {
    if (await adapter.connect(token)) {
      config.token.push(token)
      plugin.reply(`账号已连接，共${config.token.length}个账号`, true)
    } else {
      plugin.reply('账号连接失败', true)
      return false
    }
  }
  await configSave()
}

export async function saveMarkdown (ctx) {
  const { plugin } = ctx
  let token = plugin.e.msg.replace(/^#q+botm(ark)?d(own)?/i, '').trim().split(':')
  const bot_id = token.shift()
  token = token.join(':')
  plugin.reply(`Bot ${bot_id} Markdown 模板已设置为 ${token}`, true)
  config.markdown[bot_id] = token
  await configSave()
}

export async function saveSetting (ctx) {
  const { plugin } = ctx
  const regRet = /^#q+bot设置(.+)\s*(开启|关闭)$/i.exec(plugin.e.msg)
  const state = regRet[2] === '开启'
  config[setMap[regRet[1]]] = state
  plugin.reply(`设置成功,已${state ? '开启' : '关闭'}`, true)
  await configSave()
}

export async function showDauStat (ctx) {
  const { plugin } = ctx
  const pro = plugin.e.msg.includes('pro')
  const uin = plugin.e.msg.replace(/^#q+botdau(pro)?/i, '') || plugin.e.self_id
  const dau = Bot[uin]?.dau
  if (!dau || !dau.dauDB) return false
  const msg = await dau.getDauStatsMsg(plugin.e, pro)
  if (msg.length) plugin.reply(msg, true)
}

export async function showCallStat (ctx) {
  const { plugin } = ctx
  if (!config.callStats) return false
  const dau = plugin.e.bot.dau
  if (!dau || !dau.dauDB) return false
  const msg = dau.getCallStatsMsg(plugin.e)
  if (msg.length) plugin.reply(msg, true)
}

export async function showUserStat (ctx) {
  const { plugin } = ctx
  if (!config.userStats) return false
  const dau = plugin.e.bot.dau
  if (!dau || !dau.dauDB) return false
  if (dau.dauDB === 'redis') {
    return plugin.reply('用户统计只适配了level,,,', true)
  }
  const msg = await dau.getUserStatsMsg(plugin.e)
  if (msg.length) plugin.reply(msg, true)
}

export async function updateFilterLog (ctx) {
  const { plugin } = ctx
  const match = /^#q+bot(添加|删除)过滤日志(.*)/i.exec(plugin.e.msg)
  let msg = _.trim(match[2]) || ''
  if (!msg) return false

  const isAdd = match[1] === '添加'
  const filterLog = config.filterLog[plugin.e.self_id] || []
  const has = filterLog.includes(msg)

  if ((has && isAdd) || (!has && !isAdd)) return false
  if (!has && isAdd) {
    filterLog.push(msg)
    msg = `【${msg}】添加成功， info日志已过滤该消息`
  } else {
    _.pull(filterLog, msg)
    msg = `【${msg}】删除成功， info日志已恢复打印该消息`
  }
  config.filterLog[plugin.e.self_id] = filterLog
  await configSave()
  plugin.reply(msg, true)
}

export async function oneKeySendGroupMsg (ctx) {
  const { plugin } = ctx
  if (config.oneKeySendGroupMsg === false) return false
  if (plugin.e.adapter_name !== 'QQBot') return false
  const msg = await importJS('Model/template/oneKeySendGroupMsg.js', 'default')
  if (msg === false) {
    plugin.reply('请先设置模版哦', true)
    return
  }

  const groupList = plugin.e.bot.dau.dauDB === 'level'
    ? Object.keys(plugin.e.bot.dau.all_group)
    : [...plugin.e.bot.gl.keys()]
  const getMsg = typeof msg === 'function' ? msg : () => msg
  const errGroupList = []

  for (const key of groupList) {
    if (key === 'total') continue
    const id = plugin.e.bot.dau.dauDB === 'level'
      ? `${plugin.e.self_id}${plugin.e.bot.adapter.sep}${key}`
      : key
    const sendMsg = await getMsg(id)
    if (!sendMsg?.length) continue
    const sendRet = await plugin.e.bot.pickGroup(id).sendMsg(sendMsg)
    if (sendRet.error.length) {
      for (const item of sendRet.error) {
        if (item.message.includes('机器人非群成员')) {
          errGroupList.push(key)
          break
        }
      }
    }
  }

  if (errGroupList.length) await plugin.e.bot.dau.deleteNotExistGroup(errGroupList)
  logger.info(logger.green(`QQBot ${plugin.e.self_id} 群消息一键发送完成，共${groupList.length - 1}个群，失败${errGroupList.length}个`))
}
