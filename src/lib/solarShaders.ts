// Procedural surfaces keep the wallpaper independent of image downloads.
export const noiseGLSL = /* glsl */`
float hash3(vec3 p) { p=fract(p*.3183099+vec3(.1,.2,.3)); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise3(vec3 x) {
 vec3 i=floor(x),f=fract(x); f=f*f*(3.-2.*f);
 return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { float n=0.,a=.5; for(int i=0;i<5;i++){n+=a*noise3(p);p=p*2.03+vec3(4.7,1.2,7.3);a*=.5;}return n; }
`;
export const surfaceVertex = /* glsl */`
varying vec3 vLocal; varying vec3 vWorld; varying vec3 vNormal;
void main(){vLocal=normalize(position);vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}
`;
export const surfaceFragment = /* glsl */`
uniform float uKind; uniform float uTime;
varying vec3 vLocal; varying vec3 vWorld; varying vec3 vNormal;
${noiseGLSL}
void main(){
 vec3 p=vLocal;float n=fbm(p*7.);vec3 color;float ocean=0.;
 if(uKind<.5){
  float granules=fbm(p*65.+vec3(uTime*.045,0,0));
  float fire=fbm(p*8.+vec3(0,uTime*.025,0));
  color=mix(vec3(1.,.16,.009),vec3(1.,.72,.18),smoothstep(.15,.78,granules));
  color*=1.3+fire*1.3;
  float limb=pow(max(dot(normalize(vNormal),normalize(cameraPosition-vWorld)),0.),.35);
  gl_FragColor=vec4(color*(.55+.65*limb),1.);
 }else{
  if(uKind<1.5){
   float craters=pow(1.-abs(sin(n*90.)),8.)*.12;
   color=mix(vec3(.16,.145,.13),vec3(.48,.43,.38),n)+craters;
  }else if(uKind<2.5){
   float clouds=fbm(p*vec3(6.,22.,6.)+vec3(n*2.));
   color=mix(vec3(.48,.24,.065),vec3(.91,.72,.38),clouds);
  }else if(uKind<3.5){
   float land=fbm(p*3.6+vec3(9.,2.,5.));
   float coast=smoothstep(.48,.51,land);ocean=1.-coast;
   vec3 ground=mix(vec3(.055,.16,.05),vec3(.43,.32,.13),smoothstep(.45,.65,n));
   color=mix(mix(vec3(.008,.035,.13),vec3(.015,.14,.28),n),ground,coast);
   color=mix(color,vec3(.82,.89,.92),smoothstep(.83,.96,abs(p.y)+n*.1));
   float cloud=fbm(p*8.+vec3(uTime*.008,0,0));
   color=mix(color,vec3(.88,.93,.97),smoothstep(.55,.72,cloud)*.88);
  }else if(uKind<4.5){
   color=mix(vec3(.24,.065,.025),vec3(.68,.30,.115),n);
   color=mix(color,vec3(.77,.69,.58),smoothstep(.95,1.,abs(p.y))*.65);
  }else if(uKind<6.5){
   float turbulence=fbm(p*9.);float bands=sin(p.y*34.+turbulence*3.5);
   if(uKind<5.5){
    color=mix(vec3(.43,.235,.13),vec3(.89,.79,.62),smoothstep(-.7,.8,bands));
    float storm=length((p.xy-vec2(.38,-.24))*vec2(4.8,11.));
    color=mix(color,vec3(.59,.22,.105), (1.-smoothstep(.55,1.2,storm))*smoothstep(.2,.6,p.z));
   }else{color=mix(vec3(.54,.40,.22),vec3(.9,.8,.58),.4+.3*bands);}
   color*=.8+.4*turbulence;
  }else if(uKind<7.5){color=mix(vec3(.24,.56,.61),vec3(.56,.82,.80),n*.8+p.y*.1);}
  else{color=mix(vec3(.035,.13,.46),vec3(.13,.34,.77),n+.08*sin(p.y*35.+n*6.));}
  vec3 normal=normalize(vNormal);vec3 light=normalize(-vWorld);vec3 view=normalize(cameraPosition-vWorld);
  float diffuse=max(dot(normal,light),0.);
  float spec=pow(max(dot(reflect(-light,normal),view),0.),42.)*ocean*.3;
  color=color*(.022+diffuse*1.35)+spec*vec3(1.,.86,.65);
  gl_FragColor=vec4(color,1.);
 }
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const atmosphereFragment = /* glsl */`
uniform vec3 uColor; varying vec3 vWorld; varying vec3 vNormal;
void main(){
 vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld),l=normalize(-vWorld);
 float rim=pow(1.-abs(dot(n,v)),3.5);
 float lit=smoothstep(-.2,.6,dot(n,l));
 gl_FragColor=vec4(uColor,rim*lit*.65);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
export const glowFragment = /* glsl */`
uniform float uTime;varying vec2 vUv;
${noiseGLSL}
void main(){
 vec2 p=(vUv-.5)*2.;float r=length(p);float angle=atan(p.y,p.x);
 float rays=fbm(vec3(cos(angle)*5.,sin(angle)*5.,uTime*.045));
 float corona=exp(-r*7.)*.58+exp(-r*16.)*.75;
 corona*=2.3+rays*1.9;
 float flare=pow(max(0.,1.-abs(p.y)*9.),5.)*exp(-abs(p.x)*4.)*.1;
 gl_FragColor=vec4(vec3(1.,.43,.09),(corona+flare)*smoothstep(1.,.7,r));
}
`;
export const ringFragment = /* glsl */`
varying vec2 vRing;varying vec3 vWorld;uniform vec3 uCenter;uniform float uRadius;
void main(){
 float r=length(vRing);float bands=sin(r*150.)*.12+sin(r*47.)*.10+sin(r*380.)*.05;
 float gap=1.-smoothstep(.013,.034,abs(r-.79));
 float opacity=(.5+bands)*(1.-gap*.9)*smoothstep(.49,.53,r)*smoothstep(1.,.97,r);
 vec3 ray=normalize(-vWorld),delta=uCenter-vWorld;float along=dot(delta,ray);
 float distanceToRay=length(delta-ray*along);
 float shadow=along>0.?smoothstep(uRadius*.94,uRadius*1.04,distanceToRay):1.;
 vec3 color=mix(vec3(.25,.20,.15),vec3(.72,.64,.48),.5+bands)*(.15+.85*shadow);
 gl_FragColor=vec4(color,opacity);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
`;
