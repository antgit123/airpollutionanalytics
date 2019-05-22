import ProcessScatFile
import subprocess
import pyspark.sql.functions as func

def processScatsFiles(sqlContext, filteredTrafficLightsDf, volume_data_filepath):
    argsls = "hdfs dfs -ls -C " + volume_data_filepath
    proc = subprocess.Popen(argsls, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    s_output = proc.communicate()
    names = s_output[0].decode("utf-8")
    files = names.split("\r\n")
    while "" in files:
        files.remove("")

    joinedDf = 0
    concatenatedDf = 0
    fileCount = 0
    for file in files:
        fileCount = fileCount + 1
        volumeFile = sqlContext.read.csv(file, header=True)
        processedDf = ProcessScatFile.calcNoOfTrafficPerHr(sqlContext, volumeFile, filteredTrafficLightsDf)
        processedDfForAgg = processedDf.drop('date');
        # processedDfForAgg.checkpoint(eager=True)
        if joinedDf == 0:
            joinedDf = processedDfForAgg
            concatenatedDf = processedDf
        else:
            joinedDf = joinedDf.union(processedDfForAgg)
            concatenatedDf = concatenatedDf.union(processedDf)
        # concatenatedDf = concatenatedDf.checkpoint(eager=True)

        processedDf = 0
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

    #Perform exploding of union of 365 data:
    fyDf = concatenatedDf.join(filteredTrafficLightsDf, filteredTrafficLightsDf.SCAT_SITE_ID == concatenatedDf.NB_SCATS_SITE,
                         "inner")

    # fyDf = fullyrDf.checkpoint(eager=True)
    fyvf = fyDf.withColumn("arrayOfColumns",
                        func.array(fyDf['1'], fyDf['2'], fyDf['3'], fyDf['4'], fyDf['5'], fyDf['6'], fyDf['7'], fyDf['8'],
                                   fyDf['9'], fyDf['10'], fyDf['11'], fyDf['12'], fyDf['13'], fyDf['14'], fyDf['15'],
                                   fyDf['16'], fyDf['17'], fyDf['18'], fyDf['19'], fyDf['20'], fyDf['21'], fyDf['22'],
                                   fyDf['23'], fyDf['24']))

    # fyvf = fyvf.checkpoint(eager=True)

    fullYrFinalDf = fyvf.select('NB_SCATS_SITE', 'SCAT_SITE_NAME', 'WKT', 'date',
                        func.posexplode(fyvf.arrayOfColumns).alias('Range', 'AvgCount'))
    # fullYrFinalDf = fullYrFinalDf.checkpoint(eager=True)


    fullYrFinalDf = fullYrFinalDf.withColumn('DateTime',
                                 func.to_timestamp(func.concat(fullYrFinalDf['date'], fullYrFinalDf['Range']), "yyyy-MM-dd HH"))
    fullYrFinalDf = fullYrFinalDf.checkpoint(eager=True)

    fullyrProcessedDataPath = "hdfs://45.113.232.133:9000/ProcessedFullYr2018"
    fullYrFinalDf.coalesce(1).write.format("com.databricks.spark.csv").mode("overwrite").option("header", "true").save(
        fullyrProcessedDataPath)

    #Perform exploding of aggrgated data
    fDf = joinedDf1.join(filteredTrafficLightsDf, filteredTrafficLightsDf.SCAT_SITE_ID == joinedDf1.NB_SCATS_SITE,
                         "inner")

    # fDf = fDf.checkpoint(eager=True)
    vf = fDf.withColumn("arrayOfColumns",
                        func.array(fDf['1'], fDf['2'], fDf['3'], fDf['4'], fDf['5'], fDf['6'], fDf['7'], fDf['8'],
                                   fDf['9'], fDf['10'], fDf['11'], fDf['12'], fDf['13'], fDf['14'], fDf['15'],
                                   fDf['16'], fDf['17'], fDf['18'], fDf['19'], fDf['20'], fDf['21'], fDf['22'],
                                   fDf['23'], fDf['24']))
    
    # vf = vf.checkpoint(eager=True)
    finalDf = vf.select('NB_SCATS_SITE', 'SCAT_SITE_NAME', 'WKT',
                        func.posexplode(vf.arrayOfColumns).alias('Range', 'AvgCount'))
    finalDf = finalDf.checkpoint(eager=True)

    todaydate = '2018/01/01 '
    finalDf = finalDf.withColumn('DateTime',
                                 func.to_timestamp(func.concat(func.lit(todaydate), finalDf['Range']), "yyyy/MM/dd HH"))
    scatsDf = finalDf.checkpoint(eager=True)
    return scatsDf
