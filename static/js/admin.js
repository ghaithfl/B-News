document.addEventListener('DOMContentLoaded', () => {
  const feedTableBody = document.querySelector('#feedTable tbody');
  const addFeedForm = document.getElementById('addFeedForm');

  function loadFeeds() {
    fetch('/api/feeds')
      .then(res => res.json())
      .then(feeds => {
        renderFeeds(feeds);
      });
  }

  function renderFeeds(feeds) {
    feedTableBody.innerHTML = '';
    feeds.forEach(feed => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${feed.name}</td>
        <td><a href="${feed.url}" target="_blank">${feed.url}</a></td>
        <td>${feed.activity || ''}</td>
        <td>${feed.industry || ''}</td>
        <td>${feed.market || ''}</td>
        <td><button class="delete-btn" data-id="${feed.id}">Delete</button></td>
      `;
      feedTableBody.appendChild(tr);
    });
    // Attach delete handlers
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteFeed(id);
      });
    });
  }

  function deleteFeed(id) {
    fetch('/api/feeds/' + id, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        loadFeeds();
      });
  }

  addFeedForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = document.getElementById('feedName').value.trim();
    const url = document.getElementById('feedUrl').value.trim();
    const activity = document.getElementById('feedActivity').value.trim();
    const industry = document.getElementById('feedIndustry').value.trim();
    const market = document.getElementById('feedMarket').value.trim();
    const data = { name, url, activity, industry, market };
    fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(() => {
        addFeedForm.reset();
        loadFeeds();
      });
  });

  loadFeeds();
});
