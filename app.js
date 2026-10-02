import { cards } from './data/cards.js';
import { comparePrivateAnswers } from './private-logic.js';

const root = document.getElementById('app');
const DEFAULT_CONSENT = 'Either person can skip or stop at any time.';
const CIRCUMFERENCE = 2 * Math.PI * 116;
const state = {
  screen: 'home', deck: 'unfiltered', level: 1, mode: 'progressive',
  person1: 'Person 1', person2: 'Person 2', accepted: false, error: '',
  filters: { kissing: true, undress: true, position: true, photo: true },
  queue: [], index: 0, privatePhase: 'intro', answer1: null, answer2: null,
  timerEnded: false, photoUrl: null, cameraError: '', wins: 0, feedback: '', feedbackStatus: '', feedbackBack: 'home',
};
let timerFrame = null;
let mediaStream = null;
const escapeHtml = str => String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labelDeck = () => state.deck === 'unfiltered' ? 'Unfiltered' : 'Do or Drink';
const current = () => state.queue[state.index];
const shuffle = arr => { const out = [...arr]; for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]} return out; };
const button = (text,action,variant='primary',attrs='') => `<button type="button" class="btn btn-${variant}" data-action="${action}" ${attrs}>${text}</button>`;
const logo = `<span class="wordmark">AFTER HOURS</span>`;
function header(action='home') {return `<header class="masthead">${logo}<button class="icon-btn" type="button" aria-label="Return to ${action==='home'?'home':'setup'}" data-action="${action}">×</button></header>`;}
function footer() {return `<div class="footer-note">JUST BETWEEN US &nbsp; · &nbsp; 18+ &nbsp; · &nbsp; PRIVATE BY DESIGN</div>`;}
function home() {
  return `<header class="masthead">${logo}<span class="tiny-label">PRIVATE EDITION</span></header>
  <section class="hero"><div class="hero-mark" aria-hidden="true"><svg viewBox="0 0 100 100" fill="none"><path d="M25 70 L50 24 L75 70 M34 55 H66" stroke="#d7bea0" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="79" cy="24" r="3" fill="#d7bea0"/></svg></div>
  <div class="eyebrow">TWO PEOPLE. ONE EVENING.</div><h1>Just<br><em>between us.</em></h1><p>A little laughter. A little courage. Everything else is up to you.</p>
  <div class="buttons">${button('Choose your game →','chooseDeck')}${button('Rules & consent','rules','outline')}${button('Give prototype feedback','feedback','text')}</div></section>${footer()}`;
}
function chooseDeck() {
  return `${header()}<div class="eyebrow">01 / CHOOSE YOUR EXPERIENCE</div><h1 class="step-title">What are you<br>in the mood for?</h1><p class="step-desc">Two ways to spend an evening. Both start with you.</p>
  <button class="deck" type="button" data-action="selectDeck" data-deck="unfiltered"><b>The intimate edition · 30 sample cards</b><h2>Unfiltered</h2><p>Closer. Bolder. A few surprises along the way.</p></button>
  <button class="deck" type="button" data-action="selectDeck" data-deck="do-or-drink"><b>The playful edition · 20 sample cards</b><h2>Do or Drink</h2><p>Confessions, ridiculous dares and irresistible mischief.</p></button>
  <div class="setup-bottom"><div class="disclaimer">This is an original prototype, not affiliated with any existing physical card-game publisher.</div></div>${footer()}`;
}
function setup() {
  const f = state.filters;
  return `${header('chooseDeck')}<div class="eyebrow">02 / SET THE MOOD</div><h1 class="step-title">Make it<br>your evening.</h1><p class="step-desc">${labelDeck()} · Takes less than a minute.</p>
  <div class="form-stack">
    <div class="field-row"><div class="field"><label for="p1">First player</label><input id="p1" data-field="person1" type="text" maxlength="22" value="${escapeHtml(state.person1)}" /></div><div class="field"><label for="p2">Second player</label><input id="p2" data-field="person2" type="text" maxlength="22" value="${escapeHtml(state.person2)}" /></div></div>
    <div class="field"><label>Starting intensity</label><div class="segmented">${[1,2,3,4].map(n=>`<button type="button" data-action="setLevel" data-level="${n}" class="${n===state.level?'active':''}">Level ${n}</button>`).join('')}</div></div>
    <div class="field"><label>How it progresses</label><div class="segmented">${[['progressive','Build up'],['free','Stay here'],['mixed','Surprise me']].map(([v,label])=>`<button type="button" data-action="setMode" data-mode="${v}" class="${state.mode===v?'active':''}">${label}</button>`).join('')}</div></div>
    <div class="field"><label>Include these cards</label><div class="filter-grid">${[['kissing','Kissing'],['position','Positions'],['undress','Clothing'],['photo','Camera']].map(([k,label])=>`<label class="check"><input type="checkbox" data-filter="${k}" ${f[k]?'checked':''} /> ${label}</label>`).join('')}</div></div>
    <div class="disclaimer"><strong>Consent is part of the game.</strong> Both players can skip or stop any card at any time, without explanation. Agreeing to play is not agreement to any individual challenge. Never pressure anyone to participate, and do not use alcohol to override boundaries.
      <label><input type="checkbox" data-field="accepted" ${state.accepted?'checked':''} /> We are both 18+ and understand the consent rules.</label></div>
  </div><div class="setup-bottom">${state.error?`<p role="alert" class="small" style="color:#f3adb7">${escapeHtml(state.error)}</p>`:''}${button('Begin our evening →','startGame')}</div>${footer()}`;
}
function rules() {
  return `${header()}<div class="eyebrow">BEFORE THE FIRST CARD</div><h1 class="step-title">The only<br>rules that matter.</h1>
  <section class="form-stack" style="gap:18px;margin-top:15px">${[
    ['01','Only consenting adults','Both players must be at least 18 years old.'],
    ['02','Every card is optional','Either person can skip or stop a challenge at any time. No explanation and no penalty.'],
    ['03','Consent is specific','Agreeing to one card never means agreeing to the next. A yes can become a no.'],
    ['04','Keep it private','Photographs are optional and never uploaded by this prototype. Save only with both people’s agreement.'],
    ['05','Keep alcohol separate from consent','If someone cannot freely consent, stop all intimate challenges. You can use non-alcoholic drinks.'],
  ].map(([n,title,description])=>`<div style="border-bottom:1px solid var(--line);padding-bottom:16px"><div class="tiny-label">${n} / ${title}</div><div style="color:var(--muted);font-size:13px;margin-top:5px">${description}</div></div>`).join('')}</section><div class="setup-bottom">${button('Back to game','home')}</div>${footer()}`;
}
function generateQueue() {
  const kept=cards.filter(c=>c.deck===state.deck)
    .filter(c=>state.mode==='mixed'||(state.mode==='free'?c.level===state.level:c.level>=state.level))
    .filter(c=>c.type!=='photo'||state.filters.photo)
    .filter(c=>!c.tags.some(t=>Object.prototype.hasOwnProperty.call(state.filters,t)&&!state.filters[t]));
  if(state.mode==='progressive')return [1,2,3,4].flatMap(l=>shuffle(kept.filter(c=>c.level===l)));
  return shuffle(kept);
}
function beginGame() {
  if(!state.accepted){state.error='Please confirm that both players are adults and have read the consent rules.';render();return;}
  state.queue=generateQueue();
  if(!state.queue.length){state.error='No cards match those choices. Try another level or turn on a category.';render();return;}
  state.error='';state.index=0;state.wins=0;state.privatePhase='intro';state.screen='play';render();
}
function cardMeta(c){return `<div class="topline"><div class="tiny-label">${escapeHtml(labelDeck())} &nbsp;/&nbsp; LEVEL ${c.level}</div><div class="scoreboard"><span class="wins-pill">✦ ${state.wins} wins</span><span class="card-counter">${String(state.index+1).padStart(2,'0')} / ${String(state.queue.length).padStart(2,'0')}</span></div></div><div class="progress"><div style="width:${Math.round((state.index+1)/state.queue.length*100)}%"></div></div>`;}
function cardFace(c, body='',title=c.title,prompt=c.prompt){
  const illustration = c.imageKey ? `<div class="illustration"><img src="./assets/${encodeURIComponent(c.imageKey)}.svg" alt="Stylised illustration of two people close together" /></div>` : '';
  return `<article class="game-card"><div class="card-top"><span class="tiny-label">${escapeHtml(c.type.replaceAll('-',' '))}</span><span class="card-counter">A·H &nbsp; ✧</span></div><div class="card-core">${illustration}<h2>${escapeHtml(title)}</h2><p>${escapeHtml(prompt)}</p>${body}</div><div class="card-bottom"><div class="card-rule">${DEFAULT_CONSENT}</div></div></article>`;
}
function ordinaryCard(c){
  const cameraButton = c.type==='photo'?button('Open camera & self-timer','openCamera') : '';
  const timerButton = c.timerSeconds && c.type!=='photo'?button(`Start ${c.timerSeconds}s timer ↗`,'startTimer') : '';
  return `${header('confirmExit')}${cardMeta(c)}<div class="card-wrap">${cardFace(c)}</div><div class="card-actions">${cameraButton?`<div class="full">${cameraButton}</div>`:''}${timerButton?`<div class="full">${timerButton}</div>`:''}${button('Skip','skip','outline')}${button('Done →','done')}</div>${footer()}`;
}
function privateCard(c){
  const stage=state.privatePhase;
  const players=[escapeHtml(state.person1),escapeHtml(state.person2)];
  const guess = c.privateMode==='guess';
  const playerPrompt=index=>c.playerPrompts?.[index]
    ?.replaceAll('{person1}',state.person1).replaceAll('{person2}',state.person2) ?? c.prompt;
  let body='';
  if(stage==='intro')body=`${cardFace(c,`<p class="private-instructions">${guess?'One person predicts. The other reveals the truth.':'Match your answers to unlock the challenge.'}<br><strong>A match wins. No match means no challenge.</strong></p>`)}<div class="card-actions"><div class="full">${button(`${players[0]} ${guess?'guesses':'answers privately'} →`,'person1Answer')}</div>${button('Skip','skip','outline')}</div>`;
  if(stage==='p1'||stage==='p2'){
    const idx=stage==='p1'?0:1;
    const name=players[idx];
    body=`${cardFace(c,`<div class="private-options">${c.options.map((o,i)=>`<button type="button" class="choice" data-action="chooseAnswer" data-index="${i}">${escapeHtml(o)}</button>`).join('')}</div>`,`${name}'s ${guess?(idx===0?'prediction':'real answer'):'choice'}`,playerPrompt(idx))}<div class="card-actions">${button('Skip','skip','outline')}</div>`;
  }
  if(stage==='handoff')body=`${cardFace(c,`<div class="glass-cover"><div class="lock">✧</div><span class="muted small">${players[0]}'s answer is hidden.<br>Pass the phone to ${players[1]}.</span></div>`, 'Your secret is safe','Ready for the next player?')}<div class="card-actions"><div class="full">${button(`${players[1]}, I’m ready →`,'person2Answer')}</div>${button('Skip','skip','outline')}</div>`;
  if(stage==='ready')body=`${cardFace(c,`<div class="glass-cover"><div class="lock">✧</div><span class="muted small">Both answers are locked away.<br>Place the phone between you.</span></div>`, 'The moment of truth','Together, tap reveal.') }<div class="card-actions"><div class="full">${button('Reveal our answers ✦','reveal')}</div>${button('Skip','skip','outline')}</div>`;
  if(stage==='revealed'){
    const outcome=comparePrivateAnswers(c,state.answer1,state.answer2,[state.person1,state.person2]);
    const result=`<div class="reveal-details"><div class="result-card"><span class="tiny-label">${escapeHtml(outcome.firstLabel)}</span><b>${escapeHtml(outcome.firstAnswer)}</b>${outcome.firstMeaning?`<small class="reveal-meaning">${escapeHtml(outcome.firstMeaning)}</small>`:''}</div><div class="result-card"><span class="tiny-label">${escapeHtml(outcome.secondLabel)}</span><b>${escapeHtml(outcome.secondAnswer)}</b>${outcome.secondMeaning?`<small class="reveal-meaning">${escapeHtml(outcome.secondMeaning)}</small>`:''}</div>
      <div class="reveal-outcome ${outcome.match?'reveal-match':'reveal-different'}" role="status"><div class="reveal-verdict">${outcome.match?'✦ MATCH — YOU WIN':'NO MATCH — NO CHALLENGE'}</div>
      <p class="reveal-summary">${escapeHtml(outcome.summary)}</p><div class="reveal-guidance"><span class="tiny-label">${outcome.match?'YOUR UNLOCKED CHALLENGE':'WHAT HAPPENS NEXT'}</span><p>${escapeHtml(outcome.action)}</p></div>${outcome.match?'<p class="reveal-tip">Complete the challenge, then tap Done to claim the win. Or Skip — no pressure.</p>':''}</div></div>`;
    body=`${cardFace(c,result,'The reveal.','') }<div class="card-actions">${button('Skip','skip','outline')}${button('Done →','done')}</div>`;
  }
  return `${header('confirmExit')}${cardMeta(c)}<div class="card-wrap">${body}</div>${footer()}`;
}
function wheel(mark='READY',secondary='seconds'){return `<div class="timer-wheel"><svg viewBox="0 0 260 260" aria-hidden="true"><circle class="track" cx="130" cy="130" r="116"/><circle id="timer-fill" class="fill" cx="130" cy="130" r="116" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"/></svg><div class="timer-center"><strong id="timer-value" aria-live="off">${mark}</strong><small id="timer-label">${secondary}</small></div></div>`;}
function timerScreen(){const c=current();return `${header('confirmExit')}<div class="eyebrow" style="text-align:center">${labelDeck()} · LEVEL ${c.level}</div><div class="timer-shell"><h1 class="timer-subtitle">${escapeHtml(c.title)}</h1>${wheel(String(c.timerSeconds),'SECONDS TO GO')}<p class="muted small" style="max-width:300px;margin:0 auto">${escapeHtml(c.prompt)}</p></div><div class="card-actions">${button('Skip','skip','outline')}${button('Done →','done')}</div><div class="footer-note">${DEFAULT_CONSENT}</div>`;}
function photoScreen(){const c=current(); const preview=state.photoUrl; const err=state.cameraError;
  const photoMarkup=preview?`<img src="${preview}" alt="Photo captured on this device" />`:'<video id="camera-video" autoplay playsinline muted aria-label="Camera preview"></video>';
  return `${header('confirmExit')}<div class="eyebrow">PHOTO / PRIVATE CAMERA</div><h1 class="step-title">Your moment.</h1><p class="step-desc">${escapeHtml(c.prompt)}</p>
  <div class="camera-frame">${photoMarkup}<div id="photo-countdown" class="photo-overlay">${wheel('10','SECONDS')}</div></div>
  ${err?`<p class="small" role="alert" style="color:#f3adb7">${escapeHtml(err)}</p>`:''}
  <div class="buttons">${preview?button('Save to this device','savePhoto'):button('Take photo in 10 seconds','takePhoto')}${preview?button('Retake','retakePhoto','outline'):button('Close camera','closeCamera','outline')}</div>
  <div class="card-actions">${button('Skip','skip','outline')}${button('Done →','done')}</div><div class="footer-note">Both agree before photographing · Nothing is uploaded</div>`;
}
function finished(){return `${header()}<section class="closing"><div class="eyebrow">SESSION COMPLETE</div><h2>The rest of the<br>evening is yours.</h2><p>✦ ${state.wins} matched challenges completed.<br>You played ${state.queue.length} cards, at your own pace.</p><div class="buttons" style="margin-top:45px">${button('Play again','restart')}${button('Give feedback','feedback','outline')}${button('Choose another deck','chooseDeck','outline')}</div></section>${footer()}`;}

