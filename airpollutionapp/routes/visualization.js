/*
Server side code - The purpose of this file is to specify the backend utility functions for querying data
from mongo db documents and returning them to the client front end application
 */

let express = require('express');
let router = express.Router();
let mongoClient = require('mongodb').MongoClient;
let host = '45.113.232.133';
let port = 27017;
const url = 'mongodb://' + host + ':' + port;
const dbName = 'AirPollutionDB';
let dbCollectionList;
let airpollutionDb;

//Mongo db namespace controller for handling mongo db query functionalities
let mongoDb = {

    /**
     * The following function returns all the collections from the database
     *
     * @method
     */
    getCollections: function () {
        mongoClient.connect(url, function (err, client) {
            airpollutionDb = client.db(dbName);
            airpollutionDb.listCollections().toArray((err, collections) => {
                dbCollectionList = collections;
                return collections;
            });
        });
    },

    /**
     * The following function returns a specific collection from the database
     *
     * @method
     * @param {name} name - the name of the collection which needs to be queried from the database
     */
    returnCollection: function (name) {
        return dbCollectionList.filter(obj => {
            return obj.name === name;
        })
    },

    /**
     * The following function returns all the documents using a collection name and search parameters
     *
     * @method
     * @param {collectionName} collectionName - the collection name which needs to be queried from the database
     * @param {searchParams} searchParams - search parameters passed for filtering the collection
     * @param {res} res - the response data sent from server to the client
     */
    getDocuments: function (collectionName, searchParams, res) {
        let cursor = airpollutionDb.collection(collectionName).find({}).toArray(function (err, docs) {
            if (docs) {
                res.send(docs);
            } else {
                let error = {message: "No documents found"};
                res.send(error);
            }
        });
    },

    /**
     * The following function gets filtered documents from the collection by passing a search object for filtering
     * data
     *
     * @method
     * @param {collectionName} collectionName -  the collection name which needs to be queried from the database
     * @param {searchObject} searchObject - The search object for filtering the data from the collection queried
     */
    getFilteredDocuments: function (collectionName, searchObject) {
        return airpollutionDb.collection(collectionName).find(searchObject);
    },

    /**
     * The following function resolves and returns response on successfully querying a collection
     *
     * @method
     * @param {response} response -  the response object created which stores data from database
     * @param {res} res - The response send by the server to the front end client
     */
    resolveAndReturnResponse: function (response, res) {
        res.send(response);
    },

    /**
     * The following function creates a query map of the query parameters passed by the AJAX request call
     * from client front end application
     *
     * @method
     * @param {queryParams} queryParams -  array of query parameters received from the AJAX call
     */
    constructQueryMap: function (queryParams) {
        let map = new Map();
        queryParams.forEach(param => {
            let paramOption = param.split('=');
            let paramKey = decodeURIComponent(paramOption[0]);
            let paramValue = decodeURIComponent(paramOption[1]);
            map.set(paramKey, paramValue);
        });
        return map;
    },

    /**
     * The following function performs an aggregation operation on a collection from the database
     *
     * @method
     * @param {collectionName} collectionName -  the name of the collection queried from the database
     * @param {aggregateArray} aggregateArray - Specifies the aggregation operation to be performed on the collection
     * from the database
     */
    performAggregation: function (collectionName, aggregateArray) {
        return airpollutionDb.collection(collectionName).aggregate(aggregateArray);
    },

    /**
     * The following function returns the sorted list of documents from a collection queried
     * from the database
     *
     * @method
     * @param {collectionName} collectionName -  the collection name from which data has to be obtained
     * from the database
     * @param {searchObject} searchObject - Search object specifying search parameters for filtering data
     * @param {sortObject} sortObject - sort object specifying the sorting requirements for retrieving data
     * on the basis of selected data attributes
     */
    getSortedDocuments: function (collectionName, searchObject, sortObject) {
        return airpollutionDb.collection(collectionName).find(searchObject).sort(sortObject);
    },

    /**
     * The following function resolves multiple promises and returns data from multiple collections
     *
     * @method
     * @param {queryPromise} queryPromise -  Array of promises passed for multiple collections
     * @param {res} res - The response send by the server to the front end client application
     */
    resolveAllPromise: function (queryPromise, res) {
        let items = 0;
        let response = {};
        Promise.all(queryPromise).then(collectionValues => {
            collectionValues.forEach(collectionValue => {
                let namespace = collectionValue.ns.split(".")[1];
                collectionValue.toArray((error, docs) => {
                    if (docs) {
                        response[namespace] = docs;
                    } else {
                        let error = {message: "No documents found"};
                        res.send(error);
                    }
                    items++;
                    if (items === queryPromise.length) {
                        res.send(response);
                    }
                })
            })
        });
    }
};

