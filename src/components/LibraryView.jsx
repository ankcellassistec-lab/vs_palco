import { useState } from 'react';

// Lista de Estilos fixada para a Tela Inicial sempre abrir bonita!
// As imagens devem ser colocadas na pasta public/images/ do projeto.
const MOCK_GENRES = [
  { name: 'Sertanejo Atualizado',  path: 'vs/sertanejo_atualizados', coverUrl: '/images/sertanejo_atualizados.avif' },
  { name: 'Modão Sertanejo',       path: 'vs/modao_sertanejo',       coverUrl: '/images/modao_sertaneo.avif' },
  { name: 'Pagode & Samba',        path: 'vs/pagode_e_samba',        coverUrl: '/images/pagode_e_samba.avif' },
  { name: 'Forró Atualizado',      path: 'vs/forro_atualizados',     coverUrl: '/images/forro_atualizados.avif' },
  { name: 'Forró das Antigas',     path: 'vs/forro_das_antigas',     coverUrl: '/images/forro_das_antigas.avif' },
  { name: 'Forró Pé de Serra',     path: 'vs/forro_pe_de_serra',     coverUrl: '/images/forro_pe_de_serra.avif' },
  { name: 'Piseiro',               path: 'vs/piseiro',               coverUrl: '/images/piseiro.avif' },
  { name: 'Arrocha & Seresta',     path: 'vs/arrocha_e_seresta',     coverUrl: '/images/arrocha_e_seresta.avif' },
  { name: 'Pop Rock',              path: 'vs/pop_rock',              coverUrl: '/images/pop_rock.avif' },
  { name: 'Axé / Swingueira',      path: 'vs/axe',                   coverUrl: '/images/axe.avif' },
  { name: 'Funk',                  path: 'vs/funk',                  coverUrl: '/images/funk.avif' },
  { name: 'Internacional',         path: 'vs/internacional',         coverUrl: '/images/internacional.avif' },
  { name: 'MPB',                   path: 'vs/mpb',                   coverUrl: '/images/mpb.avif' },
  { name: 'Gospel',                path: 'vs/gospel',                coverUrl: '/images/gospel.avif' },
  { name: 'Católico',              path: 'vs/catolico',              coverUrl: '/images/catolico.avif' },
];


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
    <div className="library-container">
      <div className="header-bar">
        {!currentPath && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '1.5rem' }}>
            <h1 className="title" style={{ margin: 0, fontSize: '2.2rem', fontWeight: '900' }}>
              Palco VS
            </h1>
            
            <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <span style={{ fontSize: '1.4rem' }}>📂</span> Abrir Minha Pasta
              <input 
                type="file" 
                webkitdirectory="true" 
                directory="true" 
                multiple 
                onChange={handleOpenDirectoryInput} 
                style={{ display: 'none' }} 
              />
            </label>
          </div>
        )}
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
        <div className="folders-grid">
          {MOCK_GENRES.map(genre => (
            <div 
              key={genre.name} 
              className="style-card" 
              onClick={() => handleSelectFolder(genre.name, genre.path)}
              style={!genre.coverUrl ? { background: 'linear-gradient(45deg, var(--secondary-color), var(--primary-color))' } : {}}
            >
              {genre.coverUrl && (
                <img 
                  src={genre.coverUrl} 
                  alt={genre.name} 
                />
              )}
            </div>
          ))}
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
