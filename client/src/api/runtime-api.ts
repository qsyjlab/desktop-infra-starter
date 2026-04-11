import http from './http'

export interface HealthPayload {
  status: string
  mode: string
  timestamp: string
}

export interface PingPayload {
  pong: true
  timestamp: string
}

export interface DbTestPayload {
  connected: boolean
  mode: string
  detail: string
  timestamp: string
}

interface Envelope<T> {
  code: number
  message: string
  data: T
}

export async function getHealth() {
  const { data } = await http.get<Envelope<HealthPayload>>('/health')
  return data.data
}

export async function ping() {
  const { data } = await http.get<Envelope<PingPayload>>('/test/ping')
  return data.data
}

export async function testDb() {
  const { data } = await http.get<Envelope<DbTestPayload>>('/test/db')
  return data.data
}
