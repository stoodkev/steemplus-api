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
  ppu = ppu.map(function(doc) {
    doc.name = doc._id;
    doc._id = doc.origId;
    doc.points = doc.points.toFixed(3);
    delete doc._id;
    return doc;
  });
  result.points_per_user = ppu;
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
  result.total_points = total;
  return result;
};
