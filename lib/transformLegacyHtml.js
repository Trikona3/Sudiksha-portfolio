import { htmlToRoute } from './legacyRoutes';

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addBaseTag(html) {
  if (!/<head[^>]*>/i.test(html)) {
    return html;
  }
  if (/<base\s+href=/i.test(html)) {
    return html;
  }
  return html.replace(/<head([^>]*)>/i, '<head$1><base href="/" />');
}

function rewriteHtmlLinks(html) {
  let output = html;

  Object.entries(htmlToRoute).forEach(([fileName, route]) => {
    const filePattern = new RegExp(
      `(href\\s*=\\s*["'])${escapeRegExp(fileName)}((?:[?#][^"']*)?)(["'])`,
      'g'
    );
    output = output.replace(filePattern, (match, p1, suffix, p3) => {
      if (fileName === 'index.html' && !suffix) {
        return `${p1}${route}#home${p3}`;
      }
      return `${p1}${route}${suffix}${p3}`;
    });
  });

  output = output.replace(/(href\s*=\s*["'])(\/[^"'#?]*)(["'])/g, (match, p1, pathValue, p3) => {
    const normalized = pathValue.replace(/^\//, '');
    const mapped = htmlToRoute[normalized];
    if (!mapped) {
      return match;
    }
    return `${p1}${mapped}${p3}`;
  });

  return output;
}

export function transformLegacyHtml(rawHtml) {
  let html = rawHtml;
  html = addBaseTag(html);
  html = rewriteHtmlLinks(html);
  return html;
}
