import subprocess
from pyspark import SparkContext
from pyspark import SQLContext
from pyspark.sql.functions import when
from hdfs import InsecureClient

# client = InsecureClient('hdfs://localhost:9000', user='tejal')

sc = SparkContext()
sqlContext = SQLContext(sc)

dir_in = "hdfs://localhost:9000/data"
argsls = "hdfs dfs -ls -C "+dir_in
#argscat = "hdfs dfs -cat "
proc = subprocess.Popen(argsls, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
s_output = proc.communicate()
names = s_output[0].decode("utf-8")
files = names.split("\r\n")
while "" in files:
    files.remove("")
print(files)
trafficfile = sqlContext.read.csv(files[0], header=True)


