# Duskco

## Product Overview
AI-powered travel SaaS — hotels, flights, and cruises in one search experience

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: OpenAI API (for natural language search)
- **Hotel API**: LiteAPI
- **Flight API**: Duffel or Amadeus (need to integrate)
- **Cruise API**: Custom scraping or partner with cruise line APIs (research needed)
- **Database**: PostgreSQL
- **Auth**: NextAuth.js
- **Payments**: Stripe (for booking fees)
- **Hosting**: Vercel

## Core Features

### 1. AI Travel Search
- Natural language queries: "Beach vacation for $2000 in July"
- Multi-modal search (hotels + flights + cruises)
- Smart filters: budget, dates, travelers, preferences
- AI-synthesized recommendations with reasoning

### 2. Booking Engine
- Hotel booking via LiteAPI
- Flight booking via Duffel/Amadeus
- Cruise booking (TBD — likely affiliate links initially)
- Package deals (hotel + flight)
- Price alerts

### 3. Itinerary Builder
- Day-by-day trip planning
- Activity recommendations (AI-powered)
- Restaurant suggestions
- Map visualization
- Share with travel companions

### 4. Deal Finder
- AI scans for price drops
- Error fare alerts
- Flash sale notifications
- "Deal of the day" curation

### 5. Travel Dashboard
- Upcoming trips
- Past trips
- Saved searches
- Price tracking
- Travel documents storage

## Database Schema

```sql
-- Users
users: id, email, name, travel_preferences, created_at

-- Searches
searches: id, user_id, query, destination, dates, budget, results, created_at

-- Bookings
bookings: id, user_id, type (hotel/flight/cruise), provider_id, provider_name, confirmation_code, price, status, created_at

-- Trips
trips: id, user_id, name, destination, start_date, end_date, status

-- Trip Items
trip_items: id, trip_id, type, details, date, order_index

-- Price Alerts
price_alerts: id, user_id, search_params, target_price, is_active, created_at

-- Saved Places
saved_places: id, user_id, place_type, name, location, notes, created_at
```

## API Endpoints

```
POST   /api/search/ai
GET    /api/hotels?location=X&dates=Y
GET    /api/flights?origin=X&dest=Y
POST   /api/bookings
GET    /api/trips
POST   /api/trips/:id/items
POST   /api/price-alerts
GET    /api/deals
```

## MVP Milestones

### Phase 1: Hotels (Week 1-2)
- [ ] LiteAPI integration
- [ ] AI search natural language
- [ ] Hotel results display
- [ ] Basic booking flow

### Phase 2: Flights (Week 3-4)
- [ ] Duffel/Amadeus integration
- [ ] Flight search UI
- [ ] Combined hotel+flight packages

### Phase 3: Itinerary (Week 5)
- [ ] Trip builder
- [ ] AI activity recommendations
- [ ] Map integration

### Phase 4: Cruises + Polish (Week 6)
- [ ] Cruise search (affiliate or API)
- [ ] Price alerts
- [ ] Deal curation
- [ ] Mobile optimization

## Pricing Tiers
- **Free**: Search unlimited, booking fees apply
- **Pro**: $9/mo — No booking fees, price alerts, itinerary builder
- **Premium**: $29/mo — Deal alerts, error fares, concierge support

## Marketing Flywheel → Services
- "You're booking lots of trips — want us to plan custom itineraries?"
- "You're price-conscious — let us monitor all your desired trips"
- "You're a frequent traveler — here's our premium travel planning service"

## Notes on Cruise API
Cruise APIs are limited. Options:
1. Partner with CruiseDirect/Expedia affiliate program
2. Scrape major cruise lines (legal risk)
3. Manual concierge model (higher touch, higher margin)
4. Start without cruises, add later

## Notes on Flight API
- Duffel: Modern, good docs, pay-per-booking
- Amadeus: Massive inventory, free tier, enterprise-grade
- Kiwi: Good for multi-city/combo
