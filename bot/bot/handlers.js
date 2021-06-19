require('dotenv').config()
const { Telegraf } = require('telegraf')
const db = require('../db/db')
const SheetsStorage = require('../sheets_storage/sheets')
const Sheets = require('../sheets_storage/sheets')
const { submitOrComment } = require('./keyboards')
const kbs = require('./keyboards')



const bot = new Telegraf(process.env.BOT_TOKEN)

/////////////////////////////////////////////////////////////////////////
const states = {
    order: 0,
}
let userStates = {}

bot.context.setState = function(state, step) {
    userStates[this.from.id] = {state: state, step: step}
}
bot.context.stepState = function(step = 1) {
    userStates[this.from.id].step += step
}
bot.context.getState = function() {
    return userStates[this.from.id]
}
bot.context.clearState = function() {
    // userStates[this.from.id] = undefined
    delete userStates[this.from.id]
}

const Stating = function({state, step, func}) {
    return async function(ctx, next) {
        const curr_state = ctx.getState()
        if (curr_state != undefined && curr_state.state == state && curr_state.step == step) {
            console.log(`STATING: entering handler with state `, curr_state)
            await func(ctx, next)
            // whether should we call next function?
        } else {
            console.log(`STATING: evaded handler with state `, curr_state)
            await next()
        }
    }
}
/////////////////////////////////////////////////////////////////////////


