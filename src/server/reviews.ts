import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { randomUUID } from 'node:crypto';

type RatingInput = { overallRating: number; tripExperienceRating: number; organizerExperienceRating: number; feedback?: string };
type ReviewStatus = 'visible' | 'hidden' | 'under_review';
type Review = RatingInput & { id: string; tripId: string; organizerId: string; reviewerId: string; reviewerDisplayName?: string; status: ReviewStatus; createdAt: string; updatedAt: string; reviewWindowExpiresAt: string; response?: { id: string; response: string; createdAt: string; updatedAt: string } };
type Completion = { tripId: string; participantId: string; organizerId?: string; completedAt: string; reviewWindowExpiresAt: string };

const validRating = (value: number) => Number.isInteger(value) && value >= 1 && value <= 5;
const trimFeedback = (value?: string) => value?.trim() || undefined;

export class ReviewsStore {
  private pool: Pool | null = null;
  private memory = process.env.NODE_ENV !== 'production' && process.env.ALLOW_MEMORY_FALLBACK === 'true';
  private completions = new Map<string, Completion>();
  private reviews = new Map<string, Review>();
  private responses = new Map<string, Review['response']>();
  private reports = new Map<string, { id: string; reviewId: string; reporterId: string; reason: string; status: string }>();

  async initialize() {
    if (!process.env.DATABASE_URL) { if (this.memory) return; throw new Error('DATABASE_URL is required for reviews.'); }
    this.pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 10, waitForConnections: true });
    await this.pool.query('SELECT 1');
  }
  private db() { if (!this.pool) throw new Error('Reviews database is not initialized'); return this.pool; }
  async close() { if (this.pool) { await this.pool.end(); this.pool = null; } }

  recordMemoryCompletion(tripId: string, participantIds: string[], completedAt = new Date(), organizerId?: string) {
    const expires = new Date(completedAt.getTime() + 30 * 86400000);
    for (const participantId of participantIds) {
      const key = `${tripId}:${participantId}`;
      if (!this.completions.has(key)) this.completions.set(key, { tripId, participantId, organizerId, completedAt: completedAt.toISOString(), reviewWindowExpiresAt: expires.toISOString() });
    }
  }

  async createReview(reviewerId: string, tripId: string, input: RatingInput) {
    if (![input.overallRating, input.tripExperienceRating, input.organizerExperienceRating].every(validRating)) return { error: 'invalid_rating' as const };
    const feedback = trimFeedback(input.feedback);
    if (feedback && feedback.length > 2000) return { error: 'invalid_feedback' as const };
    if (this.pool) {
      const connection = await this.db().getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query<RowDataPacket[]>(`SELECT c.trip_id,c.participant_id,c.completed_at,c.review_window_expires_at,t.organizer_user_id,t.status,t.cancelled_at
          FROM trip_completion_evidence c JOIN trips t ON t.id=c.trip_id
          WHERE c.trip_id=? AND c.participant_id=? FOR UPDATE`, [tripId, reviewerId]);
        const evidence = rows[0];
        if (!evidence || String(evidence.status) !== 'completed' || evidence.cancelled_at || new Date(evidence.review_window_expires_at).getTime() < Date.now()) { await connection.rollback(); return { error: 'not_eligible' as const }; }
        if (String(evidence.organizer_user_id) === reviewerId) { await connection.rollback(); return { error: 'organizer_cannot_review' as const }; }
        const id = randomUUID();
        try {
          await connection.query('INSERT INTO organizer_reviews (id,trip_id,organizer_id,reviewer_id,overall_rating,trip_experience_rating,organizer_experience_rating,feedback,review_window_expires_at) VALUES (?,?,?,?,?,?,?,?,?)', [id,tripId,evidence.organizer_user_id,reviewerId,input.overallRating,input.tripExperienceRating,input.organizerExperienceRating,feedback ?? null,evidence.review_window_expires_at]);
        } catch (error) { await connection.rollback(); if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return { error: 'duplicate' as const }; throw error; }
        await connection.commit();
        return { review: { id, tripId, organizerId: String(evidence.organizer_user_id), reviewerId, ...input, feedback, status: 'visible' as const, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), reviewWindowExpiresAt: new Date(evidence.review_window_expires_at).toISOString() } };
      } catch (error) { try { await connection.rollback(); } catch {} throw error; } finally { connection.release(); }
    }
    const completion = this.completions.get(`${tripId}:${reviewerId}`);
    if (!completion || new Date(completion.reviewWindowExpiresAt).getTime() < Date.now()) return { error: 'not_eligible' as const };
    if (completion.organizerId === reviewerId) return { error: 'organizer_cannot_review' as const };
    const existing = [...this.reviews.values()].find((review) => review.tripId === tripId && review.reviewerId === reviewerId);
    if (existing) return { error: 'duplicate' as const };
    const review: Review = { id: randomUUID(), tripId, organizerId: completion.organizerId ?? '', reviewerId, ...input, feedback, status: 'visible', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), reviewWindowExpiresAt: completion.reviewWindowExpiresAt };
    this.reviews.set(review.id, review);
    return { review };
  }

  async editReview(reviewerId: string, reviewId: string, input: RatingInput) {
    if (![input.overallRating, input.tripExperienceRating, input.organizerExperienceRating].every(validRating)) return { error: 'invalid_rating' as const };
    if (this.pool) {
      const [result] = await this.db().query('UPDATE organizer_reviews SET overall_rating=?,trip_experience_rating=?,organizer_experience_rating=?,feedback=? WHERE id=? AND reviewer_id=? AND moderation_status<>\'hidden\' AND review_window_expires_at>NOW()', [input.overallRating,input.tripExperienceRating,input.organizerExperienceRating,trimFeedback(input.feedback) ?? null,reviewId,reviewerId]);
      return (result as { affectedRows: number }).affectedRows ? { ok: true } : { error: 'not_editable' as const };
    }
    const review = this.reviews.get(reviewId);
    if (!review || review.reviewerId !== reviewerId || review.status === 'hidden' || new Date(review.reviewWindowExpiresAt).getTime() < Date.now()) return { error: 'not_editable' as const };
    Object.assign(review, input, { feedback: trimFeedback(input.feedback), updatedAt: new Date().toISOString() });
    return { ok: true };
  }

  async listForTrip(tripId: string) { return this.pool ? this.queryReviews('r.trip_id=?', [tripId]) : [...this.reviews.values()].filter((r) => r.tripId === tripId && r.status === 'visible').map((r) => this.withMemoryResponse(r)); }
  async listForOrganizer(organizerId: string, includeHidden = false) { return this.pool ? this.queryReviews(`r.organizer_id=?${includeHidden ? '' : " AND r.moderation_status='visible'"}`, [organizerId]) : [...this.reviews.values()].filter((r) => r.organizerId === organizerId && (includeHidden || r.status === 'visible')).map((r) => this.withMemoryResponse(r)); }
  private async queryReviews(where: string, params: string[]) {
    const [rows] = await this.db().query<RowDataPacket[]>(`SELECT r.*,u.display_name reviewer_display_name,rr.id response_id,rr.response response_body,rr.created_at response_created_at,rr.updated_at response_updated_at FROM organizer_reviews r JOIN users u ON u.id=r.reviewer_id LEFT JOIN organizer_review_responses rr ON rr.review_id=r.id WHERE ${where} ORDER BY r.created_at DESC`, params);
    return rows.map((r) => ({ id:String(r.id),tripId:String(r.trip_id),organizerId:String(r.organizer_id),reviewerId:String(r.reviewer_id),reviewerDisplayName:String(r.reviewer_display_name),overallRating:Number(r.overall_rating),tripExperienceRating:Number(r.trip_experience_rating),organizerExperienceRating:Number(r.organizer_experience_rating),feedback:r.feedback ?? undefined,status:r.moderation_status as ReviewStatus,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString(),reviewWindowExpiresAt:new Date(r.review_window_expires_at).toISOString(),response:r.response_id?{id:String(r.response_id),response:String(r.response_body),createdAt:new Date(r.response_created_at).toISOString(),updatedAt:new Date(r.response_updated_at).toISOString()}:undefined }));
  }
  private withMemoryResponse(review: Review) { return { ...review, response: review.response ?? this.responses.get(review.id) }; }

  async reputation(organizerId: string) {
    const reviews = await this.listForOrganizer(organizerId);
    const count = reviews.length;
    return { count, averageRating: count ? Number((reviews.reduce((sum, review) => sum + review.overallRating, 0) / count).toFixed(2)) : null, ratingBreakdown: [5,4,3,2,1].map((rating) => ({ rating, count: reviews.filter((review) => review.overallRating === rating).length })), recentReviews: reviews.slice(0, 5) };
  }

  async respond(organizerId: string, reviewId: string, response: string) {
    const body = response.trim(); if (body.length < 3 || body.length > 2000) return { error: 'invalid_response' as const };
    if (this.pool) {
      const [reviewRows] = await this.db().query<RowDataPacket[]>('SELECT id FROM organizer_reviews WHERE id=? AND organizer_id=? AND moderation_status=\'visible\'', [reviewId,organizerId]);
      if (!reviewRows[0]) return { error: 'forbidden' as const };
      const [existingRows] = await this.db().query<RowDataPacket[]>('SELECT id FROM organizer_review_responses WHERE review_id=?', [reviewId]);
      const responseId = existingRows[0]?.id ? String(existingRows[0].id) : randomUUID();
      const action = existingRows[0] ? 'edited' : 'created';
      if (existingRows[0]) await this.db().query('UPDATE organizer_review_responses SET response=? WHERE review_id=?', [body,reviewId]);
      else await this.db().query('INSERT INTO organizer_review_responses (id,review_id,organizer_id,response) VALUES (?,?,?,?)', [responseId,reviewId,organizerId,body]);
      await this.db().query('INSERT INTO organizer_review_response_audit (id,response_id,review_id,editor_id,action,response) VALUES (?,?,?,?,?,?)', [randomUUID(),responseId,reviewId,organizerId,action,body]);
      return { ok: true };
    }
    const review = this.reviews.get(reviewId); if (!review || review.organizerId !== organizerId || review.status !== 'visible') return { error: 'forbidden' as const };
    const existing = this.responses.get(reviewId); const item = { id: existing?.id ?? randomUUID(), response: body, createdAt: existing?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() }; this.responses.set(reviewId, item); review.response = item; return { ok: true };
  }

  async report(reporterId: string, reviewId: string, reason: string) {
    const body = reason.trim(); if (body.length < 3 || body.length > 500) return { error: 'invalid_reason' as const };
    if (this.pool) { const [reviewRows] = await this.db().query<RowDataPacket[]>('SELECT id FROM organizer_reviews WHERE id=?', [reviewId]); if (!reviewRows[0]) return { error: 'not_found' as const }; try { await this.db().query('INSERT INTO organizer_review_reports (id,review_id,reporter_id,reason) VALUES (?,?,?,?)', [randomUUID(),reviewId,reporterId,body]); return { ok: true }; } catch (error) { if ((error as { code?: string }).code === 'ER_DUP_ENTRY') return { error: 'duplicate' as const }; throw error; } }
    if (!this.reviews.has(reviewId)) return { error: 'not_found' as const }; if ([...this.reports.values()].some((report) => report.reviewId === reviewId && report.reporterId === reporterId)) return { error: 'duplicate' as const }; const report = { id: randomUUID(),reviewId,reporterId,reason:body,status:'submitted' }; this.reports.set(report.id, report); return { ok: true };
  }

  async listReported(actorAllowed: boolean) { if (!actorAllowed) return { error: 'forbidden' as const }; if (this.pool) { const [rows] = await this.db().query<RowDataPacket[]>('SELECT rr.id,rr.review_id,rr.reporter_id,rr.reason,rr.status,rr.created_at FROM organizer_review_reports rr ORDER BY rr.created_at DESC LIMIT 100'); return { reports: rows.map((r) => ({ id:String(r.id),reviewId:String(r.review_id),reporterId:String(r.reporter_id),reason:String(r.reason),status:String(r.status),createdAt:new Date(r.created_at).toISOString() })) }; } return { reports: [...this.reports.values()] }; }

  async moderate(actorId: string, reviewId: string, action: 'hidden'|'restored'|'under_review', note?: string) {
    if (this.pool) { const status = action === 'restored' ? 'visible' : action; const connection = this.db(); const [result] = await connection.query('UPDATE organizer_reviews SET moderation_status=? WHERE id=?', [status,reviewId]); if (!(result as {affectedRows:number}).affectedRows) return {error:'not_found' as const}; await connection.query('INSERT INTO organizer_review_moderation (id,review_id,actor_id,action,note) VALUES (?,?,?,?,?)', [randomUUID(),reviewId,actorId,action,note?.trim() || null]); return { ok: true }; }
    const review = this.reviews.get(reviewId); if (!review) return { error: 'not_found' as const }; review.status = action === 'restored' ? 'visible' : action; return { ok: true };
  }
}

export const reviewsStore = new ReviewsStore();
