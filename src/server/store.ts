import mysql, { type Pool } from 'mysql2/promise';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { trips, buddies, destinations } from '../shared/data';
import type { Trip } from '../shared/types';

export type PublicUser = { id: string; email: string; displayName: string; profile: UserProfile };
export type UserProfile = {
  displayName: string; photoUrl?: string; age?: number; homeLocation?: string;
  preferredDestinations: string[]; travelInterests: string[]; travelStyle?: string;
  budgetRange?: string; languages: string[]; travelPreferences?: string;
  visibility: 'discoverable' | 'private';
};
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type JoinRequest = { id: string; tripId: string; userId: string; status: JoinRequestStatus; createdAt: string };
export type Connection = { id: string; userId: string; buddyId: string; status: 'pending' | 'connected' | 'declined' | 'cancelled' };

type User = PublicUser & { passwordHash: string; passwordSalt: string; emailVerified: boolean; deactivatedAt?: string };
type Session = { userId: string; expiresAt: number };

const migrationStatements = [
  `CREATE TABLE IF NOT EXISTS destinations (id VARCHAR(64) PRIMARY KEY, name VARCHAR(120) NOT NULL, region VARCHAR(120) NOT NULL, country VARCHAR(120) NOT NULL, description TEXT NOT NULL, image_url VARCHAR(500) NOT NULL, trip_count INT NOT NULL DEFAULT 0, mood VARCHAR(120) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY destinations_name_unique (name))`,
  `CREATE TABLE IF NOT EXISTS trips (id VARCHAR(64) PRIMARY KEY, destination_id VARCHAR(64) NOT NULL, title VARCHAR(180) NOT NULL, summary TEXT NOT NULL, start_date VARCHAR(40) NOT NULL, end_date VARCHAR(40) NOT NULL, duration VARCHAR(80) NOT NULL, budget DECIMAL(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'INR', members INT NOT NULL DEFAULT 1, capacity INT NOT NULL, organizer VARCHAR(120) NOT NULL, organizer_initials VARCHAR(4) NOT NULL, organizer_verified BOOLEAN NOT NULL DEFAULT FALSE, style VARCHAR(60) NOT NULL, image_url VARCHAR(500) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX trips_destination_idx (destination_id), INDEX trips_dates_idx (start_date, end_date), CONSTRAINT trips_destination_fk FOREIGN KEY (destination_id) REFERENCES destinations(id))`,
  `CREATE TABLE IF NOT EXISTS saved_trips (id INT AUTO_INCREMENT PRIMARY KEY, visitor_id VARCHAR(128) NOT NULL, trip_id VARCHAR(64) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY saved_trips_visitor_trip_unique (visitor_id, trip_id))`,
  `CREATE TABLE IF NOT EXISTS buddy_interests (id INT AUTO_INCREMENT PRIMARY KEY, visitor_id VARCHAR(128) NOT NULL, buddy_id VARCHAR(64) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY buddy_interests_visitor_buddy_unique (visitor_id, buddy_id))`,
];

function hashPassword(password: string, salt: string) { return scryptSync(password, salt, 64).toString('hex'); }
function publicUser(user: User): PublicUser { const { passwordHash: _hash, passwordSalt: _salt, ...safe } = user; return safe; }

export class TravelStore {
  private pool: Pool | null = null;
  private localSaved = new Set<string>();
  private localInterests = new Set<string>();
  private users = new Map<string, User>();
  private emailToUser = new Map<string, string>();
  private sessions = new Map<string, Session>();
  private profiles = new Map<string, UserProfile>();
  private joinRequests = new Map<string, JoinRequest>();
  private connections = new Map<string, Connection>();
  private rateBuckets = new Map<string, { count: number; resetAt: number }>();
  private ready = false;

