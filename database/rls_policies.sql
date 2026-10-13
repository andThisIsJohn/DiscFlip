-- =====================================================================
-- DISCFLIP ACCESS RULES (row level security + column permissions)
-- Version: 2.0.0
--
-- Run AFTER schema.sql. Safe to re-run.
--
-- The browser uses the public "publishable/anon" key, so these rules are
-- what actually protects the data. Server code in /api uses the service
-- role key, which bypasses them.
-- =====================================================================

-- ---------------------------------------------------------------------
-- USERS: anyone can read public profile columns; you can edit a safe
-- subset of your own row. Balances, strikes, admin flags, verification
-- and Stripe fields only change through server code or functions.
-- Your full row (email, addresses, …) comes from get_my_profile().
-- ---------------------------------------------------------------------
alter table public.users enable row level security;

revoke all on public.users from anon, authenticated;
grant select (
    id, name, handle, pdga_number, avatar, rating, total_sales, bio, location, joined_date,
    is_identity_verified, is_pro_seller, inventory, follower_count, specialty_badges,
    inventory_tags, last_active, club_id, owned_club_id, bounty_reliability_score, avg_ship_time,
    combined_shipping_config, stripe_onboarding_complete, is_system_admin, restriction_level
) on public.users to anon, authenticated;
grant update (
    name, handle, pdga_number, avatar, bio, location, payment_methods, bank_accounts,
    shipping_addresses, inventory, following_ids, favorite_user_ids, blocked_user_ids,
    muted_user_ids, specialty_badges, inventory_tags, last_active, has_seen_safety_onboarding,
    has_accepted_legal_terms, legal_accepted_at, trades, want_list, saved_searches, promotions,
    combined_shipping_config, avg_ship_time
) on public.users to authenticated;

drop policy if exists "Users: public profiles" on public.users;
create policy "Users: public profiles" on public.users for select using (true);

drop policy if exists "Users: edit own profile" on public.users;
create policy "Users: edit own profile" on public.users for update
    using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- AUCTIONS: live listings are public (minus hidden ones and sellers who
-- blocked you). Orders are only visible to the buyer, the seller and
-- admins, because they carry the buyer's shipping address.
-- New listings go through /api/auctions/create (safety limits); bids,
-- order status and payouts only change through database functions.
-- ---------------------------------------------------------------------
alter table public.auctions enable row level security;

revoke insert, update, delete on public.auctions from anon, authenticated;
grant select on public.auctions to anon, authenticated;
grant update (
    title, description, is_hidden, image_url, additional_images, rim_image, profile_image,
    weight_photo, auto_relist, trade_accepted, is_for_trade, shipping_price, shipping_cost,
    handling_time, return_policy
) on public.auctions to authenticated;

drop policy if exists "Auctions: Public browsing" on public.auctions;
drop policy if exists "Auctions: Socially filtered browsing" on public.auctions;
create policy "Auctions: Socially filtered browsing" on public.auctions for select using (
    (status = 'active' and is_hidden = false and not public.is_socially_blocked(auth.uid(), seller_id))
    or seller_id = auth.uid()
    or buyer_id = auth.uid()
    or public.is_admin()
    or (club_id is not null and exists (select 1 from public.clubs c where c.id = club_id and c.admin_id = auth.uid()))
);

drop policy if exists "Auctions: Seller or admin edits" on public.auctions;
create policy "Auctions: Seller or admin edits" on public.auctions for update
    using (seller_id = auth.uid() or public.is_admin())
    with check (seller_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- BIDS: written only by place_bid_secure(); readable by bidder/seller/admin
-- ---------------------------------------------------------------------
alter table public.bids enable row level security;
revoke insert, update, delete on public.bids from anon, authenticated;

drop policy if exists "Bids: Valid hunter only" on public.bids;
drop policy if exists "Bids: Safety verified insert" on public.bids;
drop policy if exists "Bids: participants read" on public.bids;
create policy "Bids: participants read" on public.bids for select using (
    bidder_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.auctions a where a.id = auction_id and a.seller_id = auth.uid())
);

