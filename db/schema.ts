import { int, mysqlTable, timestamp, varchar, text, decimal, boolean, uniqueIndex, index, json, mysqlEnum } from 'drizzle-orm/mysql-core';

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
  organizerUserId: varchar('organizer_user_id', { length: 36 }),
  organizerInitials: varchar('organizer_initials', { length: 4 }).notNull(),
  organizerVerified: boolean('organizer_verified').notNull().default(false),
  style: varchar('style', { length: 60 }).notNull(),
  experienceType: varchar('experience_type', { length: 80 }),
  tags: json('tags').notNull().default([]),
  imageUrl: varchar('image_url', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ destinationIdx: index('trips_destination_idx').on(table.destinationId), datesIdx: index('trips_dates_idx').on(table.startDate, table.endDate), organizerIdx: index('trips_organizer_user_idx').on(table.organizerUserId) }));

export const savedTrips = mysqlTable('saved_trips', {
  id: int('id').autoincrement().primaryKey(),
  visitorId: varchar('visitor_id', { length: 128 }).notNull(),
  userId: varchar('user_id', { length: 36 }),
  tripId: varchar('trip_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ visitorTripUnique: uniqueIndex('saved_trips_visitor_trip_unique').on(table.visitorId, table.tripId), userTripUnique: uniqueIndex('saved_trips_user_trip_unique').on(table.userId, table.tripId), userIdx: index('saved_trips_user_idx').on(table.userId) }));

export const buddyInterests = mysqlTable('buddy_interests', {
  id: int('id').autoincrement().primaryKey(),
  visitorId: varchar('visitor_id', { length: 128 }).notNull(),
  buddyId: varchar('buddy_id', { length: 64 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ visitorBuddyUnique: uniqueIndex('buddy_interests_visitor_buddy_unique').on(table.visitorId, table.buddyId) }));

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(), email: varchar('email', { length: 254 }).notNull(), displayName: varchar('display_name', { length: 80 }).notNull(),
  passwordHash: varchar('password_hash', { length: 128 }).notNull(), passwordSalt: varchar('password_salt', { length: 64 }).notNull(), emailVerified: boolean('email_verified').notNull().default(false), deactivatedAt: timestamp('deactivated_at'), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ emailUnique: uniqueIndex('users_email_unique').on(table.email) }));

export const userProfiles = mysqlTable('user_profiles', {
  userId: varchar('user_id', { length: 36 }).primaryKey(), photoUrl: varchar('photo_url', { length: 500 }), age: int('age'), homeLocation: varchar('home_location', { length: 120 }), preferredDestinations: json('preferred_destinations').notNull(), travelInterests: json('travel_interests').notNull(), travelStyle: varchar('travel_style', { length: 60 }), budgetRange: varchar('budget_range', { length: 60 }), languages: json('languages').notNull(), travelPreferences: varchar('travel_preferences', { length: 500 }), visibility: mysqlEnum('visibility', ['discoverable', 'private']).notNull().default('discoverable'), updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tripJoinRequests = mysqlTable('trip_join_requests', {
  id: varchar('id', { length: 36 }).primaryKey(), tripId: varchar('trip_id', { length: 64 }).notNull(), userId: varchar('user_id', { length: 36 }).notNull(), status: mysqlEnum('status', ['pending', 'approved', 'rejected', 'cancelled']).notNull().default('pending'), createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({ tripStatusIdx: index('trip_join_requests_trip_status_idx').on(table.tripId, table.status) }));

export const tripParticipants = mysqlTable('trip_participants', { tripId: varchar('trip_id', { length: 64 }).notNull(), userId: varchar('user_id', { length: 36 }).notNull(), joinedAt: timestamp('joined_at').defaultNow().notNull() });

export const conversations = mysqlTable('conversations', {
  id: varchar('id', { length: 36 }).primaryKey(),
  kind: mysqlEnum('kind', ['connection', 'trip']).notNull().default('connection'),
  createdBy: varchar('created_by', { length: 36 }).notNull(),
  tripId: varchar('trip_id', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
