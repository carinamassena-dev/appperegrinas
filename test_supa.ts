import { createClient } from '@supabase/supabase-js';

const url = 'https://uqwrwwswkjyigiktpkjz.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxd3J3d3N3a2p5aWdpa3Rwa2p6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMzg5NTAsImV4cCI6MjA4NzcxNDk1MH0.dBY_23FH2_BHkkaIgo9H07DcsaVcuJRtiaXktYcg-Hs';

const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase.from('tickets').select('*').limit(1);
    if (error) {
        console.log("ERROR:" + error.message);
        return;
    }
    if (data && data.length > 0) {
        console.log("COLUMNS: " + Object.keys(data[0]).join(','));
    } else {
        console.log("No data returned");
    }
}

run().catch(console.error);
