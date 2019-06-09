import requests
from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
import json
import sys

# web service links to get the monitors, EPA station details and measurements of monitors in all stations
air_quality_monitors_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?"
air_quality_measurements_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Measurements?"
air_quality_station_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/StationData?"

# location to save the processed json in instance
epa_ubuntu_output_path = "/mnt/epa_geomesa/"

conf = SparkConf().setAppName("EpaProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)
sc = SparkContext(conf=conf)
sc.setCheckpointDir("hdfs://45.113.232.133:9000/Checkpoint")
sqlContext = SQLContext(sc)
sqlContext.setConf('spark.sql.shuffle.partitions', '10')

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
def getAirQualityAggregateMeasurements(fromDate,toDate,year,typeOfMeasurement,monitorId,siteId,stationName, isWindIndicator, result):
    query = air_quality_measurements_query+'siteId='+str(siteId)+'&monitorId='+monitorId+'&timebasisid='+typeOfMeasurement+'&fromDate='+fromDate+'&toDate='+toDate
    airMeasurementData = requests.get(query).json()
    airMeasurementData_rdd = sc.parallelize(airMeasurementData['Measurements'])

    # in case of wind we store the value of wind measurements else we store the AQI
    if isWindIndicator:
        airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (x['DateTimeStart'][-8:],
                                     float(x['Value']), x['Latitude'], x['Longitude']))
    else:
        airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (x['DateTimeStart'][-8:],
                                float(x['AQIIndex']),float(x['Value']), x['Latitude'], x['Longitude']))
        
    timeGrouping = airMeasurementBySiteTime.groupBy(lambda x: x[0]).map(lambda x:(x[0], list(x[1])))

    # looping through each record to find the average AQI by grouping on basis of hour
    for timeRecord in timeGrouping.collect():
        if isWindIndicator:
            df = sqlContext.createDataFrame(timeRecord[1], ['TIME', 'INDEX'])
            lat = timeRecord[1][0][2]
            lon = timeRecord[1][0][3]
            df = df.groupBy('TIME').avg('INDEX')
            df = df.checkpoint(eager = True)
            todaydate = year + '-01-01T'
            hour_index = df.first()['TIME']
            avg_index = df.first()['avg(INDEX)']
            dict_Epa = {
                'siteId':siteId,
                'monitorId': monitorId,
                'dtg': todaydate+hour_index,
                'latitude': lat,
                'longitude': lon,
                'avg_value': avg_index,
                'stationName': stationName
            }
            if len(dict_Epa.keys()) != 0:
                result.append(dict_Epa)
        else:
            df = sqlContext.createDataFrame(timeRecord[1], ['TIME','INDEX','VALUE'])
            lat = timeRecord[1][0][3]
            lon = timeRecord[1][0][4]
            df = df.groupBy('TIME').avg('INDEX','VALUE')
            df = df.checkpoint(eager=True)
            todaydate = year + '-01-01T'
            hour_index = df.first()['TIME']
            avg_airIndex = df.first()['avg(INDEX)']
            avg_concentrationValue = df.first()['avg(VALUE)']
            dict_Epa = {
                'siteId': siteId,
                'monitorId': monitorId,
                'dtg': todaydate+hour_index,
                'latitude': lat,
                'longitude': lon,
                'avg_value': avg_concentrationValue,
                'avg_airIndex': avg_airIndex,
                'stationName': stationName
            }
            if len(dict_Epa.keys()) != 0:
                result.append(dict_Epa)

# fetching all the air quality monitors for the past 4 years
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

# passing runtime arguments to get the start date, end date and year
startdate = sys.argv[1]
enddate = sys.argv[2]
year = sys.argv[3]
stationName = ""
stationData = ""

# looping through each monitor and station to find the aggregate monitor value grouped by time
for airIndicatorRecord in airQualityMonitorDictionary['airQualitySites'].collect():
    monitorId = airIndicatorRecord[0]
    for sites in airIndicatorRecord[1]:
        stationData = getStationName(sites['site'])
        try:
            if stationData is not None:
                stationName = stationData['Station']
        except TypeError:
            print()
        if monitorId in wind_indicators:
            getAirQualityAggregateMeasurements(startdate,enddate,year,typeOfMeasurement,monitorId,sites['site'], stationName, True,final_Wind_Result['Features'])
        else:
            getAirQualityAggregateMeasurements(startdate, enddate, year, typeOfMeasurement, monitorId,sites['site'], stationName, False,final_Measurement_Result['Features'])
        sqlContext.clearCache()

# saving the processed json in instance
with open(epa_ubuntu_output_path+'Epa_geomesa_measurements_'+year+'.json', 'w') as f:
    json.dump(final_Measurement_Result, f)
with open(epa_ubuntu_output_path+'Epa_geomesa_wind_'+year+'.json', 'w') as f:
    json.dump(final_Wind_Result, f)


