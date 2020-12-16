FROM node:14-alpine

WORKDIR /workdir

COPY src/package.json ./
COPY src/package-lock.json ./

RUN npm ci --no-optional --loglevel error

COPY ./src .

CMD ["npm", "test"]
