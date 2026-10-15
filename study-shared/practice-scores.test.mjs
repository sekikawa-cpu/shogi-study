import {test} from 'node:test';
import assert from 'node:assert/strict';
import {latestPracticeScores} from './practice-scores.js';
const log=(patch={})=>({id:'l1',date:'2026-10-15',createdAt:'2026-10-15T01:00:00Z',examKey:'fin｜R07前期',sessionId:'run1',subjectId:'fin',questionCount:10,correctCount:8,...patch});
const values=(scores,logs)=>[...latestPracticeScores(scores,logs).values()];
test('question-by-question history is scored even without an exam score',()=>{
 assert.equal(values([], [log()])[0].score,80);
 assert.equal(values([], [log()])[0].year,2025);
});
test('chunks in one session use summed counts, not a mean of percentages',()=>{
 assert.equal(values([], [log({questionCount:1,correctCount:1}),log({id:'l2',questionCount:9,correctCount:0})])[0].score,10);
});
test('latest run wins; separate runs are not accumulated',()=>{
 assert.equal(values([], [log(),log({id:'l2',sessionId:'run2',createdAt:'2026-10-15T02:00:00Z',correctCount:2})])[0].score,20);
});
test('full exam score takes precedence over its session logs',()=>{
 const scores=[{id:'s1',sessionId:'run1',year:2025,subjectId:'fin',date:'2026-10-15',score:60}];
 const results=values(scores,[log()]); assert.equal(results.length,1);assert.equal(results[0].score,60);
});
test('zero answers, invalid counts, and SRS self-evaluation are excluded',()=>{
 assert.equal(values([], [log({questionCount:0}),log({correctCount:11}),log({correctCount:-1}),log({examKey:'',practiceMode:'card'})]).length,0);
 assert.equal(values([], [log({correctCount:0})])[0].score,0);
});
test('legacy exercise memo is included without changing saved history',()=>{
 const legacy=log({questionCount:undefined,correctCount:undefined,memo:'アプリ演習 5問（正3/誤2）'});
 assert.equal(values([], [legacy])[0].score,60);assert.equal(legacy.questionCount,undefined);
});
test('new ordinary quiz logs count, while unrelated reading logs do not',()=>{
 assert.equal(values([], [log({examKey:'',practiceMode:'quiz'})])[0].score,80);
 assert.equal(values([], [log({examKey:''})]).length,0);
});
test('manual scores and other years/subjects are retained, including an empty history',()=>{
 assert.equal(values([],[]).length,0);
 const manual={id:'s',year:2024,subjectId:'biz',date:'2026-10-14',score:65};
 assert.deepEqual(values([manual],[]),[manual]);
 assert.equal(values([manual],[log()]).length,2);
});
