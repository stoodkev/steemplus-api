const steem = require("steem");
const sql = require("mssql");
const config = require("../../config.js");
const utils = require("../../utils.js");
const Ads = require("../../models/ads.js");
const ads = require("../api/ads.js");
const PRICE_AD=0.001;

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
  console.log("Last entry:",lastEntryDate);
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
      console.log(result);
      const newAds=result.recordsets[0];
      for (ad of newAds){
        // if ad fits the criteria, create a new campaign
        if(isAcceptable(ad)){
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

function isAcceptable(){
  return ad.amount>=PRICE_AD&&ad.amount_symbol=="SBD";
}
