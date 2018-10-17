# Steemplus-Api

SteemPlus is now using SteemSQL, the formidable SQL database provided by @arcange. This API intends to fetch data from SteemSQL and will be used by SteemPlus extension.

# Current routes

## API

### Witnesses

**GET /witness/[username]**

_Gets a lot of data on a witness : its rank, last mined block, missed block and much more (See result here under)_

Response body

```
{
	"lastBlockTimestamp": "2018-04-15T09:22:06.000Z",
	"rank": "81",
	"name": "stoodkev",
	"votes_count": 403,
	"created": "2018-01-24T03:55:09.000Z",
	"url": "https://steemit.com/witness-category/@stoodkev/my-witness-thread",
	"votes": "3618732607143144",
	"total_missed": 4,
	"last_aslot": "21649642",
	"last_confirmed_block_num": "21584758",
	"signing_key": "STM7wEZ2Sj1embiofddWjkRHDDA5EZfcEPmdLN7Pbc4X8afrRCX9n",
	"account_creation_fee": 0.2,
	"account_creation_fee_symbol": "STEEM",
	"maximum_block_size": 131072,
	"sbd_interest_rate": 0,
	"sbd_exchange_rate_base": 2.674,
	"sbd_exchange_rate_base_symbol": "SBD",
	"sbd_exchange_rate_quote": 1,
	"sbd_exchange_rate_quote_symbol": "STEEM",
	"last_sbd_exchange_update": "2018-04-15T11:04:45.000Z",
	"running_version": "0.19.2",
	"hardfork_version_vote": "0.0.0",
	"hardfork_time_vote": "2016-03-24T16:00:00.000Z"
}
```

**GET /witnesses-rank**

_Return witnesses rank (excluding inactive witnesses)._

Response body

```
[
  {
    "name": "gtg",
    "rank": "1"
  },
  {
    "name": "timcliff",
    "rank": "2"
  },
  {
    "name": "good-karma",
    "rank": "3"
  },
  ...
]
```

**GET /received-witness-votes/[username]**

_Get all the votes received by a witness along with a timestamp, voters Vests and Proxied Vests, for further filtering and sorting._

Response body

```
[
  {
    "timestamp": "2018-08-03T14:37:30.000Z",
    "account": "aclcrypto2",
    "totalVests": 53330.044973,
    "accountVests": 53330.044973,
    "proxiedVests": 0
  },
  {
    "timestamp": "2018-05-31T13:22:24.000Z",
    "account": "edb",
    "totalVests": 1150763.992605,
    "accountVests": 968127.455054,
    "proxiedVests": 182636.53755100002
  },
  ...
]
```

### Mentions

**GET /mentions/[username]**

_Gets mentions of @username, both from posts and comments. `Body` is truncated for a better execution speed._

Response body

```
[
  {
    "url": "/utopian-io/@steem-plus/steemplus-34--get-some-spp-for-sharing-steemplus-updates-with-your-followers",
    "created": "2018-10-17T08:09:12.000Z",
    "permlink": "steemplus-34--get-some-spp-for-sharing-steemplus-updates-with-your-followers",
    "root_title": "SteemPlus 3.4 : Get some SPP for sharing SteemPlus updates with your followers",
    "title": "SteemPlus 3.4 : Get some SPP for sharing SteemPlus updates with your followers",
    "author": "steem-plus",
    "body": "<div>\nhttps://cdn.steemitimages.com/DQmdUeahavHxrpFve3xXjTLNxkTuNeNiHxKwhBjciANZwNk/image.png\n<br>\n<br>\n\n## Reblog to earn SPP\n\nReblogging (or resteeming) a @steem-plus post will now earn you 20 SPP.\n\nThat s an easy way for you to accumulate a few ex",
    "category": "utopian-io",
    "parent_author": "",
    "total_payout_value": 0,
    "pending_payout_value": 3.535,
    "net_votes": 30,
    "json_metadata": "{\"tags\":[\"utopian-io\",\"development\",\"dev\",\"steemdev\",\"news\"],\"app\":\"steem-plus-app\"}"
  },
  ...
]
```

### Delegations

**GET /delegators/[username]**

