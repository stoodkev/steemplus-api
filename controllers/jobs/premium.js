const config = require("../../config");
const utils = require("../../utils.js");
const sql = require("mssql");
const getJSON = require("get-json");
const PremiumFeature = require("../../models/premiumFeature.js");
const PointsDetail = require("../../models/pointsDetail.js");
const TypeTransaction = require("../../models/typeTransaction.js");
const SubscriptionPremium = require("../../models/subscriptionPremium.js");
const User = require("../../models/user.js");

exports.debitPremium = () => { 
  // return new sql.ConnectionPool(config.config_api)
  //   .connect()
  //   .then(pool => {
  //     return pool.request().query(`
        // SELECT [to], [from], memo, timestamp
        // FROM TxTransfers 
        // WHERE ([to] = 'steemplus-pay' AND memo LIKE '%premium-feature%' )
        // OR ([from] = 'steemplus-pay' AND memo LIKE '%premium-feature%' );
  //       ORDER BY timestamp;
  //       `);
  //   })
  //   .then(result => {
  //     sql.close();
  //     return result.recordsets[0];
  //   })
  //   .catch(error => {
  //     console.log(error);
  //     sql.close();
  //   });
  const regexSubscribe = /premium-feature : Redeem SPP for \[([a-zA-Z0-9\s]*)\] id:([0-9]*)/;
  const regexCancelSubscription = /premium-feature : Cancel subscription for \[([a-zA-Z0-9\s]*)\] id:([0-9]*)/;

  const regexACKValid = /premium-feature : ([0-9]*) SPP redeemed for \[([a-zA-Z0-9\s]*)\]/;
  const regexACKCancel = /premium-feature : Subscription for \[([a-zA-Z0-9\s]*)\] has been canceled. id:([0-9]*)/;
  const regexACKNotEnough = /premium-feature : Unsufficient number of SPP to use \[([a-zA-Z0-9\s]*)\]. Please get more SPP and try again. id:([0-9]*)/;

  const regexRequestID = /id:([0-9]*)/;

  const accountName = 'lecaillon';

  return getJSON(
    "https://api.myjson.com/bins/qewwi",
    async function(err, transfers) {
      let requests = transfers.filter(t => t.to === 'steemplus-pay');
      let acks = transfers.filter(t => t.from === 'steemplus-pay');
      
      for(request of requests) {
        console.log('--------------Start---------------')
        console.log(request.memo)

        let id = request.memo.match(regexRequestID)[1];
        let price, featureName, feature, user, res;
        let ack = acks.find(function(element) {
          return element.memo.match(regexRequestID)[1] === id;
        });

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
            console.log(`send ackCancel to ${request.from} => premium-feature : Subscription for [${res[1]}] has been canceled. id:${res[2]}`);
            const memo = `premium-feature : Subscription for [${res[1]}] has been canceled. id:${res[2]}`;

            // To test use lecaillon here
            // steem.broadcast.transfer(KEY,
            //   accountName,
            //   accountName,
            //   "0.001 SBD",
            //   memo,
            //   function(err, result) {
            //     console.log(err, result);
            //   }
            // );
            ack = {
              "from": "steemplus-pay",
              "to": "cedricguillas",
              "memo": memo,
              "timestamp": utils.formatDate(Date.now())
            }
          }
          else {
            if(feature.price > user.nbPoints){
              console.log(`create ackNotEnough => premium-feature : Unsufficient number of SPP to use [${res[1]}]. Please get more SPP and try again. id:${res[2]}`);
              const memo = `premium-feature : Unsufficient number of SPP to use [${res[1]}]. Please get more SPP and try again. id:${res[2]}`;

              // To test use lecaillon here
              // steem.broadcast.transfer(KEY,
              //   accountName,
              //   accountName,
              //   "0.001 SBD",
              //   memo,
              //   function(err, result) {
              //     console.log(err, result);
              //   }
              // );
              ack = {
                "from": "steemplus-pay",
                "to": "cedricguillas",
                "memo": memo,
                "timestamp": utils.formatDate(Date.now())
              }
            }
            else
            {
              console.log(`send ackValid to ${request.from} => premium-feature : ${feature.price} SPP redeemed for [${feature.name}] id:${res[2]}`)
              const memo = `premium-feature : ${feature.price} SPP redeemed for [${feature.name}] id:${res[2]}`;

              // To test use lecaillon here
              // steem.broadcast.transfer(KEY,
              //   accountName,
              //   accountName,
              //   "0.001 SBD",
              //   memo,
              //   function(err, result) {
              //     console.log(err, result);
              //   }
              // );
              ack = {
                "from": "steemplus-pay",
                "to": "cedricguillas",
                "memo": memo,
                "timestamp": utils.formatDate(Date.now())
              }
            }
          }
        }

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
          timestampString: ack.timestamp,
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
          isCanceled: false
        });
        subscriptionPremium = await subscriptionPremium.save();
        user.activeSubscriptions.push(subscriptionPremium);
        await user.save();
        console.log('--------------End---------------')
      }
    }
  );
};