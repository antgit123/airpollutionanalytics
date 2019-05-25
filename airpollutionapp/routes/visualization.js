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

let mongoDb = {
      getCollections: function() {
          mongoClient.connect(url, function (err, client) {
              airpollutionDb = client.db(dbName);
              airpollutionDb.listCollections().toArray((err, collections) => {
                  dbCollectionList = collections;
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
      performAggregation: function(collectionName, aggregateArray){
          return airpollutionDb.collection(collectionName).aggregate(aggregateArray);
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
    let substance = queryMap.get("substance");
    let agg =  [
        { $unwind: '$emissionData' },
        {
            $match: {
                'emissionData.substance': substance
            }
        },
        {
            $sort: {
                'emissionData.quantity_in_kg': -1
            }
        }
    ];
    if(year === '2015' || year === '2017'){
        let phidu_collectionName = "PHIDU"+year+"Collection";
        collectionList.push(phidu_collectionName);
    }
    let dee_collectionName = "DEE"+year+"Collection";
    collectionList.push(dee_collectionName);
    collectionList.forEach(collection=>{
        if(collection.indexOf('DEE') !== -1){
            //queryPromise.push(mongoDb.getFilteredDocuments(collection, {'emissionData.substance':queryMap.get("substance")}));
            queryPromise.push(mongoDb.performAggregation(collection,agg));
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
            collectionValue.toArray((error, docs)=>{
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

router.get('/getSortedBusinessList', (req,res,next)=>{
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let year = queryMap.get("year");
    let substance = queryMap.get("substance");
    let dee_collection = "DEE"+year+"Collection";
    let response ={};
    let agg =  [
        { $unwind: '$emissionData' },
        {
            $match: {
                'emissionData.substance': substance
            }
        },
        {
            $sort: {
                'emissionData.quantity_in_kg': -1
            }
        }
    ];

    let mongoPromise = mongoDb.performAggregation(dee_collection,agg);
    mongoPromise.toArray((error,docs) =>{
        if(docs){
            response['data'] = docs;
            res.send(response);
        }
    })
});

router.get('/getRegionEmissionData', (req,res,next)=>{
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let year = queryMap.get("year");
    let area_code = queryMap.get("region");
    let substance = queryMap.get("substance");
    let dee_collection = "DEE"+year+"Collection";
    let filter_criteria;
    if(substance) {
        filter_criteria = {$and: [{location: area_code}, {'emissionData.substance': substance}]};
    }else{
        filter_criteria = {location: area_code};
    }
    let queryPromise = mongoDb.getFilteredDocuments(dee_collection,filter_criteria);
    let response = {};
    queryPromise.toArray(function(err, docs){
        if(docs) {
            response['data'] = docs;
            res.send(response);
        }else{
            let error = {message: "No documents found"};
            res.send(error);
        }
    });
});

router.get('/getMonitorData',function(req,res,next){
    let collection_object = mongoDb.returnCollection("DEESubstances");
    let collectionList = ["DEESubstances"];
    collectionList.push(collection_object);
    mongoDb.getDocuments(collection_object[0].name,collectionList, res);
});
module.exports = router;