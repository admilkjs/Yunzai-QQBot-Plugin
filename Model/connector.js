import { config } from './config.js'
import Dau from './dau.js'

function now () {
  return Date.now()
}

function toErrorMessage (err) {
  if (!err) return ''
  if (typeof err === 'string') return err
  return err.message || JSON.stringify(err)
}

function updateHealth (health, patch = {}) {
  Object.assign(health, patch, { updatedAt: now() })
}

function bindWsHealth (bot) {
  const ws = bot.sdk.ws
  if (!ws || ws.__qqBotHealthBound) return

  ws.__qqBotHealthBound = true
  ws.on('open', () => {
    updateHealth(bot.health, {
      status: 'connected',
      lastConnectAt: now()
    })
  })
  ws.on('message', () => {
    updateHealth(bot.health, { lastHeartbeatAt: now() })
  })
  ws.on('ping', () => {
    updateHealth(bot.health, { lastHeartbeatAt: now() })
  })
  ws.on('pong', () => {
    updateHealth(bot.health, { lastHeartbeatAt: now() })
  })
  ws.on('close', (code, reason) => {
    updateHealth(bot.health, {
      status: 'disconnected',
      lastDisconnectAt: now(),
      closeCode: code,
      closeReason: String(reason || '')
    })
  })
  ws.on('error', (err) => {
    updateHealth(bot.health, {
      status: 'error',
      lastErrorAt: now(),
      lastError: toErrorMessage(err)
    })
  })
}

function bindRuntimeHealth (bot) {
  if (bot.__qqBotHealthRuntimeBound) return
  bot.__qqBotHealthRuntimeBound = true

  const onReady = () => {
    updateHealth(bot.health, {
      status: 'connected',
      lastReadyAt: now(),
      lastConnectAt: bot.health.lastConnectAt || now(),
      lastHeartbeatAt: now()
    })
    bindWsHealth(bot)
  }

  bot.sdk.sessionManager?.on?.('READY', onReady)
  bot.sdk.sessionManager?.on?.('RESUMED', () => {
    updateHealth(bot.health, {
      status: 'connected',
      lastHeartbeatAt: now()
    })
    bindWsHealth(bot)
  })
  bot.sdk.sessionManager?.on?.('CLOSED', () => {
    updateHealth(bot.health, {
      status: 'disconnected',
      lastDisconnectAt: now()
    })
  })
  bot.sdk.sessionManager?.on?.('RECONNECTING', () => {
    updateHealth(bot.health, {
      status: 'reconnecting',
      reconnectCount: (bot.health.reconnectCount || 0) + 1
    })
  })
  bot.sdk.sessionManager?.on?.('ERROR', (err) => {
    updateHealth(bot.health, {
      status: 'error',
      lastErrorAt: now(),
      lastError: toErrorMessage(err)
    })
  })
}

