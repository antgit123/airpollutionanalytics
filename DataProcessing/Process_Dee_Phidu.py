import json
import Process_Shape_file as lga
from xml.dom import minidom

shapefile_LGA201415 = "/mnt/DEE/Output_PHIDU_LGA201415/shp/9dfd51c9-f120-4457-96cc-6b88a0b40764.shp"
shapefile_LGA201617 = "/mnt/DEE/Output_PHIDU_LGA201617/shp/0e946408-2083-4d5f-b047-7d6457f04978.shp"
#all npi data file paths
npi_file201415 = "/mnt/DEE/reports/2014-15/npidata2014-15.xml"
npi_file201516 = "/mnt/DEE/reports/2015-16/npidata2015-16.xml"
npi_file201617 = "/mnt/DEE/reports/2016-17/npidata2016-17.xml"
npi_file201718 = "/mnt/DEE/reports/2017-18/npidata2017-18.xml"
output_path = "/mnt/DEE/reports/output/"

fileList = [npi_file201415,npi_file201516,npi_file201617,npi_file201718]

#all phidu file paths
phidu_201415_filepath = "/mnt/PHIDU/PHIDU_2014-2015/data.json"
phidu_201617_filepath = "/mnt/PHIDU/PHIDU_2016-2017/data.json"

phidu_fileList = [phidu_201415_filepath, phidu_201617_filepath]

xlow = 140.9617
xhigh = 150.017
ylow = -39.1832
yhigh = -33.9806

location_201415 = lga.get_LGA_dict(shapefile_LGA201415,'201415')
location_201617 = lga.get_LGA_dict(shapefile_LGA201617,'201617')

#function to process PHIDU json data obtained from AURIN
def processPhidu(phidu_file):
    phidu_processed = []
    phidu_dict = {}
    year = phidu_file.split('/')[6][-9:]
    with open(phidu_file) as phidu_file:
        phidu_data = json.load(phidu_file)
        for feature in phidu_data['features']:
            phidu_region = {}
            phidu_region['id'] = feature['id']
            if year == '2016-2017':
                phidu_region['lga_code'] = feature['properties']['lga_code16']
                phidu_region['lga_name'] = feature['properties']['lga_name16']
                if feature['properties']['admis_asthma_p_all_hosps_2016_17_num'] != None:
                    phidu_region['asthma_admissions'] = feature['properties']['admis_asthma_p_all_hosps_2016_17_num']
                    phidu_region['asthma_admissions_asr'] = feature['properties']['admis_asthma_p_all_hosps_2016_17_asr_100k_m']
                else:
                    phidu_region['asthma_admissions'] = feature['properties']['admis_asthma_p_pub_hosps_2016_17_num']
                    phidu_region['asthma_admissions_asr'] = feature['properties']['admis_asthma_p_pub_hosps_2016_17_asr_100k_m']
                phidu_region['stroke_admissions'] = feature['properties']['admis_stroke_p_pub_hosps_2016_17_num']
                phidu_region['stroke_admissions_asr'] = feature['properties']['admis_stroke_p_pub_hosps_2016_17_asr_100k']
                phidu_region['respiratory_admissions'] = feature['properties']['admis_resp_sys_dise_p_all_hosps_2016_17_num']
                phidu_region['respiratory_admissions_asr'] = feature['properties']['admis_resp_sys_dise_p_pub_hosps_2016_17_asr_100k']
                phidu_region['ischaemic_heart_admissions'] = feature['properties']['admis_isch_hrt_dise_p_all_hosps_2016_17_num']
                phidu_region['ischaemic_heart_admissions_asr'] = feature['properties']['admis_isch_hrt_dise_p_all_hosps_2016_17_asr_100k']
                phidu_region['copd_admissions'] = feature['properties']['admis_copd_copd_p_pub_hosps_2016_17_num']
                phidu_region['copd_admissions_asr'] = feature['properties']['admis_copd_copd_p_pub_hosps_2016_17_asr_100k_m']
            else:
                phidu_region['lga_code'] = feature['properties']['lga_code']
                phidu_region['lga_name'] = feature['properties']['lga_name']
                phidu_region['respiratory_admissions'] = feature['properties']['admis_resp_sys_dise_p_pub_hosps_2014_15_num']
                phidu_region['respirator_admissions_asr'] = feature['properties']['admis_resp_sys_dise_p_all_hosps_2014_15_asr_100000']
            phidu_processed.append(phidu_region)
    sorted_phidu_respiratory = sorted(phidu_processed, key= lambda x: x['respiratory_admissions'] if x['respiratory_admissions'] else 0,reverse=True)
    phidu_dict['respiratory'] = sorted_phidu_respiratory
    if year== '2016-2017':
        sorted_phidu_copd = sorted(phidu_processed, key= lambda  x: x['copd_admissions'] if x['copd_admissions'] else 0,reverse=True)
        phidu_dict['copd'] = sorted_phidu_copd
        sorted_phidu_asthma = sorted(phidu_processed, key=lambda x: x['asthma_admissions'] if x['asthma_admissions'] else 0, reverse=True)
        phidu_dict['asthma'] = sorted_phidu_asthma
        sorted_phidu_isch = sorted(phidu_processed, key=lambda x: x['ischaemic_heart_admissions'] if x['ischaemic_heart_admissions'] else 0, reverse=True)
        phidu_dict['isch_heart'] = sorted_phidu_isch
        sorted_phidu_stroke = sorted(phidu_processed, key=lambda x: x['stroke_admissions'] if x['stroke_admissions'] else 0, reverse=True)
        phidu_dict['stroke'] = sorted_phidu_stroke
        phidu_dict['year'] = year
        with open(output_path + 'PHIDU_'+str(year)+'.json', 'w') as f:
            json.dump(phidu_dict, f)
    else:
        phidu_dict['year'] = year
        with open(output_path + 'PHIDU_'+str(year)+'.json', 'w') as f:
            json.dump(phidu_dict, f)

