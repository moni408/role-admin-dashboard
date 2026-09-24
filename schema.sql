CREATE TYPE user_role AS ENUM ('admin', 'judge', 'viewer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'viewer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;


CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT role INTO user_role_value FROM public.profiles WHERE id = auth.uid();
  RETURN user_role_value;
END;
$$;


CREATE OR REPLACE FUNCTION public.is_admin_or_judge()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'judge')
  );
END;
$$;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);


CREATE POLICY "Only admins can update roles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');


CREATE POLICY "Admins and judges view full applications"
ON public.applications FOR SELECT
TO authenticated
USING (public.is_admin_or_judge());


CREATE OR REPLACE VIEW public.applications_redacted
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  regexp_replace(email, '^(.{2}).*(@.*)$', '\1***\2') AS email,
  CASE
    WHEN phone IS NULL THEN NULL
    ELSE regexp_replace(phone, '^(\d{4}).*', '\1****')
  END AS phone,
  position,
  created_at
FROM public.applications
WHERE public.get_my_role() = 'viewer';


INSERT INTO public.applications (name, email, phone, position) VALUES
('Karim Ahmed', 'karim@example.com', '01711111111', 'Frontend Developer'),
('Rahim Khan', 'rahim@example.com', '01822222222', 'Backend Developer'),
('Sadia Islam', 'sadia@example.com', '01933333333', 'UI/UX Designer');

