from DataProcessing import GetDistance

# function to get SCATS points which are within 2 kms of EPA station
def filterScatsDataWithinEPA(sc, sqlContext, trafficLightDataPath, EPAStationDataPath):

    datastore = sqlContext.read.json(EPAStationDataPath)
    trafficfile = sqlContext.read.csv(trafficLightDataPath, header=True).collect()
    finalList = []
    for x in trafficfile:
        newList = x["WKT"].split()
        if len(newList) == 3:
            lon = newList[1]
            lon = lon[1:]
            lat = newList[2]
            lat = lat[:-1]
            tempList = (x["SITE_NO"], x["SITE_NAME"], lat, lon, x["WKT"])
            # Remove duplicate scats site ids (Some sites has 2 points for the same id eg:site_no  5877:
            if not any(x["SITE_NO"] in row for row in finalList):
                finalList.append(tempList)

    distanceDictionary = {}
    otherList = {}

    for trafficData in finalList:
        for data in datastore.rdd.collect():
            try:
                # check the distance between coordinates of EPA station and SCATS site
                dist = GetDistance.calculateDistance(float(data['Latitude']), float(data['Longitude']),
                                                     float(trafficData[2]), float(trafficData[3]))
                if dist <= 2.0:
                    # add the site if distance is less than 2 and not already added
                    if trafficData[0] not in distanceDictionary.keys():
                        distanceDictionary[trafficData[0]] = dist
                        otherList[trafficData[0]] = (trafficData[0], trafficData[1], trafficData[4], data['SiteId'], data['Name'])
                    else:
                        if distanceDictionary.get(trafficData[0]) > dist:
                            distanceDictionary[trafficData[0]] = dist
                            otherList[trafficData[0]] = (trafficData[0], trafficData[1], trafficData[4], data['SiteId'], data['Name'])
            except ValueError:
                continue


    rdd = sc.parallelize(otherList.values())
    df = sqlContext.createDataFrame(rdd, ["SCAT_SITE_ID", "SCAT_SITE_NAME", "WKT", "EPA_SITE_ID", "EPA_SITE_NAME"])
    return df