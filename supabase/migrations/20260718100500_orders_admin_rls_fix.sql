-- Tabela `orders` już istnieje w bazie (powstała wcześniej poza tym repo),
-- więc NIE tworzymy jej tu ponownie — tylko dokładamy politykę RLS,
-- żeby zalogowany admin (has_role = 'admin') zawsze widział i mógł
-- edytować WSZYSTKIE zamówienia, niezależnie od tego, jakie polityki
-- już tam są (polityki RLS tego samego typu łączą się przez OR,
-- więc ta polityka nic nie psuje, tylko dokłada dostęp adminowi).

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders admin full access" ON public.orders;
CREATE POLICY "orders admin full access" ON public.orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Upewniamy się, że tabela w ogóle ma nadane GRANTy dla ról,
-- bo bez tego RLS i tak niczego nie pokaże.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT ON public.orders TO anon;
