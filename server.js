const express = require('express')
const serveStatic = require('serve-static')
const request = require('request')

const app = express()

app.use(serveStatic(__dirname + "/war"))
var port = process.env.PORT || 3001

app.listen(port)
console.log('listening port ' + port)

app.get('/data', (req, res) => {
    console.log('get /data q=' + req.query.q)

    let apiURL = 'http://api.citybik.es/v2/networks'
    if(req.query.q !== 'networks') {
        apiURL += '/' + req.query.q
    }

    console.log(apiURL)

    request(apiURL, { json: true }, (err, res2, body) => {
        if (err) {
            console.log(err)
            res.json({error: 0})
        } else {
            //console.log(body)
            res.json(body)
        }
    })

    
    
})