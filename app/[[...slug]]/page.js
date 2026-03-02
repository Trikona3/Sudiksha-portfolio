import { notFound } from 'next/navigation';
import LegacyPageRenderer from '../../components/LegacyPageRenderer';
import { htmlToRoute, knownRoutes, routeTitles, routeToFile } from '../../lib/legacyRoutes';

export const dynamic = 'force-static';
export const dynamicParams = false;
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

async function readLegacyHtml(fileName) {
  const [{ readFile }, { join }] = await Promise.all([
    import('node:fs/promises'),
    import('node:path')
  ]);
  const filePath = join(process.cwd(), 'legacy-pages', fileName);
  return readFile(filePath, 'utf8');
}

export function generateStaticParams() {
  return knownRoutes.map((route) =>
    route === '/' ? { slug: [] } : { slug: route.replace(/^\//, '').split('/') }
  );
}

export default async function CatchAllPage({ params }) {
  const { slug } = await params;
  const routePath = resolveRouteFromSlug(slug);
  if (!routePath) {
    notFound();
  }

  const fileName = routeToFile[routePath];
  if (!fileName) {
    notFound();
  }

  const html = await readLegacyHtml(fileName);
  return <LegacyPageRenderer html={html} title={routeTitles[routePath]} />;
}
