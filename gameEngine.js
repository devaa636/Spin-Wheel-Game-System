const db = require("./db")
const {broadcast} = require("./websocket")

let players = []
let eliminationInterval = null

// Pool distribution percentages (configurable from database)
const POOL_CONFIG = {
  winner: 70,    // 70% to winner
  admin: 20,     // 20% to admin
  app: 10        // 10% to app pool
}

function shufflePlayers(){
 players.sort(()=>Math.random()-0.5)
}

function startElimination(){

 eliminationInterval = setInterval(()=>{
  eliminatePlayer()
 },7000)

}


function eliminatePlayer(){

 if(players.length === 1){

  clearInterval(eliminationInterval)

  declareWinner(players[0])

  return
 }

 const eliminated = players.pop()

 db.query(
 "UPDATE participants SET eliminated=true WHERE user_id=?",
 [eliminated]
 )

 broadcast("Player eliminated: " + eliminated)

}

function declareWinner(winnerId){

 broadcast("Winner declared: " + winnerId)

 // update wheel status
 db.query(
 "UPDATE spin_wheels SET status='FINISHED' WHERE status='STARTED'"
 )

 db.query(
 "SELECT id, winner_pool, admin_pool, app_pool FROM spin_wheels WHERE status='FINISHED' ORDER BY id DESC LIMIT 1",
 (err,result)=>{

 if(err || result.length === 0){
  console.log("Error fetching wheel info")
  return
 }

 const winnerAmount = result[0].winner_pool
 const adminAmount = result[0].admin_pool
 const appAmount = result[0].app_pool
 const wheelId = result[0].id

 // Credit winner coins
 db.query(
 "UPDATE users SET coins = coins + ? WHERE id=?",
 [winnerAmount,winnerId],
 (err)=>{

  if(err){
   console.log("Error crediting winner coins")
   return
  }

  // Record transaction for winner
  db.query(
  "INSERT INTO transactions(user_id,amount,type,wheel_id) VALUES (?,?,?,?)",
  [winnerId,winnerAmount,"WIN",wheelId],
  (err)=>{
   if(err){
    console.log("Error recording win transaction")
   }
   broadcast("Winner credited " + winnerAmount + " coins")
  })

 })

 // Credit admin pool (to admin user with id=1, adjust as needed)
 db.query(
 "UPDATE users SET coins = coins + ? WHERE id=1",
 [adminAmount],
 (err)=>{

  if(err){
   console.log("Error crediting admin pool")
   return
  }

  // Record transaction for admin
  db.query(
  "INSERT INTO transactions(user_id,amount,type,wheel_id) VALUES (?,?,?,?)",
  [1,adminAmount,"ADMIN_POOL",wheelId],
  (err)=>{
   if(err){
    console.log("Error recording admin transaction")
   }
   broadcast("Admin received pool: " + adminAmount + " coins")
  })

 })

 // Note: App pool can be stored/tracked separately or added to system account
 // For now, we just track it in the database
 db.query(
 "INSERT INTO transactions(user_id,amount,type,wheel_id) VALUES (?,?,?,?)",
 [0,appAmount,"APP_POOL",wheelId],
 (err)=>{
  if(err){
   console.log("Error recording app pool transaction")
  }
 })

 })

}

function refundPlayers(){

 // Get the entry fee and wheel id from the aborted wheel
 db.query(
 "SELECT id, entry_fee FROM spin_wheels WHERE status='ABORTED' ORDER BY id DESC LIMIT 1",
 (err,result)=>{

  if(err || result.length === 0){
   console.log("Error fetching wheel entry fee")
   return
  }

  const entryFee = result[0].entry_fee
  const wheelId = result[0].id

  // Get participants from this specific wheel
  db.query(
  "SELECT * FROM participants WHERE wheel_id=?",
  [wheelId],
  (err,result)=>{

  if(err || result.length === 0){
   console.log("Error fetching participants")
   return
  }

  result.forEach(player=>{

   // Refund coins to user
   db.query(
   "UPDATE users SET coins = coins + ? WHERE id=?",
   [entryFee,player.user_id],
   (err)=>{
    if(err){
     console.log("Error refunding coins to user: " + player.user_id)
     return
    }

    // Record refund transaction
    db.query(
    "INSERT INTO transactions(user_id,amount,type,wheel_id) VALUES (?,?,?,?)",
    [player.user_id,entryFee,"REFUND",wheelId],
    (err)=>{
     if(err){
      console.log("Error recording refund transaction for user: " + player.user_id)
     }
    })

   })

  })

  broadcast("Game aborted. Coins refunded to all participants")

  })

 })

}

function startGame(){
 console.log("Game starting...")

 // Get the current active wheel
 db.query(
 "SELECT id FROM spin_wheels WHERE status='WAITING' ORDER BY id DESC LIMIT 1",
 (err,wheels)=>{

  if(err || wheels.length === 0){
   console.log("Error fetching active wheel")
   return
  }

  const wheelId = wheels[0].id

  // Get participants excluding admin (user_id != 1) for this specific wheel
  db.query(
  "SELECT * FROM participants WHERE wheel_id=? AND eliminated=false AND user_id != 1",
  [wheelId],
  (err,result)=>{

  if(err){
    console.log(err)
    return
  }

  if(result.length < 3){

   db.query(
   "UPDATE spin_wheels SET status='ABORTED' WHERE status='WAITING'"
   )

   broadcast("Game aborted: not enough players (need at least 3, got " + result.length + ")")

   refundPlayers()

   return
  }

  players = result.map(p => p.user_id)

  shufflePlayers()

  // Get entry fee and calculate all pools
  db.query(
  "SELECT entry_fee FROM spin_wheels WHERE status='WAITING'",
  (err,wheels)=>{

   if(err || wheels.length === 0){
    console.log("Error fetching wheel entry fee")
    return
   }

   const entryFee = wheels[0].entry_fee
   const totalCollected = entryFee * result.length

   // Calculate pool distribution
   const winnerPoolAmount = Math.floor((totalCollected * POOL_CONFIG.winner) / 100)
   const adminPoolAmount = Math.floor((totalCollected * POOL_CONFIG.admin) / 100)
   const appPoolAmount = totalCollected - winnerPoolAmount - adminPoolAmount // remaining goes to app pool

   console.log(`Total: ${totalCollected}, Winner: ${winnerPoolAmount}, Admin: ${adminPoolAmount}, App: ${appPoolAmount}`)

   // Update wheel with status and all pools
   db.query(
   "UPDATE spin_wheels SET status='STARTED', winner_pool=?, admin_pool=?, app_pool=? WHERE status='WAITING'",
   [winnerPoolAmount, adminPoolAmount, appPoolAmount]
   )

   broadcast(`Game started! Total Pool: ${totalCollected} (Winner: ${winnerPoolAmount}, Admin: ${adminPoolAmount}, App: ${appPoolAmount})`)

   startElimination()

  })

  })

 })
}

module.exports = {
 startGame
}
