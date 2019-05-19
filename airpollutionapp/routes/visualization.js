var express = require('express');
var router = express.Router();
var mongoClient = require('mongodb').MongoClient;
var host = '45.113.232.133';
var port = 27017;
const url = 'mongodb://'+host+':'+port;
const dbName = 'AirPollutionDB';
var DEE2015Collection;
var dbCollectionList;
let airpollutionDb;

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
          let cursor = airpollutionDb.collection(collectionName).find({}).toArray(function(err, docs){
              if(docs) {
                  res.send(docs);
              }else{
                  let error = {message: "No documents found"};
                  res.send(error);
              }
          });
      },
      getIndex: function(indexName){

      }
};

//call to render front end page
router.get('/', function(req,res,next){
    console.log('type'+req.query.type);
    if(dbCollectionList === undefined) {
        mongoDb.getCollections();
    }
    res.render('visualization',{type: req.query.type});
});

router.get('/getEmissionData',function(req,res,next){
    let collection_object = mongoDb.returnCollection("PHIDU2016Collection");

    let collectionList = [];
    collectionList.push(collection_object);
    mongoDb.getDocuments(collection_object[0].name,collectionList, res);
});

module.exports = router;