const Bot = {
    bot: bot,
    stop: reason => bot.stop(reason),
    launch: () => bot.launch(),

    

    start: async () => {

        await SheetsStorage.connectToDocument()
        console.log(`Connected to ${SheetsStorage.getDocTitle()}`)
        let userOrders = {}

        bot.start(async ctx => {
            ctx.reply('hi', kbs.addOrder)

            console.log(kbs.addOrder)
            
            db.createBotUser({
                id: ctx.from.id,
                username: ctx.from.username ? ctx.from.username : "",
                name: ctx.from.first_name,
                surname: ctx.from.last_name ? ctx.from.last_name : ""
            })

        })

        bot.action(kbs.callbacks.addOrder, async ctx => {
            ctx.reply(`Выберите вариант заказа`, kbs.tradeChoice)
            ctx.answerCbQuery()
            ctx.setState(states.order, 0)
            userOrders[ctx.from.id] = {
                wr: undefined,
                vendor: undefined,
                color: undefined,
                size: undefined,
                ttn: undefined,
                address: undefined,
                check: undefined,
                comments: undefined,
                number: undefined,
                name: undefined,
            }
        })

        bot.command('order', async ctx => {
            ctx.reply(`Выберите вариант заказа`, kbs.tradeChoice)
            // ctx.answerCbQuery()
            ctx.setState(states.order, 0)
            userOrders[ctx.from.id] = {
                wr: undefined,
                vendor: undefined,
                color: undefined,
                size: undefined,
                ttn: undefined,
                address: undefined,
                check_url: undefined,
                comments: undefined,
                number: undefined,
                name: undefined,
            }
        })

        bot.action([kbs.callbacks.retail, kbs.callbacks.wholesale], Stating({
            state: states.order,
            step: 0,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)
                ctx.answerCbQuery(`Вы выбрали ${ctx.update.callback_query.data}`)
                userOrders[ctx.from.id].wr = ctx.update.callback_query.data

                ctx.reply(`Напишите артикул`)
                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 1,
            func: async ctx => {
                // console.log(ctx)
                // console.log(ctx.message)
                // console.log(ctx.update.message)
                userOrders[ctx.from.id].vendor = ctx.message.text
                ctx.reply(`Напишите цвет`)
                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 2,
            func: async ctx => {
                userOrders[ctx.from.id].color = ctx.message.text
                ctx.reply(`Напишите размер`)
                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 3,
            func: async ctx => {
                userOrders[ctx.from.id].size = ctx.message.text
                ctx.reply(`Будете указывать ТТН или адрес?`, kbs.ttnOrAddress)
                ctx.stepState()
            }
        }))

        bot.action([kbs.callbacks.ttn, kbs.callbacks.address], Stating({
            state: states.order,
            step: 4,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)
                // console.log(ctx)
                console.log(ctx.from.id)
                // userOrders[ctx.from.id].ttn = ctx.callback_query.message.text
                // ctx.reply(`Предоставьте фотографию чека`)
                if (ctx.update.callback_query.data == kbs.callbacks.ttn) {
                    userOrders[ctx.from.id].ttn = true
                    ctx.reply(`Напишите ТТН`)
                } else if (ctx.update.callback_query.data == kbs.callbacks.address) {
                    userOrders[ctx.from.id].address = true
                    ctx.reply(`Напишите адрес`)
                }
                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 5,
            func: async ctx => {
                if (userOrders[ctx.from.id].ttn === true) {
                    userOrders[ctx.from.id].ttn = ctx.message.text
                } else if (userOrders[ctx.from.id].address === true) {
                    userOrders[ctx.from.id].address = ctx.message.text
                }
                ctx.reply(`Предоставьте фотографию чека`)
                ctx.stepState()
            }
        }))
        

        bot.on('photo', Stating({
            state: states.order,
            step: 6,
            func: async ctx => {
                // console.log(ctx)
                // console.log(ctx.update.message.photo)
                const files = ctx.update.message.photo
                const photo_info = files[files.length - 1]
                const file_info = await ctx.telegram.getFileLink(photo_info.file_id)
                const file_url = file_info.href
                
                userOrders[ctx.from.id].check_url = file_url

                ctx.reply('Укажите ваше имя и фамилию')
                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 7,
            func: async ctx => {
                userOrders[ctx.from.id].name = ctx.update.message.text
                ctx.reply(`Напишите или отправьте свой номер телефона`, {
                    reply_markup: { 
                        keyboard: [
                            [{text: '📲 Отправить номер телефона', request_contact: true}]
                        ]
                    }
                })
                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 8,
            func: async ctx => {
                const phone = ctx.message.text
                console.log(phone)
                if (phone.match(/^\+?([0-9 ]{10}|[0-9 ]{12})$/)){
                    userOrders[ctx.from.id].number = ctx.update.message.text

                    const order = userOrders[ctx.from.id]

                    const reply_text = `Ваша заявка:
    ${'*' + order.wr + '*'}
    Артикул: ${'*' + order.vendor + '*'}
    Цвет: ${'*' + order.color + '*'}
    Размер: ${'*' + order.size + '*'}
    ${order.ttn ? ('ТТН: *' + order.ttn + '*') : ('Адрес: *' + order.address + '*')}
    Номер: ${'*' + order.number + '*'}
    Имя: ${'*' + order.name + '*'}
    Комментарий: ${order.comments ? order.comments : "_Не указан_"}`

                    ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
                    ctx.stepState()
                } else {
                    ctx.reply(`Ошибка ввода мобильного телефона, попробуйте еще раз`)
                }
            }
        }))

        bot.on('contact', Stating({
            state: states.order,
            step: 8,
            func: async ctx => {
                console.log(ctx.update.message.contact.phone_number)

                userOrders[ctx.from.id].number = ctx.update.message.contact.phone_number

                const order = userOrders[ctx.from.id]

                const reply_text = `Ваша заявка:
${'*' + order.wr + '*'}
Артикул: ${'*' + order.vendor + '*'}
Цвет: ${'*' + order.color + '*'}
Размер: ${'*' + order.size + '*'}
${order.ttn ? ('ТТН: *' + order.ttn + '*') : ('Адрес: *' + order.address + '*')}
Номер: ${'*' + order.number + '*'}
Имя: ${'*' + order.name + '*'}
Комментарий: ${order.comments ? '*' + order.comments + '*' : "_Не указан_"}`

                ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
                ctx.stepState()
            }
        }))

        bot.action(kbs.callbacks.comment, Stating({
            state: states.order,
            step: 9,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)

                ctx.reply(`Укажите ваш комментарий`)
                ctx.stepState()
                
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 10,
            func: async ctx => {
                userOrders[ctx.from.id].comments = ctx.update.message.text

                const order = userOrders[ctx.from.id]

                const reply_text = `Ваша заявка:
${'*' + order.wr + '*'}
Артикул: ${'*' + order.vendor + '*'}
Цвет: ${'*' + order.color + '*'}
Размер: ${'*' + order.size + '*'}
${order.ttn ? ('ТТН: *' + order.ttn + '*') : ('Адрес: *' + order.address + '*')}
Номер: ${'*' + order.number + '*'}
Имя: ${'*' + order.name + '*'}
Комментарий: ${order.comments ? '*' + order.comments + '*' : "_Не указан_"}`

                ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
                ctx.stepState(-1)
            }
        }))

        bot.action(kbs.callbacks.submit, Stating({
            state: states.order,
            step: 9,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)
                ctx.answerCbQuery(`Отправляю ваш заказ`)
                // add to google sheets
                await SheetsStorage.add(userOrders[ctx.from.id])
                delete userOrders[ctx.from.id]

                ctx.editMessageText(ctx.update.callback_query.message.text + "\n\n *Ваш заказ отправлен*", { parse_mode: "Markdown" })
            }
        }))

        bot.action(kbs.callbacks.decline, Stating({
            state: states.order,
            step: 9,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)
                ctx.answerCbQuery(`Ваша заявка отклонена вами`)

                delete userOrders[ctx.from.id]

                ctx.editMessageText(ctx.update.callback_query.message.text + "\n\n *Вы отменили заказ*", { parse_mode: 'Markdown' })
            }
        }))

    },

    

}

module.exports = Bot