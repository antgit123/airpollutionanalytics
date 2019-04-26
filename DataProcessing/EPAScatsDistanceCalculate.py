import json
import getDistance
import ProcessingScatsFromDir
from pyspark import SparkContext
from pyspark import SQLContext

sc = SparkContext()
sqlContext = SQLContext(sc)

traffic_lights_filepath = "E:/StudyNotes/Semester4/Project/data/tlights_vic_4326.csv"
newCsvPath = "E:/StudyNotes/Semester4/Project/data/"

trafficfile = sqlContext.read.csv(traffic_lights_filepath, header=True)
coordinateList = trafficfile.select("WKT", "SITE_NO", "SITE_NAME").collect()
finalList = []
for x in coordinateList:
    newList = x["WKT"].split()
    if len(newList) == 3:
        lon = newList[1]
        lon = lon[1:]
        lat = newList[2]
        lat = lat[:-1]
        tempList = (x["SITE_NO"], x["SITE_NAME"], lat, lon)
        # Remove duplicate scats site ids (Some sites has 2 points for the same id eg:site_no  5877:
        if not any(x["SITE_NO"] in row for row in finalList):
            finalList.append(tempList)

f = open("E:/StudyNotes/Semester4/Project/data/stationData.json", "r")
datastore = json.load(f)

distanceDataList = []
for data in datastore:
    for trafficData in finalList:
        try:
            dist = getDistance.calculateDistance(data['Latitude'], data['Longitude'], float(trafficData[2]), float(trafficData[3]))
            if dist <= 2.0:
                otherList = (data['SiteId'], data['Name'], data['Latitude'], data['Longitude'],
                             trafficData[0], trafficData[1], trafficData[2], trafficData[3])

                if not any(otherList[5] in row for row in distanceDataList):
                    distanceDataList.append(otherList)

        except ValueError:
            continue

rdd = sc.parallelize(distanceDataList)
filteredTrafficLightsDf = sqlContext.createDataFrame(rdd, ["EPA_SITE_ID", "EPA_SITE_NAME", "EPA_LATITUDE", "EPA_LONGITUDE",
                                      "SCAT_SITE_ID", "SCAT_SITE_NAME", "SCAT_LATITUDE", "SCAT_LONGITUDE"])

filteredTrafficLightsDf.coalesce(1).write.format("com.databricks.spark.csv").option("header", "true").mode('append') \
        .save("E:/StudyNotes/Semester4/Project/data/finalfilteredData")

ProcessingScatsFromDir.processScatsFiles(sqlContext, filteredTrafficLightsDf)