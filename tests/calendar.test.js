import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {calculate,monthDays,overlaps,distribute,planWithLunch,startOfWeek,holidayMap,plannedMessage} from '../docs/js/calendar.js';
import {fallback} from '../docs/js/holidays.js';
const state={month:'2026-09',start:'2026-09-12',hours:82,completed:0,mode:'remaining',weekdays:[1,2,3,4,5],vacation:['2026-09-24','2026-09-25'],blocks:[]};
test('planned status follows added hours instead of theoretical daily capacity',()=>{
  assert.equal(plannedMessage(60,61.5),'1.5h still to place.');
  assert.equal(plannedMessage(61.5,61.5),'All required hours are planned. Your target is covered.');
  assert.equal(plannedMessage(63,61.5),'Target covered. 1.5h above your target; you can trim your plan.');
  assert.equal(plannedMessage(0,61.5),'61.5h still to place.');
});
test('SEA calendars cover every country and filter Malaysia state holidays',()=>{
  const bundle=JSON.parse(readFileSync(new URL('../docs/data/sea-holidays.json',import.meta.url),'utf8'));
  for(const code of ['BN','KH','ID','LA','MY','MM','PH','SG','TH','TL','VN'])for(const year of ['2026','2027']){
    assert.ok(bundle[code][year].length>0,code+year);
    assert.ok(bundle[code][year].every(h=>h.date.startsWith(year)&&h.holidayTypes.includes('Public')));
  }
  assert.ok(holidayMap(bundle.SG['2026'])['2026-08-09']);
  assert.ok(holidayMap(bundle.ID['2026'])['2026-08-17']);
  const local=bundle.MY['2026'].find(h=>!h.nationalHoliday);
  assert.ok(local);
  assert.ok(holidayMap(bundle.MY['2026'],local.subdivisionCodes[0])[local.date]);
});
test('distribution stays within selected hours and leaves excess unplanned',()=>{
  const input={...state,limit:8,workStart:10,workEnd:16};
  const result=planWithLunch(input,fallback,{enabled:true,start:12,duration:1});
  assert.ok(result.blocks.every(b=>b.start>=10&&b.end<=16));
  assert.equal(calculate({...input,blocks:result.blocks},fallback).planned,40);
  assert.equal(calculate({...input,blocks:result.blocks},fallback).unplanned,42);
  assert.equal(distribute(['2026-09-14'],8,[{date:'2026-09-14',start:15,end:20}],10,16).reduce((n,b)=>n+b.end-b.start,0),5);
});
test('week boundaries and regional public holiday filtering',()=>{
  assert.equal(startOfWeek('2026-09-16',0),'2026-09-13');
  assert.equal(startOfWeek('2026-09-16',1),'2026-09-14');
  assert.equal(startOfWeek('2026-09-16',6),'2026-09-12');
  assert.equal(startOfWeek('2027-01-01',1),'2026-12-28');
  const rows=[{date:'2026-01-01',name:'National',nationalHoliday:true,holidayTypes:['Public']},{date:'2026-03-01',name:'Local',nationalHoliday:false,subdivisionCodes:['US-CA'],holidayTypes:['Public']},{date:'2026-04-01',name:'Observance',nationalHoliday:true,holidayTypes:['Observance']}];
  assert.deepEqual(holidayMap(rows),{'2026-01-01':'National'});
  assert.deepEqual(holidayMap(rows,'US-CA'),{'2026-01-01':'National','2026-03-01':'Local'});
});
test('automatic lunch is excluded from work, respects limits and avoids duplicates',()=>{
  const initial={...state,limit:8};
  const lunch={enabled:true,start:12,duration:1};
  const result=planWithLunch(initial,fallback,lunch);
  assert.equal(calculate({...initial,blocks:result.blocks},fallback).planned,64);
  assert.equal(result.blocks.filter(b=>b.label==='Lunch').length,8);
  assert.ok(result.blocks.every(b=>!overlaps(b,result.blocks)));
  const again=planWithLunch({...initial,blocks:result.blocks},fallback,lunch);
  assert.deepEqual(again.blocks,result.blocks);
  const conflict=planWithLunch({...initial,blocks:[{id:'busy',date:'2026-09-14',type:'personal',label:'Travel',start:12,end:13}]},fallback,lunch);
  assert.deepEqual(conflict.skipped,['2026-09-14']);
  assert.ok(conflict.blocks.every(b=>!overlaps(b,conflict.blocks)));
  assert.equal(planWithLunch({...initial,hours:8},fallback,lunch).blocks.filter(b=>b.label==='Lunch').length,0);
});
test('September example, total mode, exclusions and no available days',()=>{
  const c=calculate(state,fallback);
  assert.equal(c.days.length,8);assert.equal(c.daily,10.25);
  assert.deepEqual(c.days,['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-28','2026-09-29','2026-09-30']);
  assert.equal(calculate({...state,hours:160,completed:78,mode:'total'},fallback).daily,10.25);
  assert.equal(calculate({...state,hours:40,completed:78,mode:'total'},fallback).remaining,0);
  assert.equal(calculate({...state,start:'2026-10-01'},fallback).days.length,0);
  assert.equal(calculate({...state,weekdays:[]},fallback).daily,0);
  assert.equal(monthDays('2028-02').length,29);
  const blocks=[{date:'2026-09-14',start:9,end:12,type:'work'},{date:'2026-09-14',start:12,end:13,type:'personal'},{date:'2026-09-24',start:9,end:17,type:'work'}];
  assert.equal(calculate({...state,blocks},fallback).planned,3);
});
test('allocation preserves target, avoids breaks and detects collisions',()=>{
  const days=calculate(state,fallback).days;
  const breaks=days.map(date=>({id:date,date,start:12,end:13,type:'personal'}));
  const blocks=distribute(days,82,breaks);
  assert.ok(Math.abs(blocks.reduce((n,b)=>n+b.end-b.start,0)-82)<1e-9);
  assert.ok(blocks.every(b=>!overlaps(b,breaks)&&b.start>=8&&b.end<=24));
  assert.equal(overlaps({id:'x',date:days[0],start:11,end:12},breaks),false);
  assert.equal(overlaps({id:'x',date:days[0],start:12,end:14},breaks),true);
  assert.equal(distribute([],82,[]).length,0);
});
