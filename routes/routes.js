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

// This function is used to update steemplus point. 
  // Function executed every hour.
  // Only get the results since the last entry.
  app.get("/job/update-steemplus-points", function(req, res){
    // Get dynamic properties of steem to be able to calculate prices
    Promise.all([steem.api.getDynamicGlobalPropertiesAsync()])
    .then(async function(values)
    {
      totalSteem = totalSteem = Number(values["0"].total_vesting_fund_steem.split(' ')[0]);
      totalVests = Number(values["0"].total_vesting_shares.split(' ')[0]);

      // Get the last entry the requestType 0 (Comments)
      var lastEntry = await PointsDetail.find({requestType: 0}).sort({timestamp: -1}).limit(1);
      // Get the creation date of the last entry
      var lastEntryDate = null;
      if(lastEntry[0] !== undefined)
        lastEntryDate = lastEntry[0].timestampString;
      else
        lastEntryDate = '2018-08-03 12:05:42.000'; // This date is the steemplus point annoncement day
      // Wait for SteemSQL's query result before starting the second request
      // We decided to wait to be sure this function won't try to update the same row twice at the same time
      await new sql.ConnectionPool(config.config_api).connect().then(pool => {
        return pool.request()
        .query(`
          SELECT
            REPLACE(VOCommentBenefactorRewards.reward, ' VESTS', '') as reward, Comments.created, Comments.author, Comments.title, Comments.url, Comments.permlink, Comments.beneficiaries, Comments.total_payout_value
          FROM
            VOCommentBenefactorRewards
            INNER JOIN Comments ON VOCommentBenefactorRewards.author = Comments.author AND VOCommentBenefactorRewards.permlink = Comments.permlink
          WHERE 
            benefactor = 'steemplus-pay'
          AND created > CONVERT(datetime, '${lastEntryDate}')
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

      // Get the last entry for the second request type (Transfers : MinnowBooster or Postpromoter)
      lastEntry = await PointsDetail.find({requestType: 1}).sort({timestamp: -1}).limit(1);
      var lastEntryDate = null;
      if(lastEntry[0] !== undefined)
        lastEntryDate = lastEntry[0].timestampString;
      else
      lastEntryDate = '2018-08-03 12:05:42.000'; // This date is the steemplus point annoncement day
      // Execute SteemSQL query
      await new sql.ConnectionPool(config.config_api).connect().then(pool => {
        return pool.request()
        .query(`
          SELECT timestamp, [from], [to], amount, amount_symbol, memo 
          FROM TxTransfers 
          WHERE timestamp > CONVERT(datetime, '${lastEntryDate}') 
          AND memo LIKE 'steemplus%' 
          AND ([to] = 'minnowbooster' OR [from] = 'postpromoter');
          `)})
        .then(result => {
          var transfers = result.recordsets[0];
          updateSteemplusPointsTransfers(transfers);
          res.status(200).send("OK");
          sql.close();
        }).catch(error => {console.log(error);
      sql.close();});
    });
  });

}

// Function used to process the data from SteemSQL for requestType == 1
// @parameter transfers : transfers data received from SteemSQL
async function updateSteemplusPointsTransfers(transfers)
{
  // Number of new entry in the DB
  var nbPointDetailsAdded = 0;
  console.log(`Adding ${transfers.length} new transfer(s) to DB`);
  // Iterate on transfers
  for (const transfer of transfers) {
    // Check if user is already in DB
    var user = await User.findOne({accountName: transfer.from});
    if(user === null)
    {
      // If not, create it
      user = new User({accountName: transfer.from, nbPoints: 0});
      user = await user.save();
    }

    // Get type
    var type = 'default';
    if(transfer.to === 'minnowbooster')
      type = await TypeTransaction.findOne({name: 'MinnowBooster'});
    else if(comment.beneficiaries.includes('utopian.pay'))
      type = await TypeTransaction.findOne({name: 'PostPromoter'});

    // Get the amount of the transfer
    var amount = transfer.amount * 0.01; //Steemplus take 1% of the transaction
    // We decided that 1SPP == 0.01 SBD
    var nbPoints = amount * 100;
    // Create new PointsDetail entry
    var pointsDetail = new PointsDetail({nbPoints: nbPoints, amount: amount, amountSymbol: transfer.amount_symbol, permlink: '', user: user._id, typeTransaction: type._id, timestamp: transfer.timestamp, timestampString: utils.formatDate(transfer.timestamp), requestType: 1});
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

    // Get the amount of the transaction
    var amount = steem.formatter.vestToSteem(parseFloat(comment.reward), totalVests, totalSteem).toFixed(3);
    // Get the number of Steemplus points
    var nbPoints = amount*100.0;
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

module.exports = appRouter;
