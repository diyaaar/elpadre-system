const q = "arnavutluk";
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
};

fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, { headers })
  .then(res => res.text())
  .then(html => {
    const match = html.match(/vqd="([^"]+)"/);
    console.log("vqd match:", match ? match[1] : null);
    
    // Check if it's there in another format
    if (!match) {
        const altMatch = html.match(/vqd[=:'"]+([^"'\s&]+)/i);
        console.log("alt match:", altMatch ? altMatch[1] : null);
        require('fs').writeFileSync('ddg-out.html', html);
    }
  });
