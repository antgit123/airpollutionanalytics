from subprocess import PIPE, Popen

#Copies the folder from scat_data_path and put into scats_hdfs_path
scat_data_path = "/dev/VSDATA_2017"
scats_hdfs_path = "hdfs://45.113.232.133:9000/"

put = Popen(["hadoop", "fs", "-put", scat_data_path, scats_hdfs_path], shell=True, stdin=PIPE, bufsize=-1)
put.communicate()
