import * as linkify from 'linkifyjs'
import { spawn } from 'node:child_process'

export const extractNumbers = (content: string): string[] => {
  const numbers = content.match(/-?\d+/g);
  return numbers ?? [];
}

export const extractUrls = (content: string): string[] =>
  linkify.find(content).map((url) => url.value)

export const removeDuplicates = <T>(arr: T[]): T[] => [...new Set(arr)]

export const verifyIfFFMPEGisInstalled = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version'])
    proc.on('error', () => resolve(false))
    proc.stdout.on('data', data => {
      if (data.toString().toLowerCase().includes('ffmpeg'))
        resolve(true)
    })
    proc.stderr.on('data', data => {
      if (data.toString().toLowerCase().includes('ffmpeg'))
        resolve(true)
    })
    proc.on('close', code => {
      if (code !== 0) resolve(false)
    })
  })
}
