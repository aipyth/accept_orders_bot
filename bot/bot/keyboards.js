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
    retail: 'Роздріб',
    ttn: 'ttn',
    address: 'address',
    addWare: 'addWare',
    comment: 'comment',
    submit: 'submit',
    decline: 'decline',
}


module.exports = {
    callbacks: callbacks,

    addOrder: buildInlineKeyboard([
        ['Додати замовлення', callbacks.addOrder],
    ]),

    tradeChoice: buildInlineKeyboard([
        ['Опт', callbacks.wholesale],
        ['Роздріб', callbacks.retail],
    ]),

    ttnOrAddress: buildInlineKeyboard([
        ['TTН', callbacks.ttn],
        ['Адреса', callbacks.address],
        ['Додати товар', callbacks.addWare],
    ]),

    submitOrComment: buildInlineKeyboard([
        ['Залишити коментар', callbacks.comment],
        ['Підтвердити і відправити', callbacks.submit],
        ['Скасувати', callbacks.decline],
    ])
}
