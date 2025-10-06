import { createContext, useContext, useState } from 'react'

const GameContext = createContext()

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

export const GameProvider = ({ children }) => {
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [room, setRoom] = useState(null)
  const [currentRoom, setCurrentRoom] = useState(1)
  const [gameStarted, setGameStarted] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [messages, setMessages] = useState([])
  const [gameResult, setGameResult] = useState(null)

  const resetGame = () => {
    setRoom(null)
    setCurrentRoom(1)
    setGameStarted(false)
    setStartTime(null)
    setMessages([])
    setGameResult(null)
  }

  const addMessage = (message) => {
    setMessages(prev => [...prev, message])
  }

  const value = {
    playerName,
    setPlayerName,
    roomCode,
    setRoomCode,
    room,
    setRoom,
    currentRoom,
    setCurrentRoom,
    gameStarted,
    setGameStarted,
    startTime,
    setStartTime,
    messages,
    addMessage,
    setMessages,
    gameResult,
    setGameResult,
    resetGame
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

