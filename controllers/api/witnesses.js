const config = require("../../config");
const sql = require("mssql");

exports.getWitness = function(username) {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", username)
        .query(
          "SELECT lastWeekValue, lastMonthValue, lastYearValue, foreverValue, timestamp, Witnesses.* \
          FROM (SELECT SUM(vesting_shares) as lastWeekValue FROM VOProducerRewards WHERE producer = @username AND timestamp >= DATEADD(day,-7, GETUTCDATE())) as lastWeekTable, \
          (SELECT SUM(vesting_shares) as lastMonthValue FROM VOProducerRewards WHERE producer = @username AND timestamp >= DATEADD(day,-31, GETUTCDATE())) as lastMonthTable, \
          (SELECT SUM(vesting_shares) as lastYearValue FROM VOProducerRewards WHERE producer = @username AND timestamp >= DATEADD(day,-365, GETUTCDATE())) as lastYearTable, \
          (SELECT SUM(vesting_shares) as ForeverValue FROM VOProducerRewards WHERE producer = @username ) as foreverTable, Witnesses \
          LEFT JOIN Blocks ON Witnesses.last_confirmed_block_num = Blocks.block_num \
          WHERE Witnesses.name = @username"
        );
    })
    .then(result => {
      sql.close();
      return result.recordsets[0][0];
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};

exports.getWitnessesRank = function() {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool.request().query(
        `SELECT Witnesses.name, rank
          FROM Witnesses
          RIGHT JOIN (SELECT ROW_NUMBER() OVER (ORDER BY (SELECT votes) DESC) AS rank, * FROM Witnesses WHERE signing_key != 'STM1111111111111111111111111111111114T1Anm') AS rankedTable 
          ON Witnesses.name = rankedTable.name
          ORDER BY rank;`
      );
    })
    .then(result => {
      sql.close();
      return result.recordsets[0];
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};

exports.getReceivedVotes = function(username) {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      console.log("connected");
      return pool
        .request()
        .input("username", username)
        .query(
          "WITH proxySelect AS ( SELECT t.*, ROW_NUMBER() OVER (PARTITION BY account ORDER BY timestamp DESC) AS rn FROM TxAccountWitnessProxies AS t ) SELECT MyAccounts.timestamp, MyAccounts.account, (ISNULL(total_proxied,0) + TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS',''))) as totalVests, TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS','')) as accountVests, ISNULL(total_proxied,0) as proxiedVests FROM (SELECT B.timestamp, B.account,A.vesting_shares FROM Accounts A, (select timestamp, account from TxAccountWitnessVotes where ID IN (select MAX(ID)as last from TxAccountWitnessVotes where witness=@username group by account) and approve=1)as B where B.account=A.name)as MyAccounts LEFT JOIN (SELECT SUM(TRY_CONVERT(float,REPLACE(vesting_shares,'VESTS',''))) as total_proxied, pr.proxy FROM proxySelect pr INNER JOIN Accounts ON pr.account=name WHERE rn = 1 GROUP BY pr.proxy) pr2 ON pr2.proxy=MyAccounts.account;"
        );
    })
    .then(result => {
      sql.close();
      return result.recordsets[0];
    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};
