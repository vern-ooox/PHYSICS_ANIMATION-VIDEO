(function(){
  var $ = function(id){ return document.getElementById(id); };
  var play = $('play');
  $('voice').checked = false;                               /* narration off */
  setTimeout(function(){ play.click(); }, 400);             /* autoplay */
  document.addEventListener('pointerdown', function(){
    if(play.textContent === 'Replay'){ $('restart').click(); if(play.textContent !== 'Pause'){ play.click(); } }
  });
  document.addEventListener('keydown', function(e){
    if(e.code === 'Space'){ e.preventDefault(); play.click(); }
    else if(e.key === 'f' || e.key === 'F'){
      if(document.fullscreenElement){ document.exitFullscreen(); } else { document.documentElement.requestFullscreen(); }
    }
  });
})();