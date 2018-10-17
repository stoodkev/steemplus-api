const User = require("../../models/user.js");
const PointsDetail = require("../../models/pointsDetail.js");
const TypeTransaction = require("../../models/typeTransaction.js");

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
  const total_day = ppt_day
    .reduce(function(a, b) {
      return b.type == "Delegation" ? a : a + parseFloat(b.points);
    }, 0)
    .toFixed(3);
  result.total_points_day = total_day;
  result.total_points = total;
  result.spp_holders = ppu.length;
  //console.log(result);
  return result;
};
