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
    }
}

const SheetsStorage = {
    // CONSTANTS
    // if data in this column equals undefined
    // we suppose this row as empty
    // so we can add here our new information
    _emptyness_flag_col_index: 2,
    _sheet_index: 0,

    // name: "Campus",

    // DATA OBJECTS
    _doc: undefined,
    _sheet: undefined,


    // METHODS
    _findEmptyRowIndex: function(rows) {
        for (i = 0; i < rows.length; i++) {
            if (rows[i]._rawData[this._emptyness_flag_col_index] == undefined) {
                return i
            }
        }
    },
    connectToDocument: _connectDocument(DocumentID),

    getDocTitle: function() {
        return this._doc.title
    },

    add: async function({wr, vendor, color, size, ttn, address, check_url, number, name, comments}) {
        await this._sheet.setHeaderRow([
            'Date',
            'WR',
            'Vendor',
            'Color',
            'Size',
            'TTN',
            'Address',
            'Check',
            'Phone',
            'Name',
            'Comments'
        ])
        return await this._sheet.addRow({
            Date: (new Date()).toString(),
            WR: wr,
            Vendor: vendor,
            Color: color,
            Size: size,
            TTN: ttn,
            Address: address,
            Check: check_url,
            Phone: number,
            Name: name,
            Comments: comments,
        })
        // const rows = await this._sheet.getRows()

        // const firstEmptyRowIndex = this._findEmptyRowIndex(rows)

        // const emptyRow = rows[firstEmptyRowIndex]

        // const num = emptyRow._rawData[0]
        // const text = request.body
        // const flat = user.flat_number

        // let date = request.created_at
        // const creation_date = `${date.getDay()}.${date.getMonth()}.${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`

        // emptyRow._rawData = [num, text, creation_date, flat]
        // emptyRow.save()
    }
}

module.exports = SheetsStorage