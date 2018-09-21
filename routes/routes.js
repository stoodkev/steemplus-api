let config=require("../config");
let sql=require("mssql");
let steem=require("steem");
let utils=require("../utils");
var getJSON = require('get-json');
var User = require('../models/user');
var PointsDetail = require('../models/pointsDetail');
var TypeTransaction = require('../models/typeTransaction');
var totalVests = null;
var totalSteem = null;
var currentRatioSBDSteem = null;
var steemPricesHistory = null;

var lastPermlink=null;
var appRouter = function (app) {

  app.get("/", function(req, res) {
    res.status(200).send("Welcome to our restful API!");
  });

  // Get all the articles and comments where a given user is mentionned
  // @parameter @username : username
  app.get("/api/get-mentions/:username", function(req, res){
  console.log(req.params.username);
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      return pool.request()
      .input("username","\@"+req.params.username)
      .input("username2","%@"+req.params.username+" %")
      .input("username3","%@"+req.params.username+"<%")
      .input("username4","%@"+req.params.username+"[%")
      .input("username5","%@"+req.params.username+"]%")
      .input("username6","%@"+req.params.username+".%")
      .input("username7","%@"+req.params.username+"!%")
      .input("username8","%@"+req.params.username+"?%")
      .input("username9","%@"+req.params.username+",%")
      .input("username10","%@"+req.params.username+";%")
      .query('SELECT TOP 100 url,created, permlink, root_title, title, author, REPLACE(LEFT(body,250),\'"\',\'\'\'\') AS body,category, parent_author, total_payout_value, pending_payout_value, net_votes, json_metadata\
      FROM (SELECT  TOP 500 url,created, permlink, root_title, title, author,body,category, parent_author, total_payout_value, pending_payout_value, net_votes, json_metadata\
      FROM Comments\
      WHERE CONTAINS(body, @username) ORDER BY created DESC ) AS subtable  \
      WHERE body LIKE @username2 OR body LIKE @username3 OR body LIKE @username4 OR body LIKE @username5 OR body LIKE @username6 OR body LIKE @username7 OR body LIKE @username8 OR body LIKE @username9 OR body LIKE @username10 ORDER BY created DESC \
      ')
    }).then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
      sql.close();});
  });

  // Get witness information for a given user
  // @parameter @username : username
  app.get("/api/get-witness/:username", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      console.log("connected");
      return pool.request()
      .input("username",req.params.username)
      .query('SELECT lastWeekValue, lastMonthValue, lastYearValue, foreverValue, timestamp, Witnesses.* \
  FROM (SELECT SUM(vesting_shares) as lastWeekValue FROM VOProducerRewards WHERE producer = @username AND timestamp >= DATEADD(day,-7, GETUTCDATE())) as lastWeekTable, \
  (SELECT SUM(vesting_shares) as lastMonthValue FROM VOProducerRewards WHERE producer = @username AND timestamp >= DATEADD(day,-31, GETUTCDATE())) as lastMonthTable, \
  (SELECT SUM(vesting_shares) as lastYearValue FROM VOProducerRewards WHERE producer = @username AND timestamp >= DATEADD(day,-365, GETUTCDATE())) as lastYearTable, \
  (SELECT SUM(vesting_shares) as ForeverValue FROM VOProducerRewards WHERE producer = @username ) as foreverTable, Witnesses \
  LEFT JOIN Blocks ON Witnesses.last_confirmed_block_num = Blocks.block_num \
  WHERE Witnesses.name = @username')
    }).then(result => {
      res.status(200).send(result.recordsets[0][0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });

  // Get witness ranking. This request doesn't include inactive witnesses
  // No parameter!
  app.get("/api/get-witnesses-rank", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      console.log("connected");
      return pool.request()
      .query('Select Witnesses.name, rank\
    from Witnesses (NOLOCK)\
    LEFT JOIN (SELECT ROW_NUMBER() OVER (ORDER BY (SELECT votes) DESC) AS rank, * FROM Witnesses WHERE signing_key != \'STM1111111111111111111111111111111114T1Anm\') AS rankedTable ON Witnesses.name = rankedTable.name;')
    }).then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });

  // Get all the received witness votes for a given user. Includes proxified votes
  // @parameter @username : username
  app.get("/api/get-received-witness-votes/:username", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      console.log("connected");
      return pool.request()
      .input("username2","%"+req.params.username+"%")
      .input("username",req.params.username)
      .query("SELECT MyAccounts.timestamp, MyAccounts.account, (ISNULL(TRY_CONVERT(float,REPLACE(value_proxy,'VESTS','')),0) + TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS',''))) as totalVests, TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS','')) as accountVests, ISNULL(TRY_CONVERT(float,REPLACE(value_proxy,'VESTS','')),0) as proxiedVests \
              FROM (SELECT B.timestamp, B.account,A.vesting_shares FROM Accounts A, (select timestamp, account from TxAccountWitnessVotes where ID IN (select MAX(ID)as last from TxAccountWitnessVotes where witness=@username group by account) and approve=1)as B where B.account=A.name)as MyAccounts LEFT JOIN(SELECT proxy as name,SUM(TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS',''))) as value_proxy FROM Accounts WHERE proxy IN ( SELECT name FROM Accounts WHERE witness_votes LIKE @username2 and proxy != '')GROUP BY(proxy))as proxy_table ON MyAccounts.account=proxy_table.name")})
      .then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });


  // Get all the incoming delegations for a given user
  // @parameter @username : username
  app.get("/api/get-incoming-delegations/:username", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      console.log("connected");
      return pool.request()
      .input("username",req.params.username)
      .query("SELECT delegator, vesting_shares, timestamp as delegation_date \
              FROM TxDelegateVestingShares \
              INNER JOIN ( \
                SELECT MAX(ID) as last_delegation_id \
                FROM TxDelegateVestingShares \
                WHERE delegatee = @username \
                GROUP BY delegator \
              ) AS Data ON TxDelegateVestingShares.ID = Data.last_delegation_id")})
      .then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });

  // Get all the wallet information for a given user
  // @parameter @username : username
  app.get("/api/get-wallet-content/:username", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      console.log("connected");
      return pool.request()
      .input("username",req.params.username)
      .query("select top 500 *\
        from (\
        select top 500 timestamp, reward_steem, reward_sbd, reward_vests, '' as amount, '' as amount_symbol, 'claim' as type, '' as memo, '' as to_from \
        from TxClaimRewardBalances where account = @username ORDER BY timestamp desc\
        union all\
        select top 500 timestamp, '', '', '',amount, amount_symbol, 'transfer_to' as type, ISNULL(REPLACE(memo, '\"', '\'\''), '') as memo, \"from\" as to_from from TxTransfers where [to] = @username AND type != 'transfer_to_vesting' ORDER BY timestamp desc\
        union all\
        select top 500 timestamp, '', '', '', amount, amount_symbol, 'transfer_from' as type, ISNULL(REPLACE(memo, '\"', '\'''), '') as memo , \"to\" as to_from from TxTransfers where [from] = @username AND type != 'transfer_to_vesting' ORDER BY timestamp desc \
        union all \
        select top 500 timestamp, '', '', '', amount, amount_symbol, 'power_up' as type, '' as memo , '' as to_from from TxTransfers where [from] = @username AND type = 'transfer_to_vesting' ORDER BY timestamp desc \
        union all\
        select top 500 timestamp, '', '', vesting_shares, '', '', 'start_power_down' as type, '' as memo, '' as to_from from TxWithdraws where account = @username AND vesting_shares > 0 ORDER BY timestamp desc \
        union all \
        select top 500 timestamp, '', '', vesting_shares, '', '', 'stop_power_down' as type, '' as memo, '' as to_from from TxWithdraws where account = @username AND vesting_shares = 0 ORDER BY timestamp desc \
     ) as wallet_history ORDER BY timestamp desc ")})
      .then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });


  // Routine for welcoming new users on the platform and direct them to SteemPlus.

  app.get("/job/welcome-users/:key", function(req, res){
    if(req.params.key==config.key){
      var query = {
        tag: 'introduceyourself',
        limit: 28
      }
      var chromeExtensionWebstoreURL = 'https://chrome.google.com/webstore/detail/steemplus/mjbkjgcplmaneajhcbegoffkedeankaj?hl=en';
      getJSON('http://www.whateverorigin.org/get?url=' + encodeURIComponent(chromeExtensionWebstoreURL),function(e,response){
        //console.log(response);
        var numUsers = ((""+response.contents.match(/<Attribute name=\"user_count\">([\d]*?)<\/Attribute>/))).split(",")[1];
        console.log(numUsers);

      steem.api.getDiscussionsByAuthorBeforeDateAsync('steem-plus',null, new Date().toISOString().split('.')[0],1).then(function(r,e){
        //console.log(e,r);
        steem.api.getDiscussionsByCreated(query, function(err, results) {
          console.log(results);
          var break_point=-1;
          if(err==null&&results.length!=0){
            results.forEach((result,i)=>{
              if(result.permlink==lastPermlink)
              {
                break_point=i;
                return;
              }
              else if (break_point!=-1)
                return;
              console.log(i);
              setTimeout(function(){
              //console.log(result.author, result.permlink);
              if(!JSON.parse(result.json_metadata).tags.includes("polish"))
                steem.broadcast.comment(config.wif, result.author, result.permlink, config.bot, result.permlink+"-re-welcome-to-steemplus", "Welcome to SteemPlus", utils.commentNewUser(result,r[0],numUsers), {}, function(err, result) {
                  console.log(err, result);
                });
              },i*21*1000);
            });
          }
          else if(err!==null)
            console.log(err);

            console.log("------------");
            console.log("---DONE-----");
            console.log("------------");
            res.status(200).send((break_point==-1?results.length:break_point)+" results treated!");
            lastPermlink=results[0].permlink;
          });
        });
      });
    }
    else {
      res.status(403).send("Permission denied");
    }
  });

  app.get("/job/power/:key", function(req, res){
    if(req.params.key==config.key){
      steem.api.getAccounts(['steemplus-pay'], function(err, response){
        console.log(response[0].reward_steem_balance);
        steem.broadcast.claimRewardBalance(config.payPostKey, 'steemplus-pay', response[0].reward_steem_balance, response[0].reward_sbd_balance, response[0].reward_vesting_balance, function(err, result) {
          console.log((parseFloat(response[0].reward_steem_balance.split(" ")[0])+parseFloat(response[0].balance.split(" ")[0])).toFixed(3)+" STEEM");
          console.log(err,result);
          steem.broadcast.transferToVesting(config.payActKey, 'steemplus-pay', 'steemplus-pay', (parseFloat(response[0].reward_steem_balance.split(" ")[0])+parseFloat(response[0].balance.split(" ")[0])).toFixed(3)+" STEEM", function(err, result) {
            console.log(err, result);
          });
        });

      });

    }
    else {
      res.status(403).send("Permission denied");
    }
  });

  // Get all curation rewards, author rewards and benefactor rewards for a given user.
  // @parameter @username : username
  app.get("/api/get-rewards/:username", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      return pool.request()
      .input("username",req.params.username)
      .query("SELECT * \
              FROM ( SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='paid_curation' FROM VOCurationRewards WHERE curator=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE() \
                UNION ALL \
                SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout, '' as beneficiaries, type='paid_author' FROM VOAuthorRewards WHERE author=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()  \
                UNION ALL \
                SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value,TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='paid_benefactor' FROM VOCommentBenefactorRewards WHERE benefactor=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE() \
                UNION ALL \
                SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value,TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='pending_curation' FROM VOCurationRewards WHERE curator=@username AND timestamp >= DATEADD(day,0, GETUTCDATE()) \
                UNION ALL \
                select created, author, permlink, max_accepted_payout, percent_steem_dollars, pending_payout_value,  -1 as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vesting_payout, beneficiaries, 'pending_author' from Comments WHERE author = @username and pending_payout_value > 0 AND created >= DATEADD(day, -7, GETUTCDATE())   \
                UNION ALL \
                SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value,TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='pending_benefactor' FROM VOCommentBenefactorRewards WHERE benefactor=@username AND timestamp >= DATEADD(day,0, GETUTCDATE()) \
              ) as rewards \
              ORDER BY timestamp desc")})
      .then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });

  //Get all followers / followee for a given user
  //@parameter @username : username
  app.get("/api/get-followers-followee/:username", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      return pool.request()
      .input("username",req.params.username)
      .query("select * from Followers where follower = @username or following = @username")})
      .then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });

  //Get last block id in SteemSQL
  app.get("/api/get-last-block-id", function(req, res){
    new sql.ConnectionPool(config.config_api).connect().then(pool => {
      return pool.request()
      .input("username",req.params.username)
      .query("select top 1 block_num from Blocks ORDER BY timestamp DESC")})
      .then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
    sql.close();});
  });

  //Get the list of all resteem for a post.
  // @parameter : list of all the posts we want a list for.
  // The post is select by {permlink, author} because permlink can be the same for different authors.
  app.post("/api/get-reblogs", function(req, res){

    // get parameters from request body
    var data = req.body.data;
    var wheres = [];

    // build where clause for query
    data.forEach(function(item){
      wheres.push("(permlink = '" + item.permlink + "' AND author='"+ item.author +"')");
    });
    var requestWhere = wheres.join(' OR ');

    // build query
    var querySQL = "Select account, author, permlink from Reblogs WHERE "+requestWhere;

    // execute query only if there is where clause
    if(wheres.length > 0)
    {
      new sql.ConnectionPool(config.config_api).connect().then(pool => {
        return pool.request()
        .query(querySQL)})
        .then(result => {
        res.status(200).send(result.recordsets[0]);
        sql.close();
      }).catch(error => {console.log(error);
      sql.close();});
    }
    else
    {
      res.status(520).send('Wrong parameters');
    }
  });


  // Function used to get the details of an account. 
  // @parameter username : account name
  // Return the number of points of an account and other information as the detail of every entry of steemplus point
  app.get("/api/get-steemplus-points/:username", function(req, res){
    let paramUsername = req.params.username;
    // The populate function helps giving the full information instead of the id of the "typeTransaction" or "pointsDetails"
    User.find({accountName: paramUsername}).populate({path: 'pointsDetails', populate: {path: 'typeTransaction'}}).exec(function(err, user){
      if(err) res.status(520).send('Error');
      else res.status(200).send(user);
    });
  });

  // This function is used to update steemplus point. 
  // Function executed every hour.
  // Only get the results since the last entry.
  app.get("/job/update-steemplus-points/:key", function(req, res)
  {
    // If key is not the right key, permission denied and return
    if(req.params.key !== config.key)
    {
      res.status(403).send("Permission denied");
      return;
    }
    setTimeout(function(){
      // Get dynamic properties of steem to be able to calculate prices
      Promise.all([steem.api.getDynamicGlobalPropertiesAsync(), getPriceSBDAsync(), getPriceSteemAsync(), getLastBlockID()])
      .then(async function(values)
      {
        totalSteem = totalSteem = Number(values["0"].total_vesting_fund_steem.split(' ')[0]);
        totalVests = Number(values["0"].total_vesting_shares.split(' ')[0]);
        // Calculate ration SBD/Steem
        currentRatioSBDSteem = values[2] / values[1];
        storeSteemPriceInBlockchain(values[2], values[1]);

        // get price history
        await new sql.ConnectionPool(config.config_api).connect().then(pool => {
          return pool.request()
          .query(`
            SELECT timestamp, memo
            FROM TxTransfers
            WHERE timestamp > '2018-08-03 12:05:42.000'
            and [from] = 'steemplus-bot'
            and [to] = 'steemplus-bot'
            and memo LIKE '%priceHistory%'
            ORDER BY timestamp DESC;
            `)})
          .then(result => {
            // get result
            priceHistory = result.recordsets[0];
            sql.close();
          }).catch(error => {console.log(error);
        sql.close();});

        let delaySteemSQL = (parseInt(values[0].last_irreversible_block_num) - parseInt(values[3])) * 3;

        // Get the last entry the requestType 0 (Comments)
        var lastEntry = await PointsDetail.find({requestType: 0}).sort({timestamp: -1}).limit(1);
        // Get the creation date of the last entry
        var lastEntryDate = null;
        if(lastEntry[0] !== undefined)
          lastEntryDate = lastEntry[0].timestampString;
        else
          lastEntryDate = '2018-08-10 12:05:42.000'; // This date is the steemplus point annoncement day + 7 days for rewards because rewards come after 7 days.
        // Wait for SteemSQL's query result before starting the second request
        // We decided to wait to be sure this function won't try to update the same row twice at the same time
        await new sql.ConnectionPool(config.config_api).connect().then(pool => {
          return pool.request()
          .query(`
            SELECT
              REPLACE(VOCommentBenefactorRewards.reward, ' VESTS', '') as reward, VOCommentBenefactorRewards.timestamp as created , Comments.author, Comments.title, Comments.url, Comments.permlink, Comments.beneficiaries, Comments.total_payout_value
            FROM
              VOCommentBenefactorRewards
              INNER JOIN Comments ON VOCommentBenefactorRewards.author = Comments.author AND VOCommentBenefactorRewards.permlink = Comments.permlink
            WHERE 
              benefactor = 'steemplus-pay'
            AND timestamp > CONVERT(datetime, '${lastEntryDate}')
            ORDER BY created ASC;
            `)})
          .then(result => {
            // get result
            var comments = result.recordsets[0];
            // Start data processing
            updateSteemplusPointsComments(comments, totalSteem, totalVests);
            sql.close();
          }).catch(error => {console.log(error);
        sql.close();});

        // Get the last entry for the second request type (Transfers : Postpromoter)
        lastEntry = await PointsDetail.find({requestType: 1}).sort({timestamp: -1}).limit(1);
        var lastEntryDate = null;
        if(lastEntry[0] !== undefined)
          lastEntryDate = lastEntry[0].timestampString;
        else
        lastEntryDate = '2018-08-03 12:05:42.000'; // This date is the steemplus point annoncement day

        // Get the last entry for the second request type (Transfers : MinnowBooster)
        lastEntryMB = await PointsDetail.find({requestType: 2}).sort({timestamp: -1}).limit(1);
        var lastEntryDateMB = null;
        if(lastEntryMB[0] !== undefined)
          lastEntryDateMB = lastEntryMB[0].timestampString;
        else
        lastEntryDateMB = '2018-08-03 12:05:42.000'; // This date is the steemplus point annoncement day
        // Execute SteemSQL query
        await new sql.ConnectionPool(config.config_api).connect().then(pool => {
          return pool.request()
          .query(`
            SELECT timestamp, [from], [to], amount, amount_symbol, memo 
            FROM TxTransfers 
            WHERE
            (
                ([from] = 'minnowbooster' and memo LIKE '%memo:%' and timestamp > CONVERT(datetime, '${lastEntryDateMB}'))
              OR 
                ([from] = 'minnowbooster' and memo LIKE '%permlink:%' and timestamp > CONVERT(datetime, '${lastEntryDateMB}'))
              OR
                ([from] = 'minnowbooster' and memo LIKE '%Post:%' and timestamp > CONVERT(datetime, '${lastEntryDateMB}'))
              OR
                ([to] = 'minnowbooster' and memo LIKE 'steemplus%' AND timestamp < DATEADD(second, -${delaySteemSQL+10*60}, GETUTCDATE()) AND timestamp > CONVERT(datetime, '${lastEntryDateMB}'))
              OR
                ([to] = 'steemplus-pay' AND [from] != 'steemplus-pay' AND [from] != 'minnowbooster' AND timestamp > CONVERT(datetime, '${lastEntryDate}'))
            );
            `)})
          .then(result => {
            var transfers = result.recordsets[0];
            updateSteemplusPointsTransfers(transfers);
            sql.close();
          }).catch(error => {console.log(error);
        sql.close();});
      });
    },0);
    res.status(200).send("OK");
  });

}