-- ---------------------------------------------------------------------
-- MESSAGING
-- ---------------------------------------------------------------------
alter table public.threads enable row level security;
revoke update, delete on public.threads from anon, authenticated;

drop policy if exists "Threads: participants read" on public.threads;
create policy "Threads: participants read" on public.threads for select
    using (auth.uid() = any(participant_ids) or public.is_admin());

drop policy if exists "Threads: start a conversation" on public.threads;
create policy "Threads: start a conversation" on public.threads for insert with check (
    auth.uid() = any(participant_ids)
    and (buyer_id = auth.uid() or seller_id = auth.uid())
    and participant_ids @> array[buyer_id, seller_id]
    and not public.is_socially_blocked(buyer_id, seller_id)
);

-- Messages are written by /api/messages/send (scam scan + PII masking)
alter table public.messages enable row level security;
revoke insert, update, delete on public.messages from anon, authenticated;

drop policy if exists "Messages: Participant access" on public.messages;
drop policy if exists "Messages: Socially safe access" on public.messages;
create policy "Messages: Socially safe access" on public.messages for select using (
    exists (
        select 1 from public.threads t
        where t.id = thread_id
          and auth.uid() = any(t.participant_ids)
          and not public.is_socially_blocked(t.buyer_id, t.seller_id)
    )
    or public.is_admin()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS: your own only; you can only flip is_read
-- ---------------------------------------------------------------------
alter table public.notifications enable row level security;
revoke update, delete on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

drop policy if exists "Notifications: own" on public.notifications;
create policy "Notifications: own" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "Notifications: mark read" on public.notifications;
create policy "Notifications: mark read" on public.notifications for update
    using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Notifications: self insert" on public.notifications;
create policy "Notifications: self insert" on public.notifications for insert with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- BLOCKS
-- ---------------------------------------------------------------------
alter table public.blocks enable row level security;
drop policy if exists "Blocks: Self management" on public.blocks;
create policy "Blocks: Self management" on public.blocks for all
    using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- ---------------------------------------------------------------------
-- REPORTS: anyone signed in can file; only admins read and work cases
-- ---------------------------------------------------------------------
alter table public.reports enable row level security;
revoke update, delete on public.reports from anon, authenticated;
grant update (status, severity, internal_notes) on public.reports to authenticated;

drop policy if exists "Reports: Authenticated submission" on public.reports;
create policy "Reports: Authenticated submission" on public.reports for insert
    with check (auth.uid() = reporter_id);
drop policy if exists "Reports: Admin only read" on public.reports;
create policy "Reports: Admin only read" on public.reports for select using (public.is_admin());
drop policy if exists "Reports: Admin update" on public.reports;
create policy "Reports: Admin update" on public.reports for update
    using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- AUDIT LOG: append-only
-- ---------------------------------------------------------------------
alter table public.audit_logs enable row level security;
revoke update, delete on public.audit_logs from anon, authenticated;

drop policy if exists "Audit: Authenticated insert" on public.audit_logs;
create policy "Audit: Authenticated insert" on public.audit_logs for insert
    with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));
drop policy if exists "Audit: Admin only select" on public.audit_logs;
create policy "Audit: Admin only select" on public.audit_logs for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- BOUNTIES
-- ---------------------------------------------------------------------
alter table public.bounties enable row level security;
drop policy if exists "Bounties: read" on public.bounties;
create policy "Bounties: read" on public.bounties for select using (true);
drop policy if exists "Bounties: create own" on public.bounties;
create policy "Bounties: create own" on public.bounties for insert with check (buyer_id = auth.uid());
drop policy if exists "Bounties: edit own" on public.bounties;
create policy "Bounties: edit own" on public.bounties for update
    using (buyer_id = auth.uid()) with check (buyer_id = auth.uid());
drop policy if exists "Bounties: delete own" on public.bounties;
create policy "Bounties: delete own" on public.bounties for delete using (buyer_id = auth.uid());

