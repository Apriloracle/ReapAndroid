/* eslint-env browser */

let ws = null
if (typeof window !== 'undefined') {
  ws = window.WebSocket
}

export const WebSocket = ws
