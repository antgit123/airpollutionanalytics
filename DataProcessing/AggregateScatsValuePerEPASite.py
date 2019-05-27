from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
import sys

def main():
    conf = SparkConf().setAppName("scatsProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)

    sc = SparkContext(conf=conf)
    sc.setCheckpointDir("hdfs://45.113.232.133:9000/Checkpoint")
    sqlContext = SQLContext(sc)
    sqlContext.setConf('spark.sql.shuffle.partitions', '10')
    year = sys.argv[1]
    filename = sys.argv[2]
    filePath = "hdfs://45.113.232.133:9000/" + filename
    processed_data_filepath = "hdfs://45.113.232.133:9000/Scats/AggregatedScatsPerEPA" + year
    EPAStationDataPath = "hdfs://45.113.232.133:9000/pointData/stationData.json"

    scatsDf = sqlContext.read.csv(filePath, header=True)
    EpaDf = sqlContext.read.json(EPAStationDataPath)
    scatsDf = scatsDf.withColumn('count', scatsDf['AvgCount'].cast('float')).checkpoint(eager=True)
    EpaDf = EpaDf.select('SiteId','Name', 'Latitude', 'Longitude')
    scatsDf = scatsDf.groupBy('DateTime', 'EPA_SITE_ID').sum('count').checkpoint(eager=True)

    scatsDf = scatsDf.join(EpaDf, scatsDf.EPA_SITE_ID == EpaDf.SiteId, 'inner').checkpoint(eager=True)

    scatsDf.coalesce(1).write.format("com.databricks.spark.csv").mode("overwrite").option("header", "true").save(processed_data_filepath)

main()
