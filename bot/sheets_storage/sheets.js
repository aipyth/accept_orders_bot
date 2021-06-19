const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('./credentials.json')

require('dotenv').config()

const DocumentID = process.env.DOCUMENT_ID


function _connectDocument(id) {
    return async function() {
        const doc = new GoogleSpreadsheet(id)
        await doc.useServiceAccountAuth(creds)
        await doc.loadInfo()

        this._doc = doc

        this._sheet = doc.sheetsByIndex[this._sheet_index]
        await this._sheet.setHeaderRow(this._headers)
    }
}

const SheetsStorage = {
    // CONSTANTS
    // if data in this column equals undefined
    // we suppose this row as empty
    // so we can add here our new information
    _sheet_index: 0,
    _headers: [
        'Дата',
        'Тип заказа',
        'Количество',
        'Товары',
        'ТТН',
        'Адрес',
        'Чек',
        'Номер телефона',
        'Имя',
        'Комментарий'
    ],

    // name: "Campus",

    // DATA OBJECTS
    _doc: undefined,
    _sheet: undefined,

    // METHODS
    connectToDocument: _connectDocument(DocumentID),

    getDocTitle: function() {
        return this._doc.title
    },

    add: async function({wr, ware, ttn, address, check_url, number, name, comments}) {
        let n = 0
        let wareStr = ""
        for (i = 0; i < ware.length; i++) {
            n += parseInt(ware[i].count)
            console.log(n, parseInt(ware[i].count), ware[i].count)
            wareStr += `${ware[i].vendor} - ${ware[i].color} - ${ware[i].size} - ${ware[i].count};`
            wareStr += i != ware.length-1 ? '\n' : ''
        }
        const now = (new Date()).toLocaleString(['de-AT', 'en-GB', 'en-AU'], {
            timeZone: 'Europe/Kiev'
        })

        return await this._sheet.addRow({
            'Дата': now,
            'Тип заказа': wr,
            'Количество': n,
            'Товары': wareStr,
            'ТТН': ttn,
            'Адрес': address,
            'Чек': check_url,
            'Номер телефона': number,
            'Имя': name,
            'Комментарий': comments,
        })
    }
}

module.exports = SheetsStorage