/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/index.html', destination: '/#home', permanent: false },
      { source: '/resume.html', destination: '/resume', permanent: false },
      { source: '/projects.html', destination: '/projects', permanent: false },
      { source: '/contact.html', destination: '/contact', permanent: false },
      { source: '/Vibetrail.html', destination: '/vibetrail', permanent: false },
      { source: '/vibetrail.html', destination: '/vibetrail', permanent: false },
      { source: '/Clyra.html', destination: '/clyra', permanent: false },
      { source: '/clyra.html', destination: '/clyra', permanent: false },
      { source: '/trustlens.html', destination: '/trustlens', permanent: false },
      { source: '/verifylens.html', destination: '/verifylens', permanent: false },
      { source: '/vrworld.html', destination: '/vrworld', permanent: false },
      { source: '/fitflow.html', destination: '/fitflow', permanent: false },
      { source: '/starbucks.html', destination: '/starbucks', permanent: false },
      { source: '/construction_world.html', destination: '/construction-world', permanent: false },
      { source: '/skybulletin.html', destination: '/skybulletin', permanent: false },
      { source: '/untanglingchallenges.html', destination: '/untanglingchallenges', permanent: false },
      { source: '/carecircle.html', destination: '/carecircle', permanent: false },
      { source: '/trikona.html', destination: '/trikona', permanent: false }
    ];
  }
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
