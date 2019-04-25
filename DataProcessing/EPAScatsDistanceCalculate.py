import json
import getDistance
from pyspark import SparkContext
from pyspark import SQLContext

sc = SparkContext()
sqlContext = SQLContext(sc)

traffic_lights_filepath = "D:/UniMelb/sem4/Project/tlights_vic_4326.csv"
newCsvPath = "D:/UniMelb/sem4/Project/"

trafficfile = sqlContext.read.csv(traffic_lights_filepath, header=True)
coordinateList = trafficfile.select("WKT").collect()
finalList = []

x = "POINT (144.958468860020332 -37.804039378919015)"

for x in coordinateList:
    newList = x[0].split()
    if len(newList) == 3:
        lon = newList[1]
        lon = lon[1:]
        lat = newList[2]
        lat = lat[:-1]
        tempList = [lat, lon]
        finalList.append(tempList)
    # else:
    #     print(x[0])

f = open("D:/UniMelb/sem4/Project/stationData.json", "r")
datastore = json.load(f)

distanceDataList = []
for data in datastore:
    for trafficData in finalList:
        try:
            if isinstance(float(trafficData[0]), float) and isinstance(float(trafficData[1]), float):
                dist = getDistance.calculateDistance(data['Latitude'], data['Longitude'], float(trafficData[0]), float(trafficData[1]))
                if dist <= 2.0:
                    otherList = [data['Name'], data['SiteId'], data['Latitude'], data['Longitude'], trafficData[0], trafficData[1]]
                    distanceDataList.append(otherList)
        except ValueError:
            continue

for t in distanceDataList:
    print(t)
