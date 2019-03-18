const config = require("../../config.js");
const sql = require("mssql");
const steem = require("steem");
const spp = require("./spp");
const utils = require("../../utils.js");
const User = require("../../models/user.js");
const PointsDetail = require("../../models/pointsDetail.js");
const TypeTransaction = require("../../models/typeTransaction.js");

let priceHistory;
let currentRatioSBDSteem = null;
let currentTotalSteem = null;
let currentTotalVests = null;
// Function used to add a given number of days
function addDays(date, days) {
  let result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// FUnction used to substract a given number of days
function subDays(date, days) {
  let result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}


// Function used to calculate weekly reward for users.
// Weekly rewards depend on users rank and on the total of points created during the week.
// We decided to give away 10% of the weekly total
// Users get rewards if they are in the top 10
exports.weeklyRewards = async function(startWeek, endWeek) {
  const userNotIncluded = await User.find({"accountName": {$in :["stoodkev", "steem-plus"]}});
  const delegationType = await TypeTransaction.findOne({"name": "Delegation"});
  const reblogType = await TypeTransaction.findOne({"name": "Reblog"});
  const weeklyRewardType = await TypeTransaction.findOne({"name": "Weekly Reward"});

  // Rewards for top 10
  // Ex :
  // 1st place 50% of the pool
  // 2nd place 25% of the pool
  // 3rd place 12.5% of the pool
  // ...
  const percentageReward = [50, 25, 12.5, 6.25, 3.13, 1.56, 0.78, 0.39, 0.24, 0.15];

  // MongoDB query creation for ranking
  const weeklyQuery = [
    { "$match": { "typeTransaction": { $nin: [delegationType._id, reblogType._id, weeklyRewardType._id] }, timestamp: { '$gte' : startWeek, '$lt' : endWeek}, "user": { $nin: userNotIncluded.map(u => u._id)} } },
    { "$group":
      {
        "_id": "$user",
        points: {
          $sum: "$nbPoints"
        }
      }
    },
    {
      $sort: { points: -1 }
    },
    {
      $limit: 10
    }
  ]

  const tmpUsers = await User.populate(await PointsDetail.aggregate(weeklyQuery).exec(), {path: "_id", select: 'accountName'});

  // MongoDB query creation for total points
  const totalPointQuery = [
    { "$match": { "typeTransaction": { $nin: [delegationType._id, reblogType._id, weeklyRewardType._id] }, timestamp: { '$gte' : startWeek, '$lt' : endWeek}, "user": { $nin: userNotIncluded.map(u => u._id)} } },
    { "$group":
      {
        "_id": null,
        points: {
          $sum: "$nbPoints"
        }
      }
    },
  ]
  // Execute query
  const tmpPoints = await User.populate(await PointsDetail.aggregate(totalPointQuery).exec(), {path: "_id", select: 'accountName'});
  // Total point of the week
  const totalPointsWeek = tmpPoints[0].points;
  // Calculate pool (10%)
  const totalPointsRewards = totalPointsWeek * 10.0 / 100.0;
  let rankingRes = [];
  // Create result
  tmpUsers.forEach((user, index) => {
    let nbPointsUser = percentageReward[index] * totalPointsRewards / 100.00;
    rankingRes.push({
      rank: index + 1,
      accountName: user._id.accountName,
      nbPoints: nbPointsUser.toFixed(2)
    });
  });
  // return result
  return {
    ranking: rankingRes,
    totalPointsWeek: totalPointsWeek,
    totalPointsRewards: totalPointsRewards,
    endWeek: endWeek
  }
};

exports.payWeeklyRewards = async function() {
  const dateNow = Date.now();
  let previousMonday, nextSunday, endWeek, startWeek;
  // Get the last entry the requestType 4 (Reblogs)
  let lastEntry = await PointsDetail.find({
    requestType: 5
  })
  .sort({
    timestamp: -1
  })
  .limit(1);

  // Get the creation date of the last entry
  if (lastEntry[0] !== undefined){
    // Get date of the currentWeek
    previousMonday = utils.getLastWeekday(new Date(), 1);
    nextSunday = utils.addDays(previousMonday , 6);
    // Get only current week spp per user excluding delegations
    endWeek = new Date(Date.UTC(nextSunday.getUTCFullYear(), nextSunday.getUTCMonth(), nextSunday.getUTCDate(), 23, 59, 59, 999));
    startWeek = new Date(Date.UTC(previousMonday.getUTCFullYear(), previousMonday.getUTCMonth(), previousMonday.getUTCDate(), 0, 0, 0, 0));
  }
  else {
    // This date is the steemplus point annoncement day + 7 days for rewards because rewards come after 7 days.
    // Wait for SteemSQL's query result before starting the second request
    // We decided to wait to be sure this function won't try to update the same row twice at the same time
    endWeek = new Date(Date.UTC(2018, 10, 18, 23, 59, 59, 999));
    startWeek = new Date(Date.UTC(2018, 10, 12, 0, 0, 0, 0));
  }

  while(dateNow > endWeek)
  {
    console.log(`Getting rewards from ${startWeek.toUTCString()} to ${endWeek.toUTCString()}`);
    const rewards = await spp.weeklyRewards(startWeek, endWeek);
    for(reward of rewards.ranking){
      const date = new Date(endWeek);
      const weeklyRewardType = await TypeTransaction.findOne({"name": "Weekly Reward"});
      let user = await User.findOne({accountName: reward.accountName});
      let pointsDetail = new PointsDetail({
        nbPoints: parseFloat(reward.nbPoints),
        amount: parseFloat(reward.nbPoints),
        amountSymbol: "SP",
        permlink: "",
        user: user._id,
        typeTransaction: weeklyRewardType._id,
        timestamp: date,
        timestampString: utils.formatDate(date),
        requestType: 5 // Request type 5 is for Weekly Rewards.
      });
      pointsDetail = await pointsDetail.save();

      // Update user account
      console.log(user.accountName, 'old Points ', user.nbPoints);
      user.pointsDetails.push(pointsDetail);
      user.nbPoints += parseFloat(reward.nbPoints);
      await user.save();
      console.log(user.accountName, 'new Points ', user.nbPoints);
    }
    startWeek = addDays(startWeek, 7);
    endWeek = addDays(endWeek, 7);
  }
  console.log(`Rejected : week from ${startWeek.toUTCString()} to ${endWeek.toUTCString()} not finished`);
}

// Function used to credit account for delegations
exports.payDelegations = async function() {
  console.log('start paying delegation');
  let historyDelegations = null;
  let priceHistory = null;

  //get price history
  await new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool.request().query(`
      SELECT timestamp, memo
      FROM TxTransfers
      WHERE timestamp > '2018-08-03 12:05:42.000'
      and [from] = 'steemplus-bot'
      and [to] = 'steemplus-bot'
      and memo LIKE '%priceHistory%'
      ORDER BY timestamp DESC;
      `);
    })
    .then(result => {
      // get result
      priceHistory = result.recordsets[0];
      sql.close();
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });

  // Start delegation request
  await new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool.request().query(`
      SELECT delegator, vesting_shares, timestamp
      FROM TxDelegateVestingShares
      WHERE delegatee = 'steem-plus'
      AND timestamp > CONVERT(datetime,'2018-08-03 12:05:42.000');
      `);
    })
    .then(result => {
      // get result and start delegation payment
      historyDelegations = result.recordsets[0];
      sql.close();
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });

  // Init arrays
  let delegations = {};
  let delegators = [];
  // Create hashmaps with users delegations
  for (delegation of historyDelegations) {
    // If user not in the hashmap, create array
    if (delegations[delegation.delegator] === undefined) {
      delegations[delegation.delegator] = [];
      delegators.push(delegation.delegator);
    }
    // ... And add values
    delegations[delegation.delegator].push({
      vesting_shares: delegation.vesting_shares,
      timestamp: delegation.timestamp
    });
    // Sort delegations from the oldest to the most recent
    delegations[delegation.delegator].sort(function(a, b) {
      return a.timestamp - b.timestamp;
    });
  }

  let dateStartSPP = new Date("2017-08-03 12:05:42.000");
  let dateNow = new Date();

  // For each delegator
  for (delegator of delegators) {
    let startDate = null;
    // Find last payment of a user
    // Retrive user
    let user = await User.findOne({
      accountName: delegator
    });
    // If user is NOT null
    if (user !== null) {
      // Get his last POintDetails with type 3 (delegation);
      lastPointDetail = await PointsDetail.find({
          requestType: 3,
          user: user._id
        })
        .sort({
          timestamp: -1
        })
        .limit(1);
      // If there is one, use its date as start date
      if (lastPointDetail[0] !== null && lastPointDetail[0] !== undefined)
        startDate = new Date(lastPointDetail[0].timestampString);
    }
    // If startDate is still null or undefined, get start date depending on the delegations
    if (startDate === null || startDate === undefined) {
      let dateFirstDelegation = new Date(delegations[delegator][0].timestamp);
      if (dateFirstDelegation <= dateStartSPP) startDate = dateStartSPP;
      else startDate = dateFirstDelegation;
    }
    let date = startDate;
    let currentDelegation = 0;
    let previousDate = subDays(date, 1);
    let previousDelegation = delegations[delegator]
      .filter(d => new Date(d.timestamp) <= date)
      .sort(function(a, b) {
        return b.timestamp - a.timestamp;
      })[0].vesting_shares;
    // Look for minimum delegation of the last 24 hours not last one
    currentDelegation = delegations[delegator]
      .filter(
        d =>
        new Date(d.timestamp) <= date && new Date(d.timestamp) > previousDate
      )
      .sort(function(a, b) {
        return a.vesting_shares - b.vesting_shares;
      })[0];
    if (currentDelegation === undefined) {
      // If delegation is undefined try to use previous
      currentDelegation = previousDelegation;
      let tmp = delegations[delegator]
        .filter(d => new Date(d.timestamp) <= date)
        .sort(function(a, b) {
          return b.timestamp - a.timestamp;
        });
      if (tmp !== currentDelegation) currentDelegation = tmp[0].vesting_shares;
    } else currentDelegation = currentDelegation.vesting_shares;

    // This loop will check everyday until 'today'
    while (date < dateNow) {
      let weekly = 0;
      let hasCanceledDelegation = false;
      let i = 0;
      console.log("start new 7 days period from " + date);
      // We decided to pay delegation every 7 days
      // User can get a reward if he delegated for 7 days in a row.
      for (i; i < 7; i++) {
        // Look for minimum delegation of the last 24 hours not last one
        previousDelegation = currentDelegation;
        currentDelegation = delegations[delegator]
          .filter(
            d =>
            new Date(d.timestamp) <= date &&
            new Date(d.timestamp) > previousDate
          )
          .sort(function(a, b) {
            return a.vesting_shares - b.vesting_shares;
          })[0];

        // Same behavior as during the init part
        if (currentDelegation === undefined) {
          currentDelegation = previousDelegation;
          let tmp = delegations[delegator]
            .filter(d => new Date(d.timestamp) <= date)
            .sort(function(a, b) {
              return b.timestamp - a.timestamp;
            });
          if (tmp !== currentDelegation)
            currentDelegation = tmp[0].vesting_shares;
        } else currentDelegation = currentDelegation.vesting_shares;

        // If currentDelegation is undefined or 0, this means user stopped delegating.
        if (currentDelegation === 0 || currentDelegation === undefined) {
          hasCanceledDelegation = true;
          currentDelegation = 0;
          break;
        }

        // Go to next day.
        date = addDays(date, 1);
        previousDate = subDays(date, 1);
        // Retrive price informations
        let jsonPrice = utils.findSteemplusPrice(
          date,
          priceHistory,
          currentRatioSBDSteem,
          currentTotalSteem,
          currentTotalVests
        );
        let totalSteem = jsonPrice.totalSteem;
        let totalVests = jsonPrice.totalVests;
        let ratioSBDSteem = jsonPrice.price;

        // Calculate amount of SPP
        let amount =
          steem.formatter
          .vestToSteem(parseFloat(currentDelegation), totalVests, totalSteem)
          .toFixed(3) * ratioSBDSteem;
        weekly += amount;
      }
      // After 7 days in a row, if user hasn't canceled
      if (!hasCanceledDelegation && date <= dateNow) {
        // Create new PointsDetail
        let user = await User.findOne({
          accountName: delegator
        });
        if (user === null) {
          // If not create it
          user = new User({
            accountName: delegator,
            nbPoints: 0
          });
          // Need to wait for the creation to be done to be able to use the object
          user = await user.save();
        }
        type = await TypeTransaction.findOne({
          name: "Delegation"
        });

        let nbPoints = weekly / 7.0;
        // Create new PointsDetail entry
        let pointsDetail = new PointsDetail({
          nbPoints: nbPoints,
          amount: nbPoints,
          amountSymbol: "SP",
          permlink: "",
          user: user._id,
          typeTransaction: type._id,
          timestamp: date,
          timestampString: utils.formatDate(date),
          requestType: 3
        });
        pointsDetail = await pointsDetail.save();

        // Update user account
        user.pointsDetails.push(pointsDetail);
        user.nbPoints = user.nbPoints + nbPoints;
        await user.save();
      } else {
        console.log("No delegation for this day");
        date = addDays(date, 1);
      }
    }
  }
};

