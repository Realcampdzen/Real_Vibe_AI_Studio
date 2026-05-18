(function initServicePriceBindings() {
  function priceBook() {
    return window.SERVICE_PRICE_OVERRIDES || { services: {}, offers: {} };
  }

  function setText(element, value) {
    if (!element || !value) return;
    element.textContent = value;
  }

  function applyBindings() {
    const book = priceBook();

    document.querySelectorAll('[data-service-price-slug]').forEach((element) => {
      const slug = element.getAttribute('data-service-price-slug');
      setText(element, book.services?.[slug]?.price);
    });

    document.querySelectorAll('[data-offer-price-service][data-offer-price-id]').forEach((element) => {
      const serviceSlug = element.getAttribute('data-offer-price-service');
      const offerId = element.getAttribute('data-offer-price-id');
      setText(element, book.offers?.[serviceSlug]?.[offerId]?.price);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBindings, { once: true });
  } else {
    applyBindings();
  }
}());
