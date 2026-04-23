import { config, configSave } from '../Model/index.js'
import _ from 'lodash'
import fs from 'fs'
import { join } from 'path'

export default {
  router: {
    meta: {
      // 路由显示的名字
      title: 'QQBot-Plugin',
      // 路由图标 https://icon-sets.iconify.design/
      icon: 'bxs:bot'
    },
    // 子路由 仅支持二级路由
    children: [
      {
        // 显示的url 需要带上 /
        path: '/setting',
        // 对应当前目录下的 .vue文件 即显示的组件
        name: 'setting',
        meta: {
          // 路由显示的名字
          title: '设置',
          // 路由图标 https://icon-sets.iconify.design/
          icon: 'ant-design:setting-filled',
          // 是否显示父级菜单, 如果子路由只有一个的话会生成二级路由
          // 如果为false 并且只有一个子路由 则不会显示父级菜单
          showParent: true
        }
      },
      {
        path: '/dau',
        name: 'dau',
        meta: {
          title: 'DAU统计',
          icon: 'bxs:bar-chart-square'
        }
      },
      {
        path: '/status',
        name: 'status',
        meta: {
          title: '连接状态',
          icon: 'mdi:heartbeat'
        }
      }
    ]
  },
  // 使用fastify.route注册路由
  api: [
    {
      // 接口的url
      url: '/get-setting-data',
      // 请求方法
      method: 'post',
      // 如果不需要鉴权可以取消这段注释
      // preHandler: (request, reply, done) => done(),
      // 回调函数
      handler: (request, reply) => {
        let maxRetry = config.bot.maxRetry
        if (maxRetry === Infinity) {
          maxRetry = 0
        }
        return {
          success: true,
          data: {
            ...config,
            bot: {
              ...config.bot,
              maxRetry
            }
          }
        }
      }
      // 可以有wsHandler 不需要onopen, 连接即op
      // wsHandler: (ws, request) => {}
    },
    {
      url: '/set-setting-data',
      method: 'post',
      handler: async ({ body }) => {
        const { data } = body
        if (data.bot.maxRetry === 0) {
          data.bot.maxRetry = Infinity
        }
        for (const key in data) {
          config[key] = data[key]
        }
        try {
          await configSave()
          return {
            success: true
          }
        } catch (error) {
          return {
            success: false,
            message: (error).message
          }
        }
      }
    },
    {
      url: '/get-home-data',
      method: 'post',
      handler: async ({ body: { uin } }) => {
        const QQBotMap = {}
        Bot.uin.forEach(i => {
          if (Bot[i].adapter?.name === 'QQBot') {
            if (!uin) {
              uin = i
            }
            QQBotMap[i] = {
              uin: i,
              nickname: Bot[i].nickname,
              avatar: Bot[i].avatar
            }
          }
        })
        if (!uin) {
          return {
            success: false,
            message: '没有找到QQBot'
          }
        }
        return {
          success: true,
          data: {
            QQBotMap,
            uin,
            chartData: await getDauChartData(uin),
            weekData: await getWeekChartData(uin),
            callStat: await getcallStat(uin)
          }
        }
      }
    },
    {
      url: '/get-status-data',
      method: 'post',
      handler: async () => {
        const bots = []
        Bot.uin.forEach(uin => {
          if (Bot[uin].adapter?.name !== 'QQBot') return
          bots.push(getBotStatus(uin))
        })
        return {
          success: true,
          data: {
            bots,
            summary: getStatusSummary(bots)
          }
        }
      }
    },
    {
      url: '/reconnect-bot',
      method: 'post',
      handler: async ({ body }) => {
        const uin = body?.uin
        if (!uin) {
          return { success: false, message: '缺少机器人账号' }
        }

        const token = config.token.find(item => item.startsWith(`${uin}:`))
        if (!token) {
          return { success: false, message: '未找到对应 token 配置' }
        }

        try {
          if (Bot[uin]?.health) {
            Bot[uin].health.status = 'reconnecting'
            Bot[uin].health.updatedAt = Date.now()
            Bot[uin].health.reconnectCount = (Bot[uin].health.reconnectCount || 0) + 1
          }
          if (Bot[uin]?.logout) {
            await Promise.race([
              Bot[uin].logout(),
              new Promise(resolve => setTimeout(resolve, 5000))
            ])
          }
          const ok = await Bot[uin]?.adapter?.connect?.(token)
          return {
            success: !!ok,
            message: ok ? '重连成功' : '重连失败'
          }
        } catch (error) {
          return {
            success: false,
            message: error.message
          }
        }
      }
    }
  ]
}