// Function used to process the data from SteemSQL for requestType == 0
// @parameter comments : posts data received from SteemSQL
// @parameter totalSteem : dynamic value from the blockchain
// @parameter totalVests : dynamic value from the blockchain
async function updateSteemplusPointsComments(comments) {
  // Number of new entry in the DB
  let nbPointDetailsAdded = 0;
  console.log(`Adding ${comments.length} new comment(s) to DB`);
  // Iterate on transfers
  for (const comment of comments) {
    // Check if user is already in DB
    let user = await User.findOne({
      accountName: comment.author
    });
    if (user === null) {
      // If not create it
      user = new User({
        accountName: comment.author,
        nbPoints: 0
      });
      // Need to wait for the creation to be done to be able to use the object
      user = await user.save();
    }

    // Get type
    let type = "default";
    if (
      comment.beneficiaries.includes("dtube.rewards") ||
      comment.beneficiaries.includes("dtube")
    )
      type = await TypeTransaction.findOne({
        name: "DTube"
      });
    else if (comment.beneficiaries.includes("utopian.pay"))
      type = await TypeTransaction.findOne({
        name: "Utopian.io"
      });
    else if (comment.beneficiaries.includes("steemhunt"))
      type = await TypeTransaction.findOne({
        name: "Steemhunt"
      });
    else {
      let benefs = JSON.parse(comment.beneficiaries);
      if (benefs.length > 1)
        type = await TypeTransaction.findOne({
          name: "Beneficiaries"
        });
      else type = await TypeTransaction.findOne({
        name: "Donation"
      });
    }

    let jsonPrice = utils.findSteemplusPrice(
      comment.created,
      priceHistory,
      currentRatioSBDSteem,
      currentTotalSteem,
      currentTotalVests
    );
    let ratioSBDSteem = jsonPrice.price;
    let totalSteem = jsonPrice.totalSteem;
    let totalVests = jsonPrice.totalVests;

    // Get the amount of the transaction
    let amount = ((steem.formatter.vestToSteem(parseFloat(comment.vesting_payout), totalVests, totalSteem) + parseFloat(comment.steem_payout) * ratioSBDSteem + parseFloat(comment.sbd_payout)));
    // Get the number of Steemplus points
    let nbPoints = amount * 100;
    let pointsDetail = new PointsDetail({
      nbPoints: nbPoints.toFixed(3),
      amount: amount.toFixed(3),
      amountSymbol: "SP",
      permlink: comment.permlink,
      url: comment.url,
      title: comment.title,
      user: user._id,
      typeTransaction: type._id,
      timestamp: comment.created,
      timestampString: utils.formatDate(comment.created),
      requestType: 0
    });
    pointsDetail = await pointsDetail.save();
    // Update user acccount's points
    user.pointsDetails.push(pointsDetail);
    user.nbPoints = user.nbPoints + nbPoints;
    await user.save(function(err) {});
    nbPointDetailsAdded++;
  }
  console.log(`Added ${nbPointDetailsAdded} pointDetail(s)`);
}

