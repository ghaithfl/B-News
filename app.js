document.addEventListener('DOMContentLoaded', () => {
  const activityFilter = document.getElementById('activityFilter');
  const industryFilter = document.getElementById('industryFilter');
  const marketFilter = document.getElementById('marketFilter');
  const cardsContainer = document.getElementById('cards');
  let bookmarks = [];

  // Fetch bookmarks; fallback to localStorage when API is unavailable
  function loadBookmarks() {
    fetch('/api/bookmarks')
      .then(res => {
        if (!res.ok) throw new Error('No bookmarks API');
        return res.json();
      })
      .then(data => {
        bookmarks = data || [];
        loadArticles();
      })
      .catch(() => {
        // Use bookmarks from localStorage if present
        try {
          const stored = localStorage.getItem('bookmarks');
          bookmarks = stored ? JSON.parse(stored) : [];
        } catch (e) {
          bookmarks = [];
        }
        loadArticles();
      });
  }

  // Populate filter options based on the list of articles
  function populateFilters(articles) {
    const activities = new Set();
    const industries = new Set();
    const markets = new Set();
    articles.forEach(article => {
      if (article.activity) activities.add(article.activity);
      if (article.industry) industries.add(article.industry);
      if (article.market) markets.add(article.market);
    });
    // Clear and repopulate
    function populateSelect(selectElem, values) {
      // Remove existing except first (All)
      while (selectElem.options.length > 1) {
        selectElem.remove(1);
      }
      Array.from(values).sort().forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        selectElem.appendChild(option);
      });
    }
    populateSelect(activityFilter, activities);
    populateSelect(industryFilter, industries);
    populateSelect(marketFilter, markets);
  }

  // Load articles with current filters
  function loadArticles() {
    const params = new URLSearchParams();
    if (activityFilter.value) params.append('activity', activityFilter.value);
    if (industryFilter.value) params.append('industry', industryFilter.value);
    if (marketFilter.value) params.append('market', marketFilter.value);
    // Try API first
    fetch('/api/articles?' + params.toString())
      .then(res => {
        if (!res.ok) throw new Error('No articles API');
        return res.json();
      })
      .then(articles => {
        if (!activityFilter.value && !industryFilter.value && !marketFilter.value) {
          populateFilters(articles);
        }
        renderCards(articles);
      })
      .catch(() => {
        // Fallback to local JSON file
        // Fallback to a static JSON file located in static/data. Using
        // '/static/data/news.json' ensures the file is served correctly when
        // deployed as a static site on Vercel.
        fetch('/static/data/news.json')
          .then(res => res.json())
          .then(allArticles => {
            // Filter manually based on params
            let filtered = allArticles;
            const act = activityFilter.value;
            const ind = industryFilter.value;
            const mar = marketFilter.value;
            if (act) filtered = filtered.filter(a => a.activity && a.activity.toLowerCase() === act.toLowerCase());
            if (ind) filtered = filtered.filter(a => a.industry && a.industry.toLowerCase() === ind.toLowerCase());
            if (mar) filtered = filtered.filter(a => a.market && a.market.toLowerCase() === mar.toLowerCase());
            if (!act && !ind && !mar) {
              populateFilters(allArticles);
            }
            renderCards(filtered);
          })
          .catch(() => {
            // On failure show no articles
            renderCards([]);
          });
      });
  }

  // Render article cards
  function renderCards(articles) {
    cardsContainer.innerHTML = '';
    if (!articles.length) {
      cardsContainer.textContent = 'No articles found.';
      return;
    }
    articles.forEach(article => {
      const card = document.createElement('div');
      card.className = 'card';
      // Make the whole card clickable to open the article link
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        if (article.url) {
          window.open(article.url, '_blank');
        }
      });
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
      // Tags container
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'tags';
      (article.tags || []).forEach(tag => {
        const span = document.createElement('span');
        span.className = 'tag';
        span.textContent = tag;
        tagsDiv.appendChild(span);
      });
      footer.appendChild(tagsDiv);
      // Bookmark button
      const bookmarkBtn = document.createElement('button');
      bookmarkBtn.className = 'bookmark-btn';
      bookmarkBtn.innerHTML = bookmarks.includes(article.id) ? '★' : '☆';
      if (bookmarks.includes(article.id)) bookmarkBtn.classList.add('bookmarked');
      bookmarkBtn.addEventListener('click', () => toggleBookmark(article.id, bookmarkBtn));
      footer.appendChild(bookmarkBtn);
      content.appendChild(footer);
      card.appendChild(content);
      cardsContainer.appendChild(card);
    });
  }

  // Toggle bookmark; if API fails, fall back to localStorage
  function toggleBookmark(id, button) {
    fetch('/api/bookmarks/' + id, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error('No bookmark API');
        return res.json();
      })
      .then(data => {
        bookmarks = data;
        updateBookmarkButton(id, button);
      })
      .catch(() => {
        // toggle in local array and persist to localStorage
        if (bookmarks.includes(id)) {
          bookmarks = bookmarks.filter(b => b !== id);
        } else {
          bookmarks.push(id);
        }
        try {
          localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        } catch (e) {
          // ignore storage errors
        }
        updateBookmarkButton(id, button);
      });
  }

  // Update bookmark button appearance based on current bookmarks
  function updateBookmarkButton(id, button) {
    if (bookmarks.includes(id)) {
      button.textContent = '★';
      button.classList.add('bookmarked');
    } else {
      button.textContent = '☆';
      button.classList.remove('bookmarked');
    }
  }

  // Event listeners for filters
  [activityFilter, industryFilter, marketFilter].forEach(select => {
    select.addEventListener('change', () => {
      loadArticles();
    });
  });

  loadBookmarks();
});