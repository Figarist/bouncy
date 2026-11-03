(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();const p={calibrationMs:3e3,calibrationPercentile:.25,minBaselineDb:-75,maxBaselineDb:-44,smoothing:{attack:.04,release:.35},sfxMicMuteMs:750,alertCooldownMs:1200,defaultAlertRepeatSec:4,modes:{quiet:{id:"quiet",name:"Тиха робота",icon:"quiet",yellowOffsetDb:4.5,redOffsetDb:9,rewardsEnabled:!0,physicsBounceOnVoice:!1},groups:{id:"groups",name:"Робота в групах",icon:"groups",yellowOffsetDb:8,redOffsetDb:15,rewardsEnabled:!0,physicsBounceOnVoice:!1},breaktime:{id:"breaktime",name:"Перерва / Класика",icon:"breaktime",yellowOffsetDb:12,redOffsetDb:20,rewardsEnabled:!1,physicsBounceOnVoice:!0}},zones:{enterYellowMs:120,exitYellowMs:600,enterRedMs:250,exitRedMs:1e3,hysteresisDb:2},micProfiles:{webcam:{id:"webcam",name:"Веб-камера (відстань 2-4м)",gain:2.2,highpassHz:120,presenceHz:2200,presenceGain:3.5},laptop:{id:"laptop",name:"Ноутбук / Вбудований",gain:1.5,highpassHz:100,presenceHz:2e3,presenceGain:2},close:{id:"close",name:"Близький / Гарнітура",gain:1,highpassHz:80,presenceHz:2e3,presenceGain:0}},stars:{secondsPerStar:30,goldenComboSeconds:120},balls:{min:10,max:150},physics:{hz:60,subSteps:3,gravity:.46,restitution:.82,friction:.993}};function K(e){if(!e||e.length===0)return-100;let i=0;for(let a=0;a<e.length;a++){const l=e[a];i+=l*l}const t=Math.sqrt(i/e.length),s=Math.max(t,1e-5);return 20*Math.log10(s)}function _(e,i,t,s=.04,a=.35){if(t<=0)return e;const l=i>e?s:a,o=1-Math.exp(-t/l);return e+(i-e)*o}function x(e,i=.25,t=-75,s=-44){if(!e||e.length===0)return-55;const a=[...e].sort((n,r)=>n-r),l=Math.min(a.length-1,Math.max(0,Math.floor(a.length*i))),o=a[l];return Math.max(t,Math.min(s,o))}function ee(e,i,t,s,a=0){const l=i+t-a,o=i+s-a;let n="green",r=0;if(e>=o)n="red",r=1+Math.min(.5,(e-o)/8);else if(e>=l){n="yellow";const d=Math.max(.5,o-l);r=.6+.4*((e-l)/d)}else{n="green";const d=i-10,h=Math.max(.5,l-d);r=Math.max(0,.6*((e-d)/h))}return{rawZone:n,progress:Math.min(1.5,Math.max(0,r)),yellowDb:l,redDb:o,currentDb:e}}class te{constructor(){this.ctx=null,this.compressor=null,this.masterGain=null,this.volume=.85,this.lastSfxEndTime=0}init(i){this.ctx||(this.ctx=i||new(window.AudioContext||window.webkitAudioContext),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-16,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(6,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGain=this.ctx.createGain(),this.masterGain.gain.setValueAtTime(this.volume*1.75,this.ctx.currentTime),this.compressor.connect(this.masterGain),this.masterGain.connect(this.ctx.destination))}setVolume(i){this.volume=Math.max(0,Math.min(1.5,i)),this.masterGain&&this.ctx&&this.masterGain.gain.setValueAtTime(this.volume*1.75,this.ctx.currentTime)}ensureContext(){this.ctx||this.init(),this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}get outputNode(){return this.compressor||this.masterGain}playAlert(i){if(!(!i||i==="none"))switch(i){case"beep":this.playBeep();break;case"bell":this.playBell();break;case"arcade":this.playArcade();break;case"shush":default:this.playShush();break}}isMutingMic(i=700){return this.ctx?performance.now()<this.lastSfxEndTime+i:!1}markSfxPlaying(i){this.lastSfxEndTime=performance.now()+i}playShush(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime,t=.85,s=this.ctx.createOscillator(),a=this.ctx.createGain();s.type="triangle",s.frequency.setValueAtTime(1760,i),s.frequency.exponentialRampToValueAtTime(880,i+.08),a.gain.setValueAtTime(.55,i),a.gain.exponentialRampToValueAtTime(.001,i+.09),s.connect(a),a.connect(this.outputNode),s.start(i),s.stop(i+.09);const l=Math.floor(this.ctx.sampleRate*t),o=this.ctx.createBuffer(1,l,this.ctx.sampleRate),n=o.getChannelData(0);for(let g=0;g<l;g++)n[g]=Math.random()*2-1;const r=this.ctx.createBufferSource();r.buffer=o;const d=this.ctx.createBiquadFilter();d.type="bandpass",d.frequency.setValueAtTime(3100,i),d.frequency.exponentialRampToValueAtTime(2300,i+t),d.Q.setValueAtTime(1.4,i);const h=this.ctx.createBiquadFilter();h.type="peaking",h.frequency.setValueAtTime(4800,i),h.gain.setValueAtTime(10,i);const u=this.ctx.createGain();u.gain.setValueAtTime(.01,i),u.gain.linearRampToValueAtTime(.95,i+.08),u.gain.setValueAtTime(.85,i+.38),u.gain.exponentialRampToValueAtTime(.001,i+t),r.connect(d),d.connect(h),h.connect(u),u.connect(this.outputNode),r.start(i+.02),r.stop(i+t),this.markSfxPlaying(t*1e3)}playBeep(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime;[{start:0,dur:.15,f1:880,f2:880},{start:.19,dur:.26,f1:1046.5,f2:783.99}].forEach(s=>{const a=this.ctx.createOscillator(),l=this.ctx.createOscillator(),o=this.ctx.createGain(),n=i+s.start;a.type="triangle",a.frequency.setValueAtTime(s.f1,n),a.frequency.exponentialRampToValueAtTime(s.f2,n+s.dur),l.type="sine",l.frequency.setValueAtTime(s.f1*2,n),l.frequency.exponentialRampToValueAtTime(s.f2*2,n+s.dur),o.gain.setValueAtTime(.001,n),o.gain.linearRampToValueAtTime(.75,n+.02),o.gain.exponentialRampToValueAtTime(.001,n+s.dur),a.connect(o),l.connect(o),o.connect(this.outputNode),a.start(n),a.stop(n+s.dur),l.start(n),l.stop(n+s.dur)}),this.markSfxPlaying(500)}playBell(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime,t=[0,.18],s=[{freq:1318.5,amp:.7,decay:.65},{freq:2637,amp:.45,decay:.45},{freq:3820,amp:.3,decay:.25}];t.forEach(a=>{const l=i+a;s.forEach(o=>{const n=this.ctx.createOscillator(),r=this.ctx.createGain();n.type="sine",n.frequency.setValueAtTime(o.freq,l),r.gain.setValueAtTime(.001,l),r.gain.linearRampToValueAtTime(o.amp,l+.008),r.gain.exponentialRampToValueAtTime(.001,l+o.decay),n.connect(r),r.connect(this.outputNode),n.start(l),n.stop(l+o.decay)})}),this.markSfxPlaying(850)}playArcade(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime,t=[987.77,783.99,659.25,523.25],s=.085;t.forEach((a,l)=>{const o=i+l*s,n=l===t.length-1?.24:s,r=this.ctx.createOscillator(),d=this.ctx.createGain();r.type="square",r.frequency.setValueAtTime(a,o);const h=this.ctx.createBiquadFilter();h.type="lowpass",h.frequency.setValueAtTime(3400,o),d.gain.setValueAtTime(.001,o),d.gain.linearRampToValueAtTime(.48,o+.01),d.gain.exponentialRampToValueAtTime(.001,o+n),r.connect(h),h.connect(d),d.connect(this.outputNode),r.start(o),r.stop(o+n)}),this.markSfxPlaying(600)}playPop(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.createOscillator(),t=this.ctx.createGain(),s=this.ctx.currentTime,a=.09;i.type="sine",i.frequency.setValueAtTime(850+Math.random()*300,s),i.frequency.exponentialRampToValueAtTime(140,s+a),t.gain.setValueAtTime(.45,s),t.gain.exponentialRampToValueAtTime(.001,s+a),i.connect(t),t.connect(this.outputNode),i.start(s),i.stop(s+a),this.markSfxPlaying(a*1e3)}playChime(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=[1046.5,1318.5,1567.98],t=this.ctx.currentTime,s=.85;i.forEach((a,l)=>{const o=this.ctx.createOscillator(),n=this.ctx.createGain(),r=t+l*.06;o.type="triangle",o.frequency.setValueAtTime(a,r),n.gain.setValueAtTime(.001,r),n.gain.linearRampToValueAtTime(.42,r+.02),n.gain.exponentialRampToValueAtTime(.001,r+s),o.connect(n),n.connect(this.outputNode),o.start(r),o.stop(r+s)}),this.markSfxPlaying(s*1e3+200)}playFanfare(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=[523.25,659.25,783.99,1046.5],t=this.ctx.currentTime;i.forEach((s,a)=>{const l=this.ctx.createOscillator(),o=this.ctx.createGain(),n=a===i.length-1,r=t+a*.16,d=n?1:.22;l.type=n?"triangle":"sine",l.frequency.setValueAtTime(s,r),o.gain.setValueAtTime(.001,r),o.gain.linearRampToValueAtTime(.55,r+.03),o.gain.exponentialRampToValueAtTime(.001,r+d),l.connect(o),o.connect(this.outputNode),l.start(r),l.stop(r+d)}),this.markSfxPlaying(1600)}}const y=new te;class ie{constructor(){this.audioContext=null,this.mediaStream=null,this.source=null,this.highpassFilter=null,this.presenceFilter=null,this.gainNode=null,this.analyser=null,this.timeData=null,this.isListening=!1,this.isCalibrating=!1,this.calibrationSamples=[],this.calibrationStart=0,this.calibrationDurationMs=p.calibrationMs,this.ambientBaselineDb=-55,this.smoothedDb=-80,this.lastUpdateTime=0,this.deviceId="",this.profile="webcam",this.gainMultiplier=p.micProfiles.webcam.gain,this.quietStreakMs=0,this.error=null}async listDevices(){if(!navigator.mediaDevices?.enumerateDevices)return[];try{return(await navigator.mediaDevices.enumerateDevices()).filter(t=>t.kind==="audioinput")}catch{return[]}}async start(i=null){this.error=null,i!==null&&(this.deviceId=i);try{this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext),y.init(this.audioContext)),this.audioContext.state==="suspended"&&await this.audioContext.resume(),this.mediaStream&&(this.mediaStream.getTracks().forEach(s=>s.stop()),this.mediaStream=null);const t={audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1},video:!1};this.deviceId&&(t.audio.deviceId={exact:this.deviceId});try{this.mediaStream=await navigator.mediaDevices.getUserMedia(t)}catch(s){if(this.deviceId)t.audio.deviceId=void 0,this.mediaStream=await navigator.mediaDevices.getUserMedia(t);else throw s}return this.setupAudioGraph(),this.isListening=!0,this.lastUpdateTime=performance.now(),!0}catch(t){return this.isListening=!1,this.error=t.name||"MicrophoneError",!1}}setupAudioGraph(){if(!this.audioContext||!this.mediaStream)return;try{this.source?.disconnect(),this.highpassFilter?.disconnect(),this.presenceFilter?.disconnect(),this.gainNode?.disconnect(),this.analyser?.disconnect()}catch{}const i=p.micProfiles[this.profile]||p.micProfiles.webcam;this.source=this.audioContext.createMediaStreamSource(this.mediaStream),this.highpassFilter=this.audioContext.createBiquadFilter(),this.highpassFilter.type="highpass",this.highpassFilter.frequency.setValueAtTime(i.highpassHz||120,this.audioContext.currentTime),this.highpassFilter.Q.setValueAtTime(.7,this.audioContext.currentTime),this.presenceFilter=this.audioContext.createBiquadFilter(),this.presenceFilter.type="peaking",this.presenceFilter.frequency.setValueAtTime(i.presenceHz||2200,this.audioContext.currentTime),this.presenceFilter.gain.setValueAtTime(i.presenceGain??3.5,this.audioContext.currentTime),this.presenceFilter.Q.setValueAtTime(1,this.audioContext.currentTime),this.gainNode=this.audioContext.createGain();const t=Math.max(.2,Math.min(6,this.gainMultiplier));this.gainNode.gain.setValueAtTime(t,this.audioContext.currentTime),this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=1024,this.analyser.smoothingTimeConstant=.15,this.timeData=new Float32Array(this.analyser.fftSize),this.source.connect(this.highpassFilter),this.highpassFilter.connect(this.presenceFilter),this.presenceFilter.connect(this.gainNode),this.gainNode.connect(this.analyser)}setGain(i){this.gainMultiplier=Math.max(.4,Math.min(6,i)),this.gainNode&&this.audioContext&&this.gainNode.gain.setValueAtTime(this.gainMultiplier,this.audioContext.currentTime)}setProfile(i){if(!p.micProfiles[i])return;this.profile=i;const t=p.micProfiles[i];this.gainMultiplier=t.gain,this.audioContext&&(this.gainNode&&this.gainNode.gain.setValueAtTime(t.gain,this.audioContext.currentTime),this.highpassFilter&&this.highpassFilter.frequency.setValueAtTime(t.highpassHz,this.audioContext.currentTime),this.presenceFilter&&(this.presenceFilter.frequency.setValueAtTime(t.presenceHz,this.audioContext.currentTime),this.presenceFilter.gain.setValueAtTime(t.presenceGain,this.audioContext.currentTime)))}async switchDevice(i){return this.deviceId=i,this.isListening?this.start(i):!0}stop(){this.mediaStream&&(this.mediaStream.getTracks().forEach(i=>i.stop()),this.mediaStream=null),this.isListening=!1,this.isCalibrating=!1,this.smoothedDb=-80}toggle(){return this.isListening?(this.stop(),!1):this.start()}startCalibration(i=p.calibrationMs){this.isListening&&(this.isCalibrating=!0,this.calibrationSamples=[],this.calibrationDurationMs=i,this.calibrationStart=performance.now())}sample(i=null){const t=performance.now(),s=this.lastUpdateTime?(t-this.lastUpdateTime)/1e3:.016;this.lastUpdateTime=t;let a=-90;if(i!==null?a=i:this.isListening&&this.analyser&&this.timeData&&(y.isMutingMic(p.sfxMicMuteMs)?a=this.ambientBaselineDb-10:(this.analyser.getFloatTimeDomainData(this.timeData),a=K(this.timeData))),this.smoothedDb=_(this.smoothedDb,a,s,p.smoothing.attack,p.smoothing.release),!this.isCalibrating&&this.isListening&&i===null)if(a<this.ambientBaselineDb){if(this.quietStreakMs+=s*1e3,this.quietStreakMs>2500){const o=Math.max(p.minBaselineDb,a);this.ambientBaselineDb+=(o-this.ambientBaselineDb)*Math.min(1,.04*s)}}else this.quietStreakMs=0;let l=0;if(this.isCalibrating){this.calibrationSamples.push(a);const o=t-this.calibrationStart;l=Math.min(1,o/this.calibrationDurationMs),o>=this.calibrationDurationMs&&(this.isCalibrating=!1,this.ambientBaselineDb=x(this.calibrationSamples,p.calibrationPercentile,p.minBaselineDb,p.maxBaselineDb),this.ambientBaselineDb<-64&&this.gainMultiplier<=1.2&&this.profile==="webcam"&&this.setGain(2.2))}return{rawDb:a,db:this.smoothedDb,ambientDb:this.ambientBaselineDb,isCalibrating:this.isCalibrating,calibrationProgress:l}}}class se{constructor(i={}){this.enterYellowMs=i.enterYellowMs??300,this.exitYellowMs=i.exitYellowMs??1e3,this.enterRedMs=i.enterRedMs??700,this.exitRedMs=i.exitRedMs??1500,this.hysteresisDb=i.hysteresisDb??3,this.currentZone="green",this.pendingZone=null,this.pendingTimeMs=0}update(i,t,s,a){const l=this.currentZone;let o=this.currentZone;this.currentZone==="red"?i<s-this.hysteresisDb?o=i>=t?"yellow":"green":o="red":this.currentZone==="yellow"?i>=s?o="red":i<t-this.hysteresisDb?o="green":o="yellow":i>=s?o="red":i>=t?o="yellow":o="green";let n=!1;if(o===this.currentZone)this.pendingZone=null,this.pendingTimeMs=0;else{this.pendingZone!==o&&(this.pendingZone=o,this.pendingTimeMs=0),this.pendingTimeMs+=a;let r=300;o==="red"?r=this.enterRedMs:o==="yellow"&&this.currentZone==="green"?r=this.enterYellowMs:this.currentZone==="red"?r=this.exitRedMs:this.currentZone==="yellow"&&o==="green"&&(r=this.exitYellowMs),this.pendingTimeMs>=r&&(this.currentZone=o,this.pendingZone=null,this.pendingTimeMs=0,n=!0)}return{zone:this.currentZone,changed:n,previousZone:l}}reset(){this.currentZone="green",this.pendingZone=null,this.pendingTimeMs=0}}class ae{constructor(i={}){this.secondsPerStar=i.secondsPerStar??30,this.goldenComboSeconds=i.goldenComboSeconds??120,this.stars=i.initialStars??0,this.goal=i.goal??20,this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1}update(i,t,s=!0){let a=!1;const l=this.isGoldenCombo;return s?(i==="green"?(this.currentStarProgressSeconds+=t,this.continuousGreenSeconds+=t,this.currentStarProgressSeconds>=this.secondsPerStar&&(this.stars+=1,this.currentStarProgressSeconds-=this.secondsPerStar,a=!0),this.continuousGreenSeconds>=this.goldenComboSeconds&&(this.isGoldenCombo=!0)):i==="yellow"||i==="red"&&(this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1),{starAwarded:a,goldenComboChanged:l!==this.isGoldenCombo,progress:Math.min(1,this.currentStarProgressSeconds/this.secondsPerStar),stars:this.stars,isGolden:this.isGoldenCombo,goalReached:this.stars>=this.goal}):{starAwarded:!1,goldenComboChanged:!1,progress:this.currentStarProgressSeconds/this.secondsPerStar,stars:this.stars}}awardManualStar(){return this.stars+=1,{stars:this.stars,goalReached:this.stars>=this.goal}}resetProgress(){this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1}resetAll(i=this.goal){this.stars=0,this.goal=i,this.resetProgress()}}class le{constructor(i={}){this.mode=i.initialMode||"quiet",this.timerTotalSeconds=0,this.timerRemainingSeconds=0,this.timerRunning=!1,this.timerHadRedZone=!1}setMode(i){return p.modes[i]&&(this.mode=i),this.getModeConfig()}getModeConfig(){return p.modes[this.mode]||p.modes.quiet}startTimer(i){this.timerTotalSeconds=Math.max(1,i)*60,this.timerRemainingSeconds=this.timerTotalSeconds,this.timerRunning=!0,this.timerHadRedZone=!1}stopTimer(){this.timerRunning=!1}toggleTimer(){this.timerRemainingSeconds>0&&(this.timerRunning=!this.timerRunning)}update(i,t){if(!this.timerRunning||this.timerRemainingSeconds<=0)return{running:!1,remaining:this.timerRemainingSeconds,completed:!1,cleanStreak:!this.timerHadRedZone};t==="red"&&(this.timerHadRedZone=!0),this.timerRemainingSeconds-=i;let s=!1;return this.timerRemainingSeconds<=0&&(this.timerRemainingSeconds=0,this.timerRunning=!1,s=!0),{running:this.timerRunning,remaining:this.timerRemainingSeconds,completed:s,cleanStreak:!this.timerHadRedZone}}}const A="tyhyi-klas:v1";function k(e={}){return{stars:0,goal:20,reward:"5 хв мультика",totalStars:0,tasksCompleted:0,cleanTasks:0,goalsReached:0,quietSeconds:0,...e}}const F={activeClass:"4-Б",classes:{"4-Б":k({stars:0,goal:20,reward:"5 хв мультика"}),"3-А":k({stars:0,goal:20,reward:"Настільна гра"})},settings:{mode:"quiet",theme:"critters",sensitivity:0,balls:40,alertSound:"shush",alertRepeatSec:4,volume:.85,lightRoom:!1,lang:"uk",ambientBaselineDb:-55,micDeviceId:"",micProfile:"webcam",micGain:2.2}};class D{static load(){try{const i=localStorage.getItem(A);if(!i)return JSON.parse(JSON.stringify(F));const t=JSON.parse(i),s=t.classes&&Object.keys(t.classes).length>0?t.classes:F.classes,a={};for(const[o,n]of Object.entries(s))a[o]=k({...n,totalStars:Math.max(n?.totalStars||0,n?.stars||0)});return{activeClass:a[t.activeClass]?t.activeClass:Object.keys(a)[0]||"4-Б",classes:a,settings:{...F.settings,...t.settings||{}}}}catch{return JSON.parse(JSON.stringify(F))}}static save(i){try{localStorage.setItem(A,JSON.stringify(i))}catch{}}}const q=["star","heart","crown","moon"];class ne{constructor(i,t,s,a){this.x=i,this.y=t,this.px=i,this.py=t,this.radius=s,this.id=a,this.angle=(Math.random()-.5)*.15,this.angularVelocity=0,this.isDragged=!1,this.pointerId=null,this.scaleX=1,this.scaleY=1,this.squashVelocityX=0,this.squashVelocityY=0,this.mood="sleeping",this.blinkTimer=Math.random()*5+2,this.isBlinking=!1,this.breathePhase=Math.random()*Math.PI*2,this.dreamType=q[Math.floor(a/3)%q.length],this.dreamPhase=Math.random()*Math.PI*2,this.canPop=!1,this.popped=!1}applyForce(i,t){this.x+=i,this.y+=t}applyImpulse(i,t){this.px-=i,this.py-=t}triggerSquash(i,t,s){const a=Math.min(.45,Math.abs(s)*.04);this.scaleX=1+Math.abs(t)*a-Math.abs(i)*a,this.scaleY=1+Math.abs(i)*a-Math.abs(t)*a}updateAnimation(i,t,s){this.breathePhase+=i*2,this.dreamPhase+=i*1.6,t==="red"?this.mood="chaos":t==="yellow"?this.mood="stirring":s?this.mood="golden":this.mood="sleeping",this.blinkTimer-=i,this.blinkTimer<=0&&(this.isBlinking=!this.isBlinking,this.blinkTimer=this.isBlinking?.15:Math.random()*4+2.5);const a=12,l=-180*(this.scaleX-1)-a*this.squashVelocityX;this.squashVelocityX+=l*i,this.scaleX+=this.squashVelocityX*i;const o=-180*(this.scaleY-1)-a*this.squashVelocityY;this.squashVelocityY+=o*i,this.scaleY+=this.squashVelocityY*i;const r=-42*this.angle-8*this.angularVelocity;this.angularVelocity+=r*i,this.angle+=this.angularVelocity*i,this.angle=Math.max(-.45,Math.min(.45,this.angle))}}class oe{constructor(){this.width=1200,this.height=800,this.balls=[],this.pointers=new Map,this.cellSize=80,this.grid=new Map,this.accumulator=0,this.fixedDt=1/p.physics.hz}resize(i,t){this.width=Math.max(300,i),this.height=Math.max(300,t),this.cellSize=Math.max(60,Math.floor(Math.min(i,t)/10));for(const s of this.balls)s.x=Math.max(s.radius,Math.min(this.width-s.radius,s.x)),s.y=Math.max(s.radius,Math.min(this.height-s.radius,s.y))}setBallCount(i,t=null){const s=Math.max(p.balls.min,Math.min(p.balls.max,i)),a=t||Math.max(16,Math.min(48,Math.floor(Math.min(this.width,this.height)/(Math.sqrt(s)*2.8))));for(;this.balls.length<s;){const l=this.balls.length,o=a+Math.random()*(this.width-a*2),n=a+Math.random()*(this.height*.7),r=new ne(o,n,a,l);this.balls.push(r)}this.balls.length>s&&(this.balls.length=s);for(const l of this.balls)l.radius=a}bounceBalls(i){if(!(i<=0))for(const t of this.balls){const s=-i*(.95+Math.random()*.55),a=(Math.random()-.5)*i*.75;t.applyImpulse(a,s),t.angularVelocity+=(Math.random()-.5)*7,t.triggerSquash(0,1,Math.min(8,i*.35))}}voicePulse(i){const t=Math.max(0,i-.25);if(!(t<=0)){for(const s of this.balls)if(s.y>=this.height-s.radius*2.4&&Math.random()<.08){const a=(1.8+Math.random()*2.8)*t,l=(Math.random()-.5)*2.2*t;s.applyImpulse(l,-a),s.triggerSquash(0,1,a*.6)}}}stirBalls(i){const t=Math.min(1.5,Math.max(.35,i));for(const s of this.balls)if(s.y>=this.height-s.radius*4&&Math.random()<.28){const a=(5+Math.random()*8.5)*t,l=(Math.random()-.5)*6.5*t;s.applyImpulse(l,-a),s.angularVelocity+=(Math.random()-.5)*6*t,s.triggerSquash(0,1,a*.65)}}scareBounce(i=1){const t=Math.min(42,22*i);for(const s of this.balls){const a=-t*(.9+Math.random()*.55),l=(Math.random()-.5)*t*.9;s.applyImpulse(l,a),s.angularVelocity+=(Math.random()-.5)*14,s.triggerSquash(0,1,6)}}chaosAgitate(i=1){const t=Math.min(1.8,Math.max(.5,i));for(const s of this.balls)if(s.y>=this.height-s.radius*6&&Math.random()<.42){const a=(8.5+Math.random()*14.5)*t,l=(Math.random()-.5)*11*t;s.applyImpulse(l,-a),s.angularVelocity+=(Math.random()-.5)*9*t,s.triggerSquash(0,1,4)}}update(i,t="green",s=!1){for(this.accumulator+=Math.min(.1,i);this.accumulator>=this.fixedDt;)this.stepFixed(this.fixedDt),this.accumulator-=this.fixedDt;for(const a of this.balls)a.updateAnimation(i,t,s)}stepFixed(i){const{gravity:t,friction:s,restitution:a}=p.physics,l=p.physics.subSteps;for(let o=0;o<l;o++){for(const n of this.balls){if(n.isDragged&&n.pointerId!==null){const h=this.pointers.get(n.pointerId);if(h&&h.isDown){n.px=n.x,n.py=n.y,n.x=h.x,n.y=h.y;continue}else n.isDragged=!1,n.pointerId=null}const r=(n.x-n.px)*s,d=(n.y-n.py)*s+t;n.px=n.x,n.py=n.y,n.x+=r,n.y+=d,n.angularVelocity+=r/n.radius*1.8}for(const n of this.balls)if(!n.isDragged){if(n.y>this.height-n.radius){const r=n.y-n.py;n.y=this.height-n.radius,n.py=n.y+r*a,Math.abs(r)>1.5&&n.triggerSquash(0,1,r)}if(n.y<n.radius){const r=n.y-n.py;n.y=n.radius,n.py=n.y+r*a,Math.abs(r)>1.5&&n.triggerSquash(0,-1,r)}if(n.x<n.radius){const r=n.x-n.px;n.x=n.radius,n.px=n.x+r*a,Math.abs(r)>1.5&&n.triggerSquash(-1,0,r)}if(n.x>this.width-n.radius){const r=n.x-n.px;n.x=this.width-n.radius,n.px=n.x+r*a,Math.abs(r)>1.5&&n.triggerSquash(1,0,r)}}this.resolveBallCollisions()}}resolveBallCollisions(){this.grid.clear();for(let i=0;i<this.balls.length;i++){const t=this.balls[i],s=Math.floor(t.x/this.cellSize),a=Math.floor(t.y/this.cellSize),l=`${s},${a}`;this.grid.has(l)||this.grid.set(l,[]),this.grid.get(l).push(t)}for(const i of this.balls){const t=Math.floor(i.x/this.cellSize),s=Math.floor(i.y/this.cellSize);for(let a=-1;a<=1;a++)for(let l=-1;l<=1;l++){const o=`${t+a},${s+l}`,n=this.grid.get(o);if(n)for(const r of n){if(i.id>=r.id)continue;const d=r.x-i.x,h=r.y-i.y,u=i.radius+r.radius,g=d*d+h*h;if(g<u*u&&g>1e-4){const f=Math.sqrt(g),b=(u-f)*.5,c=d/f,m=h/f;i.isDragged||(i.x-=c*b,i.y-=m*b),r.isDragged||(r.x+=c*b,r.y+=m*b);const S=Math.abs(i.x-i.px-(r.x-r.px))+Math.abs(i.y-i.py-(r.y-r.py));S>3&&(i.triggerSquash(-c,-m,S*.35),r.triggerSquash(c,m,S*.35),i.angularVelocity+=(Math.random()-.5)*S*.45,r.angularVelocity+=(Math.random()-.5)*S*.45)}}}}}onPointerDown(i,t,s){this.pointers.set(i,{x:t,y:s,px:t,py:s,isDown:!0});for(let a=this.balls.length-1;a>=0;a--){const l=this.balls[a],o=t-l.x,n=s-l.y;if(o*o+n*n<=l.radius*l.radius)return l.isDragged=!0,l.pointerId=i,l}return null}onPointerMove(i,t,s){const a=this.pointers.get(i);a&&(a.px=a.x,a.py=a.y,a.x=t,a.y=s)}onPointerUp(i){const t=this.pointers.get(i);if(t){t.isDown=!1;const s=t.x-t.px,a=t.y-t.py;for(const l of this.balls)l.pointerId===i&&(l.isDragged=!1,l.pointerId=null,l.px=l.x-s*1.2,l.py=l.y-a*1.2);this.pointers.delete(i)}}}const R=["#EF4444","#F97316","#FBBF24","#22C55E","#3B82F6","#8B5CF6","#EC4899","#06B6D4","#E2E8F0","#475569"];function Z(e,i){const t=R[i.id%R.length],s=i.radius,a=e.createRadialGradient(-s*.35,-s*.35,s*.1,0,0,s);a.addColorStop(0,w(t,65)),a.addColorStop(.3,t),a.addColorStop(.85,w(t,-35)),a.addColorStop(1,w(t,-60)),e.fillStyle=a,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill();const l=e.createRadialGradient(s*.2,s*.35,s*.6,0,0,s);l.addColorStop(0,"rgba(255, 255, 255, 0)"),l.addColorStop(1,"rgba(255, 255, 255, 0.22)"),e.fillStyle=l,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.65)",e.beginPath(),e.ellipse(-s*.3,-s*.38,s*.3,s*.14,-Math.PI/4,0,Math.PI*2),e.fill()}function w(e,i){let t=parseInt(e.replace("#",""),16);if(isNaN(t))return e;let s=(t>>16)+i,a=(t>>8&255)+i,l=(t&255)+i;return s=Math.min(255,Math.max(0,s)),a=Math.min(255,Math.max(0,a)),l=Math.min(255,Math.max(0,l)),`#${((1<<24)+(s<<16)+(a<<8)+l).toString(16).slice(1)}`}function re(e,i){const t=i.radius,s=e.createRadialGradient(-t*.35,-t*.35,t*.1,0,0,t);s.addColorStop(0,"#FEF08A"),s.addColorStop(.35,"#FBBF24"),s.addColorStop(.85,"#D97706"),s.addColorStop(1,"#B45309"),e.fillStyle=s,e.beginPath(),e.arc(0,0,t,0,Math.PI*2),e.fill();const a=e.createRadialGradient(t*.2,t*.35,t*.6,0,0,t);a.addColorStop(0,"rgba(255, 255, 255, 0)"),a.addColorStop(1,"rgba(255, 255, 255, 0.2)"),e.fillStyle=a,e.beginPath(),e.arc(0,0,t,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.55)",e.beginPath(),e.ellipse(-t*.3,-t*.38,t*.25,t*.12,-Math.PI/4,0,Math.PI*2),e.fill(),e.save(),e.rotate(i.angle),e.fillStyle="rgba(244, 63, 94, 0.35)",e.beginPath(),e.arc(-t*.5,t*.16,t*.16,0,Math.PI*2),e.arc(t*.5,t*.16,t*.16,0,Math.PI*2),e.fill();const l=i.mood;l==="chaos"?(e.fillStyle="#FFFFFF",e.beginPath(),e.arc(-t*.35,-t*.15,t*.26,0,Math.PI*2),e.arc(t*.35,-t*.15,t*.26,0,Math.PI*2),e.fill(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.35,-t*.15,t*.1,0,Math.PI*2),e.arc(t*.35,-t*.15,t*.1,0,Math.PI*2),e.fill(),e.fillStyle="#18181B",e.beginPath(),e.ellipse(0,t*.38,t*.24,t*.32,0,0,Math.PI*2),e.fill(),e.fillStyle="#F43F5E",e.beginPath(),e.ellipse(0,t*.52,t*.14,t*.1,0,0,Math.PI*2),e.fill()):l==="stirring"?(e.fillStyle="#18181B",e.beginPath(),e.arc(-t*.35,-t*.15,t*.16,0,Math.PI*2),e.fill(),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(-t*.38,-t*.18,t*.05,0,Math.PI*2),e.fill(),e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.08),e.lineCap="round",e.beginPath(),e.moveTo(t*.2,-t*.15),e.lineTo(t*.48,-t*.15),e.stroke(),e.beginPath(),e.moveTo(-t*.2,t*.32),e.quadraticCurveTo(0,t*.22,t*.25,t*.32),e.stroke()):(e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.09),e.lineCap="round",e.beginPath(),e.arc(-t*.35,-t*.12,t*.18,Math.PI*1.1,Math.PI*1.9),e.stroke(),e.beginPath(),e.arc(t*.35,-t*.12,t*.18,Math.PI*1.1,Math.PI*1.9),e.stroke(),e.beginPath(),e.arc(0,t*.12,t*.3,.2*Math.PI,.8*Math.PI),e.stroke()),e.restore()}function he(e,i){Z(e,i);const t=i.id%10+1,s=i.radius;e.save(),e.rotate(i.angle),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(0,0,s*.58,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(0, 0, 0, 0.12)",e.lineWidth=Math.max(1,s*.04),e.stroke(),e.fillStyle="#1E293B",e.font=`800 ${Math.round(s*.65)}px Rubik, Nunito, sans-serif`,e.textAlign="center",e.textBaseline="middle",e.fillText(String(t),0,s*.04),e.restore()}function de(e,i){const t=i.radius,s=i.breathePhase*1.8;e.save(),e.beginPath();const a=24;for(let o=0;o<=a;o++){const n=o/a*Math.PI*2,r=Math.sin(s+n*3)*(t*.03)+Math.cos(s*1.2+n*2)*(t*.02),d=t+r,h=Math.cos(n)*d,u=Math.sin(n)*d;o===0?e.moveTo(h,u):e.lineTo(h,u)}e.closePath();const l=e.createRadialGradient(-t*.35,-t*.35,t*.15,0,0,t);l.addColorStop(0,"rgba(255, 255, 255, 0.55)"),l.addColorStop(.35,"rgba(186, 230, 253, 0.22)"),l.addColorStop(.65,"rgba(240, 171, 252, 0.25)"),l.addColorStop(.9,"rgba(110, 231, 183, 0.45)"),l.addColorStop(1,"rgba(96, 165, 250, 0.75)"),e.fillStyle=l,e.fill(),e.strokeStyle="rgba(255, 255, 255, 0.75)",e.lineWidth=Math.max(1.2,t*.045),e.stroke(),e.fillStyle="rgba(255, 255, 255, 0.85)",e.beginPath(),e.ellipse(-t*.32,-t*.38,t*.34,t*.15,-Math.PI/4,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.4)",e.beginPath(),e.ellipse(t*.38,t*.38,t*.16,t*.08,-Math.PI/4,0,Math.PI*2),e.fill(),e.restore()}const E=["#2563EB","#16A34A","#D97706","#9333EA","#0D9488","#4F46E5"];function ce(e,i,t=null,s=null){const a=i.radius,l=e.createRadialGradient(-a*.25,-a*.25,a*.2,0,0,a);l.addColorStop(0,"#FFFFFF"),l.addColorStop(.7,"#F1F5F9"),l.addColorStop(1,"#94A3B8"),e.fillStyle=l,e.beginPath(),e.arc(0,0,a,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(239, 68, 68, 0.22)",e.lineWidth=1,e.beginPath(),e.moveTo(a*.6,a*.25),e.lineTo(a*.85,a*.35),e.moveTo(-a*.65,-a*.15),e.lineTo(-a*.88,-a*.28),e.stroke();let o=0,n=0;if(t!==null&&s!==null){const u=t-i.x,g=s-i.y,f=Math.sqrt(u*u+g*g);if(f>.001){const b=a*.32;o=u/f*b,n=g/f*b}}const r=E[i.id%E.length],d=a*.46;e.fillStyle=r,e.beginPath(),e.arc(o,n,d,0,Math.PI*2),e.fill();const h=e.createRadialGradient(o,n,d*.3,o,n,d);h.addColorStop(0,"rgba(255, 255, 255, 0.25)"),h.addColorStop(1,"rgba(0, 0, 0, 0.35)"),e.fillStyle=h,e.beginPath(),e.arc(o,n,d,0,Math.PI*2),e.fill(),e.fillStyle="#0F172A",e.beginPath(),e.arc(o,n,d*.52,0,Math.PI*2),e.fill(),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(o-d*.28,n-d*.28,d*.24,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.6)",e.beginPath(),e.arc(o+d*.25,n+d*.25,d*.12,0,Math.PI*2),e.fill()}const L=[{name:"Буль",base:"#20C997",dark:"#0CA678",highlight:"#96F2D7",belly:"#C3FAE8",type:"water"},{name:"Пухан",base:"#FF922B",dark:"#D9480F",highlight:"#FFE8CC",belly:"#FFF4E6",type:"monster"},{name:"Зірка",base:"#FCC419",dark:"#D97706",highlight:"#FFF3BF",belly:"#FFF9DB",type:"firefly"},{name:"Шуршик",base:"#B197FC",dark:"#7048E8",highlight:"#E5DBFF",belly:"#F3F0FF",type:"cat"},{name:"Моргун",base:"#FF8787",dark:"#E03131",highlight:"#FFD8D8",belly:"#FFE3E3",type:"cyclops"},{name:"Ластик",base:"#69DB7C",dark:"#2B8A3E",highlight:"#D3F9D8",belly:"#EBFBEE",type:"frog"}];function ue(e,i){const t=L[i.id%L.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.035;e.save(),e.scale(l,l),e.save(),e.rotate(i.angle),pe(e,t,s,i),e.restore();const o=e.createRadialGradient(-s*.35,-s*.35,s*.12,0,0,s);o.addColorStop(0,t.highlight),o.addColorStop(.35,t.base),o.addColorStop(.85,t.dark),o.addColorStop(1,Me(t.dark,-25)),e.fillStyle=o,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill();const n=e.createRadialGradient(s*.25,s*.35,s*.6,0,0,s);n.addColorStop(0,"rgba(255, 255, 255, 0)"),n.addColorStop(.9,"rgba(255, 255, 255, 0.05)"),n.addColorStop(1,"rgba(255, 255, 255, 0.25)"),e.fillStyle=n,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill(),e.save(),e.rotate(i.angle),ge(e,t,s),e.fillStyle="rgba(255, 107, 107, 0.42)",e.beginPath(),e.arc(-s*.5,s*.16,s*.16,0,Math.PI*2),e.arc(s*.5,s*.16,s*.16,0,Math.PI*2),e.fill(),fe(e,t,s,i),e.restore(),e.fillStyle="rgba(255, 255, 255, 0.55)",e.beginPath(),e.ellipse(-s*.32,-s*.38,s*.25,s*.12,-Math.PI/4,0,Math.PI*2),e.fill(),a==="golden"&&i.id%3===0&&me(e,s,i),a==="golden"&&(e.strokeStyle="rgba(255, 216, 77, 0.7)",e.lineWidth=Math.max(2.5,s*.1),e.beginPath(),e.arc(0,0,s*1.12,0,Math.PI*2),e.stroke()),e.restore()}function pe(e,i,t,s){if(i.type==="cat")e.fillStyle=i.dark,e.beginPath(),e.moveTo(-t*.75,-t*.35),e.lineTo(-t*.6,-t*1.05),e.lineTo(-t*.2,-t*.75),e.closePath(),e.fill(),e.fillStyle="#FFA8A8",e.beginPath(),e.moveTo(-t*.68,-t*.42),e.lineTo(-t*.58,-t*.95),e.lineTo(-t*.3,-t*.72),e.closePath(),e.fill(),e.fillStyle=i.dark,e.beginPath(),e.moveTo(t*.2,-t*.75),e.lineTo(t*.6,-t*1.05),e.lineTo(t*.75,-t*.35),e.closePath(),e.fill(),e.fillStyle="#FFA8A8",e.beginPath(),e.moveTo(t*.3,-t*.72),e.lineTo(t*.58,-t*.95),e.lineTo(t*.68,-t*.42),e.closePath(),e.fill();else if(i.type==="monster")e.fillStyle="#FFA94D",e.beginPath(),e.arc(-t*.45,-t*.8,t*.2,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(t*.45,-t*.8,t*.2,0,Math.PI*2),e.fill(),e.fillStyle="#FFD43B",e.beginPath(),e.arc(-t*.48,-t*.92,t*.11,0,Math.PI*2),e.arc(t*.48,-t*.92,t*.11,0,Math.PI*2),e.fill();else if(i.type==="firefly"){const a=.8+.3*Math.sin(s.breathePhase*1.5);e.strokeStyle=i.dark,e.lineWidth=Math.max(2,t*.08),e.beginPath(),e.moveTo(0,-t*.85),e.quadraticCurveTo(t*.1,-t*1.15,0,-t*1.25),e.stroke(),e.fillStyle=`rgba(255, 238, 92, ${.4*a})`,e.beginPath(),e.arc(0,-t*1.35,t*.32*a,0,Math.PI*2),e.fill(),e.fillStyle="#FFF3BF",e.beginPath(),e.arc(0,-t*1.35,t*.18,0,Math.PI*2),e.fill()}else i.type==="water"?(e.fillStyle=i.dark,e.beginPath(),e.moveTo(-t*.2,-t*.85),e.quadraticCurveTo(0,-t*1.35,t*.05,-t*1.35),e.quadraticCurveTo(t*.22,-t*1.1,t*.2,-t*.85),e.closePath(),e.fill(),e.fillStyle="#E6FCF5",e.beginPath(),e.arc(-t*.04,-t*1.15,t*.06,0,Math.PI*2),e.fill()):i.type==="frog"&&(e.fillStyle=i.dark,e.beginPath(),e.arc(-t*.45,-t*.8,t*.28,0,Math.PI*2),e.arc(t*.45,-t*.8,t*.28,0,Math.PI*2),e.fill(),e.fillStyle="#EBFBEE",e.beginPath(),e.arc(-t*.45,-t*.8,t*.22,0,Math.PI*2),e.arc(t*.45,-t*.8,t*.22,0,Math.PI*2),e.fill(),e.fillStyle="#111827",e.beginPath(),e.ellipse(-t*.45,-t*.8,t*.12,t*.07,0,0,Math.PI*2),e.ellipse(t*.45,-t*.8,t*.12,t*.07,0,0,Math.PI*2),e.fill())}function ge(e,i,t,s){i.type==="cat"?(e.strokeStyle=i.dark,e.lineWidth=Math.max(2,t*.07),e.lineCap="round",e.beginPath(),e.moveTo(0,-t*.7),e.lineTo(0,-t*.42),e.moveTo(-t*.22,-t*.65),e.lineTo(-t*.14,-t*.42),e.moveTo(t*.22,-t*.65),e.lineTo(t*.14,-t*.42),e.stroke(),e.fillStyle=i.highlight,e.beginPath(),e.ellipse(-t*.35,t*.85,t*.16,t*.1,0,0,Math.PI*2),e.ellipse(t*.35,t*.85,t*.16,t*.1,0,0,Math.PI*2),e.fill()):i.type==="water"?(e.fillStyle="rgba(211, 249, 216, 0.55)",e.beginPath(),e.ellipse(0,t*.4,t*.45,t*.35,0,0,Math.PI*2),e.fill()):i.type==="frog"?(e.fillStyle="rgba(216, 245, 218, 0.6)",e.beginPath(),e.ellipse(0,t*.42,t*.5,t*.38,0,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(43, 138, 62, 0.35)",e.lineWidth=Math.max(1.5,t*.06),e.beginPath(),e.arc(0,t*.3,t*.35,.2*Math.PI,.8*Math.PI),e.arc(0,t*.48,t*.32,.2*Math.PI,.8*Math.PI),e.stroke()):i.type==="monster"&&(e.fillStyle="rgba(255, 244, 230, 0.6)",e.beginPath(),e.ellipse(0,t*.4,t*.42,t*.32,0,0,Math.PI*2),e.fill())}function fe(e,i,t,s){const a=s.mood;a==="chaos"?(i.type==="cyclops"?M(e,0,-t*.12,t*.42,1,!0):i.type!=="frog"&&(M(e,-t*.32,-t*.12,t*.26,1,!0),M(e,t*.32,-t*.12,t*.26,1,!0)),e.fillStyle="#18181B",e.beginPath(),e.ellipse(0,t*.42,t*.22,t*.32,0,0,Math.PI*2),e.fill(),e.fillStyle="#F43F5E",e.beginPath(),e.ellipse(0,t*.56,t*.14,t*.12,0,0,Math.PI*2),e.fill(),i.type==="monster"&&(e.fillStyle="#FFFFFF",e.beginPath(),e.moveTo(-t*.06,t*.22),e.lineTo(t*.06,t*.22),e.lineTo(0,t*.34),e.closePath(),e.fill())):a==="stirring"?i.type==="cyclops"?M(e,0,-t*.1,t*.38,.5,!1):i.type==="frog"?(e.fillStyle="#111827",e.beginPath(),e.arc(0,t*.28,t*.12,0,Math.PI*2),e.fill()):(M(e,-t*.32,-t*.12,t*.24,.85,!1),e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.08),e.lineCap="round",e.beginPath(),e.moveTo(t*.18,-t*.12),e.lineTo(t*.46,-t*.12),e.stroke(),e.fillStyle="#18181B",e.beginPath(),e.arc(0,t*.32,t*.1,0,Math.PI*2),e.fill()):(e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.08),e.lineCap="round",i.type==="cyclops"?s.isBlinking?(e.beginPath(),e.arc(0,-t*.05,t*.26,Math.PI*.15,Math.PI*.85),e.stroke()):M(e,0,-t*.06,t*.34,.3,!1):i.type!=="frog"&&(e.beginPath(),e.arc(-t*.32,-t*.08,t*.18,Math.PI*.15,Math.PI*.85),e.stroke(),e.beginPath(),e.arc(t*.32,-t*.08,t*.18,Math.PI*.15,Math.PI*.85),e.stroke()),e.beginPath(),e.arc(0,t*.2,t*.22,.2*Math.PI,.8*Math.PI),e.stroke(),i.type==="monster"&&(e.fillStyle="#FFFFFF",e.beginPath(),e.arc(t*.08,t*.25,t*.05,0,Math.PI),e.fill()))}function M(e,i,t,s,a=1,l=!1){e.save(),e.beginPath(),e.arc(i,t,s,0,Math.PI*2),e.clip(),e.fillStyle="#FFFFFF",e.fill();const o=s*(l?.45:.65);if(e.fillStyle=l?"#3B82F6":"#6366F1",e.beginPath(),e.arc(i,t,o,0,Math.PI*2),e.fill(),e.fillStyle="#111827",e.beginPath(),e.arc(i,t,o*(l?.35:.6),0,Math.PI*2),e.fill(),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(i-s*.25,t-s*.25,s*.22,0,Math.PI*2),e.fill(),a<1){const n=(1-a)*(s*2);e.fillStyle="#FA5252",e.beginPath(),e.rect(i-s,t-s,s*2,n),e.fill(),e.strokeStyle="#18181B",e.lineWidth=2,e.beginPath(),e.moveTo(i-s,t-s+n),e.lineTo(i+s,t-s+n),e.stroke()}e.restore(),e.strokeStyle="#18181B",e.lineWidth=Math.max(1.5,s*.08),e.beginPath(),e.arc(i,t,s,0,Math.PI*2),e.stroke()}function me(e,i,t){const s=Math.sin(t.dreamPhase)*(i*.08),a=i*.55,l=-i*1.35+s;e.save(),e.fillStyle="rgba(255, 255, 255, 0.75)",e.beginPath(),e.arc(i*.25,-i*.95+s*.5,i*.06,0,Math.PI*2),e.arc(i*.4,-i*1.1+s*.7,i*.09,0,Math.PI*2),e.fill();const o=i*.32;e.fillStyle="#FFFFFF",e.shadowColor="rgba(255, 212, 59, 0.5)",e.shadowBlur=8,e.beginPath(),e.arc(a-o*.5,l,o*.65,0,Math.PI*2),e.arc(a,l-o*.35,o*.8,0,Math.PI*2),e.arc(a+o*.5,l,o*.65,0,Math.PI*2),e.closePath(),e.fill(),e.shadowBlur=0;const n=t.dreamType||"star",r=l-o*.08;n==="heart"?(e.fillStyle="#FF6B6B",ye(e,a,r,o*.55)):n==="crown"?(e.fillStyle="#FCC419",ve(e,a,r,o*.55)):n==="moon"?(e.fillStyle="#FFD43B",Se(e,a,r,o*.55)):(e.fillStyle="#FCC419",be(e,a,r,o*.6)),e.restore()}function be(e,i,t,s){let a=Math.PI/2*3;const l=5,o=Math.PI/l;e.beginPath(),e.moveTo(i,t-s);for(let n=0;n<l;n++)e.lineTo(i+Math.cos(a)*s,t+Math.sin(a)*s),a+=o,e.lineTo(i+Math.cos(a)*(s*.42),t+Math.sin(a)*(s*.42)),a+=o;e.closePath(),e.fill()}function ye(e,i,t,s){e.beginPath(),e.moveTo(i,t+s*.45),e.bezierCurveTo(i-s,t-s*.4,i-s*.5,t-s,i,t-s*.3),e.bezierCurveTo(i+s*.5,t-s,i+s,t-s*.4,i,t+s*.45),e.fill()}function ve(e,i,t,s){e.beginPath(),e.moveTo(i-s*.7,t+s*.4),e.lineTo(i-s*.7,t-s*.4),e.lineTo(i-s*.3,t),e.lineTo(i,t-s*.5),e.lineTo(i+s*.3,t),e.lineTo(i+s*.7,t-s*.4),e.lineTo(i+s*.7,t+s*.4),e.closePath(),e.fill()}function Se(e,i,t,s){e.beginPath(),e.arc(i,t,s*.7,.4*Math.PI,1.6*Math.PI),e.quadraticCurveTo(i-s*.2,t,i,t+s*.7),e.fill()}function Me(e,i){let t=parseInt(e.replace("#",""),16);if(isNaN(t))return e;let s=(t>>16)+i,a=(t>>8&255)+i,l=(t&255)+i;return s=Math.min(255,Math.max(0,s)),a=Math.min(255,Math.max(0,a)),l=Math.min(255,Math.max(0,l)),`#${((1<<24)+(s<<16)+(a<<8)+l).toString(16).slice(1)}`}const G=[{name:"Earth",type:"earth",base:"#1D4ED8",glow:"#60A5FA"},{name:"Mars",type:"mars",base:"#B91C1C",glow:"#F87171"},{name:"Jupiter",type:"jupiter",base:"#C2410C",ring:!0,glow:"#FDBA74"},{name:"Sun",type:"sun",base:"#FBBF24",glow:!0},{name:"Moon",type:"moon",base:"#64748B",glow:"#94A3B8"},{name:"Neptune",type:"neptune",base:"#0369A1",glow:"#38BDF8"}];function ke(e,i){const t=G[i.id%G.length],s=i.radius;if(t.glow===!0){const a=e.createRadialGradient(0,0,s*.8,0,0,s*1.55);a.addColorStop(0,"rgba(251, 191, 36, 0.7)"),a.addColorStop(.5,"rgba(245, 158, 11, 0.3)"),a.addColorStop(1,"rgba(234, 88, 12, 0)"),e.fillStyle=a,e.beginPath(),e.arc(0,0,s*1.55,0,Math.PI*2),e.fill()}if(t.ring&&$(e,s,!0),e.save(),e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.clip(),e.fillStyle=t.base,e.fillRect(-s,-s,s*2,s*2),e.save(),e.rotate(i.angle),t.type==="earth"?Fe(e,s):t.type==="jupiter"?Ce(e,s):t.type==="mars"?Pe(e,s):t.type==="neptune"?we(e,s):t.type==="moon"?Te(e,s):t.type==="sun"&&Be(e,s),e.restore(),t.type!=="sun"){const a=e.createRadialGradient(-s*.45,-s*.45,s*.2,0,0,s*1.05);a.addColorStop(0,"rgba(255, 255, 255, 0.1)"),a.addColorStop(.45,"rgba(0, 0, 0, 0)"),a.addColorStop(.8,"rgba(5, 8, 22, 0.55)"),a.addColorStop(1,"rgba(3, 5, 15, 0.9)"),e.fillStyle=a,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill()}t.glow&&t.type!=="sun"&&(e.strokeStyle=t.glow,e.lineWidth=Math.max(1.5,s*.05),e.globalAlpha=.45,e.beginPath(),e.arc(0,0,s-.5,0,Math.PI*2),e.stroke(),e.globalAlpha=1),e.restore(),t.ring&&$(e,s,!1)}function $(e,i,t){e.save(),e.rotate(-Math.PI/7),e.beginPath(),t?e.rect(-i*2.2,-i*2.2,i*4.4,i*2.2):e.rect(-i*2.2,0,i*4.4,i*2.2),e.clip(),e.strokeStyle="rgba(234, 138, 70, 0.75)",e.lineWidth=Math.max(2,i*.22),e.beginPath(),e.ellipse(0,0,i*1.6,i*.45,0,0,Math.PI*2),e.stroke(),e.strokeStyle="rgba(254, 215, 170, 0.9)",e.lineWidth=Math.max(1,i*.08),e.beginPath(),e.ellipse(0,0,i*1.5,i*.42,0,0,Math.PI*2),e.stroke(),e.restore()}function Fe(e,i){e.fillStyle="#16A34A",e.beginPath(),e.ellipse(-i*.1,-i*.15,i*.4,i*.28,Math.PI/5,0,Math.PI*2),e.ellipse(-i*.55,i*.1,i*.25,i*.45,-Math.PI/8,0,Math.PI*2),e.ellipse(i*.45,i*.35,i*.2,i*.16,0,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.45)",e.beginPath(),e.ellipse(-i*.2,-i*.4,i*.5,i*.1,-Math.PI/12,0,Math.PI*2),e.ellipse(i*.2,i*.1,i*.45,i*.08,Math.PI/16,0,Math.PI*2),e.ellipse(-i*.3,i*.5,i*.4,i*.09,0,0,Math.PI*2),e.fill()}function Ce(e,i){const t=[{y:-.65,h:.18,color:"#9A3412"},{y:-.42,h:.22,color:"#EA580C"},{y:-.15,h:.16,color:"#7C2D12"},{y:.05,h:.24,color:"#C2410C"},{y:.35,h:.18,color:"#9A3412"},{y:.58,h:.2,color:"#7C2D12"}];for(const s of t)e.fillStyle=s.color,e.fillRect(-i,s.y*i,i*2,s.h*i);e.fillStyle="#B91C1C",e.beginPath(),e.ellipse(i*.3,i*.15,i*.24,i*.14,-Math.PI/16,0,Math.PI*2),e.fill(),e.strokeStyle="#FDBA74",e.lineWidth=Math.max(1,i*.04),e.beginPath(),e.ellipse(i*.3,i*.15,i*.16,i*.08,-Math.PI/16,0,Math.PI*2),e.stroke()}function Pe(e,i){e.fillStyle="#7F1D1D",e.beginPath(),e.arc(-i*.25,-i*.2,i*.25,0,Math.PI*2),e.arc(i*.3,i*.25,i*.22,0,Math.PI*2),e.arc(-i*.1,i*.35,i*.18,0,Math.PI*2),e.fill(),e.fillStyle="#FEF2F2",e.beginPath(),e.arc(0,-i*.88,i*.35,0,Math.PI*2),e.fill()}function we(e,i){e.fillStyle="#075985",e.fillRect(-i,-i*.25,i*2,i*.35),e.fillStyle="#082F49",e.beginPath(),e.ellipse(-i*.1,-i*.1,i*.3,i*.18,0,0,Math.PI*2),e.fill(),e.fillStyle="rgba(224, 242, 254, 0.6)",e.fillRect(-i*.7,i*.25,i*1.4,i*.06)}function Te(e,i){e.fillStyle="#475569",e.beginPath(),e.ellipse(-i*.3,-i*.25,i*.3,i*.25,Math.PI/4,0,Math.PI*2),e.ellipse(i*.25,i*.15,i*.35,i*.28,-Math.PI/6,0,Math.PI*2),e.ellipse(-i*.1,i*.45,i*.22,i*.18,0,0,Math.PI*2),e.fill(),e.fillStyle="#334155",e.beginPath(),e.arc(-i*.4,i*.2,i*.1,0,Math.PI*2),e.arc(i*.4,-i*.3,i*.12,0,Math.PI*2),e.fill()}function Be(e,i){const t=e.createRadialGradient(0,0,0,0,0,i);t.addColorStop(0,"#FEF08A"),t.addColorStop(.65,"#FBBF24"),t.addColorStop(1,"#EA580C"),e.fillStyle=t,e.fillRect(-i,-i,i*2,i*2),e.fillStyle="rgba(234, 88, 12, 0.35)",e.beginPath(),e.arc(-i*.25,i*.2,i*.3,0,Math.PI*2),e.arc(i*.3,-i*.15,i*.28,0,Math.PI*2),e.fill()}const V=[{name:"Кріпко",type:"creeper",base:"#40C057",dark:"#2B8A3E",light:"#8CE99A",pixelA:"#2F9E44",pixelB:"#69DB7C"},{name:"Стіві",type:"miner",base:"#E59966",dark:"#B86B3B",light:"#F5CBA7",hair:"#4A2C11",eyes:"#3BC9DB"},{name:"Ендер",type:"ender",base:"#1E1B2E",dark:"#0F0D18",light:"#3B3355",eyes:"#E599F7",pupil:"#AE3EC9"},{name:"Хрюша",type:"piggy",base:"#F783AC",dark:"#D6336C",light:"#FCC2D7",snout:"#FAA2C1"},{name:"Слаймик",type:"slime",base:"#74B816",dark:"#5C940D",light:"#A9E34B",core:"#2B8A3E"},{name:"Ред-ТНТ",type:"tnt",base:"#E03131",dark:"#A61E1E",light:"#FF8787",band:"#F8F9FA"}];function Ie(e,i){const t=V[i.id%V.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.03;e.save(),e.scale(l,l),e.rotate(i.angle);const o=s*1.78,n=o*.5,r=s*.26,d=t.type==="creeper"&&a==="chaos"&&Math.sin(i.breathePhase*12)>.2;e.fillStyle=d?"#FFFFFF":t.base,T(e,-n,-n,o,o,r),e.fill(),e.fillStyle=d?"#F8F9FA":t.light,e.beginPath(),e.roundRect(-n+2,-n+2,o-4,o*.22,[r*.8,r*.8,0,0]),e.fill(),e.fillStyle=d?"#DEE2E6":t.dark,e.beginPath(),e.roundRect(-n+2,n-o*.18,o-4,o*.16,[0,0,r*.8,r*.8]),e.fill();const h=o/8;if(t.type==="creeper"&&!d?(e.fillStyle=t.pixelA,e.fillRect(-n+h,-n+h,h,h),e.fillRect(n-h*2,-n+h*2,h,h),e.fillRect(-n+h,n-h*2,h,h),e.fillStyle=t.pixelB,e.fillRect(-n+h*2,-n+h,h,h),e.fillRect(n-h*2,n-h*2,h,h)):t.type==="miner"?(e.fillStyle=t.hair,e.beginPath(),e.roundRect(-n,-n,o,h*2.3,[r,r,0,0]),e.fill(),e.fillRect(-n,-n+h*2,h*1.1,h*1.5),e.fillRect(n-h*1.1,-n+h*2,h*1.1,h*1.5)):t.type==="slime"?(e.fillStyle=t.core,e.globalAlpha=.65,e.fillRect(-h*2.2,-h*2.2,h*4.4,h*4.4),e.globalAlpha=1):t.type==="tnt"&&(e.fillStyle=t.band,e.fillRect(-n+2,-h*1.2,o-4,h*2.4),e.strokeStyle="#343A40",e.lineWidth=Math.max(2,h*.45),e.beginPath(),e.moveTo(0,-n),e.lineTo(h*.6,-n-h*1.2),e.stroke(),(a==="chaos"||a==="stirring")&&(e.fillStyle="#FFD43B",e.beginPath(),e.arc(h*.6,-n-h*1.3,h*.55,0,Math.PI*2),e.fill())),Ae(e,t,h,a),e.strokeStyle=d?"#FFD43B":"#111827",e.lineWidth=Math.max(2,s*.08),T(e,-n,-n,o,o,r),e.stroke(),a==="golden"&&(e.strokeStyle="#3BC9DB",e.lineWidth=Math.max(2.5,s*.1),T(e,-n-4,-n-4,o+8,o+8,r+3),e.stroke(),i.id%2===0)){const u=Math.sin(i.dreamPhase)*(s*.1);e.fillStyle="#3BC9DB",e.strokeStyle="#0B7285",e.lineWidth=1.5,e.beginPath(),e.moveTo(0,-n-s*.55+u),e.lineTo(s*.22,-n-s*.33+u),e.lineTo(0,-n-s*.11+u),e.lineTo(-s*.22,-n-s*.33+u),e.closePath(),e.fill(),e.stroke()}e.restore()}function Ae(e,i,t,s,a){if(i.type==="creeper"){e.fillStyle="#111827",s==="sleeping"||s==="golden"?(e.fillRect(-t*2.5,-t*.8,t*1.6,t*.6),e.fillRect(t*.9,-t*.8,t*1.6,t*.6)):(e.fillRect(-t*2.6,-t*1.8,t*1.7,t*1.7),e.fillRect(t*.9,-t*1.8,t*1.7,t*1.7));const l=s==="chaos"?t*2.4:t*1.6;e.fillRect(-t*.9,t*.1,t*1.8,l),e.fillRect(-t*1.8,t*.9,t*.9,l),e.fillRect(t*.9,t*.9,t*.9,l);return}if(i.type==="ender"){if(s==="sleeping"||s==="golden")e.fillStyle=i.pupil,e.fillRect(-t*3,-t*.3,t*2,t*.5),e.fillRect(t*1,-t*.3,t*2,t*.5);else{e.fillStyle=i.eyes;const l=s==="chaos"?t*1.6:t*1;e.fillRect(-t*3.2,-t*.8,t*2.2,l),e.fillRect(t*1,-t*.8,t*2.2,l),e.fillStyle=i.pupil,e.fillRect(-t*2.5,-t*.8,t*.9,l),e.fillRect(t*1.6,-t*.8,t*.9,l)}s==="chaos"&&(e.fillStyle="#AE3EC9",e.fillRect(-t*1.4,t*1.2,t*2.8,t*1.6));return}if(s==="sleeping"||s==="golden")e.fillStyle="#18181B",e.fillRect(-t*2.6,-t*.4,t*1.6,t*.55),e.fillRect(t*1,-t*.4,t*1.6,t*.55);else{const l=s==="chaos"?t*1.6:t*1.2;e.fillStyle="#FFFFFF",e.fillRect(-t*2.8,-t*1.1,t*1.8,l),e.fillRect(t*1,-t*1.1,t*1.8,l),e.fillStyle=i.eyes||"#18181B";const o=s==="stirring"?t*.3:0;e.fillRect(-t*2.1+o,-t*1.1,t*.9,l),e.fillRect(t*1.2+o,-t*1.1,t*.9,l)}i.type==="piggy"?(e.fillStyle=i.snout,e.fillRect(-t*1.6,t*.3,t*3.2,t*1.9),e.fillStyle="#A61E4D",e.fillRect(-t*1.2,t*.8,t*.7,t*.9),e.fillRect(t*.5,t*.8,t*.7,t*.9)):s==="chaos"?(e.fillStyle="#18181B",e.fillRect(-t*1.3,t*.8,t*2.6,t*1.7)):(e.fillStyle="#4A2C11",e.fillRect(-t*1.1,t*1.1,t*2.2,t*.7))}function T(e,i,t,s,a,l){e.beginPath(),e.roundRect(i,t,s,a,l)}const z=[{name:"Нубік",type:"noob",skin:"#FFD43B",skinDark:"#F59F00",collar:"#1C7ED6"},{name:"Бейкон",type:"bacon",skin:"#F3D9FA",skinDark:"#CEB2D6",hair:"#8B4513",collar:"#3B5BDB"},{name:"Оббі-Квін",type:"queen",skin:"#FFDEEB",skinDark:"#FCC2D7",hair:"#F06595",collar:"#AE3EC9"},{name:"Будівельник",type:"builder",skin:"#FFE066",skinDark:"#F59F00",hat:"#FD7E14",collar:"#2B8A3E"},{name:"Кібер-Блокс",type:"cyber",skin:"#CED4DA",skinDark:"#868E96",visor:"#22B8CF",collar:"#212529"},{name:"Голд-Лорд",type:"gold",skin:"#212529",skinDark:"#0B0C0E",hood:"#FCC419",collar:"#E67700"}];function De(e,i){const t=z[i.id%z.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.032;e.save(),e.scale(l,l),e.rotate(i.angle);const o=s*1.72,n=s*1.78,r=o*.5,d=n*.5,h=s*.42;e.fillStyle=t.skinDark,e.strokeStyle="#111827",e.lineWidth=Math.max(1.8,s*.07),e.beginPath(),e.roundRect(-s*.36,-d-s*.2,s*.72,s*.25,[4,4,0,0]),e.fill(),e.stroke(),e.fillStyle=t.collar,e.beginPath(),e.roundRect(-r*.78,d-s*.14,o*.78,s*.26,[0,0,8,8]),e.fill(),e.stroke();const u=e.createLinearGradient(-r,-d,r,d);u.addColorStop(0,"#FFFFFF"),u.addColorStop(.18,t.skin),u.addColorStop(.85,t.skin),u.addColorStop(1,t.skinDark),e.fillStyle=u,e.beginPath(),e.roundRect(-r,-d,o,n,h),e.fill(),e.stroke(),e.fillStyle="rgba(255, 255, 255, 0.42)",e.beginPath(),e.roundRect(-r+s*.14,-d+s*.18,s*.18,n*.62,99),e.fill(),qe(e,t,s,r,d),Re(e,t,s,a),a==="golden"&&(e.strokeStyle="#FFD43B",e.lineWidth=Math.max(2.5,s*.1),e.beginPath(),e.roundRect(-r-4,-d-4,o+8,n+8,h+4),e.stroke()),e.restore()}function qe(e,i,t,s,a){e.strokeStyle="#111827",e.lineWidth=Math.max(1.8,t*.07),i.type==="bacon"?(e.fillStyle=i.hair,e.beginPath(),e.moveTo(-s-2,-a+t*.35),e.quadraticCurveTo(-s*.5,-a-t*.28,0,-a-t*.18),e.quadraticCurveTo(s*.6,-a-t*.28,s+2,-a+t*.35),e.lineTo(s-t*.15,-a+t*.08),e.lineTo(0,-a+t*.16),e.lineTo(-s+t*.15,-a+t*.08),e.closePath(),e.fill(),e.stroke()):i.type==="queen"?(e.fillStyle=i.hair,e.beginPath(),e.arc(-s-t*.08,-a*.35,t*.34,0,Math.PI*2),e.arc(s+t*.08,-a*.35,t*.34,0,Math.PI*2),e.fill(),e.stroke()):i.type==="builder"?(e.fillStyle=i.hat,e.beginPath(),e.arc(0,-a+t*.15,s*1.04,Math.PI,0),e.closePath(),e.fill(),e.stroke(),e.fillStyle="#F76707",e.beginPath(),e.roundRect(-s*1.15,-a+t*.08,s*2.3,t*.22,6),e.fill(),e.stroke()):i.type==="gold"&&(e.strokeStyle=i.hood,e.lineWidth=Math.max(3,t*.13),e.beginPath(),e.roundRect(-s+3,-a+3,s*2-6,a*2-6,t*.36),e.stroke())}function Re(e,i,t,s){const l=i.type==="gold"?"#FFD43B":"#111827";i.type==="cyber"?(e.fillStyle=s==="chaos"?"#FF6B6B":i.visor,e.strokeStyle="#111827",e.lineWidth=2,e.beginPath(),e.roundRect(-t*.58,-t*.28,t*1.16,t*.38,6),e.fill(),e.stroke()):s==="sleeping"||s==="golden"?(e.strokeStyle=l,e.lineWidth=Math.max(2.2,t*.085),e.lineCap="round",e.beginPath(),e.arc(-t*.3,-t*.08,t*.14,.15*Math.PI,.85*Math.PI),e.stroke(),e.beginPath(),e.arc(t*.3,-t*.08,t*.14,.15*Math.PI,.85*Math.PI),e.stroke()):s==="stirring"?(e.fillStyle=l,e.beginPath(),e.arc(-t*.3,-t*.06,t*.12,0,Math.PI*2),e.arc(t*.3,-t*.06,t*.15,0,Math.PI*2),e.fill(),e.strokeStyle=l,e.lineWidth=Math.max(2.2,t*.08),e.lineCap="round",e.beginPath(),e.moveTo(-t*.46,-t*.24),e.lineTo(-t*.14,-t*.2),e.moveTo(t*.14,-t*.32),e.quadraticCurveTo(t*.3,-t*.44,t*.48,-t*.26),e.stroke()):(e.fillStyle="#FFFFFF",e.strokeStyle=l,e.lineWidth=2,e.beginPath(),e.arc(-t*.32,-t*.1,t*.22,0,Math.PI*2),e.arc(t*.32,-t*.1,t*.22,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.32,-t*.1,t*.09,0,Math.PI*2),e.arc(t*.32,-t*.1,t*.09,0,Math.PI*2),e.fill()),e.strokeStyle=l,e.lineWidth=Math.max(2.4,t*.09),e.lineCap="round",s==="chaos"?(e.fillStyle="#111827",e.beginPath(),e.roundRect(-t*.32,t*.22,t*.64,t*.38,8),e.fill(),e.fillStyle="#FFFFFF",e.fillRect(-t*.26,t*.24,t*.52,t*.12)):s==="stirring"?(e.beginPath(),e.moveTo(-t*.25,t*.34),e.quadraticCurveTo(0,t*.22,t*.25,t*.36),e.stroke()):(e.beginPath(),e.moveTo(-t*.26,t*.28),e.quadraticCurveTo(t*.08,t*.46,t*.34,t*.18),e.stroke())}const H=[{name:"Спайкі",type:"cactus",base:"#51CF66",dark:"#2B8A3E",accent:"#FA5252"},{name:"Хамелеон",type:"hoodie",base:"#37B24D",dark:"#237032",skin:"#F59F00",accent:"#FFD43B"},{name:"Дрімун",type:"sand",base:"#9775FA",dark:"#5F3DC4",skin:"#FCC2D7",accent:"#FFD43B"},{name:"Ворон",type:"crow",base:"#364FC7",dark:"#182461",beak:"#FCC419"},{name:"Лучадор",type:"lucha",base:"#FD7E14",dark:"#C92A2A",accent:"#FFD43B"},{name:"Меха-Вольт",type:"mecha",base:"#E03131",dark:"#862E9C",accent:"#FFD43B"}];function Ee(e,i){const t=H[i.id%H.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.04;e.save(),e.scale(l,l),(a==="chaos"||a==="golden")&&(e.save(),e.rotate(i.breathePhase*(a==="chaos"?3:1)),e.strokeStyle=a==="chaos"?"#FF5C7A":"#FFD43B",e.lineWidth=Math.max(2.5,s*.12),e.setLineDash([s*.35,s*.2]),e.beginPath(),e.arc(0,0,s*1.14,0,Math.PI*2),e.stroke(),e.restore()),e.rotate(i.angle),Le(e,t,s);const o=e.createRadialGradient(-s*.3,-s*.3,s*.1,0,0,s);o.addColorStop(0,t.base),o.addColorStop(.75,t.base),o.addColorStop(1,t.dark),e.fillStyle=o,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill(),Ge(e,t,s,a),e.strokeStyle="#111827",e.lineWidth=Math.max(2.8,s*.11),e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.stroke(),e.fillStyle="rgba(255, 255, 255, 0.5)",e.beginPath(),e.ellipse(-s*.35,-s*.42,s*.22,s*.1,-Math.PI/4,0,Math.PI*2),e.fill(),e.restore()}function Le(e,i,t){if(e.strokeStyle="#111827",e.lineWidth=Math.max(2.2,t*.09),i.type==="cactus"){e.fillStyle=i.accent,e.beginPath(),e.arc(-t*.18,-t*1.05,t*.2,0,Math.PI*2),e.arc(t*.18,-t*1.05,t*.2,0,Math.PI*2),e.arc(0,-t*1.18,t*.22,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle=i.base;for(const s of[-1,1])e.beginPath(),e.moveTo(s*t*.92,-t*.2),e.lineTo(s*t*1.18,-t*.05),e.lineTo(s*t*.95,t*.1),e.closePath(),e.fill(),e.stroke()}else if(i.type==="hoodie")for(const s of[-1,1])e.fillStyle=i.accent,e.beginPath(),e.arc(s*t*.48,-t*.86,t*.25,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(s*t*.48,-t*.86,t*.08,0,Math.PI*2),e.fill()}function Ge(e,i,t,s){if(i.type==="cactus"){if(e.fillStyle="#18181B",s==="sleeping"||s==="golden")e.lineWidth=Math.max(2.5,t*.1),e.strokeStyle="#18181B",e.beginPath(),e.arc(-t*.32,-t*.1,t*.15,.1*Math.PI,.9*Math.PI),e.stroke(),e.beginPath(),e.arc(t*.32,-t*.1,t*.15,.1*Math.PI,.9*Math.PI),e.stroke();else{const l=s==="chaos"?t*.22:t*.16;e.beginPath(),e.arc(-t*.34,-t*.12,l,0,Math.PI*2),e.arc(t*.34,-t*.12,l,0,Math.PI*2),e.fill()}const a=s==="chaos"?t*.28:t*.16;e.beginPath(),e.arc(0,t*.28,a,0,Math.PI*2),e.fill();return}if(i.type==="hoodie"){e.fillStyle="#D97706",e.beginPath(),e.arc(0,t*.28,t*.56,0,Math.PI),e.fill(),e.strokeStyle="#111827",e.lineWidth=Math.max(2.5,t*.09),e.beginPath(),e.moveTo(-t*.65,t*.22),e.quadraticCurveTo(0,-t*.05,t*.65,t*.22),e.stroke(),e.fillStyle="#FFFFFF",e.beginPath(),s==="chaos"?e.arc(0,t*.45,t*.26,0,Math.PI*2):e.arc(0,t*.36,t*.32,0,Math.PI),e.fill(),e.stroke();return}if(i.type==="sand"){e.fillStyle=i.accent,$e(e,0,-t*.45,t*.28),e.strokeStyle="#111827",e.lineWidth=Math.max(2.4,t*.09),e.lineCap="round",s==="chaos"?(e.fillStyle="#FFFFFF",e.beginPath(),e.arc(-t*.3,t*.05,t*.2,0,Math.PI*2),e.arc(t*.3,t*.05,t*.2,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.3,t*.05,t*.08,0,Math.PI*2),e.arc(t*.3,t*.05,t*.08,0,Math.PI*2),e.fill()):(e.beginPath(),e.arc(-t*.3,t*.05,t*.16,.15*Math.PI,.85*Math.PI),e.stroke(),e.beginPath(),e.arc(t*.3,t*.05,t*.16,.15*Math.PI,.85*Math.PI),e.stroke()),(s==="sleeping"||s==="golden")&&(e.fillStyle="rgba(116, 192, 252, 0.75)",e.beginPath(),e.arc(t*.28,t*.35,t*.22,0,Math.PI*2),e.fill());return}if(i.type==="crow"){e.fillStyle=i.beak,e.strokeStyle="#111827",e.lineWidth=Math.max(2,t*.08),e.beginPath(),e.moveTo(-t*.38,t*.05),e.lineTo(t*.38,t*.05),e.lineTo(0,t*.58),e.closePath(),e.fill(),e.stroke(),e.fillStyle=s==="chaos"?"#FF6B6B":"#FFFFFF",e.beginPath(),e.arc(-t*.34,-t*.18,t*.18,0,Math.PI*2),e.arc(t*.34,-t*.18,t*.18,0,Math.PI*2),e.fill(),e.stroke();return}e.fillStyle=i.accent,e.strokeStyle="#111827",e.lineWidth=Math.max(2,t*.08),i.type==="mecha"?(e.beginPath(),e.moveTo(-t*.7,-t*.28),e.lineTo(0,-t*.06),e.lineTo(t*.7,-t*.28),e.lineTo(t*.52,t*.12),e.lineTo(0,-t*.02),e.lineTo(-t*.52,t*.12),e.closePath(),e.fill(),e.stroke()):(e.beginPath(),e.arc(-t*.34,-t*.1,t*.24,0,Math.PI*2),e.arc(t*.34,-t*.1,t*.24,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.34,-t*.1,s==="chaos"?t*.12:t*.07,0,Math.PI*2),e.arc(t*.34,-t*.1,s==="chaos"?t*.12:t*.07,0,Math.PI*2),e.fill()),e.fillStyle="#FFFFFF",e.beginPath(),s==="chaos"?e.roundRect(-t*.35,t*.22,t*.7,t*.34,6):e.roundRect(-t*.32,t*.28,t*.64,t*.2,5),e.fill(),e.stroke()}function $e(e,i,t,s){let a=Math.PI/2*3;const l=Math.PI/5;e.beginPath(),e.moveTo(i,t-s);for(let o=0;o<5;o++)e.lineTo(i+Math.cos(a)*s,t+Math.sin(a)*s),a+=l,e.lineTo(i+Math.cos(a)*(s*.45),t+Math.sin(a)*(s*.45)),a+=l;e.closePath(),e.fill(),e.strokeStyle="#111827",e.lineWidth=1.8,e.stroke()}class Ve{constructor(){this.particles=[],this.flyingStars=[]}spawnZzz(i,t){this.particles.push({type:"zzz",x:i+(Math.random()-.5)*16,y:t-8,vx:(Math.random()-.5)*8,vy:-16-Math.random()*14,size:14+Math.random()*6,alpha:.95,decay:.45+Math.random()*.2,letter:Math.random()>.35?"z":"Z"})}spawnSparkle(i,t,s="#FFD84D"){this.particles.push({type:"sparkle",x:i,y:t,vx:(Math.random()-.5)*45,vy:(Math.random()-.5)*45,size:3+Math.random()*4,alpha:1,decay:1.2,color:s})}spawnFlyingStar(i,t,s,a,l=null){const o=(i+s)*.5,n=Math.min(t,a)-Math.max(120,Math.abs(s-i)*.35);this.flyingStars.push({x0:i,y0:t,cx:o,cy:n,x1:s,y1:a,t:0,duration:.85,onArrive:l,spin:0,scale:1.4})}spawnPop(i,t,s){for(let l=0;l<12;l++){const o=Math.PI*2*l/12+(Math.random()-.5)*.3,n=40+Math.random()*80;this.particles.push({type:"droplet",x:i+Math.cos(o)*(s*.8),y:t+Math.sin(o)*(s*.8),vx:Math.cos(o)*n,vy:Math.sin(o)*n,size:2.5+Math.random()*3,alpha:.85,decay:1.8,color:"#74C0FC"})}}spawnConfetti(i,t){const s=["#FF6B6B","#4DABF7","#FFD43B","#69DB7C","#DA77F2","#FFA94D"];for(let a=0;a<110;a++)this.particles.push({type:"confetti",x:Math.random()*i,y:-10-Math.random()*60,vx:(Math.random()-.5)*90,vy:90+Math.random()*130,rotation:Math.random()*Math.PI*2,rotSpeed:(Math.random()-.5)*8,sizeW:9+Math.random()*6,sizeH:5+Math.random()*4,alpha:1,decay:.2,color:s[Math.floor(Math.random()*s.length)]})}update(i){for(let t=this.particles.length-1;t>=0;t--){const s=this.particles[t];s.x+=s.vx*i,s.y+=s.vy*i,s.alpha-=s.decay*i,s.type==="confetti"?(s.rotation+=s.rotSpeed*i,s.vx+=(Math.random()-.5)*40*i):s.type==="droplet"&&(s.vy+=120*i),s.alpha<=0&&this.particles.splice(t,1)}for(let t=this.flyingStars.length-1;t>=0;t--){const s=this.flyingStars[t];s.t+=i/s.duration,s.spin+=i*6;const a=Math.min(1,s.t),l=1-a,o=l*l*s.x0+2*l*a*s.cx+a*a*s.x1,n=l*l*s.y0+2*l*a*s.cy+a*a*s.y1;if(Math.random()<.75&&this.particles.push({type:"sparkle",x:o+(Math.random()-.5)*12,y:n+(Math.random()-.5)*12,vx:(Math.random()-.5)*15,vy:(Math.random()-.5)*15,size:2.5+Math.random()*3,alpha:.9,decay:2.2,color:Math.random()>.4?"#FFE066":"#FFF3BF"}),s.t>=1){for(let r=0;r<14;r++)this.spawnSparkle(s.x1,s.y1,"#FFD43B");s.onArrive&&s.onArrive(),this.flyingStars.splice(t,1)}}}render(i,t=!1){if(!(this.particles.length===0&&this.flyingStars.length===0)){i.save();for(const s of this.particles)i.globalAlpha=Math.max(0,s.alpha),s.type==="zzz"?(i.fillStyle=t?"#334155":"#C5D8F8",i.font=`800 ${s.size}px Rubik, Nunito, sans-serif`,i.textAlign="center",i.textBaseline="middle",i.fillText(s.letter,s.x,s.y)):s.type==="sparkle"||s.type==="droplet"?(i.fillStyle=s.color,i.beginPath(),i.arc(s.x,s.y,s.size,0,Math.PI*2),i.fill()):s.type==="confetti"&&(i.save(),i.translate(s.x,s.y),i.rotate(s.rotation),i.fillStyle=s.color,i.fillRect(-s.sizeW/2,-s.sizeH/2,s.sizeW,s.sizeH),i.restore());for(const s of this.flyingStars){const a=Math.min(1,s.t),l=1-a,o=l*l*s.x0+2*l*a*s.cx+a*a*s.x1,n=l*l*s.y0+2*l*a*s.cy+a*a*s.y1,r=16*(1.2+.4*Math.sin(a*Math.PI));i.save(),i.translate(o,n),i.rotate(s.spin),i.globalAlpha=.55,i.fillStyle="#FFE066",i.beginPath(),i.arc(0,0,r*1.5,0,Math.PI*2),i.fill(),i.globalAlpha=1,i.fillStyle="#FFD43B",i.strokeStyle="#F59F00",i.lineWidth=2,ze(i,0,0,5,r,r*.45),i.fill(),i.stroke(),i.restore()}i.restore()}}}function ze(e,i,t,s,a,l){let o=Math.PI/2*3,n=i,r=t;const d=Math.PI/s;e.beginPath(),e.moveTo(i,t-a);for(let h=0;h<s;h++)n=i+Math.cos(o)*a,r=t+Math.sin(o)*a,e.lineTo(n,r),o+=d,n=i+Math.cos(o)*l,r=t+Math.sin(o)*l,e.lineTo(n,r),o+=d;e.lineTo(i,t-a),e.closePath()}const He=new Set(["critters","emoji","craft","blox","brawl"]);class je{constructor(i){this.canvas=i,this.ctx=i.getContext("2d",{alpha:!1}),this.particles=new Ve,this.width=1200,this.height=800,this.dpr=Math.min(2,window.devicePixelRatio||1),this.theme="critters",this.isLightRoom=!1,this.bgStars=[],this.initBgStars(),this.zzzTimer=0}initBgStars(){this.bgStars=[];for(let i=0;i<48;i++)this.bgStars.push({x:Math.random(),y:Math.random(),size:Math.random()*2+1,phase:Math.random()*Math.PI*2,speed:Math.random()*2+1.2})}resize(i,t){this.width=i,this.height=t,this.dpr=Math.min(2,window.devicePixelRatio||1),this.canvas.width=Math.floor(i*this.dpr),this.canvas.height=Math.floor(t*this.dpr),this.canvas.style.width=`${i}px`,this.canvas.style.height=`${t}px`,this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0)}setTheme(i){this.theme=i}setLightRoom(i){this.isLightRoom=i}render(i,t,s,a,l=null,o=null){const n=this.ctx,r=this.width,d=this.height;if(this.isLightRoom){const h=n.createLinearGradient(0,0,0,d);h.addColorStop(0,"#F8FAFC"),h.addColorStop(.5,"#F1F5F9"),h.addColorStop(1,"#E2E8F0"),n.fillStyle=h,n.fillRect(0,0,r,d),n.fillStyle="rgba(148, 163, 184, 0.08)",n.fillRect(0,d-40,r,40)}else{const h=n.createLinearGradient(0,0,0,d);h.addColorStop(0,"#0F122B"),h.addColorStop(.7,"#191538"),h.addColorStop(1,"#25133E"),n.fillStyle=h,n.fillRect(0,0,r,d),n.fillStyle="#FFFFFF";for(const u of this.bgStars){u.phase+=a*u.speed;const g=.2+.35*Math.sin(u.phase);n.globalAlpha=Math.max(0,g),n.beginPath(),n.arc(u.x*r,u.y*d,u.size,0,Math.PI*2),n.fill()}n.globalAlpha=1}if(t==="green"&&He.has(this.theme)){if(this.zzzTimer+=a,this.zzzTimer>1.2&&i.balls.length>0){this.zzzTimer=0;const h=i.balls[Math.floor(Math.random()*i.balls.length)];h&&h.y>d*.35&&this.particles.spawnZzz(h.x,h.y-h.radius)}}else this.zzzTimer=0;for(const h of i.balls){const u=d-(h.y+h.radius);if(u<h.radius*2.8){const g=Math.max(0,1-u/(h.radius*2.8)),f=h.radius*(.8+.35*g),b=Math.max(2,h.radius*.24*g),c=(this.isLightRoom?.22:.42)*g;n.fillStyle=`rgba(0, 0, 0, ${c})`,n.beginPath(),n.ellipse(h.x,d-3,f,b,0,0,Math.PI*2),n.fill()}}for(const h of i.balls){switch(n.save(),n.translate(h.x,h.y),n.scale(h.scaleX,h.scaleY),this.theme){case"craft":Ie(n,h);break;case"blox":De(n,h);break;case"brawl":Ee(n,h);break;case"plastic":Z(n,h);break;case"emoji":re(n,h);break;case"numbers":he(n,h);break;case"bubbles":de(n,h);break;case"eyes":ce(n,h,l,o);break;case"space":ke(n,h);break;case"critters":default:ue(n,h);break}n.restore()}this.particles.update(a),this.particles.render(n,this.isLightRoom)}}const j={uk:{appTitle:"Тихий клас",appSubtitle:"Візуальний шумомір та таймер тиші для роботи в класі.",startBtn:"Почати урок",micOn:"Мікрофон увімкнено",micOff:"Мікрофон вимкнено",micAllowHelp:"Дозвольте доступ до мікрофона в адресному рядку браузера",calibrateBtn:"Калібрувати кімнату (3 с)",calibrating:"Вимірювання фону кімнати...",sensitivity:"Чутливість",micDevice:"Пристрій мікрофона",micProfile:"Профіль мікрофона",profileWebcam:"Вебкамера (відстань 2–4 м)",profileLaptop:"Ноутбук / Вбудований",profileClose:"Близький / Гарнітура",micGain:"Підсилення сигналу (Preamp Gain)",ballCount:"Кількість кульок",theme:"Тема оформлення",alertSound:"Звук сповіщення",soundShush:"Шурхіт «Тссс»",soundBeep:"М'який «Біп»",soundNone:"Без звуку",volume:"Гучність звуків",lightRoom:"Світла кімната (для проектора)",fullscreen:"Повноекранний режим (F)",classProfile:"Клас",goal:"Ціль тижня",reward:"Нагорода",starAwarded:"Зірка отримана",goldenCombo:"Серія тиші: 2+ хв",timerFinished:"Час вийшов",tooNoisy:"Занадто гучно!",quietPlease:"Тихіше, будь ласка!",shush:"Тсссс!",modeQuiet:"Тиха робота",modeGroups:"Робота в групах",modeBreak:"Перерва / Класика",privacyNote:"Звук обробляється локально в браузері без запису та передачі на сервер.",hotkeysHelp:"Клавіші: Space (пауза), M (мікрофон), C (калібрування), F (екран), 1/2/3 (режими), T (таймер), S (+зірка), H (панель)"},en:{appTitle:"Quiet Class",appSubtitle:"Visual classroom noise meter and task timer.",startBtn:"Start Lesson",micOn:"Microphone ON",micOff:"Microphone OFF",micAllowHelp:"Allow microphone access in the browser address bar",calibrateBtn:"Calibrate Room (3s)",calibrating:"Sampling ambient floor...",sensitivity:"Sensitivity",micDevice:"Microphone Device",micProfile:"Microphone Profile",profileWebcam:"Webcam (2-4m distance)",profileLaptop:"Laptop / Built-in",profileClose:"Close / Headset",micGain:"Preamp Gain Boost",ballCount:"Ball count",theme:"Theme",alertSound:"Alert sound",soundShush:"Shush sound",soundBeep:"Soft beep",soundNone:"No sound",volume:"Sound volume",lightRoom:"Light room (for projector)",fullscreen:"Fullscreen (F)",classProfile:"Class",goal:"Weekly goal",reward:"Reward",starAwarded:"Star earned",goldenCombo:"Quiet streak: 2+ min",timerFinished:"Timer complete",tooNoisy:"Too noisy!",quietPlease:"Quiet, please!",shush:"Shhhh!",modeQuiet:"Quiet Work",modeGroups:"Group Work",modeBreak:"Break / Classic",privacyNote:"Audio is processed locally in the browser and never stored or transmitted.",hotkeysHelp:"Keys: Space (pause), M (mic), C (calibrate), F (fullscreen), 1/2/3 (modes), T (timer), S (+star), H (panel)"}};let Ne="uk";function v(e){return j[Ne]?.[e]||j.uk[e]||e}function B(e=!0){return e?`<svg class="ui-icon icon-mic on" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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
    </svg>`}function P(){return`<svg class="ui-icon icon-calibrate" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
  </svg>`}function We(){return`<svg class="ui-icon icon-gear" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`}function Y(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>`}function Q(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>`}function N(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>`}function U(e=!0){return e?`<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="#FFD43B" stroke="#F59F00" stroke-width="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`:`<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`}function X(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`}function Oe(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`}function Ze(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>`}function I(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`}function J(){return`<svg class="ui-icon icon-lock" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`}function W(){return`<svg class="ui-icon icon-gift" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>`}function Ye(){return`<svg class="ui-icon icon-lab" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31L4.1 19.33A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.67L14 9.31V2"></path>
    <line x1="8.5" y1="2" x2="15.5" y2="2"></line>
    <line x1="14" y1="9.3" x2="10" y2="9.3"></line>
  </svg>`}function O(e=0,i=20){const t=Math.min(1,Math.max(0,e/Math.max(1,i))),s=22*t,a=33-s,l=[];return e>=1&&l.push('<circle cx="12" cy="31" r="1.5" fill="#FFFFFF"/>'),e>=2&&l.push('<polygon points="20,28 20.8,29.8 22.8,30.1 21.3,31.5 21.7,33.5 20,32.5 18.3,33.5 18.7,31.5 17.2,30.1 19.2,29.8" fill="#FFF3BF"/>'),e>=4&&l.push('<circle cx="25" cy="27" r="1.3" fill="#FFFFFF"/>'),e>=6&&l.push('<polygon points="14,23 14.7,24.5 16.5,24.8 15.2,26 15.6,27.7 14,26.8 12.4,27.7 12.8,26 11.5,24.8 13.3,24.5" fill="#FFE066"/>'),e>=8&&l.push('<circle cx="22" cy="21" r="1.6" fill="#FFFFFF"/>'),e>=12&&l.push('<polygon points="18,17 18.7,18.5 20.5,18.8 19.2,20 19.6,21.7 18,20.8 16.4,21.7 16.8,20 15.5,18.8 17.3,18.5" fill="#FFF9DB"/>'),e>=16&&l.push('<circle cx="13" cy="15" r="1.4" fill="#FFFFFF"/>'),e>=i&&l.push('<polygon points="22,13 22.7,14.5 24.5,14.8 23.2,16 23.6,17.7 22,16.8 20.4,17.7 20.8,16 19.5,14.8 21.3,14.5" fill="#FFFFFF"/>'),`<svg class="jar-glass-svg" viewBox="0 0 36 40" width="36" height="40">
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
      <rect x="4" y="9" width="28" height="28" fill="rgba(255, 255, 255, 0.08)"/>
      ${t>0?`<rect x="5" y="${a}" width="26" height="${s+4}" fill="url(#jarFillGrad)"/>
      <ellipse cx="18" cy="${a}" rx="12" ry="2.2" fill="#FFF3BF"/>`:""}
      ${l.join(`
      `)}
    </g>

    <!-- Glass Body Outline & Specular Highlight -->
    <path d="M9 10 H27 C29.5 10 31 12 31 15 V31 C31 34 29 36 26 36 H10 C7 36 5 34 5 31 V15 C5 12 6.5 10 9 10 Z"
      fill="url(#jarGlassGrad)" stroke="rgba(255, 255, 255, 0.75)" stroke-width="1.8"/>

    <!-- Left glass reflection sheen -->
    <path d="M8 14 V30" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.6"/>
  </svg>`}function Qe(e){switch(e){case"craft":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <rect x="6" y="6" width="28" height="28" rx="5" fill="#40C057" stroke="#111827" stroke-width="2"/>
        <rect x="8" y="8" width="24" height="5" rx="2" fill="#8CE99A"/>
        <rect x="11" y="13" width="6" height="6" fill="#111827"/>
        <rect x="23" y="13" width="6" height="6" fill="#111827"/>
        <rect x="16" y="19" width="8" height="6" fill="#111827"/>
        <rect x="13" y="23" width="4" height="6" fill="#111827"/>
        <rect x="23" y="23" width="4" height="6" fill="#111827"/>
      </svg>`;case"blox":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <rect x="14" y="4" width="12" height="4" rx="1.5" fill="#F59F00" stroke="#111827" stroke-width="1.8"/>
        <rect x="7" y="7" width="26" height="26" rx="8" fill="#FFD43B" stroke="#111827" stroke-width="2"/>
        <rect x="10" y="32" width="20" height="4" rx="2" fill="#1C7ED6" stroke="#111827" stroke-width="1.5"/>
        <circle cx="15" cy="18" r="2.2" fill="#111827"/>
        <circle cx="25" cy="18" r="2.2" fill="#111827"/>
        <path d="M14 25 Q21 29 27 22" stroke="#111827" stroke-width="2.2" fill="none" stroke-linecap="round"/>
      </svg>`;case"brawl":return`<svg viewBox="0 0 40 40" width="38" height="38">
        <circle cx="20" cy="6" r="4" fill="#FA5252" stroke="#111827" stroke-width="1.8"/>
        <circle cx="20" cy="22" r="14" fill="#51CF66" stroke="#111827" stroke-width="2.4"/>
        <circle cx="15" cy="19" r="2.8" fill="#18181B"/>
        <circle cx="25" cy="19" r="2.8" fill="#18181B"/>
        <circle cx="20" cy="26" r="3.2" fill="#18181B"/>
      </svg>`;case"critters":return`<svg viewBox="0 0 40 40" width="38" height="38">
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
      </svg>`;default:return""}}function Ue(){return`<svg class="ui-icon icon-camera" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`}function Xe(){return`<svg class="ui-icon icon-laptop" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2"></rect>
    <line x1="2" y1="20" x2="22" y2="20"></line>
  </svg>`}function Je(){return`<svg class="ui-icon icon-volume" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`}class Ke{constructor(i={},t={},s="4-Б"){this.callbacks=i,this.container=document.createElement("div"),this.container.className="hud-container",this.container.innerHTML=`
      <!-- Top Bar in TV Safe Area -->
      <div class="hud-top">
        <!-- Left: Noise Traffic Light + Liquid Glass Quick Class Switcher -->
        <div class="hud-left">
          <div class="traffic-light-meter liquid-glass-surface" id="traffic-light">
            <div class="traffic-dots">
              <div class="light-dot green active" title="Тиша (зелена зона)"></div>
              <div class="light-dot yellow" title="Шепіт (жовта зона)"></div>
              <div class="light-dot red" title="Шум (червона зона)"></div>
            </div>
            <div class="sound-meter-wrap" id="sound-meter-wrap">
              <div class="meter-threshold-tick yellow-tick" title="Поріг жовтої зони"></div>
              <div class="meter-threshold-tick red-tick" title="Поріг червоної зони"></div>
              <div class="db-bar" id="db-bar"></div>
            </div>
            <button class="hud-icon-btn" id="cal-quick-btn" title="${v("calibrateBtn")}">
              ${P()}
            </button>
          </div>

          <div class="hud-class-switcher liquid-glass-pillbar" id="hud-class-switcher" title="Швидкий вибір групи / потоку">
          </div>
        </div>

        <!-- Center: Interactive Liquid Glass Mode Switcher & Timer -->
        <div class="hud-center">
          <div class="mode-segmented-control liquid-glass-pillbar" id="hud-mode-control">
            <button class="hud-mode-tab liquid-glass-tab active" data-mode="quiet">
              <span>Тиха робота</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="groups">
              <span>Групи</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="breaktime">
              <span>Перерва</span>
            </button>
          </div>

          <div class="timer-display liquid-glass-surface hidden" id="timer-display">
            <span class="timer-digits" id="timer-digits">05:00</span>
            <button class="timer-btn" id="timer-toggle-btn">
              ${N()}
            </button>
          </div>
        </div>

        <!-- Right: Glass Star Jar & Settings Toggle -->
        <div class="hud-right">
          <div class="star-jar-widget liquid-glass-surface" id="star-jar-widget" title="Банка зірок">
            <div class="jar-ring-container">
              <svg class="star-progress-ring" viewBox="0 0 54 54">
                <circle class="ring-bg" cx="27" cy="27" r="23"></circle>
                <circle class="ring-fill" id="star-ring-fill" cx="27" cy="27" r="23"></circle>
              </svg>
              <div class="jar-icon-wrap" id="jar-svg-slot">
                ${O(0,20)}
              </div>
            </div>
            <div class="jar-text-info">
              <div class="star-count-badge" id="star-count">
                ${U(!0)} <span id="star-numbers">0/20</span>
              </div>
              <div class="jar-reward-label" id="jar-reward-label">5 хв мультика</div>
            </div>
          </div>

          <button class="panel-toggle-btn liquid-glass-surface" id="panel-toggle-btn" title="Налаштування (H)">
            ${We()}
          </button>
        </div>
      </div>

      <!-- Large Alert Banner -->
      <div class="alert-banner hidden" id="alert-banner">
        <h2 id="alert-text">${v("shush")}</h2>
      </div>

      <!-- Golden Combo Banner -->
      <div class="golden-banner hidden" id="golden-banner">
        <span>${v("goldenCombo")}</span>
      </div>

      <!-- Microphone Permission Blocked Help Toast -->
      <div class="mic-blocked-toast hidden" id="mic-blocked-toast">
        <div class="toast-content">
          <span class="toast-icon">${J()}</span>
          <div class="toast-text">
            <strong>Доступ до мікрофона заблоковано</strong>
            <p>Натисніть на значок замка в адресному рядку браузера та оберіть «Дозволити мікрофон».</p>
          </div>
        </div>
        <button class="toast-close-btn" id="toast-close-btn">${X()}</button>
      </div>

      <!-- Goal Achieved Modal -->
      <div class="goal-modal-overlay hidden" id="goal-modal">
        <div class="goal-modal-card">
          <h2>Ціль досягнуто!</h2>
          <p class="goal-modal-subtitle">Заслужена нагорода:</p>
          <div class="goal-modal-reward" id="goal-modal-reward">${W()} <span>5 хв мультика</span></div>
          <div class="goal-modal-actions">
            <button class="goal-action-btn primary" id="btn-goal-reset">
              ${I()} Нова ціль
            </button>
            <button class="goal-action-btn secondary" id="btn-goal-close">
              Закрити
            </button>
          </div>
        </div>
      </div>
    `,document.body.appendChild(this.container),this.dotGreen=this.container.querySelector(".light-dot.green"),this.dotYellow=this.container.querySelector(".light-dot.yellow"),this.dotRed=this.container.querySelector(".light-dot.red"),this.dbBar=this.container.querySelector("#db-bar"),this.classSwitcher=this.container.querySelector("#hud-class-switcher"),this.modeControl=this.container.querySelector("#hud-mode-control"),this.timerDisplay=this.container.querySelector("#timer-display"),this.timerDigits=this.container.querySelector("#timer-digits"),this.timerToggleBtn=this.container.querySelector("#timer-toggle-btn"),this.starRingFill=this.container.querySelector("#star-ring-fill"),this.starNumbers=this.container.querySelector("#star-numbers"),this.jarRewardLabel=this.container.querySelector("#jar-reward-label"),this.jarSvgSlot=this.container.querySelector("#jar-svg-slot"),this.jarWidget=this.container.querySelector("#star-jar-widget"),this.alertBanner=this.container.querySelector("#alert-banner"),this.alertText=this.container.querySelector("#alert-text"),this.goldenBanner=this.container.querySelector("#golden-banner"),this.micBlockedToast=this.container.querySelector("#mic-blocked-toast"),this.goalModal=this.container.querySelector("#goal-modal"),this.goalModalReward=this.container.querySelector("#goal-modal-reward"),this.alertTimer=null,this.alertPhrases=[v("shush"),v("quietPlease"),v("tooNoisy")],this.ringCircumference=2*Math.PI*23,this.starRingFill.style.strokeDasharray=`${this.ringCircumference} ${this.ringCircumference}`,this.starRingFill.style.strokeDashoffset=this.ringCircumference,this.renderClassSwitcher(t,s),this.bindEvents()}renderClassSwitcher(i={},t=""){if(!this.classSwitcher)return;const s=Object.keys(i);this.classSwitcher.innerHTML=s.map(a=>{const l=i[a],o=l?.tasksCompleted>0?`<span class="hud-class-stat" title="Виконано завдань">✓${l.tasksCompleted}</span>`:"";return`
        <button class="hud-class-tab liquid-glass-tab ${a===t?"active":""}" data-class="${a}">
          <span>${a}</span>${o}
        </button>
      `}).join(""),this.classSwitcher.querySelectorAll(".hud-class-tab").forEach(a=>{a.addEventListener("click",()=>{const l=a.dataset.class;this.callbacks.onClassChange?.(l)})})}bindEvents(){this.modeControl.querySelectorAll(".hud-mode-tab").forEach(s=>{s.addEventListener("click",()=>{const a=s.dataset.mode;this.updateMode(a),this.callbacks.onModeChange&&this.callbacks.onModeChange(a)})}),this.container.querySelector("#cal-quick-btn").addEventListener("click",()=>{this.callbacks.onQuickCalibrate&&this.callbacks.onQuickCalibrate()}),this.container.querySelector("#panel-toggle-btn").addEventListener("click",()=>{this.callbacks.onPanelToggle&&this.callbacks.onPanelToggle()}),this.timerToggleBtn.addEventListener("click",()=>{this.callbacks.onTimerToggle&&this.callbacks.onTimerToggle()}),this.container.querySelector("#toast-close-btn")?.addEventListener("click",()=>{this.micBlockedToast.classList.add("hidden")}),this.container.querySelector("#btn-goal-close")?.addEventListener("click",()=>{this.goalModal.classList.add("hidden")}),this.container.querySelector("#btn-goal-reset")?.addEventListener("click",()=>{this.goalModal.classList.add("hidden"),this.callbacks.onResetGoal&&this.callbacks.onResetGoal()})}updateNoiseMeter(i,t,s,a){if(this.dotGreen.classList.toggle("active",i==="green"),this.dotYellow.classList.toggle("active",i==="yellow"),this.dotRed.classList.toggle("active",i==="red"),s)this.dbBar.style.width=`${Math.round(a*100)}%`,this.dbBar.style.background="var(--zone-yellow)";else{const l=Math.min(100,Math.round(t/1.5*100));this.dbBar.style.width=`${l}%`,i==="red"?this.dbBar.style.background="var(--zone-red)":i==="yellow"?this.dbBar.style.background="var(--zone-yellow)":this.dbBar.style.background="var(--zone-green)"}}updateMode(i){this.modeControl.querySelectorAll(".hud-mode-tab").forEach(t=>{t.classList.toggle("active",t.dataset.mode===i)})}updateTimer(i,t){if(i<=0&&!t){this.timerDisplay.classList.add("hidden"),this.modeControl.classList.remove("hidden");return}this.timerDisplay.classList.remove("hidden"),this.modeControl.classList.add("hidden");const s=Math.floor(i/60),a=Math.floor(i%60);this.timerDigits.textContent=`${String(s).padStart(2,"0")}:${String(a).padStart(2,"0")}`,this.timerToggleBtn.innerHTML=t?N():Q()}updateStars(i,t,s,a,l=""){this.starNumbers.textContent=`${i}/${t}`,l&&(this.jarRewardLabel.textContent=l);const o=this.ringCircumference-s*this.ringCircumference;this.starRingFill.style.strokeDashoffset=o,this.jarSvgSlot.innerHTML=O(i,t),this.goldenBanner.classList.toggle("hidden",!a)}triggerJarBounce(){this.jarWidget.classList.remove("jar-pop"),this.jarWidget.offsetWidth,this.jarWidget.classList.add("jar-pop")}triggerScreenShake(){document.body.classList.remove("screen-shake"),document.body.offsetWidth,document.body.classList.add("screen-shake"),setTimeout(()=>{document.body.classList.remove("screen-shake")},450)}showAlert(i=null){clearTimeout(this.alertTimer);const t=i||this.alertPhrases[Math.floor(Math.random()*this.alertPhrases.length)];this.alertText.textContent=t,this.alertBanner.classList.remove("hidden"),this.alertBanner.classList.remove("pop-out"),this.alertBanner.classList.add("pop-in"),this.alertTimer=setTimeout(()=>{this.alertBanner.classList.remove("pop-in"),this.alertBanner.classList.add("pop-out"),setTimeout(()=>{this.alertBanner.classList.add("hidden")},350)},2200)}showGoalReachedModal(i,t=null){t&&(this.callbacks.onResetGoal=t),this.goalModalReward.innerHTML=`${W()} <span>${i||"Нагорода"}</span>`,this.goalModal.classList.remove("hidden")}showMicBlockedHelp(){this.micBlockedToast.classList.remove("hidden")}getJarMouthCoords(){const i=this.jarWidget.getBoundingClientRect();return{x:i.left+i.width*.35,y:i.top+i.height*.45}}}const _e=[{id:"craft",title:"Крафт-Куби",sub:"Піксель-світ"},{id:"blox",title:"Блокс-Герої",sub:"Оббі-аватари"},{id:"brawl",title:"Бійці Арени",sub:"Зіркова ліга"},{id:"critters",title:"Сплюшки",sub:"Монстрики"},{id:"space",title:"Космос",sub:"Планети"},{id:"bubbles",title:"Бульбашки",sub:"Лопаються"},{id:"emoji",title:"Емоджі",sub:"Міміка"},{id:"plastic",title:"Глянець",sub:"Кулі"},{id:"numbers",title:"Числа",sub:"1 — 10"},{id:"eyes",title:"Очі",sub:"Курсор"}],C={quiet:"Поріг: +4.5 / +9.0 dB • Нагорода: +1 зірка кожні 30 с тиші",groups:"Поріг: +8.0 / +15.0 dB • Робоче обговорення в групах",breaktime:"Поріг: +12.0 / +20.0 dB • Висота стрибка від гучності голосу"};class xe{constructor(i,t){this.state=i,this.callbacks=t,this.panel=document.createElement("div"),this.panel.className="teacher-panel closed",this.render(),document.body.appendChild(this.panel),this.bindEvents()}render(){const i=this.state.settings,t=this.state.activeClass,s=this.state.classes[t]||{stars:0,goal:20,reward:"5 хв мультика",totalStars:0,tasksCompleted:0,goalsReached:0,quietSeconds:0},a=i.alertRepeatSec??4;this.panel.innerHTML=`
      <div class="panel-header">
        <h2>Панель вчителя</h2>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${X()}
        </button>
      </div>

      <div class="panel-body">
        <!-- Lesson Mode Presets (Liquid Glass Segmented Control) -->
        <div class="setting-group">
          <label class="setting-label">Режим уроку</label>
          <div class="liquid-glass-pillbar panel-pillbar" id="panel-mode-grid">
            <button class="liquid-glass-tab mode-card-btn ${i.mode==="quiet"?"active":""}" data-mode="quiet">
              Тиха робота
            </button>
            <button class="liquid-glass-tab mode-card-btn ${i.mode==="groups"?"active":""}" data-mode="groups">
              Групи
            </button>
            <button class="liquid-glass-tab mode-card-btn ${i.mode==="breaktime"?"active":""}" data-mode="breaktime">
              Перерва
            </button>
          </div>
          <div class="mode-tech-hint" id="mode-tech-desc">${C[i.mode]||C.quiet}</div>
        </div>

        <!-- Theme Selection Grid (Kids' favorites first!) -->
        <div class="setting-group section-divider">
          <label class="setting-label">Тема кульок</label>
          <div class="themes-grid" id="themes-grid">
            ${_e.map(l=>`
              <button class="theme-card ${i.theme===l.id?"active":""}" data-theme="${l.id}">
                <div class="theme-card-icon">${Qe(l.id)}</div>
                <div class="theme-card-info">
                  <span class="theme-title">${l.title}</span>
                  <span class="theme-sub">${l.sub}</span>
                </div>
              </button>
            `).join("")}
          </div>
        </div>

        <!-- Alert Sound, Preview & Repeat Interval -->
        <div class="setting-group section-divider">
          <div class="slider-header">
            <label class="setting-label">Звуковий сигнал (клік = прослухати)</label>
            <button class="preview-sound-btn" id="btn-preview-sound" title="Прослухати поточний сигнал">
              ${Je()} Тест
            </button>
          </div>
          <div class="liquid-glass-pillbar panel-pillbar" id="sound-control">
            <button class="liquid-glass-tab segmented-tab ${i.alertSound==="shush"?"active":""}" data-sound="shush">
              Тссс!
            </button>
            <button class="liquid-glass-tab segmented-tab ${i.alertSound==="beep"?"active":""}" data-sound="beep">
              Радар
            </button>
            <button class="liquid-glass-tab segmented-tab ${i.alertSound==="bell"?"active":""}" data-sound="bell">
              Дзвоник
            </button>
            <button class="liquid-glass-tab segmented-tab ${i.alertSound==="arcade"?"active":""}" data-sound="arcade">
              Аркада
            </button>
            <button class="liquid-glass-tab segmented-tab ${i.alertSound==="none"?"active":""}" data-sound="none">
              Вимк.
            </button>
          </div>

          <div class="repeat-interval-row">
            <span class="sub-label">Повторювати сигнал, доки триває шум:</span>
            <div class="liquid-glass-pillbar panel-pillbar" id="repeat-control">
              <button class="liquid-glass-tab repeat-tab ${a===2?"active":""}" data-repeat="2">
                Кожні 2 с
              </button>
              <button class="liquid-glass-tab repeat-tab ${a===4?"active":""}" data-repeat="4">
                Кожні 4 с
              </button>
              <button class="liquid-glass-tab repeat-tab ${a===8?"active":""}" data-repeat="8">
                Кожні 8 с
              </button>
              <button class="liquid-glass-tab repeat-tab ${a===0?"active":""}" data-repeat="0">
                1 раз
              </button>
            </div>
          </div>

          <div class="slider-header" style="margin-top: 4px;">
            <span>Гучність SFX (підсилена)</span>
            <span class="slider-val" id="val-volume">${Math.round(i.volume*100)}%</span>
          </div>
          <input type="range" class="slider" id="slider-volume" min="0" max="1.2" step="0.05" value="${i.volume}">
        </div>

        <!-- Class Manager, Statistics & Goal (No 'Weekly' or 'Class' label clutter) -->
        <div class="setting-group section-divider">
          <div class="slider-header">
            <label class="setting-label">Менеджер груп та Ціль</label>
            <button class="icon-danger-btn" id="btn-delete-class" title="Видалити поточний запис">
              ${Ze()}
            </button>
          </div>

          <div class="class-selector-row">
            <div class="liquid-glass-pillbar class-buttons" id="class-buttons-list">
              ${Object.keys(this.state.classes).map(l=>`
                <button class="liquid-glass-tab class-tab-btn ${l===t?"active":""}" data-class="${l}">
                  ${l}
                </button>
              `).join("")}
            </div>
          </div>

          <div class="class-add-inline">
            <input type="text" class="text-input" id="input-new-class" maxlength="14" placeholder="Новий (напр. 5-А, Група 2)">
            <button class="action-btn-small" id="btn-add-class" title="Додати у список">
              ${Oe()} Додати
            </button>
          </div>

          <!-- Class Statistics Telemetry Strip -->
          <div class="class-stats-strip" id="class-stats-strip">
            <div class="stat-cell">
              <span class="stat-val" id="stat-total-stars">${s.totalStars||s.stars||0}</span>
              <span class="stat-lbl">Усього зірок</span>
            </div>
            <div class="stat-cell stat-cell-interactive" id="btn-stat-add-task" title="Натисніть, щоб зарахувати +1 виконане завдання">
              <div class="stat-val-row">
                <span class="stat-val" id="stat-tasks">${s.tasksCompleted||0}</span>
                <span class="stat-plus-badge">+1</span>
              </div>
              <span class="stat-lbl">Завдань</span>
            </div>
            <div class="stat-cell">
              <span class="stat-val" id="stat-goals">${s.goalsReached||0}</span>
              <span class="stat-lbl">Призів</span>
            </div>
            <div class="stat-cell">
              <span class="stat-val" id="stat-quiet-min">${Math.floor((s.quietSeconds||0)/60)} хв</span>
              <span class="stat-lbl">Час тиші</span>
            </div>
          </div>

          <div class="goal-reward-edit">
            <div class="goal-input-wrap">
              <span>Ціль:</span>
              <input type="number" class="num-input" id="input-goal" min="3" max="200" value="${s.goal}">
              <span>зірок</span>
              <button class="chip-btn-gold" id="btn-add-star" title="Нарахувати +1 зірку (S)">
                +1 зірка
              </button>
            </div>
            <div class="reward-input-wrap">
              <span>Приз:</span>
              <input type="text" class="text-input" id="input-reward" value="${s.reward}" placeholder="5 хв мультика / гра">
            </div>
            <button class="action-btn-danger" id="btn-reset-goal" title="Обнулити поточну банку зірок для нової цілі (загальна статистика зберігається)">
              ${I()} Скинути поточні зірки (0/${s.goal})
            </button>
          </div>
        </div>

        <!-- Task Timer -->
        <div class="setting-group section-divider">
          <label class="setting-label">Таймер завдання (+1 у статистику після завершення)</label>
          <div class="timer-chips">
            <button class="chip-btn" data-min="1">1 хв</button>
            <button class="chip-btn" data-min="2">2 хв</button>
            <button class="chip-btn" data-min="5">5 хв</button>
            <button class="chip-btn" data-min="10">10 хв</button>
            <button class="chip-btn" data-min="15">15 хв</button>
          </div>
        </div>

        <!-- Microphone & Hardware Adaptation -->
        <div class="setting-group section-divider">
          <label class="setting-label">Мікрофон та DSP-тракт</label>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${B(!1)} <span>Увімк. мікрофон</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate">
              ${P()} <span>Калібрувати (3с)</span>
            </button>
          </div>

          <div class="mic-device-row">
            <label class="sub-label" for="select-mic-device">Пристрій вводу:</label>
            <select class="select-input" id="select-mic-device">
              <option value="">Системний за замовчуванням</option>
            </select>
          </div>

          <div class="mic-profiles-group">
            <span class="sub-label">Профіль обладнання (HPF + Presence):</span>
            <div class="liquid-glass-pillbar panel-pillbar">
              <button class="liquid-glass-tab profile-chip-btn ${i.micProfile==="webcam"?"active":""}" data-profile="webcam" title="120 Hz HPF + 2.2 kHz (+3.5 dB) + Gain 2.2x">
                ${Ue()} <span>Вебкамера</span>
              </button>
              <button class="liquid-glass-tab profile-chip-btn ${i.micProfile==="laptop"?"active":""}" data-profile="laptop" title="100 Hz HPF + 2.0 kHz (+2.0 dB) + Gain 1.5x">
                ${Xe()} <span>Ноутбук</span>
              </button>
              <button class="liquid-glass-tab profile-chip-btn ${i.micProfile==="close"?"active":""}" data-profile="close" title="80 Hz HPF + прямий сигнал 1.0x">
                ${B(!0)} <span>Гарнітура</span>
              </button>
            </div>
          </div>

          <!-- Live Signal VU-Meter Telemetry -->
          <div class="mic-test-wrap">
            <div class="mic-test-header">
              <span>Рівень сигналу (RMS):</span>
              <span id="mic-test-db">Вимк.</span>
            </div>
            <div class="mic-vu-bar-bg">
              <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
              <div class="mic-vu-tick yellow-tick" title="Поріг жовтої зони"></div>
              <div class="mic-vu-tick red-tick" title="Поріг червоної зони"></div>
            </div>
            <div class="mic-status-hint" id="mic-status-hint">
              <span>Фон: <strong id="hint-ambient">${Math.round(i.ambientBaselineDb||-55)} dB</strong></span>
              <span>•</span>
              <span id="hint-status">Мікрофон вимкнено</span>
            </div>
          </div>
        </div>

        <!-- Sliders: Gain, Sensitivity, Balls -->
        <div class="setting-group">
          <div class="slider-header">
            <span>Підсилення (Preamp Gain)</span>
            <span class="slider-val" id="val-gain">${i.micGain?Number(i.micGain).toFixed(1):"2.2"}×</span>
          </div>
          <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${i.micGain||2.2}">
          <div class="slider-hints">
            <span>0.5×</span>
            <span>2.2× (вебкамера)</span>
            <span>4.5×</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Зміщення порогів (Чутливість)</span>
            <span class="slider-val" id="val-sensitivity">${i.sensitivity>0?"+":""}${i.sensitivity} dB</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${i.sensitivity}">
          <div class="slider-hints">
            <span>-15 dB (грубіше)</span>
            <span>0 dB</span>
            <span>+15 dB (чутливіше)</span>
          </div>
        </div>

        <div class="setting-group">
          <div class="slider-header">
            <span>Кількість кульок</span>
            <span class="slider-val" id="val-balls">${i.balls}</span>
          </div>
          <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${i.balls}">
        </div>

        <!-- Display Modes: Light Room & Fullscreen -->
        <div class="setting-group section-divider">
          <label class="checkbox-label">
            <input type="checkbox" id="check-light-room" ${i.lightRoom?"checked":""}>
            <span>Світлий режим (контраст для проектора)</span>
          </label>
          <button class="action-btn secondary full-width" id="btn-fullscreen">
            ${Y()} <span>Повний екран (F)</span>
          </button>
        </div>

        <div class="panel-footer">
          <p class="privacy-text">${J()} <span>${v("privacyNote")}</span></p>
          <p class="hotkeys-text">${v("hotkeysHelp")}</p>
          <p class="hotkeys-text">Автор: <a href="https://sivochka.com/uk/tutoring/" target="_blank" rel="noopener" style="color:var(--ink);text-decoration:underline;">Ігор Сівочка — уроки IT та 3D ↗</a> • <a href="https://sivochka.com/" target="_blank" rel="noopener" style="color:var(--muted);">sivochka.com</a></p>
        </div>
      </div>
    `}bindEvents(){this.panel.querySelector("#btn-close-panel").addEventListener("click",()=>this.toggle(!1)),this.panel.querySelectorAll(".mode-card-btn").forEach(c=>{c.addEventListener("click",()=>{this.setModeState(c.dataset.mode),this.callbacks.onModeChange(c.dataset.mode)})}),this.panel.querySelector("#btn-toggle-mic").addEventListener("click",()=>this.callbacks.onMicToggle()),this.panel.querySelector("#btn-calibrate").addEventListener("click",()=>this.callbacks.onCalibrate());const i=this.panel.querySelector("#select-mic-device");i?.addEventListener("change",()=>{this.callbacks.onDeviceChange?.(i.value)}),this.panel.querySelectorAll(".profile-chip-btn").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll(".profile-chip-btn").forEach(m=>m.classList.remove("active")),c.classList.add("active"),this.callbacks.onProfileChange?.(c.dataset.profile)})});const t=this.panel.querySelector("#slider-gain"),s=this.panel.querySelector("#val-gain");t?.addEventListener("input",()=>{const c=parseFloat(t.value);s.textContent=`${c.toFixed(1)}×`,this.callbacks.onGainChange?.(c)});const a=this.panel.querySelector("#slider-sensitivity"),l=this.panel.querySelector("#val-sensitivity");a?.addEventListener("input",()=>{const c=parseInt(a.value,10);l.textContent=`${c>0?"+":""}${c} dB`,this.callbacks.onSensitivity(c)});const o=this.panel.querySelector("#slider-balls"),n=this.panel.querySelector("#val-balls");o?.addEventListener("input",()=>{const c=parseInt(o.value,10);n.textContent=c,this.callbacks.onBalls(c)});const r=this.panel.querySelector("#slider-volume"),d=this.panel.querySelector("#val-volume");r?.addEventListener("input",()=>{const c=parseFloat(r.value);d.textContent=`${Math.round(c*100)}%`,this.callbacks.onVolume(c,!1)}),r?.addEventListener("change",()=>{const c=parseFloat(r.value);this.callbacks.onVolume(c,!0)}),this.panel.querySelectorAll(".theme-card").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll(".theme-card").forEach(m=>m.classList.remove("active")),c.classList.add("active"),this.callbacks.onTheme(c.dataset.theme)})}),this.panel.querySelectorAll("#sound-control .segmented-tab").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll("#sound-control .segmented-tab").forEach(m=>m.classList.remove("active")),c.classList.add("active"),this.callbacks.onSound(c.dataset.sound,!0)})}),this.panel.querySelector("#btn-preview-sound")?.addEventListener("click",()=>{this.callbacks.onSound(this.state.settings.alertSound,!0)}),this.panel.querySelectorAll("#repeat-control .repeat-tab").forEach(c=>{c.addEventListener("click",()=>{this.panel.querySelectorAll("#repeat-control .repeat-tab").forEach(S=>S.classList.remove("active")),c.classList.add("active");const m=parseInt(c.dataset.repeat,10);this.callbacks.onRepeatChange?.(m)})}),this.panel.querySelectorAll(".chip-btn[data-min]").forEach(c=>{c.addEventListener("click",()=>{this.callbacks.onTimerStart(parseInt(c.dataset.min,10))})}),this.bindClassTabs();const h=this.panel.querySelector("#input-new-class"),u=()=>{const c=(h?.value||"").trim();c&&this.callbacks.onAddClass&&(this.callbacks.onAddClass(c),h.value="",this.refreshClassList())};this.panel.querySelector("#btn-add-class")?.addEventListener("click",u),h?.addEventListener("keydown",c=>{c.key==="Enter"&&(c.preventDefault(),u())}),this.panel.querySelector("#btn-delete-class")?.addEventListener("click",()=>{if(Object.keys(this.state.classes).length<=1)return;const m=this.state.activeClass;window.confirm(`Видалити «${m}» зі списку?`)&&(this.callbacks.onDeleteClass?.(m),this.refreshClassList())}),this.panel.querySelector("#btn-stat-add-task")?.addEventListener("click",()=>{this.callbacks.onAddTask?.(),this.updateClassStatsUI()}),this.panel.querySelector("#btn-reset-goal")?.addEventListener("click",()=>{this.callbacks.onResetGoal?.(),this.updateClassStatsUI()}),this.panel.querySelector("#btn-add-star").addEventListener("click",()=>{this.callbacks.onAddStar()});const g=this.panel.querySelector("#input-goal"),f=this.panel.querySelector("#input-reward"),b=()=>{const c=Math.max(3,parseInt(g.value,10)||20);this.callbacks.onGoalChange(c,f.value||"Нагорода"),this.updateClassStatsUI()};g?.addEventListener("change",b),f?.addEventListener("change",b),this.panel.querySelector("#check-light-room")?.addEventListener("change",c=>{this.callbacks.onLightRoom(c.target.checked)}),this.panel.querySelector("#btn-fullscreen")?.addEventListener("click",()=>{this.callbacks.onFullscreen()})}bindClassTabs(){this.panel.querySelectorAll(".class-tab-btn").forEach(i=>{i.addEventListener("click",()=>{const t=i.dataset.class;this.callbacks.onClassChange(t),this.refreshClassList()})})}refreshClassList(){const i=this.panel.querySelector("#class-buttons-list");if(!i)return;const t=this.state.activeClass;i.innerHTML=Object.keys(this.state.classes).map(n=>`
      <button class="liquid-glass-tab class-tab-btn ${n===t?"active":""}" data-class="${n}">
        ${n}
      </button>
    `).join(""),this.bindClassTabs();const s=this.state.classes[t]||{goal:20,reward:"5 хв мультика"},a=this.panel.querySelector("#input-goal"),l=this.panel.querySelector("#input-reward");a&&(a.value=s.goal),l&&(l.value=s.reward);const o=this.panel.querySelector("#btn-delete-class");o&&(o.style.opacity=Object.keys(this.state.classes).length>1?"1":"0.3",o.style.pointerEvents=Object.keys(this.state.classes).length>1?"auto":"none"),this.updateClassStatsUI()}updateClassStatsUI(){const i=this.state.classes[this.state.activeClass];if(!i)return;const t=this.panel.querySelector("#stat-total-stars"),s=this.panel.querySelector("#stat-tasks"),a=this.panel.querySelector("#stat-goals"),l=this.panel.querySelector("#stat-quiet-min"),o=this.panel.querySelector("#btn-reset-goal");t&&(t.textContent=i.totalStars??i.stars??0),s&&(s.textContent=i.tasksCompleted??0),a&&(a.textContent=i.goalsReached??0),l&&(l.textContent=`${Math.floor((i.quietSeconds||0)/60)} хв`),o&&(o.innerHTML=`${I()} Скинути поточні зірки (${i.stars||0}/${i.goal||20})`)}toggle(i=null){const t=this.panel.classList.contains("closed"),s=i!==null?!i:!t;this.panel.classList.toggle("closed",s),s||this.updateClassStatsUI()}populateAudioDevices(i,t=""){const s=this.panel.querySelector("#select-mic-device");if(s){if(!i||i.length===0){s.innerHTML='<option value="">Системний за замовчуванням</option>';return}s.innerHTML=['<option value="">Системний за замовчуванням</option>',...i.map((a,l)=>{const o=a.label||`Мікрофон ${l+1}`,n=a.deviceId===t;return`<option value="${a.deviceId}" ${n?"selected":""}>${o}</option>`})].join("")}}setGainValue(i){const t=this.panel.querySelector("#slider-gain"),s=this.panel.querySelector("#val-gain");t&&(t.value=i),s&&(s.textContent=`${Number(i).toFixed(1)}×`)}setProfileState(i){this.panel.querySelectorAll(".profile-chip-btn").forEach(t=>{t.classList.toggle("active",t.dataset.profile===i)})}updateMicLiveMeter(i,t,s,a,l,o=!0){if(this.panel.classList.contains("closed"))return;const n=this.panel.querySelector("#mic-test-db"),r=this.panel.querySelector("#mic-vu-fill"),d=this.panel.querySelector("#hint-ambient"),h=this.panel.querySelector("#hint-status");if(d&&(d.textContent=`${Math.round(s)} dB`),!o){n&&(n.textContent="Вимк."),r&&(r.style.width="0%"),h&&(h.className="",h.textContent="Мікрофон вимкнено");return}if(n&&(n.textContent=`${Math.round(t)} dB`),r){const f=Math.max(0,Math.min(100,(t- -75)/60*100));r.style.width=`${f}%`,t>=l?(r.style.background="var(--zone-red)",h&&(h.className="status-noise",h.textContent="Перевищення порогу (шум)")):t>=a?(r.style.background="var(--zone-yellow)",h&&(h.className="status-whisper",h.textContent="Жовта зона (шепіт)")):(r.style.background="var(--zone-green)",h&&(h.className="status-calm",h.textContent="Зелена зона (норма)"))}}setMicButtonState(i){const t=this.panel.querySelector("#btn-toggle-mic");t&&(t.innerHTML=`${B(i)} <span>${i?"Вимк. мікрофон":"Увімк. мікрофон"}</span>`,t.classList.toggle("active",i))}setCalibrateButtonState(i){const t=this.panel.querySelector("#btn-calibrate");t&&(t.innerHTML=`${P()} <span>${i?"Калібрування...":"Калібрувати (3с)"}</span>`,t.classList.toggle("active",i))}setModeState(i){this.panel.querySelectorAll(".mode-card-btn").forEach(s=>{s.classList.toggle("active",s.dataset.mode===i)});const t=this.panel.querySelector("#mode-tech-desc");t&&C[i]&&(t.textContent=C[i])}}class et{constructor(i){this.handlers=i,this.boundListener=this.onKeyDown.bind(this),window.addEventListener("keydown",this.boundListener)}onKeyDown(i){if(!["INPUT","SELECT","TEXTAREA"].includes(i.target?.tagName))switch(i.code){case"Space":i.preventDefault(),this.handlers.onSpace?.();break;case"KeyM":i.preventDefault(),this.handlers.onM?.();break;case"KeyC":i.preventDefault(),this.handlers.onC?.();break;case"KeyF":i.preventDefault(),this.handlers.onF?.();break;case"Digit1":this.handlers.onMode1?.();break;case"Digit2":this.handlers.onMode2?.();break;case"Digit3":this.handlers.onMode3?.();break;case"KeyT":this.handlers.onT?.();break;case"KeyS":this.handlers.onS?.();break;case"KeyH":this.handlers.onH?.();break}}destroy(){window.removeEventListener("keydown",this.boundListener)}}class tt{constructor(i){this.overlay=document.createElement("div"),this.overlay.className="intro-overlay",this.overlay.innerHTML=`
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

        <h1 class="intro-title">${v("appTitle")}</h1>
        <p class="intro-subtitle">${v("appSubtitle")}</p>

        <button class="intro-start-btn" id="btn-start-game">
          ${Q()} <span>${v("startBtn")}</span>
        </button>

        <div class="intro-hints">
          <div class="hint-item">
            ${P()} <span>Натисніть <b>C</b> або кнопку калібрування в тиші класу</span>
          </div>
          <div class="hint-item">
            ${Y()} <span>Клавіша <b>F</b> — повноекранний режим для проектора та ТВ</span>
          </div>
          <div class="hint-item">
            ${U(!0)} <span>Клас збирає зірки в банку за кожні 30 секунд тиші</span>
          </div>
        </div>
      </div>
    `,document.body.appendChild(this.overlay),this.overlay.querySelector("#btn-start-game").addEventListener("click",()=>{this.hide(),i&&i()})}hide(){this.overlay.classList.add("fade-out"),setTimeout(()=>{this.overlay.remove()},450)}}class it{constructor(){this.canvas=document.getElementById("game-canvas"),this.state=D.load(),this.physics=new oe,this.renderer=new je(this.canvas),this.mic=new ie,this.mic.ambientBaselineDb=this.state.settings.ambientBaselineDb||-55,this.mic.deviceId=this.state.settings.micDeviceId||"",this.mic.profile=this.state.settings.micProfile||"webcam",this.mic.gainMultiplier=this.state.settings.micGain||2.2;const i=p.modes[this.state.settings.mode]||p.modes.quiet;this.session=new le({initialMode:i.id});const t=this.state.activeClass,s=this.state.classes[t]||k();this.stars=new ae({secondsPerStar:p.stars.secondsPerStar,goldenComboSeconds:p.stars.goldenComboSeconds,initialStars:s.stars,goal:s.goal}),this.zones=new se({enterYellowMs:p.zones.enterYellowMs,exitYellowMs:p.zones.exitYellowMs,enterRedMs:p.zones.enterRedMs,exitRedMs:p.zones.exitRedMs,hysteresisDb:p.zones.hysteresisDb}),this.hud=new Ke({onModeChange:a=>this.switchMode(a),onClassChange:a=>this.switchClass(a),onQuickCalibrate:()=>this.calibrateMic(),onPanelToggle:()=>this.panel.toggle(),onTimerToggle:()=>this.session.toggleTimer(),onResetGoal:()=>this.resetCurrentStars()},this.state.classes,this.state.activeClass),this.panel=new xe(this.state,this.getPanelCallbacks()),y.setVolume(this.state.settings.volume),this.renderer.setTheme(this.state.settings.theme),this.applyLightRoom(this.state.settings.lightRoom),this.lastFrameTime=performance.now(),this.lastAlertTime=0,this.quietStatSaveTimer=0,this.isPaused=!1,this.wasCalibrating=!1,this.cursorTimer=null,this.pointerTarget={x:null,y:null},this.displayedStars=s.stars,this.hasCelebratedGoal=s.stars>=s.goal,this.simulatedDb=null,this.checkDebugMode(),this.initPointers(),this.initResize(),this.initHotkeys(),this.initCursorHide(),new tt(()=>{this.startLesson()}),requestAnimationFrame(this.loop.bind(this))}async toggleMicrophone(){const i=await this.mic.toggle();if(this.panel.setMicButtonState(i),i){const t=await this.mic.listDevices();this.panel.populateAudioDevices(t,this.mic.deviceId)}else this.mic.error&&this.hud.showMicBlockedHelp();return i}switchClass(i){if(!this.state.classes[i])return;this.state.activeClass=i;const t=this.state.classes[i];this.stars.stars=t.stars,this.stars.goal=t.goal,this.stars.resetProgress(),this.displayedStars=t.stars,this.hasCelebratedGoal=t.stars>=t.goal,this.saveState(),this.hud.renderClassSwitcher(this.state.classes,i),this.hud.updateStars(this.displayedStars,this.stars.goal,0,!1,t.reward),this.panel.refreshClassList()}getPanelCallbacks(){return{onModeChange:i=>{this.switchMode(i)},onMicToggle:async()=>{await this.toggleMicrophone()},onCalibrate:()=>{this.calibrateMic()},onDeviceChange:async i=>{this.state.settings.micDeviceId=i,this.saveState(),await this.mic.switchDevice(i)},onProfileChange:i=>{this.state.settings.micProfile=i,this.mic.setProfile(i),this.state.settings.micGain=this.mic.gainMultiplier,this.panel.setGainValue(this.mic.gainMultiplier),this.saveState()},onGainChange:i=>{this.state.settings.micGain=i,this.mic.setGain(i),this.saveState()},onSensitivity:i=>{this.state.settings.sensitivity=i,this.saveState()},onBalls:i=>{this.state.settings.balls=i,this.physics.setBallCount(i),this.saveState()},onTheme:i=>{this.state.settings.theme=i,this.renderer.setTheme(i),this.saveState()},onSound:(i,t=!1)=>{this.state.settings.alertSound=i,this.saveState(),t&&i!=="none"&&y.playAlert(i)},onRepeatChange:i=>{this.state.settings.alertRepeatSec=i,this.saveState()},onVolume:(i,t=!1)=>{if(this.state.settings.volume=i,y.setVolume(i),this.saveState(),t&&i>0){const s=this.state.settings.alertSound;s&&s!=="none"?y.playAlert(s):y.playChime()}},onLightRoom:i=>{this.applyLightRoom(i),this.saveState()},onFullscreen:()=>{this.toggleFullscreen()},onTimerStart:i=>{this.session.startTimer(i),this.panel.toggle(!1)},onClassChange:i=>{this.switchClass(i)},onAddClass:i=>{this.state.classes[i]||(this.state.classes[i]=k()),this.switchClass(i)},onDeleteClass:i=>{if(Object.keys(this.state.classes).length<=1)return;delete this.state.classes[i];const s=Object.keys(this.state.classes)[0];this.switchClass(s)},onAddTask:()=>{const i=this.state.classes[this.state.activeClass];i&&(i.tasksCompleted=(i.tasksCompleted||0)+1,y.playChime(),this.saveState(),this.hud.renderClassSwitcher(this.state.classes,this.state.activeClass))},onResetGoal:()=>{this.resetCurrentStars()},onAddStar:()=>{this.awardStarWithFlight()},onGoalChange:(i,t)=>{const s=this.state.classes[this.state.activeClass];s&&(s.goal=i,s.reward=t,this.stars.goal=i,this.hasCelebratedGoal=this.stars.stars>=i,this.saveState(),this.hud.updateStars(this.stars.stars,this.stars.goal,0,!1,t))}}}switchMode(i){this.session.setMode(i),this.state.settings.mode=i;const t=this.session.getModeConfig();this.hud.updateMode(t.id),this.panel.setModeState(t.id),this.saveState()}applyLightRoom(i){this.state.settings.lightRoom=!!i,document.body.classList.toggle("light-room",!!i),this.renderer.setLightRoom(!!i)}calibrateMic(){this.mic.startCalibration(p.calibrationMs),this.wasCalibrating=this.mic.isCalibrating,this.panel.setCalibrateButtonState(this.mic.isCalibrating)}awardStarWithFlight(){this.stars.awardManualStar();const i=this.state.classes[this.state.activeClass];i&&(i.totalStars=(i.totalStars||0)+1),this.saveClassStars();const t=this.hud.getJarMouthCoords();this.renderer.particles.spawnFlyingStar(this.renderer.width*.5,this.renderer.height*.45,t.x,t.y,()=>{this.displayedStars=this.stars.stars,y.playChime(),this.hud.triggerJarBounce(),this.checkGoalReached()})}resetCurrentStars(){const i=this.state.classes[this.state.activeClass];i&&(i.stars=0),this.stars.resetAll(i?.goal||20),this.displayedStars=0,this.hasCelebratedGoal=!1,this.saveState(),this.hud.updateStars(0,this.stars.goal,0,!1,i?.reward||"Нагорода"),this.panel.updateClassStatsUI()}checkGoalReached(){const i=this.state.classes[this.state.activeClass];this.stars.stars>=this.stars.goal&&!this.hasCelebratedGoal&&(this.hasCelebratedGoal=!0,i&&(i.goalsReached=(i.goalsReached||0)+1,this.saveState(),this.panel.updateClassStatsUI()),y.playFanfare(),this.renderer.particles.spawnConfetti(this.renderer.width,this.renderer.height),this.hud.showGoalReachedModal(i?.reward||"5 хв мультика",()=>{this.resetCurrentStars()}))}onResize(){const i=window.innerWidth,t=window.innerHeight;this.renderer.resize(i,t),this.physics.resize(i,t),this.physics.setBallCount(this.state.settings.balls)}async startLesson(){this.onResize();const i=await this.mic.start(this.state.settings.micDeviceId);if(this.panel.setMicButtonState(i),i){const t=await this.mic.listDevices();this.panel.populateAudioDevices(t,this.mic.deviceId),this.calibrateMic()}else this.hud.showMicBlockedHelp();this.requestWakeLock()}async requestWakeLock(){if("wakeLock"in navigator)try{await navigator.wakeLock.request("screen")}catch{}}toggleFullscreen(){document.fullscreenElement?document.exitFullscreen?.().catch(()=>{}):document.documentElement.requestFullscreen?.().catch(()=>{})}initResize(){this.onResizeHandler=()=>this.onResize(),window.addEventListener("resize",this.onResizeHandler),this.onResize()}initPointers(){const i=this.canvas,t=s=>{const a=i.getBoundingClientRect();return{x:s.clientX-a.left,y:s.clientY-a.top}};i.addEventListener("pointerdown",s=>{const{x:a,y:l}=t(s);this.pointerTarget={x:a,y:l};const o=this.physics.onPointerDown(s.pointerId,a,l);o&&this.renderer.theme==="bubbles"&&(y.playPop(),this.renderer.particles.spawnPop(o.x,o.y,o.radius),o.y=-o.radius,o.py=o.y)}),i.addEventListener("pointermove",s=>{const{x:a,y:l}=t(s);this.pointerTarget={x:a,y:l},this.physics.onPointerMove(s.pointerId,a,l)}),i.addEventListener("pointerup",s=>{this.physics.onPointerUp(s.pointerId)}),i.addEventListener("pointercancel",s=>{this.physics.onPointerUp(s.pointerId)})}initHotkeys(){new et({onSpace:()=>{this.isPaused=!this.isPaused},onM:async()=>{await this.toggleMicrophone()},onC:()=>{this.calibrateMic()},onF:()=>{this.toggleFullscreen()},onMode1:()=>this.switchMode("quiet"),onMode2:()=>this.switchMode("groups"),onMode3:()=>this.switchMode("breaktime"),onT:()=>this.session.toggleTimer(),onS:()=>this.awardStarWithFlight(),onH:()=>this.panel.toggle()})}initCursorHide(){const i=()=>{document.body.classList.remove("hide-cursor"),clearTimeout(this.cursorTimer),this.cursorTimer=setTimeout(()=>{this.panel.panel.classList.contains("closed")&&document.body.classList.add("hide-cursor")},3500)};window.addEventListener("mousemove",i),window.addEventListener("pointerdown",i)}checkDebugMode(){if(new URLSearchParams(window.location.search).has("debug")){const t=document.createElement("div");t.className="debug-bar",t.innerHTML=`
        <span>${Ye()} СИМУЛЯТОР ШУМУ:</span>
        <input type="range" id="sim-slider" min="-80" max="-10" step="1" value="-60">
        <span id="sim-val">-60 dB</span>
        <button id="sim-zero-btn">Тиша</button>
        <button id="sim-stir-btn">Шепіт</button>
        <button id="sim-shout-btn">Крик!</button>
        <span id="fps-counter" style="margin-left: auto;">FPS: 60</span>
      `,document.body.appendChild(t);const s=t.querySelector("#sim-slider"),a=t.querySelector("#sim-val"),l=t.querySelector("#sim-zero-btn"),o=t.querySelector("#sim-stir-btn"),n=t.querySelector("#sim-shout-btn");this.simulatedDb=-60,s.addEventListener("input",()=>{this.simulatedDb=parseFloat(s.value),a.textContent=`${this.simulatedDb} dB`}),l.addEventListener("click",()=>{s.value=-70,this.simulatedDb=-70,a.textContent="-70 dB"}),o.addEventListener("click",()=>{s.value=-42,this.simulatedDb=-42,a.textContent="-42 dB"}),n.addEventListener("click",()=>{s.value=-25,this.simulatedDb=-25,a.textContent="-25 dB"}),this.fpsEl=t.querySelector("#fps-counter"),this.frameCount=0,this.fpsTimer=performance.now()}}saveClassStars(){const i=this.state.classes[this.state.activeClass];i&&(i.stars=this.stars.stars,this.saveState(),this.panel.updateClassStatsUI())}saveState(){this.state.settings.ambientBaselineDb=this.mic.ambientBaselineDb,this.state.settings.micDeviceId=this.mic.deviceId,this.state.settings.micProfile=this.mic.profile,this.state.settings.micGain=this.mic.gainMultiplier,D.save(this.state)}loop(i){requestAnimationFrame(this.loop.bind(this));const t=Math.min(.1,(i-this.lastFrameTime)/1e3);if(this.lastFrameTime=i,this.fpsEl&&(this.frameCount++,i-this.fpsTimer>=1e3&&(this.fpsEl.textContent=`FPS: ${this.frameCount}`,this.frameCount=0,this.fpsTimer=i)),this.isPaused)return;const s=this.mic.sample(this.simulatedDb);s.isCalibrating!==this.wasCalibrating&&(this.wasCalibrating=s.isCalibrating,this.panel.setCalibrateButtonState(s.isCalibrating),s.isCalibrating||this.saveState());const a=this.session.getModeConfig(),l=ee(s.db,s.ambientDb,a.yellowOffsetDb,a.redOffsetDb,this.state.settings.sensitivity),o=this.mic.isListening||this.simulatedDb!==null;this.panel.updateMicLiveMeter(s.rawDb,s.db,s.ambientDb,l.yellowDb,l.redDb,o);const n=this.zones.update(s.db,l.yellowDb,l.redDb,t*1e3),r=n.zone,d=this.state.classes[this.state.activeClass];if(o&&r==="green"&&d&&(d.quietSeconds=(d.quietSeconds||0)+t,this.quietStatSaveTimer+=t,this.quietStatSaveTimer>=15&&(this.quietStatSaveTimer=0,this.saveState(),this.panel.updateClassStatsUI())),a.id==="breaktime"){if(l.progress>.2){const g=(l.progress-.18)*38;this.physics.bounceBalls(g)}}else l.progress>.25&&r==="green"&&this.physics.voicePulse(l.progress),(r==="yellow"||l.progress>=.55&&r!=="red")&&this.physics.stirBalls(l.progress*1.25),r==="red"&&(n.changed?(this.physics.scareBounce(1.75),this.hud.triggerScreenShake(),this.hud.triggerJarBounce()):this.physics.chaosAgitate(Math.max(1,l.progress*1.35)));if(r==="red"){const g=this.state.settings.alertRepeatSec??p.defaultAlertRepeatSec,f=g>0?g*1e3:0,b=n.changed&&i-this.lastAlertTime>p.alertCooldownMs,c=!n.changed&&f>0&&i-this.lastAlertTime>=f;(b||c)&&(this.lastAlertTime=i,this.hud.showAlert(),y.playAlert(this.state.settings.alertSound),c&&(this.physics.scareBounce(1.55),this.hud.triggerScreenShake()))}const h=this.stars.update(r,t,a.rewardsEnabled);if(h.starAwarded){d&&(d.totalStars=(d.totalStars||0)+1);const g=this.hud.getJarMouthCoords();this.renderer.particles.spawnFlyingStar(this.renderer.width*.5,this.renderer.height*.45,g.x,g.y,()=>{this.displayedStars=this.stars.stars,y.playChime(),this.hud.triggerJarBounce(),this.checkGoalReached()}),this.saveClassStars()}const u=this.session.update(t,r);u.completed&&(d&&(d.tasksCompleted=(d.tasksCompleted||0)+1,u.cleanStreak&&(d.cleanTasks=(d.cleanTasks||0)+1),this.saveState(),this.hud.renderClassSwitcher(this.state.classes,this.state.activeClass),this.panel.updateClassStatsUI()),y.playFanfare(),this.renderer.particles.spawnConfetti(this.renderer.width,this.renderer.height),u.cleanStreak&&a.rewardsEnabled&&this.awardStarWithFlight()),this.physics.update(t,r,h.isGolden),this.renderer.render(this.physics,r,h.isGolden,t,this.pointerTarget.x,this.pointerTarget.y),this.hud.updateNoiseMeter(r,l.progress,s.isCalibrating,s.calibrationProgress),this.hud.updateStars(this.displayedStars,this.stars.goal,h.progress,h.isGolden,d?.reward||"5 хв мультика"),this.hud.updateTimer(u.remaining,u.running)}}window.addEventListener("DOMContentLoaded",()=>{new it});
