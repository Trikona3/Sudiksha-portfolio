import LegacyPageRenderer from '../components/LegacyPageRenderer';

export const dynamic = 'force-static';
export const revalidate = false;

export default function HomePage() {
  return (
    <LegacyPageRenderer
      sourcePath="/legacy-pages/index.html"
      title="Sudiksha Rajavaram Portfolio"
    />
  );
}