_Gets incoming delegations for @username. It returns a timestamp, the names of delegators, and the number of Vests being delegated._

Response body

```
[
  {
    "delegator": "stoodkev",
    "vesting_shares": 25250233.8828,
    "delegation_date": "2018-10-02T09:00:57.000Z"
  },
  ...
]
```

### Wallet

**GET /wallet/[username]**

_Gets the 500 last items from @username's wallet, including incoming and outgoing transfers and claimed rewards._

Response body

```
[
  {
    "timestamp": "2018-10-17T07:47:03.000Z",
    "reward_steem": 0,
    "reward_sbd": 0.062,
    "reward_vests": 9517.2273,
    "amount": 0,
    "amount_symbol": "",
    "type": "claim",
    "memo": "",
    "to_from": ""
  },
  ...
]
```

Possible values :

- type : claim, transfer_to, transfer_from, power_up...
- amount_symbol : STEEM, SBD

### Rewards

**GET /rewards/[username]**

_Returns all curation rewards, author rewards and benefactor rewards for a given user._

Response body

```
 [
  {
    "timestamp": "2018-10-10T11:03:27.000Z",
    "author": "mmunited",
    "permlink": "myentryforpatitforwardcurationcontest-week26-dwbqn9a16m",
    "max_accepted_payout": -1,
    "percent_steem_dollars": -1,
    "pending_payout_value": -1,
    "reward": 440.177462,
    "sbd_payout": -1,
    "steem_payout": -1,
    "vests_payout": -1,
    "beneficiaries": "",
    "type": "paid_curation"
  },
  ...
]
```

Possible values :

- type : paid_curation, paid_benefactor, pending_author, paid_author

### Followers

**GET /follow/[username]**

_Returns all followers / followee for a given user._

Response body

```
 [
  {
    "follower": "cedricguillas",
    "following": "steem-plus"
  },
  {
    "follower": "steem-plus",
    "following": "stoodkev"
  },
  ...
]
```

_This response is for username = steem-plus. @cedricguillas follows @steem-plus and @steem-plus follows @stoodkev_
Possible values :

- type : paid_curation, paid_benefactor, pending_author, paid_author

### Block

**GET /last-block**

_Return the id of the last block present in SteemSQL._

Response body

```
[
  {
    "block_num": 26884751
  }
]
```

### Reblog

**GET /reblogs/[author]/[permlink]**

_Return the name of all the users who reblogged the post in parameter.
The post is selected by {permlink, author} because permlink can be the same for different authors._

Response body

```
[
  {
    "account": "cedricguillas"
  },
  ...
]
```

### SteemPlus Points

**GET /spp/[username]**

_Return the number of points of an account and other information as the detail of every entry of SteemPlus Point._

Response body

```
[
  {
    "accountName": "cedricguillas",
    "nbPoints": 102.13434942273247,
    "pointsDetails": [
      {
        "nbPoints": 0.55,
        "amount": 0.0055000000000000005,
        "amountSymbol": "SBD",
        "permlink": "https://steemit.com/steemplus/@steem-plus/steemplus-points--wallet-sneak-peek",
        "typeTransaction": {
          "name": "MinnowBooster"
        },
        "timestamp": "2018-09-11T12:50:54.000Z",
        "timestampString": "2018-9-11 12:50:54.0",
        "requestType": 2
      },
      ...
    ]
  }
]
```

## Stats

### General Statistics

**GET /spp-stats**

_Function used to get statistics about SPP : total amount delivered, total per user, total per categories._

Response body

```
{
  "points_per_user": [
    {
      "points": "32178.611",
      "name": "stoodkev"
    },
    ...
  ],
  "points_per_transaction": [
    {
      "points": "30386.435",
      "type": "Purchase"
    },
    ...
  ],
  "total_points": "99639.043"
}
```

# How to run your own version of this API?

- Make sure you have MongoDB installed
- Subscribe to SteemSQL (10 SBD/month)
- Clone this repository
- `npm install`
- Set the environment variables (information received by transfer when you subscribe to SteemSQL). These environment variables are `LOGIN`, `PASSWORD`, `SQL_API` and `DB`.
- `npm start` or `nodemon ./app.js`
- You should be able to test it on `localhost:3000`
