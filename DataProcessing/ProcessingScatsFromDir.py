import os
import ProcessScatFile
import subprocess


def processScatsFiles(sqlContext, filteredTrafficLightsDf):
    newCsvPath = "hdfs://45.113.232.133:9000/Processed2017"

    volume_data_filepath = "hdfs://45.113.232.133:9000/2017"
    argsls = "hdfs dfs -ls -C " + volume_data_filepath
    proc = subprocess.Popen(argsls, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    s_output = proc.communicate()
    names = s_output[0].decode("utf-8")
    print("in names---->" + names)
    files = names.split("\n")
    while "" in files:
        files.remove("")

    concatenatedDf = 0
    print("our line-------------")
    print(files[0])
    for file in files:
        volumeFile = sqlContext.read.csv(file, header=True)
        concatenatedDf = ProcessScatFile.calcNoOfTrafficPerHr(volumeFile, concatenatedDf, filteredTrafficLightsDf)

    finalProcessedDf = concatenatedDf.groupBy("NB_SCATS_SITE").avg('sum(sum_1)', 'sum(sum_2)', 'sum(sum_3)',
                                                                   'sum(sum_4)',
                                                                   'sum(sum_5)', 'sum(sum_6)', 'sum(sum_7)',
                                                                   'sum(sum_8)',
                                                                   'sum(sum_9)', 'sum(sum_10)', 'sum(sum_11)',
                                                                   'sum(sum_12)',
                                                                   'sum(sum_13)', 'sum(sum_14)', 'sum(sum_15)',
                                                                   'sum(sum_16)',
                                                                   'sum(sum_17)', 'sum(sum_18)', 'sum(sum_19)',
                                                                   'sum(sum_20)',
                                                                   'sum(sum_21)', 'sum(sum_22)', 'sum(sum_23)',
                                                                   'sum(sum_24)')
    finalProcessedDf = finalProcessedDf.join(filteredTrafficLightsDf,
                                             filteredTrafficLightsDf.SCAT_SITE_ID == finalProcessedDf.NB_SCATS_SITE,
                                             'inner')
    # # Combine wkt column from traffice file with the above dataframe
    sumColumns = [i for i in finalProcessedDf.columns if i.startswith('avg(sum(sum_')]
    sumColumns.append('NB_SCATS_SITE')
    sumColumns.append('SCAT_SITE_NAME')
    sumColumns.append('SCAT_LATITUDE')
    sumColumns.append('SCAT_LONGITUDE')
    finalProcessedDf = finalProcessedDf.select(sumColumns)
    finalProcessedDf = finalProcessedDf.toDF('00:00 - 00:59', '01:00 - 01:59', '02:00 - 02:59', '03:00 - 03:59',
                                             '04:00 - 04:59', '05:00 - 05:59', '06:00 - 06:59', '07:00 - 07:59',
                                             '08:00 - 08:59',
                                             '09:00 - 09:59', '10:00 - 10:59', '11:00 - 11:59', '12:00 - 12:59',
                                             '13:00 - 13:59',
                                             '14:00 - 14:59', '15:00 - 15:59', '16:00 - 16:59', '17:00 - 17:59',
                                             '18:00 - 18:59',
                                             '19:00 - 19:59', '20:00 - 20:59', '21:00 - 21:59', '22:00 - 22:59',
                                             '23:00 - 23:59',
                                             'scatSiteId', 'scatSiteName', 'latitide', 'longitude')
    print(finalProcessedDf.count())
    finalProcessedDf.coalesce(1).write.format("com.databricks.spark.csv").option("header", "true").mode('append') \
        .save(newCsvPath)
