const {Pool} = require('pg')
require('dotenv').config()

// console.log(JSON.stringify({
//   user: process.env.POSTGRES_USER,
//   host: process.env.POSTGRES_HOST,
//   database: process.env.POSTGRES_DB,
//   password: process.env.POSTGRES_PASSWORD,
//   port: process.env.POSTGRES_PORT
// }))
const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT
})
pool.query(`create table if not exists BotUsers (
    id          bigint          primary key,
    username    varchar(255)    not null,
    "name"      varchar(255)    not null,
    surname     varchar(255)    not null,

    created_at  timestamp       default now()
);`)

module.exports = pool
