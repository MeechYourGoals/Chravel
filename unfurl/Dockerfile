FROM node:18-alpine

WORKDIR /app

# No dependencies required; this is a tiny HTTP proxy.
COPY unfurl/server.mjs ./server.mjs

ENV PORT=8787
EXPOSE 8787

CMD ["node", "server.mjs"]

