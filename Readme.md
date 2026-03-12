# Spin Wheel Backend System

## Overview
This project implements a **backend system for a Spin Wheel game** where users join by paying an entry fee and players are eliminated at intervals until a winner remains.

The system handles:
- wheel lifecycle management
- coin transactions
- player elimination
- real-time updates using WebSockets
- database persistence

---

# Tech Stack

Backend:
- Node.js
- Native HTTP module (no Express)

Database:
- MySQL

Realtime Updates:
- WebSockets (ws library)

Testing:
- Manual API testing using browser/Postman

---

# Project Architecture

```
spin-wheel
│
├── server.js
├── gameEngine.js
├── websocket.js
├── db.js
│
├── README.md
```

### server.js
Handles HTTP API routes.

### gameEngine.js
Contains the game logic:
- game start
- player elimination
- winner declaration

### websocket.js
Manages real-time WebSocket communication.

### db.js
Handles MySQL database connection.

---

# Game Flow

```
Admin creates wheel
        ↓
Users join the wheel
        ↓
Entry fee deducted
        ↓
3 minute timer
        ↓
Game starts automatically
        ↓
Players eliminated every 7 seconds
        ↓
Last player wins
        ↓
Winner receives prize pool
```

---

# Database Schema

### users

```
id
name
coins
```

---

### spin_wheels

```
id
entry_fee
status
winner_pool
admin_pool
app_pool
```

Statuses:

```
WAITING
STARTED
FINISHED
ABORTED
```

---

### participants

```
id
user_id
wheel_id
eliminated
```

---

### transactions

```
id
user_id
amount
type
wheel_id
```

Types:

```
JOIN
WIN
REFUND
```

---

# API Endpoints

## Create Wheel

```
GET /createWheel
```

Example:

```
http://localhost:3000/createWheel
```

Response:

```
Wheel created
```

---

## Join Wheel

```
GET /join?userId=1
```

Example:

```
http://localhost:3000/join?userId=1
```

Possible responses:

```
Joined successfully
User already joined
Not enough coins
Game already started
```

---

## Get Game Status

```
GET /status
```

Example:

```
http://localhost:3000/status
```

Response example:

```json
{
  "id": 1,
  "status": "STARTED"
}
```

---

# WebSocket Events

WebSocket server runs on:

```
ws://localhost:8080
```

Events broadcast to clients:

```
Game started
Player eliminated: <userId>
Winner declared: <userId>
Winner credited <coins>
```

---

# How to Run the Project

### 1 Install dependencies

```
npm install
```

---

### 2 Configure database

Create a MySQL database.

Update credentials in:

```
db.js
```

---

### 3 Run the server

```
node server.js
```

Expected logs:

```
MySQL Database connected
WebSocket server running
Server running
```

---

# Manual Testing Guide

## 1 Create Wheel

```
http://localhost:3000/createWheel
```

---

## 2 Join Users

```
http://localhost:3000/join?userId=1
http://localhost:3000/join?userId=2
http://localhost:3000/join?userId=3
```

---

## 3 Game Start

After **3 minutes**, the game automatically starts.

Console log:

```
Game starting...
```

---

## 4 Player Elimination

Every **7 seconds**, one player is eliminated.

Example logs:

```
Player eliminated: 2
Player eliminated: 1
```

---

## 5 Winner Declaration

Final log:

```
Winner declared: 3
Winner credited 700 coins
```

---

## 6 Verify Database

Check transactions:

```
SELECT * FROM transactions;
```

Check winner coins:

```
SELECT coins FROM users WHERE id=winner_id;
```

---

# Edge Cases Handled

The system handles several edge cases:

- duplicate player joins
- insufficient user balance
- joining after game start
- fewer than 3 players joining
- automatic refunds when game aborts
- transaction logging
- multiple wheel prevention

---

# Improvements Possible

Future enhancements could include:

- authentication
- REST API versioning
- frontend interface
- containerization using Docker
- automated test suite

---

# Author

Devansh Agrawal  
Backend System Design Project