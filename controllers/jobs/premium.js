const config = require("../../config");
const utils = require("../../utils.js");
const sql = require("mssql");
const steem = require("steem");
const getJSON = require("get-json");
const PremiumFeature = require("../../models/premiumFeature.js");
const PointsDetail = require("../../models/pointsDetail.js");
const TypeTransaction = require("../../models/typeTransaction.js");
const SubscriptionPremium = require("../../models/subscriptionPremium.js");
const User = require("../../models/user.js");

exports.debitPremium = async function() {

  // Create all the regex needed to analyse the memo

  // Memo received from users
  const regexSubscribe = /Premium Feature : Redeem SPP for \[([a-zA-Z0-9\s]*)\] id:([0-9]*)/;
  const regexCancelSubscription = /Premium Feature : Cancel subscription for \[([a-zA-Z0-9\s]*)\] id:([0-9]*)/;

  // Memo sent by SteemPlus
  const regexACKValid = /Premium Feature : ([0-9]*) SPP redeemed for \[([a-zA-Z0-9\s]*)\]/;
  const regexACKRenew = /Premium Feature : ([0-9]*) SPP redeemed for renewing \[([a-zA-Z0-9\s]*)\]/;
  const regexACKCancel = /Premium Feature : Subscription for \[([a-zA-Z0-9\s]*)\] has been canceled. id:([0-9]*)/;
  const regexACKNotEnough = /Premium Feature : Unsufficient number of SPP to use \[([a-zA-Z0-9\s]*)\]. Please check "How to earn SPP\?" on the SteemPlus Points section of your wallet. id:([0-9]*)/;

  const regexRequestID = /id:([0-9]*)/;

  const accountName = 'steem-plus';

  // Templates to create memo
  memoACKValidTemplate = (price, featureName, requestID) => {
    return `Premium Feature : ${price} SPP redeemed for [${featureName}] id:${requestID}`;
  }
  memoACKRenewTemplate = (price, featureName, requestID) => {
    return `Premium Feature : ${price} SPP redeemed for renewing [${featureName}] id:${requestID}`;
  }
  memoACKNotEnoughtTemplate = (featureName, requestID) => {
    return `Premium Feature : Unsufficient number of SPP to use [${featureName}]. Please check "How to earn SPP?" on the SteemPlus Points section of your wallet. id:${requestID}`;
  }
  memoACKCancelTemplate = (featureName, requestID) => {
    return `Premium Feature : Subscription for [${featureName}] has been canceled. id:${requestID}`;
  }

  // Get the last entry in database to know when to start the query
  // Request type 6 is Premium Features
  let lastEntry = await PointsDetail.find({
    requestType: 6
  })
  .sort({
    timestamp: -1
  })
  .limit(1);

  let lastEntryDate = null;
  if (lastEntry[0] !== undefined)
    lastEntryDate = lastEntry[0].timestampString;
  else lastEntryDate = "2018-12-05 12:05:42.000"; // This date is the steemplus point annoncement day + 7 days for rewards because rewards come after 7 days.

  console.log(`
        SELECT [to], [from], memo, timestamp
        FROM TxTransfers
        WHERE
          timestamp > CONVERT(datetime, '${lastEntryDate}')
        AND
        (
            ([to] = '${accountName}' AND memo LIKE '%Premium Feature%' )
          OR
            ([from] = '${accountName}' AND memo LIKE '%Premium Feature%' )
        )
        AND ([to] != [from])
        ORDER BY timestamp;
        `)

   // Execute query on SteemSQL database
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool.request().query(`
        SELECT [to], [from], memo, timestamp
        FROM TxTransfers
        WHERE
          timestamp > CONVERT(datetime, '${lastEntryDate}')
        AND
        (
            ([to] = '${accountName}' AND memo LIKE '%Premium Feature%' )
          OR
            ([from] = '${accountName}' AND memo LIKE '%Premium Feature%' )
        )
        AND ([to] != [from])
        ORDER BY timestamp;
        `);
    })
    .then(async function(result){
      sql.close();
      // Transfers is the result of the query
      const transfers = result.recordsets[0];
      // Requests are subscriptions and cancelations asked from user
      let requests = transfers.filter(t => t.to === accountName);
      // ACK are the responses sent by Steemplus to requests
      let acks = transfers.filter(t => t.from === accountName && !regexACKRenew.test(t.memo));
      // acks renew are the auto renew messages sent by steemplus
      let acksRenew = transfers.filter(t => t.from === accountName && regexACKRenew.test(t.memo));

      // For each request
      for(request of requests) {
        // Get the id of the request
        let id = request.memo.match(regexRequestID)[1];
        // Try to find the matching ack
        let ack = acks.find(function(element) {
          return element.memo.match(regexRequestID)[1] === id;
        });
        let price, featureName, feature, user, res;

        if(regexSubscribe.test(request.memo)){
          // Request is a subscription
          res = request.memo.match(regexSubscribe);
        }
        else if(regexCancelSubscription.test(request.memo)){
          // Request is a cancelation
          res = request.memo.match(regexCancelSubscription);
        }

        // Get user and feature for request
        user = await User.findOne({"accountName": request.from});
        feature = await PremiumFeature.findOne({"name": res[1]});

        let sub = await SubscriptionPremium.findOne({"user": user, "premiumFeature": feature});
        if(sub !== null && sub !== undefined) {
          // Don't send a memo
          continue;
        }
        
        // If ack is undefined or null it means Steemplus hasn't reply yet
        if(ack === undefined || ack === null){
          // SteemPlus hasn't answered yet
          // Get the type of request
          if(regexCancelSubscription.test(request.memo)){
            // if type is cancelation send cancelation memo
            const memo = memoACKCancelTemplate(res[1], res[2]);
            console.log(memo);
            steem.broadcast.transfer(config.sp_act,
              accountName,
              request.from,
              "0.001 SBD",
              memo,
              function(err, result) {
                console.log(err, result);
              }
            );
            // Create ACK
            ack = {
              "from": accountName,
              "to": request.from,
              "memo": memo,
              "timestamp": new Date(),
            }
          }
          else {
            // request is a subscription
            
            // Test if user has enought SPP
            if(!user || feature.price > user.nbPoints){
              // If not send memo to inform him
              const memo = memoACKNotEnoughtTemplate(res[1], res[2]);
              console.log(memo);
              // To test use lecaillon here
              steem.broadcast.transfer(config.sp_act,
                accountName,
                request.from,
                "0.001 SBD",
                memo,
                function(err, result) {
                  console.log(err, result);
                }
              );

              // Create ACK
              ack = {
                "from": accountName,
                "to": request.from,
                "memo": memo,
                "timestamp": new Date(),
              }
            }
            else
            {
              // If user has enough SPP then send valid ACK
              const memo = memoACKValidTemplate(feature.price, feature.name, res[2]);
              console.log(memo);
              steem.broadcast.transfer(config.sp_act,
                accountName,
                request.from,
                "0.001 SBD",
                memo,
                function(err, result) {
                  console.log(err, result);
                }
              );
              ack = {
                "from": accountName,
                "to": request.from,
                "memo": memo,
                "timestamp": new Date(),
              }
            }
          }
        }

        // Add requestID to ack
        ack.requestID = id;

        // Check type
        if (regexACKValid.test(ack.memo))
        {
          // If ack okay, try to find subscription
          let sub = await SubscriptionPremium.findOne({"user": user, "premiumFeature": feature});
          if(sub === null || sub === undefined){
            // If subscription not in database, create it
            const res = ack.memo.match(regexACKValid);
            price = res[1];
          }
          else if(sub.isCanceled){
            // Reactivate the feature.
            console.log('Reactivate feature');
            sub.isCanceled = false;
            await sub.save();
            // Continue with next request so user doesn't pay twice
            continue;
          }
          else {
            console.log("Nothing to do");
            continue;
          }

        }
        else if(regexACKCancel.test(ack.memo))
        {
          // Case cancel
          console.log('ACK Canceled');
          let sub = await SubscriptionPremium.findOne({"user": user, "premiumFeature": feature});
          sub.isCanceled = true;
          await sub.save();
          continue;
        }
        else if(regexACKNotEnough.test(ack.memo))
        {
          // Case Not enough
          console.log('ACK Not enough');
          continue;
        }
        else {
          console.log('memo not matching anything');
          continue;
        }


        // Finally create the transaction in DB
        if(!user) continue;
        
        const type = await TypeTransaction.findOne({"name": "Premium Feature"});
        const amount = price * -1;

        let pointsDetail = new PointsDetail({
          nbPoints: amount,
          amount: amount,
          amountSymbol: "SPP",
          permlink: "",
          user: user._id,
          typeTransaction: type._id,
          timestamp: ack.timestamp,
          timestampString: utils.formatDate(ack.timestamp),
          requestType: 6 //Type for payment premium
        });
        pointsDetail = await pointsDetail.save();

        // Update user account
        user.pointsDetails.push(pointsDetail);
        user.nbPoints = parseFloat(user.nbPoints) + amount;
        await user.save();

        let subscriptionPremium = new SubscriptionPremium({
          premiumFeature: feature._id,
          user: user._id,
          subscriptionDate: request.timestamp,
          lastPayment: ack.timestamp,
          isCanceled: false,
          requestID: ack.requestID
        });
        subscriptionPremium = await subscriptionPremium.save();
        user.activeSubscriptions.push(subscriptionPremium);
        await user.save();
      }

      // Check all the renew ack
      for(ackRenew of acksRenew){
        const id = ackRenew.memo.match(regexRequestID)[1];
        let subscription = await SubscriptionPremium.findOne({"requestID": id});
        const type = await TypeTransaction.findOne({"name": "Premium Feature"});
        let user = await User.findOne({"_id": subscription.user._id});
        let feature = await PremiumFeature.findOne({"_id": subscription.premiumFeature._id});

        const amount = feature.price * -1;

        // Create point detail for renew
        let pointsDetail = new PointsDetail({
          nbPoints: amount,
          amount: amount,
          amountSymbol: "SPP",
          permlink: "",
          user: user._id,
          typeTransaction: type._id,
          timestamp: ackRenew.timestamp,
          timestampString: utils.formatDate(ackRenew.timestamp),
          requestType: 6 //Type for payment premium
        });
        pointsDetail = await pointsDetail.save();

        // Update user account
        user.pointsDetails.push(pointsDetail);
        user.nbPoints = parseFloat(user.nbPoints) + amount;
        await user.save();

        subscription.lastPayment = ackRenew.timestamp;
        await subscription.save();

      }

      // Check auto renew
      let subList = await SubscriptionPremium.find({});
      const dateNow = new Date();
      for(subscription of subList){
        const renewDate = utils.addMonths(new Date(subscription.lastPayment), 1);
        if(dateNow > renewDate){
          // Auto Renew
          let user = await User.findOne({"_id": subscription.user});
          let feature = await PremiumFeature.findOne({"_id": subscription.premiumFeature})
          if(feature.isCanceled) {
            // If feature is flagged as cancel, remove subscription
            console.log("Canceled subscription");
            await SubscriptionPremium.deleteOne({"_id": subscription._id});
          }
          else if(feature.price > user.nbPoints){
            // No enought money
            console.log("Not enought points to renew")
            await steem.broadcast.transfer(config.sp_act,
              accountName,
              user.accountName,
              "0.001 SBD",
              memoACKNotEnoughtTemplate(feature.name, subscription.requestID),
              function(err, result) {
                console.log(err, result);
              }
            );
            await SubscriptionPremium.deleteOne({"_id": subscription._id});
          }
          else {
            // if enought points and not canceled then auto renew
            console.log("Renew");
            steem.broadcast.transfer(config.sp_act,
              accountName,
              user.accountName,
              "0.001 SBD",
              memoACKRenewTemplate(feature.price, feature.name, subscription.requestID),
              function(err, result) {
                console.log(err, result);
              }
            );
            subscription.lastPayment = dateNow;
            await subscription.save();
          }
        }
        else {
          console.log("No need to renew until");
          console.log(renewDate);
        }
      }

    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};
