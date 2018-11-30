
const PremiumFeature = require("../../models/premiumFeature.js");

exports.getFeatureList = async function() {
	return await PremiumFeature.find({}, {'name':1, 'price':1, 'description':1, '_id':0}, function (err, docs) {
		return docs;
	});
}