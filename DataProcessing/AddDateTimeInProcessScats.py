from pyspark import SparkContext
from pyspark import SQLContext
from pyspark import SparkConf
import datetime
import pyspark.sql.functions as func

def main():
    # conf = SparkConf().setAppName("scatsProcessing").setMaster("spark://45.113.232.133:7077").set('spark.logConf', True)

    # sc = SparkContext(conf = conf)
    sc = SparkContext()
    sc.setCheckpointDir("hdfs://localhost:9000/Checkpoint")
    sqlContext = SQLContext(sc)
    # sqlContext.setConf('spark.sql.shuffle.partitions', '10')
    filePath = "hdfs://localhost:9000/Scats/Processed2016.csv"
    processed_data_filepath = "hdfs://localhost:9000/Scats/DateTime2016"

    scatsDf = sqlContext.read.csv(filePath, header=True)

    todaydate = '2018/01/01 '
    finalDf = scatsDf.withColumn('DateTime',
                                 func.to_timestamp(func.concat(func.lit(todaydate), scatsDf['Range']), "yyyy/MM/dd HH"))
    scatsDf = finalDf.checkpoint(eager=True)

    # todaydate = '2018-01-01 '
    # scatsDf = scatsDf.withColumn('date', func.lit(todaydate))
    #
    # scatsDf = scatsDf.withColumn('DateTime',
    #                                          func.to_timestamp(
    #                                              func.concat(scatsDf['date'],
    #                                                          scatsDf['Range']), "yyyy-MM-dd HH"))

    scatsDf.show()
    # scatsDf = scatsDf.withColumn('DateTime', func.to_timestamp(func.concat(func.lit(todaydate), scatsDf['Range']), "yyyy/MM/dd HH"))
    scatsDf = scatsDf.checkpoint(eager=True)
    # sqlContext.clearCache()
    scatsDf.coalesce(1).write.format("com.databricks.spark.csv").mode("overwrite").option("header", "true").save(processed_data_filepath)

main()
