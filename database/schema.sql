-- =====================================================================
-- DISCFLIP DATABASE SETUP (Supabase / Postgres)
--
-- How to run: Supabase dashboard → SQL Editor → New query → paste this
-- whole file → Run. Then do the same with rls_policies.sql.
-- Both files are safe to re-run.
--
-- Naming: columns are snake_case. The app converts to camelCase in
-- services/mappers.ts — if you add a column here, add it there too.
-- Times the app does math on (end_time, deadlines…) are bigint epoch
-- milliseconds; created_at / sold_at are timestamptz.
-- =====================================================================

create extension if not exists pgcrypto;

-- Epoch milliseconds, the format the app uses for timers
create or replace function public.now_ms() returns bigint
language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint $$;

-- ---------------------------------------------------------------------
-- USERS (public profile + private account fields; one row per auth user)
-- ---------------------------------------------------------------------
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    name text not null default 'Hunter',
    handle text not null default '',
    pdga_number text,
    avatar text,
    rating numeric not null default 5,
    balance numeric not null default 0,
    payout_balance numeric not null default 0,
    pending_balance numeric not null default 0,
    total_sales integer not null default 0,
    bio text not null default '',
    location text not null default '',
    joined_date bigint not null default public.now_ms(),
    is_identity_verified boolean not null default false,
    is_pro_seller boolean not null default false,
    payment_methods jsonb not null default '[]',
    bank_accounts jsonb not null default '[]',
    shipping_addresses jsonb not null default '[]',
    inventory jsonb not null default '[]',
    following_ids uuid[] not null default '{}',
    favorite_user_ids uuid[] not null default '{}',
    blocked_user_ids uuid[] not null default '{}',
    muted_user_ids uuid[] not null default '{}',
    follower_count integer not null default 0,
    specialty_badges text[] not null default '{}',
    inventory_tags text[] not null default '{}',
    last_active bigint not null default public.now_ms(),
    strikes integer not null default 0,
    restriction_level text not null default 'None',
    restriction_expires bigint,
    spam_score numeric not null default 0,
    is_system_admin boolean not null default false,
    has_seen_safety_onboarding boolean not null default false,
    has_accepted_legal_terms boolean not null default false,
    legal_accepted_at bigint,
    trades jsonb not null default '[]',
    want_list jsonb not null default '[]',
    saved_searches jsonb not null default '[]',
    promotions jsonb not null default '[]',
    club_id uuid,
    owned_club_id uuid,
    bounty_reliability_score numeric not null default 100,
    avg_ship_time text,
    stripe_account_id text,
    stripe_onboarding_complete boolean not null default false,
    requires_id_for_payout boolean not null default false,
    requires_tracked_shipping boolean not null default false,
    combined_shipping_config jsonb,
    created_at timestamptz not null default now()
);

-- Is the signed-in user a system admin? (SECURITY DEFINER so policies on
-- `users` can call it without recursing into themselves)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce((select is_system_admin from public.users where id = auth.uid()), false)
$$;

-- Create a profile row automatically whenever someone signs up (email or Google)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    base_name text := coalesce(
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(new.raw_user_meta_data->>'name', ''),
        split_part(new.email, '@', 1),
        'Hunter'
    );
begin
    insert into public.users (id, email, name, handle, avatar)
    values (
        new.id,
        new.email,
        base_name,
        lower(regexp_replace(coalesce(split_part(new.email, '@', 1), 'hunter'), '[^a-zA-Z0-9]', '', 'g'))
            || substr(replace(new.id::text, '-', ''), 1, 4),
        coalesce(new.raw_user_meta_data->>'avatar_url',
                 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id::text)
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- Back-fill profiles for anyone who signed up before this script ran
insert into public.users (id, email, name, handle, avatar)
select u.id, u.email,
       coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'Hunter'),
       lower(regexp_replace(coalesce(split_part(u.email, '@', 1), 'hunter'), '[^a-zA-Z0-9]', '', 'g'))
           || substr(replace(u.id::text, '-', ''), 1, 4),
       coalesce(u.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || u.id::text)
from auth.users u
on conflict (id) do nothing;

-- Your own full profile (other people only see the public columns)
create or replace function public.get_my_profile() returns setof public.users
language sql stable security definer set search_path = public as $$
    select * from public.users where id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- CLUBS
