/* ==========================================================================
   4th Wall Experiential: site behaviour
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  /* ------------------------------------------------------------------
     Viewport width token: avoids the 100vw / scrollbar mismatch
     ------------------------------------------------------------------ */
  var vw = 0;
  function setVw() {
    vw = document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--vw', vw + 'px');
  }
  setVw();

  /* ------------------------------------------------------------------
     Header: shadow once scrolled
     ------------------------------------------------------------------ */
  var hdr = document.querySelector('.hdr');

  /* ------------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------------ */
  var burger = document.querySelector('.hdr__burger');
  var drawer = document.querySelector('.drawer');

  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drawer.classList.toggle('is-open', !open);
      document.body.style.overflow = !open ? 'hidden' : '';
    });

    drawer.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
        burger.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('is-open');
        document.body.style.overflow = '';
        burger.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     HERO: pinned viewport, track slides right-to-left with scroll
     Mirrors aon.com: intro panel + N full-bleed image panels on one
     horizontal track, driven by vertical scroll distance.
     ------------------------------------------------------------------ */
  var rail   = document.querySelector('.hero-rail');
  var track  = document.querySelector('.hero__track');
  var quick  = document.querySelector('.hero__quick');
  var heroEl = document.querySelector('.hero');
  var heroNav = document.querySelector('.hero__nav');
  var progressFill = document.querySelector('.hero__progress-fill');
  var thumbs = document.querySelectorAll('.hero__thumb');
  var panelMedia = document.querySelectorAll('.hero__panel-media img');
  var panels = document.querySelectorAll('.hero__panel');

  var heroActive = false;   // true only when the pinned layout is in play
  var maxX = 0;
  var stops = [0];          // track offset at which each slide owns the screen

  // How long each slide stays on screen. Every slide gets HERO_SCROLL_PER_SLIDE
  // viewports of scroll, and HERO_HOLD of that is spent parked on it, so a fast
  // flick of the wheel still leaves a slide framed rather than halfway between
  // two. Raise either number to slow the hero down further.
  var HERO_SCROLL_PER_SLIDE = 1.4;
  var HERO_HOLD = 0.42;

  // Scroll progress (0..1) -> slide position (0..steps) with a flat plateau at
  // every whole number. The first and last slides get a full plateau too.
  function heroPosition(p, steps) {
    var u = p * (steps + HERO_HOLD) - HERO_HOLD / 2;
    if (u <= 0) return 0;
    if (u >= steps) return steps;
    var k = Math.floor(u);
    var t = clamp((u - k - HERO_HOLD / 2) / (1 - HERO_HOLD), 0, 1);
    // Ease in and out, so the track pulls away from a slide and settles into the next.
    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    return k + t;
  }

  // The hero pins below the header, so progress runs from the moment the
  // rail's top reaches that line until its bottom leaves the pinned hero.
  function heroStickTop() { return parseFloat(getComputedStyle(heroEl).top) || 0; }
  function heroProgress() {
    var span = rail.offsetHeight - heroEl.offsetHeight;
    return span > 0 ? clamp((heroStickTop() - rail.getBoundingClientRect().top) / span, 0, 1) : 0;
  }

  // Clicking a thumbnail scrolls to the middle of that slide's parked stretch.
  thumbs.forEach(function (thumb, i) {
    thumb.addEventListener('click', function () {
      var steps = stops.length - 1;
      var p = (i + 1 + HERO_HOLD / 2) / (steps + HERO_HOLD);
      var railTop = rail.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: railTop - heroStickTop() + p * (rail.offsetHeight - heroEl.offsetHeight),
        behavior: reduceMotion ? 'auto' : 'smooth'
      });
    });
  });

  function heroLayout() {
    if (!rail || !track) return;

    heroActive = window.matchMedia('(min-width: 901px)').matches && !reduceMotion;
    rail.classList.toggle('is-pinned', heroActive);

    if (!heroActive) {
      rail.style.height = '';
      track.style.transform = '';
      if (quick) quick.style.transform = '';
      panelMedia.forEach(function (img) { img.style.transform = ''; });
      return;
    }

    // Total horizontal distance the track must travel.
    maxX = Math.max(0, track.scrollWidth - vw);

    // Where the track sits when each slide owns the screen: the intro at 0, then
    // each panel's left edge. Measured against the track's own box so the
    // current transform cancels out.
    var trackLeft = track.getBoundingClientRect().left;
    stops = [0];
    panels.forEach(function (panel) {
      stops.push(Math.min(panel.getBoundingClientRect().left - trackLeft, maxX));
    });

    var steps = Math.max(1, stops.length - 1);
    rail.style.height = (heroEl.offsetHeight + window.innerHeight * (steps + HERO_HOLD) * HERO_SCROLL_PER_SLIDE) + 'px';

    heroScroll();
  }

  function heroScroll() {
    if (!heroActive || !rail || !track) return;

    var p = heroProgress();

    var steps = stops.length - 1;
    var pos = steps > 0 ? heroPosition(p, steps) : 0;
    var k = Math.min(Math.floor(pos), Math.max(0, steps - 1));
    var x = steps > 0 ? -(stops[k] + (stops[k + 1] - stops[k]) * (pos - k)) : 0;

    track.style.transform = 'translate3d(' + x + 'px,0,0)';
    if (quick) quick.style.transform = 'translate3d(' + x + 'px,0,0)';

    // The navigator only belongs to the slides: hidden on the intro, it
    // arrives with Activations and leaves again if you scroll back up.
    if (heroNav) heroNav.classList.toggle('is-visible', pos > 0.5);

    // The line tracks raw scroll rather than eased slide position, so it keeps
    // moving while a slide is parked and the page never looks frozen. It
    // spans the four slides: full to the end of a thumbnail when that slide
    // is centred.
    if (progressFill && steps > 0) {
      var raw = p * (steps + HERO_HOLD) - HERO_HOLD / 2;
      progressFill.style.transform = 'scaleX(' + clamp(raw / steps, 0, 1) + ')';
    }

    panels.forEach(function (panel) {
      var r = panel.getBoundingClientRect();

      // A panel is "active" once it substantially owns the viewport. That is
      // when its copy animates in.
      panel.classList.toggle('is-active', r.left < vw * 0.45 && r.right > vw * 0.58);

      // Counter-parallax on the photo, so the image drifts slower than the
      // panel itself, the same feel as Aon's background offset.
      var img = panel.querySelector('.hero__panel-media img');
      if (img) {
        var centre = (r.left + r.width / 2 - vw / 2) / vw;   // -1 .. 1 ish
        img.style.transform = 'scale(1.08) translate3d(' + (centre * -42) + 'px,0,0)';
      }
    });

    // Highlight the thumbnail for the slide on screen (none on the intro).
    var current = Math.round(pos) - 1;
    thumbs.forEach(function (t, i) {
      t.classList.toggle('is-on', i === current);
      if (i === current) t.setAttribute('aria-current', 'true');
      else t.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------------
     Watermark drift: big outlined section labels ease across on scroll
     ------------------------------------------------------------------ */
  var drifters = document.querySelectorAll('[data-drift]');

  function driftScroll() {
    if (reduceMotion) return;
    drifters.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      // progress of the element across the viewport, 0 (entering) → 1 (leaving)
      var p = 1 - (r.top + r.height) / (window.innerHeight + r.height);
      var dir = el.getAttribute('data-drift') === 'rtl' ? -1 : 1;
      var range = Math.max(0, el.scrollWidth - el.clientWidth) || 160;
      el.style.transform = 'translate3d(' + (dir * p * Math.min(range, 260)) + 'px,0,0)';
    });
  }

  /* ------------------------------------------------------------------
     Single scroll listener, rAF-throttled
     ------------------------------------------------------------------ */
  // Stagger items still waiting to be revealed. Emptied as they come in, so
  // the scroll handler stops doing any work once everything is visible. This
  // is a safety net behind the observer below: it only catches items already
  // well inside the viewport (or scrolled past), so it never beats the
  // observer to the punch in normal use.
  var pendingStagger = [];
  function sweepStaggerGroups() {
    if (!pendingStagger.length) return;
    var vh = window.innerHeight;
    pendingStagger = pendingStagger.filter(function (el) {
      if (el.classList.contains('is-in') || el._staggerQueued) return false;
      if (el.getBoundingClientRect().top < vh * 0.8) { showStaggered(el); return false; }
      return true;
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      if (hdr) hdr.classList.toggle('is-stuck', window.scrollY > 8);
      heroScroll();
      driftScroll();
      sweepStaggerGroups();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setVw();
      heroLayout();
      driftScroll();
    }, 120);
  });

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  // Children of a [data-stagger] container come in one at a time, as each
  // one scrolls into view. Every card is observed on its own, so it animates
  // when *it* arrives rather than when the top of its grid does. Cards that
  // arrive together (a whole row) are queued so they still land one after
  // another. data-stagger="200" sets the gap between them in ms.
  var staggerItems = [];
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    var gap = parseInt(group.getAttribute('data-stagger'), 10) || 150;
    Array.prototype.forEach.call(group.children, function (child) {
      child._staggerGap = gap;
      staggerItems.push(child);
    });
  });

  var staggerClock = 0;   // earliest moment the next queued card may start
  function showStaggered(el) {
    if (el.classList.contains('is-in') || el._staggerQueued) return;
    el._staggerQueued = true;
    var now = performance.now();
    var at = Math.max(now, staggerClock);
    staggerClock = at + el._staggerGap;
    setTimeout(function () { el.classList.add('is-in'); }, at - now);
  }

  if ('IntersectionObserver' in window && !reduceMotion) {
    var staggerIO = new IntersectionObserver(function (entries) {
      entries
        .filter(function (e) { return e.isIntersecting; })
        .map(function (e) { return e.target; })
        .sort(function (a, b) {
          return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        })
        .forEach(function (el) { showStaggered(el); staggerIO.unobserve(el); });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.2 });
    staggerItems.forEach(function (el) { staggerIO.observe(el); });
    pendingStagger = staggerItems.slice();

    // Safety net. The cards sit hidden until revealed, so a callback that never
    // arrives would leave a blank section. The scroll listener runs this too.
    window.addEventListener('load', sweepStaggerGroups);
  } else {
    staggerItems.forEach(function (el) { el.classList.add('is-in'); });
  }

  var revealables = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------------------------
     Portfolio filters
     ------------------------------------------------------------------ */
  var filterBar = document.querySelector('.filters');
  if (filterBar) {
    // Cards carry a space-separated data-cat, so a single piece of work can sit
    // under more than one filter (e.g. exhibitions *and* conferencing).
    var works = document.querySelectorAll('.case-card');

    function applyFilter(cat) {
      filterBar.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === cat));
      });

      var shown = 0;
      works.forEach(function (w) {
        var cats = (w.getAttribute('data-cat') || '').split(/\s+/);
        var match = cat === 'all' || cats.indexOf(cat) !== -1;
        w.classList.toggle('is-hidden', !match);
        if (match) shown++;
      });

      var empty = document.querySelector('[data-filter-empty]');
      if (empty) empty.hidden = shown > 0;
    }

    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      applyFilter(btn.getAttribute('data-filter'));
    });

    // A footer link like portfolio.html#work-business must not land on a card
    // that a stale filter is hiding, so always open on "All Work".
    applyFilter('all');
  }

  /* ------------------------------------------------------------------
     Deep links from the footer (portfolio.html#work-business,
     about.html#full-service-list). The browser's own fragment jump fires
     before the images below the fold have sized themselves, so it lands
     short. Redo it on load, once the page has settled.
     ------------------------------------------------------------------ */
  function jumpToHash() {
    if (!window.location.hash) return;
    var target;
    try { target = document.querySelector(window.location.hash); }
    catch (e) { return; }
    if (!target) return;

    // Reveal animations move elements with translateY, which shifts the
    // measured box. Snap everything above the target (and the target itself)
    // to its final position first, or we scroll to where the card *was*
    // mid-animation and land 46px high. Reveals below the target still play.
    document.documentElement.classList.add('is-jumping');
    document.querySelectorAll('[data-reveal], [data-stagger] > *').forEach(function (el) {
      var isBefore = !!(el.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING);
      if (isBefore || el === target || target.contains(el) || el.contains(target)) {
        el.classList.add('is-in');
        el._staggerQueued = true;
      }
    });

    requestAnimationFrame(function () {
      target.scrollIntoView({ block: 'start', behavior: 'instant' });
      requestAnimationFrame(function () {
        document.documentElement.classList.remove('is-jumping');
      });
    });
  }
  window.addEventListener('load', jumpToHash);

  /* ------------------------------------------------------------------
     Contact form: client-side validation only.
     No endpoint is wired up: point `action` at your handler (Formspree,
     Netlify Forms, a PHP mailer, etc.) to actually deliver messages.
     ------------------------------------------------------------------ */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('.form__status');

    var setError = function (field, msg) {
      field.classList.toggle('has-error', !!msg);
      var slot = field.querySelector('.field__err');
      if (slot) slot.textContent = msg || '';
      var input = field.querySelector('input, select, textarea');
      if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;

      form.querySelectorAll('.field').forEach(function (field) {
        var input = field.querySelector('input, select, textarea');
        if (!input || !input.required) return;

        var val = (input.value || '').trim();
        if (!val) {
          setError(field, 'This field is required.');
          ok = false;
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
          setError(field, 'Enter a valid email address.');
          ok = false;
        } else {
          setError(field, '');
        }
      });

      if (!status) return;

      if (!ok) {
        status.textContent = 'Please correct the highlighted fields.';
        status.className = 'form__status is-err';
        var firstBad = form.querySelector('.has-error input, .has-error select, .has-error textarea');
        if (firstBad) firstBad.focus();
        return;
      }

      status.textContent = 'Thanks. Your message is ready to send. Connect a form endpoint to deliver it.';
      status.className = 'form__status is-ok';
    });
  }

  /* ------------------------------------------------------------------
     Footer subscribe
     ------------------------------------------------------------------ */
  var subform = document.querySelector('[data-subscribe]');
  if (subform) {
    var note = subform.querySelector('.subform__note');
    var noteDefault = note ? note.textContent : '';
    subform.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = subform.querySelector('input[type="email"]');
      var val = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
        note.textContent = 'Enter a valid email address.';
        note.className = 'subform__note is-err';
        input.focus();
        return;
      }
      note.textContent = 'Thanks. Connect a mailing-list endpoint to complete signup.';
      note.className = 'subform__note is-ok';
      input.value = '';
      setTimeout(function () {
        note.textContent = noteDefault;
        note.className = 'subform__note';
      }, 6000);
    });
  }

  /* ------------------------------------------------------------------
     Back to top
     ------------------------------------------------------------------ */
  var toTop = document.querySelector('[data-to-top]');
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ------------------------------------------------------------------
     Recap video card. The poster is a button, so nothing downloads until
     someone asks for it; clicking swaps in the real player in the same
     spot and starts it.
     ------------------------------------------------------------------ */
  document.querySelectorAll('.vidcard[data-video]').forEach(function (vidcard) {
    vidcard.addEventListener('click', function () {
      var video = document.createElement('video');
      video.className = 'vidcard vidcard--playing';
      video.src = vidcard.getAttribute('data-video');
      video.poster = vidcard.querySelector('img').getAttribute('src');
      video.controls = true;
      video.playsInline = true;
      video.setAttribute('aria-label', vidcard.getAttribute('aria-label').replace(/^Play /, ''));
      vidcard.replaceWith(video);
      var started = video.play();
      if (started && started.catch) started.catch(function () {});
      video.focus();
    });
  });

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  heroLayout();
  onScroll();
  window.addEventListener('load', function () { setVw(); heroLayout(); });
})();
