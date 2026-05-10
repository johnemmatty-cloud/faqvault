/* ── FAQVault — main.js ── */
(function () {
  'use strict';

  const DATA_URL   = 'data/faqs.json';
  const MAX_CARDS  = 10;
  const grid       = document.getElementById('cardsGrid');
  const filterBar  = document.getElementById('filterBar');

  let allFaqs      = [];
  let activeTopic  = 'All';

  /* ── Fetch data ── */
  fetch(DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load FAQ data');
      return res.json();
    })
    .then(function (data) {
      allFaqs = data;
      render();
    })
    .catch(function (err) {
      grid.innerHTML = '<div class="empty-state"><p>Could not load FAQ collections. Please try again later.</p></div>';
      console.error(err);
    });

  /* ── Filter buttons ── */
  filterBar.addEventListener('click', function (e) {
    var btn = e.target.closest('.filter-btn');
    if (!btn) return;
    activeTopic = btn.dataset.topic;
    filterBar.querySelectorAll('.filter-btn').forEach(function (b) {
      b.classList.toggle('active', b === btn);
    });
    render();
  });

  /* ── Render cards ── */
  function render() {
    var filtered = activeTopic === 'All'
      ? allFaqs
      : allFaqs.filter(function (item) { return item.sub_topic === activeTopic; });

    var visible = filtered.slice(0, MAX_CARDS);

    if (visible.length === 0) {
      grid.innerHTML = '<div class="empty-state"><p>No FAQ collections found for this topic yet.</p></div>';
      return;
    }

    grid.innerHTML = visible.map(cardHTML).join('');
  }

  /* ── Card HTML ── */
  function cardHTML(item) {
    var preview = item.faqs && item.faqs[0] ? escHtml(item.faqs[0].q) : '';
    var date    = formatDate(item.created_at);
    return (
      '<article class="faq-card">' +
        '<div class="card-header">' +
          '<h2><a href="faq.html?slug=' + encodeURIComponent(item.slug) + '">' + escHtml(item.title) + '</a></h2>' +
          '<span class="badge badge-' + escHtml(item.sub_topic) + '">' + escHtml(item.sub_topic) + '</span>' +
        '</div>' +
        '<p class="card-preview">' + preview + '</p>' +
        '<div class="card-meta">' +
          '<span class="card-date">' + date + '</span>' +
          '<a class="card-link" href="faq.html?slug=' + encodeURIComponent(item.slug) + '">Read 5 Q&amp;As →</a>' +
        '</div>' +
      '</article>'
    );
  }

  /* ── Helpers ── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
})();
