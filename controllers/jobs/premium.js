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
  //       SELECT *
  //       FROM ( SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='paid_curation' FROM VOCurationRewards WHERE curator=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()
  //         UNION ALL
  //         SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout, '' as beneficiaries, type='paid_author' FROM VOAuthorRewards WHERE author=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()
  //         UNION ALL
  //         SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout as vests_payout, '' as beneficiaries, type='paid_benefactor' FROM VOCommentBenefactorRewards WHERE benefactor=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()
  //         UNION ALL
  //         SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value,TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='pending_curation' FROM VOCurationRewards WHERE curator=@username AND timestamp >= DATEADD(day,0, GETUTCDATE())
  //         UNION ALL
  //         select created, author, permlink, max_accepted_payout, percent_steem_dollars, pending_payout_value,  -1 as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vesting_payout, beneficiaries, 'pending_author' from Comments WHERE author = @username and pending_payout_value > 0 AND created >= DATEADD(day, -7, GETUTCDATE())
  //         UNION ALL
  //         SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout as vests_payout, '' as beneficiaries, type='pending_benefactor' FROM VOCommentBenefactorRewards WHERE benefactor=@username AND timestamp >= DATEADD(day,0, GETUTCDATE())
  //       ) as rewards
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

  return getJSON(
    "https://api.myjson.com/bins/amfmi",
    async function(err, transfers) {
      let requests = transfers.filter(t => t.to === 'steemplus-pay');
      let acks = transfers.filter(t => t.from === 'steemplus-pay');
      
      for(request of requests) {
        let id = request.memo.match(regexRequestID)[1];
        let price, featureName, feature, user;
        let ack = acks.find(function(element) {
          return element.memo.match(regexRequestID)[1] === id;
        });

        if(ack === undefined || ack === null){
          const res = request.memo.match(regexSubscribe);
          user = await User.findOne({"accountName": request.from});
          feature = await PremiumFeature.findOne({"name": res[1]});
          if(regexCancelSubscription.test(request.memo)){
            console.log(`send ackCancel to ${request.from} => premium-feature : Subscription for [${res[1]}] has been canceled. id:${res[2]}`);
          }
          else {
            if(feature.price > user.nbPoints){
              console.log(`create ackNotEnough => premium-feature : Unsufficient number of SPP to use [${res[1]}]. Please get more SPP and try again. id:${res[2]}`);
            }
            else
            {
              console.log(`send ackValid to ${request.from} => premium-feature : ${feature.price} SPP redeemed for [${feature.name}] id:${res[2]}`)
            }
          }
          continue;
        }

        if (regexACKValid.test(ack.memo))
        {
          console.log('ACK OK')
          const res = ack.memo.match(regexACKValid);
          price = res[1];
          featureName = res[2];
        }
        else if(regexACKCancel.test(ack.memo))
        {
          // Case cancel
          console.log('ACK Canceled');
        }
        else if(regexACKNotEnough.test(ack.memo))
        {
          // Case Not enough
          console.log('ACK Not enough');
        }
        
        const type = await TypeTransaction.findOne({"name": "Premium Feature"});
        user = await User.findOne({"accountName": request.from});
         feature = await PremiumFeature.findOne({
            name: featureName
          });
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
        user.activeSubscriptions.push(subscriptionPremium);
        await user.save();

      }
    }
  );
};