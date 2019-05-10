package com.smash.geomesa;

import java.text.DateFormat;
import java.util.Date;

public class ScatsVolume {
    private String nb_scats_site;
    private String scats_site_name;
//    private Date qt_interval_count;
//    private String day_of_week;
    private Integer range;
    private Integer avgCount;

    private String geoPointString;
    private String geoLineString;

    public ScatsVolume() {
    }

    public String getScats_site_name() {
        return scats_site_name;
    }

    public void setScats_site_name(String scats_site_name) {
        this.scats_site_name = scats_site_name;
    }

    public Integer getRange() {
        return range;
    }

    public void setRange(Integer range) {
        this.range = range;
    }

    public Integer getAvgCount() {
        return avgCount;
    }

    public void setAvgCount(Integer avgCount) {
        this.avgCount = avgCount;
    }

    public String getNb_scats_site() {
        return nb_scats_site;
    }

    public void setNb_scats_site(String nb_scats_site) {
        this.nb_scats_site = nb_scats_site;
    }

//    public String getNb_detector() {
//        return nb_detector;
//    }
//
//    public void setNb_detector(String nb_detector) {
//        this.nb_detector = nb_detector;
//    }
//
//    public Date getQt_interval_count() {
//        return qt_interval_count;
//    }
//
//    public void setQt_interval_count(Date qt_interval_count) {
//        this.qt_interval_count = qt_interval_count;
//    }
//
//    public String getDay_of_week() {
//        return day_of_week;
//    }
//
//    public void setDay_of_week(String day_of_week) {
//        this.day_of_week = day_of_week;
//    }
//
//    public Integer getVolume() {
//        return volume;
//    }
//
//    public void setVolume(Integer volume) {
//        this.volume = volume;
//    }

    public String getGeoPointString() {
        return geoPointString;
    }

    public void setGeoPointString(String geoPointString) {
        this.geoPointString = geoPointString;
    }

    public String getGeoLineString() {
        return geoLineString;
    }

    public void setGeoLineString(String geoLineString) {
        this.geoLineString = geoLineString;
    }

    @Override
    public String toString() {
        return "ScatsVolume{" +
                "nb_scats_site='" + nb_scats_site + '\'' +
                ", scats_site_name='" + scats_site_name + '\'' +
                ", range=" + range +
                ", avgCount=" + avgCount +
                ", geoPointString='" + geoPointString + '\'' +
                ", geoLineString='" + geoLineString + '\'' +
                '}';
    }
}

