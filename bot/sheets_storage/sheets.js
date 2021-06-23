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

        'Артикул',
        'ТТН',
        'Адрес',
        'Квитанция',

        'Тип заказа',
        'Количество',
        'Цвет',

        'Размер',

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
        // let n = ""
        // let wareStr = ""
        let vendors = "",
            colors = "",
            n = "",
            sizes = ""
        for (i = 0; i < ware.length; i++) {
            // n += parseInt(ware[i].count)
            // console.log(n, parseInt(ware[i].count), ware[i].count)
            // wareStr += `${ware[i].vendor} - ${ware[i].color} - ${ware[i].size} - ${ware[i].count};`
            // wareStr += i != ware.length-1 ? '\n' : ''

            vendors += i != 0 ? '; ' : ''
            vendors += ware[i].vendor
            vendors += i != ware.length-1 ? '\n' : ''

            colors += i != 0 ? '; ' : ''
            colors += ware[i].color
            colors += i != ware.length-1 ? '\n' : ''

            n += i != 0 ? '; ' : ''
            n += ware[i].count
            n += i != ware.length-1 ? '\n' : ''

            sizes += i != 0 ? '; ' : ''
            sizes += ware[i].size
            sizes += i != ware.length-1 ? '\n' : ''
        }
        const now = (new Date()).toLocaleString(['de-AT', 'en-GB', 'en-AU'], {
            timeZone: 'Europe/Kiev'
        }).replace(',', '')

        return await this._sheet.addRow({
            'Дата': now,

            'Артикул': vendors,
            'ТТН': ttn,
            'Адрес': address,
            'Квитанция': check_url,

            'Тип заказа': wr,
            'Количество': n,
            'Цвет': colors,
            
            'Размер': sizes,

            'Имя': name,
            'Номер телефона': number,
            'Комментарий': comments,
        })
    }
}

module.exports = SheetsStorage