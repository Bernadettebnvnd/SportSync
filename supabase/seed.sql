-- =====================================================================
-- MATCHI: Supabase Database Seed Data (Philippine Sports Scene)
-- Use this file to populate a clean database for development and testing.
-- =====================================================================

-- 1. Sports Reference Data
INSERT INTO public.sports (id, name, icon_name, description, default_duration_minutes, supports_doubles, supports_singles)
VALUES
    ('pickleball', 'Pickleball', 'Activity', 'Kitchen line rallies, fast doubles transitions, and dinking battles.', 60, TRUE, TRUE),
    ('badminton', 'Badminton', 'Activity', 'High-speed smashes, agile drops, and BWF tournament rubber mats.', 60, TRUE, TRUE),
    ('basketball', 'Basketball', 'Activity', 'Full-court runs, 3v3 pickups, and covered hardwood courts.', 60, FALSE, FALSE),
    ('tennis', 'Tennis', 'Activity', 'Classic baseline rallies, clay, and tournament hardcourts.', 60, TRUE, TRUE),
    ('padel', 'Padel', 'Activity', 'Panoramic glass courts with dynamic doubles wall rebounds.', 90, TRUE, FALSE)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    icon_name = EXCLUDED.icon_name,
    description = EXCLUDED.description;

-- 2. Test Users
INSERT INTO public.users (id, email, full_name, nickname, role, primary_sport, preferred_format, skill_level, city)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'miki@matchi.ph', 'Miki Del Rosario', 'Miki', 'player', 'pickleball', 'doubles', 'intermediate', 'Taguig City'),
    ('a0000000-0000-0000-0000-000000000002', 'coach.basty@matchi.ph', 'Sebastian Santos', 'Coach Basty', 'organizer', 'pickleball', 'doubles', 'advanced', 'Pasig City'),
    ('a0000000-0000-0000-0000-000000000003', 'owner.upperdeck@matchi.ph', 'Carlos Tan', 'Charlie', 'venue_owner', 'badminton', 'doubles', 'intermediate', 'Pasig City')
ON CONFLICT (id) DO NOTHING;

-- 3. Realistic Venues
INSERT INTO public.venues (id, owner_id, name, slug, description, address, city, latitude, longitude, operating_hours, amenities, featured_sports, gcash_number, gcash_name, rating, review_count, is_verified)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'The Upper Deck Sports Center', 'upper-deck-pasig', 'Premier multi-sports facility in Ortigas/Pasig. Features 8 BWF standard badminton courts for Doubles and Singles, indoor pickleball courts, and recovery facilities.', '1 Ortigas Ave, Pasig, Metro Manila', 'Pasig City', 14.5828, 121.0664, '{"mon_sun": "06:00 - 24:00"}'::jsonb, ARRAY['Air Conditioning', 'Free Parking', 'Hot Showers', 'Pro Shop', 'Locker Rooms'], ARRAY['badminton', 'pickleball', 'basketball']::sport_type[], '0917-888-UPPR', 'UPPER DECK SPORTS INC', 4.9, 88, TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Smash Zone BGC', 'smash-zone-bgc', 'High-energy badminton hub in Bonifacio Global City. Non-slip shock-absorbent courts, high-bay LED lighting, dedicated doubles and singles queuing.', '32nd St cor 9th Ave, Bonifacio Global City, Taguig', 'Taguig City', 14.5515, 121.0494, '{"mon_sun": "07:00 - 23:00"}'::jsonb, ARRAY['BWF Taraflex Floors', 'Air Conditioning', 'Shower Rooms', 'Parking'], ARRAY['badminton']::sport_type[], '0917-555-SMASH', 'SMASH ZONE BGC', 4.8, 114, TRUE),
    ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Padel Club Manila - Rockwell', 'padel-club-rockwell', 'State of the art panoramic glass padel courts with tournament blue turf, sports lounge, and doubles mixers.', 'Estrella St, Rockwell Center, Makati', 'Makati City', 14.5654, 121.0367, '{"mon_sun": "06:00 - 23:00"}'::jsonb, ARRAY['Panoramic Glass', 'Lounge Bar', 'Valet Parking', 'Pro Shop'], ARRAY['padel']::sport_type[], '0917-777-PADEL', 'PADEL CLUB PH', 4.9, 65, TRUE),
    ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Pickleball PlayGround QC', 'pickleball-playground-qc', 'Metro Manila community pickleball haven. Cushioned outdoor covered courts for doubles and singles.', 'Tomas Morato Ave, Quezon City', 'Quezon City', 14.6292, 121.0336, '{"mon_sun": "06:00 - 22:00"}'::jsonb, ARRAY['Cushioned Acrylic Surface', 'LED Night Lights', 'Parking'], ARRAY['pickleball']::sport_type[], '0918-123-PICKLE', 'PICKLEBALL PLAYGROUND', 4.7, 53, TRUE),
    ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'Cebu Smash Arena', 'cebu-smash-arena', 'Premier badminton and racket hub in Metro Cebu. 6 BWF tournament rubber mats, pro restringing, and active queues.', 'Gov. M. Cuenco Ave, Banilad, Cebu City', 'Cebu City', 10.3541, 123.9114, '{"mon_sun": "06:00 - 23:00"}'::jsonb, ARRAY['Taraflex Flooring', 'Shower Rooms', 'Parking'], ARRAY['badminton', 'pickleball']::sport_type[], '0917-321-CEBU', 'CEBU SMASH ARENA', 4.9, 112, TRUE),
    ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Metro Naga Sports Complex', 'metro-naga-sports-complex', 'Premier multi-sport championship facility in Bicol. Features 6 tournament badminton courts, cushioned outdoor pickleball, Olympic track, and covered basketball coliseum.', 'Pacol, Naga City, Camarines Sur', 'Naga City', 13.6558, 123.2385, '{"mon_sun": "06:00 - 22:00"}'::jsonb, ARRAY['Tournament Lighting', 'Free Parking', 'Shower Rooms', 'Grandstand Seating', 'Pro Shop'], ARRAY['badminton', 'pickleball', 'basketball', 'tennis']::sport_type[], '0917-888-NAGA', 'METRO NAGA SPORTS', 4.9, 94, TRUE),
    ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 'Jesse M. Robredo Coliseum & Courts', 'robredo-coliseum-naga', 'Iconic air-conditioned sports coliseum in Triangulo, Naga City. Professional hardwood courts for basketball, badminton, and volleyball tournaments.', 'Triangulo, Naga City, Camarines Sur', 'Naga City', 13.6218, 123.1948, '{"mon_sun": "07:00 - 22:00"}'::jsonb, ARRAY['Air Conditioning', 'Electronic Scoreboards', 'VIP Lounge', 'Secure Parking', 'Locker Rooms'], ARRAY['basketball', 'badminton', 'volleyball']::sport_type[], '0917-555-JMR', 'JMR COLISEUM SPORTS', 4.8, 128, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Facility Staff Linkages