// Function used to process the data from SteemSQL for requestType == 1
// @parameter transfers : transfers data received from SteemSQL
async function updateSteemplusPointsTransfers(transfers)
{
  // Number of new entry in the DB
  var nbPointDetailsAdded = 0;
  var nbMinnowAccepted = 0;
  var nbMinnowRejected = 0;
  var nbPostProAccepted = 0;
  var nbPostProRejected = 0;
  let reimbursementList = transfers.filter(transfer => transfer.from === 'minnowbooster');
  let transfersList = transfers.filter(transfer => transfer.from !== 'minnowbooster');

  console.log(`Adding ${transfersList.length} new transfer(s) to DB`);
  // Iterate on transfers
  for (const transfer of transfersList) {
    var reason = null;
    // Init default values

    var permlink = '';
    var accountName = null;
    // Get the amount of the transfer
    var amount = transfer.amount * 0.01; //Steemplus take 1% of the transaction

    var requestType = null;
    
    // Get type
    var type = null;
    if(transfer.to === 'minnowbooster'){
      if(transfer.memo.toLowerCase().replace('steemplus') === '') 
      {
        continue;
      }
      type = await TypeTransaction.findOne({name: 'MinnowBooster'});
      for(const reimbursement of reimbursementList)
      {
        if(transfer.from === reimbursement.to)
        {
          if(transfer.memo.replace('steemplus https://steemit.com/', '').split('/')[2] === undefined)
          {
            if(reimbursement.memo.includes(transfer.memo.replace('steemplus ', '')))
            {
              if(reimbursement.memo.includes('You got an upgoat')){
                amount = (transfer.amount - reimbursement.amount).toFixed(2) * 0.01;
                permlink = transfer.memo.replace('steemplus ', '');
                accountName = transfer.from;
              }
              else {
                reason = reimbursement.memo;
                break;
              }
            }
          }
          else if(reimbursement.memo.includes(transfer.memo.replace('steemplus https://steemit.com/', '').split('/')[2]))
          {
            if(reimbursement.memo.includes('You got an upgoat')){
              permlink = transfer.memo.replace('steemplus https://steemit.com/', '').split('/')[2];
              amount = (transfer.amount - reimbursement.amount).toFixed(2) * 0.01;
              accountName = transfer.from;
            }
            else {
              reason = reimbursement.memo;
              break;
            }
          }
        }
      }
      requestType = 2;
    }
    else if(transfer.from === 'postpromoter' && transfer.to === 'steemplus-pay')
    {
      type = await TypeTransaction.findOne({name: 'PostPromoter'});
      if(transfer.memo.match(/Sender: @([a-zA-Z0-9\.-]*),/i) === null)
      {
        continue;
      } 
      accountName = transfer.memo.match(/Sender: @([a-zA-Z0-9\.-]*),/i)[1];
      amount = transfer.amount; // 1% already counted
      requestType = 1;
    }
    
    if(type === null)
    {
      continue;
    } 
    if(reason !== null)
    {
      continue;
    } 
    // Check if user is already in DB

    var user = await User.findOne({accountName: accountName});
    if(user === null)
    {
      // If not, create it
      user = new User({accountName: accountName, nbPoints: 0});
      user = await user.save();
    }

    var ratioSBDSteem = findSteemplusPrice(transfer.timestamp);
    // We decided that 1SPP == 0.01 SBD
    var nbPoints = 0;
    if(transfer.amount_symbol === "SBD")
      nbPoints = amount * 100;
    else if(transfer.amount_symbol === "STEEM")
    {
      
      nbPoints = amount * ratioSBDSteem * 100;
    }
    // Create new PointsDetail entry
    var pointsDetail = new PointsDetail({nbPoints: nbPoints, amount: amount, amountSymbol: transfer.amount_symbol, permlink: permlink, user: user._id, typeTransaction: type._id, timestamp: transfer.timestamp, timestampString: utils.formatDate(transfer.timestamp), requestType: requestType});
    pointsDetail = await pointsDetail.save();
    
    // Update user account
    user.pointsDetails.push(pointsDetail);
    user.nbPoints = user.nbPoints + nbPoints;
    await user.save(function (err) {});
    nbPointDetailsAdded++;
  }
  console.log(`Added ${nbPointDetailsAdded} pointDetail(s)`);
}

