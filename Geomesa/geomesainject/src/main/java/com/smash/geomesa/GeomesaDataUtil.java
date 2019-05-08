package com.smash.geomesa;

import org.geotools.data.DataStore;
import org.geotools.data.DataStoreFinder;
import org.geotools.data.Query;
import org.geotools.data.simple.SimpleFeatureIterator;
import org.geotools.data.simple.SimpleFeatureSource;
import org.geotools.geometry.jts.ReferencedEnvelope;
import org.locationtech.geomesa.index.conf.QueryHints;

import java.io.IOException;
import java.util.ArrayList;
import java.util.NoSuchElementException;
import org.opengis.feature.simple.SimpleFeature;
import org.opengis.feature.simple.SimpleFeatureType;

public class GeomesaDataUtil {
    public static void saveFeatureType(GeomesaOptions options, SimpleFeatureType sft) throws IOException {
        DataStore dataStore = DataStoreFinder.getDataStore(options.getAccumuloOptions());
        // Remove feature type with the same name if allow overwrite
        if (options.overwrite && dataStore.getSchema(sft.getTypeName()) != null) {
            dataStore.removeSchema(sft.getTypeName());
        }
        // Save sft to store/db if stf with the same name does not exit
        if (dataStore.getSchema(sft.getTypeName()) == null) {
            dataStore.createSchema(sft);
        }
    }

    public static ReferencedEnvelope getBoundingBox(GeomesaOptions options, Query query) throws IOException {
        DataStore dataStore = DataStoreFinder.getDataStore(options.getAccumuloOptions());
        SimpleFeatureSource dataSource = dataStore.getFeatureSource(query.getTypeName());
        ReferencedEnvelope envelope;
        envelope = query == null ? dataSource.getBounds() : dataSource.getBounds(query);
        return envelope;
    }

//  public static int getNumOfFeatures(GeoMesaOptions options, Query query) throws IOException {
//    DataStore dataStore = DataStoreFinder.getDataStore(options.getAccumuloOptions());
//    SimpleFeatureSource dataSource = dataStore.getFeatureSource(query.getTypeName());
//    SimpleFeatureIterator itr = dataSource.getFeatures(query).features();
//    int count = 0;
//    try {
//      while (itr.hasNext()) {
//        SimpleFeature sf = itr.next();
//        System.out.println(sf);
//        count++;
//      }
//    } finally {
//      itr.close();
//    }
//    return count;
//  }

    public static ArrayList<SimpleFeature> getFeatures(GeomesaOptions options, Query query) throws IOException {
        ArrayList<SimpleFeature> list = new ArrayList<>();
        DataStore dataStore = DataStoreFinder.getDataStore(options.getAccumuloOptions());
//    FeatureReader<SimpleFeatureType, SimpleFeature> reader = dataStore.getFeatureReader(query, Transaction.);
        SimpleFeatureSource dataSource = dataStore.getFeatureSource(query.getTypeName());
        SimpleFeatureIterator itr = dataSource.getFeatures(query).features();
        try {
            while (itr.hasNext()) {
                SimpleFeature sf = itr.next();
                list.add(sf);
            }
        } finally {
            itr.close();
        }
        dataStore = null;
        dataSource = null;
        itr = null;
//    System.gc();
        return list;
    }

    public static int getNumOfFeatures(GeomesaOptions options, Query query) throws IOException {
        query.getHints().put(QueryHints.EXACT_COUNT(), Boolean.TRUE);
        DataStore dataStore = DataStoreFinder.getDataStore(options.getAccumuloOptions());

//    FeatureReader<SimpleFeatureType, SimpleFeature> reader = dataStore.getFeatureReader(query, Transaction.AUTO_COMMIT);
        SimpleFeatureSource dataSource = dataStore.getFeatureSource(query.getTypeName());
        int count = 0;
        try{
            count = dataSource.getCount(query);
        } catch (NoSuchElementException e){
            e.printStackTrace();
        }
        if (count<0)
            count = 0;

        return count;
//    return dataSource.getCount(query);
    }

    public static int getNumOfFeatures(SimpleFeatureSource dataSource, Query query) throws IOException {
        query.getHints().put(QueryHints.EXACT_COUNT(), Boolean.TRUE);
        int count = 0;
        try{
            count = dataSource.getCount(query);
        } catch (NoSuchElementException e){
            e.printStackTrace();
        }
        if (count<0)
            count = 0;

        return count;
//    return dataSource.getCount(query);
    }
}

