const config = require("../../config");
const sql = require("mssql");
const steem = require("steem");

exports.getContent = function(username) {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", username)
        .query(
          "select top 500 *\
            from (\
            select top 500 timestamp, reward_steem, reward_sbd, reward_vests, '' as amount, '' as amount_symbol, 'claim' as type, '' as memo, '' as to_from \
            from TxClaimRewardBalances where account = @username ORDER BY timestamp desc\
            union all\
            select top 500 timestamp, '', '', '',amount, amount_symbol, 'transfer_to' as type, ISNULL(REPLACE(memo, '\"', ''''), '') as memo, \"from\" as to_from from TxTransfers where [to] = @username AND type != 'transfer_to_vesting' ORDER BY timestamp desc\
            union all\
            select top 500 timestamp, '', '', '', amount, amount_symbol, 'transfer_from' as type, ISNULL(REPLACE(memo, '\"', ''''), '') as memo , \"to\" as to_from from TxTransfers where [from] = @username AND type != 'transfer_to_vesting' ORDER BY timestamp desc \
            union all \
            select top 500 timestamp, '', '', '', amount, amount_symbol, 'power_up' as type, '' as memo , '' as to_from from TxTransfers where [from] = @username AND type = 'transfer_to_vesting' ORDER BY timestamp desc \
            union all\
            select top 500 timestamp, '', '', vesting_shares, '', '', 'start_power_down' as type, '' as memo, '' as to_from from TxWithdraws where account = @username AND vesting_shares > 0 ORDER BY timestamp desc \
            union all \
            select top 500 timestamp, '', '', vesting_shares, '', '', 'stop_power_down' as type, '' as memo, '' as to_from from TxWithdraws where account = @username AND vesting_shares = 0 ORDER BY timestamp desc \
        ) as wallet_history ORDER BY timestamp desc "
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

exports.getSP = (username) => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool
        .request()
        .input("username", username)
        .query(
          `SELECT replace(vesting_shares, ' VESTS', '') as own, replace(delegated_vesting_shares, ' VESTS', '') as sent,replace(received_vesting_shares, ' VESTS', '') as received
           FROM Accounts
           WHERE name = @username;`
        );
    })
    .then(result => {
      sql.close();
      return steem.api.getDynamicGlobalPropertiesAsync()
        .then(function(values) 
        {
          totalSteem = Number(values.total_vesting_fund_steem.split(" ")[0]);
          totalVests = Number(values.total_vesting_shares.split(" ")[0]);
          return {
            own: steem.formatter.vestToSteem(parseFloat(result.recordset[0].own), totalVests, totalSteem),
            received: steem.formatter.vestToSteem(parseFloat(result.recordset[0].received), totalVests, totalSteem),
            sent: steem.formatter.vestToSteem(parseFloat(result.recordset[0].sent), totalVests, totalSteem),
            total: steem.formatter.vestToSteem(parseFloat(result.recordset[0].own) + parseFloat(result.recordset[0].received) - parseFloat(result.recordset[0].sent) , totalVests, totalSteem)
          };
        });

    })
    .catch(error => {
      console.log(error);
      sql.close();
    });
};