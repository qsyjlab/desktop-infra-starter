import axios from 'axios'

const http = axios.create({
  baseURL: '/api',
  timeout: 12_000,
})

export default http
