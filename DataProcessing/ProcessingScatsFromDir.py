import ProcessScatFile
import subprocess
import pyspark.sql.functions as func

# function to aggregate the traffic volume count
def processScatsFiles(sqlContext, filteredTrafficLightsDf, volume_data_filepath, year):
    argsls = "hdfs dfs -ls -C " + volume_data_filepath
    proc = subprocess.Popen(argsls, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    s_output = proc.communicate()
    names = s_output[0].decode("utf-8")
    files = names.split("\n")
    while "" in files:
        files.remove("")

    joinedDf = 0
    fileCount = 0
    for file in files:
        fileCount = fileCount + 1
        volumeFile = sqlContext.read.csv(file, header=True)
        processedDf = ProcessScatFile.calcNoOfTrafficPerHr(sqlContext, volumeFile, filteredTrafficLightsDf)
        if joinedDf == 0:
            joinedDf = processedDf
        else:
            joinedDf = joinedDf.union(processedDf)

        processedDf = 0

        # adding the traffic count of all detectors per site
        joinedDf = joinedDf.groupBy("NB_SCATS_SITE").sum('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12',
                                                         '13', '14', '15',
                                                         '16', '17',
                                                         '18', '19', '20', '21', '22', '23', '24')

        joinedDf = joinedDf.toDF('NB_SCATS_SITE', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13',
                                 '14', '15',
                                 '16', '17',
                                 '18', '19', '20', '21', '22', '23', '24')
        joinedDf = joinedDf.checkpoint(eager=True)

    for i in range(1, 25):
        joinedDf = joinedDf.withColumn(joinedDf.columns[i], joinedDf[joinedDf.columns[i]] / fileCount)

    joinedDf1 = joinedDf.checkpoint(eager=True)
    fDf = joinedDf1.join(filteredTrafficLightsDf, filteredTrafficLightsDf.SCAT_SITE_ID == joinedDf1.NB_SCATS_SITE,
                        "inner")

    fDf = fDf.checkpoint(eager=True)
    vf = fDf.withColumn("arrayOfColumns",
                        func.array(fDf['1'], fDf['2'], fDf['3'], fDf['4'], fDf['5'], fDf['6'], fDf['7'], fDf['8'],
                                   fDf['9'], fDf['10'], fDf['11'], fDf['12'], fDf['13'], fDf['14'], fDf['15'],
                                   fDf['16'], fDf['17'], fDf['18'], fDf['19'], fDf['20'], fDf['21'], fDf['22'],
                                   fDf['23'], fDf['24']))
    
    vf = vf.checkpoint(eager=True)
    finalDf = vf.select('NB_SCATS_SITE', 'SCAT_SITE_NAME', 'WKT', "EPA_SITE_ID", "EPA_SITE_NAME",
                        func.posexplode(vf.arrayOfColumns).alias('Range', 'AvgCount'))
    finalDf = finalDf.checkpoint(eager=True)

    # adding date time
    # date will be same for all values in one year with 24 hours values
    todaydate = year+'/01/01 '
    finalDf = finalDf.withColumn('DateTime',
                                func.unix_timestamp(func.concat(func.lit(todaydate), finalDf['Range']), "yyyy/MM/dd HH").cast("timestamp"))

    scatsDf = finalDf.checkpoint(eager=True)
    return scatsDf
