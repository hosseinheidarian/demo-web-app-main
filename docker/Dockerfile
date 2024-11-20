FROM node:14.17.3-alpine3.14

WORKDIR /usr/src/app

COPY ./static/ ./static/
COPY ./views/ ./views/
COPY ./package.json ./
RUN npm install
COPY ./server.js ./

CMD ["npm","start"]