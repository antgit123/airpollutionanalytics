import json
from pyspark.context import SparkContext
from pyspark.sql import *

sc = SparkContext("local","DEE-app1")
sqlContext = SQLContext(sc)
spark = SparkSession.builder.appName("SCATSApp1").getOrCreate()
#file paths to collect data for year 2017-18
base_path_201718 = "C:/unimelb_study/Semester4/Project/DataSources/DEE/2017-18/"
report_path_201718 = base_path_201718 + "reports2017-18.csv"
emission_report_path_201718 = base_path_201718 + "emissions2017-18.csv"
substances_report_path_201718 = base_path_201718 + "substances2017-18.csv"
facilities_report_path_201718 = base_path_201718 + "facilities2017-18.csv"
output_path_201718 = "C:/unimelb_study/Semester4/Project/DataSources/DEE/output/"

#file paths to collect data for year 2016-17
report_path_201617 = base_path_201718 + "reports2016-17.csv"
emission_report_path_201617 = base_path_201718 + "emissions2016-17.csv"
substances_report_path_201617 = base_path_201718 + "substances2016-17.csv"
facilities_report_path_201617 = base_path_201718 + "facilities2016-17.csv"
output_path_201617 = "C:/unimelb_study/Semester4/Project/DataSources/DEE/2016-17/output/"

#api queries to collect data for year 2015-16
report_path_201516 = base_path_201718 + "reports2015-16.csv"
emission_report_path_201516 = base_path_201718 + "emissions2015-16.csv"
substances_report_path_201516 = base_path_201718 + "substances2015-16.csv"
facilities_report_path_201516 = base_path_201718 + "facilities2015-16.csv"
output_path_201516 = "C:/unimelb_study/Semester4/Project/DataSources/DEE/2015-16/output/"


def obtainReportData():
    reportData = spark.read.csv(report_path_201718,header=True).cache()
    reportMapData = []
    for row in reportData.collect():
        if(row['jurisdiction_code'] == 'VIC'):
            record = {
                'FacilityId': row['facility_id'],
                'Suburb': row['suburb'],
                'Year': row['report_year'],
                'JurisdictionFacilityId': row['jurisdiction_facility_id'],
                'BusinessName': row['registered_business_name'],
                'FacilityName': row['facility_name'],
                'DataStart': row['data_start'],
                'DataEnd': row['data_end'],
                'Type': row['primary_anzsic_class_name'],
                'Postcode': row['postcode'],
                'Latitude': row['latitude'],
                'Longitude': row['longitude']
            }
            reportMapData.append(record)
    return reportMapData

def obtainEmissionData(year):
    emissionReportData = spark.read.csv(emission_report_path_201718,header=True).cache()
    emissionMapData = []
    for x in emissionReportData.collect():
        if(x['jurisdiction_code'] is not None and x['jurisdiction_code'] == 'VIC'):
            record = {
                'Suburb': x['suburb'],
                'Postcode': x['postcode'],
                'Latitude': x['latitude'],
                'Longitude': x['longitude'],
                'substanceId': x['substance_id'],
                'substanceName': x['substance_name'],
                'AirEmissionTotal': x['air_total_emission_kg'],
                'Type': x['primary_anzsic_class_name'],
                'BusinessName': x['registered_business_name'],
                'FacilityName': x['facility_name'],
                'FacilityId': x['facility_id'],
                'Year': year,
                'Id': x['facility_id']+ '-'+x['substance_name'] +'-'+ year
            }
            emissionMapData.append(record)
    return emissionMapData

def obtainSubstanceData(year):
    substanceReportData = spark.read.csv(substances_report_path_201718,header=True).cache()
    substanceMapData = []
    for x in substanceReportData.collect():
        if(x['emissions_to_air'] == True):
            record = {
                'Name': x['substance_name'],
                'SubstanceThreshold': x['c1_substance_use_threshold_kg'],
                'FuelThreshold': x['c2_fuel_use_threshold_kg'],
                'FactSheet': x['fact_sheet_url'],
                'SubstanceId': x['substance_id'],
                'Year': year,
                'Id': x['substance_id']+'-'+year
            }
            substanceMapData.append(record)
    return substanceMapData

def obtainFacilityData(year):
    facilityReportData = spark.read.csv(facilities_report_path_201718,header=True).cache()
    facilityMapData = []
    for x in facilityReportData.collect():
        if(x['jurisdiction_code'] is not None and x['jurisdiction_code'] == 'VIC'):
            record = {
                'Adress': x['street_address'],
                'Suburb': x['suburb'],
                'Postcode': x['postcode'],
                'Type': x['primary_anzsic_class_name'],
                'Activity': x['main_activities'],
                'Latitude': x['latitude'],
                'Longitude': x['longitude'],
                'FacilityName': x['facility_name'],
                'BusinessName': x['registered_business_name'],
                'FacilityId': x['facility_id'],
                'Year': year,
                'Id': x['facility_id']+ '-'+year
            }
            facilityMapData.append(record)
    return facilityMapData

#getting required data for year 2017-18
ReportData_201718 = obtainReportData()
EmissionReport_201718 = obtainEmissionData('201718')
SubstanceReport_201718 = obtainSubstanceData('201718')
FacilityReport_201718 = obtainFacilityData('201718')

with open(output_path_201718+'report201718.json', 'w') as f:
    json.dump(ReportData_201718, f)
with open(output_path_201718+'emissions201718.json','w') as f:
    json.dump(EmissionReport_201718,f)
with open(output_path_201718+'facility201718.json','w')as f:
    json.dump(FacilityReport_201718,f)
with open(output_path_201718+'substance201718.json','w')as f:
    json.dump(SubstanceReport_201718,f)

#getting required data for year 2016-17
ReportData_201617 = obtainReportData()
EmissionReport_201617 = obtainEmissionData('201617')
SubstanceReport_201617 = obtainSubstanceData('201617')
FacilityReport_201617 = obtainFacilityData('201617')

with open(output_path_201718+'report201617.json', 'w') as f:
    json.dump(ReportData_201617, f)
with open(output_path_201718+'emissions201617.json','w') as f:
    json.dump(EmissionReport_201617,f)
with open(output_path_201718+'facility201617.json','w')as f:
    json.dump(FacilityReport_201617,f)
with open(output_path_201718+'substance201617.json','w')as f:
    json.dump(SubstanceReport_201617,f)

#getting required data for year 2015-16
ReportData_201516 = obtainReportData()
EmissionReport_201516 = obtainEmissionData('201516')
SubstanceReport_201516 = obtainSubstanceData('201516')
FacilityReport_201516 = obtainFacilityData('201516')

with open(output_path_201718+'report201516.json', 'w') as f:
    json.dump(ReportData_201516, f)
with open(output_path_201718+'emissions201516.json','w') as f:
    json.dump(EmissionReport_201516,f)
with open(output_path_201718+'facility201516.json','w')as f:
    json.dump(FacilityReport_201516,f)
with open(output_path_201718+'substance201516.json','w')as f:
    json.dump(SubstanceReport_201516,f)