export async function connect (ctx, token) {
  const { adapter, QQBot, require } = ctx

  token = token.split(':')
  const id = token[0]
  const opts = {
    ...config.bot,
    real_self_id: id,
    appid: token[1],
    token: token[2],
    secret: token[3],
    intents: [
      'GUILDS',
      'GUILD_MEMBERS',
      'GUILD_MESSAGE_REACTIONS',
      'DIRECT_MESSAGE',
      'INTERACTION',
      'MESSAGE_AUDIT'
    ],
    mode: 'websocket'
  }

  if (Number(token[4])) opts.intents.push('GROUP_AT_MESSAGE_CREATE', 'C2C_MESSAGE_CREATE')
  if (Number(token[5])) opts.intents.push('GUILD_MESSAGES')
  else opts.intents.push('PUBLIC_GUILD_MESSAGES')

  const sdk = new QQBot(opts)
  if (config.bus?.[id]) {
    const keys = Object.keys(config.bus)
    const { sandbox, appid } = opts
    const base = sandbox
      ? `https://${config.bus[id]}/proxy?url=https://sandbox.api.sgroup.qq.com`
      : `https://${config.bus[id]}/proxy?url=https://api.sgroup.qq.com`
    sdk.request.defaults.baseURL = base

    const { SessionManager } = require('qq-official-bot/lib/sessionManager.js')
    Object.assign(SessionManager.prototype, {
      getWsUrl: async function () {
        return new Promise((resolve) => {
          this.bot.request
            .get('/gateway/bot', {
              headers: {
                Accept: '*/*',
                'Accept-Encoding': 'utf-8',
                'Accept-Language': 'zh-CN,zh;q=0.8',
                Connection: 'keep-alive',
                'User-Agent': 'v1',
                Authorization: ''
              }
            })
            .then((res) => {
              if (!res.data) throw new Error('获取ws连接信息异常')
              this.wsUrl = keys.some(i => i === this.bot.config.real_self_id)
                ? `wss://${config.bus[id]}/ws?url=${res.data.url}&appid=${appid}`
                : res.data.url
              logger.info(`WebSocket URL 已更新: ${this.wsUrl}`)
              resolve(this.wsUrl)
            })
        })
      }
    })
  }

  Bot[id] = {
    adapter,
    sdk,
    login () {
      return new Promise(resolve => {
        this.sdk.sessionManager.once('READY', resolve)
        this.sdk.start()
      })
    },
    logout () {
      return new Promise(resolve => {
        this.sdk.ws.once('close', resolve)
        this.sdk.stop()
      })
    },
    uin: id,
    info: { id, ...opts },
    get nickname () { return this.sdk.nickname },
    get avatar () { return `https://q.qlogo.cn/g?b=qq&s=0&nk=${id}` },
    version: {
      id: adapter.id,
      name: adapter.name,
      version: adapter.version
    },
    stat: {
      start_time: Date.now() / 1000,
      recv_msg_cnt: 0
    },
    pickFriend: user_id => adapter.pickFriend(id, user_id),
    get pickUser () { return this.pickFriend },
    getFriendMap () { return this.fl },
    fl: await adapter.getFriendMap(id),
    pickMember: (group_id, user_id) => adapter.pickMember(id, group_id, user_id),
    pickGroup: group_id => adapter.pickGroup(id, group_id),
    getGroupMap () { return this.gl },
    gl: await adapter.getGroupMap(id),
    gml: await adapter.getMemberMap(id),
    dau: new Dau(id, adapter.sep, config.dauDB),
    callback: {},
    health: {
      status: 'connecting',
      startedAt: now(),
      updatedAt: now(),
      lastConnectAt: null,
      lastReadyAt: null,
      lastDisconnectAt: null,
      lastHeartbeatAt: null,
      lastErrorAt: null,
      lastError: '',
      reconnectCount: 0,
      closeCode: null,
      closeReason: '',
      isUsingBus: !!config.bus?.[id],
      wsUrl: ''
    }
  }

  Bot[id].sdk.logger = {}
  for (const level of ['trace', 'debug', 'info', 'mark', 'warn', 'error', 'fatal']) {
    Bot[id].sdk.logger[level] = (...args) => {
      if (config.simplifiedSdkLog) {
        if (args?.[0]?.match?.(/^send to/)) {
          args[0] = args[0].replace(/<(.+?)(,.*?)>/g, (v, k1) => `<${k1}>`)
        } else if (args?.[0]?.match?.(/^recv from/)) {
          return
        }
      }
      Bot.makeLog(level, args, id)
    }
  }

  bindRuntimeHealth(Bot[id])
  await Bot[id].login()
  await Bot[id].dau.init()
  bindWsHealth(Bot[id])

  const touchHeartbeat = () => {
    updateHealth(Bot[id].health, { lastHeartbeatAt: now() })
  }

  Bot[id].sdk.on('message', event => {
    touchHeartbeat()
    adapter.makeMessage(id, event)
  })
  Bot[id].sdk.on('notice', event => {
    touchHeartbeat()
    adapter.makeNotice(id, event)
  })
  Bot[id].health.wsUrl = Bot[id].sdk.sessionManager?.wsUrl || Bot[id].sdk.ws?.url || ''

  Bot.makeLog('mark', `${adapter.name}(${adapter.id}) ${adapter.version} 已连接`, id)
  Bot.em(`connect.${id}`, { self_id: id })
  return true
}

export async function load (ctx) {
  const { adapter } = ctx
  for (const token of config.token) {
    await new Promise(resolve => {
      adapter.connect(token).then(resolve)
      setTimeout(resolve, 5000)
    })
  }
}
