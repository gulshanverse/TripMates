import mysql, { type Pool } from 'mysql2/promise';
import { trips, buddies, destinations } from '../shared/data';
import type { Trip } from '../shared/types';

const migrationStatements = [
  `CREATE TABLE IF NOT EXISTS destinations (id VARCHAR(64) PRIMARY KEY, name VARCHAR(120) NOT NULL, region VARCHAR(120) NOT NULL, country VARCHAR(120) NOT NULL, description TEXT NOT NULL, image_url VARCHAR(500) NOT NULL, trip_count INT NOT NULL DEFAULT 0, mood VARCHAR(120) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY destinations_name_unique (name))`,
  `CREATE TABLE IF NOT EXISTS trips (id VARCHAR(64) PRIMARY KEY, destination_id VARCHAR(64) NOT NULL, title VARCHAR(180) NOT NULL, summary TEXT NOT NULL, start_date VARCHAR(40) NOT NULL, end_date VARCHAR(40) NOT NULL, duration VARCHAR(80) NOT NULL, budget DECIMAL(10, 2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'INR', members INT NOT NULL DEFAULT 1, capacity INT NOT NULL, organizer VARCHAR(120) NOT NULL, organizer_initials VARCHAR(4) NOT NULL, organizer_verified BOOLEAN NOT NULL DEFAULT FALSE, style VARCHAR(60) NOT NULL, image_url VARCHAR(500) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX trips_destination_idx (destination_id), INDEX trips_dates_idx (start_date, end_date), CONSTRAINT trips_destination_fk FOREIGN KEY (destination_id) REFERENCES destinations(id))`,
  `CREATE TABLE IF NOT EXISTS saved_trips (id INT AUTO_INCREMENT PRIMARY KEY, visitor_id VARCHAR(128) NOT NULL, trip_id VARCHAR(64) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY saved_trips_visitor_trip_unique (visitor_id, trip_id))`,
  `CREATE TABLE IF NOT EXISTS buddy_interests (id INT AUTO_INCREMENT PRIMARY KEY, visitor_id VARCHAR(128) NOT NULL, buddy_id VARCHAR(64) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY buddy_interests_visitor_buddy_unique (visitor_id, buddy_id))`,
];

export class TravelStore {
  private pool: Pool | null = null;
  private localSaved = new Set<string>();
  private localInterests = new Set<string>();
  private ready = false;

  async initialize() {
    if (!process.env.DATABASE_URL) return;
    try {
      this.pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 5, waitForConnections: true });
      for (const statement of migrationStatements) await this.pool.query(statement);
      this.ready = true;
    } catch (error) {
      console.warn('[TripMates] Database unavailable; keeping the API available with session-local persistence.', error instanceof Error ? error.message : error);
      this.pool?.end().catch(() => undefined);
      this.pool = null;
    }
  }

  async listTrips(destinationId?: string) {
    const source = destinationId ? trips.filter((trip) => trip.destinationId === destinationId) : trips;
    const saved = await this.savedIds('demo-visitor');
    return source.map((trip) => ({ ...trip, saved: saved.has(trip.id) }));
  }

  async getTrip(id: string) {
    const trip = trips.find((item) => item.id === id);
    if (!trip) return null;
    const saved = await this.savedIds('demo-visitor');
    return { ...trip, saved: saved.has(trip.id) };
  }

  async listDestinations() {
    return destinations;
  }

  async listBuddies() {
    const interests = await this.interestIds('demo-visitor');
    return buddies.map((buddy) => ({ ...buddy, interested: interests.has(buddy.id) }));
  }

  async saveTrip(tripId: string, visitorId: string) {
    if (!trips.some((trip) => trip.id === tripId)) return false;
    if (this.pool) {
      await this.pool.query('INSERT IGNORE INTO saved_trips (visitor_id, trip_id) VALUES (?, ?)', [visitorId, tripId]);
    }
    this.localSaved.add(`${visitorId}:${tripId}`);
    return true;
  }

  async expressInterest(buddyId: string, visitorId: string) {
    if (!buddies.some((buddy) => buddy.id === buddyId)) return false;
    if (this.pool) {
      await this.pool.query('INSERT IGNORE INTO buddy_interests (visitor_id, buddy_id) VALUES (?, ?)', [visitorId, buddyId]);
    }
    this.localInterests.add(`${visitorId}:${buddyId}`);
    return true;
  }

  async savedIds(visitorId: string) {
    const ids = new Set<string>();
    for (const key of this.localSaved) if (key.startsWith(`${visitorId}:`)) ids.add(key.slice(visitorId.length + 1));
    if (this.pool) {
      const [rows] = await this.pool.query('SELECT trip_id FROM saved_trips WHERE visitor_id = ?', [visitorId]);
      for (const row of rows as { trip_id: string }[]) ids.add(row.trip_id);
    }
    return ids;
  }

  async interestIds(visitorId: string) {
    const ids = new Set<string>();
    for (const key of this.localInterests) if (key.startsWith(`${visitorId}:`)) ids.add(key.slice(visitorId.length + 1));
    if (this.pool) {
      const [rows] = await this.pool.query('SELECT buddy_id FROM buddy_interests WHERE visitor_id = ?', [visitorId]);
      for (const row of rows as { buddy_id: string }[]) ids.add(row.buddy_id);
    }
    return ids;
  }

  get persistenceMode() { return this.ready ? 'managed-database' : 'session-local'; }
}

export const travelStore = new TravelStore();
export type TripWithSaved = Trip & { saved?: boolean };
