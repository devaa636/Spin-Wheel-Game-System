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

 broadcast("Player eliminated: "+eliminated)

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

  broadcast("Game aborted: not enough players")

  return
 }

 players = result.map(p => p.user_id)

 shufflePlayers()

 broadcast("Game started")

 startElimination()


 })
}

module.exports = {
 startGame
}
