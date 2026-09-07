/* ══════════════════════════════════════
   Kolachi Seafood — Main JS
══════════════════════════════════════ */

// ── Sticky Nav shadow on scroll ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.style.boxShadow = window.scrollY > 60
    ? '0 4px 30px rgba(0,0,0,0.6)'
    : 'none';
});

// ── Fade-up on scroll ──
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 120);
      fadeObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

// ── Smooth scroll ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
      // close mobile menu if open
      closeMobileMenu();
    }
  });
});

// ── Counter animation ──
function animateCounter(el, target, suffix = '') {
  let current = 0;
  const num = parseInt(target);
  if (isNaN(num)) return;
  const step = Math.ceil(num / 40);
  const timer = setInterval(() => {
    current += step;
    if (current >= num) { current = num; clearInterval(timer); }
    el.textContent = current + suffix;
  }, 40);
}
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.stat-num').forEach(n => {
        const raw = n.textContent.trim();
        if (raw === '12+')      animateCounter(n, 12, '+');
        else if (raw === '50+') animateCounter(n, 50, '+');
        else if (raw === '3')   animateCounter(n, 3, '');
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });
const statsEl = document.querySelector('.about-stats');
if (statsEl) statsObserver.observe(statsEl);

// ══════════════════════════════════════
// HAMBURGER / MOBILE MENU
// ══════════════════════════════════════
const hamburger    = document.getElementById('hamburger');
const mobileMenu   = document.getElementById('mobileMenu');
const mobileOverlay= document.getElementById('mobileOverlay');
const mobileClose  = document.getElementById('mobileClose');

function openMobileMenu() {
  hamburger.classList.add('open');
  mobileMenu.classList.add('open');
  mobileOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeMobileMenu() {
  hamburger.classList.remove('open');
  mobileMenu.classList.remove('open');
  mobileOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

hamburger.addEventListener('click', () => {
  mobileMenu.classList.contains('open') ? closeMobileMenu() : openMobileMenu();
});
mobileClose.addEventListener('click', closeMobileMenu);
mobileOverlay.addEventListener('click', closeMobileMenu);

// ══════════════════════════════════════
// DISH FILTER (Featured Dishes)
// ══════════════════════════════════════
const filterBtns = document.querySelectorAll('.filter-btn');
const dishCards  = document.querySelectorAll('.dish-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // update active button
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;
    dishCards.forEach(card => {
      const match = filter === 'all' || card.dataset.category === filter;
      card.style.display = match ? '' : 'none';
      // re-trigger fade for visible cards
      if (match) {
        card.classList.remove('visible');
        setTimeout(() => card.classList.add('visible'), 50);
      }
    });
  });
});

// ══════════════════════════════════════
// TESTIMONIAL SLIDER
// ══════════════════════════════════════
let currentSlide = 0;
const testimonials = document.querySelectorAll('.testimonial');
const dots         = document.querySelectorAll('.t-dot');

function goToSlide(idx) {
  testimonials[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = (idx + testimonials.length) % testimonials.length;
  testimonials[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');
}

document.querySelector('.t-next').addEventListener('click', () => goToSlide(currentSlide + 1));
document.querySelector('.t-prev').addEventListener('click', () => goToSlide(currentSlide - 1));
dots.forEach(dot => dot.addEventListener('click', () => goToSlide(+dot.dataset.idx)));

// Auto-advance every 6s
setInterval(() => goToSlide(currentSlide + 1), 6000);

// ══════════════════════════════════════
// CONTACT FORM SUBMIT
// ══════════════════════════════════════
const orderForm   = document.getElementById('orderForm');
const formSuccess = document.getElementById('formSuccess');

orderForm.addEventListener('submit', e => {
  e.preventDefault();
  // simple validation
  const inputs = orderForm.querySelectorAll('[required]');
  let valid = true;
  inputs.forEach(inp => {
    inp.style.borderColor = '';
    if (!inp.value.trim()) {
      inp.style.borderColor = '#c0392b';
      valid = false;
    }
  });
  if (!valid) return;

  // simulate send
  const btn = orderForm.querySelector('.btn-submit');
  btn.textContent = 'Sending…';
  btn.disabled = true;

  setTimeout(() => {
    btn.style.display = 'none';
    formSuccess.style.display = 'block';
    orderForm.reset();
  }, 1200);
});
