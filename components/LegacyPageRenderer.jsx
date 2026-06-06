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

    const getKeyScreensSection = (element) => {
      const explicitSection = element.closest('#key-screens');
      if (explicitSection) {
        return explicitSection;
      }

      return Array.from(mountEl.querySelectorAll('section')).find((section) => {
        const heading = section.querySelector('h2');
        return heading?.textContent?.trim().toLowerCase() === 'key screens' && section.contains(element);
      });
    };

    const lightboxStyle = document.createElement('style');
    lightboxStyle.setAttribute('data-legacy-owned', 'true');
    lightboxStyle.textContent = `
      .legacy-page-root .legacy-lightbox-trigger {
        cursor: zoom-in;
      }
      .legacy-page-root .legacy-lightbox-trigger:focus-visible {
        outline: 3px solid #5A8EFF;
        outline-offset: 4px;
      }
      .legacy-image-lightbox {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 64px 24px 24px;
        background: rgba(3, 7, 18, 0.92);
        backdrop-filter: blur(10px);
      }
      .legacy-image-lightbox[hidden] {
        display: none;
      }
      .legacy-image-lightbox__image {
        max-width: min(96vw, 1800px);
        max-height: calc(100vh - 96px);
        width: auto;
        height: auto;
        object-fit: contain;
        border-radius: 14px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
      }
      .legacy-image-lightbox__close {
        position: fixed;
        top: 18px;
        right: 18px;
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.32);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.72);
        color: #fff;
        font-size: 28px;
        line-height: 1;
        cursor: pointer;
      }
      .legacy-image-lightbox__close:hover,
      .legacy-image-lightbox__close:focus-visible {
        background: rgba(48, 99, 252, 0.9);
        outline: none;
      }
    `;
    document.head.appendChild(lightboxStyle);
    addedHeadNodes.push(lightboxStyle);

    const lightbox = document.createElement('div');
    lightbox.className = 'legacy-image-lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Expanded project screen');
    lightbox.hidden = true;

    const lightboxImage = document.createElement('img');
    lightboxImage.className = 'legacy-image-lightbox__image';
    lightboxImage.alt = '';

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'legacy-image-lightbox__close';
    closeButton.setAttribute('aria-label', 'Close expanded image');
    closeButton.innerHTML = '&times;';

    lightbox.appendChild(lightboxImage);
    lightbox.appendChild(closeButton);
    document.body.appendChild(lightbox);

    const keyScreenImages = Array.from(mountEl.querySelectorAll('img')).filter((img) => getKeyScreensSection(img));
    keyScreenImages.forEach((img) => {
      img.classList.add('legacy-lightbox-trigger');
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.setAttribute('aria-label', `Open ${img.getAttribute('alt') || 'project screen'} full screen`);
    });

    let lastFocusedElement = null;
    let previousBodyOverflow = '';

    const closeLightbox = () => {
      lightbox.hidden = true;
      lightboxImage.removeAttribute('src');
      lightboxImage.alt = '';
      document.body.style.overflow = previousBodyOverflow;
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
      lastFocusedElement = null;
    };

    const openLightbox = (img) => {
      lastFocusedElement = document.activeElement;
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.getAttribute('alt') || 'Expanded project screen';
      lightbox.hidden = false;
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      closeButton.focus();
    };

    const onLightboxClick = (event) => {
      if (event.target === lightbox || event.target === closeButton) {
        closeLightbox();
      }
    };

    const onKeyDown = (event) => {
      if (!lightbox.hidden && event.key === 'Escape') {
        closeLightbox();
        return;
      }

      if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLImageElement && getKeyScreensSection(event.target)) {
        event.preventDefault();
        openLightbox(event.target);
      }
    };

    const onClick = (event) => {
      if (event.target instanceof HTMLImageElement && getKeyScreensSection(event.target)) {
        event.preventDefault();
        openLightbox(event.target);
        return;
      }

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
    lightbox.addEventListener('click', onLightboxClick);
    document.addEventListener('keydown', onKeyDown);

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
      lightbox.removeEventListener('click', onLightboxClick);
      document.removeEventListener('keydown', onKeyDown);
      lightbox.remove();
      document.body.style.overflow = previousBodyOverflow;
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
