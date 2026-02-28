import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LegacyPageFrame from './components/LegacyPageFrame';
import { htmlToRoute, routeContent } from './legacyPages';

const routeTitles = {
  '/': 'Home',
  '/resume': 'Resume',
  '/projects': 'Projects',
  '/contact': 'Contact',
  '/vibetrail': 'VibeTrail',
  '/clyra': 'Clyra',
  '/trustlens': 'TrustLens',
  '/verifylens': 'VerifyLens',
  '/vrworld': 'VR World',
  '/fitflow': 'FitFlow',
  '/starbucks': 'Starbucks',
  '/construction-world': 'Construction Learning',
  '/skybulletin': 'Sky Bulletin',
  '/untanglingchallenges': 'Untangling Challenges',
  '/carecircle': 'Care Circle',
  '/trikona': 'Trikona'
};

function App() {
  const location = useLocation();

  return (
    <Routes>
      {Object.entries(routeContent).map(([routePath, html]) => (
        <Route
          key={routePath}
          path={routePath}
          element={
            <LegacyPageFrame
              key={`${routePath}:${location.key}`}
              title={routeTitles[routePath]}
              html={html}
            />
          }
        />
      ))}

      {Object.entries(htmlToRoute).map(([legacyPath, routePath]) => (
        <Route key={legacyPath} path={`/${legacyPath}`} element={<Navigate to={routePath} replace />} />
      ))}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
