const express = require('express')
const request = require('request')

const app = express()

app.use(express.static(__dirname + "/src"))
var port = process.env.PORT || 8080

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