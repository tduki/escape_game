# 🏗️ Architecture du Projet

## Vue d'Ensemble

EcoSpy - Mission Climat utilise une architecture client-serveur basée sur WebSocket pour la communication temps réel.

```
┌─────────────────┐         WebSocket (Socket.io)      ┌─────────────────┐
│                 │◄──────────────────────────────────►│                 │
│  React Client   │                                    │  Node.js Server │
│  (Port 3000)    │         HTTP/HTTPS                 │  (Port 5000)    │
│                 │◄──────────────────────────────────►│                 │
└─────────────────┘                                    └─────────────────┘
        │                                                        │
        │                                                        │
        ▼                                                        ▼
┌─────────────────┐                                     ┌─────────────────┐
│  React Router   │                                     │  Game Manager   │
│  Context API    │                                     │  Socket Events  │
│  Components     │                                     │  Game Logic     │
└─────────────────┘                                     └─────────────────┘
```

---

## Frontend Architecture

### Technologies Utilisées

- **React 18** : Framework principal
- **Vite** : Build tool ultra-rapide
- **React Router** : Navigation SPA
- **Socket.io Client** : Communication temps réel
- **Tailwind CSS** : Styling utilitaire
- **Framer Motion** : Animations

### Structure des Composants

```
App.jsx (Router)
│
├── Home.jsx
│   └── Formulaires de création/connexion
│
├── Lobby.jsx
│   ├── Liste des joueurs
│   └── Bouton de démarrage
│
├── Game.jsx
│   ├── Timer.jsx
│   ├── Chat.jsx
│   └── rooms/
│       ├── Room1.jsx (Empreinte Carbone)
│       ├── Room2.jsx (Memory Océan)
│       ├── Room3.jsx (Déforestation Coopérative)
│       └── Room4.jsx (Mix Énergétique)
│
└── Debriefing.jsx
    ├── Résultats
    └── Contenu éducatif
```

### State Management

**Context API utilisée :**

1. **SocketContext** : Gestion de la connexion WebSocket
   ```javascript
   { socket, connected }
   ```

2. **GameContext** : État global du jeu
   ```javascript
   {
     playerName, roomCode, room,
     currentRoom, gameStarted, startTime,
     messages, gameResult
   }
   ```

### Flux de Données

1. **Création de partie :**
   ```
   User Input → emit('create-room') → Server
   Server → emit('room-created') → Update GameContext
   Navigate to /lobby
   ```

2. **Soumission de réponse :**
   ```
   User Answer → emit('submit-answer') → Server validates
   Server → emit('puzzle-solved') OR emit('wrong-answer')
   Update UI accordingly
   ```

---

## Backend Architecture

### Technologies Utilisées

- **Node.js** : Runtime JavaScript
- **Express** : Framework web
- **Socket.io** : WebSocket server
- **Helmet** : Sécurité HTTP headers
- **CORS** : Cross-Origin Resource Sharing

### Structure du Serveur

```
server/index.js
│
├── Express App Setup
│   ├── Middleware (helmet, cors, json)
│   └── HTTP Routes (/health)
│
├── Socket.io Server
│   ├── Connection handler
│   ├── Event listeners
│   └── Broadcast logic
│
└── Game Manager (gameLogic.js)
    ├── Room management
    ├── Player management
    ├── Answer validation
    └── Game state
```

### GameManager Class

**Responsabilités :**
- Créer et gérer les parties (rooms)
- Ajouter/retirer des joueurs
- Valider les réponses
- Gérer le temps et la progression

**Structure de données Room :**
```javascript
{
  code: string,           // Code unique (ex: "ABC123")
  host: string,           // Socket ID de l'hôte
  players: Array,         // Liste des joueurs
  status: string,         // 'waiting' | 'playing' | 'completed'
  currentRoom: number,    // 1-4
  startTime: number,      // Timestamp de départ
  endTime: number,        // Timestamp de fin
  solvedPuzzles: Array    // Historique des énigmes résolues
}
```

---

## Communication Temps Réel

### Événements Socket.io

**Client → Server :**
| Événement | Payload | Description |
|-----------|---------|-------------|
| `create-room` | `{ playerName }` | Créer une nouvelle partie |
| `join-room` | `{ roomCode, playerName }` | Rejoindre une partie |
| `start-game` | `{ roomCode }` | Démarrer la partie |
| `submit-answer` | `{ roomCode, roomNumber, answer }` | Soumettre une réponse |
| `send-message` | `{ roomCode, playerName, message }` | Envoyer un message chat |
| `share-clue` | `{ roomCode, clueData }` | Partager un indice (Salle 3) |

**Server → Client :**
| Événement | Payload | Description |
|-----------|---------|-------------|
| `room-created` | `{ room }` | Confirmation de création |
| `room-joined` | `{ room }` | Confirmation de connexion |
| `join-error` | `{ message }` | Erreur de connexion |
| `game-started` | `{ startTime, currentRoom }` | Partie démarrée |
| `player-joined` | `{ players, newPlayer }` | Nouveau joueur |
| `player-left` | `{ players, leftPlayer }` | Joueur parti |
| `puzzle-solved` | `{ roomNumber, nextRoom }` | Énigme résolue |
| `wrong-answer` | `{ message }` | Réponse incorrecte |
| `game-completed` | `{ finalTime, players }` | Jeu terminé |
| `new-message` | `{ playerName, message, timestamp }` | Nouveau message chat |
| `clue-shared` | `{ clueData }` | Indice partagé |

