import test from 'node:test';
import assert from 'node:assert/strict';
import { MessagingStore } from '../src/server/messaging';

test('conversation access and message delivery are backend-authorized', async () => {
  process.env.NODE_ENV = 'test'; process.env.ALLOW_MEMORY_FALLBACK = 'true';
  const store = new MessagingStore(); await store.initialize();
  const created = await store.createConversation('user-a', ['user-b']);
  assert.ok('conversation' in created);
  const id = created.conversation.id;
  assert.equal((await store.listMessages(id, 'user-c')).error, 'forbidden');
  assert.equal((await store.sendMessage(id, 'user-c', 'IDOR')).error, 'forbidden');
  const sent = await store.sendMessage(id, 'user-a', 'Hello from the road.');
  assert.ok('message' in sent);
  assert.equal((await store.listMessages(id, 'user-b')).messages.length, 1);
  assert.equal((await store.createConversation('user-a', ['user-b'])).conversation?.id, id);
});

test('message length and block checks are enforced', async () => {
  const store = new MessagingStore(); await store.initialize();
  await store.block('user-a', 'user-b');
  assert.equal((await store.createConversation('user-a', ['user-b'])).error, 'forbidden');
  const created = await store.createConversation('user-a', ['user-c']); assert.ok('conversation' in created);
  assert.equal((await store.sendMessage(created.conversation.id, 'user-a', 'x'.repeat(4001))).error, 'invalid');
});

test('trip conversations require organizer or accepted trip membership at every access point', async () => {
  const store = new MessagingStore(); await store.initialize();
  store.setTripAuthorizer(async (tripId, userId) => tripId === 'trip-1' && ['organizer', 'accepted'].includes(userId));
  assert.equal((await store.createConversation('unrelated', ['accepted'], 'trip', 'trip-1')).error, 'trip_membership_required');
  assert.equal((await store.createConversation('organizer', ['pending'], 'trip', 'trip-1')).error, 'trip_membership_required');
  const created = await store.createConversation('organizer', ['accepted'], 'trip', 'trip-1');
  assert.ok('conversation' in created);
  const id = created.conversation.id;
  assert.equal((await store.listMessages(id, 'pending')).error, 'forbidden');
  assert.equal((await store.sendMessage(id, 'pending', 'unauthorized')).error, 'forbidden');
  assert.equal((await store.listMessages(id, 'accepted')).messages.length, 0);
  assert.ok('message' in await store.sendMessage(id, 'accepted', 'Authorized hello'));
  assert.equal((await store.listConversations('pending')).length, 0);
  assert.equal((await store.listConversations('accepted')).length, 1);
});
