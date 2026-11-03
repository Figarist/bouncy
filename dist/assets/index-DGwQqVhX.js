(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const l of a)if(l.type==="childList")for(const o of l.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const l={};return a.integrity&&(l.integrity=a.integrity),a.referrerPolicy&&(l.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?l.credentials="include":a.crossOrigin==="anonymous"?l.credentials="omit":l.credentials="same-origin",l}function s(a){if(a.ep)return;a.ep=!0;const l=t(a);fetch(a.href,l)}})();const u={calibrationMs:3e3,calibrationPercentile:.25,minBaselineDb:-75,maxBaselineDb:-44,smoothing:{attack:.04,release:.35},sfxMicMuteMs:750,alertCooldownMs:1200,defaultAlertRepeatSec:4,modes:{quiet:{id:"quiet",name:"Тиха робота",icon:"quiet",yellowOffsetDb:4.5,redOffsetDb:9,rewardsEnabled:!0,physicsBounceOnVoice:!1},groups:{id:"groups",name:"Робота в групах",icon:"groups",yellowOffsetDb:8,redOffsetDb:15,rewardsEnabled:!0,physicsBounceOnVoice:!1},breaktime:{id:"breaktime",name:"Перерва / Класика",icon:"breaktime",yellowOffsetDb:12,redOffsetDb:20,rewardsEnabled:!1,physicsBounceOnVoice:!0}},zones:{enterYellowMs:120,exitYellowMs:600,enterRedMs:250,exitRedMs:1e3,hysteresisDb:2},micProfiles:{webcam:{id:"webcam",name:"Веб-камера (відстань 2-4м)",gain:2.2,highpassHz:120,presenceHz:2200,presenceGain:3.5},laptop:{id:"laptop",name:"Ноутбук / Вбудований",gain:1.5,highpassHz:100,presenceHz:2e3,presenceGain:2},close:{id:"close",name:"Близький / Гарнітура",gain:1,highpassHz:80,presenceHz:2e3,presenceGain:0}},stars:{secondsPerStar:30,goldenComboSeconds:120},balls:{min:10,max:150},physics:{hz:60,subSteps:3,gravity:.46,restitution:.82,friction:.993}};function fe(e){if(!e||e.length===0)return-100;let i=0;for(let a=0;a<e.length;a++){const l=e[a];i+=l*l}const t=Math.sqrt(i/e.length),s=Math.max(t,1e-5);return 20*Math.log10(s)}function ge(e,i,t,s=.04,a=.35){if(t<=0)return e;const l=i>e?s:a,o=1-Math.exp(-t/l);return e+(i-e)*o}function me(e,i=.25,t=-75,s=-44){if(!e||e.length===0)return-55;const a=[...e].sort((n,r)=>n-r),l=Math.min(a.length-1,Math.max(0,Math.floor(a.length*i))),o=a[l];return Math.max(t,Math.min(s,o))}function ye(e,i,t,s,a=0){const l=i+t-a,o=i+s-a;let n="green",r=0;if(e>=o)n="red",r=1+Math.min(.5,(e-o)/8);else if(e>=l){n="yellow";const c=Math.max(.5,o-l);r=.6+.4*((e-l)/c)}else{n="green";const c=i-10,h=Math.max(.5,l-c);r=Math.max(0,.6*((e-c)/h))}return{rawZone:n,progress:Math.min(1.5,Math.max(0,r)),yellowDb:l,redDb:o,currentDb:e}}class be{constructor(){this.ctx=null,this.compressor=null,this.masterGain=null,this.volume=.85,this.lastSfxEndTime=0}init(i){this.ctx||(this.ctx=i||new(window.AudioContext||window.webkitAudioContext),this.compressor=this.ctx.createDynamicsCompressor(),this.compressor.threshold.setValueAtTime(-16,this.ctx.currentTime),this.compressor.knee.setValueAtTime(12,this.ctx.currentTime),this.compressor.ratio.setValueAtTime(6,this.ctx.currentTime),this.compressor.attack.setValueAtTime(.003,this.ctx.currentTime),this.compressor.release.setValueAtTime(.15,this.ctx.currentTime),this.masterGain=this.ctx.createGain(),this.masterGain.gain.setValueAtTime(this.volume*1.75,this.ctx.currentTime),this.compressor.connect(this.masterGain),this.masterGain.connect(this.ctx.destination))}setVolume(i){this.volume=Math.max(0,Math.min(1.5,i)),this.masterGain&&this.ctx&&this.masterGain.gain.setValueAtTime(this.volume*1.75,this.ctx.currentTime)}ensureContext(){this.ctx||this.init(),this.ctx&&this.ctx.state==="suspended"&&this.ctx.resume()}get outputNode(){return this.compressor||this.masterGain}playAlert(i){if(!(!i||i==="none"))switch(i){case"beep":this.playBeep();break;case"bell":this.playBell();break;case"arcade":this.playArcade();break;case"shush":default:this.playShush();break}}isMutingMic(i=700){return this.ctx?performance.now()<this.lastSfxEndTime+i:!1}markSfxPlaying(i){this.lastSfxEndTime=performance.now()+i}playShush(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime,t=.85,s=this.ctx.createOscillator(),a=this.ctx.createGain();s.type="triangle",s.frequency.setValueAtTime(1760,i),s.frequency.exponentialRampToValueAtTime(880,i+.08),a.gain.setValueAtTime(.55,i),a.gain.exponentialRampToValueAtTime(.001,i+.09),s.connect(a),a.connect(this.outputNode),s.start(i),s.stop(i+.09);const l=Math.floor(this.ctx.sampleRate*t),o=this.ctx.createBuffer(1,l,this.ctx.sampleRate),n=o.getChannelData(0);for(let p=0;p<l;p++)n[p]=Math.random()*2-1;const r=this.ctx.createBufferSource();r.buffer=o;const c=this.ctx.createBiquadFilter();c.type="bandpass",c.frequency.setValueAtTime(3100,i),c.frequency.exponentialRampToValueAtTime(2300,i+t),c.Q.setValueAtTime(1.4,i);const h=this.ctx.createBiquadFilter();h.type="peaking",h.frequency.setValueAtTime(4800,i),h.gain.setValueAtTime(10,i);const d=this.ctx.createGain();d.gain.setValueAtTime(.01,i),d.gain.linearRampToValueAtTime(.95,i+.08),d.gain.setValueAtTime(.85,i+.38),d.gain.exponentialRampToValueAtTime(.001,i+t),r.connect(c),c.connect(h),h.connect(d),d.connect(this.outputNode),r.start(i+.02),r.stop(i+t),this.markSfxPlaying(t*1e3)}playBeep(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime;[{start:0,dur:.15,f1:880,f2:880},{start:.19,dur:.26,f1:1046.5,f2:783.99}].forEach(s=>{const a=this.ctx.createOscillator(),l=this.ctx.createOscillator(),o=this.ctx.createGain(),n=i+s.start;a.type="triangle",a.frequency.setValueAtTime(s.f1,n),a.frequency.exponentialRampToValueAtTime(s.f2,n+s.dur),l.type="sine",l.frequency.setValueAtTime(s.f1*2,n),l.frequency.exponentialRampToValueAtTime(s.f2*2,n+s.dur),o.gain.setValueAtTime(.001,n),o.gain.linearRampToValueAtTime(.75,n+.02),o.gain.exponentialRampToValueAtTime(.001,n+s.dur),a.connect(o),l.connect(o),o.connect(this.outputNode),a.start(n),a.stop(n+s.dur),l.start(n),l.stop(n+s.dur)}),this.markSfxPlaying(500)}playBell(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime,t=[0,.18],s=[{freq:1318.5,amp:.7,decay:.65},{freq:2637,amp:.45,decay:.45},{freq:3820,amp:.3,decay:.25}];t.forEach(a=>{const l=i+a;s.forEach(o=>{const n=this.ctx.createOscillator(),r=this.ctx.createGain();n.type="sine",n.frequency.setValueAtTime(o.freq,l),r.gain.setValueAtTime(.001,l),r.gain.linearRampToValueAtTime(o.amp,l+.008),r.gain.exponentialRampToValueAtTime(.001,l+o.decay),n.connect(r),r.connect(this.outputNode),n.start(l),n.stop(l+o.decay)})}),this.markSfxPlaying(850)}playArcade(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.currentTime,t=[987.77,783.99,659.25,523.25],s=.085;t.forEach((a,l)=>{const o=i+l*s,n=l===t.length-1?.24:s,r=this.ctx.createOscillator(),c=this.ctx.createGain();r.type="square",r.frequency.setValueAtTime(a,o);const h=this.ctx.createBiquadFilter();h.type="lowpass",h.frequency.setValueAtTime(3400,o),c.gain.setValueAtTime(.001,o),c.gain.linearRampToValueAtTime(.48,o+.01),c.gain.exponentialRampToValueAtTime(.001,o+n),r.connect(h),h.connect(c),c.connect(this.outputNode),r.start(o),r.stop(o+n)}),this.markSfxPlaying(600)}playPop(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=this.ctx.createOscillator(),t=this.ctx.createGain(),s=this.ctx.currentTime,a=.09;i.type="sine",i.frequency.setValueAtTime(850+Math.random()*300,s),i.frequency.exponentialRampToValueAtTime(140,s+a),t.gain.setValueAtTime(.45,s),t.gain.exponentialRampToValueAtTime(.001,s+a),i.connect(t),t.connect(this.outputNode),i.start(s),i.stop(s+a),this.markSfxPlaying(a*1e3)}playChime(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=[1046.5,1318.5,1567.98],t=this.ctx.currentTime,s=.85;i.forEach((a,l)=>{const o=this.ctx.createOscillator(),n=this.ctx.createGain(),r=t+l*.06;o.type="triangle",o.frequency.setValueAtTime(a,r),n.gain.setValueAtTime(.001,r),n.gain.linearRampToValueAtTime(.42,r+.02),n.gain.exponentialRampToValueAtTime(.001,r+s),o.connect(n),n.connect(this.outputNode),o.start(r),o.stop(r+s)}),this.markSfxPlaying(s*1e3+200)}playFanfare(){if(this.ensureContext(),!this.ctx||this.volume<=0)return;const i=[523.25,659.25,783.99,1046.5],t=this.ctx.currentTime;i.forEach((s,a)=>{const l=this.ctx.createOscillator(),o=this.ctx.createGain(),n=a===i.length-1,r=t+a*.16,c=n?1:.22;l.type=n?"triangle":"sine",l.frequency.setValueAtTime(s,r),o.gain.setValueAtTime(.001,r),o.gain.linearRampToValueAtTime(.55,r+.03),o.gain.exponentialRampToValueAtTime(.001,r+c),l.connect(o),o.connect(this.outputNode),l.start(r),l.stop(r+c)}),this.markSfxPlaying(1600)}}const m=new be;class ve{constructor(){this.audioContext=null,this.mediaStream=null,this.source=null,this.highpassFilter=null,this.presenceFilter=null,this.gainNode=null,this.analyser=null,this.timeData=null,this.isListening=!1,this.isCalibrating=!1,this.calibrationSamples=[],this.calibrationStart=0,this.calibrationDurationMs=u.calibrationMs,this.ambientBaselineDb=-55,this.smoothedDb=-80,this.lastUpdateTime=0,this.deviceId="",this.profile="webcam",this.gainMultiplier=u.micProfiles.webcam.gain,this.quietStreakMs=0,this.error=null}async listDevices(){if(!navigator.mediaDevices?.enumerateDevices)return[];try{return(await navigator.mediaDevices.enumerateDevices()).filter(t=>t.kind==="audioinput")}catch{return[]}}async start(i=null){this.error=null,i!==null&&(this.deviceId=i);try{this.audioContext||(this.audioContext=new(window.AudioContext||window.webkitAudioContext),m.init(this.audioContext)),this.audioContext.state==="suspended"&&await this.audioContext.resume(),this.mediaStream&&(this.mediaStream.getTracks().forEach(s=>s.stop()),this.mediaStream=null);const t={audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1},video:!1};this.deviceId&&(t.audio.deviceId={exact:this.deviceId});try{this.mediaStream=await navigator.mediaDevices.getUserMedia(t)}catch(s){if(this.deviceId)t.audio.deviceId=void 0,this.mediaStream=await navigator.mediaDevices.getUserMedia(t);else throw s}return this.setupAudioGraph(),this.isListening=!0,this.lastUpdateTime=performance.now(),!0}catch(t){return this.isListening=!1,this.error=t.name||"MicrophoneError",!1}}setupAudioGraph(){if(!this.audioContext||!this.mediaStream)return;try{this.source?.disconnect(),this.highpassFilter?.disconnect(),this.presenceFilter?.disconnect(),this.gainNode?.disconnect(),this.analyser?.disconnect()}catch{}const i=u.micProfiles[this.profile]||u.micProfiles.webcam;this.source=this.audioContext.createMediaStreamSource(this.mediaStream),this.highpassFilter=this.audioContext.createBiquadFilter(),this.highpassFilter.type="highpass",this.highpassFilter.frequency.setValueAtTime(i.highpassHz||120,this.audioContext.currentTime),this.highpassFilter.Q.setValueAtTime(.7,this.audioContext.currentTime),this.presenceFilter=this.audioContext.createBiquadFilter(),this.presenceFilter.type="peaking",this.presenceFilter.frequency.setValueAtTime(i.presenceHz||2200,this.audioContext.currentTime),this.presenceFilter.gain.setValueAtTime(i.presenceGain??3.5,this.audioContext.currentTime),this.presenceFilter.Q.setValueAtTime(1,this.audioContext.currentTime),this.gainNode=this.audioContext.createGain();const t=Math.max(.2,Math.min(6,this.gainMultiplier));this.gainNode.gain.setValueAtTime(t,this.audioContext.currentTime),this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=1024,this.analyser.smoothingTimeConstant=.15,this.timeData=new Float32Array(this.analyser.fftSize),this.source.connect(this.highpassFilter),this.highpassFilter.connect(this.presenceFilter),this.presenceFilter.connect(this.gainNode),this.gainNode.connect(this.analyser)}setGain(i){this.gainMultiplier=Math.max(.4,Math.min(6,i)),this.gainNode&&this.audioContext&&this.gainNode.gain.setValueAtTime(this.gainMultiplier,this.audioContext.currentTime)}setProfile(i){if(!u.micProfiles[i])return;this.profile=i;const t=u.micProfiles[i];this.gainMultiplier=t.gain,this.audioContext&&(this.gainNode&&this.gainNode.gain.setValueAtTime(t.gain,this.audioContext.currentTime),this.highpassFilter&&this.highpassFilter.frequency.setValueAtTime(t.highpassHz,this.audioContext.currentTime),this.presenceFilter&&(this.presenceFilter.frequency.setValueAtTime(t.presenceHz,this.audioContext.currentTime),this.presenceFilter.gain.setValueAtTime(t.presenceGain,this.audioContext.currentTime)))}async switchDevice(i){return this.deviceId=i,this.isListening?this.start(i):!0}stop(){this.mediaStream&&(this.mediaStream.getTracks().forEach(i=>i.stop()),this.mediaStream=null),this.isListening=!1,this.isCalibrating=!1,this.smoothedDb=-80}toggle(){return this.isListening?(this.stop(),!1):this.start()}startCalibration(i=u.calibrationMs){this.isListening&&(this.isCalibrating=!0,this.calibrationSamples=[],this.calibrationDurationMs=i,this.calibrationStart=performance.now())}sample(i=null){const t=performance.now(),s=this.lastUpdateTime?(t-this.lastUpdateTime)/1e3:.016;this.lastUpdateTime=t;let a=-90;if(i!==null?a=i:this.isListening&&this.analyser&&this.timeData&&(m.isMutingMic(u.sfxMicMuteMs)?a=this.ambientBaselineDb-10:(this.analyser.getFloatTimeDomainData(this.timeData),a=fe(this.timeData))),this.smoothedDb=ge(this.smoothedDb,a,s,u.smoothing.attack,u.smoothing.release),!this.isCalibrating&&this.isListening&&i===null)if(a<this.ambientBaselineDb){if(this.quietStreakMs+=s*1e3,this.quietStreakMs>2500){const o=Math.max(u.minBaselineDb,a);this.ambientBaselineDb+=(o-this.ambientBaselineDb)*Math.min(1,.04*s)}}else this.quietStreakMs=0;let l=0;if(this.isCalibrating){this.calibrationSamples.push(a);const o=t-this.calibrationStart;l=Math.min(1,o/this.calibrationDurationMs),o>=this.calibrationDurationMs&&(this.isCalibrating=!1,this.ambientBaselineDb=me(this.calibrationSamples,u.calibrationPercentile,u.minBaselineDb,u.maxBaselineDb),this.ambientBaselineDb<-64&&this.gainMultiplier<=1.2&&this.profile==="webcam"&&this.setGain(2.2))}return{rawDb:a,db:this.smoothedDb,ambientDb:this.ambientBaselineDb,isCalibrating:this.isCalibrating,calibrationProgress:l}}}class Se{constructor(i={}){this.enterYellowMs=i.enterYellowMs??300,this.exitYellowMs=i.exitYellowMs??1e3,this.enterRedMs=i.enterRedMs??700,this.exitRedMs=i.exitRedMs??1500,this.hysteresisDb=i.hysteresisDb??3,this.currentZone="green",this.pendingZone=null,this.pendingTimeMs=0}update(i,t,s,a){const l=this.currentZone;let o=this.currentZone;this.currentZone==="red"?i<s-this.hysteresisDb?o=i>=t?"yellow":"green":o="red":this.currentZone==="yellow"?i>=s?o="red":i<t-this.hysteresisDb?o="green":o="yellow":i>=s?o="red":i>=t?o="yellow":o="green";let n=!1;if(o===this.currentZone)this.pendingZone=null,this.pendingTimeMs=0;else{this.pendingZone!==o&&(this.pendingZone=o,this.pendingTimeMs=0),this.pendingTimeMs+=a;let r=300;o==="red"?r=this.enterRedMs:o==="yellow"&&this.currentZone==="green"?r=this.enterYellowMs:this.currentZone==="red"?r=this.exitRedMs:this.currentZone==="yellow"&&o==="green"&&(r=this.exitYellowMs),this.pendingTimeMs>=r&&(this.currentZone=o,this.pendingZone=null,this.pendingTimeMs=0,n=!0)}return{zone:this.currentZone,changed:n,previousZone:l}}reset(){this.currentZone="green",this.pendingZone=null,this.pendingTimeMs=0}}class Me{constructor(i={}){this.secondsPerStar=i.secondsPerStar??30,this.goldenComboSeconds=i.goldenComboSeconds??120,this.stars=i.initialStars??0,this.goal=i.goal??20,this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1}update(i,t,s=!0){let a=!1;const l=this.isGoldenCombo;return s?(i==="green"?(this.currentStarProgressSeconds+=t,this.continuousGreenSeconds+=t,this.currentStarProgressSeconds>=this.secondsPerStar&&(this.stars+=1,this.currentStarProgressSeconds-=this.secondsPerStar,a=!0),this.continuousGreenSeconds>=this.goldenComboSeconds&&(this.isGoldenCombo=!0)):i==="yellow"||i==="red"&&(this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1),{starAwarded:a,goldenComboChanged:l!==this.isGoldenCombo,progress:Math.min(1,this.currentStarProgressSeconds/this.secondsPerStar),stars:this.stars,isGolden:this.isGoldenCombo,goalReached:this.stars>=this.goal}):{starAwarded:!1,goldenComboChanged:!1,progress:this.currentStarProgressSeconds/this.secondsPerStar,stars:this.stars}}awardManualStar(){return this.stars+=1,{stars:this.stars,goalReached:this.stars>=this.goal}}resetProgress(){this.currentStarProgressSeconds=0,this.continuousGreenSeconds=0,this.isGoldenCombo=!1}resetAll(i=this.goal){this.stars=0,this.goal=i,this.resetProgress()}}class ke{constructor(i={}){this.mode=i.initialMode||"quiet",this.timerTotalSeconds=0,this.timerRemainingSeconds=0,this.timerRunning=!1,this.timerHadRedZone=!1}setMode(i){return u.modes[i]&&(this.mode=i),this.getModeConfig()}getModeConfig(){return u.modes[this.mode]||u.modes.quiet}startTimer(i){this.timerTotalSeconds=Math.max(1,i)*60,this.timerRemainingSeconds=this.timerTotalSeconds,this.timerRunning=!0,this.timerHadRedZone=!1}stopTimer(){this.timerRunning=!1}cancelTimer(){this.timerRunning=!1,this.timerRemainingSeconds=0}toggleTimer(){this.timerRemainingSeconds>0&&(this.timerRunning=!this.timerRunning)}update(i,t){if(!this.timerRunning||this.timerRemainingSeconds<=0)return{running:!1,remaining:this.timerRemainingSeconds,completed:!1,cleanStreak:!this.timerHadRedZone};t==="red"&&(this.timerHadRedZone=!0),this.timerRemainingSeconds-=i;let s=!1;return this.timerRemainingSeconds<=0&&(this.timerRemainingSeconds=0,this.timerRunning=!1,s=!0),{running:this.timerRunning,remaining:this.timerRemainingSeconds,completed:s,cleanStreak:!this.timerHadRedZone}}}const W="tyhyi-klas:v1",M=["#3B82F6","#F97316","#22C55E","#A855F7","#EC4899","#EAB308","#14B8A6","#EF4444"],k=[30,60,90],D=14,we=30;function E(e={}){return{stars:0,goal:20,reward:"5 хв мультика",color:M[0],secondsPerStar:k[0],totalStars:0,tasksCompleted:0,cleanTasks:0,goalsReached:0,quietSeconds:0,prizeHistory:[],...e}}function Fe(e){const i=new Set(Object.values(e).map(t=>t.color));return M.find(t=>!i.has(t))||M[Object.keys(e).length%M.length]}function Ce(e,i,t){const s=Object.keys(e),a=s.indexOf(i);return a===-1?null:(s.splice(a,1),s.splice(Math.max(0,Math.min(t,s.length)),0,i),Object.fromEntries(s.map(l=>[l,e[l]])))}function Pe(e){const i=[...new Set(Object.values(e).map(s=>s.totalStars||0).filter(s=>s>0))].sort((s,a)=>a-s).slice(0,3),t={};for(const[s,a]of Object.entries(e)){const l=i.indexOf(a.totalStars||0);l!==-1&&(t[s]=l+1)}return t}function Te(e,i,t=new Date){const s=Array.isArray(e.prizeHistory)?e.prizeHistory:[];return e.prizeHistory=[{reward:i,date:t.toISOString()},...s].slice(0,we),e}function Be(e,i,t){const s=String(t||"").trim().slice(0,D);if(!s||!e[i]||s!==i&&e[s])return null;const a={};for(const[l,o]of Object.entries(e))a[l===i?s:l]=o;return a}const I={activeClass:"4-Б",classes:{"4-Б":E({stars:0,goal:20,reward:"5 хв мультика",color:M[0]}),"3-А":E({stars:0,goal:20,reward:"Настільна гра",color:M[1]})},settings:{mode:"quiet",theme:"critters",sensitivity:0,balls:40,alertSound:"shush",alertRepeatSec:4,volume:.85,lightRoom:!1,lang:"uk",ambientBaselineDb:-55,micDeviceId:"",micProfile:"webcam",micGain:2.2,sidebarCollapsed:!1,sidebarSort:"manual"}};class Z{static load(){try{const i=localStorage.getItem(W);if(!i)return JSON.parse(JSON.stringify(I));const t=JSON.parse(i),s=t.classes&&Object.keys(t.classes).length>0?t.classes:I.classes,a={};return Object.entries(s).forEach(([o,n],r)=>{a[o]=E({...n,totalStars:Math.max(n?.totalStars||0,n?.stars||0),color:n?.color||M[r%M.length],secondsPerStar:k.includes(n?.secondsPerStar)?n.secondsPerStar:k[0],prizeHistory:Array.isArray(n?.prizeHistory)?n.prizeHistory:[]})}),{activeClass:a[t.activeClass]?t.activeClass:Object.keys(a)[0]||"4-Б",classes:a,settings:{...I.settings,...t.settings||{}}}}catch{return JSON.parse(JSON.stringify(I))}}static save(i){try{localStorage.setItem(W,JSON.stringify(i))}catch{}}}const Y=["star","heart","crown","moon"];class Ee{constructor(i,t,s,a){this.x=i,this.y=t,this.px=i,this.py=t,this.radius=s,this.id=a,this.angle=(Math.random()-.5)*.15,this.angularVelocity=0,this.isDragged=!1,this.pointerId=null,this.scaleX=1,this.scaleY=1,this.squashVelocityX=0,this.squashVelocityY=0,this.mood="sleeping",this.blinkTimer=Math.random()*5+2,this.isBlinking=!1,this.breathePhase=Math.random()*Math.PI*2,this.dreamType=Y[Math.floor(a/3)%Y.length],this.dreamPhase=Math.random()*Math.PI*2,this.canPop=!1,this.popped=!1}applyForce(i,t){this.x+=i,this.y+=t}applyImpulse(i,t){this.px-=i,this.py-=t}triggerSquash(i,t,s){const a=Math.min(.45,Math.abs(s)*.04);this.scaleX=1+Math.abs(t)*a-Math.abs(i)*a,this.scaleY=1+Math.abs(i)*a-Math.abs(t)*a}updateAnimation(i,t,s){this.breathePhase+=i*2,this.dreamPhase+=i*1.6,t==="red"?this.mood="chaos":t==="yellow"?this.mood="stirring":s?this.mood="golden":this.mood="sleeping",this.blinkTimer-=i,this.blinkTimer<=0&&(this.isBlinking=!this.isBlinking,this.blinkTimer=this.isBlinking?.15:Math.random()*4+2.5);const a=12,l=-180*(this.scaleX-1)-a*this.squashVelocityX;this.squashVelocityX+=l*i,this.scaleX+=this.squashVelocityX*i;const o=-180*(this.scaleY-1)-a*this.squashVelocityY;this.squashVelocityY+=o*i,this.scaleY+=this.squashVelocityY*i;const r=-42*this.angle-8*this.angularVelocity;this.angularVelocity+=r*i,this.angle+=this.angularVelocity*i,this.angle=Math.max(-.45,Math.min(.45,this.angle))}}class Ae{constructor(){this.width=1200,this.height=800,this.balls=[],this.pointers=new Map,this.cellSize=80,this.grid=new Map,this.accumulator=0,this.fixedDt=1/u.physics.hz}resize(i,t){this.width=Math.max(300,i),this.height=Math.max(300,t),this.cellSize=Math.max(60,Math.floor(Math.min(i,t)/10));for(const s of this.balls)s.x=Math.max(s.radius,Math.min(this.width-s.radius,s.x)),s.y=Math.max(s.radius,Math.min(this.height-s.radius,s.y))}setBallCount(i,t=null){const s=Math.max(u.balls.min,Math.min(u.balls.max,i)),a=t||Math.max(16,Math.min(48,Math.floor(Math.min(this.width,this.height)/(Math.sqrt(s)*2.8))));for(;this.balls.length<s;){const l=this.balls.length,o=a+Math.random()*(this.width-a*2),n=a+Math.random()*(this.height*.7),r=new Ee(o,n,a,l);this.balls.push(r)}this.balls.length>s&&(this.balls.length=s);for(const l of this.balls)l.radius=a}bounceBalls(i){if(!(i<=0))for(const t of this.balls){const s=-i*(.95+Math.random()*.55),a=(Math.random()-.5)*i*.75;t.applyImpulse(a,s),t.angularVelocity+=(Math.random()-.5)*7,t.triggerSquash(0,1,Math.min(8,i*.35))}}voicePulse(i){const t=Math.max(0,i-.25);if(!(t<=0)){for(const s of this.balls)if(s.y>=this.height-s.radius*2.4&&Math.random()<.08){const a=(1.8+Math.random()*2.8)*t,l=(Math.random()-.5)*2.2*t;s.applyImpulse(l,-a),s.triggerSquash(0,1,a*.6)}}}stirBalls(i){const t=Math.min(1.5,Math.max(.35,i));for(const s of this.balls)if(s.y>=this.height-s.radius*4&&Math.random()<.28){const a=(5+Math.random()*8.5)*t,l=(Math.random()-.5)*6.5*t;s.applyImpulse(l,-a),s.angularVelocity+=(Math.random()-.5)*6*t,s.triggerSquash(0,1,a*.65)}}scareBounce(i=1){const t=Math.min(42,22*i);for(const s of this.balls){const a=-t*(.9+Math.random()*.55),l=(Math.random()-.5)*t*.9;s.applyImpulse(l,a),s.angularVelocity+=(Math.random()-.5)*14,s.triggerSquash(0,1,6)}}chaosAgitate(i=1){const t=Math.min(1.8,Math.max(.5,i));for(const s of this.balls)if(s.y>=this.height-s.radius*6&&Math.random()<.42){const a=(8.5+Math.random()*14.5)*t,l=(Math.random()-.5)*11*t;s.applyImpulse(l,-a),s.angularVelocity+=(Math.random()-.5)*9*t,s.triggerSquash(0,1,4)}}update(i,t="green",s=!1){for(this.accumulator+=Math.min(.1,i);this.accumulator>=this.fixedDt;)this.stepFixed(this.fixedDt),this.accumulator-=this.fixedDt;for(const a of this.balls)a.updateAnimation(i,t,s)}stepFixed(i){const{gravity:t,friction:s,restitution:a}=u.physics,l=u.physics.subSteps;for(let o=0;o<l;o++){for(const n of this.balls){if(n.isDragged&&n.pointerId!==null){const h=this.pointers.get(n.pointerId);if(h&&h.isDown){n.px=n.x,n.py=n.y,n.x=h.x,n.y=h.y;continue}else n.isDragged=!1,n.pointerId=null}const r=(n.x-n.px)*s,c=(n.y-n.py)*s+t;n.px=n.x,n.py=n.y,n.x+=r,n.y+=c,n.angularVelocity+=r/n.radius*1.8}for(const n of this.balls)if(!n.isDragged){if(n.y>this.height-n.radius){const r=n.y-n.py;n.y=this.height-n.radius,n.py=n.y+r*a,Math.abs(r)>1.5&&n.triggerSquash(0,1,r)}if(n.y<n.radius){const r=n.y-n.py;n.y=n.radius,n.py=n.y+r*a,Math.abs(r)>1.5&&n.triggerSquash(0,-1,r)}if(n.x<n.radius){const r=n.x-n.px;n.x=n.radius,n.px=n.x+r*a,Math.abs(r)>1.5&&n.triggerSquash(-1,0,r)}if(n.x>this.width-n.radius){const r=n.x-n.px;n.x=this.width-n.radius,n.px=n.x+r*a,Math.abs(r)>1.5&&n.triggerSquash(1,0,r)}}this.resolveBallCollisions()}}resolveBallCollisions(){this.grid.clear();for(let i=0;i<this.balls.length;i++){const t=this.balls[i],s=Math.floor(t.x/this.cellSize),a=Math.floor(t.y/this.cellSize),l=`${s},${a}`;this.grid.has(l)||this.grid.set(l,[]),this.grid.get(l).push(t)}for(const i of this.balls){const t=Math.floor(i.x/this.cellSize),s=Math.floor(i.y/this.cellSize);for(let a=-1;a<=1;a++)for(let l=-1;l<=1;l++){const o=`${t+a},${s+l}`,n=this.grid.get(o);if(n)for(const r of n){if(i.id>=r.id)continue;const c=r.x-i.x,h=r.y-i.y,d=i.radius+r.radius,p=c*c+h*h;if(p<d*d&&p>1e-4){const g=Math.sqrt(p),f=(d-g)*.5,y=c/g,A=h/g;i.isDragged||(i.x-=y*f,i.y-=A*f),r.isDragged||(r.x+=y*f,r.y+=A*f);const C=Math.abs(i.x-i.px-(r.x-r.px))+Math.abs(i.y-i.py-(r.y-r.py));C>3&&(i.triggerSquash(-y,-A,C*.35),r.triggerSquash(y,A,C*.35),i.angularVelocity+=(Math.random()-.5)*C*.45,r.angularVelocity+=(Math.random()-.5)*C*.45)}}}}}onPointerDown(i,t,s){this.pointers.set(i,{x:t,y:s,px:t,py:s,isDown:!0});for(let a=this.balls.length-1;a>=0;a--){const l=this.balls[a],o=t-l.x,n=s-l.y;if(o*o+n*n<=l.radius*l.radius)return l.isDragged=!0,l.pointerId=i,l}return null}onPointerMove(i,t,s){const a=this.pointers.get(i);a&&(a.px=a.x,a.py=a.y,a.x=t,a.y=s)}onPointerUp(i){const t=this.pointers.get(i);if(t){t.isDown=!1;const s=t.x-t.px,a=t.y-t.py;for(const l of this.balls)l.pointerId===i&&(l.isDragged=!1,l.pointerId=null,l.px=l.x-s*1.2,l.py=l.y-a*1.2);this.pointers.delete(i)}}}const Q=["#EF4444","#F97316","#FBBF24","#22C55E","#3B82F6","#8B5CF6","#EC4899","#06B6D4","#E2E8F0","#475569"];function he(e,i){const t=Q[i.id%Q.length],s=i.radius,a=e.createRadialGradient(-s*.35,-s*.35,s*.1,0,0,s);a.addColorStop(0,G(t,65)),a.addColorStop(.3,t),a.addColorStop(.85,G(t,-35)),a.addColorStop(1,G(t,-60)),e.fillStyle=a,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill();const l=e.createRadialGradient(s*.2,s*.35,s*.6,0,0,s);l.addColorStop(0,"rgba(255, 255, 255, 0)"),l.addColorStop(1,"rgba(255, 255, 255, 0.22)"),e.fillStyle=l,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.65)",e.beginPath(),e.ellipse(-s*.3,-s*.38,s*.3,s*.14,-Math.PI/4,0,Math.PI*2),e.fill()}function G(e,i){let t=parseInt(e.replace("#",""),16);if(isNaN(t))return e;let s=(t>>16)+i,a=(t>>8&255)+i,l=(t&255)+i;return s=Math.min(255,Math.max(0,s)),a=Math.min(255,Math.max(0,a)),l=Math.min(255,Math.max(0,l)),`#${((1<<24)+(s<<16)+(a<<8)+l).toString(16).slice(1)}`}function Ie(e,i){const t=i.radius,s=e.createRadialGradient(-t*.35,-t*.35,t*.1,0,0,t);s.addColorStop(0,"#FEF08A"),s.addColorStop(.35,"#FBBF24"),s.addColorStop(.85,"#D97706"),s.addColorStop(1,"#B45309"),e.fillStyle=s,e.beginPath(),e.arc(0,0,t,0,Math.PI*2),e.fill();const a=e.createRadialGradient(t*.2,t*.35,t*.6,0,0,t);a.addColorStop(0,"rgba(255, 255, 255, 0)"),a.addColorStop(1,"rgba(255, 255, 255, 0.2)"),e.fillStyle=a,e.beginPath(),e.arc(0,0,t,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.55)",e.beginPath(),e.ellipse(-t*.3,-t*.38,t*.25,t*.12,-Math.PI/4,0,Math.PI*2),e.fill(),e.save(),e.rotate(i.angle),e.fillStyle="rgba(244, 63, 94, 0.35)",e.beginPath(),e.arc(-t*.5,t*.16,t*.16,0,Math.PI*2),e.arc(t*.5,t*.16,t*.16,0,Math.PI*2),e.fill();const l=i.mood;l==="chaos"?(e.fillStyle="#FFFFFF",e.beginPath(),e.arc(-t*.35,-t*.15,t*.26,0,Math.PI*2),e.arc(t*.35,-t*.15,t*.26,0,Math.PI*2),e.fill(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.35,-t*.15,t*.1,0,Math.PI*2),e.arc(t*.35,-t*.15,t*.1,0,Math.PI*2),e.fill(),e.fillStyle="#18181B",e.beginPath(),e.ellipse(0,t*.38,t*.24,t*.32,0,0,Math.PI*2),e.fill(),e.fillStyle="#F43F5E",e.beginPath(),e.ellipse(0,t*.52,t*.14,t*.1,0,0,Math.PI*2),e.fill()):l==="stirring"?(e.fillStyle="#18181B",e.beginPath(),e.arc(-t*.35,-t*.15,t*.16,0,Math.PI*2),e.fill(),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(-t*.38,-t*.18,t*.05,0,Math.PI*2),e.fill(),e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.08),e.lineCap="round",e.beginPath(),e.moveTo(t*.2,-t*.15),e.lineTo(t*.48,-t*.15),e.stroke(),e.beginPath(),e.moveTo(-t*.2,t*.32),e.quadraticCurveTo(0,t*.22,t*.25,t*.32),e.stroke()):(e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.09),e.lineCap="round",e.beginPath(),e.arc(-t*.35,-t*.12,t*.18,Math.PI*1.1,Math.PI*1.9),e.stroke(),e.beginPath(),e.arc(t*.35,-t*.12,t*.18,Math.PI*1.1,Math.PI*1.9),e.stroke(),e.beginPath(),e.arc(0,t*.12,t*.3,.2*Math.PI,.8*Math.PI),e.stroke()),e.restore()}function De(e,i){he(e,i);const t=i.id%10+1,s=i.radius;e.save(),e.rotate(i.angle),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(0,0,s*.58,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(0, 0, 0, 0.12)",e.lineWidth=Math.max(1,s*.04),e.stroke(),e.fillStyle="#1E293B",e.font=`800 ${Math.round(s*.65)}px Rubik, Nunito, sans-serif`,e.textAlign="center",e.textBaseline="middle",e.fillText(String(t),0,s*.04),e.restore()}function Re(e,i){const t=i.radius,s=i.breathePhase*1.8;e.save(),e.beginPath();const a=24;for(let o=0;o<=a;o++){const n=o/a*Math.PI*2,r=Math.sin(s+n*3)*(t*.03)+Math.cos(s*1.2+n*2)*(t*.02),c=t+r,h=Math.cos(n)*c,d=Math.sin(n)*c;o===0?e.moveTo(h,d):e.lineTo(h,d)}e.closePath();const l=e.createRadialGradient(-t*.35,-t*.35,t*.15,0,0,t);l.addColorStop(0,"rgba(255, 255, 255, 0.55)"),l.addColorStop(.35,"rgba(186, 230, 253, 0.22)"),l.addColorStop(.65,"rgba(240, 171, 252, 0.25)"),l.addColorStop(.9,"rgba(110, 231, 183, 0.45)"),l.addColorStop(1,"rgba(96, 165, 250, 0.75)"),e.fillStyle=l,e.fill(),e.strokeStyle="rgba(255, 255, 255, 0.75)",e.lineWidth=Math.max(1.2,t*.045),e.stroke(),e.fillStyle="rgba(255, 255, 255, 0.85)",e.beginPath(),e.ellipse(-t*.32,-t*.38,t*.34,t*.15,-Math.PI/4,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.4)",e.beginPath(),e.ellipse(t*.38,t*.38,t*.16,t*.08,-Math.PI/4,0,Math.PI*2),e.fill(),e.restore()}const X=["#2563EB","#16A34A","#D97706","#9333EA","#0D9488","#4F46E5"];function Le(e,i,t=null,s=null){const a=i.radius,l=e.createRadialGradient(-a*.25,-a*.25,a*.2,0,0,a);l.addColorStop(0,"#FFFFFF"),l.addColorStop(.7,"#F1F5F9"),l.addColorStop(1,"#94A3B8"),e.fillStyle=l,e.beginPath(),e.arc(0,0,a,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(239, 68, 68, 0.22)",e.lineWidth=1,e.beginPath(),e.moveTo(a*.6,a*.25),e.lineTo(a*.85,a*.35),e.moveTo(-a*.65,-a*.15),e.lineTo(-a*.88,-a*.28),e.stroke();let o=0,n=0;if(t!==null&&s!==null){const d=t-i.x,p=s-i.y,g=Math.sqrt(d*d+p*p);if(g>.001){const f=a*.32;o=d/g*f,n=p/g*f}}const r=X[i.id%X.length],c=a*.46;e.fillStyle=r,e.beginPath(),e.arc(o,n,c,0,Math.PI*2),e.fill();const h=e.createRadialGradient(o,n,c*.3,o,n,c);h.addColorStop(0,"rgba(255, 255, 255, 0.25)"),h.addColorStop(1,"rgba(0, 0, 0, 0.35)"),e.fillStyle=h,e.beginPath(),e.arc(o,n,c,0,Math.PI*2),e.fill(),e.fillStyle="#0F172A",e.beginPath(),e.arc(o,n,c*.52,0,Math.PI*2),e.fill(),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(o-c*.28,n-c*.28,c*.24,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.6)",e.beginPath(),e.arc(o+c*.25,n+c*.25,c*.12,0,Math.PI*2),e.fill()}const _=[{name:"Буль",base:"#20C997",dark:"#0CA678",highlight:"#96F2D7",belly:"#C3FAE8",type:"water"},{name:"Пухан",base:"#FF922B",dark:"#D9480F",highlight:"#FFE8CC",belly:"#FFF4E6",type:"monster"},{name:"Зірка",base:"#FCC419",dark:"#D97706",highlight:"#FFF3BF",belly:"#FFF9DB",type:"firefly"},{name:"Шуршик",base:"#B197FC",dark:"#7048E8",highlight:"#E5DBFF",belly:"#F3F0FF",type:"cat"},{name:"Моргун",base:"#FF8787",dark:"#E03131",highlight:"#FFD8D8",belly:"#FFE3E3",type:"cyclops"},{name:"Ластик",base:"#69DB7C",dark:"#2B8A3E",highlight:"#D3F9D8",belly:"#EBFBEE",type:"frog"}];function qe(e,i){const t=_[i.id%_.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.035;e.save(),e.scale(l,l),e.save(),e.rotate(i.angle),$e(e,t,s,i),e.restore();const o=e.createRadialGradient(-s*.35,-s*.35,s*.12,0,0,s);o.addColorStop(0,t.highlight),o.addColorStop(.35,t.base),o.addColorStop(.85,t.dark),o.addColorStop(1,We(t.dark,-25)),e.fillStyle=o,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill();const n=e.createRadialGradient(s*.25,s*.35,s*.6,0,0,s);n.addColorStop(0,"rgba(255, 255, 255, 0)"),n.addColorStop(.9,"rgba(255, 255, 255, 0.05)"),n.addColorStop(1,"rgba(255, 255, 255, 0.25)"),e.fillStyle=n,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill(),e.save(),e.rotate(i.angle),Ge(e,t,s),e.fillStyle="rgba(255, 107, 107, 0.42)",e.beginPath(),e.arc(-s*.5,s*.16,s*.16,0,Math.PI*2),e.arc(s*.5,s*.16,s*.16,0,Math.PI*2),e.fill(),Ve(e,t,s,i),e.restore(),e.fillStyle="rgba(255, 255, 255, 0.55)",e.beginPath(),e.ellipse(-s*.32,-s*.38,s*.25,s*.12,-Math.PI/4,0,Math.PI*2),e.fill(),a==="golden"&&i.id%3===0&&je(e,s,i),a==="golden"&&(e.strokeStyle="rgba(255, 216, 77, 0.7)",e.lineWidth=Math.max(2.5,s*.1),e.beginPath(),e.arc(0,0,s*1.12,0,Math.PI*2),e.stroke()),e.restore()}function $e(e,i,t,s){if(i.type==="cat")e.fillStyle=i.dark,e.beginPath(),e.moveTo(-t*.75,-t*.35),e.lineTo(-t*.6,-t*1.05),e.lineTo(-t*.2,-t*.75),e.closePath(),e.fill(),e.fillStyle="#FFA8A8",e.beginPath(),e.moveTo(-t*.68,-t*.42),e.lineTo(-t*.58,-t*.95),e.lineTo(-t*.3,-t*.72),e.closePath(),e.fill(),e.fillStyle=i.dark,e.beginPath(),e.moveTo(t*.2,-t*.75),e.lineTo(t*.6,-t*1.05),e.lineTo(t*.75,-t*.35),e.closePath(),e.fill(),e.fillStyle="#FFA8A8",e.beginPath(),e.moveTo(t*.3,-t*.72),e.lineTo(t*.58,-t*.95),e.lineTo(t*.68,-t*.42),e.closePath(),e.fill();else if(i.type==="monster")e.fillStyle="#FFA94D",e.beginPath(),e.arc(-t*.45,-t*.8,t*.2,0,Math.PI*2),e.fill(),e.beginPath(),e.arc(t*.45,-t*.8,t*.2,0,Math.PI*2),e.fill(),e.fillStyle="#FFD43B",e.beginPath(),e.arc(-t*.48,-t*.92,t*.11,0,Math.PI*2),e.arc(t*.48,-t*.92,t*.11,0,Math.PI*2),e.fill();else if(i.type==="firefly"){const a=.8+.3*Math.sin(s.breathePhase*1.5);e.strokeStyle=i.dark,e.lineWidth=Math.max(2,t*.08),e.beginPath(),e.moveTo(0,-t*.85),e.quadraticCurveTo(t*.1,-t*1.15,0,-t*1.25),e.stroke(),e.fillStyle=`rgba(255, 238, 92, ${.4*a})`,e.beginPath(),e.arc(0,-t*1.35,t*.32*a,0,Math.PI*2),e.fill(),e.fillStyle="#FFF3BF",e.beginPath(),e.arc(0,-t*1.35,t*.18,0,Math.PI*2),e.fill()}else i.type==="water"?(e.fillStyle=i.dark,e.beginPath(),e.moveTo(-t*.2,-t*.85),e.quadraticCurveTo(0,-t*1.35,t*.05,-t*1.35),e.quadraticCurveTo(t*.22,-t*1.1,t*.2,-t*.85),e.closePath(),e.fill(),e.fillStyle="#E6FCF5",e.beginPath(),e.arc(-t*.04,-t*1.15,t*.06,0,Math.PI*2),e.fill()):i.type==="frog"&&(e.fillStyle=i.dark,e.beginPath(),e.arc(-t*.45,-t*.8,t*.28,0,Math.PI*2),e.arc(t*.45,-t*.8,t*.28,0,Math.PI*2),e.fill(),e.fillStyle="#EBFBEE",e.beginPath(),e.arc(-t*.45,-t*.8,t*.22,0,Math.PI*2),e.arc(t*.45,-t*.8,t*.22,0,Math.PI*2),e.fill(),e.fillStyle="#111827",e.beginPath(),e.ellipse(-t*.45,-t*.8,t*.12,t*.07,0,0,Math.PI*2),e.ellipse(t*.45,-t*.8,t*.12,t*.07,0,0,Math.PI*2),e.fill())}function Ge(e,i,t,s){i.type==="cat"?(e.strokeStyle=i.dark,e.lineWidth=Math.max(2,t*.07),e.lineCap="round",e.beginPath(),e.moveTo(0,-t*.7),e.lineTo(0,-t*.42),e.moveTo(-t*.22,-t*.65),e.lineTo(-t*.14,-t*.42),e.moveTo(t*.22,-t*.65),e.lineTo(t*.14,-t*.42),e.stroke(),e.fillStyle=i.highlight,e.beginPath(),e.ellipse(-t*.35,t*.85,t*.16,t*.1,0,0,Math.PI*2),e.ellipse(t*.35,t*.85,t*.16,t*.1,0,0,Math.PI*2),e.fill()):i.type==="water"?(e.fillStyle="rgba(211, 249, 216, 0.55)",e.beginPath(),e.ellipse(0,t*.4,t*.45,t*.35,0,0,Math.PI*2),e.fill()):i.type==="frog"?(e.fillStyle="rgba(216, 245, 218, 0.6)",e.beginPath(),e.ellipse(0,t*.42,t*.5,t*.38,0,0,Math.PI*2),e.fill(),e.strokeStyle="rgba(43, 138, 62, 0.35)",e.lineWidth=Math.max(1.5,t*.06),e.beginPath(),e.arc(0,t*.3,t*.35,.2*Math.PI,.8*Math.PI),e.arc(0,t*.48,t*.32,.2*Math.PI,.8*Math.PI),e.stroke()):i.type==="monster"&&(e.fillStyle="rgba(255, 244, 230, 0.6)",e.beginPath(),e.ellipse(0,t*.4,t*.42,t*.32,0,0,Math.PI*2),e.fill())}function Ve(e,i,t,s){const a=s.mood;a==="chaos"?(i.type==="cyclops"?w(e,0,-t*.12,t*.42,1,!0):i.type!=="frog"&&(w(e,-t*.32,-t*.12,t*.26,1,!0),w(e,t*.32,-t*.12,t*.26,1,!0)),e.fillStyle="#18181B",e.beginPath(),e.ellipse(0,t*.42,t*.22,t*.32,0,0,Math.PI*2),e.fill(),e.fillStyle="#F43F5E",e.beginPath(),e.ellipse(0,t*.56,t*.14,t*.12,0,0,Math.PI*2),e.fill(),i.type==="monster"&&(e.fillStyle="#FFFFFF",e.beginPath(),e.moveTo(-t*.06,t*.22),e.lineTo(t*.06,t*.22),e.lineTo(0,t*.34),e.closePath(),e.fill())):a==="stirring"?i.type==="cyclops"?w(e,0,-t*.1,t*.38,.5,!1):i.type==="frog"?(e.fillStyle="#111827",e.beginPath(),e.arc(0,t*.28,t*.12,0,Math.PI*2),e.fill()):(w(e,-t*.32,-t*.12,t*.24,.85,!1),e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.08),e.lineCap="round",e.beginPath(),e.moveTo(t*.18,-t*.12),e.lineTo(t*.46,-t*.12),e.stroke(),e.fillStyle="#18181B",e.beginPath(),e.arc(0,t*.32,t*.1,0,Math.PI*2),e.fill()):(e.strokeStyle="#18181B",e.lineWidth=Math.max(2,t*.08),e.lineCap="round",i.type==="cyclops"?s.isBlinking?(e.beginPath(),e.arc(0,-t*.05,t*.26,Math.PI*.15,Math.PI*.85),e.stroke()):w(e,0,-t*.06,t*.34,.3,!1):i.type!=="frog"&&(e.beginPath(),e.arc(-t*.32,-t*.08,t*.18,Math.PI*.15,Math.PI*.85),e.stroke(),e.beginPath(),e.arc(t*.32,-t*.08,t*.18,Math.PI*.15,Math.PI*.85),e.stroke()),e.beginPath(),e.arc(0,t*.2,t*.22,.2*Math.PI,.8*Math.PI),e.stroke(),i.type==="monster"&&(e.fillStyle="#FFFFFF",e.beginPath(),e.arc(t*.08,t*.25,t*.05,0,Math.PI),e.fill()))}function w(e,i,t,s,a=1,l=!1){e.save(),e.beginPath(),e.arc(i,t,s,0,Math.PI*2),e.clip(),e.fillStyle="#FFFFFF",e.fill();const o=s*(l?.45:.65);if(e.fillStyle=l?"#3B82F6":"#6366F1",e.beginPath(),e.arc(i,t,o,0,Math.PI*2),e.fill(),e.fillStyle="#111827",e.beginPath(),e.arc(i,t,o*(l?.35:.6),0,Math.PI*2),e.fill(),e.fillStyle="#FFFFFF",e.beginPath(),e.arc(i-s*.25,t-s*.25,s*.22,0,Math.PI*2),e.fill(),a<1){const n=(1-a)*(s*2);e.fillStyle="#FA5252",e.beginPath(),e.rect(i-s,t-s,s*2,n),e.fill(),e.strokeStyle="#18181B",e.lineWidth=2,e.beginPath(),e.moveTo(i-s,t-s+n),e.lineTo(i+s,t-s+n),e.stroke()}e.restore(),e.strokeStyle="#18181B",e.lineWidth=Math.max(1.5,s*.08),e.beginPath(),e.arc(i,t,s,0,Math.PI*2),e.stroke()}function je(e,i,t){const s=Math.sin(t.dreamPhase)*(i*.08),a=i*.55,l=-i*1.35+s;e.save(),e.fillStyle="rgba(255, 255, 255, 0.75)",e.beginPath(),e.arc(i*.25,-i*.95+s*.5,i*.06,0,Math.PI*2),e.arc(i*.4,-i*1.1+s*.7,i*.09,0,Math.PI*2),e.fill();const o=i*.32;e.fillStyle="#FFFFFF",e.shadowColor="rgba(255, 212, 59, 0.5)",e.shadowBlur=8,e.beginPath(),e.arc(a-o*.5,l,o*.65,0,Math.PI*2),e.arc(a,l-o*.35,o*.8,0,Math.PI*2),e.arc(a+o*.5,l,o*.65,0,Math.PI*2),e.closePath(),e.fill(),e.shadowBlur=0;const n=t.dreamType||"star",r=l-o*.08;n==="heart"?(e.fillStyle="#FF6B6B",He(e,a,r,o*.55)):n==="crown"?(e.fillStyle="#FCC419",Oe(e,a,r,o*.55)):n==="moon"?(e.fillStyle="#FFD43B",Ne(e,a,r,o*.55)):(e.fillStyle="#FCC419",ze(e,a,r,o*.6)),e.restore()}function ze(e,i,t,s){let a=Math.PI/2*3;const l=5,o=Math.PI/l;e.beginPath(),e.moveTo(i,t-s);for(let n=0;n<l;n++)e.lineTo(i+Math.cos(a)*s,t+Math.sin(a)*s),a+=o,e.lineTo(i+Math.cos(a)*(s*.42),t+Math.sin(a)*(s*.42)),a+=o;e.closePath(),e.fill()}function He(e,i,t,s){e.beginPath(),e.moveTo(i,t+s*.45),e.bezierCurveTo(i-s,t-s*.4,i-s*.5,t-s,i,t-s*.3),e.bezierCurveTo(i+s*.5,t-s,i+s,t-s*.4,i,t+s*.45),e.fill()}function Oe(e,i,t,s){e.beginPath(),e.moveTo(i-s*.7,t+s*.4),e.lineTo(i-s*.7,t-s*.4),e.lineTo(i-s*.3,t),e.lineTo(i,t-s*.5),e.lineTo(i+s*.3,t),e.lineTo(i+s*.7,t-s*.4),e.lineTo(i+s*.7,t+s*.4),e.closePath(),e.fill()}function Ne(e,i,t,s){e.beginPath(),e.arc(i,t,s*.7,.4*Math.PI,1.6*Math.PI),e.quadraticCurveTo(i-s*.2,t,i,t+s*.7),e.fill()}function We(e,i){let t=parseInt(e.replace("#",""),16);if(isNaN(t))return e;let s=(t>>16)+i,a=(t>>8&255)+i,l=(t&255)+i;return s=Math.min(255,Math.max(0,s)),a=Math.min(255,Math.max(0,a)),l=Math.min(255,Math.max(0,l)),`#${((1<<24)+(s<<16)+(a<<8)+l).toString(16).slice(1)}`}const U=[{name:"Earth",type:"earth",base:"#1D4ED8",glow:"#60A5FA"},{name:"Mars",type:"mars",base:"#B91C1C",glow:"#F87171"},{name:"Jupiter",type:"jupiter",base:"#C2410C",ring:!0,glow:"#FDBA74"},{name:"Sun",type:"sun",base:"#FBBF24",glow:!0},{name:"Moon",type:"moon",base:"#64748B",glow:"#94A3B8"},{name:"Neptune",type:"neptune",base:"#0369A1",glow:"#38BDF8"}];function Ze(e,i){const t=U[i.id%U.length],s=i.radius;if(t.glow===!0){const a=e.createRadialGradient(0,0,s*.8,0,0,s*1.55);a.addColorStop(0,"rgba(251, 191, 36, 0.7)"),a.addColorStop(.5,"rgba(245, 158, 11, 0.3)"),a.addColorStop(1,"rgba(234, 88, 12, 0)"),e.fillStyle=a,e.beginPath(),e.arc(0,0,s*1.55,0,Math.PI*2),e.fill()}if(t.ring&&J(e,s,!0),e.save(),e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.clip(),e.fillStyle=t.base,e.fillRect(-s,-s,s*2,s*2),e.save(),e.rotate(i.angle),t.type==="earth"?Ye(e,s):t.type==="jupiter"?Qe(e,s):t.type==="mars"?Xe(e,s):t.type==="neptune"?_e(e,s):t.type==="moon"?Ue(e,s):t.type==="sun"&&Je(e,s),e.restore(),t.type!=="sun"){const a=e.createRadialGradient(-s*.45,-s*.45,s*.2,0,0,s*1.05);a.addColorStop(0,"rgba(255, 255, 255, 0.1)"),a.addColorStop(.45,"rgba(0, 0, 0, 0)"),a.addColorStop(.8,"rgba(5, 8, 22, 0.55)"),a.addColorStop(1,"rgba(3, 5, 15, 0.9)"),e.fillStyle=a,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill()}t.glow&&t.type!=="sun"&&(e.strokeStyle=t.glow,e.lineWidth=Math.max(1.5,s*.05),e.globalAlpha=.45,e.beginPath(),e.arc(0,0,s-.5,0,Math.PI*2),e.stroke(),e.globalAlpha=1),e.restore(),t.ring&&J(e,s,!1)}function J(e,i,t){e.save(),e.rotate(-Math.PI/7),e.beginPath(),t?e.rect(-i*2.2,-i*2.2,i*4.4,i*2.2):e.rect(-i*2.2,0,i*4.4,i*2.2),e.clip(),e.strokeStyle="rgba(234, 138, 70, 0.75)",e.lineWidth=Math.max(2,i*.22),e.beginPath(),e.ellipse(0,0,i*1.6,i*.45,0,0,Math.PI*2),e.stroke(),e.strokeStyle="rgba(254, 215, 170, 0.9)",e.lineWidth=Math.max(1,i*.08),e.beginPath(),e.ellipse(0,0,i*1.5,i*.42,0,0,Math.PI*2),e.stroke(),e.restore()}function Ye(e,i){e.fillStyle="#16A34A",e.beginPath(),e.ellipse(-i*.1,-i*.15,i*.4,i*.28,Math.PI/5,0,Math.PI*2),e.ellipse(-i*.55,i*.1,i*.25,i*.45,-Math.PI/8,0,Math.PI*2),e.ellipse(i*.45,i*.35,i*.2,i*.16,0,0,Math.PI*2),e.fill(),e.fillStyle="rgba(255, 255, 255, 0.45)",e.beginPath(),e.ellipse(-i*.2,-i*.4,i*.5,i*.1,-Math.PI/12,0,Math.PI*2),e.ellipse(i*.2,i*.1,i*.45,i*.08,Math.PI/16,0,Math.PI*2),e.ellipse(-i*.3,i*.5,i*.4,i*.09,0,0,Math.PI*2),e.fill()}function Qe(e,i){const t=[{y:-.65,h:.18,color:"#9A3412"},{y:-.42,h:.22,color:"#EA580C"},{y:-.15,h:.16,color:"#7C2D12"},{y:.05,h:.24,color:"#C2410C"},{y:.35,h:.18,color:"#9A3412"},{y:.58,h:.2,color:"#7C2D12"}];for(const s of t)e.fillStyle=s.color,e.fillRect(-i,s.y*i,i*2,s.h*i);e.fillStyle="#B91C1C",e.beginPath(),e.ellipse(i*.3,i*.15,i*.24,i*.14,-Math.PI/16,0,Math.PI*2),e.fill(),e.strokeStyle="#FDBA74",e.lineWidth=Math.max(1,i*.04),e.beginPath(),e.ellipse(i*.3,i*.15,i*.16,i*.08,-Math.PI/16,0,Math.PI*2),e.stroke()}function Xe(e,i){e.fillStyle="#7F1D1D",e.beginPath(),e.arc(-i*.25,-i*.2,i*.25,0,Math.PI*2),e.arc(i*.3,i*.25,i*.22,0,Math.PI*2),e.arc(-i*.1,i*.35,i*.18,0,Math.PI*2),e.fill(),e.fillStyle="#FEF2F2",e.beginPath(),e.arc(0,-i*.88,i*.35,0,Math.PI*2),e.fill()}function _e(e,i){e.fillStyle="#075985",e.fillRect(-i,-i*.25,i*2,i*.35),e.fillStyle="#082F49",e.beginPath(),e.ellipse(-i*.1,-i*.1,i*.3,i*.18,0,0,Math.PI*2),e.fill(),e.fillStyle="rgba(224, 242, 254, 0.6)",e.fillRect(-i*.7,i*.25,i*1.4,i*.06)}function Ue(e,i){e.fillStyle="#475569",e.beginPath(),e.ellipse(-i*.3,-i*.25,i*.3,i*.25,Math.PI/4,0,Math.PI*2),e.ellipse(i*.25,i*.15,i*.35,i*.28,-Math.PI/6,0,Math.PI*2),e.ellipse(-i*.1,i*.45,i*.22,i*.18,0,0,Math.PI*2),e.fill(),e.fillStyle="#334155",e.beginPath(),e.arc(-i*.4,i*.2,i*.1,0,Math.PI*2),e.arc(i*.4,-i*.3,i*.12,0,Math.PI*2),e.fill()}function Je(e,i){const t=e.createRadialGradient(0,0,0,0,0,i);t.addColorStop(0,"#FEF08A"),t.addColorStop(.65,"#FBBF24"),t.addColorStop(1,"#EA580C"),e.fillStyle=t,e.fillRect(-i,-i,i*2,i*2),e.fillStyle="rgba(234, 88, 12, 0.35)",e.beginPath(),e.arc(-i*.25,i*.2,i*.3,0,Math.PI*2),e.arc(i*.3,-i*.15,i*.28,0,Math.PI*2),e.fill()}const K=[{name:"Кріпко",type:"creeper",base:"#40C057",dark:"#2B8A3E",light:"#8CE99A",pixelA:"#2F9E44",pixelB:"#69DB7C"},{name:"Стіві",type:"miner",base:"#E59966",dark:"#B86B3B",light:"#F5CBA7",hair:"#4A2C11",eyes:"#3BC9DB"},{name:"Ендер",type:"ender",base:"#1E1B2E",dark:"#0F0D18",light:"#3B3355",eyes:"#E599F7",pupil:"#AE3EC9"},{name:"Хрюша",type:"piggy",base:"#F783AC",dark:"#D6336C",light:"#FCC2D7",snout:"#FAA2C1"},{name:"Слаймик",type:"slime",base:"#74B816",dark:"#5C940D",light:"#A9E34B",core:"#2B8A3E"},{name:"Ред-ТНТ",type:"tnt",base:"#E03131",dark:"#A61E1E",light:"#FF8787",band:"#F8F9FA"}];function Ke(e,i){const t=K[i.id%K.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.03;e.save(),e.scale(l,l),e.rotate(i.angle);const o=s*1.78,n=o*.5,r=s*.26,c=t.type==="creeper"&&a==="chaos"&&Math.sin(i.breathePhase*12)>.2;e.fillStyle=c?"#FFFFFF":t.base,V(e,-n,-n,o,o,r),e.fill(),e.fillStyle=c?"#F8F9FA":t.light,e.beginPath(),e.roundRect(-n+2,-n+2,o-4,o*.22,[r*.8,r*.8,0,0]),e.fill(),e.fillStyle=c?"#DEE2E6":t.dark,e.beginPath(),e.roundRect(-n+2,n-o*.18,o-4,o*.16,[0,0,r*.8,r*.8]),e.fill();const h=o/8;if(t.type==="creeper"&&!c?(e.fillStyle=t.pixelA,e.fillRect(-n+h,-n+h,h,h),e.fillRect(n-h*2,-n+h*2,h,h),e.fillRect(-n+h,n-h*2,h,h),e.fillStyle=t.pixelB,e.fillRect(-n+h*2,-n+h,h,h),e.fillRect(n-h*2,n-h*2,h,h)):t.type==="miner"?(e.fillStyle=t.hair,e.beginPath(),e.roundRect(-n,-n,o,h*2.3,[r,r,0,0]),e.fill(),e.fillRect(-n,-n+h*2,h*1.1,h*1.5),e.fillRect(n-h*1.1,-n+h*2,h*1.1,h*1.5)):t.type==="slime"?(e.fillStyle=t.core,e.globalAlpha=.65,e.fillRect(-h*2.2,-h*2.2,h*4.4,h*4.4),e.globalAlpha=1):t.type==="tnt"&&(e.fillStyle=t.band,e.fillRect(-n+2,-h*1.2,o-4,h*2.4),e.strokeStyle="#343A40",e.lineWidth=Math.max(2,h*.45),e.beginPath(),e.moveTo(0,-n),e.lineTo(h*.6,-n-h*1.2),e.stroke(),(a==="chaos"||a==="stirring")&&(e.fillStyle="#FFD43B",e.beginPath(),e.arc(h*.6,-n-h*1.3,h*.55,0,Math.PI*2),e.fill())),xe(e,t,h,a),e.strokeStyle=c?"#FFD43B":"#111827",e.lineWidth=Math.max(2,s*.08),V(e,-n,-n,o,o,r),e.stroke(),a==="golden"&&(e.strokeStyle="#3BC9DB",e.lineWidth=Math.max(2.5,s*.1),V(e,-n-4,-n-4,o+8,o+8,r+3),e.stroke(),i.id%2===0)){const d=Math.sin(i.dreamPhase)*(s*.1);e.fillStyle="#3BC9DB",e.strokeStyle="#0B7285",e.lineWidth=1.5,e.beginPath(),e.moveTo(0,-n-s*.55+d),e.lineTo(s*.22,-n-s*.33+d),e.lineTo(0,-n-s*.11+d),e.lineTo(-s*.22,-n-s*.33+d),e.closePath(),e.fill(),e.stroke()}e.restore()}function xe(e,i,t,s,a){if(i.type==="creeper"){e.fillStyle="#111827",s==="sleeping"||s==="golden"?(e.fillRect(-t*2.5,-t*.8,t*1.6,t*.6),e.fillRect(t*.9,-t*.8,t*1.6,t*.6)):(e.fillRect(-t*2.6,-t*1.8,t*1.7,t*1.7),e.fillRect(t*.9,-t*1.8,t*1.7,t*1.7));const l=s==="chaos"?t*2.4:t*1.6;e.fillRect(-t*.9,t*.1,t*1.8,l),e.fillRect(-t*1.8,t*.9,t*.9,l),e.fillRect(t*.9,t*.9,t*.9,l);return}if(i.type==="ender"){if(s==="sleeping"||s==="golden")e.fillStyle=i.pupil,e.fillRect(-t*3,-t*.3,t*2,t*.5),e.fillRect(t*1,-t*.3,t*2,t*.5);else{e.fillStyle=i.eyes;const l=s==="chaos"?t*1.6:t*1;e.fillRect(-t*3.2,-t*.8,t*2.2,l),e.fillRect(t*1,-t*.8,t*2.2,l),e.fillStyle=i.pupil,e.fillRect(-t*2.5,-t*.8,t*.9,l),e.fillRect(t*1.6,-t*.8,t*.9,l)}s==="chaos"&&(e.fillStyle="#AE3EC9",e.fillRect(-t*1.4,t*1.2,t*2.8,t*1.6));return}if(s==="sleeping"||s==="golden")e.fillStyle="#18181B",e.fillRect(-t*2.6,-t*.4,t*1.6,t*.55),e.fillRect(t*1,-t*.4,t*1.6,t*.55);else{const l=s==="chaos"?t*1.6:t*1.2;e.fillStyle="#FFFFFF",e.fillRect(-t*2.8,-t*1.1,t*1.8,l),e.fillRect(t*1,-t*1.1,t*1.8,l),e.fillStyle=i.eyes||"#18181B";const o=s==="stirring"?t*.3:0;e.fillRect(-t*2.1+o,-t*1.1,t*.9,l),e.fillRect(t*1.2+o,-t*1.1,t*.9,l)}i.type==="piggy"?(e.fillStyle=i.snout,e.fillRect(-t*1.6,t*.3,t*3.2,t*1.9),e.fillStyle="#A61E4D",e.fillRect(-t*1.2,t*.8,t*.7,t*.9),e.fillRect(t*.5,t*.8,t*.7,t*.9)):s==="chaos"?(e.fillStyle="#18181B",e.fillRect(-t*1.3,t*.8,t*2.6,t*1.7)):(e.fillStyle="#4A2C11",e.fillRect(-t*1.1,t*1.1,t*2.2,t*.7))}function V(e,i,t,s,a,l){e.beginPath(),e.roundRect(i,t,s,a,l)}const x=[{name:"Нубік",type:"noob",skin:"#FFD43B",skinDark:"#F59F00",collar:"#1C7ED6"},{name:"Бейкон",type:"bacon",skin:"#F3D9FA",skinDark:"#CEB2D6",hair:"#8B4513",collar:"#3B5BDB"},{name:"Оббі-Квін",type:"queen",skin:"#FFDEEB",skinDark:"#FCC2D7",hair:"#F06595",collar:"#AE3EC9"},{name:"Будівельник",type:"builder",skin:"#FFE066",skinDark:"#F59F00",hat:"#FD7E14",collar:"#2B8A3E"},{name:"Кібер-Блокс",type:"cyber",skin:"#CED4DA",skinDark:"#868E96",visor:"#22B8CF",collar:"#212529"},{name:"Голд-Лорд",type:"gold",skin:"#212529",skinDark:"#0B0C0E",hood:"#FCC419",collar:"#E67700"}];function et(e,i){const t=x[i.id%x.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.032;e.save(),e.scale(l,l),e.rotate(i.angle);const o=s*1.72,n=s*1.78,r=o*.5,c=n*.5,h=s*.42;e.fillStyle=t.skinDark,e.strokeStyle="#111827",e.lineWidth=Math.max(1.8,s*.07),e.beginPath(),e.roundRect(-s*.36,-c-s*.2,s*.72,s*.25,[4,4,0,0]),e.fill(),e.stroke(),e.fillStyle=t.collar,e.beginPath(),e.roundRect(-r*.78,c-s*.14,o*.78,s*.26,[0,0,8,8]),e.fill(),e.stroke();const d=e.createLinearGradient(-r,-c,r,c);d.addColorStop(0,"#FFFFFF"),d.addColorStop(.18,t.skin),d.addColorStop(.85,t.skin),d.addColorStop(1,t.skinDark),e.fillStyle=d,e.beginPath(),e.roundRect(-r,-c,o,n,h),e.fill(),e.stroke(),e.fillStyle="rgba(255, 255, 255, 0.42)",e.beginPath(),e.roundRect(-r+s*.14,-c+s*.18,s*.18,n*.62,99),e.fill(),tt(e,t,s,r,c),it(e,t,s,a),a==="golden"&&(e.strokeStyle="#FFD43B",e.lineWidth=Math.max(2.5,s*.1),e.beginPath(),e.roundRect(-r-4,-c-4,o+8,n+8,h+4),e.stroke()),e.restore()}function tt(e,i,t,s,a){e.strokeStyle="#111827",e.lineWidth=Math.max(1.8,t*.07),i.type==="bacon"?(e.fillStyle=i.hair,e.beginPath(),e.moveTo(-s-2,-a+t*.35),e.quadraticCurveTo(-s*.5,-a-t*.28,0,-a-t*.18),e.quadraticCurveTo(s*.6,-a-t*.28,s+2,-a+t*.35),e.lineTo(s-t*.15,-a+t*.08),e.lineTo(0,-a+t*.16),e.lineTo(-s+t*.15,-a+t*.08),e.closePath(),e.fill(),e.stroke()):i.type==="queen"?(e.fillStyle=i.hair,e.beginPath(),e.arc(-s-t*.08,-a*.35,t*.34,0,Math.PI*2),e.arc(s+t*.08,-a*.35,t*.34,0,Math.PI*2),e.fill(),e.stroke()):i.type==="builder"?(e.fillStyle=i.hat,e.beginPath(),e.arc(0,-a+t*.15,s*1.04,Math.PI,0),e.closePath(),e.fill(),e.stroke(),e.fillStyle="#F76707",e.beginPath(),e.roundRect(-s*1.15,-a+t*.08,s*2.3,t*.22,6),e.fill(),e.stroke()):i.type==="gold"&&(e.strokeStyle=i.hood,e.lineWidth=Math.max(3,t*.13),e.beginPath(),e.roundRect(-s+3,-a+3,s*2-6,a*2-6,t*.36),e.stroke())}function it(e,i,t,s){const l=i.type==="gold"?"#FFD43B":"#111827";i.type==="cyber"?(e.fillStyle=s==="chaos"?"#FF6B6B":i.visor,e.strokeStyle="#111827",e.lineWidth=2,e.beginPath(),e.roundRect(-t*.58,-t*.28,t*1.16,t*.38,6),e.fill(),e.stroke()):s==="sleeping"||s==="golden"?(e.strokeStyle=l,e.lineWidth=Math.max(2.2,t*.085),e.lineCap="round",e.beginPath(),e.arc(-t*.3,-t*.08,t*.14,.15*Math.PI,.85*Math.PI),e.stroke(),e.beginPath(),e.arc(t*.3,-t*.08,t*.14,.15*Math.PI,.85*Math.PI),e.stroke()):s==="stirring"?(e.fillStyle=l,e.beginPath(),e.arc(-t*.3,-t*.06,t*.12,0,Math.PI*2),e.arc(t*.3,-t*.06,t*.15,0,Math.PI*2),e.fill(),e.strokeStyle=l,e.lineWidth=Math.max(2.2,t*.08),e.lineCap="round",e.beginPath(),e.moveTo(-t*.46,-t*.24),e.lineTo(-t*.14,-t*.2),e.moveTo(t*.14,-t*.32),e.quadraticCurveTo(t*.3,-t*.44,t*.48,-t*.26),e.stroke()):(e.fillStyle="#FFFFFF",e.strokeStyle=l,e.lineWidth=2,e.beginPath(),e.arc(-t*.32,-t*.1,t*.22,0,Math.PI*2),e.arc(t*.32,-t*.1,t*.22,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.32,-t*.1,t*.09,0,Math.PI*2),e.arc(t*.32,-t*.1,t*.09,0,Math.PI*2),e.fill()),e.strokeStyle=l,e.lineWidth=Math.max(2.4,t*.09),e.lineCap="round",s==="chaos"?(e.fillStyle="#111827",e.beginPath(),e.roundRect(-t*.32,t*.22,t*.64,t*.38,8),e.fill(),e.fillStyle="#FFFFFF",e.fillRect(-t*.26,t*.24,t*.52,t*.12)):s==="stirring"?(e.beginPath(),e.moveTo(-t*.25,t*.34),e.quadraticCurveTo(0,t*.22,t*.25,t*.36),e.stroke()):(e.beginPath(),e.moveTo(-t*.26,t*.28),e.quadraticCurveTo(t*.08,t*.46,t*.34,t*.18),e.stroke())}const ee=[{name:"Спайкі",type:"cactus",base:"#51CF66",dark:"#2B8A3E",accent:"#FA5252"},{name:"Хамелеон",type:"hoodie",base:"#37B24D",dark:"#237032",skin:"#F59F00",accent:"#FFD43B"},{name:"Дрімун",type:"sand",base:"#9775FA",dark:"#5F3DC4",skin:"#FCC2D7",accent:"#FFD43B"},{name:"Ворон",type:"crow",base:"#364FC7",dark:"#182461",beak:"#FCC419"},{name:"Лучадор",type:"lucha",base:"#FD7E14",dark:"#C92A2A",accent:"#FFD43B"},{name:"Меха-Вольт",type:"mecha",base:"#E03131",dark:"#862E9C",accent:"#FFD43B"}];function st(e,i){const t=ee[i.id%ee.length],s=i.radius,a=i.mood,l=1+Math.sin(i.breathePhase)*.04;e.save(),e.scale(l,l),(a==="chaos"||a==="golden")&&(e.save(),e.rotate(i.breathePhase*(a==="chaos"?3:1)),e.strokeStyle=a==="chaos"?"#FF5C7A":"#FFD43B",e.lineWidth=Math.max(2.5,s*.12),e.setLineDash([s*.35,s*.2]),e.beginPath(),e.arc(0,0,s*1.14,0,Math.PI*2),e.stroke(),e.restore()),e.rotate(i.angle),at(e,t,s);const o=e.createRadialGradient(-s*.3,-s*.3,s*.1,0,0,s);o.addColorStop(0,t.base),o.addColorStop(.75,t.base),o.addColorStop(1,t.dark),e.fillStyle=o,e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.fill(),lt(e,t,s,a),e.strokeStyle="#111827",e.lineWidth=Math.max(2.8,s*.11),e.beginPath(),e.arc(0,0,s,0,Math.PI*2),e.stroke(),e.fillStyle="rgba(255, 255, 255, 0.5)",e.beginPath(),e.ellipse(-s*.35,-s*.42,s*.22,s*.1,-Math.PI/4,0,Math.PI*2),e.fill(),e.restore()}function at(e,i,t){if(e.strokeStyle="#111827",e.lineWidth=Math.max(2.2,t*.09),i.type==="cactus"){e.fillStyle=i.accent,e.beginPath(),e.arc(-t*.18,-t*1.05,t*.2,0,Math.PI*2),e.arc(t*.18,-t*1.05,t*.2,0,Math.PI*2),e.arc(0,-t*1.18,t*.22,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle=i.base;for(const s of[-1,1])e.beginPath(),e.moveTo(s*t*.92,-t*.2),e.lineTo(s*t*1.18,-t*.05),e.lineTo(s*t*.95,t*.1),e.closePath(),e.fill(),e.stroke()}else if(i.type==="hoodie")for(const s of[-1,1])e.fillStyle=i.accent,e.beginPath(),e.arc(s*t*.48,-t*.86,t*.25,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(s*t*.48,-t*.86,t*.08,0,Math.PI*2),e.fill()}function lt(e,i,t,s){if(i.type==="cactus"){if(e.fillStyle="#18181B",s==="sleeping"||s==="golden")e.lineWidth=Math.max(2.5,t*.1),e.strokeStyle="#18181B",e.beginPath(),e.arc(-t*.32,-t*.1,t*.15,.1*Math.PI,.9*Math.PI),e.stroke(),e.beginPath(),e.arc(t*.32,-t*.1,t*.15,.1*Math.PI,.9*Math.PI),e.stroke();else{const l=s==="chaos"?t*.22:t*.16;e.beginPath(),e.arc(-t*.34,-t*.12,l,0,Math.PI*2),e.arc(t*.34,-t*.12,l,0,Math.PI*2),e.fill()}const a=s==="chaos"?t*.28:t*.16;e.beginPath(),e.arc(0,t*.28,a,0,Math.PI*2),e.fill();return}if(i.type==="hoodie"){e.fillStyle="#D97706",e.beginPath(),e.arc(0,t*.28,t*.56,0,Math.PI),e.fill(),e.strokeStyle="#111827",e.lineWidth=Math.max(2.5,t*.09),e.beginPath(),e.moveTo(-t*.65,t*.22),e.quadraticCurveTo(0,-t*.05,t*.65,t*.22),e.stroke(),e.fillStyle="#FFFFFF",e.beginPath(),s==="chaos"?e.arc(0,t*.45,t*.26,0,Math.PI*2):e.arc(0,t*.36,t*.32,0,Math.PI),e.fill(),e.stroke();return}if(i.type==="sand"){e.fillStyle=i.accent,nt(e,0,-t*.45,t*.28),e.strokeStyle="#111827",e.lineWidth=Math.max(2.4,t*.09),e.lineCap="round",s==="chaos"?(e.fillStyle="#FFFFFF",e.beginPath(),e.arc(-t*.3,t*.05,t*.2,0,Math.PI*2),e.arc(t*.3,t*.05,t*.2,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.3,t*.05,t*.08,0,Math.PI*2),e.arc(t*.3,t*.05,t*.08,0,Math.PI*2),e.fill()):(e.beginPath(),e.arc(-t*.3,t*.05,t*.16,.15*Math.PI,.85*Math.PI),e.stroke(),e.beginPath(),e.arc(t*.3,t*.05,t*.16,.15*Math.PI,.85*Math.PI),e.stroke()),(s==="sleeping"||s==="golden")&&(e.fillStyle="rgba(116, 192, 252, 0.75)",e.beginPath(),e.arc(t*.28,t*.35,t*.22,0,Math.PI*2),e.fill());return}if(i.type==="crow"){e.fillStyle=i.beak,e.strokeStyle="#111827",e.lineWidth=Math.max(2,t*.08),e.beginPath(),e.moveTo(-t*.38,t*.05),e.lineTo(t*.38,t*.05),e.lineTo(0,t*.58),e.closePath(),e.fill(),e.stroke(),e.fillStyle=s==="chaos"?"#FF6B6B":"#FFFFFF",e.beginPath(),e.arc(-t*.34,-t*.18,t*.18,0,Math.PI*2),e.arc(t*.34,-t*.18,t*.18,0,Math.PI*2),e.fill(),e.stroke();return}e.fillStyle=i.accent,e.strokeStyle="#111827",e.lineWidth=Math.max(2,t*.08),i.type==="mecha"?(e.beginPath(),e.moveTo(-t*.7,-t*.28),e.lineTo(0,-t*.06),e.lineTo(t*.7,-t*.28),e.lineTo(t*.52,t*.12),e.lineTo(0,-t*.02),e.lineTo(-t*.52,t*.12),e.closePath(),e.fill(),e.stroke()):(e.beginPath(),e.arc(-t*.34,-t*.1,t*.24,0,Math.PI*2),e.arc(t*.34,-t*.1,t*.24,0,Math.PI*2),e.fill(),e.stroke(),e.fillStyle="#111827",e.beginPath(),e.arc(-t*.34,-t*.1,s==="chaos"?t*.12:t*.07,0,Math.PI*2),e.arc(t*.34,-t*.1,s==="chaos"?t*.12:t*.07,0,Math.PI*2),e.fill()),e.fillStyle="#FFFFFF",e.beginPath(),s==="chaos"?e.roundRect(-t*.35,t*.22,t*.7,t*.34,6):e.roundRect(-t*.32,t*.28,t*.64,t*.2,5),e.fill(),e.stroke()}function nt(e,i,t,s){let a=Math.PI/2*3;const l=Math.PI/5;e.beginPath(),e.moveTo(i,t-s);for(let o=0;o<5;o++)e.lineTo(i+Math.cos(a)*s,t+Math.sin(a)*s),a+=l,e.lineTo(i+Math.cos(a)*(s*.45),t+Math.sin(a)*(s*.45)),a+=l;e.closePath(),e.fill(),e.strokeStyle="#111827",e.lineWidth=1.8,e.stroke()}class ot{constructor(){this.particles=[],this.flyingStars=[]}spawnZzz(i,t){this.particles.push({type:"zzz",x:i+(Math.random()-.5)*16,y:t-8,vx:(Math.random()-.5)*8,vy:-16-Math.random()*14,size:14+Math.random()*6,alpha:.95,decay:.45+Math.random()*.2,letter:Math.random()>.35?"z":"Z"})}spawnSparkle(i,t,s="#FFD84D"){this.particles.push({type:"sparkle",x:i,y:t,vx:(Math.random()-.5)*45,vy:(Math.random()-.5)*45,size:3+Math.random()*4,alpha:1,decay:1.2,color:s})}spawnFlyingStar(i,t,s,a,l=null){const o=(i+s)*.5,n=Math.min(t,a)-Math.max(120,Math.abs(s-i)*.35);this.flyingStars.push({x0:i,y0:t,cx:o,cy:n,x1:s,y1:a,t:0,duration:.85,onArrive:l,spin:0,scale:1.4})}spawnPop(i,t,s){for(let l=0;l<12;l++){const o=Math.PI*2*l/12+(Math.random()-.5)*.3,n=40+Math.random()*80;this.particles.push({type:"droplet",x:i+Math.cos(o)*(s*.8),y:t+Math.sin(o)*(s*.8),vx:Math.cos(o)*n,vy:Math.sin(o)*n,size:2.5+Math.random()*3,alpha:.85,decay:1.8,color:"#74C0FC"})}}spawnConfetti(i,t){const s=["#FF6B6B","#4DABF7","#FFD43B","#69DB7C","#DA77F2","#FFA94D"];for(let a=0;a<110;a++)this.particles.push({type:"confetti",x:Math.random()*i,y:-10-Math.random()*60,vx:(Math.random()-.5)*90,vy:90+Math.random()*130,rotation:Math.random()*Math.PI*2,rotSpeed:(Math.random()-.5)*8,sizeW:9+Math.random()*6,sizeH:5+Math.random()*4,alpha:1,decay:.2,color:s[Math.floor(Math.random()*s.length)]})}update(i){for(let t=this.particles.length-1;t>=0;t--){const s=this.particles[t];s.x+=s.vx*i,s.y+=s.vy*i,s.alpha-=s.decay*i,s.type==="confetti"?(s.rotation+=s.rotSpeed*i,s.vx+=(Math.random()-.5)*40*i):s.type==="droplet"&&(s.vy+=120*i),s.alpha<=0&&this.particles.splice(t,1)}for(let t=this.flyingStars.length-1;t>=0;t--){const s=this.flyingStars[t];s.t+=i/s.duration,s.spin+=i*6;const a=Math.min(1,s.t),l=1-a,o=l*l*s.x0+2*l*a*s.cx+a*a*s.x1,n=l*l*s.y0+2*l*a*s.cy+a*a*s.y1;if(Math.random()<.75&&this.particles.push({type:"sparkle",x:o+(Math.random()-.5)*12,y:n+(Math.random()-.5)*12,vx:(Math.random()-.5)*15,vy:(Math.random()-.5)*15,size:2.5+Math.random()*3,alpha:.9,decay:2.2,color:Math.random()>.4?"#FFE066":"#FFF3BF"}),s.t>=1){for(let r=0;r<14;r++)this.spawnSparkle(s.x1,s.y1,"#FFD43B");s.onArrive&&s.onArrive(),this.flyingStars.splice(t,1)}}}render(i,t=!1){if(!(this.particles.length===0&&this.flyingStars.length===0)){i.save();for(const s of this.particles)i.globalAlpha=Math.max(0,s.alpha),s.type==="zzz"?(i.fillStyle=t?"#334155":"#C5D8F8",i.font=`800 ${s.size}px Rubik, Nunito, sans-serif`,i.textAlign="center",i.textBaseline="middle",i.fillText(s.letter,s.x,s.y)):s.type==="sparkle"||s.type==="droplet"?(i.fillStyle=s.color,i.beginPath(),i.arc(s.x,s.y,s.size,0,Math.PI*2),i.fill()):s.type==="confetti"&&(i.save(),i.translate(s.x,s.y),i.rotate(s.rotation),i.fillStyle=s.color,i.fillRect(-s.sizeW/2,-s.sizeH/2,s.sizeW,s.sizeH),i.restore());for(const s of this.flyingStars){const a=Math.min(1,s.t),l=1-a,o=l*l*s.x0+2*l*a*s.cx+a*a*s.x1,n=l*l*s.y0+2*l*a*s.cy+a*a*s.y1,r=16*(1.2+.4*Math.sin(a*Math.PI));i.save(),i.translate(o,n),i.rotate(s.spin),i.globalAlpha=.55,i.fillStyle="#FFE066",i.beginPath(),i.arc(0,0,r*1.5,0,Math.PI*2),i.fill(),i.globalAlpha=1,i.fillStyle="#FFD43B",i.strokeStyle="#F59F00",i.lineWidth=2,rt(i,0,0,5,r,r*.45),i.fill(),i.stroke(),i.restore()}i.restore()}}}function rt(e,i,t,s,a,l){let o=Math.PI/2*3,n=i,r=t;const c=Math.PI/s;e.beginPath(),e.moveTo(i,t-a);for(let h=0;h<s;h++)n=i+Math.cos(o)*a,r=t+Math.sin(o)*a,e.lineTo(n,r),o+=c,n=i+Math.cos(o)*l,r=t+Math.sin(o)*l,e.lineTo(n,r),o+=c;e.lineTo(i,t-a),e.closePath()}const ht=new Set(["critters","emoji","craft","blox","brawl"]);class ct{constructor(i){this.canvas=i,this.ctx=i.getContext("2d",{alpha:!1}),this.particles=new ot,this.width=1200,this.height=800,this.dpr=Math.min(2,window.devicePixelRatio||1),this.theme="critters",this.isLightRoom=!1,this.bgStars=[],this.initBgStars(),this.zzzTimer=0}initBgStars(){this.bgStars=[];for(let i=0;i<48;i++)this.bgStars.push({x:Math.random(),y:Math.random(),size:Math.random()*2+1,phase:Math.random()*Math.PI*2,speed:Math.random()*2+1.2})}resize(i,t){this.width=i,this.height=t,this.dpr=Math.min(2,window.devicePixelRatio||1),this.canvas.width=Math.floor(i*this.dpr),this.canvas.height=Math.floor(t*this.dpr),this.canvas.style.width=`${i}px`,this.canvas.style.height=`${t}px`,this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0)}setTheme(i){this.theme=i}setLightRoom(i){this.isLightRoom=i}render(i,t,s,a,l=null,o=null){const n=this.ctx,r=this.width,c=this.height;if(this.isLightRoom){const h=n.createLinearGradient(0,0,0,c);h.addColorStop(0,"#F8FAFC"),h.addColorStop(.5,"#F1F5F9"),h.addColorStop(1,"#E2E8F0"),n.fillStyle=h,n.fillRect(0,0,r,c),n.fillStyle="rgba(148, 163, 184, 0.08)",n.fillRect(0,c-40,r,40)}else{const h=n.createLinearGradient(0,0,0,c);h.addColorStop(0,"#0F122B"),h.addColorStop(.7,"#191538"),h.addColorStop(1,"#25133E"),n.fillStyle=h,n.fillRect(0,0,r,c),n.fillStyle="#FFFFFF";for(const d of this.bgStars){d.phase+=a*d.speed;const p=.2+.35*Math.sin(d.phase);n.globalAlpha=Math.max(0,p),n.beginPath(),n.arc(d.x*r,d.y*c,d.size,0,Math.PI*2),n.fill()}n.globalAlpha=1}if(t==="green"&&ht.has(this.theme)){if(this.zzzTimer+=a,this.zzzTimer>1.2&&i.balls.length>0){this.zzzTimer=0;const h=i.balls[Math.floor(Math.random()*i.balls.length)];h&&h.y>c*.35&&this.particles.spawnZzz(h.x,h.y-h.radius)}}else this.zzzTimer=0;for(const h of i.balls){const d=c-(h.y+h.radius);if(d<h.radius*2.8){const p=Math.max(0,1-d/(h.radius*2.8)),g=h.radius*(.8+.35*p),f=Math.max(2,h.radius*.24*p),y=(this.isLightRoom?.22:.42)*p;n.fillStyle=`rgba(0, 0, 0, ${y})`,n.beginPath(),n.ellipse(h.x,c-3,g,f,0,0,Math.PI*2),n.fill()}}for(const h of i.balls){switch(n.save(),n.translate(h.x,h.y),n.scale(h.scaleX,h.scaleY),this.theme){case"craft":Ke(n,h);break;case"blox":et(n,h);break;case"brawl":st(n,h);break;case"plastic":he(n,h);break;case"emoji":Ie(n,h);break;case"numbers":De(n,h);break;case"bubbles":Re(n,h);break;case"eyes":Le(n,h,l,o);break;case"space":Ze(n,h);break;case"critters":default:qe(n,h);break}n.restore()}this.particles.update(a),this.particles.render(n,this.isLightRoom)}}const te={uk:{appTitle:"Тихий клас",appSubtitle:"Візуальний шумомір та таймер тиші для роботи в класі.",startBtn:"Почати урок",micOn:"Мікрофон увімкнено",micOff:"Мікрофон вимкнено",micAllowHelp:"Дозвольте доступ до мікрофона в адресному рядку браузера",calibrateBtn:"Калібрувати кімнату (3 с)",calibrating:"Вимірювання фону кімнати...",sensitivity:"Чутливість",micDevice:"Пристрій мікрофона",micProfile:"Профіль мікрофона",profileWebcam:"Вебкамера (відстань 2–4 м)",profileLaptop:"Ноутбук / Вбудований",profileClose:"Близький / Гарнітура",micGain:"Підсилення сигналу (Preamp Gain)",ballCount:"Кількість кульок",theme:"Тема оформлення",alertSound:"Звук сповіщення",soundShush:"Шурхіт «Тссс»",soundBeep:"М'який «Біп»",soundNone:"Без звуку",volume:"Гучність звуків",lightRoom:"Світла кімната (для проектора)",fullscreen:"Повноекранний режим (F)",classProfile:"Клас",goal:"Ціль тижня",reward:"Нагорода",starAwarded:"Зірка отримана",goldenCombo:"Серія тиші: 2+ хв",timerFinished:"Час вийшов",tooNoisy:"Занадто гучно!",quietPlease:"Тихіше, будь ласка!",shush:"Тсссс!",modeQuiet:"Тиха робота",modeGroups:"Робота в групах",modeBreak:"Перерва / Класика",privacyNote:"Звук обробляється локально в браузері без запису та передачі на сервер.",hotkeysHelp:"Клавіші: Space (пауза), M (мікрофон), C (калібрування), F (екран), 1/2/3 (режими), T (таймер), S (+зірка), H (панель)"},en:{appTitle:"Quiet Class",appSubtitle:"Visual classroom noise meter and task timer.",startBtn:"Start Lesson",micOn:"Microphone ON",micOff:"Microphone OFF",micAllowHelp:"Allow microphone access in the browser address bar",calibrateBtn:"Calibrate Room (3s)",calibrating:"Sampling ambient floor...",sensitivity:"Sensitivity",micDevice:"Microphone Device",micProfile:"Microphone Profile",profileWebcam:"Webcam (2-4m distance)",profileLaptop:"Laptop / Built-in",profileClose:"Close / Headset",micGain:"Preamp Gain Boost",ballCount:"Ball count",theme:"Theme",alertSound:"Alert sound",soundShush:"Shush sound",soundBeep:"Soft beep",soundNone:"No sound",volume:"Sound volume",lightRoom:"Light room (for projector)",fullscreen:"Fullscreen (F)",classProfile:"Class",goal:"Weekly goal",reward:"Reward",starAwarded:"Star earned",goldenCombo:"Quiet streak: 2+ min",timerFinished:"Timer complete",tooNoisy:"Too noisy!",quietPlease:"Quiet, please!",shush:"Shhhh!",modeQuiet:"Quiet Work",modeGroups:"Group Work",modeBreak:"Break / Classic",privacyNote:"Audio is processed locally in the browser and never stored or transmitted.",hotkeysHelp:"Keys: Space (pause), M (mic), C (calibrate), F (fullscreen), 1/2/3 (modes), T (timer), S (+star), H (panel)"}};let dt="uk";function S(e){return te[dt]?.[e]||te.uk[e]||e}function N(e=!0){return e?`<svg class="ui-icon icon-mic on" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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
    </svg>`}function R(){return`<svg class="ui-icon icon-calibrate" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <circle cx="12" cy="12" r="6"></circle>
    <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
    <line x1="12" y1="2" x2="12" y2="5"></line>
    <line x1="12" y1="19" x2="12" y2="22"></line>
    <line x1="2" y1="12" x2="5" y2="12"></line>
    <line x1="19" y1="12" x2="22" y2="12"></line>
  </svg>`}function ut(){return`<svg class="ui-icon icon-gear" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>`}function ce(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
  </svg>`}function de(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <polygon points="6 4 20 12 6 20 6 4"></polygon>
  </svg>`}function ie(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1"></rect>
    <rect x="14" y="4" width="4" height="16" rx="1"></rect>
  </svg>`}function L(e=!0){return e?`<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="#FFD43B" stroke="#F59F00" stroke-width="1.5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>`:`<svg class="ui-icon icon-star" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>`}function pt(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"></path>
    <path d="M19 3v4"></path>
    <path d="M21 5h-4"></path>
  </svg>`}function ft(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>`}function gt(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="18" r="3"></circle>
    <circle cx="12" cy="7" r="4"></circle>
    <path d="M9 16l2-5"></path>
    <path d="M15 16l-2-5"></path>
  </svg>`}function q(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>`}function mt(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`}function yt(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>`}function bt(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`}function ue(){return`<svg class="ui-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="1 4 1 10 7 10"></polyline>
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
  </svg>`}function pe(){return`<svg class="ui-icon icon-lock" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`}function $(){return`<svg class="ui-icon icon-gift" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="20 12 20 22 4 22 4 12"></polyline>
    <rect x="2" y="7" width="20" height="5"></rect>
    <line x1="12" y1="22" x2="12" y2="7"></line>
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
  </svg>`}function vt(){return`<svg class="ui-icon icon-lab" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2v7.31L4.1 19.33A2 2 0 0 0 5.8 22h12.4a2 2 0 0 0 1.7-2.67L14 9.31V2"></path>
    <line x1="8.5" y1="2" x2="15.5" y2="2"></line>
    <line x1="14" y1="9.3" x2="10" y2="9.3"></line>
  </svg>`}function se(e=0,i=20){const t=Math.min(1,Math.max(0,e/Math.max(1,i))),s=22*t,a=33-s,l=[];return e>=1&&l.push('<circle cx="12" cy="31" r="1.5" fill="#FFFFFF"/>'),e>=2&&l.push('<polygon points="20,28 20.8,29.8 22.8,30.1 21.3,31.5 21.7,33.5 20,32.5 18.3,33.5 18.7,31.5 17.2,30.1 19.2,29.8" fill="#FFF3BF"/>'),e>=4&&l.push('<circle cx="25" cy="27" r="1.3" fill="#FFFFFF"/>'),e>=6&&l.push('<polygon points="14,23 14.7,24.5 16.5,24.8 15.2,26 15.6,27.7 14,26.8 12.4,27.7 12.8,26 11.5,24.8 13.3,24.5" fill="#FFE066"/>'),e>=8&&l.push('<circle cx="22" cy="21" r="1.6" fill="#FFFFFF"/>'),e>=12&&l.push('<polygon points="18,17 18.7,18.5 20.5,18.8 19.2,20 19.6,21.7 18,20.8 16.4,21.7 16.8,20 15.5,18.8 17.3,18.5" fill="#FFF9DB"/>'),e>=16&&l.push('<circle cx="13" cy="15" r="1.4" fill="#FFFFFF"/>'),e>=i&&l.push('<polygon points="22,13 22.7,14.5 24.5,14.8 23.2,16 23.6,17.7 22,16.8 20.4,17.7 20.8,16 19.5,14.8 21.3,14.5" fill="#FFFFFF"/>'),`<svg class="jar-glass-svg" viewBox="0 0 36 40" width="36" height="40">
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
  </svg>`}function St(e){switch(e){case"craft":return`<svg viewBox="0 0 40 40" width="38" height="38">
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
      </svg>`;default:return""}}function Mt(){return`<svg class="ui-icon icon-camera" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>`}function kt(){return`<svg class="ui-icon icon-laptop" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4" width="18" height="12" rx="2"></rect>
    <line x1="2" y1="20" x2="22" y2="20"></line>
  </svg>`}function wt(){return`<svg class="ui-icon icon-sliders" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>`}function Ft(){return`<svg class="ui-icon icon-volume" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>`}function Ct(){return`<svg class="ui-icon icon-timer" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="13" r="8"></circle>
    <polyline points="12 9 12 13 14.5 15"></polyline>
    <line x1="9" y1="2" x2="15" y2="2"></line>
  </svg>`}function P(e="right"){return`<svg class="ui-icon icon-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <polyline points="${{right:"9 6 15 12 9 18",left:"15 6 9 12 15 18",down:"6 9 12 15 18 9"}[e]||"9 6 15 12 9 18"}"></polyline>
  </svg>`}function Pt(){return`<svg class="ui-icon icon-edit" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20h9"></path>
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"></path>
  </svg>`}function Tt(){return`<svg class="ui-icon icon-palette" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2a10 10 0 1 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2z"></path>
    <circle cx="7.5" cy="10.5" r="1.3" fill="currentColor"></circle>
    <circle cx="12" cy="7" r="1.3" fill="currentColor"></circle>
    <circle cx="16.5" cy="10.5" r="1.3" fill="currentColor"></circle>
  </svg>`}function Bt(){return`<svg class="ui-icon icon-bell" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>`}function Et(){return`<svg class="ui-icon icon-sun" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path>
  </svg>`}function At(){return`<svg class="ui-icon icon-help" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>`}function ae(){return`<svg class="ui-icon icon-trophy" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 21h8M12 17v4"></path>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z"></path>
    <path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4"></path>
  </svg>`}function It(){return`<svg class="ui-icon icon-grip" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <circle cx="9" cy="6" r="1.6"></circle><circle cx="15" cy="6" r="1.6"></circle>
    <circle cx="9" cy="12" r="1.6"></circle><circle cx="15" cy="12" r="1.6"></circle>
    <circle cx="9" cy="18" r="1.6"></circle><circle cx="15" cy="18" r="1.6"></circle>
  </svg>`}function Dt(e){const i={1:"#FFD43B",2:"#CBD5E1",3:"#E8955A"}[e]||"#CBD5E1",t={1:"#7A4A00",2:"#334155",3:"#5C2A0A"}[e]||"#334155";return`<svg class="ui-icon icon-medal" viewBox="0 0 24 24" width="22" height="22">
    <path d="M7 2h4l2 6H9z" fill="#3B82F6"></path>
    <path d="M17 2h-4l-2 6h4z" fill="#EF4444"></path>
    <circle cx="12" cy="15" r="7" fill="${i}" stroke="${t}" stroke-opacity="0.35" stroke-width="1.2"></circle>
    <text x="12" y="18.6" text-anchor="middle" font-size="10" font-weight="800" font-family="Rubik, sans-serif" fill="${t}">${e}</text>
  </svg>`}let T=null;function b(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function v(){if(!T)return;const{el:e,onClose:i,cleanup:t}=T;T=null,t(),e.remove(),i?.()}function B(){return T?.el||null}function F({anchor:e,title:i,html:t,side:s="right",onMount:a,onClose:l,width:o=320}){v();const n=document.createElement("div");n.className="popover",n.style.width=`${o}px`,n.setAttribute("role","dialog"),n.innerHTML=`
    <div class="popover-header">
      <h3>${b(i)}</h3>
      <button class="popover-close" type="button" title="Закрити (Esc)">${q()}</button>
    </div>
    <div class="popover-body">${t}</div>
  `,document.body.appendChild(n),le(n,e,s);const r=d=>{n.contains(d.target)||e.contains(d.target)||v()},c=d=>{d.key==="Escape"&&v()},h=()=>le(n,e,s);return setTimeout(()=>document.addEventListener("pointerdown",r),0),document.addEventListener("keydown",c),window.addEventListener("resize",h),T={el:n,onClose:l,cleanup:()=>{document.removeEventListener("pointerdown",r),document.removeEventListener("keydown",c),window.removeEventListener("resize",h)}},n.querySelector(".popover-close").addEventListener("click",v),a?.(n),n}function le(e,i,t){const a=i.getBoundingClientRect(),l=e.offsetWidth,o=e.offsetHeight,n=window.innerWidth,r=window.innerHeight;let c,h;t==="below"?(c=a.left+a.width/2-l/2,h=a.bottom+12):t==="left"?(c=a.left-l-12,h=a.top+a.height/2-o/2):(c=a.right+12,h=a.top+a.height/2-o/2),(c<12||c+l>n-12)&&(c=(n-l)/2),h=Math.max(12,Math.min(h,r-o-12)),e.style.left=`${Math.round(Math.max(12,c))}px`,e.style.top=`${Math.round(h)}px`}const Rt=[1,2,3,5,10,15,20],ne=90,oe={green:"Тихо",yellow:"Шепіт",red:"Шумно!"};class Lt{constructor(i={}){this.callbacks=i,this.container=document.createElement("div"),this.container.className="hud-container",this.container.innerHTML=`
      <!-- Top Bar in TV Safe Area -->
      <div class="hud-top">
        <!-- Left: Noise Traffic Light -->
        <div class="hud-left">
          <div class="traffic-light-meter liquid-glass-surface" id="traffic-light" title="Зелений — тихо, жовтий — шепіт, червоний — шумно">
            <div class="traffic-dots">
              <div class="light-dot green active" title="Тиша (зелена зона)"></div>
              <div class="light-dot yellow" title="Шепіт (жовта зона)"></div>
              <div class="light-dot red" title="Шум (червона зона)"></div>
            </div>
            <span class="traffic-label zone-green" id="traffic-label">Тихо</span>
            <div class="sound-meter-wrap" id="sound-meter-wrap">
              <div class="meter-threshold-tick yellow-tick" title="Поріг жовтої зони"></div>
              <div class="meter-threshold-tick red-tick" title="Поріг червоної зони"></div>
              <div class="db-bar" id="db-bar"></div>
            </div>
            <button class="hud-icon-btn" id="cal-quick-btn" title="Запам'ятати тишу в класі (3 с)">
              ${R()}
            </button>
          </div>
        </div>

        <!-- Center: Interactive Liquid Glass Mode Switcher & Timer -->
        <div class="hud-center">
          <div class="mode-segmented-control liquid-glass-pillbar" id="hud-mode-control">
            <button class="hud-mode-tab liquid-glass-tab active" data-mode="quiet" title="Найсуворіше. Зірки за тишу (клавіша 1)">
              ${pt()}<span>Тиха робота</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="groups" title="Можна говорити впівголоса. Зірки теж є (клавіша 2)">
              ${ft()}<span>Групи</span>
            </button>
            <button class="hud-mode-tab liquid-glass-tab" data-mode="breaktime" title="Кульки стрибають від голосу. Без зірок (клавіша 3)">
              ${gt()}<span>Перерва</span>
            </button>
          </div>

          <button class="hud-timer-btn liquid-glass-surface" id="hud-timer-btn" title="Таймер завдання">
            ${Ct()}<span>Таймер</span>
          </button>

          <div class="timer-display liquid-glass-surface hidden" id="timer-display">
            <span class="timer-digits" id="timer-digits">05:00</span>
            <button class="timer-btn" id="timer-toggle-btn" title="Пауза / продовжити (T)">
              ${ie()}
            </button>
            <button class="timer-btn" id="timer-cancel-btn" title="Зупинити таймер">
              ${q()}
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
                ${se(0,20)}
              </div>
            </div>
            <div class="jar-text-info">
              <div class="jar-class-label" id="jar-class-label"></div>
              <div class="star-count-badge" id="star-count">
                ${L(!0)} <span id="star-numbers">0/20</span>
              </div>
              <div class="jar-reward-label" id="jar-reward-label">5 хв мультика</div>
            </div>
          </div>

          <button class="panel-toggle-btn liquid-glass-surface" id="panel-toggle-btn" title="Налаштування: мікрофон, звук, кульки (H)">
            ${ut()}
          </button>
        </div>
      </div>

      <!-- Big task timer the whole class can read -->
      <div class="big-timer hidden" id="big-timer">
        <div class="big-timer-digits" id="big-timer-digits">05:00</div>
        <div class="big-timer-bar"><span id="big-timer-fill"></span></div>
      </div>

      <!-- Large Alert Banner -->
      <div class="alert-banner hidden" id="alert-banner">
        <h2 id="alert-text">${S("shush")}</h2>
      </div>

      <!-- Golden Combo Banner -->
      <div class="golden-banner hidden" id="golden-banner">
        <span>${S("goldenCombo")}</span>
      </div>

      <!-- Microphone Permission Blocked Help Toast -->
      <div class="mic-blocked-toast hidden" id="mic-blocked-toast">
        <div class="toast-content">
          <span class="toast-icon">${pe()}</span>
          <div class="toast-text">
            <strong>Доступ до мікрофона заблоковано</strong>
            <p>Натисніть на значок замка в адресному рядку браузера та оберіть «Дозволити мікрофон».</p>
          </div>
        </div>
        <button class="toast-close-btn" id="toast-close-btn">${q()}</button>
      </div>

      <!-- Goal Achieved Modal -->
      <div class="goal-modal-overlay hidden" id="goal-modal">
        <div class="goal-modal-card">
          <h2>Ціль досягнуто!</h2>
          <p class="goal-modal-subtitle">Заслужена нагорода:</p>
          <div class="goal-modal-reward" id="goal-modal-reward">${$()} <span>5 хв мультика</span></div>
          <div class="goal-modal-actions">
            <button class="goal-action-btn primary" id="btn-goal-reset">
              ${ue()} Нова ціль
            </button>
            <button class="goal-action-btn secondary" id="btn-goal-close">
              Закрити
            </button>
          </div>
        </div>
      </div>
    `,document.body.appendChild(this.container),this.dotGreen=this.container.querySelector(".light-dot.green"),this.dotYellow=this.container.querySelector(".light-dot.yellow"),this.dotRed=this.container.querySelector(".light-dot.red"),this.dbBar=this.container.querySelector("#db-bar"),this.timerBtn=this.container.querySelector("#hud-timer-btn"),this.jarClassLabel=this.container.querySelector("#jar-class-label"),this.trafficLabel=this.container.querySelector("#traffic-label"),this.bigTimer=this.container.querySelector("#big-timer"),this.bigTimerDigits=this.container.querySelector("#big-timer-digits"),this.bigTimerFill=this.container.querySelector("#big-timer-fill"),this.lastTrafficText="",this.modeControl=this.container.querySelector("#hud-mode-control"),this.timerDisplay=this.container.querySelector("#timer-display"),this.timerDigits=this.container.querySelector("#timer-digits"),this.timerToggleBtn=this.container.querySelector("#timer-toggle-btn"),this.starRingFill=this.container.querySelector("#star-ring-fill"),this.starNumbers=this.container.querySelector("#star-numbers"),this.jarRewardLabel=this.container.querySelector("#jar-reward-label"),this.jarSvgSlot=this.container.querySelector("#jar-svg-slot"),this.jarWidget=this.container.querySelector("#star-jar-widget"),this.alertBanner=this.container.querySelector("#alert-banner"),this.alertText=this.container.querySelector("#alert-text"),this.goldenBanner=this.container.querySelector("#golden-banner"),this.micBlockedToast=this.container.querySelector("#mic-blocked-toast"),this.goalModal=this.container.querySelector("#goal-modal"),this.goalModalReward=this.container.querySelector("#goal-modal-reward"),this.alertTimer=null,this.alertPhrases=[S("shush"),S("quietPlease"),S("tooNoisy")],this.ringCircumference=2*Math.PI*23,this.starRingFill.style.strokeDasharray=`${this.ringCircumference} ${this.ringCircumference}`,this.starRingFill.style.strokeDashoffset=this.ringCircumference,this.bindEvents()}setClassName(i,t=""){this.jarClassLabel.textContent=i,this.jarClassLabel.style.setProperty("--class-color",t||"var(--ink)")}openTimerMenu(){F({anchor:this.timerBtn,side:"below",title:"Таймер завдання",width:300,html:`
        <div class="timer-chips">
          ${Rt.map(i=>`<button class="chip-btn" data-min="${i}">${i} хв</button>`).join("")}
        </div>
        <form class="timer-custom" id="timer-custom">
          <span class="field-label">Свій час:</span>
          <input type="number" class="num-input" id="timer-custom-min" min="1" max="${ne}" value="7" inputmode="numeric">
          <span class="field-label">хв</span>
          <button type="submit" class="action-btn">Старт</button>
        </form>
        <p class="popover-note">Коли час вийде, класу зарахується виконане завдання. Якщо весь час було тихо — ще й бонусна зірка.</p>
      `,onMount:i=>{i.querySelectorAll("[data-min]").forEach(t=>{t.addEventListener("click",()=>{v(),this.callbacks.onTimerStart?.(parseInt(t.dataset.min,10))})}),i.querySelector("#timer-custom").addEventListener("submit",t=>{t.preventDefault();const s=parseInt(i.querySelector("#timer-custom-min").value,10);s&&(v(),this.callbacks.onTimerStart?.(Math.max(1,Math.min(ne,s))))})}})}bindEvents(){this.modeControl.querySelectorAll(".hud-mode-tab").forEach(s=>{s.addEventListener("click",()=>{const a=s.dataset.mode;this.updateMode(a),this.callbacks.onModeChange&&this.callbacks.onModeChange(a)})}),this.container.querySelector("#cal-quick-btn").addEventListener("click",()=>{this.callbacks.onQuickCalibrate&&this.callbacks.onQuickCalibrate()}),this.container.querySelector("#panel-toggle-btn").addEventListener("click",()=>{this.callbacks.onPanelToggle&&this.callbacks.onPanelToggle()}),this.timerToggleBtn.addEventListener("click",()=>{this.callbacks.onTimerToggle&&this.callbacks.onTimerToggle()}),this.timerBtn.addEventListener("click",()=>this.openTimerMenu()),this.container.querySelector("#timer-cancel-btn").addEventListener("click",()=>{this.callbacks.onTimerCancel?.()}),this.container.querySelector("#toast-close-btn")?.addEventListener("click",()=>{this.micBlockedToast.classList.add("hidden")}),this.container.querySelector("#btn-goal-close")?.addEventListener("click",()=>{this.goalModal.classList.add("hidden")}),this.container.querySelector("#btn-goal-reset")?.addEventListener("click",()=>{this.goalModal.classList.add("hidden"),this.callbacks.onResetGoal&&this.callbacks.onResetGoal()})}updateNoiseMeter(i,t,s,a){this.dotGreen.classList.toggle("active",i==="green"),this.dotYellow.classList.toggle("active",i==="yellow"),this.dotRed.classList.toggle("active",i==="red");const l=s?"Слухаю…":oe[i]||oe.green;if(l!==this.lastTrafficText&&(this.lastTrafficText=l,this.trafficLabel.textContent=l,this.trafficLabel.className=`traffic-label zone-${s?"yellow":i}`),s)this.dbBar.style.width=`${Math.round(a*100)}%`,this.dbBar.style.background="var(--zone-yellow)";else{const o=Math.min(100,Math.round(t/1.5*100));this.dbBar.style.width=`${o}%`,i==="red"?this.dbBar.style.background="var(--zone-red)":i==="yellow"?this.dbBar.style.background="var(--zone-yellow)":this.dbBar.style.background="var(--zone-green)"}}updateMode(i){this.modeControl.querySelectorAll(".hud-mode-tab").forEach(t=>{t.classList.toggle("active",t.dataset.mode===i)})}updateTimer(i,t,s=0){if(i<=0&&!t){this.timerDisplay.classList.add("hidden"),this.bigTimer.classList.add("hidden"),this.timerBtn.classList.remove("hidden"),this.lastTimerState=null;return}this.timerDisplay.classList.remove("hidden"),this.bigTimer.classList.remove("hidden"),this.timerBtn.classList.add("hidden");const a=Math.ceil(i),l=Math.floor(a/60),o=a%60,n=`${String(l).padStart(2,"0")}:${String(o).padStart(2,"0")}`;this.timerDigits.textContent=n,this.bigTimerDigits.textContent=n;const r=s>0?Math.max(0,Math.min(100,i/s*100)):100;this.bigTimerFill.style.width=`${r}%`,this.bigTimer.classList.toggle("paused",!t),this.bigTimer.classList.toggle("ending",t&&i<=10),this.lastTimerState!==t&&(this.lastTimerState=t,this.timerToggleBtn.innerHTML=t?ie():de())}updateStars(i,t,s,a,l=""){this.starNumbers.textContent=`${i}/${t}`,l&&(this.jarRewardLabel.textContent=l);const o=this.ringCircumference-s*this.ringCircumference;this.starRingFill.style.strokeDashoffset=o,this.jarSvgSlot.innerHTML=se(i,t),this.goldenBanner.classList.toggle("hidden",!a)}triggerJarBounce(){this.jarWidget.classList.remove("jar-pop"),this.jarWidget.offsetWidth,this.jarWidget.classList.add("jar-pop")}triggerScreenShake(){document.body.classList.remove("screen-shake"),document.body.offsetWidth,document.body.classList.add("screen-shake"),setTimeout(()=>{document.body.classList.remove("screen-shake")},450)}showAlert(i=null){clearTimeout(this.alertTimer);const t=i||this.alertPhrases[Math.floor(Math.random()*this.alertPhrases.length)];this.alertText.textContent=t,this.alertBanner.classList.remove("hidden"),this.alertBanner.classList.remove("pop-out"),this.alertBanner.classList.add("pop-in"),this.alertTimer=setTimeout(()=>{this.alertBanner.classList.remove("pop-in"),this.alertBanner.classList.add("pop-out"),setTimeout(()=>{this.alertBanner.classList.add("hidden")},350)},2200)}showGoalReachedModal(i,t=null){t&&(this.callbacks.onResetGoal=t),v(),this.goalModalReward.innerHTML=`${$()} <span>${b(i||"Нагорода")}</span>`,this.goalModal.classList.remove("hidden")}showMicBlockedHelp(){this.micBlockedToast.classList.remove("hidden")}getJarMouthCoords(){const i=this.jarWidget.getBoundingClientRect();return{x:i.left+i.width*.35,y:i.top+i.height*.45}}}const j=[{id:"craft",title:"Крафт-Куби",sub:"Піксель-світ"},{id:"blox",title:"Блокс-Герої",sub:"Оббі-аватари"},{id:"brawl",title:"Бійці Арени",sub:"Зіркова ліга"},{id:"critters",title:"Сплюшки",sub:"Монстрики"},{id:"space",title:"Космос",sub:"Планети"},{id:"bubbles",title:"Бульбашки",sub:"Лопаються"},{id:"emoji",title:"Емоджі",sub:"Міміка"},{id:"plastic",title:"Глянець",sub:"Кулі"},{id:"numbers",title:"Числа",sub:"1 — 10"},{id:"eyes",title:"Очі",sub:"Курсор"}],z=[{id:"shush",title:"Тссс!"},{id:"beep",title:"Радар"},{id:"bell",title:"Дзвоник"},{id:"arcade",title:"Аркада"},{id:"none",title:"Без звуку"}],H=[{sec:2,title:"Кожні 2 с"},{sec:4,title:"Кожні 4 с"},{sec:8,title:"Кожні 8 с"},{sec:0,title:"1 раз"}],qt=[{id:"webcam",title:"Вебкамера",hint:"Камера на дошці, 2–4 м від дітей",icon:()=>Mt()},{id:"laptop",title:"Ноутбук",hint:"Вбудований мікрофон",icon:()=>kt()},{id:"close",title:"Гарнітура",hint:"Мікрофон поруч із вчителем",icon:()=>N(!0)}],$t=[["H","Відкрити / закрити налаштування"],["1 / 2 / 3","Тиха робота / Групи / Перерва"],["S","+1 зірка активному класу"],["T","Пауза / продовжити таймер"],["C","Калібрувати тишу (3 с)"],["M","Мікрофон увімк. / вимк."],["F","Повний екран"],["Space","Зупинити кульки"]];function re(e){return e===0?"Звичайна":e>0?`Суворіше +${e}`:`М'якше ${e}`}class Gt{constructor(i,t){this.state=i,this.callbacks=t,this.isListening=!1,this.isCalibrating=!1,this.devices=[],this.panel=document.createElement("div"),this.panel.className="teacher-panel closed",this.render(),document.body.appendChild(this.panel),this.bindEvents()}$(i){return this.panel.querySelector(i)||B()?.querySelector(i)||null}render(){const i=this.state.settings;this.panel.innerHTML=`
      <div class="panel-header">
        <h2>Налаштування</h2>
        <button class="panel-close-btn" id="btn-close-panel" title="Закрити (H)">
          ${q()}
        </button>
      </div>

      <div class="panel-body">
        <!-- 1. Microphone: the only thing that must work before the lesson -->
        <section class="panel-card">
          <div class="panel-card-head">
            <span class="panel-card-title">Мікрофон</span>
            <span class="mic-pill" id="mic-pill">Вимкнено</span>
          </div>
          <div class="mini-meter" title="Як голосно зараз у класі">
            <div class="mini-meter-fill" id="mini-meter-fill"></div>
          </div>
          <div class="btn-row">
            <button class="action-btn" id="btn-toggle-mic">
              ${N(!0)} <span>Увімкнути</span>
            </button>
            <button class="action-btn secondary" id="btn-calibrate" title="Попросіть клас помовчати 3 секунди">
              ${R()} <span>Запам'ятати тишу</span>
            </button>
          </div>
          <button class="row-link" id="row-mic-advanced">
            ${wt()} <span>Який мікрофон і підсилення</span> ${P("right")}
          </button>
        </section>

        <!-- 2. Sensitivity -->
        <section class="panel-card">
          <div class="slider-header">
            <span class="panel-card-title">Чутливість до шуму</span>
            <span class="slider-val" id="val-sensitivity">${re(i.sensitivity)}</span>
          </div>
          <input type="range" class="slider" id="slider-sensitivity" min="-15" max="15" step="1" value="${i.sensitivity}">
          <div class="slider-hints">
            <span>Дозволяє шуміти</span>
            <span>Реагує на шепіт</span>
          </div>
        </section>

        <!-- 3. Everything else: one-line rows that open a popover -->
        <section class="panel-list">
          <button class="list-row" id="row-theme">
            <span class="list-row-icon">${Tt()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Кульки</span>
              <span class="list-row-value" id="row-theme-value">${this.themeSummary()}</span>
            </span>
            ${P("right")}
          </button>

          <button class="list-row" id="row-sound">
            <span class="list-row-icon">${Bt()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Сигнал, коли шумно</span>
              <span class="list-row-value" id="row-sound-value">${this.soundSummary()}</span>
            </span>
            ${P("right")}
          </button>

          <label class="list-row">
            <span class="list-row-icon">${Et()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Світлий екран</span>
              <span class="list-row-value">Для яскравого проектора</span>
            </span>
            <input type="checkbox" class="switch" id="check-light-room" ${i.lightRoom?"checked":""}>
          </label>

          <button class="list-row" id="btn-fullscreen">
            <span class="list-row-icon">${ce()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Повний екран</span>
              <span class="list-row-value">Клавіша F</span>
            </span>
          </button>

          <button class="list-row" id="row-help">
            <span class="list-row-icon">${At()}</span>
            <span class="list-row-text">
              <span class="list-row-title">Як це працює</span>
              <span class="list-row-value">Підказки та клавіші</span>
            </span>
            ${P("right")}
          </button>
        </section>

        <div class="panel-footer">
          <p class="privacy-text">${pe()} <span>${S("privacyNote")}</span></p>
          <p class="hotkeys-text">Автор: <a href="https://sivochka.com/uk/tutoring/" target="_blank" rel="noopener">Ігор Сівочка — уроки IT та 3D ↗</a></p>
        </div>
      </div>
    `}themeSummary(){return`${(j.find(t=>t.id===this.state.settings.theme)||j[0]).title} · ${this.state.settings.balls} шт.`}soundSummary(){const i=this.state.settings,t=z.find(a=>a.id===i.alertSound)||z[0];if(t.id==="none")return t.title;const s=H.find(a=>a.sec===(i.alertRepeatSec??4))||H[1];return`${t.title} · ${s.title.toLowerCase()} · ${Math.round(i.volume*100)}%`}bindEvents(){this.panel.querySelector("#btn-close-panel").addEventListener("click",()=>this.toggle(!1)),this.panel.querySelector("#btn-toggle-mic").addEventListener("click",()=>this.callbacks.onMicToggle()),this.panel.querySelector("#btn-calibrate").addEventListener("click",()=>this.callbacks.onCalibrate());const i=this.panel.querySelector("#slider-sensitivity"),t=this.panel.querySelector("#val-sensitivity");i.addEventListener("input",()=>{const s=parseInt(i.value,10);t.textContent=re(s),this.callbacks.onSensitivity(s)}),this.panel.querySelector("#row-mic-advanced").addEventListener("click",s=>this.openMicPopover(s.currentTarget)),this.panel.querySelector("#row-theme").addEventListener("click",s=>this.openThemePopover(s.currentTarget)),this.panel.querySelector("#row-sound").addEventListener("click",s=>this.openSoundPopover(s.currentTarget)),this.panel.querySelector("#row-help").addEventListener("click",s=>this.openHelpPopover(s.currentTarget)),this.panel.querySelector("#check-light-room").addEventListener("change",s=>{this.callbacks.onLightRoom(s.target.checked)}),this.panel.querySelector("#btn-fullscreen").addEventListener("click",()=>this.callbacks.onFullscreen())}openThemePopover(i){const t=this.state.settings;F({anchor:i,side:"left",title:"Кульки",width:380,html:`
        <div class="themes-grid">
          ${j.map(s=>`
            <button class="theme-card ${t.theme===s.id?"active":""}" data-theme="${s.id}">
              <div class="theme-card-icon">${St(s.id)}</div>
              <div class="theme-card-info">
                <span class="theme-title">${s.title}</span>
                <span class="theme-sub">${s.sub}</span>
              </div>
            </button>
          `).join("")}
        </div>
        <div class="slider-header">
          <span class="field-label">Скільки кульок</span>
          <span class="slider-val" id="val-balls">${t.balls}</span>
        </div>
        <input type="range" class="slider" id="slider-balls" min="10" max="150" step="5" value="${t.balls}">
      `,onMount:s=>{s.querySelectorAll(".theme-card").forEach(o=>{o.addEventListener("click",()=>{s.querySelectorAll(".theme-card").forEach(n=>n.classList.toggle("active",n===o)),this.callbacks.onTheme(o.dataset.theme),this.refreshSummaries()})});const a=s.querySelector("#slider-balls"),l=s.querySelector("#val-balls");a.addEventListener("input",()=>{const o=parseInt(a.value,10);l.textContent=o,this.callbacks.onBalls(o),this.refreshSummaries()})}})}openSoundPopover(i){const t=this.state.settings,s=t.alertRepeatSec??4;F({anchor:i,side:"left",title:"Сигнал, коли шумно",html:`
        <span class="field-label">Звук (натисніть, щоб почути)</span>
        <div class="choice-grid" id="sound-control">
          ${z.map(a=>`
            <button class="choice-btn ${t.alertSound===a.id?"active":""}" data-sound="${a.id}">${a.title}</button>
          `).join("")}
        </div>

        <span class="field-label">Повторювати, поки шумно</span>
        <div class="liquid-glass-pillbar panel-pillbar" id="repeat-control">
          ${H.map(a=>`
            <button class="liquid-glass-tab ${s===a.sec?"active":""}" data-repeat="${a.sec}">${a.title}</button>
          `).join("")}
        </div>

        <div class="slider-header">
          <span class="field-label">Гучність</span>
          <span class="slider-val" id="val-volume">${Math.round(t.volume*100)}%</span>
        </div>
        <input type="range" class="slider" id="slider-volume" min="0" max="1.2" step="0.05" value="${t.volume}">
        <button class="action-btn secondary full-width" id="btn-preview-sound">${Ft()} <span>Прослухати</span></button>
      `,onMount:a=>{a.querySelectorAll("[data-sound]").forEach(n=>{n.addEventListener("click",()=>{a.querySelectorAll("[data-sound]").forEach(r=>r.classList.toggle("active",r===n)),this.callbacks.onSound(n.dataset.sound,!0),this.refreshSummaries()})}),a.querySelectorAll("[data-repeat]").forEach(n=>{n.addEventListener("click",()=>{a.querySelectorAll("[data-repeat]").forEach(r=>r.classList.toggle("active",r===n)),this.callbacks.onRepeatChange?.(parseInt(n.dataset.repeat,10)),this.refreshSummaries()})});const l=a.querySelector("#slider-volume"),o=a.querySelector("#val-volume");l.addEventListener("input",()=>{const n=parseFloat(l.value);o.textContent=`${Math.round(n*100)}%`,this.callbacks.onVolume(n,!1),this.refreshSummaries()}),l.addEventListener("change",()=>this.callbacks.onVolume(parseFloat(l.value),!0)),a.querySelector("#btn-preview-sound").addEventListener("click",()=>{this.callbacks.onSound(this.state.settings.alertSound,!0)})}})}openMicPopover(i){const t=this.state.settings,s=t.micGain?Number(t.micGain):2.2;F({anchor:i,side:"left",title:"Мікрофон",width:340,html:`
        <label class="field">
          <span class="field-label">Пристрій</span>
          <select class="select-input" id="select-mic-device"></select>
        </label>

        <span class="field-label">Де стоїть мікрофон</span>
        <div class="profile-list">
          ${qt.map(a=>`
            <button class="profile-row profile-chip-btn ${t.micProfile===a.id?"active":""}" data-profile="${a.id}">
              ${a.icon()}
              <span><b>${a.title}</b><small>${a.hint}</small></span>
            </button>
          `).join("")}
        </div>

        <div class="slider-header">
          <span class="field-label">Підсилення</span>
          <span class="slider-val" id="val-gain">${s.toFixed(1)}×</span>
        </div>
        <input type="range" class="slider" id="slider-gain" min="0.5" max="4.5" step="0.1" value="${s}">
        <div class="slider-hints"><span>Тихіше</span><span>Голосніше</span></div>

        <div class="mic-test-wrap">
          <div class="mic-test-header">
            <span>Рівень зараз</span>
            <span id="mic-test-db">Вимк.</span>
          </div>
          <div class="mic-vu-bar-bg">
            <div class="mic-vu-bar-fill" id="mic-vu-fill"></div>
          </div>
          <div class="mic-status-hint">
            <span>Фон тиші: <strong id="hint-ambient">${Math.round(t.ambientBaselineDb||-55)} dB</strong></span>
          </div>
        </div>
      `,onMount:a=>{this.fillDeviceSelect(a.querySelector("#select-mic-device")),a.querySelector("#select-mic-device").addEventListener("change",o=>{this.callbacks.onDeviceChange?.(o.target.value)}),a.querySelectorAll(".profile-chip-btn").forEach(o=>{o.addEventListener("click",()=>{this.setProfileState(o.dataset.profile),this.callbacks.onProfileChange?.(o.dataset.profile)})});const l=a.querySelector("#slider-gain");l.addEventListener("input",()=>{const o=parseFloat(l.value);a.querySelector("#val-gain").textContent=`${o.toFixed(1)}×`,this.callbacks.onGainChange?.(o)})}})}openHelpPopover(i){F({anchor:i,side:"left",title:"Як це працює",width:360,html:`
        <ol class="help-steps">
          <li><b>Оберіть клас</b> зліва. У кожного класу своя банка зірок і свій приз.</li>
          <li><b>Увімкніть мікрофон</b> і натисніть «Запам'ятати тишу», поки клас мовчить.</li>
          <li><b>Оберіть режим</b> зверху: Тиха робота, Групи чи Перерва.</li>
          <li>Кожні <b>30 секунд тиші</b> — зірка в банку (у класі можна зробити 60 чи 90 с). Набрали ціль — отримали приз.</li>
        </ol>
        <span class="field-label">Клавіші</span>
        <dl class="hotkey-list">
          ${$t.map(([t,s])=>`<dt><kbd>${b(t)}</kbd></dt><dd>${b(s)}</dd>`).join("")}
        </dl>
      `})}refreshSummaries(){const i=this.panel.querySelector("#row-theme-value"),t=this.panel.querySelector("#row-sound-value");i&&(i.textContent=this.themeSummary()),t&&(t.textContent=this.soundSummary())}fillDeviceSelect(i){if(!i)return;const t=this.state.settings.micDeviceId||"";i.innerHTML=['<option value="">Системний за замовчуванням</option>',...this.devices.map((s,a)=>{const l=b(s.label||`Мікрофон ${a+1}`),o=s.deviceId===t?"selected":"";return`<option value="${b(s.deviceId)}" ${o}>${l}</option>`})].join("")}toggle(i=null){const t=this.panel.classList.contains("closed"),s=i!==null?!i:!t;this.panel.classList.toggle("closed",s)}get isOpen(){return!this.panel.classList.contains("closed")}populateAudioDevices(i,t=""){this.devices=i||[],t&&(this.state.settings.micDeviceId=t),this.fillDeviceSelect(this.$("#select-mic-device"))}setGainValue(i){const t=this.$("#slider-gain"),s=this.$("#val-gain");t&&(t.value=i),s&&(s.textContent=`${Number(i).toFixed(1)}×`)}setProfileState(i){B()?.querySelectorAll(".profile-chip-btn").forEach(t=>{t.classList.toggle("active",t.dataset.profile===i)})}updateMicLiveMeter(i,t,s,a,l,o=!0){if(!this.isOpen&&!B())return;const n=this.panel.querySelector("#mini-meter-fill"),r=this.$("#mic-vu-fill"),c=this.$("#mic-test-db"),h=this.$("#hint-ambient");if(h&&(h.textContent=`${Math.round(s)} dB`),!o){c&&(c.textContent="Вимк."),r&&(r.style.width="0%"),n&&(n.style.width="0%");return}const d=-75,g=Math.max(0,Math.min(100,(t-d)/(-15-d)*100));let f="var(--zone-green)";t>=l?f="var(--zone-red)":t>=a&&(f="var(--zone-yellow)");for(const y of[r,n])y&&(y.style.width=`${g}%`,y.style.background=f);c&&(c.textContent=`${Math.round(t)} dB`)}setMicButtonState(i){this.isListening=i;const t=this.panel.querySelector("#btn-toggle-mic");t&&(t.innerHTML=`${N(!i)} <span>${i?"Вимкнути":"Увімкнути"}</span>`,t.classList.toggle("secondary",i));const s=this.panel.querySelector("#mic-pill");s&&(s.textContent=i?"Слухає клас":"Вимкнено",s.classList.toggle("on",i))}setCalibrateButtonState(i){this.isCalibrating=i;const t=this.panel.querySelector("#btn-calibrate");t&&(t.innerHTML=`${R()} <span>${i?"Тиша… слухаю":"Запам'ятати тишу"}</span>`,t.classList.toggle("active",i))}}const O=5;function Vt(e){const i=new Date(e);return Number.isNaN(i.getTime())?"":`${String(i.getDate()).padStart(2,"0")}.${String(i.getMonth()+1).padStart(2,"0")}`}class jt{constructor(i,t){this.state=i,this.callbacks=t,this.isAdding=!1,this.editingClass=null,this.drag=null,this.el=document.createElement("aside"),this.el.className="class-sidebar liquid-glass-surface",document.body.appendChild(this.el),this.el.addEventListener("click",s=>this.onClick(s)),this.el.addEventListener("pointerdown",s=>this.onDragStart(s)),this.render()}get collapsed(){return!!this.state.settings.sidebarCollapsed}get sortByStars(){return this.state.settings.sidebarSort==="stars"}orderedNames(){const{classes:i}=this.state,t=Object.keys(i);return this.sortByStars?t.map((s,a)=>({n:s,i:a,t:i[s].totalStars||0})).sort((s,a)=>a.t-s.t||s.i-a.i).map(s=>s.n):t}render(){const{classes:i,activeClass:t}=this.state,s=Pe(i);if(this.el.classList.toggle("collapsed",this.collapsed),this.el.classList.toggle("sorted",this.sortByStars),this.el.innerHTML=`
      <div class="sidebar-head">
        <span class="sidebar-title">${this.sortByStars?"Рейтинг класів":"Мої класи"}</span>
        <button class="sidebar-head-btn ${this.sortByStars?"active":""}" data-action="sort"
          title="${this.sortByStars?"Повернути мій порядок (можна перетягувати)":"Показати рейтинг: хто зібрав найбільше зірок"}">
          ${ae()}
        </button>
        <button class="sidebar-head-btn" data-action="collapse" title="${this.collapsed?"Розгорнути список":"Згорнути список"}">
          ${P(this.collapsed?"right":"left")}
        </button>
      </div>

      <div class="sidebar-list">
        ${this.orderedNames().map(a=>this.renderCard(a,i[a],a===t,s[a])).join("")}
      </div>

      ${this.isAdding&&!this.collapsed?`
        <form class="sidebar-add-form">
          <input type="text" class="text-input" id="sidebar-new-class" maxlength="${D}" placeholder="Напр. 5-А або Роботи" autocomplete="off">
          <button type="submit" class="sidebar-add-ok" title="Додати">${bt()}</button>
        </form>
      `:`
        <button class="sidebar-add-btn" data-action="add" title="Додати клас або гурток">
          ${mt()} <span>Додати</span>
        </button>
      `}
    `,this.isAdding){const a=this.el.querySelector("#sidebar-new-class");a?.focus(),a?.addEventListener("keydown",l=>{l.key==="Escape"&&(this.isAdding=!1,this.render())}),this.el.querySelector(".sidebar-add-form")?.addEventListener("submit",l=>{l.preventDefault();const o=(a?.value||"").trim();o&&(this.callbacks.onAdd(o)?(this.isAdding=!1,this.render()):(a.classList.add("input-error"),a.select()))})}}renderCard(i,t,s,a){const l=t.stars||0,o=t.goal||20,n=Math.min(100,Math.round(l/o*100)),r=b(i);return`
      <div class="class-card ${s?"active":""} ${l>=o?"complete":""}" data-class="${r}" style="--class-color:${b(t.color)}">
        ${this.sortByStars?"":`<span class="class-card-grip" title="Перетягніть, щоб змінити порядок">${It()}</span>`}
        <button class="class-card-main" data-action="select" title="${s?"Активний клас":`Перемкнути на ${r}`}">
          <span class="class-card-top">
            ${a?`<span class="class-card-medal" title="${a} місце за зірками">${Dt(a)}</span>`:""}
            <span class="class-card-name">${r}</span>
          </span>
          <span class="class-card-meter">
            <span class="class-card-progress"><span style="width:${n}%"></span></span>
            <span class="class-card-stars" title="Зірок у банці / ціль">${L(!0)}<b>${l}</b><small>/${o}</small></span>
          </span>
          <span class="class-card-bottom">
            <span class="class-card-reward">${$()}<span>${b(t.reward)}</span></span>
            <span class="class-card-total" title="Зірок за весь час">${ae()}${t.totalStars||0}</span>
          </span>
        </button>
        <button class="class-card-edit" data-action="edit" title="Ціль, приз і статистика ${r}">
          ${Pt()}
        </button>
      </div>
    `}onClick(i){const t=i.target.closest("[data-action]");if(!t)return;const s=t.closest(".class-card"),a=s&&Object.hasOwn(this.state.classes,s.dataset.class)?s.dataset.class:null;switch(t.dataset.action){case"collapse":v(),this.callbacks.onCollapseChange(!this.collapsed),this.render();break;case"sort":v(),this.callbacks.onSortChange(this.sortByStars?"manual":"stars"),this.render();break;case"add":this.collapsed&&this.callbacks.onCollapseChange(!1),this.isAdding=!0,this.render();break;case"select":a&&a!==this.state.activeClass&&this.callbacks.onSelect(a);break;case"edit":if(!a)return;a!==this.state.activeClass&&this.callbacks.onSelect(a),this.openEditor();break}}onDragStart(i){const t=i.target.closest(".class-card-grip");if(!t||this.sortByStars)return;const s=t.closest(".class-card"),a=this.el.querySelector(".sidebar-list");if(!s||!a)return;i.preventDefault(),v(),s.classList.add("dragging"),this.drag={card:s,startIndex:[...a.children].indexOf(s)};const l=n=>{if(n.pointerId!==i.pointerId)return;const c=[...a.children].filter(h=>h!==s).find(h=>{const d=h.getBoundingClientRect();return n.clientY<d.top+d.height/2});a.insertBefore(s,c||null)},o=n=>{if(n.pointerId!==i.pointerId)return;window.removeEventListener("pointermove",l),window.removeEventListener("pointerup",o),window.removeEventListener("pointercancel",o),s.classList.remove("dragging");const r=[...a.children].indexOf(s),{startIndex:c}=this.drag;this.drag=null,r!==-1&&r!==c&&this.callbacks.onReorder(s.dataset.class,r),this.render()};window.addEventListener("pointermove",l),window.addEventListener("pointerup",o),window.addEventListener("pointercancel",o)}openEditor(){const i=this.state.activeClass,t=this.state.classes[i],s=this.findCard(i);if(!t||!s)return;const a=Object.keys(this.state.classes).length>1;this.editingClass=i,F({anchor:s,side:"right",title:"Налаштування класу",width:360,html:`
        <div class="field-row">
          <label class="field field-grow">
            <span class="field-label">Назва</span>
            <input type="text" class="text-input" id="ce-name" maxlength="${D}" value="${b(i)}">
          </label>
        </div>

        <div class="field">
          <span class="field-label">Колір</span>
          <div class="color-swatches">
            ${M.map(l=>`
              <button type="button" class="color-swatch ${t.color===l?"active":""}" data-color="${l}" style="--swatch:${l}" title="Обрати колір"></button>
            `).join("")}
          </div>
        </div>

        <div class="field-row">
          <label class="field">
            <span class="field-label">Ціль (зірок)</span>
            <div class="stepper">
              <button type="button" class="stepper-btn" data-step="-5">−</button>
              <input type="number" class="num-input" id="ce-goal" min="3" max="200" value="${t.goal}">
              <button type="button" class="stepper-btn" data-step="5">+</button>
            </div>
          </label>
          <label class="field field-grow">
            <span class="field-label">Приз</span>
            <input type="text" class="text-input" id="ce-reward" maxlength="40" value="${b(t.reward)}" placeholder="5 хв мультика">
          </label>
        </div>

        <div class="field">
          <span class="field-label">Одна зірка за … тиші</span>
          <div class="liquid-glass-pillbar panel-pillbar" id="ce-speed">
            ${k.map(l=>`
              <button type="button" class="liquid-glass-tab ${t.secondsPerStar===l?"active":""}" data-speed="${l}">
                ${l} с${l===k[0]?" (легко)":l===k[k.length-1]?" (важко)":""}
              </button>
            `).join("")}
          </div>
        </div>

        <div class="jar-now">
          <div class="jar-now-count">${L(!0)} <b id="ce-stars">${t.stars}</b> / <span id="ce-goal-label">${t.goal}</span></div>
          <button type="button" class="chip-btn-gold" id="ce-add-star" title="Клавіша S">+1 зірка</button>
        </div>

        <div class="class-stats-strip">
          <div class="stat-cell"><span class="stat-val" id="ce-total">${t.totalStars||0}</span><span class="stat-lbl">Усього зірок</span></div>
          <button type="button" class="stat-cell stat-cell-interactive" id="ce-add-task" title="Зарахувати виконане завдання">
            <span class="stat-val-row"><span class="stat-val" id="ce-tasks">${t.tasksCompleted||0}</span><span class="stat-plus-badge">+1</span></span>
            <span class="stat-lbl">Завдань</span>
          </button>
          <div class="stat-cell"><span class="stat-val" id="ce-goals">${t.goalsReached||0}</span><span class="stat-lbl">Призів</span></div>
          <div class="stat-cell"><span class="stat-val" id="ce-quiet">${Math.floor((t.quietSeconds||0)/60)}</span><span class="stat-lbl">Хв тиші</span></div>
        </div>

        <div class="field">
          <span class="field-label">Отримані призи</span>
          <ul class="prize-history" id="ce-history">${this.renderHistory(t)}</ul>
        </div>

        <div class="popover-actions">
          <button type="button" class="action-btn secondary" id="ce-reset" title="Банка стане порожньою. Загальна статистика залишиться.">
            ${ue()} <span>Нова банка (0 зірок)</span>
          </button>
          ${a?`<button type="button" class="icon-danger-btn" id="ce-delete" title="Видалити клас">${yt()}</button>`:""}
        </div>
      `,onMount:l=>this.bindEditor(l,i),onClose:()=>{this.editingClass=null}})}renderHistory(i){const t=i.prizeHistory||[];if(t.length===0)return`<li class="prize-history-empty">Ще немає. Наберіть ціль — і приз з'явиться тут.</li>`;const s=t.slice(0,O).map(l=>`
      <li>${$()}<span>${b(l.reward)}</span><time>${Vt(l.date)}</time></li>
    `).join(""),a=t.length>O?`<li class="prize-history-empty">і ще ${t.length-O}…</li>`:"";return s+a}bindEditor(i,t){let s=t;const a=i.querySelector("#ce-name"),l=i.querySelector("#ce-goal"),o=i.querySelector("#ce-reward");a.addEventListener("change",()=>{a.value.trim()!==s&&(this.callbacks.onRename(s,a.value)?(s=this.state.activeClass,this.editingClass=s,a.value=s,a.classList.remove("input-error"),this.render()):a.classList.add("input-error"))}),a.addEventListener("keydown",r=>{r.key==="Enter"&&a.blur()}),i.querySelectorAll(".color-swatch").forEach(r=>{r.addEventListener("click",()=>{i.querySelectorAll(".color-swatch").forEach(c=>c.classList.toggle("active",c===r)),this.callbacks.onColorChange(r.dataset.color),this.render()})}),i.querySelectorAll("[data-speed]").forEach(r=>{r.addEventListener("click",()=>{i.querySelectorAll("[data-speed]").forEach(c=>c.classList.toggle("active",c===r)),this.callbacks.onStarSpeedChange(parseInt(r.dataset.speed,10))})});const n=()=>{const r=Math.max(3,Math.min(200,parseInt(l.value,10)||20));l.value=r,this.callbacks.onGoalChange(r,o.value.trim()||"Нагорода"),this.render(),this.refreshEditor()};l.addEventListener("change",n),o.addEventListener("change",n),i.querySelectorAll(".stepper-btn").forEach(r=>{r.addEventListener("click",()=>{l.value=(parseInt(l.value,10)||20)+parseInt(r.dataset.step,10),n()})}),i.querySelector("#ce-add-star").addEventListener("click",()=>this.callbacks.onAddStar()),i.querySelector("#ce-add-task").addEventListener("click",()=>this.callbacks.onAddTask()),i.querySelector("#ce-reset").addEventListener("click",()=>this.callbacks.onResetStars()),i.querySelector("#ce-delete")?.addEventListener("click",()=>{window.confirm(`Видалити «${s}» разом зі зірками та статистикою?`)&&(v(),this.callbacks.onDelete(s))})}refreshEditor(){const i=B(),t=this.state.classes[this.state.activeClass];if(!i||!t||!i.querySelector("#ce-name"))return;const s=(l,o)=>{const n=i.querySelector(l);n&&(n.textContent=o)};s("#ce-stars",t.stars||0),s("#ce-goal-label",t.goal),s("#ce-total",t.totalStars||0),s("#ce-tasks",t.tasksCompleted||0),s("#ce-goals",t.goalsReached||0),s("#ce-quiet",Math.floor((t.quietSeconds||0)/60));const a=i.querySelector("#ce-history");a&&(a.innerHTML=this.renderHistory(t))}update(){this.editingClass&&this.editingClass!==this.state.activeClass&&v(),!this.isAdding&&!this.drag&&this.render(),this.refreshEditor()}findCard(i){return[...this.el.querySelectorAll(".class-card")].find(t=>t.dataset.class===i)||null}}class zt{constructor(i){this.handlers=i,this.boundListener=this.onKeyDown.bind(this),window.addEventListener("keydown",this.boundListener)}onKeyDown(i){if(!["INPUT","SELECT","TEXTAREA"].includes(i.target?.tagName))switch(i.code){case"Space":i.preventDefault(),this.handlers.onSpace?.();break;case"KeyM":i.preventDefault(),this.handlers.onM?.();break;case"KeyC":i.preventDefault(),this.handlers.onC?.();break;case"KeyF":i.preventDefault(),this.handlers.onF?.();break;case"Digit1":this.handlers.onMode1?.();break;case"Digit2":this.handlers.onMode2?.();break;case"Digit3":this.handlers.onMode3?.();break;case"KeyT":this.handlers.onT?.();break;case"KeyS":this.handlers.onS?.();break;case"KeyH":this.handlers.onH?.();break}}destroy(){window.removeEventListener("keydown",this.boundListener)}}class Ht{constructor(i){this.overlay=document.createElement("div"),this.overlay.className="intro-overlay",this.overlay.innerHTML=`
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

        <h1 class="intro-title">${S("appTitle")}</h1>
        <p class="intro-subtitle">${S("appSubtitle")}</p>

        <button class="intro-start-btn" id="btn-start-game">
          ${de()} <span>${S("startBtn")}</span>
        </button>

        <div class="intro-hints">
          <div class="hint-item">
            ${R()} <span>Натисніть <b>C</b> або кнопку калібрування в тиші класу</span>
          </div>
          <div class="hint-item">
            ${ce()} <span>Клавіша <b>F</b> — повноекранний режим для проектора та ТВ</span>
          </div>
          <div class="hint-item">
            ${L(!0)} <span>Клас збирає зірки в банку за кожні 30 секунд тиші</span>
          </div>
        </div>
      </div>
    `,document.body.appendChild(this.overlay),this.overlay.querySelector("#btn-start-game").addEventListener("click",()=>{this.hide(),i&&i()})}hide(){this.overlay.classList.add("fade-out"),setTimeout(()=>{this.overlay.remove()},450)}}class Ot{constructor(){this.canvas=document.getElementById("game-canvas"),this.state=Z.load(),this.physics=new Ae,this.renderer=new ct(this.canvas),this.mic=new ve,this.mic.ambientBaselineDb=this.state.settings.ambientBaselineDb||-55,this.mic.deviceId=this.state.settings.micDeviceId||"",this.mic.profile=this.state.settings.micProfile||"webcam",this.mic.gainMultiplier=this.state.settings.micGain||2.2;const i=u.modes[this.state.settings.mode]||u.modes.quiet;this.session=new ke({initialMode:i.id});const t=this.state.activeClass,s=this.state.classes[t]||E();this.stars=new Me({secondsPerStar:s.secondsPerStar||u.stars.secondsPerStar,goldenComboSeconds:u.stars.goldenComboSeconds,initialStars:s.stars,goal:s.goal}),this.zones=new Se({enterYellowMs:u.zones.enterYellowMs,exitYellowMs:u.zones.exitYellowMs,enterRedMs:u.zones.enterRedMs,exitRedMs:u.zones.exitRedMs,hysteresisDb:u.zones.hysteresisDb}),this.hud=new Lt({onModeChange:a=>this.switchMode(a),onQuickCalibrate:()=>this.calibrateMic(),onPanelToggle:()=>this.panel.toggle(),onTimerToggle:()=>this.session.toggleTimer(),onTimerStart:a=>this.session.startTimer(a),onTimerCancel:()=>this.session.cancelTimer(),onResetGoal:()=>this.resetCurrentStars()}),this.hud.updateMode(i.id),this.hud.setClassName(t,s.color),this.panel=new Gt(this.state,this.getPanelCallbacks()),this.sidebar=new jt(this.state,this.getSidebarCallbacks()),m.setVolume(this.state.settings.volume),this.renderer.setTheme(this.state.settings.theme),this.applyLightRoom(this.state.settings.lightRoom),this.lastFrameTime=performance.now(),this.lastAlertTime=0,this.quietStatSaveTimer=0,this.isPaused=!1,this.wasCalibrating=!1,this.cursorTimer=null,this.pointerTarget={x:null,y:null},this.displayedStars=s.stars,this.hasCelebratedGoal=s.stars>=s.goal,this.simulatedDb=null,this.checkDebugMode(),this.initPointers(),this.initResize(),this.initHotkeys(),this.initCursorHide(),new Ht(()=>{this.startLesson()}),requestAnimationFrame(this.loop.bind(this))}async toggleMicrophone(){const i=await this.mic.toggle();if(this.panel.setMicButtonState(i),i){const t=await this.mic.listDevices();this.panel.populateAudioDevices(t,this.mic.deviceId)}else this.mic.error&&this.hud.showMicBlockedHelp();return i}switchClass(i){if(!this.state.classes[i])return;this.state.activeClass=i;const t=this.state.classes[i];this.stars.stars=t.stars,this.stars.goal=t.goal,this.stars.secondsPerStar=t.secondsPerStar||u.stars.secondsPerStar,this.stars.resetProgress(),this.displayedStars=t.stars,this.hasCelebratedGoal=t.stars>=t.goal,this.saveState(),this.hud.setClassName(i,t.color),this.hud.updateStars(this.displayedStars,this.stars.goal,0,!1,t.reward),this.sidebar.update()}getSidebarCallbacks(){return{onSelect:i=>this.switchClass(i),onAdd:i=>{const t=i.trim().slice(0,D);return!t||Object.hasOwn(this.state.classes,t)?!1:(this.state.classes[t]=E({color:Fe(this.state.classes)}),this.switchClass(t),!0)},onRename:(i,t)=>{const s=Be(this.state.classes,i,t);if(!s)return!1;const a=Object.keys(s)[Object.keys(this.state.classes).indexOf(i)];return this.state.classes=s,this.state.activeClass===i&&(this.state.activeClass=a),this.saveState(),this.hud.setClassName(this.state.activeClass,s[this.state.activeClass]?.color),!0},onReorder:(i,t)=>{const s=Ce(this.state.classes,i,t);s&&(this.state.classes=s,this.saveState())},onColorChange:i=>{const t=this.state.classes[this.state.activeClass];t&&(t.color=i,this.saveState(),this.hud.setClassName(this.state.activeClass,i))},onStarSpeedChange:i=>{const t=this.state.classes[this.state.activeClass];t&&(t.secondsPerStar=i,this.stars.secondsPerStar=i,this.saveState())},onDelete:i=>{Object.keys(this.state.classes).length<=1||(delete this.state.classes[i],this.switchClass(Object.keys(this.state.classes)[0]))},onGoalChange:(i,t)=>{const s=this.state.classes[this.state.activeClass];s&&(s.goal=i,s.reward=t,this.stars.goal=i,this.hasCelebratedGoal=this.stars.stars>=i,this.saveState(),this.hud.updateStars(this.stars.stars,this.stars.goal,0,!1,t))},onAddStar:()=>this.awardStarWithFlight(),onAddTask:()=>{const i=this.state.classes[this.state.activeClass];i&&(i.tasksCompleted=(i.tasksCompleted||0)+1,m.playChime(),this.saveState(),this.sidebar.update())},onResetStars:()=>this.resetCurrentStars(),onCollapseChange:i=>{this.state.settings.sidebarCollapsed=i,this.saveState()},onSortChange:i=>{this.state.settings.sidebarSort=i,this.saveState()}}}getPanelCallbacks(){return{onMicToggle:async()=>{await this.toggleMicrophone()},onCalibrate:()=>{this.calibrateMic()},onDeviceChange:async i=>{this.state.settings.micDeviceId=i,this.saveState(),await this.mic.switchDevice(i)},onProfileChange:i=>{this.state.settings.micProfile=i,this.mic.setProfile(i),this.state.settings.micGain=this.mic.gainMultiplier,this.panel.setGainValue(this.mic.gainMultiplier),this.saveState()},onGainChange:i=>{this.state.settings.micGain=i,this.mic.setGain(i),this.saveState()},onSensitivity:i=>{this.state.settings.sensitivity=i,this.saveState()},onBalls:i=>{this.state.settings.balls=i,this.physics.setBallCount(i),this.saveState()},onTheme:i=>{this.state.settings.theme=i,this.renderer.setTheme(i),this.saveState()},onSound:(i,t=!1)=>{this.state.settings.alertSound=i,this.saveState(),t&&i!=="none"&&m.playAlert(i)},onRepeatChange:i=>{this.state.settings.alertRepeatSec=i,this.saveState()},onVolume:(i,t=!1)=>{if(this.state.settings.volume=i,m.setVolume(i),this.saveState(),t&&i>0){const s=this.state.settings.alertSound;s&&s!=="none"?m.playAlert(s):m.playChime()}},onLightRoom:i=>{this.applyLightRoom(i),this.saveState()},onFullscreen:()=>{this.toggleFullscreen()}}}switchMode(i){this.session.setMode(i),this.state.settings.mode=i;const t=this.session.getModeConfig();this.hud.updateMode(t.id),this.saveState()}applyLightRoom(i){this.state.settings.lightRoom=!!i,document.body.classList.toggle("light-room",!!i),this.renderer.setLightRoom(!!i)}calibrateMic(){this.mic.startCalibration(u.calibrationMs),this.wasCalibrating=this.mic.isCalibrating,this.panel.setCalibrateButtonState(this.mic.isCalibrating)}awardStarWithFlight(){this.stars.awardManualStar();const i=this.state.classes[this.state.activeClass];i&&(i.totalStars=(i.totalStars||0)+1),this.saveClassStars();const t=this.hud.getJarMouthCoords();this.renderer.particles.spawnFlyingStar(this.renderer.width*.5,this.renderer.height*.45,t.x,t.y,()=>{this.displayedStars=this.stars.stars,m.playChime(),this.hud.triggerJarBounce(),this.checkGoalReached()})}resetCurrentStars(){const i=this.state.classes[this.state.activeClass];i&&(i.stars=0),this.stars.resetAll(i?.goal||20),this.displayedStars=0,this.hasCelebratedGoal=!1,this.saveState(),this.hud.updateStars(0,this.stars.goal,0,!1,i?.reward||"Нагорода"),this.sidebar.update()}checkGoalReached(){const i=this.state.classes[this.state.activeClass];this.stars.stars>=this.stars.goal&&!this.hasCelebratedGoal&&(this.hasCelebratedGoal=!0,i&&(i.goalsReached=(i.goalsReached||0)+1,Te(i,i.reward),this.saveState(),this.sidebar.update()),m.playFanfare(),this.renderer.particles.spawnConfetti(this.renderer.width,this.renderer.height),this.hud.showGoalReachedModal(i?.reward||"5 хв мультика",()=>{this.resetCurrentStars()}))}onResize(){const i=window.innerWidth,t=window.innerHeight;this.renderer.resize(i,t),this.physics.resize(i,t),this.physics.setBallCount(this.state.settings.balls)}async startLesson(){this.onResize();const i=await this.mic.start(this.state.settings.micDeviceId);if(this.panel.setMicButtonState(i),i){const t=await this.mic.listDevices();this.panel.populateAudioDevices(t,this.mic.deviceId),this.calibrateMic()}else this.hud.showMicBlockedHelp();this.requestWakeLock()}async requestWakeLock(){if("wakeLock"in navigator)try{await navigator.wakeLock.request("screen")}catch{}}toggleFullscreen(){document.fullscreenElement?document.exitFullscreen?.().catch(()=>{}):document.documentElement.requestFullscreen?.().catch(()=>{})}initResize(){this.onResizeHandler=()=>this.onResize(),window.addEventListener("resize",this.onResizeHandler),this.onResize()}initPointers(){const i=this.canvas,t=s=>{const a=i.getBoundingClientRect();return{x:s.clientX-a.left,y:s.clientY-a.top}};i.addEventListener("pointerdown",s=>{const{x:a,y:l}=t(s);this.pointerTarget={x:a,y:l};const o=this.physics.onPointerDown(s.pointerId,a,l);o&&this.renderer.theme==="bubbles"&&(m.playPop(),this.renderer.particles.spawnPop(o.x,o.y,o.radius),o.y=-o.radius,o.py=o.y)}),i.addEventListener("pointermove",s=>{const{x:a,y:l}=t(s);this.pointerTarget={x:a,y:l},this.physics.onPointerMove(s.pointerId,a,l)}),i.addEventListener("pointerup",s=>{this.physics.onPointerUp(s.pointerId)}),i.addEventListener("pointercancel",s=>{this.physics.onPointerUp(s.pointerId)})}initHotkeys(){new zt({onSpace:()=>{this.isPaused=!this.isPaused},onM:async()=>{await this.toggleMicrophone()},onC:()=>{this.calibrateMic()},onF:()=>{this.toggleFullscreen()},onMode1:()=>this.switchMode("quiet"),onMode2:()=>this.switchMode("groups"),onMode3:()=>this.switchMode("breaktime"),onT:()=>this.session.toggleTimer(),onS:()=>this.awardStarWithFlight(),onH:()=>this.panel.toggle()})}initCursorHide(){const i=()=>{document.body.classList.remove("hide-cursor"),clearTimeout(this.cursorTimer),this.cursorTimer=setTimeout(()=>{!this.panel.isOpen&&!B()&&document.body.classList.add("hide-cursor")},3500)};window.addEventListener("mousemove",i),window.addEventListener("pointerdown",i)}checkDebugMode(){if(new URLSearchParams(window.location.search).has("debug")){const t=document.createElement("div");t.className="debug-bar",t.innerHTML=`
        <span>${vt()} СИМУЛЯТОР ШУМУ:</span>
        <input type="range" id="sim-slider" min="-80" max="-10" step="1" value="-60">
        <span id="sim-val">-60 dB</span>
        <button id="sim-zero-btn">Тиша</button>
        <button id="sim-stir-btn">Шепіт</button>
        <button id="sim-shout-btn">Крик!</button>
        <span id="fps-counter" style="margin-left: auto;">FPS: 60</span>
      `,document.body.appendChild(t);const s=t.querySelector("#sim-slider"),a=t.querySelector("#sim-val"),l=t.querySelector("#sim-zero-btn"),o=t.querySelector("#sim-stir-btn"),n=t.querySelector("#sim-shout-btn");this.simulatedDb=-60,s.addEventListener("input",()=>{this.simulatedDb=parseFloat(s.value),a.textContent=`${this.simulatedDb} dB`}),l.addEventListener("click",()=>{s.value=-70,this.simulatedDb=-70,a.textContent="-70 dB"}),o.addEventListener("click",()=>{s.value=-42,this.simulatedDb=-42,a.textContent="-42 dB"}),n.addEventListener("click",()=>{s.value=-25,this.simulatedDb=-25,a.textContent="-25 dB"}),this.fpsEl=t.querySelector("#fps-counter"),this.frameCount=0,this.fpsTimer=performance.now()}}saveClassStars(){const i=this.state.classes[this.state.activeClass];i&&(i.stars=this.stars.stars,this.saveState(),this.sidebar.update())}saveState(){this.state.settings.ambientBaselineDb=this.mic.ambientBaselineDb,this.state.settings.micDeviceId=this.mic.deviceId,this.state.settings.micProfile=this.mic.profile,this.state.settings.micGain=this.mic.gainMultiplier,Z.save(this.state)}loop(i){requestAnimationFrame(this.loop.bind(this));const t=Math.min(.1,(i-this.lastFrameTime)/1e3);if(this.lastFrameTime=i,this.fpsEl&&(this.frameCount++,i-this.fpsTimer>=1e3&&(this.fpsEl.textContent=`FPS: ${this.frameCount}`,this.frameCount=0,this.fpsTimer=i)),this.isPaused)return;const s=this.mic.sample(this.simulatedDb);s.isCalibrating!==this.wasCalibrating&&(this.wasCalibrating=s.isCalibrating,this.panel.setCalibrateButtonState(s.isCalibrating),s.isCalibrating||this.saveState());const a=this.session.getModeConfig(),l=ye(s.db,s.ambientDb,a.yellowOffsetDb,a.redOffsetDb,this.state.settings.sensitivity),o=this.mic.isListening||this.simulatedDb!==null;this.panel.updateMicLiveMeter(s.rawDb,s.db,s.ambientDb,l.yellowDb,l.redDb,o);const n=this.zones.update(s.db,l.yellowDb,l.redDb,t*1e3),r=n.zone,c=this.state.classes[this.state.activeClass];if(o&&r==="green"&&c&&(c.quietSeconds=(c.quietSeconds||0)+t,this.quietStatSaveTimer+=t,this.quietStatSaveTimer>=15&&(this.quietStatSaveTimer=0,this.saveState(),this.sidebar.refreshEditor())),a.id==="breaktime"){if(l.progress>.2){const p=(l.progress-.18)*38;this.physics.bounceBalls(p)}}else l.progress>.25&&r==="green"&&this.physics.voicePulse(l.progress),(r==="yellow"||l.progress>=.55&&r!=="red")&&this.physics.stirBalls(l.progress*1.25),r==="red"&&(n.changed?(this.physics.scareBounce(1.75),this.hud.triggerScreenShake(),this.hud.triggerJarBounce()):this.physics.chaosAgitate(Math.max(1,l.progress*1.35)));if(r==="red"){const p=this.state.settings.alertRepeatSec??u.defaultAlertRepeatSec,g=p>0?p*1e3:0,f=n.changed&&i-this.lastAlertTime>u.alertCooldownMs,y=!n.changed&&g>0&&i-this.lastAlertTime>=g;(f||y)&&(this.lastAlertTime=i,this.hud.showAlert(),m.playAlert(this.state.settings.alertSound),y&&(this.physics.scareBounce(1.55),this.hud.triggerScreenShake()))}const h=this.stars.update(r,t,a.rewardsEnabled);if(h.starAwarded){c&&(c.totalStars=(c.totalStars||0)+1);const p=this.hud.getJarMouthCoords();this.renderer.particles.spawnFlyingStar(this.renderer.width*.5,this.renderer.height*.45,p.x,p.y,()=>{this.displayedStars=this.stars.stars,m.playChime(),this.hud.triggerJarBounce(),this.checkGoalReached()}),this.saveClassStars()}const d=this.session.update(t,r);d.completed&&(c&&(c.tasksCompleted=(c.tasksCompleted||0)+1,d.cleanStreak&&(c.cleanTasks=(c.cleanTasks||0)+1),this.saveState(),this.sidebar.update()),m.playFanfare(),this.renderer.particles.spawnConfetti(this.renderer.width,this.renderer.height),d.cleanStreak&&a.rewardsEnabled&&this.awardStarWithFlight()),this.physics.update(t,r,h.isGolden),this.renderer.render(this.physics,r,h.isGolden,t,this.pointerTarget.x,this.pointerTarget.y),this.hud.updateNoiseMeter(r,l.progress,s.isCalibrating,s.calibrationProgress),this.hud.updateStars(this.displayedStars,this.stars.goal,h.progress,h.isGolden,c?.reward||"5 хв мультика"),this.hud.updateTimer(d.remaining,d.running,this.session.timerTotalSeconds)}}window.addEventListener("DOMContentLoaded",()=>{new Ot});
