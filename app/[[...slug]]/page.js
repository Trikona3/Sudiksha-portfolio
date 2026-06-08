import { notFound } from 'next/navigation';
import fs from 'node:fs';
import path from 'node:path';
import LegacyPageRenderer from '../../components/LegacyPageRenderer';
import { htmlToRoute, knownRoutes, routeTitles, routeToFile } from '../../lib/legacyRoutes';

export const dynamic = 'force-static';
export const revalidate = false;

function resolveRouteFromSlug(slugParts) {
  const routePath = `/${(slugParts || []).join('/')}`.replace(/\/$/, '') || '/';
  if (routeToFile[routePath]) {
    return routePath;
  }

  const tail = slugParts?.[slugParts.length - 1] || '';
  const mapped = htmlToRoute[tail];
  if (mapped) {
    return mapped;
  }

  return null;
}

export function generateStaticParams() {
  return knownRoutes.map((route) =>
    route === '/' ? { slug: [] } : { slug: route.replace(/^\//, '').split('/') }
  );
}

export default function CatchAllPage({ params }) {
  const routePath = resolveRouteFromSlug(params.slug);
  if (!routePath) {
    notFound();
  }

  const fileName = routeToFile[routePath];
  if (!fileName) {
    notFound();
  }

  const filePath = path.join(process.cwd(), 'legacy-pages', fileName);
  const html = fs.readFileSync(filePath, 'utf8');
  return <LegacyPageRenderer html={html} title={routeTitles[routePath]} />;
}
