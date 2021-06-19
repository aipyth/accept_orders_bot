const pool = require('./config')

module.exports = {
    createBotUser: async ({id, username, name, surname}) => {
        const query = `insert into BotUsers (id, username, name, surname)
        values ($1, $2, $3, $4) 
        on conflict (id) do update
        set username=$2, name=$3, surname=$4;`
        try {
            var res = pool.query(query, [id, username, name, surname])
        } catch (e) {
            console.error(e)
        }
        return res
    }
}