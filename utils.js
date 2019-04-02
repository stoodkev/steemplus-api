const utils = require("./utils");
const sql = require("mssql");
const getJSON = require("get-json");
const steem = require("steem");
const config = require("./config.js");


exports.numberWithCommas = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

exports.commentNewUser = function(post, lastUpdate, numUsers) {
  let commentBody = `#### Welcome to Steem, @${post.author}!\n\n`;
  commentBody += `I am a bot coded by the SteemPlus team to help you make the best of your experience on the Steem Blockchain!\n`;
  commentBody += `SteemPlus is a Chrome, Opera and Firefox extension that adds tons of features on Steemit.\n`;
  commentBody += `It helps you see the real value of your account, who mentionned you, the value of the votes received, a filtered and sorted feed and much more! All of this in a fast and secure way.\n`;
  commentBody += `To see why **${numUsers} Steemians** use SteemPlus, [install our extension](https://chrome.google.com/webstore/detail/steemplus/mjbkjgcplmaneajhcbegoffkedeankaj?hl=en), read the [documentation](https://github.com/stoodkev/SteemPlus/blob/master/README.md) or the latest release : [${
    lastUpdate.title
  }](${lastUpdate.url}).\n`;
  return commentBody;
};

exports.formatDate = function(string) {
  string = new Date(string);
  return `${string.getUTCFullYear()}-${string.getUTCMonth() +
    1}-${string.getUTCDate()} ${string.getUTCHours()}:${string.getUTCMinutes()}:${string.getUTCSeconds()}.${string.getUTCMilliseconds()}`;
};

exports.weekNumber = function(dt) {
  let tdt = new Date(dt.valueOf());
  let dayn = (dt.getUTCDay() + 6) % 7;
  tdt.setDate(tdt.getUTCDate() - dayn + 3);
  let firstThursday = tdt.valueOf();
  tdt.getUTCMonth(0, 1);
  if (tdt.getUTCDay() !== 4)
    tdt.getUTCMonth(0, 1 + ((4 - tdt.getUTCDay()) + 7) % 7);
  return 1 + Math.ceil((firstThursday - tdt) / 604800000);
};

exports.getLastWeekday = function ( date , weekday ) { // 0 = sunday, 1 = monday, ... , 6 = saturday
    var d = new Date(date);
    d.setDate( d.getDate() + weekday - d.getDay() ); // move to last of given weekday
    return d;
}

