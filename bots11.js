// ---- Render keepalive HTTP server ----
require('http')
  .createServer((req, res) => res.end('ok'))
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

const JOIN_DELAY = 10000 // IMPORTANT: slow joins
const RECONNECT_DELAY_MIN = 30000
const RECONNECT_DELAY_MAX = 35000

// =====================
// UTILS
// =====================
const sleep = ms => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a

// =====================
// BOT COUNT + NAMES (FREE RENDER SAFE)
// =====================
const BOT_COUNT = 3
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
  let serverAttempted = false

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

  const safeReconnect = () => {
    if (reconnecting) return
    reconnect()
  }

  const bindEvents = () => {
    bot.once('spawn', async () => {
      console.log(`[${username}] ✅ online`)
      loggedIn = false
      serverJoined = false
      serverAttempted = false

      // login delay
      await sleep(rand(3000, 5000))
      bot.chat(`/login ${PASSWORD}`)
    })

    // login / register handling
    bot.on('message', async msg => {
      const text = msg.toString().toLowerCase()

      if (!loggedIn && text.includes('register')) {
        loggedIn = true
        await sleep(rand(3000, 5000))
        bot.chat(`/register ${PASSWORD} ${PASSWORD}`)
        scheduleServerJoin()
      }

      if (!loggedIn && text.includes('login')) {
        loggedIn = true
        await sleep(rand(3000, 5000))
        bot.chat(`/login ${PASSWORD}`)
        scheduleServerJoin()
      }
    })

    // handle ALL windows (book + server selector)
    bot.on('windowOpen', async window => {
      const title = (window.title || '').toLowerCase()

      // 📘 BOOK POPUP (may or may not appear)
      if (title.includes('book')) {
        console.log(`[${username}] 📘 book popup detected`)
        await sleep(2000)
        bot.closeWindow(window)
        console.log(`[${username}] 📕 book closed`)
        return
      }

      // 🧭 SERVER SELECTOR
      if (serverJoined) return
      if (!title.includes('server')) return

      console.log(`[${username}] 🧭 server selector opened`)
      await sleep(2000)

      console.log(`[${username}] 🧱 clicking slot 23`)
      bot.clickWindow(23, 0, 0)

      serverJoined = true

      // send /thebridge AFTER clicking slot
      await sleep(2000)
      bot.chat('/thebridge')
      console.log(`[${username}] 🚀 /thebridge sent`)
    })

    bot.on('end', safeReconnect)
    bot.on('kicked', safeReconnect)

    bot.on('error', err => {
      if (!err?.code) return
      if (['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED'].includes(err.code)) return
      console.log(`[${username}] error:`, err.code)
    })
  }

  // =====================
  // SERVER JOIN SEQUENCE
  // =====================
  function scheduleServerJoin () {
    if (serverAttempted) return
    serverAttempted = true

    // wait for book popup (or not)
    setTimeout(() => {
      attemptServerJoin()
    }, rand(12000, 15000)) // IMPORTANT delay
  }

  function attemptServerJoin () {
    if (serverJoined) return
    console.log(`[${username}] 📡 sending /server`)
    bot.chat('/server')
  }

  connect()
}
