from subprocess import PIPE, Popen

#Copies the folder from scat_data_path and put into scats_hdfs_path
scat_data_path = "E:\StudyNotes\Semester4\Project\data\VSDATA_2018   "
scats_hdfs_path = "hdfs://localhost:9000/"

put = Popen(["hadoop", "fs", "-put", scat_data_path, scats_hdfs_path], shell=True, stdin=PIPE, bufsize=-1)
put.communicate()
