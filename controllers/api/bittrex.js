const config = require("../../config");
const req=require("request");
exports.getValues = async() => {
  console.log("hello");
  const steem=await getSteemPrice();
  const btc=await getBTCPrice();
  const sbd=await getSBDPrice();
  console.log({btc:btc,steem:steem,sbd:sbd});
  return {btc:btc,steem:steem,sbd:sbd};
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
