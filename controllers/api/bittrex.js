const config = require("../../config");
const req=require("request");
exports.getValues = async() => {
  const steem=await getSteemPrice();
  const btc=await getBTCPrice();
  const sbd=await getSBDPrice();
  return {btc:btc,steem:steem,sbd:sbd};
};

exports.getTicker = async(code) => {
  return new Promise((fulfill)=>{
    req({url:"https://widgets.coinmarketcap.com/v2/ticker/"+code+"/?ref=widget&convert=USD",json:true},function(err,http,body){
      fulfill(body);
    });
  });
};

async function getSteemPrice(){
  return new Promise((fulfill)=>{
    req({url:"https://bittrex.com/api/v1.1/public/getticker?market=BTC-STEEM",json:true},function(err,http,body){
      fulfill(body);
    });
  });
}

async function getBTCPrice(){
  return new Promise((fulfill)=>{
    req({url:"https://bittrex.com/api/v1.1/public/getticker?market=USDT-BTC",json:true},function(err,http,body){
      fulfill(body)
    });
  });
}

async function getSBDPrice(){
  return new Promise((fulfill)=>{
    req({url:"https://bittrex.com/api/v1.1/public/getticker?market=BTC-SBD",json:true},function(err,http,body){
      fulfill(body)
    });
  });
}
