<div align="center">

# TRSS-Yunzai QQBot Plugin

TRSS-Yunzai QQBot 适配器 插件

</div>

# Tip

建议使用TRSS原版,此版本为`个人自用`版,会在`任意时间`直接进行更改,且`不会`与TRSS一致

## 自用Fork版

1. 转发消息改为渲染成图片,需要安装`ws-plugin`
2. `#QQBot设置转换开启`配合`#ws绑定`实现互通数据
3. `#QQBotDAU` and `#QQBotDAUpro`
4. `Model/template/groupIncreaseMsg_default.js`中`自定义入群发送主动消息`
5. `config/QQBot.yaml`中使用以下自定义模版,如果设置了全局md会优先使用自定义模版,配合`e.toQQBotMD = true`将特定消息`转换`成md,亦可在`全局md模式下`通过`e.toQQBotMD = false`将特定消息`不转换`成md
   - 方法1: 直接修改`config/QQBot.yaml` **(推荐)**
     ```yml
     customMD:
       BotQQ:
         custom_template_id: 模版id
         keys:
           - key1 # 对应的模版key名字
           - key2
           # ... 最多10个
     ```
   - 方法2: 在`Model/template`目录下新建`markdownTemplate.js`文件,写入以下内容 **(不推荐)**
     ```js
     // params为数组,每一项为{key:string,values: ['\u200B']} // values固定为['\u200B']
     export defalut {
       custom_template_id: '',
       params: []
     }
     ```
6. `#QQBot调用统计` 根据`e.reply()`发送的消息进行统计,每条消息仅统计一次,未做持久化处理,默认关闭,`#QQBot设置调用统计开启`
7. `config/QQBot.yaml`中使用以下配置项,在`全局MD`时会`以MD的模式`自动加入`params`中
   ```yml
   mdSuffix:
     BotQQ:
       - key: key1
         values:
           - value # 如果用到了key则不会添加
       - key: key2
         values:
           # \ 需转义 \\
           - "{{ e.msg.replace(/^#/g, '\\/') }}" # {{}}中为动态参数,会在发送时替换成对应值,目前仅有e可用,也可以传入js表达式等等, 后续可能会添加自定义方法
       # ...
   ```
8. `config/QQBot.yaml`中使用以下配置项,在`全局MD`时会`以button的模式`自动加入`按钮指定行数并独占一行`,当`超过`5排按钮时`不会添加`
   ```yml
   btnSuffix:
     BotQQ:
       position: 1 # 位置:第几行 1 - 5
       values:
         - text: test
           callback: test
           show: # 达成什么条件才会显示
             type: random # 目前仅支持 random
             data: 50 # 0-100
         - text: test2
           input: test2
         # ... 最多10个
   ```
9. `#QQBot用户统计`: 对比昨日的用户数据,默认关闭,`#QQBot设置用户统计开启`
10. `config/QQBot.yaml`中使用前台日志消息过滤（~~自欺欺人大法~~），将会不在前台打印自定的消息内容，防log刷屏（~~比如修仙、宝可梦等~~），也可以使用`#QQBot添加/删除过滤日志垃圾机器人`
    - **自定义消息采取完整消息匹配，非关键词匹配**
    - **非必要不建议开启此项**
      > 注意：_只会过滤部分QQBot的日志_
    ```yml
    filterLog:
      BotQQ:
        - 垃圾机器人
        - 垃圾bot
        - 垃圾Bot
        # ...
    ```
11. `config/QQBot.yaml`中`simplifiedSdkLog`是否简化sdk日志,若设置为`true`则不会打印` recv from Group(xxx):  xxx`,并且会简化发送为`send to Group(xxx): <markdown><button>`
12. ~~`#QQBot一键群发`: 需要先配置模版 `template/oneKeySendGroupMsg_default.js`~~
13. `config/QQBot.yaml`中`markdownImgScale: 1`是否对markdown中的图片进行等比例缩放,0.5为缩小50%,1.5为放大50%,以此类推
14. `config/QQBot.yaml`中`sendButton: true`未开启全局MD时是否单独发送按钮
15. `config/QQBot.yaml`中`dauDB: level`选择存储dau数据的数据库,可选: `level`, `redis`,以及`false`关闭dau统计(仅每日发言用户和群)
    - `level`
      - 优点: 统计了大部分数据
      - 缺点: 缓存存一份,level存一份
    - `redis`
      - 优点: 大部分使用redis存储,不会缓存
      - 缺点: 没有缓存所以有些没统计
