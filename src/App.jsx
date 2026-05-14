import { useState } from 'react';
import LibraryView from './components/LibraryView';
import MixerView from './components/MixerView';
import './App.css'; // Premium layout styles

function App() {
  // Estado para controlar qual tela está visível
  const [currentView, setCurrentView] = useState('LIBRARY');
  // Estado para a pasta raiz selecionada (File System API)
  const [libraryHandle, setLibraryHandle] = useState(null);
  // Estado para a música (pasta) selecionada
  const [selectedSong, setSelectedSong] = useState(null);

  const handleSelectSong = (songInfo) => {
    setSelectedSong(songInfo);
    setCurrentView('MIXER');
  };

  const handleBackToLibrary = () => {
    setCurrentView('LIBRARY');
    // Não apagamos o selectedSong para caso ele queira reabrir rápido, 
    // mas se quisermos liberar memória, faríamos setSelectedSong(null).
  };

  return (
    <div className="app-container">
      {currentView === 'LIBRARY' && (
        <LibraryView 
          libraryHandle={libraryHandle}
          setLibraryHandle={setLibraryHandle}
          onSelectSong={handleSelectSong} 
        />
      )}
      {currentView === 'MIXER' && (
        <MixerView 
          song={selectedSong} 
          onBack={handleBackToLibrary} 
        />
      )}
    </div>
  );
}

export default App;