function feedbackScreen(){
  return `${header('feedbackBack')}<div class="eyebrow">PRIVATE TEST / YOUR THOUGHTS</div><h1 class="step-title">Tell us what<br><em>you think.</em></h1><p class="step-desc">What made you laugh? What was awkward? Which cards would you change? Feedback stays on this device until you choose to share it.</p>
  <div class="form-stack"><div class="field"><label for="tester-notes">Your feedback</label><textarea id="tester-notes" data-field="feedback" maxlength="3000" rows="8" placeholder="I loved... / This didn't work... / I'd change...">${escapeHtml(state.feedback)}</textarea></div>
  ${state.feedbackStatus?`<p role="status" class="small">${escapeHtml(state.feedbackStatus)}</p>`:''}
  <div class="buttons">${button('Share feedback','shareFeedback')}${button('Copy feedback','copyFeedback','outline')}${button('Back','feedbackBack','text')}</div></div>${footer()}`;
}
async function shareOrCopyFeedback(share){
  const contents=state.feedback.trim();
  if(!contents){state.feedbackStatus='Please write a few words first.';render();return;}
  const message=`After Hours private test feedback\n\n${contents}`;
  try {
    if(share&&navigator.share){await navigator.share({title:'After Hours feedback',text:message});state.feedbackStatus='Feedback shared using your chosen app.';}
    else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(message);state.feedbackStatus='Feedback copied — paste it into WhatsApp or a message.';}
    else {state.feedbackStatus='Select the text above to copy it into your message.';}
  }catch(e){state.feedbackStatus=e?.name==='AbortError'?'Sharing cancelled. Your notes are still here.':'Could not share automatically. Select and copy your notes.';}
  render();
}