//call to render front end page
router.get('/', function (req, res, next) {
    console.log('type' + req.query.type);
    if (dbCollectionList === undefined) {
        mongoDb.getCollections();
    }

    if (req.query.type === 'scats') {
        res.render('scats');
    } else {
        res.render('visualization', {type: req.query.type});
    }

});

//backend controller to handle AJAX call - return emission substance data to the client front end application
router.get('/getEmissionData', function (req, res, next) {
    let collection_object = mongoDb.returnCollection("DEESubstances");
    let collectionList = ["DEESubstances"];
    collectionList.push(collection_object);
    mongoDb.getDocuments(collection_object[0].name, collectionList, res);
});

//backend controller to handle AJAX call - return filtered emission data for selected year and
//  substance to the client front end application
router.get('/getFilteredEmissionData', function (req, res, next) {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let queryPromise = [];
    let collectionList = [];
    let year = queryMap.get("year");
    let substance = queryMap.get("substance");
    let agg = [
        {$unwind: '$emissionData'},
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
    if (year === '2015' || year === '2017') {
        let phidu_collectionName = "PHIDU" + year + "Collection";
        collectionList.push(phidu_collectionName);
    }
    let dee_collectionName = "DEEnew" + year + "Collection";
    collectionList.push(dee_collectionName);
    collectionList.forEach(collection => {
        if (collection.indexOf('DEE') !== -1) {
            queryPromise.push(mongoDb.performAggregation(collection, agg));
        } else {
            queryPromise.push(mongoDb.getFilteredDocuments(collection, {}));
        }
    });
    let response = {};
    let items = 0;
    let selector = queryMap.get("selector");
    Promise.all(queryPromise).then(collectionValues => {
        collectionValues.forEach(collectionValue => {
            let namespace = collectionValue.ns.split(".")[1];
            collectionValue.toArray((error, docs) => {
                if (docs) {
                    if (namespace.indexOf("PHIDU") !== -1) {
                        selector === "emission" ? response[namespace] = docs : response[namespace] = docs[0][selector];
                        response['visualizeMap'] = true;
                    } else {
                        response[namespace] = docs;
                    }
                } else {
                    let error = {message: "No documents found"};
                    res.send(error);
                }
                items++;
                if (items === queryPromise.length) {
                    mongoDb.resolveAndReturnResponse(response, res);
                }
            })
        })
    });
});

//backend controller to handle AJAX call - return chart visualization data for selected region and substance
// to the client front end application
router.get('/getChartVisualizationData', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let years = ['2015', '2016', '2017', '2018'];
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let region = queryMap.get("region");
    let substance = queryMap.get("substance");
    let queryPromise = [];
    let dee_agg = [
        {$unwind: '$emissionData'},
        {
            $match: {
                'emissionData.substance': substance,
                'location': region
            }
        },
        {
            $sort: {
                'emissionData.quantity_in_kg': -1
            }
        }
    ];
    years.forEach(year => {
        if (year === '2015' || year === '2017') {
            queryPromise.push(mongoDb.getFilteredDocuments("PHIDU" + year + "Collection", {}));
        }
        queryPromise.push(mongoDb.performAggregation("DEEnew" + year + "Collection", dee_agg));
    });
    mongoDb.resolveAllPromise(queryPromise, res);
});

//backend controller to handle AJAX call - return region emission data
// for selected year, region and substance to the front end application
router.get('/getRegionEmissionData', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let year = queryMap.get("year");
    let area_code = queryMap.get("region");
    let substance = queryMap.get("substance");
    let dee_collection = "DEEnew" + year + "Collection";
    let filter_criteria;
    if (substance) {
        filter_criteria = {$and: [{location: area_code}, {'emissionData.substance': substance}]};
    } else {
        filter_criteria = {location: area_code};
    }
    let queryPromise = mongoDb.getFilteredDocuments(dee_collection, filter_criteria);
    let response = {};
    queryPromise.toArray(function (err, docs) {
        if (docs) {
            response['data'] = docs;
            res.send(response);
        } else {
            let error = {message: "No documents found"};
            res.send(error);
        }
    });
});

//backend controller to handle AJAX call - return summary correlation data to the front end application
router.get('/getSummaryCorrelationData', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let years = ['2015', '2016', '2017', '2018'];
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let substance = queryMap.get("substance");
    let queryPromise = [];
    let dee_agg = [
        {$unwind: '$emissionData'},
        {
            $match: {
                'emissionData.substance': substance,
            }
        },
        {
            $sort: {
                'emissionData.quantity_in_kg': -1
            }
        }
    ];
    years.forEach(year => {
        queryPromise.push(mongoDb.performAggregation("DEEnew" + year + "Collection", dee_agg));
    });
    mongoDb.resolveAllPromise(queryPromise, res);
});

