import React, { useState } from 'react';
import { GameAssets } from '../types';
import { loadImagesFromFiles } from '../services/assetUtils';

interface AssetLoaderProps {
  onAssetsLoaded: (assets: GameAssets) => void;
}

const AssetLoader: React.FC<AssetLoaderProps> = ({ onAssetsLoaded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [walkFiles, setWalkFiles] = useState<FileList | null>(null);
  const [attackFiles, setAttackFiles] = useState<FileList | null>(null);
  const [deathFiles, setDeathFiles] = useState<FileList | null>(null);

  const handleLoad = async () => {
    if (!walkFiles || !attackFiles || !deathFiles) {
      setError("Please upload all three folders (Walk, Attack, Death) to start.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const walk = await loadImagesFromFiles(walkFiles);
      const attack = await loadImagesFromFiles(attackFiles);
      const death = await loadImagesFromFiles(deathFiles);

      if (walk.length === 0 || attack.length === 0 || death.length === 0) {
        throw new Error("One or more folders were empty or contained invalid images.");
      }

      // Ensure we have at least 4 frames or loop them if less
      onAssetsLoaded({ walk, attack, death });
    } catch (err: any) {
      console.error(err);
      setError("Failed to load images. Please ensure they are valid image files.");
    } finally {
      setLoading(false);
    }
  };

  const FileInput = ({ label, onChange, files }: { label: string, onChange: (f: FileList) => void, files: FileList | null }) => (
    <div className="mb-6">
      <label className="block text-yellow-500 mb-2 text-sm">{label}</label>
      <div className="flex items-center space-x-4">
        <label className="cursor-pointer bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white py-3 px-4 rounded transition-colors w-full text-center border-dashed">
          <span className="text-xs truncate block">{files ? `${files.length} files selected` : "Select Folder"}</span>
          <input
            type="file"
            multiple
            // @ts-ignore - webkitdirectory is standard in modern browsers but missing in React types
            webkitdirectory=""
            className="hidden"
            onChange={(e) => e.target.files && onChange(e.target.files)}
          />
        </label>
      </div>
      {files && (
        <div className="mt-2 flex space-x-1 overflow-x-auto p-1 bg-black/20 rounded">
           {/* Preview first 4 files names */}
           {Array.from(files).slice(0, 4).map(f => (
             <div key={f.name} className="w-8 h-8 bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[8px] text-gray-400 overflow-hidden" title={f.name}>
                IMG
             </div>
           ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-neutral-900 border-2 border-neutral-700 p-8 rounded-lg max-w-lg w-full shadow-2xl relative">
        <h1 className="text-2xl text-center text-yellow-500 mb-2 uppercase tracking-widest">Character Setup</h1>
        <p className="text-gray-400 text-xs text-center mb-8">Upload your sprites. Folders should contain sequential PNGs (e.g., walk1.png, walk2.png).</p>

        <FileInput label="1. Walk Animation (Folder)" onChange={setWalkFiles} files={walkFiles} />
        <FileInput label="2. Attack Animation (Folder)" onChange={setAttackFiles} files={attackFiles} />
        <FileInput label="3. Death Animation (Folder)" onChange={setDeathFiles} files={deathFiles} />

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-xs mb-4 text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleLoad}
          disabled={loading}
          className={`w-full py-4 text-sm font-bold uppercase tracking-wider rounded transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
            loading 
              ? 'bg-neutral-700 text-gray-500 cursor-wait' 
              : 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-[0_4px_0_rgb(161,98,7)]'
          }`}
        >
          {loading ? 'Processing Assets...' : 'Enter the Dungeon'}
        </button>
        
        <div className="mt-4 text-[10px] text-gray-600 text-center">
          * Images are processed locally and not uploaded to any server.
        </div>
      </div>
    </div>
  );
};

export default AssetLoader;
