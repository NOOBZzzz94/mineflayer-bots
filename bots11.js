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
const BOT_COUNT = 5

const BOT_NAMES = Array.from(
  { length: BOT_COUNT },
  (_, i) => `bridge_bot${11 + i}` // bridge_bot11 → bridge_bot17
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

      // wait before attempting server join
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

    bot.on('windowOpen', async window => {
      if (serverJoined) return
      if (!window.title.toLowerCase().includes('server selector')) return

      console.log(`[${username}] 🧭 Server Selector opened`)

      await sleep(rand(1200, 2000))

      // 🔍 try auto-detect "The Bridge"
      let targetSlot = -1

      window.slots.forEach((item, slot) => {
        if (!item || !item.name) return
        const name = item.displayName?.toLowerCase() || ''
        if (name.includes('the bridge')) {
          targetSlot = slot
        }
      })

      // fallback to slot 23
      if (targetSlot === -1) targetSlot = 23

      console.log(`[${username}] 🧱 clicking slot ${targetSlot}`)
      bot.clickWindow(targetSlot, 0, 0)

      serverJoined = true

      await sleep(rand(4000, 6000))
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

    console.log(`[${username}] 📡 trying /server`)
    bot.chat('/server')

    // fallback to compass after delay
    setTimeout(async () => {
      if (serverJoined) return

      console.log(`[${username}] 🧭 fallback to compass`)
      const compass = bot.inventory.items().find(i =>
        i.name.includes('compass')
      )

      if (!compass) {
        console.log(`[${username}] ❌ no compass found`)
        return
      }

      await bot.equip(compass, 'hand')
      await sleep(rand(800, 1200))
      bot.activateItem()
    }, 6000)
  }

  connect()
}
