$(function() {
    let that = this;

    let appController = {
        loadVisualization: function(visualizationOption){
            let that = this;
            this.map = this.getMap(undefined);
            this.substanceList =[];
            // if(visualizationOption === 'emission'){
                $.ajax({
                        type: "GET",
                        url: '/visualization/getEmissionData',
                        contentType: 'application/json',
                        success: function (response, body) {
                           response.forEach(function(substance){
                               let substanceName = substance.Name;
                               let substanceId = substance.SubstanceId;
                               let substanceThreshold = substance.SubstanceThreshold;
                               $("#substanceSelect").append("<option value='"+substanceName+"'>" + substanceName + "</option>");
                               that.substanceList.push({
                                   name: substanceName,
                                   id: substanceId,
                                   threshold: substanceThreshold
                               });

                           })
                        },
                });

            $('#submitOptions').on('click',()=>{
                let substance = $("#substanceSelect")[0].value;
                let region = $("#regionSelect")[0].value;
                let year = $("#yearSelect")[0].value;
                let choroplethParameter = $("#heatMapSelector")[0].value;
                that.optionMap = new Map();
                that.optionMap.set("year",year)
                    .set("substance",substance)
                    .set("region",region)
                    .set("choroplethParameter",choroplethParameter);

                if(!this.raiseParameterError([substance,region,year,choroplethParameter])){
                    $.ajax({
                        type: "GET",
                        url: '/visualization/getFilteredEmissionData/?region='+region+'?year='+year+'?substance='+substance
                        +'?selector='+ choroplethParameter,
                        contentType: 'application/json',
                        success: function (response, body) {
                            if(response){
                                that.removeAllMapLayers(that.map);
                                that.getMap(response);
                            }
                        },
                        error: function(){
                            that.showModal("Request Error","Unable to retrieve data");
                        }
                    });
                }
            });

            $('#yearSelect').on('change', (evt)=>{
                let year = $('#yearSelect')[0].value;
                switch(year){
                    case '2015': appController.appendChoroplethParameter(['emission','respiratory']);
                        break;
                    case '2016': that.appendChoroplethParameter(['emission']);
                        break;
                    case '2017': that.appendChoroplethParameter(
                        ['emission','respiratory','stroke','asthma',
                            'isch_heart','copd'
                        ]
                    );
                        break;
                    case '2018': that.appendChoroplethParameter(['emission']);
                        break;
                    default: that.appendChoroplethParameter([]);
                }
            });
        },

        raiseParameterError: function(parameters){
            let errorMap = new Map();
            let errorExists = false;
            parameters.forEach(parameter=>{
                if(parameter.indexOf("select") !== -1 || parameter.trim() === ""){
                    errorExists = true;
                }
            });
            if(errorExists){
                this.showModal("Invalid Parameters","Please select all parameters before visualization");
                return errorExists;
            }else{
                return errorExists;
            }
        },

        showModal: function(title, body) {
        // Display error message to the user in a modal
            $('#alert-modal-title').html(title);
            $('#alert-modal-body').html(body);
            $('#alert-modal').modal('show');
        },

        appendChoroplethParameter: function(parameters){
            document.getElementById("heatMapSelector").innerHTML = "";
            let choroplethMap = new Map();
            choroplethMap.set("emission","Emission quantity")
                .set("respiratory","Respiratory admissions")
                .set("asthma","Asthma admissions")
                .set("isch_heart","Ischaemic heart admissions")
                .set("stroke","Stroke admissions")
                .set("copd","COPD admissions");
            $("#heatMapSelector").append("<option value='selectChoropleth'>Select Parameter</option>");
            parameters.forEach(parameter =>{
                $('#heatMapSelector').append("<option value='"+parameter+"'>" + choroplethMap.get(parameter) + "</option>")
            });
        },

        getMap: function (response) {
            if(!this.map) {
                this.map = L.map('mapid').setView([-37.814, 144.96332], 9);
                L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                    maxZoom: 18,
                    id: 'mapbox.streets',
                    accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
                }).addTo(this.map);
            }else{
                L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                    maxZoom: 18,
                    id: 'mapbox.streets',
                    accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
                }).addTo(this.map);
            }
            //this.shapeFile = this.getShapeFile(response);
            this.getShapeFile(response);
            //this.shapeFile.addTo(this.map);
            return this.map;
        },

        removeMapLayer: function (layerGroup) {
            if (layerGroup !== undefined) {
                this.map.removeLayer(layerGroup);
            }
        },

        removeAllMapLayers: function(map){
            map.eachLayer(layer=>{
                map.removeLayer(layer);
            });
        },

        addLayerToMap: function (layer) {
            layer.addTo(this.map);
        },

        getShapeFile: function(response){
            let that = this;
            this.regionList = [];
            let displayData;
            let year = '2018';
            let choroplethParameter ="emission";
            if(response) {
                year = that.optionMap.get('year');
                choroplethParameter = that.optionMap.get('choroplethParameter');
            }
            let shapeFileMap = new Map();
            document.getElementById('regionSelect').innerHTML ="";
            shapeFileMap.set("2015","public/javascripts/lga2015.zip")
                        .set("2016","public/javascripts/lga2015.zip")
                        .set("2017","public/javascripts/lga2017.zip")
                        .set("2018","public/javascripts/lga2017.zip");

            this.shpFile = new L.Shapefile(shapeFileMap.get(year), {
                onEachFeature: function (feature, layer) {
                    if (feature.properties) {
                        let area_code = parseInt(year) >= 2017 ? feature.properties.lga_code16: feature.properties.lga_code;
                        let area_name = parseInt(year) >= 2017? feature.properties.lga_name16: feature.properties.lga_name;
                        let phidu_key = "PHIDU"+year+"Collection";
                        let dee_key = "DEE"+year+"Collection";

                        that.regionList.push({"code": feature.properties.lga_code16,"name":feature.properties.lga_name16});
                        $("#regionSelect").append("<option value='" + area_code + "'>" + area_name + "</option>");

                        if(response) {
                            if (choroplethParameter.indexOf("emission") !== -1) {
                                displayData = getInfoFrom(Object, feature, response[dee_key]).join(" <br/>");
                            } else {
                                response[dee_key].sort((a,b) => (a[area_name] > b[area_name]) ? 1 :
                                    ((b[area_name] > a[area_name]) ? -1 : 0));
                                displayData = getInfoFrom(Object, feature, response[phidu_key],year).join(" <br/>");
                            }
                            layer.bindPopup(displayData);
                        }
                    }
                    // layer.on({
                    //     //mouseover: highlightFeature,
                    //     //mouseout: resetHighlight
                    // });
                },
                // style: function (feature) {
                //     if (feature.properties.sentimentDensity === undefined) {
                //         feature.properties.sentimentDensity = that.getSentimentDensity(feature.properties.sa2_main16);
                //     }
                //
                //     return {
                //         fillColor: that.getColor(feature.properties.sentimentDensity),
                //         weight: 1,
                //         opacity: 1,
                //         color: 'black',
                //         dashArray: '3',
                //         fillOpacity: 0.7
                //     };
                // }


            }).addTo(this.map);

            function getInfoFrom(object, feature, data,year) {
                let displayRequiredData = [];
                let viz_data = data;
                object.keys(feature.properties).map(function (k) {
                    if (isNaN(parseInt(k))) {
                        key = k;
                    } else {
                        key = k.substring(parseInt(k).toString().length);
                        feature.properties[key] = feature.properties[k];
                        delete k;
                    }
                    if ((!isNaN(feature.properties[key]) || key === "sa2_name16")) {
                        displayRequiredData.push(that.keymap[key] + ": " + feature.properties[key]);
                    }
                });
                return displayRequiredData;
            }

            // return this.shpFile;
        },

        getColor: function (d) {
            var range = (this.max - this.min)/5;
            return d > this.max-range ? '#05C804' :
                d > this.max-(2*range) ? '#71D503' :
                    d > this.max-(3*range) ? '#E3DB02' :
                        d > this.max-(4*range) ? '#F06D01' :
                            d > this.max-(5*range) ? '#FE0010' :
                                '#A9A9A9';
        },
        addLegend: function () {
            var that = this;
            this.legend = L.control({position: 'bottomright'});
            this.legend.onAdd = function (map) {
                var div = L.DomUtil.create('div', 'info legend'),
                    range = (that.max - that.min)/5;
                grades = [that.min, that.max-(4*range), that.max-(3*range),
                    that.max-(2*range), that.max-range, that.max],
                    labels = [];
                // loop through our density intervals and generate a label with a colored square for each interval
                for (var i = 0; i < grades.length - 1; i++) {
                    div.innerHTML +=
                        '<i style="background:' + that.getColor(grades[i] + 0.01) + ' "></i> ' +
                        grades[i].toFixed(2) + ' - ' + grades[i + 1].toFixed(2) + '<br>';
                }
                return div;
            };
            this.legend.addTo(this.map);
        },
    };
    $('#visualizationType').on('change',function (evt) {
        that.visualizationOption = this.value;
    });

    $('#visualize-button').on('click',()=>{
        if(that.visualizationOption === undefined){
            // alert("Please select a visualization option");
            appController.showModal("Invalid Visualization option"," Please select a valid option");
        } else{
            window.location.href = '/visualization?type=' + that.visualizationOption;
        }
    });

    if(window.location.pathname === '/visualization') {
        console.log('ax');
        appController.loadVisualization(that.visualizationOption);
    }

    $('.combobox').combobox();
});