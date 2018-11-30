
const PremiumFeature = require("../../models/premiumFeature.js");
const SubscriptionPremium = require("../../models/subscriptionPremium.js");
const User = require("../../models/user.js");

exports.getFeatureList = async function() {
	return await PremiumFeature.find({}, {'name':1, 'price':1, 'description':1, '_id':0}, function (err, docs) {
		return docs;
	});
}

exports.getUserFeatures = async function(username) {
	return await User.findOne({"accountName": username}, {'activeSubscriptions':1 ,'_id':0})
		.populate({
			path: "activeSubscriptions", 
			select: "-_id -user -__v", 
			populate: {path: "premiumFeature", select: "-_id -__v -price"}
		})
}