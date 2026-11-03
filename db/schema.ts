import { int, mysqlTable, timestamp, varchar, text, decimal, boolean, uniqueIndex, index } from 'drizzle-orm/mysql-core';

export const destinations = mysqlTable('destinations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  region: varchar('region', { length: 120 }).notNull(),
  country: varchar('country', { length: 120 }).notNull(),
  description: text('description').notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  tripCount: int('trip_count').notNull().default(0),
  mood: varchar('mood', { length: 120 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ destinationNameIdx: uniqueIndex('destinations_name_unique').on(table.name) }));

export const trips = mysqlTable('trips', {
  id: varchar('id', { length: 64 }).primaryKey(),
  destinationId: varchar('destination_id', { length: 64 }).notNull(),
  title: varchar('title', { length: 180 }).notNull(),
  summary: text('summary').notNull(),
  startDate: varchar('start_date', { length: 40 }).notNull(),
  endDate: varchar('end_date', { length: 40 }).notNull(),
  duration: varchar('duration', { length: 80 }).notNull(),
  budget: decimal('budget', { precision: 10, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('INR'),
  members: int('members').notNull().default(1),
  capacity: int('capacity').notNull(),
  organizer: varchar('organizer', { length: 120 }).notNull(),
  organizerInitials: varchar('organizer_initials', { length: 4 }).notNull(),
  organizerVerified: boolean('organizer_verified').notNull().default(false),
  style: varchar('style', { length: 60 }).notNull(),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ destinationIdx: index('trips_destination_idx').on(table.destinationId), datesIdx: index('trips_dates_idx').on(table.startDate, table.endDate) }));

export const savedTrips = mysqlTable('saved_trips', {
  id: int('id').autoincrement().primaryKey(),
  visitorId: varchar('visitor_id', { length: 128 }).notNull(),
  tripId: varchar('trip_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ visitorTripUnique: uniqueIndex('saved_trips_visitor_trip_unique').on(table.visitorId, table.tripId) }));

export const buddyInterests = mysqlTable('buddy_interests', {
  id: int('id').autoincrement().primaryKey(),
  visitorId: varchar('visitor_id', { length: 128 }).notNull(),
  buddyId: varchar('buddy_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ visitorBuddyUnique: uniqueIndex('buddy_interests_visitor_buddy_unique').on(table.visitorId, table.buddyId) }));
