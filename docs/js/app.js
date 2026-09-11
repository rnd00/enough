import {t,locale,initializeLanguage} from './i18n.js';
import {key,date,monthDays,calculate,overlaps,planWithLunch,startOfWeek,holidayMap,plannedMessage} from './calendar.js';
import {fallback} from './holidays.js';
const $=id=>document.getElementById(id);
initializeLanguage(()=>{renderTheme();render();if(['Work','Lunch','Commute','仕事','昼休み','通勤'].includes($('quick-label').value))$('quick-label').value=t(presets[preset].label);$('placement-status').textContent='';$('block-error').textContent='';if($('block-dialog').open)$('block-title').textContent=t(editId?'Edit time block':'Add time block');});
function renderTheme(){
  const label=document.documentElement.dataset.theme==='dark'?t('Light mode'):t('Dark mode');
  $('theme-toggle').textContent=label;
  $('theme-toggle').setAttribute('aria-label',document.documentElement.dataset.theme==='dark'?t('Switch to light mode'):t('Switch to dark mode'));
}
$('theme-toggle').onclick=()=>{
  const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=theme;
  try{localStorage.setItem('enough-theme',theme);}catch{}
  renderTheme();
};
renderTheme();
const today=key(new Date()), tomorrow=date(today);tomorrow.setDate(tomorrow.getDate()+1);
const defaults={month:today.slice(0,7),start:key(tomorrow),hours:82,completed:0,mode:'remaining',region:'JP',subdivision:'',weekStartsOn:1,weekdays:[1,2,3,4,5],vacation:[],custom:{},blocks:[],limit:8};
defaults.workStart=9;defaults.workEnd=18;
let s=structuredClone(defaults), storageOK=true;
try {const saved=JSON.parse(localStorage.getItem('enough-plan'));if(saved && saved.version===1)s={...s,...saved};}catch{storageOK=false;}
let publicHolidays={...fallback}, holidayMessage='Japan 2026 holidays included. Checking for updates…';
let holidayRows=[],holidayRequest=0;
const seaCountries=['BN','KH','ID','LA','MY','MM','PH','SG','TH','TL','VN'];
let preset='work', suppressClick=false;
let clearedBlocks=null;
const presets={work:{label:'Work',type:'work',duration:2},lunch:{label:'Lunch',type:'personal',duration:1},commute:{label:'Commute',type:'personal',duration:.5}};
let week=weekStart(calculate(s,{...(s.region==='JP'?fallback:{}),...s.custom}).days[0]||s.start), editId=null, selectedDay=null;
const escape=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n.toFixed(2)).toLocaleString(locale());
const time=n=>`${String(Math.floor(n)).padStart(2,'0')}:${String(Math.round((n%1)*60)).padStart(2,'0')}`;
const fromTime=t=>{const [h,m]=t.split(':').map(Number);return h+m/60;};
const readable=(d,options={month:'short',day:'numeric'})=>date(d).toLocaleDateString(locale(),options);
function weekStart(d){return startOfWeek(d,s.weekStartsOn);}
function weekDates(){return Array.from({length:7},(_,i)=>{const d=date(week);d.setDate(d.getDate()+i);return key(d);});}
function holidays(){return {...publicHolidays,...s.custom};}
function save(){try{localStorage.setItem('enough-plan',JSON.stringify({...s,version:1}));storageOK=true;}catch{storageOK=false;}render();}
function bind(){
  for(const id of ['workStart','workEnd']){
    $(id).value=time(s[id]%24);
    $(id).onchange=()=>{
      const value=fromTime($(id).value);
      if(!Number.isFinite(value)){ $(id).value=time(s[id]%24);return; }
      s[id]=id==='workEnd'&&value===0?24:value;save();
    };
  }
  for(const id of ['month','start','hours','completed','region','limit','weekStartsOn']){
    $(id).value=s[id];
    $(id).onchange=()=>{
      if(!$(id).checkValidity() || !$(id).value){$(id).reportValidity();$(id).value=s[id];return;}
      s[id]=['hours','completed','limit','weekStartsOn'].includes(id)?Number($(id).value):$(id).value;
      if(id==='month'){s.start=s.month===today.slice(0,7)?key(tomorrow):s.month+'-01';$('start').value=s.start;week=weekStart(s.start);}
      if(id==='start')week=weekStart(s.start);
      if(id==='weekStartsOn')week=weekStart(week);
      if(id==='region')s.subdivision='';
      if(id==='region'||id==='month')loadHolidays();
      save();
    };
  }
  $('remaining-mode').onclick=()=>{s.mode='remaining';save();};
  $('total-mode').onclick=()=>{s.mode='total';save();};
}
function render(){
  const h=holidays(), c=calculate(s,h), days=monthDays(s.month);
  $('save-status').textContent=storageOK?t('Saved on this device'):t('Storage unavailable — keep this tab open');
  $('remaining-mode').classList.toggle('active',s.mode==='remaining');$('total-mode').classList.toggle('active',s.mode==='total');
  $('remaining-mode').setAttribute('aria-pressed',s.mode==='remaining');$('total-mode').setAttribute('aria-pressed',s.mode==='total');
  $('hours-label').firstChild.textContent=s.mode==='remaining'?t('Hours left to work'):t('Total hours required');$('completed-label').hidden=s.mode!=='total';
  $('daily').textContent=c.days.length?number(c.daily):'—';
  const minutes=Math.ceil(c.daily*60);
  $('daily-detail').textContent=!c.days.length?(c.remaining?t('No available workdays. Adjust your dates.'):t('Target already met.')):t(`${Math.floor(minutes/60)}h ${minutes%60}m each workday`);
  $('remaining').textContent=number(c.remaining);$('available').textContent=c.days.length;
  $('off').textContent=days.filter(d=>d>=s.start && s.weekdays.includes(date(d).getDay()) && (h[d]||s.vacation.includes(d))).length;
  $('holiday-status').textContent=t(holidayMessage);
  const codes=[...new Set(holidayRows.flatMap(h=>h.subdivisionCodes||[]))].sort();
  $('subdivision-label').hidden=!codes.length;
  $('subdivision').innerHTML=`<option value="">${t('National holidays only')}</option>`+codes.map(code=>`<option value="${escape(code)}">${escape(code)}</option>`).join('');
  $('subdivision').value=s.subdivision;
  $('weekdays').innerHTML=['S','M','T','W','T','F','S'].map((name,i)=>`<button class="${s.weekdays.includes(i)?'active':''}" aria-label="${[t('Sunday'),t('Monday'),t('Tuesday'),t('Wednesday'),t('Thursday'),t('Friday'),t('Saturday')][i]}" aria-pressed="${s.weekdays.includes(i)}" data-weekday="${i}">${locale()==='ja-JP'?['日','月','火','水','木','金','土'][i]:name}</button>`).join('');
  $('weekdays').querySelectorAll('button').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.weekday);s.weekdays=s.weekdays.includes(n)?s.weekdays.filter(v=>v!==n):[...s.weekdays,n];save();});
  $('month-title').textContent=readable(s.month+'-01',{month:'long',year:'numeric'});
  let html=Array.from({length:7},(_,i)=>[t('Sun'),t('Mon'),t('Tue'),t('Wed'),t('Thu'),t('Fri'),t('Sat')][(s.weekStartsOn+i)%7]).map(n=>`<div class="day-name">${n}</div>`).join('');
  html+='<div></div>'.repeat((date(days[0]).getDay()-s.weekStartsOn+7)%7);
  html+=days.map(d=>{
    const vacation=s.vacation.includes(d), past=d<s.start, working=c.days.includes(d);
    const label=h[d] || (vacation?t('Paid vacation'):working?t(number(c.daily)+'h target'):past?'':t('Day off'));
    return `<button class="day ${!working?'off':''} ${past?'past':''} ${h[d]?'holiday':vacation?'vacation':''} ${d===today?'today':''}" data-date="${d}" title="${escape(readable(d)+' — '+label)}" aria-label="${escape(readable(d)+' — '+label+'; '+t('Edit day'))}"><span class="date-number">${date(d).getDate()}</span><small>${escape(label)}</small></button>`;
  }).join('');
  $('month-calendar').innerHTML=html;$('month-calendar').querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>openDay(b.dataset.date));
  const wd=weekDates();$('week-title').textContent=readable(wd[0])+' – '+readable(wd[6]);
  $('planned-summary').textContent=t(`${number(c.planned)} / ${number(c.remaining)}h planned`);
  $('progress-bar').style.width=`${c.remaining?Math.min(100,c.planned/c.remaining*100):100}%`;
  const notices=[t(plannedMessage(c.planned,c.remaining))];
  const excluded=s.blocks.filter(b=>b.type==='work' && b.date.startsWith(s.month) && !c.days.includes(b.date));
  if(excluded.length)notices.push(t(`${excluded.length} work block(s) outside available days are excluded from totals.`));
  const overLimit=c.days.filter(d=>s.blocks.filter(b=>b.type==='work'&&b.date===d).reduce((n,b)=>n+b.end-b.start,0)>s.limit+.001);
  if(overLimit.length)notices.push(t(`${overLimit.length} planned day(s) exceed your daily limit.`));
  $('plan-notice').textContent=notices.join(' ')||t('All your hours have a home. You’re set.');
  $('clear-blocks').disabled=!s.blocks.length;
  $('undo-clear').hidden=!clearedBlocks;
  $('auto').disabled=!c.days.length||!c.unplanned;
  let grid='<div class="schedule-head"></div>'+wd.map(d=>`<div class="schedule-head">${readable(d,{weekday:'short'})}<strong>${date(d).getDate()}</strong><small>${escape(h[d]|| (s.vacation.includes(d)?t('Paid vacation'):t(number(s.blocks.filter(b=>b.date===d&&b.type==='work').reduce((n,b)=>n+b.end-b.start,0))+'h planned')))}</small></div>`).join('');
  // Show midnight when an early block exists; otherwise keep the useful working day in view.
  const startHour=Math.min(8,...s.blocks.filter(b=>wd.includes(b.date)).map(b=>Math.floor(b.start)));
  const height=(24-startHour)*60;
  grid+=`<div class="time-labels" style="height:${height}px">${Array.from({length:24-startHour},(_,i)=>`<span style="--hour:${i}">${String(i+startHour).padStart(2,'0')}:00</span>`).join('')}</div>`;
  grid+=wd.map(d=>`<div class="day-column ${c.days.includes(d)?'':'unavailable'}" data-date="${d}" style="height:${height}px">${s.blocks.filter(b=>b.date===d).map(b=>`<button class="time-block ${b.type}" data-block="${b.id}" style="top:${(b.start-startHour)*60}px;height:${(b.end-b.start)*60}px" title="${escape(b.label)} ${time(b.start)}–${time(b.end)}"><span>${escape(b.label)}</span><small>${time(b.start)} – ${time(b.end)} · ${number(b.end-b.start)}h</small></button>`).join('')}</div>`).join('');
  $('schedule').innerHTML=grid;
  $('schedule').dataset.startHour=startHour;
  $('schedule').querySelectorAll('[data-block]').forEach(b=>{
    b.onclick=e=>{e.stopPropagation();if(!suppressClick)openBlock(s.blocks.find(v=>v.id===b.dataset.block));};
    b.onpointerdown=e=>beginDrag(e,s.blocks.find(v=>v.id===b.dataset.block));
  });
  $('schedule').querySelectorAll('.day-column').forEach(el=>el.onclick=e=>{
    if(!suppressClick)placeBlock(newPreset(),el.dataset.date,slot(el,e.clientY));
  });
}
function newPreset(){return {...presets[preset],label:$('quick-label').value.trim()||t(presets[preset].label),duration:Number($('quick-duration').value)};}
function slot(column,y){return Math.round((Number($('schedule').dataset.startHour)+(y-column.getBoundingClientRect().top)/60)*4)/4;}
function placeBlock(block,d,start){
  const duration=block.id?block.end-block.start:block.duration;
  const candidate={...block,id:block.id||crypto.randomUUID(),date:d,start,end:start+duration};
  delete candidate.duration;
  let error='';
  if(!d.startsWith(s.month))error=t('Choose a date in the planning month.');
  else if(start<0||candidate.end>24)error=t('The whole block must fit within this day.');
  else if(candidate.type==='work'&&!calculate(s,holidays()).days.includes(d))error=t('Work can only be placed on an available workday.');
  else if(overlaps(candidate,s.blocks))error=t('That time is occupied. Drop into a free slot.');
  if(error){$('placement-status').textContent=error;return;}
  s.blocks=s.blocks.filter(b=>b.id!==candidate.id).concat(candidate);save();
  $('placement-status').textContent=t(`${candidate.label} ${block.id?'moved':'placed'}: ${readable(d)}, ${time(start)}–${time(candidate.end)}.`);
}
function beginDrag(e,block){
  if(e.button!==0)return;
  const origin=e.currentTarget, x=e.clientX,y=e.clientY;
  const offset=block.id?(y-origin.getBoundingClientRect().top)/60:0;
  let ghost=null,target=null,start=0;
  origin.setPointerCapture(e.pointerId);
  const move=event=>{
    if(!ghost&&Math.hypot(event.clientX-x,event.clientY-y)<6)return;
    if(!ghost){ghost=document.createElement('div');ghost.className='drag-preview';document.body.append(ghost);origin.classList.add('dragging');suppressClick=true;}
    target=document.elementFromPoint(event.clientX,event.clientY)?.closest('.day-column');
    start=target?Math.round((slot(target,event.clientY)-offset)*4)/4:0;
    const duration=block.id?block.end-block.start:block.duration;
    const valid=target && start>=0 && start+duration<=24 && target.dataset.date.startsWith(s.month) && (block.type!=='work'||calculate(s,holidays()).days.includes(target.dataset.date)) && !overlaps({...block,date:target.dataset.date,start,end:start+duration},s.blocks);
    ghost.className=`drag-preview ${block.type} ${target?'in-calendar':''} ${target&&!valid?'invalid':''}`;
    ghost.textContent=block.label+(target?`\n${time(Math.max(0,start))} – ${time(Math.max(0,start+duration))}${valid?'':'\n'+t('Time unavailable')}`:' · '+t('Drop on the calendar'));
    if(target){
      const rect=target.getBoundingClientRect();
      ghost.style.left=rect.left+5+'px';ghost.style.top=rect.top+(start-Number($('schedule').dataset.startHour))*60+'px';
      ghost.style.width=rect.width-10+'px';ghost.style.height=duration*60+'px';
    }else{
      ghost.style.left=event.clientX+12+'px';ghost.style.top=event.clientY+12+'px';ghost.style.width='auto';ghost.style.height='auto';
    }
    const scroller=$('schedule').parentElement, rect=scroller.getBoundingClientRect();
    if(event.clientY>rect.bottom-35)scroller.scrollTop+=18;
    if(event.clientY<rect.top+80)scroller.scrollTop-=18;
    if(event.clientX>rect.right-35)scroller.scrollLeft+=18;
    if(event.clientX<rect.left+35)scroller.scrollLeft-=18;
  };
  const end=event=>{
    origin.classList.remove('dragging');
    origin.removeEventListener('pointermove',move);origin.removeEventListener('pointerup',end);origin.removeEventListener('pointercancel',end);
    if(ghost){ghost.remove();if(event.type==='pointerup'&&target)placeBlock(block,target.dataset.date,start);}
    setTimeout(()=>{suppressClick=false;},0);
  };
  origin.addEventListener('pointermove',move);origin.addEventListener('pointerup',end);origin.addEventListener('pointercancel',end);
}
document.querySelectorAll('[data-preset]').forEach(button=>{
  button.onclick=()=>{
    preset=button.dataset.preset;$('quick-label').value=t(presets[preset].label);$('quick-duration').value=presets[preset].duration;
    document.querySelectorAll('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',b===button));
  };
  button.onpointerdown=e=>beginDrag(e,button.dataset.preset===preset?newPreset():{...presets[button.dataset.preset],label:t(presets[button.dataset.preset].label)});
});
function openDay(d){
  selectedDay=d;$('day-title').textContent=readable(d,{weekday:'long',month:'long',day:'numeric'});
  $('day-detail').textContent=holidays()[d]||t('Choose whether this day is available for work.');
  $('day-type').value=s.custom[d]?'holiday':s.vacation.includes(d)?'vacation':'normal';
  $('holiday-name').value=s.custom[d]||'';$('custom-label').hidden=$('day-type').value!=='holiday';$('day-dialog').showModal();
}
$('day-type').onchange=()=>{$('custom-label').hidden=$('day-type').value!=='holiday';};
$('save-day').onclick=()=>{
  s.vacation=s.vacation.filter(d=>d!==selectedDay);delete s.custom[selectedDay];
  if($('day-type').value==='vacation')s.vacation.push(selectedDay);
  if($('day-type').value==='holiday')s.custom[selectedDay]=$('holiday-name').value.trim()||t('Custom holiday');
  save();
};
function openBlock(b=null,d=null,start=9){
  editId=b?.id||null;$('block-title').textContent=b?t('Edit time block'):t('Add time block');
  $('block-label').value=b?.label||t('Work');$('block-type').value=b?.type||'work';
  $('block-date').value=b?.date||d||calculate(s,holidays()).days.find(d=>weekDates().includes(d))||s.start;
  $('block-start').value=time(b?.start??start);$('block-end').value=time((b?.end??start+1)%24);
  $('block-repeat').checked=false;$('block-repeat').disabled=!!b;$('delete-block').hidden=!b;$('block-error').textContent='';$('block-dialog').showModal();
}
$('close-block').onclick=()=>$('block-dialog').close();
$('add').onclick=()=>openBlock();
$('block-type').onchange=()=>{if([t('Work'),t('Break')].includes($('block-label').value))$('block-label').value=$('block-type').value==='work'?t('Work'):t('Break');};
$('block-form').onsubmit=e=>{
  e.preventDefault();
  const block={id:editId||crypto.randomUUID(),date:$('block-date').value,start:fromTime($('block-start').value),end:fromTime($('block-end').value),type:$('block-type').value,label:$('block-label').value.trim()};
  if(block.end===0)block.end=24;
  const fail=message=>{$('block-error').textContent=message;};
  if(!block.label)return fail(t('Enter a title for this block.'));
  if(block.end<=block.start)return fail(t('End time must be after start time. Split overnight blocks across two dates.'));
  if(!block.date.startsWith(s.month))return fail(t('Choose a date in the planning month.'));
  const available=calculate(s,holidays()).days;
  let dates=[block.date];
  if($('block-repeat').checked)dates=available.filter(d=>weekStart(d)===weekStart(block.date));
  if(!dates.length)return fail(t('There are no available workdays in that week.'));
  const candidates=dates.map((d,i)=>({...block,id:i?crypto.randomUUID():block.id,date:d}));
  if(block.type==='work'&&candidates.some(b=>!available.includes(b.date)))return fail(t('This is not an available workday. Change your start date, working week, or time off first.'));
  if(candidates.some(b=>overlaps(b,s.blocks)))return fail(t('This time overlaps another block. Choose a free time or edit the existing block.'));
  s.blocks=s.blocks.filter(b=>b.id!==editId).concat(candidates);week=weekStart(block.date);save();$('block-dialog').close();
};
$('delete-block').onclick=()=>{s.blocks=s.blocks.filter(b=>b.id!==editId);save();$('block-dialog').close();};
$('clear-blocks').onclick=()=>{
  clearedBlocks=s.blocks;s.blocks=[];save();
  $('placement-status').textContent=t(`Cleared all ${clearedBlocks.length} blocks across all dates. Undo is available until you reload.`);
};
$('undo-clear').onclick=()=>{
  if(clearedBlocks.some(b=>overlaps(b,s.blocks))){$('placement-status').textContent=t('Some new blocks overlap the cleared plan. Move or delete those new blocks before restoring.');return;}
  s.blocks.push(...clearedBlocks.filter(b=>!s.blocks.some(existing=>existing.id===b.id)));
  clearedBlocks=null;save();$('placement-status').textContent=t('Cleared blocks restored.');
};
$('prev-week').onclick=()=>{const d=date(week);d.setDate(d.getDate()-7);week=key(d);render();};
$('next-week').onclick=()=>{const d=date(week);d.setDate(d.getDate()+7);week=key(d);render();};
$('auto').onclick=()=>{
  const c=calculate(s,holidays());
  if(s.workEnd<=s.workStart){$('placement-status').textContent=t('Finish time must be after the start time (00:00 means midnight).');return;}
  const lunch={enabled:$('auto-lunch').checked,start:fromTime($('lunch-start').value),duration:Number($('lunch-duration').value)};
  if(!Number.isFinite(lunch.start)||lunch.start+lunch.duration>24){$('placement-status').textContent=t('Choose a lunch time that fits within the day.');return;}
  const result=planWithLunch(s,holidays(),lunch);s.blocks=result.blocks.map(b=>s.blocks.some(old=>old.id===b.id)?b:{...b,label:t(b.label)});
  week=weekStart(c.days[0]);save();
  $('placement-status').textContent=result.skipped.length?t(`Lunch could not be added on ${result.skipped.map(d=>readable(d)).join(', ')} because existing blocks occupy that time. Move those blocks first.`):lunch.enabled?t('Hours distributed with room for lunch.'):t('Hours distributed.');
};
$('example').onclick=()=>{
  if(s.blocks.length && !confirm(t('Replace this plan with the September example?')))return;
  clearedBlocks=null;
  s={...structuredClone(defaults),month:'2026-09',start:'2026-09-12',vacation:['2026-09-24','2026-09-25'],blocks:[]};
  week='2026-09-14';bind();loadHolidays();save();
};
$('subdivision').onchange=()=>{s.subdivision=$('subdivision').value;publicHolidays=holidayMap(holidayRows,s.subdivision);save();};
async function loadHolidays(){
  const request=++holidayRequest,region=s.region,year=s.month.slice(0,4),cacheKey=`enough-holidays-${region}-${year}`;
  holidayRows=[];publicHolidays=region==='JP'&&year==='2026'?{...fallback}:{};
  holidayMessage=region==='custom'?'Add your own holidays by clicking a date.':'Loading holidays… Targets are provisional until loaded.';
  render();if(region==='custom')return;
  if(seaCountries.includes(region)){
    try{
      const response=await fetch(new URL('../data/sea-holidays.json',import.meta.url));
      if(!response.ok)throw new Error('Calendar unavailable');
      const bundle=await response.json();
      if(request!==holidayRequest)return;
      apply(bundle[region]?.[year]);
      holidayMessage='Bundled 2026–2027 public holidays (python-holidays 0.104). Future dates may change; add company exceptions manually.';
    }catch{
      if(request!==holidayRequest)return;
      holidayMessage='SEA calendars cover 2026–2027. Data unavailable for this year; add holidays manually or select a supported year.';
    }
    render();return;
  }
  let cached=null;
  try{cached=JSON.parse(localStorage.getItem(cacheKey));}catch{}
  try{
    const response=await fetch(region==='JP'?'https://holidays-jp.github.io/api/v1/date.json':`https://nagerholidays.com/api/v4/Holidays/${region}/${year}`,{signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error('Holiday service unavailable');
    const data=await response.json();
    apply(data);
    try{localStorage.setItem(cacheKey,JSON.stringify(data));}catch{}
  }catch{
    if(request!==holidayRequest)return;
    if(cached){try{apply(cached);holidayMessage='Using cached holidays. Could not refresh from the holiday service.';}catch{cached=null;}}
    if(!cached)holidayMessage=region==='JP'&&year==='2026'?'Offline calendar: verified Japan 2026 holidays.':'Holidays unavailable for this country/year. Targets exclude only your custom days off; add missing holidays manually.';
  }
  if(request===holidayRequest)render();
  function apply(data){
    if(region==='JP'){
      if(!data||typeof data!=='object'||Array.isArray(data)||!Object.entries(data).every(([d,n])=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&typeof n==='string'))throw new Error('Invalid holidays');
      if(!Object.keys(data).some(d=>d.startsWith(year)))throw new Error('Year unavailable');
    }else if(!Array.isArray(data)||!data.every(h=>/^\d{4}-\d{2}-\d{2}$/.test(h.date)&&typeof h.name==='string'&&Array.isArray(h.holidayTypes)&&typeof h.nationalHoliday==='boolean'&&(h.subdivisionCodes==null||Array.isArray(h.subdivisionCodes))))throw new Error('Invalid holidays');
    if(request!==holidayRequest)return;
    holidayRows=region==='JP'?[]:data;
    publicHolidays=region==='JP'?data:holidayMap(data,s.subdivision);
    holidayMessage=region==='JP'?'Japan holidays updated from Holidays JP.':'Public holidays loaded. Choose a state / region for local holidays; codes use ISO subdivisions.';
  }
}
bind();$('quick-label').value=t(presets[preset].label);loadHolidays();
