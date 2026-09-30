(function(){
  var $ = function(id){ return document.getElementById(id); };
  var play = $('play'), scrub = $('scrub');
  $('voice').checked = false;                               /* text-to-speech narration off */
  setTimeout(function(){ play.click(); }, 400);             /* autoplay */

  /* ---- Recorded voices, one clip per teammate ----
     Each file is already retimed sentence by sentence to the animation cues and is
     exactly `len` seconds long, starting at `start` on the video timeline.
       Palconete : scene 1 (Intro) + scene 2 (The question)                              0 s -> 40 s
       Pedrigal  : scene 3 + start of scene 4 (played from js/main.js, not from here)   40 s -> 92 s
       Fuertes   : rest of scene 4 + scene 5 (Going up, coming down)                    92 s -> 140 s
       Veronica  : scene 5 (The equations) only                                         140 s -> 165 s
       Federizo  : scene 6 (Sample problem), part (a) - natural speed, video follows her    165 s -> 199.2 s
       Yute      : scene 7 (Recap) only                                                 226 s -> 248.9 s
       NOTE: the video is now 4:08.9 long. Yute still has to record the sample problem parts (b) and (c)
       (199.9 s -> 226 s), so that part is silent for now. The background music (3:55) ends early. */
  var CLIPS = [
    { name:'Palconete', file:'audio/palconete_synced.mp3', start:0,   len:40, tol:0.4 },
    { name:'Veronica', file:'audio/veronica.mp3',  start:140, len:25, tol:0.25 },
    { name:'Fuertes',  file:'audio/fuertes_synced.mp3',   start:92,  len:48, tol:0.4 },
    { name:'Federizo', file:'audio/federizo_problem.mp3',  start:165, len:34.19, tol:0.4 },
    { name:'Yute',     file:'audio/yute_recap_synced.mp3', start:226.0, len:22.9, tol:0.4 }
  ];
  var missing = {}, unlocked = false, wasBlocked = false;
  CLIPS.forEach(function(c){
    c.a = new Audio(c.file);
    c.a.preload = 'auto';
    c.a.addEventListener('error', function(){ missing[c.name] = true; say('Cannot load '+c.file+' - check it is in the audio folder'); });
  });

  /* ---- Background music ----
     audio/background.mp3 is the song looped back-to-back with smooth crossfades and cut to the
     full length of the video (3:55), with a fade-in at the start and a fade-out at the end.
     It gets louder when nobody is speaking and dips lower while a recorded voice is speaking. */
  var BG = { file:'audio/background.mp3', base:0.55, duck:0.20, tol:1.0 };   /* volumes: 0 (mute) to 1 (full)
                                                                           base = nobody speaking, duck = someone speaking */
  /* When the recorded voices are actually speaking, in seconds on the video timeline
     (short pauses between words/sentences are merged, so the music stays low during a speech).
       0 - 40 s    Palconete
       40 - 92 s   Pedrigal
       92 - 140 s  Fuertes
       140 - 165 s Veronica (equations)
       165 - 199 s Federizo (sample problem, part a)
       199 - 226 s Sample problem (b) and (c): waiting for Yute's recording
       226 - 249 s Yute (recap) */
  var VOICE = [
    [0.22, 13.56], [14.76, 21.89], [23.13, 28.32], [31.47, 37.65],                                   /* Palconete */
    [40.0, 47.75], [50.0, 59.9], [63.0, 66.1], [70.0, 79.2], [82.0, 91.05],                          /* Pedrigal  */
    [92.05, 109.1], [110.05, 111.7], [115.05, 122.3], [126.05, 129.4], [132.05, 137.1],              /* Fuertes   */
    [140.53, 144.69], [146.34, 163.43],                                                              /* Veronica  */
    [165.04, 186.40], [187.68, 199.03],                                                              /* Federizo  */
    [226.05, 248.3]                                                                                  /* Yute      */
  ];
  BG.a = new Audio(BG.file);
  BG.a.preload = 'auto';
  BG.a.volume = BG.base;
  BG.vol = BG.base; BG.missing = false;
  BG.a.addEventListener('error', function(){ BG.missing = true; say('Cannot load '+BG.file+' - check it is in the audio folder'); });
  var lastFrame = performance.now();

  /* small on-screen message (blocked sound / missing file) */
  var msg = document.createElement('div');
  msg.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:20;padding:6px 14px;border-radius:999px;background:#E24B4A;color:#fff;font:600 14px system-ui,sans-serif;display:none;pointer-events:none';
  document.body.appendChild(msg);
  function say(t){ msg.textContent = t; msg.style.display = t ? 'block' : 'none'; }

  /* first click / key press unlocks audio for the browser */
  function unlock(){
    if(unlocked) return;
    unlocked = true;
    /* the page autoplays with no click, so the browser blocks sound at the very start;
       on the first click, if that happened early on, restart so the intro is heard from the top */
    if(wasBlocked && (parseFloat(scrub.value)||0) < 20){
      setTimeout(function(){ $('restart').click(); if(play.textContent !== 'Pause'){ play.click(); } }, 60);
    }
    CLIPS.concat([BG]).forEach(function(c){
      var p = c.a.play();
      if(p && p.then){ p.then(function(){ c.a.pause(); c.a.currentTime = 0; }).catch(function(){ unlocked = false; }); }
    });
  }

  document.addEventListener('pointerdown', function(){
    unlock();
    if(play.textContent === 'Replay'){ $('restart').click(); if(play.textContent !== 'Pause'){ play.click(); } }
  });
  function jump(t){
    scrub.value = t; scrub.dispatchEvent(new Event('input')); scrub.dispatchEvent(new Event('change'));
    if(play.textContent !== 'Pause'){ play.click(); }
  }
  function clip(name){ for(var i=0;i<CLIPS.length;i++){ if(CLIPS[i].name === name) return CLIPS[i]; } }
  document.addEventListener('keydown', function(e){
    unlock();
    if(e.code === 'Space'){ e.preventDefault(); play.click(); }
    else if(e.key === 'f' || e.key === 'F'){
      if(document.fullscreenElement){ document.exitFullscreen(); } else { document.documentElement.requestFullscreen(); }
    }
    else if(e.key === 'p' || e.key === 'P'){ jump(clip('Palconete').start); }   /* test: jump to Palconete's part */
    else if(e.key === 'u' || e.key === 'U'){ jump(clip('Fuertes').start); }     /* test: jump to Fuertes's part */
    else if(e.key === 'v' || e.key === 'V'){ jump(clip('Veronica').start); }    /* test: jump to Veronica's part */
    else if(e.key === 'y' || e.key === 'Y'){ jump(clip('Yute').start); }        /* test: jump to Yute's part */
  });

  function syncVoice(){
    var T = parseFloat(scrub.value) || 0;
    var running = play.textContent === 'Pause';
    var now = performance.now(), dt = Math.min(0.1,(now-lastFrame)/1000); lastFrame = now;
    var narrating = false;
    CLIPS.forEach(function(c){
      var a = c.a, inside = T >= c.start && T < c.start + c.len;
      if(running && inside && !missing[c.name]){
        var want = T - c.start;                      /* position inside the clip */
        if(a.duration && want < a.duration){
          if(Math.abs(a.currentTime - want) > c.tol){ a.currentTime = want; }
          if(a.paused){
            var p = a.play();
            if(p && p.catch){ p.then(function(){ say(''); }).catch(function(){ wasBlocked = true; say('Click the page once to turn on sound'); }); }
          }
        }
      } else if(!a.paused){
        a.pause();
      }
    });
    /* background music: follows the video, loops via the pre-looped file, ducks under the voices */
    var b = BG.a;
    for(var vi=0; vi<VOICE.length; vi++){
      if(T >= VOICE[vi][0]-0.25 && T < VOICE[vi][1]+0.3){ narrating = running; break; }   /* a little early / late so it never clashes */
    }
    if(running && !BG.missing){
      if(b.duration && T < b.duration){
        if(Math.abs(b.currentTime - T) > BG.tol){ b.currentTime = T; }
        if(b.paused){
          var pb = b.play();
          if(pb && pb.then){ pb.then(function(){ say(''); }).catch(function(){ wasBlocked = true; say('Click the page once to turn on sound'); }); }
        }
      }
    } else if(!b.paused){
      b.pause();
    }
    var target = narrating ? BG.duck : BG.base;
    var speed = target < BG.vol ? 6 : 1.6;                   /* drops quickly under a voice, rises slowly afterwards */
    BG.vol += (target - BG.vol) * Math.min(1, dt*speed);
    b.volume = Math.max(0, Math.min(1, BG.vol));
    requestAnimationFrame(syncVoice);
  }
  requestAnimationFrame(syncVoice);
})();