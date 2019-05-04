import requests
from pyspark.context import SparkContext
from pyspark import SQLContext
import json

sc = SparkContext("local","Epa-app1")
get_sites_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/sites"
get_sites_monitor_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Sites?monitoringPurpose=1010"
air_quality_monitors_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?"
air_quality_monitors_site_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?siteId=10107&fromDate=20160101&toDate=20170101"
air_quality_measurements_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Measurements?"
air_quality_station_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/StationData?"
epa_output_path = "C:/unimelb_study/Semester4/Project/DataSources/EPA/"
sqlContext = SQLContext(sc)

#function to get sites data default time period
def obtainSitesData(query):
    sites_requestData = requests.get(query).json()
    return sites_requestData['Sites']

#function to get sites data for specified time period
def obtainSitesDataPeriod(fromDate,toDate):
    query = get_sites_monitor_query+'&fromDate='+fromDate+'&toDate='+toDate
    sites_period_data = requests.get(query).json()
    return sites_period_data['Sites']

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

#functions returns air quality measurements for last 2 days for specified station id
def getStationAirQualityData(siteId):
    query = air_quality_station_query + 'pointId='+siteId
    station_data = requests.get(query).json()
    station_overall = {'hasPM2.5': station_data['HasPm25'],'location':(station_data['Latitude'],station_data['Longitude']), 'AQI': station_data['AQI'],'visibility': station_data['Visibility'],'name': station_data['Station']}
    station_parameters_rdd = sc.parallelize(station_data['ParameterValueList'])
    return {'stationData': station_overall}
    print(station_data)

sitesList = obtainSitesData(get_sites_query)
sitesPeriodList = obtainSitesDataPeriod('20150101','20190331')
airQualityMonitorDictionary= getAirQualityMonitors('20150101','20190101')
airQualityMeasurementData = []
perDayMeasurement = False
typeOfMeasurement = ''
if perDayMeasurement:
    typeOfMeasurement = '24HR_AV'
else:
    typeOfMeasurement = '1HR_AV'


def seq_op(accumulator, element):
    return (accumulator[0] + element[1], accumulator[1] + 1)


# Combiner Operation : Finding Maximum Marks out Partition-Wise Accumulators
def comb_op(accumulator1, accumulator2):
    return (accumulator1[0] + accumulator2[0], accumulator1[1] + accumulator2[1])

zero_value = 0
def getAirQualityAggregateMeasurements(fromDate,toDate,typeOfMeasurement,monitorId,siteId):
    query= air_quality_measurements_query+'siteId='+str(siteId)+'&monitorId='+monitorId+'&timebasisid='+typeOfMeasurement+'&fromDate='+fromDate+'&toDate='+toDate
    airMeasurementData= requests.get(query).json()
    airMeasurementData_rdd = sc.parallelize(airMeasurementData['Measurements'])
    print(airMeasurementData_rdd.collect())
    airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (siteId, monitorId, x['DateTimeStart'],x['AQIIndex']))
    airMeasurementBySiteTime2 = airMeasurementData_rdd.map(lambda x: (x['DateTimeStart'], x['DateTimeStart'][-8:],x['AQIIndex']))
    print(airMeasurementBySiteTime)
    timeGrouping = airMeasurementBySiteTime2.groupBy(lambda x: x[1]).map(lambda x:(x[0], list(x[1])))
    for timeRecord in timeGrouping.collect():
        df = sqlContext.createDataFrame(timeRecord[1], ['DATE', 'TIME', 'INDEX'])
        df = df.groupBy('TIME').avg('INDEX')
        df.show()
    print("done")

for airIndicatorRecord in airQualityMonitorDictionary['airQualitySites'].collect():
    monitorId = airIndicatorRecord[0]
    for sites in airIndicatorRecord[1]:
        airQualityMeasurementData.append(getAirQualityAggregateMeasurements('2018010100','2019010100',typeOfMeasurement,monitorId,sites['site']))

#storing result of data collected from sites for air quality measurement call
# with open(epa_output_path+'1.json', 'w') as f:
#     json.dump(airQualityMeasurementData, f)
# with open(epa_output_path+'stationData.json','w') as f:
#     json.dump(sitesPeriodList,f)
# with open(epa_output_path+'airQualityMonitors.json','w')as f:
#     json.dump(airQualityMonitorDictionary['airData'],f)


