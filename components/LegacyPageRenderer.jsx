'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { transformLegacyHtml } from '../lib/transformLegacyHtml';

function normalizeScriptType(type) {
  return (type || '').trim().toLowerCase();
}

function isExecutableScript(type) {
  if (!type) {
    return true;
  }
  return ['text/javascript', 'application/javascript', 'module'].includes(type);
}

function getLoadedScriptSet() {
  if (!window.__legacyLoadedScripts) {
    window.__legacyLoadedScripts = new Set();
  }
  return window.__legacyLoadedScripts;
}

function loadExternalScript(scriptEl) {
  const src = scriptEl.getAttribute('src');
  if (!src) {
    return Promise.resolve();
  }

  const scriptType = normalizeScriptType(scriptEl.getAttribute('type'));
  const key = `${scriptType || 'classic'}:${src}`;
  const loadedScripts = getLoadedScriptSet();
  if (loadedScripts.has(key)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    if (scriptType) {
      el.type = scriptType;
    }
    if (scriptEl.hasAttribute('crossorigin')) {
      el.setAttribute('crossorigin', scriptEl.getAttribute('crossorigin') || '');
    }
    if (scriptEl.hasAttribute('referrerpolicy')) {
      el.setAttribute('referrerpolicy', scriptEl.getAttribute('referrerpolicy') || '');
    }
    el.async = false;
    el.onload = () => {
      loadedScripts.add(key);
      resolve();
    };
    el.onerror = reject;
    document.head.appendChild(el);
  });
}

