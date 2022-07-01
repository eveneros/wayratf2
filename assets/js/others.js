//cursor Style
$(document).ready(function() {
	setCursorByID("world","crosshair");
   totalPopulation=$("#numeroNpcs").val();
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
	//alert("click");
	//let pCinco=new p5();
    var birdToSave=aliveBirds;
	   var json=birdToSave[0].brain.serialize();

	//    pCinco.saveJson(json,'plane.json');
	//   console.log(birdToSave);
	/* $.ajax
    ({
        type: "GET",
        dataType : 'json',
        async: false,
        url: 'save.php',
        data: { data: json },
        function (res) {
		alert(res); }
    }); */

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
});
 function pausegame(){
			if (game.status=="playing"){
			game.status="waitingReplay";

			}
			
		}

        $("#inicio").click(function(){
         resetGame();
			
			
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