/* ── FAQVault — faq.js ── */
(function () {
  'use strict';

  var DATA_URL = 'data/faqs.json';
  var detail   = document.getElementById('faqDetail');

  /* ── Parse slug from URL ── */
  var params = new URLSearchParams(window.location.search);
  var slug   = params.get('slug');

  if (!slug) {
    showNotFound();
    return;
  }

  /* ── Fetch data ── */
  fetch(DATA_URL)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load FAQ data');
      return res.json();
    })
    .then(function (data) {
      var item = data.find(function (d) { return d.slug === slug; });
      if (!item) { showNotFound(); return; }
      document.title = item.title + ' — FAQVault';
      document.querySelector('meta[name="description"]').setAttribute('content', item.title + ' — 5 sourced Q&As on FAQVault');
      renderDetail(item);
    })
    .catch(function () {
      detail.innerHTML = '<div class="not-found"><h2>Error</h2><p>Could not load FAQ data. <a href="index.html">Return home</a></p></div>';
    });

  /* ── Render detail ── */
  function renderDetail(item) {
    var date = formatDate(item.created_at);
    var accordionItems = item.faqs.map(function (faq, i) {
      var parts     = splitSource(faq.a);
      var answerTxt = escHtml(parts.answer);
      var sourceTxt = parts.source ? '<span class="source-line">🔗 ' + escHtml(parts.source) + '</span>' : '';
      return (
        '<div class="accordion-item" id="q' + (i + 1) + '">' +
          '<button class="accordion-btn" aria-expanded="false" aria-controls="body-' + i + '">' +
            '<span class="q-number">' + (i + 1) + '</span>' +
            '<span class="q-text">' + escHtml(faq.q) + '</span>' +
            '<svg class="accordion-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
              '<path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
            '</svg>' +
          '</button>' +
          '<div class="accordion-body" id="body-' + i + '" role="region">' +
            '<div class="accordion-body-inner">' +
              '<p class="answer-text">' + answerTxt + '</p>' +
              sourceTxt +
            '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    detail.innerHTML =
      '<div class="faq-detail-header">' +
        '<a href="index.html" class="back-link">' +
          '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
            '<path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
          '</svg>' +
          'All collections' +
        '</a>' +
        '<h1>' + escHtml(item.title) + '</h1>' +
        '<div class="detail-meta">' +
          '<span class="badge badge-' + escHtml(item.sub_topic) + '">' + escHtml(item.sub_topic) + '</span>' +
          '<span class="detail-date">' + date + '</span>' +
          '<button class="copy-link-btn" id="copyBtn">Copy link</button>' +
        '</div>' +
      '</div>' +
      '<div class="accordion" id="accordion">' + accordionItems + '</div>';

    bindAccordion();
    bindCopyLink();
  }

  /* ── Accordion logic ── */
  function bindAccordion() {
    var accordion = document.getElementById('accordion');
    accordion.addEventListener('click', function (e) {
      var btn = e.target.closest('.accordion-btn');
      if (!btn) return;
      var item   = btn.closest('.accordion-item');
      var isOpen = item.classList.contains('open');

      /* close all */
      accordion.querySelectorAll('.accordion-item').forEach(function (el) {
        el.classList.remove('open');
        el.querySelector('.accordion-btn').setAttribute('aria-expanded', 'false');
      });

      /* open clicked if it was closed */
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    /* Open first item by default */
    var first = accordion.querySelector('.accordion-item');
    if (first) {
      first.classList.add('open');
      first.querySelector('.accordion-btn').setAttribute('aria-expanded', 'true');
    }
  }

  /* ── Copy link ── */
  function bindCopyLink() {
    var btn = document.getElementById('copyBtn');
    btn.addEventListener('click', function () {
      navigator.clipboard.writeText(window.location.href).then(function () {
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = 'Copy link';
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  }

  /* ── Not found ── */
  function showNotFound() {
    detail.innerHTML =
      '<div class="not-found">' +
        '<h2>Collection not found</h2>' +
        '<p>This FAQ collection doesn\'t exist or may have been removed.</p>' +
        '<p><a href="index.html">← Back to all collections</a></p>' +
      '</div>';
  }

  /* ── Helpers ── */
  function splitSource(answerText) {
    var marker = '\n\nSource:';
    var idx    = answerText.indexOf(marker);
    if (idx === -1) return { answer: answerText, source: null };
    return {
      answer: answerText.slice(0, idx).trim(),
      source: 'Source:' + answerText.slice(idx + marker.length)
    };
  }

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
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
})();
