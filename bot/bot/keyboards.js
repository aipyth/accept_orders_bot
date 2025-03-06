const { Markup } = require('telegraf')
// const db = require('../db/db')


const buildInlineKeyboard = (arr, cols = null) => {
    let buttons = []
    for (el of arr) {
        buttons.push([Markup.button.callback(el[0], el[1])])
        // buttons.push([Markup.callbackButton(el[0], el[1])])
    }
    // console.log(buttons)
    return Markup.inlineKeyboard(buttons, cols)
}



const callbacks = {
    addOrder: 'add-order',
    wholesale: 'Опт',
    retail: 'Розница',
    ttn: 'ttn',
    address: 'address',
    receipt: 'receipt',
    addWare: 'addWare',
    comment: 'comment',
    submit: 'submit',
    decline: 'decline',
}


module.exports = {
    callbacks: callbacks,

    addOrder: buildInlineKeyboard([
        ['Добавить заказ', callbacks.addOrder],
    ]),

    tradeChoice: buildInlineKeyboard([
        ['Опт', callbacks.wholesale],
        ['Розница', callbacks.retail],
    ]),

    ttnOrAddress: buildInlineKeyboard([
        ['TTН', callbacks.ttn],
        ['Адрес', callbacks.address],
        ['PDF Накладна', callbacks.receipt],
        ['Добавить товар', callbacks.addWare],
    ]),

    submitOrComment: buildInlineKeyboard([
        ['Оставить комментарий', callbacks.comment],
        ['Подтвердить и отправить', callbacks.submit],
        ['Отменить', callbacks.decline],
    ])
}

