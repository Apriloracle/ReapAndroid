'use client';

import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { Web3Provider } from '@/components/Web3Provider'
import { SubdocumentProvider } from '@/contexts/SubdocumentContext'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Web3Provider>
      <SubdocumentProvider>
        <Component {...pageProps} />
      </SubdocumentProvider>
    </Web3Provider>
  )
}

export default MyApp
