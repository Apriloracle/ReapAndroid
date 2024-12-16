import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <script src="https://unpkg.com/ml5@0.12.2/dist/ml5.min.js" defer></script>
          <link rel="manifest" href="/manifest.json" />
        </Head>
        <body>
          <Main />
          <NextScript />
  <script src="/src/install-tracking.js" defer></script>
        </body>
      </Html>
    )
  }
}

export default MyDocument
