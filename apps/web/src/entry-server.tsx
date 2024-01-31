import { StartServer } from "@solidjs/start/server";
import { createHandler } from "@solidjs/start/entry";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.png" />
          {assets}
        </head>
        <body class="w-screen h-screen bg-black" id="app">
          {children}
          {scripts}
        </body>
      </html>
    )}
  />
));
