app.get("/job/spp_stats/:key", async function(req, res){
  let result={};
  if(req.params.key==config.key){
    const points_per_user =
    [
        {
            "$group":{
                "_id" :"$accountName",
                "points": {
                    "$sum": "$nbPoints"
                }
            }
        },
        {
          "$sort": { "points": -1 }
        }
    ];
    let ppu=await User.aggregate(points_per_user)
          .exec();
    ppu = ppu.map(function(doc) {
          doc.name = doc._id;
          doc._id = doc.origId;
          doc.points=doc.points.toFixed(3);
          delete doc._id;
          return  doc;
      });
      console.log(ppu);
    result.points_per_user=ppu;
    const points_per_transaction =
    [
        {
            "$group":{
                "_id" : "$typeTransaction",
                "points": {
                    "$sum": "$nbPoints"
                }
            }
        },
        {
          "$sort": { "points": -1 }
        }
    ];
    let ppt=await PointsDetail.aggregate(points_per_transaction)
          .exec();
          ppt =  ppt.map(async function(doc) {
                let a = await TypeTransaction.findById(doc._id).exec();
                doc.type=a.name;
                doc.points=doc.points.toFixed(3);
                delete doc._id;
                return  doc;
            });
    ppt=await Promise.all(ppt);
    console.log(ppt);

    result.points_per_transaction=ppt;
    const total=ppt.reduce(function(a,b){return a+b;});
    result.total_points=total;
    res.send(result);
  }
});