INSERT INTO public.facility_staff (facility_id, user_id, role)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'owner'),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'owner')
ON CONFLICT (facility_id, user_id) DO NOTHING;

-- 5. Realistic Playing Areas / Courts
INSERT INTO public.courts (id, venue_id, name, sport, hourly_rate_cents, floor_type, supports_doubles, supports_singles, is_indoor)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Court 1 (Yonex Pro)', 'badminton', 45000, 'Yonex BWF Taraflex Rubber', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Court 2 (Yonex Pro)', 'badminton', 45000, 'Yonex BWF Taraflex Rubber', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Court 3 (Pickle Pro)', 'pickleball', 50000, 'Pro Cushioned Acrylic', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'BGC Center Court', 'badminton', 55000, 'Green Taraflex Mat', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'Padel Court Alpha', 'padel', 120000, 'Mondo Supercourt Pro Blue', TRUE, FALSE, TRUE),
    ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 'Court 1 (Yonex BWF Mat)', 'badminton', 35000, 'Yonex BWF Taraflex Rubber', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000006', 'Court 3 (Pickleball Championship)', 'pickleball', 30000, 'Pro Cushioned Acrylic', TRUE, TRUE, TRUE),
    ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000007', 'Coliseum Hardwood Main Court', 'basketball', 60000, 'Maple Hardwood Surface', TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Open Play Sessions
INSERT INTO public.sessions (id, venue_id, host_id, title, description, sport, session_type, allowed_formats, skill_level, court_ids, start_time, end_time, fee_cents, max_players, current_players_count, rotation_format, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Friday Night Smash: Doubles Open Play', 'Energetic doubles rotation across 2 courts. King of the Court format, shuttles provided, beginner & intermediate friendly.', 'badminton', 'open_play', ARRAY['doubles', 'mixed_doubles']::match_format[], 'all_levels', ARRAY['c0000000-0000-0000-0000-000000000001'::UUID, 'c0000000-0000-0000-0000-000000000002'::UUID], NOW() - INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 28000, 16, 12, 'King of the Court Doubles', 'active'),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Dinking & Rally: Pickleball Doubles Social', 'Fast-paced pickleball doubles queue. 11-point games, win by 2, rotation after each game. Demo paddles available.', 'pickleball', 'open_play', ARRAY['doubles']::match_format[], 'intermediate', ARRAY['c0000000-0000-0000-0000-000000000003'::UUID], NOW() + INTERVAL '2 hours', NOW() + INTERVAL '5 hours', 25000, 12, 7, 'Rally Rotation Doubles', 'upcoming')
ON CONFLICT (id) DO NOTHING;
