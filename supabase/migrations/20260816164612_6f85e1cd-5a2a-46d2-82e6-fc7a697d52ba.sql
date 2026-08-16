
ALTER TABLE public.profiles DISABLE TRIGGER USER;
UPDATE public.profiles
SET role = 'tutor',
    tier = 'tier_3',
    is_trial = false,
    trial_ends_at = NULL,
    credits_remaining = 200,
    tests_remaining = 999999,
    questions_used_today = 0
WHERE email = 'aitkaliazhar07@gmail.com';
ALTER TABLE public.profiles ENABLE TRIGGER USER;

INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'tutor'::user_role FROM public.profiles WHERE email = 'aitkaliazhar07@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
