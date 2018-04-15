# Steemplus-Api

SteemPlus is now using SteemSQL, the formidable SQL database provided by @arcange. This API intends to fetch data from SteemSQL and will be used by SteemPlus extension.

# Current routes

- `/api/get-witness/[username]` : Gets a lot of data on a witness : its rank, last mined block, missed block and much more (See result hereunder)
 
~~~~
{"lastBlockTimestamp":"2018-04-15T09:22:06.000Z","rank":"81","name":"stoodkev","votes_count":403,"created":"2018-01-24T03:55:09.000Z","url":"https://steemit.com/witness-category/@stoodkev/my-witness-thread","votes":"3618732607143144","total_missed":4,"last_aslot":"21649642","last_confirmed_block_num":"21584758","signing_key":"STM7wEZ2Sj1embiofddWjkRHDDA5EZfcEPmdLN7Pbc4X8afrRCX9n","account_creation_fee":0.2,"account_creation_fee_symbol":"STEEM","maximum_block_size":131072,"sbd_interest_rate":0,"sbd_exchange_rate_base":2.674,"sbd_exchange_rate_base_symbol":"SBD","sbd_exchange_rate_quote":1,"sbd_exchange_rate_quote_symbol":"STEEM","last_sbd_exchange_update":"2018-04-15T11:04:45.000Z","running_version":"0.19.2","hardfork_version_vote":"0.0.0","hardfork_time_vote":"2016-03-24T16:00:00.000Z"}
~~~~

- `/api/get-mentions/[username]` : Gets mentions of @username, both from posts and comments. `Body` is truncated for a better execution speed.

# How to run your own version of this API?

- Subscribe to SteemSQL (10 SBD/month)
- Clone this repository
- `npm install`
- Set the environment variables (information received by transfer when you subscribe to SteemSQL). These environment variables are `LOGIN`, `PASSWORD`, `SQL_API` and `DB`.
- `npm run start`
- You should be able to test it on `localhost:3000`.
