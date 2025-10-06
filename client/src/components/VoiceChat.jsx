import { useEffect, useRef } from 'react'
import { useVoice } from '../context/VoiceContext'
import { useGame } from '../context/GameContext'
import { motion, AnimatePresence } from 'framer-motion'

export default function VoiceChat({ onClose }) {
  const { 
    isMicEnabled, 
    isSpeaking, 
    peers, 
    togglePeerMute, 
    audioError 
  } = useVoice()
  const { room, playerName } = useGame()
  
  const audioRefs = useRef({})

  // Connecter les streams audio aux éléments audio
  useEffect(() => {
    Object.entries(peers).forEach(([socketId, peer]) => {
      if (peer.stream && audioRefs.current[socketId]) {
        const audioElement = audioRefs.current[socketId]
        audioElement.srcObject = peer.stream
        audioElement.muted = peer.isMuted || false
        
        // Forcer la lecture
        audioElement.play().catch(err => {
          console.warn('Erreur lecture audio:', err)
        })
        
        console.log('🔊 Audio connecté pour', peer.name, socketId)
      }
    })
  }, [peers])

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎤</span>
          <div>
            <h3 className="text-xl font-bold">Chat Vocal</h3>
            <p className="text-xs text-gray-400">
              {isMicEnabled ? '🟢 Micro activé' : '🔴 Micro désactivé'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-2xl hover:text-primary transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Erreur audio */}
      {audioError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">
            ⚠️ Erreur microphone : {audioError}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Vérifiez les permissions dans votre navigateur
          </p>
        </div>
      )}

      {/* Info */}
      {!isMicEnabled && !audioError && (
        <div className="mx-4 mt-4 p-3 bg-blue-500/10 border border-blue-500 rounded-lg">
          <p className="text-blue-400 text-sm">
            💡 Cliquez sur le bouton 🎤 pour activer le microphone
          </p>
        </div>
      )}

      {/* Vous */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
              isSpeaking ? 'bg-primary ring-4 ring-primary/50 animate-pulse' : 'bg-gray-700'
            }`}>
              👤
            </div>
            <div>
              <p className="font-semibold">{playerName} (Vous)</p>
              <p className="text-xs text-gray-400">
                {isMicEnabled ? (
                  isSpeaking ? '🎤 Vous parlez...' : '🎤 En écoute'
                ) : '🔇 Micro désactivé'}
              </p>
            </div>
          </div>

          {/* Volume indicator */}
          {isMicEnabled && (
            <div className="flex gap-1 items-end h-8">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={`w-2 rounded-t transition-all duration-100 ${
                    isSpeaking ? 'bg-primary' : 'bg-gray-700'
                  }`}
                  style={{
                    height: isSpeaking ? `${bar * 20}%` : '20%'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liste des autres joueurs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.keys(peers).length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-4xl mb-2">👥</p>
            <p>Aucun autre joueur en vocal</p>
            <p className="text-sm mt-2">
              Les autres joueurs apparaîtront ici quand ils activeront leur micro
            </p>
          </div>
        ) : (
          Object.entries(peers).map(([socketId, peer]) => (
            <motion.div
              key={socketId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`p-3 rounded-lg border transition-all ${
                peer.isSpeaking 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-gray-800 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar avec animation */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                    peer.isSpeaking 
                      ? 'bg-primary ring-4 ring-primary/50 scale-110' 
                      : peer.isMuted 
                      ? 'bg-gray-600' 
                      : 'bg-gray-700'
                  }`}>
                    {peer.isMuted ? '🔇' : '👤'}
                  </div>

                  <div>
                    <p className="font-semibold">{peer.name || 'Joueur'}</p>
                    <p className="text-xs text-gray-400">
                      {peer.isMuted ? '🔇 Muet (pour vous)' : 
                       peer.isSpeaking ? '🎤 Parle...' : '👂 En écoute'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Indicateur de volume */}
                  {peer.isSpeaking && !peer.isMuted && (
                    <div className="flex gap-1 items-end h-6">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className="w-1.5 bg-primary rounded-t"
                          style={{
                            height: `${Math.min(bar * (peer.volume || 0) / 10, 100)}%`,
                            minHeight: '20%'
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Bouton mute */}
                  <button
                    onClick={() => togglePeerMute(socketId)}
                    className={`px-3 py-1 rounded text-sm transition-colors ${
                      peer.isMuted 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={peer.isMuted ? 'Réactiver' : 'Couper le son'}
                  >
                    {peer.isMuted ? '🔇 Muet' : '🔊 Son'}
                  </button>
                </div>
              </div>

              {/* Audio element (caché) */}
              <audio
                ref={(el) => {
                  if (el) audioRefs.current[socketId] = el
                }}
                autoPlay
                playsInline
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Footer - Statistiques */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              👥 {Object.keys(peers).length + 1} joueur(s)
            </span>
            {isMicEnabled && (
              <span className="text-primary">
                • En vocal
              </span>
            )}
          </div>
          
          <div className="text-gray-400 text-xs">
            WebRTC • P2P
          </div>
        </div>
      </div>
    </div>
  )
}

