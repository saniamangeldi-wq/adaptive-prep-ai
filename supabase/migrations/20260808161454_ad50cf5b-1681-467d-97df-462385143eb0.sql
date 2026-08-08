ALTER TABLE public.profiles DISABLE TRIGGER prevent_profile_role_change;
UPDATE public.profiles SET role = 'school_admin' WHERE email = 'sani.amangeldi@gmail.com';
ALTER TABLE public.profiles ENABLE TRIGGER prevent_profile_role_change;