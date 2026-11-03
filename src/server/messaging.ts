import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';

export type Conversation = { id: string; kind: 'connection' | 'trip'; createdBy: string; createdAt: string };
export type Message = { id: string; conversationId: string; senderId: string; body: string; createdAt: string };
export type Notification = { id: string; type: string; actorId?: string; entityId?: string; body: string; createdAt: string; readAt?: string };

type MemoryConversation = Conversation & { participants: Set<string>; messages: Message[] };

export class MessagingStore {
  private pool: Pool | null = null;
  private memory = process.env.NODE_ENV !== 'production' && process.env.ALLOW_MEMORY_FALLBACK === 'true';
  private conversations = new Map<string, MemoryConversation>();
  private notifications = new Map<string, Notification & { userId: string; dedupeKey?: string }>();
  private blocks = new Set<string>();
  private streams = new Map<string, Set<Response>>();

  async initialize() {
    if (!process.env.DATABASE_URL) { if (this.memory) return; throw new Error('DATABASE_URL is required for messaging.'); }
    this.pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 10, waitForConnections: true });
    await this.pool.query('SELECT 1');
  }
  private db() { if (!this.pool) throw new Error('Messaging database is not initialized'); return this.pool; }
  private blocked(a: string, b: string) { return this.blocks.has(`${a}:${b}`) || this.blocks.has(`${b}:${a}`); }

  async createConversation(userId: string, participantIds: string[], kind: 'connection' | 'trip' = 'connection') {
    const participants = [...new Set([userId, ...participantIds])];
    if (participants.length < 2 || participants.length > 20 || participants.some((id) => this.blocked(userId, id))) return { error: 'forbidden' as const };
    if (this.pool) {
      const db = this.db();
      if (kind === 'connection') {
        const [rows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM travel_connections a JOIN travel_connections b ON b.sender_id=a.receiver_id AND b.receiver_id=a.sender_id WHERE a.sender_id=? AND a.receiver_id=? AND a.status=\'connected\' AND b.status=\'connected\'', [userId, participants[1]]);
        if (Number(rows[0]?.total) < 1) return { error: 'connection_required' as const };
      }
      const [candidates] = await db.query<RowDataPacket[]>('SELECT c.id FROM conversations c JOIN conversation_participants p ON p.conversation_id=c.id AND p.user_id=? AND p.removed_at IS NULL WHERE c.kind=?', [userId, kind]);
      for (const candidate of candidates) {
        const [rows] = await db.query<RowDataPacket[]>('SELECT user_id FROM conversation_participants WHERE conversation_id=? AND removed_at IS NULL', [candidate.id]);
        const existingParticipants = rows.map((row) => String(row.user_id)).sort();
        if (existingParticipants.length === participants.length && existingParticipants.every((id, index) => id === participants.slice().sort()[index])) return { conversation: { id: String(candidate.id) } };
      }
      const id = randomUUID(); const conn = await db.getConnection();
      try { await conn.beginTransaction(); await conn.query('INSERT INTO conversations (id,kind,created_by) VALUES (?,?,?)', [id, kind, userId]); for (const participant of participants) await conn.query('INSERT INTO conversation_participants (conversation_id,user_id) VALUES (?,?)', [id, participant]); await conn.commit(); return { conversation: { id, kind, createdBy: userId, createdAt: new Date().toISOString() } }; } catch (error) { await conn.rollback(); throw error; } finally { conn.release(); }
    }
    if (!this.memory) throw new Error('Database is required');
    for (const conversation of this.conversations.values()) if (conversation.kind === kind && participants.every((id) => conversation.participants.has(id)) && conversation.participants.size === participants.length) return { conversation };
    const conversation: MemoryConversation = { id: randomUUID(), kind, createdBy: userId, createdAt: new Date().toISOString(), participants: new Set(participants), messages: [] }; this.conversations.set(conversation.id, conversation); return { conversation };
  }

  async isParticipant(conversationId: string, userId: string) {
    if (this.pool) { const [rows] = await this.db().query<RowDataPacket[]>('SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=? AND removed_at IS NULL LIMIT 1', [conversationId, userId]); return Boolean(rows[0]); }
    return this.conversations.get(conversationId)?.participants.has(userId) ?? false;
  }
  async listConversations(userId: string) { if (this.pool) { const [rows] = await this.db().query<RowDataPacket[]>('SELECT c.id,c.kind,c.created_by,c.created_at,MAX(m.created_at) AS last_message_at FROM conversations c JOIN conversation_participants p ON p.conversation_id=c.id AND p.user_id=? AND p.removed_at IS NULL LEFT JOIN messages m ON m.conversation_id=c.id AND m.deleted_at IS NULL GROUP BY c.id ORDER BY COALESCE(last_message_at,c.created_at) DESC', [userId]); return rows.map((r) => ({ id: String(r.id), kind: r.kind, createdBy: String(r.created_by), createdAt: new Date(r.created_at).toISOString() })); } return [...this.conversations.values()].filter((c) => c.participants.has(userId)).map(({ participants: _p, messages: _m, ...c }) => c); }
  async listMessages(conversationId: string, userId: string, before?: string, limit = 50) { if (!(await this.isParticipant(conversationId, userId))) return { error: 'forbidden' as const }; const safeLimit = Math.min(Math.max(limit, 1), 100); if (this.pool) { const [rows] = await this.db().query<RowDataPacket[]>('SELECT id,conversation_id,sender_id,body,created_at FROM messages WHERE conversation_id=? AND deleted_at IS NULL AND (? IS NULL OR created_at<?) ORDER BY created_at DESC,id DESC LIMIT ?', [conversationId, before ?? null, before ?? null, safeLimit]); return { messages: rows.reverse().map((r) => ({ id: String(r.id), conversationId: String(r.conversation_id), senderId: String(r.sender_id), body: String(r.body), createdAt: new Date(r.created_at).toISOString() })) }; } const c = this.conversations.get(conversationId); if (!c) return { messages: [] }; return { messages: c.messages.slice(-safeLimit) };
  }
  async sendMessage(conversationId: string, senderId: string, body: string) { const clean = body.trim(); if (!clean || clean.length > 4000) return { error: 'invalid' as const }; if (!(await this.isParticipant(conversationId, senderId))) return { error: 'forbidden' as const }; if (this.pool) { const id = randomUUID(); await this.db().query('INSERT INTO messages (id,conversation_id,sender_id,body) VALUES (?,?,?,?)', [id, conversationId, senderId, clean]); const message = { id, conversationId, senderId, body: clean, createdAt: new Date().toISOString() }; await this.notifyParticipants(conversationId, senderId, message); this.broadcast(conversationId, message); return { message }; } const c = this.conversations.get(conversationId); if (!c) return { error: 'not_found' as const }; const message = { id: randomUUID(), conversationId, senderId, body: clean, createdAt: new Date().toISOString() }; c.messages.push(message); this.broadcast(conversationId, message); return { message }; }
  async markRead(conversationId: string, userId: string, messageId?: string) { if (!(await this.isParticipant(conversationId, userId))) return false; if (this.pool) { await this.db().query('INSERT INTO message_read_states (conversation_id,user_id,last_read_message_id,read_at) VALUES (?,?,?,NOW()) ON DUPLICATE KEY UPDATE last_read_message_id=VALUES(last_read_message_id),read_at=NOW()', [conversationId,userId,messageId ?? null]); } return true; }
  async listNotifications(userId: string, unreadOnly = false, limit = 50) { if (this.pool) { const [rows] = await this.db().query<RowDataPacket[]>('SELECT id,type,actor_id,entity_id,body,created_at,read_at FROM notifications WHERE user_id=? AND (?=0 OR read_at IS NULL) ORDER BY created_at DESC LIMIT ?', [userId, unreadOnly ? 1 : 0, Math.min(Math.max(limit, 1), 100)]); return rows.map((r) => ({ id: String(r.id), type: String(r.type), actorId: r.actor_id ? String(r.actor_id) : undefined, entityId: r.entity_id ? String(r.entity_id) : undefined, body: String(r.body), createdAt: new Date(r.created_at).toISOString(), readAt: r.read_at ? new Date(r.read_at).toISOString() : undefined })); } return [...this.notifications.values()].filter((n) => n.userId === userId && (!unreadOnly || !n.readAt)).slice(-limit).reverse(); }
  async unreadCount(userId: string) { return (await this.listNotifications(userId, true, 100)).length; }
  async markNotificationsRead(userId: string, notificationId?: string) { if (this.pool) await this.db().query(notificationId ? 'UPDATE notifications SET read_at=NOW() WHERE id=? AND user_id=?' : 'UPDATE notifications SET read_at=NOW() WHERE user_id=? AND read_at IS NULL', notificationId ? [notificationId,userId] : [userId]); else for (const n of this.notifications.values()) if (n.userId === userId && (!notificationId || n.id === notificationId)) n.readAt = new Date().toISOString(); }
  async block(blockerId: string, blockedId: string) { if (this.pool) await this.db().query('INSERT IGNORE INTO blocks (blocker_id,blocked_id) VALUES (?,?)', [blockerId,blockedId]); else this.blocks.add(`${blockerId}:${blockedId}`); }
  async addNotification(userId: string, type: string, body: string, actorId?: string, entityId?: string, dedupeKey?: string) { if (this.pool) { await this.db().query('INSERT IGNORE INTO notifications (id,user_id,type,actor_id,entity_id,body,dedupe_key) VALUES (?,?,?,?,?,?,?)', [randomUUID(),userId,type,actorId ?? null,entityId ?? null,body,dedupeKey ?? null]); } else if (!dedupeKey || ![...this.notifications.values()].some((n) => n.userId === userId && n.dedupeKey === dedupeKey)) { const n = { id: randomUUID(), userId, type, body, actorId, entityId, createdAt: new Date().toISOString(), dedupeKey }; this.notifications.set(n.id, n); } }
  private async notifyParticipants(conversationId: string, senderId: string, message: Message) { const participants = this.pool ? (await this.db().query<RowDataPacket[]>('SELECT user_id FROM conversation_participants WHERE conversation_id=? AND user_id<>? AND removed_at IS NULL', [conversationId,senderId]))[0].map((r) => String(r.user_id)) : [...(this.conversations.get(conversationId)?.participants ?? [])].filter((id) => id !== senderId); for (const userId of participants) await this.addNotification(userId, 'new_message', 'You have a new TripMates message', senderId, conversationId, `message:${message.id}:${userId}`); }
  subscribe(conversationId: string, response: Response) { const set = this.streams.get(conversationId) ?? new Set<Response>(); set.add(response); this.streams.set(conversationId, set); response.on('close', () => set.delete(response)); }
  private broadcast(conversationId: string, payload: unknown) { for (const response of this.streams.get(conversationId) ?? []) response.write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`); }
  get persistenceMode() { return this.pool ? 'managed-database' : this.memory ? 'explicit-development-memory' : 'uninitialized'; }
}
export const messagingStore = new MessagingStore();
