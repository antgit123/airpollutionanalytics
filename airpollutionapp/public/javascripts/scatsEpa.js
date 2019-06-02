$(function(){
    let scatsEpaController ={
        loadVisualization: function(){
            let that = this;
            this.map = this.getMap();
            that.year = 2018; //Setting the initial year to 2018
            that.initializeMap();

            $('#yearSelect').on('change', function(){
                that.year = $("#yearSelect")[0].value;
                that.initializeMap();
            });

            $('#goToHome').on('click', () => {
                window.location.href = '/';
            });
        },

        initializeMap: function() {
            var that = this;
            this.reInitializeCharts();
            this.removeAllMapLayers(this.map);
            this.updateTimeOptions(this.map, this.year);
            this.addEpaLayer(this.year);
            this.addScatsLayer(this.year);
            if(!this.legendEpaAdded){
                this.addLegendEpa();
            }
            this.legendEpaAdded = true;
            if(!this.legendScatsAdded){
                this.addLegendScats();
            }
            this.legendScatsAdded = true;
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

        },

        updateTimeOptions: function(map, year) {
            var testoptions = {
                timeInterval: year+'-01-01T00:00:00.0Z/' + year + '-01-01T23:59:59.999Z',
                period: "PT1H",
                currentTime: Date.parse(year+"-01-01T00:00:00.0Z")
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
                    period: "PT1H",
                    currentTime: Date.parse("2018-01-01T00:00:00.0Z")
                },
                center: [-37.814, 144.96332],
            });
            this.info = L.control();

            this.yearSelection = L.control();

            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
            }).addTo(map);

            this.legendEpaAdded = false;
            this.legendScatsAdded = false;
            this.yearSelection.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
                this._div.innerHTML = "<div class = 'form-control'>Select Year  " +
                    "<select id='yearSelect'>" +
                        "<option value='2014'>2014</option>" +
                        "<option value='2015'>2015</option>" +
                        "<option value='2016'>2016</option>" +
                        "<option value='2017'>2017</option>" +
                        "<option selected value='2018'>2018</option>" +
                    "</select></div>";
                return this._div;
            };


            this.yearSelection.addTo(map);
            return map;
        },

        reInitializeCharts: function() {
            let that = this;
            if(this.chartsContainer){
                $(this.chartsContainer).hide()
            }

            this.timeAxis = [];
            this.currentYrEPAParticleConcData = [];
            let yrs = ['2014', '2015', '2016', '2017', '2018'];
            yrs.forEach(year => {
                that[year + 'ScatsData'] = [];
                that[year + 'EpaAqiIndexData'] = [];
            });

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
                proxy: proxy
            });

            this.addLayerToMap(wmsScatsTimeLayer);
        },

        createStationLayerGroup: function (stations) {
            let that = this;
            stations.forEach(station =>{
                let latitude = station['latitude'];
                let longitude = station['longitude'];

                let info = "<b>Station Name" + ":</b>" + station["siteName"];
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
                circlemarker.on('mouseout', function(ev){
                    circlemarker.openPopup();
                });
            });
        },
        showChartView: function(featureInfo) {
            let that = this;
            let siteId = featureInfo.siteId;
            let currentTime = new Date(this.map.timeDimension.getCurrentTime()).toISOString();

            $.ajax({
                type: "GET",
                url: '/visualization/getChartData?year=' + that.year + '?siteId=' + siteId,
                contentType: 'application/json',
                success: function (response, body) {
                    if (response) {

                        $('#chartTitle').text('Visualization Charts - ' + featureInfo.siteName);
                        that.processChartData(response);
                        that.showParticleConcChart();
                        that.showEPAWindScatsChart();
                        that.showScatsTrendsChart();
                        that.showEPAAqiIndexTrendChart();
                    }
                },
                error: function () {
                    that.showModal("Request Error", "Unable to retrieve data");
                }
            });

            //Ajax call to get the epaAirindex and scats data at that time
            $.ajax({
                type: "GET",
                url: '/visualization/getAQIScatsDataPerTime?year=' + that.year + '?time=' + currentTime,
                contentType: 'application/json',
                success: function (response, body) {
                    if (response) {
                        that.showEPAScatsBarChart(response);
                    }
                },
                error: function () {
                    that.showModal("Request Error", "Unable to retrieve data");
                }
            });
        },

        showEPAScatsBarChart: function(data) {
            let epaAqiCollection = data['EPAAirIndex' + this.year + 'Collection'];
            let scatsEpaCollection = data['ScatsEPA' + this.year + 'Collection'];
            let epaAqiIndexArray = [];
            let scatsAggValueArray = [];
            let xAxis = [];

            scatsEpaCollection.forEach(function(scatsEpaObject) {
               epaAqiCollection.forEach(function(epaAqiObject) {
                   if(scatsEpaObject.Name === epaAqiObject.siteName) {
                       epaAqiIndexArray.push(epaAqiObject.agiIndex);
                       scatsAggValueArray.push(scatsEpaObject['sum(count)']);
                       xAxis.push(epaAqiObject.siteName);
                   }
               });
            });

            let epaAqiIndex = {
                x: xAxis,
                y: epaAqiIndexArray,
                name: 'Air Quality Index',
                type: 'bar',
                marker: {
                    color: "#ffc300",
                }
            };

            let scatsAggValue = {
                x: xAxis,
                y: scatsAggValueArray,
                name: 'Traffic volume',
                type: 'bar',
                marker: {
                    color: "#371bf7",
                }
            };

            let epaTrendData = [epaAqiIndex];
            let scatsTrendData = [scatsAggValue];
            let time = new Date(this.map.timeDimension.getCurrentTime()).getUTCHours();
            time = time > 9 ? time+':00' : '0'+time+':00';

            let layout = {
            title: "AQI across stations at " + time,
            yaxis: {title: 'Air quality index'},
            width: 600
            };
            let scatslayout = {
                title: "Aggregated traffic volume across stations at " + time,
                yaxis: {title: 'Aggregated traffic volume'},
                width: 600
            };
            Plotly.newPlot('AqiPerTimeChartView', epaTrendData,layout, {responsive: true});
            Plotly.newPlot('ScatsPerTimeChartView', scatsTrendData,scatslayout, {responsive: true});
        },

        processChartData: function(data) {
          let that = this;
          that.currentYrEPAParticleConcData = [];
          that.timeAxis = [];
          let yrs = ['2014', '2015', '2016', '2017', '2018'];

          yrs.forEach(year => {
              let collection = data['ScatsEPA' + year + 'Collection'];
              that[year + 'ScatsData'] = collection.sort(function(a,b){
                  return new Date(a.DateTime) - new Date(b.DateTime);
              });

              let AqiIndexcollection = data['EPAAirIndex' + year + 'Collection'];
              that[year + 'EpaAqiIndexData'] = AqiIndexcollection.sort(function(a,b){
                  return new Date(a.dtg) - new Date(b.dtg);
              });
          });

          that.currentYrEPAParticleConcData = data['EPA' + that.year + 'MeasurementsCollection'];
          that.currentYrEPAParticleConcData.forEach(function(emmisionData) {
              emmisionData.hourlyData = emmisionData.hourlyData.sort(function (a, b) {
                  return new Date('1970/01/01 ' + a.key) - new Date('1970/01/01 ' + b.key);
              });
          });

          that.timeAxis = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00', '06:00',
              '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
              '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
              '21:00', '22:00', '23:00', '24:00']
        },

        showParticleConcChart: function(){
            let that = this;
            let o3particleConcValue = [];
            let coParticleConcValue = [];
            let no2ParticleConcValue = [];
            let bpm25ParticleConcValue = [];
            let pm10ParticleConcValue = [];
            let so2ParticleConcValue = [];
            let ipm25ParticleConcValue = [];
            let scatsData = that[that.year + 'ScatsData'].map(a => a['sum(count)']);

            that.currentYrEPAParticleConcData.forEach(function(valuePerMonitorId) {
                if(valuePerMonitorId.monitorId == 'CO') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        coParticleConcValue.push(hourData['avg_conc_value']);
                    });
                } else if(valuePerMonitorId.monitorId == 'NO2') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        no2ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                } else if(valuePerMonitorId.monitorId == 'BPM2.5') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        bpm25ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                } else if(valuePerMonitorId.monitorId == 'PM10') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        pm10ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                } else if(valuePerMonitorId.monitorId == 'O3') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        o3particleConcValue.push(hourData['avg_conc_value']);
                    });
                } else if(valuePerMonitorId.monitorId == 'SO2') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        so2ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                } else if(valuePerMonitorId.monitorId == 'iPM2.5') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        ipm25ParticleConcValue.push(hourData['avg_conc_value']);
                    });
                }

            });

            let epaCOTrace = {
                x: that.timeAxis,
                y: coParticleConcValue,
                name: 'Carbon monoxide (ppm)',
                type: 'scatter',
                marker: {
                    color: "#d6e34d",
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
                y: bpm25ParticleConcValue.length > 0 ? bpm25ParticleConcValue : ipm25ParticleConcValue,
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

            let epaso2Trace = {
                x: that.timeAxis,
                y: so2ParticleConcValue,
                name: 'Sulphur Dioxide (ppb)',
                type: 'scatter',
                marker: {
                    color: "#b7488c",
                }
            };

            let scatsTrace = {
                x: that.timeAxis,
                y: scatsData,
                name: 'Traffic volume count in region',
                yaxis: 'y2',
                type: 'scatter',
                marker: {
                    color: "#371bf7",
                }
            };

            let trendData = [epaCOTrace, epano2Trace,epaO3Trace,epabpm25Trace,epabpm10Trace,epaso2Trace,scatsTrace];
            let layout = {
                title: "EPA Vs SCATS Chart",
                yaxis: {title: 'Total emission quantity'},
                yaxis2: {
                    title: 'Traffic volume',
                    titlefont: {color: 'rgb(148, 103, 189)'},
                    tickfont: {color: 'rgb(148, 103, 189)'},
                    overlaying: 'y',
                    side: 'right'
                },
                width: 1100
            };
            Plotly.newPlot('particleConcChartView', trendData,layout, {responsive: true});

        },

        showEPAWindScatsChart: function() {
            let that = this;
            let windValue = [];
            let scatsData = that[that.year + 'ScatsData'].map(a => a['sum(count)']);
            let aqiData = that[that.year + 'EpaAqiIndexData'].map(a => a['agiIndex']);

            that.currentYrEPAParticleConcData.forEach(function(valuePerMonitorId) {
                if(valuePerMonitorId.monitorId === 'SWS') {
                    valuePerMonitorId['hourlyData'].forEach(hourData => {
                        windValue.push(hourData[Object.keys(hourData)[0]]);
                    });
                }
            });

            let epaAqiTrace = {
                x: that.timeAxis,
                y: aqiData,
                name: 'Air Quality Index',
                type: 'scatter',
                marker: {
                    color: "#c70039",
                }
            };

            let windTrace = {
                x: that.timeAxis,
                y: windValue,
                name: 'Wind speed per hr',
                type: 'scatter',
                yaxis: 'y3',
                marker: {
                    color: "#581845",
                }
            };

            let scatsTrace = {
                x: that.timeAxis,
                y: scatsData,
                name: 'Traffic volume count in that region',
                yaxis: 'y2',
                type: 'scatter',
                marker: {
                    color: "#371bf7",
                }
            };

            let trendData = [epaAqiTrace, windTrace,scatsTrace];
            let layout = {
                title: "AQI vs Scats vs Wind Chart",
                yaxis: {title: 'AQI Value'},
                yaxis2: {
                    title: 'Traffic volume',
                    overlaying: 'y',
                    anchor: 'x',
                    side: 'right'
                },
                yaxis3: {
                    title: 'Wind speed',
                    anchor: 'free',
                    overlaying: 'y',
                    side: 'right',
                    position: 0.85
                },
                width: 1100
            };
            Plotly.newPlot('AqiWindScatsChartView', trendData,layout, {responsive: true});
        },

        showScatsTrendsChart: function() {
            let that = this;
            let scats2014Trace = {
                x: that.timeAxis,
                y: that['2014ScatsData'].map(a => a['sum(count)']),
                name: '2014 Scats data',
                type: 'scatter',
                marker: {
                    color: "#d6e34d",
                }
            };

            let scats2015Trace = {
                x: that.timeAxis,
                y: that['2015ScatsData'].map(a => a['sum(count)']),
                name: '2015 Scats data',
                type: 'scatter',
                marker: {
                    color: "#ffc300",
                }
            };

            let scats2016Trace = {
                x: that.timeAxis,
                y: that['2016ScatsData'].map(a => a['sum(count)']),
                name: '2016 Scats data',
                type: 'scatter',
                marker: {
                    color: "#ff5733",
                }
            };

            let scats2017Trace = {
                x: that.timeAxis,
                y: that['2017ScatsData'].map(a => a['sum(count)']),
                name: '2017 Scats data',
                type: 'scatter',
                marker: {
                    color: "#c70039",
                }
            };

            let scats2018Trace = {
                x: that.timeAxis,
                y: that['2018ScatsData'].map(a => a['sum(count)']),
                name: '2018 Scats data',
                type: 'scatter',
                marker: {
                    color: "#581845",
                }
            };

            let trendData = [scats2014Trace, scats2015Trace, scats2016Trace, scats2017Trace, scats2018Trace];
            let layout = {
                title: "Scats trend Chart",
                yaxis: {title: 'Traffic volume'},
                width: 600
            };
            Plotly.newPlot('scatsTrendChartView', trendData,layout);
        },

        showEPAAqiIndexTrendChart: function() {
            let that = this;
            let epa2014Trace = {
                x: that.timeAxis,
                y: that['2014EpaAqiIndexData'].map(a => a['agiIndex']),
                name: '2014 AQI data',
                type: 'scatter',
                marker: {
                    color: "#d6e34d",
                }
            };

            let epa2015Trace = {
                x: that.timeAxis,
                y: that['2015EpaAqiIndexData'].map(a => a['agiIndex']),
                name: '2015 AQI data',
                type: 'scatter',
                marker: {
                    color: "#ffc300",
                }
            };

            let epa2016Trace = {
                x: that.timeAxis,
                y: that['2016EpaAqiIndexData'].map(a => a['agiIndex']),
                name: '2016 AQI data',
                type: 'scatter',
                marker: {
                    color: "#ff5733",
                }
            };

            let epa2017Trace = {
                x: that.timeAxis,
                y: that['2017EpaAqiIndexData'].map(a => a['agiIndex']),
                name: '2017 AQI data',
                type: 'scatter',
                marker: {
                    color: "#c70039",
                }
            };

            let epa2018Trace = {
                x: that.timeAxis,
                y: that['2018EpaAqiIndexData'].map(a => a['agiIndex']),
                name: '2018 AQI data',
                type: 'scatter',
                marker: {
                    color: "#581845",
                }
            };

            let trendData = [epa2014Trace, epa2015Trace, epa2016Trace, epa2017Trace, epa2018Trace];
            let layout = {
                title: "EPA AQI trend Chart",
                yaxis: {title: 'Air Quality Index'},
                width: 600
            };
            Plotly.newPlot('epaAqitrendChartView', trendData,layout, {responsive: true});
            $('#charts-container').show();
            that.chartsContainer = document.getElementById('charts-container');
            that.mapContainer = document.getElementById('parent-visualization-container');
            that.chartsContainer.scrollIntoView(true);
            $('#moveToTop').on('click', () => {
                that.mapContainer.scrollIntoView(true);
            });
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
        },

        showModal: function (title, body) {
            // Display error message to the user in a modal
            $('#alert-modal-title').html(title);
            $('#alert-modal-body').html(body);
            $('#alert-modal').modal('show');
        },
    };

    if(window.location.pathname === '/visualization' && window.location.search === '?type=scats') {
        console.log('scats');
        scatsEpaController.loadVisualization();
    }
});