function ensureGlobalAosLoaded() {
  if (window.AOS) {
    return Promise.resolve();
  }
  if (window.__legacyAosLoadingPromise) {
    return window.__legacyAosLoadingPromise;
  }

  window.__legacyAosLoadingPromise = new Promise((resolve, reject) => {
    const existingCss = document.querySelector('link[data-legacy-aos-css="true"]');
    if (!existingCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/aos@2.3.1/dist/aos.css';
      link.setAttribute('data-legacy-aos-css', 'true');
      document.head.appendChild(link);
    }

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/aos@2.3.1/dist/aos.js';
    script.async = false;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.__legacyAosLoadingPromise;
}

export default function LegacyPageRenderer({ html, title, sourcePath }) {
  const rootRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const [resolvedHtml, setResolvedHtml] = useState(html || '');

  useEffect(() => {
    let isActive = true;
    if (html) {
      setResolvedHtml(html);
      return () => {
        isActive = false;
      };
    }
    if (!sourcePath) {
      return () => {
        isActive = false;
      };
    }
    fetch(sourcePath, { cache: 'no-store' })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error('Failed to load legacy page'))))
      .then((text) => {
        if (isActive) {
          setResolvedHtml(text);
        }
      })
      .catch(() => {
        if (isActive) {
          setResolvedHtml('<html><body><main style="padding:2rem;font-family:sans-serif">Failed to load page content.</main></body></html>');
        }
      });
    return () => {
      isActive = false;
    };
  }, [html, sourcePath]);

  const transformedHtml = useMemo(() => transformLegacyHtml(resolvedHtml || ''), [resolvedHtml]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (!resolvedHtml) {
      return undefined;
    }
    const mountEl = rootRef.current;
    if (!mountEl) {
      return undefined;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(transformedHtml, 'text/html');
    const previousTitle = document.title;
    const previousBodyClass = document.body.className;
    const previousBodyStyle = document.body.getAttribute('style');
    const addedHeadNodes = [];
    let cancelled = false;
    let revealObserver = null;

    if (doc.title) {
      document.title = doc.title;
    } else if (title) {
      document.title = title;
    }

    document.body.className = doc.body.getAttribute('class') || '';
    const nextBodyStyle = doc.body.getAttribute('style');
    if (nextBodyStyle === null) {
      document.body.removeAttribute('style');
    } else {
      document.body.setAttribute('style', nextBodyStyle);
    }

    doc.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      const cloned = node.cloneNode(true);
      cloned.setAttribute('data-legacy-owned', 'true');
      document.head.appendChild(cloned);
      addedHeadNodes.push(cloned);
    });

    mountEl.innerHTML = doc.body.innerHTML;

    const onClick = (event) => {
      const anchor = event.target.closest('a[href]');
      if (!anchor) {
        return;
      }

      if (anchor.hasAttribute('download') || anchor.getAttribute('target') === '_blank') {
        return;
      }

      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      if (/\.(pdf|png|jpe?g|gif|svg|webp|mp4|webm|mov|docx?)($|[?#])/i.test(href)) {
        return;
      }
      if (/^https?:\/\//i.test(href)) {
        return;
      }

      const normalizedHref = href.startsWith('/') ? href : `/${href}`;
      if (!normalizedHref.startsWith('/')) {
        return;
      }

      event.preventDefault();
      router.push(normalizedHref);
    };

    mountEl.addEventListener('click', onClick);

    const refreshAos = () => {
      if (!window.AOS) {
        return;
      }
      window.AOS.init({
        duration: 700,
        easing: 'ease-out-cubic',
        offset: 80,
        once: false,
        mirror: true,
        disable: () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      });
      if (typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard();
      } else if (typeof window.AOS.refresh === 'function') {
        window.AOS.refresh();
      }
    };

    const runScripts = async () => {
      const originalAddEventListener = window.addEventListener.bind(window);
      const pendingLoadCallbacks = [];

      window.addEventListener = (type, listener, options) => {
        if (type === 'load' && typeof listener === 'function') {
          pendingLoadCallbacks.push(listener);
          return;
        }
        return originalAddEventListener(type, listener, options);
      };

      const scripts = Array.from(doc.querySelectorAll('script'));
      try {
        for (const sourceScript of scripts) {
          if (cancelled) {
            return;
          }
          const type = normalizeScriptType(sourceScript.getAttribute('type'));
          if (!isExecutableScript(type)) {
            continue;
          }

          const src = sourceScript.getAttribute('src');
          if (src) {
            try {
              await loadExternalScript(sourceScript);
            } catch {
              // Continue rendering if one external script fails.
            }
            continue;
          }

          const inlineScript = document.createElement('script');
          if (type) {
            inlineScript.type = type;
          }
          inlineScript.textContent = `(function(){\n${sourceScript.textContent || ''}\n})();`;
          mountEl.appendChild(inlineScript);
        }
      } finally {
        window.addEventListener = originalAddEventListener;
      }

      pendingLoadCallbacks.forEach((callback) => {
        try {
          callback(new Event('load'));
        } catch {
          // Ignore callback errors.
        }
      });

      await ensureGlobalAosLoaded().catch(() => {});

      mountEl.querySelectorAll('[data-aos]').forEach((el) => {
        if (el.closest('#process')) {
          return;
        }
        Array.from(el.attributes).forEach((attr) => {
          if (attr.name.startsWith('data-aos')) {
            el.removeAttribute(attr.name);
          }
        });
      });

      refreshAos();
      requestAnimationFrame(refreshAos);
      setTimeout(refreshAos, 120);

      const candidates = mountEl.querySelectorAll(
        [
          'main article',
          'main .project-tile',
          'main .vt-flow-card',
          'main .card-wrap',
          'main .career-card',
          'main .figjam-frame',
          'main .rounded-2xl:not(.shadow-lg)',
          'main section[id]',
          'main table',
          'main h1',
          'main h2',
          'main h3',
          'main h4',
          'main p',
          'main li',
          'main blockquote',
          'main img',
          'main video',
          'main figure',
          'main form',
          'main input',
          'main textarea',
          'main button',
          'main a.cta',
          'main a.inline-flex'
        ].join(',')
      );

      const uniqueNodes = Array.from(new Set(Array.from(candidates)));
      const targets = uniqueNodes.filter((node) => {
        if (!(node instanceof HTMLElement)) {
          return false;
        }
        if (node.closest('#process') || node.closest('header, nav, footer')) {
          return false;
        }
        if (node.classList.contains('no-auto-reveal') || node.closest('.no-auto-reveal')) {
          return false;
        }
        if (node.classList.contains('auto-reveal')) {
          return false;
        }
        const tag = node.tagName.toLowerCase();
        const isLargeContainerTag = tag === 'div' || tag === 'main';
        const tooTall = node.offsetHeight > window.innerHeight * 1.15;
        const tooWide = node.offsetWidth > window.innerWidth * 0.92;
        if (isLargeContainerTag && tooTall && tooWide) {
          return false;
        }
        return node.offsetWidth > 0 && node.offsetHeight > 0;
      });

      targets.forEach((node, index) => {
        const rect = node.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const directionClass =
          centerX < viewportWidth * 0.4
            ? 'from-left'
            : centerX > viewportWidth * 0.6
              ? 'from-right'
              : 'from-bottom';

        node.classList.add('auto-reveal', directionClass);
        node.classList.add(node.matches('img, video, figure') ? 'media' : 'content');
        node.style.transitionDelay = `${Math.min(index * 18, 180)}ms`;
      });

      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!(entry.target instanceof HTMLElement)) {
              return;
            }
            if (entry.isIntersecting && entry.intersectionRatio > 0.06) {
              entry.target.classList.add('in-view');
            } else if (entry.intersectionRatio < 0.02) {
              entry.target.classList.remove('in-view');
            }
          });
        },
        {
          threshold: [0, 0.02, 0.06, 0.18, 0.35],
          rootMargin: '-4% 0px -12% 0px'
        }
      );

      targets.forEach((node) => revealObserver?.observe(node));

      requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        if (window.location.hash && window.location.hash !== '#home') {
          const id = decodeURIComponent(window.location.hash.slice(1));
          const target = mountEl.querySelector(`#${CSS.escape(id)}`);
          if (target) {
            target.scrollIntoView({ block: 'start', inline: 'nearest' });
            return;
          }
        }
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    };

    runScripts();

    return () => {
      cancelled = true;
      if (revealObserver) {
        revealObserver.disconnect();
      }
      mountEl.removeEventListener('click', onClick);
      mountEl.innerHTML = '';
      addedHeadNodes.forEach((node) => node.remove());
      document.title = previousTitle;
      document.body.className = previousBodyClass;
      if (previousBodyStyle === null) {
        document.body.removeAttribute('style');
      } else {
        document.body.setAttribute('style', previousBodyStyle);
      }
    };
  }, [pathname, router, title, transformedHtml, resolvedHtml]);

  if (!resolvedHtml) {
    return <div className="legacy-page-root" />;
  }
  return <div ref={rootRef} className="legacy-page-root" />;
}
