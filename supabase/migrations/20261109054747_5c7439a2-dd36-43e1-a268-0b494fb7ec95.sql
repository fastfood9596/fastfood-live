GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories, public.menu_items, public.orders TO anon, authenticated;
GRANT ALL ON public.categories, public.menu_items, public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orders_order_number_seq TO anon, authenticated, service_role;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS icon text NOT NULL DEFAULT 'utensils',
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS image_url text;

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
ALTER TABLE public.menu_items
  ADD CONSTRAINT menu_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'counter',
  ADD COLUMN IF NOT EXISTS payment jsonb NOT NULL DEFAULT '{"method":"cash","status":"pending"}'::jsonb,
  ADD COLUMN IF NOT EXISTS notes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kitchen_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='categories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='menu_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;

CREATE POLICY "Anyone can upload menu photos" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'menu-photos');

-- Starter menu (same dishes the app showed before)
INSERT INTO public.categories (id, name, sort_order, icon, image_url) VALUES
  ('11111111-0000-4000-8000-000000000001', 'Burgers', 1, 'burger', 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/classic-smash.jpg'),
  ('11111111-0000-4000-8000-000000000002', 'Chicken', 2, 'chicken', 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/wings.jpg'),
  ('11111111-0000-4000-8000-000000000003', 'Sides', 3, 'fries', 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/fries.jpg'),
  ('11111111-0000-4000-8000-000000000004', 'Drinks', 4, 'soda', 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/lemonade.jpg'),
  ('11111111-0000-4000-8000-000000000005', 'Desserts', 5, 'icecream', 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/choco-sundae.jpg');

INSERT INTO public.menu_items (category_id, name, price, is_available, image_url) VALUES
  ('11111111-0000-4000-8000-000000000001', 'Classic Smash', 650, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/classic-smash.jpg'),
  ('11111111-0000-4000-8000-000000000001', 'Double Cheese', 850, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/double-cheese.jpg'),
  ('11111111-0000-4000-8000-000000000001', 'Bacon BBQ', 900, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/bacon-bbq.jpg'),
  ('11111111-0000-4000-8000-000000000001', 'Veggie Stack', 700, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/veggie-stack.jpg'),
  ('11111111-0000-4000-8000-000000000002', 'Crispy Tenders', 600, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/crispy-tenders.jpg'),
  ('11111111-0000-4000-8000-000000000002', 'Spicy Sandwich', 750, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/spicy-sandwich.jpg'),
  ('11111111-0000-4000-8000-000000000002', 'Wings (8 pc)', 900, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/wings.jpg'),
  ('11111111-0000-4000-8000-000000000003', 'Fries', 250, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/fries.jpg'),
  ('11111111-0000-4000-8000-000000000003', 'Onion Rings', 300, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/onion-rings.jpg'),
  ('11111111-0000-4000-8000-000000000003', 'Loaded Fries', 450, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/loaded-fries.jpg'),
  ('11111111-0000-4000-8000-000000000003', 'Side Salad', 300, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/side-salad.jpg'),
  ('11111111-0000-4000-8000-000000000004', 'Cola', 120, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/cola.jpg'),
  ('11111111-0000-4000-8000-000000000004', 'Lemonade', 200, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/lemonade.jpg'),
  ('11111111-0000-4000-8000-000000000004', 'Iced Coffee', 300, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/iced-coffee.jpg'),
  ('11111111-0000-4000-8000-000000000005', 'Vanilla Shake', 400, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/vanilla-shake.jpg'),
  ('11111111-0000-4000-8000-000000000005', 'Choco Sundae', 350, true, 'https://aktozixmpqlvvucoaxqn.supabase.co/storage/v1/object/public/menu-photos/starter/choco-sundae.jpg');