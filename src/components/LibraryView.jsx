import { useState } from 'react';




function LibraryView({ onSelectSong }) {
  const [currentPath, setCurrentPath] = useState(null);
  const [currentName, setCurrentName] = useState('');
  const [items, setItems] = useState([]);
  const [rootHandle, setRootHandle] = useState(null); // Handle da pasta raiz selecionada
  const [currentHandle, setCurrentHandle] = useState(null); // Handle da pasta atual

  const [rawFiles, setRawFiles] = useState([]);
  const [currentVirtualPath, setCurrentVirtualPath] = useState(null);

  // MODO VIRTUAL: Compatível com Android (webkitdirectory)
  const updateVirtualView = (targetPath, allFiles) => {
    const folderMap = new Map();
    const audioFiles = [];
    const targetDepth = targetPath.split('/').length;

    for (const file of allFiles) {
      // file.webkitRelativePath ex: "Repertorio/Musica 1/Bass.wav"
      if (file.webkitRelativePath.startsWith(targetPath + '/')) {
        const parts = file.webkitRelativePath.split('/');
        
        if (parts.length > targetDepth + 1) {
          // É uma subpasta
          const folderName = parts[targetDepth];
          const folderVirtualPath = targetPath + '/' + folderName;
          if (!folderMap.has(folderName)) {
            folderMap.set(folderName, {
              name: folderName,
              path: folderVirtualPath,
              isDirectory: true,
              isVirtual: true
            });
          }
        } else {
          // É um arquivo nesta pasta
          const name = file.name.toLowerCase();
          if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.mp4') || name.endsWith('.pdf')) {
            audioFiles.push(file);
          }
        }
      }
    }

    const folderList = Array.from(folderMap.values());

    // Se achou áudios e não tem subpastas, é a música!
    if (folderList.length === 0 && audioFiles.length > 0) {
      const folderName = targetPath.split('/').pop();
      onSelectSong({ name: folderName, files: audioFiles, isVirtualSystem: true });
      return;
    }

    setCurrentVirtualPath(targetPath);
    setCurrentName(targetPath.split('/').pop());
    setCurrentPath('virtual'); // Flag
    setItems(folderList.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const handleOpenDirectoryInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const rootFolderName = files[0].webkitRelativePath.split('/')[0];
    updateVirtualView(rootFolderName, files);
  };

  const handleSelectFolder = async (folderName, folderPath, handle = null, isVirtual = false) => {
    // Modo Virtual (Android webkitdirectory)
    if (isVirtual || currentPath === 'virtual') {
      updateVirtualView(folderPath, rawFiles);
      return;
    }

    // Se temos um handle, estamos no modo FileSystem (Navegador Desktop)
    if (handle || rootHandle) {
      const targetHandle = handle || currentHandle;
      
      if (targetHandle.kind === 'directory') {
        const folderList = [];
        let audioFiles = [];

        for await (const entry of targetHandle.values()) {
          if (entry.kind === 'directory') {
            folderList.push({ name: entry.name, path: entry.name, handle: entry, isDirectory: true });
          } else {
            const name = entry.name.toLowerCase();
            if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.mp4') || name.endsWith('.pdf')) {
              audioFiles.push(entry);
            }
          }
        }

        // Se a pasta tem áudios e não tem subpastas, é uma música!
        if (folderList.length === 0 && audioFiles.length > 0) {
          onSelectSong({ name: folderName, handle: targetHandle, isFileSystem: true });
          return;
        }

        setCurrentHandle(targetHandle);
        setCurrentName(folderName);
        setItems(folderList.sort((a, b) => a.name.localeCompare(b.name)));
      }
      return;
    }

    try {
      const response = await fetch(`/api/local-dir?path=${folderPath}`);
      
      if (!response.ok) {
        alert(`A pasta ${folderPath} não foi encontrada. No Vercel, use o botão "Abrir Pasta Local".`);
        return;
      }
      
      const data = await response.json();
      const folderList = [];
      let hasAudioFiles = false;

      for (const entry of data) {
        if (entry.isDirectory) {
          folderList.push({ name: entry.name, path: `${folderPath}/${entry.name}` });
        } else if (entry.isFile) {
          const name = entry.name.toLowerCase();
          if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg')) {
            hasAudioFiles = true;
          }
        }
      }

      if (folderList.length === 0 && hasAudioFiles) {
        onSelectSong({ name: folderName, path: folderPath });
        return; 
      }

      setCurrentPath(folderPath);
      setCurrentName(folderName);
      setItems(folderList);
    } catch (err) {
      console.log('Erro ao ler pasta:', err);
    }
  };

  const handleBack = () => {
    if (!currentPath) return;

    // Lógica de Voltar no Modo Virtual (Android)
    if (currentPath === 'virtual') {
      const parts = currentVirtualPath.split('/');
      if (parts.length <= 1) {
        // Voltou para a raiz, limpa tudo
        setCurrentPath(null);
        setCurrentVirtualPath(null);
        setRawFiles([]);
        setItems([]);
      } else {
        parts.pop();
        updateVirtualView(parts.join('/'), rawFiles);
      }
      return;
    }
    
    // Exemplo: currentPath = "vs/modao_sertanejo/bruno_e_marrone"
    const parts = currentPath.split('/');
    if (parts.length <= 2) {
      // Se estava na raiz de um estilo (ex: "vs/modao_sertanejo"), volta para a tela inicial
      setCurrentPath(null);
      setCurrentName('');
      setItems([]);
      return;
    }
    
    // Volta um nível
    parts.pop();
    const parentPath = parts.join('/');
    // O nome pai pode ser o último segmento (ex: "modao_sertanejo" ou "Bruno e Marrone")
    const parentName = parts[parts.length - 1].replace(/_/g, ' '); 
    
    handleSelectFolder(parentName, parentPath);
  };

  return (
    <div className="library-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="header-bar" style={!currentPath ? { display: 'none' } : {}}>
        {currentPath && (
          <h1 className="title" style={{ fontSize: '1.8rem', color: '#fff' }}>
            {`Explorando: ${currentName}`}
          </h1>
        )}
        {currentPath && (
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn-secondary" onClick={handleBack} title="Voltar um nível">
              ⬅ Voltar
            </button>
            <button className="btn-primary" onClick={() => setCurrentPath(null)} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
              🏠 Menu Inicial
            </button>
          </div>
        )}
      </div>

      {!currentPath ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flex: 1,
          textAlign: 'center',
          gap: '2rem'
        }}>
          <div>
            <h1 className="title" style={{ margin: 0, fontSize: '3.5rem', fontWeight: '900', background: 'linear-gradient(45deg, #00f2fe, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>
              Palco VS
            </h1>
            <p style={{ color: '#aaa', fontSize: '1.2rem', marginTop: '0.5rem' }}>Selecione a pasta com seus repertórios e playbacks</p>
          </div>
          
          <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s ease' }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            
            <img 
              src="/images/open_folder_icon.png" 
              alt="Abrir Pasta" 
              style={{ width: '250px', height: '250px', objectFit: 'contain', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.5))' }} 
            />
            
            <div style={{ marginTop: '1rem', fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
              Abrir Arquivos
            </div>

            <input 
              type="file" 
              webkitdirectory="true" 
              directory="true" 
              multiple 
              onChange={handleOpenDirectoryInput} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%', 
                opacity: 0, 
                cursor: 'pointer' 
              }} 
            />
          </div>
        </div>
      ) : (
        <div className="folders-grid" style={{ flexWrap: 'wrap' }}>
          {items.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', width: '100%' }}>
              <p>Nenhuma pasta ou música encontrada aqui.</p>
            </div>
          )}
          {items.map(folder => (
            <div key={folder.name} className="folder-card" onClick={() => handleSelectFolder(folder.name, folder.path, folder.handle, folder.isVirtual)}>
              <div className="folder-icon">{folder.isDirectory ? '📂' : '🎵'}</div>
              <div className="folder-name">{folder.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LibraryView;
