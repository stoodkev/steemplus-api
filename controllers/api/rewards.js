const config = require("../../config");
const sql = require("mssql");

exports.getRewards = username => {
  return new sql.ConnectionPool(config.config_api)
    .connect()
    .then(pool => {
      return pool.request().input("username", username).query(`
        SELECT *
        FROM ( SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='paid_curation' FROM VOCurationRewards WHERE curator=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()
          UNION ALL
          SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout, '' as beneficiaries, type='paid_author' FROM VOAuthorRewards WHERE author=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()
          UNION ALL
          SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout as vests_payout, '' as beneficiaries, type='paid_benefactor' FROM VOCommentBenefactorRewards WHERE benefactor=@username AND timestamp >= DATEADD(day,-7, GETUTCDATE()) AND timestamp < GETUTCDATE()
          UNION ALL
          SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value,TRY_CONVERT(float,REPLACE(reward,'VESTS','')) as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vests_payout, '' as beneficiaries, type='pending_curation' FROM VOCurationRewards WHERE curator=@username AND timestamp >= DATEADD(day,0, GETUTCDATE())
          UNION ALL
          select created, author, permlink, max_accepted_payout, percent_steem_dollars, pending_payout_value,  -1 as reward, -1 as sbd_payout, -1 as steem_payout, -1 as vesting_payout, beneficiaries, 'pending_author' from Comments WHERE author = @username and pending_payout_value > 0 AND created >= DATEADD(day, -7, GETUTCDATE())
          UNION ALL
          SELECT timestamp, author, permlink, -1 as max_accepted_payout, -1 as percent_steem_dollars, -1 as pending_payout_value, -1 as reward, sbd_payout, steem_payout, vesting_payout as vests_payout, '' as beneficiaries, type='pending_benefactor' FROM VOCommentBenefactorRewards WHERE benefactor=@username AND timestamp >= DATEADD(day,0, GETUTCDATE())
        ) as rewards
        ORDER BY timestamp;
        `);
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