16. 已适配YePanel,提供dau统计和设置功能
17. `config/QQBot.yaml`中`bus`是否使用ws中转站
- 使用ws中转站可以降低成本,只需要一台低性能云服务器即可通过IP白名单验证,后端可使用本地服务器
- 填写格式:
```
  bus: {
    BotQQ: "example.com"
  }
```
- 后端搭建[[QQBotWs](https://github.com/Admilkk/QQBotWs)]
18. `config/QQBot.yaml`中`file`配置用于控制文件发送链路
```yml
file:
  enable: true
  preferUrlUpload: true
  groupBase64Upload: true
  privateForceChunk: true
  allowForceChunk: true
  autoExtractName: true
  appendRecallIds: true
```
- `enable`: 是否启用 `segment.file(...)` 文件发送
- `preferUrlUpload`: 网络文件优先 URL 直传
- `groupBase64Upload`: 群文件优先走 base64 上传
- `privateForceChunk`: 私聊默认走分片上传
- `allowForceChunk`: 允许 `segment.file(url, name, true)` 或对象形式强制分片
- `autoExtractName`: 未传文件名时自动从 URL/文件头推断
- `appendRecallIds`: 将文件消息 ID 合并进发送返回值，支持统一撤回
19. 当前代码已按职责拆分模块
- `Model/file.js`: 文件上传、分片、降级和撤回 ID 回填
- `Model/message.js`: 普通消息、Markdown、频道消息的构造与发送
- `Model/session.js`: pick 对象、消息映射、好友/群/频道缓存同步
- `Model/event.js`: notice/callback 事件分发
- `Model/connector.js`: SDK 初始化、bus 代理、事件注册
- `Model/admin.js`: 管理命令、帮助、设置与统计入口

## 配置示例

```yml
permission: master
toQRCode: true
toCallback: true
toBotUpload: true
imageUploadProvider: bot
groupIncreaseMsg: true
oneKeySendGroupMsg: true
hideGuildRecall: false
toQQUin: false
toImg: true
callStats: false
userStats: false
sendButton: true
simplifiedSdkLog: false
markdownImgScale: 1
sep: ""
dauDB: redis

file:
  enable: true
  preferUrlUpload: true
  groupBase64Upload: true
  privateForceChunk: true
  allowForceChunk: true
  autoExtractName: true
  appendRecallIds: true

bot:
  sandbox: false
  maxRetry: 0
  timeout: 30000

token:
  - "机器人QQ:AppID:Token:AppSecret:1:1"
```

- `maxRetry: 0` 在面板里表示无限重连，保存后会转成 `Infinity`
- `file.appendRecallIds: true` 建议保持开启，否则文件消息不会并入统一撤回返回值
- 如果你使用第三方图床，`toBotUpload` 仍然需要开启，实际渠道由 `imageUploadProvider` 控制

## 安装教程

1. 准备：[TRSS-Yunzai](../../../Yunzai)
2. ~~输入：`#安装QQBot-Plugin`~~
3. 打开：[QQ 开放平台](https://q.qq.com) 创建 Bot：  
   ① 创建机器人  
   ② 开发设置 → 得到 `机器人QQ号:AppID:Token:AppSecret`
4. 输入：`#QQBot设置机器人QQ号:AppID:Token:AppSecret:[01]:[01]`

## 格式示例

- 机器人QQ号 `114` AppID `514` Token `1919` AppSecret `810` 群Bot 频道私域

```
#QQBot设置114:514:1919:810:1:1
```

## 高阶能力

<details><summary>Markdown 消息</summary>

R.I.P

</details>

## 使用教程

- #QQBot账号
- #QQBot设置 + `机器人QQ号:AppID:Token:AppSecret:是否群Bot:是否频道私域`（是1 否0）
- #QQBotMD + `机器人QQ号:模板ID`
