import { useEffect } from 'react';

/** Loads gtag.js when `VITE_GA_MEASUREMENT_ID` is set (optional). */
export function OptionalGa() {
  useEffect(() => {
    const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (!id || typeof document === 'undefined') return;

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);

    const inline = document.createElement('script');
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', ${JSON.stringify(id)});
    `;
    document.head.appendChild(inline);
  }, []);

  return null;
}
