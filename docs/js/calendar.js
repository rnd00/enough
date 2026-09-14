export const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const date = s => new Date(s + 'T12:00:00');
export function parseHours(value,min=0,max=744){
  const text=String(value).trim(), clock=text.match(/^(\d+):([0-5]\d)$/);
  const hours=clock?Number(clock[1])+Number(clock[2])/60:/^\d+(?:\.\d+)?$/.test(text)?Number(text):NaN;
  return hours>=min&&hours<=max?hours:NaN;
}
export function formatHoursInput(hours){
  const minutes=Math.round(hours*60);
  return minutes%15===0?String(Number((minutes/60).toFixed(2))):`${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;
}
export function startOfWeek(d,first=1){const v=date(d);v.setDate(v.getDate()-(v.getDay()-first+7)%7);return key(v);}
export function holidayMap(rows,subdivision=''){
  const result={};
  for(const h of rows)if(h.holidayTypes.includes('Public')&&(h.nationalHoliday||h.subdivisionCodes?.includes(subdivision))){
    result[h.date]=result[h.date]?result[h.date]+' / '+h.name:h.name;
  }
  return result;
}
export function monthDays(month) {
  const [y,m] = month.split('-').map(Number);
  return Array.from({length:new Date(y,m,0).getDate()}, (_,i)=>key(new Date(y,m-1,i+1,12)));
}
export function calculate(s, holidays) {
  const days = monthDays(s.month).filter(d => d >= s.start && s.weekdays.includes(date(d).getDay()) && !holidays[d] && !s.vacation.includes(d));
  const vacationDays=monthDays(s.month).filter(d=>d>=s.start&&s.weekdays.includes(date(d).getDay())&&!holidays[d]&&s.vacation.includes(d));
  const vacationCredit=vacationDays.length*(s.vacationHours||0);
  const remaining = Math.max(0, s.hours - (s.mode === 'total' ? s.completed : 0)-vacationCredit);
  const planned = s.blocks.filter(b=>b.type==='work' && days.includes(b.date)).reduce((n,b)=>n+b.end-b.start,0);
  return {days, vacationDays, vacationCredit, remaining, daily:days.length ? remaining/days.length : 0, planned, unplanned:Math.max(0,remaining-planned)};
}
export function overlaps(block, others) {
  return others.some(b=>b.id!==block.id && b.date===block.date && b.start<block.end && block.start<b.end);
}
export function plannedMessage(planned,required){
  const gap=Math.round((required-planned)*60);
  const hours=Number((Math.abs(gap)/60).toFixed(2));
  return gap>0?`${hours}h still to place.`:gap<0?`Target covered. ${hours}h above your target; you can trim your plan.`:'All required hours are planned. Your target is covered.';
}
export function planWithLunch(s, holidays, lunch) {
  const c=calculate(s,holidays), blocks=[...s.blocks], skipped=[];
  let remaining=c.unplanned;
  for(let i=0;i<c.days.length;i++) {
    const d=c.days[i], used=blocks.filter(b=>b.date===d&&b.type==='work').reduce((n,b)=>n+b.end-b.start,0);
    const target=Math.min(Math.max(0,s.limit-used),Math.ceil(remaining/(c.days.length-i)*60)/60);
    if(target<=0&&used<=0)continue;
    let meal=null;
    if(lunch.enabled && lunch.start>=(s.workStart??8) && lunch.start+lunch.duration<=(s.workEnd??24) && !blocks.some(b=>b.date===d&&b.type==='personal'&&(b.label.toLowerCase().includes('lunch')||b.label==='昼休み'))) {
      meal={id:crypto.randomUUID(),date:d,start:lunch.start,end:lunch.start+lunch.duration,type:'personal',label:'Lunch'};
      if(overlaps(meal,blocks)){skipped.push(d);meal=null;}
    }
    const added=distribute([d],target,meal?[...blocks,meal]:blocks,s.workStart??8,s.workEnd??24);
    // Short morning-only workdays do not need a lunch reservation.
    if(meal && [...added,...blocks.filter(b=>b.date===d&&b.type==='work')].some(b=>b.end>meal.start))blocks.push(meal);
    blocks.push(...added);
    remaining-=added.reduce((n,b)=>n+b.end-b.start,0);
  }
  return {blocks,skipped};
}
// Split around lunch and other commitments; use minutes so allocations sum exactly.
export function distribute(days, hours, existing, workStart=8, workEnd=24) {
  let remaining = Math.round(hours*60);
  const result=[];
  days.forEach((d,i)=>{
    let target = Math.ceil(remaining/(days.length-i));
    for(let start=Math.round(workStart*60); start<Math.round(workEnd*60) && target>0;) {
      const busy=existing.filter(b=>b.date===d).sort((a,b)=>a.start-b.start);
      const covering=busy.find(b=>b.start*60<=start && b.end*60>start);
      if(covering){start=Math.round(covering.end*60);continue;}
      const next=busy.find(b=>b.start*60>start);
      const end=Math.min(next ? Math.round(next.start*60) : workEnd*60,workEnd*60,start+target);
      result.push({id:crypto.randomUUID(),date:d,start:start/60,end:end/60,type:'work',label:'Work'});
      target-=end-start; remaining-=end-start; start=end;
    }
  });
  return result;
}
