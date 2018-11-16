const config = require("../../config");
const sql = require("mssql");

exports.getIncoming = username => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", username)
        .query(
          `SELECT delegator, vesting_shares, timestamp as delegation_date 
            FROM TxDelegateVestingShares 
            INNER JOIN ( 
              SELECT MAX(ID) as last_delegation_id 
              FROM TxDelegateVestingShares 
              WHERE delegatee = @username 
              GROUP BY delegator 
            ) AS Data ON TxDelegateVestingShares.ID = Data.last_delegation_id`
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

exports.getIncomingRanking = username => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", username)
        .query(
          `SELECT delegator, vesting_shares
            FROM TxDelegateVestingShares 
            INNER JOIN ( 
              SELECT MAX(ID) as last_delegation_id 
              FROM TxDelegateVestingShares 
              WHERE delegatee = @username
              AND (delegator != 'steem-plus' AND delegator != 'stoodkev' AND delegator != 'steemplus-pay' AND delegator != 'steemplus-bot') 
              AND vesting_shares > 0
              GROUP BY delegator 
            ) AS Data ON TxDelegateVestingShares.ID = Data.last_delegation_id`
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