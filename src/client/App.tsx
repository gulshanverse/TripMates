import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowUpRight, Bookmark, CalendarDays, Check, CheckCircle2, ChevronRight, Compass,
  HeartHandshake, Languages, MapPinned, Menu, MessageCircle, Mountain, ShieldCheck, Sparkles,
  Users, WalletCards, X, SlidersHorizontal, Clock3, Flame, Bell,
} from 'lucide-react';
import type { Buddy, Destination, OverviewResponse, Trip } from '../shared/types';

const HERO_IMAGE = '/manus-storage/async-images/AlllBOYOC7590BpNhzPnpW/image-1.webp';
const money = (value: number) => `₹${value.toLocaleString('en-IN')}`;

function useOverview() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/overview').then((response) => response.json()).then(setData).finally(() => setLoading(false));
  }, []);
  return { data, loading };
}

function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

function App() {
  const path = usePath();
  const { data, loading } = useOverview();
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };
  const tripId = path.match(/^\/trips\/([^/]+)/)?.[1];
  const active = path === '/' ? 'home' : path.startsWith('/buddies') ? 'buddies' : path.startsWith('/trips') || path.startsWith('/discover') ? 'trips' : '';

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => navigate('/')} aria-label="TripMates home">
          <span className="brand-mark"><span /><span /></span>
          <span>TripMates</span>
        </button>
        <nav className={`desktop-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
          <button className={active === 'trips' ? 'active' : ''} onClick={() => navigate('/discover')}>Explore trips</button>
          <button className={active === 'buddies' ? 'active' : ''} onClick={() => navigate('/buddies')}>Travel buddies</button>
          <button onClick={() => showToast('Travel Dates is coming after the safety foundations are live.')}>Travel Dates <span className="nav-note">18+</span></button>
          <button onClick={() => navigate('/how-it-works')}>How it works</button>
        </nav>
        <div className="header-actions">
          <button className="text-action" onClick={() => navigate('/auth')}>Sign in</button>
          <button className="icon-button" onClick={() => navigate('/messages')} aria-label="Messages"><MessageCircle size={18} /></button><button className="icon-button" onClick={() => navigate('/connections')} aria-label="Connections and notifications"><Bell size={18} /></button>
          <button className="primary-button small" onClick={() => navigate('/auth')}>Join TripMates <ArrowUpRight size={15} /></button>
          <button className="icon-button menu-button" onClick={() => setMenuOpen((open) => !open)} aria-label="Toggle navigation">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </header>

      {loading ? <LoadingState /> : data && (
        <main>
          {path === '/' && <Home data={data} onNavigate={navigate} onToast={showToast} heroImage={HERO_IMAGE} />}
          {path === '/discover' && <Discover data={data} onNavigate={navigate} onToast={showToast} />}
          {path === '/buddies' && <Buddies data={data} onToast={showToast} />}
          {path === '/how-it-works' && <HowItWorks onNavigate={navigate} />}
          {path === '/safety' && <Safety onNavigate={navigate} />}
          {path === '/auth' && <AuthPage onToast={showToast} onNavigate={navigate} />}
          {path === '/profile' && <ProfilePage onToast={showToast} onNavigate={navigate} />}
          {path === '/messages' && <MessagesPage onToast={showToast} />}
          {path === '/connections' && <ConnectionsPage onToast={showToast} onNavigate={navigate} />}
          {tripId && <TripDetail trip={data.trips.find((item) => item.id === tripId)} onNavigate={navigate} onToast={showToast} />}
          {!['/', '/discover', '/buddies', '/how-it-works', '/safety', '/auth', '/profile', '/messages', '/connections'].includes(path) && !tripId && <NotFound onNavigate={navigate} />}
        </main>
      )}
      <Footer onNavigate={navigate} />
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} /> {toast}</div>}
    </div>
  );
}

function LoadingState() { return <main className="loading-state"><div className="loading-orbit"><Compass size={22} /></div><p>Setting the compass...</p></main>; }

function Home({ data, onNavigate, onToast, heroImage }: { data: OverviewResponse; onNavigate: (path: string) => void; onToast: (message: string) => void; heroImage: string }) {
  return <>
    <section className="hero-section">
      <div className="hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="hero-scrim" />
      <div className="hero-content page-width">
        <div className="eyebrow light"><span className="eyebrow-dot" /> India-first travel community</div>
        <h1>Find your people<br /><em>for the road ahead.</em></h1>
        <p className="hero-copy">Travel feels different when the right people are part of the plan. Find compatible companions, join thoughtful trips, and leave with more than photos.</p>
        <div className="hero-actions"><button className="primary-button" onClick={() => onNavigate('/discover')}>Explore Rishikesh trips <ArrowUpRight size={17} /></button><button className="ghost-button" onClick={() => onNavigate('/buddies')}>Meet travel buddies <ChevronRight size={17} /></button></div>
        <div className="hero-meta"><span><strong>{data.stats.travelers}</strong> curious travelers</span><span><strong>{data.stats.trips}</strong> trips in motion</span><span><strong>{data.stats.destinations}</strong> destinations ahead</span></div>
      </div>
      <div className="hero-caption"><span>01 / 03</span><span>Rishikesh, Uttarakhand</span></div>
    </section>
    <section className="intro-section page-width section-pad">
      <div className="section-kicker">THE TRIPMATES DIFFERENCE</div>
      <div className="intro-grid"><h2>A better way to go<br /><em>somewhere.</em></h2><div><p className="lead-copy">Not a dating app. Not a booking site. TripMates is a travel-first space for people who care about the rhythm of a trip — and who they share it with.</p><button className="text-link" onClick={() => onNavigate('/how-it-works')}>How TripMates works <ArrowUpRight size={16} /></button></div></div>
      <div className="principle-grid"><Principle icon={<HeartHandshake />} number="01" title="Better-fit people" text="Match on dates, budgets, interests, languages, and the way you like to travel." /><Principle icon={<Compass />} number="02" title="Trips with texture" text="Find group trips with real itineraries, clear budgets, and people behind the plan." /><Principle icon={<ShieldCheck />} number="03" title="Trust, by design" text="Consent, visibility controls, verification, blocking, and reporting stay close at hand." /></div>
    </section>
    <section className="discover-section section-pad"><div className="page-width"><SectionHeading kicker="A PLACE TO START" title="Rishikesh is calling." action="See all trips" onAction={() => onNavigate('/discover')} /><div className="trip-row">{data.trips.slice(0, 3).map((trip) => <TripCard key={trip.id} trip={trip} onOpen={() => onNavigate(`/trips/${trip.id}`)} onToast={onToast} />)}</div></div></section>
    <section className="community-section section-pad page-width"><div className="community-card"><div className="community-copy"><div className="section-kicker light">PEOPLE MAKE THE PLACE</div><h2>Go with a little<br /><em>more ease.</em></h2><p>See who is heading the same way, what they are excited about, and whether the pace feels like yours.</p><button className="light-button" onClick={() => onNavigate('/buddies')}>See your travel people <ArrowUpRight size={16} /></button></div><div className="community-visual"><div className="orbit-label"><Sparkles size={15} /> 94% compatible</div>{data.buddies.slice(0, 2).map((buddy, index) => <BuddyMini key={buddy.id} buddy={buddy} offset={index} />)}<div className="route-sketch"><span /><span /><span /></div></div></div></section>
    <section className="destination-section page-width section-pad"><SectionHeading kicker="KEEP ROAMING" title="Places with a pulse." action="Explore destinations" onAction={() => onToast('More destinations will open as the Rishikesh pilot fills out.')} /><div className="destination-grid">{data.destinations.map((destination, index) => <DestinationCard key={destination.id} destination={destination} featured={index === 0} onOpen={() => index === 0 ? onNavigate('/discover') : onToast(`${destination.name} is next on the TripMates map.`)} />)}</div></section>
  </>;
}

function Principle({ icon, number, title, text }: { icon: React.ReactNode; number: string; title: string; text: string }) { return <article className="principle"><div className="principle-icon">{icon}</div><div className="principle-number">{number}</div><h3>{title}</h3><p>{text}</p></article>; }
function SectionHeading({ kicker, title, action, onAction }: { kicker: string; title: string; action?: string; onAction?: () => void }) { return <div className="section-heading"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2></div>{action && <button className="text-link" onClick={onAction}>{action} <ArrowUpRight size={16} /></button>}</div>; }

function TripCard({ trip, onOpen, onToast, featured = false }: { trip: Trip; onOpen: () => void; onToast: (message: string) => void; featured?: boolean }) {
  const [saved, setSaved] = useState(Boolean(trip.saved));
  const save = async (event: React.MouseEvent) => { event.stopPropagation(); const response = await fetch(`/api/trips/${trip.id}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (response.ok) { setSaved(true); onToast('Saved to your trip list.'); } };
  return <article className={`trip-card ${featured ? 'featured' : ''}`} onClick={onOpen} tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onOpen()}>
    <div className="card-image-wrap"><img src={trip.imageUrl} alt={`${trip.destinationName} trip`} /><button className={`save-button ${saved ? 'saved' : ''}`} onClick={save} aria-label={saved ? 'Saved trip' : 'Save trip'}>{saved ? <Check size={16} /> : <Bookmark size={16} />}</button><div className="image-tag">{trip.style}</div></div>
    <div className="trip-card-body"><div className="card-overline"><span><CalendarDays size={13} /> {trip.startDate}</span><span>{trip.duration}</span></div><h3>{trip.title}</h3><p>{trip.summary}</p><div className="trip-card-footer"><span className="avatar small">{trip.organizerInitials}</span><span className="organizer-name">{trip.organizer} {trip.organizerVerified && <ShieldCheck size={13} />}</span><strong>{money(trip.budget)}</strong></div></div>
  </article>;
}

