export const DS_APP_ID='ds';
const DS_SUBJECTS=new Set(['ds','de','biz','all']);
const DS_PLAN_SUBJECTS=new Set(['ds','de','biz']);

export function isDSSettings(value){
 const phases=value?.phases;
 return Array.isArray(phases)&&phases.length>0&&phases.every(p=>
  Array.isArray(p.tracks)&&p.tracks.length>0&&p.tracks.every(t=>DS_PLAN_SUBJECTS.has(t.s))
 );
}

export function isDSRecord({app,store,key,data}){
 if(app!==undefined&&app!==null&&app!==DS_APP_ID)return false;
 // Namespaced tombstones must remain applicable so deletions still synchronize.
 if(app===DS_APP_ID&&data===null)return true;
 if(!data)return false;
 if(store==='kv')return key==='settings'&&isDSSettings(data.v);
 if(['plan','logs'].includes(store))return DS_SUBJECTS.has(data.subjectId);
 if(store==='cards')return DS_SUBJECTS.has(data.subjectId)||(app===DS_APP_ID&&/^seed-card-/.test(String(key)));
 if(store==='notes')return DS_SUBJECTS.has(data.subjectId)||(app===DS_APP_ID&&/^seed-note-/.test(String(key)));
 if(store==='scores')return DS_SUBJECTS.has(data.subjectId)||!!data.examKey;
 if(store==='quizzes')return app===DS_APP_ID||DS_SUBJECTS.has(data.subjectId)||/^(?:seed-quiz-|ocr-|comp-)/.test(String(key));
 return false;
}

export function isLocalDSValue(store,value){
 if(!value)return false;
 if(['plan','logs','cards','notes','quizzes'].includes(store))return DS_SUBJECTS.has(value.subjectId);
 if(store==='scores')return DS_SUBJECTS.has(value.subjectId)||!!value.examKey;
 return true;
}

export function projectRecord(store,value){
 if(value===null)return null;
 if(store==='cards'&&String(value.id).startsWith('seed-card-'))return {ease:value.ease||2.5,interval:value.interval||0,due:value.due||null,reps:value.reps||0,lapses:value.lapses||0,suspended:!!value.suspended,lastGrade:value.lastGrade??null,lastReviewed:value.lastReviewed||null};
 if(store==='quizzes')return {seen:value.seen||0,correct:value.correct||0,lastSeen:value.lastSeen||null,flagged:!!value.flagged};
 if(store==='notes'&&String(value.id).startsWith('seed-note-'))return {read:!!value.read,lastRead:value.lastRead||null};
 return JSON.parse(JSON.stringify(value));
}
export function mergeOperation(op,remote){
 let data=op.data;
 if(op.store==='quizzes'&&data){const base=remote?.data||{};data={...base,...data,seen:(base.seen||0)+(op.seenDelta||0),correct:(base.correct||0)+(op.correctDelta||0)};}
 if(remote?.at>op.at&&data&&op.store!=='quizzes')data=remote.data;
 if(remote?.at>op.at&&data&&op.store==='quizzes')data={...data,flagged:remote.data?.flagged||false,lastSeen:remote.data?.lastSeen||data.lastSeen};
 return {app:op.app,store:op.store,key:op.key,data,deviceId:op.deviceId,at:remote?.at>op.at?remote.at:op.at};
}
