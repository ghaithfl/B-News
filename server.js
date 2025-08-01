const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

/*
 * Simple API‑first server for the Branding News web app.
 *
 * This server exposes JSON endpoints for articles, bookmarks and feeds.
 * It reads and writes data from local JSON files in the data folder.
 * CORS headers are added to allow the front‑end to call these APIs from
 * another port or domain. If you decide to deploy this to a real host,
 * you should tighten the CORS settings or use a proper framework.
 */

const DATA_DIR = path.join(__dirname, 'data');
const ARTICLES_FILE = path.join(DATA_DIR, 'news.json');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');
const FEEDS_FILE = path.join(DATA_DIR, 'feeds.json');

function readJsonFile(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${file}`, err);
    return [];
  }
}

function writeJsonFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function filterArticles(articles, query) {
  let results = articles;
  if (query.activity) {
    results = results.filter(item => item.activity.toLowerCase() === query.activity.toLowerCase());
  }
  if (query.industry) {
    results = results.filter(item => item.industry.toLowerCase() === query.industry.toLowerCase());
  }
  if (query.market) {
    results = results.filter(item => item.market.toLowerCase() === query.market.toLowerCase());
  }
  return results;
}

// Helper to send JSON response
function sendJson(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(json);
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  if (req.method === 'OPTIONS') {
    // Preflight for CORS
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }
  // API: GET articles with optional filters
  if (req.method === 'GET' && pathname === '/api/articles') {
    const articles = readJsonFile(ARTICLES_FILE);
    const filtered = filterArticles(articles, parsedUrl.query);
    return sendJson(res, 200, filtered);
  }
  // API: GET single article by ID
  if (req.method === 'GET' && pathname.startsWith('/api/articles/')) {
    const idStr = pathname.split('/').pop();
    const id = parseInt(idStr, 10);
    const articles = readJsonFile(ARTICLES_FILE);
    const article = articles.find(item => item.id === id);
    if (article) {
      return sendJson(res, 200, article);
    }
    return sendJson(res, 404, { error: 'Not found' });
  }
  // API: GET bookmarks
  if (req.method === 'GET' && pathname === '/api/bookmarks') {
    const bookmarks = readJsonFile(BOOKMARKS_FILE);
    return sendJson(res, 200, bookmarks);
  }
  // API: Toggle bookmark by article ID (POST)
  if (req.method === 'POST' && pathname.startsWith('/api/bookmarks/')) {
    const idStr = pathname.split('/').pop();
    const id = parseInt(idStr, 10);
    const articles = readJsonFile(ARTICLES_FILE);
    const articleExists = articles.some(item => item.id === id);
    if (!articleExists) {
      return sendJson(res, 404, { error: 'Article not found' });
    }
    let bookmarks = readJsonFile(BOOKMARKS_FILE);
    if (bookmarks.includes(id)) {
      // remove
      bookmarks = bookmarks.filter(item => item !== id);
    } else {
      bookmarks.push(id);
    }
    writeJsonFile(BOOKMARKS_FILE, bookmarks);
    return sendJson(res, 200, bookmarks);
  }
  // API: GET feeds
  if (req.method === 'GET' && pathname === '/api/feeds') {
    const feeds = readJsonFile(FEEDS_FILE);
    return sendJson(res, 200, feeds);
  }
  // API: POST feeds (add new feed). Body: { name, url, activity, industry, market }
  if (req.method === 'POST' && pathname === '/api/feeds') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        if (!data.name || !data.url) {
          return sendJson(res, 400, { error: 'Invalid feed data' });
        }
        const feeds = readJsonFile(FEEDS_FILE);
        const newId = feeds.length ? Math.max(...feeds.map(f => f.id)) + 1 : 1;
        const newFeed = {
          id: newId,
          name: data.name,
          url: data.url,
          activity: data.activity || '',
          industry: data.industry || '',
          market: data.market || ''
        };
        feeds.push(newFeed);
        writeJsonFile(FEEDS_FILE, feeds);
        return sendJson(res, 201, newFeed);
      } catch (err) {
        return sendJson(res, 400, { error: 'Invalid JSON' });
      }
    });
    return;
  }
  // API: DELETE feed
  if (req.method === 'DELETE' && pathname.startsWith('/api/feeds/')) {
    const idStr = pathname.split('/').pop();
    const id = parseInt(idStr, 10);
    let feeds = readJsonFile(FEEDS_FILE);
    const index = feeds.findIndex(f => f.id === id);
    if (index === -1) {
      return sendJson(res, 404, { error: 'Feed not found' });
    }
    feeds.splice(index, 1);
    writeJsonFile(FEEDS_FILE, feeds);
    return sendJson(res, 200, { success: true });
  }
  // Serve static files from the public directory
  const filePath = path.join(__dirname, pathname === '/' ? '/index.html' : pathname);
  const ext = path.extname(filePath);
  // Allowed static file extensions
  const allowedExts = ['.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg'];
  if (allowedExts.includes(ext)) {
    const staticPath = path.join(__dirname, filePath);
    if (fs.existsSync(staticPath)) {
      const fileStream = fs.createReadStream(staticPath);
      let contentType = 'text/plain';
      if (ext === '.html') contentType = 'text/html';
      if (ext === '.css') contentType = 'text/css';
      if (ext === '.js') contentType = 'application/javascript';
      if (['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
        contentType = 'image/' + ext.replace('.', '');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      return fileStream.pipe(res);
    }
  }
  // Not found
  sendJson(res, 404, { error: 'Not found' });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Branding News API server running at http://localhost:${PORT}`);
});