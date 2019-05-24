$(function(){
    let scatsEpaController ={
        loadVisualization: function(){
            let that = this;
            this.map = this.getMap();

            var monitorList = scatsEpaConstants.getMonitorList();
            Object.keys(monitorList).map(function(key) {
                $("#monitorSelect").append("<option value='"+key+"'>" + monitorList[key] + "</option>");
            });

            $('#submitOptionsForScatsEpa').on('click',()=>{
                let monitorId = $("#monitorSelect")[0].value;
                let year = $("#yearSelectForScatsEpa")[0].value;
                let epaStyleForMonitorId = scatsEpaConstants.getstyleForMonitorId(monitorId);
                that.removeAllMapLayers(that.map);
                that.addEpaLayer(year, monitorId);

                // that.addScatsLayer(year);
            });
        },

        getMap: function () {
            var map = L.map('scatsEpaMapid', {
                zoom: 12,
                fullscreenControl: true,
                timeDimension: true,
                timeDimensionControl: true,
                timeDimensionOptions: {
                    timeInterval: "2018-01-01T00:00:00.0Z/2018-01-01T23:59:59.999Z",
                    period: "PT1H"
                },
                center: [-37.814, 144.96332],
            });
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
            }).addTo(map);

            return map;
        },

        removeMapLayer: function (layerGroup) {
            if (layerGroup !== undefined) {
                this.map.removeLayer(layerGroup);
            }
        },

        removeAllMapLayers: function(map){
            map.eachLayer(layer=>{
                if(layer.options.id !== 'mapbox.streets') {
                    map.removeLayer(layer);
                }
            });
        },

        addLayerToMap: function (layer) {
            layer.addTo(this.map);
        },

        addEpaLayer: function(year, monitorId) {

            let proxy = 'server/proxy.php';
            let WMSUrl = "http://45.113.234.120:8080/geoserver/airpollution/wms/";
            let wmsEPALayer  = L.tileLayer.wms(WMSUrl, {
                cql_filter: "monitorId='" + monitorId +"'",
                layers: 'airpollution:epa_2014',
                styles: 'EPAStyleCircle'+monitorId,
                // styles: 'EpaStyle',
                format: 'image/png',
                transparent: true
            });

            var wmsTimeLayer = L.timeDimension.layer.wms(wmsEPALayer, {
                updateTimeDimension: true,
                msVersion: '1.1.0',
                proxy: proxy
            });
            this.addLayerToMap(wmsTimeLayer);
        },

        addScatsLayer: function(year) {

            let proxy = 'server/proxy.php';
            let WMSUrl = "http://45.113.234.120:8080/geoserver/airpollution/wms/";

            let wmsScatsLayer  = L.tileLayer.wms(WMSUrl, {
                layers: 'airpollution:ScatsDateTime',
                format: 'image/png',
                transparent: true
            });

            var wmsScatsTimeLayer = L.timeDimension.layer.wms(wmsScatsLayer, {
                msVersion: '1.1.0',
                proxy: proxy
            });

            this.addLayerToMap(wmsScatsTimeLayer);
        }

    };

    let scatsEpaConstants = {
        getMonitorList: function() {
            var monitorList = {
                'BPM2.5': 'Particles as PM2.5',
                'CO': 'Carbon Monoxide',
                'NO2': 'Nitrogen Dioxide',
                'O3': 'Ozone',
                'PM10': 'Particles as PM10',
                'SO2': 'Sulfur Dioxide',
                'API': 'Visibility Reduction',
                'sp_AQI': 'Air Quality Index Summary'
            };
            return monitorList;
        },

        getstyleForMonitorId: function(monitorId) {
            var epaStyles = {
                'BPM2.5': 'epaStyle_BPM2.5',
                'CO': 'epaStyle_CO',
                'NO2': 'Nitrogen Dioxide',
                'O3': 'Ozone',
                'PM10': 'Particles as PM10',
                'SO2': 'Sulfur Dioxide',
                'API': 'Visibility Reduction',
                'sp_AQI': 'Air Quality Index Summary'
            }
        }
    };
    if(window.location.pathname === '/visualization' && window.location.search === '?type=scats') {
        console.log('scats');
        scatsEpaController.loadVisualization();
    }

});

