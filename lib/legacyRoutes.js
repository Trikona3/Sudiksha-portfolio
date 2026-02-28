const routeFilePairs = [
  ['/', 'index.html'],
  ['/resume', 'resume.html'],
  ['/projects', 'projects.html'],
  ['/contact', 'contact.html'],
  ['/vibetrail', 'Vibetrail.html'],
  ['/clyra', 'Clyra.html'],
  ['/trustlens', 'trustlens.html'],
  ['/verifylens', 'verifylens.html'],
  ['/vrworld', 'vrworld.html'],
  ['/fitflow', 'fitflow.html'],
  ['/starbucks', 'starbucks.html'],
  ['/construction-world', 'construction_world.html'],
  ['/skybulletin', 'skybulletin.html'],
  ['/untanglingchallenges', 'untanglingchallenges.html'],
  ['/carecircle', 'carecircle.html'],
  ['/trikona', 'trikona.html']
];

export const routeToFile = Object.fromEntries(routeFilePairs);

export const htmlToRoute = {
  'index.html': '/',
  'resume.html': '/resume',
  'projects.html': '/projects',
  'contact.html': '/contact',
  'Vibetrail.html': '/vibetrail',
  'vibetrail.html': '/vibetrail',
  'Clyra.html': '/clyra',
  'clyra.html': '/clyra',
  'trustlens.html': '/trustlens',
  'verifylens.html': '/verifylens',
  'vrworld.html': '/vrworld',
  'fitflow.html': '/fitflow',
  'starbucks.html': '/starbucks',
  'construction_world.html': '/construction-world',
  'skybulletin.html': '/skybulletin',
  'untanglingchallenges.html': '/untanglingchallenges',
  'carecircle.html': '/carecircle',
  'trikona.html': '/trikona'
};

export const routeTitles = {
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

export const knownRoutes = Object.keys(routeToFile);
