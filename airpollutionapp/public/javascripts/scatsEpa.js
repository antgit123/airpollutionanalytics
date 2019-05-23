$(function(){
    var scatsEpaController ={
        showAlert: function(){
            alert("running emission file script");
        }
    };


    if(window.location.pathname === '/visualization' && window.location.search === '?type=scats') {
        console.log('scats');
        scatsEpaController.showAlert();
    }

});