function render(){
  const content=state.screen==='home'?home():state.screen==='decks'?chooseDeck():state.screen==='setup'?setup():state.screen==='rules'?rules():state.screen==='finished'?finished():state.screen==='feedback'?feedbackScreen():state.screen==='timer'?timerScreen():state.screen==='photo'?photoScreen():current()?.type==='private'?privateCard(current()):ordinaryCard(current());
  root.innerHTML=content;
  document.title=`${state.screen==='play'?labelDeck()+' · ':''}After Hours`;
  if(state.screen==='photo'&&mediaStream&&!state.photoUrl){const video=document.getElementById('camera-video');if(video){video.srcObject=mediaStream;video.play().catch(()=>{});}}
}
function cancelCountdown(){if(timerFrame!==null){cancelAnimationFrame(timerFrame);timerFrame=null;}}
function stopCamera(){if(mediaStream){mediaStream.getTracks().forEach(track=>track.stop());mediaStream=null;}state.photoUrl=null;state.cameraError='';}
function advance(){cancelCountdown();stopCamera();state.index++;state.answer1=null;state.answer2=null;state.privatePhase='intro';state.timerEnded=false;state.screen=state.index>=state.queue.length?'finished':'play';render();}
function startCountdown(seconds,onEnd){
  cancelCountdown(); const start=performance.now();
  function frame(now){const remaining=Math.max(0,seconds-(now-start)/1000);const num=document.getElementById('timer-value');const circle=document.getElementById('timer-fill');
    if(num)num.textContent=String(Math.ceil(remaining)); if(circle)circle.setAttribute('stroke-dashoffset',String(CIRCUMFERENCE*(1-remaining/seconds)));
    if(remaining>0)timerFrame=requestAnimationFrame(frame);else{timerFrame=null;onEnd();}
  }
  timerFrame=requestAnimationFrame(frame);
}
function cardTimer(){state.screen='timer';state.timerEnded=false;render();startCountdown(current().timerSeconds,()=>{state.timerEnded=true;const t=document.getElementById('timer-label');if(t)t.textContent='TIME IS UP';});}
async function openCamera(){
  if(!navigator.mediaDevices?.getUserMedia){state.cameraError='Camera access needs HTTPS or localhost and a compatible browser.';state.screen='photo';render();return;}
  try {mediaStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});state.photoUrl=null;state.cameraError='';state.screen='photo';render();}
  catch(_){state.cameraError='Camera access was not granted. You can still skip or finish this card.';state.screen='photo';render();}
}
function photoCountdown(){
  if(!mediaStream){state.cameraError='Enable the camera first.';render();return;}
  const overlay=document.getElementById('photo-countdown');overlay?.classList.add('visible');
  startCountdown(10,()=>{const v=document.getElementById('camera-video');if(v?.videoWidth&&v?.videoHeight){const canvas=document.createElement('canvas');canvas.width=v.videoWidth;canvas.height=v.videoHeight;canvas.getContext('2d').drawImage(v,0,0);state.photoUrl=canvas.toDataURL('image/png');} else state.cameraError='Could not capture a frame. Please try again.';stopCameraTracksOnly();render();});
}
function stopCameraTracksOnly(){if(mediaStream){mediaStream.getTracks().forEach(t=>t.stop());mediaStream=null;}}
function savePhoto(){if(!state.photoUrl)return;const link=document.createElement('a');link.href=state.photoUrl;link.download='after-hours-private-photo.png';document.body.appendChild(link);link.click();link.remove();}
function clickAction(el){const a=el.dataset.action;
  if(a==='home'){cancelCountdown();stopCamera();state.screen='home';render();return;}
  if(a==='confirmExit'){cancelCountdown();stopCamera();state.screen='setup';render();return;}
  if(a==='chooseDeck'){cancelCountdown();stopCamera();state.screen='decks';render();return;}
  if(a==='rules'){state.screen='rules';render();return;}
  if(a==='feedback'){state.feedbackBack=state.screen;state.screen='feedback';state.feedbackStatus='';render();return;}
  if(a==='feedbackBack'){state.screen=state.feedbackBack;render();return;}
  if(a==='shareFeedback'){shareOrCopyFeedback(true);return;}
  if(a==='copyFeedback'){shareOrCopyFeedback(false);return;}
  if(a==='selectDeck'){state.deck=el.dataset.deck;state.screen='setup';state.level=1;state.mode='progressive';render();return;}
  if(a==='setLevel'){state.level=Number(el.dataset.level);render();return;}
  if(a==='setMode'){state.mode=el.dataset.mode;render();return;}
  if(a==='startGame'){beginGame();return;}
  if(a==='done'||a==='skip'){
    // Only a completed match counts as a win. Skipping never awards points.
    if(a==='done'&&state.screen==='play'&&current()?.type==='private'&&state.privatePhase==='revealed'){
      const result=comparePrivateAnswers(current(),state.answer1,state.answer2,[state.person1,state.person2]);
      if(result.match)state.wins++;
    }
    advance();return;
  }
  if(a==='person1Answer'){state.privatePhase='p1';render();return;}
  if(a==='person2Answer'){state.privatePhase='p2';render();return;}
  if(a==='chooseAnswer'){const i=Number(el.dataset.index);if(state.privatePhase==='p1'){state.answer1=i;state.privatePhase='handoff';}else if(state.privatePhase==='p2'){state.answer2=i;state.privatePhase='ready';}render();return;}
  if(a==='reveal'){state.privatePhase='revealed';render();return;}
  if(a==='startTimer'){cardTimer();return;}
  if(a==='openCamera'){openCamera();return;}
  if(a==='takePhoto'){photoCountdown();return;}
  if(a==='retakePhoto'){state.photoUrl=null;openCamera();return;}
  if(a==='savePhoto'){savePhoto();return;}
  if(a==='closeCamera'){cancelCountdown();stopCamera();state.screen='play';render();return;}
  if(a==='restart'){state.screen='setup';state.accepted=false;render();return;}
}
root.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(el)clickAction(el);});
root.addEventListener('input',e=>{const el=e.target;if(el.dataset.field==='person1'||el.dataset.field==='person2')state[el.dataset.field]=el.value|| (el.dataset.field==='person1'?'Person 1':'Person 2');if(el.dataset.field==='feedback')state.feedback=el.value;});
root.addEventListener('change',e=>{const el=e.target;if(el.dataset.field==='accepted')state.accepted=el.checked;if(el.dataset.filter)state.filters[el.dataset.filter]=el.checked;});
window.addEventListener('pagehide',()=>{cancelCountdown();stopCameraTracksOnly();});
if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
render();
