const User = require("../../models/user.js");
const PointsDetail = require("../../models/pointsDetail.js");
const TypeTransaction = require("../../models/typeTransaction.js");
const utils = require("../../utils.js");
const delegations = require("./delegations.js");
const steem = require("steem");


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

// Function used to get statistics about SPP :
// - Total amount delivered
// - Total per user
// - Total per categories
exports.getSppStats = async function() {
  let result = {};
  const points_per_user = [
    {
      $group: {
        _id: "$accountName",
        points: {
          $sum: "$nbPoints"
        }
      }
    },
    {
      $sort: { points: -1 }
    }
  ];

  let ppu = await User.aggregate(points_per_user).exec();
  //console.log(ppu);
  ppu = ppu.map(function(doc) {
    doc.name = doc._id;
    doc._id = doc.origId;
    doc.points = doc.points.toFixed(3);
    delete doc._id;
    return doc;
  });
  result.points_per_user = ppu;

  const points_per_user_day = [
    {
      $match: { timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    },
    {
      $group: {
        _id: "$user",
        points: {
          $sum: "$nbPoints"
        }
      }
    },
    {
      $sort: { points: -1 }
    }
  ];

  let ppu_day = await PointsDetail.aggregate(points_per_user_day).exec();
  ppu_day = ppu_day.map(async function(doc) {
    let a = await User.findById(doc._id).exec();
    doc.name = a.accountName;
    doc._id = doc.origId;
    doc.points = doc.points.toFixed(3);
    delete doc._id;
    return doc;
  });

  ppu_day = await Promise.all(ppu_day);
  result.points_per_user_day = ppu_day;

  const points_per_transaction = [
    {
      $group: {
        _id: "$typeTransaction",
        points: {
          $sum: "$nbPoints"
        }
      }
    },
    {
      $sort: { points: -1 }
    }
  ];
  let ppt = await PointsDetail.aggregate(points_per_transaction).exec();
  ppt = ppt.map(async function(doc) {
    let a = await TypeTransaction.findById(doc._id).exec();
    doc.type = a.name;
    doc.points = doc.points.toFixed(3);
    delete doc._id;
    return doc;
  });
  ppt = await Promise.all(ppt);
  result.points_per_transaction = ppt;
  const total = ppt
    .reduce(function(a, b) {
      return a + parseFloat(b.points);
    }, 0)
    .toFixed(3);

  const points_per_transaction_day = [
    {
      $match: { timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    },
    {
      $group: {
        _id: "$typeTransaction",
        points: {
          $sum: "$nbPoints"
        }
      }
    },
    {
      $sort: { points: -1 }
    }
  ];
  let ppt_day = await PointsDetail.aggregate(points_per_transaction_day).exec();
  ppt_day = ppt_day.map(async function(doc) {
    let a = await TypeTransaction.findById(doc._id).exec();
    doc.type = a.name;
    doc.points = doc.points.toFixed(3);
    delete doc._id;
    return doc;
  });
  ppt_day = await Promise.all(ppt_day);
  result.points_per_transaction_day = ppt_day;
  const total_day_exclusive = ppt_day
    .reduce(function(a, b) {
      return (b.type == "Delegation"||b.type=="Reblog" )? a : a + parseFloat(b.points);
    }, 0)
    .toFixed(3);

    const total_day = ppt_day
      .reduce(function(a, b) {
        return a + parseFloat(b.points);
      }, 0)
      .toFixed(3);
  result.total_points_day = total_day;
  result.total_points_day_exclusive = total_day_exclusive;
  result.total_points = total;
  result.spp_holders = ppu.length;
  //console.log(result);
  return result;
};

exports.getRankings = async function() {
  let result = {};
  let tmp = null;
  let dateNow = new Date();
  const userNotIncluded = await User.find({"accountName": {$in :["stoodkev", "steem-plus"]}});

  const delegationType = await TypeTransaction.findOne({"name": "Delegation"});
  // Get rewards of all time per user excluding delegations.
  const foreverQuery = [
    { "$match": { "typeTransaction": { $nin: [delegationType._id] }, "user": { $nin: userNotIncluded.map(u => u._id)} } },
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
    }
  ];
  tmp = await User.populate(await PointsDetail.aggregate(foreverQuery).exec(), {path: "_id", select: 'accountName'});
  tmp.map((entry, index) => {
    entry.rank = index + 1;
    entry.name = entry._id.accountName;
    delete entry._id;
  });
  result.forever = tmp;

  // Get only current month spp per user excluding delegations
  const monthlyQuery = [
    { "$match": { "typeTransaction": { $nin: [delegationType._id] }, timestamp: { '$gte' : new Date(`${dateNow.getUTCFullYear()}-${dateNow.getUTCMonth() + 1}-01T00:00:00.000Z`) }, "user": { $nin: userNotIncluded.map(u => u._id)} } },
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
    }
  ]
  tmp = await User.populate(await PointsDetail.aggregate(monthlyQuery).exec(), {path: "_id", select: 'accountName'});
  tmp.map((entry, index) => {
    entry.rank = index + 1;
    entry.name = entry._id.accountName;
    delete entry._id;
  });
  result.monthly = tmp;

  // Get only current month spp per user excluding delegations
  const weekNumber = utils.weekNumber(dateNow) - 1;
  let startWeek = new Date(Date.UTC(dateNow.getUTCFullYear(), 0, 1, 0, 0, 0))
  let endWeek = new Date(Date.UTC(dateNow.getUTCFullYear(), 0, 8, 0, 0, 0))
  startWeek = addDays(startWeek, weekNumber*7);
  endWeek = addDays(endWeek, weekNumber*7);
  const weeklyQuery = [
    { "$match": { "typeTransaction": { $nin: [delegationType._id] }, timestamp: { '$gte' : startWeek, '$lt' : endWeek}, "user": { $nin: userNotIncluded.map(u => u._id)} } },
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
    }
  ]
  tmp = await User.populate(await PointsDetail.aggregate(weeklyQuery).exec(), {path: "_id", select: 'accountName'});
  tmp.map((entry, index) => {
    entry.rank = index + 1;
    entry.name = entry._id.accountName;
    delete entry._id;
  });
  result.weekly = tmp;

  // Get delegations ranking
  tmp = await delegations.getIncomingRanking("steem-plus");
  let globalProperties = await steem.api.getDynamicGlobalPropertiesAsync()
  .then(function(values) 
  {
    totalSteem = Number(values.total_vesting_fund_steem.split(" ")[0]);
    totalVests = Number(values.total_vesting_shares.split(" ")[0]);
    return {totalSteem: totalSteem, totalVests: totalVests};
  });

  tmp.sort(function(a, b){return b.vesting_shares - a.vesting_shares});
  tmp.map((entry, index) => {
    entry.rank = index + 1;
    entry.sp = steem.formatter.vestToSteem(parseFloat(entry.vesting_shares), globalProperties.totalVests, globalProperties.totalSteem).toFixed(2);
    delete entry.vesting_shares;
    delete entry.delegation_date;
  });
  result.delegations = tmp;
  return result;
}
