import requests
from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
import json
import sys

get_sites_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/sites"
get_sites_monitor_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Sites?monitoringPurpose=1010"
air_quality_monitors_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?"
air_quality_monitors_site_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?siteId=10107&fromDate=20160101&toDate=20170101"
air_quality_measurements_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Measurements?"
air_quality_station_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/StationData?"
epa_ubuntu_output_path = "/mnt/epa_geomesa/"
epa_output_hdfs_path = "hdfs://45.113.232.133:9000/EPA2018"

conf = SparkConf().setAppName("EpaProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)
sc = SparkContext()
# sc.setCheckpointDir("hdfs://45.113.232.133:9000/Checkpoint")
sqlContext = SQLContext(sc)
sqlContext.setConf('spark.sql.shuffle.partitions', '10')

#function to get sites data default time period
def obtainSitesData(query):
    sites_requestData = requests.get(query).json()
    return sites_requestData['Sites']

#function to get sites data for specified time period
def obtainSitesDataPeriod(fromDate,toDate):
    query = get_sites_monitor_query+'&fromDate='+fromDate+'&toDate='+toDate
    sites_period_data = requests.get(query).json()
    sites_period_list = sites_period_data['Sites']
    # for site in sites_period_list:
    #     site['Wkt_point'] = str(geometry.Point(site['Latitude'], site['Longitude']))
    return sites_period_list

#function to get air quality measurements for all sites, indicators categorized by time
def getAirQualityMeasurements(fromDate,toDate,typeOfMeasurement,monitorId,siteId):
    query= air_quality_measurements_query+'siteId='+str(siteId)+'&monitorId='+monitorId+'&timebasisid='+typeOfMeasurement+'&fromDate='+fromDate+'&toDate='+toDate
    airMeasurementData= requests.get(query).json()
    airMeasurementData_rdd = sc.parallelize(airMeasurementData['Measurements'])

    # airMeasurementsByTime = airMeasurementData_rdd.map(lambda x: [x['DateTimeStart'],{'AQI':x['AQIIndex'],'Description':x['AQICategoryDescription'],'Location':(x['Latitude'],x['Longitude'])}])
    if monitorId == 'BPM2.5' and typeOfMeasurement == '24HR_AV':
        airMeasurementsByTime = airMeasurementData_rdd.map(
            lambda x: [x['DateTimeStart'], {'AQI': x['AQIIndex'], 'Description': x['AQICategoryDescription'],
                                            'Category': x['AQICategoryAbbreviation'],
                                            'BackgroundColor': x['AQIBackgroundColour'],
                                            'HealthLevel': x['HealthCategoryLevel'],
                                            'HealthDescription': x['HealthCategoryDescription'],
                                            'HealthMessage':x['HealthCategoryMessage'],
                                            'ForegroundColor': x['AQIForegroundColour'],
                                            'Location_Lat': x['Latitude'], 'Location_Long': x['Longitude']}])
    else:
        airMeasurementsByTime = airMeasurementData_rdd.map(
            lambda x: [x['DateTimeStart'], {'AQI': x['AQIIndex'], 'Description': x['AQICategoryDescription'],
                                            'Category': x['AQICategoryAbbreviation'],
                                            'BackgroundColor': x['AQIBackgroundColour'],
                                            'ForegroundColor': x['AQIForegroundColour'],
                                            'Location_Lat': x['Latitude'], 'Location_Long': x['Longitude']}])
    return {(str(siteId)):airMeasurementsByTime.collect(), 'monitorId':monitorId}

#function to get air quality monitors for yearly time period
def getAirQualityMonitors(fromDate,toDate):
    query = air_quality_monitors_query+'&fromDate='+fromDate+'&toDate='+toDate
    air_monitor_allsites_data = requests.get(query).json()
    air_quality_monitor_rdd = sc.parallelize(air_monitor_allsites_data['Monitors'])
    air_quality_site_map = air_quality_monitor_rdd.map(lambda x: [x['MonitorId'],{'site':x['SiteId'],'name':x['ShortName'],'uom':x['UnitOfMeasure']}])
    air_quality_site_group = air_quality_site_map.groupByKey().map(lambda x: (x[0],list(x[1])))
    airDataDict = {'airData':air_monitor_allsites_data['Monitors'],'airQualitySites':air_quality_site_group}
    return airDataDict

#functions returns station name for the given siteId
def getStationName(siteId):
    query = air_quality_station_query + 'pointId='+str(siteId)
    station_data = requests.get(query).json()
    # station_overall = {'hasPM2.5': station_data['HasPm25'],'location':(station_data['Latitude'],station_data['Longitude']), 'AQI': station_data['AQI'],'visibility': station_data['Visibility'],'name': station_data['Station']}
    # station_parameters_rdd = sc.parallelize(station_data['ParameterValueList'])
    return station_data

# sitesList = obtainSitesData(get_sites_query)
# sitesPeriodList = obtainSitesDataPeriod('20150101','20190331')
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

def getAirQualityAggregateMeasurements(fromDate,toDate,year,typeOfMeasurement,monitorId,siteId,stationName, result):
    airMeasurementDf = 0
    query= air_quality_measurements_query+'siteId='+str(siteId)+'&monitorId='+monitorId+'&timebasisid='+typeOfMeasurement+'&fromDate='+fromDate+'&toDate='+toDate
    airMeasurementData= requests.get(query).json()
    airMeasurementData_rdd = sc.parallelize(airMeasurementData['Measurements'])
    airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: ('2018-01-01T'+ x['DateTimeStart'][-8:],
                                float(x['AQIIndex']),x['DateTimeStart'], x['Latitude'], x['Longitude'], siteId, stationName))
    airMeasurementList = airMeasurementBySiteTime.collect()
    if len(airMeasurementList) > 0:
        airMeasurementDf = sqlContext.createDataFrame(airMeasurementList, ['time', 'aqiIndex', 'date', 'latitude', 'longitude', 'siteId', 'stationName'])
        if result == 0:
            result = airMeasurementDf
        else:
            result = result.union(airMeasurementDf)
        #add checkpoint
    return result

final_Measurement_Result = {}
final_Wind_Result={}
final_Measurement_Result['Features']= []
final_Wind_Result['Features'] = []
startdate = sys.argv[1]
enddate = sys.argv[2]
year = sys.argv[3]
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


aggMaxDf = aggregatedDataframe.groupBy('date', 'latitude', 'longitude', 'siteId', 'stationName', 'time').max('aqiIndex')
#Add checkpoint
finalDf = aggMaxDf.groupBy('time', 'latitude', 'longitude', 'siteId', 'stationName').avg('max(aqiIndex)')
finalDf.show()
#add checkpoint
finalDf.coalesce(1).write.format("com.databricks.spark.csv").mode("overwrite").option("header", "true").save("E:\StudyNotes\Semester4\Project\EpaAQIIndex")



