require('dotenv').config();

const config_api = {
    user: process.env.LOGIN,
    password: process.env.PASSWORD,
    server: process.env.SQL_API,
    database: process.env.DB,
}

let config={
  config_api:config_api,
  bot:process.env.BOT,
  wif:process.env.WIF,
  key:process.env.MASTER
}

module.exports=config;
