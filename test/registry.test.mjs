import assert from 'node:assert/strict';
import test from 'node:test';
import { OverviewRegistry } from '../src/client/registry.ts';

test('OverviewRegistry orders actions and filters by session visibility', () => {
  const registry = new OverviewRegistry();
  const offB = registry.registerAction({
    id: 'b',
    order: 20,
    label: 'Action B',
    onClick: () => {},
  });
  registry.registerAction({
    id: 'a',
    order: 10,
    label: 'Action A',
    visible: (sid) => sid === 's1',
    onClick: () => {},
  });

  assert.deepEqual(
    registry.getActions('s1').map((x) => x.id),
    ['a', 'b'],
  );
  assert.deepEqual(
    registry.getActions('s2').map((x) => x.id),
    ['b'],
  );

  offB();
  assert.deepEqual(
    registry.getActions('s1').map((x) => x.id),
    ['a'],
  );
});

test('OverviewRegistry manages sections, trigger badges by priority, and preferences', () => {
  const registry = new OverviewRegistry();
  let notifications = 0;
  const offSub = registry.subscribe(() => {
    notifications += 1;
  });

  registry.registerSection({
    id: 'sec-2',
    order: 20,
    title: 'Second',
    render: () => null,
  });
  registry.registerSection({
    id: 'sec-1',
    order: 5,
    title: 'First',
    defaultOpen: false,
    render: () => null,
  });
  assert.deepEqual(
    registry.getSections('s1').map((s) => s.id),
    ['sec-1', 'sec-2'],
  );

  registry.registerBadge({ id: 'low', priority: 1, tone: 'neutral', text: '1' });
  registry.registerBadge({ id: 'high', priority: 10, tone: 'attention', text: () => '2' });
  assert.deepEqual(registry.getActiveBadge('s1'), { tone: 'attention', text: '2' });

  assert.equal(registry.getPreferences().displayMode, 'popover');
  registry.setPreferences({ displayMode: 'auto-dock' });
  assert.equal(registry.getPreferences().displayMode, 'auto-dock');
  assert.ok(notifications >= 4);
  offSub();
});

test('OverviewRegistry tracks session todos idempotently and preserves trackDelta flag', () => {
  const registry = new OverviewRegistry();
  let calls = 0;
  const off = registry.subscribe(() => {
    calls += 1;
  });

  registry.registerSection({
    id: 'delta-sec',
    title: 'Items',
    badge: 3,
    trackDelta: true,
    render: () => null,
  });
  assert.equal(registry.getSections('s1')[0]?.trackDelta, true);

  const beforeTodos = calls;
  registry.setSessionTodos('s1', [{ content: 'Step 1', status: 'in_progress' }]);
  assert.equal(calls, beforeTodos + 1);
  assert.deepEqual(registry.getSessionTodos('s1'), [{ content: 'Step 1', status: 'in_progress' }]);

  // Setting identical todos should not emit a redundant notification.
  registry.setSessionTodos('s1', [{ content: 'Step 1', status: 'in_progress' }]);
  assert.equal(calls, beforeTodos + 1);
  off();
});
