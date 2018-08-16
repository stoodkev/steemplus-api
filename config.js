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
  key:process.env.MASTER,
  payPostKey:process.env.PAY_POST_KEY,
  payActKey:process.env.PAY_ACT_KEY
}

module.exports=config;