function Discover({ data, onNavigate, onToast }: { data: OverviewResponse; onNavigate: (path: string) => void; onToast: (message: string) => void }) {
  const [style, setStyle] = useState('All styles');
  const filtered = style === 'All styles' ? data.trips : data.trips.filter((trip) => trip.style === style);
  return <section className="inner-page page-width section-pad"><div className="page-intro"><div><div className="section-kicker">DISCOVER GROUP TRIPS</div><h1>Plans worth<br /><em>showing up for.</em></h1></div><p>Small groups, clear plans, and the kind of itinerary that leaves space for the unexpected. Start with Rishikesh, then keep the map open.</p></div><div className="filter-row"><div className="filter-label"><SlidersHorizontal size={15} /> Filter by pace</div>{['All styles', 'Slow & scenic', 'Adventure', 'Culture-led', 'Wellness'].map((item) => <button key={item} className={style === item ? 'filter-chip active' : 'filter-chip'} onClick={() => setStyle(item)}>{item}</button>)}</div><div className="discover-layout"><div className="trip-grid">{filtered.map((trip) => <TripCard key={trip.id} trip={trip} onOpen={() => onNavigate(`/trips/${trip.id}`)} onToast={onToast} />)}</div><aside className="side-note"><div className="side-note-top"><span className="eyebrow-dot" /> PILOT DESTINATION</div><img src={data.destinations[0].imageUrl} alt="Rishikesh river" /><h3>Rishikesh, Uttarakhand</h3><p>{data.destinations[0].description}</p><div className="side-note-stat"><strong>24</strong><span>open trips<br />to explore</span></div><button className="text-link" onClick={() => onToast('Destination details are being mapped now.')}>Open destination <ArrowUpRight size={16} /></button></aside></div></section>;
}