// Function used to process the data from SteemSQL for requestType == 0
// @parameter comments : posts data received from SteemSQL
// @parameter totalSteem : dynamic value from the blockchain
// @parameter totalVests : dynamic value from the blockchain
async function updateSteemplusPointsComments(comments, totalSteem, totalVests)
{
  // Number of new entry in the DB
  var nbPointDetailsAdded = 0;
  console.log(`Adding ${comments.length} new comment(s) to DB`);
  // Iterate on transfers
  for (const comment of comments) {
    
    // Check if user is already in DB
    var user = await User.findOne({accountName: comment.author});
    if(user === null)
    {
      // If not create it
      user = new User({accountName: comment.author, nbPoints: 0});
      // Need to wait for the creation to be done to be able to use the object
      user = await user.save();
    }
    
    // Get type
    var type = 'default';
    if(comment.beneficiaries.includes('dtube.pay'))
      type = await TypeTransaction.findOne({name: 'DTube'});
    else if(comment.beneficiaries.includes('utopian.pay'))
      type = await TypeTransaction.findOne({name: 'Utopian.io'});
    else
    {
      var benefs = JSON.parse(comment.beneficiaries);
      if(benefs.length > 1)
        type = await TypeTransaction.findOne({name: 'Beneficiaries'}); 
      else
        type = await TypeTransaction.findOne({name: 'Donation'}); 
    }
    var ratioSBDSteem = findSteemplusPrice(comment.created);
    // Get the amount of the transaction
    var amount = steem.formatter.vestToSteem(parseFloat(comment.reward), totalVests, totalSteem).toFixed(3);
    // Get the number of Steemplus points
    var nbPoints = amount * ratioSBDSteem * 100;
    var pointsDetail = new PointsDetail({nbPoints: nbPoints, amount: amount, amountSymbol: 'SP', permlink: comment.permlink, url:comment.url, title:comment.title, user: user._id, typeTransaction: type._id, timestamp: comment.created, timestampString: utils.formatDate(comment.created), requestType: 0});
    pointsDetail = await pointsDetail.save();
    // Update user acccount's points
    user.pointsDetails.push(pointsDetail);
    user.nbPoints = user.nbPoints + nbPoints;
    await user.save(function (err) {});
    nbPointDetailsAdded++;
  }
  console.log(`Added ${nbPointDetailsAdded} pointDetail(s)`);
}