---

## Sécurité

### Mesures Implémentées

1. **Helmet** : Protection contre les vulnérabilités web courantes
   - XSS (Cross-Site Scripting)
   - Clickjacking
   - MIME sniffing

2. **CORS** : Contrôle des origines autorisées
   ```javascript
   cors({
     origin: CLIENT_URL,
     credentials: true
   })
   ```

3. **WebSocket Sécurisé (WSS)** : En production, utiliser HTTPS/WSS

4. **Validation côté serveur** : Toutes les réponses sont vérifiées par le serveur

5. **Pas de données personnelles** : Aucune information sensible stockée

### Points d'Amélioration Future

- [ ] Authentification JWT
- [ ] Rate limiting sur les soumissions
- [ ] Chiffrement des messages chat
- [ ] Logs d'audit
- [ ] Protection contre les bots

---

## Performances

### Optimisations Frontend

1. **Code Splitting** : React Router lazy loading possible
2. **Memoization** : Utiliser `useMemo` et `useCallback` si nécessaire
3. **Images optimisées** : Utiliser WebP et lazy loading
4. **Bundle Size** : Vite optimise automatiquement

### Optimisations Backend

1. **Event-driven** : Socket.io utilise les événements Node.js
2. **Non-blocking I/O** : Toutes les opérations sont asynchrones
3. **Memory Management** : Nettoyage automatique des rooms vides
4. **Connection pooling** : Socket.io gère les connexions efficacement

### Métriques Cibles

- **Temps de chargement initial** : < 2s
- **Latence WebSocket** : < 100ms
- **Capacité** : 100+ parties simultanées
- **Connexions par partie** : 4 joueurs max

---

## Scalabilité

### Limitations Actuelles

- Un seul serveur (pas de cluster)
- État en mémoire (pas de base de données)
- 100+ parties simultanées max

### Architecture Scalable (Future)

```
                   ┌─────────────┐
                   │  Load       │
    Clients ──────►│  Balancer   │
                   └──────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼────┐    ┌────▼─────┐   ┌────▼─────┐
    │ Server 1 │    │ Server 2 │   │ Server 3 │
    └─────┬────┘    └────┬─────┘   └────┬─────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                   ┌─────▼─────┐
                   │   Redis   │
                   │  (Session)│
                   └───────────┘
```

**Technologies pour scale :**
- **Redis** : Session store partagé
- **Socket.io-redis adapter** : Communication inter-serveurs
- **PM2 Cluster mode** : Plusieurs workers Node.js
- **PostgreSQL** : Stockage persistant des parties

---

## Tests

### Stratégie de Test (À implémenter)

1. **Tests Unitaires** (Jest)
   - Logique GameManager
   - Validation des réponses
   - Calculs (empreinte carbone, etc.)

2. **Tests d'Intégration** (Supertest)
   - Routes HTTP
   - Événements Socket.io

3. **Tests E2E** (Playwright)
   - Parcours utilisateur complet
   - Multijoueur simulé

4. **Tests de Charge** (Artillery)
   - 100+ connexions simultanées
   - Latence sous charge

---

## Monitoring (Production)

### Métriques à Surveiller

- **Uptime** : Disponibilité du serveur
- **Response time** : Latence WebSocket
- **Active connections** : Nombre de joueurs
- **Memory usage** : Consommation RAM
- **Error rate** : Taux d'erreurs

### Outils Recommandés

- **PM2** : Gestion de processus + monitoring
- **New Relic** / **DataDog** : APM complet
- **Sentry** : Tracking d'erreurs
- **Grafana** : Dashboards custom

---

## Déploiement

### Environnements

1. **Développement** : localhost
2. **Staging** : Vercel + Render (gratuit)
3. **Production** : AWS / GCP / Azure

### CI/CD Pipeline

```
Git Push
    │
    ├──► GitHub Actions
    │        │
    │        ├──► Run Tests
    │        ├──► Build
    │        └──► Deploy
    │
    └──► Vercel (Frontend)
         Render (Backend)
```

---

## Maintenance

### Backlog Technique

- [ ] Ajouter tests automatisés
- [ ] Implémenter base de données
- [ ] Ajouter système de replay
- [ ] Mode spectateur
- [ ] Statistiques globales
- [ ] Leaderboard
- [ ] Plus d'énigmes
- [ ] Mode solo

### Versions Futures

**v2.0 :**
- Sauvegarde persistante
- Authentification
- Profils joueurs

**v3.0 :**
- Mode tournoi
- Éditeur d'énigmes
- API publique

---

Cette architecture permet de créer un jeu multijoueur performant, sécurisé et évolutif tout en restant simple à comprendre et à maintenir.

