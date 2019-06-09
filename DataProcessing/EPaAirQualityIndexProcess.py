import requests
from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
import sys

# web service links to get the monitors, EPA station details and measurements of monitors in all stations
air_quality_monitors_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?"
air_quality_measurements_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Measurements?"
air_quality_station_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/StationData?"

conf = SparkConf().setAppName("EpaProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)
sc = SparkContext(conf=conf)
sc.setCheckpointDir("hdfs://45.113.232.133:9000/Checkpoint")
sqlContext = SQLContext(sc)
sqlContext.setConf('spark.sql.shuffle.partitions', '10')
startdate = sys.argv[1]
enddate = sys.argv[2]
year = sys.argv[3]
epa_output_hdfs_path = "hdfs://45.113.232.133:9000/EPA"+year

# function to get air quality monitors for yearly time period
# returns a dictionary of monitors with their sites
def getAirQualityMonitors(fromDate,toDate):
    query = air_quality_monitors_query+'&fromDate='+fromDate+'&toDate='+toDate
    air_monitor_allsites_data = requests.get(query).json()
    air_quality_monitor_rdd = sc.parallelize(air_monitor_allsites_data['Monitors'])
    air_quality_site_map = air_quality_monitor_rdd.map(lambda x: [x['MonitorId'],{'site':x['SiteId'],'name':x['ShortName'],'uom':x['UnitOfMeasure']}])
    air_quality_site_group = air_quality_site_map.groupByKey().map(lambda x: (x[0],list(x[1])))
    airDataDict = {'airData':air_monitor_allsites_data['Monitors'],'airQualitySites':air_quality_site_group}
    return airDataDict

# functions to get the station details for the given siteId
# returns the details of a particular EPA air monitoring site
def getStationName(siteId):
    query = air_quality_station_query + 'pointId='+str(siteId)
    station_data = requests.get(query).json()
    return station_data

# function to get the measurements for the given site for the given monitor
def getAirQualityAggregateMeasurements(fromDate,toDate,year,typeOfMeasurement,monitorId,siteId,stationName, result):
    today = year+'-01-01T'
    airMeasurementDf = 0
    query = air_quality_measurements_query+'siteId='+str(siteId)+'&monitorId='+monitorId+'&timebasisid='+typeOfMeasurement+'&fromDate='+fromDate+'&toDate='+toDate
    airMeasurementData = requests.get(query).json()
    airMeasurementData_rdd = sc.parallelize(airMeasurementData['Measurements'])
    airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (today+ x['DateTimeStart'][-8:],
                                float(x['AQIIndex']),x['DateTimeStart'], x['Latitude'], x['Longitude'], siteId, stationName))
    airMeasurementList = airMeasurementBySiteTime.collect()

    # creating a dataframe of all sites with all monitor values
    if len(airMeasurementList) > 0:
        airMeasurementDf = sqlContext.createDataFrame(airMeasurementList, ['time', 'aqiIndex', 'date', 'latitude', 'longitude', 'siteId', 'stationName'])
        if result == 0:
            result = airMeasurementDf
        else:
            result = result.union(airMeasurementDf)
    result = result.checkpoint(eager=True)
    return result

airQualityMonitorDictionary= getAirQualityMonitors('20150101','20190101')
airQualityMeasurementData = []
airQualityWindData = []
perDayMeasurement = False
typeOfMeasurement = ''
if perDayMeasurement:
    typeOfMeasurement = '24HR_AV'
else:
    typeOfMeasurement = '1HR_AV'

wind_indicators = ['SWS','VWD','VWS']
other_indicators = ['DBT']

final_Measurement_Result = {}
final_Wind_Result={}
final_Measurement_Result['Features']= []
final_Wind_Result['Features'] = []

stationName = ""
stationData = ""
aggregatedDataframe = 0
for airIndicatorRecord in airQualityMonitorDictionary['airQualitySites'].collect():
    monitorId = airIndicatorRecord[0]
    for sites in airIndicatorRecord[1]:
        stationData = getStationName(sites['site'])
        try:
            if stationData is not None:
                stationName = stationData['Station']
        except TypeError:
            print()
        if monitorId not in wind_indicators:
            aggregatedDataframe = getAirQualityAggregateMeasurements(startdate, enddate, year, typeOfMeasurement, monitorId,sites['site'], stationName, aggregatedDataframe)

# the maximum value of monitor will be used as the AQI for that site
aggMaxDf = aggregatedDataframe.groupBy('date', 'latitude', 'longitude', 'siteId', 'stationName', 'time').max('aqiIndex')
aggMaxDf = aggMaxDf.checkpoint(eager=True)

# averaging the AQI per site per hour
finalDf = aggMaxDf.groupBy('time', 'latitude', 'longitude', 'siteId', 'stationName').avg('max(aqiIndex)')
finalDf = finalDf.checkpoint(eager=True)
airQualityDF = finalDf.toDF('dtg', 'latitude', 'longitude', 'siteId', 'siteName', 'agiIndex')

# saving the processed dataframe as CSV file in hadoop
airQualityDF.coalesce(1).write.format("com.databricks.spark.csv").mode("overwrite").option("header", "true").save(epa_output_hdfs_path)
