const express = require('express')

const app = express()

app.use(express.static(__dirname + "/src"))
var port = process.env.PORT || 8080

app.listen(port)
console.log('listening port ' + port)

app.get('/data', async (req, res) => {
    console.log('get /data q=' + req.query.q)

    let apiURL = 'http://api.citybik.es/v2/networks'
    if(req.query.q !== 'networks') {
        apiURL += '/' + req.query.q
    }

    console.log(apiURL)

    const response = await fetch(apiURL)
    if (!response.ok) {
        console.error('an error occured', response.status)
    } else {
        const data = await response.json()
        res.json(data)
    }
})