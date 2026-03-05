UPDATE public.app_settings
SET value = 'en-US-Neural2-J',
    description = 'Primary Google Cloud TTS voice name',
    updated_at = now()
WHERE key = 'tts_primary_voice_id';

UPDATE public.app_settings
SET value = 'en-US-Wavenet-D',
    description = 'Fallback Google Cloud TTS voice name',
    updated_at = now()
WHERE key = 'tts_fallback_voice_id';

UPDATE public.app_settings
SET value = 'google',
    description = 'TTS voice provider (google)',
    updated_at = now()
WHERE key = 'voice_provider';