// Function used to add a given number of days
exports.addDays = function(date, days) {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

exports.addMonths = function(date, months) {
  let result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

exports.addHours = function(date, hours) {
  let result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

exports.subSeconds = function(date, sec) {
  let result = new Date(date);
  result.setSeconds(result.getUTCSeconds() - sec);
  return result;
}

// FUnction used to substract a given number of days
exports.subDays = function(date, days) {
  let result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

exports.commentVotingBot = function(post) {
  let commentBody = `Hi, @${post.author}!\n\n`;
  commentBody += `You just got a **${post.percentage /
    100.0}%** upvote from SteemPlus!\n`;
  commentBody += `To get higher upvotes, earn more SteemPlus Points (SPP). On your Steemit wallet, check your SPP balance and click on "How to earn SPP?" to find out all the ways to earn.\n`;
  commentBody += `If you're not using SteemPlus yet, please check our last posts in [here](https://steemit.com/@steem-plus) to see the many ways in which SteemPlus can improve your Steem experience on Steemit and Busy.\n`;
  return commentBody;
};

exports.commentVotingBotTest = function(post) {
  let commentBody = `Hi, @${post.author}!\n\n`;
  commentBody += `You just got a **${post.percentage /
    100.0}%** upvote from SteemPlus!\n`;
  commentBody += `To get higher upvotes, earn more SteemPlus Points (SPP). On your Steemit wallet, check your SPP balance and click on "How to earn SPP?" to find out all the ways to earn.\n`;
  commentBody += `If you're not using SteemPlus yet, please check our last posts in [here](https://steemit.com/@steem-plus) to see the many ways in which SteemPlus can improve your Steem experience on Steemit and Busy.\n`;
  return commentBody;
};

exports.getVotingPowerPerAccount = function(account) {
  const mana = utils.getMana(account);
  return mana.estimated_pct.toFixed(2);
};

exports.getMana = function(account) {
  const STEEM_VOTING_MANA_REGENERATION_SECONDS = 432000;
  const estimated_max =
    utils.getEffectiveVestingSharesPerAccount(account) * 1000000;
  const current_mana = parseFloat(account.voting_manabar.current_mana);
  const last_update_time = account.voting_manabar.last_update_time;
  const diff_in_seconds = Math.round(Date.now() / 1000 - last_update_time);
  let estimated_mana =
    current_mana +
    (diff_in_seconds * estimated_max) / STEEM_VOTING_MANA_REGENERATION_SECONDS;
  if (estimated_mana > estimated_max) estimated_mana = estimated_max;
  const estimated_pct = (estimated_mana / estimated_max) * 100;
  return {
    current_mana: current_mana,
    last_update_time: last_update_time,
    estimated_mana: estimated_mana,
    estimated_max: estimated_max,
    estimated_pct: estimated_pct
  };
};

exports.getEffectiveVestingSharesPerAccount = function(account) {
  let effective_vesting_shares =
    parseFloat(account.vesting_shares.replace(" VESTS", "")) +
    parseFloat(account.received_vesting_shares.replace(" VESTS", "")) -
    parseFloat(account.delegated_vesting_shares.replace(" VESTS", ""));
  return effective_vesting_shares;
};

// generate a n characters random string
exports.generateRandomString = function(size) {
  let text = "";
  const possible = "0123456789";
  for (let i = 0; i < size; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  return text;
};

// Get price for a chosen date
exports.findSteemplusPrice = function(
  date,
  priceHistory,
  currentRatioSBDSteem,
  currentTotalSteem,
  currentTotalVests
) {
  let dateNow = new Date();
  let minuteNow = dateNow.getUTCMinutes() - (dateNow.getUTCMinutes() % 10);
  let periodNow = `${dateNow.getUTCFullYear()}-${dateNow.getUTCMonth() +
    1}-${dateNow.getUTCDate()} ${dateNow.getUTCHours()}:${minuteNow}:00.000`;
  let minuteDate = date.getUTCMinutes() - (date.getUTCMinutes() % 10);
  let periodDate = `${date.getUTCFullYear()}-${date.getUTCMonth() +
    1}-${date.getUTCDate()} ${date.getUTCHours()}:${minuteDate}:00.000`;
  if (periodNow === periodDate)
    return {
      price: currentRatioSBDSteem,
      totalSteem: currentTotalSteem,
      totalVests: currentTotalVests
    };
  else {
    let prices = priceHistory.filter(p => p.timestamp < date);

    if (prices.length === 0)
      return {
        price: 1,
        totalSteem: 196552616.386,
        totalVests: 397056980101.127362
      };
    else {
      let priceJSON = JSON.parse(prices[0].memo).priceHistory;
      if (priceJSON === undefined)
        return {
          price: 1,
          totalSteem: 196552616.386,
          totalVests: 397056980101.127362
        };
      else
        return {
          price: priceJSON.priceSteem / priceJSON.priceSBD,
          totalSteem:
            priceJSON.totalSteem === undefined
              ? 196552616.386
              : priceJSON.totalSteem,
          totalVests:
            priceJSON.totalVests === undefined
              ? 397056980101.127362
              : priceJSON.totalVests
        };
    }
  }
};

// Function used to get the last block stored in SteemSQL. We use the result of this request to know if SteemSQL is synchronized with the blockchain
exports.getLastBlockID = function() {
  return new Promise(function(resolve, reject) {
    new sql.ConnectionPool(config.config_api)
      .connect()
      .then(pool => {
        return pool
          .request()
          .query("select top 1 block_num from Blocks ORDER BY timestamp DESC");
      })
      .then(result => {
        resolve(result.recordsets[0][0].block_num);
        sql.close();
      })
      .catch(error => {
        console.log(error);
        sql.close();
      });
  });
};

// Function used to get purchase information from SteemMonsters
exports.getPurchaseInfoSM = function(requestId) {
  return new Promise(function(resolve, reject) {
    getJSON(
      "https://steemmonsters.com/purchases/status?id=" + requestId,
      function(err, response) {
        if (err === null) {
          resolve({ player: response.player, requestId: response.uid });
        }
      }
    );
  });
};

// Function used to get Steem Price
exports.getPriceSteemAsync = function() {
  return new Promise(function(resolve, reject) {
    getJSON(
      "https://bittrex.com/api/v1.1/public/getticker?market=BTC-STEEM",
      function(err, response) {
        resolve(response.result["Bid"]);
      }
    );
  });
};

// Function used to get SBD price
exports.getPriceSBDAsync = function() {
  return new Promise(function(resolve, reject) {
    getJSON(
      "https://bittrex.com/api/v1.1/public/getticker?market=BTC-SBD",
      function(err, response) {
        resolve(response.result["Bid"]);
      }
    );
  });
};

// Function used to get SBD price
exports.getPriceBTCAsync = function() {
  return new Promise(function(resolve, reject) {
    getJSON(
      "https://bittrex.com/api/v1.1/public/getticker?market=USDT-BTC",
      function(err, response) {
        resolve(response.result["Bid"]);
      }
    );
  });
};

exports.getSBDPriceUSD = async function() {
  let priceSBD = await utils.getPriceSBDAsync();
  let priceBTC = await utils.getPriceBTCAsync();
  console.log(priceSBD, priceBTC);
  return priceBTC * priceSBD;
};

// This function is used to store the price of steem and SBD in the blockchain,
// This will help us to be able anytime to recreate the exact same database.
exports.storeSteemPriceInBlockchain = function(
  priceSteem,
  priceSBD,
  totalSteem,
  totalVests
) {
  return new Promise(function(fulfill,reject){
    getJSON(
      "https://bittrex.com/api/v1.1/public/getticker?market=BTC-SBD",
      function(err, response) {
        const accountName = "steemplus-bot";
        const json = JSON.stringify({
          priceHistory: {
            priceSteem: priceSteem,
            priceSBD: priceSBD,
            priceBTC: response.result["Bid"],
            totalSteem: totalSteem,
            totalVests: totalVests
          }
        });

        steem.broadcast.transfer(
          config.wif_bot || process.env.WIF_TEST_2,
          accountName,
          accountName,
          "0.001 SBD",
          json,
          function(err, result) {
            console.log(err, result);
            fulfill();
          }
        );
      }
    );
  });
};
