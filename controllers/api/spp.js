const User = require("../../models/user.js");

exports.getSPP = async function(username) {
  // The populate function helps giving the full information instead of the id of the "typeTransaction" or "pointsDetails"
  return await User.find({ accountName: username })
    .populate({
      path: "pointsDetails",
      populate: { path: "typeTransaction" }
    })
    .exec();
};

exports.getSPPLight = async function(username) {
	return await User.findOne({ accountName: username}, {'accountName':1, 'nbPoints':1, '_id':0}, function (err, docs) {
		return docs;
	});
}
