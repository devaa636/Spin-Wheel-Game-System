const http = require("http")
const url = require("url")

const server = http.createServer((req,res)=>{

 const parsedUrl = url.parse(req.url,true)

 if(parsedUrl.pathname === "/"){
  res.end("Spin Wheel Server Running")
 }

})

server.listen(3000,()=>{
 console.log("Server running on port 3000")
})