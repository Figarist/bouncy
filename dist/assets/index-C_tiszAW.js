(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const n of a)if(n.type==="childList")for(const o of n.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function i(a){const n={};return a.integrity&&(n.integrity=a.integrity),a.referrerPolicy&&(n.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?n.credentials="include":a.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(a){if(a.ep)return;a.ep=!0;const n=i(a);fetch(a.href,n)}})();const u={calibrationMs:3e3,calibrationPercentile:.25,minBaselineDb:-75,maxBaselineDb:-44,smoothing:{attack:.04,release:.35},sfxMicMuteMs:700,alertCooldownMs:3500,modes:{quiet:{id:"quiet",name:"Тиха робота",icon:"quiet",yellowOffsetDb:4.5,redOffsetDb:9,rewardsEnabled:!0,physicsBounceOnVoice:!1},groups:{id:"groups",name:"Робота в групах",icon:"groups",yellowOffsetDb:8,redOffsetDb:15,rewardsEnabled:!0,physicsBounceOnVoice:!1},breaktime:{id:"breaktime",name:"Перерва / Класика",icon:"breaktime",yellowOffsetDb:12,redOffsetDb:20,rewardsEnabled:!1,physicsBounceOnVoice:!0}},zones:{enterYellowMs:120,exitYellowMs:600,enterRedMs:250,exitRedMs:1e3,hysteresisDb:2},micProfiles:{webcam:{id:"webcam",name:"Веб-камера (відстань 2-4м)",gain:2.2,highpassHz:120,presenceHz:2200,presenceGain:3.5},laptop:{id:"laptop",name:"Ноутбук / Вбудований",gain:1.5,highpassHz:100,presenceHz:2e3,presenceGain:2},close:{id:"close",name:"Близький / Гарнітура",gain:1,highpassHz:80,presenceHz:2e3,presenceGain:0}},stars:{secondsPerStar:30,goldenComboSeconds:120},balls:{min:10,max:150},physics:{hz:60,subSteps:3,gravity:.45,restitution:.75,friction:.992}};function Z(t){if(!t||t.length===0)return-100;let e=0;for(let a=0;a<t.length;a++){const n=t[a];e+=n*n}const i=Math.sqrt(e/t.length),s=Math.max(i,1e-5);return 20*Math.log10(s)}function Y(t,e,i,s=.04,a=.35){if(i<=0)return t;const n=e>t?s:a,o=1-Math.exp(-i/n);return t+(e-t)*o}function Q(t,e=.25,i=-75,s=-44){if(!t||t.length===0)return-55;const a=[...t].sort((l,r)=>l-r),n=Math.min(a.length-1,Math.max(0,Math.floor(a.length*e))),o=a[n];return Math.max(i,Math.min(s,o))}function J(t,e,i,s,a=0){const n=e+i-a,o=e+s-a;let l="green",r=0;if(t>=o)l="red",r=1+Math.min(.5,(t-o)/8);else if(t>=n){l="yellow";const d=Math.max(.5,o-n);r=.6+.4*((t-n)/d)}else{l="green";const d=e-10,h=Math.max(.5,n-d);r=Math.max(0,.6*((t-d)/h))}return{rawZone:l,progress:Math.min(1.5,Math.max(0,r)),yellowDb:n,redDb:o,currentDb:t}}class U{constructor(){this.ctx=null,this.masterGain=null,this.volume=.75,this.lastSfxEndTime=0}init(e){this.ctx||(this.ctx=e||new(window.AudioContext||window.webkitAudioContext),this.masterGain=this.ctx.createGain(),this.masterGain.gain.setValueAtTime(this.volume,this.ctx.currentTime),this.masterGain.connect(this.ctx.destination))}setVolume(e){this.volume=Math.max(0,Math.min(1,e)),this.masterGain&&this.ctx&&this.masterGain.gain.setValueAtTime(this.volume,this.ctx.currentTime)}ensureContext(){this.ctx||this.init(),this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}isMutingMic(e=700){return this.ctx?performance.now()<this.lastSfxEndTime+e:!1}markSfxPlaying(e){this.lastSfxEndTime=performance.now()+e}playShush(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const e=.75,i=this.ctx.sampleRate*e,s=this.ctx.createBuffer(1,i,this.ctx.sampleRate),a=s.getChannelData(0);for(let d=0;d<i;d++)a[d]=Math.random()*2-1;const n=this.ctx.createBufferSource();n.buffer=s;const o=this.ctx.createBiquadFilter();o.type="bandpass",o.frequency.setValueAtTime(3200,this.ctx.currentTime),o.Q.setValueAtTime(1.8,this.ctx.currentTime);const l=this.ctx.createGain(),r=this.ctx.currentTime;l.gain.setValueAtTime(.001,r),l.gain.exponentialRampToValueAtTime(.45,r+.12),l.gain.exponentialRampToValueAtTime(.001,r+e),n.connect(o),o.connect(l),l.connect(this.masterGain),n.start(r),n.stop(r+e),this.markSfxPlaying(e*1e3)}playBeep(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const e=this.ctx.createOscillator(),i=this.ctx.createGain(),s=this.ctx.currentTime,a=.28;e.type="sine",e.frequency.setValueAtTime(780,s),e.frequency.exponentialRampToValueAtTime(620,s+a),i.gain.setValueAtTime(.001,s),i.gain.linearRampToValueAtTime(.35,s+.04),i.gain.exponentialRampToValueAtTime(.001,s+a),e.connect(i),i.connect(this.masterGain),e.start(s),e.stop(s+a),this.markSfxPlaying(a*1e3)}playPop(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const e=this.ctx.createOscillator(),i=this.ctx.createGain(),s=this.ctx.currentTime,a=.08;e.type="sine",e.frequency.setValueAtTime(800+Math.random()*300,s),e.frequency.exponentialRampToValueAtTime(140,s+a),i.gain.setValueAtTime(.25,s),i.gain.exponentialRampToValueAtTime(.001,s+a),e.connect(i),i.connect(this.masterGain),e.start(s),e.stop(s+a),this.markSfxPlaying(a*1e3)}playChime(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const e=[1046.5,1318.5,1567.98],i=this.ctx.currentTime,s=.8;e.forEach((a,n)=>{const o=this.ctx.createOscillator(),l=this.ctx.createGain(),r=i+n*.06;o.type="triangle",o.frequency.setValueAtTime(a,r),l.gain.setValueAtTime(.001,r),l.gain.linearRampToValueAtTime(.25,r+.02),l.gain.exponentialRampToValueAtTime(.001,r+s),o.connect(l),l.connect(this.masterGain),o.start(r),o.stop(r+s)}),this.markSfxPlaying(s*1e3+200)}playFanfare(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const e=[523.25,659.25,783.99,1046.5],i=this.ctx.currentTime;e.forEach((s,a)=>{const n=this.ctx.createOscillator(),o=this.ctx.createGain(),l=a===e.length-1,r=i+a*.16,d=l?1:.22;n.type=l?"triangle":"sine",n.frequency.setValueAtTime(s,r),o.gain.setValueAtTime(.001,r),o.gain.linearRampToValueAtTime(.35,r+.03),o.gain.exponentialRampToValueAtTime(.001,r+d),n.connect(o),o.connect(this.masterGain),n.start(r),n.stop(r+d)}),this.markSfxPlaying(1600)}}const m=new U;class X{constructor(){this.audioContext=null,this.mediaStream=null,this.source=null,this.highpassFilter=null,this.presenceFilter=null,this.gainNode=null,this.analyser=null,this.timeData=null,this.isListening=!1,this.isCalibrating=!1,this.calibrationSamples=[],this.calibrationStart=0,this.calibrationDurationMs=u.calibrationMs,this.ambientBaselineDb=-55,this.smoothedDb=-80,this.lastUpdateTime=0,this.deviceId="",this.profile="webcam",this.gainMultiplier=u.micProfiles.webcam.gain,this.quietStreakMs=0,this.error=null}async listDevices(){if(!navigator.mediaDevices?.enumerateDevices)return[];try{return(await navigator.mediaDevices.enumerateDevices()).filter(i=>i.kind==="audioinput")}catch{return[]}}async start(e=null){this.error=null,e!==null&&(this.deviceId=e);try{this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext),m.init(this.audioContext)),this.audioContext.state==="suspended"&&await this.audioContext.resume(),this.mediaStream&&(this.mediaStream.getTracks().forEach(s=>s.stop()),this.mediaStream=null);const i={audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1},video:!1};this.deviceId&&(i.audio.deviceId={exact:this.deviceId});try{this.mediaStream=await navigator.mediaDevices.getUserMedia(i)}catch(s){if(this.deviceId)i.audio.deviceId=void 0,this.mediaStream=await navigator.mediaDevices.getUserMedia(i);else throw s}return this.setupAudioGraph(),this.isListening=!0,this.lastUpdateTime=performance.now(),!0}catch(i){return this.isListening=!1,this.error=i.name||"MicrophoneError",!1}}setupAudioGraph(){if(!this.audioContext||!this.mediaStream)return;try{this.source?.disconnect(),this.highpassFilter?.disconnect(),this.presenceFilter?.disconnect(),this.gainNode?.disconnect(),this.analyser?.disconnect()}catch{}const e=u.micProfiles[this.profile]||u.micProfiles.webcam;this.source=this.audioContext.createMediaStreamSource(this.mediaStream),this.highpassFilter=this.audioContext.createBiquadFilter(),this.highpassFilter.type="highpass",this.highpassFilter.frequency.setValueAtTime(e.highpassHz||120,this.audioContext.currentTime),this.highpassFilter.Q.setValueAtTime(.7,this.audioContext.currentTime),this.presenceFilter=this.audioContext.createBiquadFilter(),this.presenceFilter.type="peaking",this.presenceFilter.frequency.setValueAtTime(e.presenceHz||2200,this.audioContext.currentTime),this.presenceFilter.gain.setValueAtTime(e.presenceGain??3.5,this.audioContext.currentTime),this.presenceFilter.Q.setValueAtTime(1,this.audioContext.currentTime),this.gainNode=this.audioContext.createGain();const i=Math.max(.2,Math.min(6,this.gainMultiplier));this.gainNode.gain.setValueAtTime(i,this.audioContext.currentTime),this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=1024,this.analyser.smoothingTimeConstant=.15,this.timeData=new Float32Array(this.analyser.fftSize),this.source.connect(this.highpassFilter),this.highpassFilter.connect(this.presenceFilter),this.presenceFilter.connect(this.gainNode),this.gainNode.connect(this.analyser)}setGain(e){this.gainMultiplier=Math.max(.4,Math.min(6,e)),this.gainNode&&this.audioContext&&this.gainNode.gain.setValueAtTime(this.gainMultiplier,this.audioContext.currentTime)}setProfile(e){if(!u.micProfiles[e])return;this.profile=e;const i=u.micProfiles[e];this.gainMultiplier=i.gain,this.audioContext&&(this.gainNode&&this.gainNode.gain.setValueAtTime(i.gain,this.audioContext.currentTime),this.highpassFilter&&this.highpassFilter.frequency.setValueAtTime(i.highpassHz,this.audioContext.currentTime),this.presenceFilter&&(this.presenceFilter.frequency.setValueAtTime(i.presenceHz,this.audioContext.currentTime),this.presenceFilter.gain.setValueAtTime(i.presenceGain,this.audioContext.currentTime)))}async switchDevice(e){return this.deviceId=e,this.isListening?this.start(e):!0}stop(){this.mediaStream&&(this.mediaStream.getTracks().forEach(e=>e.stop()),this.mediaStream=null),this.isListening=!1,this.isCalibrating=!1,this.smoothedDb=-80}toggle(){return this.isListening?(this.stop(),!1):this.start()}startCalibration(e=u.calibrationMs){this.isListening&&(this.isCalibrating=!0,this.calibrationSamples=[],this.calibrationDurationMs=e,this.calibrationStart=performance.now())}sample(e=null){const i=performance.now(),s=this.lastUpdateTime?(i-this.lastUpdateTime)/1e3:.016;this.lastUpdateTime=i;let a=-90;if(e!==null?a=e:this.isListening&&this.analyser&&this.timeData&&(m.isMutingMic(u.sfxMicMuteMs)?a=this.ambientBaselineDb-10:(this.analyser.getFloatTimeDomainData(this.timeData),a=Z(this.timeData))),this.smoothedDb=Y(this.smoothedDb,a,s,u.smoothing.attack,u.smoothing.release),!this.isCalibrating&&this.isListening&&e===null)if(a<this.ambientBaselineDb){if(this.quietStreakMs+=s*1e3,this.quietStreakMs>2500){const o=Math.max(u.minBaselineDb,a);this.ambientBaselineDb+=(o-this.ambientBaselineDb)*Math.min(1,.04*s)}}else this.quietStreakMs=0;let n=0;if(this.isCalibrating){this.calibrationSamples.push(a);const o=i-this.calibrationStart;n=Math.min(1,o/this.calibrationDurationMs),o>=this.calibrationDurationMs&&(this.isCalibrating=!1,this.ambientBaselineDb=Q(this.calibrationSamples,u.calibrationPercentile,u.minBaselineDb,u.maxBaselineDb),this.ambientBaselineDb<-64&&this.gainMultiplier<=1.2&&this.profile==="webcam"&&this.setGain(2.2))}return{rawDb:a,db:this.smoothedDb,ambientDb:this.ambientBaselineDb,isCalibrating:this.isCalibrating,calibrationProgress:n}}}class K{constructor(e={}){this.enterYellowMs=e.enterYellowMs??300,this.exitYellowMs=e.exitYellowMs??1e3,this.enterRedMs=e.enterRedMs??700,this.exitRedMs=e.exitRedMs??1500,this.hysteresisDb=e.hysteresisDb??3,this.currentZone="green",this.pendingZone=null,this.pendingTimeMs=0}update(e,i,s,a){const n=this.currentZone;let o=this.currentZone;this.currentZone==="red"?e<s-this.hysteresisDb?o=e>=i?"yellow":"green":o="red":this.currentZone==="yellow"?e>=s?o="red":e<i-this.hysteresisDb?o="green":o="yellow":e>=s?o="red":e>=i?o="yellow":o="green";let l=!1;if(o===this.currentZone)this.pendingZone=null,this.pendingTimeMs=0;else{this.pendingZone!==o&&(this.pendingZone=o,this.pendingTimeMs=0),this.pendingTimeMs+=a;let r=300;o==="red"?r=this.enterRedMs:o==="yellow"&&this.currentZone==="green"?r=this.enterYellowMs:this.currentZone==="red"?r=this.exitRedMs:this.currentZone==="yellow"&&o==="green"&&(r=this.exitYellowMs),this.pendingTimeMs>=r&&(this.currentZone=o,this.pendingZone=null,this.pendingTimeMs=0,l=!0)}return{zone:this.currentZone,changed:l,previousZone:n}}reset(){this.currentZone="green",this.pendingZone=null,this.pendingTimeMs=0}}class _{constructor(e={}){this.secondsPerStar=e.secondsPerStar??30,this.goldenComboSeconds=e.goldenComboSeconds??120,this.stars=e.initialStars??0,this.goal=e.goal??20,this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1}update(e,i,s=!0){let a=!1;const n=this.isGoldenCombo;return s?(e==="green"?(this.currentStarProgressSeconds+=i,this.continuousGreenSeconds+=i,this.currentStarProgressSeconds>=this.secondsPerStar&&(this.stars+=1,this.currentStarProgressSeconds-=this.secondsPerStar,a=!0),this.continuousGreenSeconds>=this.goldenComboSeconds&&(this.isGoldenCombo=!0)):e==="yellow"||e==="red"&&(this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1),{starAwarded:a,goldenComboChanged:n!==this.isGoldenCombo,progress:Math.min(1,this.currentStarProgressSeconds/this.secondsPerStar),stars:this.stars,isGolden:this.isGoldenCombo,goalReached:this.stars>=this.goal}):{starAwarded:!1,goldenComboChanged:!1,progress:this.currentStarProgressSeconds/this.secondsPerStar,stars:this.stars}}awardManualStar(){return this.stars+=1,{stars:this.stars,goalReached:this.stars>=this.goal}}resetProgress(){this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1}resetAll(e=this.goal){this.stars=0,this.goal=e,this.resetProgress()}}class x{constructor(e={}){this.mode=e.initialMode||"quiet",this.timerTotalSeconds=0,this.timerRemainingSeconds=0,this.timerRunning=!1,this.timerHadRedZone=!1}setMode(e){return u.modes[e]&&(this.mode=e),this.getModeConfig()}getModeConfig(){return u.modes[this.mode]||u.modes.quiet}startTimer(e){this.timerTotalSeconds=Math.max(1,e)*60,this.timerRemainingSeconds=this.timerTotalSeconds,this.timerRunning=!0,this.timerHadRedZone=!1}stopTimer(){this.timerRunning=!1}toggleTimer(){this.timerRemainingSeconds>0&&(this.timerRunning=!this.timerRunning)}update(e,i){if(!this.timerRunning||this.timerRemainingSeconds<=0)return{running:!1,remaining:this.timerRemainingSeconds,completed:!1,cleanStreak:!this.timerHadRedZone};i==="red"&&(this.timerHadRedZone=!0),this.timerRemainingSeconds-=e;let s=!1;return this.timerRemainingSeconds<=0&&(this.timerRemainingSeconds=0,this.timerRunning=!1,s=!0),{running:this.timerRunning,remaining:this.timerRemainingSeconds,completed:s,cleanStreak:!this.timerHadRedZone}}}const T="tyhyi-klas:v1",S={activeClass:"4-Б",classes:{"4-Б":{stars:0,goal:20,reward:"5 хв мультика",weekStart:new Date().toISOString().slice(0,10)},"3-А":{stars:0,goal:20,reward:"Настільна гра",weekStart:new Date().toISOString().slice(0,10)}},settings:{mode:"quiet",theme:"critters",sensitivity:0,balls:40,alertSound:"shush",volume:.75,lightRoom:!1,lang:"uk",ambientBaselineDb:-55,micDeviceId:"",micProfile:"webcam",micGain:2.2}};class B{static load(){try{const e=localStorage.getItem(T);if(!e)return JSON.parse(JSON.stringify(S));const i=JSON.parse(e);return{activeClass:i.activeClass||S.activeClass,classes:{...S.classes,...i.classes||{}},settings:{...S.settings,...i.settings||{}}}}catch{return JSON.parse(JSON.stringify(S))}}static save(e){try{localStorage.setItem(T,JSON.stringify(e))}catch{}}}const D=["star","heart","crown","moon"];class ee{constructor(e,i,s,a){this.x=e,this.y=i,this.px=e,this.py=i,this.radius=s,this.id=a,this.angle=(Math.random()-.5)*.15,this.angularVelocity=0,this.isDragged=!1,this.pointerId=null,this.scaleX=1,this.scaleY=1,this.squashVelocityX=0,this.squashVelocityY=0,this.mood="sleeping",this.blinkTimer=Math.random()*5+2,this.isBlinking=!1,this.breathePhase=Math.random()*Math.PI*2,this.dreamType=D[Math.floor(a/3)%D.length],this.dreamPhase=Math.random()*Math.PI*2,this.canPop=!1,this.popped=!1}applyForce(e,i){this.x+=e,this.y+=i}applyImpulse(e,i){this.px-=e,this.py-=i}triggerSquash(e,i,s){const a=Math.min(.45,Math.abs(s)*.04);this.scaleX=1+Math.abs(i)*a-Math.abs(e)*a,this.scaleY=1+Math.abs(e)*a-Math.abs(i)*a}updateAnimation(e,i,s){this.breathePhase+=e*2,this.dreamPhase+=e*1.6,i==="red"?this.mood="chaos":i==="yellow"?this.mood="stirring":s?this.mood="golden":this.mood="sleeping",this.blinkTimer-=e,this.blinkTimer<=0&&(this.isBlinking=!this.isBlinking,this.blinkTimer=this.isBlinking?.15:Math.random()*4+2.5);const a=12,n=-180*(this.scaleX-1)-a*this.squashVelocityX;this.squashVelocityX+=n*e,this.scaleX+=this.squashVelocityX*e;const o=-180*(this.scaleY-1)-a*this.squashVelocityY;this.squashVelocityY+=o*e,this.scaleY+=this.squashVelocityY*e;const r=-42*this.angle-8*this.angularVelocity;this.angularVelocity+=r*e,this.angle+=this.angularVelocity*e,this.angle=Math.max(-.45,Math.min(.45,this.angle))}}class te{constructor(){this.width=1200,this.height=800,this.balls=[],this.pointers=new Map,this.cellSize=80,this.grid=new Map,this.accumulator=0,this.fixedDt=1/u.physics.hz}resize(e,i){this.width=Math.max(300,e),this.height=Math.max(300,i),this.cellSize=Math.max(60,Math.floor(Math.min(e,i)/10));for(const s of this.balls)s.x=Math.max(s.radius,Math.min(this.width-s.radius,s.x)),s.y=Math.max(s.radius,Math.min(this.height-s.radius,s.y))}setBallCount(e,i=null){const s=Math.max(u.balls.min,Math.min(u.balls.max,e)),a=i||Math.max(16,Math.min(48,Math.floor(Math.min(this.width,this.height)/(Math.sqrt(s)*2.8))));for(;this.balls.length<s;){const n=this.balls.length,o=a+Math.random()*(this.width-a*2),l=a+Math.random()*(this.height*.7),r=new ee(o,l,a,n);this.balls.push(r)}this.balls.length>s&&(this.balls.length=s);for(const n of this.balls)n.radius=a}bounceBalls(e){if(!(e<=0))for(const i of this.balls){const s=-e*(.8+Math.random()*.4),a=(Math.random()-.5)*e*.5;i.applyImpulse(a,s),i.angularVelocity+=(Math.random()-.5)*5}}stirBalls(e){const i=Math.min(1.2,Math.max(.2,e));for(const s of this.balls)if(s.y>=this.height-s.radius*2.5&&Math.random()<.14){const a=(2.2+Math.random()*3.6)*i,n=(Math.random()-.5)*2.5*i;s.applyImpulse(n,-a),s.angularVelocity+=(Math.random()-.5)*4*i,s.triggerSquash(0,1,a*.7)}}scareBounce(e=1){const i=Math.min(24,15*e);for(const s of this.balls){const a=-i*(.85+Math.random()*.45),n=(Math.random()-.5)*i*.7;s.applyImpulse(n,a),s.angularVelocity+=(Math.random()-.5)*10,s.triggerSquash(0,1,4)}}chaosAgitate(e=1){const i=Math.min(1.5,Math.max(.3,e));for(const s of this.balls)if(s.y>=this.height-s.radius*3&&Math.random()<.2){const a=(3.5+Math.random()*6.5)*i,n=(Math.random()-.5)*5*i;s.applyImpulse(n,-a),s.angularVelocity+=(Math.random()-.5)*6*i,s.triggerSquash(0,1,2.5)}}update(e,i="green",s=!1){for(this.accumulator+=Math.min(.1,e);this.accumulator>=this.fixedDt;)this.stepFixed(this.fixedDt),this.accumulator-=this.fixedDt;for(const a of this.balls)a.updateAnimation(e,i,s)}stepFixed(e){const{gravity:i,friction:s,restitution:a}=u.physics,n=u.physics.subSteps;for(let o=0;o<n;o++){for(const l of this.balls){if(l.isDragged&&l.pointerId!==null){const h=this.pointers.get(l.pointerId);if(h&&h.isDown){l.px=l.x,l.py=l.y,l.x=h.x,l.y=h.y;continue}else l.isDragged=!1,l.pointerId=null}const r=(l.x-l.px)*s,d=(l.y-l.py)*s+i;l.px=l.x,l.py=l.y,l.x+=r,l.y+=d,l.angularVelocity+=r/l.radius*1.8}for(const l of this.balls)if(!l.isDragged){if(l.y>this.height-l.radius){const r=l.y-l.py;l.y=this.height-l.radius,l.py=l.y+r*a,Math.abs(r)>1.5&&l.triggerSquash(0,1,r)}if(l.y<l.radius){const r=l.y-l.py;l.y=l.radius,l.py=l.y+r*a,Math.abs(r)>1.5&&l.triggerSquash(0,-1,r)}if(l.x<l.radius){const r=l.x-l.px;l.x=l.radius,l.px=l.x+r*a,Math.abs(r)>1.5&&l.triggerSquash(-1,0,r)}if(l.x>this.width-l.radius){const r=l.x-l.px;l.x=this.width-l.radius,l.px=l.x+r*a,Math.abs(r)>1.5&&l.triggerSquash(1,0,r)}}this.resolveBallCollisions()}}resolveBallCollisions(){this.grid.clear();for(let e=0;e<this.balls.length;e++){const i=this.balls[e],s=Math.floor(i.x/this.cellSize),a=Math.floor(i.y/this.cellSize),n=`${s},${a}`;this.grid.has(n)||this.grid.set(n,[]),this.grid.get(n).push(i)}for(const e of this.balls){const i=Math.floor(e.x/this.cellSize),s=Math.floor(e.y/this.cellSize);for(let a=-1;a<=1;a++)for(let n=-1;n<=1;n++){const o=`${i+a},${s+n}`,l=this.grid.get(o);if(l)for(const r of l){if(e.id>=r.id)continue;const d=r.x-e.x,h=r.y-e.y,p=e.radius+r.radius,f=d*d+h*h;if(f<p*p&&f>1e-4){const c=Math.sqrt(f),g=(p-c)*.5,y=d/c,w=h/c;e.isDragged||(e.x-=y*g,e.y-=w*g),r.isDragged||(r.x+=y*g,r.y+=w*g);const M=Math.abs(e.x-e.px-(r.x-r.px))+Math.abs(e.y-e.py-(r.y-r.py));M>4&&(e.triggerSquash(-y,-w,M*.3),r.triggerSquash(y,w,M*.3),e.angularVelocity+=(Math.random()-.5)*M*.4,r.angularVelocity+=(Math.random()-.5)*M*.4)}}}}}onPointerDown(e,i,s){this.pointers.set(e,{x:i,y:s,px:i,py:s,isDown:!0});for(let a=this.balls.length-1;a>=0;a--){const n=this.balls[a],o=i-n.x,l=s-n.y;if(o*o+l*l<=n.radius*n.radius)return n.isDragged=!0,n.pointerId=e,n}return null}onPointerMove(e,i,s){const a=this.pointers.get(e);a&&(a.px=a.x,a.py=a.y,a.x=i,a.y=s)}onPointerUp(e){const i=this.pointers.get(e);if(i){i.isDown=!1;const s=i.x-i.px,a=i.y-i.py;for(const n of this.balls)n.pointerId===e&&(n.isDragged=!1,n.pointerId=null,n.px=n.x-s*1.2,n.py=n.y-a*1.2);this.pointers.delete(e)}}}const I=["#EF4444","#F97316","#FBBF24","#22C55E","#3B82F6","#8B5CF6","#EC4899","#06B6D4","#E2E8F0","#475569"];function V(t,e){const i=I[e.id%I.length],s=e.radius,a=t.createRadialGradient(-s*.35,-s*.35,s*.1,0,0,s);a.addColorStop(0,C(i,65)),a.addColorStop(.3,i),a.addColorStop(.85,C(i,-35)),a.addColorStop(1,C(i,-60)),t.fillStyle=a,t.beginPath(),t.arc(0,0,s,0,Math.PI*2),t.fill();const n=t.createRadialGradient(s*.2,s*.35,s*.6,0,0,s);n.addColorStop(0,"rgba(255, 255, 255, 0)"),n.addColorStop(1,"rgba(255, 255, 255, 0.22)"),t.fillStyle=n,t.beginPath(),t.arc(0,0,s,0,Math.PI*2),t.fill(),t.fillStyle="rgba(255, 255, 255, 0.65)",t.beginPath(),t.ellipse(-s*.3,-s*.38,s*.3,s*.14,-Math.PI/4,0,Math.PI*2),t.fill()}function C(t,e){let i=parseInt(t.replace("#",""),16);if(isNaN(i))return t;let s=(i>>16)+e,a=(i>>8&255)+e,n=(i&255)+e;return s=Math.min(255,Math.max(0,s)),a=Math.min(255,Math.max(0,a)),n=Math.min(255,Math.max(0,n)),`#${((1<<24)+(s<<16)+(a<<8)+n).toString(16).slice(1)}`}function ie(t,e){const i=e.radius,s=t.createRadialGradient(-i*.35,-i*.35,i*.1,0,0,i);s.addColorStop(0,"#FEF08A"),s.addColorStop(.35,"#FBBF24"),s.addColorStop(.85,"#D97706"),s.addColorStop(1,"#B45309"),t.fillStyle=s,t.beginPath(),t.arc(0,0,i,0,Math.PI*2),t.fill();const a=t.createRadialGradient(i*.2,i*.35,i*.6,0,0,i);a.addColorStop(0,"rgba(255, 255, 255, 0)"),a.addColorStop(1,"rgba(255, 255, 255, 0.2)"),t.fillStyle=a,t.beginPath(),t.arc(0,0,i,0,Math.PI*2),t.fill(),t.fillStyle="rgba(255, 255, 255, 0.55)",t.beginPath(),t.ellipse(-i*.3,-i*.38,i*.25,i*.12,-Math.PI/4,0,Math.PI*2),t.fill(),t.save(),t.rotate(e.angle),t.fillStyle="rgba(244, 63, 94, 0.35)",t.beginPath(),t.arc(-i*.5,i*.16,i*.16,0,Math.PI*2),t.arc(i*.5,i*.16,i*.16,0,Math.PI*2),t.fill();const n=e.mood;n==="chaos"?(t.fillStyle="#FFFFFF",t.beginPath(),t.arc(-i*.35,-i*.15,i*.26,0,Math.PI*2),t.arc(i*.35,-i*.15,i*.26,0,Math.PI*2),t.fill(),t.fillStyle="#111827",t.beginPath(),t.arc(-i*.35,-i*.15,i*.1,0,Math.PI*2),t.arc(i*.35,-i*.15,i*.1,0,Math.PI*2),t.fill(),t.fillStyle="#18181B",t.beginPath(),t.ellipse(0,i*.38,i*.24,i*.32,0,0,Math.PI*2),t.fill(),t.fillStyle="#F43F5E",t.beginPath(),t.ellipse(0,i*.52,i*.14,i*.1,0,0,Math.PI*2),t.fill()):n==="stirring"?(t.fillStyle="#18181B",t.beginPath(),t.arc(-i*.35,-i*.15,i*.16,0,Math.PI*2),t.fill(),t.fillStyle="#FFFFFF",t.beginPath(),t.arc(-i*.38,-i*.18,i*.05,0,Math.PI*2),t.fill(),t.strokeStyle="#18181B",t.lineWidth=Math.max(2,i*.08),t.lineCap="round",t.beginPath(),t.moveTo(i*.2,-i*.15),t.lineTo(i*.48,-i*.15),t.stroke(),t.beginPath(),t.moveTo(-i*.2,i*.32),t.quadraticCurveTo(0,i*.22,i*.25,i*.32),t.stroke()):(t.strokeStyle="#18181B",t.lineWidth=Math.max(2,i*.09),t.lineCap="round",t.beginPath(),t.arc(-i*.35,-i*.12,i*.18,Math.PI*1.1,Math.PI*1.9),t.stroke(),t.beginPath(),t.arc(i*.35,-i*.12,i*.18,Math.PI*1.1,Math.PI*1.9),t.stroke(),t.beginPath(),t.arc(0,i*.12,i*.3,.2*Math.PI,.8*Math.PI),t.stroke()),t.restore()}function se(t,e){V(t,e);const i=e.id%10+1,s=e.radius;t.save(),t.rotate(e.angle),t.fillStyle="#FFFFFF",t.beginPath(),t.arc(0,0,s*.58,0,Math.PI*2),t.fill(),t.strokeStyle="rgba(0, 0, 0, 0.12)",t.lineWidth=Math.max(1,s*.04),t.stroke(),t.fillStyle="#1E293B",t.font=`800 ${Math.round(s*.65)}px Rubik, Nunito, sans-serif`,t.textAlign="center",t.textBaseline="middle",t.fillText(String(i),0,s*.04),t.restore()}function ae(t,e){const i=e.radius,s=e.breathePhase*1.8;t.save(),t.beginPath();const a=24;for(let o=0;o<=a;o++){const l=o/a*Math.PI*2,r=Math.sin(s+l*3)*(i*.03)+Math.cos(s*1.2+l*2)*(i*.02),d=i+r,h=Math.cos(l)*d,p=Math.sin(l)*d;o===0?t.moveTo(h,p):t.lineTo(h,p)}t.closePath();const n=t.createRadialGradient(-i*.35,-i*.35,i*.15,0,0,i);n.addColorStop(0,"rgba(255, 255, 255, 0.55)"),n.addColorStop(.35,"rgba(186, 230, 253, 0.22)"),n.addColorStop(.65,"rgba(240, 171, 252, 0.25)"),n.addColorStop(.9,"rgba(110, 231, 183, 0.45)"),n.addColorStop(1,"rgba(96, 165, 250, 0.75)"),t.fillStyle=n,t.fill(),t.strokeStyle="rgba(255, 255, 255, 0.75)",t.lineWidth=Math.max(1.2,i*.045),t.stroke(),t.fillStyle="rgba(255, 255, 255, 0.85)",t.beginPath(),t.ellipse(-i*.32,-i*.38,i*.34,i*.15,-Math.PI/4,0,Math.PI*2),t.fill(),t.fillStyle="rgba(255, 255, 255, 0.4)",t.beginPath(),t.ellipse(i*.38,i*.38,i*.16,i*.08,-Math.PI/4,0,Math.PI*2),t.fill(),t.restore()}const L=["#2563EB","#16A34A","#D97706","#9333EA","#0D9488","#4F46E5"];function ne(t,e,i=null,s=null){const a=e.radius,n=t.createRadialGradient(-a*.25,-a*.25,a*.2,0,0,a);n.addColorStop(0,"#FFFFFF"),n.addColorStop(.7,"#F1F5F9"),n.addColorStop(1,"#94A3B8"),t.fillStyle=n,t.beginPath(),t.arc(0,0,a,0,Math.PI*2),t.fill(),t.strokeStyle="rgba(239, 68, 68, 0.22)",t.lineWidth=1,t.beginPath(),t.moveTo(a*.6,a*.25),t.lineTo(a*.85,a*.35),t.moveTo(-a*.65,-a*.15),t.lineTo(-a*.88,-a*.28),t.stroke();let o=0,l=0;if(i!==null&&s!==null){const p=i-e.x,f=s-e.y,c=Math.sqrt(p*p+f*f);if(c>.001){const g=a*.32;o=p/c*g,l=f/c*g}}const r=L[e.id%L.length],d=a*.46;t.fillStyle=r,t.beginPath(),t.arc(o,l,d,0,Math.PI*2),t.fill();const h=t.createRadialGradient(o,l,d*.3,o,l,d);h.addColorStop(0,"rgba(255, 255, 255, 0.25)"),h.addColorStop(1,"rgba(0, 0, 0, 0.35)"),t.fillStyle=h,t.beginPath(),t.arc(o,l,d,0,Math.PI*2),t.fill(),t.fillStyle="#0F172A",t.beginPath(),t.arc(o,l,d*.52,0,Math.PI*2),t.fill(),t.fillStyle="#FFFFFF",t.beginPath(),t.arc(o-d*.28,l-d*.28,d*.24,0,Math.PI*2),t.fill(),t.fillStyle="rgba(255, 255, 255, 0.6)",t.beginPath(),t.arc(o+d*.25,l+d*.25,d*.12,0,Math.PI*2),t.fill()}const A=[{name:"Буль",base:"#20C997",dark:"#0CA678",highlight:"#96F2D7",belly:"#C3FAE8",type:"water"},{name:"Пухан",base:"#FF922B",dark:"#D9480F",highlight:"#FFE8CC",belly:"#FFF4E6",type:"monster"},{name:"Зірка",base:"#FCC419",dark:"#D97706",highlight:"#FFF3BF",belly:"#FFF9DB",type:"firefly"},{name:"Шуршик",base:"#B197FC",dark:"#7048E8",highlight:"#E5DBFF",belly:"#F3F0FF",type:"cat"},{name:"Моргун",base:"#FF8787",dark:"#E03131",highlight:"#FFD8D8",belly:"#FFE3E3",type:"cyclops"},{name:"Ластик",base:"#69DB7C",dark:"#2B8A3E",highlight:"#D3F9D8",belly:"#EBFBEE",type:"frog"}];function le(t,e){const i=A[e.id%A.length],s=e.radius,a=e.mood,n=1+Math.sin(e.breathePhase)*.035;t.save(),t.scale(n,n),t.save(),t.rotate(e.angle),oe(t,i,s,e),t.restore();const o=t.createRadialGradient(-s*.35,-s*.35,s*.12,0,0,s);o.addColorStop(0,i.highlight),o.addColorStop(.35,i.base),o.addColorStop(.85,i.dark),o.addColorStop(1,fe(i.dark,-25)),t.fillStyle=o,t.beginPath(),t.arc(0,0,s,0,Math.PI*2),t.fill();const l=t.createRadialGradient(s*.25,s*.35,s*.6,0,0,s);l.addColorStop(0,"rgba(255, 255, 255, 0)"),l.addColorStop(.9,"rgba(255, 255, 255, 0.05)"),l.addColorStop(1,"rgba(255, 255, 255, 0.25)"),t.fillStyle=l,t.beginPath(),t.arc(0,0,s,0,Math.PI*2),t.fill(),t.save(),t.rotate(e.angle),re(t,i,s),t.fillStyle="rgba(255, 107, 107, 0.42)",t.beginPath(),t.arc(-s*.5,s*.16,s*.16,0,Math.PI*2),t.arc(s*.5,s*.16,s*.16,0,Math.PI*2),t.fill(),he(t,i,s,e),t.restore(),t.fillStyle="rgba(255, 255, 255, 0.55)",t.beginPath(),t.ellipse(-s*.32,-s*.38,s*.25,s*.12,-Math.PI/4,0,Math.PI*2),t.fill(),a==="golden"&&e.id%3===0&&de(t,s,e),a==="golden"&&(t.strokeStyle="rgba(255, 216, 77, 0.7)",t.lineWidth=Math.max(2.5,s*.1),t.beginPath(),t.arc(0,0,s*1.12,0,Math.PI*2),t.stroke()),t.restore()}function oe(t,e,i,s){if(e.type==="cat")t.fillStyle=e.dark,t.beginPath(),t.moveTo(-i*.75,-i*.35),t.lineTo(-i*.6,-i*1.05),t.lineTo(-i*.2,-i*.75),t.closePath(),t.fill(),t.fillStyle="#FFA8A8",t.beginPath(),t.moveTo(-i*.68,-i*.42),t.lineTo(-i*.58,-i*.95),t.lineTo(-i*.3,-i*.72),t.closePath(),t.fill(),t.fillStyle=e.dark,t.beginPath(),t.moveTo(i*.2,-i*.75),t.lineTo(i*.6,-i*1.05),t.lineTo(i*.75,-i*.35),t.closePath(),t.fill(),t.fillStyle="#FFA8A8",t.beginPath(),t.moveTo(i*.3,-i*.72),t.lineTo(i*.58,-i*.95),t.lineTo(i*.68,-i*.42),t.closePath(),t.fill();else if(e.type==="monster")t.fillStyle="#FFA94D",t.beginPath(),t.arc(-i*.45,-i*.8,i*.2,0,Math.PI*2),t.fill(),t.beginPath(),t.arc(i*.45,-i*.8,i*.2,0,Math.PI*2),t.fill(),t.fillStyle="#FFD43B",t.beginPath(),t.arc(-i*.48,-i*.92,i*.11,0,Math.PI*2),t.arc(i*.48,-i*.92,i*.11,0,Math.PI*2),t.fill();else if(e.type==="firefly"){const a=.8+.3*Math.sin(s.breathePhase*1.5);t.strokeStyle=e.dark,t.lineWidth=Math.max(2,i*.08),t.beginPath(),t.moveTo(0,-i*.85),t.quadraticCurveTo(i*.1,-i*1.15,0,-i*1.25),t.stroke(),t.fillStyle=`rgba(255, 238, 92, ${.4*a})`,t.beginPath(),t.arc(0,-i*1.35,i*.32*a,0,Math.PI*2),t.fill(),t.fillStyle="#FFF3BF",t.beginPath(),t.arc(0,-i*1.35,i*.18,0,Math.PI*2),t.fill()}else e.type==="water"?(t.fillStyle=e.dark,t.beginPath(),t.moveTo(-i*.2,-i*.85),t.quadraticCurveTo(0,-i*1.35,i*.05,-i*1.35),t.quadraticCurveTo(i*.22,-i*1.1,i*.2,-i*.85),t.closePath(),t.fill(),t.fillStyle="#E6FCF5",t.beginPath(),t.arc(-i*.04,-i*1.15,i*.06,0,Math.PI*2),t.fill()):e.type==="frog"&&(t.fillStyle=e.dark,t.beginPath(),t.arc(-i*.45,-i*.8,i*.28,0,Math.PI*2),t.arc(i*.45,-i*.8,i*.28,0,Math.PI*2),t.fill(),t.fillStyle="#EBFBEE",t.beginPath(),t.arc(-i*.45,-i*.8,i*.22,0,Math.PI*2),t.arc(i*.45,-i*.8,i*.22,0,Math.PI*2),t.fill(),t.fillStyle="#111827",t.beginPath(),t.ellipse(-i*.45,-i*.8,i*.12,i*.07,0,0,Math.PI*2),t.ellipse(i*.45,-i*.8,i*.12,i*.07,0,0,Math.PI*2),t.fill())}function re(t,e,i,s){e.type==="cat"?(t.strokeStyle=e.dark,t.lineWidth=Math.max(2,i*.07),t.lineCap="round",t.beginPath(),t.moveTo(0,-i*.7),t.lineTo(0,-i*.42),t.moveTo(-i*.22,-i*.65),t.lineTo(-i*.14,-i*.42),t.moveTo(i*.22,-i*.65),t.lineTo(i*.14,-i*.42),t.stroke(),t.fillStyle=e.highlight,t.beginPath(),t.ellipse(-i*.35,i*.85,i*.16,i*.1,0,0,Math.PI*2),t.ellipse(i*.35,i*.85,i*.16,i*.1,0,0,Math.PI*2),t.fill()):e.type==="water"?(t.fillStyle="rgba(211, 249, 216, 0.55)",t.beginPath(),t.ellipse(0,i*.4,i*.45,i*.35,0,0,Math.PI*2),t.fill()):e.type==="frog"?(t.fillStyle="rgba(216, 245, 218, 0.6)",t.beginPath(),t.ellipse(0,i*.42,i*.5,i*.38,0,0,Math.PI*2),t.fill(),t.strokeStyle="rgba(43, 138, 62, 0.35)",t.lineWidth=Math.max(1.5,i*.06),t.beginPath(),t.arc(0,i*.3,i*.35,.2*Math.PI,.8*Math.PI),t.arc(0,i*.48,i*.32,.2*Math.PI,.8*Math.PI),t.stroke()):e.type==="monster"&&(t.fillStyle="rgba(255, 244, 230, 0.6)",t.beginPath(),t.ellipse(0,i*.4,i*.42,i*.32,0,0,Math.PI*2),t.fill())}function he(t,e,i,s){const a=s.mood;a==="chaos"?(e.type==="cyclops"?v(t,0,-i*.12,i*.42,1,!0):e.type!=="frog"&&(v(t,-i*.32,-i*.12,i*.26,1,!0),v(t,i*.32,-i*.12,i*.26,1,!0)),t.fillStyle="#18181B",t.beginPath(),t.ellipse(0,i*.42,i*.22,i*.32,0,0,Math.PI*2),t.fill(),t.fillStyle="#F43F5E",t.beginPath(),t.ellipse(0,i*.56,i*.14,i*.12,0,0,Math.PI*2),t.fill(),e.type==="monster"&&(t.fillStyle="#FFFFFF",t.beginPath(),t.moveTo(-i*.06,i*.22),t.lineTo(i*.06,i*.22),t.lineTo(0,i*.34),t.closePath(),t.fill())):a==="stirring"?e.type==="cyclops"?v(t,0,-i*.1,i*.38,.5,!1):e.type==="frog"?(t.fillStyle="#111827",t.beginPath(),t.arc(0,i*.28,i*.12,0,Math.PI*2),t.fill()):(v(t,-i*.32,-i*.12,i*.24,.85,!1),t.strokeStyle="#18181B",t.lineWidth=Math.max(2,i*.08),t.lineCap="round",t.beginPath(),t.moveTo(i*.18,-i*.12),t.lineTo(i*.46,-i*.12),t.stroke(),t.fillStyle="#18181B",t.beginPath(),t.arc(0,i*.32,i*.1,0,Math.PI*2),t.fill()):(t.strokeStyle="#18181B",t.lineWidth=Math.max(2,i*.08),t.lineCap="round",e.type==="cyclops"?s.isBlinking?(t.beginPath(),t.arc(0,-i*.05,i*.26,Math.PI*.15,Math.PI*.85),t.stroke()):v(t,0,-i*.06,i*.34,.3,!1):e.type!=="frog"&&(t.beginPath(),t.arc(-i*.32,-i*.08,i*.18,Math.PI*.15,Math.PI*.85),t.stroke(),t.beginPath(),t.arc(i*.32,-i*.08,i*.18,Math.PI*.15,Math.PI*.85),t.stroke()),t.beginPath(),t.arc(0,i*.2,i*.22,.2*Math.PI,.8*Math.PI),t.stroke(),e.type==="monster"&&(t.fillStyle="#FFFFFF",t.beginPath(),t.arc(i*.08,i*.25,i*.05,0,Math.PI),t.fill()))}function v(t,e,i,s,a=1,n=!1){t.save(),t.beginPath(),t.arc(e,i,s,0,Math.PI*2),t.clip(),t.fillStyle="#FFFFFF",t.fill();const o=s*(n?.45:.65);if(t.fillStyle=n?"#3B82F6":"#6366F1",t.beginPath(),t.arc(e,i,o,0,Math.PI*2),t.fill(),t.fillStyle="#111827",t.beginPath(),t.arc(e,i,o*(n?.35:.6),0,Math.PI*2),t.fill(),t.fillStyle="#FFFFFF",t.beginPath(),t.arc(e-s*.25,i-s*.25,s*.22,0,Math.PI*2),t.fill(),a<1){const l=(1-a)*(s*2);t.fillStyle="#FA5252",t.beginPath(),t.rect(e-s,i-s,s*2,l),t.fill(),t.strokeStyle="#18181B",t.lineWidth=2,t.beginPath(),t.moveTo(e-s,i-s+l),t.lineTo(e+s,i-s+l),t.stroke()}t.restore(),t.strokeStyle="#18181B",t.lineWidth=Math.max(1.5,s*.08),t.beginPath(),t.arc(e,i,s,0,Math.PI*2),t.stroke()}function de(t,e,i){const s=Math.sin(i.dreamPhase)*(e*.08),a=e*.55,n=-e*1.35+s;t.save(),t.fillStyle="rgba(255, 255, 255, 0.75)",t.beginPath(),t.arc(e*.25,-e*.95+s*.5,e*.06,0,Math.PI*2),t.arc(e*.4,-e*1.1+s*.7,e*.09,0,Math.PI*2),t.fill();const o=e*.32;t.fillStyle="#FFFFFF",t.shadowColor="rgba(255, 212, 59, 0.5)",t.shadowBlur=8,t.beginPath(),t.arc(a-o*.5,n,o*.65,0,Math.PI*2),t.arc(a,n-o*.35,o*.8,0,Math.PI*2),t.arc(a+o*.5,n,o*.65,0,Math.PI*2),t.closePath(),t.fill(),t.shadowBlur=0;const l=i.dreamType||"star",r=n-o*.08;l==="heart"?(t.fillStyle="#FF6B6B",ue(t,a,r,o*.55)):l==="crown"?(t.fillStyle="#FCC419",pe(t,a,r,o*.55)):l==="moon"?(t.fillStyle="#FFD43B",ge(t,a,r,o*.55)):(t.fillStyle="#FCC419",ce(t,a,r,o*.6)),t.restore()}function ce(t,e,i,s){let a=Math.PI/2*3;const n=5,o=Math.PI/n;t.beginPath(),t.moveTo(e,i-s);for(let l=0;l<n;l++)t.lineTo(e+Math.cos(a)*s,i+Math.sin(a)*s),a+=o,t.lineTo(e+Math.cos(a)*(s*.42),i+Math.sin(a)*(s*.42)),a+=o;t.closePath(),t.fill()}function ue(t,e,i,s){t.beginPath(),t.moveTo(e,i+s*.45),t.bezierCurveTo(e-s,i-s*.4,e-s*.5,i-s,e,i-s*.3),t.bezierCurveTo(e+s*.5,i-s,e+s,i-s*.4,e,i+s*.45),t.fill()}function pe(t,e,i,s){t.beginPath(),t.moveTo(e-s*.7,i+s*.4),t.lineTo(e-s*.7,i-s*.4),t.lineTo(e-s*.3,i),t.lineTo(e,i-s*.5),t.lineTo(e+s*.3,i),t.lineTo(e+s*.7,i-s*.4),t.lineTo(e+s*.7,i+s*.4),t.closePath(),t.fill()}function ge(t,e,i,s){t.beginPath(),t.arc(e,i,s*.7,.4*Math.PI,1.6*Math.PI),t.quadraticCurveTo(e-s*.2,i,e,i+s*.7),t.fill()}function fe(t,e){let i=parseInt(t.replace("#",""),16);if(isNaN(i))return t;let s=(i>>16)+e,a=(i>>8&255)+e,n=(i&255)+e;return s=Math.min(255,Math.max(0,s)),a=Math.min(255,Math.max(0,a)),n=Math.min(255,Math.max(0,n)),`#${((1<<24)+(s<<16)+(a<<8)+n).toString(16).slice(1)}`}const E=[{name:"Earth",type:"earth",base:"#1D4ED8",glow:"#60A5FA"},{name:"Mars",type:"mars",base:"#B91C1C",glow:"#F87171"},{name:"Jupiter",type:"jupiter",base:"#C2410C",ring:!0,glow:"#FDBA74"},{name:"Sun",type:"sun",base:"#FBBF24",glow:!0},{name:"Moon",type:"moon",base:"#64748B",glow:"#94A3B8"},{name:"Neptune",type:"neptune",base:"#0369A1",glow:"#38BDF8"}];function me(t,e){const i=E[e.id%E.length],s=e.radius;if(i.glow===!0){const a=t.createRadialGradient(0,0,s*.8,0,0,s*1.55);a.addColorStop(0,"rgba(251, 191, 36, 0.7)"),a.addColorStop(.5,"rgba(245, 158, 11, 0.3)"),a.addColorStop(1,"rgba(234, 88, 12, 0)"),t.fillStyle=a,t.beginPath(),t.arc(0,0,s*1.55,0,Math.PI*2),t.fill()}if(i.ring&&q(t,s,!0),t.save(),t.beginPath(),t.arc(0,0,s,0,Math.PI*2),t.clip(),t.fillStyle=i.base,t.fillRect(-s,-s,s*2,s*2),t.save(),t.rotate(e.angle),i.type==="earth"?be(t,s):i.type==="jupiter"?ye(t,s):i.type==="mars"?ve(t,s):i.type==="neptune"?Me(t,s):i.type==="moon"?Se(t,s):i.type==="sun"&&we(t,s),t.restore(),i.type!=="sun"){const a=t.createRadialGradient(-s*.45,-s*.45,s*.2,0,0,s*1.05);a.addColorStop(0,"rgba(255, 255, 255, 0.1)"),a.addColorStop(.45,"rgba(0, 0, 0, 0)"),a.addColorStop(.8,"rgba(5, 8, 22, 0.55)"),a.addColorStop(1,"rgba(3, 5, 15, 0.9)"),t.fillStyle=a,t.beginPath(),t.arc(0,0,s,0,Math.PI*2),t.fill()}i.glow&&i.type!=="sun"&&(t.strokeStyle=i.glow,t.lineWidth=Math.max(1.5,s*.05),t.globalAlpha=.45,t.beginPath(),t.arc(0,0,s-.5,0,Math.PI*2),t.stroke(),t.globalAlpha=1),t.restore(),i.ring&&q(t,s,!1)}function q(t,e,i){t.save(),t.rotate(-Math.PI/7),t.beginPath(),i?t.rect(-e*2.2,-e*2.2,e*4.4,e*2.2):t.rect(-e*2.2,0,e*4.4,e*2.2),t.clip(),t.strokeStyle="rgba(234, 138, 70, 0.75)",t.lineWidth=Math.max(2,e*.22),t.beginPath(),t.ellipse(0,0,e*1.6,e*.45,0,0,Math.PI*2),t.stroke(),t.strokeStyle="rgba(254, 215, 170, 0.9)",t.lineWidth=Math.max(1,e*.08),t.beginPath(),t.ellipse(0,0,e*1.5,e*.42,0,0,Math.PI*2),t.stroke(),t.restore()}function be(t,e){t.fillStyle="#16A34A",t.beginPath(),t.ellipse(-e*.1,-e*.15,e*.4,e*.28,Math.PI/5,0,Math.PI*2),t.ellipse(-e*.55,e*.1,e*.25,e*.45,-Math.PI/8,0,Math.PI*2),t.ellipse(e*.45,e*.35,e*.2,e*.16,0,0,Math.PI*2),t.fill(),t.fillStyle="rgba(255, 255, 255, 0.45)",t.beginPath(),t.ellipse(-e*.2,-e*.4,e*.5,e*.1,-Math.PI/12,0,Math.PI*2),t.ellipse(e*.2,e*.1,e*.45,e*.08,Math.PI/16,0,Math.PI*2),t.ellipse(-e*.3,e*.5,e*.4,e*.09,0,0,Math.PI*2),t.fill()}function ye(t,e){const i=[{y:-.65,h:.18,color:"#9A3412"},{y:-.42,h:.22,color:"#EA580C"},{y:-.15,h:.16,color:"#7C2D12"},{y:.05,h:.24,color:"#C2410C"},{y:.35,h:.18,color:"#9A3412"},{y:.58,h:.2,color:"#7C2D12"}];for(const s of i)t.fillStyle=s.color,t.fillRect(-e,s.y*e,e*2,s.h*e);t.fillStyle="#B91C1C",t.beginPath(),t.ellipse(e*.3,e*.15,e*.24,e*.14,-Math.PI/16,0,Math.PI*2),t.fill(),t.strokeStyle="#FDBA74",t.lineWidth=Math.max(1,e*.04),t.beginPath(),t.ellipse(e*.3,e*.15,e*.16,e*.08,-Math.PI/16,0,Math.PI*2),t.stroke()}function ve(t,e){t.fillStyle="#7F1D1D",t.beginPath(),t.arc(-e*.25,-e*.2,e*.25,0,Math.PI*2),t.arc(e*.3,e*.25,e*.22,0,Math.PI*2),t.arc(-e*.1,e*.35,e*.18,0,Math.PI*2),t.fill(),t.fillStyle="#FEF2F2",t.beginPath(),t.arc(0,-e*.88,e*.35,0,Math.PI*2),t.fill()}function Me(t,e){t.fillStyle="#075985",t.fillRect(-e,-e*.25,e*2,e*.35),t.fillStyle="#082F49",t.beginPath(),t.ellipse(-e*.1,-e*.1,e*.3,e*.18,0,0,Math.PI*2),t.fill(),t.fillStyle="rgba(224, 242, 254, 0.6)",t.fillRect(-e*.7,e*.25,e*1.4,e*.06)}function Se(t,e){t.fillStyle="#475569",t.beginPath(),t.ellipse(-e*.3,-e*.25,e*.3,e*.25,Math.PI/4,0,Math.PI*2),t.ellipse(e*.25,e*.15,e*.35,e*.28,-Math.PI/6,0,Math.PI*2),t.ellipse(-e*.1,e*.45,e*.22,e*.18,0,0,Math.PI*2),t.fill(),t.fillStyle="#334155",t.beginPath(),t.arc(-e*.4,e*.2,e*.1,0,Math.PI*2),t.arc(e*.4,-e*.3,e*.12,0,Math.PI*2),t.fill()}function we(t,e){const i=t.createRadialGradient(0,0,0,0,0,e);i.addColorStop(0,"#FEF08A"),i.addColorStop(.65,"#FBBF24"),i.addColorStop(1,"#EA580C"),t.fillStyle=i,t.fillRect(-e,-e,e*2,e*2),t.fillStyle="rgba(234, 88, 12, 0.35)",t.beginPath(),t.arc(-e*.25,e*.2,e*.3,0,Math.PI*2),t.arc(e*.3,-e*.15,e*.28,0,Math.PI*2),t.fill()}class Fe{constructor(){this.particles=[],this.flyingStars=[]}spawnZzz(e,i){this.particles.push({type:"zzz",x:e+(Math.random()-.5)*16,y:i-8,vx:(Math.random()-.5)*8,vy:-16-Math.random()*14,size:14+Math.random()*6,alpha:.95,decay:.45+Math.random()*.2,letter:Math.random()>.35?"z":"Z"})}spawnSparkle(e,i,s="#FFD84D"){this.particles.push({type:"sparkle",x:e,y:i,vx:(Math.random()-.5)*45,vy:(Math.random()-.5)*45,size:3+Math.random()*4,alpha:1,decay:1.2,color:s})}spawnFlyingStar(e,i,s,a,n=null){const o=(e+s)*.5,l=Math.min(i,a)-Math.max(120,Math.abs(s-e)*.35);this.flyingStars.push({x0:e,y0:i,cx:o,cy:l,x1:s,y1:a,t:0,duration:.85,onArrive:n,spin:0,scale:1.4})}spawnPop(e,i,s){for(let n=0;n<12;n++){const o=Math.PI*2*n/12+(Math.random()-.5)*.3,l=40+Math.random()*80;this.particles.push({type:"droplet",x:e+Math.cos(o)*(s*.8),y:i+Math.sin(o)*(s*.8),vx:Math.cos(o)*l,vy:Math.sin(o)*l,size:2.5+Math.random()*3,alpha:.85,decay:1.8,color:"#74C0FC"})}}spawnConfetti(e,i){const s=["#FF6B6B","#4DABF7","#FFD43B","#69DB7C","#DA77F2","#FFA94D"];for(let a=0;a<110;a++)this.particles.push({type:"confetti",x:Math.random()*e,y:-10-Math.random()*60,vx:(Math.random()-.5)*90,vy:90+Math.random()*130,rotation:Math.random()*Math.PI*2,rotSpeed:(Math.random()-.5)*8,sizeW:9+Math.random()*6,sizeH:5+Math.random()*4,alpha:1,decay:.2,color:s[Math.floor(Math.random()*s.length)]})}update(e){for(let i=this.particles.length-1;i>=0;i--){const s=this.particles[i];s.x+=s.vx*e,s.y+=s.vy*e,s.alpha-=s.decay*e,s.type==="confetti"?(s.rotation+=s.rotSpeed*e,s.vx+=(Math.random()-.5)*40*e):s.type==="droplet"&&(s.vy+=120*e),s.alpha<=0&&this.particles.splice(i,1)}for(let i=this.flyingStars.length-1;i>=0;i--){const s=this.flyingStars[i];s.t+=e/s.duration,s.spin+=e*6;const a=Math.min(1,s.t),n=1-a,o=n*n*s.x0+2*n*a*s.cx+a*a*s.x1,l=n*n*s.y0+2*n*a*s.cy+a*a*s.y1;if(Math.random()<.75&&this.particles.push({type:"sparkle",x:o+(Math.random()-.5)*12,y:l+(Math.random()-.5)*12,vx:(Math.random()-.5)*15,vy:(Math.random()-.5)*15,size:2.5+Math.random()*3,alpha:.9,decay:2.2,color:Math.random()>.4?"#FFE066":"#FFF3BF"}),s.t>=1){for(let r=0;r<14;r++)this.spawnSparkle(s.x1,s.y1,"#FFD43B");s.onArrive&&s.onArrive(),this.flyingStars.splice(i,1)}}}render(e,i=!1){if(!(this.particles.length===0&&this.flyingStars.length===0)){e.save();for(const s of this.particles)e.globalAlpha=Math.max(0,s.alpha),s.type==="zzz"?(e.fillStyle=i?"#334155":"#C5D8F8",e.font=`800 ${s.size}px Rubik, Nunito, sans-serif`,e.textAlign="center",e.textBaseline="middle",e.fillText(s.letter,s.x,s.y)):s.type==="sparkle"||s.type==="droplet"?(e.fillStyle=s.color,e.beginPath(),e.arc(s.x,s.y,s.size,0,Math.PI*2),e.fill()):s.type==="confetti"&&(e.save(),e.translate(s.x,s.y),e.rotate(s.rotation),e.fillStyle=s.color,e.fillRect(-s.sizeW/2,-s.sizeH/2,s.sizeW,s.sizeH),e.restore());for(const s of this.flyingStars){const a=Math.min(1,s.t),n=1-a,o=n*n*s.x0+2*n*a*s.cx+a*a*s.x1,l=n*n*s.y0+2*n*a*s.cy+a*a*s.y1,r=16*(1.2+.4*Math.sin(a*Math.PI));e.save(),e.translate(o,l),e.rotate(s.spin),e.globalAlpha=.55,e.fillStyle="#FFE066",e.beginPath(),e.arc(0,0,r*1.5,0,Math.PI*2),e.fill(),e.globalAlpha=1,e.fillStyle="#FFD43B",e.strokeStyle="#F59F00",e.lineWidth=2,ke(e,0,0,5,r,r*.45),e.fill(),e.stroke(),e.restore()}e.restore()}}}function ke(t,e,i,s,a,n){let o=Math.PI/2*3,l=e,r=i;const d=Math.PI/s;t.beginPath(),t.moveTo(e,i-a);for(let h=0;h<s;h++)l=e+Math.cos(o)*a,r=i+Math.sin(o)*a,t.lineTo(l,r),o+=d,l=e+Math.cos(o)*n,r=i+Math.sin(o)*n,t.lineTo(l,r),o+=d;t.lineTo(e,i-a),t.closePath()}class Ce{constructor(e){this.canvas=e,this.ctx=e.getContext("2d",{alpha:!1}),this.particles=new Fe,this.width=1200,this.height=800,this.dpr=Math.min(2,window.devicePixelRatio||1),this.theme="critters",this.isLightRoom=!1,this.bgStars=[],this.initBgStars(),this.zzzTimer=0}initBgStars(){this.bgStars=[];for(let e=0;e<48;e++)this.bgStars.push({x:Math.random(),y:Math.random(),size:Math.random()*2+1,phase:Math.random()*Math.PI*2,speed:Math.random()*2+1.2})}resize(e,i){this.width=e,this.height=i,this.dpr=Math.min(2,window.devicePixelRatio||1),this.canvas.width=Math.floor(e*this.dpr),this.canvas.height=Math.floor(i*this.dpr),this.canvas.style.width=`${e}px`,this.canvas.style.height=`${i}px`,this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0)}setTheme(e){this.theme=e}setLightRoom(e){this.isLightRoom=e}render(e,i,s,a,n=null,o=null){const l=this.ctx,r=this.width,d=this.height;if(this.isLightRoom){const h=l.createLinearGradient(0,0,0,d);h.addColorStop(0,"#F8FAFC"),h.addColorStop(.5,"#F1F5F9"),h.addColorStop(1,"#E2E8F0"),l.fillStyle=h,l.fillRect(0,0,r,d),l.fillStyle="rgba(148, 163, 184, 0.08)",l.fillRect(0,d-40,r,40)}else{const h=l.createLinearGradient(0,0,0,d);h.addColorStop(0,"#0F122B"),h.addColorStop(.7,"#191538"),h.addColorStop(1,"#25133E"),l.fillStyle=h,l.fillRect(0,0,r,d),l.fillStyle="#FFFFFF";for(const p of this.bgStars){p.phase+=a*p.speed;const f=.2+.35*Math.sin(p.phase);l.globalAlpha=Math.max(0,f),l.beginPath(),l.arc(p.x*r,p.y*d,p.size,0,Math.PI*2),l.fill()}l.globalAlpha=1}if(i==="green"&&(this.theme==="critters"||this.theme==="emoji")){if(this.zzzTimer+=a,this.zzzTimer>1.2&&e.balls.length>0){this.zzzTimer=0;const h=e.balls[Math.floor(Math.random()*e.balls.length)];h&&h.y>d*.35&&this.particles.spawnZzz(h.x,h.y-h.radius)}}else this.zzzTimer=0;for(const h of e.balls){const p=d-(h.y+h.radius);if(p<h.radius*2.8){const f=Math.max(0,1-p/(h.radius*2.8)),c=h.radius*(.8+.35*f),g=Math.max(2,h.radius*.24*f),y=(this.isLightRoom?.22:.42)*f;l.fillStyle=`rgba(0, 0, 0, ${y})`,l.beginPath(),l.ellipse(h.x,d-3,c,g,0,0,Math.PI*2),l.fill()}}for(const h of e.balls){switch(l.save(),l.translate(h.x,h.y),l.scale(h.scaleX,h.scaleY),this.theme){case"plastic":V(l,h);break;case"emoji":ie(l,h);break;case"numbers":se(l,h);break;case"bubbles":ae(l,h);break;case"eyes":ne(l,h,n,o);break;case"space":me(l,h);break;case"critters":default:le(l,h);break}l.restore()}this.particles.update(a),this.particles.render(l,this.isLightRoom)}}const G={uk:{appTitle:"Тихий клас",appSubtitle:"Керуй тишею в класі через веселу гру з кульками!",startBtn:"Почати урок",micOn:"Мікрофон увімкнено",micOff:"Мікрофон вимкнено",micAllowHelp:"Будь ласка, дозвольте доступ до мікрофона в адресному рядку браузера",calibrateBtn:"Калібрувати кімнату (3 с)",calibrating:"Слухаємо фон класу...",sensitivity:"Чутливість",micDevice:"Пристрій мікрофона",micProfile:"Профіль мікрофона",profileWebcam:"Веб-камера (відстань 2-4м)",profileLaptop:"Ноутбук / Вбудований",profileClose:"Близький / Гарнітура",micGain:"Підсилення сигналу (Preamp Gain)",ballCount:"Кількість кульок",theme:"Тема оформлення",alertSound:"Звук сповіщення",soundShush:"Шурхіт «Тссс»",soundBeep:"М'який «Біп»",soundNone:"Без звуку",volume:"Гучність звуків",lightRoom:"Світла кімната (для проектора)",fullscreen:"Повноекранний режим (F)",classProfile:"Клас",goal:"Ціль тижня",reward:"Нагорода",starAwarded:"Зірка отримана!",goldenCombo:"Золота тиша!",timerFinished:"Час вийшов! Чудова робота!",tooNoisy:"Занадто гучно!",quietPlease:"Тихіше, будь ласка!",shush:"Тсссс!",modeQuiet:"Тиха робота",modeGroups:"Робота в групах",modeBreak:"Перерва / Класика",privacyNote:"Звук аналізується лише на цьому пристрої й нікуди не передається",hotkeysHelp:"Гарячі клавіші: Space (пауза), M (мікрофон), C (калібрування), F (повний екран), 1/2/3 (режими), T (таймер), S (зірка), H (панель)"},en:{appTitle:"Quiet Class",appSubtitle:"Manage classroom noise with fun bouncing critters!",startBtn:"Start Lesson",micOn:"Microphone ON",micOff:"Microphone OFF",micAllowHelp:"Please allow microphone access in your browser address bar",calibrateBtn:"Calibrate Room (3s)",calibrating:"Listening to ambient noise...",sensitivity:"Sensitivity",micDevice:"Microphone Device",micProfile:"Microphone Profile",profileWebcam:"Webcam (2-4m distance)",profileLaptop:"Laptop / Built-in",profileClose:"Close / Headset",micGain:"Preamp Gain Boost",ballCount:"Ball count",theme:"Theme",alertSound:"Alert sound",soundShush:"Shush sound",soundBeep:"Soft beep",soundNone:"No sound",volume:"Sound volume",lightRoom:"Light room (for projector)",fullscreen:"Fullscreen (F)",classProfile:"Class",goal:"Weekly goal",reward:"Reward",starAwarded:"Star earned!",goldenCombo:"Golden Silence!",timerFinished:"Time is up! Great work!",tooNoisy:"Too noisy!",quietPlease:"Quiet, please!",shush:"Shhhh!",modeQuiet:"Quiet Work",modeGroups:"Group Work",modeBreak:"Break / Classic",privacyNote:"Audio is analyzed locally on this device only and is never stored",hotkeysHelp:"Shortcuts: Space (pause), M (mic), C (calibrate), F (fullscreen), 1/2/3 (modes), T (timer), S (star), H (panel)"}};let Pe="uk";function b(t){return G[Pe]?.[t]||G.uk[t]||t}function P(t=!0){return t?`<svg class="ui-icon icon-mic on" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3"></rect>
    <path d="M5 10v1a7 7 0 0 0 14 0v-1"></path>
    <line x1="12" y1="18" x2="12" y2="22"></line>
    <line x1="8" y1="22" x2="16" y2="22"></line>
  </svg>`:`<svg class="ui-icon icon-mic off" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"></line>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
      <path d="M19 10v1a7 7 0 0 1-1.14 3.86"></path>
      <path d="M5 10v1a7 7 0 0 0 10.93 5.86"></path>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="8" y1="22" x2="16" y2="22"></line>
    </svg>`}function F(){return`<svg class="ui-icon icon-calibrate" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
  </svg>`}function Te(){return`<svg class="ui-icon icon-gear" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`}function H(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>`}function j(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>`}function R(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>`}function k(t=!0){return t?`<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="#FFD43B" stroke="#F59F00" stroke-width="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`:`<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`}function W(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`}function Be(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`}function N(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`}function O(){return`<svg class="ui-icon icon-lock" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`}function $(){return`<svg class="ui-icon icon-gift" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>`}function De(){return`<svg class="ui-icon icon-party" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 22l6-16 10 10-16 6z"></path>
    <path d="M14 9l3-3"></path>
    <path d="M17 14l4-1"></path>
    <path d="M11 4l1-3"></path>
    <circle cx="20" cy="4" r="1" fill="currentColor"></circle>
    <circle cx="10" cy="1" r="1" fill="currentColor"></circle>
  </svg>`}function Ie(){return`<svg class="ui-icon icon-sparkles" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z"></path>
    <path d="M19 15l1.2 2.8L23 19l-2.8 1.2L19 23l-1.2-2.8L15 19l2.8-1.2L19 15z"></path>
  </svg>`}function Le(){return`<svg class="ui-icon icon-lab" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31L4.1 19.33A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.67L14 9.31V2"></path>
    <line x1="8.5" y1="2" x2="15.5" y2="2"></line>
    <line x1="14" y1="9.3" x2="10" y2="9.3"></line>
  </svg>`}function z(t=0,e=20){const i=Math.min(1,Math.max(0,t/Math.max(1,e))),s=22*i,a=33-s,n=[];return t>=1&&n.push('<circle cx="12" cy="31" r="1.5" fill="#FFFFFF"/>'),t>=2&&n.push('<polygon points="20,28 20.8,29.8 22.8,30.1 21.3,31.5 21.7,33.5 20,32.5 18.3,33.5 18.7,31.5 17.2,30.1 19.2,29.8" fill="#FFF3BF"/>'),t>=4&&n.push('<circle cx="25" cy="27" r="1.3" fill="#FFFFFF"/>'),t>=6&&n.push('<polygon points="14,23 14.7,24.5 16.5,24.8 15.2,26 15.6,27.7 14,26.8 12.4,27.7 12.8,26 11.5,24.8 13.3,24.5" fill="#FFE066"/>'),t>=8&&n.push('<circle cx="22" cy="21" r="1.6" fill="#FFFFFF"/>'),t>=12&&n.push('<polygon points="18,17 18.7,18.5 20.5,18.8 19.2,20 19.6,21.7 18,20.8 16.4,21.7 16.8,20 15.5,18.8 17.3,18.5" fill="#FFF9DB"/>'),t>=16&&n.push('<circle cx="13" cy="15" r="1.4" fill="#FFFFFF"/>'),t>=e&&n.push('<polygon points="22,13 22.7,14.5 24.5,14.8 23.2,16 23.6,17.7 22,16.8 20.4,17.7 20.8,16 19.5,14.8 21.3,14.5" fill="#FFFFFF"/>'),`<svg class="jar-glass-svg" viewBox="0 0 36 40" width="36" height="40">
    <defs>
      <linearGradient id="jarGlassGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#EBF8FF" stop-opacity="0.45"/>
        <stop offset="60%" stop-color="#BEE3F8" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="#90CDF4" stop-opacity="0.35"/>
      </linearGradient>
      <linearGradient id="jarFillGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FFE066" stop-opacity="0.95"/>
        <stop offset="100%" stop-color="#F59F00" stop-opacity="0.9"/>
      </linearGradient>
      <linearGradient id="corkGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#D97706"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#B45309"/>
      </linearGradient>
      <clipPath id="jarInnerClip">
        <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"/>
      </clipPath>
    </defs>

    <!-- Cork lid -->
    <rect x="11" y="2" width="14" height="4.5" rx="1.5" fill="url(#corkGrad)"/>
    <ellipse cx="18" cy="6.5" rx="8" ry="1.8" fill="#92400E"/>

    <!-- Glass Body Fill (clipped to jar shape) -->
    <g clip-path="url(#jarInnerClip)">
      <!-- Background of jar interior -->
      <rect x="4" y="9" width="28" height="28" fill="rgba(255, 255, 255, 0.08)"/>

      <!-- Golden stars liquid/glow level -->
      ${i>0?`<rect x="5" y="${a}" width="26" height="${s+4}" fill="url(#jarFillGrad)"/>
      <ellipse cx="18" cy="${a}" rx="12" ry="2.2" fill="#FFF3BF"/>`:""}

      <!-- Mini floating stars inside -->
      ${n.join(`
      `)}
    </g>

    <!-- Glass Body Outline & Specular Highlight -->
    <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"
      fill="url(#jarGlassGrad)" stroke="rgba(255, 255, 255, 0.75)" stroke-width="1.8"/>

    <!-- Left glass reflection sheen -->
    <path d="M8 14 V30" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.6"/>
  </svg>`}function Ae(t){switch(t){case"critters":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="21" r="15" fill="#38D9A9"/>
        <circle cx="15" cy="18" r="2.5" fill="#111827"/>
        <circle cx="25" cy="18" r="2.5" fill="#111827"/>
        <path d="M17 25 Q20 28 23 25" stroke="#111827" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        <path d="M20 6 C20 6 17 10 20 11 C23 10 20 6 20 6 Z" fill="#12B886"/>
      </svg>`;case"space":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="13" fill="#DD6B20"/>
        <ellipse cx="20" cy="20" rx="19" ry="5.5" fill="none" stroke="#ED8936" stroke-width="2.2" transform="rotate(-15 20 20)"/>
        <circle cx="16" cy="16" r="2.5" fill="#C05621"/>
      </svg>`;case"bubbles":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="14" fill="rgba(165,216,255,0.4)" stroke="#63E6BE" stroke-width="2"/>
        <ellipse cx="16" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.8" transform="rotate(-30 16 14)"/>
      </svg>`;case"emoji":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#FFD43B"/>
        <circle cx="15" cy="17" r="2" fill="#1A1A1A"/>
        <circle cx="25" cy="17" r="2" fill="#1A1A1A"/>
        <path d="M14 23 Q20 29 26 23" stroke="#1A1A1A" stroke-width="2" fill="none" stroke-linecap="round"/>
      </svg>`;case"plastic":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <defs>
          <radialGradient id="plThumb" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#FF8787"/>
            <stop offset="50%" stop-color="#FA5252"/>
            <stop offset="100%" stop-color="#C92A2A"/>
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="15" fill="url(#plThumb)"/>
        <ellipse cx="16" cy="14" rx="4" ry="2" fill="#FFFFFF" opacity="0.65" transform="rotate(-30 16 14)"/>
      </svg>`;case"numbers":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#4DABF7"/>
        <circle cx="20" cy="20" r="9" fill="#FFFFFF"/>
        <text x="20" y="25" font-family="Rubik, sans-serif" font-weight="800" font-size="13" text-anchor="middle" fill="#1E293B">7</text>
      </svg>`;case"eyes":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="20" r="15" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
        <circle cx="21" cy="20" r="7.5" fill="#3B82F6"/>
        <circle cx="21" cy="20" r="4" fill="#0F172A"/>
        <circle cx="19" cy="18" r="1.8" fill="#FFFFFF"/>
      </svg>`;default:return""}}function Ee(){return`<svg class="ui-icon icon-camera" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`}function qe(){return`<svg class="ui-icon icon-laptop" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2"></rect>
    <line x1="2" y1="20" x2="22" y2="20"></line>
  </svg>`}class Ge{constructor(e={}){this.callbacks=e,this.container=document.createElement("div"),this.container.className="hud-container",this.container.innerHTML=`
      <!-- Top Bar in TV Safe Area -->
      <div class="hud-top">
        <!-- Left: Noise Traffic Light & Visual Threshold Wave Meter -->
        <div class="traffic-light-meter" id="traffic-light">
          <div class="traffic-dots">
            <div class="light-dot green active" title="Спокій"></div>
            <div class="light-dot yellow" title="Шепіт / Робочий шум"></div>
            <div class="light-dot red" title="Галас!"></div>
          </div>
          <div class="sound-meter-wrap" id="sound-meter-wrap">
            <div class="meter-threshold-tick yellow-tick" title="Поріг жовтої зони"></div>
            <div class="meter-threshold-tick red-tick" title="Поріг червоної зони"></div>
            <div class="db-bar" id="db-bar"></div>
          </div>
          <button class="hud-icon-btn" id="cal-quick-btn" title="${b("calibrateBtn")}">
            ${F()}
          </button>
        </div>

        <!-- Center: Interactive Quick Mode Switcher & Timer -->
        <div class="hud-center">
          <div class="mode-segmented-control" id="hud-mode-control">
            <button class="hud-mode-tab active" data-mode="quiet">
              <span>Тиха робота</span>
            </button>
            <button class="hud-mode-tab" data-mode="groups">
              <span>Групи</span>
            </button>
            <button class="hud-mode-tab" data-mode="breaktime">
              <span>Перерва</span>
            </button>
          </div>

          <div class="timer-display hidden" id="timer-display">
            <span class="timer-digits" id="timer-digits">05:00</span>
            <button class="timer-btn" id="timer-toggle-btn">
              ${R()}
            </button>
          </div>
        </div>

        <!-- Right: Glass Star Jar & Settings Toggle -->
        <div class="hud-right">
          <div class="star-jar-widget" id="star-jar-widget" title="Банка зірок класу">
            <div class="jar-ring-container">
              <svg class="star-progress-ring" viewBox="0 0 54 54">
                <circle class="ring-bg" cx="27" cy="27" r="23"></circle>
                <circle class="ring-fill" id="star-ring-fill" cx="27" cy="27" r="23"></circle>
              </svg>
              <div class="jar-icon-wrap" id="jar-svg-slot">
                ${z(0,20)}
              </div>
            </div>
            <div class="jar-text-info">
              <div class="star-count-badge" id="star-count">
                ${k(!0)} <span id="star-numbers">0/20</span>
              </div>
              <div class="jar-reward-label" id="jar-reward-label">5 хв мультика</div>
            </div>
          </div>

          <button class="panel-toggle-btn" id="panel-toggle-btn" title="Налаштування (H)">
            ${Te()}
          </button>
        </div>
      </div>

      <!-- Large Bouncy Alert Banner -->
      <div class="alert-banner hidden" id="alert-banner">
        <h2 id="alert-text">${b("shush")}</h2>
      </div>

      <!-- Golden Combo Banner -->
      <div class="golden-banner hidden" id="golden-banner">
        ${Ie()} <span>${b("goldenCombo")}</span>
      </div>

      <!-- Microphone Permission Blocked Help Toast -->
      <div class="mic-blocked-toast hidden" id="mic-blocked-toast">
        <div class="toast-content">
          <span class="toast-icon">${O()}</span>
          <div class="toast-text">
            <strong>Доступ до мікрофона заблоковано</strong>
            <p>Натисніть на значок замочка в адресному рядку браузера та виберіть «Дозволити мікрофон».</p>
          </div>
        </div>
        <button class="toast-close-btn" id="toast-close-btn">${W()}</button>
      </div>

      <!-- Goal Achieved Celebration Modal -->
      <div class="goal-modal-overlay hidden" id="goal-modal">
        <div class="goal-modal-card">
          <div class="goal-modal-badge">${k(!0)}</div>
          <h2>${De()} Ціль тижня досягнуто!</h2>
          <p class="goal-modal-subtitle">Клас виконав поставлену мету та отримує заслужену нагороду:</p>
          <div class="goal-modal-reward" id="goal-modal-reward">${$()} <span>5 хв мультика</span></div>
          <div class="goal-modal-actions">
            <button class="goal-action-btn primary" id="btn-goal-reset">
              ${N()} Розпочати новий тиждень
            </button>
            <button class="goal-action-btn secondary" id="btn-goal-close">
              Продовжити
            </button>
          </div>
        </div>
      </div>
    `,document.body.appendChild(this.container),this.dotGreen=this.container.querySelector(".light-dot.green"),this.dotYellow=this.container.querySelector(".light-dot.yellow"),this.dotRed=this.container.querySelector(".light-dot.red"),this.dbBar=this.container.querySelector("#db-bar"),this.modeControl=this.container.querySelector("#hud-mode-control"),this.timerDisplay=this.container.querySelector("#timer-display"),this.timerDigits=this.container.querySelector("#timer-digits"),this.timerToggleBtn=this.container.querySelector("#timer-toggle-btn"),this.starRingFill=this.container.querySelector("#star-ring-fill"),this.starNumbers=this.container.querySelector("#star-numbers"),this.jarRewardLabel=this.container.querySelector("#jar-reward-label"),this.jarSvgSlot=this.container.querySelector("#jar-svg-slot"),this.jarWidget=this.container.querySelector("#star-jar-widget"),this.alertBanner=this.container.querySelector("#alert-banner"),this.alertText=this.container.querySelector("#alert-text"),this.goldenBanner=this.container.querySelector("#golden-banner"),this.micBlockedToast=this.container.querySelector("#mic-blocked-toast"),this.goalModal=this.container.querySelector("#goal-modal"),this.goalModalReward=this.container.querySelector("#goal-modal-reward"),this.alertTimer=null,this.alertPhrases=[b("shush"),b("quietPlease"),b("tooNoisy")],this.ringCircumference=2*Math.PI*23,this.starRingFill.style.strokeDasharray=`${this.ringCircumference} ${this.ringCircumference}`,this.starRingFill.style.strokeDashoffset=this.ringCircumference,this.bindEvents()}bindEvents(){this.modeControl.querySelectorAll(".hud-mode-tab").forEach(s=>{s.addEventListener("click",()=>{const a=s.dataset.mode;this.updateMode(a),this.callbacks.onModeChange&&this.callbacks.onModeChange(a)})}),this.container.querySelector("#cal-quick-btn").addEventListener("click",()=>{this.callbacks.onQuickCalibrate&&this.callbacks.onQuickCalibrate()}),this.container.querySelector("#panel-toggle-btn").addEventListener("click",()=>{this.callbacks.onPanelToggle&&this.callbacks.onPanelToggle()}),this.timerToggleBtn.addEventListener("click",()=>{this.callbacks.onTimerToggle&&this.callbacks.onTimerToggle()}),this.container.querySelector("#toast-close-btn")?.addEventListener("click",()=>{this.micBlockedToast.classList.add("hidden")}),this.container.querySelector("#btn-goal-close")?.addEventListener("click",()=>{this.goalModal.classList.add("hidden")}),this.container.querySelector("#btn-goal-reset")?.addEventListener("click",()=>{this.goalModal.classList.add("hidden"),this.callbacks.onResetWeek&&this.callbacks.onResetWeek()})}updateNoiseMeter(e,i,s,a){if(this.dotGreen.classList.toggle("active",e==="green"),this.dotYellow.classList.toggle("active",e==="yellow"),this.dotRed.classList.toggle("active",e==="red"),s)this.dbBar.style.width=`${Math.round(a*100)}%`,this.dbBar.style.background="var(--zone-yellow)";else{const n=Math.min(100,Math.round(i/1.5*100));this.dbBar.style.width=`${n}%`,e==="red"?this.dbBar.style.background="var(--zone-red)":e==="yellow"?this.dbBar.style.background="var(--zone-yellow)":this.dbBar.style.background="var(--zone-green)"}}updateMode(e){this.modeControl.querySelectorAll(".hud-mode-tab").forEach(i=>{i.classList.toggle("active",i.dataset.mode===e)})}updateTimer(e,i){if(e<=0&&!i){this.timerDisplay.classList.add("hidden"),this.modeControl.classList.remove("hidden");return}this.timerDisplay.classList.remove("hidden"),this.modeControl.classList.add("hidden");const s=Math.floor(e/60),a=Math.floor(e%60);this.timerDigits.textContent=`${String(s).padStart(2,"0")}:${String(a).padStart(2,"0")}`,this.timerToggleBtn.innerHTML=i?R():j()}updateStars(e,i,s,a,n=""){this.starNumbers.textContent=`${e}/${i}`,n&&(this.jarRewardLabel.textContent=n);const o=this.ringCircumference-s*this.ringCircumference;this.starRingFill.style.strokeDashoffset=o,this.jarSvgSlot.innerHTML=z(e,i),this.goldenBanner.classList.toggle("hidden",!a)}triggerJarBounce(){this.jarWidget.classList.remove("jar-pop"),this.jarWidget.offsetWidth,this.jarWidget.classList.add("jar-pop")}triggerScreenShake(){document.body.classList.remove("screen-shake"),document.body.offsetWidth,document.body.classList.add("screen-shake"),setTimeout(()=>{document.body.classList.remove("screen-shake")},450)}showAlert(e=null){clearTimeout(this.alertTimer);const i=e||this.alertPhrases[Math.floor(Math.random()*this.alertPhrases.length)];this.alertText.textContent=i,this.alertBanner.classList.remove("hidden"),this.alertBanner.classList.remove("pop-out"),this.alertBanner.classList.add("pop-in"),this.alertTimer=setTimeout(()=>{this.alertBanner.classList.remove("pop-in"),this.alertBanner.classList.add("pop-out"),setTimeout(()=>{this.alertBanner.classList.add("hidden")},350)},2400)}showGoalReachedModal(e,i=null){i&&(this.callbacks.onResetWeek=i),this.goalModalReward.innerHTML=`${$()} <span>${e||"Нагорода"}</span>`,this.goalModal.classList.remove("hidden")}showMicBlockedHelp(){this.micBlockedToast.classList.remove("hidden")}getJarMouthCoords(){const e=this.jarWidget.getBoundingClientRect();return{x:e.left+e.width*.35,y:e.top+e.height*.45}}}const Re=[{id:"critters",title:"Сплюшки",sub:"Основна"},{id:"space",title:"Космос",sub:"5-6 класи"},{id:"bubbles",title:"Бульбашки",sub:"Мильні"},{id:"emoji",title:"Емоджі",sub:"Емоції"},{id:"plastic",title:"Глянець",sub:"Більярд"},{id:"numbers",title:"Числа",sub:"1 — 10"},{id:"eyes",title:"Очі",sub:"Слідкують"}];class $e{constructor(e,i){this.state=e,this.callbacks=i,this.panel=document.createElement("div"),this.panel.className="teacher-panel closed",this.render(),document.body.appendChild(this.panel),this.bindEvents()}render(){const e=this.state.settings,i=this.state.activeClass,s=this.state.classes[i]||{goal:20,reward:"5 хв мультика"};this.panel.innerHTML=`
      <div class="panel-header">
        <div class="panel-header-title">
          <h2>Панель вчителя</h2>
          <span class="panel-tag">Тихий клас v5</span>
        </div>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${W()}
        </button>
      </div>

      <div class="panel-body">
        <!-- Lesson Mode Presets -->
        <div class="setting-group">
          <label class="setting-label">Режим уроку</label>
          <div class="mode-buttons-grid">
            <button class="mode-card-btn ${e.mode==="quiet"?"active":""}" data-mode="quiet">
              <span class="mode-card-title">Тиха робота</span>
              <span class="mode-card-desc">Повний спокій під час завдань</span>
            </button>
            <button class="mode-card-btn ${e.mode==="groups"?"active":""}" data-mode="groups">
              <span class="mode-card-title">Робота в групах</span>
              <span class="mode-card-desc">Дозволений помірний шепіт</span>
            </button>
            <button class="mode-card-btn ${e.mode==="breaktime"?"active":""}" data-mode="breaktime">
              <span class="mode-card-title">Перерва</span>
              <span class="mode-card-desc">Кульки весело стрибають від крику</span>
            </button>
          </div>
        </div>

        <!-- Microphone & Hardware Adaptation -->
        <div class="setting-group">
          <label class="setting-label">Мікрофон та адаптація</label>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${P(!1)} <span>Увімк. мікрофон</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate">
              ${F()} <span>Калібрувати (3с)</span>
            </button>
          </div>

          <!-- Device selection dropdown -->
          <div class="mic-device-row">
            <label class="sub-label" for="select-mic-device">Пристрій введення звуку:</label>
            <select class="select-input" id="select-mic-device">
              <option value="">Автовизначення / За замовчуванням</option>
            </select>
          </div>

          <!-- Profile quick selector -->
          <div class="mic-profiles-group">
            <span class="sub-label">Тип мікрофона (DSP-фільтрація):</span>
            <div class="mic-profiles-row">
              <button class="profile-chip-btn ${e.micProfile==="webcam"?"active":""}" data-profile="webcam" title="Оптимально для вебкамер: фільтр шуму кулера + підсилення 2.2x">
                ${Ee()} <span>Вебкамера (2-4м)</span>
              </button>
              <button class="profile-chip-btn ${e.micProfile==="laptop"?"active":""}" data-profile="laptop" title="Для вбудованих мікрофонів ноутбука: помірне підсилення 1.5x">
                ${qe()} <span>Ноутбук / ПК</span>
              </button>
              <button class="profile-chip-btn ${e.micProfile==="close"?"active":""}" data-profile="close" title="Для гарнітур та петличок: стандартне посилення 1.0x">
                ${P(!0)} <span>Гарнітура</span>
              </button>
            </div>
          </div>

          <!-- Live Signal VU-Meter Test -->
          <div class="mic-test-wrap">
            <div class="mic-test-header">
              <span>Живий сигнал мікрофона (VU):</span>
              <span id="mic-test-db">-55 dB</span>
            </div>
            <div class="mic-vu-bar-bg">
              <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
              <div class="mic-vu-tick yellow-tick" title="Поріг жовтої зони (шепіт)"></div>
              <div class="mic-vu-tick red-tick" title="Поріг червоної зони (галас)"></div>
            </div>
            <div class="mic-status-hint" id="mic-status-hint">
              <span>Фон: <strong id="hint-ambient">${Math.round(e.ambientBaselineDb||-55)} dB</strong></span>
              <span>•</span>
              <span id="hint-status">Слухаємо кімнату...</span>
            </div>
          </div>
        </div>

        <!-- Preamp Gain Slider -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Підсилення мікрофона (Preamp Gain)</span>
            <span class="slider-val" id="val-gain">${e.micGain?Number(e.micGain).toFixed(1):"2.2"}×</span>
          </div>
          <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${e.micGain||2.2}">
          <div class="slider-hints">
            <span>0.5× (студійний)</span>
            <span>2.2× (вебкамера)</span>
            <span>4.5× (тихий мікрофон)</span>
          </div>
        </div>

        <!-- Sliders: Sensitivity & Balls -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Чутливість до шуму</span>
            <span class="slider-val" id="val-sensitivity">${e.sensitivity>0?"+":""}${e.sensitivity} dB</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${e.sensitivity}">
          <div class="slider-hints">
            <span>-15 (для галасливих)</span>
            <span>0 (стандарт)</span>
            <span>+15 (максимальна чутливість)</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Кількість кульок</span>
            <span class="slider-val" id="val-balls">${e.balls}</span>
          </div>
          <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${e.balls}">
        </div>

        <!-- Theme Selection Grid -->
        <div class="setting-group">
          <label class="setting-label">Тема оформлення кульок</label>
          <div class="themes-grid" id="themes-grid">
            ${Re.map(a=>`
              <button class="theme-card ${e.theme===a.id?"active":""}" data-theme="${a.id}">
                <div class="theme-card-icon">${Ae(a.id)}</div>
                <div class="theme-card-info">
                  <span class="theme-title">${a.title}</span>
                  <span class="theme-sub">${a.sub}</span>
                </div>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Task Timer -->
        <div class="setting-group">
          <label class="setting-label">Швидкий запуск таймера</label>
          <div class="timer-chips">
            <button class="chip-btn" data-min="1">1 хв</button>
            <button class="chip-btn" data-min="2">2 хв</button>
            <button class="chip-btn" data-min="5">5 хв</button>
            <button class="chip-btn" data-min="10">10 хв</button>
            <button class="chip-btn" data-min="15">15 хв</button>
          </div>
        </div>

        <!-- Alert Sound Segmented Switch -->
        <div class="setting-group">
          <label class="setting-label">Звук попередження «Тссс»</label>
          <div class="segmented-control" id="sound-control">
            <button class="segmented-tab ${e.alertSound==="shush"?"active":""}" data-sound="shush">
              Шурхіт «Тссс»
            </button>
            <button class="segmented-tab ${e.alertSound==="beep"?"active":""}" data-sound="beep">
              М'який «Біп»
            </button>
            <button class="segmented-tab ${e.alertSound==="none"?"active":""}" data-sound="none">
              Без звуку
            </button>
          </div>
        </div>

        <!-- Volume Slider -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Гучність гри</span>
            <span class="slider-val" id="val-volume">${Math.round(e.volume*100)}%</span>
          </div>
          <input type="range" class="slider" id="slider-volume" min="0" max="1" step="0.05" value="${e.volume}">
        </div>

        <!-- Classroom & Weekly Goal -->
        <div class="setting-group class-card-box">
          <label class="setting-label">Клас та нагорода тижня</label>
          <div class="class-selector-row">
            <div class="class-buttons" id="class-buttons-list">
              ${Object.keys(this.state.classes).map(a=>`
                <button class="class-tab-btn ${a===i?"active":""}" data-class="${a}">
                  ${a}
                </button>
              `).join("")}
            </div>
            <button class="action-btn-small" id="btn-add-class" title="Додати клас">
              ${Be()} Клас
            </button>
          </div>

          <div class="goal-reward-edit">
            <div class="goal-input-wrap">
              <span>Ціль тижня:</span>
              <input type="number" class="num-input" id="input-goal" min="5" max="100" value="${s.goal}">
              <span>зірок</span>
              <button class="chip-btn-gold" id="btn-add-star" title="Нарахувати 1 зірку зараз (S)">
                ${k(!0)} +1
              </button>
            </div>
            <div class="reward-input-wrap">
              <span>Нагорода:</span>
              <input type="text" class="text-input" id="input-reward" value="${s.reward}" placeholder="5 хв мультика / настільна гра">
            </div>
            <button class="action-btn-danger" id="btn-reset-week" title="Скинути зірки та розпочати новий тиждень">
              ${N()} Новий тиждень (скинути зірки)
            </button>
          </div>
        </div>

        <!-- Display Modes: Light Room & Fullscreen -->
        <div class="setting-group">
          <label class="checkbox-label">
            <input type="checkbox" id="check-light-room" ${e.lightRoom?"checked":""}>
            <span>Світла кімната (висока контрастність для проектора)</span>
          </label>
          <button class="action-btn secondary full-width" id="btn-fullscreen">
            ${H()} <span>Повноекранний режим (F)</span>
          </button>
        </div>

        <!-- Shortcuts Help -->
        <div class="panel-footer">
          <p class="privacy-text">${O()} <span>${b("privacyNote")}</span></p>
          <p class="hotkeys-text">${b("hotkeysHelp")}</p>
        </div>
      </div>
    `}bindEvents(){this.panel.querySelector("#btn-close-panel").addEventListener("click",()=>this.toggle(!1)),this.panel.querySelectorAll(".mode-card-btn").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll(".mode-card-btn").forEach(g=>g.classList.remove("active")),c.classList.add("active"),this.callbacks.onModeChange(c.dataset.mode)})}),this.panel.querySelector("#btn-toggle-mic").addEventListener("click",()=>this.callbacks.onMicToggle()),this.panel.querySelector("#btn-calibrate").addEventListener("click",()=>this.callbacks.onCalibrate());const e=this.panel.querySelector("#select-mic-device");e?.addEventListener("change",()=>{this.callbacks.onDeviceChange?.(e.value)}),this.panel.querySelectorAll(".profile-chip-btn").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll(".profile-chip-btn").forEach(g=>g.classList.remove("active")),c.classList.add("active"),this.callbacks.onProfileChange?.(c.dataset.profile)})});const i=this.panel.querySelector("#slider-gain"),s=this.panel.querySelector("#val-gain");i?.addEventListener("input",()=>{const c=parseFloat(i.value);s.textContent=`${c.toFixed(1)}×`,this.callbacks.onGainChange?.(c)});const a=this.panel.querySelector("#slider-sensitivity"),n=this.panel.querySelector("#val-sensitivity");a?.addEventListener("input",()=>{const c=parseInt(a.value,10);n.textContent=`${c>0?"+":""}${c} dB`,this.callbacks.onSensitivity(c)});const o=this.panel.querySelector("#slider-balls"),l=this.panel.querySelector("#val-balls");o?.addEventListener("input",()=>{const c=parseInt(o.value,10);l.textContent=c,this.callbacks.onBalls(c)});const r=this.panel.querySelector("#slider-volume"),d=this.panel.querySelector("#val-volume");r?.addEventListener("input",()=>{const c=parseFloat(r.value);d.textContent=`${Math.round(c*100)}%`,this.callbacks.onVolume(c)}),this.panel.querySelectorAll(".theme-card").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll(".theme-card").forEach(g=>g.classList.remove("active")),c.classList.add("active"),this.callbacks.onTheme(c.dataset.theme)})}),this.panel.querySelectorAll("#sound-control .segmented-tab").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll("#sound-control .segmented-tab").forEach(g=>g.classList.remove("active")),c.classList.add("active"),this.callbacks.onSound(c.dataset.sound)})}),this.panel.querySelectorAll(".chip-btn[data-min]").forEach(c=>{c.addEventListener("click",()=>{this.callbacks.onTimerStart(parseInt(c.dataset.min,10))})}),this.bindClassTabs(),this.panel.querySelector("#btn-add-class").addEventListener("click",()=>{const c=window.prompt("Введіть назву класу (наприклад: 5-В):");if(c&&c.trim()){const g=c.trim();this.callbacks.onAddClass&&(this.callbacks.onAddClass(g),this.refreshClassList())}}),this.panel.querySelector("#btn-reset-week").addEventListener("click",()=>{window.confirm("Скинути зірки та розпочати новий тиждень для цього класу?")&&this.callbacks.onResetWeek&&this.callbacks.onResetWeek()}),this.panel.querySelector("#btn-add-star").addEventListener("click",()=>{this.callbacks.onAddStar()});const h=this.panel.querySelector("#input-goal"),p=this.panel.querySelector("#input-reward"),f=()=>{this.callbacks.onGoalChange(parseInt(h.value,10)||20,p.value||"Нагорода")};h?.addEventListener("change",f),p?.addEventListener("change",f),this.panel.querySelector("#check-light-room")?.addEventListener("change",c=>{this.callbacks.onLightRoom(c.target.checked)}),this.panel.querySelector("#btn-fullscreen")?.addEventListener("click",()=>{this.callbacks.onFullscreen()})}bindClassTabs(){this.panel.querySelectorAll(".class-tab-btn").forEach(e=>{e.addEventListener("click",()=>{this.panel.querySelectorAll(".class-tab-btn").forEach(o=>o.classList.remove("active")),e.classList.add("active");const i=e.dataset.class;this.callbacks.onClassChange(i);const s=this.state.classes[i]||{goal:20,reward:"5 хв мультика"},a=this.panel.querySelector("#input-goal"),n=this.panel.querySelector("#input-reward");a&&(a.value=s.goal),n&&(n.value=s.reward)})})}refreshClassList(){const e=this.panel.querySelector("#class-buttons-list");if(!e)return;const i=this.state.activeClass;e.innerHTML=Object.keys(this.state.classes).map(o=>`
      <button class="class-tab-btn ${o===i?"active":""}" data-class="${o}">
        ${o}
      </button>
    `).join(""),this.bindClassTabs();const s=this.state.classes[i]||{goal:20,reward:"5 хв мультика"},a=this.panel.querySelector("#input-goal"),n=this.panel.querySelector("#input-reward");a&&(a.value=s.goal),n&&(n.value=s.reward)}toggle(e=null){const i=this.panel.classList.contains("closed"),s=e!==null?!e:!i;this.panel.classList.toggle("closed",s)}populateAudioDevices(e,i=""){const s=this.panel.querySelector("#select-mic-device");if(s){if(!e||e.length===0){s.innerHTML='<option value="">Автовизначення / За замовчуванням</option>';return}s.innerHTML=['<option value="">Авто / За замовчуванням</option>',...e.map((a,n)=>{const o=a.label||`Мікрофон ${n+1}`,l=a.deviceId===i;return`<option value="${a.deviceId}" ${l?"selected":""}>${o}</option>`})].join("")}}setGainValue(e){const i=this.panel.querySelector("#slider-gain"),s=this.panel.querySelector("#val-gain");i&&(i.value=e),s&&(s.textContent=`${Number(e).toFixed(1)}×`)}setProfileState(e){this.panel.querySelectorAll(".profile-chip-btn").forEach(i=>{i.classList.toggle("active",i.dataset.profile===e)})}updateMicLiveMeter(e,i,s,a,n){if(this.panel.classList.contains("closed"))return;const o=this.panel.querySelector("#mic-test-db"),l=this.panel.querySelector("#mic-vu-fill"),r=this.panel.querySelector("#hint-ambient"),d=this.panel.querySelector("#hint-status");if(o&&(o.textContent=`${Math.round(i)} dB`),r&&(r.textContent=`${Math.round(s)} dB`),l){const f=Math.max(0,Math.min(100,(i- -75)/60*100));l.style.width=`${f}%`,i>=n?(l.style.background="var(--zone-red)",d&&(d.innerHTML='<span style="color:var(--zone-red);font-weight:700">Галас у класі!</span>')):i>=a?(l.style.background="var(--zone-yellow)",d&&(d.innerHTML='<span style="color:var(--zone-yellow);font-weight:700">Шепіт / Робочий шум</span>')):(l.style.background="var(--zone-green)",d&&(d.innerHTML='<span style="color:var(--zone-green)">Спокійно</span>'))}}setMicButtonState(e){const i=this.panel.querySelector("#btn-toggle-mic");i&&(i.innerHTML=`${P(e)} <span>${e?"Вимк. мікрофон":"Увімк. мікрофон"}</span>`,i.classList.toggle("active",e))}setCalibrateButtonState(e){const i=this.panel.querySelector("#btn-calibrate");i&&(i.innerHTML=`${F()} <span>${e?"Калібруємо...":"Калібрувати (3с)"}</span>`,i.classList.toggle("active",e))}setModeState(e){this.panel.querySelectorAll(".mode-card-btn").forEach(i=>{i.classList.toggle("active",i.dataset.mode===e)})}}class ze{constructor(e){this.handlers=e,this.boundListener=this.onKeyDown.bind(this),window.addEventListener("keydown",this.boundListener)}onKeyDown(e){if(!["INPUT","SELECT","TEXTAREA"].includes(e.target?.tagName))switch(e.code){case"Space":e.preventDefault(),this.handlers.onSpace?.();break;case"KeyM":e.preventDefault(),this.handlers.onM?.();break;case"KeyC":e.preventDefault(),this.handlers.onC?.();break;case"KeyF":e.preventDefault(),this.handlers.onF?.();break;case"Digit1":this.handlers.onMode1?.();break;case"Digit2":this.handlers.onMode2?.();break;case"Digit3":this.handlers.onMode3?.();break;case"KeyT":this.handlers.onT?.();break;case"KeyS":this.handlers.onS?.();break;case"KeyH":this.handlers.onH?.();break}}destroy(){window.removeEventListener("keydown",this.boundListener)}}class Ve{constructor(e){this.overlay=document.createElement("div"),this.overlay.className="intro-overlay",this.overlay.innerHTML=`
      <div class="intro-card">
        <!-- Illustrative Critters Trio Preview -->
        <div class="intro-critter-stage">
          <svg viewBox="0 0 240 100" width="240" height="100" class="intro-trio-svg">
            <defs>
              <radialGradient id="inBuhl" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#96F2D7"/>
                <stop offset="40%" stop-color="#20C997"/>
                <stop offset="100%" stop-color="#0CA678"/>
              </radialGradient>
              <radialGradient id="inPukhan" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FFE8CC"/>
                <stop offset="40%" stop-color="#FF922B"/>
                <stop offset="100%" stop-color="#D9480F"/>
              </radialGradient>
              <radialGradient id="inZirka" cx="35%" cy="35%" r="65%">
                <stop offset="0%" stop-color="#FFF3BF"/>
                <stop offset="40%" stop-color="#FCC419"/>
                <stop offset="100%" stop-color="#D97706"/>
              </radialGradient>
            </defs>

            <!-- 1. Буль (Left, Aqua) -->
            <g transform="translate(45, 60)">
              <!-- Hair tuft -->
              <path d="M-6 -26 Q0 -42 2 -42 Q8 -34 6 -26 Z" fill="#0CA678"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="28" fill="url(#inBuhl)"/>
              <!-- Cheeks -->
              <circle cx="-14" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <circle cx="14" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <!-- Sleeping eyes -->
              <path d="M-13 -2 Q-9 4 -5 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M5 -2 Q9 4 13 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M-4 9 Q0 15 4 9" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
            </g>

            <!-- 2. Пухан (Center, Orange Monster) -->
            <g transform="translate(120, 52)">
              <!-- Little horns -->
              <circle cx="-16" cy="-28" r="7" fill="#FFA94D"/>
              <circle cx="16" cy="-28" r="7" fill="#FFA94D"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="34" fill="url(#inPukhan)"/>
              <!-- Cheeks -->
              <circle cx="-18" cy="5" r="6" fill="#FF6B6B" opacity="0.45"/>
              <circle cx="18" cy="5" r="6" fill="#FF6B6B" opacity="0.45"/>
              <!-- Eyes -->
              <path d="M-15 -3 Q-10 4 -5 -3" stroke="#111827" stroke-width="2.8" fill="none" stroke-linecap="round"/>
              <path d="M5 -3 Q10 4 15 -3" stroke="#111827" stroke-width="2.8" fill="none" stroke-linecap="round"/>
              <!-- Smile with tooth -->
              <path d="M-6 12 Q0 20 6 12" stroke="#111827" stroke-width="2.2" fill="none" stroke-linecap="round"/>
              <polygon points="2,14 6,14 4,18" fill="#FFFFFF"/>
            </g>

            <!-- 3. Зірка (Right, Yellow Firefly) -->
            <g transform="translate(195, 60)">
              <!-- Antenna & Light -->
              <path d="M0 -26 L0 -38" stroke="#D97706" stroke-width="2.5" stroke-linecap="round"/>
              <circle cx="0" cy="-42" r="7" fill="#FFD43B"/>
              <circle cx="0" cy="-42" r="11" fill="#FFE066" opacity="0.4"/>
              <!-- Body -->
              <circle cx="0" cy="0" r="28" fill="url(#inZirka)"/>
              <!-- Cheeks -->
              <circle cx="-13" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <circle cx="13" cy="4" r="5" fill="#FF8787" opacity="0.45"/>
              <!-- Eyes -->
              <path d="M-12 -2 Q-8 4 -4 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <path d="M4 -2 Q8 4 12 -2" stroke="#111827" stroke-width="2.5" fill="none" stroke-linecap="round"/>
              <!-- Smile -->
              <path d="M-4 9 Q0 15 4 9" stroke="#111827" stroke-width="2" fill="none" stroke-linecap="round"/>
            </g>
          </svg>
        </div>

        <h1 class="intro-title">${b("appTitle")}</h1>
        <p class="intro-subtitle">${b("appSubtitle")}</p>

        <button class="intro-start-btn" id="btn-start-game">
          ${j()} <span>${b("startBtn")}</span>
        </button>

        <div class="intro-hints">
          <div class="hint-item">
            ${F()} <span>Натисніть <b>C</b> або кнопку калібрування в тиші класу</span>
          </div>
          <div class="hint-item">
            ${H()} <span>Клавіша <b>F</b> — повноекранний режим для проектора та ТВ</span>
          </div>
          <div class="hint-item">
            ${k(!0)} <span>Клас збирає зірки в банку за кожні 30 секунд тиші</span>
          </div>
        </div>
      </div>
    `,document.body.appendChild(this.overlay),this.overlay.querySelector("#btn-start-game").addEventListener("click",()=>{this.hide(),e&&e()})}hide(){this.overlay.classList.add("fade-out"),setTimeout(()=>{this.overlay.remove()},450)}}class He{constructor(){this.canvas=document.getElementById("game-canvas"),this.state=B.load(),this.physics=new te,this.renderer=new Ce(this.canvas),this.mic=new X,this.mic.ambientBaselineDb=this.state.settings.ambientBaselineDb||-55,this.mic.deviceId=this.state.settings.micDeviceId||"",this.mic.profile=this.state.settings.micProfile||"webcam",this.mic.gainMultiplier=this.state.settings.micGain||2.2;const e=u.modes[this.state.settings.mode]||u.modes.quiet;this.session=new x({initialMode:e.id});const i=this.state.activeClass,s=this.state.classes[i]||{stars:0,goal:20};this.stars=new _({secondsPerStar:u.stars.secondsPerStar,goldenComboSeconds:u.stars.goldenComboSeconds,initialStars:s.stars,goal:s.goal}),this.zones=new K({enterYellowMs:u.zones.enterYellowMs,exitYellowMs:u.zones.exitYellowMs,enterRedMs:u.zones.enterRedMs,exitRedMs:u.zones.exitRedMs,hysteresisDb:u.zones.hysteresisDb}),this.hud=new Ge({onModeChange:a=>this.switchMode(a),onQuickCalibrate:()=>this.calibrateMic(),onPanelToggle:()=>this.panel.toggle(),onTimerToggle:()=>this.session.toggleTimer(),onResetWeek:()=>this.resetWeekStars()}),this.panel=new $e(this.state,this.getPanelCallbacks()),m.setVolume(this.state.settings.volume),this.renderer.setTheme(this.state.settings.theme),this.applyLightRoom(this.state.settings.lightRoom),this.lastFrameTime=performance.now(),this.lastAlertTime=0,this.isPaused=!1,this.cursorTimer=null,this.pointerTarget={x:null,y:null},this.displayedStars=s.stars,this.hasCelebratedGoal=s.stars>=s.goal,this.simulatedDb=null,this.checkDebugMode(),this.initPointers(),this.initResize(),this.initHotkeys(),this.initCursorHide(),new Ve(()=>{this.startLesson()}),requestAnimationFrame(this.loop.bind(this))}getPanelCallbacks(){return{onModeChange:e=>{this.switchMode(e)},onMicToggle:async()=>{const e=await this.mic.toggle();if(this.panel.setMicButtonState(e),e){const i=await this.mic.listDevices();this.panel.populateAudioDevices(i,this.mic.deviceId)}else this.mic.error&&this.hud.showMicBlockedHelp()},onCalibrate:()=>{this.calibrateMic()},onDeviceChange:async e=>{this.state.settings.micDeviceId=e,this.saveState(),await this.mic.switchDevice(e)},onProfileChange:e=>{this.state.settings.micProfile=e,this.mic.setProfile(e),this.state.settings.micGain=this.mic.gainMultiplier,this.panel.setGainValue(this.mic.gainMultiplier),this.saveState()},onGainChange:e=>{this.state.settings.micGain=e,this.mic.setGain(e),this.saveState()},onSensitivity:e=>{this.state.settings.sensitivity=e,this.saveState()},onBalls:e=>{this.state.settings.balls=e,this.physics.setBallCount(e),this.saveState()},onTheme:e=>{this.state.settings.theme=e,this.renderer.setTheme(e),this.saveState()},onSound:e=>{this.state.settings.alertSound=e,this.saveState()},onVolume:e=>{this.state.settings.volume=e,m.setVolume(e),this.saveState()},onLightRoom:e=>{this.applyLightRoom(e),this.saveState()},onFullscreen:()=>{this.toggleFullscreen()},onTimerStart:e=>{this.session.startTimer(e),this.panel.toggle(!1)},onClassChange:e=>{this.state.activeClass=e;const i=this.state.classes[e]||{stars:0,goal:20,reward:"5 хв мультика"};this.stars.stars=i.stars,this.stars.goal=i.goal,this.displayedStars=i.stars,this.hasCelebratedGoal=i.stars>=i.goal,this.saveState(),this.hud.updateStars(this.displayedStars,this.stars.goal,0,!1,i.reward)},onAddClass:e=>{this.state.classes[e]||(this.state.classes[e]={stars:0,goal:20,reward:"5 хв мультика",weekStart:new Date().toISOString().slice(0,10)}),this.state.activeClass=e,this.stars.stars=0,this.stars.goal=20,this.displayedStars=0,this.hasCelebratedGoal=!1,this.saveState(),this.hud.updateStars(0,20,0,!1,"5 хв мультика")},onResetWeek:()=>{this.resetWeekStars()},onAddStar:()=>{this.awardStarWithFlight()},onGoalChange:(e,i)=>{const s=this.state.classes[this.state.activeClass];s&&(s.goal=e,s.reward=i,this.stars.goal=e,this.hasCelebratedGoal=this.stars.stars>=e,this.saveState(),this.hud.updateStars(this.stars.stars,this.stars.goal,0,!1,i))}}}switchMode(e){this.session.setMode(e),this.state.settings.mode=e;const i=this.session.getModeConfig();this.hud.updateMode(i.id),this.panel.setModeState(i.id),this.saveState()}applyLightRoom(e){this.state.settings.lightRoom=!!e,document.body.classList.toggle("light-room",!!e),this.renderer.setLightRoom(!!e)}calibrateMic(){this.mic.startCalibration(u.calibrationMs),this.panel.setCalibrateButtonState(!0)}awardStarWithFlight(){this.stars.awardManualStar(),this.saveClassStars();const e=this.hud.getJarMouthCoords();this.renderer.particles.spawnFlyingStar(this.renderer.width*.5,this.renderer.height*.45,e.x,e.y,()=>{this.displayedStars=this.stars.stars,m.playChime(),this.hud.triggerJarBounce(),this.checkWeeklyGoal()})}resetWeekStars(){const e=this.state.classes[this.state.activeClass];e&&(e.stars=0,e.weekStart=new Date().toISOString().slice(0,10)),this.stars.resetAll(e?.goal||20),this.displayedStars=0,this.hasCelebratedGoal=!1,this.saveState(),this.hud.updateStars(0,this.stars.goal,0,!1,e?.reward||"Нагорода")}checkWeeklyGoal(){const e=this.state.classes[this.state.activeClass];this.stars.stars>=this.stars.goal&&!this.hasCelebratedGoal&&(this.hasCelebratedGoal=!0,m.playFanfare(),this.renderer.particles.spawnConfetti(this.renderer.width,this.renderer.height),this.hud.showGoalReachedModal(e?.reward||"5 хв мультика",()=>{this.resetWeekStars()}))}onResize(){const e=window.innerWidth,i=window.innerHeight;this.renderer.resize(e,i),this.physics.resize(e,i),this.physics.setBallCount(this.state.settings.balls)}async startLesson(){this.onResize();const e=await this.mic.start(this.state.settings.micDeviceId);if(this.panel.setMicButtonState(e),e){const i=await this.mic.listDevices();this.panel.populateAudioDevices(i,this.mic.deviceId),this.calibrateMic()}else this.hud.showMicBlockedHelp();this.requestWakeLock()}async requestWakeLock(){if("wakeLock"in navigator)try{await navigator.wakeLock.request("screen")}catch{}}toggleFullscreen(){document.fullscreenElement?document.exitFullscreen?.().catch(()=>{}):document.documentElement.requestFullscreen?.().catch(()=>{})}initResize(){this.onResizeHandler=()=>this.onResize(),window.addEventListener("resize",this.onResizeHandler),this.onResize()}initPointers(){const e=this.canvas,i=s=>{const a=e.getBoundingClientRect();return{x:s.clientX-a.left,y:s.clientY-a.top}};e.addEventListener("pointerdown",s=>{const{x:a,y:n}=i(s);this.pointerTarget={x:a,y:n};const o=this.physics.onPointerDown(s.pointerId,a,n);o&&this.renderer.theme==="bubbles"&&(m.playPop(),this.renderer.particles.spawnPop(o.x,o.y,o.radius),o.y=-o.radius,o.py=o.y)}),e.addEventListener("pointermove",s=>{const{x:a,y:n}=i(s);this.pointerTarget={x:a,y:n},this.physics.onPointerMove(s.pointerId,a,n)}),e.addEventListener("pointerup",s=>{this.physics.onPointerUp(s.pointerId)}),e.addEventListener("pointercancel",s=>{this.physics.onPointerUp(s.pointerId)})}initHotkeys(){new ze({onSpace:()=>{this.isPaused=!this.isPaused},onM:async()=>{const e=await this.mic.toggle();this.panel.setMicButtonState(e)},onC:()=>{this.calibrateMic()},onF:()=>{this.toggleFullscreen()},onMode1:()=>this.switchMode("quiet"),onMode2:()=>this.switchMode("groups"),onMode3:()=>this.switchMode("breaktime"),onT:()=>this.session.toggleTimer(),onS:()=>this.awardStarWithFlight(),onH:()=>this.panel.toggle()})}initCursorHide(){const e=()=>{document.body.classList.remove("hide-cursor"),clearTimeout(this.cursorTimer),this.cursorTimer=setTimeout(()=>{this.panel.panel.classList.contains("closed")&&document.body.classList.add("hide-cursor")},3500)};window.addEventListener("mousemove",e),window.addEventListener("pointerdown",e)}checkDebugMode(){if(new URLSearchParams(window.location.search).has("debug")){const i=document.createElement("div");i.className="debug-bar",i.innerHTML=`
        <span>${Le()} СИМУЛЯТОР ШУМУ:</span>
        <input type="range" id="sim-slider" min="-80" max="-10" step="1" value="-60">
        <span id="sim-val">-60 dB</span>
        <button id="sim-zero-btn">Тиша</button>
        <button id="sim-stir-btn">Шепіт</button>
        <button id="sim-shout-btn">Крик!</button>
        <span id="fps-counter" style="margin-left: auto;">FPS: 60</span>
      `,document.body.appendChild(i);const s=i.querySelector("#sim-slider"),a=i.querySelector("#sim-val"),n=i.querySelector("#sim-zero-btn"),o=i.querySelector("#sim-stir-btn"),l=i.querySelector("#sim-shout-btn");this.simulatedDb=-60,s.addEventListener("input",()=>{this.simulatedDb=parseFloat(s.value),a.textContent=`${this.simulatedDb} dB`}),n.addEventListener("click",()=>{s.value=-70,this.simulatedDb=-70,a.textContent="-70 dB"}),o.addEventListener("click",()=>{s.value=-42,this.simulatedDb=-42,a.textContent="-42 dB"}),l.addEventListener("click",()=>{s.value=-25,this.simulatedDb=-25,a.textContent="-25 dB"}),this.fpsEl=i.querySelector("#fps-counter"),this.frameCount=0,this.fpsTimer=performance.now()}}saveClassStars(){const e=this.state.classes[this.state.activeClass];e&&(e.stars=this.stars.stars,this.saveState())}saveState(){this.state.settings.ambientBaselineDb=this.mic.ambientBaselineDb,this.state.settings.micDeviceId=this.mic.deviceId,this.state.settings.micProfile=this.mic.profile,this.state.settings.micGain=this.mic.gainMultiplier,B.save(this.state)}loop(e){requestAnimationFrame(this.loop.bind(this));const i=Math.min(.1,(e-this.lastFrameTime)/1e3);if(this.lastFrameTime=e,this.fpsEl&&(this.frameCount++,e-this.fpsTimer>=1e3&&(this.fpsEl.textContent=`FPS: ${this.frameCount}`,this.frameCount=0,this.fpsTimer=e)),this.isPaused)return;const s=this.mic.sample(this.simulatedDb);this.panel.setCalibrateButtonState(s.isCalibrating);const a=this.session.getModeConfig(),n=J(s.db,s.ambientDb,a.yellowOffsetDb,a.redOffsetDb,this.state.settings.sensitivity);this.panel.updateMicLiveMeter(s.rawDb,s.db,s.ambientDb,n.yellowDb,n.redDb);const o=this.zones.update(s.db,n.yellowDb,n.redDb,i*1e3),l=o.zone;if(a.id==="breaktime"){if(n.progress>.25){const p=(n.progress-.2)*26;this.physics.bounceBalls(p)}}else(l==="yellow"||n.progress>=.6&&l!=="red")&&this.physics.stirBalls(n.progress),l==="red"&&(o.changed?(this.physics.scareBounce(1.5),this.hud.triggerScreenShake(),this.hud.triggerJarBounce()):this.physics.chaosAgitate(n.progress));l==="red"&&o.changed&&a.rewardsEnabled&&e-this.lastAlertTime>u.alertCooldownMs&&(this.lastAlertTime=e,this.hud.showAlert(),this.state.settings.alertSound==="shush"?m.playShush():this.state.settings.alertSound==="beep"&&m.playBeep());const r=this.stars.update(l,i,a.rewardsEnabled);if(r.starAwarded){const p=this.hud.getJarMouthCoords();this.renderer.particles.spawnFlyingStar(this.renderer.width*.5,this.renderer.height*.45,p.x,p.y,()=>{this.displayedStars=this.stars.stars,m.playChime(),this.hud.triggerJarBounce(),this.checkWeeklyGoal()}),this.saveClassStars()}const d=this.session.update(i,l);d.completed&&(m.playFanfare(),this.renderer.particles.spawnConfetti(this.renderer.width,this.renderer.height),d.cleanStreak&&a.rewardsEnabled&&this.awardStarWithFlight()),this.physics.update(i,l,r.isGolden),this.renderer.render(this.physics,l,r.isGolden,i,this.pointerTarget.x,this.pointerTarget.y);const h=this.state.classes[this.state.activeClass]||{reward:"5 хв мультика"};this.hud.updateNoiseMeter(l,n.progress,s.isCalibrating,s.calibrationProgress),this.hud.updateStars(this.displayedStars,this.stars.goal,r.progress,r.isGolden,h.reward),this.hud.updateTimer(d.remaining,d.running)}}window.addEventListener("DOMContentLoaded",()=>{new He});
