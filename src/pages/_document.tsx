import Document, { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <script src="https://unpkg.com/ml5@0.12.2/dist/ml5.min.js" defer />
          <link rel="manifest" href="/manifest.json" />
        </Head>
        <body>
          <Main />
          <NextScript />
          {/* Google Analytics via next/script */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-RNVC517N8T"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-RNVC517N8T');
            `}
          </Script>
          <script src="/src/install-tracking.js" defer />
        </body>
      </Html>
    );
  }
}

export default MyDocument;