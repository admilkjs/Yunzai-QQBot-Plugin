import fs from 'node:fs'
import QRCode from 'qrcode'
import { join } from 'node:path'
import imageSize from 'image-size'
import { randomUUID } from 'node:crypto'
import { encode as encodeSilk } from 'silk-wasm'
import {
  importJS,
  Handler,
  config,
  uploadImageByProvider,
  patchSegmentFile,
  normalizeFileSegment,
  makeRawMarkdownMsg,
  makeMarkdownText,
  makeMarkdownTemplate,
  makeMarkdownMsg,
  makeMsg,
  sendMsg,
  makeGuildMsg,
  sendGMsg,
  pickFriend,
  pickMember,
  pickGroup,
  pickGuildFriend,
  pickGuildMember,
  pickGuild,
  makeFriendMessage,
  makeGroupMessage,
  makeDirectMessage,
  makeGuildMessage,
  setFriendMap,
  setGroupMap,
  makeMessage,
  makeCallback,
  makeNotice,
  connect,
  load,
  setMap,
  help as adminHelp,
  refreshConfig,
  listAccounts,
  saveToken,
  saveMarkdown,
  saveSetting,
  showDauStat,
  showCallStat,
  showUserStat,
  updateFilterLog,
  oneKeySendGroupMsg as runOneKeySendGroupMsg
} from './Model/index.js'
import { createRequire } from 'module'
import { Bot as QQBot } from 'qq-official-bot'
const require = createRequire(import.meta.url)

const startTime = new Date()
logger.info(logger.yellow('- 正在加载 QQBot 适配器插件'))

const userIdCache = {}
const markdown_template = await importJS('Model/template/markdownTemplate.js', 'default')
const TmplPkg = await importJS('templates/index.js')
patchSegmentFile(segment)

