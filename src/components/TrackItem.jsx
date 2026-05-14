import { useState, useEffect, useRef } from 'react';
import './TrackItem.css';

function TrackItem({ track, isPlaying, onEnded, onLoaded, onRef, isSoloed, isAnySoloActive, onToggleSolo, masterVolume }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;

    const loadFile = async () => {
      try {
        // Adiciona um timeout de 15 segundos para não travar o app
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(track.url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        if (!isMounted) return;

        objectUrl = URL.createObjectURL(blob);
        setAudioUrl(objectUrl);
      } catch (e) {
        console.error("Erro ao pré-carregar track:", track.name, e);
      } finally {
        if (isMounted && onLoaded) onLoaded();
      }
    };

    loadFile();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [track.url]);

  // Passa a referência do áudio para o Mixer assim que estiver pronto
  useEffect(() => {
    if (audioUrl && audioRef.current && onRef) {
      onRef(audioRef.current);
    }
  }, [audioUrl, onRef]);

  // Sincroniza o play/pause com o Mixer
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Autoplay prevent:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Lógica de Mute Efetivo (Solo)
  // Se houver algum Solo ativo, apenas as pistas em Solo tocam.
  const effectiveMute = isMuted || (isAnySoloActive && !isSoloed);

  // Atualiza volume e mute no elemento de áudio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume * masterVolume;
      audioRef.current.muted = effectiveMute;
    }
  }, [volume, masterVolume, effectiveMute]);

  // Limpa o nome para exibir melhor (ex: "01_Bateria.wav" -> "Bateria")
  const displayName = track.name.replace(/\.[^/.]+$/, "").replace(/^[0-9]+_/, "");

  return (
    <div className="track-item glass-panel">
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" onEnded={onEnded} />}
      
      <div className="track-info">
        <span className="track-name">{displayName}</span>
      </div>

      <div className="track-controls-radio">
        <div className="buttons-stack">
          <button 
            className={`btn-mute-mini ${isMuted ? 'active' : ''}`}
            onClick={() => setIsMuted(!isMuted)}
          >
            M
          </button>
          <button 
            className={`btn-solo-mini ${isSoloed ? 'active' : ''}`}
            onClick={onToggleSolo}
          >
            S
          </button>
        </div>
        
        <div className="fader-vertical-stack">
          <span className="track-vol-tag">VOL</span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="fader-vertical-radio"
            style={{
              background: `linear-gradient(to right, var(--accent-blue) ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`
            }}
          />
          <span className="track-vol-label-radio">{(volume * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}

export default TrackItem;
