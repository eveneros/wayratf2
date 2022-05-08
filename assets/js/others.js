//cursor Style
$(document).ready(function() {
	setCursorByID("world","crosshair");
   totalPopulation=$("#numeroNpcs").val();
   init();
   pausegame();
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