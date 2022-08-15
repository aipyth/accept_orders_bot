const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('./credentials.json')

// require('dotenv').config()

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

        'Артикул Цвет Размер Количество',
        'ТТН - Артикул Цвет Размер',
        'Адрес',
        'Квитанция',

        'Тип заказа',
        'Количество',

        'Имя',
        'Номер телефона',
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
        let n = ""

        console.dir({
          wr, ware, ttn, address, check_url, number, name, comments
        })

        let wares = ''
        let ttn_wares = ''

        for (i = 0; i < ware.length; i++) {
            wares += ware[i].wareText.replace(/\n/g, ' ')
            ttn_wares += ware[i].wareText.replace(/\n/g, ' ')

            wares += '\n' + ware[i].count + 'шт.'
            wares += i !== ware.length-1 ? '\n\n' : ''
            ttn_wares += i !== ware.length-1 ? '\n' : ''


            n += ware[i].count
            n += i !== ware.length-1 ? '\n' : ''
        }

        const now = (new Date()).toLocaleString(['de-AT', 'en-GB', 'en-AU'], {
            timeZone: 'Europe/Kiev'
        }).replace(',', '')

        return await this._sheet.addRow({
            'Дата': now,

            'Артикул Цвет Размер Количество': wares,
            'ТТН - Артикул Цвет Размер': ttn ? ttn + '\n' + ttn_wares : null,
            'Адрес': address,
            'Квитанция': check_url,

            // 'Тип заказа': wr,
            'Количество': n,

            'Имя': name,
            'Номер телефона': number,
            'Комментарий': comments,
        })
    }
}

module.exports = SheetsStorage
