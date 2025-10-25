import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import tenantsRouter from './routes/tenants.js'
import projectsRouter from './routes/projects.js'
import ticketsRouter from './routes/tickets.js'

dotenv.config()

const app = express()

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(origin => origin.trim()).filter(Boolean) ?? ['http://localhost:5173']

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    console.warn(`Origin ${origin} is not allowed`)
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/tenants', tenantsRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/tickets', ticketsRouter)

const port = Number(process.env.PORT) || 4000

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'Unexpected server error', details: err.message })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