// Function used to process the data from SteemSQL for requestType == 1
// @parameter transfers : transfers data received from SteemSQL
async function updateSteemplusPointsTransfers(transfers) {
  // Number of new entry in the DB
  let nbPointDetailsAdded = 0;
  let reimbursementList = transfers.filter(
    transfer => transfer.from === "minnowbooster"
  );
  let transfersList = transfers.filter(
    transfer => transfer.from !== "minnowbooster"
  );
  let steemMonstersRequestIDs = transfers.filter(
    transfer =>
    transfer.to === "steemplus-pay" && transfer.from === "steemmonsters" && transfer.memo.includes("Affiliate payment for Steem Monsters purchase: ")
  );
  steemMonstersRequestIDs = steemMonstersRequestIDs.map(x =>
    x.memo.replace("Affiliate payment for Steem Monsters purchase: ", "")
  );
  let promises = [];
  for (let requestId of steemMonstersRequestIDs) {
    promises.push(utils.getPurchaseInfoSM(requestId));
  }

  Promise.all(promises).then(async function(values) {
    let steemMonstersRequestUser = {};
    for (let i = 0; i < values.length; i++) {
      steemMonstersRequestUser[values[i].requestId] = values[i].player;
    }
    console.log(`Adding ${transfersList.length} new transfer(s) to DB`);
    // Iterate on transfers
    for (const transfer of transfersList) {
      let reason = null;
      // Init default values

      let permlink = "";
      let accountName = null;
      // Get the amount of the transfer
      let amount = transfer.amount * 0.01; //Steemplus take 1% of the transaction

      let requestType = null;
      let amountSymbol = null;
      let isManual = false;

      // Get type
      let type = null;
      if (transfer.memo.match(/type:([a-zA-Z]*)[\s]*username:([a-zA-Z0-9\.-]*)[\s]*amount:([0-9]*\.*[0-9]*)[\s]*amountUnit:([a-zA-Z]*)/i) !== null)
      {
        let res = transfer.memo.match(/type:([a-zA-Z]*)[\s]*username:([a-zA-Z0-9\.-]*)[\s]*amount:([0-9]*\.*[0-9]*)[\s]*amountUnit:([a-zA-Z]*)/i);
        type = await TypeTransaction.findOne({
          name: res[1]
        });
        accountName = res[2];
        amount = res[3];
        amountSymbol = res[4];
        requestType = 1;
        isManual = true;
      }
      else if (transfer.to === "minnowbooster") {
        if (transfer.memo.toLowerCase().replace("steemplus") === "") {
          continue;
        }
        type = await TypeTransaction.findOne({
          name: "MinnowBooster"
        });
        let isReimbursement = false;
        for (const reimbursement of reimbursementList) {
          if (transfer.from === reimbursement.to) {
            if (
              transfer.memo
              .replace("steemplus https://steemit.com/", "")
              .split("/")[2] === undefined
            ) {
              if (
                reimbursement.memo.includes(
                  transfer.memo.replace("steemplus ", "")
                )
              ) {
                if (reimbursement.memo.includes("You got an upgoat")) {
                  amount =
                    (transfer.amount - reimbursement.amount).toFixed(2) * 0.01;
                  permlink = transfer.memo.replace("steemplus ", "");
                  accountName = transfer.from;
                  isReimbursement = true;
                  break;
                } else {
                  reason = reimbursement.memo;
                  break;
                }
              }
            } else if (
              reimbursement.memo.includes(
                transfer.memo
                .replace("steemplus https://steemit.com/", "")
                .split("/")[2]
              )
            ) {
              if (reimbursement.memo.includes("You got an upgoat")) {
                permlink = transfer.memo.replace("steemplus ", "");
                amount =
                  (transfer.amount - reimbursement.amount).toFixed(2) * 0.01;
                accountName = transfer.from;
                isReimbursement = true;
                break;
              } else {
                reason = reimbursement.memo;
                break;
              }
            }
          }
        }
        if (!isReimbursement) {
          permlink = transfer.memo.replace("steemplus ", "");
          amount = transfer.amount.toFixed(2) * 0.01;
          accountName = transfer.from;
        }
        requestType = 2;
      } else if (
        transfer.to === "steemplus-pay" &&
        transfer.memo.includes("buySPP")
      ) {
        type = await TypeTransaction.findOne({
          name: "Purchase"
        });
        accountName = transfer.from;
        permlink = "";
        amount = transfer.amount;
        requestType = 1;
      } else if (
        transfer.from === "postpromoter" &&
        transfer.to === "steemplus-pay"
      ) {
        type = await TypeTransaction.findOne({
          name: "PostPromoter"
        });
        if (transfer.memo.match(/Sender: @([a-zA-Z0-9\.-]*),/i) === null) {
          continue;
        }
        accountName = transfer.memo.match(/Sender: @([a-zA-Z0-9\.-]*),/i)[1];
        permlink = transfer.memo.match(/Post: (.*)/)[1];
        amount = transfer.amount; // 1% already counted
        requestType = 1;
      } else if (
        transfer.to === "steemplus-pay" &&
        transfer.from === "steemmonsters"
      ) {
        type = await TypeTransaction.findOne({
          name: "SteemMonsters"
        });
        if (/Account: ([a-z0-9\-\.]{3,})/.test(transfer.memo)) {
          accountName =
            transfer.memo.match(
              /Account: ([a-z0-9\-\.]{3,})/)[1];
        } else if (transfer.memo.includes('Affiliate payment for Steem Monsters purchase: ')) {
          accountName =
            steemMonstersRequestUser[
              transfer.memo.replace(
                "Affiliate payment for Steem Monsters purchase: ",
                ""
              )
            ];
        }
        amount = transfer.amount;
        requestType = 1;
        permlink = "";
      }
      else if (transfer.to === "steem-plus" && transfer.memo.match(/Project=Fundition-6om5dpvkb/))
      {
        type = await TypeTransaction.findOne({
          name: "Fundition"
        });
        accountName = transfer.from;
        amount = transfer.amount;
        requestType = 1;
        permlink = "";
      }

      if (type === null) {
        console.log("refused type");
        continue;
      }
      if (reason !== null) {
        console.log("refused reason : " + reason);
        continue;
      }
      // Check if user is already in DB

      let user = await User.findOne({
        accountName: accountName
      });
      if (user === null) {
        // If not, create it
        if (
          accountName === "" ||
          accountName === undefined ||
          accountName === null
        ) {
          continue;
        }
        user = new User({
          accountName: accountName,
          nbPoints: 0
        });
        user = await user.save();
      }

      let ratioSBDSteem = utils.findSteemplusPrice(
        transfer.timestamp,
        priceHistory,
        currentRatioSBDSteem,
        currentTotalSteem,
        currentTotalVests
      ).price;
      // We decided that 1SPP == 0.01 SBD
      let nbPoints = 0;
      if(isManual){
        if (amountSymbol === "SBD") nbPoints = amount * 100;
        else if (amountSymbol === "STEEM") {
          nbPoints = amount * ratioSBDSteem * 100;
        }
        else if(amountSymbol === "SPP") nbPoints = amount;
      }
      else {
        if (transfer.amount_symbol === "SBD") nbPoints = amount * 100;
        else if (transfer.amount_symbol === "STEEM") {
          nbPoints = amount * ratioSBDSteem * 100;
        }
        else if(amountSymbol === "SPP") nbPoints = amount;
      }


      // Create new PointsDetail entry
      let pointsDetail = new PointsDetail({
        nbPoints: nbPoints,
        amount: amount,
        amountSymbol: amountSymbol || transfer.amount_symbol,
        permlink: permlink,
        user: user._id,
        typeTransaction: type._id,
        timestamp: transfer.timestamp,
        timestampString: utils.formatDate(transfer.timestamp),
        requestType: requestType
      });
      pointsDetail = await pointsDetail.save();

      // Update user account
      user.pointsDetails.push(pointsDetail);
      user.nbPoints = user.nbPoints + nbPoints;
      await user.save();
      nbPointDetailsAdded++;
    }
    console.log(`Added ${nbPointDetailsAdded} pointDetail(s)`);
  });
}

