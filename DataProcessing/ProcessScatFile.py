from pyspark.sql.functions import when


def calcNoOfTrafficPerHr(df,trafficSite):
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

    df2 = df2.toDF('NB_SCATS_SITE', '00:00 - 00:59', '01:00 - 01:59', '02:00 - 02:59', '03:00 - 03:59',
                                             '04:00 - 04:59', '05:00 - 05:59', '06:00 - 06:59', '07:00 - 07:59',
                                             '08:00 - 08:59',
                                             '09:00 - 09:59', '10:00 - 10:59', '11:00 - 11:59', '12:00 - 12:59',
                                             '13:00 - 13:59',
                                             '14:00 - 14:59', '15:00 - 15:59', '16:00 - 16:59', '17:00 - 17:59',
                                             '18:00 - 18:59',
                                             '19:00 - 19:59', '20:00 - 20:59', '21:00 - 21:59', '22:00 - 22:59',
                                             '23:00 - 23:59')

    return df2
