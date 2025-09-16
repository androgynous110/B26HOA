import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  const { data, error } = await supabase.from('users').select('count(*)');

  if (error) {
    console.error('❌ Supabase ping failed:', error.message);
    process.exit(1); // Fail the GitHub Action
  }

  console.log(`✅ Supabase ping successful. User count: ${data[0].count}`);
})();