/* Client side - Emission, PHIDU Data
The purpose of this file is to specify the client side utility functions for visualizing
emission and PHIDU data
 */

$(function () {

    let emissionController = {
        /**
         * The starter function which gets called to render the emission page with map and dropdowns
         *
         * @method
         * @param {visualizationOption} visualizationOption - option selected from home page,
         * it can be "emission" or "scats"
         */
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
            if(visualizationOption === 'emission') {
                this.map = this.getMap(undefined);
            }
            $.ajax({
                type: "GET",
                url: '/visualization/getEmissionData',
                contentType: 'application/json',
                success: function (response, body) {
                    response.forEach(function (substance) {
                        let substanceName = substance.Name;
                        let substanceId = substance.SubstanceId;
                        let substanceThreshold = substance.SubstanceThreshold;
                        let substanceFact = substance.FactSheet;
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
                            threshold: substanceThreshold,
                            fact: substanceFact
                        });
                    });
                },
            });

            $('#submitOptions').on('click', () => {
                $("body").addClass("loading");
                $('#showBusinessOption').is(':checked') ? $('#showBusinessOption').prop( "checked", false): null;
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
                            $("body").removeClass("loading");
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
                        emissionController.appendChoroplethParameter(['emission', 'respiratory']);
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
        /**
         * The following function validates the parameters selected in emission page dropdown and raises
         * errors if a valid option is not selected
         *
         * @method
         * @param {parameters} parameters - Array of parameters passed to the function which are selected
         * from dropdown menus
         */
        raiseParameterError: function (parameters) {
            let errorExists = false;
            parameters.forEach(parameter => {
                if (parameter.indexOf("select") !== -1 || parameter.trim() === "") {
                    errorExists = true;
                }
            });
            $("body").removeClass("loading");
            if (errorExists) {
                this.showModal("Invalid Parameters", "Please select all parameters before visualization");
                return errorExists;
            } else {
                return errorExists;
            }
        },

        /**
         * The following function displays error modal dialog if there are validation and request errors found
         *
         * @method
         * @param {title} title of the validation message to be displayed
         * @param {body} body defines the content of the error message to be displayed
         */
        showModal: function (title, body) {
            // Display error message to the user in a modal
            $('#alert-modal-title').html(title);
            $('#alert-modal-body').html(body);
            $('#alert-modal').modal('show');
        },

        /**
         * The following function adds the choropleth parameters to the choropleth parameter selector
         * dropdown after a year is selected in the emission page of the application
         *
         * @method
         * @param {parameters} parameters - Array of parameters passed to the function which are selected
         * from dropdown menus
         */
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

        /**
         * The following function renders and displays the leaflet map after response is received from the
         * database
         *
         * @method
         * @param {response} response - contains the data received from database on successful network call
         */
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

        /**
         * The following function removes a layergroup from the leaflet map
         *
         * @method
         * @param {layerGroup} layerGroup - leaflet layerGroup to be removed from the map
         */
        removeMapLayer: function (layerGroup) {
            if (layerGroup !== undefined) {
                this.map.removeLayer(layerGroup);
            }
        },

        /**
         * The following function removes all layers from the leaflet map
         *
         * @method
         * @param {map} map - leaflet map passed which contains the embedded layers to be removed
         */
        removeAllMapLayers: function (map) {
            map.eachLayer(layer => {
                map.removeLayer(layer);
            });
        },

        /**
         * The following function adds a layer to the leaflet map
         *
         * @method
         * @param {layer} layer - leaflet layer passed which needs to be added to the map
         */
        addLayerToMap: function (layer) {
            layer.addTo(this.map);
        },

        /**
         * The following function processes the shape file and displays it on the map
         *
         * @method
         * @param {response} response - response data received from database on successful network call
         */
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
            //if valid response is there, process and display shape file
            if (response) {
                $("body").removeClass("loading");
                year = that.optionMap.get('year');
                dee_key = "DEEnew" + year + "Collection";
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

                that.info = L.control();
                $('#showBusinessContainer').show();
                phidu_key === undefined ? that.phidu_data = undefined : that.phidu_data = response[phidu_key];
                that.createBusinessLayerGroup();
                document.getElementById('regionSelect').innerHTML = "";
                $("#regionSelect").append("<option value='selectRegion'>Select Region</option>");

                //map defined to pick the correct shapefile based on year condition
                let shapeFileMap = new Map();
                shapeFileMap.set("2015", "public/javascripts/lga2015.zip")
                    .set("2016", "public/javascripts/lga2015.zip")
                    .set("2017", "public/javascripts/lga2017.zip")
                    .set("2018", "public/javascripts/lga2017.zip");

                that.code_key = parseInt(year) >= 2017 ? "lga_code16" : "lga_code";
                that.name_key = parseInt(year) >= 2017 ? "lga_name16" : "lga_name";

                //creation of shape file
                that.shpFile = new L.Shapefile(shapeFileMap.get(year), {

                    // leaflet utiluty function to iterate through each feature
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

                    // leaflet utility function to show the style of each feature
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
                                        totalQuantity = currentBusiness.reduce((accumulator,business)=>{
                                            return accumulator += business.emissionData['quantity_in_kg'];
                                        },0);
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

                this.shpFile.on('click', function (layer) {
                    let feature = layer.layer.feature;
                    let code = feature.properties[that.code_key];
                    that.getEmissionData(code, year, layer.layer);
                });

                /**
                 * The following function displays the region information on hovering a map layer
                 *
                 * @method
                 * @param {code} code - area code of the region
                 * @param {name} name - area name of the region
                 * @param {appObject} appObject - main object handler
                 * @param {year} year - the year for which data is required
                 * @param {layer} layer - leaflet layer representing the region of the map
                 * @param {popup} popup - popup object which will display the region details on hover
                 */
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

                                //get Business List and return sum of air quantity of businesses if businesses found
                                substanceResponse['data'].forEach(substanceNode => {
                                    let emissionNode = substanceNode.emissionData.filter(function (node) {
                                        return node['substance'] === substance;
                                    });
                                    total_Quantity += emissionNode[0]['quantity_in_kg'];
                                    items++;
                                });
                                if (items === substanceResponse['data'].length) {
                                    info.push("<b>Total Emission (in Kg): </b>" + total_Quantity.toFixed(2));
                                    popup.setContent(info.join(" <br/>")).openOn(that.map);
                                }
                            } else {

                                //no data found which means region doesn't have any emission of that substance
                                info.push("<b>Total Emission (in Kg):</b>" + total_Quantity.toFixed(2));
                                popup.setContent(info.join(" <br/>")).openOn(that.map);
                            }
                        },
                        error: function () {
                            that.showModal("Request Error", "Unable to retrieve data");
                        }
                    });
                }

                // leaflet utility function which gets called on highlighting a layer on the map
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

                //leaflet utility function which gets called on hovering away from a region on the map
                function resetHighlight(e) {
                    that.shpFile.resetStyle(e.target);
                    that.selectedLayer = null;
                    that.info.update();
                }
            }
        },

        /**
         * The following function gets the PHIDU hospital admission values for a region for a selected year
         *
         * @method
         * @param {code} code - area code of the region for which data is required
         * @param {year} year - The year for which data is required
         */
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

        /**
         * The following function gets the industry emission data for a selected region
         *
         * @method
         * @param {code} code - Area code of the region selected
         * @param {year} year - the year for which data is required for the selected region
         * @param {layer} layer - the leaflet layer of the region selected on the map
         */
        getEmissionData: function (code, year, layer) {
            $("body").addClass("loading");
            let that = this;
            $.ajax({
                type: "GET",
                url: '/visualization/getRegionEmissionData/?region=' + code + '?year=' + year,
                contentType: 'application/json',
                success: function (clusterResponse) {
                    if (clusterResponse && clusterResponse['data'].length > 0) {
                        that.regionEmissionBusinessList = clusterResponse['data'];
                        that.createChart(layer, year);
                    }else{
                        $("body").removeClass("loading");
                    }
                },
                error: function () {
                    $("body").removeClass("loading");
                    that.showModal("Request Error", "Unable to retrieve data");
                }
            });
        },

        /**
         * The following function is a utility method which sets the map keys
         *
         * @method
         * @param {referenceMap} referenceMap - the map to be referenced for obtaining key, value information
         * @param {area_selected} area_selected - the area selected on the map
         * @param {choroplethParameter} choroplethParameter - the choropleth parameter selected from the
         * choropleth parameter dropdown
         */
        createAndReturnMap: function (referenceMap, area_selected, choroplethParameter) {
            let admissionMap = new Map();
            let admission_key = referenceMap[choroplethParameter][1];
            let admission_value = area_selected[0][referenceMap[choroplethParameter][0]];
            admissionMap.set(admission_key, admission_value);
            return admissionMap;
        },

        /**
         * The following function gets the color of the region to be displayed based on choropleth parameter selected
         * The function also displays the color for the legend keys
         *
         * @method
         * @param {data} data - The data passed for deciding the color to be displayed based on parameter selected
         * @param {min} min - The minimum value of the dataset for deciding the range of values for the legend and
         * the color to be displayed in the region
         * @param {max} max - The maximum value of the dataset for deciding the range of values for the legend and
         * the color to be displayed in the region
         */
        getColor: function (data, min, max) {
            let range = (max - min) / 8;
            return data > max - range ? '#FE0010' :
                data > max - (2 * range) ? '#F06D01' :
                    data > max - (3* range) ? '#F1AB0B':
                    data > max - (4 * range) ? '#E3DB02' :
                        data> max - (5 * range) ? '#FFFF00':
                        data > max - (6 * range) ? '#71D503' :
                            data > max - (7 * range) ? '#05C804' :
                                data > max - (8 * range) ? '#437414':
                                '#A9A9A9';
        },

        /**
         * The following function adds and displays the legend on the map
         *
         * @method
         */
        addLegend: function () {
            let that = this;
            this.legend = L.control({position: 'bottomright'});
            this.legend.onAdd = function (map) {
                let div = L.DomUtil.create('div', 'info legend'),
                    range = (that.max - that.min) / 8;
                grades = [that.min, that.max - (7 * range), that.max - (6 * range),
                    that.max - (5 * range),that.max - (4 * range),that.max - (3 * range),
                    that.max - (2 * range),that.max - range, that.max],
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
        /**
         * The following function creates the business markers for businesses operating in Victoria
         * and renders popup to display their information
         *
         * @method
         */
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
        /**
         * The following function shows or hides the business points on selecting deselecting
         * "show business points" checkbox
         *
         * @method
         * @param {operation} operation - variable which specifies whether to add or remove the layer group
         */
        handleLayers: function (operation) {
            if (operation === "add") {
                this.addLayerToMap(this.businessMarkerLayerGroup);
            } else {
                this.removeMapLayer(this.businessMarkerLayerGroup);
            }
        },
        /**
         * The following function starts the creation of charts in the visualization chart menu
         *
         * @method
         * @param {layer} layer - Layer of the region selected on the map
         */
        createChart: function (layer) {
            let that = this;
            let code = layer.feature.properties[that.code_key];
            let areaName = layer.feature.properties[that.name_key];
            $("#selectedRegionText")[0].innerText = areaName;
            $("#selectedSubstanceText")[0].innerText = $("#substanceSelect")[0].value;
            let selectedSubstance = that.substanceList.filter(substance =>{
                return substance["name"] === $("#substanceSelect")[0].value;
            });
            $('#infolink').attr('href',selectedSubstance[0]["fact"]);
            let year = that.optionMap.get("year");

            $.ajax({
                type: "GET",
                url: '/visualization/getSelectedSubstanceRegionEmission?region=' + code + '?year=' + year,
                contentType: 'application/json',
                success: function (response, body) {
                    that.showEmissionBarChart(response["DEEnew"+year+"Collection"], areaName);
                },
                error: function (error) {
                    that.showModal("Document failure", "Failure in fetching the documents. Please check connectivity");
                }
            });

            $.ajax({
                type: "GET",
                url: '/visualization/getChartVisualizationData?region=' + code + '?substance=' + $("#substanceSelect")[0].value,
                contentType: 'application/json',
                success: function (response, body) {
                    that.prepareChartData(response, areaName);
                },
                error: function (error) {
                    if (error) {
                        that.showModal("Document failure", "Failure in fetching the documents. Please check connectivity");
                    }
                }
            });
        },
        /**
         * The following function displays the emission bar chart for the major outdoor pollutants
         *
         * @method
         * @param {data} data - The emission bar chart data which is to be processed and displayed
         * @param {areaName} areaName - the selected area name of the region
         */
        showEmissionBarChart: function(data, areaName){
            let xArray = data.map(node =>{
                return node[0]["_id"];
            });
            let yArray = data.map(node =>{
                return node[0]["Total quantity sum"];
            });
            let emissionBarChartData = [{
                x:xArray,
                y:yArray,
                name: 'Emission Summary',
                type: 'bar',
                marker: {
                    color: "#ffc300"
                }}

            ];
            let layout = {
                title: areaName+ "- Major outdoor pollutants summary",
            };

            Plotly.newPlot('emissionBarChart', emissionBarChartData,layout, {responsive: true});
        },

        /**
         * The following function takes the data from the backend and processes it to create data structures
         * for displaying the charts
         *
         * @method
         * @param {data} data -  data received from the database which is to be processed and shown on charts
         * @param {areaName} areaName - the area name of the selected region
         */
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
            $('#regionStats')[0].innerText = "Region Statistics ("+ year +")";
            emission_years.forEach(year => {
                let emissionData = data["DEEnew" + year + "Collection"];
                if (emissionData.length > 0) {
                    let totalQuantity = 0;
                    emissionData.forEach(business => {
                        totalQuantity += business.emissionData['quantity_in_kg'];
                    });
                    that.emissionTrendMap.set(year, totalQuantity);
                    $('#totalBusinessText')[0].innerText = that.regionEmissionBusinessList.length;
                    $('#totalSubstanceBusinessText')[0].innerText = emissionData.length;
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
            if(that.emissionTrendMap.get(year)) {
                $('#totalEmissionText')[0].innerText = that.emissionTrendMap.get(year).toFixed(2);
            }else{
                $('#totalEmissionText')[0].innerText = 0;

            }
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

                $('#lowestEmissionText')[0].innerText = that.sortedBusinessList[businessLength - 1].emissionData['quantity_in_kg'].toFixed(2);
                $('#highestEmissionText')[0].innerText = that.sortedBusinessList[0].emissionData['quantity_in_kg'].toFixed(2);
            }

            if (phidu_count === phidu_years.length && emission_count === emission_years.length) {
                that.showTrendsChart(data, areaName);
            }
        },

        /**
         * The following function displays the region trends chart for correlation of emission and respiratory
         * admissions data
         *
         * @method
         * @param {data} data -  data received from the database which is to be processed and shown on charts
         * @param {areaName} areaName - the area name of the selected region
         */
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
                title: "Region Trends Chart - " +areaName + "("+ $("#substanceSelect")[0].value+ ")",
                yaxis: {title: 'Total emission quantity'},
                yaxis2: {
                    title: 'Respiratory Admissions',
                    titlefont: {color: 'rgb(148, 103, 189)'},
                    tickfont: {color: 'rgb(148, 103, 189)'},
                    overlaying: 'y',
                    side: 'right'
                }

            };
            Plotly.newPlot('trendsChart', trendData, layout);
            that.showBusinessPieChart(data, areaName);
        },

        /**
         * The following function shows the top contributing businesses pie chart in terms of emission contributed for a
         * selected region
         *
         * @method
         * @param {data} data -  data received from the database which is to be processed and shown on charts
         * @param {areaName} areaName - the area name of the selected region
         */
        showBusinessPieChart: function (data, areaName) {
            let that = this;
            let year = that.optionMap.get("year");
            let businessList = data["DEEnew" + year + "Collection"];
            let emissionSum = 0;
            if (businessList.length > 0) {
                emissionSum = businessList.reduce((accumulator, business) =>{
                    return accumulator + business.emissionData['quantity_in_kg'];
                },0);

                let businessValuesArray = [];
                let businessLabelsArray = [];
                businessList.forEach(business => {
                    if (business.emissionData['quantity_in_kg'] / emissionSum >= 0.02) {
                        businessValuesArray.push(business.emissionData['quantity_in_kg'] / emissionSum);
                        businessLabelsArray.push(business['facility_name']);
                    }
                });
                let title = areaName + " - Top contributing businesses";
                $('#businessPieChart').show();
                that.constructPieChart(businessValuesArray, businessLabelsArray, title, 'businessPieChart');
            }else{
                $('#businessPieChart').hide();
            }
            that.calculateSummaryCorrelation();
        },

        /**
         * The following function calculates the summary correlation between emission quantity and respiratory
         * admissions and displays the value in region statistics
         *
         * @method
         */
        calculateSummaryCorrelation: function () {
            let that = this;
            let correlationYears = ['2015', '2016', '2017', '2018'];
            let correlationMap = new Map();
            let positiveCorrelations = 0;
            $.ajax({
                type: "GET",
                url: '/visualization/getSummaryCorrelationData?substance=' + $("#substanceSelect")[0].value,
                contentType: 'application/json',
                success: function (response, body) {
                    let commonLocations = [];
                    response["DEEnew2015Collection"].forEach(function(summary2015Object) {
                        response["DEEnew2017Collection"].forEach(function(summary2017Object) {
                            if(summary2015Object["location"] === summary2017Object["location"] &&
                                !commonLocations.includes(summary2017Object["location"])) {
                                commonLocations.push(summary2017Object["location"]);
                            }
                        });
                    });
                    correlationYears.forEach(year => {
                        let phidu_admission = 0;
                        let emissionRegionTotal = [];
                        let phiduTotal = [];
                        let emissionData = response["DEEnew" + year + "Collection"];

                        commonLocations.forEach(code => {
                            let totalEmission = 0;
                            let substanceBusinessList = emissionData.filter(emissionNode => {
                                return emissionNode["location"] === code;
                            });
                            if (substanceBusinessList.length > 0) {
                                totalEmission = substanceBusinessList.reduce((accumulator, substanceBusiness)=>{
                                    return accumulator += substanceBusiness.emissionData['quantity_in_kg'];
                                },0)
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
                    that.showRegionContributorChart();

                    let totalRegions = commonLocations.length;
                    for (let i = 0; i < totalRegions; i++) {
                        let emission2015Node = that.emission2015Summary.filter(node => {
                            return node["code"] === commonLocations[i];
                        });
                        let emission2017Node = that.emission2017Summary.filter(node => {
                            return node["code"] === commonLocations[i];
                        });
                        let phidu2015Node = that.phidu2015Summary.filter(node => {
                            return node["code"] === commonLocations[i];
                        });
                        let phidu2017Node = that.phidu2017Summary.filter(node => {
                            return node["code"] === commonLocations[i];
                        });
                        let emission2015Value = emission2015Node[0]["emission"];
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
                    // $('#negativeCorrelationText')[0].innerText = ((negativeCorrelations / totalRegions) * 100).toFixed(2);
                    $('#correlationsContainer').show();
                },
                error: function (error) {
                    that.showModal("Document failure", "Failure in fetching the documents. Please check connectivity");
                }
            });
        },

        /**
         * The following function displays the top region contributors pie chart for a selected choropleth parameter
         *
         * @method
         */
        showRegionContributorChart: function () {
            let that = this;
            let year = that.optionMap.get("year");
            let substance = that.optionMap.get("substance");
            let choroplethParameter = that.optionMap.get("choroplethParameter");
            if (choroplethParameter === "emission") {
                //if emission is parameter show top region contributors for the emission for substance
                let regionalValues = [];
                let regionalLabels = [];
                let sum = 0;
                let year_key = "emission" + year + "Summary";
                that[year_key] = that.sortArray(that[year_key], "emission");
                total_region = that[year_key].reduce((accumulator,summaryNode)=>{
                    return accumulator + summaryNode["emission"];
                },0);
                for (let i = 0; i < that[year_key].length; i++) {
                    let emission_value = that[year_key][i]["emission"];
                    let emission_region = that.regionMap.get(that[year_key][i]["code"]);
                    sum += emission_value;
                    if (emission_value / total_region >= 0.03 && regionalValues.length < 10) {
                        regionalValues.push(emission_value / total_region);
                        regionalLabels.push(emission_region);
                    }
                }
                that.constructPieChart(regionalValues, regionalLabels, substance + " - Top Contributing Regions", "regionContributionChart");
            } else {
                //if health related parameter is selected, show top contributors for health parameter selected
                let key = that.phiduReferenceMap[choroplethParameter][0];
                let titleValue = that.phiduReferenceMap[choroplethParameter][1];
                let totalCases;
                let phiduValuesArray = [];
                let phiduLabelsArray = [];
                totalCases = that.phidu_data.reduce((accumulator,phiduNode)=>{
                    return accumulator + phiduNode[key];
                },0);
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
            $('#charts-container').show();
            $("body").removeClass("loading");
            that.chartsContainer = document.getElementById('charts-container');
            that.mapContainer = document.getElementById('parent-visualization-container');
            that.chartsContainer.scrollIntoView(true);
            $('#moveToTop').on('click', () => {
                that.mapContainer.scrollIntoView(true);
            });
        },

        /**
         * The following utility function helps to sort an array of objects for a specified property
         *
         * @method
         * @param {array} array -  the array which needs to be sorted
         * @param {value} value - the property used for sorting the array
         */
        sortArray: function (array, value) {
            return array.sort(function (obj1, obj2) {
                return obj1[value] - obj2[value];
            });
        },

        /**
         * The following helper function creates a pie chart
         *
         * @method
         * @param {valueArray} valueArray - The array of values to be shown on the pie chart
         * @param {labelArray} labelArray - the label of values to be shown on the pie chart
         * @param {title} title - The title of the pie chart
         * @param {div} div - The dom element where the chart is to be displayed
         */
        constructPieChart: function (valueArray, labelArray, title, div) {
            let pie_data = [{
                values: valueArray,
                labels: labelArray,
                type: 'pie'
            }];

            let layout = {
                title: title
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
            emissionController.showModal("Invalid Visualization option", " Please select a valid option");
        } else {
            window.location.href = '/visualization?type=' + that.visualizationOption;
        }
    });

    if (window.location.pathname === '/visualization') {
        that.visualizationOption = window.location.search.split("=")[1];
        emissionController.loadVisualization(that.visualizationOption);
    }
});