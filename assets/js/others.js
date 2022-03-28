//cursor Style
$(document).ready(function() {
	setCursorByID("world","crosshair");
 });
 function setCursorByID(id,cursorStyle) {
    var elem;
    if (document.getElementById &&
       (elem=document.getElementById(id)) ) {
     if (elem.style) elem.style.cursor=cursorStyle;
    }
   }
//en cursor Style