// Function used to get Steem Price
function getPriceSteemAsync() {
    return new Promise(function(resolve, reject) {
        getJSON('https://bittrex.com/api/v1.1/public/getticker?market=BTC-STEEM', function(err, response){
          resolve(response.result['Bid']);
        });
    });
}

// Function used to get SBD price
function getPriceSBDAsync() {
    return new Promise(function(resolve, reject) {
        getJSON('https://bittrex.com/api/v1.1/public/getticker?market=BTC-SBD', function(err, response){
          resolve(response.result['Bid']);
        });
    });
}

// Function used to get the last block stored in SteemSQL. We use the result of this request to know if SteemSQL is synchronized with the blockchain
function getLastBlockID() {
  return new Promise(function(resolve, reject) {
      new sql.ConnectionPool(config.config_api).connect().then(pool => {
      return pool.request()
      .query("select top 1 block_num from Blocks ORDER BY timestamp DESC")})
      .then(result => {
        resolve(result.recordsets[0][0].block_num);
        sql.close();
      }).catch(error => {console.log(error);
    sql.close();});
  });
}

// This function is used to store the price of steem and SBD in the blockchain,
// This will help us to be able anytime to recreate the exact same database.
function storeSteemPriceInBlockchain(priceSteem, priceSBD)
{
  const accountName = "steemplus-bot";
  const json = JSON.stringify({priceHistory: {
    priceSteem: priceSteem,
    priceSBD: priceSBD
  }});

  steem.broadcast.transfer(config.wif_bot || process.env.WIF_TEST_2, accountName, accountName, "0.001 SBD", json, function(err, result) {
    console.log(err, result);
  });
}

function findSteemplusPrice(date){

  let dateNow = new Date();
  let minuteNow = dateNow.getUTCMinutes() - dateNow.getUTCMinutes()%10;
  let periodNow = `${dateNow.getUTCFullYear()}-${dateNow.getUTCMonth()+1}-${dateNow.getUTCDate()} ${dateNow.getUTCHours()}:${minuteNow}:00.000`;
  let minuteDate = date.getUTCMinutes() - date.getUTCMinutes()%10;
  let periodDate = `${date.getUTCFullYear()}-${date.getUTCMonth()+1}-${date.getUTCDate()} ${date.getUTCHours()}:${minuteDate}:00.000`;
  if(periodNow === periodDate) return currentRatioSBDSteem;
  else
  {
    let prices = priceHistory.filter(p => p.timestamp < date);
  
    if(prices.length === 0) return 1;
    else {
      let priceJSON = JSON.parse(prices[0].memo).priceHistory;
      if(priceJSON === undefined) return 1;
      else
        return priceJSON.priceSteem / priceJSON.priceSBD;
    }
  }
}

module.exports = appRouter;
