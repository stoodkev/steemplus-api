require('dotenv').config();

const config_api = {
    user: process.env.LOGIN,
    password: process.env.PASSWORD,
    server: process.env.SQL_API,
    database: process.env.DB,
    requestTimeout: 60000
}

const local_db_config = {
  user: process.env.LOCAL_LOGIN,
  password: process.env.LOCAL_PASSWORD,
  server: process.env.LOCAL_MONGO_API,
  database: process.env.LOCAL_DB
}

let config={
  config_api:config_api,
  local_db_config:local_db_config,
  bot:process.env.BOT,
  wif:process.env.WIF,
  wif_bot:process.env.WIF_BOT,
  key:process.env.MASTER,
  payPostKey:process.env.PAY_POST_KEY,
  payActKey:process.env.PAY_ACT_KEY
}

module.exports=config;