  async initialize() {
    if (!process.env.DATABASE_URL) return;
    try {
      this.pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5, waitForConnections: true });
      for (const statement of migrationStatements) await this.pool.query(statement);
      this.ready = true;
    } catch (error) {
      console.warn('[TripMates] Database unavailable; keeping the API available with session-local persistence.', error instanceof Error ? error.message : error);
      this.pool?.end().catch(() => undefined); this.pool = null;
    }
  }

  rateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
    const now = Date.now(); const bucket = this.rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) { this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
    if (bucket.count >= limit) return false; bucket.count += 1; return true;
  }

  register(email: string, password: string, displayName: string) {
    const normalized = email.trim().toLowerCase();
    if (this.emailToUser.has(normalized)) return null;
    const id = randomUUID(); const salt = randomBytes(16).toString('hex');
    const profile: UserProfile = { displayName: displayName.trim(), preferredDestinations: [], travelInterests: [], languages: [], visibility: 'discoverable' };
    const user: User = { id, email: normalized, displayName: profile.displayName, profile, passwordSalt: salt, passwordHash: hashPassword(password, salt), emailVerified: false };
    this.users.set(id, user); this.emailToUser.set(normalized, id); this.profiles.set(id, profile);
    return publicUser(user);
  }

  authenticate(email: string, password: string) {
    const user = this.users.get(this.emailToUser.get(email.trim().toLowerCase()) ?? '');
    if (!user || user.deactivatedAt) return null;
    const actual = Buffer.from(user.passwordHash, 'hex'); const expected = Buffer.from(hashPassword(password, user.passwordSalt), 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected) ? publicUser(user) : null;
  }

  createSession(userId: string) { const token = randomBytes(32).toString('hex'); this.sessions.set(token, { userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 }); return token; }
  getUserBySession(token?: string) { if (!token) return null; const session = this.sessions.get(token); if (!session || session.expiresAt < Date.now()) { if (session) this.sessions.delete(token); return null; } const user = this.users.get(session.userId); return user && !user.deactivatedAt ? publicUser(user) : null; }
  destroySession(token?: string) { if (token) this.sessions.delete(token); }
  updateProfile(userId: string, patch: Partial<UserProfile>) { const user = this.users.get(userId); if (!user) return null; const profile = { ...user.profile, ...patch, displayName: patch.displayName?.trim() || user.profile.displayName }; user.profile = profile; user.displayName = profile.displayName; this.profiles.set(userId, profile); return publicUser(user); }
  deactivate(userId: string) { const user = this.users.get(userId); if (!user) return false; user.deactivatedAt = new Date().toISOString(); for (const [token, session] of this.sessions) if (session.userId === userId) this.sessions.delete(token); return true; }

  async listTrips(destinationId?: string, visitorId = 'anonymous') { const source = destinationId ? trips.filter((trip) => trip.destinationId === destinationId) : trips; const saved = await this.savedIds(visitorId); return source.map((trip) => ({ ...trip, saved: saved.has(trip.id) })); }
  async getTrip(id: string, visitorId = 'anonymous') { const trip = trips.find((item) => item.id === id); if (!trip) return null; const saved = await this.savedIds(visitorId); return { ...trip, saved: saved.has(trip.id) }; }
  async listDestinations() { return destinations; }
  async listBuddies(visitorId = 'anonymous') { const interests = await this.interestIds(visitorId); return buddies.map((buddy) => ({ ...buddy, interested: interests.has(buddy.id) })); }
  async saveTrip(tripId: string, visitorId: string) { if (!trips.some((trip) => trip.id === tripId)) return false; if (this.pool) await this.pool.query('INSERT IGNORE INTO saved_trips (visitor_id, trip_id) VALUES (?, ?)', [visitorId, tripId]); this.localSaved.add(`${visitorId}:${tripId}`); return true; }
  async expressInterest(buddyId: string, visitorId: string) { if (!buddies.some((buddy) => buddy.id === buddyId)) return false; if (this.pool) await this.pool.query('INSERT IGNORE INTO buddy_interests (visitor_id, buddy_id) VALUES (?, ?)', [visitorId, buddyId]); this.localInterests.add(`${visitorId}:${buddyId}`); const key = `${visitorId}:${buddyId}`; if (!this.connections.has(key)) this.connections.set(key, { id: randomUUID(), userId: visitorId, buddyId, status: 'pending' }); return true; }
  async cancelInterest(buddyId: string, visitorId: string) { const item = this.connections.get(`${visitorId}:${buddyId}`); if (!item || item.status !== 'pending') return false; item.status = 'cancelled'; return true; }
  createTrip(user: PublicUser, input: Pick<Trip, 'destinationId' | 'title' | 'summary' | 'startDate' | 'endDate' | 'duration' | 'budget' | 'capacity' | 'style' | 'imageUrl'>) {
    const destination = destinations.find((item) => item.id === input.destinationId); if (!destination) return null;
    const trip: Trip = { ...input, id: `user-${randomUUID()}`, destinationName: destination.name, region: destination.region, currency: 'INR', members: 1, organizer: user.displayName, organizerInitials: user.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), organizerVerified: false, tags: [], itinerary: [] };
    trips.push(trip); return trip;
  }
  updateTrip(tripId: string, user: PublicUser, patch: Partial<Pick<Trip, 'title' | 'summary' | 'startDate' | 'endDate' | 'duration' | 'budget' | 'capacity' | 'style'>>) {
    const trip = trips.find((item) => item.id === tripId); if (!trip || trip.organizer !== user.displayName) return null; Object.assign(trip, patch); return trip;
  }
  getConnections(userId: string) { return [...this.connections.values()].filter((item) => item.userId === userId).map((item) => ({ ...item })); }
  async savedIds(visitorId: string) { const ids = new Set<string>(); for (const key of this.localSaved) if (key.startsWith(`${visitorId}:`)) ids.add(key.slice(visitorId.length + 1)); if (this.pool) { const [rows] = await this.pool.query('SELECT trip_id FROM saved_trips WHERE visitor_id = ?', [visitorId]); for (const row of rows as { trip_id: string }[]) ids.add(row.trip_id); } return ids; }
  async interestIds(visitorId: string) { const ids = new Set<string>(); for (const key of this.localInterests) if (key.startsWith(`${visitorId}:`)) ids.add(key.slice(visitorId.length + 1)); if (this.pool) { const [rows] = await this.pool.query('SELECT buddy_id FROM buddy_interests WHERE visitor_id = ?', [visitorId]); for (const row of rows as { buddy_id: string }[]) ids.add(row.buddy_id); } return ids; }

  requestJoin(tripId: string, userId: string) {
    const trip = trips.find((item) => item.id === tripId); if (!trip) return { error: 'not_found' as const };
    const existing = [...this.joinRequests.values()].find((request) => request.tripId === tripId && request.userId === userId && request.status === 'pending');
    if (existing) return { error: 'duplicate' as const, request: existing };
    if (trip.members >= trip.capacity) return { error: 'full' as const };
    const request = { id: randomUUID(), tripId, userId, status: 'pending' as const, createdAt: new Date().toISOString() }; this.joinRequests.set(request.id, request); return { request };
  }
  listJoinRequests(userId: string, organizer = false) { return [...this.joinRequests.values()].filter((item) => organizer ? trips.some((trip) => trip.id === item.tripId && trip.organizer.toLowerCase().includes(userId.toLowerCase())) : item.userId === userId); }
  updateJoinRequest(requestId: string, userId: string, status: 'approved' | 'rejected' | 'cancelled') {
    const request = this.joinRequests.get(requestId); if (!request || request.status !== 'pending') return { error: 'not_found' as const };
    const trip = trips.find((item) => item.id === request.tripId); if (!trip) return { error: 'not_found' as const };
    if (status === 'cancelled' && request.userId !== userId) return { error: 'forbidden' as const };
    if (status !== 'cancelled' && !trip.organizer.toLowerCase().includes(userId.toLowerCase())) return { error: 'forbidden' as const };
    if (status === 'approved') { if (trip.members >= trip.capacity) return { error: 'full' as const }; trip.members += 1; }
    request.status = status; return { request };
  }
  get persistenceMode() { return this.ready ? 'managed-database' : 'session-local'; }
}
export const travelStore = new TravelStore();
export type TripWithSaved = Trip & { saved?: boolean };
export { publicUser };
