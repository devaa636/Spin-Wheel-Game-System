const http = require("http")
const url = require("url")
const db = require("./db")
const {broadcast} = require("./websocket")

const { startGame } = require("./gameEngine")

const server = http.createServer((req,res)=>{

 const parsedUrl = url.parse(req.url,true)

 if(parsedUrl.pathname === "/createWheel"){
  createWheel(res)
 }

 if(parsedUrl.pathname === "/join"){

 const userId = parsedUrl.query.userId

 joinWheel(req,res,userId)

}

})

server.listen(3000,()=>{
 console.log("Server running on port 3000")
})


function createWheel(res){

 db.query(
 "SELECT * FROM spin_wheels WHERE status='waiting'",
 (err,result)=>{

 if(result.length>0){
   res.end("Wheel already active")
   return
 }

 db.query(
  "INSERT INTO spin_wheels(entry_fee,status) VALUES (100,'waiting')",
  (err,result)=>{

   console.log("Wheel created")

   // START 3 MINUTE TIMER HERE
   setTimeout(()=>{
     startGame()
   },180000)

   res.end("Wheel created")

  })

 })

}

function joinWheel(req,res,userId){

 // find active wheel
 db.query(
 "SELECT * FROM spin_wheels WHERE status='waiting'",
 (err,wheelResult)=>{

 if(wheelResult.length===0){
   res.end("No active wheel")
   return
 }

 const wheel = wheelResult[0]
 const wheelId = wheel.id
 const entryFee = wheel.entry_fee

 // check user coins
 db.query(
 "SELECT * FROM users WHERE id=?",
 [userId],
 (err,userResult)=>{

 const user = userResult[0]

 if(user.coins < entryFee){
   res.end("Not enough coins")
   return
 }

 // deduct coins
 db.query(
 "UPDATE users SET coins = coins - ? WHERE id=?",
 [entryFee,userId]
 )

 // add participant
 db.query(
 "INSERT INTO participants(user_id,wheel_id) VALUES (?,?)",
 [userId,wheelId]
 )

 // update prize pools
 const winnerShare = entryFee * 0.7
 const adminShare = entryFee * 0.2
 const appShare = entryFee * 0.1

 db.query(
 "UPDATE spin_wheels SET winner_pool = winner_pool + ?, admin_pool = admin_pool + ?, app_pool = app_pool + ? WHERE id=?",
 [winnerShare,adminShare,appShare,wheelId]
 )

 broadcast("User "+userId+" joined the wheel")

 res.end("Joined successfully")

 })

 })

}