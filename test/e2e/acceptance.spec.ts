import { test, expect, type BrowserContext, type Page } from '@playwright/test';

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const password = 'correct-horse-battery';

async function register(page: Page, email: string, displayName: string) {
  await page.goto('/auth');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Display name').fill(displayName);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page).toHaveURL(/\/profile$/);
}

async function login(page: Page, email: string) {
  await page.goto('/auth');
  const toggle = page.getByRole('button', { name: /already have an account/i });
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('main').getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/profile$/);
}

test('registration, profile persistence, and session continuity', async ({ page }) => {
  const email = `e2e-profile-${suffix}@example.com`;
  await register(page, email, 'E2E Traveler');
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'tm_session');
  expect(sessionCookie?.httpOnly).toBeTruthy();
  expect(sessionCookie?.secure).toBeTruthy();
  expect(sessionCookie?.sameSite).toBe('Lax');
  await page.getByLabel('Age (18+)').fill('31');
  await page.getByLabel('Home location').fill('Bengaluru, India');
  await page.getByRole('button', { name: /save profile/i }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
  await page.request.post('/api/auth/logout');
  await page.getByRole('button', { name: /tripmates home/i }).click();
  await login(page, email);
  await expect(page.getByLabel('Age (18+)')).toHaveValue('31');
  await expect(page.getByLabel('Home location')).toHaveValue('Bengaluru, India');
});

test('organizer trip, join request, capacity, connection messaging, and admin protection', async ({ browser }) => {
  const organizerEmail = `e2e-organizer-${suffix}@example.com`;
  const guestEmail = `e2e-guest-${suffix}@example.com`;
  const secondGuestEmail = `e2e-second-${suffix}@example.com`;
  const organizer = await browser.newContext();
  const guest = await browser.newContext();
  const secondGuest = await browser.newContext();
  try {
    const organizerPage = await organizer.newPage();
    const guestPage = await guest.newPage();
    const secondGuestPage = await secondGuest.newPage();
    await register(organizerPage, organizerEmail, 'E2E Organizer');
    await register(guestPage, guestEmail, 'E2E Guest');
    await register(secondGuestPage, secondGuestEmail, 'E2E Second Guest');
    const organizerId = (await (await organizerPage.request.get('/api/auth/me')).json()).user.id;

    const tripResponse = await organizerPage.request.post('/api/trips', { data: {
      destinationId: 'rishikesh', title: `E2E trip ${suffix}`, summary: 'A browser acceptance trip with enough detail.', startDate: 'Nov 01', endDate: 'Nov 03', duration: '3 days', budget: 9000, capacity: 2, style: 'Adventure', imageUrl: 'https://example.com/trip.jpg',
    } });
    expect(tripResponse.ok()).toBeTruthy();
    const trip = (await tripResponse.json()).trip;
    await guestPage.goto('/discover');
    await expect(guestPage.getByText(trip.title)).toBeVisible();
    await guestPage.goto(`/trips/${trip.id}`);
    await guestPage.getByRole('button', { name: /request to join/i }).click();
    await expect(guestPage.getByText(/join request sent/i)).toBeVisible();

    const organizerRequests = await organizerPage.request.get('/api/join-requests?direction=incoming');
    expect(organizerRequests.ok()).toBeTruthy();
    const request = (await organizerRequests.json()).requests.find((item: { tripId: string }) => item.tripId === trip.id);
    expect(request).toBeTruthy();
    const approve = await organizerPage.request.patch(`/api/join-requests/${request.id}`, { data: { status: 'approved' } });
    expect(approve.ok()).toBeTruthy();
    const secondJoin = await secondGuestPage.request.post(`/api/trips/${trip.id}/join-requests`, { data: {} });
    expect(secondJoin.status()).toBe(409);

    const interest = await guestPage.request.post(`/api/buddies/${organizerId}/interest`, { data: {} });
    expect(interest.status()).toBe(201);
    const incomingConnections = await organizerPage.request.get('/api/connections');
    const connection = (await incomingConnections.json()).connections.find((item: { senderId: string; receiverId: string; status: string }) => item.senderId !== organizerId && item.receiverId === organizerId && item.status === 'pending');
    expect(connection).toBeTruthy();
    expect((await organizerPage.request.patch(`/api/connections/${connection.id}`, { data: { status: 'connected' } })).ok()).toBeTruthy();
    const conversation = await guestPage.request.post('/api/conversations', { data: { participantIds: [organizerId], kind: 'connection' } });
    expect(conversation.ok()).toBeTruthy();
    const conversationId = (await conversation.json()).conversation.id;
    expect((await guestPage.request.post(`/api/conversations/${conversationId}/messages`, { data: { body: 'Browser acceptance hello' } })).ok()).toBeTruthy();
    expect((await guestPage.request.post(`/api/users/${organizerId}/block`, { data: {} })).ok()).toBeTruthy();
    expect((await organizerPage.request.post(`/api/conversations/${conversationId}/messages`, { data: { body: 'Blocked message' } })).status()).toBe(403);
    const unauthorizedAdmin = await guestPage.request.get('/api/admin/metrics');
    expect(unauthorizedAdmin.status()).toBe(403);
    const crossOriginLogout = await guestPage.request.post('/api/auth/logout', { headers: { Origin: 'https://evil.example' } });
    expect(crossOriginLogout.status()).toBe(403);
  } finally {
    await organizer.close();
    await guest.close();
    await secondGuest.close();
  }
});
