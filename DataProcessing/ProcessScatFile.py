from pyspark.sql.functions import when


def calcNoOfTrafficPerHr(df, concatenatedDf, trafficSite):
    # Replace negative and blank values with 0
    for col in df.columns:
        df = df.withColumn(col, when(df[col] > 0, df[col]).otherwise(0))

    # Extract only NB_SCATS_SITE and V00 -- V95
    result = [i for i in df.columns if i.startswith('V')]
    result.append('NB_SCATS_SITE')
    df = df.select(result)

    # Filter data within EPA sites
    df = df.join(trafficSite, trafficSite.SCAT_SITE_ID == df.NB_SCATS_SITE, 'inner')

    # Sum the values on hourly basis
    i = 0
    count = 0
    initialCount = len(df.columns) - 4
    while i < initialCount:
        count = count + 1
        df = df.withColumn("sum_" + str(count),
                           df[df.columns[i + 0]] + df[df.columns[i + 1]] + df[df.columns[i + 2]] + df[
                               df.columns[i + 3]])
        i = i + 4

    # Group by NB_SCATS_SITE and sum the value
    df2 = df.groupBy("NB_SCATS_SITE").sum('sum_1', 'sum_2', 'sum_3', 'sum_4', 'sum_5', 'sum_6',
                                          'sum_7', 'sum_8', 'sum_9', 'sum_10', 'sum_11', 'sum_12',
                                          'sum_13', 'sum_14', 'sum_15', 'sum_16', 'sum_17', 'sum_18',
                                          'sum_19', 'sum_20', 'sum_21', 'sum_22', 'sum_23', 'sum_24')

    if concatenatedDf == 0:
        concatenatedDf = df2
    else:
        concatenatedDf = concatenatedDf.union(df2)

    return concatenatedDf
