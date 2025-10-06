import { motion } from 'framer-motion'
import { useGame } from '../context/GameContext'
import { useVoice } from '../context/VoiceContext'

export default function PlayersList() {
  const { room, playerName } = useGame()
  const { isMicEnabled, isSpeaking, peers } = useVoice()

  if (!room || !room.players) return null

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-4 top-24 bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700 p-4 z-30 min-w-[200px] shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-700">
        <span className="text-2xl">👥</span>
        <div>
          <h3 className="font-bold text-white">Équipe</h3>
          <p className="text-xs text-gray-400">{room.players.length} joueur(s)</p>
        </div>
      </div>

      <div className="space-y-2">
        {room.players.map((player, index) => {
          const isMe = player.name === playerName
          // Retrouver l'entrée peer par nom (côté écouteur on n'a pas forcement le socketId)
          const peerEntry = Object.entries(peers).find(([_, p]) => p.name === player.name)
          const peerVoice = peerEntry?.[1]

          // Est considéré "en vocal" si :
          // - c'est moi et mon micro est actif
          // - OU une connexion WebRTC existe pour ce joueur (entry présente), même sans stream (mode écoute seule)
          // - OU nous recevons déjà son stream
          const isInVoice = isMe ? isMicEnabled : Boolean(peerVoice) || Boolean(peerVoice?.stream)

          const isPlayerSpeaking = isMe ? isSpeaking : peerVoice?.isSpeaking

          return (
            <motion.div
              key={player.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                isPlayerSpeaking 
                  ? 'bg-primary/20 ring-2 ring-primary/50' 
                  : 'bg-gray-800/50'
              }`}
            >
              <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                isPlayerSpeaking 
                  ? 'bg-primary scale-110 ring-4 ring-primary/30' 
                  : isInVoice
                  ? 'bg-gray-600'
                  : 'bg-gray-700'
              }`}>
                {player.isHost && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-xs">
                    👑
                  </div>
                )}
                👤
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate text-white">
                    {player.name}
                    {isMe && <span className="text-primary ml-1">(Vous)</span>}
                  </p>
                  {player.isHost && (
                    <span className="text-xs text-yellow-500">Hôte</span>
                  )}
                </div>
                
                <div className="flex items-center gap-1 mt-0.5">
                  {isMe ? (
                    isMicEnabled ? (
                      isSpeaking ? (
                        <span className="text-xs text-primary">🎤 Vous parlez...</span>
                      ) : (
                        <span className="text-xs text-gray-300">🎤 Micro activé</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-500">🔇 Micro désactivé</span>
                    )
                  ) : isInVoice ? (
                    peerVoice?.stream ? (
                      peerVoice?.isSpeaking ? (
                        <span className="text-xs text-primary">🎤 Parle...</span>
                      ) : (
                        <span className="text-xs text-gray-300">🎧 En écoute</span>
                      )
                    ) : (
                      <span className="text-xs text-gray-400">🎧 En écoute</span>
                    )
                  ) : (
                    <span className="text-xs text-gray-500">🔇 Pas en vocal</span>
                  )}
                </div>
              </div>

              {isPlayerSpeaking && (
                <div className="flex gap-0.5 items-end h-6">
                  {[1, 2, 3].map((bar) => (
                    <motion.div
                      key={bar}
                      animate={{ height: ['20%', '80%', '40%', '90%', '30%'] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: bar * 0.1 }}
                      className="w-1 bg-primary rounded-t"
                      style={{ minHeight: '20%' }}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {Object.keys(peers).length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">🎤 En vocal</span>
            <span className="text-primary font-bold">
              {Object.keys(peers).length + (isMicEnabled ? 1 : 0)}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

