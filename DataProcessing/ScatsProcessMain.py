from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
import EPAScatsDistanceCalculate
import ProcessingScatsFromDir

def main():
    conf = SparkConf().setAppName("scatsProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)

    sc = SparkContext(conf = conf)
    sc.setCheckpointDir("hdfs://45.113.232.133:9000/Processed2017Checkpoint")
    sqlContext = SQLContext(sc)
    sqlContext.setConf('spark.sql.shuffle.partitions', '10')
    traffic_lights_filepath = "hdfs://45.113.232.133:9000/pointData/tlights_vic_4326.csv"
    EPAStationData = "hdfs://45.113.232.133:9000/pointData/stationData.json"
    volume_data_filepath = "hdfs://45.113.232.133:9000/2018"
    processed_data_filepath = "hdfs://45.113.232.133:9000/Processed2018_1"

    filteredTrafficLight = EPAScatsDistanceCalculate.filterScatsDataWithinEPA(sc, sqlContext, traffic_lights_filepath,
                                                                              EPAStationData)
    finalDf = ProcessingScatsFromDir.processScatsFiles(sqlContext, filteredTrafficLight, volume_data_filepath)
    finalDf = finalDf.checkpoint(eager=True)
    sqlContext.clearCache()
    finalDf.coalesce(1).write.format("com.databricks.spark.csv").mode("overwrite").option("header", "true").save(processed_data_filepath)

main()
