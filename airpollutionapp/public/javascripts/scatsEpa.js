$(function(){
    let scatsEpaController ={
        loadVisualization: function(){
            let that = this;
            this.map = this.getMap();

            $('#submitOptionsForScatsEpa').on('click',()=>{
                that.year = $("#yearSelectForScatsEpa")[0].value;
                that.removeAllMapLayers(that.map);
                that.updateTimeOptions(that.map, that.year);
                that.addEpaLayer(that.year);
                that.addScatsLayer(that.year);
                if(!that.legendEpaAdded){
                    that.addLegendEpa();
                }
                that.legendEpaAdded = true;
                if(!that.legendScatsAdded){
                    that.addLegendScats();
                }
                that.legendScatsAdded = true;
                $.ajax({
                    type: "GET",
                    url: '/visualization/getEPAAirIndexData?year=' + that.year,
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

            this.legendEpaAdded = false;
            this.legendScatsAdded = false;
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
            let that = this;
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
                    that.showChartView(e.target.featureInfo);
                });
                circlemarker.on('mouseover',function(ev) {
                    circlemarker.openPopup();
                });
            });
        },
        showChartView: function(featureInfo) {
            let that = this;
            let siteId = featureInfo.siteId;
            that.chartData = {};
            $.ajax({
                type: "GET",
                url: '/visualization/getChartData?year=' + that.year + '?siteId=' + siteId,
                contentType: 'application/json',
                success: function (response, body) {
                    if (response) {
                        that.processChartData(response);
                        that.showParticleConcChart();
                    }
                },
                error: function () {
                    that.showModal("Request Error", "Unable to retrieve data");
                }
            });
        },

        processChartData: function(data) {
          let that = this;
          that.currentYrEmissionData = data['EPA' + that.year + 'MeasurementsCollection'];
          let collection = data['ScatsEPA' + that.year + 'Collection'];
          that.currentYrScatsData = collection.sort(function(a,b){
              return new Date(a.DateTime) - new Date(b.DateTime);
          });
          that.timeAxis = [];
          that.currentYrEmissionData.forEach(function(emmisionData) {
              emmisionData.hourlyData = emmisionData.hourlyData.sort(function (a, b) {
                  return new Date('1970/01/01 ' + a.key) - new Date('1970/01/01 ' + b.key);
              });
          });
          that.currentYrEmissionData[0]['hourlyData'].forEach(hourData => {
            that.timeAxis.push(hourData.key);
        });
        },
        showParticleConcChart: function(){
            let that = this;
            let o3particleConcValue = [];
            let coParticleConcValue = [];
            let no2ParticleConcValue = [];
            let bpm25ParticleConcValue = [];
            let pm10ParticleConcValue = [];
            let scatsData = that.currentYrScatsData.map(a => a['sum(count)']);

            that.currentYrEmissionData.forEach(function(valuePerMonitorId) {
                if(valuePerMonitorId.monitorId == 'CO') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        coParticleConcValue.push(hourData['avg_conc_value']);
                    });
                }
                if(valuePerMonitorId.monitorId == 'NO2') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        no2ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                }
                if(valuePerMonitorId.monitorId == 'BPM2.5') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        bpm25ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                }
                if(valuePerMonitorId.monitorId == 'PM10') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        pm10ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                }
                if(valuePerMonitorId.monitorId == 'O3') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        o3particleConcValue.push(hourData['avg_conc_value']);
                    });
                }
            });

            let epaCOTrace = {
                x: that.timeAxis,
                y: coParticleConcValue,
                name: 'Carbon monoxide (ppm)',
                type: 'scatter',
                marker: {
                    color: "#daf7a6",
                }
            };

            let epano2Trace = {
                x: that.timeAxis,
                y: no2ParticleConcValue,
                name: 'Nitrogen Dioxide (ppb)',
                type: 'scatter',
                marker: {
                    color: "#ffc300",
                }
            };

            let epaO3Trace = {
                x: that.timeAxis,
                y: o3particleConcValue,
                name: 'Ozone (ppb)',
                type: 'scatter',
                marker: {
                    color: "#ff5733",
                }
            };

            let epabpm25Trace = {
                x: that.timeAxis,
                y: bpm25ParticleConcValue,
                name: 'PM 2.5 particles (µ/m3)',
                type: 'scatter',
                marker: {
                    color: "#c70039",
                }
            };

            let epabpm10Trace = {
                x: that.timeAxis,
                y: pm10ParticleConcValue,
                name: 'PM 10 particles (µ/m3)',
                type: 'scatter',
                marker: {
                    color: "#581845",
                }
            };

            let scatsTrace = {
                x: that.timeAxis,
                y: scatsData,
                name: 'Traffic volume in that region',
                yaxis: 'y2',
                type: 'scatter',
                marker: {
                    color: "#82adf6",
                }
            };

            let trendData = [epaCOTrace, epano2Trace,epaO3Trace,epabpm25Trace,epabpm10Trace,scatsTrace];
            let layout = {
                title: "EPA Vs SCATS Chart",
                yaxis: {title: 'Total emission quantity'},
                yaxis2: {
                    title: 'Traffic volume count',
                    titlefont: {color: 'rgb(148, 103, 189)'},
                    tickfont: {color: 'rgb(148, 103, 189)'},
                    overlaying: 'y',
                    side: 'right'
                }
            };
            Plotly.newPlot('coChartView', trendData,layout);
            $('#charts-container').show();
        },


        addLegendEpa: function () {
            let that = this;
            this.legend = L.control({position: 'bottomright'});
            this.legend.onAdd = function (map) {
                let div = L.DomUtil.create('div', 'info legend');

                div.innerHTML =
                    '&nbsp &nbsp &nbsp &nbsp &nbsp &nbsp &nbsp EPA <br>' +
                    '<i style="background:#349966"></i> ' +
                    'Very Good (0 - 33) <br>'+
                    '<i style="background:#359AFF"></i> ' +
                    'Good (34 - 66) <br>' +
                    '<i style="background:#FFFF00"></i> ' +
                    'Fair (67 - 99) <br>' +
                    '<i style="background:#FF0000"></i> ' +
                    'Poor (100 - 149) <br>' +
                    '<i style="background:#000000"></i> ' +
                    'Very Poor (150+) <br>';
                return div;
            };
            this.legend.addTo(this.map);
        },


        addLegendScats: function () {
            let that = this;
            this.legend = L.control({position: 'bottomright'});
            this.legend.onAdd = function (map) {
                let div = L.DomUtil.create('div', 'info legend');

                div.innerHTML =
                    '&nbsp &nbsp &nbsp &nbsp &nbsp &nbsp &nbsp Scats <br>' +
                    '<i style="background:#349966"></i> ' +
                    'Very Less (0 - 1829) <br>'+
                    '<i style="background:#359AFF"></i> ' +
                    'Less (1830 - 3659) <br>' +
                    '<i style="background:#FFFF00"></i> ' +
                    'Medium (3660 - 5489) <br>' +
                    '<i style="background:#FF0000"></i> ' +
                    'High (5490 - 7319) <br>' +
                    '<i style="background:#000000"></i> ' +
                    'Very High (7320+) <br>';
                return div;
            };
            this.legend.addTo(this.map);
        }
    };

    if(window.location.pathname === '/visualization' && window.location.search === '?type=scats') {
        console.log('scats');
        scatsEpaController.loadVisualization();
    }
});

