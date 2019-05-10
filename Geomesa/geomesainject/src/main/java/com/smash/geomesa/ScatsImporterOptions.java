package com.smash.geomesa;

public class ScatsImporterOptions extends GeomesaOptions{
    //@Option(name = "--inputVolumeCSV", required = true,
           // usage = "path to raw volume data for processing")
    public String inputVolumeCSV;

    //@Option(name = "--inputLayoutCSV", required = true,
            //usage = "path to site layout data for processing")
    public String inputLayoutCSV;

    //@Option(name = "--inputPointShapeFile", required = true,
           // usage = "path to points (traffic lights) shape file for processing")
    public String inputPointShapeFile;

    //usage = "path to lines (road network) shape file for processing")
    public String inputLineShapeFile;

    //@Option(name = "--hdfsURL", required = true,
            //usage = "url to hdfs")
    public String hdfsURL = "hdfs://localhost:9000/data/ProcessedScatsDataForGeomesa.csv";
}
