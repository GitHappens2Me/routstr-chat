const http = require('http');
const https = require('https');

const PORT = 8010;
const TARGET_HOST = 'llm.satsandsports.cash';
const API_KEY = 'sk-1d1690cab477d1c8ee9e8e56653744383a3c6bd7b38d092f3285228f3e4a5ae9';

const server = http.createServer((req, res) => {
  const url = `https://${TARGET_HOST}${req.url}`;
  
  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'Host': TARGET_HOST,
      'Authorization': `Bearer ${API_KEY}`
    }
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  req.pipe(proxyReq);

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end('Proxy error: ' + err.message);
  });
});

server.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
  console.log(`Forwarding to https://${TARGET_HOST}`);
});
