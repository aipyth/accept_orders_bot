#FROM alpine
FROM node:14-alpine
#RUN apk add --update nodejs nodejs-npm

WORKDIR /app

COPY package*.json ./

RUN npm ci

RUN npm --version

COPY . .

CMD [ "node", "index.js" ]
