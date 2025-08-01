document.addEventListener('DOMContentLoaded', () => {
  const cardsContainer = document.getElementById('cards');
  let bookmarks = [];

  function loadBookmarks() {
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(data => {
        bookmarks = data || [];
        loadArticles();
      });
  }

  function loadArticles() {
    fetch('/api/articles')
      .then(res => res.json())
      .then(articles => {
        const filtered = articles.filter(a => bookmarks.includes(a.id));
        renderCards(filtered);
      });
  }

  function renderCards(articles) {
    cardsContainer.innerHTML = '';
    if (!articles.length) {
      cardsContainer.textContent = 'No bookmarks yet.';
      return;
    }
    articles.forEach(article => {
      const card = document.createElement('div');
      card.className = 'card';
      const img = document.createElement('img');
      img.src = article.image;
      img.alt = article.title;
      card.appendChild(img);
      const content = document.createElement('div');
      content.className = 'card-content';
      const title = document.createElement('h3');
      title.textContent = article.title;
      content.appendChild(title);
      const desc = document.createElement('p');
      desc.textContent = article.description;
      content.appendChild(desc);
      const footer = document.createElement('div');
      footer.className = 'card-footer';
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'tags';
      (article.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagsDiv.appendChild(span);
      });
      footer.appendChild(tagsDiv);
      // Remove bookmark button
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'bookmark-btn';
      bookmarkBtn.textContent = '★';
      bookmarkBtn.addEventListener('click', () => toggleBookmark(article.id));
      footer.appendChild(bookmarkBtn);
      content.appendChild(footer);
      card.appendChild(content);
      cardsContainer.appendChild(card);
    });
  }

  function toggleBookmark(id) {
    fetch('/api/bookmarks/' + id, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        bookmarks = data;
        loadArticles();
      });
  }

  loadBookmarks();
});
