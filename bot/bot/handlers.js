// require('dotenv').config()
const { Telegraf, Markup } = require('telegraf')
// const { Markup } = require('telegraf/markup')
const db = require('../db/db')
const SheetsStorage = require('../sheets_storage/sheets')
const { callbacks } = require('./keyboards')
const kbs = require('./keyboards')
const text = require('./text.json')
const axios = require('axios')
const fs = require('fs')



const bot = new Telegraf(process.env.BOT_TOKEN)

/////////////////////////////////////////////////////////////////////////
const states = {
    order: 0,
}
let userStates = {}

bot.context.setState = function(state, step) {
    userStates[this.from.id] = { state: state, step: step }
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

const Stating = function({ state, step, func }) {
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

        const buildReplyText = ({ wr, ware, ttn, address, comments, number, name }) => {
            let text = 'Перевірте, будь ласка, ваше замовлення:\n\n'
            text += `Кількість товарів — ${ware.length}\n`
            for (let i = 0; i < ware.length; i++) {
                text += `_Товар ${i + 1}_ — `
                if (ware[i].wareText != undefined) {
                    text += '*' + ware[i].wareText + '* '
                    if (ware[i].color != undefined) {
                        text += '+ _ви вказали колір фотографією_ , '
                    }
                } else {
                    text += '*' + ware[i].vendor + '*, '
                    if (!ware[i].color.startsWith('http')) {
                        text += '*' + ware[i].color + '*, '
                    } else {
                        text += ' _ви вказали колір фотографією_ , '
                    }
                    text += '*' + ware[i].size + '*, '
                }
                text += '*' + ware[i].count + ' шт.*\n'
            }
            text += ttn ? ('ТТН: *' + ttn + '*\n') : ('Адреса: *' + address + '*\n')
            text += '_Номер телефону:_ ' + '*' + number + '*\n'
            text += '_Ім’я:_ ' + '*' + name + '*\n'
            text += '_Коментар:_ ' + (comments ? '*' + comments + '*' : "_Не вказано_")

            text += "\n\nТакож ви можете додати коментар, якщо щось упустили під час створення замовлення"
            text += "\n\nЩоб залишити коментар, натисніть кнопку нижче 👇"

            text += "\n\nЯкщо ви підтверджуєте замовлення, натисніть \"Підтвердити і відправити\""
            return text
        }

        function Order() {
            this.wr = undefined

            this.userWare = undefined

            // this.vendor = undefined
            // this.color = undefined
            //
            // this.size = undefined
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
            ctx.reply(text.start, kbs.addOrder)

            await db.createBotUser({
                id: ctx.from.id,
                username: ctx.from.username ? ctx.from.username : "",
                name: ctx.from.first_name,
                surname: ctx.from.last_name ? ctx.from.last_name : ""
            })

        })

        bot.command('cancel', async ctx => {
            ctx.clearState()
            delete userOrders[ctx.from.id]
            ctx.reply(`Ви скасували заявку`)
        })

        bot.action(kbs.callbacks.addOrder, async ctx => {
            ctx.answerCbQuery()
            ctx.reply(`Переходимо до вибору товару\n\n` + text.writeVendor, { parse_mode: 'Markdown' })
            ctx.setState(states.order, 1)
            userOrders[ctx.from.id] = new Order()
        })

        bot.command('order', async ctx => {
            ctx.reply(`Переходимо до вибору товару\n\n` + text.writeVendor, { parse_mode: 'Markdown' })
            ctx.setState(states.order, 1)
            userOrders[ctx.from.id] = new Order()
        })

        bot.on('text', Stating({
            state: states.order,
            step: 1,
            func: async ctx => {
                userOrders[ctx.from.id].userWare = ctx.message.text
                // userOrders[ctx.from.id].vendor = ctx.message.text
                // ctx.reply(text.choseColor)
                const buttons = Markup.keyboard([
                    ["1", "2", "3", "4"],
                    ["5", "6", "7", "8"],
                    ["9", "10", "11", "12"],
                ]).oneTime().resize()
                ctx.reply(text.choseNumber, buttons)
                ctx.stepState(2)
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
                    wareText: userOrders[ctx.from.id].userWare,
                    // vendor: userOrders[ctx.from.id].vendor,
                    // color: userOrders[ctx.from.id].color,
                    // size: userOrders[ctx.from.id].size,
                    count: userOrders[ctx.from.id].count,
                })

                console.log(userOrders[ctx.from.id].ware)

                userOrders[ctx.from.id].userWare = undefined
                // userOrders[ctx.from.id].vendor = undefined
                // userOrders[ctx.from.id].color = undefined
                // userOrders[ctx.from.id].size = undefined
                userOrders[ctx.from.id].count = undefined

                ctx.reply(text.choseTTNorAddress, kbs.ttnOrAddress)
                ctx.stepState()
            }
        }))

        bot.action(kbs.callbacks.addWare, Stating({
            state: states.order,
            step: 4,
            func: async ctx => {
                try {
                    ctx.editMessageReplyMarkup(null)
                } catch (e) {
                    console.error(e)
                }
                ctx.answerCbQuery()
                ctx.reply(text.writeVendor)
                ctx.stepState(-3)
            }
        }))

        bot.action([kbs.callbacks.ttn, kbs.callbacks.address], Stating({
            state: states.order,
            step: 4,
            func: async ctx => {
                try {
                    ctx.editMessageReplyMarkup(null)
                } catch (e) {
                    console.error(e)
                }
                ctx.answerCbQuery()

                if (ctx.update.callback_query.data == kbs.callbacks.ttn) {
                    userOrders[ctx.from.id].ttn = true
                    ctx.reply(`Напишіть ТТН`)
                } else if (ctx.update.callback_query.data == kbs.callbacks.address) {
                    userOrders[ctx.from.id].address = true
                    ctx.replyWithMarkdown(text.writeAddress)
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
                ctx.reply(text.provideCheckPhoto)
                ctx.stepState()
            }
        }))


        bot.on('photo', Stating({
            state: states.order,
            step: 6,
            func: async ctx => {
                const files = ctx.update.message.photo
                const photo_info = files[files.length - 1]

                const url = await ctx.telegram.getFileLink(photo_info.file_id)

                const time_now = (new Date()).getTime().toString()
                const filename = `${ctx.update.update_id}_${time_now}.jpg`
                const filepath = `${process.env.IMAGES_PATH}/${filename}`

                axios({ url: url.href, responseType: 'stream' })
                    .then(response => {
                        return new Promise((resolve, reject) => {
                            response.data.pipe(fs.createWriteStream(filepath))
                                .on('finish', () => {

                                    userOrders[ctx.from.id].check_url = `${process.env.SERVER_URL}/${filename}`

                                    ctx.reply(text.writeName)
                                    ctx.stepState()
                                })
                                .on('error', e => {
                                    console.error('cannot get photo', e)
                                    ctx.reply('Помилка сервера. Наразі неможливо отримати фотографію.')
                                    ctx.clearState()
                                    delete userOrders[ctx.from.id]
                                })
                        });
                    })


            }
        }))

        bot.on('text', Stating({
            state: states.order,
            step: 7,
            func: async ctx => {
                userOrders[ctx.from.id].name = ctx.update.message.text
                ctx.reply(text.writePhoneNumber, {
                    reply_markup: {
                        keyboard: [
                            [{ text: '📲 Відправити номер телефону', request_contact: true, remove_keyboard: true, one_time_keyboard: true }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
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
                if (phone.match(/^\+?([0-9 ]{10}|[0-9 ]{12})$/)) {
                    userOrders[ctx.from.id].number = ctx.update.message.text

                    try {
                        await ctx.editMessageReplyMarkup({
                            reply_markup: { remove_keyboard: true },
                        })
                    } catch (e) {
                        console.error(e)
                    }

                    const order = userOrders[ctx.from.id]
                    const reply_text = buildReplyText(order)

                    await ctx.replyWithMarkdown(reply_text, kbs.submitOrComment)
                    ctx.stepState()
                } else {
                    ctx.reply(`Помилка вводу номера телефону. Будь ласка, спробуйте ще раз.`)
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
                try {
                    ctx.editMessageReplyMarkup(null)
                } catch (e) {
                    console.error(e)
                }
                ctx.answerCbQuery()

                ctx.reply(`Задайте ваш коментар`)
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
                try {
                    ctx.editMessageReplyMarkup(null)
                } catch (e) {
                    console.error(e)
                }
                ctx.answerCbQuery(`Відправляю ваше замовлення`)
                // add to google sheets
                try {
                    await SheetsStorage.add(userOrders[ctx.from.id])

                    // ctx.editMessageText(ctx.update.callback_query.message.text + "\n\n *Спасибо, что оформили заказ!*", { parse_mode: "Markdown" })
                    ctx.reply(text.thanksAndContacts)
                } catch (error) {
                    // console.error(e)
                    // ctx.reply(`Во время оправки заказа произошла ошибка`)

                    // Check for a "Bad Request" error and attempt reconnection
                    console.log("Error while sending order to Google Sheets:", error);
                    const invalidRangeMessage = "Google API error - [400] Unable to parse range:";
                    if (error.message.includes(invalidRangeMessage)) {
                        console.warn("Bad Request error detected. Attempting to reconnect...");
                        try {
                            await SheetsStorage.connectToDocument();  // Reconnect to Google Sheets
                            await SheetsStorage.add(userOrders[ctx.from.id]);  // Retry adding the order
                            ctx.reply(text.thanksAndContacts);
                        } catch (retryError) {
                            console.log("Retry failed after reconnecting:", retryError);
                            ctx.reply(`Во время оправки заказа произошла ошибка`);
                        }
                    } else {
                        // Handle other types of errors
                        ctx.reply(`Во время оправки заказа произошла ошибка`);
                    }
                } finally {
                    delete userOrders[ctx.from.id]
                }
            }
        }))

        bot.action(kbs.callbacks.decline, Stating({
            state: states.order,
            step: 9,
            func: async ctx => {
                try {
                    ctx.editMessageReplyMarkup(null)
                } catch (e) {
                    console.error(e)
                }
                ctx.answerCbQuery(`Ваше замовлення відхилене вами.`)

                delete userOrders[ctx.from.id]

                try {
                    ctx.editMessageText(ctx.update.callback_query.message.text + "\n\n *Ви відмінили замовлення*", { parse_mode: 'Markdown' })
                } catch (e) {
                    console.log(e)
                }
            }
        }))


    },
}

module.exports = Bot
