import requests
from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
from shapely import geometry
import json

get_sites_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/sites"
get_sites_monitor_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Sites?monitoringPurpose=1010"
air_quality_monitors_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?"
air_quality_monitors_site_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Monitors?siteId=10107&fromDate=20160101&toDate=20170101"
air_quality_measurements_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/Measurements?"
air_quality_station_query = "http://sciwebsvc.epa.vic.gov.au/aqapi/StationData?"
epa_ubuntu_output_path = "/mnt/epa/"
epa_output_hdfs_path = "hdfs://45.113.232.133:9000/EPA2018"

conf = SparkConf().setAppName("EpaProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)
sc = SparkContext(conf = conf)
sqlContext = SQLContext(sc)

#function to get sites data default time period
def obtainSitesData(query):
    sites_requestData = requests.get(query).json()
    return sites_requestData['Sites']

#function to get sites data for specified time period
def obtainSitesDataPeriod(fromDate,toDate):
    query = get_sites_monitor_query+'&fromDate='+fromDate+'&toDate='+toDate
    sites_period_data = requests.get(query).json()
    sites_period_list = sites_period_data['Sites']
    for site in sites_period_list:
        site['Wkt_point'] = str(geometry.Point(site['Latitude'], site['Longitude']))
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

#functions returns air quality measurements for last 2 days for specified station id
def getStationAirQualityData(siteId):
    query = air_quality_station_query + 'pointId='+siteId
    station_data = requests.get(query).json()
    station_overall = {'hasPM2.5': station_data['HasPm25'],'location':(station_data['Latitude'],station_data['Longitude']), 'AQI': station_data['AQI'],'visibility': station_data['Visibility'],'name': station_data['Station']}
    station_parameters_rdd = sc.parallelize(station_data['ParameterValueList'])
    return {'stationData': station_overall}

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

def getAirQualityAggregateMeasurements(fromDate,toDate,year,typeOfMeasurement,monitorId,siteId, isWindIndicator, result):
    query= air_quality_measurements_query+'siteId='+str(siteId)+'&monitorId='+monitorId+'&timebasisid='+typeOfMeasurement+'&fromDate='+fromDate+'&toDate='+toDate
    airMeasurementData= requests.get(query).json()
    airMeasurementData_rdd = sc.parallelize(airMeasurementData['Measurements'])
    if isWindIndicator:
        airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (x['DateTimeStart'],
                                     x['DateTimeStart'], float(x['Value']), x['Latitude'], x['Longitude']))
    else:
        airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (x['DateTimeStart'],
                                x['DateTimeStart'], float(x['AQIIndex']),float(x['Value']), x['Latitude'], x['Longitude']))
    # if measurementIndicator == 'Value':
    # airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (siteId, monitorId, x['DateTimeStart'],x['AQIIndex']))
    # airMeasurementBySiteTime = airMeasurementData_rdd.map(lambda x: (x['DateTimeStart'], x['DateTimeStart'][-8:],float(x['AQIIndex'])))
    timeGrouping = airMeasurementBySiteTime.groupBy(lambda x: x[1]).map(lambda x:(x[0], list(x[1])))

    # avg_airHourlyData = []
    for timeRecord in timeGrouping.collect():
        if isWindIndicator:
            df = sqlContext.createDataFrame(timeRecord[1], ['DATE', 'TIME', 'INDEX','LATITUDE','LONGITUDE'])
            lat = df.first()['LATITUDE']
            lon = df.first()['LONGITUDE']
            df = df.groupBy('TIME').avg('INDEX')
            hour_index = df.first()['TIME']
            avg_index = df.first()['avg(INDEX)']
            dict_Epa = {
                'siteId':siteId,
                'monitorId': monitorId,
                'dtg': hour_index,
                'latitude': lat,
                'longitude': lon,
                'avg_value': avg_index
            }
            if len(dict_Epa.keys()) != 0:
                result.append(dict_Epa)
            # avg_airHourlyData.append(dict)
        else:
            df = sqlContext.createDataFrame(timeRecord[1], ['DATE', 'TIME', 'INDEX','VALUE','LATITUDE','LONGITUDE'])
            lat = df.first()['LATITUDE']
            lon = df.first()['LONGITUDE']
            df = df.groupBy('TIME').avg('INDEX','VALUE')
            hour_index = df.first()['TIME']
            avg_airIndex = df.first()['avg(INDEX)']
            avg_concentrationValue = df.first()['avg(VALUE)']
            # avg_airHourlyData.append({'key': hour_index, hour_index: avg_airIndex,'avg_conc_value': avg_concentrationValue})
            dict_Epa = {
                'siteId': siteId,
                'monitorId': monitorId,
                'dtg': hour_index,
                'latitude': lat,
                'longitude': lon,
                'avg_value': avg_concentrationValue,
                'avg_airIndex': avg_airIndex
            }
            if len(dict_Epa.keys()) != 0:
                result.append(dict_Epa)
            # avg_airHourlyData.append(dict)

    # return {'key': str(siteId)+ '-'+ str(monitorId),'siteId': siteId, 'monitorId': monitorId, 'hourlyData':avg_airHourlyData,'year': year}

final_Measurement_Result = {}
final_Wind_Result={}
final_Measurement_Result['Features']= []
final_Wind_Result['Features'] = []
for airIndicatorRecord in airQualityMonitorDictionary['airQualitySites'].collect():
    monitorId = airIndicatorRecord[0]
    for sites in airIndicatorRecord[1]:
        if monitorId in wind_indicators:
            # airQualityWindData.append(getAirQualityAggregateMeasurements('2018010100','2019010100','2018',typeOfMeasurement,monitorId,sites['site'], True))
            getAirQualityAggregateMeasurements('2018010100','2019010100','2018',typeOfMeasurement,monitorId,sites['site'], True,final_Wind_Result['Features'])
        else:
            getAirQualityAggregateMeasurements('2018010100', '2019010100', '2018', typeOfMeasurement, monitorId,sites['site'], False,final_Measurement_Result['Features'])
            # airQualityMeasurementData.append(getAirQualityAggregateMeasurements('2018010100', '2019010100', '2018', typeOfMeasurement, monitorId,sites['site'], False))
# #storing result of data collected from sites for air quality measurement call
# # with open(epa_output_path+'1.json', 'w') as f:
# #     json.dump(airQualityMeasurementData, f)
# station_keys = ["SiteId","Name","Wkt_point"]
# with open(epa_output_path+'stationData2.json','w') as f:
#     json.dump(sitesPeriodList,f)
# with open(epa_output_path+'airQualityMonitors.json','w')as f:
#     json.dump(airQualityMonitorDictionary['airData'],f)
with open(epa_ubuntu_output_path+'Epa_geomesa_measurements_2018.json', 'w') as f:
    json.dump(final_Measurement_Result, f)
with open(epa_ubuntu_output_path+'Epa_geomesa_wind_2018.json', 'w') as f:
    json.dump(final_Wind_Result, f)