-- ---------------------------------------------------------------------
create table if not exists public.clubs (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    location text not null default '',
    logo text,
    admin_id uuid not null references public.users(id) on delete cascade,
    member_ids uuid[] not null default '{}',
    pending_member_ids uuid[] not null default '{}',
    banned_member_ids uuid[] not null default '{}',
    member_count integer not null default 1,
    rating numeric not null default 5,
    description text not null default '',
    is_verified boolean not null default false,
    fundraiser_goal numeric,
    fundraiser_raised numeric,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- AUCTIONS / LISTINGS (a listing becomes an order once someone buys it)
-- ---------------------------------------------------------------------
create table if not exists public.auctions (
    id uuid primary key default gen_random_uuid(),
    seller_id uuid not null references public.users(id) on delete cascade,
    seller text,
    title text not null default '',
    brand text,
    mold text,
    plastic text,
    weight numeric,
    color text,
    condition numeric,
    has_ink boolean not null default false,
    description text not null default '',
    image_url text,
    image_set jsonb,
    rim_image text,
    profile_image text,
    weight_photo text,
    additional_images text[] not null default '{}',
    is_hidden boolean not null default false,
    is_under_review boolean not null default false,
    type text,
    current_bid numeric not null default 0,
    end_time bigint,
    status text not null default 'active',
    bids jsonb not null default '[]',
    category text,
    shipping_cost numeric not null default 0,
    shipping_option text,
    start_price numeric not null default 0,
    bid_count integer not null default 0,
    bid_increment numeric not null default 1,
    anti_snipe boolean not null default true,
    duration numeric,
    shipping_price numeric not null default 0,
    shipping_method text,
    handling_time numeric,
    location text,
    flight_numbers jsonb,
    dome text,
    created_at timestamptz not null default now(),
    buyer_id uuid references public.users(id),
    sold_price numeric,
    sold_at timestamptz,
    club_id uuid references public.clubs(id) on delete set null,
    confirmation_deadline bigint,
    tracking_number text,
    label_carrier text,
    admin_logs jsonb not null default '[]',
    payout_status text,
    signature_required boolean,
    fulfillment_mode text,
    buyer_shipping_address jsonb,
    buy_now_price numeric,
    start_time bigint,
    auto_relist boolean,
    tracking_included boolean,
    physical_location text,
    visibility text,
    flight_offset text,
    flex numeric,
    glow text,
    swirl text,
    feel_tags text[] not null default '{}',
    run text,
    foil_color text,
    stamp_type text,
    is_rarity boolean,
    rarity_tags text[] not null default '{}',
    is_autographed boolean,
    has_coa boolean,
    wear_history text,
    storage_notes text,
    smoke_free boolean,
    pet_free boolean,
    return_policy text,
    trade_accepted boolean,
    is_lot boolean,
    is_for_trade boolean,
    is_in_bag boolean,
    watcher_count integer not null default 0,
    view_count integer not null default 0,
    qr_code_id text,
    ink_location text,
    ink_heavy text,
    scuffs text,
    gouges text,
    warping text,
    high_bidder_id uuid references public.users(id),
    high_bidder_max_amount numeric,
    anti_snipe_window_ms bigint,
    bundle_id text,
    tracking_events jsonb not null default '[]',
    payout_released boolean not null default false,
    packaging_proof_photo text,
    ship_by_date bigint,
    is_high_value_hold boolean,
    pickup_details jsonb,
    additional_image_sets jsonb,
    plastic_feel text,
    verification_tier text,
    shipping_label_url text,
    order_dispute jsonb,
    -- server-only bookkeeping (Stripe / EasyPost)
    stripe_payment_intent_id text,
    easypost_shipment_id text
);

create index if not exists auctions_status_idx on public.auctions (status, end_time);
create index if not exists auctions_seller_idx on public.auctions (seller_id);
create index if not exists auctions_buyer_idx on public.auctions (buyer_id);
create index if not exists auctions_tracking_idx on public.auctions (tracking_number);
create index if not exists auctions_pi_idx on public.auctions (stripe_payment_intent_id);

create table if not exists public.bids (
    id uuid primary key default gen_random_uuid(),
    auction_id uuid not null references public.auctions(id) on delete cascade,
    bidder_id uuid not null references public.users(id) on delete cascade,
    amount numeric not null,
    created_at timestamptz not null default now()
);
create index if not exists bids_auction_idx on public.bids (auction_id);

-- ---------------------------------------------------------------------
-- SAFETY: blocks, reports, audit log
-- ---------------------------------------------------------------------
create table if not exists public.blocks (
    blocker_id uuid not null references public.users(id) on delete cascade,
    blocked_id uuid not null references public.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (blocker_id, blocked_id)
);

-- Returns true if either user has blocked the other
create or replace function public.is_socially_blocked(user_a uuid, user_b uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
begin
    if user_a is null or user_b is null then return false; end if;
    return exists (
        select 1 from public.blocks
        where (blocker_id = user_a and blocked_id = user_b)
           or (blocker_id = user_b and blocked_id = user_a)
    );
end;
$$;

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    ticket_id text not null,
    reporter_id uuid references public.users(id) on delete set null,
    reporter_name text,
    target_type text,
    target_id text,
    target_owner_id uuid,
    category text,
    details text not null default '',
    evidence_photos jsonb not null default '[]',
    context_snapshot jsonb,
    status text not null default 'Received',
    severity text not null default 'Medium',
    club_id uuid,
    internal_notes jsonb not null default '[]',
    created_at timestamptz not null default now()
);
alter table public.reports alter column ticket_id set default ('TKT-' || upper(substr(md5(random()::text), 1, 6)));

create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.users(id) on delete set null,
    action text not null,          -- e.g. 'AUCTION_CREATE', 'BID_PLACE', 'MOD_BAN'
    target_type text not null,     -- e.g. 'AUCTION', 'USER', 'ORDER'
    target_id text not null,
    metadata jsonb not null default '{}',
    ip_address text,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    type text not null,
    title text not null default '',
    message text not null default '',
    target_id text,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create or replace function public.notify(p_user uuid, p_type text, p_title text, p_message text, p_target text)
returns void language sql security definer set search_path = public as $$
    insert into public.notifications (user_id, type, title, message, target_id)
    values (p_user, p_type, p_title, p_message, p_target)
$$;

-- ---------------------------------------------------------------------
-- MESSAGING
-- ---------------------------------------------------------------------
create table if not exists public.threads (
    id uuid primary key default gen_random_uuid(),
    type text not null default 'general',
    object_id text not null,
    participant_ids uuid[] not null,
    object_title text,
    object_image text,
    last_timestamp bigint not null default public.now_ms(),
    status text not null default 'open',
    buyer_id uuid not null references public.users(id) on delete cascade,
    seller_id uuid not null references public.users(id) on delete cascade,
    unread_count jsonb not null default '{}',
    last_message text,
    is_spam_request boolean not null default false,
    created_at timestamptz not null default now()
);
create index if not exists threads_participants_idx on public.threads using gin (participant_ids);

create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    thread_id uuid not null references public.threads(id) on delete cascade,
    sender_id uuid not null references public.users(id) on delete cascade,
    text text not null default '',
    "timestamp" timestamptz not null default now(),
    is_read boolean not null default false,
    offer jsonb
);
create index if not exists messages_thread_idx on public.messages (thread_id, "timestamp");

