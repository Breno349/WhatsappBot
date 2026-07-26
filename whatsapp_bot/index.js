import express from 'express'
import { init, running } from './run.js' 

const app = express()

const PORT = process.env.PORT ?? 3000

app.get('/', (req,res) => {
    if(running){
        res.status(200).send('Suceso').end()
    } else {
        res.status(400).send('Nao ta rodando').end()
    }
})

app.get('/start', (req,res) => {
    if(running){
        res.status(200).send('Suceso').end()
    } else {
        res.status(400).send('Nao ta rodando').end()
        init()
    }
})

app.listen(PORT, async () => {
    console.log('Running Web Bot http://0.0.0.0:'+PORT)
    init()
})