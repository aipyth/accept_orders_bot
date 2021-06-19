require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
// const { Markup } = require('telegraf/markup')
const db = require('../db/db')
const SheetsStorage = require('../sheets_storage/sheets')
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
            // console.log(`STATING: entering handler with state `, curr_state)
            await func(ctx, next)
            // whether should we call next function?
        } else {
            // console.log(`STATING: evaded handler with state `, curr_state)
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

        const buildReplyText = ({wr, ware, ttn, address, comments, number, name}) => {
            let text = 'Ваша заявка:\n\n' + '*' + wr + '*\n'
            text += `Количество товаров -- ${ware.length}\n`
            for (let i = 0; i < ware.length; i++) {
                text += `_Товар ${i+1}_ -- `
                text += '*' + ware[i].vendor + '*, '
                text += '*' + ware[i].color + '*, '
                text += '*' + ware[i].size + '*, '
                text += '*' + ware[i].count + '*\n'
            }
            text += ttn ? ('ТТН: *' + ttn + '*\n') : ('Адрес: *' + address + '*\n')
            text += '_Номер телефона:_ ' + '*' + number + '*\n'
            text += '_Имя:_ ' + '*' + name + '*\n'
            text += '_Комментарий:_ ' + (comments ?  '*' + comments + '*' : "_Не указан_")
            return text
        }

        // const Order = () => {
        function Order() {
            this.wr = undefined

            this.vendor = undefined
            this.color = undefined
            this.size = undefined
            this.ware = []

            this.ttn = undefined
            this.address = undefined

            this.check_url = undefined

            this.comments = undefined
            this.number = undefined
            this.name = undefined
        }

        await SheetsStorage.connectToDocument()
        console.log(`Connected to ${SheetsStorage.getDocTitle()}`)
        let userOrders = {}

        // HANDLERS

        bot.start(async ctx => {
            ctx.reply('hi!', kbs.addOrder)

            await db.createBotUser({
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
            // userOrders[ctx.from.id] = {
            //     wr: undefined,
            //     vendor: undefined,
            //     color: undefined,
            //     size: undefined,
            //     ttn: undefined,
            //     address: undefined,
            //     check: undefined,
            //     comments: undefined,
            //     number: undefined,
            //     name: undefined,
            // }
            userOrders[ctx.from.id] = new Order()
        })

        bot.command('order', async ctx => {
            ctx.reply(`Выберите вариант заказа`, kbs.tradeChoice)
            ctx.setState(states.order, 0)
            userOrders[ctx.from.id] = new Order()
        })

        bot.action([kbs.callbacks.retail, kbs.callbacks.wholesale], Stating({
            state: states.order,
            step: 0,
            func: async ctx => {
                const data = ctx.update.callback_query.data;
                userOrders[ctx.from.id].wr = data

                ctx.editMessageReplyMarkup(null)
                ctx.answerCbQuery(`Вы выбрали ${data}`)
                ctx.editMessageText(ctx.update.callback_query.message.text + `\n*Вы выбрали ${data}*`, {parse_mode: 'Markdown'})
                ctx.reply(`Напишите артикул`)

                ctx.stepState()
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 1,
            func: async ctx => {
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
                ctx.stepState(0.5)
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 2.5,
            func: async ctx => {
                userOrders[ctx.from.id].size = ctx.message.text
                const buttons = Markup.keyboard([
                    ["1", "2", "3", "4"],
                    ["5", "6", "7", "8"],
                    ["9", "10", "11", "12"],
                ]).oneTime().resize()
                ctx.reply(`Напишите количество`, buttons)
                ctx.stepState(0.5)
            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 3,
            func: async ctx => {
                // userOrders[ctx.from.id].size = ctx.message.text
                userOrders[ctx.from.id].count = ctx.message.text
                // add one to list of ware
                userOrders[ctx.from.id].ware.push({
                    vendor: userOrders[ctx.from.id].vendor,
                    color: userOrders[ctx.from.id].color,
                    size: userOrders[ctx.from.id].size,
                    count: userOrders[ctx.from.id].count,
                })

                ctx.reply(`Будете указывать ТТН или адрес?`, kbs.ttnOrAddress)
                ctx.stepState()
            }
        }))

        bot.action(kbs.callbacks.addWare, Stating({
            state: states.order,
            step: 4,
            func: async ctx => {
                ctx.reply(`Напишите артикул`)
                ctx.stepState(-3)
            }
        }))

        bot.action([kbs.callbacks.ttn, kbs.callbacks.address], Stating({
            state: states.order,
            step: 4,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)
                ctx.answerCbQuery()

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
                const files = ctx.update.message.photo
                const photo_info = files[files.length - 1]
                const file_info = await ctx.telegram.getFileLink(photo_info.file_id)
                userOrders[ctx.from.id].check_url = file_info.href

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
                            [{text: '📲 Отправить номер телефона', request_contact: true, remove_keyboard: true, one_time_keyboard: true}]
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
                if (phone.match(/^\+?([0-9 ]{10}|[0-9 ]{12})$/)){
                    userOrders[ctx.from.id].number = ctx.update.message.text

                    const order = userOrders[ctx.from.id]
                    const reply_text = buildReplyText(order)

                    await ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
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
                userOrders[ctx.from.id].number = ctx.update.message.contact.phone_number

                const order = userOrders[ctx.from.id]
                const reply_text = buildReplyText(order)

                await ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
                ctx.stepState()
            }
        }))

        bot.action(kbs.callbacks.comment, Stating({
            state: states.order,
            step: 9,
            func: async ctx => {
                ctx.editMessageReplyMarkup(null)
                ctx.answerCbQuery()

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
                const reply_text = buildReplyText(order)

                await ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
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
                try {
                    await SheetsStorage.add(userOrders[ctx.from.id])

                    ctx.editMessageText(ctx.update.callback_query.message.text + "\n\n *Ваш заказ отправлен*", { parse_mode: "Markdown" })
                } catch (e) {
                    console.error(e)
                    ctx.reply(`Во время оправки заказа произошла ошибка`)
                } finally {
                    delete userOrders[ctx.from.id]
                }
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

        bot.command('cancel', async ctx => {
            ctx.clearState()
            delete userOrders[ctx.from.id]
            ctx.reply(`Вы отменили заявку`)
        })
    },
}

module.exports = Bot