-- Keep the thread preview / unread counters current and notify the other side
create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
    t public.threads;
    other uuid;
    counts jsonb;
begin
    select * into t from public.threads where id = new.thread_id;
    if not found then return new; end if;
    counts := t.unread_count;
    foreach other in array t.participant_ids loop
        if other <> new.sender_id then
            counts := jsonb_set(counts, array[other::text],
                                to_jsonb(coalesce((counts->>other::text)::int, 0) + 1));
            perform public.notify(other, 'new_message', 'New message',
                                  left(coalesce(new.text, ''), 120), new.thread_id::text);
        end if;
    end loop;
    update public.threads
       set last_message = left(coalesce(new.text, ''), 140),
           last_timestamp = public.now_ms(),
           unread_count = counts
     where id = new.thread_id;
    return new;
end;
$$;

drop trigger if exists messages_after_insert on public.messages;
create trigger messages_after_insert
    after insert on public.messages
    for each row execute function public.on_message_insert();

create or replace function public.mark_thread_read(p_thread_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
    if uid is null or not exists (select 1 from public.threads where id = p_thread_id and uid = any(participant_ids)) then
        raise exception 'Not part of this conversation';
    end if;
    update public.threads set unread_count = unread_count || jsonb_build_object(uid::text, 0) where id = p_thread_id;
    update public.messages set is_read = true where thread_id = p_thread_id and sender_id <> uid and not is_read;
end;
$$;

-- ---------------------------------------------------------------------
-- BOUNTIES (WTB / WTT / ISO requests) and TRADES
-- ---------------------------------------------------------------------
create table if not exists public.bounties (
    id uuid primary key default gen_random_uuid(),
    buyer_id uuid not null references public.users(id) on delete cascade,
    buyer_name text,
    type text,
    brand text,
    mold text,
    plastic text,
    weight_min numeric,
    weight_max numeric,
    color_preference text,
    color_must_be boolean,
    condition_min numeric,
    ink_allowed boolean,
    dome_preference text,
    glow_required boolean,
    must_be_unthrown boolean,
    price_offer numeric,
    price_is_shipped boolean,
    is_verified_bounty boolean not null default false,
    visibility text not null default 'Public',
    status text not null default 'Open',
    created_at timestamptz not null default now(),
    expiration_date bigint,
    view_count integer not null default 0,
    auto_renew boolean not null default false
);

create table if not exists public.bounty_submissions (
    id uuid primary key default gen_random_uuid(),
    bounty_id uuid not null references public.bounties(id) on delete cascade,
    seller_id uuid not null references public.users(id) on delete cascade,
    seller_name text,
    price_proposed numeric,
    notes text,
    image_url text,
    condition numeric,
    has_ink boolean,
    created_at timestamptz not null default now()
);

create or replace function public.on_bounty_submission() returns trigger
language plpgsql security definer set search_path = public as $$
declare b public.bounties;
begin
    select * into b from public.bounties where id = new.bounty_id;
    if found then
        perform public.notify(b.buyer_id, 'offer_accepted', 'New bounty match',
            coalesce(new.seller_name, 'A seller') || ' has a ' || coalesce(b.mold, 'disc') || ' for you.', b.id::text);
    end if;
    return new;
end;
$$;
drop trigger if exists bounty_submissions_after_insert on public.bounty_submissions;
create trigger bounty_submissions_after_insert
    after insert on public.bounty_submissions
    for each row execute function public.on_bounty_submission();

-- Bounty poster accepts a seller's match: this creates an order (like a won auction)
-- that the poster pays for from Account → Orders.
create or replace function public.accept_bounty_submission(p_submission_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
    sub public.bounty_submissions;
    b public.bounties;
    seller_name text;
    order_id uuid;
begin
    select * into sub from public.bounty_submissions where id = p_submission_id;
    if not found then raise exception 'Submission not found'; end if;
    select * into b from public.bounties where id = sub.bounty_id for update;
    if b.buyer_id <> auth.uid() then raise exception 'Only the person who posted the bounty can accept'; end if;
    if b.status <> 'Open' then raise exception 'This bounty is already %', lower(b.status); end if;
    select name into seller_name from public.users where id = sub.seller_id;

    insert into public.auctions (seller_id, seller, title, brand, mold, plastic, condition, has_ink,
                                 description, image_url, type, start_price, current_bid, status,
                                 buyer_id, sold_price, sold_at, payout_status, shipping_price,
                                 shipping_cost, is_hidden, end_time)
    values (sub.seller_id, seller_name,
            trim(coalesce(b.brand, '') || ' ' || coalesce(b.plastic, '') || ' ' || coalesce(b.mold, '')),
            b.brand, b.mold, b.plastic, sub.condition, coalesce(sub.has_ink, false),
            coalesce(sub.notes, ''), sub.image_url, 'Buy It Now', sub.price_proposed, sub.price_proposed,
            'sold', b.buyer_id, sub.price_proposed, now(), 'unpaid', 0, 0, true, public.now_ms())
    returning id into order_id;

    update public.bounties set status = 'Fulfilled' where id = b.id;
    perform public.notify(sub.seller_id, 'offer_accepted', 'Bounty match accepted',
        'Your ' || coalesce(b.mold, 'disc') || ' was accepted. Ship it once the buyer pays.', order_id::text);
    return order_id;
end;
$$;

create table if not exists public.trade_offers (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid not null references public.users(id) on delete cascade,
    sender_name text,
    receiver_id uuid not null references public.users(id) on delete cascade,
    receiver_name text,
    sender_discs text[] not null default '{}',
    receiver_discs text[] not null default '{}',
    cash_adjustment numeric not null default 0,
    status text not null default 'Pending',
    created_at timestamptz not null default now()
);

create or replace function public.respond_to_trade(p_trade_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare
    uid uuid := auth.uid();
    t public.trade_offers;
begin
    select * into t from public.trade_offers where id = p_trade_id for update;
    if not found then raise exception 'Trade not found'; end if;
    if p_status in ('Accepted', 'Declined') then
        if t.receiver_id <> uid then raise exception 'Only the person receiving the offer can answer it'; end if;
        if t.status <> 'Pending' then raise exception 'This offer was already answered'; end if;
    elsif p_status = 'Completed' then
        if uid not in (t.sender_id, t.receiver_id) then raise exception 'Not your trade'; end if;
        if t.status <> 'Accepted' then raise exception 'Only accepted trades can be completed'; end if;
    else
        raise exception 'Unknown trade status %', p_status;
    end if;
    update public.trade_offers set status = p_status where id = p_trade_id;
    perform public.notify(case when uid = t.sender_id then t.receiver_id else t.sender_id end,
        'offer_accepted', 'Trade ' || lower(p_status), 'Your trade offer was ' || lower(p_status) || '.', t.id::text);
end;
$$;

-- ---------------------------------------------------------------------
-- BIDDING & AUCTION LIFECYCLE
-- ---------------------------------------------------------------------
create or replace function public.place_bid_secure(p_auction_id uuid, p_amount numeric) returns void
language plpgsql security definer set search_path = public as $$
declare
    uid uuid := auth.uid();
    a public.auctions;
    me public.users;
    minimum numeric;
    snipe_window bigint;
    new_end bigint;
    now_ms bigint := public.now_ms();
begin
    if uid is null then raise exception 'Sign in to bid'; end if;
    select * into me from public.users where id = uid;
    if me.restriction_level in ('Account Freeze', 'Banned')
       and (me.restriction_expires is null or me.restriction_expires > now_ms) then
        raise exception 'Your account is restricted from bidding right now';
    end if;

    select * into a from public.auctions where id = p_auction_id for update;
    if not found then raise exception 'Auction not found'; end if;
    if a.status <> 'active' or a.is_hidden then raise exception 'This auction is no longer active'; end if;
    if a.end_time is not null and a.end_time <= now_ms then raise exception 'This auction has ended'; end if;
    if a.seller_id = uid then raise exception 'You cannot bid on your own listing'; end if;
    if public.is_socially_blocked(uid, a.seller_id) then raise exception 'You cannot bid on this listing'; end if;

    minimum := case when a.bid_count = 0 then a.start_price else a.current_bid + a.bid_increment end;
    if p_amount < minimum then
        raise exception 'Bid must be at least $%', to_char(minimum, 'FM999999990.00');
    end if;

    -- Anti-snipe: a late bid pushes the end time back out
    snipe_window := coalesce(a.anti_snipe_window_ms, 120000);
    new_end := a.end_time;
    if a.anti_snipe and a.end_time is not null and a.end_time - now_ms < snipe_window then
        new_end := now_ms + snipe_window;
    end if;

    update public.auctions
       set current_bid = p_amount,
           bid_count = bid_count + 1,
           high_bidder_id = uid,
           end_time = new_end,
           bids = bids || jsonb_build_array(jsonb_build_object(
               'id', gen_random_uuid(), 'bidder', me.name, 'bidderId', uid,
               'amount', p_amount, 'timestamp', now_ms))
     where id = p_auction_id;

    insert into public.bids (auction_id, bidder_id, amount) values (p_auction_id, uid, p_amount);

    if a.high_bidder_id is not null and a.high_bidder_id <> uid then
        perform public.notify(a.high_bidder_id, 'outbid', 'You were outbid',
            'Someone bid $' || to_char(p_amount, 'FM999999990.00') || ' on ' || coalesce(a.title, 'a disc') || '.', a.id::text);
    end if;
end;
$$;

-- Close auctions whose timer ran out. Safe to call often (the app calls it every 10s;
-- you can also schedule it with pg_cron).
create or replace function public.finalize_ended_auctions() returns integer
language plpgsql security definer set search_path = public as $$
declare
    a public.auctions;
    n integer := 0;
begin
    for a in
        select * from public.auctions
         where status = 'active' and end_time is not null and end_time < public.now_ms()
           for update skip locked
    loop
        if a.bid_count > 0 and a.high_bidder_id is not null then
            update public.auctions
               set status = 'sold', buyer_id = a.high_bidder_id, sold_price = a.current_bid,
                   sold_at = now(), payout_status = 'unpaid'
             where id = a.id;
            perform public.notify(a.high_bidder_id, 'auction_won', 'You won!',
                'You won ' || coalesce(a.title, 'an auction') || '. Pay from Account → Orders to lock it in.', a.id::text);
            perform public.notify(a.seller_id, 'item_sold', 'Auction ended',
                coalesce(a.title, 'Your disc') || ' sold for $' || to_char(a.current_bid, 'FM999999990.00') || '. Waiting for the winner to pay.', a.id::text);
        else
            update public.auctions set status = 'expired' where id = a.id;
        end if;
        n := n + 1;
    end loop;

    -- Winners (and accepted bounty matches) that weren't paid within 48 hours:
    -- auctions go back on the market, bounty orders are cancelled.
    for a in
        select * from public.auctions
         where status = 'sold' and payout_status = 'unpaid'
           and sold_at < now() - interval '48 hours'
           for update skip locked
    loop
        if a.is_hidden then
            update public.auctions set status = 'expired', payout_status = null where id = a.id;
        else
            update public.auctions
               set status = 'active', buyer_id = null, high_bidder_id = null, high_bidder_max_amount = null,
                   sold_price = null, sold_at = null, payout_status = null, bids = '[]'::jsonb,
                   bid_count = 0, current_bid = start_price, start_time = public.now_ms(),
                   end_time = public.now_ms() + (coalesce(duration, 3) * 86400000)::bigint
             where id = a.id;
        end if;
        perform public.notify(a.buyer_id, 'system_alert', 'Order cancelled',
            'You didn''t pay for ' || coalesce(a.title, 'your win') || ' within 48 hours, so the order was cancelled.', a.id::text);
        perform public.notify(a.seller_id, 'system_alert',
            case when a.is_hidden then 'Bounty order cancelled' else 'Relisted' end,
            'The buyer didn''t pay for ' || coalesce(a.title, 'your disc') ||
            case when a.is_hidden then '.' else ' within 48 hours, so it''s back on the market.' end, a.id::text);
        n := n + 1;
    end loop;
    return n;
end;
$$;

-- Delivered orders the buyer never confirmed: complete them once the 72-hour window passes.
-- Called by the daily maintenance job (api/cron/maintenance.ts), which then pays the sellers.
create or replace function public.complete_overdue_deliveries() returns setof uuid
language plpgsql security definer set search_path = public as $$
begin
    return query
    update public.auctions
       set status = 'completed'
     where status = 'delivered'
       and confirmation_deadline is not null
       and confirmation_deadline < public.now_ms()
       and coalesce(is_high_value_hold, false) = false
    returning id;
end;
$$;

-- ---------------------------------------------------------------------
-- ORDER STATE CHANGES (buyers/sellers can't edit these columns directly)
-- ---------------------------------------------------------------------
create or replace function public.mark_order_packed(p_auction_id uuid, p_proof_photo text) returns void
language plpgsql security definer set search_path = public as $$
declare a public.auctions;
begin
    select * into a from public.auctions where id = p_auction_id for update;
    if not found or a.seller_id <> auth.uid() then raise exception 'Not your order'; end if;
    if a.payout_status = 'unpaid' then raise exception 'Wait for the buyer to pay before shipping'; end if;
    if a.status not in ('sold', 'awaiting_scheduling', 'pickup_scheduled') then
        raise exception 'This order can''t be marked packed from status %', a.status;
    end if;
    update public.auctions set status = 'packed', packaging_proof_photo = coalesce(p_proof_photo, packaging_proof_photo)
     where id = p_auction_id;
    if a.buyer_id is not null then
        perform public.notify(a.buyer_id, 'item_shipped', 'Packed and ready',
            coalesce(a.title, 'Your disc') || ' is packed and heading out soon.', a.id::text);
    end if;
end;
$$;

create or replace function public.confirm_order_delivery(p_auction_id uuid, p_rating numeric) returns void
language plpgsql security definer set search_path = public as $$
declare a public.auctions;
begin
    select * into a from public.auctions where id = p_auction_id for update;
    if not found or a.buyer_id <> auth.uid() then raise exception 'Not your order'; end if;
    if a.payout_status = 'unpaid' then raise exception 'This order hasn''t been paid yet'; end if;
    if a.status in ('completed', 'refunded', 'admin_closed', 'disputed') then
        raise exception 'This order is already %', a.status;
    end if;
    update public.auctions set status = 'completed' where id = p_auction_id;
    if p_rating between 1 and 5 then
        update public.users
           set rating = round((rating * total_sales + p_rating) / (total_sales + 1), 2),
               total_sales = total_sales + 1
         where id = a.seller_id;
    end if;
    perform public.notify(a.seller_id, 'payment_received', 'Delivery confirmed',
        'The buyer confirmed ' || coalesce(a.title, 'your disc') || '. Your payout is being released.', a.id::text);
end;
$$;

create or replace function public.open_order_dispute(p_auction_id uuid, p_dispute jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a public.auctions;
begin
    select * into a from public.auctions where id = p_auction_id for update;
    if not found or a.buyer_id <> auth.uid() then raise exception 'Not your order'; end if;
    if a.status in ('completed', 'refunded', 'admin_closed') then raise exception 'This order is closed'; end if;
    update public.auctions set status = 'disputed', payout_status = 'held', order_dispute = p_dispute
     where id = p_auction_id;
    perform public.notify(a.seller_id, 'order_issue_reported', 'Issue reported',
        'The buyer reported a problem with ' || coalesce(a.title, 'an order') || '. Payout is on hold.', a.id::text);
end;
$$;

-- Local pickup: the buyer picks a meetup spot/time and gets a 6-digit PIN flow.
-- The seller shows the PIN at the meetup; the buyer enters it to confirm the hand-off.
create or replace function public.schedule_pickup(p_auction_id uuid, p_details jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a public.auctions;
begin
    select * into a from public.auctions where id = p_auction_id for update;
    if not found or a.buyer_id <> auth.uid() then raise exception 'Not your order'; end if;
    if a.payout_status = 'unpaid' then raise exception 'Pay for the order before scheduling pickup'; end if;
    if a.status not in ('sold', 'awaiting_scheduling', 'pickup_scheduled') then
        raise exception 'Pickup can''t be scheduled from status %', a.status;
    end if;
    update public.auctions
       set status = 'pickup_scheduled',
           fulfillment_mode = 'pickup',
           pickup_details = coalesce(p_details, '{}'::jsonb)
               || jsonb_build_object('verificationPin', lpad((floor(random() * 1000000))::int::text, 6, '0'))
     where id = p_auction_id;
    perform public.notify(a.seller_id, 'item_sold', 'Pickup scheduled',
        'Meetup for ' || coalesce(a.title, 'your disc') || ': ' || coalesce(p_details->>'location', '') ||
        ' • ' || coalesce(p_details->>'timeWindow', ''), a.id::text);
end;
$$;

create or replace function public.complete_pickup(p_auction_id uuid, p_pin text) returns boolean
language plpgsql security definer set search_path = public as $$
declare a public.auctions;
begin
    select * into a from public.auctions where id = p_auction_id for update;
    if not found or a.buyer_id <> auth.uid() then raise exception 'Not your order'; end if;
    if a.status <> 'pickup_scheduled' then raise exception 'This pickup isn''t scheduled'; end if;
    if coalesce(a.pickup_details->>'verificationPin', '') <> coalesce(p_pin, '') then return false; end if;
    update public.auctions set status = 'completed' where id = p_auction_id;
    update public.users set total_sales = total_sales + 1 where id = a.seller_id;
    perform public.notify(a.seller_id, 'payment_received', 'Hand-off confirmed',
        'The buyer confirmed pickup of ' || coalesce(a.title, 'your disc') || '. Your payout is being released.', a.id::text);
    return true;
end;
$$;

create or replace function public.admin_set_order_status(p_auction_id uuid, p_status text, p_extend_hours numeric)
returns void language plpgsql security definer set search_path = public as $$
begin
    if not public.is_admin() then raise exception 'Admins only'; end if;
    update public.auctions
       set status = coalesce(p_status, status),
           confirmation_deadline = case when coalesce(p_extend_hours, 0) > 0
               then coalesce(confirmation_deadline, public.now_ms()) + (p_extend_hours * 3600000)::bigint
               else confirmation_deadline end
     where id = p_auction_id;
end;
$$;

-- ---------------------------------------------------------------------
-- MODERATION
-- ---------------------------------------------------------------------
-- Automated strike (off-platform payment attempts etc). A user can strike
-- themselves (client-side scanner), admins can strike anyone, and the
-- server (service role, no auth.uid()) can strike anyone.
create or replace function public.increment_user_strikes(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
    s integer;
    lvl text;
begin
    if auth.uid() is not null and auth.uid() <> p_user_id and not public.is_admin() then
        raise exception 'Not allowed';
    end if;
    update public.users set strikes = strikes + 1 where id = p_user_id returning strikes into s;
    if s is null then return; end if;
    lvl := case when s >= 5 then 'Banned' when s >= 3 then 'Account Freeze' else 'Warning' end;
    update public.users
       set restriction_level = lvl,
           restriction_expires = public.now_ms() + 86400000::bigint * s
     where id = p_user_id;
    perform public.notify(p_user_id, 'system_alert', 'Account Restricted',
        'Automated safety signal detected. A strike has been issued (' || s || ' total).', p_user_id::text);
end;
$$;

create or replace function public.admin_moderate_user(p_user_id uuid, p_action text, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare lvl text;
begin
    if not public.is_admin() then raise exception 'Admins only'; end if;
    lvl := case p_action
        when 'warn' then 'Warning'
        when 'mute' then 'Restricted Messaging'
        when 'freeze' then 'Account Freeze'
        when 'ban' then 'Banned'
        else null end;
    update public.users
       set strikes = strikes + 1,
           restriction_level = coalesce(lvl, restriction_level),
           restriction_expires = case when p_action = 'ban' then null
                                      else public.now_ms() + 3 * 86400000::bigint end
     where id = p_user_id;
    perform public.notify(p_user_id, 'report_action_taken', 'Moderation action',
        coalesce(p_reason, 'A moderator took action on your account.'), p_user_id::text);
end;
$$;

-- ---------------------------------------------------------------------
-- CLUB MEMBERSHIP
-- ---------------------------------------------------------------------
create or replace function public.create_club(p_club jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
    uid uuid := auth.uid();
    new_id uuid;
begin
    if uid is null then raise exception 'Sign in first'; end if;
    insert into public.clubs (name, location, logo, description, fundraiser_goal, admin_id, member_ids, member_count)
    values (coalesce(p_club->>'name', 'New Club'), coalesce(p_club->>'location', ''), p_club->>'logo',
            coalesce(p_club->>'description', ''), nullif(p_club->>'fundraiser_goal', '')::numeric,
            uid, array[uid], 1)
    returning id into new_id;
    update public.users set owned_club_id = new_id, club_id = coalesce(club_id, new_id) where id = uid;
    return new_id;
end;
$$;

create or replace function public.request_to_join_club(p_club_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.clubs;
begin
    if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'Not allowed'; end if;
    select * into c from public.clubs where id = p_club_id for update;
    if not found then raise exception 'Club not found'; end if;
    if p_user_id = any(c.banned_member_ids) then raise exception 'You are not able to join this club.'; end if;
    if p_user_id = any(c.member_ids) or p_user_id = any(c.pending_member_ids) then return; end if;
    update public.clubs set pending_member_ids = array_append(pending_member_ids, p_user_id) where id = p_club_id;
    perform public.notify(c.admin_id, 'new_follower', 'Join request', 'Someone asked to join ' || c.name || '.', p_user_id::text);
end;
$$;

create or replace function public.approve_club_member(p_club_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.clubs;
begin
    select * into c from public.clubs where id = p_club_id for update;
    if not found or c.admin_id <> auth.uid() then raise exception 'Only the club admin can do that'; end if;
    update public.clubs
       set pending_member_ids = array_remove(pending_member_ids, p_user_id),
           member_ids = case when p_user_id = any(member_ids) then member_ids else array_append(member_ids, p_user_id) end
     where id = p_club_id;
    update public.clubs set member_count = cardinality(member_ids) where id = p_club_id;
    update public.users set club_id = p_club_id where id = p_user_id and club_id is null;
    perform public.notify(p_user_id, 'system_alert', 'Welcome to ' || c.name, 'Your club request was approved.', p_club_id::text);
end;
$$;

create or replace function public.remove_club_member(p_club_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.clubs;
begin
    select * into c from public.clubs where id = p_club_id for update;
    if not found or c.admin_id <> auth.uid() then raise exception 'Only the club admin can do that'; end if;
    if p_user_id = c.admin_id then raise exception 'The admin can''t be removed'; end if;
    update public.clubs set member_ids = array_remove(member_ids, p_user_id) where id = p_club_id;
    update public.clubs set member_count = cardinality(member_ids) where id = p_club_id;
    update public.users set club_id = null where id = p_user_id and club_id = p_club_id;
end;
$$;

create or replace function public.ban_club_member(p_club_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare c public.clubs;
begin
    select * into c from public.clubs where id = p_club_id for update;
    if not found or c.admin_id <> auth.uid() then raise exception 'Only the club admin can do that'; end if;
    if p_user_id = c.admin_id then raise exception 'The admin can''t be banned'; end if;
    update public.clubs
       set member_ids = array_remove(member_ids, p_user_id),
           pending_member_ids = array_remove(pending_member_ids, p_user_id),
           banned_member_ids = case when p_user_id = any(banned_member_ids) then banned_member_ids
                                    else array_append(banned_member_ids, p_user_id) end
     where id = p_club_id;
    update public.clubs set member_count = cardinality(member_ids) where id = p_club_id;
    update public.users set club_id = null where id = p_user_id and club_id = p_club_id;
end;
$$;

-- ---------------------------------------------------------------------
-- PHOTO STORAGE (public bucket; each user writes only to their own folder)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('disc-images', 'disc-images', true)
on conflict (id) do nothing;
