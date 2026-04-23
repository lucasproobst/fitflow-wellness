CREATE TABLE IF NOT EXISTS public.kiwify_processed_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  event text,
  user_id uuid,
  is_pro_after boolean,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiwify_processed_orders_unique UNIQUE (order_id, event)
);

CREATE INDEX IF NOT EXISTS idx_kiwify_processed_orders_order_id
  ON public.kiwify_processed_orders (order_id);

CREATE INDEX IF NOT EXISTS idx_kiwify_processed_orders_user_id
  ON public.kiwify_processed_orders (user_id);

ALTER TABLE public.kiwify_processed_orders ENABLE ROW LEVEL SECURITY;

-- Bloqueia qualquer acesso de usuários comuns; apenas service role (webhook) consegue operar.
CREATE POLICY "No client access to processed orders"
  ON public.kiwify_processed_orders
  FOR ALL
  USING (false)
  WITH CHECK (false);