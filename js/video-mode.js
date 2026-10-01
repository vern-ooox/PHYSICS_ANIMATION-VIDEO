(function(){
  var $ = function(id){ return document.getElementById(id); };
  var play = $('play'), scrub = $('scrub');
  $('voice').checked = false;                               /* text-to-speech narration off */
  setTimeout(function(){ play.click(); }, 400);             /* autoplay */

  /* ---- Recorded voices, one clip per teammate ----
     Each file is retimed caption by caption to the animation cues and is exactly `len`
     seconds long, starting at `start` on the video timeline.
       Palconete : scene 1 (Intro) + scene 2 (The question)                      0 s -> 40 s
       Pedrigal  : scene 3 + start of scene 4 (played from js/main.js)           40 s -> 92 s
       Fuertes   : rest of scene 4 + scene 5                                     92 s -> 140 s
       Federizo  : The equations + Sample problem part (a)                      140 s -> 228.1 s
       Yute      : Sample problem parts (b) and (c) + Recap                    228.07 s -> 382.3 s
     The video is now 6:22 long (382.25 s).
     master:true = this recording is the master clock: while it plays, the video (captions and
     animation) is pulled to the audio position, so it always follows the narrator. */
  var CLIPS = [
    { name:'Palconete', file:'audio/palconete_synced.mp3', start:0,   len:40, tol:0.4, master:true },
    { name:'Fuertes',   file:'audio/fuertes_synced.mp3',   start:92,  len:48, tol:0.4, master:true },
    { name:'Federizo',  file:'audio/federizo_synced.mp3',  start:140, len:88.11, tol:0.4, master:true },
    { name:'Yute',      file:'audio/yute_synced.mp3',      start:228.07, len:154.23, tol:0.4, master:true }
  ];
  var missing = {}, unlocked = false, wasBlocked = false;
  CLIPS.forEach(function(c){
    c.a = new Audio(c.file);
    c.a.preload = 'auto';
    c.a.addEventListener('error', function(){ missing[c.name] = true; say('Cannot load '+c.file+' - check it is in the audio folder'); });
  });

  /* Video time according to the narrator's audio, or null when no master recording is playing.
     js/main.js reads this every frame and keeps captions + animation locked to it. */
  window.narrationClock = function(){
    var Tv = parseFloat(scrub.value) || 0;
    for(var i=0;i<CLIPS.length;i++){
      var c = CLIPS[i], a = c.a;
      if(!c.master || missing[c.name]) continue;
      if(Tv < c.start-0.5 || Tv > c.start+c.len+0.5) continue;
      if(a.paused || a.ended || a.readyState < 2 || !a.duration) continue;
      if(a.currentTime < 0.02 || a.currentTime > a.duration-0.03) continue;
      return c.start + a.currentTime;
    }
    return null;
  };

  /* ---- Background music ----
     audio/background.mp3 (3:55) follows the video and restarts from its beginning when it
     ends, because the video is now longer than the song. It gets louder when nobody is
     speaking and dips lower while a recorded voice is speaking. */
  var BG = { file:'audio/background.mp3', base:0.55, duck:0.20, tol:1.0 };   /* volumes: 0 (mute) to 1 (full) */
  /* When the recorded voices are speaking, in seconds on the video timeline
     (short pauses between sentences are merged, so the music stays low during a speech). */
  var VOICE = [
    [0.22, 13.56], [14.76, 21.89], [23.13, 28.32], [31.47, 37.65],                                   /* Palconete */
    [40.0, 47.75], [50.0, 59.9], [63.0, 66.1], [70.0, 79.2], [82.0, 91.05],                          /* Pedrigal  */
    [92.05, 109.1], [110.05, 111.7], [115.05, 122.3], [126.05, 129.4], [132.05, 137.1],              /* Fuertes   */
    [140.05, 143.61], [146.05, 202.45], [204.37, 211.51], [213.52, 225.61],                          /* Federizo  */
    [228.12, 309.49], [311.29, 321.74], [322.99, 381.25]                                             /* Yute      */
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
    else if(e.key === 'v' || e.key === 'V'){ jump(clip('Federizo').start); }    /* test: jump to Federizo's part */
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
          /* master clips are never seeked while playing: the video follows them, not the other way round.
             They are only seeked when starting, or after the person jumps/scrubs far away. */
          var tol = (c.master && !a.paused) ? 1.0 : c.tol;
          if(Math.abs(a.currentTime - want) > tol){ a.currentTime = want; }
          if(a.paused){
            var p = a.play();
            if(p && p.catch){ p.then(function(){ say(''); }).catch(function(){ wasBlocked = true; say('Click the page once to turn on sound'); }); }
          }
        }
      } else if(!a.paused){
        a.pause();
      }
    });
    /* background music: follows the video, restarts when the song ends, ducks under the voices */
    var b = BG.a;
    for(var vi=0; vi<VOICE.length; vi++){
      if(T >= VOICE[vi][0]-0.25 && T < VOICE[vi][1]+0.3){ narrating = running; break; }   /* a little early / late so it never clashes */
    }
    if(running && !BG.missing){
      if(b.duration){
        var pos = T % b.duration;                    /* wraps around after 3:55 */
        if(Math.abs(b.currentTime - pos) > BG.tol){ b.currentTime = pos; }
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