function getBotStatus (uin) {
  const bot = Bot[uin]
  const health = bot.health || {}
  const ws = bot.sdk?.ws
  const heartbeatAge = health.lastHeartbeatAt ? Date.now() - health.lastHeartbeatAt : null

  return {
    uin,
    nickname: bot.nickname,
    avatar: bot.avatar,
    status: health.status || 'unknown',
    statusLabel: getStatusLabel(health.status),
    startedAt: health.startedAt || null,
    updatedAt: health.updatedAt || null,
    lastConnectAt: health.lastConnectAt || null,
    lastReadyAt: health.lastReadyAt || null,
    lastDisconnectAt: health.lastDisconnectAt || null,
    lastHeartbeatAt: health.lastHeartbeatAt || null,
    heartbeatAge,
    lastErrorAt: health.lastErrorAt || null,
    lastError: health.lastError || '',
    reconnectCount: health.reconnectCount || 0,
    closeCode: health.closeCode ?? null,
    closeReason: health.closeReason || '',
    isUsingBus: !!health.isUsingBus,
    wsUrl: health.wsUrl || '',
    readyState: ws?.readyState ?? null,
    recvMsgCount: bot.stat?.recv_msg_cnt || 0,
    sendMsgCount: bot.dau?.todayData?.send_msg_count || 0,
    groupCount: bot.gl?.size || 0,
    friendCount: bot.fl?.size || 0
  }
}

function getStatusLabel (status) {
  switch (status) {
    case 'connected':
      return '已连接'
    case 'connecting':
      return '连接中'
    case 'reconnecting':
      return '重连中'
    case 'disconnected':
      return '已断开'
    case 'error':
      return '异常'
    default:
      return '未知'
  }
}

function getStatusSummary (bots) {
  return {
    total: bots.length,
    connected: bots.filter(i => i.status === 'connected').length,
    reconnecting: bots.filter(i => i.status === 'reconnecting').length,
    disconnected: bots.filter(i => i.status === 'disconnected').length,
    error: bots.filter(i => i.status === 'error').length
  }
}

async function getDauChartData (uin) {
  const data = Bot[uin].dau
  const stats = await data.getStats()
  return [
    {
      name: '今日活跃用户',
      value: stats.user_count,
      total: data.dauDB === 'level' ? data.all_user?.total : Bot[uin].fl.size
      // TODO: 成长百分比
      // percent: ''
      // TODO: 近期数据
      //   data: [stats.user_count]

    },
    {
      name: '今日活跃群数',
      value: stats.group_count,
      total: data.dauDB === 'level' ? data.all_group?.total : Bot[uin].gl.size
    },
    {
      name: '接收消息数量',
      value: stats.receive_msg_count
    },
    {
      name: '发送消息数量',
      value: stats.send_msg_count
    },
    {
      name: '新增群数',
      value: stats.group_increase_count
    },
    {
      name: '减少群数',
      value: stats.group_decrease_count
    }
  ]
}

async function getWeekChartData (uin) {
  const dau = Bot[uin].dau
  const path = join(process.cwd(), 'data', 'QQBotDAU', uin)
  if (!fs.existsSync(path)) return []
  const daus = fs.readdirSync(path)// .reverse().slice(0, 2)
  if (_.isEmpty(daus)) return false
  let data = _.fromPairs(daus.map(v => [v.replace('.json', ''), JSON.parse(fs.readFileSync(`${path}/${v}`).toString())]))
  data = dau.monthlyDau(Object.values(data).flat().slice(-30))
  const userData = []
  const groupData = []
  const weekData = []
  const receiveMsgData = []
  const sendMsgData = []
  data.coldata[1].forEach((v, i) => {
    if (i % 2 === 0) {
      userData.push(v.count)
      weekData.push(v.time)
    } else {
      groupData.push(v.count)
    }
  })
  data.linedata[0].forEach((v, i) => {
    if (i % 2 === 0) {
      receiveMsgData.push(v.linecount)
    } else {
      sendMsgData.push(v.linecount)
    }
  })
  return [
    {
      userData: userData.slice(userData.length - 7, userData.length),
      groupData: groupData.slice(groupData.length - 7, groupData.length),
      weekData: weekData.slice(weekData.length - 7, weekData.length),
      receiveMsgData: receiveMsgData.slice(receiveMsgData.length - 7, receiveMsgData.length),
      sendMsgData: sendMsgData.slice(sendMsgData.length - 7, sendMsgData.length)
    },
    {
      userData,
      groupData,
      weekData,
      receiveMsgData,
      sendMsgData
    }
  ]
}
async function getcallStat (uin) {
  const dau = Bot[uin].dau
  const callStat = Object.entries(dau.call_stats || {}).sort((a, b) => b[1] - a[1])
  const data = await dau.callStat(callStat, true)
  return data.group.map((i) => ({
    num: i.num,
    percentage: i.percent.replace('%', ''),
    color: i.color,
    name: i.name.replace(/^\[(.*)\]$/, '$1'),
    value: i.num
  }))
}
