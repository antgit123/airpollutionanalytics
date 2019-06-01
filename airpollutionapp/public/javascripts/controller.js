$(function () {

    let appController = {
        loadVisualization: function (visualizationOption) {
            let that = this;
            $('#choroplethContainer').hide();
            $('#showBusinessContainer').hide();
            $('#searchContainer').hide();
            $('#regionContainer').hide();
            $('#charts-container').hide();
            $('#correlationsContainer').hide();
            this.substanceList = [];
            this.phiduReferenceMap = {
                "respiratory": ["respiratory_admissions", "Number of Respiratory admissions"],
                "copd": ["copd_admissions", "Number of COPD admissions"],
                "asthma": ["asthma_admissions", "Number of asthma admissions"],
                "isch_heart": ["ischaemic_heart_admissions", "Number of Ischaemic Heart admissions"],
                "stroke": ["stroke_admissions", "Number of stroke admissions"]
            };
            // if(visualizationOption === 'emission'){
            this.map = this.getMap(undefined);
            $.ajax({
                type: "GET",
                url: '/visualization/getEmissionData',
                contentType: 'application/json',
                success: function (response, body) {
                    response.forEach(function (substance) {
                        let substanceName = substance.Name;
                        let substanceId = substance.SubstanceId;
                        let substanceThreshold = substance.SubstanceThreshold;
                        if (substanceName === 'Particulate Matter ≤2.5 µm (PM2.5)') {
                            substanceName = 'Particulate Matter 2.5 um';
                        }
                        if (substanceName === 'Particulate Matter ≤10.0 µm (PM10)') {
                            substanceName = 'Particulate Matter 10.0 um';
                        }
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
                $("#charts-container").hide();
                let choroplethParameter = $("#heatMapSelector")[0].value;
                that.optionMap = new Map();
                that.optionMap.set("year", year)
                    .set("substance", substance)
                    .set("region", region)
                    .set("choroplethParameter", choroplethParameter);

                if (!this.raiseParameterError([substance, year, choroplethParameter])) {
                    $.ajax({
                        type: "GET",
                        url: '/visualization/getFilteredEmissionData/?year=' + year + '?substance=' + substance
                        + '?selector=' + choroplethParameter,
                        contentType: 'application/json',
                        success: function (response, body) {
                            if (response) {
                                that.removeAllMapLayers(that.map);
                                that.map.remove();
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

            $('#goToHome').on('click', () => {
                window.location.href = '/';
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
            this.map = L.map('mapid').setView([-37.814, 144.96332], 9);
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
            }).addTo(this.map);

            this.getShapeFile(response);
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

        findPolygonLayer: function (map, point) {
            map.eachLayer(layer => {
                if (layer._layers) {
                    Object.values(layer._layers).forEach(shapeLayer => {
                        if (shapeLayer.getBounds().contains(point)) {
                            return shapeLayer;
                        }
                    });
                }
            });
        },

        addLayerToMap: function (layer) {
            layer.addTo(this.map);
        },

        getShapeFile: function (response) {
            let that = this;
            this.regionCodeList = [];
            this.businessMarkerLayerGroup = [];
            this.searchRegionData = [];
            this.regionMap = new Map();
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
                    } else {
                        that.handleLayers("add");
                    }
                });

                $('#searchOption').click(function () {
                    if (!$(this).is(':checked')) {
                        //write logic to remove search bar
                        that.map.removeControl(that.searchControl);
                    } else {
                        that.searchMarkersLayer = new L.LayerGroup(that.searchRegionData);
                        that.searchControl = new L.Control.Search({
                            layer: that.searchMarkersLayer,
                            initial: false,
                            propertyName: that.name_key,
                            position: 'topright',
                            marker: false,
                            zoom: 10
                        });
                        that.map.addControl(that.searchControl);
                    }
                });

                that.info = L.control();
                $('#showBusinessContainer').show();
                // $('#searchContainer').show();
                phidu_key === undefined ? that.phidu_data = undefined : that.phidu_data = response[phidu_key];
                that.createBusinessLayerGroup();

                document.getElementById('regionSelect').innerHTML = "";
                $("#regionSelect").append("<option value='selectRegion'>Select Region</option>");

                let shapeFileMap = new Map();
                shapeFileMap.set("2015", "public/javascripts/lga2015.zip")
                    .set("2016", "public/javascripts/lga2015.zip")
                    .set("2017", "public/javascripts/lga2017.zip")
                    .set("2018", "public/javascripts/lga2017.zip");

                that.code_key = parseInt(year) >= 2017 ? "lga_code16" : "lga_code";
                that.name_key = parseInt(year) >= 2017 ? "lga_name16" : "lga_name";

                that.shpFile = new L.Shapefile(shapeFileMap.get(year), {
                    onEachFeature: function (feature, layer) {
                        if (feature.properties) {
                            area_code = feature.properties[that.code_key];
                            area_name = feature.properties[that.name_key];
                            that.regionMap.set(area_code, area_name);
                            if (that.regionCodeList.includes(feature.properties[that.code_key])) {
                                that.searchRegionData.push(new L.GeoJSON(feature));
                            }
                            $("#regionSelect").append("<option value='" + area_code + "'>" + area_name + "</option>");
                        }
                        layer.on({
                            mouseover: highlightFeature,
                            mouseout: resetHighlight
                        });
                    },
                    style: function (feature) {
                        let currentEmission, currentAdmissionValue, styleValue;
                        if (choroplethParameter) {
                            if (choroplethParameter !== 'emission') {
                                let key = that.phiduReferenceMap[choroplethParameter][0];
                                if (that.phidu_data.length > 0) {
                                    that.max = that.phidu_data[0][key];
                                    that.min = that.phidu_data[that.phidu_data.length - 1][key];
                                    if (that.min === null) {
                                        that.min = 0;
                                    }
                                    if (!that.legendAdded) {
                                        that.addLegend();
                                    }
                                    let currentRegion = that.phidu_data.filter(region => {
                                        return region["lga_code"] === feature.properties[that.code_key];
                                    });
                                    currentAdmissionValue = currentRegion[0][key];
                                    that.legendAdded = true;
                                }

                            } else {
                                // let year = that.optionMap.get("year");
                                let no_business = that.sortedBusinessList.length;
                                if (no_business > 0) {
                                    that.max = that.sortedBusinessList[0].emissionData['quantity_in_kg'];
                                    that.min = that.sortedBusinessList[no_business - 1].emissionData['quantity_in_kg'];
                                    if (that.min === null) {
                                        that.min = 0;
                                    }
                                    if (!that.legendAdded) {
                                        that.addLegend();
                                    }
                                    let currentBusiness = that.sortedBusinessList.filter(business => {
                                        return business["location"] === feature.properties[that.code_key]
                                    });
                                    that.legendAdded = true;
                                    if (currentBusiness && currentBusiness.length > 0) {
                                        let totalQuantity = 0;
                                        currentBusiness.forEach(business => {
                                            totalQuantity += business.emissionData['quantity_in_kg']
                                        });
                                        currentEmission = totalQuantity;
                                    } else {
                                        if (that.regionCodeList.includes(feature.properties[that.code_key])) {
                                            currentEmission = 0;
                                        } else {
                                            currentEmission = null;
                                        }
                                    }
                                } else {
                                    if (that.regionCodeList.includes(features.properties[that.code_key])) {
                                        currentEmission = 0;
                                    } else {
                                        currentEmission = null;
                                    }
                                }
                            }
                            styleValue = choroplethParameter === "emission" ? currentEmission : currentAdmissionValue;
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

                that.info.onAdd = function (map) {
                    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
                    this.update();
                    return this._div;
                };

                // method that we will use to update the control based on feature properties passed
                that.info.update = function (props) {
                    this._div.innerHTML = '<h4>Name of the Region</h4>' + (props ?
                        '<b>' + props[that.name_key] + '</b><br />'
                        : 'Hover over a region');
                };

                that.info.addTo(that.map);
                //potential replacement to allow search to work as well
                // that.map.on('click', function (e) {
                //     // let clicked_point = e.latlng;
                //     // let layer = that.findPolygonLayer(this, clicked_point);
                //     // let layer1 = e.target;
                //     if (that.selectedLayer !== null) {
                //         let feature = that.selectedLayer.feature;
                //         let code = feature.properties[that.code_key];
                //         let name = feature.properties[that.name_key];
                //         getLayerInfo(code, name, that, year, that.selectedLayer);
                //         that.getEmissionData(code, year, that.selectedLayer);
                //     }
                //     // console.log("layer1", layer1.feature.properties[that.name_key]);
                // });

                this.shpFile.on('click', function (layer) {
                    let feature = layer.layer.feature;
                    let code = feature.properties[that.code_key];
                    that.getEmissionData(code, year, layer.layer);
                });

                function getLayerInfo(code, name, appObject, year, layer, popup) {
                    let info = [];
                    let total_Quantity = 0, items = 0;
                    let substance = appObject.optionMap.get("substance");
                    info.push("<b>Area Name:</b>" + name);
                    let choroplethParameter = appObject.optionMap.get("choroplethParameter");
                    if (choroplethParameter !== 'emission') {
                        if (year === '2015' || year === '2017') {
                            let admissionValueList = appObject.getAdmissionValues(code, year);
                            admissionValueList.forEach((value, key) => {
                                info.push("<b>" + key + ':</b>' + value);
                            })
                        }
                    } else {
                        let admissionValueList = appObject.getAdmissionValues(code, year);
                        if (admissionValueList) {
                            admissionValueList.forEach((value, key) => {
                                info.push("<b>" + key + ':</b>' + value);
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
                                    popup.setContent(info.join(" <br/>")).openOn(that.map);
                                }
                            } else {
                                //no data found which means region doesn't have any emission of that substance
                                info.push("<b>Total Emission (in Kg):</b>" + total_Quantity);
                                popup.setContent(info.join(" <br/>")).openOn(that.map);
                            }
                        },
                        error: function () {
                            that.showModal("Request Error", "Unable to retrieve data");
                        }
                    });
                }

                function highlightFeature(e) {
                    that.selectedLayer = e.target;
                    that.selectedLayer.setStyle({
                        weight: 3,
                        color: 'black',
                        dashArray: '',
                        fillOpacity: 0.75
                    });

                    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                        that.selectedLayer.bringToFront();
                    }
                    that.info.update(that.selectedLayer.feature.properties);
                    let feature = that.selectedLayer.feature;
                    let code = feature.properties[that.code_key];
                    let name = feature.properties[that.name_key];
                    let popup = L.popup()
                        .setLatLng(e.latlng);
                    getLayerInfo(code, name, that, year, that.selectedLayer, popup);
                }

                function resetHighlight(e) {
                    that.shpFile.resetStyle(e.target);
                    that.selectedLayer = null;
                    that.info.update();
                }
            }
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

        getEmissionData: function (code, year, layer) {
            let that = this;
            $.ajax({
                type: "GET",
                url: '/visualization/getRegionEmissionData/?region=' + code + '?year=' + year,
                contentType: 'application/json',
                success: function (clusterResponse) {
                    if (clusterResponse && clusterResponse['data'].length > 0) {
                        that.regionEmissionBusinessList = clusterResponse['data'];
                        that.createChart(layer, year);
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
                        '<i style="background:' + that.getColor(grades[i] + 0.01, that.min, that.max) + ' "></i> ' +
                        grades[i].toFixed(2) + ' - ' + grades[i + 1].toFixed(2) + '<br>';
                }
                return div;
            };
            this.legend.addTo(this.map);
        },

        createBusinessLayerGroup: function () {
            let that = this;
            let businessMarkers = [];
            this.sortedBusinessList.forEach(business => {
                let latitude = parseFloat(business['site_latitude']);
                let longitude = parseFloat(business['site_longitude']);
                let businessInfo = "<b>Name" + ":</b>" + business["facility_name"] + "</br>" +
                    "<b>Activity:</b> " + business["main_activities"] + "</br>" +
                    "<b>Suburb:</b>" + business["site_address_suburb"] + "</br>" +
                    "<b>Total Emission (in Kg): </b>" + business.emissionData["quantity_in_kg"];
                let marker = L.marker([latitude, longitude],
                    {icon: that.businessMarker}
                ).bindPopup(businessInfo);
                businessMarkers.push(marker);
            });
            that.businessMarkerLayerGroup = L.layerGroup(businessMarkers);
        },

        handleLayers: function (operation) {
            if (operation === "add") {
                this.addLayerToMap(this.businessMarkerLayerGroup);
            } else {
                this.removeMapLayer(this.businessMarkerLayerGroup);
            }
        },

        createChart: function (layer) {
            let that = this;
            let code = layer.feature.properties[that.code_key];
            let areaName = layer.feature.properties[that.name_key];
            $("#selectedRegionText")[0].innerText = areaName;
            $("#selectedSubstanceText")[0].innerText = $("#substanceSelect")[0].value;

            $.ajax({
                type: "GET",
                url: '/visualization/getChartVisualizationData?region=' + code + '?substance=' + $("#substanceSelect")[0].value,
                contentType: 'application/json',
                success: function (response, body) {
                    that.prepareChartData(response, areaName);
                },
                error: function (error) {
                    that.showModal("Document failure", "Failure in fetching the documents. Please check connectivity");
                }
            });
        },

        prepareChartData: function (data, areaName) {
            let that = this;
            let phidu_years = ['2015', '2017'];
            that.emissionTrendMap = new Map();
            that.phiduMapData = new Map();
            //only stores respiratory trends
            that.phiduTrendMap = new Map();
            let emission_years = ['2015', '2016', '2017', '2018'];
            let emission_count = 0;
            let phidu_count = 0;
            let year = that.optionMap.get('year');
            if (year === '2015' || year === '2017') {
                // let admissions = that.phidu_data[0]["respira"]
            }
            emission_years.forEach(year => {
                let emissionData = data["DEE" + year + "Collection"];
                if (emissionData.length > 0) {
                    let totalQuantity = 0;
                    emissionData.forEach(business => {
                        totalQuantity += business.emissionData['quantity_in_kg'];
                    });
                    that.emissionTrendMap.set(year, totalQuantity);
                    $('#totalBusinessText')[0].innerText = that.regionEmissionBusinessList.length;
                }
                emission_count++;
            });
            phidu_years.forEach(year => {
                let phidu_data = data["PHIDU" + year + "Collection"][0]["respiratory"];
                that.phiduMapData.set(year, phidu_data);
                let phidu_region = phidu_data.filter(region => {
                    return region.lga_name === areaName;
                });
                that.phiduTrendMap.set(year, phidu_region[0]["respiratory_admissions"]);
                phidu_count++;
            });
            $('#totalEmissionText')[0].innerText = that.emissionTrendMap.get(year).toFixed(2);
            let choroplethParameter = that.optionMap.get("choroplethParameter");
            if (choroplethParameter === "emission") {
                $('#statsChoroplethContainer1').hide();
                let year = that.optionMap.get("year");
                if (year === "2015" || year === "2017") {
                    let key = that.phiduReferenceMap["respiratory"][0];
                    let phiduData = that.phidu_data[0]["respiratory"];
                    let admission_value = phiduData[phiduData.length - 1][key];
                    if (admission_value === null) {
                        admission_value = 0;
                    }
                    $('#lowestAdmissionText')[0].innerText = admission_value + "  (" + phiduData[phiduData.length - 1]["lga_name"] + ")";
                    $('#highestAdmissionText')[0].innerText = phiduData[0][key] + "  (" + phiduData[0]["lga_name"] + ")";
                    $('#statsChoroplethContainer2').show();
                } else {
                    $('#statsChoroplethContainer2').hide();
                }
            } else {
                $('#statsChoroplethContainer1').show();
                $('#statsChoroplethContainer2').hide();
                let businessLength = that.sortedBusinessList.length;

                $('#lowestEmissionText')[0].innerText = that.sortedBusinessList[businessLength - 1].emissionData['quantity_in_kg'];
                $('#highestEmissionText')[0].innerText = that.sortedBusinessList[0].emissionData['quantity_in_kg'];
            }

            if (phidu_count === phidu_years.length && emission_count === emission_years.length) {
                that.showTrendsChart(data, areaName);
            }
        },
        showTrendsChart: function (data, areaName) {
            let that = this;
            let emissionYearKeys = Array.from(that.emissionTrendMap.keys());
            let phiduYearKeys = Array.from(that.phiduTrendMap.keys());
            let emissionYearValues = Array.from(that.emissionTrendMap.values());
            let phiduYearValues = Array.from(that.phiduTrendMap.values());
            let choroplethParameter = that.optionMap.get("choroplethParameter");
            let emissionTrace = {
                x: emissionYearKeys,
                y: emissionYearValues,
                name: 'Emission data',
                type: 'scatter'
            };
            let phiduTrace = {};
            if (choroplethParameter !== "isch_heart" && choroplethParameter !== "stroke"
                && choroplethParameter !== "copd" && choroplethParameter !== "asthma") {
                phiduTrace = {
                    x: phiduYearKeys,
                    y: phiduYearValues,
                    name: 'Respiratory admissions',
                    yaxis: 'y2',
                    type: 'scatter'
                };
            }

            let trendData = [emissionTrace, phiduTrace];
            let layout = {
                title: "Region Trends Chart",
                yaxis: {title: 'Total emission quantity'},
                yaxis2: {
                    title: 'Respiratory Admissions',
                    titlefont: {color: 'rgb(148, 103, 189)'},
                    tickfont: {color: 'rgb(148, 103, 189)'},
                    overlaying: 'y',
                    side: 'right'
                },
                showlegend: true,
                legend: {
                    x: 1,
                    y: 1
                }
            };
            Plotly.newPlot('trendsChart', trendData, layout);
            that.showBusinessPieChart(data, areaName);
        },
        showBusinessPieChart: function (data, areaName) {
            let that = this;
            let year = that.optionMap.get("year");
            let businessList = data["DEE" + year + "Collection"];
            let emissionSum = 0;
            if (businessList.length > 0) {
                businessList.forEach(business => {
                    emissionSum += business.emissionData['quantity_in_kg'];
                })
            }
            let businessValuesArray = [];
            let businessLabelsArray = [];
            businessList.forEach(business => {
                if (business.emissionData['quantity_in_kg'] / emissionSum >= 0.02) {
                    businessValuesArray.push(business.emissionData['quantity_in_kg'] / emissionSum);
                    businessLabelsArray.push(business['facility_name']);
                }
            });
            if (emissionSum > 0) {
                let title = areaName + " - Business Emission contribution";
                that.constructPieChart(businessValuesArray, businessLabelsArray, title, 'businessPieChart');
            }
            that.calculateSummaryCorrelation(data);
        },
        calculateSummaryCorrelation: function (data) {
            let that = this;
            let totalRegions = that.regionCodeList.length;
            let correlationYears = ['2015', '2016', '2017', '2018'];
            let correlationMap = new Map();
            let positiveCorrelations = 0;
            $.ajax({
                type: "GET",
                url: '/visualization/getSummaryCorrelationData?substance=' + $("#substanceSelect")[0].value,
                contentType: 'application/json',
                success: function (response, body) {
                    correlationYears.forEach(year => {
                        let phidu_admission = 0;
                        let emissionRegionTotal = [];
                        let phiduTotal = [];
                        let emissionData = response["DEE" + year + "Collection"];
                        that.regionCodeList.forEach(code => {
                            let totalEmission = 0;
                            let substanceBusinessList = emissionData.filter(emissionNode => {
                                return emissionNode["location"] === code;
                            });
                            if (substanceBusinessList.length > 0) {
                                substanceBusinessList.forEach(substanceBusiness => {
                                    totalEmission += substanceBusiness.emissionData['quantity_in_kg'];
                                });
                            }
                            emissionRegionTotal.push(
                                {
                                    code: code,
                                    emission: totalEmission
                                }
                            );
                            if (year === '2015' || year === '2017') {
                                let phiduData = that.phiduMapData.get(year);
                                let phidu_region = phiduData.filter(region => {
                                    return region.lga_code === code;
                                });
                                if (phidu_region.length > 0) {
                                    phidu_admission = phidu_region[0]["respiratory_admissions"];
                                }
                                phiduTotal.push(
                                    {
                                        code: code,
                                        admissions: phidu_admission
                                    }
                                );
                            }
                        });
                        correlationMap.set(year, {phiduSummary: phiduTotal, emissionSummary: emissionRegionTotal});
                    });

                    let correlationMapKeys = Array.from(correlationMap.keys());
                    correlationMapKeys.forEach(year => {
                        that["emission" + year + "Summary"] = correlationMap.get(year)["emissionSummary"];
                    });
                    that.phidu2015Summary = correlationMap.get("2015")["phiduSummary"];
                    that.phidu2017Summary = correlationMap.get("2017")["phiduSummary"];
                    that.showRegionContributorChart(data);

                    for (let i = 0; i < that.emission2015Summary.length; i++) {
                        let emission2015Value = that.emission2015Summary[i]["emission"];
                        let emission2015Code = that.emission2015Summary[i]["code"];
                        let emission2017Node = that.emission2017Summary.filter(node => {
                            return node["code"] === emission2015Code;
                        });
                        let phidu2015Node = that.phidu2015Summary.filter(node => {
                            return node["code"] === emission2015Code;
                        });
                        let phidu2017Node = that.phidu2017Summary.filter(node => {
                            return node["code"] === emission2015Code;
                        });
                        let emission2017Value = emission2017Node[0]["emission"];
                        let phidu2015Value = phidu2015Node[0]["admissions"];
                        let phidu2017Value = phidu2017Node[0]["admissions"];

                        //if current emission Value is more than previous emission
                        if ((emission2017Value - emission2015Value) > 0) {
                            //if current respiratory cases more than previous then correlation found
                            if ((phidu2017Value - phidu2015Value) > 0) {
                                positiveCorrelations++;
                            }
                        }    //else check correlation if repsiratory cases decrease when decrease in emission
                        // } else
                        if ((emission2017Value - emission2015Value) < 0) {
                            if ((phidu2017Value - phidu2015Value) < 0) {
                                positiveCorrelations++;
                            }
                        }
                    }
                    let negativeCorrelations = totalRegions - positiveCorrelations;
                    $('#positiveCorrelationText')[0].innerText = ((positiveCorrelations/totalRegions) * 100).toFixed(2);
                    $('#negativeCorrelationText')[0].innerText = ((negativeCorrelations / totalRegions) * 100).toFixed(2);
                    $('#correlationsContainer').show();
                    //possible add for correlation check
                    let year = that.optionMap.get("year");
                    // if(year === '2015' || year === '2017')
                },
                error: function (error) {
                    that.showModal("Document failure", "Failure in fetching the documents. Please check connectivity");
                }
            });
            $('#charts-container').show();
            that.chartsContainer = document.getElementById('charts-container');
            that.mapContainer = document.getElementById('parent-visualization-container');
            that.chartsContainer.scrollIntoView(true);
            $('#moveToTop').on('click', () => {
                that.mapContainer.scrollIntoView(true);
            });
        },
        showRegionContributorChart: function (data) {
            let that = this;
            let year = that.optionMap.get("year");
            let choroplethParameter = that.optionMap.get("choroplethParameter");
            if (choroplethParameter === "emission") {
                //if emission is parameter show top region contributors for the emission for substance
                let total_region = 0;
                let regionalValues = [];
                let regionalLabels = [];
                let sum = 0;
                let year_key = "emission" + year + "Summary";
                that[year_key] = that.sortArray(that[year_key], "emission");
                that[year_key].forEach(summaryNode => {
                    total_region += summaryNode["emission"];
                });
                for (let i = 0; i < that[year_key].length; i++) {
                    let emission_value = that[year_key][i]["emission"];
                    let emission_region = that.regionMap.get(that[year_key][i]["code"]);
                    sum += emission_value;
                    if (emission_value / total_region >= 0.03 && regionalValues.length < 10) {
                        regionalValues.push(emission_value / total_region);
                        regionalLabels.push(emission_region);
                    }
                }
                that.constructPieChart(regionalValues, regionalLabels, "Top Contributors- Regions (Emission)", "regionContributionChart");
            } else {
                //if health related parameter is selected, show top contributors for parameter selected
                let key = that.phiduReferenceMap[choroplethParameter][0];
                let titleValue = that.phiduReferenceMap[choroplethParameter][1];
                let totalCases = 0;
                let phiduValuesArray = [];
                let phiduLabelsArray = [];
                that.phidu_data.forEach(phiduNode => {
                    totalCases += phiduNode[key];
                });
                for (let i = 0; i < that.phidu_data.length; i++) {
                    let admissionPercent = (that.phidu_data[i][key] / totalCases) * 100;
                    let area_name = that.phidu_data[i]["lga_name"];
                    if (admissionPercent >= 2) {
                        phiduValuesArray.push(admissionPercent);
                        phiduLabelsArray.push(area_name);
                    }
                }
                let title = "Top contributors - Regions" + "(" + titleValue + ")";
                that.constructPieChart(phiduValuesArray, phiduLabelsArray, title, "regionContributionChart");
            }
        },
        sortArray: function (array, value) {
            return array.sort(function (obj1, obj2) {
                return obj1[value] - obj2[value];
            });
        },
        constructPieChart: function (valueArray, labelArray, title, div) {
            let pie_data = [{
                values: valueArray,
                labels: labelArray,
                type: 'pie'
            }];

            let layout = {
                title: title,
                legend: {
                    x: 1,
                    y: 1
                }
            };
            Plotly.newPlot(div, pie_data, layout, {responsive: true});
        }
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