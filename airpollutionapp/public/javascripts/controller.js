$(function () {

    let appController = {
        loadVisualization: function (visualizationOption) {
            let that = this;
            this.map = this.getMap(undefined);
            $('#choroplethContainer').hide();
            $('#showBusinessContainer').hide();
            $('#searchContainer').hide();
            this.substanceList = [];
            this.phiduReferenceMap = {
                "respiratory": ["respiratory_admissions", "Number of Respiratory admissions"],
                "copd": ["copd_admissions", "Number of COPD admissions"],
                "asthma": ["asthma_admissions", "Number of asthma admissions"],
                "isch_heart": ["ischaemic_heart_admissions", "Number of Ischaemic Heart admissions"],
                "stroke": ["stroke_admissions", "Number of stroke admissions"]
            };
            // if(visualizationOption === 'emission'){
            $.ajax({
                type: "GET",
                url: '/visualization/getEmissionData',
                contentType: 'application/json',
                success: function (response, body) {
                    response.forEach(function (substance) {
                        let substanceName = substance.Name;
                        let substanceId = substance.SubstanceId;
                        let substanceThreshold = substance.SubstanceThreshold;
                        $("#substanceSelect").append("<option value='" + substanceName + "'>" + substanceName + "</option>");
                        that.substanceList.push({
                            name: substanceName,
                            id: substanceId,
                            threshold: substanceThreshold
                        });
                    });
                },
            });

            $('#submitOptions').on('click', () => {
                let substance = $("#substanceSelect")[0].value;
                let region = $("#regionSelect")[0].value;
                let year = $("#yearSelect")[0].value;
                let choroplethParameter = $("#heatMapSelector")[0].value;
                that.optionMap = new Map();
                that.optionMap.set("year", year)
                    .set("substance", substance)
                    .set("region", region)
                    .set("choroplethParameter", choroplethParameter);

                if (!this.raiseParameterError([substance, region, year, choroplethParameter])) {
                    $.ajax({
                        type: "GET",
                        url: '/visualization/getFilteredEmissionData/?region=' + region + '?year=' + year + '?substance=' + substance
                        + '?selector=' + choroplethParameter,
                        contentType: 'application/json',
                        success: function (response, body) {
                            if (response) {
                                that.removeAllMapLayers(that.map);
                                that.getMap(response);
                            }
                        },
                        error: function () {
                            that.showModal("Request Error", "Unable to retrieve data");
                        }
                    });
                }
            });

            $('#yearSelect').on('change', (evt) => {
                $('#choroplethContainer').show();
                let year = $('#yearSelect')[0].value;
                switch (year) {
                    case '2015':
                        appController.appendChoroplethParameter(['emission', 'respiratory']);
                        break;
                    case '2016':
                        that.appendChoroplethParameter(['emission']);
                        break;
                    case '2017':
                        that.appendChoroplethParameter(
                            ['emission', 'respiratory', 'stroke', 'asthma',
                                'isch_heart', 'copd'
                            ]
                        );
                        break;
                    case '2018':
                        that.appendChoroplethParameter(['emission']);
                        break;
                    default:
                        that.appendChoroplethParameter([]);
                }
            });
        },

        raiseParameterError: function (parameters) {
            let errorMap = new Map();
            let errorExists = false;
            parameters.forEach(parameter => {
                if (parameter.indexOf("select") !== -1 || parameter.trim() === "") {
                    errorExists = true;
                }
            });
            if (errorExists) {
                this.showModal("Invalid Parameters", "Please select all parameters before visualization");
                return errorExists;
            } else {
                return errorExists;
            }
        },

        showModal: function (title, body) {
            // Display error message to the user in a modal
            $('#alert-modal-title').html(title);
            $('#alert-modal-body').html(body);
            $('#alert-modal').modal('show');
        },

        appendChoroplethParameter: function (parameters) {
            document.getElementById("heatMapSelector").innerHTML = "";
            let choroplethMap = new Map();
            choroplethMap.set("emission", "Emission quantity")
                .set("respiratory", "Respiratory admissions")
                .set("asthma", "Asthma admissions")
                .set("isch_heart", "Ischaemic heart admissions")
                .set("stroke", "Stroke admissions")
                .set("copd", "COPD admissions");

            $("#heatMapSelector").append("<option value='selectChoropleth'>Select Parameter</option>");
            parameters.forEach(parameter => {
                $('#heatMapSelector').append("<option value='" + parameter + "'>" + choroplethMap.get(parameter) + "</option>")
            });
        },

        getMap: function (response) {
            if (!this.map) {
                this.map = L.map('mapid').setView([-37.814, 144.96332], 9);
                L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                    maxZoom: 18,
                    id: 'mapbox.streets',
                    accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
                }).addTo(this.map);
            } else {
                L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                    maxZoom: 18,
                    id: 'mapbox.streets',
                    accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
                }).addTo(this.map);
            }

            this.getShapeFile(response);
            //this.shapeFile.addTo(this.map);
            return this.map;
        },

        removeMapLayer: function (layerGroup) {
            if (layerGroup !== undefined) {
                this.map.removeLayer(layerGroup);
            }
        },

        removeAllMapLayers: function (map) {
            map.eachLayer(layer => {
                map.removeLayer(layer);
            });
        },

        addLayerToMap: function (layer) {
            layer.addTo(this.map);
        },

        getShapeFile: function (response) {
            let that = this;
            this.regionList = [];
            this.regionCodeList = [];
            this.businessMarkerLayerGroup = [];
            this.searchRegionData= [];
            this.businessMarker = L.AwesomeMarkers.icon({
                icon: 'briefcase',
                markerColor: 'black',
                prefix: 'fa'
            });
            this.legendAdded = false;
            $('.info').remove();
            let year = '2018';
            let choroplethParameter;
            let area_code, area_name;
            let phidu_key, dee_key;
            if (response) {
                year = that.optionMap.get('year');
                dee_key = "DEE" + year + "Collection";
                if (year === '2015' || year === '2017') {
                    phidu_key = "PHIDU" + year + "Collection";
                }
                choroplethParameter = that.optionMap.get('choroplethParameter');
                that.sortedBusinessList = response[dee_key];
                that.sortedBusinessList.forEach(business => {
                    if (!that.regionCodeList.includes(business["location"])) {
                        that.regionCodeList.push(business["location"]);
                    }
                });

                $('#showBusinessOption').click(function () {
                    if (!$(this).is(':checked')) {
                        that.handleLayers("remove");
                    }else{
                        that.handleLayers("add");
                    }
                });

                $('#searchOption').click(function () {
                    if (!$(this).is(':checked')) {
                        //write logic to remove search bar
                    }else{
                        that.searchMarkersLayer= new L.LayerGroup(that.searchRegionData);
                        let searchControl = new L.Control.Search({
                            layer: that.searchMarkersLayer,
                            initial: false,
                            propertyName: name_key,
                            position: 'topright',
                            marker: false,
                            zoom: 10
                        });
                        that.map.addControl(searchControl);
                    }
                });

                $('#showBusinessContainer').show();
                //$('#searchContainer').show();
                phidu_key === undefined ? that.phidu_data = undefined : that.phidu_data = response[phidu_key];
                //potential delete
                if (that.phidu_data !== undefined) {
                    that.phidu_sorted_data = response[phidu_key].sort((a, b) => (a[area_name] > b[area_name]) ? 1 :
                        ((b[area_name] > a[area_name]) ? -1 : 0));
                }
                that.createBusinessLayerGroup();
            }

            document.getElementById('regionSelect').innerHTML = "";
            $("#regionSelect").append("<option value='selectRegion'>Select Region</option>");

            let shapeFileMap = new Map();
            shapeFileMap.set("2015", "public/javascripts/lga2015.zip")
                .set("2016", "public/javascripts/lga2015.zip")
                .set("2017", "public/javascripts/lga2017.zip")
                .set("2018", "public/javascripts/lga2017.zip");

            let code_key = parseInt(year) >= 2017 ? "lga_code16" : "lga_code";
            let name_key = parseInt(year) >= 2017 ? "lga_name16" : "lga_name";

            that.shpFile = new L.Shapefile(shapeFileMap.get(year), {
                onEachFeature: function (feature, layer) {
                    if (feature.properties) {
                        area_code = feature.properties[code_key];
                        area_name = feature.properties[name_key];
                        that.regionList.push({"code": area_code, "name": area_name});
                        if(that.regionCodeList.includes(feature.properties[code_key])){
                            that.searchRegionData.push(new L.GeoJSON(feature));
                        }
                        $("#regionSelect").append("<option value='" + area_code + "'>" + area_name + "</option>");
                    }
                    layer.on({
                        //mouseover: highlightFeature,
                        //mouseout: resetHighlight
                    });
                },
                style: function (feature) {
                    let currentEmission, currentAdmissionValue, styleValue;
                    if (choroplethParameter) {
                        if (choroplethParameter !== 'emission') {
                            let year = that.optionMap.get("year");
                            let code = parseInt(year) >= 2017 ? "lga_code16" : "lga_code";
                            let key = that.phiduReferenceMap[choroplethParameter][0];
                            if (that.phidu_data.length > 0) {
                                that.max = that.phidu_data[0][key];
                                that.min = that.phidu_data[that.phidu_data.length - 1][key];
                                if(that.min === null){
                                    that.min = 0;
                                }
                                if(!that.legendAdded) {
                                    that.addLegend();
                                }
                                let currentRegion = that.phidu_data.filter(region => {
                                    return region["lga_code"] === feature.properties[code];
                                });
                                currentAdmissionValue = currentRegion[0][key];
                                that.legendAdded = true;
                            }

                        } else {
                            let year = that.optionMap.get("year");
                            let no_business = that.sortedBusinessList.length;
                            let code = parseInt(year) >= 2017 ? "lga_code16" : "lga_code";
                            if (no_business > 0) {
                                that.max = that.sortedBusinessList[0].emissionData['quantity_in_kg'];
                                that.min = that.sortedBusinessList[no_business - 1].emissionData['quantity_in_kg'];
                                if(that.min === null){
                                    that.min = 0;
                                }
                                if(!that.legendAdded) {
                                    that.addLegend();
                                }
                                let currentBusiness = that.sortedBusinessList.filter(business => {
                                    return business["location"] === feature.properties[code]
                                });
                                that.legendAdded = true;
                                if (currentBusiness && currentBusiness.length > 0) {
                                    let totalQuantity = 0;
                                    currentBusiness.forEach(business =>{
                                        totalQuantity += business.emissionData['quantity_in_kg']
                                    });
                                    currentEmission = totalQuantity;
                                } else {
                                    if(that.regionCodeList.includes(feature.properties[code])){
                                        currentEmission= 0;
                                    }else{
                                        currentEmission = null;
                                    }
                                }
                            }else{
                                if(that.regionCodeList.includes(features.properties[code])){
                                    currentEmission = 0;
                                }else{
                                    currentEmission = null;
                                }
                            }
                        }
                        styleValue =choroplethParameter === "emission"? currentEmission: currentAdmissionValue;
                        return {
                            fillColor: that.getColor(styleValue, that.min, that.max),
                            weight: 1,
                            opacity: 1,
                            color: 'black',
                            dashArray: '3',
                            fillOpacity: 0.75
                        };
                    }
                }
            });

            that.shpFile.addTo(that.map);

            this.shpFile.on('click', function (layer) {
                let feature = layer.layer.feature;
                let code = parseInt(year) >= 2017 ? feature.properties.lga_code16 : feature.properties.lga_code;
                let name = parseInt(year) >= 2017 ? feature.properties.lga_name16 : feature.properties.lga_name;
                getLayerInfo(code, name, that, year, layer.layer);
            });

            function getLayerInfo(code, name, appObject, year, layer) {
                let info = [];
                let viz_layer = layer;
                let total_Quantity = 0, items = 0;
                let substance = appObject.optionMap.get("substance");
                info.push("<b>Area Name:</b>" + name);
                let choroplethParameter = appObject.optionMap.get("choroplethParameter");
                if (choroplethParameter !== 'emission') {
                    if (year === '2015' || year === '2017') {
                        let admissionValueList = appObject.getAdmissionValues(code, year);
                        admissionValueList.forEach((value, key) => {
                            info.push("<b>"+key + ':</b>' + value);
                        })
                    }
                } else {
                    let admissionValueList = appObject.getAdmissionValues(code, year);
                    if (admissionValueList) {
                        admissionValueList.forEach((value, key) => {
                            info.push("<b>"+key + ':</b>' + value);
                        });
                    }
                }
                $.ajax({
                    type: "GET",
                    url: '/visualization/getRegionEmissionData/?region=' + code + '?year=' + year + '?substance=' + substance,
                    contentType: 'application/json',
                    success: function (substanceResponse) {
                        if (substanceResponse && substanceResponse['data'].length > 0) {
                            //get Business List and return sum of air quantity of businesses
                            substanceResponse['data'].forEach(substanceNode => {
                                let emissionNode = substanceNode.emissionData.filter(function (node) {
                                    return node['substance'] === substance;
                                });
                                total_Quantity += emissionNode[0]['quantity_in_kg'];
                                items++;
                            });
                            if (items === substanceResponse['data'].length) {
                                info.push("<b>Total Emission (in Kg): </b>" + total_Quantity);
                                viz_layer.bindPopup(info.join(" <br/>"));
                            }
                        } else {
                            //no data found which means region doesn't have any emission of that substance
                            info.push("<b>Total Emission (in Kg):</b>" + total_Quantity);
                            viz_layer.bindPopup(info.join(" <br/>"));
                        }
                    },
                    error: function () {
                        that.showModal("Request Error", "Unable to retrieve data");
                    }
                });
            }

            // function highlightFeature(e) {
            //     var layer = e.target;
            //     layer.setStyle({
            //         weight: 3,
            //         color: 'black',
            //         dashArray: '',
            //         fillOpacity: 0.7
            //     });
            //
            //     if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            //         layer.bringToFront();
            //     }
            //     that.info.update(layer.feature.properties);
            //     var popup = L.popup()
            //         .setLatLng(e.latlng)
            //         .setContent(that.getSentimentText(e.target.feature.properties.sentimentDensity))
            //         .openOn(that.map);
            // }
        },

        getAdmissionValues: function (code, year) {
            let that = this;
            let code_region = code;
            if (year === '2015' || year === '2017') {
                let reference2015Map = {
                    "respiratory": ["respiratory_admissions", "Number of Respiratory admissions"]
                };
                let referenceMap;
                let choroplethParameter = this.optionMap.get("choroplethParameter");
                referenceMap = parseInt(year) >= 2017 ? that.phiduReferenceMap : reference2015Map;
                let area_selected = this.phidu_data.filter((region) => {
                    return region.lga_code === code;
                });
                let admissionValueMap = new Map();

                //if choropleth parameter is related to PHIDU data return that parameter only else return list of parameters
                if (choroplethParameter !== 'emission') {
                    admissionValueMap = this.createAndReturnMap(referenceMap, area_selected, choroplethParameter);
                    return admissionValueMap;
                } else {

                    Object.keys(referenceMap).map(referenceKey => {
                        let key = referenceMap[referenceKey][1];
                        let selected_region = that.phidu_data[0][referenceKey].filter(region => {
                            return region.lga_code === code_region;
                        });
                        admissionValueMap.set(key, selected_region[0][referenceMap[referenceKey][0]]);
                    });
                    return admissionValueMap;
                }
            }
        },

        getEmissionData: function (emissionData, code, year, substance) {
            $.ajax({
                type: "GET",
                url: '/visualization/getRegionEmissionData/?region=' + code + '?year=' + year,
                contentType: 'application/json',
                success: function (clusterResponse) {
                    if (clusterResponse && clusterResponse['data'].length > 0) {
                        that.regionEmissionBusinessList = clusterResponse['data'];
                    }
                },
                error: function () {
                    that.showModal("Request Error", "Unable to retrieve data");
                }
            });
        },

        createAndReturnMap: function (referenceMap, area_selected, choroplethParameter) {
            let admissionMap = new Map();
            let admission_key = referenceMap[choroplethParameter][1];
            let admission_value = area_selected[0][referenceMap[choroplethParameter][0]];
            admissionMap.set(admission_key, admission_value);
            return admissionMap;
        },

        getColor: function (data, min, max) {
            let range = (max - min) / 5;
            return data > max - range ? '#FE0010' :
                data > max - (2 * range) ? '#F06D01' :
                    data > max - (3 * range) ? '#E3DB02' :
                        data > max - (4 * range) ? '#71D503' :
                            data > max - (5 * range) ? '#05C804' :
                                '#A9A9A9';
        },

        addLegend: function () {
            let that = this;
            this.legend = L.control({position: 'bottomright'});
            this.legend.onAdd = function (map) {
                let div = L.DomUtil.create('div', 'info legend'),
                    range = (that.max - that.min) / 5;
                grades = [that.min, that.max - (4 * range), that.max - (3 * range),
                    that.max - (2 * range), that.max - range, that.max],
                    labels = [];
                // loop through our density intervals and generate a label with a colored square for each interval
                for (let i = 0; i < grades.length - 1; i++) {
                    div.innerHTML +=
                        '<i style="background:' + that.getColor(grades[i] + 0.01,that.min,that.max) + ' "></i> ' +
                        grades[i].toFixed(2) + ' - ' + grades[i + 1].toFixed(2) + '<br>';
                }
                return div;
            };
            this.legend.addTo(this.map);
        },

        createBusinessLayerGroup: function () {
            let that = this;
            let businessMarkers = [];
            this.sortedBusinessList.forEach(business =>{
                let latitude = parseFloat(business['site_latitude']);
                let longitude = parseFloat(business['site_longitude']);
                let businessInfo = "<b>Name" + ":</b>" + business["facility_name"] + "</br>" +
                   "<b>Activity:</b> "+ business["main_activities"] + "</br>" +
                   "<b>Suburb:</b>"+ business["site_address_suburb"] + "</br>" +
                   "<b>Total Emission (in Kg): </b>"+ business.emissionData["quantity_in_kg"];
                let marker = L.marker([latitude,longitude],
                    {icon: that.businessMarker}
                ).bindPopup(businessInfo);
                businessMarkers.push(marker);
            });
            that.businessMarkerLayerGroup = L.layerGroup(businessMarkers);
        },

        handleLayers:function(operation){
            if(operation === "add") {
                this.addLayerToMap(this.businessMarkerLayerGroup);
            }else{
                this.removeMapLayer(this.businessMarkerLayerGroup);
            }
        },
    };
    let that = this;

    $('#visualizationType').on('change', function (evt) {
        that.visualizationOption = this.value;
    });

    $('#visualize-button').on('click', () => {
        if (that.visualizationOption === undefined) {
            appController.showModal("Invalid Visualization option", " Please select a valid option");
        } else {
            window.location.href = '/visualization?type=' + that.visualizationOption;
        }
    });

    if (window.location.pathname === '/visualization') {
        console.log('ax');
        appController.loadVisualization(that.visualizationOption);
    }
});