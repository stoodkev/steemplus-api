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
  const regexSubscribe = /Premium Feature : Redeem SPP for \[([a-zA-Z0-9\s]*)\] id:([0-9]*)/;
  const regexCancelSubscription = /Premium Feature : Cancel subscription for \[([a-zA-Z0-9\s]*)\] id:([0-9]*)/;

  const regexACKValid = /Premium Feature : ([0-9]*) SPP redeemed for \[([a-zA-Z0-9\s]*)\]/;
  const regexACKRenew = /Premium Feature : ([0-9]*) SPP redeemed for renewing \[([a-zA-Z0-9\s]*)\]/;
  const regexACKCancel = /Premium Feature : Subscription for \[([a-zA-Z0-9\s]*)\] has been canceled. id:([0-9]*)/;
  const regexACKNotEnough = /Premium Feature : Unsufficient number of SPP to use \[([a-zA-Z0-9\s]*)\]. Please get more SPP and try again. id:([0-9]*)/;

  const regexRequestID = /id:([0-9]*)/;

  const accountName = 'lecaillon';

  memoACKValidTemplate = (price, featureName, requestID) => {
    return `Premium Feature : ${price} SPP redeemed for [${featureName}] id:${requestID}`;
  }
  memoACKRenewTemplate = (price, featureName, requestID) => {
    return `Premium Feature : ${price} SPP redeemed for renewing [${featureName}] id:${requestID}`;
  }
  memoACKNotEnoughtTemplate = (featureName, requestID) => {
    return `Premium Feature : Unsufficient number of SPP to use [${featureName}]. Please get more SPP and try again. id:${requestID}`;
  }
  memoACKCancelTemplate = (featureName, requestID) => {
    return `Premium Feature : Subscription for [${featureName}] has been canceled. id:${requestID}`;
  }

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
  else lastEntryDate = "2018-08-03 12:05:42.000"; // This date is the steemplus point annoncement day + 7 days for rewards because rewards come after 7 days.
    
  console.log(lastEntryDate);
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
    ORDER BY timestamp;`)
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
      const transfers = result.recordsets[0];
      let requests = transfers.filter(t => t.to === accountName);
      let acks = transfers.filter(t => t.from === accountName && !regexACKRenew.test(t.memo));
      let acksRenew = transfers.filter(t => t.from === accountName && regexACKRenew.test(t.memo));

      for(request of requests) {
        console.log('--------------Start---------------')
        console.log(request.memo)

        let id = request.memo.match(regexRequestID)[1];
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

        user = await User.findOne({"accountName": request.from});
        feature = await PremiumFeature.findOne({"name": res[1]});

        if(ack === undefined || ack === null){
          // SteemPlus hasn't answered yet
          
          if(regexCancelSubscription.test(request.memo)){
            console.log(`send ackCancel to ${request.from} => Premium Feature : Subscription for [${res[1]}] has been canceled. id:${res[2]}`);
            const memo = memoACKCancelTemplate(res[1], res[2]);

            // To test use lecaillon here
            steem.broadcast.transfer(config.wif_test,
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
          else {
            if(feature.price > user.nbPoints){
              console.log(`create ackNotEnough => Premium Feature : Unsufficient number of SPP to use [${res[1]}]. Please get more SPP and try again. id:${res[2]}`);
              const memo = memoACKNotEnoughtTemplate(res[1], res[2]);

              // To test use lecaillon here
              steem.broadcast.transfer(config.wif_test,
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
            else
            {
              console.log(`send ackValid to ${request.from} => Premium Feature : ${feature.price} SPP redeemed for [${feature.name}] id:${res[2]}`)
              const memo = memoACKValidTemplate(feature.price, feature.name, res[2]);

              // To test use lecaillon here
              steem.broadcast.transfer(config.wif_test,
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

        ack.requestID = id;

        if (regexACKValid.test(ack.memo))
        {
          console.log('ACK OK');
          let sub = await SubscriptionPremium.findOne({"user": user, "premiumFeature": feature});
          if(sub === null || sub === undefined){
            const res = ack.memo.match(regexACKValid);
            price = res[1];
            console.log("Add sub to DB");
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
        console.log('--------------End---------------')
      }

      console.log(acksRenew);
      for(ackRenew of acksRenew){
        console.log(ackRenew);
        const id = ackRenew.memo.match(regexRequestID)[1];
        let subscription = await SubscriptionPremium.findOne({"requestID": id});
        const type = await TypeTransaction.findOne({"name": "Premium Feature"});
        let user = await User.findOne({"_id": subscription.user._id});
        let feature = await PremiumFeature.findOne({"_id": subscription.premiumFeature._id});
        
        const amount = feature.price * -1;

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
        
        console.log(subscription);
        subscription.lastPayment = ackRenew.timestamp;
        console.log(subscription);
        await subscription.save();

      }
      
      // Check auto renew
      let subList = await SubscriptionPremium.find({});
      const dateNow = new Date();
      for(subscription of subList){
        console.log(dateNow, subscription.lastPayment);
        const renewDate = utils.addDays(new Date(subscription.lastPayment), 1);
        if(dateNow > renewDate){
          console.log(`Renew date ${renewDate}`)
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
            // await steem.broadcast.transfer(config.wif_test,
            //   accountName,
            //   user.accountName,
            //   "0.001 SBD",
            //   memoACKNotEnoughtTemplate(feature.name, subscription.requestID),
            //   function(err, result) {
            //     console.log(err, result);
            //   }
            // );
            await SubscriptionPremium.deleteOne({"_id": subscription._id});
          }
          else {
            // if enought points and not canceled then auto renew
            console.log("Renew");
            // To test use lecaillon here
            steem.broadcast.transfer(config.wif_test,
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

