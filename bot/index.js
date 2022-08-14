const Bot = require('./bot/handlers')

// loggin middleware
Bot.bot.use(async (ctx, next) => {
    const start = new Date()
    await next()
    const ms = new Date() - start
    console.log('New update %s. Got at %s Response time: %sms', ctx.updateType, start, ms)
})

Bot.start()


Bot.launch()

process.once('SIGINT', () => Bot.stop('SIGINT'))
process.once('SIGTERM', () => Bot.stop('SIGTERM'))
