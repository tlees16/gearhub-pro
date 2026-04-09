import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lzkdewuwrshiqjjndszx.supabase.co'
// Using service role key for now — switch to anon key when RLS is configured
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6a2Rld3V3cnNoaXFqam5kc3p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTYxNDk1MywiZXhwIjoyMDkxMTkwOTUzfQ.ZKwzCTeJ66gyYZVifjy-wuxk8unk3BnSeQ4YcHcXRD0'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
