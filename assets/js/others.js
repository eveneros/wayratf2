//cursor Style
$(document).ready(function() {
	setCursorByID("world","crosshair");
   //totalPopulation=$("#numeroNpcs").val();
   $("#numeroNpcs").val(totalPopulation);
   aliveBirds=aliveBirds;
   init();
   pausegame();
 });
 function encode( s ) {
    var out = [];
    for ( var i = 0; i < s.length; i++ ) {
        out[i] = s.charCodeAt(i);
    }
    return new Uint8Array( out );
}

$(document).ready(function() {
  $("#btnSave").click(function(){
	 
    var birdToSave=aliveBirds;
	   var json=birdToSave[0].brain.serialize();

	//    pCinco.saveJson(json,'plane.json');
	//   console.log(birdToSave);
	// $.ajax
    // ({
    //     type: "GET",
    //     dataType : 'json',
    //     async: false,
    //     url: 'save.php',
    //     data: { data: json },
    //     function (res) {
	// 	alert(res); }
    // }); 

	//$.post("save.php", {data: json },function(data){alert(data);});
    json=encode(json);
	var blob = new Blob( [ json ], {
        type: 'application/octet-stream'
    });
    
    url = URL.createObjectURL( blob );
    var link = document.createElement( 'a' );
    link.setAttribute( 'href', url );
    link.setAttribute( 'download', 'brain.json' );
    
    var event = document.createEvent( 'MouseEvents' );
    event.initMouseEvent( 'click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    link.dispatchEvent( event ); 

  }); 

  $("#btnSaveModel").click(function(){
	 
    var birdToSave=aliveBirds;
	birdToSave[0].brain.model.save('localstorage://BirdBrain');
	console.log("Model Saved to LocalStorage");
	  // var json=birdToSave[0].brain.serialize();
	  // aliveBirds[0].brain.model.save('downloads://my-model');
	   

  }); 

  $("#btnLoad").click(function(){
	 
    tf.loadLayersModel('localstorage://BirdBrain');
	console.log("Model Loaded from LocalStorage");

  }); 
});
 function pausegame(){
			if (game.status=="playing"){
			game.status="waitingReplay";

			}
			
		}

        $("#inicio").click(function(){
         //resetGame();
		 //totalPopulation = $("#numeroNpcs").val();
		 if(game==null){
			init();
			$("#inicio").html('Pausar Simulación');
		 }
			
			else if (game.status=="playing"){
				game.status="waitingReplay";
				$("#inicio").html('Continuar Simulación');
				}
			else if (game.status=="waitingReplay"){
				game.status="playing";
	
				}
			
		});
		$("#numeroNpcs").on("change keyup paste click", function(){
			totalPopulation=$("#numeroNpcs").val();
			});
        function restartgame(){
			if (game.status=="playing" ){
			game.status="waitingReplay";
			
			
			}
			
			else if(game.status=="waitingReplay"){
				game.status="playing";
				
			}
			
		}
 function setCursorByID(id,cursorStyle) {
    var elem;
    if (document.getElementById &&
       (elem=document.getElementById(id)) ) {
     if (elem.style) elem.style.cursor=cursorStyle;
    }
   }
//en cursor Style