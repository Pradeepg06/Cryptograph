import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://blwbxigovjdnmcgrpwol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsd2J4aWdvdmpkbm1jZ3Jwd29sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNDYwNDIsImV4cCI6MjA2MjYyMjA0Mn0.FCowEGTbDnihvkfICW5X_OjAUMZcKgXLUTH4Eudys5Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
