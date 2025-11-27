import React, { useState } from 'react';
import { GameAssets } from './types';
import AssetLoader from './components/AssetLoader';
import GameCanvas from './components/GameCanvas';

const App: React.FC = () => {
  const [assets, setAssets] = useState<GameAssets | null>(null);

  const handleRestart = () => {
     // Force re-mount of GameCanvas to reset internal refs/state
     const currentAssets = assets;
     setAssets(null);
     setTimeout(() => setAssets(currentAssets), 0);
  };

  if (!assets) {
    return <AssetLoader onAssetsLoaded={setAssets} />;
  }

  return (
    <div className="w-full h-screen bg-neutral-900 overflow-hidden relative">
      <GameCanvas assets={assets} onRestart={handleRestart} />
    </div>
  );
};

export default App;
