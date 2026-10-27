import {DS_APP_ID,isDSRecord,isLocalDSValue,projectRecord} from './sync-model.js';

export function recoveryCandidates(state, records, pending=[]) {
 const remote=new Map(),blocked=new Set(pending.map(x=>x.store+'|'+x.key));
 for(const row of records){
  if(!isDSRecord(row))continue;
  const key=row.store+'|'+row.key,prior=remote.get(key);
  if(!prior||row.app===DS_APP_ID&&prior.app!==DS_APP_ID)remote.set(key,row);
 }
 const result=[];
 for(const store of ['logs','scores','quizzes','cards','notes','plan','units']){
  for(const local of state[store]||[]){
   if(!isLocalDSValue(store,local))continue;
   const key=String(local.id),remoteRow=remote.get(store+'|'+key);
   if(blocked.has(store+'|'+key))continue;
   // A deliberate cloud deletion or an explicit cloud edit must not be undone.
   if(remoteRow?.data===null)continue;
   const old=remoteRow?.data||null;
   let value=local;
   if(store==='quizzes'){
    if(!(local.seen>0||local.flagged))continue;
    if(old&&local.seen<=(old.seen||0)&&local.correct<=(old.correct||0))continue;
    value={...local,seen:Math.max(local.seen||0,old?.seen||0),correct:Math.max(local.correct||0,old?.correct||0),flagged:old?!!old.flagged:!!local.flagged,lastSeen:[local.lastSeen||'',old?.lastSeen||''].sort().at(-1)||null};
   }else if(store==='notes'){
    if(!local.read||old&&(!local.lastRead||local.lastRead<=(remoteRow.at||'')))continue;
   }else if(store==='cards'){
    if(!(local.reps>0))continue;
    if(old&&(!(local.reps>(old.reps||0))||!local.lastReviewed||local.lastReviewed<(old.lastReviewed||'')))continue;
   }else if(store==='plan'){
    if(old||!(local.done||local.progressDone>0||local.doneMin>0))continue;
   }else if(old)continue;
   if(JSON.stringify(projectRecord(store,value))!==JSON.stringify(projectRecord(store,old)))result.push({store,key,value,old});
  }
 }
 return result;
}
