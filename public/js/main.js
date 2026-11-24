/* Ember Crema — interactions (no dependencies) */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Loader ---------- */
  document.body.classList.add('is-loading');
  const loader = $('.loader');
  const finishLoad = () => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
  };
  const minTime = new Promise(r => setTimeout(r, reduced ? 0 : 1300));
  const heroReady = new Promise(r => {
    const v = $('.hero-video');
    if (!v || v.readyState >= 2) return r();
    v.addEventListener('loadeddata', r, { once: true });
    setTimeout(r, 3500); // never block on slow networks
  });
  Promise.all([minTime, heroReady]).then(finishLoad);

  /* ---------- Nav ---------- */
  const nav = $('[data-nav]');
  const toggle = $('.nav-toggle');
  const mobile = $('#mobile-menu');
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    mobile.hidden = open;
  });
  $$('#mobile-menu a').forEach(a => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false'); mobile.hidden = true;
  }));

  /* ---------- Opening hours: live status + today row ---------- */
  // [open, close] in 24h decimal, indexed by JS day (0 = Sunday)
  const HOURS = { 0: [8, 22], 1: [7, 22], 2: [7, 22], 3: [7, 22], 4: [7, 22], 5: [7, 23], 6: [8, 23] };
  const fmt = h => {
    const hr = Math.floor(h), m = Math.round((h - hr) * 60);
    const ap = hr >= 12 ? 'pm' : 'am'; const h12 = ((hr + 11) % 12) + 1;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
  };
  const updateStatus = () => {
    // Use India time regardless of visitor's timezone
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const d = now.getDay(), t = now.getHours() + now.getMinutes() / 60;
    const [o, c] = HOURS[d];
    const el = $('[data-status]');
    el.classList.remove('is-open', 'is-closed');
    let text;
    if (t >= o && t < c) {
      el.classList.add('is-open');
      const left = c - t;
      text = left <= 1 ? `Open, closing at ${fmt(c)}` : `Open now until ${fmt(c)}`;
    } else {
      el.classList.add('is-closed');
      text = t < o ? `Opens today at ${fmt(o)}` : `Closed, opens ${fmt(HOURS[(d + 1) % 7][0])} tomorrow`;
    }
    el.querySelector('b').textContent = text;
    $$('[data-hours] tr').forEach(tr => tr.classList.toggle('is-today', Number(tr.dataset.day) === d));
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Hero: cup opens into the room on scroll ---------- */
  const hero = $('[data-hero]');
  const setHeroGeometry = () => {
    const w = innerWidth, h = innerHeight;
    const r0 = Math.max(110, Math.min(w * 0.19, h * 0.26));
    const rmax = Math.hypot(w, h) * 0.62;
    hero.style.setProperty('--r0', r0 + 'px');
    hero.style.setProperty('--rmax', rmax + 'px');
  };
  setHeroGeometry();
  addEventListener('resize', setHeroGeometry);

  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      nav.classList.toggle('is-scrolled', scrollY > 40);
      if (reduced) return;
      const total = hero.offsetHeight - innerHeight;
      const raw = Math.min(1, Math.max(0, scrollY / (total * 0.8)));
      const eased = 1 - Math.pow(1 - raw, 2.2);
      hero.style.setProperty('--p', eased.toFixed(4));
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Story: sticky reel ---------- */
  const steps = $$('.step');
  const vids = $$('.sm');
  const bars = $$('.story-progress i');
  let current = -1;
  const loadVid = v => { if (!v.src && v.dataset.src) { v.src = v.dataset.src; } };
  const activate = i => {
    if (i === current) return; current = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    vids.forEach((v, k) => {
      const on = k === i;
      v.classList.toggle('is-on', on);
      if (on) { loadVid(v); if (!reduced) v.play().catch(() => {}); }
      else v.pause();
    });
    bars.forEach((b, k) => b.classList.toggle('is-on', k <= i));
    if (vids[i + 1]) loadVid(vids[i + 1]); // warm the next one
  };
  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) activate(Number(e.target.dataset.step)); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => stepObs.observe(s));
  // start loading the first reel video once the story is near
  new IntersectionObserver((en, ob) => {
    if (en[0].isIntersecting) { activate(0); ob.disconnect(); }
  }, { rootMargin: '300px' }).observe($('.story'));

  /* ---------- Menu tabs ---------- */
  const tabs = $$('[role="tab"]');
  const menuImg = $('[data-menu-img]');
  const selectTab = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    const panel = $('#' + tab.getAttribute('aria-controls'));
    const src = panel.dataset.img;
    if (src && !menuImg.src.endsWith(src)) {
      menuImg.classList.add('is-swapping');
      const pre = new Image(); pre.src = src;
      pre.onload = () => { menuImg.src = src; menuImg.alt = panel.querySelector('h4').textContent + ' and more from the ' + tab.textContent.toLowerCase(); requestAnimationFrame(() => menuImg.classList.remove('is-swapping')); };
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      const next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus(); selectTab(next);
    });
  });

  /* ---------- Brew guide ---------- */
  const RECIPES = {
    v60:   { dose: 15, ratio: 16.6, grind: 'Medium-fine', temp: '94 °C', time: c => `${3 + Math.floor((c - 1) / 2)}:${c > 2 ? '45' : '30'}`, img: 'assets/img/brew-v60.jpg', tip: 'Bloom with twice the coffee’s weight in water for 40 seconds, then pour in slow circles.' },
    aero:  { dose: 17, ratio: 13,   grind: 'Fine',        temp: '88 °C', time: () => '2:00', img: 'assets/img/brew-aero.jpg', tip: 'Inverted method. Stir 10 times, steep 90 seconds, press slowly for 30. One press per cup.' },
    press: { dose: 16, ratio: 15,   grind: 'Coarse',      temp: '95 °C', time: () => '4:00', img: 'assets/img/brew-press.jpg', tip: 'Break the crust at 4 minutes, skim the foam, then plunge gently and pour it all out.' },
    cold:  { dose: 25, ratio: 8,    grind: 'Extra coarse', temp: 'Room temp', time: () => '18 hrs', img: 'assets/img/brew-cold.jpg', tip: 'Makes a concentrate. Steep in the fridge, strain twice, then dilute 1 : 1 with water or milk.' }
  };
  let method = 'v60';
  const cupsIn = $('[data-cups]'), cupsOut = $('[data-cups-out]'), brewImg = $('[data-brew-img]');
  const setText = (k, v) => {
    const el = $(`[data-k="${k}"]`);
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 400);
  };
  const renderBrew = () => {
    const r = RECIPES[method], c = Number(cupsIn.value);
    cupsOut.textContent = c;
    const dose = Math.round(r.dose * c), water = Math.round(dose * r.ratio);
    setText('dose', `${dose} g`);
    setText('water', water >= 1000 ? `${(water / 1000).toFixed(2)} L` : `${water} g`);
    setText('ratio', `1 : ${r.ratio}`);
    setText('grind', r.grind);
    setText('temp', r.temp);
    setText('time', r.time(c));
    setText('tip', r.tip);
    if (!brewImg.src.endsWith(r.img)) { brewImg.style.opacity = 0; const p = new Image(); p.src = r.img; p.onload = () => { brewImg.src = r.img; brewImg.style.opacity = 1; }; }
  };
  $$('[data-method]').forEach(b => b.addEventListener('click', () => {
    method = b.dataset.method;
    $$('[data-method]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    renderBrew();
  }));
  cupsIn.addEventListener('input', renderBrew);
  renderBrew();

  /* ---------- Beans: add to bag ---------- */
  const toast = $('[data-toast]');
  let bag = 0, toastT;
  const say = msg => {
    toast.textContent = msg; toast.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('is-on'), 2600);
  };
  $$('[data-add]').forEach(b => b.addEventListener('click', () => {
    bag++;
    b.textContent = 'Added';
    setTimeout(() => (b.textContent = 'Add to bag'), 1600);
    say(`${b.dataset.add} added. ${bag} ${bag === 1 ? 'bag' : 'bags'} ready for pickup.`);
  }));

  /* ---------- Reservation → WhatsApp ---------- */
  const form = $('[data-reserve]');
  const msg = $('[data-form-msg]');
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  form.date.min = today.toISOString().slice(0, 10);
  form.addEventListener('submit', e => {
    e.preventDefault();
    let firstBad = null;
    ['name', 'phone', 'date', 'time'].forEach(n => {
      const f = form[n]; const bad = !f.value.trim() || (n === 'phone' && f.value.replace(/\D/g, '').length < 10);
      f.setAttribute('aria-invalid', String(bad));
      if (bad && !firstBad) firstBad = f;
    });
    if (firstBad) {
      msg.textContent = firstBad.name === 'phone' ? 'Enter a 10-digit phone number so we can confirm.' : `Add your ${firstBad.name} to book.`;
      firstBad.focus(); return;
    }
    msg.textContent = '';
    const g = form.guests.value;
    const text = `Hi Ember Crema, I'd like to reserve a table for ${g} on ${form.date.value} at ${form.time.value}. Name: ${form.name.value}, phone: ${form.phone.value}.`;
    window.open(`https://wa.me/919800000000?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    say('Opening WhatsApp with your booking.');
  });

  $('[data-year]').textContent = new Date().getFullYear();
})();
