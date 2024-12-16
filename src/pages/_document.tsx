import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <script src="https://unpkg.com/ml5@0.12.2/dist/ml5.min.js" defer></script>
          <link rel="manifest" href="/manifest.json" />
<script async src="https://www.googletagmanager.com/gtag/js?id=G-RNVC517N8T"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-RNVC517N8T');
</script>
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
