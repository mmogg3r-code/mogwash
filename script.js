const yearEl = document.getElementById('year');
yearEl.textContent = new Date().getFullYear();

const quoteBtn = document.getElementById('quote-btn');
quoteBtn.addEventListener('click', () => {
  window.alert('Thanks! Call us at (514) 555-0198 and we will prepare your free quote.');
});
