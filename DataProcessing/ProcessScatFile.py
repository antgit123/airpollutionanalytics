from pyspark.sql.functions import when

def calcNoOfTrafficPerHr(sqlContext, df,trafficSite):
    sqlContext.clearCache()
    # Replace negative and blank values with 0
    for col in df.columns:
        df = df.withColumn(col, when(df[col] > 0, df[col]).otherwise(0))

    df1 = df.checkpoint(eager=True)
    # Extract only NB_SCATS_SITE and V00 -- V95
    result = [i for i in df1.columns if i.startswith('V')]
    result.append('NB_SCATS_SITE')
    df2 = df1.select(result)

    # Filter data within EPA sites
    df3 = df2.join(trafficSite, trafficSite.SCAT_SITE_ID == df2.NB_SCATS_SITE, 'inner').checkpoint(eager=True)

   # Sum the values on hourly basis
    i = 0
    count = 0
    initialCount = len(df3.columns) - 4
    while i < initialCount:
        count = count + 1
        df3 = df3.withColumn("sum_" + str(count),
                           df3[df3.columns[i + 0]] + df3[df3.columns[i + 1]] + df3[df3.columns[i + 2]] + df3[
                               df3.columns[i + 3]])
        i = i + 4
    df3 = df3.checkpoint(eager=True)
    # Group by NB_SCATS_SITE and sum the value
    df4 = df3.groupBy("NB_SCATS_SITE").sum('sum_1', 'sum_2', 'sum_3', 'sum_4', 'sum_5', 'sum_6',
                                          'sum_7', 'sum_8', 'sum_9', 'sum_10', 'sum_11', 'sum_12',
                                          'sum_13', 'sum_14', 'sum_15', 'sum_16', 'sum_17', 'sum_18',
                                          'sum_19', 'sum_20', 'sum_21', 'sum_22', 'sum_23', 'sum_24')

    df4 = df4.checkpoint(eager=True)
    df5 = df4.toDF('NB_SCATS_SITE', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15',
                       '16', '17',
                       '18', '19', '20', '21', '22', '23', '24')

    sqlContext.clearCache()
    df5 = df5.checkpoint(eager=True)
    return df5
