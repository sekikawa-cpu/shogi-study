export function projectRecord(store,value){
 if(value===null)return null;
 if(store==='quizzes'&&(String(value.id).startsWith('seed-quiz-')||String(value.id).startsWith('kakomon-')))return {seen:value.seen||0,correct:value.correct||0,lastSeen:value.lastSeen||null,flagged:!!value.flagged};
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
