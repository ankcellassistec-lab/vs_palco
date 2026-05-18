import { useState, useEffect, useRef } from 'react';
import './TrackItem.css';

function TrackItem({ track, isPlaying, onEnded, onLoaded, onRef, isSoloed, isAnySoloActive, onToggleSolo, masterVolume }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);

  const [isReady, setIsReady] = useState(false);

  // Passa a referência do áudio para o Mixer
  useEffect(() => {
    if (audioRef.current && onRef) {
      onRef(audioRef.current);
    }
  }, [onRef]);

  const handleLoaded = () => {
    if (!isReady) {
      setIsReady(true);
      if (onLoaded) onLoaded();
    }
  };

  // NOTA: O play/pause NÃO é controlado aqui.
  // O MixerView chama .play()/.pause() diretamente via audioRefs para
  // garantir sincronização precisa de tempo. Controlar aqui também
  // causaria double-play e race condition de timing.

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
      <audio 
        ref={audioRef} 
        src={track.url} 
        preload="auto" 
        onEnded={onEnded} 
        onLoadedMetadata={handleLoaded}
        onError={(e) => {
          console.error("Erro no audio", track.name, e);
          handleLoaded(); // Evita travar a tela de loading se uma pista falhar
        }}
      />
      
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
