import test from 'node:test';
import assert from 'node:assert/strict';
import { projectRecord, mergeOperation } from './sync-model.js';

test('quiz progress synchronizes between devices', () => {
  const quiz={ id:'journal-1', seen:2, correct:1, flagged:true, lastAt:'2026-10-10T00:00:00Z' };
  assert.deepEqual(projectRecord('quizzes', quiz), quiz);
});

test('bookkeeping records retain their isolated app namespace', () => {
  const record=mergeOperation({ app:'boki3', store:'logs', key:'1', data:{id:'1'}, deviceId:'d1', at:'2026-10-10T00:00:00Z' }, null);
  assert.equal(record.app, 'boki3');
});

test('quiz attempts merge additively', () => {
  const record=mergeOperation({app:'boki3',store:'quizzes',key:'q1',data:{id:'q1',seen:1,correct:1},seenDelta:1,correctDelta:1,deviceId:'d',at:'2026-10-10T00:00:00Z'},{data:{id:'q1',seen:3,correct:2},at:'2026-10-09T00:00:00Z'});
  assert.equal(record.data.seen,4);
  assert.equal(record.data.correct,3);
});
