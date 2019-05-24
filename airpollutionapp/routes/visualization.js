let express = require('express');
let router = express.Router();
let mongoClient = require('mongodb').MongoClient;
let host = '45.113.232.133';
let port = 27017;
const url = 'mongodb://'+host+':'+port;
const dbName = 'AirPollutionDB';
let dbCollectionList;
let airpollutionDb;
let collectionMap = new Map();

var mongoDb = {
      getCollections: function() {
          mongoClient.connect(url, function (err, client) {
              airpollutionDb = client.db(dbName);
              console.log('database', airpollutionDb);
              airpollutionDb.listCollections().toArray((err, collections) => {
                  // assert.equal(err, null);
                  dbCollectionList = collections;
                  console.log("done");
                  return collections;
              });
          });
      },
      returnCollection: function(name){
          return dbCollectionList.filter(obj => {
              return obj.name === name;
          })
      },
      getDocuments: function(collectionName,searchParams,res){
          //this.getIndex("DEE",collectionName);
          let cursor = airpollutionDb.collection(collectionName).find({}).toArray(function(err, docs){
              if(docs) {
                  res.send(docs);
              }else{
                  let error = {message: "No documents found"};
                  res.send(error);
              }
          });
      },
      getFilteredDocuments: function(collectionName,searchObject){
          return airpollutionDb.collection(collectionName).find(searchObject);
      },
      getIndex: function(indexName,collectionName){
          airpollutionDb.collection(collectionName).indexes().then(indexes => {
              console.log("indexes:", indexes);
              // ...
          });

          let y =airpollutionDb.collection(collectionName).indexInformation({full:true}).then(indexes => {
              console.log("indexes:", indexes);
              // ...
          });
      },
      resolveAndReturnResponse: function(response, res){
          res.send(response);
      },
      constructQueryMap: function(queryParams){
          let map = new Map();
          queryParams.forEach(param =>{
              let paramOption =param.split('=');
              let paramKey = decodeURIComponent(paramOption[0]);
              let paramValue = decodeURIComponent(paramOption[1]);
              map.set(paramKey,paramValue);
          });
          return map;
      },
      filterClusterCollection: function(clusterData){

      }
};

//call to render front end page
router.get('/', function(req,res,next){
    console.log('type'+req.query.type);
    if(dbCollectionList === undefined) {
        mongoDb.getCollections();
    }

    if(req.query.type === 'scats') {
        res.render('scats');
    } else {
        res.render('visualization',{type: req.query.type});
    }

});

router.get('/getEmissionData',function(req,res,next){
    let collection_object = mongoDb.returnCollection("DEESubstances");
    let collectionList = ["DEESubstances"];
    collectionList.push(collection_object);
    mongoDb.getDocuments(collection_object[0].name,collectionList, res);
});

router.get('/getFilteredEmissionData', function(req,res,next){
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let queryPromise =[];
    let collectionList = [];
    let year = queryMap.get("year");
    if(year === '2015' || year === '2017'){
        let phidu_collectionName = "PHIDU"+year+"Collection";
        //let dee_clusterCollection = "Cluster"+year+"Collection";
        collectionList.push(phidu_collectionName);
        //collectionList.push(dee_clusterCollection);
    }
    let dee_collectionName = "DEE"+queryMap.get("year")+"Collection";
    collectionList.push(dee_collectionName);
    collectionList.forEach(collection=>{
        if(collection.indexOf('DEE') !== -1){
            queryPromise.push(mongoDb.getFilteredDocuments(collection, {'emissionData.substance':queryMap.get("substance")}));
        }else {
            queryPromise.push(mongoDb.getFilteredDocuments(collection, {}));
        }
    });
    let response = {};
    let items =0;
    let selector = queryMap.get("selector");
    Promise.all(queryPromise).then(collectionValues =>{
        collectionValues.forEach(collectionValue =>{
            let namespace = collectionValue.ns.split(".")[1];
            collectionValue.toArray((body, docs, error)=>{
                if (docs){
                    if(namespace.indexOf("PHIDU") !== -1) {
                        selector === "emission" ? response[namespace] = docs : response[namespace] = docs[0][selector];
                        response['visualizeMap'] = true;
                    }else{
                        response[namespace] = docs;
                    }
                }else{
                    let error = {message: "No documents found"};
                    res.send(error);
                }
                items++;
                if(items === queryPromise.length){
                    mongoDb.resolveAndReturnResponse(response,res);
                }
            })
        })
    });
});

router.get('/getMonitorData',function(req,res,next){
    let collection_object = mongoDb.returnCollection("DEESubstances");
    let collectionList = ["DEESubstances"];
    collectionList.push(collection_object);
    mongoDb.getDocuments(collection_object[0].name,collectionList, res);
});
module.exports = router;