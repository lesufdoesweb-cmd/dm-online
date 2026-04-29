const fs = require('fs');
const path = require('path');

const sets = ['dm-01', 'dm-02', 'dm-03', 'dm-04', 'dm-05', 'dm-06'];

sets.forEach(s => {
    const p = path.join('public', 'cards', s, 'metadata.json');
    if (!fs.existsSync(p)) return;

    let text = fs.readFileSync(p, 'utf8');
    
    // Fix common encoding issues
    text = text.replace(/â€”/g, '—');
    text = text.replace(/Ãœ/g, 'Ü');
    text = text.replace(/Ã¤/g, 'ä');
    text = text.replace(/Ã¶/g, 'ö');
    text = text.replace(/Ã¼/g, 'ü');
    text = text.replace(/â€/g, '"'); // Smart quote start
    
    let d;
    try {
        d = JSON.parse(text);
    } catch (e) {
        console.error(`Failed to parse ${p}: ${e.message}`);
        return;
    }

    const ext = (s === 'dm-01') ? '.jpg' : '.webp';

    d.forEach(c => {
        if (c.name === 'adExplosive Dude Joe') {
            c.name = 'Explosive Dude Joe';
        }
        
        let n = c.name;
        
        // Normalize name for image file
        // Handle Überdragon Jabaha -> uberdragon-jabaha
        // Handle Thrash Crawler -> trash-crawler
        let imagePrefix = n;
        if (n.includes('Ü') || n.includes('Ãœ')) imagePrefix = n.replace(/[ÜÃœ]/g, 'U');
        if (n === 'Thrash Crawler') imagePrefix = 'Trash Crawler';

        c.image_file = imagePrefix.toLowerCase()
            .replace(/['’\u2018\u2019]/g, '')
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '') + ext;
        
        c.set_id = s;
    });

    fs.writeFileSync(p, JSON.stringify(d, null, 2));
});
