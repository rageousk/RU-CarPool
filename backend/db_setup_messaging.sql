-- Create conversations table
create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  demand_id uuid references ride_demands(id) not null,
  rider_id uuid references users(id) not null,
  driver_id uuid references users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(demand_id, rider_id, driver_id)
);

-- Create messages table
create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) not null,
  sender_id uuid references users(id) not null,
  content text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies (simplified for now, can be tightened later)
alter table conversations enable row level security;
alter table messages enable row level security;

-- Allow users to see conversations they are part of
create policy "Users can view their own conversations"
  on conversations for select
  using (auth.uid() = rider_id or auth.uid() = driver_id);

-- Allow users to insert conversations (usually triggered by backend, but good for testing)
create policy "Users can insert conversations"
  on conversations for insert
  with check (auth.uid() = rider_id or auth.uid() = driver_id);

-- Allow users to see messages in their conversations
create policy "Users can view messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and (conversations.rider_id = auth.uid() or conversations.driver_id = auth.uid())
    )
  );

-- Allow users to send messages to their conversations
create policy "Users can insert messages"
  on messages for insert
  with check (
    exists (
      select 1 from conversations
      where conversations.id = messages.conversation_id
      and (conversations.rider_id = auth.uid() or conversations.driver_id = auth.uid())
    )
  );