const adapter = new class QQBotAdapter {
  constructor () {
    this.id = 'QQBot'
    this.name = 'QQBot'
    this.path = 'data/QQBot/'
    this.version = 'qq-group-bot v11.45.14'

    if (typeof config.toQRCode == 'boolean') {
      this.toQRCodeRegExp = config.toQRCode ? /(?<!\[(.*?)\]\()https?:\/\/[-\w_]+(\.[-\w_]+)+([-\w.,@?^=%&:/~+#]*[-\w@?^=%&/~+#])?/g : false
    } else {
      this.toQRCodeRegExp = new RegExp(config.toQRCode, 'g')
    }

    this.sep = config.sep || ((process.platform == 'win32') && '') || ':'
  }

  async makeRecord (file) {
    if (config.toBotUpload) {
      for (const i of Bot.uin) {
        if (!Bot[i].uploadRecord) continue
        try {
          const url = await Bot[i].uploadRecord(file)
          if (url) return url
        } catch (err) {
          Bot.makeLog('error', ['Bot', i, '语音上传错误', file, err])
        }
      }
    }

    const inputFile = join('temp', randomUUID())
    const pcmFile = join('temp', randomUUID())

    try {
      fs.writeFileSync(inputFile, await Bot.Buffer(file))
      await Bot.exec(`ffmpeg -i "${inputFile}" -f s16le -ar 48000 -ac 1 "${pcmFile}"`)
      file = Buffer.from((await encodeSilk(fs.readFileSync(pcmFile), 48000)).data)
    } catch (err) {
      logger.error(`silk 转码错误：${err}`)
    }

    for (const i of [inputFile, pcmFile]) {
      try {
        fs.unlinkSync(i)
      } catch (err) { }
    }
    return file
  }

  async makeQRCode (data) {
    return (await QRCode.toDataURL(data)).replace('data:image/png;base64,', 'base64://')
  }

  async makeRawMarkdownText (data, text, button) {
    const match = text.match(this.toQRCodeRegExp)
    if (match) {
      for (const url of match) {
        button.push(...this.makeButtons(data, [[{ text: url, link: url }]]))
        const img = await this.makeMarkdownImage(data, await this.makeQRCode(url), '二维码')
        text = text.replace(url, `${img.des}${img.url}`)
      }
    }
    return text.replace(/@/g, '@​')
  }

  async makeBotImage (file) {
    if (!config.toBotUpload) return false

    if (config.imageUploadProvider && config.imageUploadProvider !== 'bot') {
      try {
        const image = await uploadImageByProvider(config.imageUploadProvider, file)
        if (image?.url) return image
      } catch (err) {
        Bot.makeLog('error', ['图片上传错误', config.imageUploadProvider, err])
      }
      return false
    }

    for (const i of Bot.uin) {
      if (!Bot[i].uploadImage) continue
      try {
        const image = await Bot[i].uploadImage(file)
        if (image.url) return image
      } catch (err) {
        Bot.makeLog('error', ['Bot', i, '图片上传错误', file, err])
      }
    }
    return false
  }

  async makeMarkdownImage (data, file, summary = '图片') {
    const buffer = await Bot.Buffer(file)
    const image =
      await this.makeBotImage(buffer) ||
      { url: await Bot.fileToUrl(file) }

    if (!image.width || !image.height) {
      try {
        const size = imageSize(buffer)
        image.width = size.width
        image.height = size.height
      } catch (err) {
        Bot.makeLog('error', ['图片分辨率检测错误', file, err], data.self_id)
      }
    }

    image.width = Math.floor(image.width * config.markdownImgScale)
    image.height = Math.floor(image.height * config.markdownImgScale)
    if (Handler.has('QQBot.makeMarkdownImage')) {
      const res = await Handler.call(
        'QQBot.makeMarkdownImage',
        data,
        {
          image,
          buffer,
          file,
          summary,
          config
        }
      )
      if (res) {
        typeof res == 'object' ? Object.assign(image, res) : image.url = res
      }
    }
    return {
      des: `![${summary} #${image.width || 0}px #${image.height || 0}px]`,
      url: `(${image.url})`
    }
  }

  collectFileMessage (data, fileSegment) {
    if (config.file?.enable === false) return false

    const fileData = normalizeFileSegment(fileSegment)
    if (!fileData?.file) return false

    if (!Array.isArray(data._files)) data._files = []
    data._files.push(fileData)
    return true
  }

  getMessageContext () {
    return {
      adapter: this,
      markdownTemplate: markdown_template,
      tmplPkg: TmplPkg,
      userIdCache
    }
  }

  getSessionContext () {
    return {
      adapter: this,
      userIdCache
    }
  }

  getEventContext () {
    return {
      adapter: this
    }
  }

  getConnectorContext () {
    return {
      adapter: this,
      QQBot,
      require
    }
  }

  makeButton (data, button) {
    const msg = {
      id: randomUUID(),
      render_data: {
        label: button.text,
        visited_label: button.clicked_text,
        style: button.style ?? 1,
        ...button.QQBot?.render_data
      }
    }

    if (button.input) {
      msg.action = {
        type: 2,
        permission: { type: 2 },
        data: button.input,
        enter: button.send,
        ...button.QQBot?.action
      }
    } else if (button.callback) {
      if (config.toCallback) {
        msg.action = {
          type: 1,
          permission: { type: 2 },
          ...button.QQBot?.action
        }
        if (!Array.isArray(data._ret_id)) data._ret_id = []

        data.bot.callback[msg.id] = {
          id: data.message_id,
          user_id: data.user_id,
          group_id: data.group_id,
          message: button.callback,
          message_id: data._ret_id
        }
        setTimeout(() => delete data.bot.callback[msg.id], 300000)
      } else {
        msg.action = {
          type: 2,
          permission: { type: 2 },
          data: button.callback,
          enter: true,
          ...button.QQBot?.action
        }
      }
    } else if (button.link) {
      msg.action = {
        type: 0,
        permission: { type: 2 },
        data: button.link,
        ...button.QQBot?.action
      }
    } else return false

    if (button.permission) {
      if (button.permission == 'admin') {
        msg.action.permission.type = 1
      } else {
        msg.action.permission.type = 0
        msg.action.permission.specify_user_ids = []
        if (!Array.isArray(button.permission)) button.permission = [button.permission]
        for (let id of button.permission) {
          if (config.toQQUin && userIdCache[id]) id = userIdCache[id]
          msg.action.permission.specify_user_ids.push(id.replace(`${data.self_id}${this.sep}`, ''))
        }
      }
    }
    return msg
  }

  makeButtons (data, button_square) {
    const msgs = []
    for (const button_row of button_square) {
      const buttons = []
      for (let button of button_row) {
        button = this.makeButton(data, button)
        if (button) buttons.push(button)
      }
      if (buttons.length) { msgs.push({ type: 'button', buttons }) }
    }
    return msgs
  }

  async makeRawMarkdownMsg (data, msg) {
    return makeRawMarkdownMsg(this.getMessageContext(), data, msg)
  }

  makeMarkdownText (data, text, button) {
    return makeMarkdownText(this.getMessageContext(), data, text, button)
  }

  makeMarkdownTemplate (data, template) {
    return makeMarkdownTemplate(this.getMessageContext(), data, template)
  }

  async makeMarkdownMsg (data, msg) {
    return makeMarkdownMsg(this.getMessageContext(), data, msg)
  }

  async makeMsg (data, msg) {
    return makeMsg(this.getMessageContext(), data, msg)
  }

  async sendMsg (data, send, msg) {
    return sendMsg(this.getMessageContext(), data, send, msg)
  }

  sendFriendMsg (data, msg, event) {
    return this.sendMsg(data, msg => data.bot.sdk.sendPrivateMessage(data.user_id, msg, event), msg)
  }

  async sendGroupMsg (data, msg, event) {
    if (Handler.has('QQBot.group.sendMsg')) {
      const res = await Handler.call(
        'QQBot.group.sendMsg',
        data,
        {
          self_id: data.self_id,
          group_id: `${data.self_id}${this.sep}${data.group_id}`,
          raw_group_id: data.group_id,
          user_id: data.user_id,
          msg,
          event
        }
      )
      if (res !== false) {
        return res
      }
    }
    return this.sendMsg(data, msg => data.bot.sdk.sendGroupMessage(data.group_id, msg, event), msg)
  }

  async makeGuildMsg (data, msg) {
    return makeGuildMsg(this.getMessageContext(), data, msg)
  }

  async sendGMsg (data, send, msg) {
    return sendGMsg(this.getMessageContext(), data, send, msg)
  }

  async sendDirectMsg (data, msg, event) {
    if (!data.guild_id) {
      if (!data.src_guild_id) {
        Bot.makeLog('error', [`发送频道私聊消息失败：[${data.user_id}] 不存在来源频道信息`, msg], data.self_id)
        return false
      }
      const dms = await data.bot.sdk.createDirectSession(data.src_guild_id, data.user_id)
      data.guild_id = dms.guild_id
      data.channel_id = dms.channel_id
      data.bot.fl.set(`qg_${data.user_id}`, {
        ...data.bot.fl.get(`qg_${data.user_id}`),
        ...dms
      })
    }
    return this.sendGMsg(data, msg => data.bot.sdk.sendDirectMessage(data.guild_id, msg, event), msg)
  }

  async recallMsg (data, recall, message_id) {
    if (!Array.isArray(message_id)) message_id = [message_id]
    const msgs = []
    for (const i of message_id) {
      try {
        msgs.push(await recall(i))
      } catch (err) {
        Bot.makeLog('debug', ['撤回消息错误', i, err], data.self_id)
        msgs.push(false)
      }
    }
    return msgs
  }

  recallFriendMsg (data, message_id) {
    Bot.makeLog('info', `撤回好友消息：[${data.user_id}] ${message_id}`, data.self_id)
    return this.recallMsg(data, i => data.bot.sdk.recallFriendMessage(data.user_id, i), message_id)
  }

  recallGroupMsg (data, message_id) {
    Bot.makeLog('info', `撤回群消息：[${data.group_id}] ${message_id}`, data.self_id)
    return this.recallMsg(data, i => data.bot.sdk.recallGroupMessage(data.group_id, i), message_id)
  }

  recallDirectMsg (data, message_id, hide = config.hideGuildRecall) {
    Bot.makeLog('info', `撤回${hide ? '并隐藏' : ''}频道私聊消息：[${data.guild_id}] ${message_id}`, data.self_id)
    return this.recallMsg(data, i => data.bot.sdk.recallDirectMessage(data.guild_id, i, hide), message_id)
  }

  recallGuildMsg (data, message_id, hide = config.hideGuildRecall) {
    Bot.makeLog('info', `撤回${hide ? '并隐藏' : ''}频道消息：[${data.channel_id}] ${message_id}`, data.self_id)
    return this.recallMsg(data, i => data.bot.sdk.recallGuildMessage(data.channel_id, i, hide), message_id)
  }

  sendGuildMsg (data, msg, event) {
    return this.sendGMsg(data, msg => data.bot.sdk.sendGuildMessage(data.channel_id, msg, event), msg)
  }

  pickFriend (id, user_id) {
    return pickFriend(this.getSessionContext(), id, user_id)
  }

  pickMember (id, group_id, user_id) {
    return pickMember(this.getSessionContext(), id, group_id, user_id)
  }

  pickGroup (id, group_id) {
    return pickGroup(this.getSessionContext(), id, group_id)
  }

  pickGuildFriend (id, user_id) {
    return pickGuildFriend(this.getSessionContext(), id, user_id)
  }

  pickGuildMember (id, group_id, user_id) {
    return pickGuildMember(this.getSessionContext(), id, group_id, user_id)
  }

  pickGuild (id, group_id) {
    return pickGuild(this.getSessionContext(), id, group_id)
  }

  async makeFriendMessage (data, event) {
    return makeFriendMessage(this.getSessionContext(), data, event)
  }

  async makeGroupMessage (data, event) {
    return makeGroupMessage(this.getSessionContext(), data, event)
  }

  async makeDirectMessage (data, event) {
    return makeDirectMessage(this.getSessionContext(), data, event)
  }

  async makeGuildMessage (data, event) {
    return makeGuildMessage(this.getSessionContext(), data, event)
  }

  async setFriendMap (data) {
    return setFriendMap(this.getSessionContext(), data)
  }

  async setGroupMap (data) {
    return setGroupMap(this.getSessionContext(), data)
  }

  async makeMessage (id, event) {
    return makeMessage(this.getSessionContext(), id, event)
  }

  async makeCallback (id, event) {
    return makeCallback(this.getEventContext(), id, event)
  }

  makeNotice (id, event) {
    return makeNotice(this.getEventContext(), id, event)
  }

  getFriendMap (id) {
    return Bot.getMap(`${this.path}${id}/Friend`)
  }

  getGroupMap (id) {
    return Bot.getMap(`${this.path}${id}/Group`)
  }

  getMemberMap (id) {
    return Bot.getMap(`${this.path}${id}/Member`)
  }

  async connect (token) {
    return connect(this.getConnectorContext(), token)
  }

  async load () {
    return load(this.getConnectorContext())
  }
}()

Bot.adapter.push(adapter)

function createAdminContext (plugin) {
  return {
    adapter,
    plugin
  }
}

export class QQBotAdapter extends plugin {
  constructor () {
    super({
      name: 'QQBotAdapter',
      dsc: 'QQBot 适配器设置',
      event: 'message',
      rule: [
        {
          reg: /^#q+bot(帮助|help)$/i,
          fnc: 'help',
          permission: config.permission
        },
        {
          reg: /^#q+bot账号$/i,
          fnc: 'List',
          permission: config.permission
        },
        {
          reg: /^#q+bot设置[0-9]+:[0-9]+:.+:.+:[01]:[01]$/i,
          fnc: 'Token',
          permission: config.permission
        },
        {
          reg: /^#q+botm(ark)?d(own)?[0-9]+:/i,
          fnc: 'Markdown',
          permission: config.permission
        },
        {
          reg: new RegExp(`^#q+bot设置(${Object.keys(setMap).join('|')})\\s*(开启|关闭)$`, 'i'),
          fnc: 'Setting',
          permission: config.permission
        },
        {
          reg: /^#q+botdau/i,
          fnc: 'DAUStat',
          permission: config.permission
        },
        {
          reg: /^#q+bot调用统计$/i,
          fnc: 'callStat',
          permission: config.permission
        },
        {
          reg: /^#q+bot用户统计$/i,
          fnc: 'userStat',
          permission: config.permission
        },
        {
          reg: /^#q+bot刷新co?n?fi?g$/i,
          fnc: 'refConfig',
          permission: config.permission
        },
        {
          reg: /^#q+bot(添加|删除)过滤日志/i,
          fnc: 'filterLog',
          permission: config.permission
        },
        {
          reg: /^#q+bot一键群发$/i,
          fnc: 'oneKeySendGroupMsg',
          permission: config.permission
        }
      ]
    })
  }

  help () {
    return adminHelp(createAdminContext(this))
  }

  refConfig () {
    return refreshConfig()
  }

  List () {
    return listAccounts(createAdminContext(this))
  }

  async Token () {
    return saveToken(createAdminContext(this))
  }

  async Markdown () {
    return saveMarkdown(createAdminContext(this))
  }

  async Setting () {
    return saveSetting(createAdminContext(this))
  }

  async DAUStat () {
    return showDauStat(createAdminContext(this))
  }

  async callStat () {
    return showCallStat(createAdminContext(this))
  }

  async userStat () {
    return showUserStat(createAdminContext(this))
  }

  // 自欺欺人大法
  async filterLog () {
    return updateFilterLog(createAdminContext(this))
  }

  async oneKeySendGroupMsg () {
    return runOneKeySendGroupMsg(createAdminContext(this))
  }
}

const endTime = new Date()
logger.info(logger.green(`- QQBot 适配器插件 加载完成! 耗时：${endTime - startTime}ms`))
