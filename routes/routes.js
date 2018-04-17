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
      .query('SELECT TOP 10 created, permlink, title, author, LEFT(body,250) AS body,category, parent_author\
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
    .query('SELECT timestamp, Witnesses.* \
    FROM Witnesses (NOLOCK) \
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
    .input("username","%"+req.params.username+"%")
    .query("SELECT Accounts.name, (ISNULL(TRY_CONVERT(float, REPLACE(value_proxy, 'VESTS', '')), 0) + TRY_CONVERT(float, REPLACE(vesting_shares, 'VESTS', ''))) as totalVests, TRY_CONVERT(float, REPLACE(vesting_shares, 'VESTS', '')) as accountVests, ISNULL(TRY_CONVERT(float, REPLACE(value_proxy, 'VESTS', '')), 0) as proxiedVests FROM Accounts (NOLOCK) LEFT JOIN (SELECT proxy as name, SUM(TRY_CONVERT(float, REPLACE(vesting_shares, 'VESTS', ''))) as value_proxy FROM Accounts (NOLOCK) WHERE proxy IN (SELECT name FROM Accounts (NOLOCK) WHERE witness_votes LIKE @username) GROUP BY(proxy)) as proxy_table ON Accounts.name = proxy_table.name WHERE witness_votes LIKE @username")})
    .then(result => {
    res.status(200).send(result.recordsets[0]);
    sql.close();
  }).catch(error => {console.log(error);
  sql.close();});
});

}

module.exports = appRouter;
