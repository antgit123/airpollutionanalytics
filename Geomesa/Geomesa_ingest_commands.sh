#!/usr/bin/env bash

geomesa-accumulo create-schema -c trafficLights -f scats2014 -s NB_SCATS_SITE:Integer:index=true,SCAT_SITE_NAME:Integer,WKT:Point:srid=4326,EPA_SITE:String,EPA_SITE_NAME:String,Range:Integer:index=true,AvgCount:Double,DateTime:Date -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f scats2015 -s NB_SCATS_SITE:Integer:index=true,SCAT_SITE_NAME:Integer,WKT:Point:srid=4326,EPA_SITE:String,EPA_SITE_NAME:String,Range:Integer:index=true,AvgCount:Double,DateTime:Date -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f scats2016 -s NB_SCATS_SITE:Integer:index=true,SCAT_SITE_NAME:Integer,WKT:Point:srid=4326,EPA_SITE:String,EPA_SITE_NAME:String,Range:Integer:index=true,AvgCount:Double,DateTime:Date -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f scats2017 -s NB_SCATS_SITE:Integer:index=true,SCAT_SITE_NAME:Integer,WKT:Point:srid=4326,EPA_SITE:String,EPA_SITE_NAME:String,Range:Integer:index=true,AvgCount:Double,DateTime:Date -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f scats2018 -s NB_SCATS_SITE:Integer:index=true,SCAT_SITE_NAME:Integer,WKT:Point:srid=4326,EPA_SITE:String,EPA_SITE_NAME:String,Range:Integer:index=true,AvgCount:Double,DateTime:Date -u root -p smash
 
 
geomesa-accumulo ingest -u root -p smash -c trafficLights -f scats2018 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C scats_csv hdfs://45.113.232.133:9000/Scats/DateTime2018/part-00000-239bab31-0c03-4e24-90c6-70b895c14fe7.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f scats2017 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C scats_csv hdfs://45.113.232.133:9000/Scats/DateTime2017/part-00000-15cc6e75-4d53-4949-95c7-283f36e2b566.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f scats2016 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C scats_csv hdfs://45.113.232.133:9000/Scats/DateTime2016/part-00000-7a64960a-3788-430a-bacb-dfa4e7f35f99.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f scats2015 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C scats_csv hdfs://45.113.232.133:9000/Scats/DateTime2015/part-00000-7faebc3a-8030-4847-8bac-4a11bfe59d9e.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f scats2014 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C scats_csv hdfs://45.113.232.133:9000/Scats/DateTime2014/part-00000-f1d08aa3-e9d6-4686-93d9-c8d1533482bb.csv


geomesa-accumulo create-schema -c trafficLights -f epa_agi_2014 -s dtg:Date,latitude:Double,longitude:Double,siteId:String:index=true,siteName:String,agiIndex:Double,wkt:Point:srid=4326 -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f epa_agi_2015 -s dtg:Date,latitude:Double,longitude:Double,siteId:String:index=true,siteName:String,agiIndex:Double,wkt:Point:srid=4326 -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f epa_agi_2016 -s dtg:Date,latitude:Double,longitude:Double,siteId:String:index=true,siteName:String,agiIndex:Double,wkt:Point:srid=4326 -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f epa_agi_2017 -s dtg:Date,latitude:Double,longitude:Double,siteId:String:index=true,siteName:String,agiIndex:Double,wkt:Point:srid=4326 -u root -p smash

geomesa-accumulo create-schema -c trafficLights -f epa_agi_2018 -s dtg:Date,latitude:Double,longitude:Double,siteId:String:index=true,siteName:String,agiIndex:Double,wkt:Point:srid=4326 -u root -p smash
 
 
geomesa-accumulo ingest -u root -p smash -c trafficLights -f epa_agi_2014 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C epa_csv hdfs://45.113.232.133:9000/EPA2014/part-00000-a9d8d87d-58e3-474e-886a-6f8f84a1ef5c.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f epa_agi_2015 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C epa_csv hdfs://45.113.232.133:9000/EPA2015/part-00000-0683ca9e-09f2-4978-b401-8a7bec442838.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f epa_agi_2016 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C epa_csv hdfs://45.113.232.133:9000/EPA2016/part-00000-ec266ea6-ca00-44c3-9447-e2c1725249cf.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f epa_agi_2017 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C epa_csv hdfs://45.113.232.133:9000/EPA2017/part-00000-442aa59d-92e0-4184-be19-0dfaf3809df7.csv

geomesa-accumulo ingest -u root -p smash -c trafficLights -f epa_agi_2018 -i smash -z smash-1-master:2181 --run-mode local --input-format csv -C epa_csv hdfs://45.113.232.133:9000/EPA2018/part-00000-8bb1d835-86dc-4331-9659-855319220fb0.csv





