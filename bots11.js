// ---- Render keepalive HTTP server ----
require('http')
  .createServer((req, res) => res.end('bots alive'))
  .listen(process.env.PORT || 3000)

// =====================
// BASIC CLEAN BOT.JS
// =====================
process.removeAllListeners('warning')
process.on('warning', () => {})

const mineflayer = require('mineflayer')

// =====================
// CONFIG
// =====================
const HOST = 'play.jartexnetwork.com'
const VERSION = '1.8.9'
const PASSWORD = 'botpass123'

const JOIN_DELAY = 3000
const RECONNECT_DELAY_MIN = 30000
const RECONNECT_DELAY_MAX = 35000

// =====================
// UTILS
// =====================
const sleep = ms => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

// =====================
// BOT COUNT + NAMES
// =====================
const BOT_COUNT = 4
const BOT_NAMES = Array.from(
  { length: BOT_COUNT },
  (_, i) => `bridge_bot${11 + i}`
)

// =====================
// START BOTS
// =====================
BOT_NAMES.forEach((name, i) => {
  setTimeout(() => startBot(name), i * JOIN_DELAY)
})

// =====================
// BOT LOGIC
// =====================
function startBot (username) {
  let bot
  let reconnecting = false
  let loggedIn = false
  let serverJoined = false

  const connect = () => {
    bot = mineflayer.createBot({
      host: HOST,
      version: VERSION,
      username,
      auth: 'offline',
      keepAlive: true,
      checkTimeoutInterval: 120000,
      closeTimeout: 120000
    })

    bindEvents()
  }

  const reconnect = () => {
    if (reconnecting) return
    reconnecting = true

    const delay = rand(RECONNECT_DELAY_MIN, RECONNECT_DELAY_MAX)
    console.log(`[${username}] 🔄 reconnecting in ${delay / 1000}s`)

    setTimeout(() => {
      reconnecting = false
      connect()
    }, delay)
  }

  const bindEvents = () => {
    bot.once('spawn', async () => {
      console.log(`[${username}] ✅ online`)
      loggedIn = false
      serverJoined = false

      await sleep(rand(3000, 5000))
      bot.chat(`/login ${PASSWORD}`)

      await sleep(rand(6000, 8000))
      attemptServerJoin()
    })

    bot.on('message', async msg => {
      const text = msg.toString().toLowerCase()

      if (!loggedIn && text.includes('register')) {
        loggedIn = true
        await sleep(rand(3000, 5000))
        bot.chat(`/register ${PASSWORD} ${PASSWORD}`)
      }

      if (!loggedIn && text.includes('login')) {
        loggedIn = true
        await sleep(rand(3000, 5000))
        bot.chat(`/login ${PASSWORD}`)
      }
    })

    // ✅ SERVER SELECTOR HANDLING
    bot.on('windowOpen', async window => {
      if (serverJoined) return

      const title = window.title?.toLowerCase() || ''
      if (!title.includes('server')) return

      console.log(`[${username}] 🧭 Server selector opened`)
      await sleep(rand(1200, 2000))

      const TARGET_SLOT = 23
      bot.clickWindow(TARGET_SLOT, 0, 0)
      serverJoined = true

      console.log(`[${username}] 🧱 clicked slot ${TARGET_SLOT}`)

      // ✅ WAIT 2s THEN SEND /thebridge
      await sleep(2000)
      console.log(`[${username}] 🚀 sending /thebridge`)
      bot.chat('/thebridge')
    })

    bot.on('error', err => {
      if (!err?.code) return
      if (['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED'].includes(err.code)) return
      console.log(`[${username}] error:`, err.code)
    })

    bot.on('end', reconnect)
    bot.on('kicked', reconnect)
  }

  async function attemptServerJoin () {
    if (serverJoined) return
    console.log(`[${username}] 📡 sending /server`)
    bot.chat('/server')
  }

  connect()
}
