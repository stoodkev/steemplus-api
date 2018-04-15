require('dotenv').config();

const config_api = {
    user: process.env.LOGIN,
    password: process.env.PASSWORD,
    server: process.env.SQL_API,
    database: process.env.DB,
}

let config={
  config_api:config_api
}

module.exports=config;