// Function used to process the data from SteemSQL for requestType == 4
// @parameter transfers : transfers data received from SteemSQL
async function updateSteemplusPointsReblogs(reblogs) {
  // Number of new entry in the DB
  let nbPointDetailsAdded = 0;
  console.log(`Adding ${reblogs.length} new reblog(s) to DB`);
  for (reblog of reblogs) {
    let user = await User.findOne({
      accountName: reblog.account
    });
    if (user === null) {
      // If not, create it
      user = new User({
        accountName: reblog.account,
        nbPoints: 0
      });
      user = await user.save();
    }
    let type = await TypeTransaction.findOne({
      name: "Reblog"
    });
    // Create new PointsDetail entry
    let limitDate = new Date('2018-10-26 00:00:00.000');
    let nbPoints = (limitDate > new Date(reblog.timestamp) ? 20 : 5);
    let pointsDetail = new PointsDetail({
      nbPoints: nbPoints,
      amount: nbPoints,
      amountSymbol: "",
      permlink: reblog.permlink,
      user: user._id,
      typeTransaction: type._id,
      timestamp: reblog.timestamp,
      timestampString: utils.formatDate(reblog.timestamp),
      requestType: 4
    });
    pointsDetail = await pointsDetail.save();

    // Update user account
    user.pointsDetails.push(pointsDetail);
    user.nbPoints = user.nbPoints + nbPoints;
    await user.save();
    nbPointDetailsAdded++;
  }
  console.log(`Added ${nbPointDetailsAdded} pointDetails`);
}