function TripDetail({ trip, onNavigate, onToast }: { trip?: Trip; onNavigate: (path: string) => void; onToast: (message: string) => void }) {
  const [saved, setSaved] = useState(Boolean(trip?.saved));
  if (!trip) return <NotFound onNavigate={onNavigate} />;
  const saveTrip = async () => { const response = await fetch(`/api/trips/${trip.id}/save`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (response.ok) { setSaved(true); onToast('Saved to your trip list.'); } };
  const requestJoin = async () => { const response = await fetch(`/api/trips/${trip.id}/join-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (response.status === 401) return onNavigate('/auth'); if (response.ok) onToast('Join request sent to the organizer.'); else { const body = await response.json().catch(() => ({})); onToast(body.message ?? 'Could not send the request.'); } };
  return <section className="detail-page"><div className="detail-hero page-width"><button className="back-link" onClick={() => onNavigate('/discover')}><ArrowLeft size={16} /> Back to trips</button><div className="detail-hero-grid"><div><div className="eyebrow light"><span className="eyebrow-dot" /> {trip.destinationName} / {trip.region}</div><h1>{trip.title}</h1><p>{trip.summary}</p><div className="detail-meta"><span><CalendarDays size={15} /> {trip.startDate} – {trip.endDate}</span><span><Clock3 size={15} /> {trip.duration}</span><span><WalletCards size={15} /> from {money(trip.budget)}</span></div></div><img src={trip.imageUrl} alt={`${trip.destinationName} landscape`} /></div></div><div className="detail-content page-width"><div className="itinerary"><div className="section-kicker">THE SHAPE OF THE TRIP</div><h2>A little structure.<br /><em>A lot of room.</em></h2>{trip.itinerary.map((item) => <div className="itinerary-row" key={item.day}><div className="itinerary-day">{item.day}</div><div><h3>{item.title}</h3><p>{item.detail}</p></div></div>)}</div><aside className="booking-card"><div className="booking-label">YOUR POSSIBLE WEEK</div><div className="booking-price">{money(trip.budget)} <small>/ person</small></div><div className="capacity-line"><Users size={15} /> {trip.members} people are in <span>{trip.capacity - trip.members} spots left</span></div><div className="organizer-block"><div className="avatar">{trip.organizerInitials}</div><div><span>Organized by</span><strong>{trip.organizer} {trip.organizerVerified && <ShieldCheck size={14} />}</strong></div></div><button className="primary-button full" onClick={requestJoin}>Request to join <ArrowUpRight size={16} /></button><button className={`secondary-button full ${saved ? 'saved-action' : ''}`} onClick={saveTrip}>{saved ? <Check size={16} /> : <Bookmark size={16} />} {saved ? 'Saved to your trips' : 'Save this trip'}</button><div className="safety-note"><ShieldCheck size={15} /><span>Organizer verification and community reporting are part of the TripMates safety layer.</span></div></aside></div></section>;
}

function Buddies({ data, onToast }: { data: OverviewResponse; onToast: (message: string) => void }) {
  return <section className="inner-page page-width section-pad"><div className="page-intro"><div><div className="section-kicker">TRAVEL BUDDIES</div><h1>Find a pace<br /><em>that feels like yours.</em></h1></div><p>Compatibility is more than a destination. Start with the dates, budgets, energy, and small travel rituals that make a good trip feel easy.</p></div><div className="buddy-banner"><div><Sparkles size={16} /><span>Try matching by what matters</span></div><p>Everyone you see here has chosen to be discoverable. Interest is private until it is mutual.</p><button className="secondary-button" onClick={() => onToast('Matching preferences will be part of onboarding.')}>Set your preferences <ArrowUpRight size={16} /></button></div><div className="buddy-grid">{data.buddies.map((buddy) => <BuddyCard key={buddy.id} buddy={buddy} onToast={onToast} />)}</div></section>;
}

function BuddyCard({ buddy, onToast }: { buddy: Buddy; onToast: (message: string) => void }) {
  const [interested, setInterested] = useState(Boolean((buddy as Buddy & { interested?: boolean }).interested));
  const express = async () => { const response = await fetch(`/api/buddies/${buddy.id}/interest`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (response.ok) { setInterested(true); onToast('Interest sent privately.'); } };
  return <article className="buddy-card"><div className="buddy-photo"><img src={buddy.imageUrl} alt={buddy.name} /><span className="match-score">{buddy.match}% match</span></div><div className="buddy-card-body"><div className="buddy-name-row"><div><h3>{buddy.name}, {buddy.age}</h3><p><MapPinned size={13} /> {buddy.city}</p></div>{buddy.verified && <span className="verified-mark"><ShieldCheck size={15} /> verified</span>}</div><p className="buddy-bio">{buddy.bio}</p><div className="buddy-details"><span><Compass size={14} /> {buddy.travelStyle}</span><span><CalendarDays size={14} /> {buddy.dates}</span><span><Languages size={14} /> {buddy.languages.slice(0, 2).join(' · ')}</span></div><div className="tag-list">{buddy.interests.map((interest) => <span key={interest}>{interest}</span>)}</div><button className={`secondary-button full ${interested ? 'saved-action' : ''}`} onClick={express}>{interested ? <Check size={16} /> : <HeartHandshake size={16} />} {interested ? 'Interest sent' : 'Express interest'}</button></div></article>;
}

function BuddyMini({ buddy, offset }: { buddy: Buddy; offset: number }) { return <div className={`buddy-mini buddy-mini-${offset}`}><img src={buddy.imageUrl} alt="" /><div><strong>{buddy.name}</strong><span>{buddy.match}% compatible</span></div><CheckCircle2 size={17} /></div>; }
function DestinationCard({ destination, featured, onOpen }: { destination: Destination; featured?: boolean; onOpen: () => void }) { return <button className={`destination-card ${featured ? 'featured' : ''}`} onClick={onOpen}><img src={destination.imageUrl} alt={`${destination.name}, ${destination.region}`} /><span className="destination-overlay" /><div className="destination-copy"><span>{destination.region}</span><h3>{destination.name}</h3><p>{destination.mood}</p></div><ArrowUpRight className="destination-arrow" size={18} /></button>; }
function HowItWorks({ onNavigate }: { onNavigate: (path: string) => void }) { return <section className="simple-page page-width section-pad"><div className="section-kicker">HOW IT WORKS</div><h1>Travel together.<br /><em>Connect naturally.</em></h1><p className="page-lead">TripMates keeps the travel intention clear, the consent visible, and the people behind a plan easy to understand.</p><div className="steps-grid"><Principle icon={<Compass />} number="01" title="Tell us your way" text="Share where you want to go, when, how you travel, and what makes a good companion for you." /><Principle icon={<Users />} number="02" title="Find a better fit" text="Browse trips and people with compatible dates, budgets, interests, languages, and energy." /><Principle icon={<HeartHandshake />} number="03" title="Make it mutual" text="Express interest without pressure. Connections, conversations, and romantic consent are separate by design." /></div><button className="primary-button" onClick={() => onNavigate('/discover')}>Start exploring <ArrowUpRight size={16} /></button></section>; }
function Safety({ onNavigate }: { onNavigate: (path: string) => void }) { return <section className="simple-page page-width section-pad"><div className="section-kicker">SAFETY, BY DESIGN</div><h1>Good trips start<br /><em>with trust.</em></h1><p className="page-lead">TripMates is travel-first, consent-led, and built around giving you the information and control to choose well.</p><div className="safety-grid"><div><ShieldCheck size={23} /><h3>Stay in control</h3><p>Visibility controls, blocking, and reporting keep your profile and conversations yours.</p></div><div><CheckCircle2 size={23} /><h3>See the signals</h3><p>Verification, organizer context, clear itineraries, and community reporting help you decide.</p></div><div><HeartHandshake size={23} /><h3>Keep consent clear</h3><p>Travel buddy interest, trip participation, and romantic connection never silently become the same thing.</p></div></div><button className="text-link" onClick={() => onNavigate('/how-it-works')}>See how the product works <ArrowUpRight size={16} /></button></section>; }
function AuthPage({ onToast, onNavigate }: { onToast: (message: string) => void; onNavigate: (path: string) => void }) {
  const [registering, setRegistering] = useState(true); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [displayName, setDisplayName] = useState('');
  const submit = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch(registering ? '/api/auth/register' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, ...(registering ? { displayName } : {}) }) }); const body = await response.json().catch(() => ({})); if (!response.ok) return onToast(body.message ?? 'Could not authenticate.'); onToast(registering ? 'Welcome to TripMates.' : 'Welcome back.'); onNavigate('/profile'); };
  return <section className="simple-page page-width section-pad"><div className="section-kicker">{registering ? 'JOIN TRIPMATES' : 'WELCOME BACK'}</div><h1>{registering ? <>Your next trip<br /><em>starts here.</em></> : <>Good to see<br /><em>you again.</em></>}</h1><form onSubmit={submit} style={{ maxWidth: 520, display: 'grid', gap: 14 }}><label> Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>{registering && <label> Display name<input required minLength={2} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How should people know you?" /></label>}<label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><button className="primary-button" type="submit">{registering ? 'Create account' : 'Sign in'} <ArrowUpRight size={16} /></button></form><button className="text-link" onClick={() => setRegistering((value) => !value)}>{registering ? 'Already have an account? Sign in' : 'New to TripMates? Create an account'}</button><p className="page-lead" style={{ maxWidth: 600 }}>Your profile is private by default where it matters. TripMates uses secure server-side sessions and never exposes password hashes.</p></section>;
}
function ConnectionsPage({ onToast, onNavigate }: { onToast: (message: string) => void; onNavigate: (path: string) => void }) {
  const [connections, setConnections] = useState<{ id: string; senderId: string; receiverId: string; status: string }[]>([]); const [userId, setUserId] = useState(''); const [notifications, setNotifications] = useState<{ id: string; type: string; body: string; readAt?: string }[]>([]); const [error, setError] = useState('');
  const load = async () => { const [c, n] = await Promise.all([fetch('/api/connections'), fetch('/api/notifications')]); if (c.status === 401) return onNavigate('/auth'); if (!c.ok || !n.ok) throw new Error('Could not load connections.'); const connectionsBody = await c.json(); const notificationBody = await n.json(); setUserId(connectionsBody.userId); setConnections(connectionsBody.connections); setNotifications(notificationBody.notifications); };
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  const update = async (id: string, status: 'connected' | 'declined' | 'cancelled') => { const response = await fetch(`/api/connections/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); if (response.ok) { await load(); onToast(status === 'connected' ? 'Connection accepted.' : 'Connection updated.'); } else onToast('That connection could not be updated.'); };
  const startConversation = async (connection: { senderId: string; receiverId: string }) => { const response = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participantIds: [connection.senderId === userId ? connection.receiverId : connection.senderId], kind: 'connection' }) }); if (response.ok) onNavigate('/messages'); else onToast('A mutual connection is required before messaging.'); };
  const markRead = async () => { await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); setNotifications((items) => items.map((item) => ({ ...item, readAt: new Date().toISOString() }))); };
  return <section className="inner-page page-width section-pad"><div className="page-intro"><div><div className="section-kicker">YOUR PEOPLE</div><h1>Connections<br /><em>with consent.</em></h1></div><p>Review incoming requests, manage your outgoing interest, and keep trip conversations separate from romantic intent.</p></div>{error ? <div className="buddy-banner"><p>{error}</p></div> : <div className="discover-layout"><div className="buddy-grid" style={{ display: 'grid', gap: 14 }}>{connections.length ? connections.map((connection) => <article className="booking-card" key={connection.id}><div className="booking-label">{connection.status.toUpperCase()}</div><p>{connection.senderId} → {connection.receiverId}</p>{connection.status === 'pending' && <div style={{ display: 'flex', gap: 8 }}><button className="primary-button" onClick={() => update(connection.id, 'connected')}>Accept</button><button className="secondary-button" onClick={() => update(connection.id, 'declined')}>Reject</button><button className="text-link" onClick={() => update(connection.id, 'cancelled')}>Cancel</button></div>}{connection.status === 'connected' && <button className="primary-button" onClick={() => startConversation(connection)}>Start conversation <MessageCircle size={15} /></button>}</article>) : <div className="booking-card"><p>No connection requests yet. Interest becomes visible here when it is mutual.</p></div>}</div><aside className="booking-card"><div className="booking-label">NOTIFICATION CENTER</div>{notifications.length ? <>{notifications.map((notification) => <p key={notification.id} style={{ opacity: notification.readAt ? 0.6 : 1 }}>{notification.body}</p>)}<button className="text-link" onClick={markRead}>Mark all as read</button></> : <p>You are all caught up.</p>}</aside></div>}</section>;
}
function MessagesPage({ onToast }: { onToast: (message: string) => void }) {
  const [conversations, setConversations] = useState<{ id: string; kind: string }[]>([]); const [active, setActive] = useState(''); const [messages, setMessages] = useState<{ id: string; senderId: string; body: string; createdAt: string }[]>([]); const [body, setBody] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { fetch('/api/conversations').then(async (response) => { if (response.status === 401) throw new Error('Sign in to view messages.'); if (!response.ok) throw new Error('Could not load conversations.'); const result = await response.json(); setConversations(result.conversations); setActive(result.conversations[0]?.id ?? ''); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!active) return; let source: EventSource | undefined; fetch(`/api/conversations/${active}/messages`).then((r) => r.json()).then((r) => setMessages(r.messages ?? [])).catch(() => setError('Could not load this conversation.')); fetch(`/api/conversations/${active}/read`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); source = new EventSource(`/api/conversations/${active}/events`); source.addEventListener('message', (event) => { const message = JSON.parse((event as MessageEvent).data); setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]); }); return () => source?.close(); }, [active]);
  const send = async (event: React.FormEvent) => { event.preventDefault(); if (!body.trim() || !active) return; const response = await fetch(`/api/conversations/${active}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) }); const result = await response.json().catch(() => ({})); if (!response.ok) return onToast(result.message ?? 'Message could not be sent.'); setMessages((current) => [...current, result.message]); setBody(''); };
  if (loading) return <LoadingState />;
  return <section className="inner-page page-width section-pad"><div className="page-intro"><div><div className="section-kicker">PRIVATE CONVERSATIONS</div><h1>Make the plan<br /><em>feel more human.</em></h1></div><p>Messages stay inside an authorized connection. Travel buddy conversations are separate from Travel Dates and always remain consent-led.</p></div>{error ? <div className="buddy-banner"><p>{error}</p></div> : <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 0.35fr) 1fr', gap: 20, minHeight: 420 }}><aside className="booking-card"><div className="booking-label">YOUR CONVERSATIONS</div>{conversations.length ? conversations.map((conversation) => <button key={conversation.id} className="text-link" style={{ display: 'block', margin: '16px 0', textAlign: 'left' }} onClick={() => setActive(conversation.id)}>{conversation.kind === 'connection' ? 'Travel connection' : 'Trip group'} {active === conversation.id ? '· open' : ''}</button>) : <p>No conversations yet. Mutual connections will appear here.</p>}</aside><div className="booking-card"><div className="booking-label">{active ? 'CONVERSATION' : 'EMPTY STATE'}</div>{active ? <><div style={{ minHeight: 280, display: 'grid', alignContent: 'start', gap: 12 }}>{messages.length ? messages.map((message) => <div key={message.id}><small>{new Date(message.createdAt).toLocaleString()}</small><p style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>{message.body}</p></div>) : <p>No messages yet. Start with the trip you have in common.</p>}</div><form onSubmit={send} style={{ display: 'flex', gap: 8 }}><input value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Write a thoughtful note" aria-label="Message" /><button className="primary-button" type="submit">Send</button></form></> : <p>Select a conversation to begin.</p>}</div></div>}</section>;
}
function ProfilePage({ onToast, onNavigate }: { onToast: (message: string) => void; onNavigate: (path: string) => void }) {
  const [profile, setProfile] = useState({ displayName: '', age: '', homeLocation: '', travelStyle: 'Slow & scenic', budgetRange: '', languages: '', preferredDestinations: '', travelInterests: '', visibility: 'discoverable' }); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch('/api/auth/me').then(async (response) => { if (!response.ok) return onNavigate('/auth'); const body = await response.json(); const p = body.user.profile; setProfile({ displayName: p.displayName ?? body.user.displayName, age: p.age?.toString() ?? '', homeLocation: p.homeLocation ?? '', travelStyle: p.travelStyle ?? 'Slow & scenic', budgetRange: p.budgetRange ?? '', languages: p.languages.join(', '), preferredDestinations: p.preferredDestinations.join(', '), travelInterests: p.travelInterests.join(', '), visibility: p.visibility }); }).finally(() => setLoading(false)); }, []);
  const save = async (event: React.FormEvent) => { event.preventDefault(); const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...profile, age: profile.age ? Number(profile.age) : undefined, languages: profile.languages.split(',').map((v) => v.trim()).filter(Boolean), preferredDestinations: profile.preferredDestinations.split(',').map((v) => v.trim()).filter(Boolean), travelInterests: profile.travelInterests.split(',').map((v) => v.trim()).filter(Boolean) }) }); if (response.ok) onToast('Profile saved.'); else onToast('Please check your profile details.'); };
  if (loading) return <LoadingState />;
  return <section className="simple-page page-width section-pad"><div className="section-kicker">YOUR TRAVEL PROFILE</div><h1>Make the fit<br /><em>feel more like you.</em></h1><form onSubmit={save} style={{ maxWidth: 640, display: 'grid', gap: 14 }}><label>Display name<input required value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label><label>Age (18+)<input type="number" min="18" value={profile.age} onChange={(e) => setProfile({ ...profile, age: e.target.value })} /></label><label>Home location<input value={profile.homeLocation} onChange={(e) => setProfile({ ...profile, homeLocation: e.target.value })} placeholder="Bengaluru, India" /></label><label>Preferred destinations<input value={profile.preferredDestinations} onChange={(e) => setProfile({ ...profile, preferredDestinations: e.target.value })} placeholder="Rishikesh, Goa" /></label><label>Travel interests<input value={profile.travelInterests} onChange={(e) => setProfile({ ...profile, travelInterests: e.target.value })} placeholder="Yoga, food, trails" /></label><label>Languages<input value={profile.languages} onChange={(e) => setProfile({ ...profile, languages: e.target.value })} placeholder="English, Hindi" /></label><label>Travel style<select value={profile.travelStyle} onChange={(e) => setProfile({ ...profile, travelStyle: e.target.value })}><option>Slow & scenic</option><option>Adventure</option><option>Culture-led</option><option>Wellness</option></select></label><label>Profile visibility<select value={profile.visibility} onChange={(e) => setProfile({ ...profile, visibility: e.target.value })}><option value="discoverable">Discoverable to travelers</option><option value="private">Private</option></select></label><button className="primary-button" type="submit">Save profile <Check size={16} /></button></form></section>;
}
function NotFound({ onNavigate }: { onNavigate: (path: string) => void }) { return <section className="simple-page page-width section-pad"><div className="section-kicker">OFF THE MAP</div><h1>That page took<br /><em>a wrong turn.</em></h1><p className="page-lead">Let’s get you back to a better view.</p><button className="primary-button" onClick={() => onNavigate('/')}>Back home <ArrowUpRight size={16} /></button></section>; }
function Footer({ onNavigate }: { onNavigate: (path: string) => void }) { return <footer className="site-footer"><div className="page-width footer-grid"><div><button className="brand footer-brand" onClick={() => onNavigate('/')}><span className="brand-mark"><span /><span /></span><span>TripMates</span></button><p>Travel together.<br />Connect naturally.</p></div><div><span className="footer-label">Explore</span><button onClick={() => onNavigate('/discover')}>Group trips</button><button onClick={() => onNavigate('/buddies')}>Travel buddies</button><button onClick={() => onNavigate('/safety')}>Safety</button></div><div><span className="footer-label">Company</span><button onClick={() => onNavigate('/how-it-works')}>How it works</button><button onClick={() => onNavigate('/safety')}>Community guidelines</button><button onClick={() => onNavigate('/')}>Contact</button></div><div><span className="footer-label">The field notes</span><p className="footer-note">Thoughtful trips, better people, and a little more room to wander.</p><div className="footer-subscribe"><input placeholder="Your email" aria-label="Email address" /><button aria-label="Subscribe"><ArrowUpRight size={15} /></button></div></div></div><div className="page-width footer-bottom"><span>© 2026 TripMates</span><span>Made for the road ahead · India</span></div></footer>; }

export default App;
