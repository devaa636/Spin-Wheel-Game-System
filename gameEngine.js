const db = require("./db")
const {broadcast} = require("./websocket")

let players = []
let eliminationInterval = null

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
 "SELECT id, winner_pool FROM spin_wheels WHERE status='FINISHED' ORDER BY id DESC LIMIT 1",
 (err,result)=>{

 const winnerPool = result[0].winner_pool
 const wheelId = result[0].id

 // Credit coins to winner
 db.query(
 "UPDATE users SET coins = coins + ? WHERE id=?",
 [winnerPool,winnerId]
 )

 // Record transaction (ADD HERE)
 db.query(
 "INSERT INTO transactions(user_id,amount,type,wheel_id) VALUES (?,?,?,?)",
 [winnerId,winnerPool,"WIN",wheelId]
 )

 broadcast("Winner credited " + winnerPool + " coins")

 })

}

function refundPlayers(){

 db.query(
 "SELECT * FROM participants",
 (err,result)=>{

 result.forEach(player=>{

  db.query(
  "UPDATE users SET coins = coins + 100 WHERE id=?",
  [player.user_id]
  )

 })

 broadcast("Game aborted. Coins refunded")

 })

}

function startGame(){
 console.log("Game starting...")

 db.query(
 "SELECT * FROM participants WHERE eliminated=false",
 (err,result)=>{
 
 if(err){
   console.log(err)
   return
 }

 if(result.length < 3){

  db.query(
 "UPDATE spin_wheels SET status='ABORTED' WHERE status='WAITING'"
 )

  broadcast("Game aborted: not enough players")

  refundPlayers()

  return
 }

 players = result.map(p => p.user_id)

 shufflePlayers()

 db.query(
 "UPDATE spin_wheels SET status='STARTED' WHERE status='WAITING'"
 )

 broadcast("Game started")

 startElimination()


 })
}

module.exports = {
 startGame
}