alter table public.bounty_submissions enable row level security;
revoke update on public.bounty_submissions from anon, authenticated;
drop policy if exists "Bounty submissions: read" on public.bounty_submissions;
create policy "Bounty submissions: read" on public.bounty_submissions for select using (true);
drop policy if exists "Bounty submissions: submit" on public.bounty_submissions;
create policy "Bounty submissions: submit" on public.bounty_submissions for insert with check (
    seller_id = auth.uid()
    and exists (select 1 from public.bounties b where b.id = bounty_id and b.status = 'Open' and b.buyer_id <> auth.uid())
);
drop policy if exists "Bounty submissions: withdraw" on public.bounty_submissions;
create policy "Bounty submissions: withdraw" on public.bounty_submissions for delete using (seller_id = auth.uid());

-- ---------------------------------------------------------------------
-- TRADES: sender and receiver only; answers go through respond_to_trade()
-- ---------------------------------------------------------------------
alter table public.trade_offers enable row level security;
revoke update, delete on public.trade_offers from anon, authenticated;
drop policy if exists "Trades: parties read" on public.trade_offers;
create policy "Trades: parties read" on public.trade_offers for select
    using (auth.uid() in (sender_id, receiver_id) or public.is_admin());
drop policy if exists "Trades: send" on public.trade_offers;
create policy "Trades: send" on public.trade_offers for insert with check (
    sender_id = auth.uid() and receiver_id <> auth.uid() and status = 'Pending'
    and not public.is_socially_blocked(sender_id, receiver_id)
);

-- ---------------------------------------------------------------------
-- CLUBS: public; created and joined through functions; admin edits profile
-- ---------------------------------------------------------------------
alter table public.clubs enable row level security;
revoke insert, update, delete on public.clubs from anon, authenticated;
grant update (name, description, logo, location, fundraiser_goal) on public.clubs to authenticated;
drop policy if exists "Clubs: read" on public.clubs;
create policy "Clubs: read" on public.clubs for select using (true);
drop policy if exists "Clubs: admin edits" on public.clubs;
create policy "Clubs: admin edits" on public.clubs for update
    using (admin_id = auth.uid()) with check (admin_id = auth.uid());

-- ---------------------------------------------------------------------
-- FUNCTIONS: the signed-out public can only run the read-only ones
-- ---------------------------------------------------------------------
revoke execute on function public.place_bid_secure(uuid, numeric) from anon;
revoke execute on function public.mark_order_packed(uuid, text) from anon;
revoke execute on function public.confirm_order_delivery(uuid, numeric) from anon;
revoke execute on function public.open_order_dispute(uuid, jsonb) from anon;
revoke execute on function public.admin_set_order_status(uuid, text, numeric) from anon;
revoke execute on function public.admin_moderate_user(uuid, text, text) from anon;
revoke execute on function public.increment_user_strikes(uuid) from anon;
revoke execute on function public.create_club(jsonb) from anon;
revoke execute on function public.schedule_pickup(uuid, jsonb) from anon;
revoke execute on function public.complete_pickup(uuid, text) from anon;
revoke execute on function public.accept_bounty_submission(uuid) from anon;
-- server-only (daily maintenance job uses the service role)
revoke execute on function public.complete_overdue_deliveries() from anon, authenticated, public;
revoke execute on function public.notify(uuid, text, text, text, text) from anon, authenticated, public;
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- ---------------------------------------------------------------------
-- STORAGE: photos in the public 'disc-images' bucket. Anyone can view;
-- signed-in users can upload only into a folder named after their id.
-- ---------------------------------------------------------------------
drop policy if exists "Disc images: upload own" on storage.objects;
create policy "Disc images: upload own" on storage.objects for insert to authenticated with check (
    bucket_id = 'disc-images' and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Disc images: manage own" on storage.objects;
create policy "Disc images: manage own" on storage.objects for delete to authenticated using (
    bucket_id = 'disc-images' and (storage.foldername(name))[1] = auth.uid()::text
);