#function to parse each year NPI report data and store the result as JSON documents
def parseNpiData(filePath):
    xmldoc = minidom.parse(filePath)
    reports = xmldoc.getElementsByTagName('report')
    fields = ['year','registered_business_name','sub_threshold','facility_name','jurisdiction_facility_id',
          'site_address_street','site_address_suburb','site_address_postcode','main_activities',
          'site_latitude','site_longitude']
    emissionFields = ['substance','destination','quantity_in_kg']
    business = []
    clustered_output = {}
    for report in reports:
        businessDict = {}
        emissions_list = []
        for childNode in report.childNodes:
            nodeType = childNode.localName
            if nodeType in fields:
                nodeValue = childNode.firstChild.nodeValue
                businessDict[nodeType] = nodeValue
            elif nodeType == 'emissions':
                for emissionNode in childNode.childNodes:
                    emissionNodeType = emissionNode.localName
                    if emissionNodeType == 'emission':
                        emissionDict = {}
                        for emissionDataNode in emissionNode.childNodes:
                            emissionDataNodeType = emissionDataNode.localName
                            if emissionDataNodeType in emissionFields:
                                emissionDataNodeValue = emissionDataNode.firstChild.nodeValue
                                emissionDict[emissionDataNodeType] = emissionDataNodeValue
                    if emissionDict['destination'] == 'Air Total':
                        emissions_list.append(emissionDict)
                businessDict['emissionData'] = emissions_list
        business.append(businessDict)
    reportYear = business[0]['year']
    if reportYear == '2015':
        shapeLocation = location_201415
    elif reportYear == '2017':
        shapeLocation = location_201617
    else:
        shapeLocation = None
    with open(output_path + 'DEE_'+str(reportYear)+'.json', 'w') as f:
        json.dump(business, f)
    if shapeLocation != None:
        for business_item in business:
            site_lat = float(business_item['site_latitude'])
            site_lon = float(business_item['site_longitude'])
            business_point = lga.geometry.Point(site_lat,site_lon)
            business_location = lga.get_LGA(business_point,shapeLocation,reportYear)
            if business_location in clustered_output.keys():
                clustered_output.get(business_location).append(business_item)
            else:
                clustered_output[business_location] = [business_item]
        with open(output_path + 'DEE_cluster_' + str(reportYear) + '.json', 'w') as f:
            json.dump(clustered_output, f)

for filePath in fileList:
    parseNpiData(filePath)
for filePath in phidu_fileList:
    processPhidu(filePath)