exports.updateSteemplusPoints = async function() {
  // Get dynamic properties of steem to be able to calculate prices
  await Promise.all([
    steem.api.getDynamicGlobalPropertiesAsync(),
    utils.getPriceSBDAsync(),
    utils.getPriceSteemAsync(),
    utils.getLastBlockID()
  ]).then(async function(values) {
    currentTotalSteem = Number(
      values["0"].total_vesting_fund_steem.split(" ")[0]
    );
    currentTotalVests = Number(
      values["0"].total_vesting_shares.split(" ")[0]
    );

    // Calculate ration SBD/Steem
    currentRatioSBDSteem = values[2] / values[1];
    utils.storeSteemPriceInBlockchain(
      values[2],
      values[1],
      currentTotalSteem,
      currentTotalVests
    );

    //get price history
    await new sql.ConnectionPool(config.config_api)
      .connect()
      .then(pool => {
        return pool.request().query(`
        SELECT timestamp, memo
        FROM TxTransfers
        WHERE timestamp > '2018-08-03 12:05:42.000'
        and [from] = 'steemplus-bot'
        and [to] = 'steemplus-bot'
        and memo LIKE '%priceHistory%'
        ORDER BY timestamp DESC;
        `);
      })
      .then(result => {
        // get result
        priceHistory = result.recordsets[0];
        sql.close();
      })
      .catch(error => {
        console.log(error);
        sql.close();
      });

    let delaySteemSQL =
      (parseInt(values[0].last_irreversible_block_num) -
        parseInt(values[3])) *
      3;

    // Get the last entry the requestType 0 (Comments)
    let lastEntry = await PointsDetail.find({
        requestType: 0
      })
      .sort({
        timestamp: -1
      })
      .limit(1);
    // Get the creation date of the last entry
    let lastEntryDate = null;
    if (lastEntry[0] !== undefined)
      lastEntryDate = lastEntry[0].timestampString;
    else lastEntryDate = "2018-08-10 12:05:42.000"; // This date is the steemplus point annoncement day + 7 days for rewards because rewards come after 7 days.
    // Wait for SteemSQL's query result before starting the second request
    // We decided to wait to be sure this function won't try to update the same row twice at the same time
    await new sql.ConnectionPool(config.config_api)
      .connect()
      .then(pool => {
        return pool.request().query(`
        SELECT
          VOCommentBenefactorRewards.sbd_payout, VOCommentBenefactorRewards.steem_payout, VOCommentBenefactorRewards.vesting_payout, VOCommentBenefactorRewards.timestamp as created , Comments.author, Comments.title, Comments.url, Comments.permlink, Comments.beneficiaries, Comments.total_payout_value
        FROM
          VOCommentBenefactorRewards
          INNER JOIN Comments ON VOCommentBenefactorRewards.author = Comments.author AND VOCommentBenefactorRewards.permlink = Comments.permlink
        WHERE
          benefactor = 'steemplus-pay'
        AND timestamp > CONVERT(datetime, '${lastEntryDate}')
        ORDER BY created ASC;
        `);
      })
      .then(result => {
        // Start data processing
        updateSteemplusPointsComments(result.recordsets[0]);
        sql.close();
      })
      .catch(error => {
        console.log(error);
        sql.close();
      });

    // Get the last entry for the second request type (Transfers : Postpromoter)
    lastEntry = await PointsDetail.find({
        requestType: 1
      })
      .sort({
        timestamp: -1
      })
      .limit(1);
    lastEntryDate = null;
    if (lastEntry[0] !== undefined)
      lastEntryDate = lastEntry[0].timestampString;
    else lastEntryDate = "2018-08-03 12:05:42.000"; // This date is the steemplus point annoncement day

    // Get the last entry for the second request type (Transfers : MinnowBooster)
    lastEntryMB = await PointsDetail.find({
        requestType: 2
      })
      .sort({
        timestamp: -1
      })
      .limit(1);
    lastEntryDateMB = null;
    if (lastEntryMB[0] !== undefined)
      lastEntryDateMB = lastEntryMB[0].timestampString;
    else lastEntryDateMB = "2018-08-03 12:05:42.000"; // This date is the steemplus point annoncement day
    // Execute SteemSQL query
    await new sql.ConnectionPool(config.config_api)
      .connect()
      .then(pool => {
        return pool.request().query(`
        SELECT timestamp, [from], [to], amount, amount_symbol, memo
        FROM TxTransfers
        WHERE
        (
          timestamp > CONVERT(datetime, '${lastEntryDate}')
          AND
          (
              ([to] = 'steemplus-pay' AND [from] != 'steemplus-pay' AND [from] != 'minnowbooster')
          )
        )
        OR
        (
          timestamp > CONVERT(datetime, '${lastEntryDateMB}')
          AND
          (
            ([from] = 'minnowbooster' AND memo LIKE '%memo:%')
          OR
            ([from] = 'minnowbooster' AND memo LIKE '%permlink:%')
          OR
            ([from] = 'minnowbooster' AND memo LIKE '%Post:%')
          OR
            ([to] = 'minnowbooster' AND memo LIKE 'steemplus%' AND timestamp < DATEADD(second, -${delaySteemSQL +
              10 * 60}, GETUTCDATE()))
          )
        )
        OR
        (
          timestamp > CONVERT(datetime, '${lastEntryDate}')
          AND
          [to] = 'steem-plus' AND memo LIKE 'Project=Fundition-6om5dpvkb%'
        )
        OR
        (
          timestamp > CONVERT(datetime, '${lastEntryDate}')
          AND
          [to] = 'steem-plus' AND [from] = 'steem-plus' AND memo LIKE '%type%'
        );
      `);
      })
      .then(result => {
        updateSteemplusPointsTransfers(result.recordsets[0]);
        sql.close();
      })
      .catch(error => {
        console.log(error);
        sql.close();
      });

    // Get the last entry the requestType 4 (Reblogs)
    lastEntry = await PointsDetail.find({
        requestType: 4
      })
      .sort({
        timestamp: -1
      })
      .limit(1);
    // Get the creation date of the last entry
    lastEntryDate = null;
    if (lastEntry[0] !== undefined)
      lastEntryDate = lastEntry[0].timestampString;
    else lastEntryDate = "2018-08-03 12:05:42.000"; // This date is the steemplus point annoncement day + 7 days for rewards because rewards come after 7 days.
    // Wait for SteemSQL's query result before starting the second request
    // We decided to wait to be sure this function won't try to update the same row twice at the same time

    await new sql.ConnectionPool(config.config_api)
      .connect()
      .then(pool => {
        return pool.request().query(`
        SELECT account, Comments.url as permlink, timestamp
        FROM Reblogs
        INNER JOIN Comments
        ON Comments.author = Reblogs.author
        AND Comments.permlink = Reblogs.permlink
        WHERE Comments.author = 'steem-plus'
        AND timestamp > CONVERT(datetime, '${lastEntryDate}')
        AND depth = 0
        AND Comments.created > DATEADD(day, -7, timestamp);
      `);
      })
      .then(result => {
        // Start data processing
        updateSteemplusPointsReblogs(result.recordsets[0]);
        sql.close();
      })
      .catch(error => {
        console.log(error);
        sql.close();
      });
  });
};
