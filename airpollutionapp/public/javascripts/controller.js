$(function() {
    let that = this;

    let appController = {
        loadVisualization: function(visualizationOption){
            var that = this;
            this.map = this.getMap();
            // if(visualizationOption === 'emission'){
                $.ajax({
                        type: "GET",
                        url: '/visualization/getEmissionData',
                        contentType: 'application/json',
                        success: function () {
                            // if (response.type !== undefined && response.type === "db") {
                            //     $("#error").text(response.message);
                            //     $("#viewContent").attr('disabled', 'true');
                            //
                            // }else{
                            //     console.log('found something');
                            // }
                            console.log('requested');
                        },
                });


            // }
        },
        getMap: function () {
            var i, tabcontent, tablinks;
            var shpfile;
            var styleMap;
            var that = this;

            var mymap = L.map('mapid').setView([-37.814, 144.96332], 10);
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
                attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                maxZoom: 18,
                id: 'mapbox.streets',
                accessToken: 'sk.eyJ1IjoibWFwYm94YW50OTIiLCJhIjoiY2p2dGZ6NTlnMGNseDQ1b2phdHJ3Z2NsMiJ9.Qh6bVOZQ1HyAPtYB05xaXA'
            }).addTo(mymap);
            // this.shapeFile = this.getShapeFile();
            return mymap;
        },

        getShapeFile: function(){
            var that = this;
            var shpFile = new L.Shapefile('public/javascripts/lga2017.zip', {
                // onEachFeature: function (feature, layer) {
                //     // if (feature.properties) {
                //     //     var suburbmapdata = getInfoFrom(Object, feature).join(" <br/>");
                //     //     layer.bindPopup(suburbmapdata);
                //     //     if (feature.properties.sentimentDensity) {
                //     //         that.incomeVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.tot_tot});
                //     //         that.occupationVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.M0_p_tot});
                //     //         that.immigrantsVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.M0_tot_p_});
                //     //         that.homelessPeopleVsSentiment.push({x:feature.properties.sentimentDensity, y:feature.properties.M0_hl_p_h});
                //     //     }
                //     // }
                //     layer.on({
                //         //mouseover: highlightFeature,
                //         //mouseout: resetHighlight
                //     });
                // },
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
            });
            shpFile.addTo(that.map);
            return shpFile;
        }
    }
    $('#visualizationType').change(function (evt) {
        that.visualizationOption = this.value;
    });

    $('#visualize-button').on('click',()=>{
        if(that.visualizationOption === undefined){
            alert("Please select a visualization option");
        } else{
            window.location.href = '/visualization?type=' + that.visualizationOption;
        }
    });

    $('#submitOptions').on('click',()=>{
        $.ajax({
            type: "GET",
            url: '/visualization/getEmissionData',
            contentType: 'application/json',
            success: function (response) {
                // if (response.type !== undefined && response.type === "db") {
                //     $("#error").text(response.message);
                //     $("#viewContent").attr('disabled', 'true');
                //
                // }else{
                //     console.log('found something');
                // }
                console.log(response);
            },

        });
    });

    if(window.location.pathname === '/visualization') {
        console.log('ax');
        appController.loadVisualization(that.visualizationOption);
    }
});