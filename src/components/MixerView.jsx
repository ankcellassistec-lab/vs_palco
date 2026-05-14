import { useState, useEffect, useRef } from 'react';
import TrackItem from './TrackItem';

function MixerView({ song, onBack }) {
  const [tracks, setTracks] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [activeMedia, setActiveMedia] = useState('video'); // 'video' | 'pdf'
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [soloedTracks, setSoloedTracks] = useState([]); // Nomes das tracks em solo
  const [masterVolume, setMasterVolume] = useState(1); // 0 a 1
  const audioRefs = useRef([]);
  const videoRef = useRef(null);
  const mediaSectionRef = useRef(null);
  const [isMixerVisible, setIsMixerVisible] = useState(true);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Sincroniza todos os áudios e vídeo ao tempo do mestre
  const syncAllToMaster = () => {
    const master = videoRef.current || audioRefs.current[0];
    if (!master) return;
    const time = master.currentTime;
    if (videoRef.current && videoRef.current !== master) {
      videoRef.current.currentTime = time;
    }
    audioRefs.current.forEach(el => {
      if (Math.abs(el.currentTime - time) > 0.15) {
        el.currentTime = time;
      }
    });
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Resincrona após mudança de tela cheia (browser pode atrasar elementos ocultos)
      setTimeout(() => syncAllToMaster(), 150);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    if (song) {
      loadSongFiles(song);
    }

    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [song]);

  const loadSongFiles = async (songData) => {
    setIsLoading(true);
    setLoadedCount(0);
    try {
      const trackList = [];
      let videoUrl = null;
      let pdfUrl = null;

      // MODO NOVO: File System Access API (Navegador/Vercel)
      if (songData.isFileSystem && songData.handle) {
        for await (const entry of songData.handle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const name = entry.name.toLowerCase();
            const url = URL.createObjectURL(file);

            if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov')) {
              videoUrl = url;
            } else if (name.endsWith('.pdf')) {
              pdfUrl = url;
            } else if (name.endsWith('.wav') || name.endsWith('.mp3') || name.endsWith('.ogg')) {
              trackList.push({ name: entry.name, url: url });
            }
          }
        }
      } 
      // MODO ANTIGO: Servidor Local (Node.js) ou Fallback para Músicas na pasta Public
      else if (songData.path) {
        let files = null;
        
        // Tenta primeiro o servidor local (se estiver rodando no seu PC)
        try {
          const response = await fetch(`/api/local-dir?path=${songData.path}`);
          if (response.ok) {
            files = await response.json();
          }
        } catch (e) {
          // No Vercel, o fetch vai falhar, então usamos o fallback abaixo
        }

        // FALLBACK PARA VERCEL (Se o servidor local não responder)
        if (!files && songData.name.includes('Bijuteria')) {
          files = [
            { name: 'BASS - .mp3', isFile: true },
            { name: 'BIJUTERIA VIDEO.mp4', isFile: true },
            { name: 'Bijuteria - Bruno e Marrone.pdf', isFile: true },
            { name: 'CLICK 72 - .mp3', isFile: true },
            { name: 'CONGAS -.mp3', isFile: true },
            { name: 'DRUMS - .mp3', isFile: true },
            { name: 'EP - .mp3', isFile: true },
            { name: 'HH -  .mp3', isFile: true },
            { name: 'KICK - .mp3', isFile: true },
            { name: 'OVER - .mp3', isFile: true },
            { name: 'PAD .mp3', isFile: true },
            { name: 'PANDEROLA 01 -.mp3', isFile: true },
            { name: 'PANDEROLA 02 - .mp3', isFile: true },
            { name: 'PIANO - .mp3', isFile: true },
            { name: 'ROOM -.mp3', isFile: true },
            { name: 'SHAKER - .mp3', isFile: true },
            { name: 'SNARE - .mp3', isFile: true },
            { name: 'TONS - .mp3', isFile: true },
            { name: 'VIOLAO 01 LINE - .mp3', isFile: true },
            { name: 'VIOLAO 01 MIC - .mp3', isFile: true },
            { name: 'VIOLAO 01 MIX - .mp3', isFile: true },
            { name: 'VIOLAO 02 LINE -.mp3', isFile: true },
            { name: 'VIOLAO 02 MIC - .mp3', isFile: true },
            { name: 'VIOLAO 02 MIX -.mp3', isFile: true },
            { name: 'VIOLAO SOLO MIC - .mp3', isFile: true },
            { name: 'VIOLAO SOLO MIX - .mp3', isFile: true }
          ];
        }

        if (files) {
          for (const entry of files) {
            if (entry.isFile) {
              const name = entry.name.toLowerCase();
              const fileUrl = encodeURI(`/${songData.path}/${entry.name}`);
              
              if (name.endsWith('.mp4') || name.endsWith('.webm') || name.endsWith('.mov')) {
                videoUrl = fileUrl;
              } else if (name.endsWith('.pdf')) {
                pdfUrl = fileUrl;
              } else if (name.endsWith('.wav') || name.endsWith('.mp3') || name.endsWith('.ogg')) {
                trackList.push({ name: entry.name, url: fileUrl });
              }
            }
          }
        }
      }

      if (videoUrl) {
        setVideoFile(videoUrl);
        setActiveMedia('video');
      }

      if (pdfUrl) {
        setPdfFile(pdfUrl);
        if (!videoUrl) setActiveMedia('pdf');
      }

      setTracks(trackList);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handleTrackLoaded = () => {
    setLoadedCount(prev => prev + 1);
  };

  useEffect(() => {
    if (tracks.length > 0 && loadedCount >= tracks.length) {
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loadedCount, tracks]);

  const handleRegisterAudio = (el) => {
    if (el && !audioRefs.current.includes(el)) {
      audioRefs.current.push(el);
    }
  };

  // Sincroniza o tempo atual da música
  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        // Prioriza o vídeo como mestre de tempo, se não tiver, usa a primeira track
        const master = videoRef.current || audioRefs.current[0];
        if (master) {
          setCurrentTime(master.currentTime);
          if (master.duration && duration === 0) {
            setDuration(master.duration);
          }
        }
      }, 200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    
    if (videoRef.current) videoRef.current.currentTime = time;
    audioRefs.current.forEach(el => {
      el.currentTime = time;
    });
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggleSolo = (trackName) => {
    setSoloedTracks(prev => 
      prev.includes(trackName) 
        ? prev.filter(name => name !== trackName) 
        : [...prev, trackName]
    );
  };

  const togglePlay = () => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);

    if (newIsPlaying) {
      // --- DAR PLAY ---
      // 1. Pega o tempo atual do mestre para sincronizar todos antes de tocar
      const master = videoRef.current || audioRefs.current[0];
      const currentMasterTime = master ? master.currentTime : 0;

      // 2. Sincroniza e dá play no vídeo
      if (videoRef.current) {
        videoRef.current.currentTime = currentMasterTime;
        videoRef.current.play().catch(err => console.log('Video play error:', err));
      }

      // 3. Sincroniza e dá play em TODOS os áudios diretamente (evita atraso do useEffect)
      audioRefs.current.forEach(el => {
        el.currentTime = currentMasterTime;
        el.play().catch(e => console.log('Audio play error:', e));
      });

      // 4. Entra em tela cheia
      if (mediaSectionRef.current) {
        if (mediaSectionRef.current.requestFullscreen) {
          mediaSectionRef.current.requestFullscreen().catch(err => console.log("Erro ao entrar em tela cheia", err));
        } else if (mediaSectionRef.current.webkitRequestFullscreen) {
          mediaSectionRef.current.webkitRequestFullscreen();
        }
      }
    } else {
      // --- PAUSAR ---
      if (videoRef.current) videoRef.current.pause();
      audioRefs.current.forEach(el => el.pause());

      // Sai da tela cheia
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (mediaSectionRef.current) {
        if (mediaSectionRef.current.requestFullscreen) {
          mediaSectionRef.current.requestFullscreen().catch(err => console.log("Erro fullscreen", err));
        } else if (mediaSectionRef.current.webkitRequestFullscreen) {
          mediaSectionRef.current.webkitRequestFullscreen();
        }
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  // Funções para Swipe (Arraste Touch)
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeDistance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (swipeDistance > minSwipeDistance) {
      // Arrastou para a esquerda (Recolher)
      setIsMixerVisible(false);
    } else if (swipeDistance < -minSwipeDistance) {
      // Arrastou para a direita (Expandir)
      setIsMixerVisible(true);
    }
  };

  return (
    <div className={`mixer-container ${!isMixerVisible ? 'mixer-collapsed' : ''}`}>
      {/* Botão de Toggle Flutuante */}
      <button 
        className="mixer-toggle-btn" 
        onClick={() => setIsMixerVisible(!isMixerVisible)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isMixerVisible ? '❮' : '❯'}
      </button>

      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          top: 0, left: 0, right: 0, bottom: 0, 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          flexDirection: 'column', 
          background: 'var(--bg-main)' 
        }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1.5rem', color: 'var(--primary-color)', fontWeight: 'bold', fontSize: '1.2rem' }}>
            Preparando Palco...
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            {tracks.length > 0 ? `Carregando tracks: ${loadedCount} de ${tracks.length}` : 'Buscando arquivos...'}
          </p>
        </div>
      )}

      {/* O Header superior foi removido para ganhar espaço vertical */}

      <div className="mixer-main-content" style={{ height: '100%' }}>
        {/* Lateral Esquerda: Tudo em um só lugar */}
        <div className="mixer-section">
          
          {/* Topo do Mixer Ultra-Compacto (Apenas Play e Título) */}
          <div className="mixer-sidebar-header-compact">
            <button className="btn-play-medium" onClick={togglePlay}>
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" style={{ marginLeft: '2px' }}>
                  <path d="M8 5.14v13.72c0 .89 1.05 1.35 1.72.77l9.14-6.86a1 1 0 0 0 0-1.54L9.72 4.37c-.67-.58-1.72-.12-1.72.77z" />
                </svg>
              )}
            </button>
            <h2 className="song-title-sidebar-compact">{song ? song.name : 'Carregando...'}</h2>
          </div>

          {/* Área de Controles Master Compactos (Horizontal) */}
          <div className="master-controls-horizontal">
            <div className="control-row">
              <span className="control-label">VOL</span>
              <input 
                type="range" 
                className="horizontal-slider"
                min="0" 
                max="1" 
                step="0.01" 
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              />
              <span className="control-value">{(masterVolume * 100).toFixed(0)}%</span>
            </div>

            <div className="control-row">
              <span className="control-label">TIME</span>
              <input 
                type="range" 
                className="horizontal-slider"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
              />
              <span className="control-value time-font">{formatTime(currentTime)}</span>
            </div>
          </div>

          <div className="tracks-separator">TRACKS</div>

          <div className="tracks-container">
            {tracks.length === 0 ? (
              <p>Buscando arquivos...</p>
            ) : (
              tracks.map((t, index) => (
                <TrackItem 
                  key={index} 
                  track={t} 
                  isPlaying={isPlaying} 
                  onLoaded={handleTrackLoaded} 
                  onRef={handleRegisterAudio}
                  isSoloed={soloedTracks.includes(t.name)}
                  isAnySoloActive={soloedTracks.length > 0}
                  onToggleSolo={() => handleToggleSolo(t.name)}
                  masterVolume={masterVolume}
                />
              ))
            )}
          </div>
        </div>

        {/* Metade Direita: Vídeo ou PDF */}
        <div className="video-section" ref={mediaSectionRef}>
          <div style={{ width: '100%', height: '100%', display: activeMedia === 'video' ? 'block' : 'none' }}>
            {videoFile ? (
              <video 
                ref={videoRef}
                src={videoFile} 
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
                muted 
                onLoadedMetadata={(e) => setDuration(e.target.duration)}
                onEnded={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.log(err));
                  }
                  onBack();
                }}
              />
            ) : (
              <div className="empty-state" style={{color: 'var(--text-muted)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <p>Nenhum vídeo disponível.</p>
              </div>
            )}
          </div>

          <div style={{ width: '100%', height: '100%', display: activeMedia === 'pdf' ? 'block' : 'none' }}>
            {pdfFile ? (
              <iframe 
                src={`${pdfFile}#toolbar=0&navpanes=0&scrollbar=0`}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#fff' }}
                title="Partitura"
              />
            ) : (
              <div className="empty-state" style={{color: 'var(--text-muted)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <p>Nenhuma partitura disponível.</p>
              </div>
            )}
          </div>
          
          <div className="media-top-controls">
            <button className="btn-secondary float-btn-back" onClick={onBack}>
              ⬅ Menu Iniciar
            </button>
          </div>

          {/* Controles flutuantes de mídia (Bottom) */}
          <div className="media-float-controls">
            {(videoFile && pdfFile) && (
              <button 
                className="btn-secondary float-btn" 
                onClick={() => {
                  // Resincrona todas as tracks antes de trocar a visualização
                  syncAllToMaster();
                  setActiveMedia(activeMedia === 'video' ? 'pdf' : 'video');
                }}
              >
                {activeMedia === 'video' ? '📄 Partitura' : '🎬 Vídeo'}
              </button>
            )}
            <button className="btn-secondary float-btn" onClick={toggleFullscreen}>
              {isFullscreen ? '⬅ Voltar' : '⛶ Tela Cheia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MixerView;
