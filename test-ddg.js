const q = 'nature';
fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36' }
})
.then(r => r.text())
.then(html => {
    const vqdMatch = html.match(/vqd="([^"]+)"/);
    if(!vqdMatch) return console.log('No vqd');
    const vqd = vqdMatch[1];
    return fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,,,&p=1`, {
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Referer': 'https://duckduckgo.com/'
        }
    }).then(r => r.text()).then(console.log);
});
