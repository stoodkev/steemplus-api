const config = require("../../config");
const sql = require("mssql");

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
