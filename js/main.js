(function(){
  var $ = function(id){ return document.getElementById(id); };
  var C = function(v,a,b){ a = a===undefined?0:a; b = b===undefined?1:b; return Math.max(a,Math.min(b,v)); };
  var lerp = function(a,b,k){ return a+(b-a)*k; };
  var op = function(id,v){ $(id).style.opacity = v; };
  var ease = function(k){ return k*k*(3-2*k); };
  var G = 9.8;

  var stageEl = $('stage'), canvas = $('gl');
  if(!window.THREE){ $('nogl').style.display='flex'; return; }
  var renderer;
  try{ renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true}); }
  catch(err){ $('nogl').style.display='flex'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* ---------- basics ---------- */
  var scene = new THREE.Scene();
  var SKY = new THREE.Color(0xBFE3F7), NAVY = new THREE.Color(0x0E1D3A);
  scene.background = new THREE.Color(0xBFE3F7);
  scene.fog = new THREE.Fog(0xBFE3F7, 45, 130);
  var camera = new THREE.PerspectiveCamera(42, 16/9, 0.1, 400);

  var hemi = new THREE.HemisphereLight(0xffffff, 0x8fae74, 0.85);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2d6, 0.85);
  sun.position.set(-10, 25, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  var SUN_DAY = new THREE.Color(0xfff2d6), SUN_NIGHT = new THREE.Color(0x9db4ff);

  function mat(c,o){
    var p = {color:c, roughness:0.7, metalness:0};
    if(o){ for(var k in o){ p[k] = o[k]; } }
    return new THREE.MeshStandardMaterial(p);
  }
  function mk(geo,m,x,y,z,shadow){
    var me = new THREE.Mesh(geo,m);
    me.position.set(x||0,y||0,z||0);
    me.castShadow = shadow!==false;
    me.receiveShadow = true;
    return me;
  }
  var seed = 7;
  function rnd(){ seed = (seed*16807)%2147483647; return (seed-1)/2147483646; }

  /* ---------- world: ground, hills, trees, clouds, sun, stars ---------- */
  var tint = [];
  function tinted(m, night){ tint.push({m:m, day:m.color.clone(), night:new THREE.Color(night)}); return m; }

  var groundMat = tinted(mat(0x7DBA5B,{roughness:1}), 0x1B3A2C);
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(600,600), groundMat);
  ground.rotation.x = -Math.PI/2; ground.receiveShadow = true; scene.add(ground);
  var padMat = tinted(mat(0x8CCB68,{roughness:1}), 0x224536);
  var pad = new THREE.Mesh(new THREE.CircleGeometry(16,56), padMat);
  pad.rotation.x = -Math.PI/2; pad.position.y = 0.02; pad.receiveShadow = true; scene.add(pad);

  var hillMat = tinted(mat(0x6FAE55,{roughness:1}), 0x17301F);
  [[-60,-100,44],[8,-115,52],[70,-95,40],[-20,-130,60]].forEach(function(a){
    var h = new THREE.Mesh(new THREE.SphereGeometry(a[2],28,16), hillMat);
    h.scale.y = 0.4; h.position.set(a[0],0,a[1]); scene.add(h);
  });

  var trunkMat = tinted(mat(0x8C5A3A), 0x2A1E17);
  var leafMat = tinted(mat(0x3F9B4F), 0x14331F);
  var leafMat2 = tinted(mat(0x53AE5E), 0x1A3E27);
  for(var ti=0; ti<30; ti++){
    var tx = (rnd()-0.5)*100, tz = -14 - rnd()*48, ts = 1.3 + rnd()*1.5;
    var tree = new THREE.Group();
    tree.add(mk(new THREE.CylinderGeometry(.22*ts,.3*ts,1.6*ts,8),trunkMat,0,.8*ts,0,false));
    tree.add(mk(new THREE.ConeGeometry(1.5*ts,3.2*ts,10),(ti%2?leafMat:leafMat2),0,3.0*ts,0,false));
    tree.add(mk(new THREE.ConeGeometry(1.1*ts,2.4*ts,10),(ti%2?leafMat2:leafMat),0,4.4*ts,0,false));
    tree.position.set(tx,0,tz);
    scene.add(tree);
  }

  var cloudMat = new THREE.MeshLambertMaterial({color:0xffffff, emissive:0x505a66, transparent:true, opacity:0.95});
  var clouds = [];
  function makeCloud(s){
    var c = new THREE.Group();
    [[0,0,0,2.2],[-2.2,-.3,.3,1.6],[2.1,-.25,-.2,1.7],[.6,.8,0,1.5],[-1,.6,.4,1.2]].forEach(function(a){
      var m = new THREE.Mesh(new THREE.SphereGeometry(a[3],14,10),cloudMat);
      m.position.set(a[0],a[1],a[2]); m.scale.y = 0.7; c.add(m);
    });
    c.scale.setScalar(s); return c;
  }
  for(var ci=0; ci<7; ci++){
    var cl = makeCloud(1.4 + rnd()*1.6);
    var info = {o:cl, base:(rnd()-0.5)*200, sp:0.5 + rnd()*0.9, y:14 + rnd()*12, z:-24 - rnd()*36};
    cl.position.set(0,info.y,info.z); scene.add(cl); clouds.push(info);
  }

  var sunMat = new THREE.MeshBasicMaterial({color:0xFFD65A, fog:false});
  var sunMesh = new THREE.Mesh(new THREE.SphereGeometry(4,24,16), sunMat);
  sunMesh.position.set(28,26,-80); scene.add(sunMesh);
  var haloMat = new THREE.MeshBasicMaterial({color:0xFFE9A0, transparent:true, opacity:0.25, fog:false, depthWrite:false});
  var halo = new THREE.Mesh(new THREE.SphereGeometry(6.5,24,16), haloMat);
  halo.position.copy(sunMesh.position); scene.add(halo);
  var SUN_C = new THREE.Color(0xFFD65A), MOON_C = new THREE.Color(0xE8EEFF);

  var starPos = [];
  for(var si0=0; si0<1500; si0++){
    var th = rnd()*Math.PI*2, ph = rnd()*1.5, R = 180;
    starPos.push(R*Math.sin(ph)*Math.cos(th), R*Math.cos(ph), R*Math.sin(ph)*Math.sin(th));
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos,3));
  var starMat = new THREE.PointsMaterial({color:0xffffff, size:2.2, sizeAttenuation:false, transparent:true, opacity:0, fog:false, depthWrite:false});
  var stars = new THREE.Points(starGeo, starMat); stars.visible = false; scene.add(stars);

  var mixNow = 0;
  function drawWorld(T, mix){
    for(var i=0;i<clouds.length;i++){
      var c = clouds[i];
      c.o.position.x = ((c.base + T*c.sp + 140) % 280) - 140;
    }
    scene.background.copy(SKY).lerp(NAVY, mix);
    scene.fog.color.copy(scene.background);
    for(var j=0;j<tint.length;j++){ tint[j].m.color.copy(tint[j].day).lerp(tint[j].night, mix); }
    hemi.intensity = lerp(0.85, 0.4, mix);
    sun.intensity = lerp(0.85, 0.3, mix);
    sun.color.copy(SUN_DAY).lerp(SUN_NIGHT, mix);
    cloudMat.opacity = 0.95*(1-mix);
    sunMat.color.copy(SUN_C).lerp(MOON_C, mix);
    haloMat.opacity = lerp(0.25, 0.12, mix);
    starMat.opacity = mix; stars.visible = mix>0.01;
  }

  /* ---------- characters and props ---------- */
  var CAST = [
    /* 0 Palconete - boy */ {dress:0x2F7FD1, hair:0x4A2C1A, skin:0xF2C9A0, pants:0x33415C, top:'shirt', style:'short', h:1.06},
    /* 1 Pedrigal  - boy */ {dress:0xF08A2E, hair:0x1E1A18, skin:0xD9A273, pants:0x4A4F5C, top:'shirt', style:'short', h:1.10},
    /* 2 Fuertes   - boy */ {dress:0x3FAE6A, hair:0x181312, skin:0x9A6440, pants:0x3B5B92, top:'shirt', style:'short', h:1.02},
    /* 3 Federizo  - girl */ {dress:0xE8598B, hair:0x4A2C1A, skin:0xF5D5B0, pants:0x3B5B92, top:'dress', style:'long',  h:0.96},
    /* 4 Yute      - girl */ {dress:0x8E5CC7, hair:0xC9A253, skin:0xE8B48C, pants:0x3B5B92, top:'dress', style:'long',   h:1.00}
  ];
  function makeMika(id){
    var o = CAST[id||0];
    var g = new THREE.Group();
    var skin = mat(o.skin,{roughness:0.6}), dress = mat(o.dress), pants = mat(o.pants);
    var hair = mat(o.hair,{roughness:0.9}), shoe = mat(0x5A3A26), dark = mat(0x222222,{roughness:0.4});
    var shirt = o.top==='shirt';
    [-1,1].forEach(function(s){
      g.add(mk(new THREE.CylinderGeometry(.055,.055,shirt?.58:.5,12),pants,s*.09,shirt?.29:.25,0));
      var sh = mk(new THREE.SphereGeometry(.085,12,8),shoe,s*.09,.04,.03); sh.scale.set(1,.55,1.6); g.add(sh);
    });
    if(shirt){ g.add(mk(new THREE.CylinderGeometry(.17,.15,.56,24),dress,0,.83,0)); }
    else { g.add(mk(new THREE.CylinderGeometry(.16,.3,.62,24),dress,0,.8,0)); }
    g.add(mk(new THREE.CylinderGeometry(.045,.05,.1,10),skin,0,1.16,0));
    var head = new THREE.Group(); head.position.set(0,1.34,0); g.add(head);
    head.add(mk(new THREE.SphereGeometry(.2,28,20),skin,0,0,0));
    var cap = mk(new THREE.SphereGeometry(.215,28,16,0,Math.PI*2,0,Math.PI*.5),hair,0,.005,0);
    cap.rotation.x = -.45; head.add(cap);
    head.add(mk(new THREE.SphereGeometry(.205,20,14),hair,0,0,-.06));
    if(o.style==='buns'){
      [-1,1].forEach(function(s){ head.add(mk(new THREE.SphereGeometry(.08,14,10),hair,s*.15,.17,-.03)); });
    } else if(o.style==='long'){
      var lg = mk(new THREE.SphereGeometry(.2,16,12),hair,0,-.17,-.1); lg.scale.set(1,1.7,.7); head.add(lg);
    } else if(o.style==='pony'){
      head.add(mk(new THREE.SphereGeometry(.07,12,10),hair,0,.06,-.24));
      var pt = mk(new THREE.SphereGeometry(.06,12,10),hair,0,-.1,-.27); pt.scale.set(1,2.2,1); head.add(pt);
    }
    [-1,1].forEach(function(s){
      head.add(mk(new THREE.SphereGeometry(.022,10,8),dark,s*.07,.02,.185,false));
      var bl = mk(new THREE.SphereGeometry(.03,10,8),mat(0xF29A9A),s*.12,-.03,.158,false); bl.scale.set(1,.6,.35); head.add(bl);
    });
    var sm = new THREE.Mesh(new THREE.TorusGeometry(.045,.007,6,14,Math.PI),dark);
    sm.rotation.z = Math.PI; sm.position.set(0,-.045,.19); head.add(sm);
    function arm(s){
      var piv = new THREE.Group(); piv.position.set(s*.18,1.05,0);
      piv.add(mk(new THREE.CylinderGeometry(.036,.036,.42,10),skin,0,-.21,0));
      piv.add(mk(new THREE.CylinderGeometry(.055,.05,.13,12),dress,0,-.065,0));
      var hand = mk(new THREE.SphereGeometry(.05,12,10),skin,0,-.45,0); piv.add(hand);
      g.add(piv); return {piv:piv, hand:hand};
    }
    var A = arm(1), B = arm(-1);
    return {group:g, head:head, armA:A.piv, armB:B.piv, handA:A.hand, handB:B.hand, h:o.h};
  }
  /* angles are measured from "hanging down"; bigger means the arm is raised higher */
  function pose(m,a,b){ m.armA.rotation.z = a; m.armB.rotation.z = -b; }
  function placeMika(m,s,handX,baseY,ang){
    m.group.scale.setScalar(s*m.h);
    m.group.position.set(0,baseY,0);
    pose(m,ang,0.15);
    var h = new THREE.Vector3();
    m.handA.getWorldPosition(h);
    m.group.position.x = handX - h.x;
    m.handA.getWorldPosition(h);
    return h.clone();
  }

  var NAMES = ['Palconete','Pedrigal','Fuertes','Federizo','Yute'];
  function crew(parent, ids, xs, z, sc, faceX){
    return ids.map(function(id,i){
      var m = makeMika(id);
      m.group.scale.setScalar(sc*m.h);
      m.group.position.set(xs[i],0,z);
      m.group.rotation.y = Math.atan2(faceX - xs[i], 8);
      m.bx = xs[i]; m.bz = z; m.top = 1.62*sc*m.h + 0.35;
      parent.add(m.group);
      return m;
    });
  }
  function look(m,up){ m.head.rotation.x = -up; }

  function makeBall(){
    var g = new THREE.Group();
    g.add(mk(new THREE.SphereGeometry(.3,32,24),mat(0xE24B4A,{roughness:0.3,metalness:0.05}),0,0,0));
    var wm = mat(0xFFFFFF,{roughness:0.4});
    var t1 = new THREE.Mesh(new THREE.TorusGeometry(.3,.028,8,48),wm); t1.castShadow = false; g.add(t1);
    var t2 = new THREE.Mesh(new THREE.TorusGeometry(.3,.028,8,48),wm); t2.rotation.y = Math.PI/2; t2.castShadow = false; g.add(t2);
    return g;
  }
  function makeFeather(){
    var g = new THREE.Group();
    var geo = new THREE.PlaneGeometry(1.1,.34,24,6), pa = geo.attributes.position;
    for(var i=0;i<pa.count;i++){
      var u = pa.getX(i)/.55, y = pa.getY(i);
      var prof = Math.pow(Math.max(0,1-u*u),.55);
      pa.setY(i,y*prof); pa.setZ(i,.09*u*u);
    }
    geo.computeVertexNormals();
    var blade = new THREE.Mesh(geo, mat(0xFFFBF0,{roughness:0.9, side:THREE.DoubleSide}));
    blade.castShadow = true; blade.receiveShadow = true; g.add(blade);
    var pts = [];
    for(var k=0;k<=12;k++){ var uu = -1+k/6; pts.push(new THREE.Vector3(uu*.56,0,.09*uu*uu)); }
    var rach = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),24,.011,6,false), mat(0xB8A98A));
    rach.castShadow = false; g.add(rach);
    return g;
  }
  function makeArrow(color,r){
    var g = new THREE.Group(), m = mat(color,{roughness:0.5});
    var sg = new THREE.CylinderGeometry(r,r,1,12); sg.translate(0,.5,0);
    var shaft = new THREE.Mesh(sg,m); shaft.castShadow = false; g.add(shaft);
    var hg = new THREE.ConeGeometry(r*2.4,r*5,16); hg.translate(0,r*2.5,0);
    var head = new THREE.Mesh(hg,m); head.castShadow = false; g.add(head);
    g.userData = {shaft:shaft, head:head};
    return g;
  }
  function setArrow(a,len){
    var L = Math.abs(len);
    a.visible = L>0.05;
    a.rotation.x = len<0 ? Math.PI : 0;
    a.userData.shaft.scale.y = Math.max(L,0.001);
    a.userData.head.position.y = L;
  }
  function dropY(y0,yG,tau,e){
    if(tau<=0) return y0;
    var h = y0-yG, t1 = Math.sqrt(2*h/G);
    if(tau<t1) return y0 - 0.5*G*tau*tau;
    var v = G*t1*e, tt = tau-t1;
    for(var i=0;i<4;i++){
      var fl = 2*v/G;
      if(tt<fl) return yG + v*tt - 0.5*G*tt*tt;
      tt -= fl; v *= e;
    }
    return yG;
  }

  /* ---------- camera and labels ---------- */
  var orbit = {yaw:0, pitch:0, drag:false};
  var SW = 960, SH = 540;
  var tmpV = new THREE.Vector3(), camOff = new THREE.Vector3(), sph = new THREE.Spherical();
  function setCam(px,py,pz,tx,ty,tz,t){
    camOff.set(px-tx,py-ty,pz-tz);
    sph.setFromVector3(camOff);
    sph.theta += orbit.yaw + Math.sin(t*0.25)*0.05;
    sph.phi = C(sph.phi - orbit.pitch + Math.sin(t*0.2)*0.02, 0.3, 1.8);
    camOff.setFromSpherical(sph);
    camera.position.set(tx+camOff.x, Math.max(0.4, ty+camOff.y), tz+camOff.z);
    camera.lookAt(tx,ty,tz);
    camera.updateMatrixWorld(true);
  }
  function anchor(id,x,y,z){
    tmpV.set(x,y,z).project(camera);
    var el = $(id);
    el.style.left = ((tmpV.x*0.5+0.5)*SW).toFixed(1)+'px';
    el.style.top = ((-tmpV.y*0.5+0.5)*SH).toFixed(1)+'px';
  }

  /* ---------- scene 0: intro ---------- */
  var g0 = new THREE.Group(); scene.add(g0);
  var c0 = crew(g0,[0,1,2,3,4],[-5.4,-4.25,-3.1,-1.95,-0.8],0,1.3,1.5);
  var b0 = makeBall(); b0.scale.setScalar(1.3); g0.add(b0);
  var f0 = makeFeather(); f0.scale.setScalar(1.3); g0.add(f0);

  /* ---------- scene 1: the question (rooftop) ---------- */
  var g1 = new THREE.Group(); scene.add(g1);
  var brick = mat(0xC98F63,{roughness:0.9}), trim = mat(0x8C5A3A);
  g1.add(mk(new THREE.BoxGeometry(4.6,6,4.6),brick,-6.2,3,0));
  g1.add(mk(new THREE.BoxGeometry(5.2,.3,5.2),trim,-6.2,6.15,0));
  g1.add(mk(new THREE.BoxGeometry(.9,.9,.9),mat(0xA97B57),-8.0,6.75,-1.2));
  g1.add(mk(new THREE.BoxGeometry(1.0,1.8,.1),mat(0x5A3A26),-6.2,.9,2.33));
  [[-7.4,3.0],[-5.0,3.0],[-7.4,4.8],[-5.0,4.8]].forEach(function(w){
    g1.add(mk(new THREE.BoxGeometry(1.05,1.15,.06),trim,w[0],w[1],2.31,false));
    g1.add(mk(new THREE.BoxGeometry(.85,.95,.06),mat(0xFFE9A8,{emissive:0xffd77a,emissiveIntensity:0.35,roughness:0.4}),w[0],w[1],2.35,false));
  });
  var m1 = makeMika(0); g1.add(m1.group);
  var w1 = crew(g1,[1,2,3,4],[1.6,3.1,4.6,6.1],2.2,1.4,-3);
  var hold1 = placeMika(m1, 1.8, -3.15, 6.3, 1.65);
  var ballHold1 = hold1.clone().add(new THREE.Vector3(.25,.42,0));
  var featHold1 = hold1.clone().add(new THREE.Vector3(.25,.1,0));
  var b1 = makeBall(); g1.add(b1);
  var f1 = makeFeather(); g1.add(f1);

  /* ---------- scene 2: vacuum tube ---------- */
  var g2 = new THREE.Group(); scene.add(g2);
  var metal = mat(0x90A4AE,{roughness:0.35,metalness:0.5});
  g2.add(mk(new THREE.CylinderGeometry(3.7,3.9,.3,48),metal,0,.15,0));
  g2.add(mk(new THREE.CylinderGeometry(3.6,3.6,.35,48),metal,0,9.075,0));
  g2.add(mk(new THREE.CylinderGeometry(.35,.35,.5,16),metal,0,9.5,0));
  var glass = new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,8.6,48,1,true),
    new THREE.MeshStandardMaterial({color:0xBFE6FF,transparent:true,opacity:0.16,roughness:0.05,side:THREE.DoubleSide,depthWrite:false}));
  glass.position.y = 4.6; g2.add(glass);
  var streak = new THREE.Mesh(new THREE.BoxGeometry(.18,6.4,.02),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.35,depthWrite:false}));
  streak.position.set(-2.2,4.7,2.55); streak.rotation.y = -0.65; g2.add(streak);
  var pipe = mk(new THREE.CylinderGeometry(.16,.16,3,12),metal,-5.2,.5,0); pipe.rotation.z = Math.PI/2; g2.add(pipe);
  var gauge = mk(new THREE.CylinderGeometry(.6,.6,.25,24),mat(0xF4F4F0),-6.7,.9,0); gauge.rotation.x = Math.PI/2; g2.add(gauge);
  var needle = mk(new THREE.BoxGeometry(.05,.4,.05),mat(0xE24B4A),-6.7,.98,.15,false); needle.rotation.z = 0.7; g2.add(needle);
  var w2 = crew(g2,[0,1,2,3,4],[-9.0,-7.6,6.6,7.9,9.2],3,1.5,0);
  var b2 = makeBall(); g2.add(b2);
  var f2 = makeFeather(); g2.add(f2);

  /* ---------- scene 3: acceleration ruler ---------- */
  var g3 = new THREE.Group(); scene.add(g3);
  var RX = -2.6, TOP3 = 12.55, K3 = 0.49;
  g3.add(mk(new THREE.BoxGeometry(.7,12.6,.3),mat(0xF5D27A,{roughness:0.5}),RX,6.55,0));
  var tkMat = mat(0xB8912F);
  for(var ki=0; ki<=12; ki++){
    var maj = ki%5===0, tw = maj?.9:.5;
    g3.add(mk(new THREE.BoxGeometry(tw,.06,.06),tkMat,RX+.35+tw/2,TOP3-ki,.16,false));
  }
  g3.add(mk(new THREE.CylinderGeometry(1.3,1.3,.05,40),mat(0xFFFFFF),0,.04,0,false));
  g3.add(mk(new THREE.CylinderGeometry(.8,.8,.06,40),mat(0xE24B4A),0,.05,0,false));
  var w3 = crew(g3,[0,1,2,3,4],[-10.5,-9.1,-7.7,-6.3,-4.9],1.5,1.7,0);
  var b3 = makeBall(); g3.add(b3);
  var ghosts3 = [];
  for(var gi=1; gi<=5; gi++){
    var gm = new THREE.Mesh(new THREE.SphereGeometry(.3,20,14),new THREE.MeshBasicMaterial({color:0xE24B4A,transparent:true,opacity:0.3,depthWrite:false}));
    gm.position.set(0,TOP3-K3*gi*gi,0); g3.add(gm); ghosts3.push(gm);
  }
  var trail3 = new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1,8),new THREE.MeshBasicMaterial({color:0x7d8a96}));
  g3.add(trail3);
  var ga3 = makeArrow(0xE24B4A,.16); ga3.position.set(7.2,11,0); setArrow(ga3,-7); g3.add(ga3);

  /* ---------- scenes 4 and 6: throwing rig ---------- */
  var S_M = 0.35, PEAK = 20.41*S_M;
  function buildToss(ballX){
    var g = new THREE.Group(); scene.add(g);
    var m = makeMika(); g.add(m.group);
    var hold = placeMika(m, 1.5, ballX, 0, 1.9);
    var launch = hold.y + 0.4;
    var ball = makeBall(); g.add(ball);
    var guide = new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,1,6),new THREE.MeshBasicMaterial({color:0x7d8a96,transparent:true,opacity:0.6}));
    guide.scale.y = PEAK; guide.position.set(ballX, launch+PEAK/2, 0); g.add(guide);
    var mark = mk(new THREE.CylinderGeometry(.5,.5,.04,28),mat(0xFFFFFF),ballX,.04,0,false); g.add(mark);
    return {g:g, m:m, ball:ball, launch:launch};
  }
  var BX4 = -0.9, BX6 = 0.3;
  var r4 = buildToss(BX4);
  var w4 = crew(r4.g,[1,2,3,4],[-7.6,-6.2,-4.8,-3.4],0.8,1.4,0);
  var va4 = makeArrow(0x185FA5,.07); r4.g.add(va4);
  var ga4 = makeArrow(0xE24B4A,.14); ga4.position.set(7.2,8.6,0); setArrow(ga4,-6); r4.g.add(ga4);
  var r6 = buildToss(BX6);
  var w6 = crew(r6.g,[1,2,3,4],[-6.8,-5.5,-4.2,-2.9],0.8,1.4,0);
  var hd6 = new THREE.Group(); r6.g.add(hd6);
  var hUp = makeArrow(0x3B6D11,.045), hDn = makeArrow(0x3B6D11,.045);
  hUp.position.y = r6.launch + PEAK/2; hDn.position.y = r6.launch + PEAK/2;
  setArrow(hUp, PEAK/2-.24); setArrow(hDn, -(PEAK/2-.24));
  hd6.add(hUp); hd6.add(hDn);
  [r6.launch, r6.launch+PEAK].forEach(function(y){
    var tk = new THREE.Mesh(new THREE.BoxGeometry(.9,.04,.04),new THREE.MeshBasicMaterial({color:0x3B6D11}));
    tk.position.set(0,y,0); hd6.add(tk);
  });
  hd6.position.set(BX6+1.2,0,0);

  /* ---------- scene 5: classroom chalkboard ---------- */
  var g5 = new THREE.Group(); scene.add(g5);
  g5.add(mk(new THREE.BoxGeometry(90,26,.6),mat(0xE7DDC6,{roughness:1}),0,13,-1.3,false));
  g5.add(mk(new THREE.BoxGeometry(90,3,.2),mat(0xA9825A),0,1.5,-.9,false));
  g5.add(mk(new THREE.BoxGeometry(90,.2,30),mat(0xB58B5A,{roughness:0.8}),0,-.08,14,false));
  g5.add(mk(new THREE.BoxGeometry(14.6,8.4,.3),mat(0x8B5E3C),0,4.6,-.9));
  g5.add(mk(new THREE.BoxGeometry(13.9,7.7,.12),mat(0x2E5A4B,{roughness:1}),0,4.6,-.72,false));
  g5.add(mk(new THREE.BoxGeometry(5,.12,.35),mat(0x8B5E3C),0,.4,-.55));
  [-1.2,-.4,.6].forEach(function(x){
    var ch = mk(new THREE.CylinderGeometry(.04,.04,.35,8),mat(0xFFFFFF),x,.5,-.5); ch.rotation.z = Math.PI/2; ch.rotation.y = x; g5.add(ch);
  });
  var clk = mk(new THREE.CylinderGeometry(1,1,.15,36),mat(0xFFFFFF),9.5,7.6,-.9); clk.rotation.x = Math.PI/2; g5.add(clk);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(1,.09,10,40),mat(0x37474F)); rim.position.set(9.5,7.6,-.82); g5.add(rim);
  g5.add(mk(new THREE.BoxGeometry(.08,.6,.04),mat(0x222222),9.5,7.85,-.8,false));
  var h2 = mk(new THREE.BoxGeometry(.08,.45,.04),mat(0x222222),9.63,7.6,-.79,false); h2.rotation.z = -1.4; g5.add(h2);

  var w5 = crew(g5,[0,1,2,3,4],[-6,-3,0,3,6],3.4,1.15,0);

  function makeCard(text,cap,icon){
    var cv = document.createElement('canvas'); cv.width = 1024; cv.height = 144;
    var x = cv.getContext('2d');
    x.fillStyle = '#F7F3E3';
    x.beginPath();
    if(x.roundRect){ x.roundRect(2,2,1020,140,26); } else { x.rect(2,2,1020,140); }
    x.fill();
    x.lineWidth = 6; x.lineCap = 'round'; x.strokeStyle = '#185FA5'; x.fillStyle = '#fff';
    if(icon===0){
      x.beginPath(); x.arc(80,72,36,0,Math.PI*2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(80,72); x.lineTo(80,50); x.moveTo(80,72); x.lineTo(96,72); x.stroke();
    } else if(icon===1){
      x.fillStyle = '#F5D27A'; x.strokeStyle = '#B8912F';
      x.fillRect(44,54,72,36); x.strokeRect(44,54,72,36);
      x.beginPath(); [62,76,90,104].forEach(function(px){ x.moveTo(px,54); x.lineTo(px,68); }); x.stroke();
    } else {
      x.strokeStyle = '#E24B4A'; x.lineWidth = 8;
      x.beginPath(); x.arc(80,88,36,Math.PI,Math.PI*2); x.stroke();
      x.strokeStyle = '#1B3B2F'; x.lineWidth = 6;
      x.beginPath(); x.moveTo(80,88); x.lineTo(98,62); x.stroke();
      x.fillStyle = '#1B3B2F'; x.beginPath(); x.arc(80,88,6,0,Math.PI*2); x.fill();
    }
    x.fillStyle = '#1B3B2F'; x.font = '700 56px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(text,150,74);
    x.fillStyle = '#5A6B62'; x.font = '400 30px system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
    x.textAlign = 'right'; x.fillText(cap,1000,76);
    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 8;
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(11.5,11.5*144/1024), new THREE.MeshBasicMaterial({map:tex,transparent:true,fog:false}));
    return mesh;
  }
  var cards5 = [
    makeCard('Vf = Vo + gt','velocity and time',0),
    makeCard('d = Vot + gt²/2','distance and time',1),
    makeCard('Vf² = Vo² + 2gd','velocity and distance',2)
  ];
  cards5.forEach(function(c){ c.position.z = -.55; g5.add(c); });

  /* ---------- scene 7: recap and end card ---------- */
  var g7 = new THREE.Group(); scene.add(g7);
  var c7 = crew(g7,[0,1,2,3,4],[-5.6,-4.5,-3.4,-2.3,-1.2],0,1.35,0);
  var b7 = makeBall(); b7.scale.setScalar(1.2); g7.add(b7);
  var f7 = makeFeather(); f7.scale.setScalar(1.2); g7.add(f7);

  /* ---------- sample problem: worked solution (parts a, b, c) ----------
     s = solution lines, k = caption number at which each line appears
     (so each line shows up exactly when the narrator says it) */
  var WORK = [
    { t:'(a) TIME', g:'Vo = 20 m/s, Vf = 0 (maximum height)', u:'tmax = ?', e:'Vf = Vo + gt',
      s:['0 = 20 m/s + (\u22129.8 m/s\u00B2) tmax', '\u221220 = \u22129.8 tmax', 'tmax = 20 / 9.8'], k:[6,7,8], a:'tmax = 2.04 s' },
    { t:'(b) HEIGHT', g:'Vo = 20 m/s, Vf = 0, t = 2.04 s', u:'d = ?', e:'d = Vot + gt\u00B2/2',
      s:['d = (20)(2.04) + (\u22129.8)(2.04)\u00B2 / 2', 'd = 40.8 m + (\u221220.39 m)', 'd = 40.8 m \u2212 20.39 m'], k:[14,15,16], a:'d = 20.41 m' },
    { t:'(c) TIME IN THE AIR', g:'t\u2191 = 2.04 s, t\u2193 = 2.04 s', u:'tair = ?', e:'tair = t\u2191 + t\u2193',
      s:['tair = 2.04 s + 2.04 s', '2.04 + 2.04 = 4.08'], k:[22,23], a:'tair = 4.08 s' }
  ];
  var lastWork = -2, solEls = [];
  /* time (seconds from the start of the Sample problem scene) at which the narrator says each solution line */
  var LT = [[27.77,37.47,50.08],[87.31,105.81,125.01],[167.13,174.16]];
  function setWork(P){
    if(P===lastWork || P<0){ if(P<0) lastWork = -1; return; }
    lastWork = P; var d = WORK[P];
    $('w6t').textContent = d.t;
    $('w6g').innerHTML = '<b>Given:</b>'+d.g;
    $('w6u').innerHTML = '<b>Unknown:</b>'+d.u;
    $('w6e').innerHTML = '<b>Equation:</b>'+d.e;
    $('w6s').innerHTML = '<b>Solution:</b>' + d.s.map(function(l){ return '<span class="fx sl" style="opacity:0">'+l+'</span>'; }).join('');
    solEls = $('w6s').querySelectorAll('.sl');
    $('w6a').innerHTML = '<b>Answer:</b>'+d.a;
  }

  /* ---------- timeline ---------- */
  var scenes = [
    { name:'Intro', dur:15, g:g0,
      narr:['Hi everyone!','We are Group 3: Palconete, Pedrigal, Fuertes, Federizo, and Yute.','Today, we will learn about free fall in College Physics 1, Chapter 4.'],
      at:[0,2,8],
      upd:function(t,si){
        op('t0title', C((t-0.3)/1));
        op('t0badge', si>=1?1:0); op('t0names', si>=1?1:0); op('t0sub', si>=2?1:0);
        for(var i=0;i<5;i++){
          var c = c0[i];
          pose(c, 2.5+Math.sin(t*6+i*1.3)*0.4, i%2 ? 2.4+Math.sin(t*5+i)*0.4 : 0.12);
          c.head.rotation.z = Math.sin(t*3+i)*0.08;
          c.group.position.y = Math.max(0,Math.sin(t*4+i*1.1))*0.08;
        }
        var ph = (t*3/Math.PI)%1;
        b0.position.set(3.0, 0.39 + 0.9*4*ph*(1-ph), 0.4);
        b0.rotation.z = -t*3; b0.rotation.x = t*1.2;
        f0.position.set(5.0, 0.09, 0.2);
        f0.rotation.set(-Math.PI/2 + Math.sin(t*2)*0.12, 0, Math.sin(t*1.3)*0.4);
        setCam(-0.4,2.5,11, -0.4,2.0,0, t);
        for(var n=0;n<5;n++){ op('nm0_'+n, si>=1?1:0); anchor('nm0_'+n, c0[n].bx, c0[n].top, c0[n].bz); }
      }},
    { name:'The question', dur:25, g:g1,
      narr:['Have you ever wondered what happens when you drop something? Imagine holding two very different objects on a rooftop.','Does a heavy ball fall faster than a light feather? Many people would guess that it does.','Today, we will find out. Watch what happens!','Welcome to free fall.'],
      at:[0,8,17,21],
      upd:function(t,si,p,s){
        op('q1', si>=1?1:0);
        var d = t - s.starts[2], on = (si>=2 && d>0), tau = on?d:0;
        pose(m1, on?0.5:1.65, 0.15);
        b1.position.set(ballHold1.x + 0.1*tau, dropY(ballHold1.y, 0.3, tau, 0.35), ballHold1.z);
        b1.rotation.x = tau*4; b1.rotation.z = tau*2.5;
        var cheer1 = on && tau>1.3, ct = tau-1.3;
        for(var i=0;i<w1.length;i++){
          var w = w1[i];
          look(w, cheer1?0.1:0.55);
          pose(w, cheer1?2.8+Math.sin(ct*8+i)*0.3:0.15, cheer1?2.8+Math.cos(ct*8+i)*0.3:0.15);
          w.group.position.y = cheer1 ? Math.abs(Math.sin(ct*6+i))*0.2 : 0;
        }
        var fy = featHold1.y - 1.3*tau, landed = fy<=0.08, sw = Math.min(1,tau);
        f1.position.set(featHold1.x + 0.15*tau + (landed?0:0.4*Math.sin(tau*2.7)*sw), landed?0.08:fy, landed?0.1:0.3*Math.sin(tau*1.9+1)*sw);
        f1.rotation.set(-Math.PI/2 + (landed?0:0.35*Math.cos(tau*2.2)*sw), landed?0:0.35*Math.sin(tau*2.7)*sw, landed?0.3:0.5*Math.sin(tau*1.7)*sw);
        setCam(2.5,5.6,19.5, -1.8,4.4,0, t);
      }},
    { name:'What is free fall?', dur:30, g:g2,
      narr:['Free fall is motion where gravity is the only force acting on an object. Nothing pushes it, and nothing holds it back.','If we ignore air resistance, every object falls with the same acceleration, whether it is heavy or light. Here, the air has been removed from the tube.','That is why the ball and the feather land together.'],
      at:[0,10,23],
      upd:function(t,si,p,s){
        var st = si>=2 ? s.starts[2] : s.starts[1];
        var tau = si>=1 ? t-st : -1;
        var TOP = 7.6, BOT = 0.6;
        var falling = tau>0;
        var yb = falling ? Math.max(BOT, TOP - 0.5*G*tau*tau) : TOP + Math.sin(t*2)*0.12;
        b2.position.set(-1.3, yb, 0);
        b2.rotation.x = falling ? Math.min(tau,1.2)*2 : t*0.6; b2.rotation.z = 0.4;
        f2.position.set(1.3, yb-0.24, 0);
        f2.rotation.set(-Math.PI/2 + (falling?0:Math.sin(t*2)*0.06), 0, 0.3);
        var land2 = falling && (TOP - 0.5*G*tau*tau) <= BOT, lt = tau - Math.sqrt(2*(TOP-BOT)/G);
        for(var i=0;i<w2.length;i++){
          var w = w2[i];
          look(w, land2?0.1:0.45);
          pose(w, land2?2.8+Math.sin(lt*8+i)*0.3:0.15, land2?2.8+Math.cos(lt*8+i)*0.3:0.15);
          w.group.position.y = land2 ? Math.abs(Math.sin(lt*6+i))*0.2 : 0;
        }
        op('pill2', t>3?1:0);
        setCam(0,5.0,19.5, 0,4.6,0, t);
      }},
    { name:'Acceleration due to gravity', dur:40, g:g3,
      narr:['On Earth, this acceleration is called g, and its value is 9.8 meters per second squared. Watch the ball fall along this ruler.','This means that every second, the falling ball gets 9.8 meters per second faster. Its speed keeps building up as it falls.','After one second, 9.8 meters per second.','After two seconds, 19.6 meters per second.','And it keeps increasing, faster and faster.','Gravity always points downward, so we give it a negative sign: g equals negative 9.8.'],
      at:[0,12,22,25.9,29.6,32.8],
      upd:function(t,si,p){
        var TS=[0,0,0.6,1,2,5], TE=[0,0.6,1,2,5,5];
        var tau = lerp(TS[si],TE[si],C(p*1.5));
        var y = TOP3 - K3*tau*tau;
        b3.position.set(0,y,0); b3.rotation.x = tau*2; b3.rotation.z = tau*1.3;
        var len = TOP3 - y;
        trail3.scale.y = Math.max(len,0.001); trail3.position.set(0, TOP3-len/2, 0);
        $('clk3').textContent = 't = '+tau.toFixed(1)+' s';
        for(var n=1;n<=5;n++){
          var on = tau>=n-0.03;
          op('l3_'+n, on?1:0);
          ghosts3[n-1].visible = on;
        }
        for(var i=0;i<w3.length;i++){
          look(w3[i], 0.55 - 0.7*C(tau/5));
          pose(w3[i], (i===1||i===3)?2.9:0.15, 0.15);
        }
        ga3.visible = t>1;
        op('g3', t>1?1:0); op('g3b', si>=5?1:0);
        setCam(2.2,7.2,24, 2.0,6.6,0, t);
        for(var q=1;q<=5;q++){ anchor('l3_'+q, 0.85, TOP3-K3*q*q, 0); }
        anchor('tk0', RX-.5, TOP3, 0); anchor('tk1', RX-.5, TOP3-5, 0); anchor('tk2', RX-.5, TOP3-10, 0);
        anchor('g3', 7.2, 12.3, 0); anchor('g3b', 7.2, 2.0, 0);
      }},
    { name:'Going up, coming down', dur:30, g:r4.g,
      narr:['Now let us throw the ball upward.','As it rises, it slows down by 9.8 meters per second every second, until it stops for a moment at the top.','Then it falls back down and speeds up again. Just like before.','Notice that the acceleration is the same going up and going down: negative 9.8.'],
      at:[0,5,16,22],
      upd:function(t,si,p){
        var sT = 0;
        if(si===1) sT = 2.04*p; else if(si===2) sT = 2.04+2.04*p; else if(si===3) sT = 4.08*p;
        var y = r4.launch + S_M*(20*sT-4.9*sT*sT);
        r4.ball.position.set(BX4,y,0); r4.ball.rotation.z = -sT*3; r4.ball.rotation.x = sT*1.5;
        var v = 20-9.8*sT, txt;
        if(si===0){ txt='v = 20.0 m/s'; }
        else if(Math.abs(v)<0.35){ txt='v = 0 (top)'; }
        else { txt='v = '+(v>0?'+':'')+v.toFixed(1)+' m/s'; }
        $('vp4').textContent = txt;
        op('vp4', si>=1?1:0);
        va4.position.set(BX4+0.75,y,0);
        setArrow(va4, si>=1 ? v*0.09 : 0);
        var msg = si===0?'Throw the ball up':(Math.abs(v)<0.35?'At the top: v = 0':(v>0?'Going up: slowing down':'Coming down: speeding up'));
        $('st4').textContent = msg;
        pose(r4.m, si>=1?0.5:1.9, 0.15);
        var atTop = si>=1 && Math.abs(v)<3;
        for(var i=0;i<w4.length;i++){
          look(w4[i], C((y-r4.launch)/PEAK)*0.6);
          pose(w4[i], atTop?2.8+Math.sin(t*9+i)*0.3:0.15, atTop?2.8+Math.cos(t*9+i)*0.3:0.15);
        }
        ga4.visible = t>2; op('g4', t>2?1:0);
        setCam(1.0,5.2,16.5, 0.6,5.0,0, t);
        anchor('vp4', BX4+1.3, y, 0);
        anchor('g4', 7.2, 9.6, 0);
      }},
    { name:'The equations', dur:26.9, g:g5,
      narr:['To solve free fall problems, we use three equations. Here they are.','The first connects velocity and time: Vf equals Vo plus gt.','The second connects distance and time. It tells us how far.','The third connects velocity and distance. It works even without time.','Remember to use negative 9.8 for g.'],
      at:[0,6.01,11.45,16.79,21.87],
      /* caption sentences, each shown when the narrator starts saying it (seconds from scene start) */
      chunks:{0:[[-0.01,"To solve free fall problems, we use three equations."],[2.08,"Here they are."]],
               2:[[11.45,"The second connects distance and time."],[13.68,"It tells us how far."]],
               3:[[16.79,"The third connects velocity and distance."],[18.92,"It works even without time."]]},
      upd:function(t,si,p,s){
        for(var k=0;k<3;k++){
          var a=k+1, ts = si>=a ? t-s.starts[a] : -1;
          var off = ts<0 ? 26 : (1-ease(C(ts/0.7)))*26;
          cards5[k].position.set(off, 6.6-2*k, -.55);
        }
        for(var q=0;q<5;q++){
          var up = si>=1 && q===((si-1)%5);
          look(w5[q], 0.2);
          pose(w5[q], up?2.8+Math.sin(t*6)*0.2:0.15, 0.15);
        }
        op('n5', si>=4?1:0);
        setCam(0,4.0,15.5, 0,4.0,-0.5, t);
        anchor('n5', 0, 1.25, -.5);
      }},
    { name:'Sample problem', dur:187.91, g:r6.g,
      /* 0-9 = Federizo (part a). 10-17 = Yute (part b). 18-24 = Yute (part c).
         Cue times are synced to the recorded voices (federizo_synced.mp3, yute_synced.mp3). */
      narr:['Let us try one.',
            'A ball is thrown upward at 20 meters per second.',
            'To find the time.',
            'Given: Vo is 20 meters per second, and Vf is 0 meters per second.',
            'Unknown: t max.',
            'Equation: Vf equals Vo plus gt.',
            'Solving: substitute the values. Zero equals 20 meters per second plus negative 9.8 meters per second squared times t max.',
            'Move 20 to the other side: negative 20 equals negative 9.8 times t max.',
            'Divide both sides by negative 9.8, so t max equals 20 over 9.8.',
            'Answer: t max is 2.04 seconds.',
            'To find the height.',
            'Given: Vo is 20 meters per second, Vf is 0 meters per second, and t is 2.04 seconds.',
            'Unknown: d.',
            'Equation: d equals Vo t plus gt squared over 2.',
            'Solving: substitute the values. d equals 20 meters per second times 2.04 seconds, plus negative 9.8 meters per second squared times 2.04 seconds squared, over 2.',
            'Multiply: 20 times 2.04 is 40.8 meters, and negative 9.8 times 2.04 squared over 2 is negative 20.39 meters.',
            'Subtract: d equals 40.8 meters minus 20.39 meters.',
            'Answer: d is 20.41 meters.',
            'To find the time in the air.',
            'Given: the time going up equals the time coming down. So t up is 2.04 seconds, and t down is 2.04 seconds.',
            'Unknown: t air.',
            'Equation: t air equals t up plus t down.',
            'Solving: substitute the values. t air equals 2.04 seconds plus 2.04 seconds.',
            'Add: 2.04 plus 2.04 equals 4.08.',
            'Answer: t air is 4.08 seconds.'],
      at:[0,2.02,6.11,8.22,17.41,19.99,24.7,37.42,46.57,54.56,
          61.15,63.85,75.72,77.62,83.57,105.76,124.96,133.74,
          140.1,144.32,156.05,158.6,163.83,174.11,182.45],
      chunks:{6:[[24.7,"Solving: substitute the values."],[27.72,"Zero equals 20 meters per second plus negative 9.8 meters per second squared times t max."]],
               14:[[83.57,"Solving: substitute the values."],[87.26,"d equals 20 meters per second times 2.04 seconds, plus negative 9.8 meters per second squared times 2.04 seconds squared, over 2."]],
               19:[[144.32,"Given: the time going up equals the time coming down."],[147.75,"So t up is 2.04 seconds, and t down is 2.04 seconds."]],
               22:[[163.83,"Solving: substitute the values."],[167.08,"t air equals 2.04 seconds plus 2.04 seconds."]]},
      upd:function(t,si,p,s){
        op('p6', si>=1?1:0);
        /* work panel: Given / Unknown / Equation / Solution / Answer, one part at a time.
           TH rows: [title, given, unknown, equation, solution, answer] = caption number at which each row appears */
        var P = si>=18 ? 2 : (si>=10 ? 1 : (si>=2 ? 0 : -1));
        setWork(P);
        var TH = [[2,3,4,5,6,9],[10,11,12,13,14,17],[18,19,20,21,22,24]][Math.max(P,0)];
        var lt = LT[Math.max(P,0)];
        var ansOn = si>=TH[5];
        op('w6', P>=0?1:0);
        op('w6t', si>=TH[0]?1:0); op('w6g', si>=TH[1]?1:0); op('w6u', si>=TH[2]?1:0);
        op('w6e', si>=TH[3]?1:0); op('w6s', si>=TH[4]?1:0); op('w6a', ansOn?1:0);
        /* each solution line appears when the narrator reaches it */
        for(var q=0;q<solEls.length;q++){ solEls[q].style.opacity = t>=lt[q]?1:0; }
        /* ball follows the narrator's words (seconds from scene start):
           rises while she says "A ball is thrown upward at 20 meters per second",
           hovers at the top while parts (a) and (b) are solved,
           and comes down from "the time coming down" until "t down is 2.04 seconds" */
        var BR = [2.8,5.63], BF = [146.44,156.06];
        var sT = t<BR[0] ? 0 : (t<BR[1] ? 2.04*(t-BR[0])/(BR[1]-BR[0]) : (t<BF[0] ? 2.04 : (t<BF[1] ? 2.04+2.04*(t-BF[0])/(BF[1]-BF[0]) : 4.08)));
        var y = r6.launch + S_M*(20*sT-4.9*sT*sT) + ((t>=BR[1] && t<BF[0]) ? Math.sin(t*2)*0.04 : 0);
        r6.ball.position.set(BX6,y,0); r6.ball.rotation.z = -sT*3; r6.ball.rotation.x = sT*1.5;
        pose(r6.m, sT<0.3?1.9:0.5, 0.15);
        for(var i=0;i<w6.length;i++){
          look(w6[i], C((y-r6.launch)/PEAK)*0.6);
          pose(w6[i], si>=24?2.8+Math.sin(t*9+i)*0.3:0.15, si>=24?2.8+Math.cos(t*9+i)*0.3:0.15);
        }
        op('hb6', si>=10?1:0); hd6.visible = si>=10;
        $('hb6').textContent = si>=17 ? 'H = 20.41 m' : 'H';
        setCam(-0.3,5.2,16, -0.6,5.0,0, t);
        anchor('hb6', BX6+1.9, r6.launch+PEAK/2, 0);
      }},
    { name:'Recap', dur:27.44, g:g7,
      narr:['Let us review.','Free fall is motion under gravity alone. Nothing else.','The acceleration is 9.8 meters per second squared, directed downward. That is g.','And the time going up equals the time coming down.','Now you know why the ball and the feather fall together.','Thanks for watching!'],
      at:[0,1.81,6.98,16.44,20.56,24.82],
      chunks:{1:[[1.81,"Free fall is motion under gravity alone."],[5.47,"Nothing else."]],
               2:[[6.98,"The acceleration is 9.8 meters per second squared, directed downward."],[14.69,"That is g."]]},
      upd:function(t,si,p,s){
        for(var k=0;k<3;k++){ op('b7_'+k, (si>=k+1 && si<5)?1:0); }
        var mix = si>=5 ? ease(C((t-s.starts[5])/1.6)) : 0;
        mixNow = mix;
        for(var i=0;i<5;i++){
          var c = c7[i];
          c.group.position.y = Math.abs(Math.sin(t*4+i*0.8))*0.15;
          pose(c, (150+Math.sin(t*7+i*1.2)*25)*Math.PI/180, i%2 ? (150+Math.cos(t*7+i)*25)*Math.PI/180 : 0.12);
          c.group.visible = mix<0.6;
        }
        b7.position.set(lerp(1.6,-1.2,mix), lerp(0.39,3.9,mix), lerp(0.3,0,mix));
        b7.rotation.y = t*0.8*mix; b7.rotation.z = -t*0.6*mix;
        f7.position.set(lerp(3.3,1.4,mix), lerp(0.09,3.7,mix), lerp(0.2,0,mix));
        f7.rotation.set(-Math.PI/2 + 0.5*mix + Math.sin(t*1.5)*0.08*mix, 0, lerp(0.3,-0.5,mix) + Math.sin(t*0.9)*0.2*mix);
        op('end7', si>=5 ? C((t-s.starts[5]-0.8)/1) : 0);
        setCam(0,lerp(2.6,2.4,mix),10.5, 0,lerp(1.9,3.0,mix),0, t);
        for(var n=0;n<5;n++){ op('nm7_'+n, (si>=1 && mix<0.5)?1:0); anchor('nm7_'+n, c7[n].bx, c7[n].top, c7[n].bz); }
      }}
  ];

  scenes.forEach(function(s,i){
    s.el = $('o'+i);
  });

  var total = 0;
  scenes.forEach(function(s){
    s.start = total; total += s.dur;
    var w = s.narr.map(function(x){ return x.split(/\s+/).length+1; });
    var sum = w.reduce(function(a,b){ return a+b; },0), acc = 0;
    s.starts=[]; s.ends=[];
    w.forEach(function(x){ s.starts.push(acc/sum*s.dur); acc+=x; s.ends.push(acc/sum*s.dur); });
    if(s.at){
      s.starts = s.at.slice();
      s.ends = s.at.slice(1).concat([s.dur]);
    }
  });

  var T = 0, playing = false, cur = -1, last = performance.now(), scrubbing = false;
  var pedrigalAudio = new Audio('audio/pedrigal.mp3');
  /* each row: [video time the caption starts, audio start, audio end] (audio in seconds) */
  var PED = [[40,1.85,9.6],[50,9.9,19.8],[63,20.2,23.3],[70,23.6,32.8],[82,32.95,42]];
  var pedSeg = -1;
  var playBtn=$('play'), scrub=$('scrub'), voice=$('voice');
  scrub.max = total;

  function fmt(x){ x=Math.floor(x); return Math.floor(x/60)+':'+('0'+(x%60)).slice(-2); }
  function speak(i){
    if(!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    if(!voice.checked || !playing) return;
    var u = new SpeechSynthesisUtterance(scenes[i].narr.join(' '));
    u.rate = 0.95; speechSynthesis.speak(u);
  }
  if(!('speechSynthesis' in window)){ $('voiceWrap').style.display='none'; }

  function setPlaying(v){
    playing = v; playBtn.textContent = v ? 'Pause' : (T>=total-0.05 ? 'Replay' : 'Play');
    if('speechSynthesis' in window){ if(v){ speak(Math.max(cur,0)); } else { speechSynthesis.cancel(); } }
  }

  /* ---------- sizing and camera drag ---------- */
  function resize(){
    var w = stageEl.clientWidth, h = stageEl.clientHeight;
    if(!w || !h) return;
    SW = w; SH = h;
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    stageEl.style.setProperty('--u', (w/960)+'px');
  }
  window.addEventListener('resize', resize);
  if(window.ResizeObserver){ new ResizeObserver(resize).observe(stageEl); }
  resize();

  var dragPt = null;
  canvas.addEventListener('pointerdown', function(e){
    dragPt = {x:e.clientX, y:e.clientY}; orbit.drag = true;
    try{ canvas.setPointerCapture(e.pointerId); }catch(err){}
    canvas.classList.add('drag'); $('hint').style.opacity = 0;
  });
  canvas.addEventListener('pointermove', function(e){
    if(!dragPt) return;
    var dx = e.clientX-dragPt.x, dy = e.clientY-dragPt.y;
    dragPt.x = e.clientX; dragPt.y = e.clientY;
    orbit.yaw = C(orbit.yaw - dx*0.006, -0.8, 0.8);
    if(e.pointerType==='mouse'){ orbit.pitch = C(orbit.pitch + dy*0.004, -0.35, 0.35); }
  });
  function endDrag(){ dragPt = null; orbit.drag = false; canvas.classList.remove('drag'); }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  /* ---------- narrators: [start time in seconds, name] ---------- */
  var SPEAKERS = [[0,'PALCONETE'],[40,'PEDRIGAL'],[92,'FUERTES'],[140,'FEDERIZO'],[228.07,'YUTE']];
  function speakerAt(x){
    var name = SPEAKERS[0][1];
    for(var i=0;i<SPEAKERS.length;i++){ if(x>=SPEAKERS[i][0]) name = SPEAKERS[i][1]; }
    return name;
  }

  /* ---------- render loop ---------- */
  function render(dt){
    var idx = 0;
    for(var i=0;i<scenes.length;i++){ if(T>=scenes[i].start) idx=i; }
    var s = scenes[idx], t = C(T-s.start,0,s.dur);
    if(idx!==cur){
      cur = idx;
      scenes.forEach(function(x,j){ x.g.visible = j===idx; x.el.style.display = j===idx?'block':'none'; });
      var chips = $('chips').children;
      for(var c=0;c<chips.length;c++){ chips[c].setAttribute('aria-current', c===idx?'true':'false'); }
      if(playing) speak(idx);
    }
    var si = 0;
    for(var k=0;k<s.narr.length;k++){ if(t>=s.starts[k]) si=k; }
    var p = C((t-s.starts[si])/(s.ends[si]-s.starts[si]));
    mixNow = 0;
    s.upd(t,si,p,s);
    var capTxt = s.narr[si];
    if(s.chunks && s.chunks[si]){ var cc = s.chunks[si]; capTxt = cc[0][1]; for(var q=0;q<cc.length;q++){ if(t>=cc[q][0]) capTxt = cc[q][1]; } }
    $('sub').textContent = (T<=0 && !playing) ? 'Press Play to start.' : speakerAt(s.start+s.starts[si]) + ': ' + capTxt;
    $('time').textContent = fmt(T)+' / '+fmt(total);
    if(!scrubbing) scrub.value = T;
    if(!orbit.drag){ var kk = Math.exp(-dt*1.2); orbit.yaw *= kk; orbit.pitch *= kk; }
    drawWorld(T, mixNow);
    renderer.render(scene, camera);
  }

  /* keeps Pedrigal's audio in step with his captions */
  function syncPedrigal(){
    var seg = -1;
    if(playing && T<92){
      for(var i=0;i<PED.length;i++){ if(T>=PED[i][0]) seg = i; }
    }
    if(seg<0){
      if(!pedrigalAudio.paused){ pedrigalAudio.pause(); }
      pedSeg = -1;
      return;
    }
    var want = PED[seg][1] + (T-PED[seg][0]);
    if(want>=PED[seg][2]){
      if(!pedrigalAudio.paused){ pedrigalAudio.pause(); }
      pedSeg = seg;
      return;
    }
    if(seg!==pedSeg || pedrigalAudio.paused || Math.abs(pedrigalAudio.currentTime-want)>1.0){
      pedSeg = seg;
      pedrigalAudio.currentTime = want;
      pedrigalAudio.play().catch(function(){});
    }
  }

  /* Pedrigal's recording is also a master clock: while one of his lines is really playing,
     the video time is the audio position mapped back onto the video timeline */
  function pedrigalClock(){
    if(pedSeg<0 || pedrigalAudio.paused || pedrigalAudio.readyState<2) return null;
    var seg = PED[pedSeg], ct = pedrigalAudio.currentTime;
    if(ct<seg[1]+0.02 || ct>=seg[2]) return null;
    return seg[0] + (ct - seg[1]);
  }

  function tick(now){
    var dt = (now-last)/1000; last = now;
    if(playing){
      T += Math.min(dt,0.1);
      /* Federizo's and Yute's parts: the recorded voice is the master clock.
         Captions and animation are pulled to the audio position, so they can never drift from the narrator
         (audio start-up delay, buffering, slow frames). If the audio stalls, the video waits for it. */
      var nc = window.narrationClock ? window.narrationClock() : null;
      if(nc === null){ nc = pedrigalClock(); }
      if(nc !== null){
        var dd = nc - T;
        if(Math.abs(dd) > 0.25){ T = nc; } else { T += dd*0.2; }
      }
      if(T>=total){ T = total-0.01; setPlaying(false); playBtn.textContent='Replay'; }
    }
    syncPedrigal();
    render(Math.min(dt,0.1));
    requestAnimationFrame(tick);
  }

  function go(x){ T = C(x,0,total-0.01); render(0); }

  playBtn.addEventListener('click',function(){
    if(!playing && T>=total-0.05){ T=0; }
    setPlaying(!playing);
  });
  $('restart').addEventListener('click',function(){ T=0; cur=-1; render(0); if(playing) speak(0); });
  $('next').addEventListener('click',function(){ go(scenes[Math.min(cur+1,scenes.length-1)].start+0.01); });
  $('prev').addEventListener('click',function(){
    var s=scenes[cur]; go((T-s.start>2) ? s.start+0.01 : scenes[Math.max(cur-1,0)].start+0.01);
  });
  scrub.addEventListener('input',function(){ scrubbing=true; go(parseFloat(scrub.value)); });
  scrub.addEventListener('change',function(){ scrubbing=false; });
  voice.addEventListener('change',function(){ if(voice.checked){ speak(cur); } else if('speechSynthesis' in window){ speechSynthesis.cancel(); } });

  scenes.forEach(function(s,i){
    var b=document.createElement('button'); b.type='button'; b.textContent=(i===0?'Intro':i+'. '+s.name);
    b.addEventListener('click',function(){ go(s.start+0.01); });
    $('chips').appendChild(b);
  });

  render(0);
  requestAnimationFrame(tick);
})();