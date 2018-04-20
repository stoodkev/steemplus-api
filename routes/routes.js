let config=require("../config");
let sql=require("mssql");


var appRouter = function (app) {

  app.get("/", function(req, res) {
    res.status(200).send("Welcome to our restful API!");
  });

  app.get("/api/get-mentions/:username", function(req, res){
    console.log(config.config_api);
    sql.connect(config.config_api).then(pool => {
      console.log("connected");
      return pool.request()
      .input("username","@"+req.params.username)
      .query('SELECT TOP 100 created, permlink, title, author, LEFT(body,250) AS body,category, parent_author\
      FROM Comments (NOLOCK)\
      WHERE CONTAINS(body, @username)\
      ORDER BY created DESC\
      ')
    }).then(result => {
      res.status(200).send(result.recordsets[0]);
      sql.close();
    }).catch(error => {console.log(error);
      sql.close();});
});

app.get("/api/get-witness/:username", function(req, res){
  console.log(config.config_api);
  sql.connect(config.config_api).then(pool => {
    console.log("connected");
    return pool.request()
    .input("username",req.params.username)
    .query('SELECT lastWeekValue, lastMonthValue, lastYearValue, foreverValue, timestamp, Witnesses.* \
FROM (SELECT SUM(vesting_shares) as lastWeekValue FROM VOProducerRewards (NOLOCK) WHERE producer = @username AND timestamp >= DATEADD(day,-7, GETDATE())) as lastWeekTable, \
(SELECT SUM(vesting_shares) as lastMonthValue FROM VOProducerRewards (NOLOCK) WHERE producer = @username AND timestamp >= DATEADD(day,-31, GETDATE())) as lastMonthTable, \
(SELECT SUM(vesting_shares) as lastYearValue FROM VOProducerRewards (NOLOCK) WHERE producer = @username AND timestamp >= DATEADD(day,-365, GETDATE())) as lastYearTable, \
(SELECT SUM(vesting_shares) as ForeverValue FROM VOProducerRewards (NOLOCK) WHERE producer = @username ) as foreverTable, Witnesses (NOLOCK)\
LEFT JOIN Blocks ON Witnesses.last_confirmed_block_num = Blocks.block_num \
WHERE Witnesses.name = @username')
  }).then(result => {
    res.status(200).send(result.recordsets[0][0]);
    sql.close();
  }).catch(error => {console.log(error);
  sql.close();});
});

app.get("/api/get-witnesses-rank", function(req, res){
  console.log(config.config_api);
  sql.connect(config.config_api).then(pool => {
    console.log("connected");
    return pool.request()
    .query('Select Witnesses.name, rank\
  from Witnesses (NOLOCK)\
  LEFT JOIN (SELECT ROW_NUMBER() OVER (ORDER BY (SELECT votes) DESC) AS rank, * FROM Witnesses (NOLOCK) WHERE signing_key != \'STM1111111111111111111111111111111114T1Anm\') AS rankedTable ON Witnesses.name = rankedTable.name;')
  }).then(result => {
    res.status(200).send(result.recordsets[0]);
    sql.close();
  }).catch(error => {console.log(error);
  sql.close();});
});

app.get("/api/get-received-witness-votes/:username", function(req, res){
  console.log(config.config_api);
  sql.connect(config.config_api).then(pool => {
    console.log("connected");
    return pool.request()
    .input("username2","%"+req.params.username+"%")
    .input("username",req.params.username)
    .query("SELECT MyAccounts.timestamp,MyAccounts.account,(ISNULL(TRY_CONVERT(float,REPLACE(value_proxy,'VESTS','')),0)+TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS','')))as totalVests,TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS',''))as accountVests,ISNULL(TRY_CONVERT(float,REPLACE(value_proxy,'VESTS','')),0)as proxiedVests FROM(SELECT B.*,A.vesting_shares FROM Accounts A(NOLOCK),(select*from TxAccountWitnessVotes(NOLOCK)where ID in(select MAX(ID)as last from TxAccountWitnessVotes(NOLOCK)where witness=@username group by account)and approve='true')as B where B.account=A.name)as MyAccounts LEFT JOIN(SELECT proxy as name,SUM(TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS','')))as value_proxy FROM Accounts(NOLOCK)WHERE proxy IN(SELECT name FROM Accounts(NOLOCK)WHERE witness_votes LIKE @username2)GROUP BY(proxy))as proxy_table ON MyAccounts.account=proxy_table.name")})
    .then(result => {
    res.status(200).send(result.recordsets[0]);
    sql.close();
  }).catch(error => {console.log(error);
  sql.close();});
});

}

module.exports = appRouter;
