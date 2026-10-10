import test from 'node:test';
import assert from 'node:assert/strict';
import { projectRecord, mergeOperation } from './sync-model.js';

test('built-in quiz content stays in the protected app bundle', () => {
  assert.deepEqual(projectRecord('quizzes', { id:'kakomon-2026-a-1', q:'private', seen:2, correct:1 }), { seen:2, correct:1, lastSeen:null, flagged:false });
});

test('user-imported quiz content synchronizes between devices', () => {
  const quiz={ id:'imported-1', q:'question', choices:['A','B'], answer:0, seen:0, correct:0 };
  assert.deepEqual(projectRecord('quizzes', quiz), quiz);
});

test('diagnostician records retain their isolated app namespace', () => {
  const record=mergeOperation({ app:'shindanshi', store:'logs', key:'1', data:{id:'1'}, deviceId:'d1', at:'2026-10-10T00:00:00Z' }, null);
  assert.equal(record.app, 'shindanshi');
});
