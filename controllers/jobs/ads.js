const steem = require("steem");
const sql = require("mssql");
const config = require("../../config.js");
const utils = require("../../utils.js");
const Ads = require("../../models/ads.js");
const AdsWhitelist = require("../../models/ads_whitelist.js");
const ads = require("../api/ads.js");
const PRICE_AD=process.env.PRICE_AD;

//Search for transactions paying for new advertisment campaigns
exports.add = async function() {
  // Get the last entry for ads
  let lastEntry = await Ads.find({})
    .sort({
      date: -1
    })
    .limit(1);
  let lastEntryDate = null;

  if (lastEntry[0] !== undefined)
    lastEntryDate = lastEntry[0].date.toISOString();
  else lastEntryDate = "2019-03-18 12:00:00.000";
  console.log("Last entry:",lastEntryDate,"min price: ",PRICE_AD);
// Execute SteemSQL query
  await new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool.request().query(
        `SELECT timestamp, [from], [to], amount, amount_symbol, memo
          FROM TxTransfers
          WHERE (
            timestamp > CONVERT(datetime, '${lastEntryDate}')
            AND
            [to] = 'steemplus-pay'
            AND
            memo LIKE '%Ad: %'
          )`
      );
    })
    .then(async result => {
      const newAds=result.recordsets[0];
      for (ad of newAds){
        // if ad fits the criteria, create a new campaign
        if(await isAcceptable(ad)){
          await ads.create(ad);
        }
        else {
          console.log(ad.memo+" does not fit criteria");
        }
      }
      sql.close();
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
}

async function isAcceptable(ad){
  if(ad.amount<PRICE_AD)
    return false;
  if(ad.amount_symbol!="SBD")
    return false;
  const adsWhitelist=await AdsWhitelist.find();
  return adsWhitelist.filter((e)=>{return e.username==(ad.memo.split(" ")[1].split("@")[1]).split("/")[0];}).length>0;
}
