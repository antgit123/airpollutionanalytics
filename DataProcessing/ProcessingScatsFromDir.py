from pyspark import SparkContext
from pyspark import SQLContext
from pyspark.sql.functions import when
# from hdfs import Config
# from hdfs import InsecureClient


# client = InsecureClient('hdfs://localhost:9000', user='sindhu')

sc = SparkContext()
sqlContext = SQLContext(sc)

traffic_lights_filepath = "hdfs://localhost:9000/test1/tlights_vic_4326.csv"
volume_data_filepath = "/data"
newCsvPath = "hdfs://localhost:9000/processedData/"

trafficfile = sqlContext.read.csv(traffic_lights_filepath, header=True)

def calculate(df):
    # df = sqlContext.read.csv(filename, header=True)

    # Replace negative and blank values with 0
    for col in df.columns:
        df = df.withColumn(col, when(df[col] > 0, df[col]).otherwise(0))

    # Extract only NB_SCATS_SITE and V00 -- V95
    result = [i for i in df.columns if i.startswith('V')]
    result.append('NB_SCATS_SITE')
    df = df.select(result)

    # Sum the values on hourly basis
    i = 0;
    count = 0;
    initialCount = len(df.columns) - 4
    while i < initialCount:
        count = count + 1
        df = df.withColumn("sum_" + str(count),
                           df[df.columns[i + 0]] + df[df.columns[i + 1]] + df[df.columns[i + 2]] + df[
                               df.columns[i + 3]])
        i = i + 4
    # df.show()

    # Group by NB_SCATS_SITE and sum the value
    df2 = df.groupBy("NB_SCATS_SITE").sum('sum_1', 'sum_2', 'sum_3', 'sum_4', 'sum_5', 'sum_6',
                                          'sum_7', 'sum_8', 'sum_9', 'sum_10', 'sum_11', 'sum_12',
                                          'sum_13', 'sum_14', 'sum_15', 'sum_16', 'sum_17', 'sum_18',
                                          'sum_19', 'sum_20', 'sum_21', 'sum_22', 'sum_23', 'sum_24')

    # Combine wkt column from traffice file with the above dataframe
    sumColumns = [i for i in df2.columns if i.startswith('sum(sum_')]
    sumColumns.append('NB_SCATS_SITE')
    sumColumns.append('WKT')
    finalDf = df2.join(trafficfile, trafficfile.SITE_NO == df2.NB_SCATS_SITE).select(sumColumns)

    # Display the final result
    finalDf.coalesce(1).write.format("com.databricks.spark.csv").option("header", "true").mode('append') \
        .save(newCsvPath)


# client = Config().get_client('dev')
# fileList = client.list(volume_data_filepath)

import os
# import subprocess
#
# cmd = 'hdfs dfs -ls /data'
# fileList = subprocess.check_output(cmd, shell=True).strip().split('\n')

fileList = os.listdir(volume_data_filepath)
for file in fileList:
    print(file)
    volumeFile = sqlContext.read.csv(volume_data_filepath + '/' + file, header=True)
    calculate(volumeFile)
