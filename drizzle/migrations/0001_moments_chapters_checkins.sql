CREATE TABLE public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  emojis text[] NOT NULL CHECK (cardinality(emojis) BETWEEN 1 AND 3),
  moment_date date NOT NULL DEFAULT CURRENT_DATE,
  body_text text CHECK (body_text IS NULL OR char_length(body_text) <= 1000),
  photo_path text, video_path text, audio_path text, video_poster_path text,
  audio_duration_seconds numeric,
  transcript text, audio_summary text,
  transcription_status text NOT NULL DEFAULT 'none' CHECK (transcription_status IN ('none','pending','done','failed'))
);
CREATE INDEX moments_user_date_idx ON public.moments (user_id, moment_date DESC, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.moments TO authenticated;
GRANT ALL ON public.moments TO service_role;
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own moments select" ON public.moments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own moments insert" ON public.moments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own moments delete" ON public.moments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.moments_no_future_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.moment_date > (now() AT TIME ZONE 'UTC')::date + 1 THEN
    RAISE EXCEPTION 'moment_date cannot be in the future';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER moments_no_future_date BEFORE INSERT ON public.moments
FOR EACH ROW EXECUTE FUNCTION public.moments_no_future_date();

CREATE TABLE public.chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  moment_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chapters TO authenticated;
GRANT ALL ON public.chapters TO service_role;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own chapters all" ON public.chapters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.checkin_settings (
  user_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  frequency text NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly','monthly','custom')),
  interval_days int CHECK (interval_days BETWEEN 1 AND 365),
  anchor_date date,
  last_sent_at timestamptz,
  CHECK (frequency <> 'custom' OR interval_days IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.checkin_settings TO authenticated;
GRANT ALL ON public.checkin_settings TO service_role;
ALTER TABLE public.checkin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkin select" ON public.checkin_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own checkin insert" ON public.checkin_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checkin update" ON public.checkin_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.checkin_settings (user_id) SELECT id FROM public.profiles ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, time_zone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'name', ''),
          COALESCE(NULLIF(NEW.raw_user_meta_data->>'time_zone', ''), 'UTC'))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.checkin_settings (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE POLICY "own media read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('moment-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own media insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('moment-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own media update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('moment-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own media delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('moment-media','avatars') AND (storage.foldername(name))[1] = auth.uid()::text);