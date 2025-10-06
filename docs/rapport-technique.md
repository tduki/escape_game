# Rapport technique – EcoSpy: Mission Climat

Version: 1.0 • Workshop M1 2025‑2026 (EPSI/WIS)

## 1. Contexte et objectifs
EcoSpy est un escape game numérique éducatif, coopératif (2–4 joueurs), visant la sensibilisation aux enjeux environnementaux par 4 énigmes ludo‑pédagogiques, jouable en 30 minutes. Le produit doit être simple à déployer (localhost/cloud), robuste, et documenté.

## 2. Périmètre fonctionnel (MVP)
- Création/connexion à une partie via un code unique de 6 caractères
- Lobby d’attente, lancement par l’hôte, timer synchronisé (30 min)
- 4 salles (logique, memory, coopération via chat, optimisation)
- Chat textuel en temps réel
- Écran de débriefing éducatif

## 3. Architecture logicielle

### 3.1 Vue d’ensemble
```
┌────────────────────────────────────────────────────────────────┐
│                           Frontend (SPA)                       │
│ React 18 + Vite • React Router • Tailwind • Framer Motion      │
│ Socket.io-client (temps réel)                                  │
└──────────────┬─────────────────────────────────────────────────┘
               │ WebSocket (Socket.io) + HTTP (Express)
┌──────────────▼─────────────────────────────────────────────────┐
│                          Backend (API)                         │
│ Node.js + Express + Socket.io + Helmet + CORS                  │
│ In-memory GameManager (rooms, players, validation énigmes)     │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Dossiers
- `client/` SPA React (UI jeu, navigation, state local)
- `server/` API Express + Socket.io (événements temps réel, validation côté serveur)
- `docs/` documentation et livrables

### 3.3 Stack
- Front: React 18, React Router, TailwindCSS, Framer Motion, Socket.io‑client
- Back: Node.js, Express, Socket.io, Helmet, CORS
- Build: Vite (front), Node (back)

## 4. Flux principaux

### 4.1 Création et jonction de partie
1) Joueur A (hôte) → `create-room` (WS)
   - Backend: génération d’un code alphanumérique (6), création room en mémoire
   - Renvoi `room-created` (room, players)
2) Joueur B → `join-room` (WS) avec code et nom → `room-joined` ou `join-error`
3) Lobby: `player-joined`, `player-left` diffusés à la room

### 4.2 Lancement et progression
- Hôte → `start-game` → diffusion `game-started` (startTime, currentRoom)
- Réponses → `submit-answer` (roomCode, roomNumber, answer) → `puzzle-solved` ou `wrong-answer`
- Fin → `game-completed` (finalTime, players, solvedPuzzles)

### 4.3 Chat temps réel
- `send-message` → diffusion `new-message (playerName, message, timestamp)`

## 5. Modèle de données (in-memory)
```ts
Room {
  code: string,
  host: socketId,
  players: Array<{ id: socketId, name: string, isHost: boolean }>,
  status: 'waiting' | 'playing' | 'completed',
  currentRoom: number,     // 1..4
  startTime: number|null,  // timestamp
  endTime: number|null,
  solvedPuzzles: Array<{ roomNumber: number, solvedAt: number }>
}
```
Les rooms sont stockées dans `Map<string, Room>`. Aucune persistance disque (volatil).

## 6. Endpoints et événements

### 6.1 HTTP
- `GET /health` → `{ status, rooms, players }` (diagnostic dev/monitoring)

### 6.2 Socket.io – Principaux
- `create-room { playerName }` → `room-created { room }`
- `join-room { roomCode, playerName }` → `room-joined { room }` | `join-error { message }`
- `player-joined { players, newPlayer }` (broadcast)
- `player-left { players, leftPlayer }` (broadcast)
- `start-game { roomCode }` → `game-started { startTime, currentRoom }`
- `submit-answer { roomCode, roomNumber, answer }` →
  - `puzzle-solved { roomNumber, nextRoom, message }` | `wrong-answer { message }`
  - si `currentRoom > 4` → `game-completed { finalTime, players, solvedPuzzles }`
- `send-message { roomCode, playerName, message }` → `new-message { playerName, message, timestamp }`

## 7. Logique de jeu (validation)
- Validation côté serveur (anti‑triche)
- `getCorrectAnswers()` centralise les réponses acceptées (variant normalisée insensible à la casse)
- Transition de salle: `room.currentRoom = roomNumber + 1` si correct
- Fin de partie: calcul `finalTime = (end - start)/1000`

## 8. Sécurité & conformité
- `helmet()` pour headers (XSS, MIME sniffing, clickjacking)
- `cors({ origin: CLIENT_URL, credentials: true })` (dev)
- Aucune PII stockée; prénom/pseudo uniquement, volatile, pas de DB
- Entrées validées côté serveur (réponses énigmes)
- Pas d’upload, pas de fichiers exécutables, pas d’évaluation arbitraire

## 9. Performance et scalabilité
- Architecture événementielle (Socket.io), I/O non bloquant
- In‑memory: latence très basse pour 2–4 joueurs/room
- Scalabilité future:
  - Adapter Socket.io Redis + cluster Node
  - Persistance (PostgreSQL) pour scores, analytics
  - Load‑balancer L7 et sticky sessions

## 10. Déploiement

### 10.1 Local
- Server: `cd server && npm start` → http://localhost:5000/health
- Client: `cd client && npm run dev` → http://localhost:3000

### 10.2 Cloud (suggestion)
- Front: Vercel (ou Netlify)
- Back: Render (ou Railway/Fly.io)
- `vercel.json` (racine):
```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm ci || npm install",
  "outputDirectory": "client/dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
- `package.json` (racine): `postinstall`: `cd client && npm install`
- Env back: `CLIENT_URL` pointant sur le domaine front

## 11. Tests (manuels)
- 2–4 onglets navigateurs → création/jonction
- Résolution de chaque salle (bonnes/mauvaises réponses)
- Timer (arrive à 0 → redirection débriefing échec)
- Chat (émission/réception multi‑onglets)

## 12. Journalisation & diagnostic
- Logs serveurs: connexions, création/jonction, validations
- F12 Console front: events Socket.io, erreurs runtime, timer
- Endpoint /health pour monitoring simple

## 13. Risques & limites
- Stockage en mémoire: perte d’état en cas de crash/restart
- Pas d’authentification: à réserver à des usages académiques/démonstration
- Dépendance réseau: temps réel sensible à la latence

## 14. Roadmap technique (proposées)
- Persistance (scores, sessions), leaderboard
- Internationalisation (FR/EN)
- Tests unitaires (Jest) + E2E (Playwright)
- Accessibilité (lecteur d’écran, focus states renforcés)
- Thèmes graphiques et skins

## 15. Annexes
- Principaux fichiers:
  - Back: `server/index.js`, `server/gameLogic.js`
  - Front: `client/src/App.jsx`, `client/src/pages/Game.jsx`
- Données pédagogiques: ADEME, GIEC/IPCC, NASA Climate, AIE, Ocean Conservancy

— Fin du document —
