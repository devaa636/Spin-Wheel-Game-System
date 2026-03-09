const http = require("http")
const url = require("url")

const server = http.createServer((req,res)=>{

 const parsedUrl = url.parse(req.url,true)

 if(parsedUrl.pathname === "/createWheel"){
  createWheel(res)
 }

})

server.listen(3000,()=>{
 console.log("Server running on port 3000")
})

const db = require("./db")

function createWheel(res){

 db.query(
 "SELECT * FROM spin_wheels WHERE status='waiting'",
 (err,result)=>{

 if(result.length>0){
   res.end("Wheel already active")
   return
 }

 db.query(
 "INSERT INTO spin_wheels(entry_fee,status) VALUES (100,'waiting')"
 )

 res.end("Wheel created")

 })

}