import mysql from 'mysql2/promise';
import { destinations, trips } from '../src/shared/data';

console.log(`TripMates seed catalog prepared: ${destinations.length} destinations, ${trips.length} trips.`);

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('DATABASE_URL is not configured; no database seed was written.');
} else {
  const connection = await mysql.createConnection(url);
  try {
    for (const destination of destinations) {
      await connection.execute(
        `INSERT INTO destinations (id,name,region,country,description,image_url,trip_count,mood)
         VALUES (?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name),region=VALUES(region),country=VALUES(country),description=VALUES(description),image_url=VALUES(image_url),trip_count=VALUES(trip_count),mood=VALUES(mood)`,
        [destination.id, destination.name, destination.region, destination.country, destination.description, destination.imageUrl, destination.tripCount, destination.mood],
      );
    }
    for (const trip of trips) {
      await connection.execute(
        `INSERT INTO trips (id,destination_id,title,summary,start_date,end_date,duration,budget,currency,members,capacity,organizer,organizer_initials,organizer_verified,style,image_url)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE destination_id=VALUES(destination_id),title=VALUES(title),summary=VALUES(summary),start_date=VALUES(start_date),end_date=VALUES(end_date),duration=VALUES(duration),budget=VALUES(budget),currency=VALUES(currency),members=VALUES(members),capacity=VALUES(capacity),organizer=VALUES(organizer),organizer_initials=VALUES(organizer_initials),organizer_verified=VALUES(organizer_verified),style=VALUES(style),image_url=VALUES(image_url)`,
        [trip.id, trip.destinationId, trip.title, trip.summary, trip.startDate, trip.endDate, trip.duration, trip.budget, trip.currency, trip.members, trip.capacity, trip.organizer, trip.organizerInitials, trip.organizerVerified, trip.style, trip.imageUrl],
      );
    }
    console.log('TripMates editorial fixtures written to the configured database.');
  } finally {
    await connection.end();
  }
}
