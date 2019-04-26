from pyspark import SparkContext
from pyspark import SQLContext
import os
import ProcessScatFile

def processScatsFiles(sqlContext, filteredTrafficLightsDf):
    # sc = SparkContext()
    # sqlContext = SQLContext(sc)

    # traffic_lights_filepath = "hdfs://localhost:9000/test1/tlights_vic_4326.csv"
    volume_data_filepath = "E:\StudyNotes\Semester4\Project\data\scats2018"
    newCsvPath = "E:\StudyNotes\Semester4\Project\data\scats2018_processedMonthFinal"

    # trafficfile = sqlContext.read.csv(traffic_lights_filepath, header=True)

    fileList = os.listdir(volume_data_filepath)
    concatenatedDf = 0
    for file in fileList:
        print(file)
        volumeFile = sqlContext.read.csv(volume_data_filepath + '/' + file, header=True)
        concatenatedDf = ProcessScatFile.calcNoOfTrafficPerHr(volumeFile, concatenatedDf, filteredTrafficLightsDf)

    finalProcessedDf = concatenatedDf.groupBy("NB_SCATS_SITE").avg('sum(sum_1)', 'sum(sum_2)', 'sum(sum_3)', 'sum(sum_4)',
                                                                   'sum(sum_5)', 'sum(sum_6)', 'sum(sum_7)', 'sum(sum_8)',
                                                                   'sum(sum_9)', 'sum(sum_10)', 'sum(sum_11)',
                                                                   'sum(sum_12)',
                                                                   'sum(sum_13)', 'sum(sum_14)', 'sum(sum_15)',
                                                                   'sum(sum_16)',
                                                                   'sum(sum_17)', 'sum(sum_18)', 'sum(sum_19)',
                                                                   'sum(sum_20)',
                                                                   'sum(sum_21)', 'sum(sum_22)', 'sum(sum_23)',
                                                                   'sum(sum_24)')

    print(finalProcessedDf.count())
    finalProcessedDf.show()
    finalProcessedDf.coalesce(1).write.format("com.databricks.spark.csv").option("header", "true").mode('append') \
        .save(newCsvPath)