//backend controller to handle AJAX call - return Epa summary air index data to the front end application
router.get('/getEPAAirIndexData', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let year = queryMap.get("year");
    let collectionName = "EPAAirIndex" + year + "Collection";
    let filter_criteria = {dtg: year + "-01-01T11:00:00"};//Picking only 1 time to just have the emission data
    let queryPromise = mongoDb.getFilteredDocuments(collectionName, filter_criteria);
    let response = {};
    queryPromise.toArray(function (err, docs) {
        if (docs) {
            response['data'] = docs;
            res.send(response);
        } else {
            let error = {message: "No documents found"};
            res.send(error);
        }
    });
});

//backend controller to handle AJAX call - return EPA, SCATS data for the selcted year
// to the client front end application
router.get('/getChartData', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let years = ['2014', '2015', '2016', '2017', '2018'];
    let currentYr = queryMap.get("year");
    let siteId = queryMap.get("siteId");
    let queryPromise = [];

    years.forEach(year => {
        //Scats aggregated data for that region
        let collectionName = "ScatsEPA" + year + "Collection";
        let filter_criteria = {SiteId: parseInt(siteId)};//Picking only 1 time to just have the emission data
        queryPromise.push(mongoDb.getFilteredDocuments(collectionName, filter_criteria));

        //EPA Air index data for that region
        let epaAqicollectionName = "EPAAirIndex" + year + "Collection";
        let epaAqifilter_criteria = {siteId: parseInt(siteId)};//Picking only 1 time to just have the emission data
        queryPromise.push(mongoDb.getFilteredDocuments(epaAqicollectionName, epaAqifilter_criteria));
    });

    //Getting EPA data for that selected year
    let epaCollectionName = "EPA" + currentYr + "MeasurementsCollection";

    let epa_filter_criteria = {$and:[{siteId:parseInt(siteId)},
            {$or:[
                {monitorId: "CO"},
                {monitorId:"NO2"},
                {monitorId: "O3"},
                {monitorId:"BPM2.5"},
                {monitorId: "PM10"},
                {monitorId: "SO2"},
                {monitorId:"iPM2.5"},
                {monitorId:"SWS"}]}]};

    queryPromise.push(mongoDb.getFilteredDocuments(epaCollectionName, epa_filter_criteria));

    mongoDb.resolveAllPromise(queryPromise, res);
});

//backend controller to handle AJAX call - return the air quality index values for EPA stations
//for selected times
router.get('/getAQIScatsDataPerTime', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let year = queryMap.get("year");
    let time = queryMap.get("time");
    let epaAirIndexCollection = "EPAAirIndex" + year + "Collection";
    let scatsEpaCollection = "ScatsEPA" + year + "Collection";
    let filter_criteria = {dtg: time.substring(0, time.length - 5)};
    let scatsfilter_criteria = {DateTime: time};
    let sort_criteria_epa = {siteName: 1};
    let sort_criteria_Scats = {Name: 1};//Picking only 1 time to just have the emission data
    let queryPromise = [];
    queryPromise.push(mongoDb.getSortedDocuments(epaAirIndexCollection, filter_criteria, sort_criteria_epa));
    queryPromise.push(mongoDb.getSortedDocuments(scatsEpaCollection, scatsfilter_criteria, sort_criteria_Scats));
    mongoDb.resolveAllPromise(queryPromise, res);
});

//backend controller to handle AJAX call - return emission substance data for a selected year, region
// for major outdoor pollutants
router.get('/getSelectedSubstanceRegionEmission', (req, res, next) => {
    let queryParams = req.url.split('?');
    queryParams.shift();
    let queryMap = mongoDb.constructQueryMap(queryParams);
    let region = queryMap.get("region");
    let substances = ["Particulate Matter 2.5 um", "Particulate Matter 10.0 um","Carbon monoxide","Sulfur dioxide","Oxides of Nitrogen"];
    let year = queryMap.get("year");
    let queryPromise = [];
    let dee_collection = "DEEnew" + year + "Collection";
    substances.forEach(substance => {
        let dee_subs_agg = [
            {$unwind: '$emissionData'},
            {
                $match: {
                    'emissionData.substance': substance,
                    'location': region
                }
            },
            {
                $group : {
                    _id : "$emissionData.substance",
                    "Total quantity sum" : {$sum : "$emissionData.quantity_in_kg"}
                }
            }
        ];
        queryPromise.push(mongoDb.performAggregation(dee_collection,dee_subs_agg));
    });
    let items = 0;
    let response = {};
    response["DEEnew"+year+"Collection"] = [];
    Promise.all(queryPromise).then(collectionValues => {
        collectionValues.forEach(collectionValue => {
            collectionValue.toArray((error, docs) => {
                if (docs) {
                    //response[docs["_id"]] = docs;
                    response["DEEnew"+year+"Collection"].push(docs);
                } else {
                    let error = {message: "No documents found"};
                    res.send(error);
                }
                items++;
                if (items === queryPromise.length) {
                    res.send(response);
                }
            })
        })
    });
});

module.exports = router;