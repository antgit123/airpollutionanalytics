$(function(){
    let scatsEpaController ={
        loadVisualization: function(){
            let that = this;
            this.map = this.getMap();

            $('#submitOptionsForScatsEpa').on('click',()=>{
                let year = $("#yearSelectForScatsEpa")[0].value;
                that.removeAllMapLayers(that.map);
                that.updateTimeOptions(that.map, year);
                that.addEpaLayer(year);
                that.addScatsLayer(year);
                $.ajax({
                    type: "GET",
                    url: '/visualization/getEPAAirIndexData/?year=' + year,
                    contentType: 'application/json',
                    success: function (response, body) {
                        if (response) {
                            that.createStationLayerGroup(response.data);
                        }
                    },
                    error: function () {
                        that.showModal("Request Error", "Unable to retrieve data");
                    }
                });
            });
        },

        updateTimeOptions: function(map, year) {
            var testoptions = {
                timeInterval: year+'-01-01T00:00:00.0Z/' + year + '-01-01T23:59:59.999Z',
                period: "PT1H"
            };
            map.timeDimension.initialize(testoptions)
        },

        getMap: function () {
            var map = L.map('scatsEpaMapid', {
                zoom: 12,
                fullscreenControl: true,
                timeDimension: true,
                timeDimensionControl: true,
                timeDimensionOptions: {
                    timeInterval: '2018-01-01T00:00:00.0Z/2018-01-01T23:59:59.999Z',
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

        addEpaLayer: function(year) {

            let proxy = 'server/proxy.php';
            let WMSUrl = "http://45.113.234.120:8080/geoserver/airpollution/wms/";
            let wmsEPALayer  = L.tileLayer.wms(WMSUrl, {
                layers: 'airpollution:epa_agi_' + year,
                format: 'image/png',
                styles: 'EPAStyleCircleBPM2.5',
                transparent: true
            });

            var wmsTimeLayer = L.timeDimension.layer.wms(wmsEPALayer, {
                msVersion: '1.1.0',
                proxy: proxy
            });
            this.addLayerToMap(wmsTimeLayer);
        },

        addScatsLayer: function(year) {

            let proxy = 'server/proxy.php';
            let WMSUrl = "http://45.113.234.120:8080/geoserver/airpollution/wms/";

            let wmsScatsLayer  = L.tileLayer.wms(WMSUrl, {
                layers: 'airpollution:scats'+year,
                format: 'image/png',
                transparent: true
            });

            var wmsScatsTimeLayer = L.timeDimension.layer.wms(wmsScatsLayer, {
                msVersion: '1.1.0',
                proxy: proxy
            });

            this.addLayerToMap(wmsScatsTimeLayer);
        },

        createStationLayerGroup: function (stations) {
            stations.forEach(station =>{
                let latitude = station['latitude'];
                let longitude = station['longitude'];

                let info = "<b>Station Name" + ":</b>" + station["siteName"] + "</br>" +
                    "<b>Air Quality Index</b> "+ station["agiIndex"].toFixed(2);
                let circlemarker = L.circle([latitude,longitude],{
                    radius: 2000,
                    stroke: true,
                    color: '#ffffff00',
                    fill: true
                    }
                ).addTo(this.map).bindPopup(info);

                circlemarker.featureInfo = station;
                circlemarker.on('click', function(e) {
                    alert(e.target.featureInfo);
                });
                circlemarker.on('mouseover',function(ev) {
                    circlemarker.openPopup();
                });
            });
        }
    };

    if(window.location.pathname === '/visualization' && window.location.search === '?type=scats') {
        console.log('scats');
        scatsEpaController.loadVisualization();
    }
});

